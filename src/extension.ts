// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';     // 引入 fs 模組
import express from 'express';
import config from './server/config'; // Import config from the copied server code
import createProxyRouter from './server/routes/proxy'; // Import the proxy router function
import errorHandler from './server/middlewares/errorHandler'; // Import error handler middleware
import ApiKeyManager from './server/core/ApiKeyManager'; // Import ApiKeyManager
import RequestDispatcher from './server/core/RequestDispatcher'; // Import RequestDispatcher
import GoogleApiForwarder from './server/core/GoogleApiForwarder'; // Import GoogleApiForwarder
import { StreamHandler } from './server/core/StreamHandler'; // Import StreamHandler
// We might not need loggerMiddleware directly in extension.ts, but the errorHandler uses the logger.
// Let's keep the import for now or ensure the logger is accessible.
import { logger, loggerMiddleware } from "./server/middlewares/logger"; // 引入 logger 和 loggerMiddleware
import { eventManager, RequestStatus } from "./server/core/EventManager"; // 引入 eventManager 和 RequestStatus
import { ApiKey } from "./server/types/ApiKey"; // 引入 ApiKey 介面
import { ProxyPoolManager } from "./server/core/ProxyPoolManager"; // Import ProxyPoolManager
import { ProxyAssignmentManager } from "./server/core/ProxyAssignmentManager"; // Import ProxyAssignmentManager
import { ProxyLoadBalancer } from "./server/core/ProxyLoadBalancer"; // Import ProxyLoadBalancer
import { ProxyConfigurationManager } from "./server/core/ProxyConfigurationManager"; // Import ProxyConfigurationManager
import { ProxyErrorHandler } from "./server/core/ProxyErrorHandler"; // Import ProxyErrorHandler
import { MigrationManager } from "./server/core/MigrationManager"; // Import MigrationManager
import { RotatingProxyHealthMonitor } from "./server/core/RotatingProxyHealthMonitor"; // Import RotatingProxyHealthMonitor
import { rotatingProxyUIService } from "./ui/core/RotatingProxyUIService"; // Import RotatingProxyUIService
import { ProxyPerformanceMonitor } from "./server/core/ProxyPerformanceMonitor"; // Import ProxyPerformanceMonitor

// Import native UI components
import { ApiKeyTreeProvider } from './ui/providers/ApiKeyTreeProvider';
import { ProxyTreeProvider } from './ui/providers/ProxyTreeProvider';
import { ServerStatusTreeProvider } from './ui/providers/ServerStatusTreeProvider';
import { ApiKeyCommands } from './ui/commands/ApiKeyCommands';
import { ProxyCommands } from './ui/commands/ProxyCommands';
import { ServerCommands } from './ui/commands/ServerCommands';
import {
  statusBarManager,
  systemMonitor,
  createCoreIntegrationService,
  disposalManager
} from './ui/core';
import { WebviewManager } from './ui/webview/WebviewManager';

let server: http.Server | undefined; // Declare server variable to manage its lifecycle
let apiKeyManager: ApiKeyManager; // Declare apiKeyManager variable to be accessible in commands
let webviewPanel: vscode.WebviewPanel | undefined; // 新增：保存 webviewPanel 引用
let proxyPoolManager: ProxyPoolManager | undefined; // Declare proxy pool manager for cleanup

// Native UI components
let apiKeyTreeProvider: ApiKeyTreeProvider | undefined;
let proxyTreeProvider: ProxyTreeProvider | undefined;
let serverStatusTreeProvider: ServerStatusTreeProvider | undefined;
let coreIntegrationService: any;
let webviewManager: WebviewManager | undefined;
let apiKeyCommands: ApiKeyCommands | undefined;
let proxyCommands: ProxyCommands | undefined;
let serverCommands: ServerCommands | undefined;

/**
 * Load proxies from environment variables if rotating proxy is not configured
 */
