// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
import { WorkingSetsExplorer } from "./workingSets"

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
  new WorkingSetsExplorer(context)

  // Register test commands if in test mode
  if (
    process.env.VSCODE_EXTENSION_TEST_MODE === "true" &&
    registerTestCommands
  ) {
    registerTestCommands(context)
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
