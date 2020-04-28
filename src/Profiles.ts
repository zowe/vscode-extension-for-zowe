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

import { IProfileLoaded, Logger, CliProfileManager, IProfile, ISession, IUpdateProfile } from "@zowe/imperative";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import * as zowe from "@zowe/cli";
import { ZoweExplorerApiRegister } from "./api/ZoweExplorerApiRegister";
import { errorHandling, getZoweDir } from "./utils";
import { IZoweTree } from "./api/IZoweTree";
import { IZoweNodeType, IZoweUSSTreeNode, IZoweDatasetTreeNode, IZoweJobTreeNode } from "./api/IZoweTreeNode";
import * as nls from "vscode-nls";
const localize = nls.config({messageFormat: nls.MessageFormat.file})();

interface IUrlValidator {
    valid: boolean;
    host: string;
    port: number;
}

let IConnection: {
    name: string;
    host: string;
    port: number;
    user: string;
    password: string;
    rejectUnauthorized: boolean;
};

let InputBoxOptions: vscode.InputBoxOptions;
export enum ValidProfileEnum {
    VALID = 0,
    INVALID = -1
}

export class Profiles {
    // Processing stops if there are no profiles detected
    public static async createInstance(log: Logger): Promise<Profiles> {
        Profiles.loader = new Profiles(log);
        await Profiles.loader.refresh();
        return Profiles.loader;
    }

    public static getInstance(): Profiles {
        return Profiles.loader;
    }

    private static loader: Profiles;

    public allProfiles: IProfileLoaded[] = [];
    public loadedProfile: IProfileLoaded;
    public validProfile: ValidProfileEnum = ValidProfileEnum.INVALID;
    private dsSchema: string = "Zowe-DS-Persistent";
    private ussSchema: string = "Zowe-USS-Persistent";
    private jobsSchema: string = "Zowe-Jobs-Persistent";
    private allTypes: string[];
    private profilesByType = new Map<string, IProfileLoaded[]>();
    private defaultProfileByType = new Map<string, IProfileLoaded>();
    private profileManagerByType= new Map<string, CliProfileManager>();
    private usrNme: string;
    private passWrd: string;
    private baseEncd: string;
    private constructor(private log: Logger) {}

    public async checkCurrentProfile(theProfile: IProfileLoaded) {
        if ((!theProfile.profile.user) || (!theProfile.profile.password)) {
            try {
                const values = await Profiles.getInstance().promptCredentials(theProfile.name);
                if (values !== undefined) {
                    this.usrNme = values[0];
                    this.passWrd = values[1];
                    this.baseEncd = values[2];
                }
            } catch (error) {
                errorHandling(error, theProfile.name,
                    localize("ussNodeActions.error", "Error encountered in ") + `createUSSNodeDialog.optionalProfiles!`);
                return;
            }
            if (this.usrNme !== undefined && this.passWrd !== undefined && this.baseEncd !== undefined) {
                theProfile.profile.user = this.usrNme;
                theProfile.profile.password = this.passWrd;
                theProfile.profile.base64EncodedAuth = this.baseEncd;
                this.validProfile = ValidProfileEnum.VALID;
            } else {
                return;
            }
        } else {
            this.validProfile = ValidProfileEnum.VALID;
        }
    }

    public loadNamedProfile(name: string, type?: string): IProfileLoaded {
        for (const profile of this.allProfiles) {
            if (profile.name === name && (type ? profile.type === type : true)) {
                return profile;
            }
        }
        throw new Error(localize("loadNamedProfile.error.profileName", "Could not find profile named: ")
            + name + localize("loadNamedProfile.error.period", "."));
    }

    public getDefaultProfile(type: string = "zosmf"): IProfileLoaded {
        return this.defaultProfileByType.get(type);
    }

    public getProfiles(type: string = "zosmf"): IProfileLoaded[] {
        return this.profilesByType.get(type);
    }

