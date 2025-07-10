import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class FeatureCountPlugin extends plugin {
  constructor() {
    super({
      name: '功能统计查询',
      dsc: '请求接口 https://bot.q.qq.com/cgi-bin/feature/count 获取功能统计数据',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^bot获取功能统计$',
          fnc: 'getFeatureCount'
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

  async getFeatureCount(e) {
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

    const url = 'https://bot.q.qq.com/cgi-bin/feature/count'
    const headers = {

      'content-type': 'application/json',
      'cookie': `qticket=${ticket}; quin=${quin}; quid=${developerId};`,
    }

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

      const result = json.data || json

      const alias = {
        feature_cnt: '功能数',
        command_cnt: '指令数',
        quick_menu_cnt: '快捷菜单数'
      }
      
      const lines = ['功能统计结果：']
      for (const key in alias) {
        if (key in result) {
          lines.push(`${alias[key].padEnd(8)}: ${result[key]}`)
        }
      }
      

      return e.reply(lines.join('\n'))
    } catch (err) {
      return e.reply('请求异常: ' + err.message)
    }
  }
}
