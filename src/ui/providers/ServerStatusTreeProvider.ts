import * as vscode from 'vscode';
import { uiEventManager } from '../core/UIEventManager';
import { uiStateManager } from '../core/UIStateManager';
import { accessibilityService } from '../core/AccessibilityService';
import { ICONS } from '../types/TreeViewTypes';

interface ServerStatusTreeItem {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: vscode.ThemeIcon;
  contextValue?: string;
  collapsibleState?: vscode.TreeItemCollapsibleState;
  type: 'serverStatus' | 'serverGroup';
  status?: 'active' | 'inactive' | 'error';
}

/**
 * Tree data provider for Server Status view
 */
export class ServerStatusTreeProvider implements vscode.TreeDataProvider<ServerStatusTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ServerStatusTreeItem | undefined | null | void> = new vscode.EventEmitter<ServerStatusTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ServerStatusTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for UI updates
   */
  private setupEventListeners(): void {
    // Listen for server status changes
    this.disposables.push(
      uiEventManager.on('serverStatusChanged', () => {
        this.refresh();
      })
    );

    // Listen for refresh requests
    this.disposables.push(
      uiEventManager.on('refreshRequested', () => {
        this.refresh();
      })
    );
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: ServerStatusTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    
    item.id = element.id;
    item.description = element.description;
    item.tooltip = element.tooltip;
    item.iconPath = element.iconPath;
    item.contextValue = element.contextValue;
    
    // Add accessibility features
    item.accessibilityInformation = {
      label: `${element.label} ${element.description || ''}`,
      role: element.type === 'serverStatus' ? 'treeitem' : 'group'
    };
    
    return item;
  }

  /**
   * Get children for tree structure
   */
  async getChildren(element?: ServerStatusTreeItem): Promise<ServerStatusTreeItem[]> {
    if (!element) {
      // Root level - return server status items
      return this.getRootItems();
    }
    
    // For groups, return child items
    if (element.type === 'serverGroup') {
      return this.getGroupChildren(element);
    }
    
    return [];
  }

  /**
   * Get root level items
   */
  private async getRootItems(): Promise<ServerStatusTreeItem[]> {
    const items: ServerStatusTreeItem[] = [];
    
    // Server status
    const serverStatus = this.createServerStatusItem();
    items.push(serverStatus);
    
    // Configuration summary
    const configSummary = this.createConfigSummaryItem();
    items.push(configSummary);
    
    // Performance metrics
    const performanceMetrics = this.createPerformanceMetricsItem();
    items.push(performanceMetrics);
    
    return items;
  }

  /**
   * Get children for a group
   */
  private getGroupChildren(group: ServerStatusTreeItem): ServerStatusTreeItem[] {
    switch (group.id) {
      case 'server-status':
        return this.createServerStatusDetails();
      case 'config-summary':
        return this.createConfigDetails();
      case 'performance-metrics':
        return this.createPerformanceDetails();
      default:
        return [];
    }
  }

  /**
   * Create server status item
   */
  private createServerStatusItem(): ServerStatusTreeItem {
    const serverStatus = uiStateManager.getServerStatus();
    const isRunning = serverStatus.isRunning;
    const port = serverStatus.port || 3146;

    return {
      id: 'server-status',
      label: 'Server Status',
      description: isRunning ? `Running on port ${port}` : 'Stopped',
      tooltip: isRunning ? `Server is running on port ${port}` : 'Server is not running',
      iconPath: isRunning ? ICONS.SERVER_RUNNING : ICONS.SERVER_STOPPED,
      contextValue: 'serverStatus',
      type: 'serverGroup',
      status: isRunning ? 'active' : 'inactive',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };
  }

  /**
   * Create configuration summary item
   */
  private createConfigSummaryItem(): ServerStatusTreeItem {
    const apiKeyCount = uiStateManager.getApiKeys().length;
    const proxyCount = uiStateManager.getProxies().length;
    
    return {
      id: 'config-summary',
      label: 'Configuration',
      description: `${apiKeyCount} keys, ${proxyCount} proxies`,
      tooltip: `${apiKeyCount} API keys and ${proxyCount} proxies configured`,
      iconPath: new vscode.ThemeIcon('settings-gear'),
      contextValue: 'configSummary',
      type: 'serverGroup',
      status: 'active',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };
  }

  /**
   * Create performance metrics item
   */
  private createPerformanceMetricsItem(): ServerStatusTreeItem {
    return {
      id: 'performance-metrics',
      label: 'Performance',
      description: 'View metrics',
      tooltip: 'Server performance metrics and statistics',
      iconPath: new vscode.ThemeIcon('graph'),
      contextValue: 'performanceMetrics',
      type: 'serverGroup',
      status: 'active',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };
  }

  /**
   * Create server status details
   */
  private createServerStatusDetails(): ServerStatusTreeItem[] {
    const items: ServerStatusTreeItem[] = [];
    const serverStatus = uiStateManager.getServerStatus();
    const isRunning = serverStatus.isRunning;
    const port = serverStatus.port || 3146;

    items.push({
      id: 'server-port',
      label: 'Port',
      description: port.toString(),
      tooltip: `Server port: ${port}`,
      iconPath: new vscode.ThemeIcon('plug'),
      contextValue: 'serverPort',
      type: 'serverStatus',
      status: 'active'
    });

    items.push({
      id: 'server-state',
      label: 'State',
      description: isRunning ? 'Running' : 'Stopped',
      tooltip: `Server is ${isRunning ? 'running' : 'stopped'}`,
      iconPath: new vscode.ThemeIcon(isRunning ? 'check' : 'x'),
      contextValue: 'serverState',
      type: 'serverStatus',
      status: isRunning ? 'active' : 'inactive'
    });

    return items;
  }

  /**
   * Create configuration details
   */
  private createConfigDetails(): ServerStatusTreeItem[] {
    const items: ServerStatusTreeItem[] = [];
    const apiKeys = uiStateManager.getApiKeys();
    const proxies = uiStateManager.getProxies();
    const isRotatingProxy = uiStateManager.isRotatingProxyEnabled();
    
    items.push({
      id: 'api-key-count',
      label: 'API Keys',
      description: `${apiKeys.length} configured`,
      tooltip: `${apiKeys.length} API keys configured`,
      iconPath: new vscode.ThemeIcon('key'),
      contextValue: 'apiKeyCount',
      type: 'serverStatus',
      status: apiKeys.length > 0 ? 'active' : 'inactive'
    });
    
    items.push({
      id: 'proxy-mode',
      label: 'Proxy Mode',
      description: isRotatingProxy ? 'Rotating' : 'Individual',
      tooltip: `Proxy assignment mode: ${isRotatingProxy ? 'Rotating' : 'Individual'}`,
      iconPath: new vscode.ThemeIcon('arrow-swap'),
      contextValue: 'proxyMode',
      type: 'serverStatus',
      status: 'active'
    });
    
    if (!isRotatingProxy) {
      items.push({
        id: 'proxy-count',
        label: 'Proxies',
        description: `${proxies.length} configured`,
        tooltip: `${proxies.length} individual proxies configured`,
        iconPath: new vscode.ThemeIcon('globe'),
        contextValue: 'proxyCount',
        type: 'serverStatus',
        status: proxies.length > 0 ? 'active' : 'inactive'
      });
    }
    
    return items;
  }

  /**
   * Create performance details
   */
  private createPerformanceDetails(): ServerStatusTreeItem[] {
    const items: ServerStatusTreeItem[] = [];
    
    items.push({
      id: 'request-count',
      label: 'Total Requests',
      description: '0', // TODO: Get from performance monitor
      tooltip: 'Total number of requests processed',
      iconPath: new vscode.ThemeIcon('pulse'),
      contextValue: 'requestCount',
      type: 'serverStatus',
      status: 'active'
    });
    
    items.push({
      id: 'error-rate',
      label: 'Error Rate',
      description: '0%', // TODO: Get from performance monitor
      tooltip: 'Current error rate percentage',
      iconPath: new vscode.ThemeIcon('warning'),
      contextValue: 'errorRate',
      type: 'serverStatus',
      status: 'active'
    });
    
    return items;
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
