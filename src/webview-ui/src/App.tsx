import React, { useEffect, useState } from 'react';

// 聲明一個類型，以避免 TypeScript 錯誤
declare const acquireVsCodeApi: () => {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

const vscode = acquireVsCodeApi(); // 獲取 VS Code API 實例

function App() {
    const [globalStateValue, setGlobalStateValue] = useState<string | undefined>(undefined);
    const [commandResult, setCommandResult] = useState<any>(null);
    const [commandError, setCommandError] = useState<string | undefined>(undefined);

    // 範例：發送訊息到擴充功能以獲取 globalState
    const getGlobalState = (key: string) => {
        vscode.postMessage({
            command: 'getGlobalState',
            key: key
        });
    };

    // 範例：發送訊息到擴充功能以更新 globalState
    const updateGlobalState = (key: string, value: any) => {
        vscode.postMessage({
            command: 'updateGlobalState',
            key: key,
            value: value
        });
    };

    // 範例：發送訊息到擴充功能以執行 VS Code 命令
    const executeVsCodeCommand = (commandName: string, args?: any[]) => {
        vscode.postMessage({
            command: 'executeCommand',
            commandName: commandName,
            args: args
        });
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data; // 來自擴充功能的訊息

            switch (message.command) {
                case 'globalStateValue':
                    if (message.key === 'myGlobalStateKey') { // 根據 key 判斷
                        setGlobalStateValue(message.value);
                    }
                    break;
                case 'commandResult':
                    if (message.success) {
                        setCommandResult(message.result);
                        setCommandError(undefined);
                    } else {
                        setCommandResult(null);
                        setCommandError(message.error);
                    }
                    break;
                // 可以添加更多處理其他命令的 case
            }
        };

        window.addEventListener('message', handleMessage);

        // 清理事件監聽器
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []); // 空依賴陣列表示只在組件掛載和卸載時執行

    return (
        <div>
            <h1>Hello from React Webview!</h1>
            <p>This is your React application running inside VS Code Webview.</p>
            <button onClick={() => getGlobalState('myGlobalStateKey')}>獲取 Global State</button>
            {globalStateValue !== undefined && <p>Global State Value: {globalStateValue}</p>}
            <button onClick={() => updateGlobalState('myGlobalStateKey', 'newValue' + Math.random().toFixed(2))}>更新 Global State</button>
            <button onClick={() => executeVsCodeCommand('vscode.open', ['https://code.visualstudio.com/'])}>打開 VS Code 網站</button>
            {commandResult && <p>Command Result: {JSON.stringify(commandResult)}</p>}
            {commandError && <p style={{ color: 'red' }}>Command Error: {commandError}</p>}
        </div>
    );
}

export default App;