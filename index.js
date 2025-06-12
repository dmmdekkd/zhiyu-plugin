import fs from "node:fs";
import chalk from "chalk";
import { Version } from "./components/index.js";

let ret = [];

const files = fs
  .readdirSync("./plugins/zhiyu-plugin/apps")
  .filter((file) => file.endsWith(".js"));

files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace(".js", "");

  if (ret[i].status != "fulfilled") {
    logger.error(`载入插件错误：${logger.red(name)}`);
    logger.error(ret[i].reason);
    continue;
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}

// 获取当前时间
const currentTime = new Date().toLocaleString();

// 美化并重新排版 logger.info 部分
logger.info(chalk.hex("#00FFFF")(`
  ╭───────────────────────────────╮
  │                               │
  │  ${chalk.hex("#FFD700")("知鱼插件")} ${chalk.hex("#00FF00")(`v${Version.ver}`)} ${chalk.hex("#FF69B4")("载入成功 ^_^")}  │
  │                               │
  │  ${chalk.hex("#FFA500")("作者 - 3448585471")}                │
  │  ${chalk.hex("#1E90FF")("github - github.com/dmmdekkd/jiandan-plugin")}        │
  │                               │
  │  ${chalk.hex("#FFFF00")("维护中，欢迎反馈问题")}     │
  │  ${chalk.hex("#ADFF2F")("当前时间：")}${chalk.hex("#7CFC00")(currentTime)}      │
  │  ${chalk.hex("#FF4500")("版本：")}${chalk.hex("#FF6347")(`v${Version.ver}`)}         │
  │                               │
  ╰───────────────────────────────╯
`));

export { apps };
