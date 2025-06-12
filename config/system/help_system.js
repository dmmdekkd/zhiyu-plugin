export const helpCfg = {
  title: "简单插件帮助",
  subTitle: "Yunzai-Bot & jiandan-plugin",
  columnCount: 2,
  colWidth: 265,
  theme: "all",
  themeExclude: ["default"],
  style: {
    fontColor: "#BF41A6",
    descColor: "#eee",
    contBgColor: "rgba(6, 21, 31, .5)",
    contBgBlur: 3,
    headerBgColor: "rgba(6, 21, 31, .4)",
    rowBgColor1: "rgba(6, 21, 31, .2)",
    rowBgColor2: "rgba(6, 21, 31, .35)",
  },
};

export const helpList = [
  {
    group: "今日系列",
    list: [
      {
        icon: 47,
        title: "今日运势",
        desc: "查询今日运势",
      },
      {
        icon: 32,
        title: "今日CP",
        desc: "今日cp老婆",
      },            
    ],
  },
  {
    group: "查询",
    list: [
      {
        icon: 75,
        title: "查询好友",
        desc: "已加入好友列表",
      },
      {
        icon: 70,
        title: "查询群",
        desc: "已加入QQ群列表",
      },
      {
        icon: 65,
        title: "查询群号",
        desc: "查看当前所在群号",
      },   
      {
        icon: 78,
        title: "联系主人",
        desc: "给设置好的QQ号带话",
      },                           
    ],
  },
  {
    group: "消息推送",
    list: [
      {
        icon: 50,
        title: "推送好友",
        desc: "示列 推送好友 123456789 文本",
      },
      {
        icon: 45,
        title: "推送群聊",
        desc: "示列 推送群聊 123456789 文本",
      },
      {
        icon: 40,
        title: "转发推送好友",
        desc: "示列 转发推送好友 123456789 文本",
      },            
      {
        icon: 35,
        title: "转发推送群聊",
        desc: "示列 转发推送好友 123456789 文本",
      },
    ],
  },
  {
    group: "管理命令，仅主人可用",
    auth: "master",
    list: [
      {
        icon: 95,
        title: "推送全部好友",
        desc: "顾名思义",
      },    
      {
        icon: 85,
        title: "推送全部群聊",
        desc: "顾名思义",
      },   
      {
        icon: 20,
        title: "#转发推送全部好友",
        desc: "顾名思义",
      },        
      {
        icon: 15,
        title: "#转发推送全部群聊",
        desc: "顾名思义",
      },             
      {
        icon: 25,
        title: "#简单(插件)(强制)更新",
        desc: "更新插件",
      },
    ],
  },
];

export const isSys = true;
