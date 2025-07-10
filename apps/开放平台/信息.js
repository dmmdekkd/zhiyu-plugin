import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import zlib from 'zlib'
import axios from 'axios'
import { RemoteShellPic } from '/root/TRSS_AllBot/TRSS-Yunzai/plugins/zhiyu-plugin/apps/图床.js'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

export default class BotInfoQueryPlugin extends plugin {
  constructor() {
    super({
      name: 'bot信息',
      dsc: 'bot信息',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^bot信息(\d+)?$/,
          fnc: 'queryBotInfo',
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

    maskToken(token) {
    if (!token || token.length <= 8) return '****'; // 长度过短直接隐藏
    const start = token.slice(0, 4);
    const end = token.slice(-4);
    const maskLen = token.length - 8;
    const mask = '*'.repeat(maskLen);
    return `${start}${mask}${end}`;
  }

  getTmpFilePath(url) {
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)(\?|$)/i)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'png'
    return path.join(os.tmpdir(), `tmp_upload_${Date.now()}.${ext}`)
  }

  async downloadAndUpload(url) {
    const tmpFilePath = this.getTmpFilePath(url)
    try {
      const response = await axios.get(url, { responseType: 'stream' })
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tmpFilePath)
        response.data.pipe(writer)
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      const uploadedUrl = await RemoteShellPic.uploadImage(tmpFilePath)
      return uploadedUrl
    } catch (e) {
      this.logger?.warn?.(`下载或上传图片失败: ${url}，错误: ${e.message}`)
      throw e
    } finally {
      await fsPromises.unlink(tmpFilePath).catch(() => {})
    }
  }

  async queryBotInfo(e) {
    const userId = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {}

    if (!this.user[userId]) {
      return e.reply(this.buildArkMessage({
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
      }))
    }

    const userData = this.user[userId]
    const { uin, ticket, developerId } = userData

    const paramNumber = e.msg.match(/^bot信息查询(\d+)?$/)?.[1]
    const appIdFromUser = Number(userData.appId)
    const appId = paramNumber ? Number(paramNumber) : appIdFromUser

    if (!appId || appId <= 0) {
    }

    const url = `https://bot.q.qq.com/cgi-bin/info/query?bot_appid=${appId}`

    const headers = {
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip'
    }

    try {
      const res = await fetch(url, { method: 'GET', headers })
      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer)
      }

      const text = buffer.toString('utf-8')
      let json
      try {
        json = JSON.parse(text)
      } catch (ex) {
        return e.reply('接口返回数据解析失败')
      }

      if (json.retcode !== 0) {
        return e.reply(this.buildArkMessage({
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
          }))
      }

      const list = await this.formatBotInfoAsArk(json.data)

      const pageSize = 20
      const totalPages = Math.ceil(list.length / pageSize)

