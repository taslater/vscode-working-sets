import * as vscode from "vscode"
import { basename } from "path"
import { existsSync } from "fs"

/**
 * Interface for Working Set
 */
export interface IWorkingSet {
  id: string
  label: string
  collapsibleState: vscode.TreeItemCollapsibleState
  getItems(): IWorkingSetItem[]
  setItems(...filePaths: string[]): void
  removeItem(filePath: string): void
  sort(sortType: SortType): void
  moveItem(filePath: string, direction: MoveDirection): void
}

/**
 * Interface for Working Set Item
 */
export interface IWorkingSetItem {
  readonly resourceUri: vscode.Uri
  readonly parentId: string
  readonly existsInFileSystem: boolean
  readonly command: vscode.Command
}

/**
 * Interface for Working Sets Configuration
 */
export interface IWorkingSetsConfig {
  confirmOnDelete: boolean
  saveWorkingSetsInWorkspace: boolean
  showNotifications: boolean
}

/**
 * Data structure for serializing Working Sets to storage
 */
export type StringifyableWorkingSet = {
  id: string
  label: string
  collapsibleState: number
  filePaths: string[]
}

/**
 * Data structure for serializing all Working Sets to storage
 */
export type StringifyableWorkingSets = StringifyableWorkingSet[]

/**
 * Type for Working Sets storage
 */
export type WorkspaceWorkingSets = Map<string, WorkingSet>

/**
 * A node in the Working Sets tree view (can be a WorkingSet or WorkingSetItem)
 */
export type WorkingSetsNode = WorkingSet | WorkingSetItem

/**
 * Options for creating a new Working Set
 */
export type CreateWorkingSetOptions = {
  withOpenEditors?: boolean
  initialWorkingSetItemFilePath?: string
}

/**
 * Enumeration for sort types
 */
export enum SortType {
  ASCENDING,
  DESCENDING,
}

/**
 * Enumeration for move directions
 */
export enum MoveDirection {
  UP,
  DOWN,
}

/**
 * WorkingSet class represents a collection of files
 */
export class WorkingSet extends vscode.TreeItem implements IWorkingSet {
  private items: WorkingSetItem[] = []

  constructor(
    public id: string,
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    items: WorkingSetItem[] = []
  ) {
    super(label, collapsibleState)
    this.items = items
  }

  contextValue = "workingSet"

  /**
   * Gets all items that exist in the file system
   */
  getItems(): WorkingSetItem[] {
    return this.items.filter(({ existsInFileSystem }) => existsInFileSystem)
  }

  /**
   * Gets all items, including those that don't exist in the file system
   */
  getAllItems(): WorkingSetItem[] {
    return [...this.items]
  }

  /**
   * Add files to the working set
   */
  setItems(...filePaths: string[]): void {
    const newFilePaths = filePaths.filter((filePath) => !this.hasItem(filePath))

    this.items = [
      ...this.items,
      ...newFilePaths.map(
        (newFilePath) =>
          new WorkingSetItem(vscode.Uri.file(newFilePath), this.id)
      ),
    ]

    const config = vscode.workspace.getConfiguration("workingSets")
    if (config.showNotifications && newFilePaths.length) {
      vscode.window.showInformationMessage(`File(s) added to "${this.label}"`)
    }
  }

  /**
   * Remove a file from the working set
   */
  removeItem(filePath: string): void {
    if (this.hasItem(filePath)) {
      this.items = this.items.filter(
        ({ resourceUri: { fsPath } }) => fsPath !== filePath
      )

      const config = vscode.workspace.getConfiguration("workingSets")
      if (config.showNotifications) {
        vscode.window.showInformationMessage(
          `"${basename(filePath)}" removed from "${this.label}"`
        )
      }
    }
  }

  /**
   * Sort items in the working set
   */
  sort(sortType: SortType): void {
    this.items.sort((itemA, itemB) => {
      const itemAFileName = basename(itemA.resourceUri.fsPath)
      const itemBFileName = basename(itemB.resourceUri.fsPath)

      return sortType === SortType.ASCENDING
        ? itemAFileName.localeCompare(itemBFileName)
        : itemBFileName.localeCompare(itemAFileName)
    })
  }

  /**
   * Move an item up or down in the working set
   */
  moveItem(filePath: string, direction: MoveDirection): void {
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

  /**
   * Check if the working set has an item with the given path
   */
  private hasItem(filePath: string): boolean {
    return this.items.some(({ resourceUri: { fsPath } }) => fsPath === filePath)
  }
}

/**
 * WorkingSetItem class represents a file in a working set
 */
export class WorkingSetItem extends vscode.TreeItem implements IWorkingSetItem {
  existsInFileSystem: boolean

  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly parentId: string
  ) {
    super(resourceUri, vscode.TreeItemCollapsibleState.None)
    this.existsInFileSystem = existsSync(resourceUri.fsPath)
  }

  public readonly command: vscode.Command = {
    title: "",
    command: "vscode.open",
    arguments: [this.resourceUri, { preview: false }],
  }

  contextValue = "workingSetItem"
}
