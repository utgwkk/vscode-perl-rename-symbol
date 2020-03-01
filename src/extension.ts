// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';

async function getTargetFiles(): Promise<string[]> {
	const pmFiles = (await vscode.workspace.findFiles('**/**.pm')).map(url => url.path);
	const tFiles = (await vscode.workspace.findFiles('**/**.t')).map(url => url.path);
	return [...pmFiles, ...tFiles];
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.languages.registerRenameProvider(
		{ scheme: 'file', language: 'perl' }, {
		prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range> {
			const identifierRange = document.getWordRangeAtPosition(position);
			return identifierRange;
		},

		provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
			const identifierRange = document.getWordRangeAtPosition(position);
			console.log(identifierRange);
			if (identifierRange === undefined) {
				return;
			}

			return new Promise((resolve) => {
				getTargetFiles().then(targetFiles => {
					const oldName = document.getText(identifierRange);
					const prtArgs = ['prt', 'replace_token', oldName, newName, ...targetFiles];
					cp.execSync(prtArgs.join(' '));
					resolve(new vscode.WorkspaceEdit());
				});
			});
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
