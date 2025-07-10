import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot列表',
      dsc: 'bot列表',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: "^bot列表$",
          fnc: 'get_botlist',
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

  async get_botlist(e) {
    let user = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch { }
  
    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'))
    }
  
    let data = this.user[user]
    let { uin, ticket, developerId, appId } = data
  
    let res = await this.botlist(uin, developerId, ticket)
    if (res.code !== 0) {
      return e.reply(this.buildArk('查询失败', [res.error || '未知错误']))
    }
  
    let apps = res.data.apps
    if (!apps || apps.length === 0) {
      return e.reply(this.buildArk('你尚未创建任何Bot', []))
    }
  
    const list = []
    list.push({ obj_kv: [{ key: 'desc', value: `用户：${uin}\nAppId ${appId}` }] })
  
    for (let j = 0; j < apps.length; j++) {
      const app = apps[j]
      list.push({ obj_kv: [{ key: 'desc', value: '———————' }] })
      list.push({ obj_kv: [{ key: 'desc', value: `BOT名称 ${app.app_name}` }] })
      list.push({ obj_kv: [{ key: 'desc', value: `AppId ${app.app_id}` }] })
      list.push({ obj_kv: [{ key: 'desc', value: `介绍 ${app.app_desc}` }] })
    }
  
    return e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: 'Bot列表' },
        { key: '#PROMPT#', value: 'Bot列表' },
        { key: '#LIST#', obj: list }
      ]
    })
  }
  
  async botlist(uin, developerId, ticket) {
    if (!uin || !developerId || !ticket) {
      return { code: -1, data: null, error: '参数不完整' };
    }
  
    const url = 'https://q.qq.com/homepagepb/GetAppListForLogin';
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}; developerId=${developerId}`,
      'Accept-Encoding': 'gzip'
    };
  
    const postData = JSON.stringify({
      uin,
      developer_id: developerId,
      ticket,
      app_type: [2]
    });
  
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: postData
      });
  
      let buffer = Buffer.from(await res.arrayBuffer());
  
      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer);
      }
  
      const raw = buffer.toString('utf-8');
      const json = JSON.parse(raw);
  
      if (json.code !== 0) {
        return { code: -1, data: null, error: json.message || '接口返回错误' };
      }
  
      return { code: 0, data: json.data };  
    } catch (err) {
      return { code: -1, data: null, error: err.message };
    }
    }   
}