import { getUinByUserId } from './bind.js'
export class BotInfo extends plugin {
    constructor() {
        super({
            name: "机器人信息",
            dsc: "获取机器人账号",
            event: "message",
            priority: 100,
            rule: [
                {
                    reg: "^#?(获取)?(机器人|bot)(账号|qq|uin)$",
                    fnc: "getBotUin"
                }
            ]
        });
    }

    /** 获取机器人账号 */
    getBotAccounts() {
        if (Array.isArray(Bot.uin)) {
            return Bot.uin; // 直接返回数组
        } else if (typeof Bot.uin === "number") {
            return [Bot.uin]; // 转为数组返回
        } else if (typeof Bot.uin === "string") {
            return [parseInt(Bot.uin, 10)]; // 确保是数字
        }
        return []; // 未获取到账号
    }

    /** 处理指令 */
    async getBotUin(e) {
    const userId = this.e.user_id.toString()
    const uin = await getUinByUserId(userId)
    if (!uin) {
        await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              {
                key: "#DESC#",
                value: `未绑定`
              },
              {
                key: "#PROMPT#",
                value: `未绑定`
              },
              {
                key: "#LIST#",
                obj: [
                  {
                    obj_kv: [
                      { key: "desc", value: `查询Robot功能不可用` }
                    ]
                  },
                  {
                    obj_kv: [
                      { key: "desc", value: `使用 #账号绑定 绑定` }
                    ]
                  }             
                ]
              }
            ]
          })
      return true
    }

        let botAccounts = this.getBotAccounts();
        if (botAccounts.length === 0) {
            return await e.reply({
                type: "ark",
                template_id: 23,
                kv: [
                  {
                    key: "#DESC#",
                    value: `未获取到账号`
                  },
                  {
                    key: "#PROMPT#",
                    value: `未获取到账号`
                  },
                  {
                    key: "#LIST#",
                    obj: [
                      {
                        obj_kv: [
                          { key: "desc", value: `未获取到账号` }
                        ]
                      },             
                    ]
                  }
                ]
              });
        }
        await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              {
                key: "#DESC#",
                value: `机器人账号`
              },
              {
                key: "#PROMPT#",
                value: `机器人账号`
              },
              {
                key: "#LIST#",
                obj: [
                  {
                    obj_kv: [
                      { key: "desc", value: `机器人账号` }
                    ]
                  },
                  {
                    obj_kv: [
                      { key: "desc", value: `${botAccounts.join(", ")}` }
                    ]
                  }             
                ]
              }
            ]
          })
    }
}