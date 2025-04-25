import * as vscode from "vscode"

/**
 * Collection of common utility functions
 */

/**
 * Create a disposable from a list of disposables
 */
export function createDisposable(
  ...disposables: vscode.Disposable[]
): vscode.Disposable {
  return {
    dispose: () => {
      for (const disposable of disposables) {
        disposable.dispose()
      }
    },
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if we're running in test mode
 */
export function isTestMode(): boolean {
  return (
    process.env.VSCODE_EXTENSION_TEST_MODE === "true" ||
    process.env.VSCODE_WORKING_SETS_TEST_MODE === "true"
  )
}

/**
 * Show a confirmation dialog, bypassing in test mode
 */
export async function showConfirmation(
  message: string,
  options?: vscode.MessageOptions
): Promise<boolean> {
  // In test mode, auto-confirm everything
  if (isTestMode()) {
    return true
  }

  const confirmation = await vscode.window.showInformationMessage(
    message,
    options || { modal: true },
    "Yes"
  )

  return confirmation === "Yes"
}
