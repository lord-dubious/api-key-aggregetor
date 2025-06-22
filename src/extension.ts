// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import express from 'express';
import http from 'http'; // Import http module
import config from './server/config'; // Import config from the copied server code
import createProxyRouter from './server/routes/proxy'; // Import the proxy router function
import errorHandler from './server/middlewares/errorHandler'; // Import error handler middleware
import ApiKeyManager from './server/core/ApiKeyManager'; // Import ApiKeyManager
import RequestDispatcher from './server/core/RequestDispatcher'; // Import RequestDispatcher
import GoogleApiForwarder from './server/core/GoogleApiForwarder'; // Import GoogleApiForwarder
import { StreamHandler } from './server/core/StreamHandler'; // Import StreamHandler
// We might not need loggerMiddleware directly in extension.ts, but the errorHandler uses the logger.
// Let's keep the import for now or ensure the logger is accessible.
// import { loggerMiddleware } from './server/middlewares/logger';

let server: http.Server | undefined; // Declare server variable to manage its lifecycle
let apiKeyManager: ApiKeyManager; // Declare apiKeyManager variable to be accessible in commands

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
	const apiKeys: string[] = [];

	for (const keyId of storedKeyIds) {
		const apiKey = await context.secrets.get(keyId);
		if (apiKey) {
			apiKeys.push(apiKey);
		}
	}

	if (apiKeys.length === 0) {
		vscode.window.showWarningMessage('No API keys found. Please run "Gemini: Add API Key" command to add keys.');
	}

	apiKeyManager = new ApiKeyManager(apiKeys); // Assign to the variable declared outside
	const googleApiForwarder = new GoogleApiForwarder();
	const streamHandler = new StreamHandler();
	const requestDispatcher = new RequestDispatcher(apiKeyManager);

	// Create the proxy router
	const proxyRouter = createProxyRouter(apiKeyManager, requestDispatcher, googleApiForwarder, streamHandler);

	// Integrate JSON body parser middleware
	app.use(express.json({ limit: '8mb' }));

	// Integrate proxy router
	app.use('/', proxyRouter);

	// Integrate unified error handling middleware (should be after routes)
	app.use(errorHandler); // Assuming errorHandler is adapted or can access necessary dependencies

	// Start the HTTP server
	server = http.createServer(app);

	server.listen(port, () => {
		console.log(`Proxy server is running on port ${port}`);
		vscode.window.showInformationMessage(`API Key Aggregator Proxy Server started on port ${port}`);
	}).on('error', (err: any) => {
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

	// Example command from the template (can be removed later)
console.log('Roo: Before registering runserver command');
	const disposable = vscode.commands.registerCommand('geminiAggregator-dev.runserver', () => {
		vscode.window.showInformationMessage('Run Server from api-key-aggregetor!');
	});
console.log('Roo: After registering runserver command');
	context.subscriptions.push(disposable);

	// Register command to add API Key
	const addApiKeyCommand = vscode.commands.registerCommand('geminiAggregator-dev.addApiKey', async () => {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Please enter your Gemini API Key',
			ignoreFocusOut: true,
			password: true
		});

		if (apiKey) {
			// Get the current counter value or initialize to 1
			const counterJson = await context.secrets.get("geminiApiKeyCounter");
			let counter = counterJson ? parseInt(counterJson, 10) : 1;

			// Generate the key ID using the counter
			const keyId = `key${counter}`;

			// Store the key securely
			await context.secrets.store(keyId, apiKey);

			// Get existing key IDs or initialize an empty array
			const existingKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
			const existingKeyIds: string[] = existingKeyIdsJson ? JSON.parse(existingKeyIdsJson) : [];

			// Add the new key ID if it's not already in the list (handle potential re-adding after deletion)
			if (!existingKeyIds.includes(keyId)) {
				existingKeyIds.push(keyId);
				// Store the updated list of key IDs
				await context.secrets.store("geminiApiKeysIds", JSON.stringify(existingKeyIds));
			}


			// Increment and store the counter
			counter++;
			await context.secrets.store("geminiApiKeyCounter", counter.toString());


			vscode.window.showInformationMessage(`Gemini API Key "${keyId}" added.`);

			// Reload keys in ApiKeyManager
			const addedKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
			const addedKeyIds: string[] = addedKeyIdsJson ? JSON.parse(addedKeyIdsJson) : [];
			const addedApiKeys: string[] = [];
			for (const id of addedKeyIds) {
				const key = await context.secrets.get(id);
				if (key) {
					addedApiKeys.push(key);
				}
			}
			apiKeyManager.loadKeys(addedApiKeys);
			console.log('API keys reloaded after adding a key.');

		} else {
			vscode.window.showWarningMessage('No API Key entered.');
		}
	});
	context.subscriptions.push(addApiKeyCommand);

	// Register command to list API Keys (showing partial key)
	const listApiKeysCommand = vscode.commands.registerCommand('geminiAggregator-dev.listApiKeys', async () => {
		const existingKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
		const existingKeyIds: string[] = existingKeyIdsJson ? JSON.parse(existingKeyIdsJson) : [];

		if (existingKeyIds.length === 0) {
			vscode.window.showInformationMessage('No Gemini API Key found. Please run the "geminiAggregator-dev.addApiKey" command to add one.');
			return;
		}

		const quickPickItems: vscode.QuickPickItem[] = [];
		// Sort keys numerically based on the number in keyId (e.g., key1, key2, key10)
		existingKeyIds.sort((a, b) => {
			const numA = parseInt(a.replace('key', ''), 10);
			const numB = parseInt(b.replace('key', ''), 10);
			return numA - numB;
		});


		for (const keyId of existingKeyIds) {
			const apiKey = await context.secrets.get(keyId);
			if (apiKey) {
				// Show a partial key for identification
				const partialKey = apiKey.length > 4 ? `...${apiKey.slice(-4)}` : apiKey;
				quickPickItems.push({
					label: `API Key ID: ${keyId}`,
					description: `Key ending in: ${partialKey}`
				});
			}
		}

		vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'Configured Gemini API Keys (partial key shown)'
		});
	});
	context.subscriptions.push(listApiKeysCommand);

	// Register command to delete API Key
	const deleteApiKeyCommand = vscode.commands.registerCommand('geminiAggregator-dev.deleteApiKey', async () => {
		const existingKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
		const existingKeyIds: string[] = existingKeyIdsJson ? JSON.parse(existingKeyIdsJson) : [];

		if (existingKeyIds.length === 0) {
			vscode.window.showInformationMessage('No Gemini API Key found to delete.');
			return;
		}

		const quickPickItems: vscode.QuickPickItem[] = existingKeyIds.map(keyId => ({
			label: `API Key ID: ${keyId}`,
			description: `Select to delete key ${keyId}`
		}));

		const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'Select the Gemini API Key to delete'
		});

		if (selectedItem) {
			const keyIdToDelete = selectedItem.label.replace('API Key ID: ', '');
			await context.secrets.delete(keyIdToDelete);

			// Update the stored list of key IDs
			const updatedKeyIds = existingKeyIds.filter(id => id !== keyIdToDelete);
			await context.secrets.store("geminiApiKeysIds", JSON.stringify(updatedKeyIds));

			vscode.window.showInformationMessage(`Gemini API Key "${keyIdToDelete}" deleted.`);

			// Reload keys in ApiKeyManager
			const deletedKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
			const deletedKeyIds: string[] = deletedKeyIdsJson ? JSON.parse(deletedKeyIdsJson) : [];
			const deletedApiKeys: string[] = [];
			for (const id of deletedKeyIds) {
				const key = await context.secrets.get(id);
				if (key) {
					deletedApiKeys.push(key);
				}
			}
			apiKeyManager.loadKeys(deletedApiKeys);
			console.log('API keys reloaded after deleting a key.');

		} else {
			vscode.window.showInformationMessage('Deletion cancelled.');
		}
	});
	context.subscriptions.push(deleteApiKeyCommand);

	// Register command to modify API Key
	const modifyApiKeyCommand = vscode.commands.registerCommand('geminiAggregator-dev.modifyApiKey', async () => {
		const existingKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
		const existingKeyIds: string[] = existingKeyIdsJson ? JSON.parse(existingKeyIdsJson) : [];

		if (existingKeyIds.length === 0) {
			vscode.window.showInformationMessage('No Gemini API Key found to modify.');
			return;
		}

		const quickPickItems: vscode.QuickPickItem[] = existingKeyIds.map(keyId => ({
			label: `API Key ID: ${keyId}`,
			description: `Select to modify key ${keyId}`
		}));

		const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'Select the Gemini API Key to modify'
		});

		if (selectedItem) {
			const keyIdToModify = selectedItem.label.replace('API Key ID: ', '');
			const newApiKey = await vscode.window.showInputBox({
				prompt: `Please enter the new Gemini API Key for ${keyIdToModify}`,
				ignoreFocusOut: true,
				password: true
			});

			if (newApiKey) {
				await context.secrets.store(keyIdToModify, newApiKey);
				vscode.window.showInformationMessage(`Gemini API Key "${keyIdToModify}" modified.`);

				// Reload keys in ApiKeyManager
				const modifiedKeyIdsJson = await context.secrets.get("geminiApiKeysIds");
				const modifiedKeyIds: string[] = modifiedKeyIdsJson ? JSON.parse(modifiedKeyIdsJson) : [];
				const modifiedApiKeys: string[] = [];
				for (const id of modifiedKeyIds) {
					const key = await context.secrets.get(id);
					if (key) {
						modifiedApiKeys.push(key);
					}
				}
				apiKeyManager.loadKeys(modifiedApiKeys);
				console.log('API keys reloaded after modifying a key.');

			} else {
				vscode.window.showInformationMessage('Modification cancelled or no new key entered.');
			}
		} else {
			vscode.window.showInformationMessage('Modification cancelled.');
		}
	});
	context.subscriptions.push(modifyApiKeyCommand);

	// TODO: Modify API key loading logic to read from SecretStorage
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Your extension "api-key-aggregetor" is being deactivated.');
	// The server is closed via context.subscriptions.dispose
}
