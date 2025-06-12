import fetch from 'node-fetch'
import { getUinByUserId } from './bind.js'

export class AIAI extends plugin {
  constructor() {
    super({
      name: 'aiai对话',
      dsc: '使用ZY-AI接口进行AI聊天',
      event: 'message',
      priority: 10,
      rule: [
        {
          reg: '^#?ai\\s+(.+)$',
          fnc: 'chatWithAI'
        }
      ]
    })
  }

  async testBind(e) {
    const userId = e.user_id.toString()
    const uin = await getUinByUserId(userId)
    if (!uin) {
    await e.reply({
      type: 'ark',
      template_id: 23,
      kv: [
        {
        key: "#LIST#",
        obj: [
          {
            obj_kv: [
            { key: "desc", value: '请先使用 账号绑定 绑定' }
            ]
          }
        ]
        },
        { key: '#PROMPT#', value: '绑定提示' }
      ]
    })
      return false
    }

    let json
    try {
      const res = await fetch(`http://api.loomi.icu/?qq=${uin}`)
      if (!res.ok) {
        await e.reply(`接口请求失败，状态码：${res.status}`)
        return false
      }
      json = await res.json()
    } catch (err) {
      await e.reply(`请求接口出错：${err.message}`)
      return false
    }
    return true
  }