      for (let i = 0; i < totalPages; i++) {
        const pageList = list.slice(i * pageSize, (i + 1) * pageSize)
        await e.reply({
          type: 'ark',
          template_id: 23,
          kv: [
            { key: '#DESC#', value: `信息查询成功` },
            { key: '#PROMPT#', value: '信息查询成功' },
            { key: '#LIST#', obj: pageList }
          ]
        })
      }
    } catch (err) {
      return e.reply(`接口请求失败：${err.message}`)
    }
  }

  buildArkMessage(desc, lines = []) {
    const list = lines.map(l => ({ obj_kv: [{ key: 'desc', value: l }] }))
    return {
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: desc },
        { key: '#PROMPT#', value: desc },
        { key: '#LIST#', obj: list }
      ]
    }
  }

  async formatBotInfoAsArk(data) {
    const list = []
    const wrapLink = url => `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(url)}`
    const baseProtoUrl = 'https://bot-resource-1251316161.file.myqcloud.com/private_proto/'


    const rapLink = (relativePath) => {
      return `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(baseProtoUrl+ relativePath)}`
    }

    if (!Array.isArray(data.bot_infos)) {
      return [{ obj_kv: [{ key: 'desc', value: '未获取到 bot_infos 数据' }] }]
    }

    const info = data.bot_infos[0] || {}
    const dev = info.dev_info || {}
    const audit = info.audit_info || {}
    const c2c = info.c2c_welcome_info || {}
    const group = info.group_welcome_info || {}

    list.push({ obj_kv: [{ key: 'desc', value: '基本信息' }] })
    list.push({ obj_kv: [{ key: 'desc', value: `AppID ${dev.bot_appid}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `Bot名称 ${dev.bot_name}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `描述 ${dev.bot_desc}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `UIN ${dev.bot_uin}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `状态码 ${dev.status}（${this.getStatusText(dev.status)}）` }] })

    // 所有图片上传任务，按名称存储 Promise
    const uploadTasks = {}

    // 头像上传任务
    if (dev.avatar_url) {
      uploadTasks.avatar = this.downloadAndUpload(dev.avatar_url).catch(() => dev.avatar_url)
    } else {
      uploadTasks.avatar = Promise.resolve(null)
    }

    // 预览图上传任务
    if (Array.isArray(info.preview_medias)) {
      uploadTasks.previewMedias = Promise.all(
        info.preview_medias.map(p =>
          this.downloadAndUpload(p.url)
            .then(url => ({ name: p.name, url }))
            .catch(() => ({ name: p.name, url: p.url }))
        )
      )
    } else {
      uploadTasks.previewMedias = Promise.resolve([])
    }

    // 日间消息背景上传任务
    if (info.msg_background?.day_pic) {
      uploadTasks.dayPic = this.downloadAndUpload(info.msg_background.day_pic).catch(() => info.msg_background.day_pic)
    } else {
      uploadTasks.dayPic = Promise.resolve(null)
    }

    // 夜间消息背景上传任务
    if (info.msg_background?.night_pic) {
      uploadTasks.nightPic = this.downloadAndUpload(info.msg_background.night_pic).catch(() => info.msg_background.night_pic)
    } else {
      uploadTasks.nightPic = Promise.resolve(null)
    }

    // 等待全部上传完成
    const results = await Promise.all([
      uploadTasks.avatar,
      uploadTasks.previewMedias,
      uploadTasks.dayPic,
      uploadTasks.nightPic
    ])

    const [uploadedAvatarUrl, uploadedPreviewMedias, uploadedDayPic, uploadedNightPic] = results

    // 头像链接
    if (uploadedAvatarUrl) {
      list.push({
        obj_kv: [
          { key: 'desc', value: '头像链接' },
          { key: 'link', value: wrapLink(uploadedAvatarUrl) }
        ]
      })
    }

    list.push({ obj_kv: [{ key: 'desc', value: '审核信息' }] })
    list.push({ obj_kv: [{ key: 'desc', value: `剩余修改次数 ${audit.remain_modify_times}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `修改次数配额 ${audit.modify_times_quota}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `配额周期(秒) ${audit.modify_times_quota_period}` }] })

    list.push({ obj_kv: [{ key: 'desc', value: '安全检测' }] })
    list.push({ obj_kv: [{ key: 'desc', value: `安全结果码 ${info.security_result}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `安全提示语 ${info.security_wording}` }] })

    list.push({ obj_kv: [{ key: 'desc', value: '在QQ群配置' }] })
    if (Array.isArray(info.test_guilds)) {
      info.test_guilds.forEach(g => {
        list.push({ obj_kv: [{ key: 'desc', value: `群名称 ${g.test_guild_name}` }] })
        list.push({ obj_kv: [{ key: 'desc', value: `群ID ${g.test_guild_code}` }] })
      })
    }

    list.push({ obj_kv: [{ key: 'desc', value: `最大群组限制 ${info.max_guilds_limit}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `云开发状态 ${info.cloud_dev_status}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `管理版本 ${info.management_version}` }] })
    list.push({ obj_kv: [{ key: 'desc', value: `Token ${this.maskToken(info.token)}` }] })

    // 预览图
    for (const p of uploadedPreviewMedias) {
      list.push({ obj_kv: [{ key: 'desc', value: `功能预览 ${p.name}` }] })
      list.push({ obj_kv: [
        { key: 'desc', value: '功能预览图' },
        { key: 'link', value: wrapLink(p.url) }
      ] })
    }

    // 私有协议文档保留原始链接，不上传
    if (info.private_proto?.url) {
      list.push({ obj_kv: [{ key: 'desc', value: '隐私协议' }] })
      list.push({ obj_kv: [{ key: 'desc', value: `隐私协议标题 ${info.private_proto.title}` }] })
      list.push({ obj_kv: [
        { key: 'desc', value: '隐私协议地址' },
        { key: 'link', value: rapLink(`${info.private_proto.url}`) }
      ] })
      list.push({ obj_kv: [{ key: 'desc', value: `上传时间戳 ${info.private_proto.upload_ts}` }] })
    }

    if (c2c.welcome_msg) {
      list.push({ obj_kv: [{ key: 'desc', value: '私聊欢迎语' }] })
      list.push({ obj_kv: [{ key: 'desc', value: c2c.welcome_msg }] })
    }

    if (group.welcome_msg) {
      list.push({ obj_kv: [{ key: 'desc', value: '群聊欢迎语' }] })
      list.push({ obj_kv: [{ key: 'desc', value: group.welcome_msg }] })
    }

    // 日间消息背景图
    if (uploadedDayPic) {
      list.push({ obj_kv: [{ key: 'desc', value: '单聊背景图(日)' }] })
      list.push({ obj_kv: [
        { key: 'desc', value: '日间地址' },
        { key: 'link', value: wrapLink(uploadedDayPic) }
      ] })
    }

    // 夜间消息背景图
    if (uploadedNightPic) {
      list.push({ obj_kv: [{ key: 'desc', value: '单聊背景图(夜)' }] })
      list.push({ obj_kv: [
        { key: 'desc', value: '夜间地址' },
        { key: 'link', value: wrapLink(uploadedNightPic) }
      ] })
    }

    return list
  }

  getStatusText(status) {
    const map = {
      0: '未注册',
      1: '审核中',
      2: '审核失败',
      3: '已上线',
      6: '已发布'
    }
    return map[status] || '未知状态'
  }
}
