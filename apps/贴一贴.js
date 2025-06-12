export class EmojiReactionPlugin extends plugin {
  constructor() {
    super({
      name: '表情反应插件',
      dsc: '根据正则命令触发表情反应',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /贴自己/i, fnc: 'emojiReactionHello' }  // 匹配 "hello" 命令
      ]
    });

    // 配置
    this.random = 100;         // 添加概率 0 - 100
    this.sleepTime = 0;        // 每个表情是否需要延迟 单位: 毫秒
  }

  // 处理匹配 "hello" 命令
  async emojiReactionHello(e) {
    if (Math.random() < (this.random / 100)) {
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 67, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 68, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 69, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 70, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 71, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 72, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 73, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 74, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 75, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 76, 1);   
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 77, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 78, 1);  // 回应表情 67  
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 79, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 80, 1);  // 回应   
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 81, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 82, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 83, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 84, 1);  // 回应表情 67
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 85, 1);  // 回应表情 66
      await Bot.pickGroup(e.group_id).setReaction(e.seq, 86, 1);  // 回应7        
            if (this.sleepTime > 0) await this.sleep(this.sleepTime);
    }
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}