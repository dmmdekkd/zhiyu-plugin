import fs from "node:fs";
import chalk from "chalk";
import { Version } from "./components/index.js";

const files = fs
  .readdirSync("./plugins/zhiyu-plugin/apps", { recursive: true })
  .filter((file) => file.endsWith(".js"));

let ret = [];

files.forEach((file) => {
  ret.push(import(`./apps/${file}`));
});

ret = await Promise.allSettled(ret);

let apps = {};
for (let i in files) {
  let name = files[i].replace(".js", "");

  if (ret[i].status != "fulfilled") {
    logger.error(
      chalk.bgRed.white(` [zhiyu-plugin] 插件载入失败 `) +
      chalk.red(` 【${name}】`)
    );
    logger.error(
      chalk.red("原因: ") +
      (ret[i].reason && ret[i].reason.stack ? ret[i].reason.stack : ret[i].reason)
    );
    continue;
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]];
}

// 获取当前时间
const currentTime = new Date().toLocaleString();

// 优化美化 logger.info 部分显示效果，每行单独 logger.info，自动对齐（考虑中文宽度）
const boxWidth = 43;
const borderColor = "#00FFFF";
const line = chalk.hex(borderColor)("═".repeat(boxWidth));
/**
 * 计算字符串显示宽度（中文2，英文1）
 */
function strWidth(str) {
  // 去除chalk颜色码
  str = str.replace(/\x1B\[[0-9;]*m/g, "");
  let width = 0;
  for (const ch of str) {
    width += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return width;
}
const padLine = (content, prefix = "  ") => {
  // prefix: 默认左侧2空格
  const contentWidth = strWidth(prefix + content);
  const pad = Math.max(0, boxWidth - contentWidth);
  return prefix + content + " ".repeat(pad);
};

logger.info(chalk.hex(borderColor)(`╔${line}╗`));
logger.info(chalk.hex(borderColor)(`║${" ".repeat(boxWidth)}║`));
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(
    chalk.hex("#FFD700")("知鱼插件") + " " +
    chalk.hex("#00FF00")(`v${Version.ver}`) + " " +
    chalk.hex("#FF69B4")("载入成功 ^_^")
  ) +
  chalk.hex(borderColor)("║")
);
logger.info(chalk.hex(borderColor)(`║${" ".repeat(boxWidth)}║`));
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(chalk.hex("#FFA500")("作者: 3448585471")) +
  chalk.hex(borderColor)("║")
);
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(chalk.hex("#1E90FF")("GitHub: github.com/dmmdekkd/jiandan-plugin")) +
  chalk.hex(borderColor)("║")
);
logger.info(chalk.hex(borderColor)(`║${" ".repeat(boxWidth)}║`));
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(chalk.hex("#FFFF00")("维护中，欢迎反馈问题")) +
  chalk.hex(borderColor)("║")
);
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(
    chalk.hex("#ADFF2F")("当前时间:") + " " +
    chalk.hex("#7CFC00")(currentTime)
  ) +
  chalk.hex(borderColor)("║")
);
logger.info(
  chalk.hex(borderColor)("║") +
  padLine(
    chalk.hex("#FF4500")("版本:") + " " +
    chalk.hex("#FF6347")(`v${Version.ver}`)
  ) +
  chalk.hex(borderColor)("║")
);
logger.info(chalk.hex(borderColor)(`║${" ".repeat(boxWidth)}║`));
logger.info(chalk.hex(borderColor)(`╚${line}╝`));

export { apps };
