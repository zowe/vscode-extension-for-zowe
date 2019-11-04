/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import * as zowe from "@brightside/core";
import { IProfileLoaded, Logger } from "@brightside/imperative";
import * as path from "path";
import * as vscode from "vscode";
import * as nls from "vscode-nls";
import * as extension from "../src/extension";
import { PersistentFilters } from "./PersistentFilters";
import { Profiles } from "./Profiles";
import * as utils from "./utils";
import { ZoweNode } from "./ZoweNode";
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

/**
 * Creates the Dataset tree that contains nodes of sessions and data sets
 *
 * @export
 */
export async function createDatasetTree(log: Logger) {
    const tree = new DatasetTree();
    await tree.initialize(log);
    await tree.addSession();
    return tree;
}

/**
 * A tree that contains nodes of sessions and data sets
 *
 * @export
 * @class DatasetTree
 * @implements {vscode.TreeDataProvider}
 */
export class DatasetTree implements vscode.TreeDataProvider<ZoweNode> {

    private static readonly persistenceSchema: string = "Zowe-DS-Persistent";
    private static readonly defaultDialogText: string = "\uFF0B " + localize("ussFilterPrompt.option.prompt.search", "Create a new filter");

    public mSessionNodes: ZoweNode[];
    public mFavoriteSession: ZoweNode;
    public mFavorites: ZoweNode[] = [];

    // Event Emitters used to notify subscribers that the refresh event has fired
    public mOnDidChangeTreeData: vscode.EventEmitter<ZoweNode | undefined> = new vscode.EventEmitter<ZoweNode | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<ZoweNode | undefined> = this.mOnDidChangeTreeData.event;
    private mHistory: PersistentFilters;
    private log: Logger;

    constructor() {
        this.mFavoriteSession = new ZoweNode(localize("FavoriteSession", "Favorites"), vscode.TreeItemCollapsibleState.Collapsed, null, null);
        this.mFavoriteSession.contextValue = extension.FAVORITE_CONTEXT;
        this.mFavoriteSession.iconPath = utils.applyIcons(this.mFavoriteSession);
        this.mSessionNodes = [this.mFavoriteSession];
        this.mHistory = new PersistentFilters(DatasetTree.persistenceSchema);
    }

    /**
     * Initializes the tree based on favorites held in persistent store
     *
     * @param {Logger} log
     */
    public async initialize(log: Logger) {
        this.log = log;
        this.log.debug(localize("initializeFavorites.log.debug", "initializing favorites"));
        const lines: string[] = this.mHistory.readFavorites();
        for (const line of lines) {
            if (line === "") {
                continue;
            }
            // validate line
            const favoriteDataSetPattern = /^\[.+\]\:\s[a-zA-Z#@\$][a-zA-Z0-9#@\$\-]{0,7}(\.[a-zA-Z#@\$][a-zA-Z0-9#@\$\-]{0,7})*\{p?ds\}$/;
            const favoriteSearchPattern = /^\[.+\]\:\s.*\{session\}$/;
            if (favoriteDataSetPattern.test(line)) {
                const sesName = line.substring(1, line.lastIndexOf("]")).trim();
                try {
                    const zosmfProfile = Profiles.getInstance().loadNamedProfile(sesName);
                    const session = zowe.ZosmfSession.createBasicZosmfSession(zosmfProfile.profile);
                    let node: ZoweNode;
                    if (line.substring(line.indexOf("{") + 1, line.lastIndexOf("}")) === extension.DS_PDS_CONTEXT) {
                        node = new ZoweNode(line.substring(0, line.indexOf("{")), vscode.TreeItemCollapsibleState.Collapsed,
                            this.mFavoriteSession, session);
                    } else {
                        node = new ZoweNode(line.substring(0, line.indexOf("{")), vscode.TreeItemCollapsibleState.None,
                            this.mFavoriteSession, session);
                        node.command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [node] };
                    }
                    node.contextValue += extension.FAV_SUFFIX;
                    node.iconPath = utils.applyIcons(node);
                    this.mFavorites.push(node);
                } catch(e) {
                    vscode.window.showErrorMessage(
                        localize("initializeFavorites.error.profile1",
                        "Error: You have Zowe Data Set favorites that refer to a non-existent CLI profile named: ") + sesName +
                        localize("intializeFavorites.error.profile2",
                        ". To resolve this, you can create a profile with this name, ") +
                        localize("initializeFavorites.error.profile3",
                        "or remove the favorites with this profile name from the Zowe-DS-Persistent setting, ") +
                        localize("initializeFavorites.error.profile4", "which can be found in your VS Code user settings."));
                    continue;
                }
            } else if (favoriteSearchPattern.test(line)) {
                const node = new ZoweNode(line.substring(0, line.lastIndexOf("{")),
                    vscode.TreeItemCollapsibleState.None, this.mFavoriteSession, null);
                node.command = { command: "zowe.pattern", title: "", arguments: [node] };
                const light = path.join(__dirname, "..", "..", "resources", "light", "pattern.svg");
                const dark = path.join(__dirname, "..", "..", "resources", "dark", "pattern.svg");
                node.iconPath = { light, dark };
                node.contextValue = extension.DS_SESSION_CONTEXT + extension.FAV_SUFFIX;
                node.iconPath = utils.applyIcons(node);
                this.mFavorites.push(node);
            } else {
                vscode.window.showErrorMessage(localize("initializeFavorites.fileCorrupted", "Favorites file corrupted: ") + line);
            }
        }
    }

