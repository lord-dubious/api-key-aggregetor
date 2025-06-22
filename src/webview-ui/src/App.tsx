import React, { useEffect, useState } from "react";
import { ApiKey } from "./types/ApiKey";
import { ApiKeyStatus } from "./types/ApiKeyStatus";
import { ApiKeysTable } from "./components/ApiKeysTable";

declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const vscode = acquireVsCodeApi(); // 獲取 VS Code API 實例

function App() {
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    vscode.postMessage({
      command: "getApiKeys(request)",
    });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data; // 來自擴充功能的訊息

      switch (message.command) {
        case "getApiKeys(response)":
          interface Key {
            keyId: string;
            apiKey: string;
          }
          const data = message.keys as Key[];
          const apiKeyStatus = data.map((key) => ({
            ...key, // 展開 ApiKey 的屬性
            status: 1,
            usedHistory: [],
          })) as ApiKeyStatus[];
          setApiKeys(apiKeyStatus);
          setIsLoading(false);
          break;
        default:
          console.warn("Unhandled message from VS Code:", message);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    // 清理事件監聽器
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div>
      <h1>API Key Aggregator Manage Panel</h1>
      <h2>API Keys</h2>
      {isLoading ? (
        <p>Loading API keys...</p>
      ) : (
        <ApiKeysTable keys={apiKeys} />
      )}
    </div>
  );
}

export default App;
