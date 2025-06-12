import fs from 'fs';
import path from 'path';
import { getUinByUserId } from './bind.js';


const buttonData1 = {
    type: "keyboard",
    id: "102080069_1748443765"
};

const buttonData2 = {
    type: "keyboard",
    id: "102080069_1748446880"
};

// 发送按钮消息的函数
async function sendButtonMessage(e) {
    try {
        await e.reply(segment.raw(buttonData1));
        await e.reply(segment.raw(buttonData2));
    } catch (err) {
        // 可忽略错误
    }
}

export class IdleTycoonPlugin extends plugin {
  constructor() {
    super({
      name: '星铁展会大亨',
      dsc: '星铁展会经营游戏插件',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: '^[#|/]?创建展会$',
          fnc: 'createUser'
        },
        {
          reg: '^[#|/]?一键收取$',
          fnc: 'collectAll'
        },
        {
          reg: '^[#|/]?(普通|黄金|炫彩)邀约$',
          fnc: 'gachaAssistant'
        },
        {
          reg: '^[#|/]?解锁(.*)$',
          fnc: 'unlockShop'
        },
        {
          reg: '^[#|/]?世界排行$',
          fnc: 'worldRank'
        },
        {
          reg: '^[#|/]?展会信息$',
          fnc: 'showInfo'
        },
        {
          reg: '^[#|/]?展会指令$',
          fnc: 'showCmds'
        },
        {
          reg: '^[#|/]?助理卡池$',
          fnc: 'showGachaInfo'
        },
        {
          reg: '^[#|/]?查看展台 (.+)$',
          fnc: 'showShopDetail'
        },
        {
          reg: '^[#|/]?升级助理 (.+)$',
          fnc: 'upgradeAssistant'
        },
        {
          reg: '^[#|/]?快速升级 (.+)$',
          fnc: 'quickUpgradeAssistant'
        },
        {
          reg: '^[#|/]?分配助理 (.+) (.+)$',
          fnc: 'assignAssistant'
        },
        {
          reg: '^[#|/]?我的助理$',
          fnc: 'showAssistants'
        },
        {
          reg: '^[#|/]?重置展会$',
          fnc: 'resetExpo'
        },
        {
          reg: '^[#|/]?每日抽奖$',
          fnc: 'dailyLottery'
        },
        {
          reg: '^[#|/]?钻石抽卡 (普通|黄金|炫彩)$',
          fnc: 'diamondGacha'
        },
      ]
    });

    // 路径初始化和目录检查放回构造函数
    this.savePath = path.join(process.cwd(), 'plugins',  'zhiyu-plugin', 'data', 'saves');
    this.worldPath = path.join(process.cwd(), 'plugins',  'zhiyu-plugin', 'data', 'world.json');
    this.assistantDataPath = path.join(process.cwd(), 'plugins', 'zhiyu-plugin', 'data', '[星铁Wolrd]助理名单.json');
    this.ensureDirectories();
  }

  // 游戏配置数据
  booths = {
    '咖啡馆': { area: '消费展区', unlock_cost: '10K', base_income: '1000', unlocked: false },
    '便利店': { area: '消费展区', unlock_cost: '100K', base_income: '5000', unlocked: false },
    '服装店': { area: '消费展区', unlock_cost: '1M', base_income: '20000', unlocked: false },
    '电玩城': { area: '趣味展区', unlock_cost: '10M', base_income: '100000', unlocked: false },
    'KTV': { area: '趣味展区', unlock_cost: '100M', base_income: '500000', unlocked: false },
    '电影院': { area: '趣味展区', unlock_cost: '1G', base_income: '2000000', unlocked: false },
    '书店': { area: '纪念展区', unlock_cost: '10G', base_income: '10000000', unlocked: false },
    '培训班': { area: '纪念展区', unlock_cost: '100G', base_income: '50000000', unlocked: false },
    '科技馆': { area: '纪念展区', unlock_cost: '1AA', base_income: '200000000', unlocked: false }
  };

  assistantPool = {
    '普通': { cost: 100, rates: { '见习': 0.8, '熟练': 0.18, '资深': 0.02 } },
    '黄金': { cost: 300, rates: { '见习': 0.5, '熟练': 0.4, '资深': 0.1 } },
    '炫彩': { cost: 500, rates: { '见习': 0.2, '熟练': 0.5, '资深': 0.3 } }
  };

  starUpgradeCost = {
    1: 3,   // 1星升2星需要3个碎片
    2: 10,  // 2星升3星需要10个碎片
    3: 20   // 3星升4星需要20个碎片
  };

  levelUpgradeBaseCost = 1000;      // 初始升级费用
  levelUpgradeMultiplier = 1.13;    // 每级升级费用倍率
  units = ['', 'K', 'M', 'G', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II', 'JJ', 'KK', 'LL', 'MM', 'NN', 'OO', 'PP', 'QQ', 'RR', 'SS', 'TT', 'UU', 'VV', 'WW', 'XX', 'YY', 'ZZ'];



  // 工具方法
  ensureDirectories() {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  // 保存玩家数据时，文件名由群号和uin组成，例如：group_群号_user_qq号.json
  // 具体实现如下：
  getSaveFile(e) {
    // 获取uin
    const userId = e.user_id.toString();
    const uin = (e.data && e.data.qq);
    let name = (e.data && e.data.name);
    // 如果没有name则用uin
    if (!name || name === '') name = uin;
    const groupId = e.group_id; // 获取群号
    return path.join(this.savePath, `id_${uin}.json`);
  }//name_${name}

  savePlayer(e, data) {
    const filePath = this.getSaveFile(e);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  loadPlayer(e) {
    const filePath = this.getSaveFile(e);
    if (fs.existsSync(filePath)) {
      const player = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // 兼容旧数据格式
      if (player.assistants && player.assistants.length > 0) {
        const newAssistants = [];
        for (const assistant of player.assistants) {
          if (typeof assistant === 'string') {
            // 旧格式转换
            let level = 1, star = 1;
            for (const [boothName, booth] of Object.entries(player.booths)) {
              if (booth.assistant && booth.assistant.name === assistant) {
                level = booth.assistant.level || 1;
                star = booth.assistant.star || 1;
                break;
              }
            }
            newAssistants.push({ name: assistant, level, star });
          } else {
            newAssistants.push(assistant);
          }
        }
        player.assistants = newAssistants;
      }
      
      return player;
    }
    return null;
  }

  saveWorld(world) {
    // 兼容旧数据格式转换
    if (world && !Array.isArray(world)) {
      const converted = [];
      for (const [name, gold] of Object.entries(world)) {
        converted.push({ name, gold });
      }
      world = converted;
    }
    fs.writeFileSync(this.worldPath, JSON.stringify(world, null, 2));
  }

  loadWorld() {
    try {
      if (fs.existsSync(this.worldPath)) {
        const data = JSON.parse(fs.readFileSync(this.worldPath, 'utf8'));
        // 兼容旧数据格式转换
        if (data && !Array.isArray(data)) {
          const converted = [];
          for (const [name, gold] of Object.entries(data)) {
            converted.push({ name, gold });
          }
          return converted;
        }
        return data || [];
      }
      return [];
    } catch (err) {
      console.error('加载世界排行数据失败:', err);
      return [];
    }
  }

  formatGold(num) {
    num = parseFloat(num);
    let unit = 0;
    while (num >= 1000 && unit < this.units.length - 1) {
      num /= 1000;
      unit++;
    }
    return Math.floor(num) + this.units[unit];
  }

  parseGold(str) {
    const match = str.match(/([0-9.]+)([A-Z]*)/);
    if (match) {
      const num = parseFloat(match[1]);
      const unitIndex = this.units.indexOf(match[2]);
      return num * Math.pow(1000, unitIndex >= 0 ? unitIndex : 0);
    }
    return 0;
  }

  getDefaultPlayer(name, uin) {
    // 如果没有name则用uin
    if (!name || name === '') name = uin;
    const booths = {};
    for (const [boothName, info] of Object.entries(this.booths)) {
      booths[boothName] = {
        unlocked: boothName === '咖啡馆',
        assistant: null,
        last_collect: Date.now()
      };
    }

    return {
      name,
      gold: 0,
      diamond: 0,
      booths,
      assistants: [],
      fragments: {},
      city_level: 1,
      total_income: 0,
      tutorial_step: 1,
      tickets: {
        '普通': 1,
        '黄金': 0,
        '炫彩': 0
      }
    };
  } 世界

  
  // 绑定检测方法
  async testBind(e) {
    const userId = e.user_id.toString();
    const uin = await getUinByUserId(userId);
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
                  { key: "desc", value: `星铁Wolrd不可用` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `使用 账号绑定 绑定` }
                ]
              }             
            ]
          }
        ]
      });
      return true;
    }

    let json;
    try {
      const res = await fetch(`http://api.loomi.icu/?qq=${uin}`);
      if (!res.ok) {
        await e.reply(`接口请求失败，状态码：${res.status}`);
        return true;
      }
      json = await res.json();
    } catch (err) {
      await e.reply(`请求接口出错：${err.message}`);
      return true;
    }

    if (!json.success || !json.data) {
      await e.reply(`查询失败：${json.msg || '未知错误'}`);
      return true;
    }

    // 从接口获取data.name和data.qq，赋值到e.data
    e.data = e.data || {};
    e.data.qq = json.data.qq;
    e.data.name = json.data.name;

    return false;
  }

  // 游戏功能方法
  async createUser(e) {
    if (await this.testBind(e)) return;

    // 新增：判断是否已存在展会
    const existPlayer = this.loadPlayer(e);
    if (existPlayer) {
        await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
                { key: "#DESC#", value: `你已经创建过展会，不能重复创建！` },
                { key: "#LIST#", obj: [
                    { obj_kv: [{ key: "desc", value: `已有展会：${existPlayer.name}` }] }
                ]}
            ]
        });
        await sendButtonMessage(e);
        return;
    }

    let name = (e.data && e.data.name);
    const uin = (e.data && e.data.qq);
    if (!name || name === '') name = uin;
    if (!name) {
        await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
                { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "展会名称不可为空" }] }] }
            ]
        });
        await sendButtonMessage(e);
        return;
    }

    const player = this.getDefaultPlayer(name, uin);
    this.savePlayer(e, player);

    await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
            { key: "#DESC#", value: `展会创建成功! ${name}` },
            { key: "#LIST#", obj: [
                { obj_kv: [{ key: "desc", value: `展会创建成功!\n已有展会：${name}\n[新手引导]` }] },
                { obj_kv: [{ key: "desc", value: `1️ 使用 普通邀约 来获得你的第一个助理\n2️ 使用 分配助理 助理名 咖啡馆 将助理分配到展区\n3️ 使用 一键收取 来获取收益` }] }
            ]}
        ]
    });
    await sendButtonMessage(e);
  }

  async collectAll(e) {
    if (await this.testBind(e)) return;

    const player = this.loadPlayer(e);
    if (!player) {
        await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
                { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
            ]
        });
        await sendButtonMessage(e);
        return;
    }

    const now = Date.now();
    let income = 0;
    const cityLevel = this.getCityLevel(player.total_income);
    const buff = this.getCityBuff(cityLevel);

    for (const [boothName, info] of Object.entries(player.booths)) {
        if (!info.unlocked || !info.assistant) continue;

        const seconds = (now - info.last_collect) / 1000;
        const boothBase = this.booths[boothName].base_income;
        const assistant = info.assistant;

        // 计算基础收入
        const baseIncome = seconds * this.parseGold(boothBase) * buff;

        // 计算助理加成
        const assistantBonus = this.calculateAssistantBonus(assistant, player.assistants);

        income += baseIncome * assistantBonus;
        info.last_collect = now;
    }

    player.gold += income;
    player.total_income += income;

    // 检查展会升级
    const newLevel = this.getCityLevel(player.total_income);
    let levelUpMsg = '';
    if (newLevel > player.city_level) {
        player.city_level = newLevel;
        levelUpMsg = {
            type: "ark",
            template_id: 23,
            kv: [
                {
                    key: "#DESC#",
                    value: `展会升级成功`
                },
                {
                    key: "#PROMPT#",
                    value: `展会升级成功`
                },
                {
                    key: "#LIST#",
                    obj: [
                        {
                            obj_kv: [
                                { key: "desc", value: `展会升级到Lv.${newLevel}` }
                            ]
                        },
                        {
                            obj_kv: [
                                { key: "desc", value: `全局收益提升至${this.getCityBuff(newLevel) * 100}%` }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    // 更新新手引导步骤
    let tutorialMsg = '';
    if (player.tutorial_step === 3) {
        player.tutorial_step = 4;
        tutorialMsg = {
            type: "ark",
            template_id: 23,
            kv: [
                {
                    key: "#DESC#",
                    value: "[新手引导完成]"
                },
                {
                    key: "#PROMPT#",
                    value: "恭喜你完成了新手引导！"
                },
                {
                    key: "#LIST#",
                    obj: [
                        {
                            obj_kv: [
                                { key: "desc", value: "[新手引导完成]\n恭喜你完成了新手引导\n1 继续抽取更多助理" }
                            ]
                        },
                        {
                            obj_kv: [
                                { key: "desc", value: "2 解锁新的展台" }
                            ]
                        },
                        {
                            obj_kv: [
                                { key: "desc", value: "3 升级助理等级" }
                            ]
                        },
                        {
                            obj_kv: [
                                { key: "desc", value: "4 查看 展会指令 了解更多玩法" }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    this.savePlayer(e, player);

    // 更新世界排行
    const world = this.loadWorld();
    let found = false;
    for (const p of world) {
        if (p.name === player.name) {
            p.gold = player.gold;
            p.total_income = player.total_income;
            found = true;
        }
    }
    if (!found) {
        world.push({
            name: player.name,
            gold: player.gold,
            total_income: player.total_income
        });
    }
    this.saveWorld(world);

    await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
            { key: "#DESC#", value: `本次收取获得金币：${this.formatGold(income)}` },
            { key: "#PROMPT#", value: `本次收取获得金币：${this.formatGold(income)}功` },
            { key: "#LIST#", obj: [
                { obj_kv: [{ key: "desc", value: `本次收取获得金币：${this.formatGold(income)}` }] },
                { obj_kv: [{ key: "desc", value: `当前金币：${this.formatGold(player.gold)}` }] },
                ...(levelUpMsg ? [{ obj_kv: [{ key: "desc", value: levelUpMsg }] }] : [])
            ]}
        ]
    });
    await sendButtonMessage(e);
    if (tutorialMsg) {
        await e.reply(tutorialMsg);
        await sendButtonMessage(e);
    }
  }

  calculateAssistantBonus(assistant, allAssistants) {
    let bonus = 1.0;

    try {
      // 加载助理数据
      const assistantData = JSON.parse(fs.readFileSync(this.assistantDataPath, 'utf8'));
      const assistantInfo = assistantData.find(data => data.name === assistant.name);

      if (assistantInfo) {
        // 兼容旧数据，如果没有等级和星级字段，默认为1级1星
        const level = assistant.level || 1;
        const star = assistant.star || 1;

        // 计算等级加成
        bonus *= (1 + (level - 1) * 1.0);

        // 计算星级加成
        bonus *= (1 + (star - 1) * 2.0);

        // 计算特质加成
        for (const trait of assistantInfo.traits) {
          // 检查是否是羁绊效果（包含"收入增加"的特质）
          let matches = trait.match(/(.+)收入增加(\d+)%/);
          if (matches) {
            const targetName = matches[1];
            const increasePercent = parseInt(matches[2]);

            // 检查目标助理是否在展台中工作
            const targetFound = allAssistants.some(playerAssistant => 
                playerAssistant.name === targetName
              );
  
              // 如果目标助理在工作，应用加成
              if (targetFound) {
                bonus *= (1 + increasePercent / 100);
              }
            }
            // 检查是否是区域加成
            else {
              matches = trait.match(/(.+)展区收入增加(\d+)%/);
              if (matches) {
                const area = matches[1];
                const increasePercent = parseInt(matches[2]);
                bonus *= (1 + increasePercent / 100);
              }
              // 检查是否是全局加成
              else {
                matches = trait.match(/所有展台收入增加(\d+)%/);
                if (matches) {
                  const increasePercent = parseInt(matches[1]);
                  bonus *= (1 + increasePercent / 100);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('加载助理数据失败:', error);
      }
      return bonus;
    }

    async unlockShop(e) {
      if (await this.testBind(e)) return;

      const player = this.loadPlayer(e);
      if (!player) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#PROMPT#", value: "请先使用 创建展会 创建展会" }
          ]
        });
        return;
      }
  
      const shop = e.msg.replace('解锁', '').trim();
      if (!this.booths[shop]) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "没有这个展台" }] }] }
          ]
        });
        return;
      }
      
      if (player.booths[shop].unlocked) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "该展台已解锁" }] }] }
          ]
        });
        return;
      }
      
      const cost = this.parseGold(this.booths[shop].unlock_cost);
      if (player.gold < cost) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "金币不足，无法解锁" }] }] }
          ]
        });
        return;
      }
  
      player.gold -= cost;
      player.booths[shop].unlocked = true;
      this.savePlayer(e, player);
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#PROMPT#", value: `成功解锁展台：${shop}! ` },
          { key: "#LIST#", obj: [
            { obj_kv: [{ key: "desc", value: `成功解锁展台：${shop}! \n请分配助理到该展台以获得收益` }] }
          ]}
        ]
      });
    }
  
    async worldRank(e) {
      if (await this.testBind(e)) return;

      const world = this.loadWorld();
      if (!world || world.length === 0) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "当前没有任何展会数据\n请先创建展会并参与游戏" }] }] }
          ]
        });
        return;
      }

      // 对世界排行按总收入排序
      world.sort((a, b) => (b.total_income || 0) - (a.total_income || 0));
      
      e.reply({
  type: "ark",
  template_id: 23,
  kv: [
    {
      key: "#LIST#",
      obj: [
        {
          obj_kv: [
            { key: "desc", value: "🌏 世界总收入排行榜" }
          ]
        },
        ...world.slice(0, 10).map((player, i) => ({
          obj_kv: [
            {
              key: "desc",
              value: `${i + 1}  ${player.name}：${this.formatGold(player.total_income || 0)}`
            }
          ]
        }))
      ]
    }
  ]
        
      });
    }
  
    async showInfo(e) {
      if (await this.testBind(e)) return;

      const player = this.loadPlayer(e);
      if (!player) {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
          ]
        });
        await sendButtonMessage(e);
        return;
      }

      let incomeRate = 0;
      const cityLevel = this.getCityLevel(player.total_income);
      const buff = this.getCityBuff(cityLevel);

      for (const [boothName, info] of Object.entries(player.booths)) {
        if (!info.unlocked || !info.assistant) continue;
        const boothBase = this.booths[boothName].base_income;
        const assistant = info.assistant;
        const assistantBonus = this.calculateAssistantBonus(assistant, player.assistants);
        incomeRate += this.parseGold(boothBase) * buff * assistantBonus;
      }

      const nextLevel = cityLevel < 10 ? cityLevel + 1 : 10;
      const nextNeed = this.getCityLevelThreshold(nextLevel);

      // 展会基础信息
      let baseInfo = [
        { key: "desc", value: `展会名称：${player.name}` },
        { key: "desc", value: `展会等级：Lv.${cityLevel} (收益加成：${buff * 100}%)` },
        { key: "desc", value: `金币：${this.formatGold(player.gold)}` },
        { key: "desc", value: `钻石：${player.diamond}` },
        { key: "desc", value: `总收入：${this.formatGold(player.total_income)}` },
        { key: "desc", value: `当前金币获取速率：${this.formatGold(incomeRate)}/秒` }
      ];

      // 邀约卡信息
      let ticketInfo = [];
      for (const [type, count] of Object.entries(player.tickets)) {
        ticketInfo.push({ key: "desc", value: `${type}邀约卡：${count}张` });
      }

      // 下一级信息
      let nextLevelInfo = [];
      if (cityLevel < 10) {
        nextLevelInfo.push({ key: "desc", value: `下一级展会Lv.${nextLevel} \n需要总收入：${this.formatGold(nextNeed)}` });
      } else {
        nextLevelInfo.push({ key: "desc", value: "已达最高展会等级" });
      }

      // 展区分组信息
      let areaMsg = [];
      try {
        const assistantData = JSON.parse(fs.readFileSync(this.assistantDataPath, 'utf8'));
        const areas = {
          '消费展区': {},
          '趣味展区': {},
          '纪念展区': {}
        };
        for (const [boothName, info] of Object.entries(player.booths)) {
          const area = this.booths[boothName].area;
          areas[area][boothName] = info;
        }
        for (const [area, booths] of Object.entries(areas)) {
          areaMsg.push({ key: "desc", value: `═════【${area}】═════` });
          for (const [boothName, info] of Object.entries(booths)) {
            let line = (info.unlocked ? '✅' : '❌') + boothName;
            if (!info.unlocked) {
              line += `（解锁价：${this.booths[boothName].unlock_cost}）`;
            }
            if (info.unlocked && info.assistant) {
              let level = 1, star = 1, assistantRank = '见习';
              const playerAssistant = player.assistants.find(a => a.name === info.assistant.name);
              if (playerAssistant) {
                level = playerAssistant.level;
                star = playerAssistant.star;
                const data = assistantData.find(d => d.name === info.assistant.name);
                if (data) assistantRank = data.level;
              }
              line += ` [${info.assistant.name}|${assistantRank}](Lv.${level}|${star}⭐)`;
            }
            areaMsg.push({ key: "desc", value: line });
          }
        }
      } catch (error) {
        areaMsg.push({ key: "desc", value: "加载助理数据失败" });
      }

      // 助理碎片显示优化：显示所有拥有过的助理的碎片（包括0个）
      let fragmentMsg = [];
      // 收集所有助理名字（已拥有+有碎片的）
      const assistantNames = new Set();
      if (player.assistants && player.assistants.length > 0) {
        player.assistants.forEach(a => assistantNames.add(a.name));
      }
      if (player.fragments && typeof player.fragments === 'object') {
        Object.keys(player.fragments).forEach(name => assistantNames.add(name));
      }
      if (assistantNames.size > 0) {
        fragmentMsg.push({ key: "desc", value: "[助理碎片]" });
        for (const name of assistantNames) {
          const count = player.fragments && player.fragments[name] ? player.fragments[name] : 0;
          fragmentMsg.push({ key: "desc", value: `${name}：${count}个` });
        }
      }

      // 新手引导
      let tutorialMsg = [];
      if (player.tutorial_step <= 3) {
        tutorialMsg.push({ key: "desc", value: "[新手引导]" });
        switch (player.tutorial_step) {
          case 1:
            tutorialMsg.push({ key: "desc", value: "1️ 使用 普通邀约 来获得你的第一个助理" });
            break;
          case 2:
            tutorialMsg.push({ key: "desc", value: "2️ 使用 分配助理 助理名 咖啡馆 将助理分配到展区" });
            break;
          case 3:
            tutorialMsg.push({ key: "desc", value: "3️ 使用 一键收取 来获取收益" });
            break;
        }
      }

      // 统一ark卡片回复
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#PROMPT#", value: "展会信息" },
          { key: "#LIST#", obj: [
            ...baseInfo,
            ...ticketInfo,
            ...nextLevelInfo,
            ...areaMsg,
            ...fragmentMsg,
            ...tutorialMsg
          ].map(item => ({ obj_kv: [item] }))}
        ]
      });
      await sendButtonMessage(e);
    }
  
    async showCmds(e) {
      if (await this.testBind(e)) return;

      const cmds = [
      "[展会指令列表]",
      "1. 展会信息",
      "2. 每日抽奖",
      "3. 一键收取",
      "4. 普通邀约",
      "5. 黄金邀约",
      "6. 炫彩邀约",
      "7. 快速升级 助理名",
      "8. 分配助理 助理名 展台名",
      "9. 查看展台 展台名",
      "10. 世界排行",
      "11. 解锁 展台名",
      "12. 助理卡池",
      "13. 升级助理 助理名",
      "14. 我的助理",
      "15. 创建展会",
      "16. 钻石抽卡 普通",
      "15. 钻石抽卡 黄金",
      "15. 钻石抽卡 炫彩"
      ];

    await e.reply({
    type: "ark",
    template_id: 23,
    kv: [
      { key: "#PROMPT#", value: "[展会指令列表]" },
      { key: "#LIST#", obj: cmds.map(cmd => ({ obj_kv: [{ key: "desc", value: cmd }] })) }
    ]
    });
      await sendButtonMessage(e);
    }
  
      async showGachaInfo(e) {
      if (await this.testBind(e)) return;

      let list = [];
      list.push({ key: "desc", value: "[助理卡池消耗与概率]" });
      for (const [type, pool] of Object.entries(this.assistantPool)) {
        list.push({ key: "desc", value: `${type}卡池：${pool.cost}钻石/次 或 1张${type}邀约卡/次` });
        const rates = pool.rates;
        list.push({ key: "desc", value: `  资深：${Math.round(rates['资深'] * 100)}%` });
        list.push({ key: "desc", value: `  熟练：${Math.round(rates['熟练'] * 100)}%` });
        list.push({ key: "desc", value: `  见习：${Math.round(rates['见习'] * 100)}%` });
      }
      list.push({ key: "desc", value: "【升星所需碎片】" });
      list.push({ key: "desc", value: "1星→2星：3个碎片" });
      list.push({ key: "desc", value: "2星→3星：10个碎片" });
      list.push({ key: "desc", value: "3星→4星：20个碎片" });
      list.push({ key: "desc", value: "注：获得重复助理会自动转化为碎片，碎片足够时会自动升星！" });
      list.push({ key: "desc", value: "【钻石用途】" });
      list.push({ key: "desc", value: "可使用'钻石抽卡 普通|黄金|炫彩'消耗钻石直接抽卡。" });

      await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        { key: "#PROMPT#", value: "助理卡池信息" },
        { key: "#LIST#", obj: list.map(item => ({ obj_kv: [item] })) }
      ]
      });
      await sendButtonMessage(e);
    }
  
    async showShopDetail(e) {
      if (await this.testBind(e)) return;

      const player = this.loadPlayer(e);
      if (!player) {
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '请先使用 创建展会 创建展会' }] }] }
        ]
      });
      return;
      }

      const match = e.msg.match(/^查看展台 (.+)$/);
      if (!match) {
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '格式错误，请使用 查看展台 展台名' }] }] }
        ]
      });
      return;
      }

      const booth = match[1];
      if (!player.booths[booth]) {
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '没有这个展台' }] }] }
        ]
      });
      return;
      }

      if (!player.booths[booth].unlocked) {
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '该展台未解锁' }] }] }
        ]
      });
      return;
      }

      const assistant = player.booths[booth].assistant;
      if (!assistant) {
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `展台：${booth}\n当前无助理` }] }] }
        ]
      });
      return;
      }

      try {
      // 加载助理数据
      const assistantData = JSON.parse(fs.readFileSync(this.assistantDataPath, 'utf8'));
      const assistantInfo = assistantData.find(data => data.name === assistant.name);

      // 计算升级费用
      const upgradeCost = this.levelUpgradeBaseCost * Math.pow(this.levelUpgradeMultiplier, assistant.level - 1);

      // 计算当前速率
      const cityLevel = this.getCityLevel(player.total_income);
      const buff = this.getCityBuff(cityLevel);
      const boothBase = this.booths[booth].base_income;
      const currentBonus = this.calculateAssistantBonus(assistant, player.assistants);
      const currentRate = this.parseGold(boothBase) * buff * currentBonus;

      // 计算下一级速率
      const nextLevelAssistant = { ...assistant, level: assistant.level + 1 };
      const nextLevelBonus = this.calculateAssistantBonus(nextLevelAssistant, player.assistants);
      const nextLevelRate = this.parseGold(boothBase) * buff * nextLevelBonus;

      // 计算下10级速率
      const next10LevelAssistant = { ...assistant, level: assistant.level + 10 };
      const next10LevelBonus = this.calculateAssistantBonus(next10LevelAssistant, player.assistants);
      const next10LevelRate = this.parseGold(boothBase) * buff * next10LevelBonus;

      // ark卡片内容
      let kvList = [
        { key: "desc", value: `🏪 展台：${booth}` },
        { key: "desc", value: `助理：${assistant.name}` },
        { key: "desc", value: `等级：${assistant.level}` },
        { key: "desc", value: `星级：${assistant.star}` },
        { key: "desc", value: `升级费用：${this.formatGold(upgradeCost)}` },
        { key: "desc", value: `[收益速率]` },
        { key: "desc", value: `当前速率：${this.formatGold(currentRate)}/秒` },
        { key: "desc", value: `下一级速率：${this.formatGold(nextLevelRate)}/秒` },
        { key: "desc", value: `下10级速率：${this.formatGold(next10LevelRate)}/秒` }
      ];

      if (assistantInfo) {
        kvList.push({ key: "desc", value: "[特质]" });
        for (const trait of assistantInfo.traits) {
        kvList.push({ key: "desc", value: `- ${trait}` });
        }

        if (assistantInfo.bond && assistantInfo.bond.length > 0) {
        kvList.push({ key: "desc", value: "[羁绊]" });
        for (const bond of assistantInfo.bond) {
          let hasBond = '❌';
          // 检查所有展台分配的助理
          for (const [boothName, boothInfo] of Object.entries(player.booths)) {
          if (boothInfo.assistant && boothInfo.assistant.name === bond) {
            hasBond = '✅';
            break;
          }
          }
          kvList.push({ key: "desc", value: `- ${bond} ${hasBond}` });
        }
        }
      }

      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#PROMPT#", value: `展台详情` },
        { key: "desc", value: `展台详情` },
        { key: "#LIST#", obj: kvList.map(item => ({ obj_kv: [item] })) }
        ]
      });
      } catch (error) {
      console.error('加载助理数据失败:', error);
      e.reply({
        type: "ark",
        template_id: 23,
        kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "助理数据加载失败" }] }] }
        ]
      });
      }
    }
    
      async showAssistants(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
        ]
          });
          return;
        }

        if (!player.assistants || player.assistants.length === 0) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "你还没有任何助理，快去抽取吧！" }] }] }
        ]
          });
          return;
        }

        let list = [];
        list.push({ key: "desc", value: "[我的助理列表]" });
        for (const assistant of player.assistants) {
          let line = `[${assistant.name}] (Lv.${assistant.level}，${assistant.star}⭐)`;
          // 查找助理当前工作的展台
          for (const [boothName, info] of Object.entries(player.booths)) {
        if (info.assistant && info.assistant.name === assistant.name) {
          line += ` - 工作地点：${boothName}`;
          break;
        }
          }
          list.push({ key: "desc", value: line });
        }

        // 显示碎片信息
        if (Object.keys(player.fragments).length > 0) {
          list.push({ key: "desc", value: "【助理碎片】" });
          for (const [name, count] of Object.entries(player.fragments)) {
        list.push({ key: "desc", value: `${name}：${count}个` });
          }
        }

        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
        { key: "#PROMPT#", value: "[我的助理]" },
        { key: "#LIST#", obj: list.map(item => ({ obj_kv: [item] })) }
          ]
        });
        await sendButtonMessage(e);
      }

      async upgradeAssistant(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
        ]
          });
          return;
        }

        const match = e.msg.match(/^升级助理 (.+)$/);
        if (!match) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "格式错误，请使用 升级助理 助理名" }] }] }
        ]
          });
          return;
        }

        const assistantName = match[1];
        const assistant = player.assistants.find(a => a.name === assistantName);

        if (!assistant) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "未找到该助理" }] }] }
        ]
          });
          return;
        }

        // 计算升级费用
        const upgradeCost = this.levelUpgradeBaseCost * Math.pow(this.levelUpgradeMultiplier, assistant.level - 1);

        if (player.gold < upgradeCost) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `金币不足，升级需要：${this.formatGold(upgradeCost)}` }] }] }
        ]
          });
          return;
        }

        // 扣除金币并升级
        player.gold -= upgradeCost;
        const oldLevel = assistant.level;
        assistant.level++;

        // 检查升级奖励
        const rewards = [];
        if (assistant.level % 50 === 0) {
          player.diamond += 100;
          rewards.push('100钻石');
        }
        if (assistant.level % 100 === 0) {
          player.tickets['炫彩']++;
          rewards.push('1张炫彩邀约卡');
        }

        let msg = `成功将${assistantName}升级到${assistant.level}级！`;
        if (rewards.length > 0) {
          msg += `\n获得奖励：${rewards.join('、')}`;
        }

        this.savePlayer(e, player);
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
          ]
        });
        await sendButtonMessage(e);
      }

      async quickUpgradeAssistant(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
        ]
          });
          return;
        }

        const match = e.msg.match(/^快速升级 (.+)$/);
        if (!match) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "格式错误，请使用：快速升级 助理名" }] }] }
        ]
          });
          return;
        }

        const assistantName = match[1];
        const assistant = player.assistants.find(a => a.name === assistantName);

        if (!assistant) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "未找到该助理" }] }] }
        ]
          });
          return;
        }

        // 计算升级10级的总费用
        let totalCost = 0;
        for (let i = 0; i < 10; i++) {
          const level = assistant.level + i;
          const cost = this.levelUpgradeBaseCost * Math.pow(this.levelUpgradeMultiplier, level - 1);
          totalCost += cost;
        }

        if (player.gold < totalCost) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `金币不足，升级10级需要：${this.formatGold(totalCost)}` }] }] }
        ]
          });
          return;
        }

        // 扣除金币并升级
        player.gold -= totalCost;
        const oldLevel = assistant.level;
        assistant.level += 10;

        // 检查升级奖励
        const rewards = [];
        for (let level = oldLevel + 1; level <= assistant.level; level++) {
          if (level % 50 === 0) {
        player.diamond += 100;
        rewards.push('100钻石');
          }
          if (level % 100 === 0) {
        player.tickets['炫彩']++;
        rewards.push('1张炫彩邀约卡');
          }
        }

        let msg = `成功将${assistantName}从${oldLevel}级升级到${assistant.level}级！\n`;
        msg += `消耗金币：${this.formatGold(totalCost)}`;
        if (rewards.length > 0) {
          msg += `\n获得奖励：${rewards.join('、')}`;
        }

        this.savePlayer(e, player);
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
          ]
        });
        await sendButtonMessage(e);
      }

      async assignAssistant(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
        ]
          });
          return;
        }

        const match = e.msg.match(/^分配助理 (.+) (.+)$/);
        if (!match) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "格式错误，请使用：分配助理 助理名 展区名" }] }] }
        ]
          });
          return;
        }

        const assistantName = match[1];
        const booth = match[2];

        // 查找助理
        const assistant = player.assistants.find(a => a.name === assistantName);
        if (!assistant) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "你没有这个助理" }] }] }
        ]
          });
          return;
        }

        // 检查展区是否存在
        if (!player.booths[booth]) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "没有这个展区" }] }] }
        ]
          });
          return;
        }

        // 检查展区是否已解锁
        if (!player.booths[booth].unlocked) {
          e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "该展区未解锁" }] }] }
        ]
          });
          return;
        }

        // 检查该助理是否已在其他展区
        for (const [otherBooth, info] of Object.entries(player.booths)) {
          if (info.assistant && info.assistant.name === assistantName) {
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `该助理已在${otherBooth}展区工作` }] }] }
          ]
        });
        return;
          }
        }

        let msg = '';
        // 如果展区已有其他助理，先移除
        if (player.booths[booth].assistant) {
          const oldAssistant = player.booths[booth].assistant.name;
          msg = `已将${oldAssistant}从${booth}展区调离\n`;
        }

        // 分配新助理，使用助理的当前等级和星级
        player.booths[booth].assistant = {
          name: assistant.name,
          level: assistant.level,
          star: assistant.star
        };

        // 更新新手引导步骤
        if (player.tutorial_step === 2) {
          player.tutorial_step = 3;
          msg += `成功将${assistantName}分配到${booth}展区！\n\n【新手引导】\n3️ 现在使用 一键收取 来获取收益`;
        } else {
          msg += `成功将${assistantName}分配到${booth}展区！`;
        }

        this.savePlayer(e, player);
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
        { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
          ]
        });
        await sendButtonMessage(e);
      }

      // 抽卡（邀约）功能
      async gachaAssistant(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
            ]
          });
          return;
        }

        // 识别卡池类型
        const match = e.msg.match(/^(普通|黄金|炫彩)邀约$/);
        if (!match) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "格式错误，请使用 普通邀约\n黄金邀约\n炫彩邀约" }] }] }
            ]
          });
          return;
        }
        const type = match[1];

        // 检查邀约卡数量
        if (!player.tickets[type] || player.tickets[type] <= 0) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `你的${type}邀约卡不足` }] }] }
            ]
          });
          return;
        }

        // 扣除邀约卡
        player.tickets[type]--;

        // 加载助理池
        let assistantData;
        try {
          assistantData = JSON.parse(fs.readFileSync(this.assistantDataPath, 'utf8'));
        } catch (error) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "助理数据加载失败" }] }] }
            ]
          });
          return;
        }

        // 按概率抽取助理等级
        const rates = this.assistantPool[type].rates;
        const rand = Math.random();
        let sum = 0;
        let level = '见习';
        for (const [lv, rate] of Object.entries(rates)) {
          sum += rate;
          if (rand <= sum) {
            level = lv;
            break;
          }
        }

        // 从助理池中筛选该等级的助理
        const pool = assistantData.filter(a => a.level === level);
        if (pool.length === 0) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "该等级助理池为空" }] }] }
            ]
          });
          return;
        }
        const assistantInfo = pool[Math.floor(Math.random() * pool.length)];

        // 检查是否已拥有
        let msg = '';
        let playerAssistant = player.assistants.find(a => a.name === assistantInfo.name);
        if (playerAssistant) {
          player.fragments[assistantInfo.name] = (player.fragments[assistantInfo.name] || 0) + 1;
          msg = `你抽到了已拥有的助理[${assistantInfo.name}]，自动转化为1个碎片！\n`;
          // 自动升星
          const star = playerAssistant.star;
          const need = this.starUpgradeCost[star] || 9999;
          if (player.fragments[assistantInfo.name] >= need && star < 4) {
            player.fragments[assistantInfo.name] -= need;
            playerAssistant.star++;
            msg += `碎片足够，${assistantInfo.name}自动升至${playerAssistant.star}星！\n`;
          }
        } else {
          player.assistants.push({
            name: assistantInfo.name,
            level: 1,
            star: 1
          });
          msg = `🎉 恭喜你获得新助理：【${assistantInfo.name}】（${level}）\n`;
          if (player.tutorial_step === 1) {
            player.tutorial_step = 2;
            msg += "\n[新手引导]\n2️ 使用 分配助理 助理名 咖啡馆 将助理分配到展区";
          }
        }

        this.savePlayer(e, player);
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
          ]
        });
        await sendButtonMessage(e);
      }

      async diamondGacha(e) {
        if (await this.testBind(e)) return;

        const player = this.loadPlayer(e);
        if (!player) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "请先使用 创建展会 创建展会" }] }] }
            ]
          });
          return;
        }

        const match = e.msg.match(/^钻石抽卡 (普通|黄金|炫彩)$/);
        if (!match) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "格式错误，请使用：钻石抽卡 普通|黄金|炫彩" }] }] }
            ]
          });
          return;
        }
        const type = match[1];
        const cost = this.assistantPool[type].cost;

        if (player.diamond < cost) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: `钻石不足，${type}卡池需要${cost}钻石` }] }] }
            ]
          });
          return;
        }

        // 扣除钻石
        player.diamond -= cost;

        // 加载助理池
        let assistantData;
        try {
          assistantData = JSON.parse(fs.readFileSync(this.assistantDataPath, 'utf8'));
        } catch (error) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "助理数据加载失败" }] }] }
            ]
          });
          return;
        }

        // 按概率抽取助理等级
        const rates = this.assistantPool[type].rates;
        const rand = Math.random();
        let sum = 0;
        let level = '见习';
        for (const [lv, rate] of Object.entries(rates)) {
          sum += rate;
          if (rand <= sum) {
            level = lv;
            break;
          }
        }

        // 从助理池中筛选该等级的助理
        const pool = assistantData.filter(a => a.level === level);
        if (pool.length === 0) {
          e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: "该等级助理池为空" }] }] }
            ]
          });
          return;
        }
        const assistantInfo = pool[Math.floor(Math.random() * pool.length)];

        // 检查是否已拥有
        let msg = '';
        let playerAssistant = player.assistants.find(a => a.name === assistantInfo.name);
        if (playerAssistant) {
          player.fragments[assistantInfo.name] = (player.fragments[assistantInfo.name] || 0) + 1;
          msg = `你抽到了已拥有的助理[${assistantInfo.name}]，自动转化为1个碎片！\n`;
          // 自动升星
          const star = playerAssistant.star;
          const need = this.starUpgradeCost[star] || 9999;
          if (player.fragments[assistantInfo.name] >= need && star < 4) {
            player.fragments[assistantInfo.name] -= need;
            playerAssistant.star++;
            msg += `碎片足够，${assistantInfo.name}自动升至${playerAssistant.star}星！\n`;
          }
        } else {
          player.assistants.push({
            name: assistantInfo.name,
            level: 1,
            star: 1
          });
          msg = `🎉 恭喜你用钻石获得新助理：【${assistantInfo.name}】（${level}）\n`;
          if (player.tutorial_step === 1) {
            player.tutorial_step = 2;
            msg += "\n[新手引导]\n2️ 使用 分配助理 助理名 咖啡馆 将助理分配到展区";
          }
        }

        this.savePlayer(e, player);
        e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
          ]
        });
        await sendButtonMessage(e);
      }

      // 辅助方法
      getCityLevel(totalIncome) {
        const thresholds = {
          1: 0,
          2: 1e12,
          3: 1e13,
          4: 1e14,
          5: 1e15,
          6: 1e16,
          7: 1e17,
          8: 1e18,
          9: 1e19,
          10: 1e20
        };
    
        let level = 1;
        for (const [lv, need] of Object.entries(thresholds)) {
          if (totalIncome >= need) {
            level = parseInt(lv);
          }
        }
        return level;
      }
    
      getCityBuff(level) {
        // 每级加成100%
        return 1 + (level - 1) * 1.0;
      }
    
      getCityLevelThreshold(level) {
        const thresholds = {
          1: 0,
          2: 1e12,
          3: 1e13,
          4: 1e14,
          5: 1e15,
          6: 1e16,
          7: 1e17,
          8: 1e18,
          9: 1e19,
          10: 1e20
        };
        return thresholds[level] || 1e14;
      }
                // 新功能：重置展会
                async resetExpo(e) {
                  if (await this.testBind(e)) return;

                  const player = this.loadPlayer(e);
                  if (!player) {
                    e.reply({
                      type: "ark",
                      template_id: 23,
                      kv: [
                  { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '请先使用 创建展会 创建展会' }] }] }
                      ]
                    });
                    return;
                  }

                  // 重置数据
                  let name = player.name;
                  const qq = player.qq || (e.data && e.data.qq) || '';
                  if (!name || name === '') name = qq;
                  const newPlayer = this.getDefaultPlayer(name, qq);
                  // 保留绑定信息
                  newPlayer.qq = qq;
                  newPlayer.name = name;
                  // 兼容碎片、lottery等字段
                  newPlayer.fragments = {};
                  newPlayer.lottery = {};
                  this.savePlayer(e, newPlayer);

                  e.reply({
                    type: "ark",
                    template_id: 23,
                    kv: [
                      { key: "#DESC#", value: `展会已重置！` },
                      { key: "#LIST#", obj: [
        { obj_kv: [{ key: "desc", value: `展会已重置！` }] },
        { obj_kv: [{ key: "desc", value: `展会名称：${name}` }] },
        { obj_kv: [{ key: "desc", value: `请重新开始你的经营之旅。` }] }
                      ]}
                    ]
                  });
                }

        // 新娱乐功能：每日抽奖
        async dailyLottery(e) {
          if (await this.testBind(e)) return;

          const player = this.loadPlayer(e);
          if (!player) {
            e.reply({
              type: "ark",
              template_id: 23,
              kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '请先使用 创建展会 创建展会' }] }] }
              ]
            });
            return;
          }

          // 每日只能抽一次，记录时间
          const today = new Date().toLocaleDateString();
          player.lottery = player.lottery || {};
          if (player.lottery.last === today) {
            e.reply({
              type: "ark",
              template_id: 23,
              kv: [
          { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '你今天已经抽过奖啦，明天再来吧！' }] }] }
              ]
            });
            return;
          }

          // 奖励池
          const rewards = [
            { type: 'gold', value: 10000, msg: '金币 x1万' },
            { type: 'gold', value: 30000, msg: '金币 x3万' },
            { type: 'gold', value: 50000, msg: '金币 x5万' },
            { type: 'diamond', value: 10, msg: '钻石 x10' },
            { type: 'diamond', value: 20, msg: '钻石 x20' },
            { type: 'ticket', value: '普通', msg: '普通邀约卡 x1' },
            { type: 'ticket', value: '黄金', msg: '黄金邀约卡 x1' }
          ];
          const reward = rewards[Math.floor(Math.random() * rewards.length)];

          let msg = '🎲 今日抽奖结果：\n';
          switch (reward.type) {
            case 'gold':
              player.gold += reward.value;
              msg += reward.msg;
              break;
            case 'diamond':
              player.diamond += reward.value;
              msg += reward.msg;
              break;
            case 'ticket':
              player.tickets[reward.value] = (player.tickets[reward.value] || 0) + 1;
              msg += reward.msg;
              break;
          }
          player.lottery.last = today;
          this.savePlayer(e, player);
          await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              { key: "#PROMPT#", value: "每日抽奖" },
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: '每日抽奖' }] }] },
              { key: "#LIST#", obj: [{ obj_kv: [{ key: "desc", value: msg }] }] }
            ]
          });
          await sendButtonMessage(e);
        }
};
