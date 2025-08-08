import * as vscode from 'vscode';
import { ApiKeyTreeProvider } from './ui/providers/ApiKeyTreeProvider';
import { ProxyTreeProvider } from './ui/providers/ProxyTreeProvider';
import { ServerStatusTreeProvider } from './ui/providers/ServerStatusTreeProvider';
import { uiStateManager } from './ui/core/UIStateManager';
import { ICONS } from './ui/types/TreeViewTypes';

// Keys for persisted state in web
const STORAGE_KEYS = {
  apiKeys: 'web.apiKeys',
  proxies: 'web.proxies',
};

export async function activate(context: vscode.ExtensionContext) {
  console.log('Gemini Aggregator (Web) activating...');

  // Initialize providers (no server-side managers in web)
  const apiKeyTreeProvider = new ApiKeyTreeProvider();
  const proxyTreeProvider = new ProxyTreeProvider();
  const serverStatusTreeProvider = new ServerStatusTreeProvider();

  // Register views
  const apiKeysView = vscode.window.createTreeView('geminiApiKeys', { treeDataProvider: apiKeyTreeProvider, showCollapseAll: true });
  const proxiesView = vscode.window.createTreeView('geminiProxies', { treeDataProvider: proxyTreeProvider, showCollapseAll: true });
  const serverStatusView = vscode.window.createTreeView('geminiServerStatus', { treeDataProvider: serverStatusTreeProvider, showCollapseAll: true });

  context.subscriptions.push(apiKeysView, proxiesView, serverStatusView);

  // Load persisted state (web only)
  const savedKeys: any[] = context.globalState.get(STORAGE_KEYS.apiKeys, []);
  const savedProxies: any[] = context.globalState.get(STORAGE_KEYS.proxies, []);

  // Seed UI state
  for (const k of savedKeys) {
    uiStateManager.updateApiKey(k.keyId, {
      id: k.keyId,
      label: k.keyId,
      description: 'Stored (web)',
      tooltip: 'Stored locally in web extension',
      iconPath: ICONS.API_KEY_ACTIVE,
      contextValue: 'apiKey',
      type: 'apiKey',
      status: 'active',
    } as any);
  }

  for (const p of savedProxies) {
    uiStateManager.updateProxy(p.proxyId, {
      id: p.proxyId,
      label: p.url,
      description: 'Stored (web)',
      tooltip: p.url,
      iconPath: ICONS.PROXY_ACTIVE,
      contextValue: 'proxy',
      type: 'proxy',
      status: 'active',
      proxyId: p.proxyId,
      url: p.url,
    } as any);
  }

  // Register minimal web-compatible commands
  context.subscriptions.push(
    vscode.commands.registerCommand('geminiAggregator-dev.addApiKey', async () => {
      const key = await vscode.window.showInputBox({ prompt: 'Enter API Key (stored locally in browser storage)', ignoreFocusOut: true, password: true });
      if (!key) return;
      const keyId = `api-key-${Date.now()}`;

      // Persist
      const list = context.globalState.get<any[]>(STORAGE_KEYS.apiKeys, []);
      list.push({ keyId, key });
      await context.globalState.update(STORAGE_KEYS.apiKeys, list);

      // Update UI
      uiStateManager.updateApiKey(keyId, {
        id: keyId,
        label: keyId,
        description: 'Stored (web)',
        tooltip: 'Stored locally in web extension',
        iconPath: ICONS.API_KEY_ACTIVE,
        contextValue: 'apiKey',
        type: 'apiKey',
        status: 'active',
      } as any);
    }),

    vscode.commands.registerCommand('geminiAggregator-dev.removeApiKey', async () => {
      const keys = uiStateManager.getApiKeys();
      if (keys.length === 0) {
        vscode.window.showInformationMessage('No API keys to remove');
        return;
      }
      const pick = await vscode.window.showQuickPick(keys.map(k => ({ label: k.label, keyId: (k as any).keyId || k.id })), { placeHolder: 'Select API key to remove' });
      if (!pick) return;

      // Persist
      const list = context.globalState.get<any[]>(STORAGE_KEYS.apiKeys, []);
      await context.globalState.update(STORAGE_KEYS.apiKeys, list.filter(k => k.keyId !== (pick as any).keyId));

      // Update UI
      uiStateManager.removeApiKey((pick as any).keyId);
    }),

    vscode.commands.registerCommand('geminiAggregator-dev.addProxy', async () => {
      const url = await vscode.window.showInputBox({ prompt: 'Enter proxy URL (stored locally in browser storage)', ignoreFocusOut: true });
      if (!url) return;
      const proxyId = `proxy-${Date.now()}`;

      // Persist
      const list = context.globalState.get<any[]>(STORAGE_KEYS.proxies, []);
      list.push({ proxyId, url });
      await context.globalState.update(STORAGE_KEYS.proxies, list);

      // Update UI
      uiStateManager.updateProxy(proxyId, {
        id: proxyId,
        label: url,
        description: 'Stored (web)',
        tooltip: url,
        iconPath: ICONS.PROXY_ACTIVE,
        contextValue: 'proxy',
        type: 'proxy',
        status: 'active',
        proxyId,
        url,
      } as any);
    }),

    vscode.commands.registerCommand('geminiAggregator-dev.removeProxy', async () => {
      const proxies = uiStateManager.getProxies();
      if (proxies.length === 0) {
        vscode.window.showInformationMessage('No proxies to remove');
        return;
      }
      const pick = await vscode.window.showQuickPick(proxies.map(p => ({ label: p.label, proxyId: (p as any).proxyId || p.id })), { placeHolder: 'Select proxy to remove' });
      if (!pick) return;

      // Persist
      const list = context.globalState.get<any[]>(STORAGE_KEYS.proxies, []);
      await context.globalState.update(STORAGE_KEYS.proxies, list.filter(p => p.proxyId !== (pick as any).proxyId));

      // Update UI
      uiStateManager.removeProxy((pick as any).proxyId);
    }),

    vscode.commands.registerCommand('geminiAggregator-dev.openPanel', async () => {
      vscode.window.showInformationMessage('The full dashboard is only available in desktop VS Code. Use the native views here in the sidebar.');
    })
  );

  console.log('Gemini Aggregator (Web) activated.');
}

export function deactivate() {
  // Nothing to clean up for web-specific implementation
}

