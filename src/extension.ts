import * as vscode from "vscode"
import { WorkingSetsViewProvider } from "./providers/workingSetsViewProvider"
import { StorageService } from "./services/storageService"
import { ConfigService } from "./services/configService"
import { FileService } from "./services/fileService"
import { GitService } from "./services/gitService"
import { registerCommands } from "./commands/commandHandlers"
import { WorkingSet, WorkingSetItem } from "./models/workingSetModels"
import { createDisposable } from "./utils/commonUtils"

// Test utilities - only loaded during testing
let registerTestCommands:
  | ((context: vscode.ExtensionContext) => void)
  | undefined

if (process.env.VSCODE_EXTENSION_TEST_MODE === "true") {
  // Only import for tests to avoid bundling this code in production
  import("./test/suite/test-extension")
    .then((testModule) => {
      registerTestCommands = testModule.registerTestCommands
    })
    .catch((err) => console.error("Failed to load test extensions:", err))
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize services
    const storageService = new StorageService(context)
    const configService = new ConfigService()
    const fileService = new FileService()
    const gitService = new GitService()

    // Initialize provider with services
    const workingSetsProvider = new WorkingSetsViewProvider(
      storageService,
      fileService
    )

    // Create tree view
    const workingSetsViewer = vscode.window.createTreeView("workingSets", {
      treeDataProvider: workingSetsProvider,
      showCollapseAll: true,
    })

    // Register commands
    registerCommands(context, workingSetsProvider, workingSetsViewer)

    // Watch for configuration changes
    configService.onDidChangeConfiguration(() => {
      workingSetsProvider.refresh()
    })

    // Watch for Git branch changes if Git is available
    if (gitService.isAvailable) {
      gitService.onDidChangeBranch(() => {
        workingSetsProvider.refresh()
      })
    }

    // Add services to disposables
    context.subscriptions.push(
      createDisposable(
        workingSetsViewer,
        configService,
        fileService,
        gitService
      )
    )

    // Register test commands if in test mode
    if (
      process.env.VSCODE_EXTENSION_TEST_MODE === "true" &&
      registerTestCommands
    ) {
      registerTestCommands(context)
    }
  } catch (error) {
    console.error("Error activating Working Sets extension:", error)
    vscode.window.showErrorMessage(
      "Failed to activate Working Sets extension: " +
        (error instanceof Error ? error.message : String(error))
    )
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
