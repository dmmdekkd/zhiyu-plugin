// contactMaster.js
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import express from 'express';
import fetch from 'node-fetch';
import { getUinByUserId } from './bind.js'; // 你自己的绑定查询方法
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';

// __dirname 兼容写法（ESM 模块）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messageFilePath = path.join(__dirname, '../m.json');

const app = express();
const PORT = 3000;

// 管理员配置
const ADMIN_USERNAME = 'root';
const ADMIN_PASSWORD = '123456'; // 建议修改为更安全的密码

// QQ邮箱配置
const emailConfig = {
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: '3448585471@qq.com', // 发件人QQ邮箱
    pass: 'hdrzdxmkgqxgdbfc' // QQ邮箱授权码
  }
};

// 创建邮件传输对象
const transporter = nodemailer.createTransport(emailConfig);

// 发送邮件的函数
async function sendEmail(to, subject, content, htmlContent = null) {
  try {
    // 验证收件人邮箱格式
    if (!to || typeof to !== 'string') {
      logger.error('[联系主人] 无效的收件人邮箱地址:', to);
      return false;
    }

    // 确保QQ号是数字
    const qqNumber = to.split('@')[0];
    if (!/^\d+$/.test(qqNumber)) {
      logger.error('[联系主人] 无效的QQ号:', qqNumber);
      return false;
    }

    // 验证QQ号长度
    if (qqNumber.length < 5 || qqNumber.length > 11) {
      logger.error('[联系主人] QQ号长度不正确:', qqNumber);
      return false;
    }

    const mailOptions = {
      from: {
        name: '3448585471回复了你的消息',
        address: emailConfig.auth.user
      },
      to: {
        name: `QQ用户${qqNumber}`,
        address: to
      },
      subject: subject,
      text: content,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };
    if (htmlContent) mailOptions.html = htmlContent;

    // 验证邮件配置
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      logger.error('[联系主人] 邮件配置不完整');
      return false;
    }

    // 验证发件人邮箱格式
    if (!emailConfig.auth.user.includes('@qq.com')) {
      logger.error('[联系主人] 发件人邮箱格式不正确');
      return false;
    }

    const info = await transporter.sendMail(mailOptions);
    logger.info('[联系主人] 邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    logger.error('[联系主人] 邮件发送失败:', error);
    if (error.code === 'EMESSAGE') {
      logger.error('[联系主人] 收件人地址可能不存在:', to);
      // 尝试使用备用格式
      try {
        const qqNumber = to.split('@')[0];
        const backupTo = `${qqNumber}@qq.com`;
        if (backupTo !== to) {
          logger.info('[联系主人] 尝试使用备用邮箱格式:', backupTo);
          const backupOptions = {
            ...mailOptions,
            to: backupTo
          };
          const backupInfo = await transporter.sendMail(backupOptions);
          logger.info('[联系主人] 备用邮箱发送成功:', backupInfo.messageId);
          return true;
        }
      } catch (backupError) {
        logger.error('[联系主人] 备用邮箱发送也失败:', backupError);
      }
    }
    return false;
  }
}

// 中间件解析 JSON
app.use(bodyParser.json());

// 管理员登录验证中间件
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('需要管理员登录');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const [username, password] = auth;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('用户名或密码错误');
  }
}

// 简单锁，防止并发读写冲突
let fileLock = false;
async function waitForUnlock() {
  while (fileLock) {
    await new Promise(r => setTimeout(r, 20));
  }
}

// 消息ID生成器
let messageIdCounter = 1;
function generateMessageId() {
  return messageIdCounter++;
}

// 读取消息列表（同步读取即可）
function readMessages() {
  if (!fs.existsSync(messageFilePath)) return [];
  try {
    const data = fs.readFileSync(messageFilePath, 'utf8');
    if (!data) return [];
    try {
      const messages = JSON.parse(data);
      // 更新消息ID计数器
      if (messages.length > 0) {
        messageIdCounter = Math.max(...messages.map(m => m.id || 0)) + 1;
      }
      return messages;
    } catch {
      logger.error('[联系主人] m.json 文件内容非 JSON 格式，重置为空数组');
      return [];
    }
  } catch (e) {
    logger.error('[联系主人] 读取消息失败:', e);
    return [];
  }
}

