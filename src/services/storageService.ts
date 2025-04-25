import * as vscode from "vscode"
import { access, mkdir, unlink, writeFile } from "fs/promises"
import { constants, existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import {
  WorkingSet,
  WorkingSetItem,
  StringifyableWorkingSets,
  StringifyableWorkingSet,
} from "../models/workingSetModels"

/**
 * Interface for Storage Service
 */
export interface IStorageService {
  loadWorkingSets(): Promise<WorkingSet[]>
  saveWorkingSets(workingSets: WorkingSet[]): Promise<void>
}

/**
 * Storage Service for working sets persistence
 */
export class StorageService implements IStorageService {
  private static readonly WORKING_SETS_KEY = "workingSets"

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Load working sets from storage
   */
  async loadWorkingSets(): Promise<WorkingSet[]> {
    const saveInWorkspace =
      vscode.workspace.getConfiguration(
        "workingSets"
      ).saveWorkingSetsInWorkspace
    const hasWorkspaceFolder =
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0

    let storedWorkingSets: StringifyableWorkingSets | undefined

    if (saveInWorkspace && hasWorkspaceFolder) {
      storedWorkingSets = await this.loadWorkingSetsFromFile()
    } else {
      storedWorkingSets =
        this.context.workspaceState.get<StringifyableWorkingSets>(
          StorageService.WORKING_SETS_KEY
        )
    }

    if (!storedWorkingSets) {
      // Initialize empty storage
      await this.context.workspaceState.update(
        StorageService.WORKING_SETS_KEY,
        []
      )
      return []
    }

    return this.convertFromStorageFormat(storedWorkingSets)
  }

  /**
   * Save working sets to storage
   */
  async saveWorkingSets(workingSets: WorkingSet[]): Promise<void> {
    const stringifiableWorkingSets = this.convertToStorageFormat(workingSets)
    const saveInWorkspace =
      vscode.workspace.getConfiguration(
        "workingSets"
      ).saveWorkingSetsInWorkspace
    const workspaceFolders = vscode.workspace.workspaceFolders

    if (saveInWorkspace && workspaceFolders && workspaceFolders.length) {
      await this.saveWorkingSetsToFile(stringifiableWorkingSets)
    } else {
      await this.context.workspaceState.update(
        StorageService.WORKING_SETS_KEY,
        stringifiableWorkingSets
      )
    }
  }

  /**
   * Convert working sets to storage format
   */
  private convertToStorageFormat(
    workingSets: WorkingSet[]
  ): StringifyableWorkingSets {
    const result: StringifyableWorkingSets = []

    for (const workingSet of workingSets) {
      result.push({
        id: workingSet.id,
        label: workingSet.label,
        collapsibleState: workingSet.collapsibleState,
        filePaths: workingSet
          .getAllItems()
          .map(({ resourceUri: { fsPath } }) => fsPath),
      })
    }

    return result
  }

  /**
   * Convert from storage format to working sets
   */
  private convertFromStorageFormat(
    data: StringifyableWorkingSets
  ): WorkingSet[] {
    const result: WorkingSet[] = []

    for (const { id, label, collapsibleState, filePaths } of data) {
      result.push(
        new WorkingSet(
          id,
          label,
          collapsibleState,
          filePaths.map(
            (filePath) => new WorkingSetItem(vscode.Uri.file(filePath), id)
          )
        )
      )
    }

    return result
  }

  /**
   * Load working sets from workspace file
   */
  private async loadWorkingSetsFromFile(): Promise<
    StringifyableWorkingSets | undefined
  > {
    const workspaceFolderPath =
      vscode.workspace.workspaceFolders?.[0].uri.fsPath
    if (!workspaceFolderPath) {
      return undefined
    }

    const fileName = join(workspaceFolderPath, ".vscode", "working_sets.json")

    if (!existsSync(fileName)) {
      return undefined
    }

    try {
      return JSON.parse(readFileSync(fileName).toString())
    } catch (err) {
      const errorMessage = err instanceof Error ? `: ${err.message}` : ""
      vscode.window.showErrorMessage(
        `Could not load working sets from ${fileName}${errorMessage}`
      )
      return undefined
    }
  }

  /**
   * Save working sets to workspace file
   */
  private async saveWorkingSetsToFile(
    workingSets: StringifyableWorkingSets
  ): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || !workspaceFolders.length) {
      return
    }

    const fileName = join(
      workspaceFolders[0].uri.fsPath,
      ".vscode",
      "working_sets.json"
    )

    try {
      if (workingSets.length === 0) {
        await access(fileName, constants.R_OK | constants.W_OK)
        await unlink(fileName)
      } else {
        const dirName = dirname(fileName)
        if (!existsSync(dirName)) {
          await mkdir(dirName)
        }

        await writeFile(fileName, JSON.stringify(workingSets, null, "  "))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? `: ${err.message}` : ""
      vscode.window.showErrorMessage(
        `Could not save working sets to ${fileName}${errorMessage}`
      )
    }
  }
}