async function loadProxiesFromEnvironment(proxyPoolManager: ProxyPoolManager): Promise<void> {
	// Check if rotating proxy is configured
	if (config.USE_ROTATING_PROXY && config.ROTATING_PROXY) {
		console.log('Extension: Rotating proxy is configured, skipping individual proxy loading');
		console.log(`Extension: Using rotating proxy: ${config.ROTATING_PROXY}`);
		return;
	}
	
	// Load individual proxies from PROXY_SERVERS environment variable
	const proxyServersEnv = process.env.PROXY_SERVERS;
	if (!proxyServersEnv) {
		console.log('Extension: No PROXY_SERVERS environment variable found');
		return;
	}
	
	const proxyUrls = proxyServersEnv.split(',').map(url => url.trim()).filter(url => url.length > 0);
	if (proxyUrls.length === 0) {
		console.log('Extension: No valid proxy URLs found in PROXY_SERVERS');
		return;
	}
	
	console.log(`Extension: Loading ${proxyUrls.length} proxies from environment variables`);
	
	// Add each proxy to the pool
	for (const proxyUrl of proxyUrls) {
		try {
			const proxyId = await proxyPoolManager.addProxy(proxyUrl);
			console.log(`Extension: Added proxy ${proxyUrl} (ID: ${proxyId})`);
		} catch (error) {
			console.error(`Extension: Failed to add proxy ${proxyUrl}:`, error);
		}
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	console.log('Roo: activate function started'); // Added log to check activation

	console.log('Congratulations, your extension "api-key-aggregetor" is now active!');

	// --- Start Proxy Server Integration ---

	const app = express();
	const port = config.PORT; // 使用从 config 中获取的端口

	// 使用 SecretStorage 读取 API Keys
	const storedKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
	const storedKeyIds: string[] = storedKeyIdsJson ? JSON.parse(storedKeyIdsJson) : [];
	const initialApiKeys: ApiKey[] = [];

	for (const keyId of storedKeyIds) {
		const apiKey = await context.secrets.get(keyId);
		if (apiKey) {
			initialApiKeys.push({
				key: apiKey,
				keyId: keyId,
				// status, coolingDownUntil, usedHistory 將由 ApiKeyManager 從持久化儲存中載入
				status: "available", // 這裡只是初始值，實際狀態會在 ApiKeyManager.loadKeys 中被覆蓋
				currentRequests: 0,
				lastUsed: undefined,
				usedHistory: [], // 這裡只是初始值，實際歷史會在 ApiKeyManager.loadKeys 中被覆蓋
			});
		}
	}

	if (initialApiKeys.length === 0) {
		vscode.window.showWarningMessage('No API keys found. Please run "Gemini: Add API Key" command to add keys.');
	}

	// Initialize proxy configuration manager
	const proxyConfigurationManager = new ProxyConfigurationManager(context);
	await proxyConfigurationManager.migrateLegacyConfiguration();
	const proxyConfig = await proxyConfigurationManager.loadConfiguration();

	// Initialize rotating proxy health monitor
	const rotatingProxyHealthMonitor = new RotatingProxyHealthMonitor(proxyConfigurationManager);
	
	// Start health monitoring if rotating proxy is enabled
	if (config.USE_ROTATING_PROXY && config.ROTATING_PROXY) {
		console.log('Extension: Starting rotating proxy health monitoring');
		rotatingProxyHealthMonitor.startMonitoring();
		
		// Initialize UI service with health monitor
		rotatingProxyUIService.initialize(rotatingProxyHealthMonitor);
	}
	
	// Initialize proxy management components
	proxyPoolManager = new ProxyPoolManager(eventManager, context);
	proxyPoolManager.setHealthCheckConfig(
		proxyConfig.healthCheckInterval,
		proxyConfig.maxErrorsBeforeDisable
	);
	await proxyPoolManager.initialize();
	
	const proxyLoadBalancer = new ProxyLoadBalancer(proxyConfig.loadBalancingStrategy);
	
	const proxyAssignmentManager = new ProxyAssignmentManager(
	  eventManager,
	  proxyPoolManager,
	  context
	);
	proxyAssignmentManager.setAutoAssignment(proxyConfig.autoAssignmentEnabled);
	await proxyAssignmentManager.initialize();
	
	// Initialize proxy error handler
	const proxyErrorHandler = new ProxyErrorHandler(
		eventManager,
		proxyPoolManager,
		proxyAssignmentManager
	);
	
	// Initialize performance monitor
	const proxyPerformanceMonitor = new ProxyPerformanceMonitor(eventManager);
	
	// Initialize migration manager and perform migration if needed
	const migrationManager = new MigrationManager(
		context,
		eventManager,
		proxyPoolManager,
		proxyAssignmentManager,
		proxyConfigurationManager
	);

	// Store health monitor in context for access by other components
	(context as any).rotatingProxyHealthMonitor = rotatingProxyHealthMonitor;
	
	// Check if migration is needed and perform it
	const migrationNeeded = await migrationManager.isMigrationNeeded();
	if (migrationNeeded) {
		console.log('Extension: Legacy proxy configuration detected, performing migration...');
		await migrationManager.performMigration();
	}
	
	// Load proxies from environment variables if rotating proxy is not configured
	await loadProxiesFromEnvironment(proxyPoolManager);
	
	// 傳遞 eventManager, context 和 proxy 管理組件給 ApiKeyManager
	apiKeyManager = new ApiKeyManager(
	  initialApiKeys,
	  eventManager,
	  context,
	  proxyPoolManager,
	  proxyAssignmentManager,
	  proxyLoadBalancer
	);
	await apiKeyManager.loadKeys(initialApiKeys); // 確保在啟動時載入持久化狀態

	const googleApiForwarder = new GoogleApiForwarder();
	
	// Connect health monitor to GoogleApiForwarder
	googleApiForwarder.setHealthMonitor(rotatingProxyHealthMonitor);
	
	const streamHandler = new StreamHandler();
	const requestDispatcher = new RequestDispatcher(apiKeyManager);

	// Create the proxy router
	const proxyRouter = createProxyRouter(apiKeyManager, requestDispatcher, googleApiForwarder, streamHandler, eventManager );

	// Integrate JSON body parser middleware
	app.use(express.json({ limit: '8mb' }));

	// Integrate proxy router
	app.use('/', proxyRouter);

	// 使用 loggerMiddleware
  app.use(loggerMiddleware);

	// Integrate unified error handling middleware (should be after routes)
	app.use(errorHandler); // Assuming errorHandler is adapted or can access necessary dependencies

	// Start the HTTP server
	server = http.createServer(app);

	server.listen(port, () => {
		console.log(`Proxy server is running on port ${port}`);
		vscode.window.showInformationMessage(`API Key Aggregator Proxy Server started on port ${port}`);
	}).on('error', (err: { code?: string; message?: string }) => {
		if (err.code === 'EADDRINUSE') {
			console.warn(`Port ${port} is already in use. Proxy server may be running in another VS Code window.`);
			vscode.window.showInformationMessage(`API Key Aggregator Proxy Server is already running on port ${port} in another VS Code window.`);
			// Do NOT deactivate the extension, just don't start a new server
		} else {
			console.error('Failed to start proxy server:', err);
			vscode.window.showErrorMessage(`Failed to start API Key Aggregator Proxy Server: ${err.message}`);
			// Deactivate the extension if the server fails to start for other reasons
			deactivate();
		}
	});

	// Add the server to the context subscriptions so it's disposed on deactivate
	context.subscriptions.push({
		dispose: () => {
			if (server) {
				server.close(() => {
					console.log('Proxy server stopped.');
				});
			}
		}
	});

	// --- End Proxy Server Integration ---

	// --- Initialize Native UI Components ---
	console.log('Extension: Initializing native UI components...');
	
	// Create core integration service
	coreIntegrationService = createCoreIntegrationService(
		eventManager,
		apiKeyManager,
		proxyPoolManager,
		proxyAssignmentManager
	);
	coreIntegrationService.initialize();
	
	// Initialize TreeView providers
	apiKeyTreeProvider = new ApiKeyTreeProvider();
	proxyTreeProvider = new ProxyTreeProvider();
	serverStatusTreeProvider = new ServerStatusTreeProvider();

	// Register TreeViews
	const apiKeyTreeView = vscode.window.createTreeView('geminiApiKeys', {
		treeDataProvider: apiKeyTreeProvider,
		showCollapseAll: true
	});

	const proxyTreeView = vscode.window.createTreeView('geminiProxies', {
		treeDataProvider: proxyTreeProvider,
		showCollapseAll: true
	});

	const serverStatusTreeView = vscode.window.createTreeView('geminiServerStatus', {
		treeDataProvider: serverStatusTreeProvider,
		showCollapseAll: true
	});
	
	// Initialize command handlers
	apiKeyCommands = new ApiKeyCommands(coreIntegrationService);
	proxyCommands = new ProxyCommands(proxyPoolManager, proxyAssignmentManager);
	serverCommands = new ServerCommands();
	
	// Register all commands
	apiKeyCommands.registerCommands(context);
	proxyCommands.registerCommands(context);
	serverCommands.registerCommands(context);
	
	// Initialize and show status bar
	statusBarManager.show();
	
	// Start system monitoring
	systemMonitor.startMonitoring();
	
	// Register UI components with disposal manager
	disposalManager.register(apiKeyTreeView);
	disposalManager.register(proxyTreeView);
	disposalManager.register(serverStatusTreeView);
	disposalManager.register(coreIntegrationService);
	disposalManager.register(statusBarManager);
	disposalManager.register(systemMonitor);
	
	// Register cleanup tasks
	disposalManager.registerCleanupTask(() => {
		if (apiKeyCommands) apiKeyCommands.dispose();
		if (proxyCommands) proxyCommands.dispose();
		if (serverCommands) serverCommands.dispose();
		if (apiKeyTreeProvider) apiKeyTreeProvider.dispose();
		if (proxyTreeProvider) proxyTreeProvider.dispose();
		if (serverStatusTreeProvider) serverStatusTreeProvider.dispose();
	});
	
	// Add disposal manager to context subscriptions
	context.subscriptions.push(disposalManager);
	
	console.log('Extension: Native UI components initialized successfully');
	// --- End Native UI Components ---

	// Register the runserver command (keep this one as it's referenced by ServerCommands)
console.log('Roo: Before registering runserver command');
	const disposable = vscode.commands.registerCommand('geminiAggregator-dev.runserver', () => {
		vscode.window.showInformationMessage('Run Server from api-key-aggregetor!');
	});
console.log('Roo: After registering runserver command');
	context.subscriptions.push(disposable);

	// Note: Other commands are now handled by the structured command classes
	// (ApiKeyCommands, ProxyCommands, ServerCommands) to avoid conflicts

	// Initialize WebviewManager
	webviewManager = new WebviewManager(context);

	// Register the openPanel command with new WebviewManager
	const openPanelCommand = vscode.commands.registerCommand('geminiAggregator-dev.openPanel', () => {
		webviewManager?.createWebview();
	});


	context.subscriptions.push(openPanelCommand);

	// Register webview manager for disposal
	disposalManager.register(webviewManager);
}

// 輔助函數：生成 Nonce
function getNonce() {
	   let text = '';
	   const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	   for (let i = 0; i < 32; i++) {
	       text += possible.charAt(Math.floor(Math.random() * possible.length));
	   }
	   return text;
}

// This method is called when your extension is deactivated
export async function deactivate() {
	console.log('Your extension "api-key-aggregetor" is being deactivated.');
	
	// Use disposal manager for comprehensive cleanup
	try {
		await disposalManager.dispose();
		console.log('All UI components disposed successfully via DisposalManager.');
	} catch (error) {
		console.error('Error disposing UI components via DisposalManager:', error);
	}
	
	// Clean up rotating proxy services
	try {
		rotatingProxyUIService.stop();
		console.log('Rotating proxy UI service stopped successfully.');
	} catch (error) {
		console.error('Error stopping rotating proxy UI service:', error);
	}

	const healthMonitor = (context as any)?.rotatingProxyHealthMonitor;
	if (healthMonitor) {
		try {
			healthMonitor.stopMonitoring();
			console.log('Rotating proxy health monitor stopped successfully.');
		} catch (error) {
			console.error('Error stopping rotating proxy health monitor:', error);
		}
	}

	// Clean up proxy resources
	if (proxyPoolManager) {
		try {
			proxyPoolManager.dispose();
			console.log('Proxy pool manager disposed successfully.');
		} catch (error) {
			console.error('Error disposing proxy pool manager:', error);
		}
	}
	
	// Close webview panel if open
	if (webviewPanel) {
		try {
			webviewPanel.dispose();
			webviewPanel = undefined;
			console.log('Webview panel disposed successfully.');
		} catch (error) {
			console.error('Error disposing webview panel:', error);
		}
	}
	
	// The server is closed via context.subscriptions.dispose
	console.log('Extension deactivation completed.');
}
