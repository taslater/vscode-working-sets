import * as path from "path"
import * as fs from "fs"
import * as cp from "child_process"
import {
  runTests,
  download,
  resolveCliArgsFromVSCodeExecutablePath,
} from "@vscode/test-electron"

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../")

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index")

    // Create a temp folder for test workspace
    const testWorkspace = path.resolve(__dirname, "../../test-workspace")
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true })
      // Create some test files
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join(testWorkspace, `test-file-${i}.txt`),
          `This is test file ${i} content`
        )
      }
    }

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace, "--disable-extensions"],
      extensionTestsEnv: {
        VSCODE_EXTENSION_TEST_MODE: "true",
        VSCODE_WORKING_SETS_TEST_MODE: "true",
      },
    })
  } catch (err) {
    console.error("Failed to run tests")
    process.exit(1)
  }
}

main()
