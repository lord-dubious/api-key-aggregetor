// src/server/core/EventManager.ts
import { EventEmitter } from "events";
import { ApiKey } from "../types/ApiKey"; // 引入 ApiKey 介面

// 定義請求狀態類型
export interface RequestStatus {
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

export class EventManager extends EventEmitter { // 導出 EventManager 類別
  /**
   * 當 API Key 狀態改變時發送事件。
   * @param apiKey 更新後的 ApiKey 物件。
   */
  emitApiKeyStatusUpdate(apiKey: ApiKey) {
    this.emit("apiKeyStatusUpdate", apiKey);
  }

  /**
   * 當請求狀態改變時發送事件 (例如：開始、成功、失敗、冷卻)。
   * @param requestStatus 更新後的 RequestStatus 物件。
   */
  emitRequestUpdate(requestStatus: RequestStatus) {
    this.emit("requestUpdate", requestStatus);
  }
}

export const eventManager = new EventManager();