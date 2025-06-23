import React, { useEffect, useState, useCallback } from 'react';
import { ApiKeyStatus } from 'src/types/ApiKeyStatus';

function Cell({color}: {color: string}) {
  return (
    <div style={{ display: "inline-block", height: "16px", width: "4px", marginLeft:"4px", borderRadius: "2px", backgroundColor: color}}></div>
  );
}

export default function RateInfo({ keyData }: { keyData: ApiKeyStatus }) {
  const [displayCount, setDisplayCount] = useState(0); // 新增狀態

  // 輔助函數：計算過去一分鐘內的請求數量
  const calculateCurrentDisplayCount = useCallback(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000; // 一分鐘前的時間戳
    const currentRequests = keyData.usedHistory.filter(
      (history) => history.date.getTime() >= oneMinuteAgo
    ).length;
    return Math.min(currentRequests, 15); // 確保不超過 15
  }, [keyData.usedHistory]);

  // 設置和管理定時器
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const scheduleNextUpdate = () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;

      // 篩選出仍在窗口內的請求
      const relevantHistory = keyData.usedHistory.filter(
        (history) => history.date.getTime() >= oneMinuteAgo
      );

      // 找到最早過期的請求
      let earliestExpirationTime = Infinity;
      if (relevantHistory.length > 0) {
        const sortedHistory = [...relevantHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
        earliestExpirationTime = sortedHistory[0].date.getTime() + 60 * 1000;
      }

      // 計算下一次更新的時間
      const timeToNextUpdate = earliestExpirationTime - now;

      if (relevantHistory.length > 0) {
        // 計算下一次更新的延遲時間，確保不為負數
        const delay = Math.max(0, timeToNextUpdate);

        timer = setTimeout(() => {
          setDisplayCount(calculateCurrentDisplayCount());
          scheduleNextUpdate(); // 安排下一次更新
        }, delay);
      } else { // 沒有相關歷史記錄，不需要定時器，或者所有請求都已過期
        setDisplayCount(0);
      }
    };

    // 初始化顯示計數
    setDisplayCount(calculateCurrentDisplayCount());
    scheduleNextUpdate();

    return () => clearTimeout(timer); // 清理定時器
  }, [keyData.usedHistory, calculateCurrentDisplayCount]); // 監聽 keyData.usedHistory 變化

  function getColor(index: number): string {
    if (index < displayCount) {
      return "#1cb13cff"; // 填滿
    } else {
      return "#8080804c"; // 未填滿
    }
  }

  return (
    <div style={{width: "100%", height: "16px"}}>
      {Array.from({ length: 15 }).map((_, i) => (
        <Cell key={i} color={getColor(i)} />
      ))}
    </div>
  );
}