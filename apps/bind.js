import fs from 'fs/promises'
import path from 'path'

const bindFilePath = path.resolve(process.cwd(), 'bind_code.json')

export async function readBindData() {
  try {
    const content = await fs.readFile(bindFilePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export async function getUinByUserId(user_id) {
  const data = await readBindData()
  return data[user_id] || null
}
