import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class SceneQueryPlugin extends plugin {
  constructor() {
    super({
      name: '场景查询',
      dsc: '请求接口 https://bot.q.qq.com/cgi-bin/scene/query 获取场景相关数据',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^bot场景查询$',
          fnc: 'sceneQuery'
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

  formatSceneDetails(data) {
    if (!data?.details || !Array.isArray(data.details)) {
      return '无场景数据'
    }

    return data.details.map((item, idx) => {
      return `场景 ${idx + 1}：
  - 场景类型(scene_type): ${item.scene_type}
  - 场景状态(scene_state): ${item.scene_state}
  - 设置状态(setting_state): ${item.setting_state}`
    }).join('\n\n')
  }

  async sceneQuery(e) {
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

    const url = 'https://bot.q.qq.com/cgi-bin/scene/query'
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

      let buffer = Buffer.from(await res.arrayBuffer())

      if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
        buffer = zlib.gunzipSync(buffer)
      }

      const text = buffer.toString('utf-8')

      if (!res.headers.get('content-type')?.includes('application/json')) {
        return e.reply('接口返回非 JSON')
      }

      const json = JSON.parse(text)

      if ((json.retcode !== undefined && json.retcode !== 0) ||
          (json.code !== undefined && json.code !== 0)) {
        return e.reply(`接口错误: ${json.msg || json.message || '未知错误'}`)
      }

      // 使用格式化函数生成友好展示内容
      const formatted = this.formatSceneDetails(json.data || json)

      return e.reply(`场景查询结果：\n${formatted}`)
    } catch (err) {
      return e.reply('请求异常: ' + err.message)
    }
  }
}
