import fs from 'fs'
import zlib from 'zlib'
import puppeteer from 'puppeteer'
import MarkdownIt from 'markdown-it'

const file = `${process.cwd().replace(/\\/g, '/')}/plugins/zhiyu-plugin/data/开放平台/robot.json`

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m])
}

const md = new MarkdownIt()

function renderTplToHtml(tpl) {
  let contentHtml = ''
  if (tpl.tpl_type === 1) {
    try {
      const json = JSON.parse(tpl.text)
      if (json?.rows?.length) {
        contentHtml += `<div class="msg-tpl-edit__preview--btns">`
        json.rows.forEach(row => {
          contentHtml += `<div class="row">`
          row.buttons?.forEach(button => {
            const label = escapeHtml(button.render_data?.label || '按钮')
            const style = parseInt(button.render_data?.style ?? 0)
            const actionType = parseInt(button.action?.type ?? 0)
            contentHtml += `<button class="btn-style-${style}" data-action-type="${actionType}">${label}</button>`
          })
          contentHtml += `</div>`
        })
        contentHtml += `</div>`
      }
    } catch {
      contentHtml = `<pre class="markdown-content">${escapeHtml(tpl.text)}</pre>`
    }
  } else if (tpl.tpl_type === 2) {
  //预览  contentHtml = `<div class="markdown-content">${md.render(tpl.text)}</div>`
  } else {
    contentHtml = `<pre class="markdown-content">${escapeHtml(tpl.text || '')}</pre>`
  }

  let formattedSource = ''
  try {
    const obj = JSON.parse(tpl.text)
    formattedSource = JSON.stringify(obj, null, 2) 
  } catch {
    formattedSource = tpl.text || ''
  }

  const sourceCodeHtml = `
    <div class="json-preview">
      <div class="json-title">源码</div>
      <pre class="code-block">${escapeHtml(formattedSource)}</pre>
    </div>
  `
  const subTitleHtml = tpl.tpl_type === 1
  ? `<div class="sub-title">仅消息按钮效果预览, 不支持按钮操作事件预览</div>`
  : ''
  return `
  <html><head><meta charset="utf-8" /><style>
    html, body {
      margin: 0; padding: 20px;
      font-family: "Microsoft YaHei", "Arial", sans-serif;
      background: #f0f0f0;
    }
    .msg-tpl-edit__preview {
      background: #fff; padding: 20px;
      border-radius: 8px; max-width: 800px;
      margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.05);
    }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
    .sub-title { font-size: 14px; color: #707070; margin-bottom: 16px; }
    .box { background: #f9f9f9; padding: 16px; border-radius: 6px; }
    .msg-tpl-edit__preview--btns { display: flex; flex-direction: column; gap: 12px; }
    .row { display: flex; gap: 12px; }
    button {
      flex: 1; height: 40px; border-radius: 4px; font-size: 14px;
      border: 1px solid #ccc; background: white; color: #333;
      position: relative; user-select: none; cursor: default;
    }
    .btn-style-0 { border-color: #707070; color: #707070; background: white; }
    .btn-style-1 { border-color: #09f; color: #09f; background: white; }
    .btn-style-2 { border-color: #707070; color: #707070; background: white; }
    .btn-style-3 { border-color: #d93026; color: #d93026; background: white; }
    .btn-style-4 { border-color: #09f; color: #fff; background: #09f; }
    button[data-action-type="0"]::after {
      content: ""; position: absolute; bottom: 6px; right: 6px;
      width: 8px; height: 8px; background-color: currentColor;
      clip-path: polygon(0 0, 100% 50%, 0 100%);
    }
    button[data-action-type="1"]::after {
      content: ""; position: absolute; bottom: 5px; right: 5px;
      width: 8px; height: 8px; border: 2px solid currentColor; border-radius: 50%;
    }
    .markdown-content {
      font-size: 14px; line-height: 1.6; color: #333;
      padding: 12px 16px; background: white; border-radius: 6px;
      box-shadow: inset 0 0 5px rgba(0,0,0,0.05); white-space: pre-wrap;
    }
    /* 新增：浅色代码块风格 */
    .json-preview {
      margin-top: 24px;
      background: #fff;
      padding: 16px;
      border-radius: 6px;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.04);
    }
    .json-title {
      font-size: 15px;
      font-weight: bold;
      color: #444;
      margin-bottom: 10px;
    }
    .code-block {
      background: #f5f5f5;
      color: #222;
      font-size: 13px;
      line-height: 1.6;
      font-family: "Source Code Pro", monospace, "Microsoft YaHei";
      padding: 12px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-x: auto;
    }
      
  </style></head>
  <body>
    <div class="msg-tpl-edit__preview">
      <div class="title">效果预览</div>
        ${subTitleHtml}
      <div class="box">
        ${contentHtml}
        ${sourceCodeHtml}
      </div>
    </div>
  </body></html>`
}


