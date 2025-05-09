import plugin from "../../../lib/plugins/plugin.js";
import image from "../model/image.js";
import Cfg from '../model/Cfg.js';

export class example2 extends plugin {
    constructor() {
        super({
            name: 'jiandan插件', // 插件名称
            dsc: '更换更美观的帮助', // 插件描述
            event: 'message', // 监听消息事件
            priority: -114514, // 优先级
            rule: [
                // 帮助命令
                {
                    reg: "^#?(简单|jd)(命令|帮助|菜单|help|说明|功能|指令|使用说明)$",
                    fnc: 'help' // 调用help方法
                }
            ]
        });
    }

    /**
     * 发送帮助图片
     * @param {Object} e 事件对象
     */
    async sendHelpImage(e) {
        let _path = process.cwd().replace(/\\/g, '/'); // 获取当前工作目录并替换反斜杠
        const config = Cfg.getconfig('config', 'help'); // 获取帮助配置
        let { img } = await image(e, 'help', 'help', { // 生成帮助图片
            saveId: 'help', // 保存ID
            cwd: _path, // 当前工作目录
            genshinPath: `${_path}/plugins/jiandan-plugin/resources/`, // 资源路径
            helpData: config, // 帮助数据
            version: HelpPluginVersion // 插件版本
        });
        e.reply(img); // 回复图片
    }

    /**
     * 处理帮助命令
     * @param {Object} e 事件对象
     */
    async help(e) {
        // 判断适配器类型并发送不同的消息
        let helpText = "请等待图片出现\n指令 第二页 查看更多"; // 定义 helpText        
        let buttonData = {
            type: "keyboard",
            id: "102131063_1733625284", // 按钮ID
        };

        if (this.e.adapter_name === 'QQBot') {
            // 在QQBot中添加按钮消息
            await e.reply(helpText);            
            await e.reply(segment.raw(buttonData));
        } else if (this.e.adapter_name === 'ICQQ') {
            // ICQQ中发送不同的文本
            let helpText = "请等待图片出现\n指令 第二页 查看更多"; // 定义 helpText
            await e.reply(helpText);
        }

        // 调用发送帮助图片方法
        await this.sendHelpImage(e);
    }
}
