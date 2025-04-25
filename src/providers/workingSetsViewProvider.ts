import * as vscode from "vscode"
import { randomBytes } from "crypto"
import {
  WorkingSet,
  WorkingSetItem,
  WorkingSetsNode,
  WorkspaceWorkingSets,
  CreateWorkingSetOptions,
  SortType,
  MoveDirection,
} from "../models/workingSetModels"
import { IStorageService } from "../services/storageService"
import { IFileService } from "../services/fileService"

/**
 * Interface for WorkingSets Provider
 */
export interface IWorkingSetsProvider
  extends vscode.TreeDataProvider<WorkingSetsNode> {
  // Factory methods
  create(options?: CreateWorkingSetOptions): Promise<void>

  // Handlers for working set operations
  delete(workingSet?: WorkingSet): Promise<void>
  addOpenEditors(): Promise<void>
  addActiveEditor(workingSet?: WorkingSet): Promise<void>
  addFile(uri: vscode.Uri): Promise<void>
  removeFile(workingSetItem?: WorkingSetItem): Promise<void>
  openAllItems(workingSet: WorkingSet): Promise<void>
  sortWorkingSets(sortType: SortType): void
  sortFiles(workingSet: WorkingSet, sortType: SortType): Promise<void>
  moveFile(workingSetItem: WorkingSetItem, direction: MoveDirection): void

  // Refresh the view
  refresh(): void
}

/**
 * Provider for WorkingSets view
 */
export class WorkingSetsViewProvider implements IWorkingSetsProvider {
  private _onDidChangeTreeData: vscode.EventEmitter<
    WorkingSetsNode | undefined
  > = new vscode.EventEmitter<WorkingSetsNode | undefined>()

  readonly onDidChangeTreeData: vscode.Event<WorkingSetsNode | undefined> =
    this._onDidChangeTreeData.event

  private workspaceWorkingSets: WorkspaceWorkingSets = new Map()

  private get workingSetsNames(): string[] {
    return this.workingSets.map(({ label }) => label)
  }

  private get workingSets(): WorkingSet[] {
    const result = []
    for (const workingSet of this.workspaceWorkingSets.values()) {
      result.push(workingSet)
    }
    return result
  }

  constructor(
    private readonly storageService: IStorageService,
    private readonly fileService: IFileService
  ) {
    // Load working sets when created
    this.loadWorkingSets()

    // Listen for file system changes
    this.fileService.onDidChangeFiles(() => {
      this.refresh()
    })
  }

  /**
   * Get the parent of a node
   */
  getParent(
    workingSetsNode: WorkingSetsNode
  ): vscode.ProviderResult<WorkingSetsNode> {
    if (workingSetsNode instanceof WorkingSetItem) {
      return this.workspaceWorkingSets.get(workingSetsNode.parentId)
    }
    return null
  }

  /**
   * Get a tree item
   */
  getTreeItem(workingSetsNode: WorkingSetsNode): WorkingSetsNode {
    return workingSetsNode
  }

  /**
   * Get children of a node
   */
  getChildren(workingSet?: WorkingSet): WorkingSetsNode[] {
    return workingSet ? workingSet.getItems() : this.workingSets
  }

  /**
   * Refresh the view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined)
  }

  /**
   * Load working sets from storage
   */
  private async loadWorkingSets(): Promise<void> {
    const workingSets = await this.storageService.loadWorkingSets()

    // Convert to map
    this.workspaceWorkingSets = new Map()
    for (const workingSet of workingSets) {
      this.workspaceWorkingSets.set(workingSet.id, workingSet)
    }

    this.refresh()
  }

  /**
   * Save working sets to storage
   */
  private async saveWorkingSets(): Promise<void> {
    await this.storageService.saveWorkingSets(this.workingSets)
    this.refresh()
  }

