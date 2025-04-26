# API Key Aggregator VS Code Extension

Are you a developer using intelligent coding plugins like **Cline** or **Roo Code** and frequently encountering `429 too many requests` errors with the free tier of the Gemini API? This often happens due to concurrency limits when making multiple requests.

This tool provides a solution by aggregating multiple Gemini API keys and distributing requests among them. By using this extension, you can effectively overcome the limitations of a single free API key, achieving **double freedom** in both **token usage** and **query frequency**.

This is a project that integrates a Google Gemini API Key local proxy server into a VS Code extension. It aims to solve the concurrency limitations when using a single API Key and supports streaming responses.

## Features

*   Embeds an HTTP proxy server within the VS Code extension.
*   Manages multiple Google Gemini API Keys.
*   Distributes API requests to different Keys based on a strategy (currently simple round-robin).
*   Supports forwarding streaming responses from the Google Gemini API.
*   Handles rate limiting errors and cools down Keys.

## Usage

### Installation

Install the extension from the VS Code Marketplace.

Alternatively, you can build and install from source. See the [Development Guide](DEVELOPMENT.md) for instructions.

### Configuring API Keys

API Keys are managed through the VS Code command palette.

1.  Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
2.  Run the command "Gemini: Add API Key".
3.  Enter your Gemini API Key in the input box. The input will be hidden like a password.
4.  You can add multiple keys by running the command again.
5.  To view a summary of added keys, run the command "Gemini: List API Keys".
6.  To modify an existing key, run the command "Gemini: Modify API Key".
7.  To delete a key, run the command "Gemini: Delete API Key".

## Integration with other extensions (e.g., Cline)

Once the proxy server is successfully started, it will listen on a specific port (default is 3145). Other extensions that need to use the Gemini API (like Cline) can configure their API Endpoint to point to the address and port of this local proxy server.

For example, in the Cline extension settings, configure the Gemini API Endpoint to `http://localhost:3145`.

## Project Status and Future Plans

*   Consider more complex request distribution strategies.

## 中文文档

[点击此处查看中文版 README](README.zh-CN.md)

---

## Support This Project

If you find this project helpful, please consider giving it a star on GitHub! Your support is greatly appreciated.

[![GitHub stars](https://img.shields.io/github/stars/JamzYang/api-key-aggregetor?style=social)](https://github.com/JamzYang/api-key-aggregetor)