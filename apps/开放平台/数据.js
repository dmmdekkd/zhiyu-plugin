import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot数据',
      dsc: 'bot数据',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: "^bot数据(.*)$",
          fnc: 'get_botdata',
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

  async get_botdata(e) {
    let user = e.user_id;
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      this.user = {};
    }
    if (!this.user[user]) {
      return e.reply('未查询到你的登录信息');
    }
    let data = this.user[user];
    let uin = data.uin;
    let ticket = data.ticket;
    let developerId = data.developerId;
    let input = e.msg.replace('bot数据', '').trim();
  
    // 解析days，默认为2天
    let days = 2;
    if (input) {
      let n = parseInt(input);
      if (!isNaN(n) && n > 0) days = n;
    }
    let appId = data.appId;
  
    let data1 = await this.botdata({ uin, developerId, ticket, appid: appId, type: 1 });
    let data2 = await this.botdata({ uin, developerId, ticket, appid: appId, type: 2 });
    let data3 = await this.botdata({ uin, developerId, ticket, appid: appId, type: 3 });
  
    if (data1.code !== 0 || data2.code !== 0 || data3.code !== 0) {
      return e.reply('查询失败');
    }
  
    let msg_data = data1.data.msg_data || [];
    let group_data = data2.data.group_data || [];
    let friend_data = data3.data.friend_data || [];
  
    // 取可用最大天数
    let maxDays = Math.min(msg_data.length, group_data.length, friend_data.length);
    if (maxDays === 0) return e.reply('没有可用的数据');
  
    if (days > maxDays) days = maxDays;
  
    // 组装多天的数据文本内容
    const formatDay = (index) => {
      return [
        `————————`,
        `[日期：${msg_data[index].report_date}]`,
        `上行消息量：${msg_data[index].up_msg_cnt}`,
        `上行消息人数：${msg_data[index].up_msg_uv}`,
        `下行消息量：${msg_data[index].down_msg_cnt}`,
        `总消息量：${msg_data[index].bot_msg_cnt}`,
        `现有群：${group_data[index].existing_groups}`,
        `已使用群：${group_data[index].used_groups}`,
        `新增群：${group_data[index].added_groups}`,
        `减少群：${group_data[index].removed_groups}`,
        `现有好友：${friend_data[index].stock_added_friends}`,
        `已使用好友：${friend_data[index].used_friends}`,
        `新增好友：${friend_data[index].new_added_friends}`,
        `减少好友：${friend_data[index].new_removed_friends}`,
      ];
    }
  
    let allLines = [];
    allLines.push(`[${uin}](${appId}) 数据统计 最近${days}天`);
  
    for (let i = 0; i < days; i++) {
      allLines = allLines.concat(formatDay(i));
    }
  
    const batchSize = 27;
    for (let i = 0; i < allLines.length; i += batchSize) {
      const batch = allLines.slice(i, i + batchSize);
      const arkObjList = batch.map(line => ({
        obj_kv: [{ key: 'desc', value: line }]
      }));
  
      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: `[${uin}](${appId}) 数据统计` },
          { key: '#PROMPT#', value: `[${uin}](${appId}) 数据统计` },
          { key: '#LIST#', obj: arkObjList }
        ]
      });
    }
  }
  

  async botdata({ uin, developerId, ticket, appid, type = 1 }) {
    if (!uin || !developerId || !ticket || !appid) {
      return { code: -1, data: null, error: '参数不完整' };
    }
    const data_type = (type === 2) ? 2 : (type === 3) ? 3 : 1;
    const url = `https://bot.q.qq.com/cgi-bin/datareport/read?bot_appid=${appid}&data_type=${data_type}&data_range=0&scene_id=1`;
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}; developerId=${developerId}`,
      'Accept-Encoding': 'gzip',
    };

    try {
      const res = await fetch(url, { method: 'GET', headers });
      let buffer = Buffer.from(await res.arrayBuffer());

      if (buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
        buffer = zlib.gunzipSync(buffer);
      }

      const raw = buffer.toString('utf-8');
      const json = JSON.parse(raw);

      if (json.retcode !== 0) {
        return { code: -1, data: null, error: json.msg || '接口返回错误' };
      }
      logger.mark(json.data)
      return { code: 0, data: json.data }; 
    } catch (err) {
      return { code: -1, data: null, error: err.message };
    }
  }
}
