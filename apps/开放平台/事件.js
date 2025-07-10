import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot事件',
      dsc: 'bot事件',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^bot事件(\d+)?$/g,
          fnc: 'get_botevent',
        }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch (e) {
      this.user = {}
    }
  }

  async get_botevent(e) {
    const user = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      this.user = {}
    }

    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'))
    }

    const datas = this.user[user]
    const uin = datas.uin
    const ticket = datas.ticket
    const developerId = datas.developerId
    const appId = e.msg.replace('bot事件', '').trim() || datas.appId

    const result = await this.botevent({ appid: appId, uin, developerId, ticket })
    if (result.code !== 0) {
      return e.reply(this.buildArk('查询失败 '))
    }

    const events = result.data?.events || []
    if (!events.length) {
      return e.reply(this.buildArk('没有订阅的事件'))
    }
  
    const types = {
      '群事件': [],
      '单聊事件': [],
      '频道事件': [],
      '互动事件': []
    }
  
    for (const ev of events) {
      const type = ev.type
      const name = ev.name
      const status = ev.is_subscribed ? '已订阅' : '未订阅' 
      if (types[type]) {
        types[type].push(`${name}\n${status}`)
      }
    }
  
    let allEvents = []
    for (const [type, list] of Object.entries(types)) {
      if (list.length) {
        allEvents.push(`[${type}]`)
        allEvents = allEvents.concat(list)
      }
    }
  
    const batchSize = 22
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)
  
      const arkObjList = [{
        obj_kv: [
          { key: 'desc', value: batch.join('\n') }
        ]
      }]
  
      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `[${uin}](${appId}) 事件订阅情况` },
          { key: '#PROMPT#', value: `[${uin}](${appId}) 事件订阅情况` },
          { key: '#LIST#', obj: arkObjList }
        ]
      })
    }
  }

  buildArk(desc) {
    return {
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: desc },
        { key: '#PROMPT#', value: desc },
        { key: '#LIST#', value: desc }
      ]
    }
  }

  async botevent({ appid, uin, developerId, ticket }) {
    if (!appid || !uin || !developerId || !ticket) {
      return { code: -1, data: null, error: '参数不完整' }
    }

    const url = 'https://bot.q.qq.com/cgi-bin/event_subscirption/list_event'
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip'
    }

    const body = JSON.stringify({ bot_appid: appid })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      })

      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer)
      }

      const json = JSON.parse(buffer.toString('utf-8'))
      logger.mark(json.data)
      if (json.retcode !== 0) {
        return { code: -1, data: null, error: json.msg || '接口返回错误' }
      }

      return { code: 0, data: json.data || null }
    } catch (err) {
      return { code: -1, data: null, error: err.message }
    }
  }
}


/*bot事件分开版本，分开查询各个分类的事件订阅情况
import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot事件',
      dsc: 'bot事件分类订阅查询',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^bot事件(\d+)?(全部|群|单聊|频道|互动)?$/i,
          fnc: 'get_botevent',
        }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch (e) {
      this.user = {}
    }
  }

  async get_botevent(e) {
    const user = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      this.user = {}
    }

    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'))
    }

    const datas = this.user[user]
    const uin = datas.uin
    const ticket = datas.ticket
    const developerId = datas.developerId

    const reg = /^bot事件(\d+)?(全部|群|单聊|频道|互动)?$/i
    const match = e.msg.match(reg)
    const appId = match?.[1] || datas.appId
    const typeRaw = match?.[2] || ''

    // 发送 bot事件 ，统一发送一条 ark，提示用户发送具体分类命令
    if (!typeRaw) {
      const tipList = [
        '[bot事件指令列表]',
        'bot事件群',
        'bot事件单聊',
        'bot事件频道',
        'bot事件互动',
        'bot事件全部'
      ]

      const arkObjList = tipList.map(tip => ({
        obj_kv: [{ key: 'desc', value: tip }]
      }))

      return e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `事件查询命令提示` },
          { key: '#PROMPT#', value: `事件查询命令提示` },
          { key: '#LIST#', obj: arkObjList }
        ]
      })
    }

    // 事件分类映射
    const filterMap = {
      '群': '群事件',
      '单聊': '单聊事件',
      '频道': '频道事件',
      '互动': '互动事件'
    }

    // 调用接口查询事件
    const result = await this.botevent({ appid: appId, uin, developerId, ticket })
    if (result.code !== 0) {
      return e.reply(this.buildArk('查询失败：' + (result.error || '未知错误')))
    }

    const events = result.data?.events || []
    if (!events.length) {
      return e.reply(this.buildArk('没有订阅的事件'))
    }

    // 过滤规则，全部时不过滤
    const filterTypeRaw = typeRaw === '全部' ? '' : typeRaw
    const filterType = filterMap[filterTypeRaw] || ''

    const groupRegex = /群|Group|guild|缇や簨浠?/i
    const singleChatRegex = /单聊|C2C|Friend|绉佷俊/i
    const channelRegex = /频道|Channel|瀛愰/i
    const interactionRegex = /互动|Interaction|浜掑姩/i

    const types = {
      '群事件': [],
      '单聊事件': [],
      '频道事件': [],
      '互动事件': []
    }

    for (const ev of events) {
      const typeStr = ev.type || ''
      const name = ev.name || ''
      const status = ev.is_subscribed ? '已订阅' : '未订阅'

      let eventType = null
      if (groupRegex.test(typeStr)) eventType = '群事件'
      else if (singleChatRegex.test(typeStr)) eventType = '单聊事件'
      else if (channelRegex.test(typeStr)) eventType = '频道事件'
      else if (interactionRegex.test(typeStr)) eventType = '互动事件'

      if (!eventType) continue
      if (filterType && eventType !== filterType) continue

      types[eventType].push(`${name}\n${status}`)
    }

    let allEvents = []
    for (const [type, list] of Object.entries(types)) {
      if (list.length) {
        allEvents.push(`【${type}】`)
        allEvents = allEvents.concat(list)
      }
    }

    if (!allEvents.length) {
      return e.reply(this.buildArk('没有符合条件的事件'))
    }

    // 分批发送，防止过长，15条一批
    const batchSize = 15
    for (let i = 0; i < allEvents.length; i += batchSize) {
      const batch = allEvents.slice(i, i + batchSize)

      const arkObjList = [{
        obj_kv: [
          { key: 'desc', value: batch.join('\n\n') }
        ]
      }]

      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `[${uin}](${appId}) 事件订阅情况` },
          { key: '#PROMPT#', value: `[${uin}](${appId}) 事件订阅情况` },
          { key: '#LIST#', obj: arkObjList }
        ]
      })
    }
  }

  buildArk(desc) {
    return {
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: desc },
        { key: '#PROMPT#', value: desc }
      ]
    }
  }

  async botevent({ appid, uin, developerId, ticket }) {
    if (!appid || !uin || !developerId || !ticket) {
      return { code: -1, data: null, error: '参数不完整' }
    }

    const url = 'https://bot.q.qq.com/cgi-bin/event_subscirption/list_event'
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip'
    }

    const body = JSON.stringify({ bot_appid: appid })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      })

      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer)
      }

      const json = JSON.parse(buffer.toString('utf-8'))
      if (json.retcode !== 0) {
        return { code: -1, data: null, error: json.msg || '接口返回错误' }
      }

      return { code: 0, data: json.data || null }
    } catch (err) {
      return { code: -1, data: null, error: err.message }
    }
  }
}*/