import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: '管理登录',
      dsc: '管理登录',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: "^管理登录$",
          fnc: 'login',
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

  async login(e) {
    const user = e.user_id
    this.user[user] = { type: 'login' }

    // 获取二维码
    const res = await fetch('https://q.qq.com/qrcode/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: '777' })
    })

    let arrayBuffer = await res.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)

    if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
      buffer = zlib.gunzipSync(buffer)
    }

    let qrData
    try {
      qrData = JSON.parse(buffer.toString('utf-8'))
    } catch (err) {
      return await e.reply('二维码数据解析失败')
    }

    if (!qrData?.data?.QrCode) {
      return await e.reply('二维码获取失败')
    }

    const qr = qrData.data.QrCode
    const url = `https://q.qq.com/login/applist?client=qq&code=${qr}&ticket=null`

    // 发送二维码链接
    await e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: '[QQ开发平台] 点击登录' },
        { key: '#PROMPT#', value: '[QQ开发平台] 点击登录' },
        { key: '#LIST#', obj: [
          { obj_kv: [
            { key: 'desc', value: '[QQ开发平台] 点击登录' },
            { key: 'link', value: `https://x.sixflowers.icu/pa/?url=${url}]` }
          ] }
        ] }
      ]
    })

    for (let i = 0; i < 20; i++) {
      const loginRes = await this.get_login(qr)
      if (loginRes.code === 0) {
        const data = loginRes.data.data
        const uin = data.uin
        const ticket = data.ticket
        const developerId = data.developerId
        const appType = data.appType
        const appId = data.appId

        this.user[user] = { type: 'ok', ...data }

        try {
          fs.writeFileSync(file, JSON.stringify(this.user, null, 2))
        } catch (err) {
          logger.error('写入登录数据文件失败', err)
        }

        logger.mark(loginRes)

        return await e.reply({
          type: 'ark',
          template_id: 23,
          kv: [
            { key: '#DESC#', value: `登录成功` },
            { key: '#PROMPT#', value: '登录成功' },
            {
              key: '#LIST#',
              obj: [
                { obj_kv: [{ key: 'desc', value: `登录用户 ${uin}` }] },
                {
                  obj_kv: [{
                    key: 'desc',
                    value: `登录类型：${
                      appType === '0' ? '小程序' :
                      appType === '2' ? '机器人' :
                      '未知'
                    }`
                  }]
                },
                { obj_kv: [{ key: 'desc', value: `AppId ${appId}` }] },
                { obj_kv: [{ key: 'desc', value: `bot数据 查询消息数据` }] },
                { obj_kv: [{ key: 'desc', value: `bot列表 机器人列表` }] },
                { obj_kv: [{ key: 'desc', value: `bot通知 管理后台通知` }] },
                { obj_kv: [{ key: 'desc', value: `bot模板 消息模板列表` }] },
                { obj_kv: [{ key: 'desc', value: `boturl 消息URL白名单` }] },
                { obj_kv: [{ key: 'desc', value: `botip ip白名单` }] },
                { obj_kv: [{ key: 'desc', value: `bot指令 指令信息` }] },
                { obj_kv: [{ key: 'desc', value: `bot服务 服务信息` }] },
                { obj_kv: [{ key: 'desc', value: `bot信息 机器人信息` }] },
                { obj_kv: [{ key: 'desc', value: `bot沙箱 沙箱信息` }] },
                { obj_kv: [{ key: 'desc', value: `bot事件 订阅事件信息` }] },
                { obj_kv: [{ key: 'desc', value: `bot快捷菜单 快捷菜单信息` }] }
              ]
            }]})
      }
      await sleep(3000)
    }

    return await e.reply([segment.at(user),    
      {
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#DESC#", value: `登录失败` },
          { key: "#PROMPT#", value: `登录失败` },
          {
            key: "#LIST#",
            obj: [
              { obj_kv: [{ key: "desc", value: `登录失败` }] }
            ]
          }
        ]
      }
    ])
  }

  async get_login(qrcode) {
    const url = 'https://q.qq.com/qrcode/get'
    const headers = {
      "Host": "q.qq.com",
      "Connection": "keep-alive",
      "Cache-Control": "max-age=0",
      "User-Agent": "Mozilla/5.0 (Linux; U; Android 14; zh-cn; 22122RK93C Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 XiaoMi/MiuiBrowser/17.8.220115 swan-mibrowser",
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Origin": "https://q.qq.com",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      "Referer": "https://q.qq.com/",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ qrcode })
      })

      let buffer = Buffer.from(await res.arrayBuffer())

      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer)
      }

      const json = JSON.parse(buffer.toString('utf-8'))
      return json
    } catch (err) {
      logger.error('扫码状态获取失败：', err)
      return { code: -1, msg: err.message || '未知异常' }
    }
  }
}
