import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const bindFilePath = path.resolve(process.cwd(), 'bind_code.json');
const login_list = {};

// 读取绑定数据
async function readBindData() {
  try {
    const content = await fs.readFile(bindFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

// 写入绑定数据
async function bindUserIdToUin(user_id, uin) {
  try {
    let data = await readBindData();
    data[user_id] = uin;
    await fs.writeFile(bindFilePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.mark(`[绑定成功] user_id=${user_id} 绑定到 uin=${uin}`);
    return uin;
  } catch (err) {
    logger.mark(`[绑定失败] 写入文件错误: ${err.message}`);
    return null;
  }
}

export class xiaofei_violation_query extends plugin {
  constructor() {
    super({
      name: '账号绑定',
      dsc: '',
      event: 'message',
      priority: -99999999999,
      rule: [
        {
          reg: '^(#|/)?账号绑定?$', 
          fnc: 'bindAccount',
        },
        {
          reg: '^(#|/)?查询绑定?$', 
          fnc: 'queryBind',
        }
      ]
    });
  }

  async queryBind() {
    const e = this.e;
    const data = await readBindData();
    const uin = data[e.user_id];
    if (uin) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "绑定成功"
          },
          {
            key: "#PROMPT#",
            value: `${e.user_id} 已绑定 ${uin}`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  {
                    key: "desc",
                    value: `用户ID: ${e.user_id}`
                  }
                ]
              },
              {
                obj_kv: [
                  {
                    key: "desc",
                    value: `已绑定: ${uin}`
                  }
                ]
              }
            ]
          }
        ]
      })
      
    } else {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "未绑定账号提醒"
          },
          {
            key: "#PROMPT#",
            value: "未绑定账号提醒"
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: "还没有绑定账号喵" }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: "发送 #账号绑定 进行绑定" }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `你的用户ID是: ${e.user_id}` }
                ]
              }
            ]
          }
        ]
      });
      
    }
    return true;
  }

  async bindAccount() {
    const e = this.e;

    // 先检查是否已绑定
    const bindData = await readBindData();
    const existingUin = bindData[e.user_id];
    if (existingUin) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "绑定信息"
          },
          {
            key: "#PROMPT#",
            value: "绑定信息"
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `用户ID: ${e.user_id}` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `已绑定到: ${existingUin}` }
                ]
              }
            ]
          }
        ]
      });      
      return true;
    }

    const appid = 1109907872;
    let uin = e.user_id;
    let code;

    // 尝试使用缓存的 code
    if (login_list[`${uin}_code`] && (Date.now() - login_list[`${uin}_code`].time) < 10 * 60 * 1000) {
      code = login_list[`${uin}_code`].code;
    }

    if (!code) {
      const options = {
        method: 'GET',
        headers: {
          'qua': 'V1_HT5_QDT_0.70.2209190_x64_0_DEV_D',
          'host': 'q.qq.com',
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      };
      const response = await fetch('https://q.qq.com/ide/devtoolAuth/GetLoginCode', options);
      const result = await response.json();
      if (result.data && result.data.code) {
        const login_code = result.data.code;
        const verify_message = await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: "授权登录"
            },
            {
              key: "#PROMPT#",
              value: "授权登录"
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    {
                      key: "desc",
                      value: "请在一分钟内通过以下链接授权登录"
                    },
                  ]
                },
                {
                  obj_kv: [
                    {
                      key: "desc",
                      value: "点击链接完成授权"
                    },
                    {
                      key: "link",
                      value: `https://h5.qzone.qq.COM/qqq/code/${login_code}?_proxy=1&from=ide`
                    }
                  ]
                }
              ]
            }
          ]
        });

        const time = Date.now();
        let timer = -1;
        code = await new Promise(resolve => {
          let count = 0;
          if (login_list[uin]) {
            clearInterval(login_list[uin]);
            delete login_list[uin];
          }
          login_list[uin] = time;
          timer = setInterval(async () => {
            if (count >= 60 || login_list[uin] != time) {
              clearInterval(timer);
              if (count >= 60) await e.reply({
                type: "ark",
                template_id: 23,
                kv: [
                  {
                    key: "#DESC#",
                    value: "授权登录超时"
                  },
                  {
                    key: "#PROMPT#",
                    value: "授权登录超时"
                  },
                  {
                    key: "#LIST#",
                    obj: [
                      {
                        obj_kv: [
                          {
                            key: "desc",
                            value: "授权登录超时!"
                          }
                        ]
                      }
                    ]
                  }
                ]
              });              
              resolve(false);
              return;
            }
            const res = await fetch(`https://q.qq.com/ide/devtoolAuth/syncScanSateGetTicket?code=${login_code}`, options);
            const result = await res.json();
            if (result.code != 0) {
              clearInterval(timer);
              e.reply(`授权登录失败！\n${result.message}[${result.code}]`, true);
              resolve(false);
              return;
            }
            const data = result.data || {};
            if (data?.ok === 1) {
              if (data.uin) uin = data.uin;
              clearInterval(timer);
              const ticket = data.ticket;
              const loginRes = await fetch('https://q.qq.com/ide/login', {
                method: 'POST',
                headers: options.headers,
                body: JSON.stringify({ appid, ticket })
              });
              const loginData = await loginRes.json();
              if (!loginData.code) {
                e.reply(`授权登录失败！\n${loginData.message}`, true);
                resolve(false);
                return;
              }
              resolve(loginData.code);
              return;
            }
            count++;
          }, 1000);
        });

        if (verify_message) {
          try {
            if (e.group) e.group.recallMsg(verify_message.message_id);
            if (e.friend) e.friend.recallMsg(verify_message.message_id);
          } catch (err) {}
        }

        if (login_list[uin] === time) delete login_list[uin];
        if (!code) return true;
      }
    }

    if (!code) {
      e.reply('获取code失败！', true);
      return;
    }

    const finalRes = await fetch('https://minico.qq.com/minico/oauth20?uin=QQ%E5%AE%89%E5%85%A8%E4%B8%AD%E5%BF%83', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, appid, platform: 'qq' })
    });
    const finalData = await finalRes.json();
    if (finalData.retcode != '0' || !finalData.data) {
      if (login_list[`${uin}_code`]) delete login_list[`${uin}_code`];
      e.reply(`code授权登录失败[${finalData.retcode}]，请重试！`, true);
      return;
    }

    if (finalData.data.uin) uin = finalData.data.uin;

    logger.mark(`开始绑定：user_id=${e.user_id}, uin=${uin}`);
    const bindUin = await bindUserIdToUin(e.user_id, uin);
    if (bindUin) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: "绑定成功"
          },
          {
            key: "#PROMPT#",
            value: "绑定成功"
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `用户ID: ${e.user_id}` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `绑定到QQ: ${bindUin}` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: "绑定成功!" }
                ]
              }
            ]
          }
        ]
      });      
    } else {
      await e.reply(`❌ 绑定失败，请稍后再试。\n你的 user_id 是：${e.user_id}`, true);
    }

    return true;
  }
}
