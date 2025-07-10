import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class FeatureQueryPlugin extends plugin {
  constructor() {
    super({
      name: 'bot指令',
      dsc: 'bot指令',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^bot指令$', fnc: 'queryFeatureStatus' },
        { reg: '^bot指令详情(?:\\s*(\\d+))?$', fnc: 'queryFeatureDetail' }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch {
      this.user = {}
    }
  }

  // 公共请求数据函数
  async getFeatureJson(e) {
    try {
      const userId = e.user_id
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const user = this.user[userId]
      if (!user) {
        await e.reply({
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
        return null
      }

      const appId = user.appId || user.appid
      const ticket = user.ticket || user.qticket
      const quin = user.quin || user.uin
      const developerId = user.developerId || user.quid

      if (!ticket || !quin || !developerId || !appId) {
        return null
      }

      const url = 'https://bot.q.qq.com/cgi-bin/feature/query'
      const params = new URLSearchParams({
        bot_appid: appId,
        biz_type: '2'
      })

      const headers = {
        'accept': 'application/json',
        'content-type': 'application/json',
        'cookie': `qticket=${ticket}; quin=${quin}; quid=${developerId};`,
        'origin': 'https://q.qq.com',
        'referer': 'https://q.qq.com/',
        'user-agent': 'Mozilla/5.0'
      }

      const res = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers,
        redirect: 'manual'
      })

      const buffer = Buffer.from(await res.arrayBuffer())
      const text = (buffer[0] === 0x1f && buffer[1] === 0x8b)
        ? zlib.gunzipSync(buffer).toString('utf-8')
        : buffer.toString('utf-8')

      const json = JSON.parse(text)
      if ((json.retcode && json.retcode !== 0) || (json.code && json.code !== 0)) {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#DESC#", value: `登录信息已过期` },
            { key: "#PROMPT#", value: `登录信息已过期` },
            {
              key: "#LIST#",
              obj: [
                { obj_kv: [{ key: "desc", value: `登录信息已过期` }] }
              ]
            }
          ]
        })
        return null
      }

      return json
    } catch (err) {
      await e.reply('请求异常: ' + err.message)
      return null
    }
  }

  async queryFeatureStatus(e) {
    const json = await this.getFeatureJson(e)
    if (!json) return

    const data = json.data || {}
    let message = ""

    data.features.forEach(feature => {
      message +=
        `指令名称: ${feature.name}\n` +
        `指令ID: ${feature.feature_id}\n`
    })

    await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: "指令列表" },
        { key: "#PROMPT#", value: "指令列表" },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: message.trim() }] },
            { obj_kv: [{ key: "desc", value: "bot指令详情+指令ID 查看详情" }] }
          ]
        }
      ]
    })
  }

  async queryFeatureDetail(e) {
    const match = e.msg.match(/^bot指令详情\s*(\d+)?$/)
    if (!match || !match[1]) {
      return e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#DESC#", value: "你未提供指令 ID" },
          { key: "#PROMPT#", value: "你未提供指令 ID" },
          {
            key: "#LIST#",
            obj: [
              { obj_kv: [{ key: "desc", value: "你未提供指令 ID" }] }
            ]
          }
        ]
      })
    }

    const id = parseInt(match[1])
    const json = await this.getFeatureJson(e)
    if (!json) return

    const data = json.data || {}
    const feature = data.features.find(f => parseInt(f.feature_id) === id)
    if (!feature) return e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: `未找到 ID 为 ${id} 的指令` },
        { key: "#PROMPT#", value: `未找到 ID 为 ${id} 的指令` },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: `未找到 ID 为 ${id} 的指令` }] }
          ]
        }
      ]
    })

    let detail =
      `指令名称: ${feature.name}\n` +
      `指令介绍: ${feature.desc}\n` +
      `指令ID: ${feature.feature_id}\n` +
      `审核状态: ${feature.status === 3 ? '已通过' : feature.status === 1 ? '未提审' : '未通过'}\n` +
      `指令权限: ${feature.permission === 0 ? "所有人" : "管理员"}\n` +
      `快捷菜单: ${feature.is_quick_menu === 1 ? '是' : '否'}\n` +
      `是否传参: ${feature.has_param ? "是" : "否"}\n`

    if (feature.example_param) {
      detail += `参数示例: ${feature.example_param}\n`
    }

    const scenes = feature.scene?.map(s => {
      switch (s) {
        case 1: return "频道"
        case 2: return "频道私信"
        case 4: return "群聊"
        case 8: return "单聊"
        default: return "未知"
      }
    }).join(", ") || "无"

    detail += `使用场景: ${scenes}`

    await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: `指令详情 ${feature.name}` },
        { key: "#PROMPT#", value: `指令详情 ${feature.name}` },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: detail }] }
          ]
        }
      ]
    })
  }
}
