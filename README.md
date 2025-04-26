# API Key Aggregator VS Code Extension

这是一个将 Google Gemini API Key 本地代理服务器集成到 VS Code 插件中的项目。旨在解决使用单个 API Key 时的并发限制问题，并支持流式响应。

## 功能

*   在 VS Code 插件中内嵌一个 HTTP 代理服务器。
*   管理多个 Google Gemini API Key。
*   根据策略（目前是简单轮询）分发 API 请求到不同的 Key。
*   支持 Google Gemini API 的流式响应转发。
*   处理速率限制错误，并对 Key 进行冷却。

## 安装和运行

1.  **克隆项目：**
    ```bash
    git clone your_repository_url
    cd gemini-aggregetor
    ```
2.  **安装依赖：**
    ```bash
    npm install -g yo generator-code
    npm install
    cd api-key-aggregetor
    npm install
    ```
3.  **在 VS Code 中打开插件项目：**
    ```bash
    code api-key-aggregetor
    ```
4.  **配置 API Key：**
    API Key 现在通过 VS Code 配置界面进行管理。
    **配置方法：**
    *   打开 VS Code 设置 (File > Preferences > Settings 或 Code > Preferences > Settings)。
    *   搜索 `geminiAggregator.apiKeys`。
    *   在 "API Keys" 设置项中，点击 "Edit in settings.json" 或通过设置 UI 添加你的 Gemini API Key 数组。
    *   例如：
    ```json
    {
      "geminiAggregator.apiKeys": [
        "YOUR_API_KEY_1",
        "YOUR_API_KEY_2"
      ]
    }
    ```
    替换 `"YOUR_API_KEY_1", "YOUR_API_KEY_2"` 为你的实际 API Key。
5.  **运行插件（调试模式）：**
    *   在新打开的 VS Code 窗口中，打开调试视图 (Debug View) (通常在侧边栏的虫子图标)。
    *   在顶部的下拉菜单中选择 "Run Extension" 配置。
    *   点击绿色的开始调试按钮 (Start Debugging)。

    这将会打开一个新的 VS Code 窗口，其中加载了我们正在开发的插件。插件激活时，内嵌的代理服务器应该会启动，并在调试控制台中输出启动信息（例如 "Proxy server is running on port XXXX"）。

6. **打包扩展**
   * 执行 `vsce package`

## 与其他扩展集成（例如 Cline）

一旦代理服务器成功启动，它将监听一个特定的端口（默认为 3145）。其他需要使用 Gemini API 的扩展（如 Cline）可以将它们的 API Endpoint 配置指向这个本地代理服务器的地址和端口。

例如，在 Cline 插件的设置中，将 Gemini API Endpoint 配置为 `http://localhost:3145`。

## 项目状态和未来计划
*   考虑更复杂的请求分发策略。
*   编写单元测试和集成测试。