    public async refresh(): Promise<void> {
        this.allProfiles = [];
        this.allTypes = [];
        for (const type of ZoweExplorerApiRegister.getInstance().registeredApiTypes()) {
            const profileManager = await this.getCliProfileManager(type);
            const profilesForType = (await profileManager.loadAll()).filter((profile) => {
                return profile.type === type;
            });
            if (profilesForType && profilesForType.length > 0) {
                this.allProfiles.push(...profilesForType);
                this.profilesByType.set(type, profilesForType);
                let defaultProfile: IProfileLoaded;
                try {
                    defaultProfile = await profileManager.load({ loadDefault: true });
                } catch (error) {
                    vscode.window.showInformationMessage(error.message);
                }
                this.defaultProfileByType.set(type, defaultProfile);
            }
            // This is in the loop because I need an instantiated profile manager config
            if (profileManager.configurations && this.allTypes.length === 0) {
                for (const element of profileManager.configurations) {
                    this.allTypes.push(element.type);
                }
            }
        }
    }

    public validateAndParseUrl(newUrl: string): IUrlValidator {
        let url: URL;
        const validProtocols: string[] = ["https"];
        const DEFAULT_HTTPS_PORT: number = 443;

        const validationResult: IUrlValidator = {
            valid: false,
            host: null,
            port: null
        };

        try {
            url = new URL(newUrl);
        } catch (error) {
            return validationResult;
        }

        // overkill with only one valid protocol, but we may expand profile types and protocols in the future?
        if (!validProtocols.some((validProtocol: string) => url.protocol.includes(validProtocol))) {
            return validationResult;
        }

        // if port is empty, set https defaults
        if (!url.port.trim()) {
            validationResult.port = DEFAULT_HTTPS_PORT;
        }
        else {
            validationResult.port = Number(url.port);
        }

        validationResult.host = url.hostname;
        validationResult.valid = true;
        return validationResult;
    }

    public async getUrl(urlInputBox): Promise<string | undefined> {
        return new Promise<string | undefined> ((resolve) => {
            urlInputBox.onDidHide(() => { resolve(urlInputBox.value); });
            urlInputBox.onDidAccept(() => {
                if (this.validateAndParseUrl(urlInputBox.value).valid) {
                    resolve(urlInputBox.value);
                } else {
                    urlInputBox.validationMessage = localize("createNewConnection.invalidzosmfURL",
                        "Please enter a valid URL in the format https://url:port.");
                }
            });
        });
    }

    public async editSession(profileLoaded: IProfileLoaded, profileName: string): Promise<any| undefined> {
        const editSession = profileLoaded.profile;
        const editURL = "https://" + editSession.host+ ":" + editSession.port;
        const editUser = editSession.user;
        const editPass = editSession.password;
        const editrej = editSession.rejectUnauthorized;
        let updUser: string;
        let updPass: string;
        let updRU: boolean;

        const updUrl = await this.urlInfo(editURL);

        if (updUrl) {
            updUser = await this.userInfo(editUser);
        } else {
            return;
        }

        if (updUser !== undefined) {
            updPass = await this.passwordInfo(editPass);
        } else {
            return;
        }

        if (updPass !== undefined) {
            updRU = await this.ruInfo(editrej);
        } else {
            return;
        }

        if (updRU !== undefined) {
            const updProfile = {
                host: updUrl.host,
                port: updUrl.port,
                user: updUser,
                password: updPass,
                rejectUnauthorized: updRU,
                base64EncodedAuth: null
            };

            try {
                const updSession = await zowe.ZosmfSession.createBasicZosmfSession(updProfile);
                updProfile.base64EncodedAuth = updSession.ISession.base64EncodedAuth;
                await this.updateProfile({profile: updProfile, name: profileName});
                vscode.window.showInformationMessage(localize("editConnection.success", "Profile was successfully updated"));

                return updProfile;

            } catch (error) {
                await errorHandling(error.message);
            }
        }

    }

