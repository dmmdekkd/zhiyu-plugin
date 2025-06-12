import { getUinByUserId } from './bind.js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class example extends plugin {
  constructor () {
    super({
      name: '今日CP',
      dsc: 'CP生成',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(今日cp|今日CP|cp生成|CP生成)$',
          fnc: 'cp生成'
        }
      ]
    })
  }

  async getRandomNameFromJson() {
    try {
      const filePath = path.resolve(__dirname, './../data/names.json')
      if (!fs.existsSync(filePath)) return '匿名'

      const data = fs.readFileSync(filePath, 'utf-8')
      const names = JSON.parse(data)
      if (!Array.isArray(names) || names.length === 0) return '匿名'

      let name = names[Math.floor(Math.random() * names.length)]
      name = name.replace(/[^\x00-\x7F\u4e00-\u9fa5\u3000-\u303F\uff00-\uffef]/g, '')
      if (name.length > 6) name = name.slice(0, 6)
      return name
    } catch {
      return '匿名'
    }
  }

  async cp生成 (e) {
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
                  { key: "desc", value: `今日CP功能不可用` }
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

    let userInfo
    try {
      const userRes = await fetch(`http://api.loomi.icu/?qq=${uin}`)
      const userJson = await userRes.json()
      if (!userJson.success || !userJson.data) {
        await e.reply('获取用户信息失败，请稍后再试')
        return true
      }
      userInfo = userJson.data
    } catch {
      await e.reply('用户信息请求失败，请稍后再试')
      return true
    }

    try {
      let now = new Date().toLocaleDateString('zh-CN')

      let [randomWife, selfMember] = await getRandomWife(e)

      let data = await redis.get(`Yunzai:logier-plugin:g${e.group_id}:${e.user_id}_cp`)
      if (data) {
        data = JSON.parse(data)
        if (!data.marry || !data.time || typeof data.isRe !== 'boolean') data = null
      }

      if (!data || now !== data.time) {
        data = {
          marry: randomWife,
          time: now,
          isRe: false
        }
      }

      await redis.set(`Yunzai:logier-plugin:g${e.group_id}:${e.user_id}_cp`, JSON.stringify(data))

      let cleanNickname1 = '匿名'
      if (userInfo && typeof userInfo.name === 'string') {
        cleanNickname1 = userInfo.name.replace(/[^\x00-\x7F\u4e00-\u9fa5\u3000-\u303F\uff00-\uffef]/g, '')
        if (cleanNickname1.length > 6) cleanNickname1 = cleanNickname1.slice(0, 6)
      }

      let cleanNickname2 = await this.getRandomNameFromJson()

      const imageUrl = `https://API.Xingzhige.COM/API/cp_generate_2/?name1=${encodeURIComponent(cleanNickname1)}&name2=${encodeURIComponent(cleanNickname2)}&data=img`

      const cdnProxyUrl = `https://9480.sixflowers.icu/api/?url=${encodeURIComponent(imageUrl)}`

      // 获取真实图片链接   
      const res = await fetch(cdnProxyUrl)
      const text = await res.text()
      const realImageUrl = text.match(/https:\/\/gchat\.qpic\.cn\/qmeetpic\/0\/[\w\-]+\/0/)?.[0] || imageUrl
      
      logger.mark(`[CP配对] 转换为腾讯图床地址：${cdnProxyUrl}`)
      const arkMessage = {
        type: "ark",
        template_id: 37,
        kv: [
          {
            key: "#PROMPT#",
            value: "今日CP"
          },
          {
            key: "#METATITLE#",
            value: `${cleanNickname1} ❤️ ${cleanNickname2}`
          },
          {
            key: "#METASUBTITLE#",
            value: "你的 CP 配对已生成，快来看看你和她的缘分吧！"
          },
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

await e.reply(arkMessage)
await e.reply([segment.image(imageUrl)])
      return true
    } catch {
      await e.reply('生成CP失败，请稍后再试')
      return true
    }
  }
}

async function getRandomWife (e) {
  try {
    // 如果是私聊，直接返回两个随机名字
    if (e.isPrivate) {
      const name1 = await example.prototype.getRandomNameFromJson.call(this)
      const name2 = await example.prototype.getRandomNameFromJson.call(this)
      return [{ name: name1 }, { name: name2 }]
    }

    // 群聊场景
    let mmap = await e.group.getMemberMap()
    let arrMember = Array.from(mmap.values())
    const selfMember = arrMember.find(member => member.user_id === String(e.user_id))
    let excludeUserIds = [String(e.self_id), String(e.user_id), '2854196310']
    let filteredArrMember = arrMember.filter(member => !excludeUserIds.includes(String(member.user_id)))

    if (filteredArrMember.length === 0) {
      // 如果没有可用的群成员，使用随机名字
      const name1 = await example.prototype.getRandomNameFromJson.call(this)
      const name2 = await example.prototype.getRandomNameFromJson.call(this)
      return [{ name: name1 }, { name: name2 }]
    }

    const randomWife = filteredArrMember[Math.floor(Math.random() * filteredArrMember.length)]
    return [randomWife, selfMember]
  } catch (error) {
    // 发生错误时使用随机名字
    const name1 = await example.prototype.getRandomNameFromJson.call(this)
    const name2 = await example.prototype.getRandomNameFromJson.call(this)
    return [{ name: name1 }, { name: name2 }]
  }
}



