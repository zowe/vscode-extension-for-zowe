/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 *
 */

import * as globals from "../globals";
import * as vscode from "vscode";
import * as refreshActions from "./refresh";
import * as sharedActions from "./actions";
import { FileManagement, IZoweTree, IZoweTreeNode, Validation, ZoweLogger } from "@zowe/zowe-explorer-api";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";
import { Profiles } from "../Profiles";
import { hideTempFolder, moveTempFolder } from "../utils/TempFolder";
import { TsoCommandHandler } from "../command/TsoCommandHandler";
import { MvsCommandHandler } from "../command/MvsCommandHandler";
import { UnixCommandHandler } from "../command/UnixCommandHandler";
import { saveFile } from "../dataset/actions";
import { saveUSSFile } from "../uss/actions";
import { ProfilesUtils } from "../utils/ProfilesUtils";
import { LoggerUtils } from "../utils/LoggerUtils";
import { ZoweSaveQueue } from "../abstract/ZoweSaveQueue";
import { SettingsConfig } from "@zowe/zowe-explorer-api/src/utils/SettingsConfig";
import { spoolFilePollEvent } from "../job/actions";
import { HistoryView } from "./HistoryView";
import { ProfileManagement } from "../utils/ProfileManagement";
import { LocalFileManagement } from "../utils/LocalFileManagement";
import { TreeProviders } from "./TreeProviders";
import { IZoweProviders } from "./IZoweProviders";

export function registerRefreshCommand(
    context: vscode.ExtensionContext,
    activate: (_context: vscode.ExtensionContext) => Promise<ZoweExplorerApiRegister>,
    deactivate: () => Promise<void>
): void {
    ZoweLogger.trace("shared.init.registerRefreshCommand called.");
    // set a command to silently reload extension
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.extRefresh", async () => {
            await deactivate();
            for (const sub of context.subscriptions) {
                try {
                    await sub.dispose();
                } catch (e) {
                    ZoweLogger.error(e);
                }
            }
            await activate(context);
        })
    );
}

