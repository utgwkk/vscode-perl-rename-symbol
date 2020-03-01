// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';

async function getTargetFiles(): Promise<string[]> {
	const plFiles = (await vscode.workspace.findFiles('**/**.pl')).map(url => url.path);
	const pmFiles = (await vscode.workspace.findFiles('**/**.pm')).map(url => url.path);
	const tFiles = (await vscode.workspace.findFiles('**/**.t')).map(url => url.path);
	return [...plFiles, ...pmFiles, ...tFiles];
}

const subRegex = /sub\s+([_a-zA-Z][_a-zA-Z0-9]*)\s*{/;
const identifierRegex = /\$\@\%[_a-zA-Z][_0-9a-zA-Z]/;

function getSubName(document: vscode.TextDocument, position: vscode.Position): string | undefined {
	for (let lineno = position.line; lineno >= 0; lineno--) {
		const lineStart = new vscode.Position(lineno, 0);
		const line = document.getText(new vscode.Range(lineStart, position));
		const m = line.match(subRegex);
		if (m === null) {
			return undefined;
		}
		return m[1];
	}
	return undefined;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('perl-rename-symbol');
	let disposable = vscode.languages.registerRenameProvider(
		{ scheme: 'file', language: 'perl' }, {
		prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range> {
			const identifierRange = document.getWordRangeAtPosition(position, identifierRegex);
			return identifierRange;
		},

		provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
			const identifierRange = document.getWordRangeAtPosition(position, identifierRegex);
			if (identifierRange === undefined) {
				return;
			}

			return new Promise((resolve) => {
				getTargetFiles().then(targetFiles => {
					const oldName = document.getText(identifierRange);
					const prtPath = config.get<string>('pathOfAppPRT') || 'prt';
					const prtArgs = [prtPath, 'replace_token', oldName, newName, ...targetFiles];
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
