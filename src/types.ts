import * as vscode from "vscode"
import { basename } from "path"
import { existsSync } from "fs"

export type WorkspaceWorkingSets = Map<string, WorkingSet>

type StringifyableWorkspaceWorkingSet = {
  id: string
  label: string
  collapsibleState: number
  filePaths: string[]
}

export type StringifyableWorkspaceWorkingSets =
  StringifyableWorkspaceWorkingSet[]

export type WorkingSetsNode = WorkingSet | WorkingSetItem

export type CreateWorkingSetOptions = {
  withOpenEditors?: boolean
  initialWorkingSetItemFilePath?: string
}

export class WorkingSet extends vscode.TreeItem {
  constructor(
    public id: string,
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    private items: WorkingSetItem[] = []
  ) {
    super(label, collapsibleState)
  }

  contextValue = "workingSet"

  getItems() {
    // Return all items regardless of whether they exist in the file system
    return this.items
  }

  setItems(...filePaths: string[]) {
    const newFilePaths = filePaths.filter((filePath) => !this.hasItem(filePath))

    this.items = [
      ...this.items,
      ...newFilePaths.map(
        (newFilePath) =>
          new WorkingSetItem(vscode.Uri.file(newFilePath), this.id)
      ),
    ]

    vscode.workspace.getConfiguration("workingSets").showNotifications &&
      newFilePaths.length &&
      vscode.window.showInformationMessage(`File(s) added to "${this.label}"`)
  }

  removeItem(filePath: string) {
    if (this.hasItem(filePath)) {
      this.items = this.items.filter(
        ({ resourceUri: { fsPath } }) => fsPath !== filePath
      )
      vscode.workspace.getConfiguration("workingSets").showNotifications &&
        vscode.window.showInformationMessage(
          `"${basename(filePath)}" removed from "${this.label}"`
        )
    }
  }

  sort(sortType: SortType) {
    this.items.sort((itemA, itemB) => {
      const itemAFileName = basename(itemA.resourceUri.fsPath)
      const itemBFileName = basename(itemB.resourceUri.fsPath)

      return sortType === SortType.ASCENDING
        ? itemAFileName.localeCompare(itemBFileName)
        : itemBFileName.localeCompare(itemAFileName)
    })
  }

  moveItem(filePath: string, direction: MoveDirection) {
    const index = this.items.findIndex(
      ({ resourceUri: { fsPath } }) => fsPath === filePath
    )
    if (direction === MoveDirection.UP && index > 0) {
      ;[this.items[index - 1], this.items[index]] = [
        this.items[index],
        this.items[index - 1],
      ]
    } else if (
      direction === MoveDirection.DOWN &&
      index !== -1 &&
      index < this.items.length - 1
    ) {
      ;[this.items[index + 1], this.items[index]] = [
        this.items[index],
        this.items[index + 1],
      ]
    }
  }

  private hasItem(filePath: string) {
    return this.items.some(({ resourceUri: { fsPath } }) => fsPath === filePath)
  }
}

export class WorkingSetItem extends vscode.TreeItem {
  private _existsInFileSystem: boolean
  // Add icon property that we'll use to indicate missing files
  iconPath?: vscode.ThemeIcon

  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly parentId: string
  ) {
    super(resourceUri, vscode.TreeItemCollapsibleState.None)

    this._existsInFileSystem = existsSync(resourceUri.fsPath)
    this.updateLabel()
    this.updateCommand()
  }

  // Dynamically check if the file exists when needed
  get existsInFileSystem(): boolean {
    try {
      // Force a more aggressive file system check
      this._existsInFileSystem = existsSync(this.resourceUri.fsPath)
      this.updateLabel()
      this.updateCommand()
      return this._existsInFileSystem
    } catch (e) {
      // If there's an error checking, assume the file doesn't exist
      this._existsInFileSystem = false
      this.updateLabel()
      this.updateCommand()
      return false
    }
  }

  // Update the display label to show if file exists or not
  private updateLabel() {
    const fileName = basename(this.resourceUri.fsPath)

    if (this._existsInFileSystem) {
      this.label = fileName
      this.description = ""
      this.tooltip = this.resourceUri.fsPath
      this.iconPath = undefined
    } else {
      this.label = `${fileName} (missing)`
      this.description = "File not found in current branch"
      this.tooltip = this.resourceUri.fsPath + " (missing in current branch)"

      // Add an icon to indicate missing files more clearly
      this.iconPath = new vscode.ThemeIcon(
        "warning",
        new vscode.ThemeColor("errorForeground")
      )
    }
  }

  // Update the command based on file existence
  private updateCommand() {
    try {
      this.command = {
        title: "",
        command: this._existsInFileSystem
          ? "vscode.open"
          : "workingSets.fileNotFound",
        arguments: this._existsInFileSystem
          ? [this.resourceUri, { preview: false }]
          : [this.resourceUri],
      }
    } catch (e) {
      console.error("Error updating command:", e)
      // Provide a safe fallback
      this.command = {
        title: "",
        command: "workingSets.fileNotFound",
        arguments: [this.resourceUri],
      }
    }
  }

  contextValue = "workingSetItem"
}

export enum SortType {
  ASCENDING,
  DESCENDING,
}

export enum MoveDirection {
  UP,
  DOWN,
}
