import * as vscode from "vscode"
import { existsSync } from "fs"

/**
 * Interface for File Service
 */
export interface IFileService {
  /**
   * Check if a file exists
   */
  fileExists(path: string): boolean

  /**
   * Event fired when files change
   */
  readonly onDidChangeFiles: vscode.Event<void>

  /**
   * Get all open editor file paths
   */
  getOpenEditorFilePaths(): string[]
}

/**
 * Service for file system operations
 */
export class FileService implements IFileService {
  private _onDidChangeFiles = new vscode.EventEmitter<void>()
  readonly onDidChangeFiles = this._onDidChangeFiles.event

  private fileSystemWatcher: vscode.FileSystemWatcher

  constructor() {
    // Watch for file changes that might affect our working sets
    this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*")

    // File events that might affect our working sets
    this.fileSystemWatcher.onDidCreate(() => this._onDidChangeFiles.fire())
    this.fileSystemWatcher.onDidDelete(() => this._onDidChangeFiles.fire())
    this.fileSystemWatcher.onDidChange(() => this._onDidChangeFiles.fire())
  }

  /**
   * Check if a file exists in the file system
   */
  fileExists(path: string): boolean {
    return existsSync(path)
  }

  /**
   * Get all open editor file paths
   */
  getOpenEditorFilePaths(): string[] {
    // Use tab groups API to get all open editors
    return vscode.window.tabGroups.all.reduce<string[]>(
      (filePaths, currentTabGroup) => {
        const tabGroupFilePaths = currentTabGroup.tabs
          .filter((tab) => tab.input instanceof vscode.TabInputText)
          .map((tab) => {
            const tabInput = tab.input as vscode.TabInputText
            return tabInput.uri.fsPath
          })

        return [...filePaths, ...tabGroupFilePaths]
      },
      []
    )
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.fileSystemWatcher.dispose()
    this._onDidChangeFiles.dispose()
  }
}
