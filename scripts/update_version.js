const fs = require('fs');
const path = require('path');

// 读取 CHANGELOG.md 文件
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const readmePath = path.join(__dirname, '../README.md');

// 获取最新版本号
function getLatestVersion() {
    const content = fs.readFileSync(changelogPath, 'utf-8');
    const match = content.match(/^# (\d+\.\d+\.\d+)/m);
    return match ? match[1] : null;
}

// 更新 README.md 中的版本号
function updateReadmeVersion(version) {
    let content = fs.readFileSync(readmePath, 'utf-8');
    content = content.replace(
        /<img src="https:\/\/img\.shields\.io\/badge\/版本-\d+\.\d+\.\d+-blue\.svg"/,
        `<img src="https://img.shields.io/badge/版本-${version}-blue.svg"`
    );
    fs.writeFileSync(readmePath, content, 'utf-8');
}

// 主函数
function main() {
    const version = getLatestVersion();
    if (version) {
        updateReadmeVersion(version);
        console.log(`版本已更新为: ${version}`);
    } else {
        console.error('无法获取版本号');
    }
}

main(); 