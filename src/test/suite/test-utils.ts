import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import * as os from "os"

/**
 * Test utilities for Working Sets extension tests
 */
export class TestUtils {
  private static readonly WORKING_SETS_KEY = "workingSets"
  private static testWorkspaceFolder: string | undefined
  private static testFiles: string[] = []

  /**
   * Creates a temporary workspace folder for testing
   */
  static async createTestWorkspace(): Promise<string> {
    // Create a temp directory for our test workspace
    const tempDir = path.join(
      os.tmpdir(),
      `vscode-working-sets-test-${Date.now()}`
    )
    fs.mkdirSync(tempDir, { recursive: true })

    // Create a few test files
    for (let i = 1; i <= 3; i++) {
      const filePath = path.join(tempDir, `test-file-${i}.txt`)
      fs.writeFileSync(filePath, `Test file ${i} content`)
      this.testFiles.push(filePath)
    }

    // Open the folder as a workspace
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(tempDir)
    )

    this.testWorkspaceFolder = tempDir
    return tempDir
  }

  /**
   * Cleans up the test workspace
   */
  static cleanupTestWorkspace() {
    if (this.testWorkspaceFolder && fs.existsSync(this.testWorkspaceFolder)) {
      try {
        // Delete test files
        this.testFiles.forEach((file) => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file)
          }
        })

        // Delete the temp directory
        fs.rmdirSync(this.testWorkspaceFolder, { recursive: true })
      } catch (e) {
        console.error("Failed to clean up test workspace:", e)
      }
    }
  }

  /**
   * Gets the stored working sets from workspace state
   */
  static async getWorkingSets(): Promise<any[]> {
    const workspaceState = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    return Array.isArray(workspaceState) ? workspaceState : []
  }

  /**
   * Gets a working set by name
   */
  static async getWorkingSetByName(name: string): Promise<any | undefined> {
    const workingSets = await this.getWorkingSets()
    return workingSets.find((ws) => ws.label === name)
  }

  /**
   * Gets the working set items for a working set
   */
  static async getWorkingSetItems(workingSetId: string): Promise<string[]> {
    const workingSets = await this.getWorkingSets()
    const workingSet = workingSets.find((ws) => ws.id === workingSetId)

    if (!workingSet) {
      return []
    }

    return workingSet.filePaths || []
  }

  /**
   * Gets a test file path by index (1-based)
   */
  static getTestFilePath(index: number): string {
    if (index < 1 || index > this.testFiles.length) {
      throw new Error(`Test file index out of range: ${index}`)
    }
    return this.testFiles[index - 1]
  }

  /**
   * Waits for a condition to be true
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeoutMs = 5000,
    intervalMs = 100
  ): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return true
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    return false
  }

  /**
   * Waits for a working set to exist
   */
  static async waitForWorkingSet(
    name: string,
    timeoutMs = 5000
  ): Promise<any | undefined> {
    let workingSet: any

    await this.waitForCondition(async () => {
      workingSet = await this.getWorkingSetByName(name)
      return !!workingSet
    }, timeoutMs)

    return workingSet
  }
}
