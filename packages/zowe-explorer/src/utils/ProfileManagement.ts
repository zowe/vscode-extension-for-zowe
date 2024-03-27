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

import * as vscode from "vscode";
import * as globals from "../globals";
import { Gui, IZoweTreeNode, imperative } from "@zowe/zowe-explorer-api";
import { ZoweLogger } from "./LoggerUtils";
import { ProfilesUtils } from "./ProfilesUtils";
import * as nls from "vscode-nls";
import { Profiles } from "../Profiles";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";
import { getSessionType } from "../shared/context";
import { TreeProviders } from "../shared/TreeProviders";

// Set up localization
nls.config({
    messageFormat: nls.MessageFormat.bundle,
    bundleFormat: nls.BundleFormat.standalone,
})();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

export class ProfileManagement {
    public static getRegisteredProfileNameList(registeredTree: globals.Trees): string[] {
        let profileNamesList: string[] = [];
        try {
            profileNamesList = Profiles.getInstance()
                .allProfiles.map((profile) => profile.name)
                .filter((profileName) => {
                    const profile = Profiles.getInstance().loadNamedProfile(profileName);
                    if (profile) {
                        return this.isProfileRegisteredWithTree(registeredTree, profile);
                    }
                    return false;
                });
            return profileNamesList;
        } catch (err) {
            ZoweLogger.warn(err);
            return profileNamesList;
        }
    }
    public static async manageProfile(node: IZoweTreeNode): Promise<void> {
        const profile = node.getProfile();
        let selected: vscode.QuickPickItem;
        switch (true) {
            case ProfilesUtils.isProfileUsingBasicAuth(profile): {
                ZoweLogger.debug(`Profile ${profile.name} is using basic authentication.`);
                selected = await this.setupProfileManagementQp(imperative.SessConstants.AUTH_TYPE_BASIC, node);
                break;
            }
            case await ProfilesUtils.isUsingTokenAuth(profile.name): {
                ZoweLogger.debug(`Profile ${profile.name} is using token authentication.`);
                selected = await this.setupProfileManagementQp(imperative.SessConstants.AUTH_TYPE_TOKEN, node);
                break;
            }
            // will need a case for isUsingCertAuth
            default: {
                ZoweLogger.debug(`Profile ${profile.name} authentication method is unkown.`);
                selected = await this.setupProfileManagementQp(null, node);
                break;
            }
        }
        await this.handleAuthSelection(selected, node, profile);
    }
    public static AuthQpLabels = {
        add: "add-credentials",
        delete: "delete-profile",
        disable: "disable-validation",
        edit: "edit-profile",
        enable: "enable-validation",
        hide: "hide-profile",
        login: "obtain-token",
        logout: "invalidate-token",
        update: "update-credentials",
    };
    public static basicAuthAddQpItems: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.add]: {
            label: localize("addBasicAuthQpItem.addCredentials.qpLabel", "$(plus) Add Credentials"),
            description: localize("addBasicAuthQpItem.addCredentials.qpDetail", "Add username and password for basic authentication"),
        },
    };
    public static basicAuthUpdateQpItems: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.update]: {
            label: localize("updateBasicAuthQpItem.updateCredentials.qpLabel", "$(refresh) Update Credentials"),
            description: localize("updateBasicAuthQpItem.updateCredentials.qpDetail", "Update stored username and password"),
        },
    };
    public static deleteProfileQpItem: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.delete]: {
            label: localize("deleteProfileQpItem.delete.qpLabel", "$(trash) Delete Profile"),
        },
    };
    public static disableProfileValildationQpItem: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.disable]: {
            label: localize("disableProfileValildationQpItem.disableValidation.qpLabel", "$(workspace-untrusted) Disable Profile Validation"),
            description: localize("disableProfileValildationQpItem.disableValidation.qpDetail", "Disable validation of server check for profile"),
        },
    };
    public static enableProfileValildationQpItem: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.enable]: {
            label: localize("enableProfileValildationQpItem.enableValidation.qpLabel", "$(workspace-trusted) Enable Profile Validation"),
            description: localize("enableProfileValildationQpItem.enableValidation.qpDetail", "Enable validation of server check for profile"),
        },
    };
    public static editProfileQpItems: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.edit]: {
            label: localize("editProfileQpItem.editProfile.qpLabel", "$(pencil) Edit Profile"),
            description: localize("editProfileQpItem.editProfile.qpDetail", "Update profile connection information"),
        },
    };
    public static hideProfileQpItems: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.hide]: {
            label: localize("hideProfileQpItems.hideProfile.qpLabel", "$(eye-closed) Hide Profile"),
            description: localize("hideProfileQpItems.hideProfile.qpDetail", "Hide profile name from tree view"),
        },
    };
    public static tokenAuthLoginQpItem: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.login]: {
            label: localize("loginQpItem.login.qpLabel", "$(arrow-right) Log in to authentication service"),
            description: localize("loginQpItem.login.qpDetail", "Log in to obtain a new token value"),
        },
    };
    public static tokenAuthLogoutQpItem: Record<string, vscode.QuickPickItem> = {
        [this.AuthQpLabels.logout]: {
            label: localize("logoutQpItem.logout.qpLabel", "$(arrow-left) Log out of authentication service"),
            description: localize("logoutQpItem.logout.qpDetail", "Log out to invalidate and remove stored token value"),
        },
    };
    public static getPromptChangeForAllTreesOptions(): vscode.QuickPickItem[] {
        const qpItemAll: vscode.QuickPickItem = {
            label: localize("ProfileManagement.getPromptChangeForAllTreesOptions.allLbl", "Yes"),
            description: localize("ProfileManagement.getPromptChangeForAllTreesOptions.allDesc", "Apply to all trees"),
        };
        const qpItemCurrent: vscode.QuickPickItem = {
            label: localize("ProfileManagement.getPromptChangeForAllTreesOptions.currentLbl", "No"),
            description: localize("ProfileManagement.getPromptChangeForAllTreesOptions.currentDesc", "Apply to current tree selected"),
        };
        return [qpItemAll, qpItemCurrent];
    }
    public static async handleChangeForAllTrees(nodeName: string, checkPresence: boolean): Promise<boolean> {
        const selection = await this.promptChangeForAllTrees(nodeName, checkPresence);
        if (!selection) {
            return;
        }
        const [all] = this.getPromptChangeForAllTreesOptions();
        return selection.label === all.label;
    }
    private static async promptChangeForAllTrees(nodeName: string, checkPresence: boolean): Promise<vscode.QuickPickItem> {
        const [qpItemAll, qpItemCurrent] = this.getPromptChangeForAllTreesOptions();
        if (TreeProviders.sessionIsPresentInOtherTrees(nodeName) === checkPresence) {
            return qpItemCurrent;
        }
        const qp = Gui.createQuickPick();
        qp.placeholder = localize("ProfileManagement.promptChangeForAllTrees.howToChange", "Do you wish to apply this for all trees?");
        qp.items = [qpItemAll, qpItemCurrent];
        qp.activeItems = [qp.items[0]];
        qp.show();
        const selection = await Gui.resolveQuickPick(qp);
        qp.hide();
        return selection;
    }
    private static async setupProfileManagementQp(managementType: string, node: IZoweTreeNode): Promise<vscode.QuickPickItem> {
        const profile = node.getProfile();
        const qp = Gui.createQuickPick();
        let quickPickOptions: vscode.QuickPickItem[];
        const placeholders = this.getQpPlaceholders(profile);
        switch (managementType) {
            case imperative.SessConstants.AUTH_TYPE_BASIC: {
                quickPickOptions = this.basicAuthQp(node);
                qp.placeholder = placeholders.basicAuth;
                break;
            }
            case imperative.SessConstants.AUTH_TYPE_TOKEN: {
                quickPickOptions = this.tokenAuthQp(node);
                qp.placeholder = placeholders.tokenAuth;
                break;
            }
            default: {
                quickPickOptions = this.chooseAuthQp(node);
                qp.placeholder = placeholders.chooseAuth;
                break;
            }
        }
        let selectedItem = quickPickOptions[0];
        qp.items = quickPickOptions;
        qp.activeItems = [selectedItem];
        qp.show();
        selectedItem = await Gui.resolveQuickPick(qp);
        qp.hide();
        return selectedItem;
    }
    private static async handleAuthSelection(selected: vscode.QuickPickItem, node: IZoweTreeNode, profile: imperative.IProfileLoaded): Promise<void> {
        switch (selected) {
            case this.basicAuthAddQpItems[this.AuthQpLabels.add]: {
                await ProfilesUtils.promptCredentials(node);
                break;
            }
            case this.editProfileQpItems[this.AuthQpLabels.edit]: {
                await Profiles.getInstance().editSession(profile, profile.name);
                break;
            }
            case this.tokenAuthLoginQpItem[this.AuthQpLabels.login]: {
                await Profiles.getInstance().ssoLogin(node, profile.name);
                break;
            }
            case this.tokenAuthLogoutQpItem[this.AuthQpLabels.logout]: {
                await Profiles.getInstance().ssoLogout(node);
                break;
            }
            case this.basicAuthUpdateQpItems[this.AuthQpLabels.update]: {
                await ProfilesUtils.promptCredentials(node);
                break;
            }
            case this.hideProfileQpItems[this.AuthQpLabels.hide]: {
                await this.handleHideProfiles(node);
                break;
            }
            case this.deleteProfileQpItem[this.AuthQpLabels.delete]: {
                await this.handleDeleteProfiles(node);
                break;
            }
            case this.enableProfileValildationQpItem[this.AuthQpLabels.enable]: {
                await this.handleEnableProfileValidation(node);
                break;
            }
            case this.disableProfileValildationQpItem[this.AuthQpLabels.disable]: {
                await this.handleDisableProfileValidation(node);
                break;
            }
            default: {
                Gui.infoMessage(localize("profiles.operation.cancelled", "Operation Cancelled"));
                break;
            }
        }
    }

    private static getQpPlaceholders(profile: imperative.IProfileLoaded): { basicAuth: string; tokenAuth: string; chooseAuth: string } {
        return {
            basicAuth: localize("qpPlaceholders.qp.basic", "Profile {0} is using basic authentication. Choose a profile action.", profile.name),
            tokenAuth: localize("qpPlaceholders.qp.token", "Profile {0} is using token authentication. Choose a profile action.", profile.name),
            chooseAuth: localize(
                "qpPlaceholders.qp.choose",
                "Profile {0} doesn't specify an authentication method. Choose a profile action.",
                profile.name
            ),
        };
    }

    private static basicAuthQp(node: IZoweTreeNode): vscode.QuickPickItem[] {
        const quickPickOptions: vscode.QuickPickItem[] = Object.values(this.basicAuthUpdateQpItems);
        return this.addFinalQpOptions(node, quickPickOptions);
    }
    private static tokenAuthQp(node: IZoweTreeNode): vscode.QuickPickItem[] {
        const profile = node.getProfile();
        const quickPickOptions: vscode.QuickPickItem[] = Object.values(this.tokenAuthLoginQpItem);
        if (profile.profile.tokenValue) {
            quickPickOptions.push(this.tokenAuthLogoutQpItem[this.AuthQpLabels.logout]);
        }
        return this.addFinalQpOptions(node, quickPickOptions);
    }
    private static chooseAuthQp(node: IZoweTreeNode): vscode.QuickPickItem[] {
        const profile = node.getProfile();
        const quickPickOptions: vscode.QuickPickItem[] = Object.values(this.basicAuthAddQpItems);
        try {
            ZoweExplorerApiRegister.getInstance().getCommonApi(profile).getTokenTypeName();
            quickPickOptions.push(this.tokenAuthLoginQpItem[this.AuthQpLabels.login]);
        } catch {
            ZoweLogger.debug(`Profile ${profile.name} doesn't support token authentication, will not provide option.`);
        }
        return this.addFinalQpOptions(node, quickPickOptions);
    }
    private static addFinalQpOptions(node: IZoweTreeNode, quickPickOptions: vscode.QuickPickItem[]): vscode.QuickPickItem[] {
        quickPickOptions.push(this.editProfileQpItems[this.AuthQpLabels.edit]);
        quickPickOptions.push(this.hideProfileQpItems[this.AuthQpLabels.hide]);
        if (node.contextValue.includes(globals.NO_VALIDATE_SUFFIX)) {
            quickPickOptions.push(this.enableProfileValildationQpItem[this.AuthQpLabels.enable]);
        } else {
            quickPickOptions.push(this.disableProfileValildationQpItem[this.AuthQpLabels.disable]);
        }
        quickPickOptions.push(this.deleteProfileQpItem[this.AuthQpLabels.delete]);
        return quickPickOptions;
    }
    private static async handleDeleteProfiles(node: IZoweTreeNode): Promise<void> {
        const profInfo = await Profiles.getInstance().getProfileInfo();
        if (profInfo.usingTeamConfig) {
            const profile = node.getProfile();
            await Profiles.getInstance().editSession(profile, profile.name);
            return;
        }
        await vscode.commands.executeCommand("zowe.ds.deleteProfile", node);
    }

    private static async handleHideProfiles(node: IZoweTreeNode): Promise<void> {
        const shouldHideFromAllTrees = await this.handleChangeForAllTrees(node.getLabel().toString(), false);
        if (shouldHideFromAllTrees === undefined) {
            Gui.infoMessage(localize("ProfileManagement.handleHideProfiles.cancelled", "Operation Cancelled"));
            return;
        }
        const type: string = getSessionType(node);
        return vscode.commands.executeCommand(`zowe.${type}.removeSession`, node, null, shouldHideFromAllTrees);
    }

    private static async handleEnableProfileValidation(node: IZoweTreeNode): Promise<void> {
        const type: string = getSessionType(node);
        return vscode.commands.executeCommand(`zowe.${type}.enableValidation`, node);
    }

    private static async handleDisableProfileValidation(node: IZoweTreeNode): Promise<void> {
        const type: string = getSessionType(node);
        return vscode.commands.executeCommand(`zowe.${type}.disableValidation`, node);
    }

    private static isProfileRegisteredWithTree(tree: globals.Trees, profile: imperative.IProfileLoaded): boolean {
        switch (tree) {
            case globals.Trees.MVS: {
                const mvsProfileTypes = ZoweExplorerApiRegister.getInstance().registeredMvsApiTypes();
                return mvsProfileTypes.includes(profile.type);
            }
            case globals.Trees.USS: {
                const ussProfileTypes = ZoweExplorerApiRegister.getInstance().registeredUssApiTypes();
                return ussProfileTypes.includes(profile.type);
            }
            case globals.Trees.JES: {
                const jesProfileTypes = ZoweExplorerApiRegister.getInstance().registeredJesApiTypes();
                return jesProfileTypes.includes(profile.type);
            }
            default: {
                return false;
            }
        }
    }
}
