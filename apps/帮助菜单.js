import puppeteer from 'puppeteer'

export class 帮助菜单 extends plugin {
  constructor() {
    super({
      name: '帮助菜单',
      dsc: '查看所有功能指令',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^#?帮助菜单$/,
          fnc: '帮助菜单'
        }
      ]
    })
  }

  async 帮助菜单(e) {
    e.reply('正在生成帮助菜单...', false, { recallMsg: 10 })

    const data = {
      bg: 'https://api.mtyqx.cn/api/random.php',
      colors: {
        person: '#FFECA1',
        info: '#4BC4C8',
        account: '#FFFFFF'
      },
      groups: [
        {
          name: '🌟 今日系列',
          members: [
            { person: '今日运势', info: '给我今日的运势' },
            { person: '今日CP', info: '今天老婆是谁？' }
          ]
        },
        {
          name: '🎮 娱乐互动',
          members: [
            { person: '#抽签', info: '今日运势占卜' },
            { person: '#点歌 周杰伦', info: '搜索播放音乐' },
            { person: '#成语接龙', info: '和 BOT 玩成语接龙' }
          ]
        },
        {
          name: '🧰 实用工具',
          members: [
            { person: '#天气 北京', info: '查询天气预报' },
            { person: '#翻译 hello', info: '中英互译工具' },
            { person: '#计算 1+1', info: '数学表达式计算' }
          ]
        },
        {
          name: '📦 插件拓展',
          members: [
            { person: '#原神抽卡', info: '原神模拟抽卡系统' },
            { person: '#猫猫图', info: '获取猫猫图一张' },
            { person: '#随机语录', info: '一言 API 语录' }
          ]
        }
      ]
    }

    // HTML 模板
    const html = `
      <html>
      <head>
        <style>
          body {
            background: url('${data.bg}') no-repeat top center;
            background-size: cover;
            color: #fff;
            font-family: "微软雅黑", sans-serif;
            padding: 60px;
            width: 1280px;
            margin: 0 auto;
            position: relative;
            min-height: 100vh;
          }
          .group {
            margin-bottom: 60px;
            background: rgba(0,0,0,0.4);
            border-radius: 20px;
            padding: 30px 40px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          .group-title {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, #FFD700 0%, #00BFFF 100%);
            border: none;
            margin: 16px 0 24px 0;
            opacity: 0.7;
          }
          .member-line {
            font-size: 36px;
            line-height: 2.2;
            margin-bottom: 6px;
          }
          .person { color: ${data.colors.person}; }
          .info { color: ${data.colors.info}; margin-left: 10px; }
        </style>
      </head>
      <body>
        ${data.groups.map(group => `
          <div class="group">
            <div class="group-title">${group.name}</div>
            <div class="divider"></div>
            <div class="group-list">
              ${group.members.map(m => `
                <div class="member-line">
                  <span class="person">${m.person}</span>：
                  <span class="info">${m.info}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <div style="height: 80px;"></div>
        <div style="position: absolute; left: 0; right: 0; bottom: 60px; text-align: center; width: 100%; font-size: 28px; color: #fff; text-shadow: 0 2px 8px #000a;">
          <div>以上仅展示部分功能</div>
          <div style="margin-top: 8px; font-size: 24px; opacity: 0.85;">发送 <b>#菜单</b> 获取完整功能</div>
        </div>
      </body>
      </html>
    `

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1.2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const image = await page.screenshot({ type: 'png', fullPage: true })
    await browser.close()

    await e.reply([segment.image(image)])
  }
}
