import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class SandboxQueryPlugin extends plugin {
  constructor() {
    super({
      name: 'bot沙箱',
      dsc: 'bot沙箱',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^bot沙箱(\d+)?$/,
          fnc: 'sandbox_query',
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

  async sandbox_query(e) {
    const userId = e.user_id

    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
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

    const paramNumber = e.msg.match(/^bot沙盒查询(\d+)?$/)?.[1]
    const appIdFromUser = Number(userData.appId)
    const appId = paramNumber ? Number(paramNumber) : appIdFromUser

    if (!appId || appId <= 0) {
      return e.reply('缺少有效的 bot_appid，请传入正确的 appid 或先登录绑定')
    }

    const body = JSON.stringify({ bot_appid: appId })

    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip',
    }

    const url = 'https://bot.q.qq.com/cgi-bin/sandbox/query'

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
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
      }

      const list = this.formatAsArkList(json.data)

      return e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: '沙盒数据展示' },
          { key: '#PROMPT#', value: '沙盒数据展示' },
          { key: '#LIST#', obj: list }
        ]
      })

    } catch (err) {
      return e.reply(`接口请求失败：${err.message}`)
    }
  }

  formatAsArkList(data) {
    const list = []
    const wrapLink = url => `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(url)}`
  
    if (data.guild) {
      list.push({ obj_kv: [{ key: 'desc', value: '沙箱配置' }] })
      list.push({ obj_kv: [{ key: 'desc', value: '在QQ频道配置' }] })
      
      if (Array.isArray(data.guild.guilds) && data.guild.guilds.length > 0) {
        data.guild.guilds.forEach(g => {
          list.push({ obj_kv: [{ key: 'desc', value: `频道名称: ${g.name}\n频道ID: ${g.guild_code}` }] })
          if (g.icon) {
            list.push({
              obj_kv: [
                { key: 'desc', value: '频道头像' },
                { key: 'link', value: wrapLink(g.icon) }
              ]
            })
          }
        })
      } else {
        list.push({ obj_kv: [{ key: 'desc', value: '暂无在QQ频道配置' }] })
      }
    }
  
    if (data.guild_dm) {
      list.push({ obj_kv: [{ key: 'desc', value: '在频道私信配置' }] })
      if (Array.isArray(data.guild_dm.members) && data.guild_dm.members.length > 0) {
        data.guild_dm.members.forEach(m => {
          list.push({ obj_kv: [{ key: 'desc', value: `账号 ${m.uin}` }] })
        })
      } else {
        list.push({ obj_kv: [{ key: 'desc', value: '暂无在频道私信配置' }] })
      }
    }
  
    if (data.group) {
      list.push({ obj_kv: [{ key: 'desc', value: '在QQ群配置' }] })
      if (Array.isArray(data.group.groups) && data.group.groups.length > 0) {
        data.group.groups.forEach(g => {
          list.push({ obj_kv: [{ key: 'desc', value: `群名称 ${g.name}\n群ID ${g.group_code}\n` }] })
          if (g.icon) {
            list.push({
              obj_kv: [
                { key: 'desc', value: '群头像' },
                { key: 'link', value: wrapLink(g.icon) }
              ]
            })
          }
        })
      } else {
        list.push({ obj_kv: [{ key: 'desc', value: '暂无在频道私信配置' }] })
      }
    }
  
    if (data.c2c) {
      list.push({ obj_kv: [{ key: 'desc', value: '在消息列表配置' }] })
      if (Array.isArray(data.c2c.members) && data.c2c.members.length > 0) {
        data.c2c.members.forEach(m => {
          list.push({ obj_kv: [{ key: 'desc', value: `账号 ${m.uin}` }] })
        })
      } else {
        list.push({ obj_kv: [{ key: 'desc', value: '暂无在消息列表配置' }] })
      }
    }
  
    return list
  }
}