  /**
   * Create a new working set
   */
  async create(options?: CreateWorkingSetOptions): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: "New working set name",
    })
    const withOpenEditors = options?.withOpenEditors
    const initialWorkingSetItemFilePath = options?.initialWorkingSetItemFilePath

    if (name) {
      if (this.workingSetExists(name)) {
        vscode.window.showInformationMessage(
          "A working set with that name already exists"
        )
      } else {
        const uniqueId = randomBytes(16).toString("hex")
        let workingSetItems: WorkingSetItem[]

        if (withOpenEditors) {
          workingSetItems = this.fileService
            .getOpenEditorFilePaths()
            .map(
              (filePath) =>
                new WorkingSetItem(vscode.Uri.file(filePath), uniqueId)
            )
        } else if (initialWorkingSetItemFilePath) {
          workingSetItems = [
            new WorkingSetItem(
              vscode.Uri.file(initialWorkingSetItemFilePath),
              uniqueId
            ),
          ]
        } else {
          workingSetItems = []
        }

        const workingSet = new WorkingSet(
          uniqueId,
          name,
          withOpenEditors || initialWorkingSetItemFilePath
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed,
          workingSetItems
        )

        this.workspaceWorkingSets.set(uniqueId, workingSet)

        const config = vscode.workspace.getConfiguration("workingSets")
        if (config.showNotifications) {
          vscode.window.showInformationMessage(
            `"${name}" working set successfully created`
          )
        }

        if (withOpenEditors || initialWorkingSetItemFilePath) {
          await vscode.commands.executeCommand("workingSets.expand", workingSet)
        }

        await this.saveWorkingSets()
      }
    }
  }

  /**
   * Delete a working set
   */
  async delete(workingSet?: WorkingSet): Promise<void> {
    if (workingSet) {
      await this.deleteWorkingSet(workingSet.label)
    } else if (this.workingSets.length > 0) {
      const name = await vscode.window.showQuickPick(this.workingSetsNames, {
        placeHolder: "Which working set do you want to delete?",
      })
      if (name) {
        await this.deleteWorkingSet(name)
      }
    } else {
      vscode.window.showInformationMessage(
        "There are no working sets to delete"
      )
    }
  }

  /**
   * Add open editors to a working set
   */
  async addOpenEditors(): Promise<void> {
    if (this.workingSets.length > 0) {
      const workingSetNameOrNew = await vscode.window.showQuickPick([
        "New...",
        ...this.workingSetsNames,
      ])

      if (workingSetNameOrNew) {
        if (workingSetNameOrNew === "New...") {
          await this.create({ withOpenEditors: true })
        } else {
          const workingSet = this.workspaceWorkingSets.get(
            this.getWorkingSetIDByName(workingSetNameOrNew)
          )

          if (workingSet) {
            workingSet.setItems(...this.fileService.getOpenEditorFilePaths())
            await this.saveWorkingSets()
          }
        }
      }
    } else {
      await this.create({ withOpenEditors: true })
    }
  }

  /**
   * Add the active editor to a working set
   */
  async addActiveEditor(workingSet?: WorkingSet): Promise<void> {
    const activeEditorFilePath =
      vscode.window.activeTextEditor?.document.fileName

    if (activeEditorFilePath) {
      if (workingSet) {
        await this.addFilePathToWorkingSet(workingSet, activeEditorFilePath)
      } else if (this.workingSets.length > 0) {
        const workingSetNameOrNew = await vscode.window.showQuickPick([
          "New...",
          ...this.workingSetsNames,
        ])

        if (workingSetNameOrNew) {
          if (workingSetNameOrNew === "New...") {
            await this.create({
              initialWorkingSetItemFilePath: activeEditorFilePath,
            })
          } else {
            const workingSet = this.workspaceWorkingSets.get(
              this.getWorkingSetIDByName(workingSetNameOrNew)
            )

            if (workingSet) {
              workingSet.setItems(activeEditorFilePath)
              await this.saveWorkingSets()
            }
          }
        }
      } else {
        await this.create({
          initialWorkingSetItemFilePath: activeEditorFilePath,
        })
      }
    } else {
      vscode.window.showInformationMessage("No Active Editor available")
    }
  }

  /**
   * Add a file to a working set
   */
  async addFile({ scheme, fsPath }: vscode.Uri): Promise<void> {
    if (scheme === "file") {
      if (this.workingSets.length > 0) {
        const workingSetNameOrNew = await vscode.window.showQuickPick([
          "New...",
          ...this.workingSetsNames,
        ])

        if (workingSetNameOrNew) {
          if (workingSetNameOrNew === "New...") {
            await this.create({ initialWorkingSetItemFilePath: fsPath })
          } else {
            const workingSet = this.workspaceWorkingSets.get(
              this.getWorkingSetIDByName(workingSetNameOrNew)
            )

            if (workingSet) {
              workingSet.setItems(fsPath)
              await this.saveWorkingSets()
            }
          }
        }
      } else {
        await this.create({ initialWorkingSetItemFilePath: fsPath })
      }
    } else {
      vscode.window.showInformationMessage(
        "You are trying to add a resource that is not a file. Please try again."
      )
    }
  }

  /**
   * Remove a file from a working set
   */
  async removeFile(workingSetItem?: WorkingSetItem): Promise<void> {
    if (workingSetItem) {
      const workingSet = this.workspaceWorkingSets.get(workingSetItem.parentId)

      if (workingSet) {
        workingSet.removeItem(workingSetItem.resourceUri.fsPath)
        await this.saveWorkingSets()
      }
    } else if (this.workingSets.length > 0) {
      const workingSetName = await vscode.window.showQuickPick(
        this.workingSetsNames,
        {
          placeHolder: "Which working set do you want to remove a file from?",
        }
      )

      if (workingSetName) {
        const workingSet = this.workspaceWorkingSets.get(
          this.getWorkingSetIDByName(workingSetName)
        )

        if (workingSet) {
          const filePath = await vscode.window.showQuickPick(
            this.getWorkingSetItemsQuickPickItems(workingSet),
            {
              placeHolder: `Which file do you want to remove from "${workingSetName}"?`,
              matchOnDetail: true,
            }
          )

          if (filePath?.detail) {
            workingSet.removeItem(filePath.detail)
            await this.saveWorkingSets()
          }
        }
      }
    } else {
      vscode.window.showInformationMessage(
        "There are no working sets to remove files from"
      )
    }
  }

  /**
   * Open all files in a working set
   */
  async openAllItems(workingSet: WorkingSet): Promise<void> {
    if (workingSet) {
      await this.openWorkingSetItems(workingSet)
    } else {
      const workingSetName = await vscode.window.showQuickPick(
        this.workingSetsNames,
        {
          placeHolder: "Which working set do you want to open?",
        }
      )

      if (workingSetName) {
        const workingSet = this.workspaceWorkingSets.get(
          this.getWorkingSetIDByName(workingSetName)
        )
        if (workingSet) {
          await this.openWorkingSetItems(workingSet)
        }
      }
    }
  }

  /**
   * Sort working sets by name
   */
  sortWorkingSets(sortType: SortType): void {
    this.workspaceWorkingSets = new Map(
      [...this.workspaceWorkingSets.entries()].sort(
        (workingSetA, workingSetB) => {
          return sortType === SortType.ASCENDING
            ? workingSetA[1].label.localeCompare(workingSetB[1].label)
            : workingSetB[1].label.localeCompare(workingSetA[1].label)
        }
      )
    )
    this.saveWorkingSets()
  }

  /**
   * Sort files in a working set
   */
  async sortFiles(workingSet: WorkingSet, sortType: SortType): Promise<void> {
    if (workingSet) {
      this.sortWorkingSetFiles(workingSet, sortType)
    } else {
      const workingSetName = await vscode.window.showQuickPick(
        this.workingSetsNames,
        {
          placeHolder: "Which working set do you want to sort?",
        }
      )

      if (workingSetName) {
        const workingSet = this.workspaceWorkingSets.get(
          this.getWorkingSetIDByName(workingSetName)
        )
        if (workingSet) {
          this.sortWorkingSetFiles(workingSet, sortType)
        }
      }
    }
  }

  /**
   * Sort files in a working set
   */
  private sortWorkingSetFiles(
    workingSet: WorkingSet,
    sortType: SortType
  ): void {
    workingSet.sort(sortType)
    this.saveWorkingSets()
  }

  /**
   * Move a file up or down in a working set
   */
  moveFile(workingSetItem: WorkingSetItem, direction: MoveDirection): void {
    if (!workingSetItem) {
      return
    }
    const workingSet = this.workspaceWorkingSets.get(workingSetItem.parentId)
    if (workingSet) {
      workingSet.moveItem(workingSetItem.resourceUri.fsPath, direction)
      this.saveWorkingSets()
    }
  }

  /**
   * Check if a working set with the given name exists
   */
  private workingSetExists(name: string): boolean {
    return this.workspaceWorkingSets.has(this.getWorkingSetIDByName(name))
  }

  /**
   * Delete a working set
   */
  private async deleteWorkingSet(name: string): Promise<void> {
    const performDelete = async () => {
      this.workspaceWorkingSets.delete(this.getWorkingSetIDByName(name))

      const config = vscode.workspace.getConfiguration("workingSets")
      if (config.showNotifications) {
        vscode.window.showInformationMessage(
          `"${name}" working set successfully deleted`
        )
      }

      await this.saveWorkingSets()
    }

    // Skip confirmation if we're in test mode
    if (process.env.VSCODE_WORKING_SETS_TEST_MODE === "true") {
      await performDelete()
      return
    }

    const config = vscode.workspace.getConfiguration("workingSets")
    if (config.confirmOnDelete) {
      const confirmation = await vscode.window.showInformationMessage(
        `Are you sure you want to delete "${name}"?`,
        { modal: true },
        "Yes"
      )
      if (confirmation === "Yes") {
        await performDelete()
      }
    } else {
      await performDelete()
    }
  }

  /**
   * Add a file to a working set
   */
  private async addFilePathToWorkingSet(
    workingSet: WorkingSet,
    filePath: string
  ): Promise<void> {
    const targetWorkingSet = this.workspaceWorkingSets.get(workingSet.id)
    if (targetWorkingSet) {
      targetWorkingSet.setItems(filePath)
      await vscode.commands.executeCommand("workingSets.expand", workingSet)
      await this.saveWorkingSets()
    }
  }

  /**
   * Get the ID of a working set by its name
   */
  private getWorkingSetIDByName(name: string): string {
    return this.workingSets.find(({ label }) => name === label)?.id || ""
  }

  /**
   * Get quick pick items for working set items
   */
  private getWorkingSetItemsQuickPickItems(
    workingSet: WorkingSet
  ): vscode.QuickPickItem[] {
    const { basename } = require("path")
    return workingSet.getItems().map(({ label, resourceUri: { fsPath } }) => ({
      label: label || basename(fsPath),
      detail: fsPath,
    })) as vscode.QuickPickItem[]
  }

  /**
   * Open all files in a working set
   */
  private async openWorkingSetItems(workingSet: WorkingSet): Promise<void> {
    const workingSetItems = workingSet.getItems()
    if (workingSetItems.length > 0) {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors")

      for (const { resourceUri } of workingSetItems) {
        await vscode.commands.executeCommand("vscode.open", resourceUri, {
          preview: false,
        })
      }
    } else {
      vscode.window.showInformationMessage(
        `"${workingSet.label}" does not have any items to open`
      )
    }
  }

  /**
   * For testing: Get all working sets
   */
  _getAllWorkingSetsForTest(): any[] {
    return this.workingSets.map((ws) => ({
      id: ws.id,
      label: ws.label,
      filePaths: ws.getAllItems().map((item) => item.resourceUri.fsPath),
    }))
  }

  /**
   * For testing: Create a working set
   */
  _createForTest(name: string): any {
    const uniqueId = randomBytes(16).toString("hex")
    const workingSet = new WorkingSet(
      uniqueId,
      name,
      vscode.TreeItemCollapsibleState.Collapsed
    )
    this.workspaceWorkingSets.set(uniqueId, workingSet)
    this.saveWorkingSets()
    return { id: uniqueId, label: name }
  }

  /**
   * For testing: Delete a working set
   */
  _deleteForTest(id: string): boolean {
    const result = this.workspaceWorkingSets.delete(id)
    this.saveWorkingSets()
    return result
  }

  /**
   * For testing: Add a file to a working set
   */
  _addFileForTest(id: string, filePath: string): boolean {
    const workingSet = this.workspaceWorkingSets.get(id)
    if (!workingSet) {
      return false
    }
    workingSet.setItems(filePath)
    this.saveWorkingSets()
    return true
  }

  /**
   * For testing: Remove a file from a working set
   */
  _removeFileForTest(id: string, filePath: string): boolean {
    const workingSet = this.workspaceWorkingSets.get(id)
    if (!workingSet) {
      return false
    }
    workingSet.removeItem(filePath)
    this.saveWorkingSets()
    return true
  }
}