  async chatWithAI(e) {
    // 先校验绑定
    if (!(await this.testBind(e))) return

    // 支持 #ai、#aiai 前缀，支持参数扩展
    let input = e.msg.replace(/^#?ai?\s+/, '').trim()
    if (!input) return await e.reply('请输入要对话的内容，例如：#ai 你好')

    // 可用模型列表，优先使用用户指定或默认，失败自动切换
    const modelList = [
      'deepseek/deepseek-r1-distill-llama-70b:free',
      'deepseek/deepseek-r1-distill-qwen-32b:free',
      'deepseek/deepseek-r1-distill-qwen-14b:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'deepseek/deepseek-prover-v2:free',
      'deepseek/deepseek-r1-zero:free',
      'deepseek/deepseek-v3-base:free',
      'deepseek/deepseek-chat:free',
      'deepseek/deepseek-r1:free',
      'google/gemini-2.5-pro-exp-03-25',
      'google/gemini-2.0-flash-exp:free',
      'google/gemma-3n-e4b-it:free',
      'google/gemma-3-27b-it:free',
      'google/gemma-3-12b-it:free',
      'google/gemma-3-1b-it:free',
      'google/gemma-3-4b-it:free',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.3-8b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-4-maverick:free',
      'meta-llama/llama-3.1-405b:free',
      'meta-llama/llama-4-scout:free',
      'microsoft/phi-4-reasoning-plus:free',
      'microsoft/phi-4-reasoning:free',
      'microsoft/mai-ds-r1:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'mistralai/mistral-small-24b-instruct-2501:free',
      'mistralai/mistral-7b-instruct:free',
      'mistralai/devstral-small:free',
      'mistralai/mistral-nemo:free',
      'moonshotai/moonlight-16b-a3b-instruct:free',
      'moonshotai/kimi-vl-a3b-thinking:free',
      'nousresearch/deephermes-3-mistral-24b-preview:free',
      'nousresearch/deephermes-3-llama-3-8b-preview:free',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1:free',
      'nvidia/llama-3.3-nemotron-super-49b-v1:free',
      'open-r1/olympiccoder-32b:free',
      'opengvlab/internvl3-14b:free',
      'opengvlab/internvl3-2b:free',
      'qwen/qwen2.5-vl-72b-instruct:free',
      'qwen/qwen2.5-vl-32b-instruct:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
      'qwen/qwen2.5-vl-3b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'qwen/qwen2.5-vl-7b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'qwen/qwen3-235b-a22b:free',
      'qwen/qwen3-30b-a3b:free',
      'qwen/qwen3-32b:free',
      'qwen/qwen3-14b:free',
      'qwen/qwen3-8b:free',
      'qwen/qwq-32b:free',
      'rekaai/reka-flash-3:free',
      'shisa-ai/shisa-v2-llama3.3-70b:free',
      'thudm/glm-z1-32b:free',
      'thudm/glm-4-32b:free',
      'tngtech/deepseek-r1t-chimera:free'
    ]

    // 检查用户是否指定了模型
    let model = modelList[0]
    let id = ''
    let img = ''
    let userModel = ''
    input = input.replace(/\bmodel=([^\s]+)/i, (m, v) => { userModel = v; return '' })
    input = input.replace(/\bid=([^\s]+)/i, (m, v) => { id = v; return '' })
    input = input.replace(/\bimg=([^\s]+)/i, (m, v) => { img = v; return '' })
    input = input.trim()
    if (!input) return await e.reply('请输入要对话的内容，例如：#ai 你好')
    if (userModel) {
      model = userModel
      // 用户指定模型优先，后续自动切换时跳过
      modelList.unshift(userModel)
    }

    let lastError = ''
    for (let i = 0; i < modelList.length; i++) {
      const tryModel = modelList[i]
      // 构造URL参数
      const params = new URLSearchParams()
      params.append('msg', input)
      params.append('model', tryModel)
      if (id) params.append('id', id)
      if (img) params.append('img', img)

      const apiUrl = `http://191800.xyz/aiai/index.php?${params.toString()}`
      logger.info(`[aiai插件] 请求URL: ${apiUrl}`)

      try {
        const res = await fetch(apiUrl, {
          method: 'GET'
        })

        logger.info(`[aiai插件] HTTP状态: ${res.status}`)
        const text = await res.text()
        logger.info(`[aiai插件] 返回内容: ${text.slice(0, 300)}`)

        let data
        try {
          data = JSON.parse(text)
        } catch (err) {
          logger.error('[aiai插件] JSON解析失败: ' + err)
          logger.error('[aiai插件] 原始返回内容: ' + text.slice(0, 300))
          lastError = '❌ AI 接口异常，返回了非 JSON 内容，请稍后再试'
          continue
        }

        if (!data.success) {
          logger.warn(`[aiai插件] AI接口返回失败: ${JSON.stringify(data)}`)
          // 优先显示 error 字段，其次 message 字段
          if (data.error) {
            lastError = `请求失败：${data.error}`
            // 如果是模型不可用或超限，自动切换下一个模型
            if (
              /rate limit|not available|unavailable|exceeded|out of quota|no credits|not support|not allowed|not enabled|not found|not exist|not support|unsupported/i.test(
                data.error
              )
            ) {
              continue
            } else {
              return await e.reply(lastError)
            }
          }
          if (data.message) {
            lastError = `❌ AI 请求失败：${data.message}`
            continue
          }
          lastError = '❌ AI 请求失败，请稍后重试'
          continue
        }

        const reply = data?.response?.choices?.[0]?.message?.content
        if (!reply) {
          logger.warn('[aiai插件] AI无返回内容，完整响应: ' + JSON.stringify(data))
          lastError = '⚠️ AI 没有返回内容'
          continue
        }

        // 移除所有 markdown 语法（包括链接、加粗、斜体、标题、列表等）
        let newReply = reply
          // 移除 markdown 链接 [text](url)
          .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '$1')
          // 移除加粗、斜体、删除线等
          .replace(/(\*\*|__)(.*?)\1/g, '$2')
          .replace(/(\*|_)(.*?)\1/g, '$2')
          .replace(/~~(.*?)~~/g, '$1')
          // 移除标题
          .replace(/^#+\s*(.*)$/gm, '$1')
          // 移除无序/有序列表前缀
          .replace(/^\s*[\*\-\+]\s+/gm, '')
          .replace(/^\s*\d+\.\s+/gm, '')
          // 移除代码块和行内代码
          .replace(/`{3,}[\s\S]*?`{3,}/g, '')
          .replace(/`([^`]+)`/g, '$1')
          // 移除多余空行
          .replace(/\n{2,}/g, '\n\n')
          .trim()

        // 普通 url 前加跳转
        const urlRegex = /(https?:\/\/[^\s\]\)]+)/g
        let arkLinks = []
        newReply = newReply.replace(urlRegex, (url) => {
          const arkUrl = `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(url)}`
          arkLinks.push(arkUrl)
          // 用特殊标记占位，后续用ark消息发送
          return `[[ARK_LINK_${arkLinks.length - 1}]]`
        })

        // 发送文本和ark链接
        if (arkLinks.length > 0) {
          // 先发文本（去掉占位符），用ark卡片发送
          const textMsg = newReply.replace(/\[\[ARK_LINK_\d+\]\]/g, '').trim()
          if (textMsg) {
            await e.reply({
              type: 'ark',
              template_id: 23,
              kv: [
                {
                  key: "#LIST#",
                  obj: [
                    {
                      obj_kv: [
                        { key: "desc", value: textMsg }
                      ]
                    }
                  ]
                },
                { key: '#PROMPT#', value: '🤖 AI回复' }
              ]
            })
          }

          // 逐条发送ark卡片
          for (const arkUrl of arkLinks) {
            await e.reply({
              type: 'ark',
              template_id: 23,
              kv: [
                {
                  key: "#LIST#",
                  obj: [
                    {
                      obj_kv: [
                        { key: "desc", value: '点击打开链接：' + arkUrl }
                      ]
                    }
                  ]
                },
                { key: '#PROMPT#', value: '🔗 跳转链接' }
              ]
            })
          }
        } else {
          // 没有链接也用ark卡片发送文本
          await e.reply({
            type: 'ark',
            template_id: 23,
            kv: [
              {
                key: "#LIST#",
                obj: [
                  {
                    obj_kv: [
                      { key: "desc", value: newReply }
                    ]
                  }
                ]
              },
              { key: '#PROMPT#', value: '🤖 AI回复' }
            ]
          })
        }
        return // 成功则不再尝试下一个模型
      } catch (err) {
        logger.error('[aiai插件] 请求异常：' + err)
        lastError = '❌ AI 请求异常，请检查网络或接口状态'
        continue
      }
    }
    // 所有模型都失败，返回最后一次错误
    await e.reply(lastError || '❌ AI 请求失败，所有模型均不可用')
  }
}
