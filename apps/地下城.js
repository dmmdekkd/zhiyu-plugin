import fs from 'fs/promises'
import path from 'path'


function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function weightedRandom(items, weights) {
    let total = weights.reduce((a, b) => a + b, 0)
    let roll = Math.floor(Math.random() * total) + 1
    for (let i = 0; i < weights.length; i++) {
        if (roll <= weights[i]) return items[i]
        roll -= weights[i]
    }
    return items[0]
}

function generateShop() {
    return [
        { name: '小血瓶', price: 50, effect: '恢复30点生命' },
        { name: '攻击药水', price: 100, effect: '提升5点攻击力' },
        { name: '防御药水', price: 80, effect: '提升3点防御力' }
    ]
}

function generateEventId() {
    const ids = ['mysterious_merchant', 'healing_spring', 'trap']
    return ids[Math.floor(Math.random() * ids.length)]
}

// ====== 装备系统数据结构 ======
const EQUIPMENT = {
    weapons: {
        '新手剑': { attack: 3, price: 80 },
        '火焰剑': { attack: 10, price: 200, effect: '灼烧', passive: '每次攻击使敌人持续掉血1点', crit_rate: 0.05 },
        '冰霜剑': { attack: 8, price: 180, effect: '冰冻', passive: '攻击有20%几率使敌人减速', crit_damage: 0.2 },
        '雷电法杖': { attack: 12, price: 250, effect: '麻痹', passive: '攻击有15%几率使敌人麻痹一回合', crit_rate: 0.08 },
        '千本樱': { attack: 15, price: 300, effect: '樱花斩', passive: '攻击有25%几率触发多段伤害', crit_rate: 0.1, crit_damage: 0.3 },
        '誓约胜利之剑': { attack: 20, price: 500, effect: '光炮', passive: '攻击有30%几率触发圣光伤害', crit_rate: 0.15, crit_damage: 0.5 },
        '魔刀千刃': { attack: 18, price: 400, effect: '千刃斩', passive: '攻击有20%几率触发连击', crit_rate: 0.12, crit_damage: 0.4 },
        '斩月': { attack: 16, price: 350, effect: '月牙天冲', passive: '攻击有25%几率触发月牙斩击', crit_rate: 0.1, crit_damage: 0.3 },
        '腐殖之剑': { attack: 25, price: 650, effect: '死亡凋零', passive: '攻击有35%几率使敌人防御力降低5点', crit_rate: 0.18, crit_damage: 0.6, special: '若娜瓦的专属武器，拥有死亡的力量' }
    },
    armor: {
        '布甲': { defense: 2, price: 50 },
        '铁甲': { defense: 5, price: 150 },
        '龙鳞甲': { defense: 8, price: 300, effect: '火抗', passive: '免疫火焰伤害', crit_rate: 0.03 },
        '圣骑士铠甲': { defense: 10, price: 400, effect: '圣光护盾', passive: '受到伤害时有15%几率触发圣光护盾', crit_damage: 0.15 },
        '忍者服': { defense: 6, price: 200, effect: '闪避', passive: '增加10%闪避率', crit_rate: 0.1 },
        '风之翼': { defense: 7, price: 250, effect: '风之庇护', passive: '增加15%闪避率，闪避时恢复5点生命值' },
        '魔法长袍': { defense: 4, price: 180, effect: '魔法抗性', passive: '减少30%魔法伤害', crit_damage: 0.2 },
        '龙骑士铠甲': { defense: 12, price: 450, effect: '龙之护盾', passive: '受到伤害时有20%几率触发龙之护盾', crit_rate: 0.05, crit_damage: 0.25 },
        '神装': { defense: 15, price: 600, effect: '全属性抗性', passive: '增加20%闪避率，免疫所有负面效果', crit_rate: 0.1, crit_damage: 0.3 }
    }
}

// ====== 成就系统数据结构 ======
const ACHIEVEMENTS = {
    first_kill: { name: '初次击杀', desc: '击败第一个敌人' },
    boss_killer: { name: 'BOSS杀手', desc: '击败第一个BOSS' },
    shopaholic: { name: '购物狂', desc: '在商店消费超过1000金币' },
    explorer: { name: '探索者', desc: '探索超过50个房间' },
    lucky_dog: { name: '幸运儿', desc: '连续获得3次稀有掉落' },
    treasure_hunter: { name: '寻宝者', desc: '开启100个宝箱' },
    gambler: { name: '游戏王', desc: '在娱乐间赢取1000金币' },
    master_trainer: { name: '训练大师', desc: '完成100次训练' },
    element_master: { name: '元素大师', desc: '集齐所有元素宝石' },
    dungeon_master: { name: '地下城大师', desc: '达到100层' },
    fallen_angel_slayer: { name: '堕天使猎手', desc: '击败堕落天使-撒旦' },
    death_conqueror: { name: '死亡征服者', desc: '击败死之执政-若娜瓦' },
    bot_hacker: { name: 'BOT黑客', desc: '击败彩蛋BOSS-橙子BOT' },
    death_collector: { name: '死亡收藏家', desc: '同时拥有腐殖之剑和黑暗宝石' }
}

// ====== 任务系统数据结构 ======
const QUESTS = {
    daily: {
        kill_enemies: { desc: '击杀5个敌人', reward: { gold: 100, exp: 50 }, target: 5 },
        collect_items: { desc: '收集3个物品', reward: { gold: 80, exp: 30 }, target: 3 },
        explore_rooms: { desc: '探索5个房间', reward: { gold: 120, exp: 60 }, target: 5 },
        use_skills: { desc: '使用3次技能', reward: { gold: 90, exp: 40 }, target: 3 }
    },
    weekly: {
        kill_boss: { desc: '击败1个BOSS', reward: { gold: 500, exp: 200 }, target: 1 },
        complete_dungeon: { desc: '完成1个地下城', reward: { gold: 800, exp: 300 }, target: 1 },
        collect_gems: { desc: '收集5个元素宝石', reward: { gold: 600, exp: 250 }, target: 5 }
    },
    main: {
        reach_floor_10: { desc: '到达第10层', reward: { gold: 1000, exp: 500 }, target: 10 },
        reach_floor_20: { desc: '到达第20层', reward: { gold: 2000, exp: 1000 }, target: 20 },
        reach_floor_50: { desc: '到达第50层', reward: { gold: 5000, exp: 2500 }, target: 50 }
    }
}

// ====== 特殊房间与事件数据结构 ======
const SPECIAL_ROOMS = {
    '娱乐间': {
        desc: '🎲 欢迎来到地下城娱乐间！',
        options: {
            '猜大小': { win_rate: 0.5, reward: 2 },
            '猜单双': { win_rate: 0.5, reward: 2 },
            '猜点数': { win_rate: 0.1, reward: 10 }
        }
    },
    '训练场': {
        desc: '🏋️ 这里是训练场，可以提升属性！',
        options: {
            '力量训练': { cost: 50, effect: { attack: 2 } },
            '防御训练': { cost: 50, effect: { defense: 2 } },
            '生命训练': { cost: 50, effect: { max_hp: 10 } }
        }
    },
    '神秘商人': {
        desc: '👨‍💼 神秘商人出现了！',
        items: {
            '元素宝石': { price: 500, effect: '随机元素加成' },
            '神秘卷轴': { price: 300, effect: '随机效果' },
            '幸运符': { price: 200, effect: '提升掉落率' }
        }
    },
    '祭坛': {
        desc: '⚡ 神秘的祭坛，可以献祭物品获得祝福！',
        options: {
            '献祭金币': { cost: 100, effect: { blessing: '攻击力提升' } },
            '献祭装备': { cost: 1, effect: { blessing: '防御力提升' } },
            '献祭生命': { cost: 50, effect: { blessing: '全属性提升' } }
        }
    }
}

const EVENTS = {
    healing_spring: {
        name: '恢复泉水',
        desc: '你发现了一处恢复泉水！',
        effect: { heal: 0.5 },
        message: '恢复泉水为你恢复了50%的生命值。'
    },
    trap: {
        name: '陷阱',
        desc: '你不小心触发了一个陷阱！',
        effect: { damage: 10 },
        message: '陷阱对你造成了10点伤害。'
    },
    mysterious_merchant: {
        name: '神秘商人',
        desc: '一位神秘商人出现在你面前！',
        effect: { shop: true },
        message: '神秘商人提供了特殊的商品。'
    },
    treasure_chest: {
        name: '宝箱',
        desc: '你发现了一个宝箱！',
        effect: { gold: 100, items: ['小血瓶'] },
        message: '你获得了金币和物品。'
    },
    training_ground: {
        name: '训练场',
        desc: '你发现了一个训练场！',
        effect: { exp: 50 },
        message: '你获得了50点经验值。'
    }
};

// 修改 DATA_DIR 的定义
const DATA_DIR = path.join(process.cwd(), 'data', 'roguelike');

// 修改 getSaveFile 函数
function getSaveFile(e, slot = 1) {
    // 确保用户ID格式正确
    const userId = e.user_id.toString().replace(/:/g, '_');
    return path.join(DATA_DIR, `${userId}_${slot}.json`);
}

// 修改 loadProgress 函数
async function loadProgress(e, slot = 1) {
    try {
        // 确保目录存在
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        const file = getSaveFile(e, slot);
        try {
            const data = JSON.parse(await fs.readFile(file, 'utf8'));
            
            // 验证数据完整性
            if (!data || !data.player || !data.dungeon) {
                logger.error(`[地下城] 存档数据不完整: ${JSON.stringify(data)}`);
                return null;
            }

            // 验证房间数据
            if (!data.dungeon.rooms || !Array.isArray(data.dungeon.rooms) || data.dungeon.rooms.length === 0) {
                logger.error(`[地下城] 房间数据异常: ${JSON.stringify(data.dungeon)}`);
                // 重新生成房间数据
                data.dungeon = this.generateDungeon(data.dungeon.current_floor || 1, data.player);
            }

            // 验证玩家位置
            if (typeof data.player.position !== 'number' || data.player.position < 0 || data.player.position >= data.dungeon.rooms.length) {
                logger.error(`[地下城] 玩家位置异常: ${data.player.position}`);
                data.player.position = 0; // 重置到起始位置
            }

        // 自动清理背包脏数据
            if (data.player && Array.isArray(data.player.inventory)) {
                const clean = data.player.inventory.filter(x => typeof x === 'string');
            if (clean.length !== data.player.inventory.length) {
                    data.player.inventory = clean;
                    await saveProgress(e, data, slot);
            }
        }

        // 修复：确保player.stats存在
            if (data.player && !data.player.stats) {
                data.player.stats = {
                    enemies_killed: 0,
                    rooms_explored: 0,
                    gold_spent: 0,
                    bosses_killed: 0,
                    chests_opened: 0,
                    skills_used: 0,
                    dungeons_completed: 0
                };
                await saveProgress(e, data, slot);
            }

            data._slot = slot; // 标记当前存档槽
            return data;
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                logger.info(`[地下城] 用户 ${e.user_id} 的存档文件不存在，将创建新存档`);
                return null;
            }
            throw readError;
        }
    } catch (error) {
        logger.error(`[地下城] loadProgress error: ${error}`);
        return null;
    }
}

