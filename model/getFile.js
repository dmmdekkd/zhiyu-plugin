import { promises as fs } from 'fs';
import fs_ from 'fs'
import { readFile, writeFile } from 'fs';
import path from 'path';
import { promisify } from 'util';
import yaml from 'yaml'
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
import Cfg from '../model/Cfg.js';
class Gimodel {
  /**
   * 依传入的概率随机抽取一个Name
   * @param {Array} arr 数组，元素为对象 { name: 'name1', probability: 20 }
   * @returns 
   */
  async getRandomName(arr) {
    return new Promise((resolve, reject) => {
        try {
            let totalProbability = arr.reduce((sum, item) => sum + item.probability, 0);
            if (totalProbability > 100) {
                let factor = 100 / totalProbability;
                arr = arr.map(item => ({
                    name: item.name,
                    probability: item.probability * factor
                }));
            }

            let random = Math.random() * 100;
            let sum = 0;

            for (let item of arr) {
                sum += item.probability;
                if (random <= sum) {
                    resolve(item.name);
                    break;
                }
            }
        } catch (error) {
            reject(error);
        }
    });
  }
  /**
   * 获取64位随机数字与字母的组合
   * @returns string
   */
  async getRandom64Code() {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
  /**
   * 生成随机数字
   * @param {number} a 数字最大范围
   * @param {number} b 基于获取的数字再增加，默认0
   * @returns number
   */
  async getReadmeNumber(a, b = 0) {
    return Math.floor(Math.random() * a) + b
  }
  /**
   * 已废弃
   * @param {*} filePath 
   * @param {*} callback 
   */
  async duquFile(filePath, callback) {
    console.log(`已废弃。`)
    /**fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      const lines = data.split('@');
      const Piaoliu = [];

      lines.forEach((line) => {
        line = line.slice(0, -1);
        const parts = line.split('；');
        const plp = parts[0];
        const userid = parts[1];
        Piaoliu.push(`@${plp}；${userid}`);
      });

      callback(Piaoliu);
    });**/
  }
  /**
   * 获取配置文件
   * @param {*} file 
   * @param {*} name 
   */
  async get_cfg(file, name) {
    return await yaml.parse(fs_.readFileSync(`./plugins/help-plugin/${file}/${name}.yaml`, `utf-8`))
  }

 
  /**
   * 创建文件夹和文件
   * @param {*} filePath 文件路径，不包含文件名
   * @param {*} filename 文件名，不包含文件路径
   */
  async mdfile(filePath, filename) {
    if (!fs_.existsSync(filePath)) {
      fs.mkdirSync(filePath)
    }
    let filePath_ = path.join(filePath, filename)
    await fs.writeFile(filePath_, '');
  }
  async date_time() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const date_time = `${year}-${month}-${day}`;
    return date_time;
  }
  //废案
  async getplpid() {
    let { config } = Cfg.getconfig(`resources`, `plp`)
    let plpid = config
    const randomIndex = Math.floor(Math.random() * plpid.plpid.length);
    const plpid_ = plpid.plpid[randomIndex];
    return plpid_
  }

  /**
 * 删除JSON数组内容
 * @param {*} deldata 要删除的数据
 * @param {string} filePath 路径
 */
  async deljson(deldata, filePath) {
    try {
      let data = fs_.readFileSync(filePath, 'utf-8');
      data = JSON.parse(data);
      if (!Array.isArray(data)) return false;
      let filteredData = []
      for (let item of data) {
        item = JSON.stringify(item)
        deldata = JSON.stringify(deldata)
        if (item != deldata) {
          item = JSON.parse(item)
          filteredData.push(item)
          deldata = JSON.parse(deldata)
        }
      }
      const tempData = JSON.stringify(filteredData, null, 3);
      fs_.writeFileSync(filePath, tempData, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error processing the file', error);
      return false;
    }
  }

  /**
   * 删除指定yaml中的内容 废案
   * @param {*} filePath 文件路径
   * @param {*} content 文件内容
   */
  async delyaml_plpid(filePath, content) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = yaml.parse(fileContent);
    data.plpid = data.plpid.filter(id => id !== content);
    const updatedFileContent = yaml.stringify(data);
    await fs.writeFile(filePath, updatedFileContent, 'utf-8');
  }

}

export default new Gimodel