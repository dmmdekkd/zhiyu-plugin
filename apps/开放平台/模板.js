import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot模板',
      dsc: 'bot模板',
      event: 'message',
      priority: 1,
      rule: [
        {
            reg: /^bot模板(\d+)?$/g,
            fnc: 'get_bottpl',
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

  async get_bottpl(e) {
    let user = e.user_id
    try { this.user = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { }
  
    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'))
    }
  
    let datas = this.user[user]
    let { uin, ticket, developerId, appId: savedAppId } = datas
    let inputAppId = e.msg.replace('bot模板', '').trim()
    let appId = inputAppId || savedAppId
  
    let data = await this.tpl_list({ appid: appId, uin, ticket, developerId })
    let code = data.code
  
    if (code !== 0) {
      return e.reply(this.buildArk('模板列表获取失败', [data.error || '接口异常']))
    }
  
    let apps = data.data.list || []
    let max = data.data.max_msg_tpl_count || 0
  
    if (apps.length === 0) {
      return e.reply(this.buildArk('模板列表为空', [`当前使用：0/${max}`]))
    }
  
    const t = ['', '按钮', 'Markdown']
    const s = ['', '未提审', '审核中', '已通过', '未通过']
  
    const list = []
    list.push({ obj_kv: [{ key: 'desc', value: `[${uin}]\n[${appId}]\n模板使用 ${apps.length}/${max}` }] })
  
    for (let j = 0; j < apps.length; j++) {
      const item = apps[j]
      list.push({ obj_kv: [{ key: 'desc', value: '———————' }] })
      list.push({ obj_kv: [{ key: 'desc', value: `模板ID \n${item.tpl_id}` }] })
      list.push({ obj_kv: [{ key: 'desc', value: `模板名称 ${item.tpl_name}` }] })
      list.push({ obj_kv: [{ key: 'desc', value: `模板类型 ${t[item.tpl_type] }` }] })
      list.push({ obj_kv: [{ key: 'desc', value: `审核状态 ${s[item.status]}` }] })
    }
    list.push({
      obj_kv: [{
        key: 'desc',
        value: 'bot模板详情＋id/名称 查看详情',
      }]
    })
    
    list.push({
        obj_kv: [{
          key: 'desc',
          value: 'bot删除模板＋id 查看详情'
        }]
    })
    const pageSize = 26
    const totalPages = Math.ceil(list.length / pageSize)
  
    for (let i = 0; i < totalPages; i++) {
      const pageList = list.slice(i * pageSize, (i + 1) * pageSize)
      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `模板列表` },
          { key: '#PROMPT#', value: '模板列表' },
          { key: '#LIST#', obj: pageList }
        ]
      })
    }
  }
  

  

  async tpl_list({ appid, uin, developerId, ticket, start = 0, limit = 30 }) {
    if (!appid || !uin || !developerId || !ticket) {
      return { code: -1, data: null, error: '参数不完整' };
    }
  
    const url = 'https://bot.q.qq.com/cgi-bin/msg_tpl/list';
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip',
    };
  
    const body = JSON.stringify({
      bot_appid: appid,
      start,
      limit,
    });
  
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
  
      let buffer = Buffer.from(await res.arrayBuffer());
  
      // 检查是否 gzip 压缩并解压
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer);
      }
  
      const text = buffer.toString('utf-8');
      const json = JSON.parse(text);
  
      if (json.retcode !== 0) {
        return { code: -1, data: null, error: json.msg || '接口返回错误' };
      }
  
      return { code: 0, data: json.data || null };
    } catch (err) {
      return { code: -1, data: null, error: err.message };
    }
  }}