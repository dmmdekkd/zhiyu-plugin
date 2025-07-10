import fs from 'fs'
import zlib from 'zlib'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot删除模板',
      dsc: 'bot删除模板',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^bot删除模板(.*)$/g,
          fnc: 'del_bottpl',
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

  buildArk(desc = '') {
    return {
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#DESC#", value: desc },
        { key: "#PROMPT#", value: desc },
        {
          key: "#LIST#",
          obj: [{ obj_kv: [{ key: "desc", value: desc }] }]
        }
      ]
    }
  }

  async del_bottpl(e) {
    let user = e.user_id;
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      this.user = {};
    }
    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'));
    }
    let datas = this.user[user];
    let uin = datas.uin;
    let ticket = datas.ticket;
    let developerId = datas.developerId;
    let appId = datas.appId;
    let tplidRaw = e.msg.replace('bot删除模板', '').trim();
    if (!tplidRaw) {
      return e.reply(this.buildArk('请指定要删除的模板ID'));
    }

    let data = await this.tpl_list({ appid: appId, uin, ticket, developerId });
    if (data.code !== 0) {
      return e.reply(this.buildArk('查询失败：获取模板列表失败'));
    }

    let tpllist = [];
    let apps = data.data.list;
    for (let j = 0; j < apps.length; j++) {
      let id = apps[j].tpl_id.toString();
      if (tplidRaw.split('#').some(x => x.trim() === id)) {
        tpllist.push(id);
      }
    }
    if (tpllist.length === 0) {
      return e.reply(this.buildArk('模板ID输入错误或不存在'));
    }

    data = await this.CheckUrl(appId, uin, developerId, ticket);
    if (data.retcode !== 0) {
      return e.reply(this.buildArk('获取验证链接失败: ' + (data.message || '未知错误')));
    }

    let url = data.url;
    let qr = data.qr;

    const msgList = [
      { obj_kv: [{ key: 'desc', value: `模板删除确认` }] },
      { obj_kv: [{ key: 'desc', value: `账号：${uin}` }] },
      { obj_kv: [{ key: 'desc', value: `AppID：${appId}` }] },
      { obj_kv: [{ key: 'desc', value: `即将删除模板：\n${tpllist.join('\n')}` }] },
      { obj_kv: [{ key: 'desc', value: '点击链接验证身份后操作' },{ key: 'link', value: `https://x.sixflowers.icu/pa/?url=${url}` }]}
    ];
    await e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: '模板删除确认' },
        { key: '#PROMPT#', value: '模板删除确认' },
        { key: '#LIST#', obj: msgList }
      ]
    });

    let i = 0;
    while (i < 10) {
      let res = await this.verify({ appid: appId, uin, developerId, ticket, qrcode: qr });
      if (res.code === 0) {
        let result = await this.tpl_del({ appid: appId, uin, ticket, developerId, qrcode: qr, tplid: tpllist.join('#') });
        logger.mark('[tpl_del 返回]', result);
        if (result.code === 0 || result.retcode === 0) {
          return e.reply(this.buildArk(`成功删除模板 ${tpllist}`));
        } else {
          return e.reply(this.buildArk(`操作失败 ${result.msg }`));
        }
      }
      i++;
      await sleep(3000);
    }
    return e.reply(this.buildArk('验证操作超时'));
  }

  async tpl_list({ appid, uin, developerId, ticket, start = 0, limit = 30 }) {
    const url = 'https://bot.q.qq.com/cgi-bin/msg_tpl/list';
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip'
    };
    const body = JSON.stringify({ bot_appid: appid, start, limit });

    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      let buffer = Buffer.from(await res.arrayBuffer());
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer);
      const json = JSON.parse(buffer.toString('utf-8'));
      return json.retcode === 0 ? { code: 0, data: json.data } : { code: -1, error: json.msg };
    } catch (err) {
      return { code: -1, error: err.message };
    }
  }

  async verify({ appid, uin, developerId, ticket, qrcode }) {
    const url = 'https://q.qq.com/qrcode/get';
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}`,
      'Accept-Encoding': 'gzip, deflate'
    };
    const body = JSON.stringify({ qrcode });

    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      let buffer = Buffer.from(await res.arrayBuffer());
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer);
      const json = JSON.parse(buffer.toString('utf-8'));
      return json.code === 0 ? { code: 0, msg: '授权成功', data: json } : { code: -1, msg: '未授权', data: json };
    } catch (err) {
      return { code: 500, msg: '请求异常: ' + err.message };
    }
  }

  async CheckUrl(appId, uin, developerId, ticket) {
    const url = 'https://q.qq.com/qrcode/create';
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quin=${uin}; quid=${developerId}; qticket=${ticket}`,
      'Accept-Encoding': 'gzip,deflate',
    };
    const body = JSON.stringify({ type: 40, miniAppId: appId });

    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      let buffer = Buffer.from(await res.arrayBuffer());
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer);
      const data = JSON.parse(buffer.toString('utf-8'));
      if (data?.data?.QrCode) {
        const qrcode = data.data.QrCode;
        const finalUrl = `https://q.qq.com/qrcode/check?client=qq&code=${qrcode}&ticket=${ticket}`;
        return { retcode: 0, url: finalUrl, qr: qrcode };
      } else {
        return { retcode: -1, message: 'QrCode参数未找到' };
      }
    } catch (error) {
      return { retcode: -1, message: '请求异常: ' + error.message };
    }
  }

  async tpl_del({ appid, uin, developerId, ticket, tplid, qrcode }) {
    const url = "https://bot.q.qq.com/cgi-bin/msg_tpl/delete";
    const tplids = tplid.split('#').filter(id => id.trim() !== '');
    const headers = {
      "content-type": "application/json",
      "Cookie": `quin=${uin}; quid=${developerId}; qticket=${ticket}`,
    };
    const postData = { bot_appid: appid, tpl_id: tplids, qrcode };

    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(postData) });
      let text = await res.text();
      if (text.startsWith('\x1f\x8b\x08')) {
        const zlib = await import('zlib');
        text = zlib.gunzipSync(Buffer.from(text, 'binary')).toString('utf-8');
      }
      try {
        return JSON.parse(text);
      } catch {
        return { code: -1, msg: "返回数据解析失败", raw: text };
      }
    } catch (err) {
      return { code: -1, msg: '请求异常: ' + err.message };
    }
  }
}
