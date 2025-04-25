import * as assert from "assert"
import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

// Generate a unique ID for this test run to distinguish between multiple executions
const testRunId = Math.floor(Math.random() * 10000)

suite(`Working Sets Integration Tests (Run ${testRunId})`, () => {
  const testWorkingSetName = "Test Working Set"
  let testFiles: string[] = []

  // Set test mode env var to disable confirmation dialogs in the extension during tests
  process.env.VSCODE_WORKING_SETS_TEST_MODE = "true"

  suiteSetup(async function () {
    this.timeout(10000)

    // Make sure our extension is activated
    const extension = vscode.extensions.getExtension("bernardop.working-sets")
    if (!extension?.isActive) {
      await extension?.activate()
    }

    // Get test files
    const files = await vscode.workspace.findFiles("*.txt")
    testFiles = files.map((file) => file.fsPath)

    assert.ok(testFiles.length > 0, "Test files should exist in workspace")

    // Set configuration to disable confirmations
    await vscode.workspace
      .getConfiguration("workingSets")
      .update("confirmOnDelete", false, vscode.ConfigurationTarget.Global)
  })

  setup(async function () {
    this.timeout(5000)

    // Clean up any existing working sets before each test
    await clearWorkingSets()
  })

  suiteTeardown(async function () {
    this.timeout(5000)

    // Reset configuration
    await vscode.workspace
      .getConfiguration("workingSets")
      .update("confirmOnDelete", undefined, vscode.ConfigurationTarget.Global)

    // Clean up any working sets
    await clearWorkingSets()
  })

  async function clearWorkingSets() {
    // Get extension context
    const result = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const workingSets = Array.isArray(result) ? result : []

    for (const ws of workingSets) {
      await vscode.commands.executeCommand("_workingSets.deleteForTest", ws.id)
    }

    // Wait to ensure deletion is complete
    if (workingSets.length > 0) {
      await waitFor(1000)
    }
  }

  async function waitFor(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeoutMs))
  }

  test("Create and verify working set", async function () {
    this.timeout(10000)

    // Create a working set directly with a test command
    const createdSet = (await vscode.commands.executeCommand(
      "_workingSets.createForTest",
      testWorkingSetName
    )) as any
    assert.ok(createdSet, "Should successfully create working set")

    // Allow time for operation to complete
    await waitFor(1000)

    // Get working sets and verify creation
    const result = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const workingSets = Array.isArray(result) ? result : []

    assert.ok(workingSets.length > 0, "Working set should be created")

    const workingSet = workingSets.find(
      (ws: any) => ws.label === testWorkingSetName
    ) as any
    assert.ok(
      workingSet,
      `Working set with name "${testWorkingSetName}" should exist`
    )
    assert.strictEqual(
      workingSet.id,
      createdSet.id,
      "Working set ID should match"
    )
  })

  test("Add file to working set", async function () {
    this.timeout(20000)

    // Create a working set
    const createdSet = (await vscode.commands.executeCommand(
      "_workingSets.createForTest",
      testWorkingSetName
    )) as any
    assert.ok(createdSet, "Should successfully create working set")

    // Wait for state to update
    await waitFor(2000)

    // Get the created working set
    const result = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const workingSets = Array.isArray(result) ? result : []

    const workingSet = workingSets.find(
      (ws: any) => ws.id === createdSet.id
    ) as any
    assert.ok(workingSet, "Working set should exist")
    assert.strictEqual(
      workingSet.label,
      testWorkingSetName,
      "Working set name should match"
    )

    // Add file to the working set
    const addResult = await vscode.commands.executeCommand(
      "_workingSets.addFileForTest",
      workingSet.id,
      testFiles[0]
    )
    assert.strictEqual(addResult, true, "File should be added successfully")

    // Wait for state to update
    await waitFor(2000)

    // Verify file was added
    const updatedResult = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const updatedWorkingSets = Array.isArray(updatedResult) ? updatedResult : []
    const updatedWorkingSet = updatedWorkingSets.find(
      (ws: any) => ws.id === workingSet.id
    ) as any

    assert.ok(updatedWorkingSet, "Working set should still exist")
    assert.ok(
      updatedWorkingSet.filePaths,
      "Working set should have filePaths property"
    )
    assert.strictEqual(
      Array.isArray(updatedWorkingSet.filePaths),
      true,
      "filePaths should be an array"
    )
    assert.strictEqual(
      updatedWorkingSet.filePaths.length,
      1,
      "Working set should have 1 file"
    )

    // Check if the correct file was added
    const normalizedTestFile = path.normalize(testFiles[0])
    const normalizedAddedFile = path.normalize(updatedWorkingSet.filePaths[0])
    assert.strictEqual(
      normalizedAddedFile,
      normalizedTestFile,
      "The correct file should be added"
    )
  })

  test("Remove file from working set", async function () {
    this.timeout(10000)

    // Create a working set directly with a test command
    const createdSet = (await vscode.commands.executeCommand(
      "_workingSets.createForTest",
      testWorkingSetName
    )) as any
    assert.ok(createdSet, "Should successfully create working set")

    // Wait to ensure state is fully updated
    await waitFor(1000)

    // Get the created working set
    const result = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const workingSets = Array.isArray(result) ? result : []
    assert.ok(workingSets.length > 0, "Should have at least one working set")

    const workingSet = workingSets.find(
      (ws: any) => ws.label === testWorkingSetName
    ) as any
    assert.ok(workingSet, "Working set should exist")
    assert.strictEqual(
      workingSet.id,
      createdSet.id,
      "Working set ID should match"
    )

    // Add file to the working set
    const addResult = await vscode.commands.executeCommand(
      "_workingSets.addFileForTest",
      workingSet.id,
      testFiles[0]
    )
    assert.strictEqual(addResult, true, "File should be added successfully")

    // Wait to ensure state is fully updated
    await waitFor(1000)

    // Remove the file
    const removeResult = await vscode.commands.executeCommand(
      "_workingSets.removeFileForTest",
      workingSet.id,
      testFiles[0]
    )
    assert.strictEqual(
      removeResult,
      true,
      "File should be removed successfully"
    )

    // Wait to ensure state is fully updated
    await waitFor(1000)

    // Verify file was removed
    const updatedResult = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const updatedWorkingSets = Array.isArray(updatedResult) ? updatedResult : []
    const updatedWorkingSet = updatedWorkingSets.find(
      (ws: any) => ws.id === workingSet.id
    ) as any

    assert.ok(updatedWorkingSet, "Working set should still exist")
    assert.ok(
      Array.isArray(updatedWorkingSet.filePaths),
      "filePaths should be an array"
    )
    assert.strictEqual(
      updatedWorkingSet.filePaths.length,
      0,
      "Working set should have no files"
    )
  })

  test("Delete working set", async function () {
    this.timeout(10000)

    // Create a working set
    const createdSet = (await vscode.commands.executeCommand(
      "_workingSets.createForTest",
      testWorkingSetName
    )) as any
    assert.ok(createdSet, "Should successfully create working set")
    await waitFor(1000)

    // Get the created working set
    const result = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const workingSets = Array.isArray(result) ? result : []

    const workingSet = workingSets.find(
      (ws: any) => ws.label === testWorkingSetName
    ) as any
    assert.ok(workingSet, "Working set should exist")
    assert.strictEqual(
      workingSet.id,
      createdSet.id,
      "Working set ID should match"
    )

    // Delete the working set
    const deleteResult = await vscode.commands.executeCommand(
      "_workingSets.deleteForTest",
      workingSet.id
    )
    assert.strictEqual(
      deleteResult,
      true,
      "Working set should be deleted successfully"
    )
    await waitFor(1000)

    // Verify deletion
    const updatedResult = await vscode.commands.executeCommand(
      "_workingSets.getAllWorkingSets"
    )
    const updatedWorkingSets = Array.isArray(updatedResult) ? updatedResult : []
    const workingSetExists = updatedWorkingSets.some(
      (ws: any) => ws.id === workingSet.id
    )

    assert.strictEqual(workingSetExists, false, "Working set should be deleted")
  })
})
