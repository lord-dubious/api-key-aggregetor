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
  const [keysStatus, setKeysStatus] = useState<{[key: string]: string;}>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("keystatus:", keysStatus);
  }, [keysStatus])

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
            key: string;
          }
          interface RequestStatus {
            requestId: string; // 唯一請求識別符
            keyId: string; // 使用的 API Key ID
            modelId: string; // 請求的模型 ID
            methodName: string; // 請求的方法名 (e.g., 'generateContent')
            status: "pending" | "success" | "failed" | "cooling_down"; // 請求狀態
            startTime: number; // 請求開始時間戳
            endTime?: number; // 請求結束時間戳 (如果已結束)
            errorMessage?: string; // 錯誤訊息 (如果請求失敗)
            coolDownDuration?: number; // 冷卻持續時間 (如果因速率限制而冷卻)
          }
          const data = message.keys as ApiKeyStatus[];
          const apiKeyStatus = data.map((key) => ({
            ...key, // 展開 ApiKey 的屬性
            // 確保 usedHistory 中的時間戳轉換為 Date 物件
            usedHistory: key.usedHistory ? key.usedHistory.map(history => ({
              ...history,
              date: new Date(history.date),
            })) : [],
          })) as ApiKeyStatus[];
          setApiKeys(apiKeyStatus);

          // 初始化 keysStatus 狀態
          const initialKeysStatus: {[key: string]: string} = {};
          apiKeyStatus.forEach((key) => {
            initialKeysStatus[key.keyId] = "";
          });
          setKeysStatus(initialKeysStatus);

          setIsLoading(false);
          break;
        case "apiKeyStatusUpdate":
          // 更新 API Key 狀態
          let updatedKey = message.apiKey as ApiKeyStatus;

          // 將 usedHistory 中的時間戳轉換為 Date 物件
          updatedKey = {
            ...updatedKey,
            usedHistory: updatedKey.usedHistory.map(history => ({
              ...history,
              date: new Date(history.date),
            })),
          };

          // 測量前後端時間差異
          if (updatedKey.usedHistory.length > 0) {
            const latestHistory = updatedKey.usedHistory[updatedKey.usedHistory.length - 1];
            if (latestHistory.serverCurrentTime !== undefined) { // 檢查屬性是否存在
              const clientCurrentTime = Date.now();
              const timeDifference = clientCurrentTime - latestHistory.serverCurrentTime;
              console.log(`前後端時間差異: ${timeDifference} 毫秒`);
            }
          }

          setApiKeys((prevKeys) =>
            prevKeys.map((key) =>
              key.keyId === updatedKey.keyId ? updatedKey : key
            )
          );
          break;
        case "requestUpdate":
          // 處理請求狀態更新
          const requestStatus = message.requestStatus as {
            requestId: string;
            keyId: string;
            modelId: string;
            methodName: string;
            status: "pending" | "success" | "failed" | "cooling_down";
            startTime: number;
            endTime?: number;
            errorMessage?: string;
            coolDownDuration?: number;
          };

          setKeysStatus((prevStatus) => ({
            ...prevStatus,
            [requestStatus.keyId]: requestStatus.status,
          }));

          console.log("處理請求狀態更新")
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
        <ApiKeysTable keys={apiKeys} status={keysStatus ?? {}}/>
      )}
    </div>
  );
}

export default App;
