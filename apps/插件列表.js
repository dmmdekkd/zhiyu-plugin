import fs from 'fs'
import path from 'path'

export class ShowPluginDir extends plugin {
  constructor () {
    super({
      name: '插件目录查看器',
      dsc: '列出 plugins 下插件目录中 apps 目录及其子目录所有 js 文件，example 目录特殊处理，分多条 ark 发送',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^[#|/]?地下城任务$',
          fnc: 'showPluginTree'
        }
      ]
    })
  }

  async showPluginTree (e) {
    const pluginsPath = path.join(process.cwd(), 'plugins')
    if (!fs.existsSync(pluginsPath)) {
      return await e.reply('未找到 plugins 文件夹')
    }

    const pluginDirs = fs.readdirSync(pluginsPath, { withFileTypes: true })
      .filter(f => f.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))

    if (pluginDirs.length === 0) {
      return await e.reply('plugins 文件夹下没有插件目录')
    }

    let listItems = []

    for (const pluginDir of pluginDirs) {
      const pluginName = pluginDir.name
      const pluginPath = path.join(pluginsPath, pluginName)

      if (pluginName.toLowerCase() === 'example') {
        // example 目录直接列根目录下 js 文件
        const jsFiles = fs.readdirSync(pluginPath, { withFileTypes: true })
          .filter(f => f.isFile() && f.name.endsWith('.js'))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (jsFiles.length > 0) {
          let desc = `🔹 ${pluginName}\n`
          for (const file of jsFiles) {
            const safeName = file.name.replace(/\./g, '·')
            desc += `  - ${safeName}\n`
          }
          listItems.push({
            obj_kv: [{ key: 'desc', value: desc.trim() }]
          })
        }
      } else {
        // 非 example 目录，找 apps 目录
        const appsDirPath = path.join(pluginPath, 'apps')
        if (!fs.existsSync(appsDirPath) || !fs.statSync(appsDirPath).isDirectory()) {
          continue
        }

        // 先列 apps 目录自身的 js 文件
        const appsRootJsFiles = fs.readdirSync(appsDirPath, { withFileTypes: true })
          .filter(f => f.isFile() && f.name.endsWith('.js'))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (appsRootJsFiles.length > 0) {
          let desc = `🔹 ${pluginName}/apps\n`
          for (const file of appsRootJsFiles) {
            const safeName = file.name.replace(/\./g, '·')
            desc += `  - ${safeName}\n`
          }
          listItems.push({
            obj_kv: [{ key: 'desc', value: desc.trim() }]
          })
        }

        // 再遍历 apps 下的子目录
        const appsSubDirs = fs.readdirSync(appsDirPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))

        for (const subDir of appsSubDirs) {
          const subDirPath = path.join(appsDirPath, subDir.name)
          const jsFiles = fs.readdirSync(subDirPath, { withFileTypes: true })
            .filter(f => f.isFile() && f.name.endsWith('.js'))
            .sort((a, b) => a.name.localeCompare(b.name))

          if (jsFiles.length === 0) continue

          let desc = `🔹 ${pluginName}/apps/${subDir.name}\n`
          for (const file of jsFiles) {
            const safeName = file.name.replace(/\./g, '·')
            desc += `  - ${safeName}\n`
          }
          listItems.push({
            obj_kv: [{ key: 'desc', value: desc.trim() }]
          })
        }
      }
    }

    if (listItems.length === 0) {
      return await e.reply('未找到任何符合条件的 JS 文件。')
    }

    const chunkSize = 5
    for (let i = 0; i < listItems.length; i += chunkSize) {
      const chunk = listItems.slice(i, i + chunkSize)
      const arkMsg = {
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "插件目录列表"
          },
          {
            key: "#PROMPT#",
            value: `第${Math.floor(i / chunkSize) + 1}页`
          },
          {
            key: "#LIST#",
            obj: chunk
          }
        ]
      }
      await e.reply(arkMsg)
    }
  }
}