export function registerCommonCommands(context: vscode.ExtensionContext, providers: IZoweProviders): void {
    ZoweLogger.trace("shared.init.registerCommonCommands called.");

    // Update imperative.json to false only when VS Code setting is set to false
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.updateSecureCredentials", (customCredentialManager?: string) => {
            ProfilesUtils.updateCredentialManagerSetting(customCredentialManager);
            ProfilesUtils.writeOverridesFile();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.manualPoll", async (_args) => {
            if (vscode.window.activeTextEditor) {
                // Notify spool provider for "manual poll" key event in open spool files
                const doc = vscode.window.activeTextEditor.document;
                if (doc.uri.scheme === "zosspool") {
                    await spoolFilePollEvent(doc);
                }
            }
        })
    );

    // Webview for editing persistent items on Zowe Explorer
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.editHistory", () => {
            return new HistoryView(context, providers);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.promptCredentials", async (node: IZoweTreeNode) => {
            await ProfilesUtils.promptCredentials(node);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.profileManagement", async (node: IZoweTreeNode) => {
            await ProfileManagement.manageProfile(node);
        })
    );

    // Register functions & event listeners
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            // If the log folder location has been changed, update current log folder preference
            if (e.affectsConfiguration(Constants.Settings.LOGS_FOLDER_PATH)) {
                await initZoweLogger(context);
            }
            // If the temp folder location has been changed, update current temp folder preference
            if (e.affectsConfiguration(Constants.Settings.TEMP_FOLDER_PATH)) {
                const updatedPreferencesTempPath: string = SettingsConfig.getDirectValue(Constants.Settings.TEMP_FOLDER_PATH);
                await moveTempFolder(Constants.Settings.TEMP_FOLDER_LOCATION, updatedPreferencesTempPath);
            }
            if (e.affectsConfiguration(Constants.Settings.AUTOMATIC_PROFILE_VALIDATION)) {
                await Profiles.getInstance().refresh(ZoweExplorerApiRegister.getInstance());
                await refreshActions.refreshAll(providers.ds);
                await refreshActions.refreshAll(providers.uss);
                await refreshActions.refreshAll(providers.job);
            }
            if (e.affectsConfiguration(Constants.Settings.TEMP_FOLDER_HIDE)) {
                await hideTempFolder(FileManagement.getZoweDir());
            }

            if (e.affectsConfiguration(Constants.Settings.SECURE_CREDENTIALS_ENABLED)) {
                await vscode.commands.executeCommand("zowe.updateSecureCredentials");
            }
            if (e.affectsConfiguration(globals.LOGGER_SETTINGS)) {
                await vscode.commands.executeCommand("zowe.extRefresh");
            }
        })
    );

    if (providers.ds || providers.uss) {
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.openRecentMember", () => sharedActions.openRecentMemberPrompt(providers.ds, providers.uss))
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.searchInAllLoadedItems", async () =>
                sharedActions.searchInAllLoadedItems(providers.ds, providers.uss)
            )
        );
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument((savedFile) => {
                ZoweLogger.debug(
                    vscode.l10n.t({
                        message: `File was saved -- determining whether the file is a USS file or Data set.
                        \n Comparing (case insensitive) {0} against directory {1} and {2}`,
                        args: [savedFile.fileName, globals.DS_DIR, globals.USS_DIR],
                        comment: ["Saved file name", "Data Set directory", "USS directory"],
                    })
                );
                if (savedFile.fileName.toUpperCase().indexOf(globals.DS_DIR.toUpperCase()) >= 0) {
                    ZoweLogger.debug(vscode.l10n.t("File is a Data Set-- saving "));
                    ZoweSaveQueue.push({ uploadRequest: saveFile, savedFile, fileProvider: providers.ds });
                } else if (savedFile.fileName.toUpperCase().indexOf(globals.USS_DIR.toUpperCase()) >= 0) {
                    ZoweLogger.debug(vscode.l10n.t("File is a USS file -- saving"));
                    ZoweSaveQueue.push({ uploadRequest: saveUSSFile, savedFile, fileProvider: providers.uss });
                } else {
                    ZoweLogger.debug(
                        vscode.l10n.t({
                            message: "File {0} is not a Data Set or USS file",
                            args: [savedFile.fileName],
                            comment: ["Saved file name"],
                        })
                    );
                }
            })
        );
    }
    if (providers.ds || providers.uss || providers.job) {
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.ds.deleteProfile", async (node) =>
                Profiles.getInstance().deleteProfile(providers.ds, providers.uss, providers.job, node)
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.cmd.deleteProfile", async () =>
                Profiles.getInstance().deleteProfile(providers.ds, providers.uss, providers.job)
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.uss.deleteProfile", async (node) =>
                Profiles.getInstance().deleteProfile(providers.ds, providers.uss, providers.job, node)
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.jobs.deleteProfile", async (node) =>
                Profiles.getInstance().deleteProfile(providers.ds, providers.uss, providers.job, node)
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.issueTsoCmd", async (node?, command?) => {
                if (node) {
                    await TsoCommandHandler.getInstance().issueTsoCommand(node.session, command, node);
                } else {
                    await TsoCommandHandler.getInstance().issueTsoCommand();
                }
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.issueUnixCmd", async (node?, command?) => {
                if (node) {
                    await UnixCommandHandler.getInstance().issueUnixCommand(node.session, command, node);
                } else {
                    await UnixCommandHandler.getInstance().issueUnixCommand();
                }
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.issueMvsCmd", async (node?, command?) => {
                if (node) {
                    await MvsCommandHandler.getInstance().issueMvsCommand(node.session, command, node);
                } else {
                    await MvsCommandHandler.getInstance().issueMvsCommand();
                }
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.selectForCompare", (node: IZoweTreeNode) => {
                LocalFileManagement.selectFileForCompare(node);
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.compareWithSelected", async (node: IZoweTreeNode) => {
                await LocalFileManagement.compareChosenFileContent(node);
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.compareWithSelectedReadOnly", async (node: IZoweTreeNode) => {
                await LocalFileManagement.compareChosenFileContent(node, true);
            })
        );
        context.subscriptions.push(
            vscode.commands.registerCommand("zowe.compareFileStarted", () => {
                return globals.FILE_SELECTED_TO_COMPARE;
            })
        );
        // initialize the globals.filesToCompare array during initialization
        globals.resetCompareChoices();
    }
}

