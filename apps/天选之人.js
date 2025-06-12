export class TianXuanZhiRenPlugin extends plugin {
  constructor() {
    super({
      name: '天选之人插件',
      dsc: '从群聊中随机选择天选之人并禁言1分钟，每个成员每天最多被禁言5次。',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: '^(#|/)?天选之人$', fnc: 'randomBan' }  // 保证只有 "天选之人" 命令
      ]
    });
    this.banRecords = {}; // 记录当天禁言情况 { "groupId-userId": count }
    this.recordDate = this.getToday(); // 记录当前日期
    this.lastCommandTime = {}; // 记录每个群聊的上次命令执行时间
  }

  // 获取当天日期字符串（YYYY-MM-DD）
  getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  // 如果跨天则重置禁言记录
  resetRecordsIfNeeded() {
    const today = this.getToday();
    if (today !== this.recordDate) {
      this.banRecords = {};  // 清空数据
      this.recordDate = today;
    }
  }

  /**
   * 获取群成员列表
   * @param {Object} e - 事件对象
   * @returns {Array} 群成员 ID 数组
   */
  async getGroupMembers(e) {
    const memberList = [];
    try {
      for (const [key, value] of await e.group.getMemberMap()) {
        memberList.push(value); // 存储完整的成员信息
      }
    } catch (error) {
      console.error("获取群成员失败:", error);
    }
    return memberList;
  }

  // 随机选择天选之人并禁言逻辑
  async randomBan(e) {
    // 检查是否在冷却时间内
    const now = Date.now();
    const groupId = e.group_id;
    const lastCommandTime = this.lastCommandTime[groupId] || 0;

    if (now - lastCommandTime < 5000) { // 5秒冷却时间
      return e.reply("❌ 请稍后再试，命令冷却中...");
    }

    this.lastCommandTime[groupId] = now; // 更新上次执行命令的时间

    this.resetRecordsIfNeeded(); // 检查是否需要重置记录
    const botQQ = Bot.uin; // 获取 Bot 的 QQ 号

    // 获取群成员列表
    const members = await this.getGroupMembers(e);

    if (!members || members.length === 0) {
      return e.reply("❌ 当前群聊没有可禁言的普通成员。");
    }

    // 过滤符合条件的成员（排除 QQ 机器人 / 群主 / 管理员 / 被禁言 5 次的）
    const eligibleMembers = members.filter(member => {
      const key = `${groupId}-${member.user_id}`;
      const count = this.banRecords[key] || 0;
      return (
        count < 5 &&                     // 今日禁言次数 < 5
        !String(member.user_id).includes("_") && // 过滤特殊格式账号
        member.user_id !== botQQ &&       // 不能禁言 Bot 自己
        member.role === "member"          // 只能禁言普通成员（排除群主/管理员）
      );
    });

    if (eligibleMembers.length === 0) {
      return e.reply("❌ 今天所有符合条件的成员都已达到禁言次数上限，或者没有符合条件的成员。");
    }

    // 随机选取一个符合条件的成员
    const selected = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
    const selectedUserId = selected.user_id;

    // 检查此用户是否已被禁言超过5次
    const key = `${groupId}-${selectedUserId}`;
    let count = this.banRecords[key] || 0;
    if (count >= 5) {
      return e.reply("❌ 此用户今天已被禁言 5 次，无法再次禁言！");
    }

    // 调用禁言接口
    try {
      await Bot.pickGroup(groupId).muteMember(selectedUserId, 60); // 1分钟禁言

      // 更新禁言记录
      count += 1;
      this.banRecords[key] = count;

      // 构建引用消息的消息
      const replyMessage = [
        segment.reply(e.message_id),  // 引用原消息
        segment.image(`http://q1.qlogo.cn/g?b=qq&nk=${selectedUserId}&s=100`), 
        `✅ 已从群聊中随机选择天选之人【${selected.nickname || selected.card || selected.user_id}】并禁言1分钟。`
      ];

      return e.reply(replyMessage);
    } catch (error) {
      console.error("禁言失败:", error);
      return e.reply(`❌ 禁言失败: ${error.message}`);
    }
  }
}