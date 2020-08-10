// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as cp from "child_process";

function getConfig<T>(section: string, defaultValue: T): T {
  const value = vscode.workspace
    .getConfiguration("perl-rename-symbol")
    .get<T>(section);
  if (value === undefined) {
    return defaultValue;
  }
  return value;
}

function grepFiles(files: string[], query: string): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      // try to check git is available
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders === undefined) {
        resolve(files);
        return;
      }
      const cwd = workspaceFolders[0].uri.path;
      cp.execSync("git status", { cwd });
      const output = cp.execSync(
        `git grep --name-only "${query}" -- ${files.join(" ")}`,
        { cwd, encoding: "utf-8" }
      );
      resolve(
        output
          .toString()
          .trim()
          .split(/\s+/)
          .map((p) => `${cwd}/${p.trim()}`)
      );
    } catch (e) {
      resolve(files);
    }
    resolve(files);
  });
}

async function getTargetFiles(query: string): Promise<string[]> {
  const filePatterns = getConfig<string[]>("targetFilePatterns", [
    "**/**.pl",
    "**/**.pm",
    "**/**.t",
  ]);
  const findPromise = await Promise.all(
    filePatterns.map((p) => vscode.workspace.findFiles(p))
  );
  const files = findPromise
    .reduce((xs, ys) => xs.concat(ys), [])
    .map((f) => f.path);
  return grepFiles(files, query);
}

const sigilRegex = /[\$@%]/;

function getSigil(
  document: vscode.TextDocument,
  identifierRange: vscode.Range
): string | undefined {
  const sigilRange = new vscode.Range(
    new vscode.Position(
      identifierRange.start.line,
      identifierRange.start.character - 1
    ),
    identifierRange.start
  );
  const sigilLike = document.getText(sigilRange);
  const m = sigilLike.match(sigilRegex);
  if (m === null) {
    return undefined;
  }
  return sigilLike;
}

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
  provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.WorkspaceEdit> {
    if (token.isCancellationRequested) {
      return;
    }
    const identifierRange = document.getWordRangeAtPosition(position);
    if (identifierRange === undefined) {
      return;
    }
    return new Promise(async (resolve, reject) => {
      const prtPath = getConfig("pathOfAppPRT", "prt");
      const editorToolsPath = getConfig("pathOfAppEditorTools", "editortools");
      const oldName = document.getText(identifierRange);
      const sigil = getSigil(document, identifierRange);
      if (sigil !== undefined) {
        const args = [
          editorToolsPath,
          "renamevariable",
          "-c",
          position.character,
          "-l",
          position.line + 1,
          "-r",
          newName,
        ];
        const source = document.getText();
        try {
          const output = cp.execSync(args.join(" "), {
            input: source,
            encoding: "utf-8",
          });
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(
              document.lineAt(0).range.start,
              document.lineAt(document.lineCount - 1).range.end
            ),
            output.toString()
          );
          resolve(edit);
        } catch (error) {
          reject(error);
        }
      } else {
        const targetFiles = await getTargetFiles(oldName);
        const argss = targetFiles.map((f) => [
          prtPath,
          "replace_token",
          oldName,
          newName,
          f,
        ]);
        await Promise.all(
          argss.map(
            (args) =>
              new Promise((innerResolve, innerReject) => {
                cp.exec(args.join(" "), (error) => {
                  if (error !== null) {
                    innerReject(error);
                    reject(error);
                  } else {
                    innerResolve();
                  }
                });
              })
          )
        );
        resolve(new vscode.WorkspaceEdit());
      }
    });
  },
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
export function deactivate() {}