    public async createNewConnection(profileName: string, profileType: string ="zosmf"): Promise<string | undefined> {

        let newUser: string;
        let newPass: string;
        let newRU: boolean;

        const newUrl = await this.urlInfo();

        if (newUrl) {
            newUser = await this.userInfo();
        } else {
            return;
        }

        if (newUser !== undefined) {
            newPass = await this.passwordInfo();
        } else {
            return;
        }

        if (newPass !== undefined) {
            newRU = await this.ruInfo();
        } else {
            return;
        }

        if (newRU !== undefined) {
            for (const profile of this.allProfiles) {
                if (profile.name === profileName) {
                    vscode.window.showErrorMessage(localize("createNewConnection.duplicateProfileName",
                        "Profile name already exists. Please create a profile using a different name"));
                    return undefined;
                }
            }

            IConnection = {
                name: profileName,
                host: newUrl.host,
                port: newUrl.port,
                user: newUser,
                password: newPass,
                rejectUnauthorized: newRU
            };

            try {
                await zowe.ZosmfSession.createBasicZosmfSession(IConnection);
                await this.saveProfile(IConnection, IConnection.name, profileType);
                vscode.window.showInformationMessage("Profile " + profileName + " was created.");
                return profileName;
            } catch (error) {
                await errorHandling(error.message);
            }
        } else {
            return;
        }
    }

    public async promptCredentials(sessName, rePrompt?: boolean) {

        let repromptUser: any;
        let repromptPass: any;
        let loadProfile: any;
        let loadSession: any;
        let newUser: any;
        let newPass: any;

        try {
            loadProfile = this.loadNamedProfile(sessName.trim());
            loadSession = loadProfile.profile as ISession;
        } catch (error) {
            await errorHandling(error.message);
        }


        if (rePrompt) {
            repromptUser = loadSession.user;
            repromptPass = loadSession.password;
        }

        if (!loadSession.user || rePrompt) {

            newUser = await this.userInfo(repromptUser);

            loadSession.user = loadProfile.profile.user = newUser;
        }

        if (newUser === undefined) {
            return;
        } else {
            if (!loadSession.password || rePrompt) {
                newPass = await this.passwordInfo(repromptPass);
                loadSession.password = loadProfile.profile.password = newPass;
            }
        }

        if (newPass === undefined) {
            return;
        } else {
            try {
                const updSession = await zowe.ZosmfSession.createBasicZosmfSession(loadSession as IProfile);
                if (rePrompt) {
                    await this.updateProfile(loadProfile, rePrompt);
                }
                return [updSession.ISession.user, updSession.ISession.password, updSession.ISession.base64EncodedAuth];
            } catch (error) {
                await errorHandling(error.message);
            }
        }
    }

    public async getDeleteProfile() {
        const allProfiles: IProfileLoaded[] = this.allProfiles;
        const profileNamesList = allProfiles.map((temprofile) => {
            return temprofile.name;
        });

        if (!profileNamesList.length) {
            vscode.window.showInformationMessage(localize("deleteProfile.noProfilesLoaded", "No profiles available"));
            return;
        }

        const quickPickList: vscode.QuickPickOptions = {
            placeHolder: localize("deleteProfile.quickPickOption", "Select the profile you want to delete"),
            ignoreFocusOut: true,
            canPickMany: false
        };
        const sesName = await vscode.window.showQuickPick(profileNamesList, quickPickList);

        if (sesName === undefined) {
            vscode.window.showInformationMessage(localize("deleteProfile.undefined.profilename",
                "Operation Cancelled"));
            return;
        }

        return allProfiles.find((temprofile) => temprofile.name === sesName);
    }

    public async deletePrompt(deletedProfile: IProfileLoaded) {
        const profileName = deletedProfile.name;
        this.log.debug(localize("deleteProfile.log.debug", "Deleting profile ") + profileName);
        const quickPickOptions: vscode.QuickPickOptions = {
            placeHolder: localize("deleteProfile.quickPickOption", "Are you sure you want to permanently delete ") + profileName,
            ignoreFocusOut: true,
            canPickMany: false
        };
        // confirm that the user really wants to delete
        if (await vscode.window.showQuickPick([localize("deleteProfile.showQuickPick.yes", "Yes"),
            localize("deleteProfile.showQuickPick.no", "No")], quickPickOptions) !== localize("deleteProfile.showQuickPick.yes", "Yes")) {
            this.log.debug(localize("deleteProfile.showQuickPick.log.debug", "User picked no. Cancelling delete of profile"));
            return;
        }

        const profileType = ZoweExplorerApiRegister.getMvsApi(deletedProfile).getProfileTypeName();
        try {
            this.deleteProf(deletedProfile, profileName, profileType);
        } catch (error) {
            this.log.error(localize("deleteProfile.delete.log.error", "Error encountered when deleting profile! ") + JSON.stringify(error));
            await errorHandling(error, profileName, error.message);
            throw error;
        }

        vscode.window.showInformationMessage("Profile " + profileName + " was deleted.");
        return profileName;
    }

