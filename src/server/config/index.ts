import dotenv from 'dotenv';
import * as vscode from 'vscode'; // 导入 vscode 模块

// 加载环境变量
dotenv.config();

// 定义配置接口
interface Config {
  PORT: number;
  KEY_COOL_DOWN_DURATION_MS: number;
  LOG_LEVEL: string;
  DISPATCH_STRATEGY: string;
  apiKeys: string[]; // 添加 apiKeys 属性
}

// 从环境变量中解析配置
const config: Config = {
  PORT: parseInt(process.env.PORT || '3146', 10),
  KEY_COOL_DOWN_DURATION_MS: parseInt(process.env.KEY_COOL_DOWN_DURATION_MS || '60000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DISPATCH_STRATEGY: process.env.DISPATCH_STRATEGY || 'round_robin',
  // 从 VS Code 配置中获取 API Keys
  apiKeys: vscode.workspace.getConfiguration('geminiAggregator-dev').get('apiKeys') || [],
};

// 导出配置对象
export default config;