// 修改 saveProgress 函数
async function saveProgress(e, data, slot = 1) {
    try {
        // 确保目录存在
        await fs.mkdir(DATA_DIR, { recursive: true });

        // 如果是新游戏，不需要验证数据完整性
        if (data.waiting_for_class) {
            const file = getSaveFile(e, slot);
            await fs.writeFile(file, JSON.stringify(data, null, 2));
            return true;
        }

        // 验证数据完整性
        if (!data || !data.player || !data.dungeon) {
            logger.error(`[地下城] 保存数据不完整: ${JSON.stringify(data)}`);
            return false;
        }

        // 验证房间数据
        if (!data.dungeon.rooms || !Array.isArray(data.dungeon.rooms) || data.dungeon.rooms.length === 0) {
            logger.error(`[地下城] 保存的房间数据异常: ${JSON.stringify(data.dungeon)}`);
            return false;
        }

        // 验证玩家位置
        if (typeof data.player.position !== 'number' || data.player.position < 0 || data.player.position >= data.dungeon.rooms.length) {
            logger.error(`[地下城] 保存的玩家位置异常: ${data.player.position}`);
            data.player.position = 0; // 重置到起始位置
        }

        const file = getSaveFile(e, slot);
        await fs.writeFile(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        logger.error(`[地下城] saveProgress error: ${error}`);
        return false;
    }
}

// 修改 getUserSaveSlots 函数
async function getUserSaveSlots(e) {
    try {
        // 确保目录存在
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        const files = await fs.readdir(DATA_DIR);
        const userId = e.user_id.toString().replace(/:/g, '_');
        const slots = [];
        
        for (let i = 1; i <= 2; i++) {
            if (files.includes(`${userId}_${i}.json`)) {
                slots.push(i);
            }
        }
        return slots;
    } catch (error) {
        logger.error(`[地下城] getUserSaveSlots error: ${error}`);
        return [];
    }
}

// 世界BOSS数据文件
const WORLD_BOSS_FILE = path.join(DATA_DIR, 'world_boss.json')

async function loadWorldBoss() {
    await fs.mkdir(DATA_DIR, { recursive: true })
    try {
        return JSON.parse(await fs.readFile(WORLD_BOSS_FILE, 'utf8'))
    } catch {
        // 初始化世界BOSS
        const boss = {
            boss: {
                name: '混沌魔龙',
                hp: 100000,
                max_hp: 100000,
                attack: 500,
                defense: 100
            },
            damage_rank: {}
        }
        await fs.writeFile(WORLD_BOSS_FILE, JSON.stringify(boss, null, 2))
        return boss
    }
}

async function saveWorldBoss(data) {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(WORLD_BOSS_FILE, JSON.stringify(data, null, 2))
}

// ====== 元素宝石数据结构 ======
const ELEMENTAL_GEMS = {
    '火焰宝石': { effect: '火属性攻击', color: '🔴' },
    '冰霜宝石': { effect: '冰属性攻击', color: '🔵' },
    '雷电宝石': { effect: '雷属性攻击', color: '⚡' },
    '自然宝石': { effect: '自然属性攻击', color: '🌿' },
    '暗影宝石': { effect: '暗属性攻击', color: '⚫' },
    '黑暗宝石': { effect: '死亡属性攻击', color: '☠️', special: '若娜瓦的力量结晶，可提升死亡系技能效果' }
}

// ====== 道具与消耗品数据结构 ======
const ITEMS = {
    consumables: {
        '小血瓶': { effect: '恢复30点生命', price: 50 },
        '大血瓶': { effect: '恢复80点生命', price: 120 },
        '超级血瓶': { effect: '恢复150点生命', price: 250 },
        '攻击药水': { effect: '提升5点攻击力', price: 100 },
        '防御药水': { effect: '提升3点防御力', price: 80 },
        '力量药水': { effect: '提升8点攻击力', price: 150 },
        '守护药水': { effect: '提升5点防御力', price: 120 },
        '幸运药水': { effect: '提升掉落率', price: 200 },
        '经验药水': { effect: '获得100点经验', price: 180 }
    },
    special: {
        '传送卷轴': { effect: '返回最近的存档点', price: 100 },
        '复活卷轴': { effect: '死亡时自动复活', price: 500 },
        '鉴定卷轴': { effect: '鉴定未知装备', price: 80 },
        '强化卷轴': { effect: '强化装备属性', price: 300 }
    }
}

const GUILD_FILE = path.join(DATA_DIR, 'guilds.json')

// ====== 怪物与BOSS数据结构 ======
const MONSTERS = {
    normal: [
        {
            name: '史莱姆',
            hp: [10, 20],
            attack: [2, 5],
            defense: [1, 3],
            exp: 20,
            gold: [10, 30],
            drop_rate: 0.3,
            drops: ['小血瓶', '新手剑'],
            crit_rate: 0.03,
            crit_damage: 1.5
        },
        {
            name: '哥布林战士',
            hp: [20, 30],
            attack: [5, 8],
            defense: [2, 4],
            exp: 35,
            gold: [20, 40],
            drop_rate: 0.4,
            drops: ['攻击药水', '布甲'],
            crit_rate: 0.04,
            crit_damage: 1.5
        },
        {
            name: '骷髅兵',
            hp: [25, 35],
            attack: [6, 9],
            defense: [3, 5],
            exp: 40,
            gold: [25, 45],
            drop_rate: 0.35,
            drops: ['防御药水', '铁甲'],
            crit_rate: 0.05,
            crit_damage: 1.6
        },
        {
            name: '魔法师',
            hp: [30, 40],
            attack: [8, 12],
            defense: [2, 4],
            exp: 50,
            gold: [30, 50],
            drop_rate: 0.4,
            drops: ['魔法长袍', '经验药水'],
            crit_rate: 0.06,
            crit_damage: 1.7
        }
    ],
    elite: [
        {
            name: '精英史莱姆王',
            hp: [50, 70],
            attack: [10, 15],
            defense: [5, 8],
            exp: 100,
            gold: [100, 200],
            drop_rate: 0.6,
            drops: ['大血瓶', '冰霜剑', '龙鳞甲'],
            crit_rate: 0.08,
            crit_damage: 1.8
        },
        {
            name: '哥布林酋长',
            hp: [60, 80],
            attack: [12, 18],
            defense: [6, 10],
            exp: 120,
            gold: [120, 250],
            drop_rate: 0.7,
            drops: ['力量药水', '火焰剑', '圣骑士铠甲'],
            crit_rate: 0.1,
            crit_damage: 2.0
        }
    ],
    boss: [
        {
            name: '魔龙-提亚马特',
            hp: [200, 300],
            attack: [20, 30],
            defense: [15, 25],
            exp: 500,
            gold: [500, 1000],
            drop_rate: 1.0,
            drops: ['誓约胜利之剑', '龙骑士铠甲', '超级血瓶', '复活卷轴'],
            crit_rate: 0.12,
            crit_damage: 2.2
        },
        {
            name: '暗影魔王-路西法',
            hp: [250, 350],
            attack: [25, 35],
            defense: [20, 30],
            exp: 600,
            gold: [600, 1200],
            drop_rate: 1.0,
            drops: ['魔刀千刃', '神装', '超级血瓶', '强化卷轴'],
            crit_rate: 0.15,
            crit_damage: 2.5
        },
        {
            name: '堕落天使-撒旦',
            hp: [300, 400],
            attack: [30, 40],
            defense: [25, 35],
            exp: 700,
            gold: [700, 1500],
            drop_rate: 1.0,
            drops: ['斩月', '神装', '超级血瓶', '幸运药水', '暗影宝石'],
            crit_rate: 0.18,
            crit_damage: 2.8,
            special_ability: '黑暗吞噬' // 可用于后续扩展特殊能力
        },
        {
            name: '死之执政-若娜瓦',
            hp: [350, 450],
            attack: [35, 45],
            defense: [30, 40],
            exp: 800,
            gold: [800, 1800],
            drop_rate: 1.0,
            drops: ['腐殖之剑', '龙骑士铠甲', '超级血瓶', '强化卷轴', '黑暗宝石'],
            crit_rate: 0.2,
            crit_damage: 3.0,
            special_ability: '死亡凋零' // 可用于后续扩展特殊能力
        },
        {
            name: '彩蛋BOSS-橙子BOT',
            hp: [400, 500],
            attack: [40, 50],
            defense: [35, 45],
            exp: 1000,
            gold: [1000, 2000],
            drop_rate: 1.0,
            drops: ['千本樱', '神装', '超级血瓶', '复活卷轴', '强化卷轴', '自然宝石'],
            crit_rate: 0.25,
            crit_damage: 3.5,
            special_ability: '机器人觉醒', // 可用于后续扩展特殊能力
            easter_egg: true // 标记为彩蛋BOSS
        }
    ]
}

// 工具函数：文本转ark
function textToArk(text) {
    return {
        type: "ark",
        template_id: 23,
        kv: [
            {
                key: "#DESC#",
                value: text
            },
            {
                key: "#PROMPT#",
                value: text
            },
            {
                key: "#LIST#",
                obj: [
                    {
                        obj_kv: [
                            { key: "desc", value: text }
                        ]
                    }             
                ]
            }
        ]
    };
}

// 添加缺失的常量定义
const SHOP_ITEMS = {
    '小血瓶': { name: '小血瓶', price: 50, description: '恢复30点生命值', id: 'small_hp_potion' },
    '大血瓶': { name: '大血瓶', price: 100, description: '恢复80点生命值', id: 'large_hp_potion' },
    '攻击药水': { name: '攻击药水', price: 100, description: '提升5点攻击力', id: 'attack_potion' },
    '防御药水': { name: '防御药水', price: 80, description: '提升3点防御力', id: 'defense_potion' },
    '力量药水': { name: '力量药水', price: 150, description: '提升8点攻击力', id: 'strength_potion' },
    '守护药水': { name: '守护药水', price: 120, description: '提升5点防御力', id: 'guard_potion' },
    '幸运药水': { name: '幸运药水', price: 200, description: '提升掉落率', id: 'luck_potion' },
    '经验药水': { name: '经验药水', price: 180, description: '获得100点经验', id: 'exp_potion' }
};

const SKILLS = {
    '战吼': {
        name: '战吼',
        type: 'buff',
        power: 10,
        mp_cost: 20,
        cooldown: 3,
        description: '提升攻击力10点，持续3回合'
    },
    '防御姿态': {
        name: '防御姿态',
        type: 'buff',
        power: 8,
        mp_cost: 15,
        cooldown: 3,
        description: '提升防御力8点，持续3回合'
    },
    '火球术': {
        name: '火球术',
        type: 'damage',
        power: 25,
        mp_cost: 30,
        cooldown: 2,
        description: '造成25点魔法伤害'
    },
    '冰霜新星': {
        name: '冰霜新星',
        type: 'debuff',
        power: 15,
        mp_cost: 25,
        cooldown: 3,
        description: '造成15点伤害并减速敌人'
    },
    '背刺': {
        name: '背刺',
        type: 'damage',
        power: 30,
        mp_cost: 20,
        cooldown: 2,
        description: '造成30点伤害，必定暴击'
    },
    '闪避': {
        name: '闪避',
        type: 'buff',
        power: 0.3,
        mp_cost: 15,
        cooldown: 4,
        description: '提升30%闪避率，持续2回合'
    }
};

export class RogueLike extends plugin {
    constructor() {
        super({
            name: 'RogueLike地牢冒险',
            dsc: '回合制地牢冒险游戏',
            event: 'message',
            priority: 100,
            rule: [
                { reg: '^[#|/]?开始地下城冒险$', fnc: 'startGame' },
                { reg: '^[#|/]?选择地下城职业(战士|法师|盗贼)$', fnc: 'selectClass' },
                { reg: '^[#|/]?地下城(攻击|移动|开启宝箱|背包|信息|加载|重新开始|购买)$', fnc: 'handleAction' },
                { reg: '^[#|/]?地下城重玩确认$', fnc: 'handleAction' },
                { reg: '^[#|/]?地下城使用\\s+(.+)$', fnc: 'useItem' },
                { reg: '^[#|/]?地下城购买\\s+(.+)$', fnc: 'handlePurchase' },
                { reg: '^[#|/]?地下城世界BOSS$', fnc: 'showWorldBoss' },
                { reg: '^[#|/]?挑战地下城世界BOSS$', fnc: 'challengeWorldBoss' },
                { reg: '^[#|/]?退出地下城世界BOSS$', fnc: 'exitWorldBoss' },
                { reg: '^[#|/]?地下城设置昵称\\s+(.+)$', fnc: 'setNickname' },
                { reg: '^[#|/]?地下城技能$', fnc: 'handleSkill' },
                { reg: '^[#|/]?地下城装备$', fnc: 'showEquipment' },
                { reg: '^[#|/]?地下城装备(.+)$', fnc: 'equipItem' },
                { reg: '^[#|/]?地下城成就$', fnc: 'showAchievements' },
                { reg: '^[#|/]?地下城任务$', fnc: 'showQuests' },
                { reg: '^[#|/]?地下城游戏(.+) (\\d+)$', fnc: 'handleGambling' },
                { reg: '^[#|/]?地下城训练(.+)$', fnc: 'handleSpecialTraining' },
                { reg: '^[#|/]?地下城献祭(.+)$', fnc: 'handleSacrifice' },
                { reg: '^[#|/]?地下城宝石$', fnc: 'showGems' },
                { reg: '^[#|/]?地下城公会$', fnc: 'viewGuildInfo' },
                { reg: '^[#|/]?地下城创建公会(.+)$', fnc: 'createGuild' },
                { reg: '^[#|/]?地下城加入公会(.+)$', fnc: 'joinGuild' },
                { reg: '^[#|/]?地下城退出公会$', fnc: 'leaveGuild' },
                { reg: '^[#|/]?地下城存档$', fnc: 'saveCheckpoint' },
                { reg: '^[#|/]?地下城加载列表$', fnc: 'handleLoadList' },
                { reg: '^[#|/]?地下城加载(1|2)$', fnc: 'handleLoadSlot' },
                { reg: '^[#|/]?地下城指令$', fnc: 'showCommands' },
                { reg: '^[#|/]?地下城新手引导$', fnc: 'showTutorial' },
                { reg: '^[#|/]?地下城下一步$', fnc: 'nextTutorialStep' }
            ]
        });
    }

    // 添加initPlayer函数
    initPlayer(cls) {
        const player = {
            class: cls,
            nickname: null,
            hp: 100,
            max_hp: 100,
            attack: 10,
            defense: 5,
            exp: 0,
            level: 1,
            gold: 100,
            inventory: [],
            equipment: {
                weapon: null,
                armor: null
            },
            stats: {
                enemies_killed: 0,
                rooms_explored: 0,
                gold_spent: 0,
                bosses_killed: 0,
                chests_opened: 0,
                skills_used: 0,
                dungeons_completed: 0
            },
            achievements: [],
            completed_quests: [],
            defeated_bosses: [],
            skill_cooldowns: {}
        };

        // 根据职业设置初始属性
        switch (cls) {
            case '战士':
                player.hp = 150;
                player.max_hp = 150;
                player.attack = 15;
                player.defense = 10;
                break;
            case '法师':
                player.hp = 100;
                player.max_hp = 100;
                player.attack = 20;
                player.defense = 5;
                player.mp = 150;
                player.max_mp = 150;
                break;
            case '盗贼':
                player.hp = 120;
                player.max_hp = 120;
                player.attack = 18;
                player.defense = 8;
                player.crit_rate = 0.15;
                player.crit_damage = 1.5;
                break;
        }

        return player;
    }

    // 添加初始化检查函数
    ensurePlayerData(player) {
        if (!player) return false;
        
        // 确保基本属性存在
        player.hp = player.hp || 100;
        player.max_hp = player.max_hp || 100;
        player.attack = player.attack || 10;
        player.defense = player.defense || 5;
        player.exp = player.exp || 0;
        player.level = player.level || 1;
        player.gold = player.gold || 100;
        
        // 确保数组属性存在
        player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
        player.achievements = Array.isArray(player.achievements) ? player.achievements : [];
        player.completed_quests = Array.isArray(player.completed_quests) ? player.completed_quests : [];
        player.defeated_bosses = Array.isArray(player.defeated_bosses) ? player.defeated_bosses : [];
        
        // 确保对象属性存在
        player.equipment = player.equipment || { weapon: null, armor: null };
        player.stats = player.stats || {
            enemies_killed: 0,
            rooms_explored: 0,
            gold_spent: 0,
            bosses_killed: 0,
            chests_opened: 0,
            skills_used: 0,
            dungeons_completed: 0
        };
        
        // 确保技能冷却时间存在
        player.skill_cooldowns = player.skill_cooldowns || {};
        
        return true;
    }

    // 修改 startGame 函数，添加新手引导提示
    async startGame(e) {
        try {
            // 确保目录存在
            await fs.mkdir(DATA_DIR, { recursive: true });
            
            const data = await loadProgress(e);
            if (data) {
                if (!this.ensurePlayerData(data.player)) {
                    await e.reply(textToArk('⚠️ 存档数据损坏，请重新开始游戏'));
                    return;
                }
                const status = this.renderStatus(data);
                let msg = `${status.a}\n${status.b}\n${status.c}\n${status.d}\n${status.e}\n${status.f}\n${status.g || ''}`;
                await e.reply(textToArk(msg));
            } else {
                // 创建新的游戏数据
                const newData = {
                    player: null,
                    dungeon: null,
                    waiting_for_class: true,
                    tutorial: {
                        step: 0,
                        completed: false
                    },
                    timestamp: Date.now()
                };
                
                // 保存初始数据
                if (await saveProgress(e, newData)) {
                    let msg = '🎮 开始新的冒险！\n***\n请选择地下城职业：\n战士 | 法师 | 盗贼\n发送"选择地下城职业战士"或"选择地下城职业法师"或"选择地下城职业盗贼"开始\n\n💡 发送"地下城新手引导"查看新手教程';
                    await e.reply(textToArk(msg));
                } else {
                    await e.reply(textToArk('⚠️ 游戏初始化失败，请稍后重试'));
                }
            }
        } catch (error) {
            logger.error(`[地下城] startGame error: ${error}`);
            await e.reply(textToArk('⚠️ 游戏启动失败，请稍后重试'));
        }
    }

    // 修改 selectClass 函数，添加错误处理
    async selectClass(e) {
        try {
            // 确保目录存在
            await fs.mkdir(DATA_DIR, { recursive: true });
            
            let data = await loadProgress(e);
            if (!data || data.waiting_for_class) {
                const cls = e.msg.replace('选择地下城职业', '');
                const player = this.initPlayer(cls);
                if (!this.ensurePlayerData(player)) {
                    await e.reply(textToArk('⚠️ 角色初始化失败，请重试'));
                    return;
                }
                
                // 创建新的游戏数据
                data = {
                    player,
                    dungeon: this.generateDungeon(1, player),
                    timestamp: Date.now()
                };
                
                // 保存游戏数据
                if (await saveProgress(e, data)) {
                    const status = this.renderStatus(data);
                    let msg = `${status.a}\n${status.b}\n${status.c}\n${status.d}\n${status.e}\n${status.f}\n${status.g || ''}`;
                    await e.reply(textToArk(msg));
                } else {
                    await e.reply(textToArk('⚠️ 游戏数据保存失败，请重试'));
                }
            } else {
                await e.reply(textToArk('如需切换职业，请先发送"地下城重新开始"重玩。'));
            }
        } catch (error) {
            logger.error(`[地下城] selectClass error: ${error}`);
            await e.reply(textToArk('⚠️ 选择职业失败，请稍后重试'));
        }
    }

    // 修改 handleAction 函数，添加错误处理
    async handleAction(e) {
        try {
            const action = e.msg.replace('地下城', '');
            let data = await loadProgress(e);
            
            if (!data) {
                logger.warn(`[地下城] 用户 ${e.user_id} 尝试使用未初始化的游戏`);
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            if (!this.ensurePlayerData(data.player)) {
                logger.error(`[地下城] 用户 ${e.user_id} 的存档数据损坏`);
                await e.reply(textToArk('⚠️ 存档数据损坏，请重新开始游戏'));
                return;
            }

            // 检查房间数据是否存在
            if (!data.dungeon || !data.dungeon.rooms) {
                logger.error(`[地下城] 用户 ${e.user_id} 的房间数据缺失`);
                data.dungeon = this.generateDungeon(data.dungeon?.current_floor || 1, data.player);
                await saveProgress(e, data);
            }

            // 检查当前房间是否存在
            if (!data.dungeon.rooms[data.player.position]) {
                logger.error(`[地下城] 用户 ${e.user_id} 的当前房间数据异常`);
                data.player.position = 0;
                await saveProgress(e, data);
            }

            const room = data.dungeon.rooms[data.player.position];
            logger.info(`[地下城] 当前房间数据: ${JSON.stringify(room)}`);

            let output = '';
            
            switch (action) {
                case '攻击':
                    if (!room.type || room.type !== '战斗') {
                        await e.reply(textToArk('⚠️ 当前房间没有敌人'));
                        return;
                    }
                    output = await this.handleCombat(e, data);
                    break;
                case '移动':
                    output = await this.handleMovement(data);
                    break;
                case '开启宝箱':
                    if (!room.type || room.type !== '宝箱') {
                        await e.reply(textToArk('⚠️ 当前房间没有宝箱'));
                        return;
                    }
                    output = await this.handleTreasure(data);
                    break;
                case '背包':
                    output = await this.showInventory(data);
                    break;
                case '信息':
                    const status = this.renderStatus(data);
                    output = `${status.a}\n${status.b}\n${status.c}\n${status.d}\n${status.e}\n${status.f}\n${status.g || ''}`;
                    break;
                case '加载':
                    output = await this.handleLoad(e);
                    break;
                case '重新开始':
                    await e.reply(textToArk('⚠️ 确认要删档重玩吗？此操作不可撤销！\n发送"地下城重玩确认"确认重玩'));
                    return;
                case '重玩确认':
                    try {
                        const file = getSaveFile(e);
                        await fs.unlink(file).catch(() => {});
                        await e.reply(textToArk('✅ 存档已删除，请发送"开始地下城冒险"开始新的冒险'));
                    } catch (error) {
                        logger.error(`[地下城] 删除存档失败: ${error}`);
                        await e.reply(textToArk('⚠️ 删除存档失败，请稍后重试'));
                    }
                    return;
                case '购买':
                    if (!room.type || room.type !== '商店') {
                        await e.reply(textToArk('⚠️ 当前房间不是商店'));
                        return;
                    }
                    await this.showShop(e);
                    return;
            }

            await saveProgress(e, data);
            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] handleAction error: ${error}`);
            await e.reply(textToArk('⚠️ 操作失败，请稍后重试'));
        }
    }

    async handleMovement(data) {
        try {
            const currentPosition = data.player.position;
            const totalRooms = data.dungeon.rooms.length;
            
            if (currentPosition >= totalRooms - 1) {
                // 到达最后一间房，进入下一层
                data.dungeon.current_floor++;
                data.player.position = 0;
                data.dungeon.rooms = this.generateDungeon(data.dungeon.current_floor, data.player).rooms;
                return `你进入了第${data.dungeon.current_floor}层！`;
            } else {
                // 移动到下一间房
                data.player.position++;
                const room = data.dungeon.rooms[data.player.position];
                return `你进入了${this.getRoomDescription(room)}`;
            }
        } catch (error) {
            logger.error(`[地下城] handleMovement error: ${error}`);
            throw new Error('移动处理失败');
        }
    }

    async handleTreasure(data) {
        try {
            const room = data.dungeon.rooms[data.player.position];
            if (room.type !== 'treasure') {
                throw new Error('当前房间不是宝箱房');
            }

            const treasure = room.treasure;
            if (!treasure) {
                throw new Error('宝箱数据不存在');
            }

            let output = `你打开了宝箱！\n`;
            
            // 处理金币
            if (treasure.gold) {
                data.player.gold += treasure.gold;
                output += `获得${treasure.gold}金币！\n`;
            }
            
            // 处理物品
            if (treasure.items && treasure.items.length > 0) {
                for (const item of treasure.items) {
                    data.player.inventory.push(item);
                    output += `获得${item.name}！\n`;
                }
            }
            
            // 更新房间状态
            room.type = 'empty';
            delete room.treasure;
            data.player.stats.chests_opened++;
            
            return output;
        } catch (error) {
            logger.error(`[地下城] handleTreasure error: ${error}`);
            throw new Error('宝箱处理失败');
        }
    }

    async handleGameOver(data) {
        try {
            // 保存游戏结束记录
            const gameOverData = {
                player: data.player,
                floor: data.dungeon.current_floor,
                timestamp: Date.now()
            };
            
            // 清除当前进度
            data = null;
            
            // 可以在这里添加游戏结束的其他处理逻辑
            logger.info(`[地下城] 玩家 ${data.player.nickname || data.player.class} 在第${data.dungeon.current_floor}层游戏结束`);
        } catch (error) {
            logger.error(`[地下城] handleGameOver error: ${error}`);
        }
    }

    async handleLoad(e) {
        let slots = await getUserSaveSlots(e)
        if (slots.length === 0) {
            return '没有可用存档。'
        }
        let msg = '请选择要加载的存档：\n' + slots.map(i => `存档${i}（发送"地下城加载${i}"加载）`).join('\n')
        return msg
    }

    async showShop(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            const room = data.dungeon.rooms[player.position];

            if (room.type !== 'shop') {
                await e.reply(textToArk('⚠️ 这里不是商店'));
                return;
            }

            let output = '🏪 商店\n***\n';
            output += `💰 你的金币：${player.gold}\n\n`;

            for (const [id, item] of Object.entries(SHOP_ITEMS)) {
                output += `${item.name} - ${item.price}金币\n`;
                output += `${item.description}\n\n`;
            }

            output += '输入"购买 物品名称"来购买物品';

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showShop error: ${error}`);
            await e.reply(textToArk('⚠️ 显示商店失败，请稍后重试'));
        }
    }

    async handlePurchase(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            const room = data.dungeon.rooms[player.position];

            if (room.type !== 'shop') {
                await e.reply(textToArk('⚠️ 这里不是商店'));
                return;
            }

            const itemName = e.msg.split(' ').slice(1).join(' ');
            const item = Object.values(SHOP_ITEMS).find(i => i.name === itemName);

            if (!item) {
                await e.reply(textToArk('⚠️ 物品不存在'));
            return;
        }
        
            if (player.gold < item.price) {
                await e.reply(textToArk('⚠️ 金币不足'));
                return;
            }

            // 购买物品
            player.gold -= item.price;
            if (!player.inventory) {
                player.inventory = [];
            }
            player.inventory.push(item.id);

            // 更新统计
            player.stats.gold_spent = (player.stats.gold_spent || 0) + item.price;

            let message = `🎉 购买成功！\n`;
            message += `获得：${item.name}\n`;
            message += `剩余金币：${player.gold}`;
            
            await saveProgress(e, data);
            await e.reply(textToArk(message));
        } catch (error) {
            logger.error(`[地下城] handlePurchase error: ${error}`);
            await e.reply(textToArk('⚠️ 购买失败，请稍后重试'));
        }
    }

    async showInventory(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
            return;
        }
        
            const player = data.player;
            if (!player.inventory || player.inventory.length === 0) {
                await e.reply(textToArk('🎒 背包是空的'));
                return;
            }

            let output = '🎒 背包\n***\n';
            const itemCounts = {};
            
            // 统计物品数量
            for (const itemId of player.inventory) {
                itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
            }

            // 显示物品
            for (const [itemId, count] of Object.entries(itemCounts)) {
                const item = ITEMS[itemId];
                if (item) {
                    output += `${item.name} x${count}\n`;
                    output += `${item.description}\n\n`;
                }
            }

            output += '输入"使用 物品名称"来使用物品';

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showInventory error: ${error}`);
            await e.reply(textToArk('⚠️ 显示背包失败，请稍后重试'));
        }
    }

    async useItem(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            if (!player.inventory || player.inventory.length === 0) {
                await e.reply(textToArk('🎒 背包是空的'));
                return;
            }

            const itemName = e.msg.split(' ').slice(1).join(' ');
            const item = Object.values(ITEMS).find(i => i.name === itemName);

            if (!item) {
                await e.reply(textToArk('⚠️ 物品不存在'));
                return;
            }

            const itemIndex = player.inventory.indexOf(item.id);
            if (itemIndex === -1) {
                await e.reply(textToArk('⚠️ 背包中没有这个物品'));
                return;
            }

            // 使用物品
            let message = `✨ 使用物品：${item.name}\n`;
            switch (item.type) {
                case 'heal':
                    const heal = Math.floor(item.power * (1 + player.level * 0.1));
                    player.hp = Math.min(player.max_hp, player.hp + heal);
                    message += `💚 恢复${heal}点生命值！\n`;
                    break;
                case 'buff':
                    player.attack += item.power;
                    player.defense += item.power;
                    message += `📈 攻击力和防御力提升${item.power}点！\n`;
                    break;
                case 'special':
                    // 特殊物品效果
                    if (item.effect) {
                        message += item.effect(player);
                    }
                    break;
            }

            // 移除物品
            player.inventory.splice(itemIndex, 1);

            await saveProgress(e, data);
            await e.reply([textToArk(message)]);
        } catch (error) {
            logger.error(`[地下城] useItem error: ${error}`);
            await e.reply([textToArk('⚠️ 使用物品失败，请稍后重试')]);
        }
    }

    genActionButtons(data, e) {
        // 不再生成按钮，直接返回空
        return ''
    }

    async showEquipment(e) {
        let data = await loadProgress(e)
        const player = data.player
        let output = '⚔️ 当前装备\n'
        // 武器
        if (player.equipment && player.equipment.weapon) {
            const w = EQUIPMENT.weapons[player.equipment.weapon]
            output += `武器：${player.equipment.weapon}\n  攻击力+${w.attack}`
            if (w.effect) output += ` (${w.effect})`
            if (w.passive) output += `\n被动效果：${w.passive}`
            output += '\n'
        } else {
            output += '武器：无\n'
        }
        // 防具
        if (player.equipment && player.equipment.armor) {
            const a = EQUIPMENT.armor[player.equipment.armor]
            output += `防具：${player.equipment.armor}\n  防御力+${a.defense}`
            if (a.effect) output += ` (${a.effect})`
            if (a.passive) output += `\n被动效果：${a.passive}`
            output += '\n'
        } else {
            output += '防具：无\n'
        }
        await e.reply(textToArk(output))
    }

    async showAchievements(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            if (!player.achievements || player.achievements.length === 0) {
                await e.reply(textToArk('📜 暂无成就'));
                return;
            }

            let output = '📜 成就列表\n***\n';
            player.achievements.forEach((achievement, index) => {
                output += `${index + 1}. ${achievement}\n`;
            });

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showAchievements error: ${error}`);
            await e.reply(textToArk('⚠️ 显示成就失败，请稍后重试'));
        }
    }

    async showQuests(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            if (!player.completed_quests || player.completed_quests.length === 0) {
                await e.reply(textToArk('📜 暂无已完成的任务'));
                return;
            }

            let output = '📜 已完成任务\n***\n';
            player.completed_quests.forEach((quest, index) => {
                output += `${index + 1}. ${quest}\n`;
            });

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showQuests error: ${error}`);
            await e.reply(textToArk('⚠️ 显示任务失败，请稍后重试'));
        }
    }

    async showGems(e) {
        let data = await loadProgress(e)
        const player = data.player
        let log = '💎 元素宝石收集情况：\n'
        for (let gem in ELEMENTAL_GEMS) {
            const hasGem = player.inventory.includes(gem)
            const status = hasGem ? '✅' : '❌'
            log += `${status} ${ELEMENTAL_GEMS[gem].color} ${gem} - ${ELEMENTAL_GEMS[gem].effect}\n`
        }
        await e.reply(textToArk(log))
    }

    async createGuild(e) {
        let data = await loadProgress(e)
        let guilds = await this.loadGuilds()
        const player = data.player
        const name = e.msg.replace('地下城创建公会', '').trim()
        if (!name) return e.reply(textToArk('公会名称不可为空'))
        if (guilds[name]) return e.reply(textToArk('该公会已存在'))
        if (player.guild) return e.reply(textToArk('你已属于其他公会'))
        guilds[name] = { creator: player.nickname || player.class, members: [player.nickname || player.class], level: 1, contribution: {} }
        player.guild = name
        await saveProgress(e, data)
        await this.saveGuilds(guilds)
        await e.reply(textToArk(`公会「${name}」创建成功！`))
    }

    async joinGuild(e) {
        let data = await loadProgress(e)
        let guilds = await this.loadGuilds()
        const player = data.player
        const name = e.msg.replace('地下城加入公会', '').trim()
        if (!guilds[name]) return e.reply(textToArk('目标公会不存在'))
        if (player.guild) return e.reply(textToArk('你已属于其他公会'))
        guilds[name].members.push(player.nickname || player.class)
        player.guild = name
        await saveProgress(e, data)
        await this.saveGuilds(guilds)
        await e.reply(textToArk(`成功加入公会「${name}」！`))
    }

    async viewGuildInfo(e) {
        let data = await loadProgress(e)
        let guilds = await this.loadGuilds()
        const player = data.player
        if (!player.guild) return e.reply(textToArk('你不属于任何公会'))
        const guild = guilds[player.guild]
        if (!guild) return e.reply(textToArk('公会数据异常'))
        const role = guild.creator === (player.nickname || player.class) ? '会长' : '成员'
        await e.reply(textToArk(`公会名: ${player.guild}\n你的身份: ${role}\n公会成员数: ${guild.members.length}`))
    }

    async leaveGuild(e) {
        let data = await loadProgress(e)
        let guilds = await this.loadGuilds()
        const player = data.player
        if (!player.guild) return e.reply(textToArk('你不属于任何公会'))
        const guild = guilds[player.guild]
        if (guild.creator === (player.nickname || player.class)) return e.reply(textToArk('会长不能直接退出，请先转让或解散公会'))
        guild.members = guild.members.filter(m => m !== (player.nickname || player.class))
        player.guild = null
        await saveProgress(e, data)
        await this.saveGuilds(guilds)
        await e.reply(textToArk('成功退出公会'))
    }

    async handleLoadList(e) {
        let slots = await getUserSaveSlots(e)
        if (slots.length === 0) {
            return e.reply(textToArk('没有可用存档。'))
        }
        let msg = '请选择要加载的存档：\n' + slots.map(i => `存档${i}（发送"地下城加载${i}"加载）`).join('\n')
        await e.reply(textToArk(msg))
    }

    async handleLoadSlot(e) {
        const match = e.msg.match(/地下城加载(\d)/)
        const slot = match ? parseInt(match[1]) : 1
        let data = await loadProgress(e, slot)
        if (!data) return e.reply(textToArk('该存档不存在或已损坏。'))
        let status = this.renderStatus(data)
        let msg = `${status.a}\n${status.b}\n${status.c}\n${status.d}\n${status.e}\n${status.f}\n${status.g || ''}\n`
        await e.reply(textToArk(msg))
    }

    // 合并全部献祭逻辑
    async handleSacrificeAll(e) {
        // 当前已装备
        const equipped = new Set();
        if (player.equipment.weapon) equipped.add(player.equipment.weapon);
        if (player.equipment.armor) equipped.add(player.equipment.armor);
        // 找到所有未装备的装备
        const allEquips = (player.inventory || []).filter(item => (EQUIPMENT.weapons[item] || EQUIPMENT.armor[item]) && !equipped.has(item));
        if (allEquips.length === 0) {
            return e.reply([textToArk('⚠️ 没有可献祭的未装备装备')])
        }
        let totalDef = 0;
        let detailList = [];
        for (const equipName of allEquips) {
            const equipData = EQUIPMENT.armor[equipName] || EQUIPMENT.weapons[equipName];
            let defAdd = 0;
            if (equipData) {
                if (equipData.defense) defAdd += equipData.defense;
                if (equipData.attack) defAdd += Math.floor(equipData.attack / 2);
                if (equipData.effect) defAdd += 1;
                if (equipData.passive) defAdd += 1;
                if (equipData.crit_rate) defAdd += 1;
                if (equipData.crit_damage) defAdd += 1;
            }
            totalDef += defAdd;
            detailList.push(`- ${equipName}（防御+${defAdd}）`);
        }
        // 从背包移除
        player.inventory = player.inventory.filter(item => !(allEquips.includes(item) && !equipped.has(item)));
        player.defense += totalDef;
        let detailText = detailList.join('\n');
        await e.reply([
            textToArk(`献祭了${allEquips.length}件装备：\n${detailText}\n总计防御+${totalDef}`),
            segment.button(
                [{ text: '移动', callback: '地下城移动' }],
                [
                    { text: '献祭金币', callback: '地下城献祭 献祭金币' },
                    { text: '献祭装备', callback: '地下城献祭 献祭装备' },
                    { text: '献祭生命', callback: '地下城献祭 献祭生命' },
                ]
            )
        ])
        await saveProgress(e, data)
    }

    // 添加 generateDungeon 函数
    generateDungeon(floor, player) {
        try {
            const roomCount = Math.min(5 + Math.floor(floor / 2), 10); // 每层5-10个房间
            const rooms = [];
            const hasBoss = floor % 5 === 0; // 每5层出现一个BOSS
            const bossRoom = hasBoss ? Math.floor(Math.random() * (roomCount - 2)) + 1 : -1; // BOSS房间位置

            logger.info(`[地下城] 生成第${floor}层地下城，房间数：${roomCount}，BOSS房间：${bossRoom}`);

            // 生成房间
            for (let i = 0; i < roomCount; i++) {
                let room = {};
                
                // BOSS房间
                if (i === bossRoom) {
                    const boss = MONSTERS.boss[Math.floor(Math.random() * MONSTERS.boss.length)];
                    room = {
                        type: '战斗',
                        enemy: {
                            ...boss,
                            hp: Math.floor(boss.hp[0] * (1 + floor * 0.1)),
                            max_hp: Math.floor(boss.hp[1] * (1 + floor * 0.1)),
                            attack: Math.floor(boss.attack[0] * (1 + floor * 0.1)),
                            defense: Math.floor(boss.defense[0] * (1 + floor * 0.1))
                        },
                        is_boss: true,
                        cleared: false
                    };
                    logger.info(`[地下城] 生成BOSS房间：${JSON.stringify(room)}`);
                }
                // 普通房间
                else {
                    const roomType = Math.random();
                    if (roomType < 0.4) { // 40%概率战斗房间
                        const monster = MONSTERS.normal[Math.floor(Math.random() * MONSTERS.normal.length)];
                        room = {
                            type: '战斗',
                            enemy: {
                                ...monster,
                                hp: Math.floor(monster.hp[0] * (1 + floor * 0.1)),
                                max_hp: Math.floor(monster.hp[1] * (1 + floor * 0.1)),
                                attack: Math.floor(monster.attack[0] * (1 + floor * 0.1)),
                                defense: Math.floor(monster.defense[0] * (1 + floor * 0.1))
                            },
                            cleared: false
                        };
                    } else if (roomType < 0.6) { // 20%概率宝箱房间
                        const treasures = [
                            '小血瓶', '大血瓶', '攻击药水', '防御药水',
                            '金币*50', '金币*100', '金币*200',
                            '经验药水', '幸运药水'
                        ];
                        room = {
                            type: '宝箱',
                            treasure: treasures[Math.floor(Math.random() * treasures.length)],
                            cleared: false
                        };
                    } else if (roomType < 0.8) { // 20%概率事件房间
                        const eventId = generateEventId();
                        room = {
                            type: '事件',
                            event_id: eventId,
                            cleared: false
                        };
                    } else { // 20%概率特殊房间
                        const specialRooms = Object.keys(SPECIAL_ROOMS);
                        const specialRoom = specialRooms[Math.floor(Math.random() * specialRooms.length)];
                        room = {
                            type: '特殊',
                            special_room: specialRoom,
                            cleared: false
                        };
                    }
                    logger.info(`[地下城] 生成普通房间：${JSON.stringify(room)}`);
                }
                rooms.push(room);
            }

            // 设置存档点
            const checkpoint_floor = Math.floor(floor / 5) * 5 + 1;

            const dungeon = {
                current_floor: floor,
                checkpoint_floor,
                rooms,
                boss_defeated: false
            };

            logger.info(`[地下城] 生成地下城完成：${JSON.stringify(dungeon)}`);
            return dungeon;
        } catch (error) {
            logger.error(`[地下城] generateDungeon error: ${error}`);
            // 返回一个默认的地下城结构
            return {
                current_floor: floor,
                checkpoint_floor: Math.floor(floor / 5) * 5 + 1,
                rooms: [{
                    type: '战斗',
                    enemy: {
                        name: '史莱姆',
                        hp: 10,
                        max_hp: 10,
                        attack: 2,
                        defense: 1
                    },
                    cleared: false
                }],
                boss_defeated: false
            };
        }
    }

    // 添加 checkAchievements 函数
    async checkAchievements(player) {
        try {
            if (!player.achievements) {
                player.achievements = [];
            }

            const newAchievements = [];
            const achievements = {
                '初入地下城': {
                    condition: () => player.stats.rooms_explored >= 1,
                    reward: { gold: 100, exp: 50 }
                },
                '战斗新手': {
                    condition: () => player.stats.enemies_killed >= 5,
                    reward: { gold: 200, exp: 100 }
                },
                '宝箱猎人': {
                    condition: () => player.stats.chests_opened >= 3,
                    reward: { gold: 300, exp: 150 }
                },
                '商店常客': {
                    condition: () => player.stats.gold_spent >= 1000,
                    reward: { gold: 500, exp: 200 }
                },
                'BOSS杀手': {
                    condition: () => player.stats.bosses_killed >= 1,
                    reward: { gold: 1000, exp: 500 }
                }
            };

            for (const [name, achievement] of Object.entries(achievements)) {
                if (!player.achievements.includes(name) && achievement.condition()) {
                    player.achievements.push(name);
                    newAchievements.push(name);

                    // 发放奖励
                    if (achievement.reward.gold) {
                        player.gold += achievement.reward.gold;
                    }
                    if (achievement.reward.exp) {
                        player.exp += achievement.reward.exp;
                    }
                }
            }

            if (newAchievements.length > 0) {
                let message = '\n🎉 获得新成就！\n';
                for (const achievement of newAchievements) {
                    message += `- ${achievement}\n`;
                }
                return message;
            }

            return '';
        } catch (error) {
            logger.error(`[地下城] checkAchievements error: ${error}`);
            return '';
        }
    }

    // 添加 checkQuestCompletion 函数
    async checkQuestCompletion(player) {
        try {
            if (!player.completed_quests) {
                player.completed_quests = [];
            }

            const newQuests = [];
            const quests = {
                '探索者': {
                    condition: () => player.stats.rooms_explored >= 10,
                    reward: { gold: 500, exp: 200 }
                },
                '战士': {
                    condition: () => player.stats.enemies_killed >= 20,
                    reward: { gold: 800, exp: 300 }
                },
                '收藏家': {
                    condition: () => player.stats.chests_opened >= 10,
                    reward: { gold: 1000, exp: 400 }
                },
                '商人': {
                    condition: () => player.stats.gold_spent >= 5000,
                    reward: { gold: 2000, exp: 800 }
                },
                '勇者': {
                    condition: () => player.stats.bosses_killed >= 3,
                    reward: { gold: 3000, exp: 1200 }
                }
            };

            for (const [name, quest] of Object.entries(quests)) {
                if (!player.completed_quests.includes(name) && quest.condition()) {
                    player.completed_quests.push(name);
                    newQuests.push(name);

                    // 发放奖励
                    if (quest.reward.gold) {
                        player.gold += quest.reward.gold;
                    }
                    if (quest.reward.exp) {
                        player.exp += quest.reward.exp;
                    }
                }
            }

            if (newQuests.length > 0) {
                let message = '\n📜 完成任务！\n';
                for (const quest of newQuests) {
                    message += `- ${quest}\n`;
                }
                return message;
            }

            return '';
        } catch (error) {
            logger.error(`[地下城] checkQuestCompletion error: ${error}`);
            return '';
        }
    }

    // 添加 updateCooldown 函数
    updateCooldown(player) {
        if (player.skill_cooldowns) {
            for (const skill in player.skill_cooldowns) {
                if (player.skill_cooldowns[skill] > 0) {
                    player.skill_cooldowns[skill]--
                }
            }
        }
    }

    async handleSkill(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply([textToArk('⚠️ 请先使用"开始地下城冒险"命令')]);
                return;
            }

            const player = data.player;
            const room = data.dungeon.rooms[player.position];
            const enemy = room.enemy;

            if (!enemy) {
                await e.reply([textToArk('⚠️ 这个房间没有敌人')]);
                return;
            }

            // 检查技能是否存在
            const skillName = e.msg.split(' ').slice(1).join(' ');
            const skill = SKILLS[skillName];
            if (!skill) {
                await e.reply([textToArk('⚠️ 技能不存在')]);
                return;
            }

            // 检查技能冷却
            if (player.skill_cooldowns && player.skill_cooldowns[skillName] > 0) {
                await e.reply([textToArk(`⚠️ 技能冷却中，还需${player.skill_cooldowns[skillName]}回合`)]);
                return;
            }

            // 检查魔法值
            if (player.mp < skill.mp_cost) {
                await e.reply([textToArk('⚠️ 魔法值不足')]);
                return;
            }

            // 使用技能
            player.mp -= skill.mp_cost;
            let message = `✨ 使用技能：${skill.name}\n`;

            // 计算技能效果
            let damage = 0;
            switch (skill.type) {
                case 'damage':
                    damage = Math.floor(skill.power * (1 + player.level * 0.1));
                    enemy.hp -= damage;
                    message += `💥 对${enemy.name}造成${damage}点伤害！\n`;
                    break;
                case 'heal':
                    const heal = Math.floor(skill.power * (1 + player.level * 0.1));
                    player.hp = Math.min(player.max_hp, player.hp + heal);
                    message += `💚 恢复${heal}点生命值！\n`;
                    break;
                case 'buff':
                    player.attack += skill.power;
                    player.defense += skill.power;
                    message += `📈 攻击力和防御力提升${skill.power}点！\n`;
                    break;
            }

            // 设置技能冷却
            if (!player.skill_cooldowns) {
                player.skill_cooldowns = {};
            }
            player.skill_cooldowns[skillName] = skill.cooldown;

            // 更新统计
            player.stats.skills_used = (player.stats.skills_used || 0) + 1;

            // 检查敌人是否死亡
            if (enemy.hp <= 0) {
                enemy.hp = 0;
                message += `🎉 ${enemy.name}被击败了！\n`;
                
                // 获得奖励
                let goldBase = enemy.gold;
                if (Array.isArray(goldBase)) {
                  goldBase = Math.floor(Math.random() * (goldBase[1] - goldBase[0] + 1)) + goldBase[0];
                }
                const goldReward = Math.floor(goldBase * (1 + Math.random()));
                const expReward = Math.floor(enemy.exp * (1 + Math.random()));
                player.gold += goldReward;
                player.exp += expReward;
                message += `💰 获得${goldReward}金币\n✨ 获得${expReward}经验\n`;

                // 更新统计
                player.stats.enemies_killed++;
                if (room.is_boss) {
                    player.stats.bosses_killed++;
                    message += `🏆 击败了BOSS！\n`;
                }
                
                // 检查升级
                const levelUpMessage = await this.checkLevelUp(player);
                if (levelUpMessage) {
                    message += levelUpMessage;
                }
                
                // 检查成就和任务
                const achievementMessage = await this.checkAchievements(player);
                if (achievementMessage) {
                    message += achievementMessage;
                }
                const questMessage = await this.checkQuestCompletion(player);
                if (questMessage) {
                    message += questMessage;
                }

                // 标记房间为已清理
                room.cleared = true;
            }

        await saveProgress(e, data);
            await e.reply([textToArk(message)]);
        } catch (error) {
            logger.error(`[地下城] handleSkill error: ${error}`);
            await e.reply([textToArk('⚠️ 技能使用失败，请稍后重试')]);
        }
    }

    async handleEvent(e, data) {
        try {
            const player = data.player;
            const room = data.dungeon.rooms[player.position];

            if (room.type !== 'event') {
                await e.reply([textToArk('⚠️ 这个房间没有事件')]);
                return;
            }

            const event = EVENTS[room.event_id];
            if (!event) {
                await e.reply([textToArk('⚠️ 事件数据异常')]);
                return;
            }

            let message = `🎲 事件：${event.name}\n`;
            message += `${event.description}\n\n`;

            // 处理事件效果
            switch (event.type) {
                case 'reward':
                    const goldReward = Math.floor(event.reward.gold * (1 + Math.random()));
                    const expReward = Math.floor(event.reward.exp * (1 + Math.random()));
                    player.gold += goldReward;
                    player.exp += expReward;
                    message += `💰 获得${goldReward}金币\n✨ 获得${expReward}经验\n`;
                    break;
                case 'trap':
                    const damage = Math.floor(event.damage * (1 - player.defense * 0.01));
                    player.hp = Math.max(1, player.hp - damage);
                    message += `💢 受到${damage}点伤害！\n`;
                    break;
                case 'buff':
                    player.attack += event.buff.attack;
                    player.defense += event.buff.defense;
                    message += `📈 攻击力+${event.buff.attack} 防御力+${event.buff.defense}\n`;
                    break;
                case 'special':
                    if (event.effect) {
                        message += event.effect(player);
                    }
                    break;
            }

            // 检查升级
            const levelUpMessage = await this.checkLevelUp(player);
            if (levelUpMessage) {
                message += levelUpMessage;
            }

            // 检查成就和任务
            const achievementMessage = await this.checkAchievements(player);
            if (achievementMessage) {
                message += achievementMessage;
            }
            const questMessage = await this.checkQuestCompletion(player);
            if (questMessage) {
                message += questMessage;
            }

            // 标记房间为已清理
            room.cleared = true;
            await saveProgress(e, data);
            await e.reply([textToArk(message)]);
        } catch (error) {
            logger.error(`[地下城] handleEvent error: ${error}`);
            await e.reply([textToArk('⚠️ 事件处理失败，请稍后重试')]);
        }
    }

    async handleSpecialRoom(e, data) {
        try {
            const player = data.player;
            const room = data.dungeon.rooms[player.position];

            if (room.type !== 'special') {
                await e.reply([textToArk('⚠️ 这个房间不是特殊房间')]);
                return;
            }

            const specialRoom = SPECIAL_ROOMS[room.special_room];
            if (!specialRoom) {
                await e.reply([textToArk('⚠️ 特殊房间数据异常')]);
                return;
            }

            let message = `🌟 特殊房间：${specialRoom.name}\n`;
            message += `${specialRoom.description}\n\n`;

            // 处理特殊房间效果
            switch (specialRoom.type) {
                case 'heal':
                    const heal = Math.floor(player.max_hp * specialRoom.heal_percent);
                    player.hp = Math.min(player.max_hp, player.hp + heal);
                    message += `💚 恢复${heal}点生命值！\n`;
                    break;
                case 'buff':
                    player.attack += specialRoom.buff.attack;
                    player.defense += specialRoom.buff.defense;
                    message += `📈 攻击力+${specialRoom.buff.attack} 防御力+${specialRoom.buff.defense}\n`;
                    break;
                case 'shop':
                    // 生成特殊商店物品
                    const specialItems = this.generateSpecialShopItems();
                    room.shop = { items: specialItems };
                    message += `🏪 发现特殊商店！\n`;
                    for (const item of specialItems) {
                        message += `${item.name} - ${item.price}金币\n`;
                        message += `${item.description}\n\n`;
                    }
                    break;
                case 'boss':
                    // 生成特殊BOSS
                    const boss = this.generateSpecialBoss();
                    room.enemy = boss;
                    room.is_boss = true;
                    message += `👾 发现特殊BOSS：${boss.name}！\n`;
                    message += `生命:${boss.hp}/${boss.max_hp} | 攻击:${boss.attack} | 防御:${boss.defense}\n`;
                    break;
                case 'treasure':
                    // 生成特殊宝箱
                    const treasure = this.generateSpecialTreasure();
                    room.treasure = treasure;
                    message += `🎁 发现特殊宝箱！\n`;
                    message += `可能获得：${treasure.possible_items.join('、')}\n`;
                    break;
            }

            // 标记房间为已清理
            room.cleared = true;
            await saveProgress(e, data);
            await e.reply([textToArk(message)]);
        } catch (error) {
            logger.error(`[地下城] handleSpecialRoom error: ${error}`);
            await e.reply([textToArk('⚠️ 特殊房间处理失败，请稍后重试')]);
        }
    }

    generateSpecialShopItems() {
        const items = [];
        const specialItems = Object.values(SHOP_ITEMS).filter(item => item.rare);
        
        // 随机选择3-5个特殊物品
        const count = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < count; i++) {
            const item = specialItems[Math.floor(Math.random() * specialItems.length)];
            if (item) {
                items.push({
                    ...item,
                    price: Math.floor(item.price * 0.8) // 特殊商店物品打8折
                });
            }
        }
        
        return items;
    }

    generateSpecialBoss() {
        const bosses = Object.values(BOSSES).filter(boss => boss.rare);
        const boss = bosses[Math.floor(Math.random() * bosses.length)];
        
        return {
            ...boss,
            hp: Math.floor(boss.hp * 1.5),
            max_hp: Math.floor(boss.max_hp * 1.5),
            attack: Math.floor(boss.attack * 1.5),
            defense: Math.floor(boss.defense * 1.5),
            gold: Math.floor(boss.gold * 2),
            exp: Math.floor(boss.exp * 2)
        };
    }

    generateSpecialTreasure() {
        const items = [];
        const specialItems = Object.values(ITEMS).filter(item => item.rare);
        
        // 随机选择2-4个特殊物品
        const count = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < count; i++) {
            const item = specialItems[Math.floor(Math.random() * specialItems.length)];
            if (item) {
                items.push(item.name);
            }
        }
        
        return {
            possible_items: items,
            gold: Math.floor(Math.random() * 1000) + 1000,
            exp: Math.floor(Math.random() * 500) + 500
        };
    }

    async saveProgress(e, data) {
        try {
            const userId = e.user_id;
            const saveData = {
                player: data.player,
                dungeon: data.dungeon,
                timestamp: Date.now()
            };

            // 保存到文件
            const savePath = path.join(process.cwd(), 'data', '地下城', 'saves', `${userId}.json`);
            await fs.writeFile(savePath, JSON.stringify(saveData, null, 2));

            // 更新排行榜
            await this.updateLeaderboard(userId, data.player);

            return true;
        } catch (error) {
            logger.error(`[地下城] saveProgress error: ${error}`);
            return false;
        }
    }

    async loadProgress(e) {
        try {
            const userId = e.user_id;
            const savePath = path.join(process.cwd(), 'data', '地下城', 'saves', `${userId}.json`);

            // 检查存档是否存在
            if (!fs.existsSync(savePath)) {
                return null;
            }

            // 读取存档
            const saveData = JSON.parse(await fs.readFile(savePath, 'utf8'));

            // 检查存档是否过期（24小时）
            if (Date.now() - saveData.timestamp > 24 * 60 * 60 * 1000) {
                await fs.unlink(savePath);
                return null;
            }

            return saveData;
        } catch (error) {
            logger.error(`[地下城] loadProgress error: ${error}`);
            return null;
        }
    }

    async updateLeaderboard(userId, player) {
        try {
            const leaderboardPath = path.join(process.cwd(), 'data', '地下城', 'leaderboard.json');
            let leaderboard = {};

            // 读取排行榜
            if (fs.existsSync(leaderboardPath)) {
                leaderboard = JSON.parse(await fs.readFile(leaderboardPath, 'utf8'));
            }

            // 更新玩家数据
            leaderboard[userId] = {
                nickname: player.nickname,
                level: player.level,
                gold: player.gold,
                achievements: player.achievements?.length || 0,
                quests: player.completed_quests?.length || 0,
                stats: player.stats
            };

            // 保存排行榜
            await fs.writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2));
        } catch (error) {
            logger.error(`[地下城] updateLeaderboard error: ${error}`);
        }
    }

    async showLeaderboard(e) {
        try {
            const leaderboardPath = path.join(process.cwd(), 'data', '地下城', 'leaderboard.json');
            if (!fs.existsSync(leaderboardPath)) {
                await e.reply(textToArk('📊 暂无排行榜数据'));
                return;
            }

            const leaderboard = JSON.parse(await fs.readFile(leaderboardPath, 'utf8'));
            const players = Object.entries(leaderboard)
                .map(([userId, data]) => ({
                    userId,
                    ...data
                }))
                .sort((a, b) => b.level - a.level);

            let output = '📊 地下城排行榜\n***\n';
            output += '🏆 等级排行\n';
            players.slice(0, 10).forEach((player, index) => {
                output += `${index + 1}. ${player.nickname} - 等级${player.level}\n`;
            });

            output += '\n💰 财富排行\n';
            players.sort((a, b) => b.gold - a.gold)
                .slice(0, 10)
                .forEach((player, index) => {
                    output += `${index + 1}. ${player.nickname} - ${player.gold}金币\n`;
                });

            output += '\n🏅 成就排行\n';
            players.sort((a, b) => b.achievements - a.achievements)
                .slice(0, 10)
                .forEach((player, index) => {
                    output += `${index + 1}. ${player.nickname} - ${player.achievements}个成就\n`;
                });

            output += '\n📜 任务排行\n';
            players.sort((a, b) => b.quests - a.quests)
                .slice(0, 10)
                .forEach((player, index) => {
                    output += `${index + 1}. ${player.nickname} - ${player.quests}个任务\n`;
                });

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showLeaderboard error: ${error}`);
            await e.reply(textToArk('⚠️ 显示排行榜失败，请稍后重试'));
        }
    }

    async showStats(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const player = data.player;
            let output = '📊 个人统计\n***\n';
            
            // 基础信息
            output += `👤 角色：${player.nickname || player.class}\n`;
            output += `📈 等级：${player.level}\n`;
            output += `💰 金币：${player.gold}\n\n`;

            // 战斗统计
            output += '⚔️ 战斗统计\n';
            output += `击败敌人：${player.stats.enemies_killed || 0}\n`;
            output += `击败BOSS：${player.stats.bosses_killed || 0}\n`;
            output += `使用技能：${player.stats.skills_used || 0}\n\n`;

            // 探索统计
            output += '🗺️ 探索统计\n';
            output += `探索房间：${player.stats.rooms_explored || 0}\n`;
            output += `开启宝箱：${player.stats.chests_opened || 0}\n`;
            output += `触发事件：${player.stats.events_triggered || 0}\n\n`;

            // 成就和任务
            output += '🏆 成就和任务\n';
            output += `获得成就：${player.achievements?.length || 0}\n`;
            output += `完成任务：${player.completed_quests?.length || 0}\n`;

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showStats error: ${error}`);
            await e.reply(textToArk('⚠️ 显示统计失败，请稍后重试'));
        }
    }

    async showHelp(e) {
        try {
            let output = '📖 地下城冒险帮助\n***\n';
            
            // 基础命令
            output += '🎮 基础命令\n';
            output += '开始地下城冒险 - 开始新的冒险\n';
            output += '选择职业 职业名 - 选择角色职业\n';
            output += '查看状态 - 显示当前状态\n';
            output += '查看背包 - 显示背包物品\n';
            output += '查看技能 - 显示可用技能\n\n';

            // 战斗命令
            output += '⚔️ 战斗命令\n';
            output += '攻击 - 对敌人发起攻击\n';
            output += '使用技能 技能名 - 使用指定技能\n';
            output += '使用物品 物品名 - 使用指定物品\n';
            output += '逃跑 - 尝试逃离战斗\n\n';

            // 探索命令
            output += '🗺️ 探索命令\n';
            output += '移动 方向 - 移动到指定方向\n';
            output += '查看房间 - 显示当前房间信息\n';
            output += '开启宝箱 - 开启当前房间的宝箱\n';
            output += '触发事件 - 触发当前房间的事件\n\n';

            // 商店命令
            output += '🏪 商店命令\n';
            output += '查看商店 - 显示商店物品\n';
            output += '购买 物品名 - 购买指定物品\n\n';

            // 其他命令
            output += '📊 其他命令\n';
            output += '查看成就 - 显示已获得的成就\n';
            output += '查看任务 - 显示已完成的任务\n';
            output += '查看统计 - 显示个人统计\n';
            output += '查看排行 - 显示排行榜\n';
            output += '帮助 - 显示本帮助信息\n\n';

            // 游戏说明
            output += '📝 游戏说明\n';
            output += '1. 每次冒险持续24小时\n';
            output += '2. 死亡后需要重新开始\n';
            output += '3. 每5层会出现一个BOSS\n';
            output += '4. 特殊房间有额外奖励\n';
            output += '5. 完成成就和任务可获得奖励\n';

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showHelp error: ${error}`);
            await e.reply(textToArk('⚠️ 显示帮助失败，请稍后重试'));
        }
    }

    async showClassInfo(e) {
        try {
            let output = '👥 职业介绍\n***\n';
            
            // 战士
            output += '⚔️ 战士\n';
            output += '特点：高生命值，高防御\n';
            output += '初始属性：\n';
            output += '- 生命值：150\n';
            output += '- 攻击力：15\n';
            output += '- 防御力：10\n';
            output += '特殊技能：\n';
            output += '- 战吼：提升攻击力\n';
            output += '- 防御姿态：提升防御力\n\n';

            // 法师
            output += '🔮 法师\n';
            output += '特点：高魔法值，高伤害\n';
            output += '初始属性：\n';
            output += '- 生命值：100\n';
            output += '- 魔法值：150\n';
            output += '- 攻击力：20\n';
            output += '- 防御力：5\n';
            output += '特殊技能：\n';
            output += '- 火球术：造成范围伤害\n';
            output += '- 冰霜新星：减速敌人\n\n';

            // 盗贼
            output += '🗡️ 盗贼\n';
            output += '特点：高暴击，高闪避\n';
            output += '初始属性：\n';
            output += '- 生命值：120\n';
            output += '- 攻击力：18\n';
            output += '- 防御力：8\n';
            output += '特殊技能：\n';
            output += '- 背刺：造成暴击伤害\n';
            output += '- 闪避：提高闪避率\n';

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showClassInfo error: ${error}`);
            await e.reply(textToArk('⚠️ 显示职业信息失败，请稍后重试'));
        }
    }

    async showRoomInfo(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const room = data.dungeon.rooms[data.player.position];
            let output = '🏠 房间信息\n***\n';

            switch (room.type) {
                case 'combat':
                    output += '⚔️ 战斗房间\n';
                    if (room.is_boss) {
                        output += '👾 BOSS房间\n';
                    }
                    output += `敌人：${room.enemy.name}\n`;
                    output += `生命值：${room.enemy.hp}/${room.enemy.max_hp}\n`;
                    output += `攻击力：${room.enemy.attack}\n`;
                    output += `防御力：${room.enemy.defense}\n`;
                    break;
                case 'treasure':
                    output += '🎁 宝箱房间\n';
                    output += `状态：${room.cleared ? '已开启' : '未开启'}\n`;
                    if (room.treasure) {
                        output += `可能获得：${room.treasure.possible_items.join('、')}\n`;
                    }
                    break;
                case 'event':
                    output += '🎲 事件房间\n';
                    output += `事件：${EVENTS[room.event_id].name}\n`;
                    output += `${EVENTS[room.event_id].description}\n`;
                    break;
                case 'shop':
                    output += '🏪 商店房间\n';
                    output += '可以购买各种物品\n';
                    break;
                case 'special':
                    output += '🌟 特殊房间\n';
                    output += `类型：${SPECIAL_ROOMS[room.special_room]?.name || '未知特殊房间'}\n`;
                    output += `${SPECIAL_ROOMS[room.special_room]?.desc || '未知特殊房间'}\n`;
                    break;
                default:
                    output += '❓ 未知房间\n';
            }

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showRoomInfo error: ${error}`);
            await e.reply(textToArk('⚠️ 显示房间信息失败，请稍后重试'));
        }
    }

    getRoomDescription(room) {
        try {
            if (!room) {
                logger.error('[地下城] getRoomDescription: room is undefined');
                return '❓ 未知房间';
            }
            
            logger.info(`[地下城] getRoomDescription: room type = ${room.type}, event_id = ${room.event_id}`);
            
            switch (room.type) {
                case '战斗':
                    if (room.is_boss) {
                        return `👾 BOSS房间 - ${room.enemy.name}`;
                    }
                    return `⚔️ 战斗房间 - ${room.enemy.name}`;
                case '宝箱':
                    return '🎁 宝箱房间';
                case '事件':
                    const event = EVENTS[room.event_id];
                    if (!event) {
                        logger.error(`[地下城] getRoomDescription: unknown event_id = ${room.event_id}`);
                        return '🎲 事件房间 - 未知事件';
                    }
                    return `🎲 事件房间 - ${event.name}`;
                case '商店':
                    return '🏪 商店房间';
                case '特殊':
                    return `🌟 特殊房间 - ${SPECIAL_ROOMS[room.special_room]?.name || '未知特殊房间'}`;
                default:
                    logger.error(`[地下城] getRoomDescription: unknown room type = ${room.type}`);
                    return '❓ 未知房间';
            }
        } catch (error) {
            logger.error(`[地下城] getRoomDescription error: ${error}`);
            return '❓ 房间信息获取失败';
        }
    }

    // 添加显示指令列表功能
    async showCommands(e) {
        try {
            let output = '📖 地下城冒险指令列表\n***\n';
            
            // 基础指令
            output += '🎮 基础指令\n';
            output += '开始地下城冒险 - 开始新的冒险\n';
            output += '选择地下城职业 职业名 - 选择角色职业\n';
            output += '地下城信息 - 显示当前状态\n';
            output += '地下城背包 - 显示背包物品\n';
            output += '地下城装备 - 显示当前装备\n';
            output += '地下城技能 - 显示可用技能\n\n';

            // 战斗指令
            output += '⚔️ 战斗指令\n';
            output += '地下城攻击 - 对敌人发起攻击\n';
            output += '地下城使用 物品名 - 使用指定物品\n';
            output += '地下城技能 技能名 - 使用指定技能\n\n';

            // 探索指令
            output += '🗺️ 探索指令\n';
            output += '地下城移动 - 移动到下一房间\n';
            output += '地下城开启宝箱 - 开启当前房间的宝箱\n';
            output += '地下城购买 物品名 - 购买商店物品\n\n';

            // 系统指令
            output += '⚙️ 系统指令\n';
            output += '地下城存档 - 保存当前进度\n';
            output += '地下城加载列表 - 显示可用存档\n';
            output += '地下城加载1/2 - 加载指定存档\n';
            output += '地下城重新开始 - 重新开始游戏\n\n';

            // 社交指令
            output += '👥 社交指令\n';
            output += '地下城公会 - 查看公会信息\n';
            output += '地下城创建公会 名称 - 创建新公会\n';
            output += '地下城加入公会 名称 - 加入公会\n';
            output += '地下城退出公会 - 退出当前公会\n\n';

            // 其他指令
            output += '📊 其他指令\n';
            output += '地下城成就 - 显示已获得的成就\n';
            output += '地下城任务 - 显示已完成的任务\n';
            output += '地下城宝石 - 显示元素宝石收集情况\n';
            output += '地下城世界BOSS - 查看世界BOSS信息\n';
            output += '地下城指令 - 显示本指令列表\n';

            await e.reply(textToArk(output));
        } catch (error) {
            logger.error(`[地下城] showCommands error: ${error}`);
            await e.reply(textToArk('⚠️ 显示指令列表失败，请稍后重试'));
        }
    }

    // 添加缺失的saveCheckpoint函数
    async saveCheckpoint(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            await saveProgress(e, data);
            await e.reply(textToArk('✅ 游戏进度已保存'));
        } catch (error) {
            logger.error(`[地下城] saveCheckpoint error: ${error}`);
            await e.reply(textToArk('⚠️ 保存失败，请稍后重试'));
        }
    }

    // 添加缺失的setNickname函数
    async setNickname(e) {
        try {
            let data = await loadProgress(e);
            if (!data) {
                await e.reply(textToArk('⚠️ 请先使用"开始地下城冒险"命令'));
                return;
            }

            const nickname = e.msg.replace('地下城设置昵称', '').trim();
            if (!nickname) {
                await e.reply(textToArk('⚠️ 昵称不能为空'));
                return;
            }

            data.player.nickname = nickname;
            await saveProgress(e, data);
            await e.reply(textToArk(`✅ 昵称已设置为：${nickname}`));
        } catch (error) {
            logger.error(`[地下城] setNickname error: ${error}`);
            await e.reply(textToArk('⚠️ 设置昵称失败，请稍后重试'));
        }
    }

    // 添加 renderStatus 函数
    renderStatus(data) {
        try {
            if (!data || !data.player || !data.dungeon) {
                return {
                    a: '⚠️ 数据错误',
                    b: '',
                    c: '',
                    d: '',
                    e: '',
                    f: '',
                    g: ''
                };
            }
            
            const player = data.player;
            const room = data.dungeon.rooms[player.position];
            const floor = data.dungeon.current_floor;

            // 基础状态
            const status = {
                a: `🏰 地下城第${floor}层`,
                b: `👤 ${player.nickname || player.class} | 等级:${player.level} | 经验:${player.exp}`,
                c: `❤️ 生命:${player.hp}/${player.max_hp} | ⚔️ 攻击:${player.attack} | 🛡️ 防御:${player.defense}`,
                d: `💰 金币:${player.gold} | 🎒 背包:${player.inventory.length}格`,
                e: `📍 位置:${player.position + 1}/${data.dungeon.rooms.length}`,
                f: this.getRoomDescription(room),
                g: ''
            };

            // 添加装备信息
            if (player.equipment && (player.equipment.weapon || player.equipment.armor)) {
                let equipInfo = '⚔️ 装备: ';
                if (player.equipment.weapon) equipInfo += `武器[${player.equipment.weapon}] `;
                if (player.equipment.armor) equipInfo += `防具[${player.equipment.armor}]`;
                status.g = equipInfo;
            }

            return status;
        } catch (error) {
            logger.error(`[地下城] renderStatus error: ${error}`);
            return {
                a: '⚠️ 状态显示错误',
                b: '',
                c: '',
                d: '',
                e: '',
                f: '',
                g: ''
            };
        }
    }

