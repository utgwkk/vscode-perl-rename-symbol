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

const subRegex = /(sub\s+[_a-zA-Z][_a-zA-Z0-9]*\s*{)/;
const sigilRegex = /[\$@%]/;

function getSubroutineDef(document: vscode.TextDocument, position: vscode.Position): string | undefined {
	for (let lineno = position.line; lineno >= 0; lineno--) {
		const lineStart = new vscode.Position(lineno, 0);
		const line = document.getText(new vscode.Range(lineStart, position));
		const m = line.match(subRegex);
		if (m !== null) {
			return m[1];
		}
	}
	return undefined;
}

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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('perl-rename-symbol');
	let disposable = vscode.languages.registerRenameProvider(
		{ scheme: 'file', language: 'perl' }, {
		prepareRename(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Range> {
			const identifierRange = document.getWordRangeAtPosition(position);
			return identifierRange;
		},

		provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.WorkspaceEdit> {
			const identifierRange = document.getWordRangeAtPosition(position);
			if (identifierRange === undefined) {
				return;
			}

			return new Promise((resolve) => {
				getTargetFiles().then(targetFiles => {
					const prtPath = config.get<string>('pathOfAppPRT') || 'prt';
					const oldName = document.getText(identifierRange);
					let prtArgs: string[];
					const sigil = getSigil(document, identifierRange);
					if (sigil !== undefined) {
						const subroutineDef = getSubroutineDef(document, position);
						if (subroutineDef === undefined) {
							prtArgs = [prtPath, 'replace_token', `${sigil}${oldName}`, `${sigil}${newName}`, document.uri.path];
						} else {
							prtArgs = [prtPath, 'replace_token', `${sigil}${oldName}`, `${sigil}${newName}`, '--in-statement', `'${subroutineDef}'`, document.uri.path];
						}
					} else {
						prtArgs = [prtPath, 'replace_token', oldName, newName, ...targetFiles];
					}
					console.log(prtArgs);
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
