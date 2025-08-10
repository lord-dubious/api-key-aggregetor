import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

function App() {
    const [activeTab, setActiveTab] = useState('api-keys');
    const [isModalOpen, setIsModalOpen] = useState<string | null>(null);

    const handlePostMessage = useCallback((command: string, data?: any) => {
        vscode.postMessage({ command, ...data });
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                // ... handle messages from extension
            }
        };

        window.addEventListener('message', handleMessage);
        handlePostMessage('requestInitialData');

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [handlePostMessage]);

    const handleTabClick = (tabName: string) => {
        setActiveTab(tabName);
    };

    const handleModalAction = (action: string, data?: any) => {
        if (action === 'open') {
            setIsModalOpen(data);
        } else if (action === 'close') {
            setIsModalOpen(null);
        } else {
            handlePostMessage(action, data);
            setIsModalOpen(null);
        }
    };

    return (
        <div className="dashboard">
            <div className="header">
                <h1>🔑 Gemini API Key Aggregator</h1>
                <p className="subtitle">Manage your API keys, proxies, and monitor server performance</p>
            </div>

            {/* ... other components ... */}

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'api-keys' ? 'active' : ''}`} onClick={() => handleTabClick('api-keys')}>API Keys</button>
                <button className={`tab ${activeTab === 'proxies' ? 'active' : ''}`} onClick={() => handleTabClick('proxies')}>Proxies</button>
                <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleTabClick('analytics')}>Analytics</button>
                <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabClick('settings')}>Settings</button>
            </div>

            {/* ... other components ... */}

            {isModalOpen && (
                <div id={`${isModalOpen}-modal`} className="modal" style={{ display: 'block' }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{isModalOpen.replace('-', ' ')}</h3>
                            <span className="close" onClick={() => handleModalAction('close')}>&times;</span>
                        </div>
                        {/* Modal-specific content */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
