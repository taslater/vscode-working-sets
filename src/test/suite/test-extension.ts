import * as vscode from "vscode"
import * as crypto from "crypto"

/**
 * Registers test-only commands to help with integration testing
 */
export function registerTestCommands(context: vscode.ExtensionContext): void {
  // Check if commands are already registered to avoid duplicate registration
  // This prevents errors when the extension is activated multiple times during testing

  const checkCommand = async (commandId: string): Promise<boolean> => {
    try {
      // Try to get the command to see if it's already registered
      await vscode.commands.executeCommand(commandId)
      return true
    } catch (error) {
      // Command doesn't exist yet
      return false
    }
  }

  const registerIfNotExists = async (
    commandId: string,
    callback: (...args: any[]) => any
  ): Promise<void> => {
    const exists = await checkCommand(commandId).catch(() => false)
    if (!exists) {
      context.subscriptions.push(
        vscode.commands.registerCommand(commandId, callback)
      )
    }
  }

  // Register commands safely
  registerIfNotExists("_workingSets.getWorkspaceState", async () => {
    const workspaceState = context.workspaceState.get("workingSets")
    return Array.isArray(workspaceState) ? workspaceState : []
  })

  registerIfNotExists("_workingSets.getAllWorkingSets", async () => {
    const workspaceState = context.workspaceState.get("workingSets")
    return Array.isArray(workspaceState) ? workspaceState : []
  })

  registerIfNotExists("_workingSets.createForTest", async (name: string) => {
    const uniqueId = crypto.randomBytes(16).toString("hex")
    const workingSet = {
      id: uniqueId,
      label: name,
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      filePaths: [],
    }

    // Get current working sets
    const workingSets = context.workspaceState.get("workingSets") || []

    // Add new working set
    const updatedWorkingSets = Array.isArray(workingSets)
      ? [...workingSets, workingSet]
      : [workingSet]

    // Save to workspace state
    await context.workspaceState.update("workingSets", updatedWorkingSets)

    return workingSet
  })

  registerIfNotExists("_workingSets.deleteForTest", async (id: string) => {
    // Get current working sets
    const workingSets = context.workspaceState.get("workingSets") || []

    // Filter out the working set to delete
    const updatedWorkingSets = Array.isArray(workingSets)
      ? workingSets.filter((ws: any) => ws.id !== id)
      : []

    // Save to workspace state
    await context.workspaceState.update("workingSets", updatedWorkingSets)

    return true
  })

  registerIfNotExists(
    "_workingSets.addFileForTest",
    async (workingSetId: string, filePath: string) => {
      // Get current working sets
      const workingSets = context.workspaceState.get("workingSets") || []

      if (!Array.isArray(workingSets)) {
        return false
      }

      // Find the working set
      const updatedWorkingSets = workingSets.map((ws: any) => {
        if (ws.id === workingSetId) {
          // Add file if it doesn't already exist
          const filePaths = Array.isArray(ws.filePaths) ? ws.filePaths : []
          if (!filePaths.includes(filePath)) {
            return {
              ...ws,
              filePaths: [...filePaths, filePath],
            }
          }
        }
        return ws
      })

      // Save to workspace state
      await context.workspaceState.update("workingSets", updatedWorkingSets)

      return true
    }
  )

  registerIfNotExists(
    "_workingSets.removeFileForTest",
    async (workingSetId: string, filePath: string) => {
      // Get current working sets
      const workingSets = context.workspaceState.get("workingSets") || []

      if (!Array.isArray(workingSets)) {
        return false
      }

      // Find the working set and remove the file
      const updatedWorkingSets = workingSets.map((ws: any) => {
        if (ws.id === workingSetId) {
          return {
            ...ws,
            filePaths: Array.isArray(ws.filePaths)
              ? ws.filePaths.filter((path: string) => path !== filePath)
              : [],
          }
        }
        return ws
      })

      // Save to workspace state
      await context.workspaceState.update("workingSets", updatedWorkingSets)

      return true
    }
  )
}
