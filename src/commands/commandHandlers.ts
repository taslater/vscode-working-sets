import * as vscode from "vscode"
import {
  WorkingSet,
  WorkingSetItem,
  SortType,
  MoveDirection,
} from "../models/workingSetModels"
import { IWorkingSetsProvider } from "../providers/workingSetsViewProvider"

/**
 * Register all commands for the Working Sets extension
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  provider: IWorkingSetsProvider,
  workingSetsViewer: vscode.TreeView<WorkingSet | WorkingSetItem>
): void {
  // Register all commands first, before any other operations
  const disposables = [
    // Working set management
    vscode.commands.registerCommand("workingSets.create", () =>
      provider.create()
    ),
    vscode.commands.registerCommand("workingSets.delete", (workingSet) =>
      provider.delete(workingSet)
    ),
    vscode.commands.registerCommand("workingSets.addOpenEditors", () =>
      provider.addOpenEditors()
    ),
    vscode.commands.registerCommand(
      "workingSets.addActiveEditor",
      (workingSet) => provider.addActiveEditor(workingSet)
    ),
    vscode.commands.registerCommand("workingSets.openAll", (workingSet) =>
      provider.openAllItems(workingSet)
    ),

    // File management
    vscode.commands.registerCommand("workingSets.addFile", (fileUri) =>
      provider.addFile(fileUri)
    ),
    vscode.commands.registerCommand(
      "workingSets.removeFile",
      (workingSetItem) => provider.removeFile(workingSetItem)
    ),
    vscode.commands.registerCommand("workingSets.expand", (workingSet) =>
      reveal(workingSet)
    ),

    // Reload and sorting
    vscode.commands.registerCommand("workingSets.reload", () =>
      provider.refresh()
    ),
    vscode.commands.registerCommand(
      "workingSets.sortWorkingSetsAscending",
      () => provider.sortWorkingSets(SortType.ASCENDING)
    ),
    vscode.commands.registerCommand(
      "workingSets.sortWorkingSetsDescending",
      () => provider.sortWorkingSets(SortType.DESCENDING)
    ),
    vscode.commands.registerCommand(
      "workingSets.sortFilesAscending",
      (workingSet) => provider.sortFiles(workingSet, SortType.ASCENDING)
    ),
    vscode.commands.registerCommand(
      "workingSets.sortFilesDescending",
      (workingSet) => provider.sortFiles(workingSet, SortType.DESCENDING)
    ),

    // File movement
    vscode.commands.registerCommand(
      "workingSets.moveFileUp",
      (workingSetItem) => provider.moveFile(workingSetItem, MoveDirection.UP)
    ),
    vscode.commands.registerCommand(
      "workingSets.moveFileDown",
      (workingSetItem) => provider.moveFile(workingSetItem, MoveDirection.DOWN)
    ),

    // Test commands (only available in test mode)
    vscode.commands.registerCommand("_workingSets.getAllWorkingSets", () => {
      return (provider as any)._getAllWorkingSetsForTest?.()
    }),
    vscode.commands.registerCommand(
      "_workingSets.createForTest",
      (name: string) => {
        return (provider as any)._createForTest?.(name)
      }
    ),
    vscode.commands.registerCommand(
      "_workingSets.deleteForTest",
      (id: string) => {
        return (provider as any)._deleteForTest?.(id)
      }
    ),
    vscode.commands.registerCommand(
      "_workingSets.addFileForTest",
      (id: string, filePath: string) => {
        return (provider as any)._addFileForTest?.(id, filePath)
      }
    ),
    vscode.commands.registerCommand(
      "_workingSets.removeFileForTest",
      (id: string, filePath: string) => {
        return (provider as any)._removeFileForTest?.(id, filePath)
      }
    ),
  ]

  // Add all disposables to context
  context.subscriptions.push(...disposables)

  // Helper function to reveal a working set in the tree view
  function reveal(workingSet: WorkingSet): void {
    workingSetsViewer.reveal(workingSet, { expand: true })
  }
}
