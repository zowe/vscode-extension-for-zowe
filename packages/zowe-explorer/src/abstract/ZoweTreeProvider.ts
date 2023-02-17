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

import * as vscode from "vscode";
import * as globals from "../globals";
import { imperative } from "@zowe/cli";
import { PersistentFilters } from "../PersistentFilters";
import { getIconByNode, getIconById, IconId } from "../generators/icons";
import * as contextually from "../shared/context";
import { IZoweTreeNode, IZoweDatasetTreeNode, IZoweNodeType, IZoweTree, PersistenceSchemaEnum } from "@zowe/zowe-explorer-api";
import { Profiles } from "../Profiles";
import { setProfile, setSession, errorHandling } from "../utils/ProfilesUtils";

import * as nls from "vscode-nls";
import { SettingsConfig } from "../utils/SettingsConfig";

// Set up localization
nls.config({
    messageFormat: nls.MessageFormat.bundle,
    bundleFormat: nls.BundleFormat.standalone,
})();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class ZoweTreeProvider {
    // Event Emitters used to notify subscribers that the refresh event has fired
    public mOnDidChangeTreeData: vscode.EventEmitter<IZoweTreeNode | void> = new vscode.EventEmitter<IZoweTreeNode | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<IZoweTreeNode | void> = this.mOnDidChangeTreeData.event;

    protected mHistory: PersistentFilters;
    protected log: imperative.Logger = imperative.Logger.getAppLogger();
    protected validProfile: number = -1;

    constructor(protected persistenceSchema: PersistenceSchemaEnum, public mFavoriteSession: IZoweTreeNode) {
        this.mHistory = new PersistentFilters(this.persistenceSchema);
    }

    /**
     * Takes argument of type IZoweTreeNode and returns it converted to a general [TreeItem]
     *
     * @param {IZoweTreeNode} element
     * @returns {vscode.TreeItem}
     */
    public getTreeItem(element: IZoweTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getParent(element: IZoweTreeNode): IZoweTreeNode {
        return element.getParent();
    }

    /**
     * Selects a specific item in the tree view
     *
     * @param {IZoweTreeNode}
     */
    public setItem(treeView: vscode.TreeView<IZoweTreeNode>, item: IZoweTreeNode) {
        treeView.reveal(item, { select: true, focus: true });
    }

    /**
     * Call whenever the context of a node needs to be refreshed to add the home suffix
     * @param node Node to refresh
     */
    public async refreshHomeProfileContext(node) {
        const mProfileInfo = await Profiles.getInstance().getProfileInfo();
        if (mProfileInfo.usingTeamConfig && !contextually.isHomeProfile(node)) {
            const prof = mProfileInfo.getAllProfiles().find((p) => p.profName === node.getProfileName());
            const osLocInfo = mProfileInfo.getOsLocInfo(prof);
            if (osLocInfo?.[0]?.global) {
                node.contextValue += globals.HOME_SUFFIX;
            }
        }
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refreshElement(element: IZoweDatasetTreeNode): void {
        element.dirty = true;
        this.mOnDidChangeTreeData.fire(element);
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refresh(): void {
        this.mOnDidChangeTreeData.fire();
    }

    /**
     * Change the state of an expandable node
     * @param provider the tree view provider
     * @param element the node being flipped
     * @param isOpen the intended state of the the tree view provider, true or false
     */
    public async flipState(element: IZoweTreeNode, isOpen: boolean = false) {
        element.collapsibleState = isOpen ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        const icon = getIconByNode(element);
        if (icon) {
            element.iconPath = icon.path;
        }
        element.dirty = true;
        if (isOpen) {
            this.mOnDidChangeTreeData.fire(element);
        }
    }

    public async onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(this.persistenceSchema)) {
            const setting: any = {
                ...SettingsConfig.getDirectValue(this.persistenceSchema),
            };
            if (!setting.persistence) {
                setting.favorites = [];
                setting.history = [];
                await SettingsConfig.setDirectValue(this.persistenceSchema, setting);
            }
        }
    }

    public getSearchHistory() {
        return this.mHistory.getSearchHistory();
    }

    public getTreeType() {
        return this.persistenceSchema;
    }

    public async addSearchHistory(criteria: string) {
        if (criteria) {
            this.mHistory.addSearchHistory(criteria);
            this.refresh();
        }
    }

    public findNonFavoritedNode(element: IZoweTreeNode) {
        return undefined;
    }

    public findFavoritedNode(element: IZoweTreeNode) {
        return undefined;
    }
    public renameFavorite(node: IZoweTreeNode, newLabel: string) {
        return undefined;
    }
    public renameNode(profile: string, beforeDataSetName: string, afterDataSetName: string) {
        return undefined;
    }

    public async editSession(node: IZoweTreeNode, zoweFileProvider: IZoweTree<IZoweNodeType>) {
        const profile = node.getProfile();
        const profileName = node.getProfileName();
        const EditSession = await Profiles.getInstance().editSession(profile, profileName);
        if (EditSession) {
            node.getProfile().profile = EditSession as imperative.IProfile;
            await setProfile(node, EditSession as imperative.IProfile);
            if (await node.getSession()) {
                await setSession(node, EditSession as imperative.ISession);
            } else {
                zoweFileProvider.deleteSession(node.getSessionNode());
                this.mHistory.addSession(node.label as string);
                zoweFileProvider.addSession(node.getProfileName());
            }
            this.refresh();
            // Remove the edited profile from profilesForValidation
            // Revalidate updated profile and update the validation icon
            await this.checkCurrentProfile(node);
        }
    }

    public async checkCurrentProfile(node: IZoweTreeNode) {
        const profile = node.getProfile();
        const profileStatus = await Profiles.getInstance().checkCurrentProfile(profile);
        if (profileStatus.status === "inactive") {
            if (
                contextually.isSessionNotFav(node) &&
                (node.contextValue.toLowerCase().includes("session") || node.contextValue.toLowerCase().includes("server"))
            ) {
                node.contextValue = node.contextValue.replace(/(?<=.*)(_Active|_Inactive|_Unverified)$/, "");
                node.contextValue = node.contextValue + globals.INACTIVE_CONTEXT;
                const inactiveIcon = getIconById(IconId.sessionInactive);
                if (inactiveIcon) {
                    node.iconPath = inactiveIcon.path;
                }
            }

            await errorHandling(
                localize("validateProfiles.invalid1", "Profile Name ") +
                    profile.name +
                    localize(
                        "validateProfiles.invalid2",
                        " is inactive. Please check if your Zowe server is active or if the URL and port in your profile is correct."
                    )
            );
            this.log.debug(
                localize("validateProfiles.invalid1", "Profile Name ") +
                    node.getProfileName() +
                    localize(
                        "validateProfiles.invalid2",
                        " is inactive. Please check if your Zowe server is active or if the URL and port in your profile is correct."
                    )
            );
        } else if (profileStatus.status === "active") {
            if (
                contextually.isSessionNotFav(node) &&
                (node.contextValue.toLowerCase().includes("session") || node.contextValue.toLowerCase().includes("server"))
            ) {
                node.contextValue = node.contextValue.replace(/(?<=.*)(_Active|_Inactive|_Unverified)$/, "");
                node.contextValue = node.contextValue + globals.ACTIVE_CONTEXT;
                const activeIcon = getIconById(IconId.sessionActive);
                if (activeIcon) {
                    node.iconPath = activeIcon.path;
                }
            }
        } else if (profileStatus.status === "unverified") {
            if (
                contextually.isSessionNotFav(node) &&
                (node.contextValue.toLowerCase().includes("session") || node.contextValue.toLowerCase().includes("server"))
            ) {
                node.contextValue = node.contextValue.replace(/(?<=.*)(_Active|_Inactive|_Unverified)$/, "");
                node.contextValue = node.contextValue + globals.UNVERIFIED_CONTEXT;
            }
        }
        await this.refresh();
    }

    public async ssoLogin(node: IZoweTreeNode) {
        await Profiles.getInstance().ssoLogin(node);
        await vscode.commands.executeCommand("zowe.ds.refreshAll");
        await vscode.commands.executeCommand("zowe.uss.refreshAll");
        await vscode.commands.executeCommand("zowe.jobs.refreshAllJobs");
    }

    public async ssoLogout(node: IZoweTreeNode) {
        await Profiles.getInstance().ssoLogout(node);
        await vscode.commands.executeCommand("zowe.ds.refreshAll");
        await vscode.commands.executeCommand("zowe.uss.refreshAll");
        await vscode.commands.executeCommand("zowe.jobs.refreshAllJobs");
    }

    public async createZoweSchema(zoweFileProvider: IZoweTree<IZoweNodeType>) {
        await Profiles.getInstance().createZoweSchema(zoweFileProvider);
    }

    public async createZoweSession(zoweFileProvider: IZoweTree<IZoweNodeType>) {
        await Profiles.getInstance().createZoweSession(zoweFileProvider);
    }

    protected deleteSessionByLabel(revisedLabel: string) {
        this.mHistory.removeSession(revisedLabel);
        this.refresh();
    }

    /**
     * Expand a node
     * @param element the node being flipped
     * @param provider the tree view provider
     */
    public async expandSession(element: IZoweTreeNode, provider: IZoweTree<IZoweNodeType>) {
        await provider.getTreeView().reveal(element, { expand: false });
        await provider.getTreeView().reveal(element, { expand: true });
        element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        element.dirty = true;
    }
}
