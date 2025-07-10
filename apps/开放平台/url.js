import fs from 'fs'
import axios from 'axios'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'boturl',
      dsc: 'boturl',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: "^boturl(.*)$",
          fnc: 'get_boturl',
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

  async get_boturl(e) {
    let user = e.user_id;
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (err) {
      logger.mark('[get_boturl] 读取用户文件失败', err);
    }
    if (!this.user || !this.user[user]) {
      return e.reply('未查询到你的登录信息');
    }

    let datas = this.user[user];
    let uin = datas.uin;
    let ticket = datas.ticket;
    let developerId = datas.developerId;
    let appId = e.msg.replace('boturl', '').trim() || datas.appId;

    let res;
    try {
      res = await this.url_list({ appid: appId, uin, developerId, ticket });
    } catch (err) {
      logger.mark('[get_boturl] url_list 调用异常', err);
      return e.reply('查询接口调用异常');
    }

    logger.mark('[get_boturl] url_list 返回', res);

    if (!res || res.retcode !== 0) {
      return e.reply('查询失败');
    }

    let urls = res.data.urls || [];
    if (urls.length === 0) {
      return e.reply('无URL');
    }

  
    const list = urls.map(url => ({
      obj_kv: [
        { key: 'desc', value: `${url}` },
        { key: 'link', value: `https://x.sixflowers.icu/pa/?url=${url}` }
      ]
    }));

    // 添加头部信息
    list.unshift({
      obj_kv: [
        { key: 'desc', value: `[${uin}](${appId}) URL 白名单 共 ${urls.length} 条` }
      ]
    });

    const pageSize = 26;
    const totalPages = Math.ceil(list.length / pageSize);
    for (let i = 0; i < totalPages; i++) {
      const pageList = list.slice(i * pageSize, (i + 1) * pageSize);

      await e.reply({
        type: 'ark',
        template_id: 23,
        kv: [
          { key: '#DESC#', value: '消息 URL 白名单' },
          { key: '#PROMPT#', value: '消息 URL 白名单' },
          { key: '#LIST#', obj: pageList }
        ]
      });
    }
  }

  async url_list({ appid, uin, developerId, ticket }) {
    try {
      const headers = {
        'content-type': 'application/json',
        'cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`
      };

      const response = await axios.get(`https://bot.q.qq.com/cgi-bin/ark_url/query?bot_appid=${appid}`, {
        headers,
        responseType: 'arraybuffer',
        decompress: true,
      });

      const encoding = response.headers['content-encoding'];
      let data = response.data;

      if (encoding === 'gzip') {
        const zlib = await import('zlib');
        data = zlib.gunzipSync(data).toString('utf-8');
      } else {
        data = Buffer.from(data).toString('utf-8');
      }

      return JSON.parse(data);
    } catch (err) {
      logger.error('url_list 获取失败:', err);
      return { code: -1, msg: err.message || '请求失败' };
    }
  }
}
