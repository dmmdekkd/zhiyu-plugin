import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class CreatorUinPlugin extends plugin {
  constructor() {
    super({
      name: '机器人创建者UIN查询',
      dsc: '请求接口 https://bot.q.qq.com/cgi-bin/sandbox/get_creator_uin 获取机器人创建者UIN',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#bot创建者$',
          fnc: 'getCreatorUin'
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

  async getCreatorUin(e) {
    const userId = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      return e.reply('读取用户数据失败')
    }

    const user = this.user[userId]
    if (!user) {
      return e.reply('未查询到你的登录信息')
    }

    const ticket = user.ticket || user.qticket
    const quin = user.quin || user.uin
    const developerId = user.developerId || user.quid
    const appId = user.appId || user.appid

    if (!ticket || !quin || !developerId || !appId) {
      return e.reply('用户信息不完整，缺少 ticket、quin、developerId 或 appId，请先绑定或登录。')
    }

    const url = 'https://bot.q.qq.com/cgi-bin/sandbox/get_creator_uin'
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'cookie': `qticket=${ticket}; quin=${quin}; quid=${developerId};`,
      'origin': 'https://q.qq.com',
      'referer': 'https://q.qq.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0'
    }

    // 请求体，携带 bot_appid
    const body = JSON.stringify({ bot_appid: appId })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        redirect: 'manual'
      })

      const buffer = Buffer.from(await res.arrayBuffer())
      let text

      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        text = zlib.gunzipSync(buffer).toString('utf-8')
      } else {
        text = buffer.toString('utf-8')
      }

      if (!res.headers.get('content-type')?.includes('application/json')) {
        return e.reply('接口返回非 JSON')
      }

      const json = JSON.parse(text)

      if ((json.retcode !== undefined && json.retcode !== 0) ||
          (json.code !== undefined && json.code !== 0)) {
        return e.reply(`接口错误: ${json.msg || json.message || '未知错误'}`)
      }

      const creatorUin = json.data?.creator_uin || '未返回创建者 UIN'

      return e.reply(`机器人创建者 UIN 查询成功：${creatorUin}`)
    } catch (err) {
      return e.reply('请求异常: ' + err.message)
    }
  }
}
