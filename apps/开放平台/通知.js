import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot通知',
      dsc: 'bot通知',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: "^bot通知$",
          fnc: 'get_message',
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

  async get_message(e) {
    let user = e.user_id;
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      this.user = {};
    }
  
    if (!this.user[user]) {
      return e.reply('未查询到你的登录信息');
    }
  
    const { uin, ticket, developerId, appId } = this.user[user];
    const res = await this.message(uin, developerId, ticket);
  
    if (res.code !== 0) {
      return e.reply('查询失败: ' + (res.error || '未知错误'));
    }
  
    const messages = res.messages || [];
    const arkList = [];
  
    // 头部信息
    arkList.push({ obj_kv: [{ key: 'desc', value: `uin: ${uin}` }] });
    arkList.push({ obj_kv: [{ key: 'desc', value: `appId: ${appId}` }] });
    //arkList.push({ obj_kv: [{ key: 'desc', value: '——————' }] });
  
    function stripHtml(html) {
      return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
  
    // 限制最多8条消息
    for (let j = 0; j < Math.min(messages.length, 8); j++) {
      const msg = messages[j];
      const title = stripHtml(msg.title || '');
      const send_time = msg.send_time || '';
      let timeStr = '';
  
      if (send_time) {
        const ts = parseInt(send_time);
        if (!isNaN(ts)) {
          timeStr = new Date(ts * 1000).toLocaleString();
        }
      }
  
      arkList.push({ obj_kv: [{ key: 'desc', value: '——————' }] });
      arkList.push({ obj_kv: [{ key: 'desc', value: `标题 ${title}` }] });
      // arkList.push({ obj_kv: [{ key: 'desc', value: `内容: ${content}` }] }); // 需要时取消注释
      arkList.push({ obj_kv: [{ key: 'desc', value: `时间 ${timeStr}` }] });
    }
  
    // 分批发送，防止单消息过长
    const batchSize = 26;
    for (let i = 0; i < arkList.length; i += batchSize) {
      const batch = arkList.slice(i, i + batchSize);
      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `bot通知列表` },
          { key: '#PROMPT#', value: `bot通知列表` },
          { key: '#LIST#', obj: batch }
        ]
      });
    }
  }
  

  async message(uin, developerId, ticket) {
    if (!uin || !developerId || !ticket) {
      logger.mark('[message] 参数不完整', { uin, developerId, ticket })
      return { code: -1, messages: [], error: '参数不完整' }
    }

    const url = 'https://q.qq.com/pb/AppFetchPrivateMsg'
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}; developerId=${developerId}`,
      'Accept-Encoding': 'gzip'
    }

    const postData = JSON.stringify({
      page_num: 0,
      page_size: 9999,
      receiver: developerId,
      appType: 2
    })

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: postData
      })

      let buffer = Buffer.from(await res.arrayBuffer())

      if (buffer.length > 3 && buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        try {
          buffer = zlib.gunzipSync(buffer)
        } catch (err) {
          return { code: -1, messages: []}
        }
      }

      const raw = buffer.toString('utf-8')
      let data
      
      try {
        data = JSON.parse(raw)
      } catch (err) {
        return { code: -1, messages: [], error: + err.message }
      }
      //logger.mark(data.data)
      if (data.code !== 0) {
        return { code: -1, messages: [], error: + (data.message) }
      }

      return {
        code: 0,
        messages: data.data?.privateMsgs || data.data?.list || []
      }

    } catch (err) {
      return { code: -1, messages: [], error: err.message }
    }
  }
}
