// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { provideRenameEditsImpl } from "./rename-provider";

const renameProvider: vscode.RenameProvider = {
  prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Range> {
    if (token.isCancellationRequested) {
      return;
    }
    const identifierRange = document.getWordRangeAtPosition(position);
    return identifierRange;
  },
  provideRenameEdits: provideRenameEditsImpl,
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.languages.registerRenameProvider(
    { scheme: "file", language: "perl" },
    renameProvider
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
  // noop
}