    /**
     * Takes argument of type ZoweNode and returns it converted to a general [TreeItem]
     *
     * @param {ZoweNode} element
     * @returns {vscode.TreeItem}
     */
    public getTreeItem(element: ZoweNode): vscode.TreeItem {
        return element;
    }

    /**
     * Takes argument of type ZoweNode and retrieves all of the first level children
     *
     * @param {ZoweNode} [element] - Optional parameter; if not passed, returns root session nodes
     * @returns {ZoweNode[] | Promise<ZoweNode[]>}
     */
    public getChildren(element?: ZoweNode): ZoweNode[] | Promise<ZoweNode[]> {
        if (element) {
            if (element.contextValue === extension.FAVORITE_CONTEXT) {
                return this.mFavorites;
            }
            return element.getChildren();
        }
        return this.mSessionNodes;
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refresh(): void {
        this.mOnDidChangeTreeData.fire();
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refreshElement(element: ZoweNode): void {
        element.dirty = true;
        this.mOnDidChangeTreeData.fire(element);
    }

    /**
     * Returns the parent node or null if it has no parent
     *
     * @param {ZoweNode} element
     * @returns {vscode.ProviderResult<ZoweNode>}
     */
    public getParent(element: ZoweNode): vscode.ProviderResult<ZoweNode> {
        return element.mParent;
    }

    /**
     * Adds a new session to the data set tree
     *
     * @param {string} [sessionName] - optional; loads default profile if not passed
     */
    public async addSession(sessionName?: string) {
        // Loads profile associated with passed sessionName, default if none passed
        if (sessionName) {
            const zosmfProfile: IProfileLoaded = Profiles.getInstance().loadNamedProfile(sessionName);
            if (zosmfProfile) {
                this.addSingleSession(zosmfProfile);
            }
        } else {
            const zosmfProfiles: IProfileLoaded[] = Profiles.getInstance().allProfiles;
            for (const zosmfProfile of zosmfProfiles) {
                // If session is already added, do nothing
                if (this.mSessionNodes.find((tempNode) => tempNode.label.trim() === zosmfProfile.name)) {
                    continue;
                }
                for (const session of this.mHistory.getSessions()) {
                    if (session === zosmfProfile.name) {
                        this.addSingleSession(zosmfProfile);
                    }
                }
            }
            if (this.mSessionNodes.length === 1) {
                this.addSingleSession(Profiles.getInstance().defaultProfile);
            }
        }
        this.refresh();
    }

    /**
     * Removes a session from the list in the data set tree
     *
     * @param {ZoweNode} [node]
     */
    public deleteSession(node: ZoweNode) {
        this.mSessionNodes = this.mSessionNodes.filter((tempNode) => tempNode.label.trim() !== node.label.trim());
        let revisedLabel =  node.label;
        if (revisedLabel.includes("[")) {
            revisedLabel = revisedLabel.substring(0, revisedLabel.indexOf(" ["));
        }
        this.mHistory.removeSession(revisedLabel);
        this.refresh();
    }

    /**
     * Adds a node to the favorites list
     *
     * @param {ZoweNode} node
     */
    public async addFavorite(node: ZoweNode) {
        let temp: ZoweNode;
        if (node.contextValue === extension.DS_MEMBER_CONTEXT) {
            if (node.mParent.contextValue === extension.DS_PDS_CONTEXT + extension.FAV_SUFFIX) {
                vscode.window.showInformationMessage(localize("addFavorite", "PDS already in favorites"));
                return;
            }
            this.addFavorite(node.mParent);
            return;
        } else if (node.contextValue === extension.DS_SESSION_CONTEXT) {
            temp = new ZoweNode("[" + node.getSessionNode().label.trim() + "]: " + node.pattern, vscode.TreeItemCollapsibleState.None,
                this.mFavoriteSession, node.getSession());
            temp.contextValue = extension.DS_SESSION_CONTEXT + extension.FAV_SUFFIX;
            temp.iconPath =  utils.applyIcons(temp);
            // add a command to execute the search
            temp.command = { command: "zowe.pattern", title: "", arguments: [temp] };
            // const light = path.join(__dirname, "..", "..", "resources", "light", "pattern.svg");
            // const dark = path.join(__dirname, "..", "..", "resources", "dark", "pattern.svg");
            // temp.iconPath = { light, dark };
        } else {    // pds | ds
            temp = new ZoweNode("[" + node.getSessionNode().label.trim() + "]: " + node.label, node.collapsibleState,
                this.mFavoriteSession, node.getSession());
            temp.contextValue += extension.FAV_SUFFIX;
            if (temp.contextValue === extension.DS_PDS_CONTEXT + extension.FAV_SUFFIX) {
                temp.command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [temp] };
            }
            temp.iconPath = utils.applyIcons(temp);
        }

        if (!this.mFavorites.find((tempNode) =>
            (tempNode.label === temp.label) && (tempNode.contextValue === temp.contextValue)
        )) {
            this.mFavorites.push(temp);
            await this.updateFavorites();
            this.refresh();
            this.refreshElement(this.mFavoriteSession);
        }
    }

    /**
     * Removes a node from the favorites list
     *
     * @param {ZoweNode} node
     */
    public async removeFavorite(node: ZoweNode) {
        this.mFavorites = this.mFavorites.filter((temp) =>
            !((temp.label === node.label) && (temp.contextValue.startsWith(node.contextValue)))
        );
        this.refresh();
        await this.updateFavorites();
        this.refreshElement(this.mFavoriteSession);
    }

    public async updateFavorites() {
        const settings = this.mFavorites.map((fav) =>
            fav.label + "{" + fav.contextValue.substring(0, fav.contextValue.indexOf(extension.FAV_SUFFIX)) + "}"
        );
        this.mHistory.updateFavorites(settings);
    }

    public async onDidChangeConfiguration(e) {
        if (e.affectsConfiguration(DatasetTree.persistenceSchema)) {
            const setting: any = { ...vscode.workspace.getConfiguration().get(DatasetTree.persistenceSchema) };
            if (!setting.persistence) {
                setting.favorites = [];
                setting.history = [];
                await vscode.workspace.getConfiguration().update(DatasetTree.persistenceSchema, setting, vscode.ConfigurationTarget.Global);
            }
        }
    }

    public async addHistory(criteria: string) {
        this.mHistory.addHistory(criteria);
        this.refresh();
    }

    public async datasetFilterPrompt(node: ZoweNode) {
        this.log.debug(localize("enterPattern.log.debug.prompt", "Prompting the user for a data set pattern"));
        let pattern: string;
        if (node.contextValue === extension.DS_SESSION_CONTEXT) {
            if (this.mHistory.getHistory().length > 0) {
                const createPick = new utils.FilterDescriptor(DatasetTree.defaultDialogText);
                const items: vscode.QuickPickItem[] = this.mHistory.getHistory().map((element) => new utils.FilterItem(element));
                if (extension.ISTHEIA) {
                    const options1: vscode.QuickPickOptions = {
                        placeHolder: localize("searchHistory.options.prompt", "Select a filter")
                    };
                    // get user selection
                    const choice = (await vscode.window.showQuickPick([createPick, ...items], options1));
                    if (!choice) {
                        vscode.window.showInformationMessage(localize("enterPattern.pattern", "No selection made."));
                        return;
                    }
                    pattern = choice === createPick ? "" : choice.label;
                } else {
                    const quickpick = vscode.window.createQuickPick();
                    quickpick.items = [createPick, ...items];
                    quickpick.placeholder = localize("searchHistory.options.prompt", "Select a filter");
                    quickpick.ignoreFocusOut = true;
                    quickpick.show();
                    const choice = await utils.resolveQuickPickHelper(quickpick);
                    quickpick.hide();
                    if (!choice) {
                        vscode.window.showInformationMessage(localize("enterPattern.pattern", "No selection made."));
                        return;
                    }
                    if (choice instanceof utils.FilterDescriptor) {
                        if (quickpick.value) {
                            pattern = quickpick.value;
                        }
                    } else {
                        pattern = choice.label;
                    }
                }
            }
            if (!pattern) {
                // manually entering a search
                const options2: vscode.InputBoxOptions = {
                    prompt: localize("enterPattern.options.prompt",
                                        "Search data sets by entering patterns: use a comma to separate multiple patterns"),
                    value: node.pattern,
                };
                // get user input
                pattern = await vscode.window.showInputBox(options2);
                if (!pattern) {
                    vscode.window.showInformationMessage(localize("datasetFilterPrompt.enterPattern", "You must enter a pattern."));
                    return;
                }
            }
        } else {
            // executing search from saved search in favorites
            pattern = node.label.trim().substring(node.label.trim().indexOf(":") + 2);
            const session = node.label.trim().substring(node.label.trim().indexOf("[") + 1, node.label.trim().indexOf("]"));
            await this.addSession(session);
            node = this.mSessionNodes.find((tempNode) => tempNode.label.trim() === session);
        }
        // update the treeview with the new pattern
        node.label = node.label.trim()+ " ";
        node.label.trim();
        node.tooltip = node.pattern = pattern.toUpperCase();
        node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        node.dirty = true;
        node.iconPath = utils.applyIcons(node, extension.ICON_STATE_OPEN);
        this.addHistory(node.pattern);
    }

    /**
     * Change the state of an expandable node
     * @param provider the tree view provider
     * @param element the node being flipped
     * @param isOpen the intended state of the the tree view provider, true or false
     */
    public async flipState(element: ZoweNode, isOpen: boolean = false) {
        element.iconPath = utils.applyIcons(element, isOpen ? extension.ICON_STATE_OPEN : extension.ICON_STATE_CLOSED);
        element.dirty = true;
        this.mOnDidChangeTreeData.fire(element);
    }

    /**
     * Adds a single session to the data set tree
     *
     */
    private addSingleSession(zosmfProfile: IProfileLoaded) {
        if (zosmfProfile) {
            // If session is already added, do nothing
            if (this.mSessionNodes.find((tempNode) => tempNode.label.trim() === zosmfProfile.name)) {
                return;
            }
            // Uses loaded profile to create a zosmf session with brightside
            const session = zowe.ZosmfSession.createBasicZosmfSession(zosmfProfile.profile);
            // Creates ZoweNode to track new session and pushes it to mSessionNodes
            const node = new ZoweNode(zosmfProfile.name, vscode.TreeItemCollapsibleState.Collapsed, null, session);
            node.contextValue = extension.DS_SESSION_CONTEXT;
            node.iconPath = utils.applyIcons(node);
            this.mSessionNodes.push(node);
            this.mHistory.addSession(zosmfProfile.name);
        }
    }
}
