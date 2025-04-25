import * as vscode from "vscode"

/**
 * Interface for Git Service
 */
export interface IGitService {
  /**
   * Whether Git functionality is available
   */
  readonly isAvailable: boolean

  /**
   * Event fired when the Git branch changes
   */
  readonly onDidChangeBranch: vscode.Event<void>

  /**
   * Get the current branch name
   */
  getCurrentBranch(): string | undefined
}

/**
 * Service for Git integration
 */
export class GitService implements IGitService {
  private _onDidChangeBranch = new vscode.EventEmitter<void>()
  readonly onDidChangeBranch = this._onDidChangeBranch.event

  private gitExtension: any
  private repositoryWatchers: vscode.Disposable[] = []

  constructor() {
    // Try to get the Git extension
    this.initGitExtension()

    // Watch for Git extension becoming available
    vscode.extensions.onDidChange(() => {
      if (!this.gitExtension) {
        this.initGitExtension()
      }
    })
  }

  /**
   * Whether Git functionality is available
   */
  get isAvailable(): boolean {
    return !!this.gitExtension && !!this.gitExtension.getAPI(1)
  }

  /**
   * Get the current branch name
   */
  getCurrentBranch(): string | undefined {
    if (!this.isAvailable) {
      return undefined
    }

    try {
      const api = this.gitExtension.getAPI(1)
      const repositories = api.repositories

      if (repositories.length === 0) {
        return undefined
      }

      // Just use the first repository for now
      // In the future, we could make this more sophisticated to handle multiple repositories
      return repositories[0].state.HEAD?.name || undefined
    } catch (err) {
      console.error("Error getting current branch:", err)
      return undefined
    }
  }

  /**
   * Initialize the Git extension
   */
  private initGitExtension(): void {
    const gitExtension = vscode.extensions.getExtension("vscode.git")

    if (gitExtension && gitExtension.isActive) {
      this.gitExtension = gitExtension.exports
      this.setupRepositoryWatchers()
    } else if (gitExtension) {
      gitExtension.activate().then(
        () => {
          this.gitExtension = gitExtension.exports
          this.setupRepositoryWatchers()
        },
        (err) => {
          console.error("Failed to activate Git extension:", err)
        }
      )
    }
  }

  /**
   * Set up watchers for repository state changes
   */
  private setupRepositoryWatchers(): void {
    if (!this.isAvailable) {
      return
    }

    // Dispose any existing watchers
    this.disposeRepositoryWatchers()

    try {
      const api = this.gitExtension.getAPI(1)

      // Watch for repositories being added or removed
      this.repositoryWatchers.push(
        api.onDidOpenRepository((repo: any) => {
          this.watchRepository(repo)
        }),
        api.onDidCloseRepository(() => {
          // Re-setup watchers when repositories change
          this.disposeRepositoryWatchers()
          this.setupRepositoryWatchers()
        })
      )

      // Set up watchers for existing repositories
      for (const repo of api.repositories) {
        this.watchRepository(repo)
      }
    } catch (err) {
      console.error("Error setting up repository watchers:", err)
    }
  }

  /**
   * Watch a repository for changes
   */
  private watchRepository(repository: any): void {
    this.repositoryWatchers.push(
      repository.state.onDidChange(() => {
        this._onDidChangeBranch.fire()
      })
    )
  }

  /**
   * Dispose repository watchers
   */
  private disposeRepositoryWatchers(): void {
    for (const disposable of this.repositoryWatchers) {
      disposable.dispose()
    }
    this.repositoryWatchers = []
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disposeRepositoryWatchers()
    this._onDidChangeBranch.dispose()
  }
}
