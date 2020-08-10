import * as vscode from "vscode";
import * as cp from "child_process";
import { promisify } from "util";

const execPromise = promisify(cp.exec);

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

const sigilRegex = /[$@%]/;

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

const checkPrtIsAvailable = (prtPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    cp.exec(`which ${prtPath}`, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
};

const checkEditorToolsIsAvailable = (
  editorToolsPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    cp.exec(`which ${editorToolsPath}`, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
};

const doRenameSymbolWithPrt = (
  oldName: string,
  newName: string
): vscode.ProviderResult<vscode.WorkspaceEdit> => {
  const prtPath = getConfig("pathOfAppPRT", "prt");
  return checkPrtIsAvailable(prtPath)
    .then(() => getTargetFiles(oldName))
    .then((targetFiles) => {
      return targetFiles.map((f) => [
        prtPath,
        "replace_token",
        oldName,
        newName,
        f,
      ]);
    })
    .then((argss) => {
      Promise.all(argss.map((args) => execPromise(args.join(" "))));
      return new vscode.WorkspaceEdit();
    });
};

const doRenameSymbolWithEditorTools = (
  document: vscode.TextDocument,
  position: vscode.Position,
  newName: string
): vscode.ProviderResult<vscode.WorkspaceEdit> => {
  const editorToolsPath = getConfig("pathOfAppEditorTools", "editortools");
  return checkEditorToolsIsAvailable(editorToolsPath).then(() => {
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
    return edit;
  });
};

export const provideRenameEditsImpl = (
  document: vscode.TextDocument,
  position: vscode.Position,
  newName: string,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.WorkspaceEdit> => {
  if (token.isCancellationRequested) {
    return;
  }
  const identifierRange = document.getWordRangeAtPosition(position);
  if (identifierRange === undefined) {
    return;
  }
  const sigil = getSigil(document, identifierRange);
  if (sigil !== undefined) {
    return doRenameSymbolWithEditorTools(document, position, newName);
  } else {
    const oldName = document.getText(identifierRange);
    return doRenameSymbolWithPrt(oldName, newName);
  }
};
