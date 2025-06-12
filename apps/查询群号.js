export class GetGroupInfoPlugin extends plugin {
  constructor(e) {
    super({
      name: '获取群号插件',
      dsc: '查询当前群号',
      event: 'message',
      priority: 1000,
      rule: [
        {
reg: '^(#|/)?查询群号?$', 
          fnc: 'getCurrentGroup'
        }
      ]
    })
  }

  // **获取当前群号**
  async getCurrentGroup() {
    if (!this.e.isGroup) {
      await this.reply('请在群聊中使用该命令。')
      return
    }
    await this.reply(`当前群号：${this.e.group_id}`)
  }
}