export function watchConfigProfile(context: vscode.ExtensionContext, providers: IZoweProviders): void {
    ZoweLogger.trace("shared.init.watchConfigProfile called.");
    const watchers: vscode.FileSystemWatcher[] = [];
    watchers.push(
        vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(FileManagement.getZoweDir(), "{zowe.config,zowe.config.user}.json"))
    );

    if (vscode.workspace.workspaceFolders?.[0] != null) {
        watchers.push(
            vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(vscode.workspace.workspaceFolders[0].uri.fsPath, "{zowe.config,zowe.config.user}.json")
            )
        );
    }

    context.subscriptions.push(...watchers);

    watchers.forEach((watcher) => {
        watcher.onDidCreate(async () => {
            ZoweLogger.info(vscode.l10n.t("Team config file created, refreshing Zowe Explorer."));
            await vscode.commands.executeCommand("zowe.extRefresh");
            ZoweExplorerApiRegister.getInstance().onProfilesUpdateEmitter.fire(Validation.EventType.CREATE);
        });
        watcher.onDidDelete(async () => {
            ZoweLogger.info(vscode.l10n.t("Team config file deleted, refreshing Zowe Explorer."));
            await vscode.commands.executeCommand("zowe.extRefresh");
            ZoweExplorerApiRegister.getInstance().onProfilesUpdateEmitter.fire(Validation.EventType.DELETE);
        });
        watcher.onDidChange(async (uri: vscode.Uri) => {
            ZoweLogger.info(vscode.l10n.t("Team config file updated."));
            const newProfileContents = await vscode.workspace.fs.readFile(uri);
            if (newProfileContents.toString() === globals.SAVED_PROFILE_CONTENTS.toString()) {
                return;
            }
            globals.setSavedProfileContents(newProfileContents);
            await refreshActions.refreshAll(providers.ds);
            await refreshActions.refreshAll(providers.uss);
            await refreshActions.refreshAll(providers.job);
            ZoweExplorerApiRegister.getInstance().onProfilesUpdateEmitter.fire(Validation.EventType.UPDATE);
        });
    });
}

export function initSubscribers(context: vscode.ExtensionContext, theProvider: IZoweTree<IZoweTreeNode>): void {
    ZoweLogger.trace("shared.init.initSubscribers called.");
    const theTreeView = theProvider.getTreeView();
    context.subscriptions.push(theTreeView);
    theTreeView.onDidCollapseElement(async (e) => {
        await theProvider.flipState(e.element, false);
    });
    theTreeView.onDidExpandElement(async (e) => {
        await theProvider.flipState(e.element, true);
    });
}

/**
 * Listener for when Zowe button is clicked on activity bar,
 * this event only fires one time upon clicking the Zowe button the first time.
 * @returns Promise<void>
 */
export async function watchForZoweButtonClick(): Promise<void> {
    const availableTreeProviders: string[] = Object.keys(TreeProviders.providers).filter(
        (provider) => (TreeProviders.providers[provider] as IZoweTree<IZoweTreeNode>).getTreeView() !== undefined
    );
    if (!availableTreeProviders.length) {
        return;
    }
    for (const availableTreeProvider of availableTreeProviders) {
        const treeView: vscode.TreeView<IZoweTreeNode> = TreeProviders.providers[availableTreeProvider].getTreeView();
        // handle case where Zowe Explorer is already visible when loading VS Code
        if (treeView.visible) {
            await initZoweExplorerUI();
        }
        // Wait for visible tree provider and activate UI
        treeView.onDidChangeVisibility(async () => {
            await initZoweExplorerUI();
        });
    }
}

export async function initZoweLogger(context: vscode.ExtensionContext): Promise<void> {
    const logsPath = await ZoweLogger.initializeZoweLogger(context);
    ZoweLogger.zeOutputChannel = await LoggerUtils.initVscLogger(context, logsPath);
}

/**
 * Initialize Zowe Explorer UI functions
 * Function can only run one time during runtime, otherwise it will immediately return
 * @returns Promise<void>
 */
async function initZoweExplorerUI(): Promise<void> {
    if (globals.ACTIVATED) {
        return;
    }
    const tempPath: string = SettingsConfig.getDirectValue(Constants.Settings.TEMP_FOLDER_PATH);
    globals.defineGlobals(tempPath);
    await hideTempFolder(FileManagement.getZoweDir());
    ProfilesUtils.initializeZoweTempFolder();
    await SettingsConfig.standardizeSettings();
    globals.setActivated(true);
}