// 写入消息列表（同步写入）
function writeMessages(messages) {
  try {
    fs.writeFileSync(messageFilePath, JSON.stringify(messages, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('写入消息失败:', e);
    return false;
  }
}

// 普通消息页面，显示所有消息，但未审核的显示等待审核
function renderHTML(messages) {
  // 按用户分组消息
  const groupedMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.qq]) {
      acc[msg.qq] = [];
    }
    acc[msg.qq].push(msg);
    return acc;
  }, {});

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>联系主人的消息列表</title>
<style>
  body { font-family: Arial, sans-serif; background: #f0f2f5; padding: 20px; }
  h1 { text-align: center; }
  .message-list { 
    list-style: none; 
    padding: 0; 
    max-width: 1200px; 
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  .user-group {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .user-header {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }
  .user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }
  .user-info {
    flex: 1;
  }
  .user-name { 
    font-weight: bold; 
    color: #333;
    font-size: 16px;
  }
  .user-id {
    color: #666;
    font-size: 14px;
  }
  .message-count {
    background: #1890ff;
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
  }
  .user-messages {
    padding: 16px;
  }
  .message-item {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    position: relative;
  }
  .message-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .message-item.new-message::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background-color: #ff4d4f;
    border-radius: 50%;
  }
  .message-item.replied {
    background-color: #f6ffed;
    border-radius: 4px;
    padding: 12px;
    margin: 8px 0;
  }
  .message-text { 
    margin: 8px 0;
    white-space: pre-wrap;
    color: #333;
    line-height: 1.5;
  }
  .message-time {
    color: #888;
    font-size: 14px;
  }
  .message-id {
    color: #1890ff;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .reply {
    margin-top: 12px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;
    border-left: 4px solid #1890ff;
  }
  .reply-title {
    color: #1890ff;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .hidden { display: none; }
  @media (max-width: 768px) {
    .message-list {
      grid-template-columns: 1fr;
    }
  }
</style>
</head>
<body>
<h1>联系主人的消息列表</h1>
<div class="message-list">
${Object.entries(groupedMessages).map(([qq, msgs]) => {
  const latestMsg = msgs[msgs.length - 1];
  return `
    <div class="user-group">
      <div class="user-header">
        <img class="user-avatar" src="http://q1.qlogo.cn/headimg_dl?dst_uin=${qq}&spec=100" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NCAwIDIuNjctMi4xNyA0Ljg0LTQuODQgNC44NC0yLjY3IDAtNC44NC0yLjE3LTQuODQtNC44NCAwLTIuNjcgMi4xNy00Ljg0IDQuODQtNC44NHptMCAxMmM0LjQyIDAgOC4xNy0yLjI4IDkuNTQtNS41NS0yLjY5LTQuMDMtNy4yOC02LjU1LTEyLjA1LTYuNTUtNC43NyAwLTkuMzYgMi41Mi0xMi4wNSA2LjU1IDEuMzcgMy4yNyA1LjEyIDUuNTUgOS41NCA1LjU1eiIvPjwvc3ZnPg=='" />
        <div class="user-info">
          <div class="user-name">${latestMsg.qqName ? escapeHtml(latestMsg.qqName) : '未知用户'}</div>
          <div class="user-id">QQ: ${qq}</div>
        </div>
        <span class="message-count">${msgs.length}条消息</span>
      </div>
      <div class="user-messages">
        ${msgs.map((m, index) => `
          <div class="message-item ${index === msgs.length - 1 && !m.reply ? 'new-message' : ''} ${m.reply ? 'replied' : ''}" data-id="${m.id}">
            <div class="message-id">消息ID: ${m.id}</div>
            <div class="message-text">${escapeHtml(m.message)}</div>
            <div class="message-time">${new Date(+m.timestamp).toLocaleString()}</div>
            ${m.reply ? `
              <div class="reply">
                <div class="reply-title">主人回复：</div>
                <div class="message-text">${escapeHtml(m.reply.content)}</div>
                <div class="message-time">${new Date(+m.reply.timestamp).toLocaleString()}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}).join('')}
</div>
</body>
</html>`;
}

// 管理后台页面，显示所有消息，带操作按钮
function renderAdminHTML(messages) {
  // 按用户分组消息
  const groupedMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.qq]) {
      acc[msg.qq] = [];
    }
    acc[msg.qq].push(msg);
    return acc;
  }, {});

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>联系主人消息后台管理</title>
<style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
  h1 { text-align: center; }
  .toolbar {
    margin: 20px auto;
    max-width: 1200px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .search-box {
    flex: 1;
    min-width: 200px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .batch-actions {
    display: flex;
    gap: 10px;
  }
  .message-checkbox {
    margin-right: 8px;
  }
  .select-all-container {
    margin-right: 16px;
    display: flex;
    align-items: center;
  }
  .select-all-container input {
    margin-right: 4px;
  }
  .user-group {
    margin-bottom: 20px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .user-header {
    background: #fafafa;
    padding: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: background-color 0.3s;
  }
  .user-header:hover {
    background: #f0f0f0;
  }
  .user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }
  .user-info {
    flex: 1;
  }
  .user-name {
    font-weight: bold;
    color: #333;
    font-size: 16px;
  }
  .user-id {
    color: #666;
    font-size: 14px;
  }
  .message-count {
    background: #1890ff;
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
  }
  .user-messages {
    padding: 0;
    margin: 0;
    display: none;
  }
  .user-messages.expanded {
    display: block;
  }
  .message-item {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    gap: 16px;
    position: relative;
  }
  .message-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }
  .message-item.new-message::before {
    content: '';
    position: absolute;
    top: 16px;
    right: 16px;
    width: 8px;
    height: 8px;
    background-color: #ff4d4f;
    border-radius: 50%;
  }
  .message-item.replied {
    background-color: #f6ffed;
  }
  .message-content {
    flex: 1;
  }
  .message-text {
    margin: 8px 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .message-time {
    color: #888;
    font-size: 14px;
  }
  .message-actions {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .reply-form {
    margin-top: 12px;
    display: none;
  }
  .reply-form.expanded {
    display: block;
  }
  .reply-input {
    width: 100%;
    padding: 8px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    margin-bottom: 8px;
    min-height: 80px;
    resize: vertical;
  }
  .reply-buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .toggle-icon {
    transition: transform 0.3s;
    color: #666;
  }
  .expanded .toggle-icon {
    transform: rotate(180deg);
  }
  button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
  }
  button:hover {
    opacity: 0.8;
  }
  .show-btn { background-color: #4CAF50; color: white; }
  .hide-btn { background-color: #f44336; color: white; }
  .del-btn { background-color: #777; color: white; }
  .batch-btn { background-color: #1890ff; color: white; }
  .reply-btn { background-color: #1890ff; color: white; }
  .cancel-btn { background-color: #d9d9d9; color: #333; }
  .send-btn { background-color: #52c41a; color: white; }
  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    display: inline-block;
    margin-left: 8px;
  }
  .pending { background: #fff7e6; color: #d46b08; }
  .reviewed { background: #f6ffed; color: #389e0d; }
  .hidden { background: #fff1f0; color: #cf1322; }
  .reply-content {
    margin-top: 12px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;
    border-left: 4px solid #1890ff;
  }
  .reply-title {
    color: #1890ff;
    font-weight: bold;
    margin-bottom: 4px;
  }
  .message-id {
    color: #1890ff;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
  }
</style>
</head>
<body>
<h1>联系主人消息后台管理</h1>

<div class="toolbar">
  <div class="select-all-container">
    <input type="checkbox" id="selectAll" onchange="window.toggleSelectAll(this.checked)">
    <label for="selectAll">全选</label>
  </div>
  <input type="text" class="search-box" placeholder="搜索消息内容、用户ID或昵称..." onkeyup="window.searchMessages(this.value)">
  <div class="batch-actions">
    <button class="batch-btn" onclick="window.batchAction('show')">批量显示</button>
    <button class="batch-btn" onclick="window.batchAction('hide')">批量隐藏</button>
    <button class="batch-btn" onclick="window.batchAction('delete')">批量删除</button>
  </div>
</div>

<div id="messageGroups">
  ${Object.entries(groupedMessages).map(([qq, msgs]) => {
    const latestMsg = msgs[msgs.length - 1];
    return `
      <div class="user-group" data-qq="${qq}">
        <div class="user-header" onclick="window.toggleUserMessages('${qq}')">
          <input type="checkbox" class="message-checkbox" onchange="window.toggleUserGroupCheckbox(this, '${qq}')">
          <img class="user-avatar" src="http://q1.qlogo.cn/headimg_dl?dst_uin=${qq}&spec=100" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NCAwIDIuNjctMi4xNyA0Ljg0LTQuODQgNC44NC0yLjY3IDAtNC44NC0yLjE3LTQuODQtNC44NCAwLTIuNjcgMi4xNy00Ljg0IDQuODQtNC44NHptMCAxMmM0LjQyIDAgOC4xNy0yLjI4IDkuNTQtNS41NS0yLjY5LTQuMDMtNy4yOC02LjU1LTEyLjA1LTYuNTUtNC43NyAwLTkuMzYgMi41Mi0xMi4wNSA2LjU1IDEuMzcgMy4yNyA1LjEyIDUuNTUgOS41NCA1LjU1eiIvPjwvc3ZnPg=='" />
          <div class="user-info">
            <div class="user-name">${latestMsg.qqName || '未知用户'}</div>
            <div class="user-id">QQ: ${qq}</div>
          </div>
          <span class="message-count">${msgs.length}条消息</span>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="user-messages" id="messages-${qq}">
          ${msgs.map((m, index) => `
            <div class="message-item ${index === msgs.length - 1 && !m.reply ? 'new-message' : ''} ${m.reply ? 'replied' : ''}" data-id="${m.id}">
              <div class="message-content">
                <input type="checkbox" class="message-checkbox" onchange="window.updateSelectAllState()">
                <div class="message-id">消息ID: ${m.id}</div>
                <div class="message-text">${escapeHtml(m.message)}</div>
                <div class="message-time">${new Date(+m.timestamp).toLocaleString()}</div>
                ${m.reply ? `
                  <div class="reply-content">
                    <div class="reply-title">已回复：</div>
                    <div class="message-text">${escapeHtml(m.reply.content)}</div>
                    <div class="message-time">${new Date(+m.reply.timestamp).toLocaleString()}</div>
                  </div>
                ` : ''}
                <div class="reply-form" id="reply-${m.id}">
                  <textarea class="reply-input" placeholder="输入回复内容..."></textarea>
                  <div class="reply-buttons">
                    <button class="cancel-btn" onclick="window.cancelReply(${m.id})">取消</button>
                    <button class="send-btn" onclick="window.sendReply(${m.id})">发送</button>
                  </div>
                </div>
              </div>
              <div class="message-actions">
                ${m.hidden
                  ? `<button class="show-btn" onclick="window.handleToggleVisibility(${m.id}, false)">显示</button>`
                  : `<button class="hide-btn" onclick="window.handleToggleVisibility(${m.id}, true)">隐藏</button>`
                }
                <button class="reply-btn" onclick="window.showReplyForm(${m.id})">回复</button>
                <button class="del-btn" onclick="window.handleDeleteMessage(${m.id})">删除</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('')}
</div>

<div class="pagination">
  <button onclick="changePage(-1)">上一页</button>
  <span id="pageInfo">第 1 页</span>
  <button onclick="changePage(1)">下一页</button>
</div>

<script>
// 全局变量
window.currentPage = 1;
window.pageSize = 20;
window.allMessages = ${JSON.stringify(messages)};
window.filteredMessages = [...window.allMessages];
window.sortConfig = { column: 'timestamp', direction: 'desc' };

// 工具函数
window.escapeHtml = function(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// 显示提示信息
window.showMessage = function(message, isError = false) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '20px';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.padding = '10px 20px';
  div.style.borderRadius = '4px';
  div.style.backgroundColor = isError ? '#ff4d4f' : '#52c41a';
  div.style.color = 'white';
  div.style.zIndex = '1000';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
};

// 搜索消息
window.searchMessages = function(keyword) {
  keyword = keyword.toLowerCase();
  const groups = document.querySelectorAll('.user-group');
  
  groups.forEach(group => {
    const messages = group.querySelectorAll('.message-item');
    let hasMatch = false;
    
    messages.forEach(msg => {
      const content = msg.querySelector('.message-text').textContent.toLowerCase();
      const qq = group.dataset.qq;
      const qqName = group.querySelector('.user-name').textContent.toLowerCase();
      
      if (content.includes(keyword) || 
          qq.includes(keyword) || 
          qqName.includes(keyword)) {
        hasMatch = true;
        msg.style.display = '';
      } else {
        msg.style.display = 'none';
      }
    });
    
    group.style.display = hasMatch ? '' : 'none';
  });
};

// 全选/取消全选
window.toggleSelectAll = function(checked) {
  const checkboxes = document.querySelectorAll('.message-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
};

// 更新全选框状态
window.updateSelectAllState = function() {
  const checkboxes = document.querySelectorAll('.message-checkbox');
  const selectAllCheckbox = document.getElementById('selectAll');
  const checkedCount = document.querySelectorAll('.message-checkbox:checked').length;
  
  if (checkedCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (checkedCount === checkboxes.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
};

// 切换用户组内所有消息的选中状态
window.toggleUserGroupCheckbox = function(checkbox, qq) {
  const userGroup = document.querySelector('.user-group[data-qq="' + qq + '"]');
  const messageCheckboxes = userGroup.querySelectorAll('.message-checkbox');
  messageCheckboxes.forEach(cb => {
    cb.checked = checkbox.checked;
  });
  window.updateSelectAllState();
};

// 批量操作
window.batchAction = async function(action) {
  const selectedMessages = document.querySelectorAll('.message-checkbox:checked');
  if (selectedMessages.length === 0) {
    window.showMessage('请选择要操作的消息', true);
    return;
  }

  if (action === 'delete' && !confirm('确定要删除选中的消息吗？')) {
    return;
  }

  try {
    const promises = Array.from(selectedMessages).map(checkbox => {
      const messageItem = checkbox.closest('.message-item');
      if (!messageItem) return null;
      
      const id = parseInt(messageItem.dataset.id);
      if (action === 'delete') {
        return fetch('/admin/deleteMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } else {
        return fetch('/admin/toggleVisibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, hide: action === 'hide' })
        });
      }
    }).filter(Boolean);

    await Promise.all(promises);
    window.showMessage('操作成功');
    location.reload();
  } catch (e) {
    console.error('操作失败:', e);
    window.showMessage('操作失败：' + e.message, true);
  }
};

// 切换用户消息展开/折叠
window.toggleUserMessages = function(qq) {
  const messagesDiv = document.getElementById('messages-' + qq);
  const header = messagesDiv.previousElementSibling;
  messagesDiv.classList.toggle('expanded');
  header.classList.toggle('expanded');
};

// 显示回复表单
window.showReplyForm = function(id) {
  const replyForm = document.getElementById('reply-' + id);
  replyForm.classList.add('expanded');
};

// 取消回复
window.cancelReply = function(id) {
  const replyForm = document.getElementById('reply-' + id);
  replyForm.classList.remove('expanded');
  replyForm.querySelector('textarea').value = '';
};

// 发送回复
window.sendReply = async function(id) {
  const replyForm = document.getElementById('reply-' + id);
  const content = replyForm.querySelector('textarea').value.trim();
  
  if (!content) {
    window.showMessage('请输入回复内容', true);
    return;
  }

  try {
    const res = await fetch('/admin/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content })
    });
    
    const data = await res.json();
    if (data.success) {
      window.showMessage('回复成功');
      window.cancelReply(id);
      location.reload();
    } else {
      window.showMessage('回复失败：' + data.message, true);
    }
  } catch (e) {
    console.error('回复失败:', e);
    window.showMessage('网络错误：' + e.message, true);
  }
};

// 切换消息显示/隐藏
window.handleToggleVisibility = async function(id, hide) {
  try {
    const res = await fetch('/admin/toggleVisibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hide })
    });
    const data = await res.json();
    if (data.success) {
      window.showMessage('操作成功');
      location.reload();
    } else {
      window.showMessage('操作失败：' + data.message, true);
    }
  } catch (e) {
    console.error('网络错误:', e);
    window.showMessage('网络错误：' + e.message, true);
  }
};

// 删除消息
window.handleDeleteMessage = async function(id) {
  if (!confirm('确定删除该消息？')) return;
  try {
    const res = await fetch('/admin/deleteMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      window.showMessage('删除成功');
      location.reload();
    } else {
      window.showMessage('删除失败：' + data.message, true);
    }
  } catch (e) {
    console.error('网络错误:', e);
    window.showMessage('网络错误：' + e.message, true);
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 默认展开第一个用户的消息
  const firstGroup = document.querySelector('.user-group');
  if (firstGroup) {
    window.toggleUserMessages(firstGroup.dataset.qq);
  }
});
</script>
</body>
</html>`;

  return html;
}

// 防止 XSS，简单转义
function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 路由：普通消息列表页面，只显示未隐藏
app.get('/', (req, res) => {
  try {
    let messages = readMessages();
    messages = messages.filter(m => !m.hidden);
    res.send(renderHTML(messages));
  } catch (e) {
    res.status(500).send('服务器错误');
    console.error(e);
  }
});

// 路由：后台管理页面，显示全部
app.get('/admin', adminAuth, (req, res) => {
  try {
    const messages = readMessages();
    res.send(renderAdminHTML(messages));
  } catch (e) {
    res.status(500).send('服务器错误');
    console.error(e);
  }
});

// 路由：消息审核（如果需要）
// 可删
app.post('/review', (req, res) => {
  const { timestamp } = req.body;
  if (!timestamp) return res.json({ success: false, message: '缺少 timestamp 参数' });

  try {
    let messages = readMessages();
    const idx = messages.findIndex(m => String(m.timestamp) === String(timestamp));
    if (idx === -1) return res.json({ success: false, message: '找不到对应消息' });

    messages[idx].reviewed = true;
    if (writeMessages(messages)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: '写入文件失败' });
    }
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: '服务器错误' });
  }
});

// 路由：后台切换隐藏显示状态
app.post('/admin/toggleVisibility', adminAuth, (req, res) => {
  const { id, hide } = req.body;
  if (!id) return res.json({ success: false, message: '缺少消息ID参数' });
  if (typeof hide !== 'boolean') return res.json({ success: false, message: '缺少hide参数或参数类型错误' });

  try {
    let messages = readMessages();
    const idx = messages.findIndex(m => m.id === parseInt(id));
    if (idx === -1) return res.json({ success: false, message: '找不到对应消息' });

    messages[idx].hidden = hide;
    if (writeMessages(messages)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: '写入文件失败' });
    }
  } catch (e) {
    console.error('[联系主人] 切换消息显示状态失败:', e);
    res.json({ success: false, message: '服务器错误' });
  }
});

// 路由：后台删除消息
app.post('/admin/deleteMessage', adminAuth, (req, res) => {
  const { id } = req.body;
  if (!id) return res.json({ success: false, message: '缺少消息ID参数' });

  try {
    let messages = readMessages();
    const idx = messages.findIndex(m => m.id === parseInt(id));
    if (idx === -1) return res.json({ success: false, message: '找不到对应消息' });

    messages.splice(idx, 1);
    if (writeMessages(messages)) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: '写入文件失败' });
    }
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: '服务器错误' });
  }
});

// 添加回复消息的路由
app.post('/admin/reply', adminAuth, async (req, res) => {
  const { id, content } = req.body;
  if (!id || !content) {
    return res.json({ success: false, message: '缺少必要参数' });
  }

  try {
    let messages = readMessages();
    const idx = messages.findIndex(m => m.id === parseInt(id));
    if (idx === -1) {
      return res.json({ success: false, message: '找不到对应消息' });
    }

    // 添加回复信息
    messages[idx].reply = {
      content,
      timestamp: Date.now()
    };

    if (writeMessages(messages)) {
      try {
        // 构建HTML邮件内容
        const emailContentHtml = `
          <div style="font-size:16px;">
            <b>3448585471回复了你的消息</b>
            <hr>
            <div>消息ID：${messages[idx].id}</div>
            <div>用户QQ：${messages[idx].qq}</div>
            <div>用户昵称：${messages[idx].qqName || '未知用户'}</div>
            <div>用户头像：<br>
              <img src="http://q1.qlogo.cn/headimg_dl?dst_uin=${messages[idx].qq}&spec=100" alt="用户头像" style="width:100px;height:100px;border-radius:50%;" />
            </div>
            <hr>
            <div><b>原消息：</b><br>${messages[idx].message}</div>
            <hr>
            <div><b>回复内容：</b><br>${content}</div>
            <hr>
            <div>回复时间：${new Date().toLocaleString()}</div>
          </div>
        `;
        // 纯文本备用
        const emailContent = [
          '3448585471回复了你的消息',
          '━━━━━━━━━━━━━━',
          `消息ID：${messages[idx].id}`,
          `用户QQ：${messages[idx].qq}`,
          `用户昵称：${messages[idx].qqName || '未知用户'}`,
          `用户头像：http://q1.qlogo.cn/headimg_dl?dst_uin=${messages[idx].qq}&spec=100`,
          '━━━━━━━━━━━━━━',
          '原消息：',
          messages[idx].message,
          '━━━━━━━━━━━━━━',
          '回复内容：',
          content,
          '━━━━━━━━━━━━━━',
          '回复时间：' + new Date().toLocaleString()
        ].join('\n');

        // 发送QQ邮件
        const toEmail = `${messages[idx].qq}@qq.com`;
        logger.info('[联系主人] 尝试发送邮件到:', toEmail);
        const success = await sendEmail(toEmail, '3448585471回复了你的消息', emailContent, emailContentHtml);

        // 只给管理员反馈邮件状态
        if (success) {
          await res.json({ success: true });
        } else {
          await res.json({ success: false, message: '邮件发送失败，请检查邮箱配置和QQ号是否正确' });
        }
      } catch (emailErr) {
        logger.error('[联系主人] 发送邮件通知失败:', emailErr);
        await res.json({ success: false, message: '邮件发送失败，请检查邮箱配置和QQ号是否正确' });
      }
    } else {
      await res.json({ success: false, message: '保存回复失败' });
    }
  } catch (e) {
    logger.error('[联系主人] 处理回复失败:', e);
    res.json({ success: false, message: '处理回复时出错，请重试' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log('联系主人消息网页已启动，访问：http://localhost:' + PORT);
});

// 插件部分
export class ContactMasterPlugin extends plugin {
  constructor() {
    super({
      name: '联系主人插件',
      dsc: '用户消息收集与管理',
      event: 'message',
      priority: 1000,
      rule: [
        {
          reg: '^[#|/]?联系主人\\s*(.*)$',
          fnc: 'contactMaster'
        },
        {
          reg: '^[#|/]?主人回复\\s*(\\d+)\\s*(.*)$',
          fnc: 'adminReply'
        },
        {
          reg: '^[#|/]?主人回复\\s*\\[CQ:at,qq=(\\d+)\\]\\s*(.*)$',
          fnc: 'adminReply'
        },
        {
          reg: '^[#|/]?查看待回复$',
          fnc: 'checkPendingMessages'
        }
      ]
    });
  }

  async contactMaster(e) {
    if (!e.msg) return;
    
    // 提取消息内容
    const match = e.msg.match(/^[#|/]?联系主人\s*(.*)$/);
    const message = match ? match[1].trim() : '';
    
    if (!message) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `联系主人`
          },
          {
            key: "#PROMPT#",
            value: `请输入要发送给主人的消息内容`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `格式：联系主人 [消息内容]` }
                ]
              },
              {
                obj_kv: [
                  { key: "desc", value: `示例：联系主人 我想反馈一个问题` }
                ]
              }             
            ]
          }
        ]
      });
      return;
    }

    // 检查消息长度
    if (message.length > 500) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `消息过长`
          },
          {
            key: "#PROMPT#",
            value: `消息内容不能超过500个字符`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请重新发送较短的消息` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    // 检查发送频率
    const messages = readMessages();
    const userMessages = messages.filter(m => m.qq === String(e.user_id));
    const lastMessage = userMessages[userMessages.length - 1];
    if (lastMessage && Date.now() - lastMessage.timestamp < 60000) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `发送太频繁`
          },
          {
            key: "#PROMPT#",
            value: `请稍后再试`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `发送消息需要间隔1分钟` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    // 绑定优先用用户id取uin
    let qq = String(e.user_id);
    let qqName = '';

    try {
      const uin = await getUinByUserId(e.user_id);
      if (uin) {
        qq = String(uin);
        
        // 调用接口获取QQ昵称
        const res = await fetch('http://api.loomi.icu/?qq=' + uin);
        if (res.ok) {
          const json = await res.json();
          qqName = json.data?.qq || '';
        }
      }
    } catch (err) {
      console.error('获取用户信息出错', err);
    }

    const msgObj = {
      id: generateMessageId(), // 添加消息ID
      qq,
      qqName,
      message,
      timestamp: String(Date.now()),
      hidden: false,
      reviewed: true,
      status: 'pending'
    };

    try {
      // 先读再写，保证顺序
      await waitForUnlock();
      fileLock = true;

      let messages = readMessages();

      // 限制最多1000条
      if (messages.length >= 1000) {
        messages.shift();
      }
      messages.push(msgObj);

      if (writeMessages(messages)) {
        fileLock = false;
        // 回复提示
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `消息已发送`
            },
            {
              key: "#PROMPT#",
              value: `消息已发送给主人`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `消息ID：${msgObj.id}` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `请耐心等待回复` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `你可以随时发送"联系主人"查看最新回复` }
                  ]
                }
              ]
            }
          ]
        });

        // 同时返回消息列表截图
        try {
          const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
          const page = await browser.newPage();
          await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
          const messageListElement = await page.$('.message-list');
          const screenshotBuffer = await messageListElement.screenshot();
          await browser.close();
          await e.reply(segment.image(screenshotBuffer));
        } catch (err) {
          logger.error('[联系主人] 网页截图失败:', err);
        }
      } else {
        throw new Error('写入消息失败');
      }
    } catch (err) {
      fileLock = false;
      console.error('写入消息文件失败', err);
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `发送失败`
          },
          {
            key: "#PROMPT#",
            value: `发送失败，请稍后重试`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `如果问题持续存在，请联系管理员` }
                ]
              }
            ]
          }
        ]
      });
    }
  }

  // 管理员回复功能
  async adminReply(e) {
    // 验证是否是主人
    if (!this.e.isMaster) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `权限不足`
          },
          {
            key: "#PROMPT#",
            value: `只有主人才能使用此命令`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请联系管理员获取权限` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    let targetMsg = null;
    let replyContent = '';

    if (e.at) {
      // 通过@用户回复
      const atQQ = e.at;
      const messages = readMessages();
      targetMsg = messages
        .filter(m => m.qq === String(atQQ) && !m.reply)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (!targetMsg) {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `未找到消息`
            },
            {
              key: "#PROMPT#",
              value: `该用户没有待回复的消息`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `请确认用户ID是否正确` }
                  ]
                }
              ]
            }
          ]
        });
        return;
      }

      replyContent = e.msg.replace(/\[CQ:at,qq=\d+\]/, '').trim();
    } else {
      // 通过消息ID回复
      const match = e.msg.match(/^[#|/]?主人回复\s*(\d+)\s*(.*)$/);
      if (!match) {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `回复格式错误`
            },
            {
              key: "#PROMPT#",
              value: `支持以下两种格式`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `1. 主人回复 [消息ID] [回复内容]` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `2. 主人回复 [@用户] [回复内容]` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `示例：` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `主人回复 1 好的，我知道了` }
                  ]
                },
                {
                  obj_kv: [
                    { key: "desc", value: `主人回复 @用户 好的，我知道了` }
                  ]
                }
              ]
            }
          ]
        });
        return;
      }

      const [, messageId, content] = match;
      replyContent = content.trim();

      if (!replyContent) {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `缺少回复内容`
            },
            {
              key: "#PROMPT#",
              value: `请输入回复内容`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `回复内容不能为空` }
                  ]
                }
              ]
            }
          ]
        });
        return;
      }

      const messages = readMessages();
      targetMsg = messages.find(m => m.id === parseInt(messageId));
    }

    if (!targetMsg) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `未找到消息`
          },
          {
            key: "#PROMPT#",
            value: `未找到该消息`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请确认消息ID是否正确` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    if (replyContent.length > 500) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `回复内容过长`
          },
          {
            key: "#PROMPT#",
            value: `回复内容不能超过500个字符`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请重新发送较短的回复` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    try {
      let messages = readMessages();
      const idx = messages.findIndex(m => m.id === targetMsg.id);
      
      messages[idx].reply = {
        content: replyContent,
        timestamp: Date.now()
      };

      if (writeMessages(messages)) {
        try {
          // 构建HTML邮件内容
          const emailContentHtml = `
            <div style="font-size:16px;">
              <b>3448585471回复了你的消息</b>
              <hr>
              <div>消息ID：${targetMsg.id}</div>
              <div>用户QQ：${targetMsg.qq}</div>
              <div>用户昵称：${targetMsg.qqName || '未知用户'}</div>
              <div>用户头像：<br>
                <img src="http://q1.qlogo.cn/headimg_dl?dst_uin=${targetMsg.qq}&spec=100" alt="用户头像" style="width:100px;height:100px;border-radius:50%;" />
              </div>
              <hr>
              <div><b>原消息：</b><br>${targetMsg.message}</div>
              <hr>
              <div><b>回复内容：</b><br>${replyContent}</div>
              <hr>
              <div>回复时间：${new Date().toLocaleString()}</div>
            </div>
          `;
          // 纯文本备用
          const emailContent = [
            '3448585471回复了你的消息',
            '━━━━━━━━━━━━━━',
            `消息ID：${targetMsg.id}`,
            `用户QQ：${targetMsg.qq}`,
            `用户昵称：${targetMsg.qqName || '未知用户'}`,
            `用户头像：http://q1.qlogo.cn/headimg_dl?dst_uin=${targetMsg.qq}&spec=100`,
            '━━━━━━━━━━━━━━',
            '原消息：',
            targetMsg.message,
            '━━━━━━━━━━━━━━',
            '回复内容：',
            replyContent,
            '━━━━━━━━━━━━━━',
            '回复时间：' + new Date().toLocaleString()
          ].join('\n');

          // 发送QQ邮件
          const toEmail = `${targetMsg.qq}@qq.com`;
          logger.info('[联系主人] 尝试发送邮件到:', toEmail);
          const success = await sendEmail(toEmail, '3448585471回复了你的消息', emailContent, emailContentHtml);

          // 只给管理员反馈邮件状态
          if (success) {
            await e.reply({
              type: "ark",
              template_id: 23,
              kv: [
                {
                  key: "#DESC#",
                  value: `回复成功`
                },
                {
                  key: "#PROMPT#",
                  value: `邮件已发送`
                },
                {
                  key: "#LIST#",
                  obj: [
                    {
                      obj_kv: [
                        { key: "desc", value: `用户QQ：${targetMsg.qq}` }
                      ]
                    },
                    {
                      obj_kv: [
                        { key: "desc", value: `回复内容：${replyContent}` }
                      ]
                    }
                  ]
                }
              ]
            }, false);
          } else {
            await e.reply({
              type: "ark",
              template_id: 23,
              kv: [
                {
                  key: "#DESC#",
                  value: `邮件发送失败`
                },
                {
                  key: "#PROMPT#",
                  value: `请检查邮箱配置和QQ号是否正确`
                },
                {
                  key: "#LIST#",
                  obj: [
                    {
                      obj_kv: [
                        { key: "desc", value: `用户QQ：${targetMsg.qq}` }
                      ]
                    }
                  ]
                }
              ]
            }, false);
          }
        } catch (emailErr) {
          logger.error('[联系主人] 发送邮件通知失败:', emailErr);
          await e.reply({
            type: "ark",
            template_id: 23,
            kv: [
              {
                key: "#DESC#",
                value: `邮件发送失败`
              },
              {
                key: "#PROMPT#",
                value: `请检查邮箱配置和QQ号是否正确`
              },
              {
                key: "#LIST#",
                obj: [
                  {
                    obj_kv: [
                      { key: "desc", value: `用户QQ：${targetMsg.qq}` }
                    ]
                  }
                ]
              }
            ]
          }, false);
        }
      } else {
        await e.reply({
          type: "ark",
          template_id: 23,
          kv: [
            {
              key: "#DESC#",
              value: `保存失败`
            },
            {
              key: "#PROMPT#",
              value: `保存回复失败`
            },
            {
              key: "#LIST#",
              obj: [
                {
                  obj_kv: [
                    { key: "desc", value: `请稍后重试` }
                  ]
                }
              ]
            }
          ]
        }, false);
      }
    } catch (err) {
      logger.error('[联系主人] 处理回复失败:', err);
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `处理失败`
          },
          {
            key: "#PROMPT#",
            value: `处理回复时出错`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请重试` }
                ]
              }
            ]
          }
        ]
      }, false);
    }
  }

  // 查看待回复消息
  async checkPendingMessages(e) {
    // 验证是否是主人
    if (!this.e.isMaster) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `权限不足`
          },
          {
            key: "#PROMPT#",
            value: `只有主人才能使用此命令`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `请联系管理员获取权限` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    const messages = readMessages();
    const pendingMessages = messages
      .filter(m => !m.reply)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (pendingMessages.length === 0) {
      await e.reply({
        type: "ark",
        template_id: 23,
        kv: [
          {
            key: "#DESC#",
            value: `暂无待回复消息`
          },
          {
            key: "#PROMPT#",
            value: `没有待回复的消息`
          },
          {
            key: "#LIST#",
            obj: [
              {
                obj_kv: [
                  { key: "desc", value: `所有消息都已回复完成` }
                ]
              }
            ]
          }
        ]
      });
      return;
    }

    const groupedMessages = pendingMessages.reduce((acc, msg) => {
      if (!acc[msg.qq]) {
        acc[msg.qq] = [];
      }
      acc[msg.qq].push(msg);
      return acc;
    }, {});

    const messageList = Object.entries(groupedMessages).map(([qq, msgs]) => {
      const latestMsg = msgs[0];
      return [
        `用户：${latestMsg.qqName || '未知用户'} (${qq})`,
        `最新消息：${latestMsg.message}`,
        `消息ID：${latestMsg.id}`,
        `发送时间：${new Date(+latestMsg.timestamp).toLocaleString()}`,
        `待回复消息数：${msgs.length}`,
        '━━━━━━━━━━━━━━'
      ].join('\n');
    });

    await e.reply({
      type: "ark",
      template_id: 23,
      kv: [
        {
          key: "#DESC#",
          value: `待回复消息列表：`
        },
        {
          key: "#PROMPT#",
          value: `━━━━━━━━━━━━━━`
        },
        {
          key: "#LIST#",
          obj: [
            ...messageList.map(msg => ({
              obj_kv: [
                { key: "desc", value: msg }
              ]
            })),
            {
              obj_kv: [
                { key: "desc", value: `使用"主人回复 [消息ID] [内容]"或"主人回复 [@用户] [内容]"进行回复` }
              ]
            }
          ]
        }
      ]
    });
  }
}
