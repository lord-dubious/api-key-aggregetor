/**
 * ApiKeyStatus api 的詳細資訊
 */
export interface ApiKeyStatus {
  /**
   * API Key 的 ID
   */
  keyId: string;
  /**
   * API Key 值
   */
  apiKey: string;
  /**
   * 詳細資訊
   * @value 0 - 禁用
   * @value 1 - 可用
   * @value 2 - 冷卻中
   * @value 3 - 正在使用中
   * @value 4 - 請求失敗
   */
  status: number;
  /**
   * 使用此 API Key 的歷史記錄
   * @date 請求時間
   * @rate 使用速率 (每分鐘請求數)
   */
  usedHistory: { date: Date, rate: number }[];
}
