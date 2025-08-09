import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { uiStateManager } from '../core/UIStateManager';

/**
 * Manages the enhanced webview dashboard for the extension
 */
export class WebviewManager {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Setup the sidebar webview view
     */
    public setupSidebarView(webviewView: vscode.WebviewView): void {
        this.panel = {
            webview: webviewView.webview,
            onDidDispose: webviewView.onDidDispose,
            dispose: () => {},
            reveal: () => webviewView.show?.()
        } as any;

        webviewView.webview.html = this.getWebviewContent();
        this.setupMessageHandling();
        this.setupPanelEventHandlers();
        this.sendInitialData();
    }

    /**
     * Get the HTML content for the webview
     */
    private getWebviewContent(): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'dashboard.html');
        
        try {
            let html = fs.readFileSync(htmlPath, 'utf8');
            
            // Replace any resource URIs if needed
            // For now, the HTML is self-contained with inline styles and scripts
            
            return html;
        } catch (error) {
            console.error('Failed to read webview HTML:', error);
            return this.getFallbackContent();
        }
    }

    /**
     * Fallback content if HTML file cannot be read
     */
    private getFallbackContent(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gemini Aggregator Dashboard</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        color: var(--vscode-foreground); 
                        background: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h1>🔑 Gemini API Key Aggregator</h1>
                <p>Dashboard is loading...</p>
                <p>If this message persists, please check the extension logs.</p>
            </body>
            </html>
        `;
    }

    /**
     * Setup message handling between webview and extension
     */
    private setupMessageHandling(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'requestInitialData':
                        this.sendInitialData();
                        break;

                    case 'startServer':
                        await vscode.commands.executeCommand('geminiAggregator-dev.startServer');
                        break;

                    case 'stopServer':
                        await vscode.commands.executeCommand('geminiAggregator-dev.stopServer');
                        break;

                    case 'restartServer':
                        await vscode.commands.executeCommand('geminiAggregator-dev.restartServer');
                        break;

                    case 'addApiKey':
                        await this.handleAddApiKey(message.apiKey);
                        break;

                    case 'deleteApiKey':
                        await this.handleDeleteApiKey(message.keyId);
                        break;

                    case 'editApiKey':
                        await this.handleEditApiKey(message.keyId);
                        break;

                    case 'addProxy':
                        await this.handleAddProxy(message.proxyUrl);
                        break;

                    case 'deleteProxy':
                        await this.handleDeleteProxy(message.proxyId);
                        break;

                    case 'testProxy':
                        await this.handleTestProxy(message.proxyId);
                        break;

                    case 'setProxyMode':
                        await this.handleSetProxyMode(message.enabled);
                        break;

                    case 'setProxyAssignmentMode':
                        await this.handleSetProxyAssignmentMode(message.mode);
                        break;

                    case 'testRotatingProxy':
                        await this.handleTestRotatingProxy(message.url);
                        break;

                    case 'saveSettings':
                        await this.handleSaveSettings(message.settings);
                        break;

                    default:
                        console.log('Unknown webview message:', message);
                }
            },
            undefined,
            this.disposables
        );
    }

    /**
     * Setup panel event handlers
     */
    private setupPanelEventHandlers(): void {
        if (!this.panel) return;

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                this.dispose();
            },
            null,
            this.disposables
        );
    }

    /**
     * Send initial data to the webview
     */
    private sendInitialData(): void {
        if (!this.panel) return;

        const state = uiStateManager.getState();
        
        // Send statistics
        this.panel.webview.postMessage({
            command: 'updateStats',
            data: {
                serverRunning: state.serverStatus.isRunning,
                apiKeysCount: state.apiKeys.length,
                proxiesCount: state.proxies.length,
                totalRequests: state.serverStatus.totalRequests
            }
        });

        // Send API keys data
        this.panel.webview.postMessage({
            command: 'updateApiKeys',
            data: state.apiKeys.map(key => ({
                keyId: key.keyId,
                status: key.status,
                currentRequests: key.currentRequests,
                lastUsed: key.lastUsed,
                proxy: key.proxyAssigned
            }))
        });

        // Send proxies data
        this.panel.webview.postMessage({
            command: 'updateProxies',
            data: state.proxies.map(proxy => ({
                id: proxy.id,
                url: proxy.url,
                status: proxy.status,
                assignedKeys: proxy.assignedKeys || 0,
                responseTime: 0, // Will be updated by health monitoring
                lastCheck: new Date().toISOString() // Placeholder for now
            }))
        });

        // Send server status
        this.panel.webview.postMessage({
            command: 'updateServerStatus',
            data: state.serverStatus
        });

        // Send proxy mode configuration
        const config = vscode.workspace.getConfiguration('geminiAggregator');
        const proxyMode = config.get('proxyAssignmentMode', 'dedicated');
        const rotatingProxyUrl = config.get('rotatingProxyUrl', '');
        const rotatingProxyEnabled = config.get('rotatingProxyEnabled', false);

        this.panel.webview.postMessage({
            command: 'updateProxyMode',
            data: {
                mode: proxyMode,
                rotatingProxyUrl: rotatingProxyUrl,
                rotatingProxyStatus: rotatingProxyEnabled ? 'Active' : 'Not Configured'
            }
        });
    }

    /**
     * Handle adding a new API key
     */
    private async handleAddApiKey(apiKey: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.addApiKey');
            // The command will handle the actual addition
            // We'll refresh the data after a short delay
            setTimeout(() => this.sendInitialData(), 1000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add API key: ${error}`);
        }
    }

    /**
     * Handle deleting an API key
     */
    private async handleDeleteApiKey(keyId: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.removeApiKey', keyId);
            setTimeout(() => this.sendInitialData(), 1000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete API key: ${error}`);
        }
    }

    /**
     * Handle editing an API key
     */
    private async handleEditApiKey(keyId: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.viewApiKeyDetails', keyId);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to edit API key: ${error}`);
        }
    }

    /**
     * Handle adding a new proxy
     */
    private async handleAddProxy(proxyUrl: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.addProxy');
            setTimeout(() => this.sendInitialData(), 1000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add proxy: ${error}`);
        }
    }

    /**
     * Handle deleting a proxy
     */
    private async handleDeleteProxy(proxyId: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.removeProxy', proxyId);
            setTimeout(() => this.sendInitialData(), 1000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete proxy: ${error}`);
        }
    }

    /**
     * Handle testing a proxy
     */
    private async handleTestProxy(proxyId: string): Promise<void> {
        try {
            await vscode.commands.executeCommand('geminiAggregator-dev.testProxy', proxyId);
            setTimeout(() => this.sendInitialData(), 1000);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to test proxy: ${error}`);
        }
    }

    /**
     * Handle setting proxy mode
     */
    private async handleSetProxyMode(enabled: boolean): Promise<void> {
        try {
            // This would need to be implemented in the core system
            uiStateManager.setRotatingProxyMode(enabled);
            vscode.window.showInformationMessage(`Rotating proxy mode ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to set proxy mode: ${error}`);
        }
    }

    /**
     * Handle setting proxy assignment mode
     */
    private async handleSetProxyAssignmentMode(mode: string): Promise<void> {
        try {
            switch (mode) {
                case 'dedicated':
                    // Enable dedicated assignment mode (default)
                    await vscode.commands.executeCommand('geminiAggregator-dev.setProxyAssignmentMode', 'dedicated');
                    vscode.window.showInformationMessage('Switched to Dedicated Assignment Mode');
                    break;

                case 'rotating':
                    // Enable rotating proxy mode
                    await vscode.commands.executeCommand('geminiAggregator-dev.setProxyAssignmentMode', 'rotating');
                    vscode.window.showInformationMessage('Switched to Rotating Proxy Mode');
                    break;

                case 'pool':
                    // Enable pool rotation mode
                    await vscode.commands.executeCommand('geminiAggregator-dev.setProxyAssignmentMode', 'pool');
                    vscode.window.showInformationMessage('Switched to Pool Rotation Mode');
                    break;

                default:
                    throw new Error(`Unknown proxy assignment mode: ${mode}`);
            }

            // Update UI state
            this.sendInitialData();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to set proxy assignment mode: ${error}`);
        }
    }

    /**
     * Handle testing rotating proxy
     */
    private async handleTestRotatingProxy(url: string): Promise<void> {
        try {
            // Validate URL format
            if (!url || !url.trim()) {
                throw new Error('Proxy URL is required');
            }

            // Test the rotating proxy connection
            await vscode.commands.executeCommand('geminiAggregator-dev.testRotatingProxy', url);

            // Update the webview with test results
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'rotatingProxyTestResult',
                    success: true,
                    message: 'Rotating proxy connection successful!'
                });
            }

            vscode.window.showInformationMessage('Rotating proxy test successful!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'rotatingProxyTestResult',
                    success: false,
                    message: errorMessage
                });
            }

            vscode.window.showErrorMessage(`Rotating proxy test failed: ${errorMessage}`);
        }
    }

    /**
     * Handle saving settings
     */
    private async handleSaveSettings(settings: any): Promise<void> {
        try {
            // Save settings to workspace configuration
            const config = vscode.workspace.getConfiguration('geminiAggregator');
            
            if (settings.port) {
                await config.update('serverPort', parseInt(settings.port), vscode.ConfigurationTarget.Workspace);
            }
            
            if (settings.timeout) {
                await config.update('requestTimeout', parseInt(settings.timeout), vscode.ConfigurationTarget.Workspace);
            }
            
            if (settings.maxConcurrent) {
                await config.update('maxConcurrentRequests', parseInt(settings.maxConcurrent), vscode.ConfigurationTarget.Workspace);
            }

            vscode.window.showInformationMessage('Settings saved successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
        }
    }

    /**
     * Update the webview with new data
     */
    public updateData(): void {
        if (this.panel) {
            this.sendInitialData();
        }
    }

    /**
     * Dispose of the webview and clean up resources
     */
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
}
