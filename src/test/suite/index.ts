import * as path from "path"
import * as Mocha from "mocha"
import * as glob from "glob"

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  })

  const testsRoot = path.resolve(__dirname, "..")

  return new Promise((c, e) => {
    // Fix the glob pattern to avoid double-matching files
    glob("*.test.js", { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err)
      }

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

      // Add test files from the suite directory separately to avoid duplicates
      glob("suite/*.test.js", { cwd: testsRoot }, (err, suiteFiles) => {
        if (err) {
          return e(err)
        }

        // Add suite files to the test suite
        suiteFiles.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

        try {
          // Run the mocha test
          mocha.run((failures) => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`))
            } else {
              c()
            }
          })
        } catch (err) {
          console.error(err)
          e(err)
        }
      })
    })
  })
}
