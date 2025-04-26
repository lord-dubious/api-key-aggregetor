# API Key Aggregator VS Code Extension

您是否是使用 **Cline**、**Roo Code** 等智能代码插件的开发者，并且在使用 Gemini API 免费版时频繁遇到 `429 too many requests` 的困扰？这通常是由于并发请求过多导致的限制。

本项目提供了一个解决方案，通过聚合多个 Gemini API Key 并将请求分发到不同的 Key 上。使用本扩展，您可以有效突破单个免费 API Key 的限制，实现 **token** 和**提问次数**的**双自由**。

这是一个将 Google Gemini API Key 本地代理服务器集成到 VS Code 插件中的项目。旨在解决使用单个 API Key 时的并发限制问题，并支持流式响应。

## 功能

*   在 VS Code 插件中内嵌一个 HTTP 代理服务器。
*   管理多个 Google Gemini API Key。
*   根据策略（目前是简单轮询）分发 API 请求到不同的 Key。
*   支持 Google Gemini API 的流式响应转发。
*   处理速率限制错误，并对 Key 进行冷却。

## 使用方法

### 安装

从 VS Code Marketplace 安装扩展。

或者，您可以从源代码构建和安装。请参阅[开发指南](DEVELOPMENT.md)获取说明。

### 配置 API Key

API Key 现在通过 VS Code 命令面板进行管理。

1.  打开命令面板 (Ctrl+Shift+P 或 Cmd+Shift+P)。
2.  运行命令 "Gemini: Add API Key"。
3.  在输入框中输入您的 Gemini API Key。输入内容会像密码一样隐藏。
4.  您可以多次运行该命令添加多个 Key。
5.  要查看已添加 Key 的摘要，运行命令 "Gemini: List API Keys"。
6.  要修改现有 Key，运行命令 "Gemini: Modify API Key"。
7.  要删除 Key，运行命令 "Gemini: Delete API Key"。

## 与其他扩展集成（例如 Cline）

一旦代理服务器成功启动，它将监听一个特定的端口（默认为 3145）。其他需要使用 Gemini API 的扩展（如 Cline）可以将它们的 API Endpoint 配置指向这个本地代理服务器的地址和端口。

例如，在 Cline 插件的设置中，将 Gemini API Endpoint 配置为 `http://localhost:3145`。

## 项目状态和未来计划

*   考虑更复杂的请求分发策略。

---

## 支持本项目

如果您觉得本项目对您有帮助，请考虑在 GitHub 上给它一个 Star！您的支持是对我最大的鼓励。

[![GitHub stars](https://img.shields.io/github/stars/JamzYang/api-key-aggregetor?style=social)](https://github.com/JamzYang/api-key-aggregetor)
