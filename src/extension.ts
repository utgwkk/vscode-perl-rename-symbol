// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';

async function getTargetFiles(): Promise<string[]> {
	const filePatterns = ['**/**.pl', '**/**.pm', '**/**.t'];
	const findPromise = await Promise.all(filePatterns.map(p => vscode.workspace.findFiles(p)));
	const files = findPromise.reduce((xs, ys) => xs.concat(ys), []);
	return files.map(f => f.path);
}

const sigilRegex = /[\$@%]/;

function getSigil(document: vscode.TextDocument, identifierRange: vscode.Range): string | undefined {
	const sigilRange = new vscode.Range(
		new vscode.Position(identifierRange.start.line, identifierRange.start.character - 1),
		identifierRange.start
	);
	const sigilLike = document.getText(sigilRange);
	const m = sigilLike.match(sigilRegex);
	console.log(m);
	if (m === null) {
		return undefined;
	}
	return sigilLike;
}

const config = vscode.workspace.getConfiguration('perl-rename-symbol');
const renameProvider: vscode.RenameProvider = {
	prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range> {
		const identifierRange = document.getWordRangeAtPosition(position);
		return identifierRange;
	},
	provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const identifierRange = document.getWordRangeAtPosition(position);
		if (identifierRange === undefined) {
			return;
		}
		return new Promise(async (resolve, reject) => {
			const targetFiles = await getTargetFiles();
			const prtPath = config.get<string>('pathOfAppPRT') || 'prt';
			const editorToolsPath = config.get<string>('pathOfAppEditorTools') || 'editortools';
			const oldName = document.getText(identifierRange);
			const sigil = getSigil(document, identifierRange);
			if (sigil !== undefined) {
				const args = [editorToolsPath, 'renamevariable', '-c', position.character, '-l', position.line + 1, '-r', newName];
				const source = document.getText();
				try {
					const output = cp.execSync(args.join(' '), { input: source, encoding: 'utf-8' });
					const edit = new vscode.WorkspaceEdit();
					edit.replace(document.uri, new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end), output.toString());
					resolve(edit);
				} catch (error) {
					reject(error);
				}
			}
			else {
				const args = [prtPath, 'replace_token', oldName, newName, ...targetFiles];
				cp.exec(args.join(' '), (error) => {
					if (error !== null) {
						reject(error);
					} else {
						resolve(new vscode.WorkspaceEdit());
					}
				});
			}
		});
	}
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.languages.registerRenameProvider(
		{ scheme: 'file', language: 'perl' },
		renameProvider
	);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
