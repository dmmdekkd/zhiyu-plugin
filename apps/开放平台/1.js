import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class BotInfoQueryPlugin extends plugin {
  constructor() {
    super({
      name: 'Bot信息查询',
      dsc: '调用 bot 信息查询接口，获取 bot 详细信息',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^信息查询(\d+)?$/,
          fnc: 'botInfoQuery',
        }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch {
      this.user = {}
    }
  }

  async botInfoQuery(e) {
    const userId = e.user_id

    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      // 忽略错误
    }

    if (!this.user[userId]) {
      return e.reply({
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
    }

    const userData = this.user[userId]
    const { uin, ticket, developerId } = userData

    // 从命令提取 bot_appid 参数，或用用户绑定的默认 appId
    const paramNumber = e.msg.match(/^bot信息查询(\d+)?$/)?.[1]
    const appIdFromUser = Number(userData.appId)
    const appId = paramNumber ? Number(paramNumber) : appIdFromUser

    if (!appId || appId <= 0) {
      return e.reply('缺少有效的 bot_appid，请传入正确的 appid 或先登录绑定')
    }

    const url = `https://bot.q.qq.com/cgi-bin/info/query?bot_appid=${appId}`

    // 构造请求头，包含 Cookie
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-encoding': 'gzip, deflate, br',
      'cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'origin': 'https://q.qq.com',
      'referer': 'https://q.qq.com/',
      'user-agent': 'Mozilla/5.0',
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
      })

      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer)
      }

      const text = buffer.toString('utf-8')
      const json = JSON.parse(text)
      logger.mark('接口原始响应:', JSON.stringify(json, null, 2))

      if (json.retcode !== 0) {
        return e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#DESC#", value: `接口返回错误` },
            { key: "#PROMPT#", value: `接口返回错误` },
            {
              key: "#LIST#",
              obj: [
                { obj_kv: [{ key: "desc", value: json.msg || '未知错误' }] }
              ]
            }
          ]
        })
      }

      // 你可以根据 json.data 自行格式化为 Ark 列表，这里简单示例直接 JSON.stringify
      const detail = JSON.stringify(json.data, null, 2)

      return e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: 'Bot 信息查询结果' },
          { key: '#PROMPT#', value: 'Bot 信息查询结果' },
          {
            key: '#LIST#',
            obj: [
              { obj_kv: [{ key: 'desc', value: detail }] }
            ]
          }
        ]
      })

    } catch (err) {
      return e.reply(`接口请求失败：${err.message}`)
    }
  }
}