async function renderTextToImage(html) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 880, height: 600 })
  await page.setContent(html, { waitUntil: 'networkidle0' })

  const bodyHeight = await page.evaluate(() => {
    const body = document.body
    const html = document.documentElement
    return Math.max(body.scrollHeight, html.scrollHeight, html.offsetHeight)
  })

  await page.setViewport({ width: 880, height: bodyHeight, deviceScaleFactor: 2 })
  const element = await page.$('body')
  const buffer = await element.screenshot({ type: 'png' })
  await browser.close()
  return buffer
}

export default class GetMessagePlugin extends plugin {
  constructor() {
    super({
      name: 'bot模板详情',
      dsc: 'bot模板详情',
      event: 'message',
      priority: 1,
      rule: [{
        reg: "^bot模板详情(.*)$",
        fnc: 'get_bottpl_m',
      }]
    })
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      this.user = {}
    }
  }

  async get_bottpl_m(e) {
    const user = e.user_id
    try {
      this.user = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      this.user = {}
    }

    if (!this.user[user]) {
      return e.reply(this.buildArk('未查询到你的登录信息'))
    }

    const { uin, ticket, developerId, appId } = this.user[user]
    const param = e.msg.replace('bot模板详情', '').trim()
    if (!param) return e.reply(this.buildArk('请输入模板ID或模板名称'))

    const data = await this.tpl_list({ appid: appId, uin, ticket, developerId })
    if (data.code !== 0) return e.reply(this.buildArk('登录信息已过期'))

    const isId = param.includes('_') || /^\d+$/.test(param)
    const tpl = data.data.list?.find(t =>
      isId ? (t.tpl_id || '').toLowerCase() === param.toLowerCase()
           : (t.tpl_name || t.name || '').toLowerCase() === param.toLowerCase()
    )

    if (!tpl) return e.reply(this.buildArk(`未找到模板 ${param}`))

    const statusMap = { 0: '未通过', 1: '未提审', 2: '审核中', 3: '已通过' }
    const typeMap = { 1: '消息按钮组件', 2: 'Markdown模板组件' }

    const list = [
      { obj_kv: [{ key: 'desc', value: `模板名称 ${tpl.tpl_name}` }] },
      { obj_kv: [{ key: 'desc', value: `模板类型 ${typeMap[tpl.tpl_type] || tpl.tpl_type}` }] },
      { obj_kv: [{ key: 'desc', value: `账号 ${uin}` }] },
      { obj_kv: [{ key: 'desc', value: `审核状态 ${statusMap[tpl.status]}` }] },
      { obj_kv: [{ key: 'desc', value: `AppId ${appId}` }] },
      { obj_kv: [{ key: 'desc', value: `模板ID ${tpl.tpl_id}` }] }
    ]
    logger.mark(tpl)
    await e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        { key: '#DESC#', value: `模板详情` },
        { key: '#PROMPT#', value: '模板详情' },
        { key: '#LIST#', obj: list }
      ]
    })

    try {
      const html = renderTplToHtml(tpl)
      const buffer = await renderTextToImage(html)
      return e.reply(segment.image(buffer))
    } catch (err) {
      logger.error('渲染失败', err)
      return e.reply('模板渲染失败')
    }
  }

  async tpl_list({ appid, uin, developerId, ticket, start = 0, limit = 30 }) {
    const url = 'https://bot.q.qq.com/cgi-bin/msg_tpl/list'
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `quid=${developerId}; qticket=${ticket}; quin=${uin}`,
      'Accept-Encoding': 'gzip'
    }
    const body = JSON.stringify({ bot_appid: appid, start, limit })

    try {
      const res = await fetch(url, { method: 'POST', headers, body })
      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = zlib.gunzipSync(buffer)
      const json = JSON.parse(buffer.toString('utf-8'))
      return json.retcode === 0 ? { code: 0, data: json.data } : { code: -1, error: json.msg }
    } catch (err) {
      return { code: -1, error: err.message }
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
}
