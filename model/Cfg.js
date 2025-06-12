import yaml from 'yaml';
import fs from 'node:fs';
import _ from 'lodash';

const _path = process.cwd().replace(/\\/g, '/');

class Cfg {
  constructor() {
    this.file = `${_path}/plugins/zhiyu-plugin/config`;
    this.defile = `${_path}/plugins/zhiyu-plugin/defSet`;
  }

  /** 解析单个配置文件 */
  getconfig(file, name) {
    let cfgyaml = `${_path}/plugins/zhiyu-plugin/${file}/${name}.yaml`;
    const configData = fs.readFileSync(cfgyaml, 'utf8');
    return yaml.parse(configData);
  }

  /** 获取用户配置 */
  getConfig(app, y = true) {
    const configPath = `${this.file}/${app}.yaml`;
    return y ? yaml.parse(fs.readFileSync(configPath, 'utf8')) : fs.readFileSync(configPath, 'utf8');
  }

  /** 获取默认配置 */
  getdef(app, y = true) {
    const defPath = `${this.defile}/${app}.yaml`;
    return y ? yaml.parse(fs.readFileSync(defPath, 'utf8')) : fs.readFileSync(defPath, 'utf8');
  }

  /** 设置用户配置 */
  setConfig(app, data, y = true) {
    if (y) data = yaml.stringify(data);
    const configPath = `${this.file}/${app}.yaml`;
    fs.writeFileSync(configPath, data, 'utf8');
  }
}

export default new Cfg();
