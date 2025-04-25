import * as assert from "assert"
import * as vscode from "vscode"

suite("Extension Test Suite", () => {
  test("Extension should be present", () => {
    // Verify the extension is loaded
    const extension = vscode.extensions.getExtension("bernardop.working-sets")
    assert.ok(extension, "Extension should be available")
  })

  test("Extension should activate", async () => {
    const extension = vscode.extensions.getExtension("bernardop.working-sets")
    if (!extension?.isActive) {
      await extension?.activate()
    }
    assert.strictEqual(
      extension?.isActive,
      true,
      "Extension should be activated"
    )
  })
})
