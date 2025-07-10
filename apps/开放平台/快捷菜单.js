import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class QuickMenuQueryPlugin extends plugin {
  constructor() {
    super({
      name: '快捷菜单',
      dsc: '快捷菜单',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^bot快捷菜单$', fnc: 'queryQuickMenuList' },
        { reg: /^bot快捷菜单详情\s*(\d+)?$/, fnc: 'queryQuickMenuDetail' }
      ]
    })

    try {
      const data = fs.readFileSync(file, 'utf-8')
      this.user = JSON.parse(data)
    } catch {
      this.user = {}
    }
  }

  /** 快捷菜单列表 */
  async queryQuickMenuList(e) {
    const json = await this.getFeatureJson(e, '3')
    if (!json) return

    const features = json.data?.features || []
    if (features.length === 0) {
      return e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#DESC#", value: `未找到 ID 为 ${id} 的快捷菜单功能` },
          { key: "#PROMPT#", value: `未找到 ID 为 ${id} 的快捷菜单功能` },
          {
            key: "#LIST#",
            obj: [
              { obj_kv: [{ key: "desc", value: `未找到 ID 为 ${id} 的快捷菜单功能` }] }
            ]
          }
        ]
      })
    }

    const list = features.map(f => ({
      obj_kv: [{
        key: 'desc',
        value: `快捷菜单名称: ${f.name}\n快捷菜单ID: ${f.feature_id}`
      }]
    }))

    list.push({
      obj_kv: [{
        key: 'desc',
        value: 'bot快捷菜单详情+ID 查看详情'
      }]
    })

    return e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: '快捷菜单列表' },
        { key: '#PROMPT#', value: '快捷菜单列表' },
        { key: '#LIST#', obj: list }
      ]
    })
  }

  /** 快捷菜单详情 */
  async queryQuickMenuDetail(e) {
    const match = e.msg.match(/^bot快捷菜单详情\s*(\d+)?$/)
    if (!match || !match[1]) {
      return e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#DESC#", value: "你未提供快捷指令 ID" },
          { key: "#PROMPT#", value: "你未提供快捷指令 ID" },
          {
            key: "#LIST#",
            obj: [
              { obj_kv: [{ key: "desc", value: "你未提供快捷指令 ID" }] }
            ]
          }
        ]
      })
    }
  
    const id = parseInt(match[1])
    const json = await this.getFeatureJson(e, '3')
    if (!json) return

    const feature = json.data?.features?.find(f => parseInt(f.feature_id) === id)
    if (!feature) return e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: `未找到 ID 为 ${id} 的快捷菜单功能` },
        { key: "#PROMPT#", value: `未找到 ID 为 ${id} 的快捷菜单功能` },
        {
          key: "#LIST#",
          obj: [
            { obj_kv: [{ key: "desc", value: `未找到 ID 为 ${id} 的快捷菜单功能` }] }
          ]
        }
      ]
    })

    const sceneStr = (feature.scene || []).map(s => {
      switch (s) {
        case 1: return '频道'
        case 2: return '频道私信'
        case 4: return '群聊'
        case 8: return '单聊'
        default: return '未知'
      }
    }).join(',') || '无'

    const detail =
      `快捷菜单名称: ${feature.name}\n` +
      `快捷菜单介绍: ${feature.desc || '无'}\n` +
      `快捷菜单ID: ${feature.feature_id}\n` +
      `审核状态: ${feature.status === 3 ? '已通过' : feature.status === 1 ? '未提审' : '未通过'}\n` +
      `快捷菜单权限: ${feature.permission === 0 ? '所有人' : '管理员'}\n` +
      `快捷菜单: ${feature.is_quick_menu === 1 ? '是' : '否'}\n` +
      `使用场景: ${sceneStr}\n` +
      `小程序AppID: ${feature.miniapp?.mini_appid || '无'}\n`

    let jumpLink = ''
    if (feature.miniapp?.url) {
      jumpLink = `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(feature.miniapp.url)}`
    } else if (feature.miniapp?.path) {
      jumpLink = `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(feature.miniapp.path)}`
    }

    const list = [
      { obj_kv: [{ key: 'desc', value: detail }] }
    ]

    if (jumpLink) {
      list.push({
        obj_kv: [
          { key: 'desc', value: '小程序路径' },
          { key: 'link', value: jumpLink }
        ]
      })
    }

    return e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: `快捷菜单详情 ${feature.name}` },
        { key: '#PROMPT#', value: `快捷菜单详情 ${feature.name}` },
        { key: '#LIST#', obj: list }
      ]
    })
  }

  /** 通用请求 */
  async getFeatureJson(e, biz_type = '3') {
    const userId = e.user_id

    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      await e.reply('读取用户数据失败')
      return null
    }

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
      biz_type: biz_type
    })

    const headers = {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'cookie': `qticket=${ticket}; quin=${quin}; quid=${developerId};`,
      'origin': 'https://q.qq.com',
      'referer': 'https://q.qq.com/',
      'user-agent': 'Mozilla/5.0'
    }

    try {
      const res = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers
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
}
