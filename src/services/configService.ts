import * as vscode from "vscode"
import { IWorkingSetsConfig } from "../models/workingSetModels"

/**
 * Interface for Config Service
 */
export interface IConfigService {
  /**
   * Get the current configuration
   */
  getConfig(): IWorkingSetsConfig

  /**
   * Event fired when configuration changes
   */
  readonly onDidChangeConfiguration: vscode.Event<void>
}

/**
 * Service for handling extension configuration
 */
export class ConfigService implements IConfigService {
  private _onDidChangeConfiguration = new vscode.EventEmitter<void>()
  readonly onDidChangeConfiguration = this._onDidChangeConfiguration.event

  private readonly configurationWatcher: vscode.Disposable

  constructor() {
    // Watch for configuration changes
    this.configurationWatcher = vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("workingSets")) {
          this._onDidChangeConfiguration.fire()
        }
      }
    )
  }

  /**
   * Get the current configuration
   */
  getConfig(): IWorkingSetsConfig {
    const config = vscode.workspace.getConfiguration("workingSets")

    return {
      confirmOnDelete: config.get<boolean>("confirmOnDelete", true),
      saveWorkingSetsInWorkspace: config.get<boolean>(
        "saveWorkingSetsInWorkspace",
        false
      ),
      showNotifications: config.get<boolean>("showNotifications", true),
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.configurationWatcher.dispose()
    this._onDidChangeConfiguration.dispose()
  }
}