    public async deleteProf(ProfileInfo, ProfileName, ProfileType) {
        let zosmfProfile: IProfile;
        try {
            zosmfProfile = await (await this.getCliProfileManager(ProfileType))
            .delete({ profile: ProfileInfo, name: ProfileName, type: ProfileType });
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        return zosmfProfile.profile;
    }

    public async deleteProfile(datasetTree: IZoweTree<IZoweDatasetTreeNode>, ussTree: IZoweTree<IZoweUSSTreeNode>,
                               jobsProvider: IZoweTree<IZoweJobTreeNode>, node?: IZoweNodeType) {

        let deleteLabel: string;
        let deletedProfile: IProfileLoaded;
        if (!node){
            deletedProfile = await this.getDeleteProfile();
        } else {
            deletedProfile = node.getProfile();
        }
        if (!deletedProfile) {
            return;
        }
        deleteLabel = deletedProfile.name;

        const deleteSuccess = await this.deletePrompt(deletedProfile);
        if (!deleteSuccess){
            vscode.window.showInformationMessage(localize("deleteProfile.noSelected",
                "Operation Cancelled"));
            return;
        }

        // Delete from Data Set Recall
        const recallDs: string[] = datasetTree.getRecall();
        recallDs.slice().reverse()
            .filter((ds) => ds.substring(1, ds.indexOf("]")).trim()  === deleteLabel)
            .forEach((ds) => {
                datasetTree.removeRecall(ds);
            });

        // Delete from Data Set Favorites
        const favoriteDs = datasetTree.mFavorites;
        for (let i = favoriteDs.length - 1; i >= 0; i--) {
            const findNode = favoriteDs[i].label.substring(1, favoriteDs[i].label.indexOf("]")).trim();
            if (findNode === deleteLabel) {
                datasetTree.removeFavorite(favoriteDs[i]);
                favoriteDs[i].dirty = true;
                datasetTree.refresh();
            }
        }

        // Delete from Data Set Tree
        datasetTree.mSessionNodes.forEach((sessNode) => {
            if (sessNode.getProfileName() === deleteLabel) {
                datasetTree.deleteSession(sessNode);
                sessNode.dirty = true;
                datasetTree.refresh();
            }
        });

        // Delete from USS Recall
        const recallUSS: string[] = ussTree.getRecall();
        recallUSS.slice().reverse()
            .filter((uss) => uss.substring(1, uss.indexOf("]")).trim()  === deleteLabel)
            .forEach((uss) => {
                ussTree.removeRecall(uss);
            });

        // Delete from USS Favorites
        ussTree.mFavorites.forEach((ses) => {
            const findNode = ses.label.substring(1, ses.label.indexOf("]")).trim();
            if (findNode === deleteLabel) {
                ussTree.removeFavorite(ses);
                ses.dirty = true;
                ussTree.refresh();
            }
        });

        // Delete from USS Tree
        ussTree.mSessionNodes.forEach((sessNode) => {
            if (sessNode.getProfileName() === deleteLabel) {
                ussTree.deleteSession(sessNode);
                sessNode.dirty = true;
                ussTree.refresh();
            }
        });

        // Delete from Jobs Favorites
        jobsProvider.mFavorites.forEach((ses) => {
            const findNode = ses.label.substring(1, ses.label.indexOf("]")).trim();
            if (findNode === deleteLabel) {
                jobsProvider.removeFavorite(ses);
                ses.dirty = true;
                jobsProvider.refresh();
            }
        });

        // Delete from Jobs Tree
        jobsProvider.mSessionNodes.forEach((jobNode) => {
            if (jobNode.getProfileName() === deleteLabel) {
                jobsProvider.deleteSession(jobNode);
                jobNode.dirty = true;
                jobsProvider.refresh();
            }
        });

        // Delete from Data Set Sessions list
        const dsSetting: any = {...vscode.workspace.getConfiguration().get(this.dsSchema)};
        let sessDS: string[] = dsSetting.sessions;
        let faveDS: string[] = dsSetting.favorites;
        sessDS = sessDS.filter( (element) => {
            return element.trim() !== deleteLabel;
        });
        faveDS = faveDS.filter( (element) => {
            return element.substring(1, element.indexOf("]")).trim() !== deleteLabel;
        });
        dsSetting.sessions = sessDS;
        dsSetting.favorites = faveDS;
        await vscode.workspace.getConfiguration().update(this.dsSchema, dsSetting, vscode.ConfigurationTarget.Global);

        // Delete from USS Sessions list
        const ussSetting: any = {...vscode.workspace.getConfiguration().get(this.ussSchema)};
        let sessUSS: string[] = ussSetting.sessions;
        let faveUSS: string[] = ussSetting.favorites;
        sessUSS = sessUSS.filter( (element) => {
            return element.trim() !== deleteLabel;
        });
        faveUSS = faveUSS.filter( (element) => {
            return element.substring(1, element.indexOf("]")).trim() !== deleteLabel;
        });
        ussSetting.sessions = sessUSS;
        ussSetting.favorites = faveUSS;
        await vscode.workspace.getConfiguration().update(this.ussSchema, ussSetting, vscode.ConfigurationTarget.Global);

        // Delete from Jobs Sessions list
        const jobsSetting: any = {...vscode.workspace.getConfiguration().get(this.jobsSchema)};
        let sessJobs: string[] = jobsSetting.sessions;
        let faveJobs: string[] = jobsSetting.favorites;
        sessJobs = sessJobs.filter( (element) => {
            return element.trim() !== deleteLabel;
        });
        faveJobs = faveJobs.filter( (element) => {
            return element.substring(1, element.indexOf("]")).trim() !== deleteLabel;
        });
        jobsSetting.sessions = sessJobs;
        jobsSetting.favorites = faveJobs;
        await vscode.workspace.getConfiguration().update(this.jobsSchema, jobsSetting, vscode.ConfigurationTarget.Global);

        // Remove from list of all profiles
        const index = this.allProfiles.findIndex((deleteItem) => {
            return deleteItem === deletedProfile;
        });
        if (index >= 0) { this.allProfiles.splice(index, 1); }
    }

    public getAllTypes() {
        return this.allTypes;
    }

    public async getNamesForType(type: string) {
        const profileManager = await this.getCliProfileManager(type);
        const profilesForType = (await profileManager.loadAll()).filter((profile) => {
            return profile.type === type;
        });
        return profilesForType.map((profile)=> {
            return profile.name;
        });
    }

    public async directLoad(type: string, name: string): Promise<IProfileLoaded> {
        let directProfile: IProfileLoaded;
        const profileManager = await this.getCliProfileManager(type);
        if (profileManager) {
            directProfile = await profileManager.load({ name });
        }
        return directProfile;
    }

    // ** Functions for handling Profile Information */

    private async urlInfo(input?) {

        let zosmfURL: string;

        const urlInputBox = vscode.window.createInputBox();
        if (input) {
            urlInputBox.value = input;
        }
        urlInputBox.ignoreFocusOut = true;
        urlInputBox.placeholder = localize("createNewConnection.option.prompt.url.placeholder", "https://url:port");
        urlInputBox.prompt = localize("createNewConnection.option.prompt.url",
            "Enter a z/OSMF URL in the format 'https://url:port'.");

        urlInputBox.show();
        zosmfURL = await this.getUrl(urlInputBox);
        urlInputBox.dispose();

        if (!zosmfURL) {
            vscode.window.showInformationMessage(localize("createNewConnection.zosmfURL",
                "No valid value for z/OSMF URL. Operation Cancelled"));
            return undefined;
        }

        const zosmfUrlParsed = this.validateAndParseUrl(zosmfURL);

        return zosmfUrlParsed;
    }

    private async userInfo(input?) {

        let userName: string;

        if (input) {
            userName = input;
        }
        InputBoxOptions = {
            placeHolder: localize("createNewConnection.option.prompt.username.placeholder", "Optional: User Name"),
            prompt: localize("createNewConnection.option.prompt.username",
                                     "Enter the user name for the connection. Leave blank to not store."),
            value: userName
        };
        userName = await vscode.window.showInputBox(InputBoxOptions);

        if (userName === undefined) {
            vscode.window.showInformationMessage(localize("createNewConnection.undefined.username",
                "Operation Cancelled"));
            return undefined;
        }

        return userName;
    }

    private async passwordInfo(input?) {

        let passWord: string;

        if (input) {
            passWord = input;
        }

        InputBoxOptions = {
            placeHolder: localize("createNewConnection.option.prompt.password.placeholder", "Optional: Password"),
            prompt: localize("createNewConnection.option.prompt.password",
                                     "Enter the password for the connection. Leave blank to not store."),
            password: true,
            value: passWord
        };
        passWord = await vscode.window.showInputBox(InputBoxOptions);

        if (passWord === undefined) {
            vscode.window.showInformationMessage(localize("createNewConnection.undefined.passWord",
                "Operation Cancelled"));
            return undefined;
        }

        return passWord;
    }

    private async ruInfo(input?) {

        let rejectUnauthorize: boolean;

        if (input !== undefined) {
            rejectUnauthorize = input;
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            placeHolder: localize("createNewConnection.option.prompt.ru.placeholder", "Reject Unauthorized Connections"),
            ignoreFocusOut: true,
            canPickMany: false
        };

        const selectRU = ["True - Reject connections with self-signed certificates",
            "False - Accept connections with self-signed certificates"];

        const ruOptions = Array.from(selectRU);

        const chosenRU = await vscode.window.showQuickPick(ruOptions, quickPickOptions);

        if (chosenRU === ruOptions[0]) {
            rejectUnauthorize = true;
        } else if (chosenRU === ruOptions[1]) {
            rejectUnauthorize = false;
        } else {
            vscode.window.showInformationMessage(localize("createNewConnection.rejectUnauthorize",
                "Operation Cancelled"));
            return undefined;
        }

        return rejectUnauthorize;
    }

    // ** Functions that Calls Get CLI Profile Manager  */

    private async updateProfile(ProfileInfo, rePrompt?: boolean) {

        for (const type of ZoweExplorerApiRegister.getInstance().registeredApiTypes()) {
            const profileManager = await this.getCliProfileManager(type);
            this.loadedProfile = (await profileManager.load({ name: ProfileInfo.name }));
        }


        const OrigProfileInfo = this.loadedProfile.profile;
        const NewProfileInfo = ProfileInfo.profile;

        if (!rePrompt) {
            OrigProfileInfo.user = NewProfileInfo.user;
            OrigProfileInfo.password = NewProfileInfo.password;
        }

        OrigProfileInfo.host = NewProfileInfo.host;
        OrigProfileInfo.port = NewProfileInfo.port;
        OrigProfileInfo.rejectUnauthorized = NewProfileInfo.rejectUnauthorized;

        const updateParms: IUpdateProfile = {
            name: this.loadedProfile.name,
            merge: true,
            profile: OrigProfileInfo as IProfile
        };

        try {
            (await this.getCliProfileManager(this.loadedProfile.type)).update(updateParms);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
    }

    private async saveProfile(ProfileInfo, ProfileName, ProfileType) {
        let zosmfProfile: IProfile;
        try {
            zosmfProfile = await (await this.getCliProfileManager(ProfileType)).save({ profile: ProfileInfo, name: ProfileName, type: ProfileType });
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        return zosmfProfile.profile;
    }

    private async getCliProfileManager(type: string): Promise<CliProfileManager> {
        let profileManager = this.profileManagerByType.get(type);
        if (!profileManager) {
            profileManager = await new CliProfileManager({
                profileRootDirectory: path.join(getZoweDir(), "profiles"),
                type
            });
            if (profileManager) {
                this.profileManagerByType.set(type, profileManager);
            } else {
                return undefined;
            }
        }
        return profileManager;
    }
}

