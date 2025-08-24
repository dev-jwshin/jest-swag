import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import * as fs from 'fs';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let previewPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Jest Swag extension is now active!');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('Jest Swag');
    
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(book) Jest Swag';
    statusBarItem.tooltip = 'Click to generate API documentation';
    statusBarItem.command = 'jestSwag.generateDocs';
    statusBarItem.show();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('jestSwag.init', initializeJestSwag),
        vscode.commands.registerCommand('jestSwag.generateDocs', generateDocs),
        vscode.commands.registerCommand('jestSwag.previewDocs', previewDocs),
        vscode.commands.registerCommand('jestSwag.runTests', runTests),
        vscode.commands.registerCommand('jestSwag.watchMode', startWatchMode),
        statusBarItem,
        outputChannel
    );

    // Auto-generate on save if enabled
    if (vscode.workspace.getConfiguration('jestSwag').get('autoGenerate')) {
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (isTestFile(document.fileName)) {
                    generateDocs();
                }
            })
        );
    }

    // Check if jest-swag is initialized
    checkInitialization();
}

export function deactivate() {
    if (previewPanel) {
        previewPanel.dispose();
    }
}

async function initializeJestSwag() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    outputChannel.show();
    outputChannel.appendLine('Initializing Jest Swag...');

    const terminal = vscode.window.createTerminal('Jest Swag Init');
    terminal.show();
    terminal.sendText('npx jest-swag init --example');

    vscode.window.showInformationMessage('Jest Swag initialization started. Check the terminal for progress.');
}

async function generateDocs() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    outputChannel.show();
    outputChannel.appendLine('Generating API documentation...');
    
    statusBarItem.text = '$(sync~spin) Generating...';

    exec('npx jest-swag generate', { cwd: workspaceFolder.uri.fsPath }, (error, stdout, stderr) => {
        if (error) {
            outputChannel.appendLine(`Error: ${error.message}`);
            vscode.window.showErrorMessage('Failed to generate documentation');
            statusBarItem.text = '$(book) Jest Swag';
            return;
        }

        outputChannel.appendLine(stdout);
        if (stderr) {
            outputChannel.appendLine(`Warnings: ${stderr}`);
        }

        statusBarItem.text = '$(book) Jest Swag';
        
        if (vscode.workspace.getConfiguration('jestSwag').get('showNotifications')) {
            vscode.window.showInformationMessage('API documentation generated successfully!', 'Preview')
                .then(selection => {
                    if (selection === 'Preview') {
                        previewDocs();
                    }
                });
        }
    });
}

async function previewDocs() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const outputPath = vscode.workspace.getConfiguration('jestSwag').get<string>('outputPath') || './docs/openapi.json';
    const docPath = path.join(workspaceFolder.uri.fsPath, outputPath);

    if (!fs.existsSync(docPath)) {
        vscode.window.showErrorMessage('Documentation not found. Generate it first.');
        return;
    }

    // Create or reveal preview panel
    if (previewPanel) {
        previewPanel.reveal(vscode.ViewColumn.Two);
    } else {
        previewPanel = vscode.window.createWebviewPanel(
            'jestSwagPreview',
            'API Documentation',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        previewPanel.onDidDispose(() => {
            previewPanel = undefined;
        });
    }

    // Load OpenAPI document
    const openApiDoc = JSON.parse(fs.readFileSync(docPath, 'utf8'));

    // Set webview content
    previewPanel.webview.html = getWebviewContent(openApiDoc);
}

async function runTests() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const terminal = vscode.window.createTerminal('Jest Swag Tests');
    terminal.show();
    
    const fileName = activeEditor.document.fileName;
    terminal.sendText(`npm test -- ${fileName}`);
}

async function startWatchMode() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    const terminal = vscode.window.createTerminal('Jest Swag Watch');
    terminal.show();
    
    const port = vscode.workspace.getConfiguration('jestSwag').get<number>('serverPort') || 3001;
    terminal.sendText(`npx jest-swag watch --port ${port}`);

    vscode.window.showInformationMessage(`Jest Swag watch mode started on port ${port}`);
}

function checkInitialization() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const configFiles = [
        'jest-swag.config.json',
        'jest-swag.config.js',
        '.jest-swagrc'
    ];

    const hasConfig = configFiles.some(file => 
        fs.existsSync(path.join(workspaceFolder.uri.fsPath, file))
    );

    if (!hasConfig) {
        vscode.window.showInformationMessage(
            'Jest Swag is not initialized in this project',
            'Initialize'
        ).then(selection => {
            if (selection === 'Initialize') {
                initializeJestSwag();
            }
        });
    }
}

function isTestFile(fileName: string): boolean {
    return /\.(test|spec)\.(ts|js)$/.test(fileName);
}

function getWebviewContent(openApiDoc: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${openApiDoc.info.title}</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        #swagger-ui { display: block; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                spec: ${JSON.stringify(openApiDoc)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;
}