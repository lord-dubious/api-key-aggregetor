import { ApiKey } from "../types/ApiKey";
import { eventManager, EventManager } from "./EventManager"; // 引入 EventManager 類別
import * as vscode from "vscode"; // 引入 vscode 模組

class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private roundRobinIndex: number = 0;
  private eventManager: EventManager; // 修改為 EventManager 類型
  private context: vscode.ExtensionContext; // 新增屬性

  constructor(apiKeys: ApiKey[], eventManager: EventManager, context: vscode.ExtensionContext) { // 接收 eventManager 和 context
    this.eventManager = eventManager;
    this.context = context; // 賦值
    this.loadKeys(apiKeys); // loadKeys 將在 extension.ts 中被調用，並傳遞帶有 keyId 的 ApiKey 物件
    setInterval(() => this.checkCoolingDownKeys(), 2000);
  }

  async loadKeys(apiKeys: ApiKey[]): Promise<void> { // 修改為 async
    if (!apiKeys || apiKeys.length === 0) {
      console.warn('ApiKeyManager: 未加载任何 API Key。请检查配置。');
      return;
    }

    this.keys.clear();
    for (const keyObj of apiKeys) { // 使用 for...of 處理 async/await
      const keyStatusId = `apiKeyStatus_${keyObj.keyId}`;
      const storedStatusJson = await this.context.secrets.get(keyStatusId);
      let status: 'available' | 'cooling_down' | 'disabled' = 'available';
      let coolingDownUntil: number | undefined = undefined;
      let usedHistory: { date: number; rate: number; serverCurrentTime?: number }[] = []; // 新增：初始化 usedHistory

      if (storedStatusJson) {
        try {
          const storedStatus = JSON.parse(storedStatusJson);
          status = storedStatus.status || 'available';
          coolingDownUntil = storedStatus.coolingDownUntil;
          usedHistory = storedStatus.usedHistory || []; // 新增：載入 usedHistory
        } catch (e) {
          console.error(`ApiKeyManager: 解析 Key ${keyObj.keyId} 狀態失敗:`, e);
        }
      }

      this.keys.set(keyObj.key, {
        key: keyObj.key,
        keyId: keyObj.keyId,
        status: status, // 使用持久化的狀態
        coolingDownUntil: coolingDownUntil, // 使用持久化的冷卻時間
        currentRequests: keyObj.currentRequests || 0,
        lastUsed: keyObj.lastUsed,
        usedHistory: usedHistory // 新增：設置 usedHistory
      });
      this.eventManager.emitApiKeyStatusUpdate(this.keys.get(keyObj.key)!); // 發送初始狀態
    }
    console.info(`ApiKeyManager: 成功加载 ${this.keys.size} 个 API Key。`);
  }

  private async saveKeyStatus(apiKey: ApiKey): Promise<void> {
    const keyStatusId = `apiKeyStatus_${apiKey.keyId}`;
    const statusData = {
      status: apiKey.status,
      coolingDownUntil: apiKey.coolingDownUntil,
      usedHistory: apiKey.usedHistory // 新增：儲存 usedHistory
    };
    await this.context.secrets.store(keyStatusId, JSON.stringify(statusData));
    console.log(`ApiKeyManager: Key ${apiKey.keyId} 狀態和歷史已持久化。`);
  }

  getAvailableKey(): ApiKey | null {
    const availableKeys = Array.from(this.keys.values()).filter(
      key => key.status === 'available' && (!key.coolingDownUntil || key.coolingDownUntil <= Date.now())
    );

    if (availableKeys.length === 0) {
      console.warn('ApiKeyManager: 没有可用的 API Key。');
      return null;
    }

    // 简单轮询策略
    const selectedKey = availableKeys[this.roundRobinIndex % availableKeys.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % availableKeys.length;

    // 更新 lastUsed 並發送事件
    selectedKey.lastUsed = Date.now();
    this.eventManager.emitApiKeyStatusUpdate(selectedKey);

    return selectedKey;
  }

  async markAsCoolingDown(key: string, durationMs: number): Promise<void> { // 修改為 async
    const apiKey = this.keys.get(key);
    if (apiKey) {
      apiKey.status = 'cooling_down';
      apiKey.coolingDownUntil = Date.now() + durationMs;
      console.warn(`ApiKeyManager: Key ${apiKey.keyId} 标记为冷却中，直到 ${new Date(apiKey.coolingDownUntil).toISOString()}`);
      this.eventManager.emitApiKeyStatusUpdate(apiKey);
      await this.saveKeyStatus(apiKey); // 持久化狀態
    }
  }

  async markAsAvailable(key: string): Promise<void> { // 修改為 async
    const apiKey = this.keys.get(key);
    if (apiKey) {
      apiKey.status = 'available';
      apiKey.coolingDownUntil = undefined;
      console.info(`ApiKeyManager: Key ${apiKey.keyId} 标记为可用。`);
      this.eventManager.emitApiKeyStatusUpdate(apiKey);
      await this.saveKeyStatus(apiKey); // 持久化狀態
    }
  }

  // 可选方法，用于更复杂的并发控制
  incrementRequestCount(key: string): void {
    const apiKey = this.keys.get(key);
    if (apiKey) {
      apiKey.currentRequests++;
    }
  }

  // 可选方法，用于更复杂的并发控制
  decrementRequestCount(key: string): void {
    const apiKey = this.keys.get(key);
    if (apiKey && apiKey.currentRequests > 0) {
      apiKey.currentRequests--;
    }
  }

  private async checkCoolingDownKeys(): Promise<void> { // 修改為 async
    const now = Date.now();
    for (const apiKey of this.keys.values()) { // 使用 for...of 處理 async/await
      if (apiKey.status === 'cooling_down' && apiKey.coolingDownUntil && apiKey.coolingDownUntil <= now) {
        await this.markAsAvailable(apiKey.key); // 等待持久化完成
      }
    }
  }

  public getAllKeys(): ApiKey[] {
    return Array.from(this.keys.values());
  }

  public async addKeyHistoryEntry(key: string, entry: { date: number; rate: number; serverCurrentTime?: number }): Promise<void> {
    const apiKey = this.keys.get(key);
    if (apiKey) {
      if (!apiKey.usedHistory) {
        apiKey.usedHistory = [];
      }
      apiKey.usedHistory.push(entry);

      // 移除超過一分鐘的舊記錄
      const oneMinuteAgo = Date.now() - 60 * 1000; // 60 秒 * 1000 毫秒
      apiKey.usedHistory = apiKey.usedHistory.filter(historyEntry => historyEntry.date >= oneMinuteAgo);

      this.eventManager.emitApiKeyStatusUpdate(apiKey); // 歷史更新也視為狀態更新
      await this.saveKeyStatus(apiKey); // 持久化更新後的歷史
    }
  }
}

export default ApiKeyManager;