// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "perl-rename-symbol" is now active!');

	let disposable = vscode.languages.registerRenameProvider({ language: 'perl' }, renameProvider);

	context.subscriptions.push(disposable);
}

const renameProvider = {
	prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range> {
		throw new Error('TODO');
	},

	provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
		throw new Error('TODO');
	}
};

// this method is called when your extension is deactivated
export function deactivate() { }
