import fetch from "node-fetch"
import { getUinByUserId } from './bind.js'

export class xgn extends plugin {
  constructor() {
    super({
      name: '今日运势',
      dsc: '今日运势查询',
      event: 'message',
      priority: 1045,
      rule: [{
        reg: '^[#|/]?(今日)?运势$',
        fnc: 'jrys'
      }]
    })
  }

  async jrys(e) {
    const userId = String(e.user_id)
    const uin = await getUinByUserId(userId)
    if (!uin) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `未绑定`
          },
          {
            key: "#PROMPT#",
            value: `未绑定`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `今日运势功能不可用` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `使用 #账号绑定 绑定` }
                ]
              }             
            ]
          }
        ]
      })
      return true
    }

    // 获取用户信息
    let userInfo
    try {
      const userRes = await fetch(`http://api.loomi.icu/?qq=${uin}`)
      const userJson = await userRes.json()
      if (!userJson.success || !userJson.data) {
        await e.reply('获取用户信息失败，请稍后再试')
        return true
      }
      userInfo = userJson.data
    } catch (err) {
      await e.reply('用户信息请求失败：' + err.message)
      return true
    }

    // 获取运势数据
    let fortune
    try {
      const res = await fetch(`http://datukuai.top:1450/jrys.php?qq=${uin}`)
      fortune = await res.json()
    } catch {
      try {
        const res = await fetch(`https://api.fanlisky.cn/api/qr-fortune/get/${uin}`)
        const json = await res.json()
        fortune = json.data
      } catch (err) {
        await e.reply('运势接口请求失败，请稍后再试')
        return true
      }
    }

    if (!fortune) {
      await e.reply('获取运势数据失败')
      return true
    }

    // 发送 Ark 卡片
    await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        {
          key: "#DESC#",
          value: `今日运势`
        },
        {
          key: "#PROMPT#",
          value: `${userInfo.name}的今日运势请查收`
        },
        {
          key: "#LIST#",
          obj: [
            {
              obj_kv: [
                { key: "desc", value: `昵称: ${userInfo.name}` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `QQ: ${userInfo.qq}` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `星级: ${fortune.luckyStar}` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `运势概要: ${fortune.fortuneSummary}` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `解读: ${fortune.signText}` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `箴言: ${fortune.unSignText}` }
              ]
            } 
          ]
        }
      ]
    })

    return true
  }
}
