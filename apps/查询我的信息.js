import { getUinByUserId } from './bind.js'
import fetch from 'node-fetch'

export class QQLevelQuery extends plugin {
  constructor() {
    super({
      name: 'QQ等级查询',
      dsc: '查询 QQ 等级信息，只查询绑定的QQ',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: '^(#|/)?查询信息?$', 
          fnc: 'getQQLevel'
        }
      ]
    });
  }

  async getQQLevel(e) {
    const userId = e.user_id.toString()
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
                  { key: "desc", value: `查询信息功能不可用` }
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

    await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        {
          key: "#DESC#",
          value: `获取 ${userInfo.name} 信息中`
        },
        {
          key: "#PROMPT#",
          value: `获取 ${userInfo.name} 信息中`
        },
        {
          key: "#LIST#",
          obj: [
            {
              obj_kv: [
                { key: "desc", value: `获取 ${userInfo.name} 信息中` }
              ]
            },
            {
              obj_kv: [
                { key: "desc", value: `请稍等...` }
              ]
            }                          
          ]
        }
      ]
    })

    try {
      const apiUrl = `http://jiuli.xiaoapi.cn/i/qq/qq_level.php?qq=${uin}&return=json`
      const res = await fetch(apiUrl)
      const data = await res.json()

      if (!data || data.code !== 200) {
        await e.reply(`查询失败：${data?.msg || '未知错误'}`)
        return true
      }

      // 修正注册时间格式
      let regTime = data.RegistrationTime?.replace(/\.\d+$/, '') || '未知'
      // 尝试提取真实头像地址
      let realImageUrl = data.headimg
      try {
      const res = await fetch(data.headimg)
      const html = await res.text()
     // 喵
     const match = html.match(/https:\/\/gchat\.qpic\.CN\/qmeetpic\/0\/[\w\-]+\/0/)
     if (match && match[0]) {
     realImageUrl = match[0]
     } else {
     }
     } catch (err) {
     }

     // 腾讯图床）
     const cdnProxyUrl = `https://9480.sixflowers.icu/api/?url=${encodeURIComponent(realImageUrl)}`
     logger.mark(`腾讯图床地址${realImageUrl}`)

      // 构造 Ark 卡片 JSON
      const arkMsg = {
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `${data.qq}的账号信息`
            },
            {
              key: "#PROMPT#",
              value: `${data.qq}的账号信息`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `QQ账号: ${data.qq}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `QID: ${data.qid}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `性别: ${data.sex}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `年龄: ${data.age}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `等级: ${data.level}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `成长值: ${data.iGrowthValue}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `成长速度: ${data.iGrowthSpeed}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `VIP等级: ${data.iVipLevel}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `等级图标: ${data.icon}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `注册时长: ${data.RegistrationTime}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `IP属地: ${data.ip_city}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `个性签名: ${data.sign}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `点击查看头像地址` },
                    { key: "link", value: `https://x.sixflowers.icu/pa/?url=${realImageUrl}` }
                    
                  ]
                 
                },
              ]
            }
          ]
        }        
        const arkMessage = {
          type: "ark",
          template_id: 37,
          kv: [
            { key: "#PROMPT#", value: `${userInfo.name}的头像` },
            { key: "#METASUBTITLE#", value: `${userInfo.name}的头像` },
            {
              key: "#METACOVER#",
              value: realImageUrl// 图像预览
            },
            {
              key: "#METAURL#",
              value: "" // 点击跳转
            }
          ]
        }
  
  
      // 返回头像图片 + Ark 卡片
      await e.reply(arkMessage)
      //await e.reply([segment.image(realImageUrl)])
      await e.reply([arkMsg])

    } catch (err) {
      await e.reply('查询 QQ 等级时出错，请稍后再试！')
      logger.error('QQ 等级查询出错:', err)
    }
  }
}
