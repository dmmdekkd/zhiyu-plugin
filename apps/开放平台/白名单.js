import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class WhiteListPlugin extends plugin {
  constructor() {
    super({
      name: 'botip',
      dsc: 'botip',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^botip$', fnc: 'query_ip' }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch (e) {
      this.user = {}
    }
  }

  async query_ip(e) {
    const user = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (e) {
      return e.reply('读取用户数据失败')
    }

    if (!this.user[user]) return e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: `未查询到你的登录信息` },
        { key: "#PROMPT#", value: `未查询到你的登录信息` },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: `未查询到你的登录信息` }] }
          ]
        }
      ]
    })

    const { appId, uin, developerId, ticket } = this.user[user]
    const check = await this.getIpList(appId, uin, developerId, ticket)
    if (check.code !== 0) return e.reply('查询失败: ' + (check.msg || '接口异常'))

    const ipList = check.data || []
    if (!ipList.length) return e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: `没有白名单` },
        { key: "#PROMPT#", value: `没有白名单` },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: `没有白名单` }] }
          ]
        }
      ]
  })


    const pageSize = 26
    for (let i = 0; i < ipList.length; i += pageSize) {
      const batch = ipList.slice(i, i + pageSize)
    
      const arkList = batch.map(ip => ({
        obj_kv: [
          { key: 'desc', value: `${ip}` },
          { key: 'link', value: `https://x.sixflowers.icu/pa/?url=${ip}` }
        ]
      }))
    
      if (i === 0) {
        arkList.unshift({
          obj_kv: [
            { key: 'desc', value: `白名单共 ${ipList.length} 个 IP` }
          ]
        })
      }
    
      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: '白名单列表' },
          { key: '#PROMPT#', value: '白名单列表' },
          { key: '#LIST#', obj: arkList }
        ]
      })
    }
  }    

  async getIpList(appid, uin, developerId, ticket) {
    const url = `https://bot.q.qq.com/cgi-bin/dev_info/white_ip_config?bot_appid=${appid}`
    const headers = {
      'content-type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}`,
      'Accept-Encoding': 'gzip,deflate',
    }

    try {
      const res = await fetch(url, { method: 'GET', headers, redirect: 'manual' })
      const buffer = Buffer.from(await res.arrayBuffer())
      let text

      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        const unzipped = zlib.gunzipSync(buffer)
        text = unzipped.toString('utf-8')
      } else {
        text = buffer.toString('utf-8')
      }

      if (!res.headers.get('content-type')?.includes('application/json')) {
        return { code: -1, msg: '响应格式异常' }
      }

      const json = JSON.parse(text)
      if (json.retcode !== 0) return { code: -1, msg: json.msg || '接口错误' }

      const ipList = json.data?.ip_white_infos?.prod?.ip_list ?? []
      return { code: 0, data: ipList }
    } catch (err) {
      return { code: 500, msg: '请求异常: ' + err.message }
    }
  }
}
