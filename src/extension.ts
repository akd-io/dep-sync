import { execa, ExecaChildProcess } from "execa";
import { dirname } from "path";
import * as vscode from "vscode";
import { LockFile } from "./types";
import { getInstallCommand } from "./utils/get-install-command";
import { lockFileToPackageManager } from "./utils/lock-file-to-package-manager";

// TODO: Implement a 1 minute cycle to check for the existence of a package.json file to watch, in case none is found.
// TODO: Implement the ability to choose what package.json files to watch and sync in large mono-repos.
// TODO: Support workspaces.
// TODO: Consider listening to lock-files, and ignoring changes to package.json if lock-files were just updated, to prevent double-installs from users running "npm install <package>".
// TODO: Running `npm i` currently modifies package-lock.json no matter what. Maybe we should check a hash before running install command.
// TODO: Consider what settings the user might want to configure, and how to expose them.
// TODO: Consider adding a walkthrough to help users get started.

const disposables: vscode.Disposable[] = [];

/**
 * A Map of currently running install processes.
 * Mapping is from current working directory to a child process.
 * This is used to prevent multiple installs from running at the same time.
 */
const runningProcesses: Map<string, ExecaChildProcess> = new Map();

export const activate = () => {
  console.log("Activating...");

  const fileNamesToWatch: LockFile[] = [
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
  ];
  for (const fileName of fileNamesToWatch) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      `**/${fileName}`,
      true,
      false,
      true
    );
    watcher.onDidChange((event) => {
      handleLockFileChange(dirname(event.fsPath), fileName);
    });
    disposables.push(watcher);
    console.log("Set up watcher for", fileName);
  }

  console.log("Activated...");
};

const handleLockFileChange = async (cwd: string, fileName: LockFile) => {
  console.log("Handling lock file change for", fileName, "in", cwd);

  if (runningProcesses.has(cwd)) {
    console.log("Skipping install. Already running an install in", cwd);
    // TODO: Add a Set of directories to run install scripts in. This way, frequent changes to one file will queue a single install command for when the current install is done.
    return;
  }

  const packageManager = lockFileToPackageManager[fileName];
  const [command, ...args] = getInstallCommand(packageManager);

  const installChildProcess = execa(command, args, { cwd });
  runningProcesses.set(cwd, installChildProcess);
  console.log("Running install command:", command, args.join(" "));

  await installChildProcess;
  runningProcesses.delete(cwd);

  if (installChildProcess.exitCode === 0) {
    const message = `Successfully ran "${command} ${args.join(" ")}" in ${cwd}`;
    console.log(message);
    vscode.window.showInformationMessage(message);
  } else {
    // TODO: Consider running install commands in Tasks, so users can be redirected to the error message in the output panel.
    const message = `Failed to run "${command} ${args.join(" ")}" in ${cwd}`;
    console.log(message);
    vscode.window.showErrorMessage(message);
  }
};

export const deactivate = () => {
  console.log("Deactivating...");
  disposables.forEach((disposable) => disposable.dispose());
  runningProcesses.forEach((disposableProcess) => disposableProcess.cancel());
  console.log("Deactivated...");
};
