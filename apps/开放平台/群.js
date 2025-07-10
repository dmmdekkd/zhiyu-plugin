import fs from 'fs';

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`;

export default class FeatureLimitPlugin extends plugin {
  constructor() {
    super({
      name: '特性限制请求',
      dsc: '请求接口 https://bot.q.qq.com/cgi-bin/feature/limit 获取特性限制信息',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#特性限制$',
          fnc: 'getFeatureLimit',
        },
      ],
    });

    try {
      const data = fs.readFileSync(file, 'utf-8');
      this.user = JSON.parse(data);
    } catch (e) {
      this.user = {};
    }
  }

  async getFeatureLimit(e) {
    const userId = e.user_id;
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      return e.reply('读取用户数据失败');
    }

    const user = this.user[userId];
    if (!user) {
      return e.reply('未查询到你的登录信息');
    }

    const ticket = user.ticket || user.qticket;
    const quin = user.quin || user.uin;
    const developerId = user.developerId || user.quid;
    const appId = user.appId || user.appid;

    if (!ticket || !quin || !developerId || !appId) {
      return e.reply('用户信息不完整，缺少 ticket、quin、developerId 或 appId，请先绑定或登录。');
    }

    const url = 'https://bot.q.qq.com/cgi-bin/feature/limit';
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'cookie': `ts_uid=1897760084; RK=o9n9X8Mr7V; ptcz=ef2888338043e25e3293a63653c3df8cadfe97d332ac356cf45d1c4f49ea301d; pgv_pvid=6914142150; pac_uid=0_EznSGhR96JW9i; omgid=0_EznSGhR96JW9i; _qimei_uuid42=1951c0f221e100d85e31fda72487b4416bf10b0155; _qimei_fingerprint=857ed4c03ea5edb7e7fa7db5d5eda6ea; _qimei_h38=a4fa763f5e31fda72487b4410200000ff1951c; _qimei_q32=d384811aba59e9fd23e29b6dca1ca1de; _qimei_q36=c9e2f6bcac7b5c28de6dbfb330001ea19417; yyb_muid=24D93B5F0A8D6BEB279C2E880B866A2E; quid=${developerId}; qticket=${ticket}; quin=${quin}`,
      'origin': 'https://q.qq.com',
      'referer': 'https://q.qq.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
    };

    const body = JSON.stringify({
      bot_appid: appId,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!res.ok) {
        return e.reply(`请求失败，状态码：${res.status}`);
      }

      const result = await res.json();
      if (result.retcode !== 0) {
        return e.reply(`接口错误: ${result.msg || '未知错误'}`);
      }

      // 格式化展示内容
      const formatted = this.formatFeatureLimit(result.data);

      return e.reply(`特性限制：\n${formatted}`);
    } catch (err) {
      return e.reply('请求异常: ' + err.message);
    }
  }

  // 格式化特性限制信息
  formatFeatureLimit(data) {
    return `
    - 最大特性数（feature_max）: ${data.feature_max}
    - 最大命令数（command_max）: ${data.command_max}
    - 最大快速菜单特性数（quick_menu_feature_max）: ${data.quick_menu_feature_max}
    - 最大快速菜单命令数（quick_menu_command_max）: ${data.quick_menu_command_max}
    `;
  }
}
