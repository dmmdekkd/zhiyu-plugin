import fs from "fs";
import YAML from "yaml";
import _ from "lodash";
import chokidar from "chokidar";

export default class YamlReader {
  /**
   * 读写yaml文件
   *
   * @param yamlPath yaml文件绝对路径
   * @param isWatch 是否监听文件变化
   */
  constructor(yamlPath, isWatch = false) {
    this.yamlPath = yamlPath;
    this.isWatch = isWatch;
    this.initYaml();
  }

  initYaml() {
    // parseDocument 将会保留注释
    this.document = YAML.parseDocument(fs.readFileSync(this.yamlPath, "utf8"));
    if (this.isWatch && !this.watcher) {
      this.watcher = chokidar.watch(this.yamlPath).on("change", () => {
        if (this.isSave) {
          this.isSave = false;
          return;
        }
        this.initYaml();
      });
    }
  }

  /** 返回读取的对象 */
  get jsonData() {
    if (!this.document) {
      return null;
    }
    return this.document.toJSON();
  }

  /* 检查集合是否包含key的值 */
  has(keyPath) {
    return this.document.hasIn(keyPath.split("."));
  }

  /* 返回key的值 */
  get(keyPath) {
    return _.get(this.jsonData, keyPath);
  }

  /**
   * 新增或修改插件配置
   * @param {string} pluginName 插件名
   * @param {object} config 配置对象
   */
  addOrUpdatePlugin(pluginName, config) {
    // 插件配置以插件名为key存储
    this.document.setIn([pluginName], config);
    this.save();
  }

  /**
   * 卸载插件（删除插件配置）
   * @param {string} pluginName 插件名
   */
  removePlugin(pluginName) {
    this.document.deleteIn([pluginName]);
    this.save();
  }

  // 数组添加数据
  addIn(keyPath, value) {
    this.document.addIn(keyPath.split("."), value);
    this.save();
  }

  // 彻底删除某个key
  deleteKey(keyPath) {
    let keys = keyPath.split(".");
    keys = this.mapParentKeys(keys);
    this.document.deleteIn(keys);
    this.save();
  }

  // 保存yaml文件，写入文件
  save() {
    this.isSave = true;
    let yaml = this.document.toString();
    fs.writeFileSync(this.yamlPath, yaml, "utf8");
  }

  /**
   * 判断是否启用功能
   */
  checkDisable(p) {
    const groupCfg = cfg.getGroup(p.e.self_id, p.e.group_id);
    if (groupCfg.disable?.length && groupCfg.disable.includes(p.name))
      return false;
    if (groupCfg.enable?.length && !groupCfg.enable.includes(p.name))
      return false;
    return true;
  }

  async changePlugin(key) {
    try {
      let app = await import(`../../${this.dir}/${key}?${moment().format("x")}`);
      if (app.apps) app = { ...app.apps };
      lodash.forEach(app, (p) => {
        if (!p?.prototype) return;
        const plugin = new p();
        if (plugin.rule)
          for (const i of plugin.rule)
            if (!(i.reg instanceof RegExp)) i.reg = new RegExp(i.reg);
        for (const i of this.priority)
          if (i.key === key && i.name === plugin.name)
            Object.assign(i, {
              plugin,
              class: p,
              priority: plugin.priority,
            });
        // 新增/修改插件配置
        this.yamlReader.addOrUpdatePlugin(plugin.name, plugin.config || {});
      });
      this.priority = lodash.orderBy(this.priority, ["priority"], ["asc"]);
    } catch (err) {
      Bot.makeLog("error", [`插件加载错误 ${logger.red(key)}`, err], "Plugin");
    }
  }

  /** 监听热更新 */
  watch(dirName, appName) {
    this.watchDir(dirName);
    if (this.watcher[`${dirName}.${appName}`]) return;

    const file = `./${this.dir}/${dirName}/${appName}`;
    const watcher = chokidar.watch(file);
    const key = `${dirName}/${appName}`;

    /** 监听修改 */
    watcher.on(
      "change",
      lodash.debounce(() => {
        Bot.makeLog("mark", `[修改插件][${dirName}][${appName}]`, "Plugin");
        this.changePlugin(key);
      }, 5000)
    );

    /** 监听删除 */
    watcher.on(
      "unlink",
      lodash.debounce(async () => {
        Bot.makeLog("mark", `[卸载插件][${dirName}][${appName}]`, "Plugin");
        /** 停止更新监听 */
        this.watcher[`${dirName}.${appName}`].removeAllListeners("change");
        this.priority = this.priority.filter((i) => i.key !== key);
        // 卸载插件配置
        this.yamlReader.removePlugin(appName.replace(/\.js$/, ""));
      }, 5000)
    );
    this.watcher[`${dirName}.${appName}`] = watcher;
  }
}
