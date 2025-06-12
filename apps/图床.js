import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"
import os from "os"
import axios from "axios"
import FormData from "form-data"

export class RemoteShellPic extends plugin {
  constructor() {
    super({
      name: "远程文件上传",
      dsc: "上传指定路径或URL的图片并用Ark格式发送",
      event: "message",
      priority: 5,  // 低优先级，避免拦截其他插件
      rule: [
        { reg: '^c\\s+(.+)', fnc: "uploadFile" },
        { reg: '^[#|/]?上传.*$', fnc: "autoCatchQQImage" },
      ],
    })
  }

  async uploadFile() {
    let input = this.e.msg.replace(/^c\s+/, "").trim()
    if (!input) return this.reply("请输入文件路径或URL")
    return await this.handleUpload(input)
  }

  async autoCatchQQImage() {
    try {
      if (Array.isArray(this.e.message)) {
        const imageUrls = []
        for (let seg of this.e.message) {
          if (seg.type === "image" && seg.url) {
            const imgUrl = seg.url.replace(/&amp;/g, "&")
            logger.mark(`[autoCatchQQImage] 捕获 URL（image段）: ${imgUrl}`)
            imageUrls.push(imgUrl)
          }
        }
        
        if (imageUrls.length > 0) {
          await this.handleMultipleUploads(imageUrls)
          return
        }
      }

      const raw = this.e.raw_message || this.e.msg || ""
      const urlMatches = raw.match(/url=([^\s>,]+)/gi)
      if (urlMatches) {
        const imageUrls = urlMatches.map(match => {
          const url = match.match(/url=([^\s>,]+)/i)[1]
          return decodeURIComponent(url.replace(/&amp;/g, "&"))
        }).filter(url => url.startsWith("http"))
        
        if (imageUrls.length > 0) {
          logger.mark(`[autoCatchQQImage] 捕获 URL（raw文本）: ${imageUrls.join(", ")}`)
          await this.handleMultipleUploads(imageUrls)
          return
        }
      }

      return false
    } catch (err) {
      logger.error(`[autoCatchQQImage] 异常：${err.stack || err}`)
      return false
    }
  }

  async handleMultipleUploads(imageUrls) {
    try {
      const results = []
      for (const url of imageUrls) {
        const result = await this.handleUpload(url)
        if (result) {
          results.push(result)
        }
      }
      return results
    } catch (err) {
      logger.error(`[handleMultipleUploads] 异常：${err.stack || err}`)
      return false
    }
  }

  async handleUpload(input) {
    logger.mark(`[handleUpload] 接收参数：${input}`)
    let tmpFile = ""
    let isRemote = false

    try {
      if (/^https?:\/\//.test(input)) {
        isRemote = true
        let urlPath = new URL(input).pathname
        let ext = path.extname(urlPath) || ".jpg"
        tmpFile = path.join(os.tmpdir(), `upload_tmp${ext}`)

        logger.mark(`[handleUpload] 下载远程文件: ${input} -> ${tmpFile}`)

        let res = await axios.get(input, { responseType: "stream" })
        const writer = fs.createWriteStream(tmpFile)
        res.data.pipe(writer)

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve)
          writer.on("error", reject)
        })
      } else {
        tmpFile = path.resolve(input)
        await fsPromises.access(tmpFile)
        logger.mark(`[handleUpload] 使用本地文件: ${tmpFile}`)
      }

      const form = new FormData()
      form.append("image", fs.createReadStream(tmpFile))

      logger.mark(`[handleUpload] 上传图片到图床...`)

      const uploadRes = await axios.post("https://9480.sixflowers.icu/api/img.php", form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })

      let imgurl = ""
      if (typeof uploadRes.data === "object" && uploadRes.data !== null) {
        imgurl = uploadRes.data.imgurl || ""
      } else if (typeof uploadRes.data === "string") {
        imgurl = uploadRes.data
      }

      if (!imgurl) {
        logger.error(`[handleUpload] 上传成功但无返回图片 URL`)
        return this.reply("上传成功，但未获取到图片地址")
      }

      logger.mark(`[handleUpload] 上传成功 URL：${imgurl}`)

      const arkData = {
        type: "ark",
        template_id: 37,
        kv: [
          { key: "#PROMPT#", value: "上传成功" },
          { key: "#METATITLE#", value: "图片上传成功" },
          { key: "#METASUBTITLE#", value: "成功" },
          { key: "#METACOVER#", value: imgurl },
          { key: "#METAURL#", value: `` }
        ]
      }

      const arkDat = {
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "上传成功"
          },
          {
            key: "#PROMPT#",
            value: "上传成功"
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  {
                    key: "desc",
                    value: "点击前往"
                  },
                  {
                    key: "link",
                    value: `https://x.sixflowers.icu/pa/?url=${encodeURIComponent(imgurl)}`
                  }
                ]
              }
            ]
          }
        ]
      }

      logger.mark(`[SEND ARK] 发送 Ark 模板37`)
      await this.reply(arkData)

      logger.mark(`[SEND ARK] 发送 Ark 模板23`)
      await this.reply(arkDat)

      if (isRemote && tmpFile) {
        await fsPromises.unlink(tmpFile).catch(() => {})
        logger.mark(`[handleUpload] 清理临时文件：${tmpFile}`)
      }
    } catch (err) {
      logger.error(`[handleUpload] 异常：${err.stack || err}`)
      await this.reply(`操作失败：${err.message}`)
    }
  }
}