async handleCombat(e, data) {
    try {
        const player = data.player;
        const room = data.dungeon.rooms[player.position];
        const enemy = room.enemy;

        if (!enemy) {
            return '⚠️ 这个房间没有敌人';
        }

        if (room.cleared) {
            return '✅ 这个房间的敌人已经被击败了';
        }

        // 计算玩家伤害
        let playerDamage = Math.max(1, player.attack - enemy.defense);
        let message = '';
        let isCrit = false;

        // 检查暴击
        if (player.crit_rate && Math.random() < player.crit_rate) {
            isCrit = true;
            playerDamage = Math.floor(playerDamage * (player.crit_damage || 1.5));
            message = `💥 暴击！你对${enemy.name}造成了${playerDamage}点伤害！\n`;
        } else {
            message = `⚔️ 你对${enemy.name}造成了${playerDamage}点伤害！\n`;
        }

        // 检查敌人是否死亡
        if (enemy.hp <= 0) {
            enemy.hp = 0;
            room.cleared = true;
            
            // 获得奖励
            let goldBase = enemy.gold;
            if (Array.isArray(goldBase)) {
              goldBase = Math.floor(Math.random() * (goldBase[1] - goldBase[0] + 1)) + goldBase[0];
            }
            const goldReward = Math.floor(goldBase * (1 + Math.random()));
            const expReward = Math.floor(enemy.exp * (1 + Math.random()));
            player.gold += goldReward;
            player.exp += expReward;
            
            message += `🎉 ${enemy.name}被击败了！\n`;
            message += `💰 获得${goldReward}金币\n`;
            message += `✨ 获得${expReward}经验\n`;
            
            // 更新统计
            player.stats.enemies_killed++;
            if (room.is_boss) {
                player.stats.bosses_killed++;
                message += `🏆 击败了BOSS！\n`;
            }
            
            // 检查升级
            const levelUpMessage = await this.checkLevelUp(player);
            if (levelUpMessage) {
                message += levelUpMessage;
            }
            
            // 检查成就和任务
            const achievementMessage = await this.checkAchievements(player);
            if (achievementMessage) {
                message += achievementMessage;
            }
            const questMessage = await this.checkQuestCompletion(player);
            if (questMessage) {
                message += questMessage;
            }

            return message;
        }
        
        // 敌人反击
        let enemyDamage = Math.max(1, enemy.attack - player.defense);
        let enemyCrit = false;

        // 检查敌人暴击
        if (enemy.crit_rate && Math.random() < enemy.crit_rate) {
            enemyCrit = true;
            enemyDamage = Math.floor(enemyDamage * enemy.crit_damage);
            message += `💢 ${enemy.name}暴击！对你造成了${enemyDamage}点伤害！\n`;
        } else {
            message += `💢 ${enemy.name}对你造成了${enemyDamage}点伤害！\n`;
        }
        
        player.hp = Math.max(0, player.hp - enemyDamage);
        
        // 检查玩家是否死亡
        if (player.hp <= 0) {
            message += `💀 你被${enemy.name}击败了！\n`;
            message += '游戏结束，请重新开始。';
            await this.handleGameOver(data);
            return message;
        }
        
        message += `\n当前状态：\n`;
        message += `你：生命值 ${player.hp}/${player.max_hp} ${isCrit ? '(暴击)' : ''}\n`;
        message += `${enemy.name}：生命值 ${enemy.hp}/${enemy.max_hp} ${enemyCrit ? '(暴击)' : ''}`;
        
        return message;
    } catch (error) {
        logger.error(`[地下城] handleCombat error: ${error}`);
        throw new Error('战斗处理失败');
    }
}

    // 添加 checkLevelUp 函数
    async checkLevelUp(player) {
        try {
            const expNeeded = player.level * 100;
            if (player.exp >= expNeeded) {
                player.level++;
                player.exp -= expNeeded;
                player.max_hp += 10;
                player.hp = player.max_hp;
                player.attack += 2;
                player.defense += 1;
                
                let message = `🎉 升级了！\n`;
                message += `当前等级：${player.level}\n`;
                message += `生命值上限+10\n`;
                message += `攻击力+2\n`;
                message += `防御力+1\n`;
                
                return message;
            }
        } catch (error) {
            logger.error(`[地下城] checkLevelUp error: ${error}`);
            return '';
        }
    }
}
