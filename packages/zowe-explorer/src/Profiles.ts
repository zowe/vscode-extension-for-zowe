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
import * as zowe from "@zowe/cli";
import * as path from "path";
import {
    Gui,
    IZoweTree,
    IZoweNodeType,
    IZoweUSSTreeNode,
    IZoweDatasetTreeNode,
    IZoweJobTreeNode,
    IZoweTreeNode,
    PersistenceSchemaEnum,
    IProfileValidation,
    IValidationSetting,
    ValidProfileEnum,
    ProfilesCache,
    ZoweVsCodeExtension,
    getFullPath,
    getZoweDir,
    IRegisterClient,
} from "@zowe/zowe-explorer-api";
import { errorHandling, FilterDescriptor, FilterItem } from "./utils/ProfilesUtils";
import { ZoweExplorerApiRegister } from "./ZoweExplorerApiRegister";
import { ZoweExplorerExtender } from "./ZoweExplorerExtender";
import * as globals from "./globals";
import * as nls from "vscode-nls";
import { SettingsConfig } from "./utils/SettingsConfig";
import { ZoweLogger } from "./utils/LoggerUtils";

// Set up localization
nls.config({
    messageFormat: nls.MessageFormat.bundle,
    bundleFormat: nls.BundleFormat.standalone,
})();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();
let InputBoxOptions: vscode.InputBoxOptions;

export class Profiles extends ProfilesCache {
    // Processing stops if there are no profiles detected
    public static async createInstance(log: zowe.imperative.Logger): Promise<Profiles> {
        Profiles.loader = new Profiles(log, vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
        await Profiles.loader.refresh(ZoweExplorerApiRegister.getInstance());
        return Profiles.loader;
    }

    public static getInstance(): Profiles {
        ZoweLogger.trace("Profiles.getInstance called.");
        return Profiles.loader;
    }

    protected static loader: Profiles;

    public loadedProfile: zowe.imperative.IProfileLoaded;
    public validProfile: ValidProfileEnum = ValidProfileEnum.INVALID;
    private dsSchema: string = globals.SETTINGS_DS_HISTORY;
    private ussSchema: string = globals.SETTINGS_USS_HISTORY;
    private jobsSchema: string = globals.SETTINGS_JOBS_HISTORY;
    private mProfileInfo: zowe.imperative.ProfileInfo;
    private profilesOpCancelled = localize("profiles.operation.cancelled", "Operation Cancelled");
    public constructor(log: zowe.imperative.Logger, cwd?: string) {
        super(log, cwd);
    }

    /**
     * Initializes the Imperative ProfileInfo API and reads profiles from disk.
     * During extension activation the ProfileInfo object is cached, so this
     * method can be called multiple times without impacting performance. After
     * the extension has activated, the cache expires so that the latest profile
     * contents will be loaded.
     */
    public async getProfileInfo(): Promise<zowe.imperative.ProfileInfo> {
        ZoweLogger.trace("Profiles.getProfileInfo called.");
        this.mProfileInfo = await super.getProfileInfo();
        return this.mProfileInfo;
    }

    public async checkCurrentProfile(theProfile: zowe.imperative.IProfileLoaded): Promise<IProfileValidation> {
        ZoweLogger.trace("Profiles.checkCurrentProfile called.");
        let profileStatus: IProfileValidation;
        if (!theProfile.profile.tokenType && (!theProfile.profile.user || !theProfile.profile.password)) {
            // The profile will need to be reactivated, so remove it from profilesForValidation
            this.profilesForValidation = this.profilesForValidation.filter(
                (profile) => profile.status === "unverified" && profile.name !== theProfile.name
            );
            let values: string[];
            try {
                values = await Profiles.getInstance().promptCredentials(theProfile?.name);
            } catch (error) {
                await errorHandling(error, theProfile.name, error.message);
                return profileStatus;
            }
            if (values) {
                theProfile.profile.user = values[0];
                theProfile.profile.password = values[1];
                theProfile.profile.base64EncodedAuth = values[2];

                // Validate profile
                profileStatus = await this.getProfileSetting(theProfile);
            } else {
                profileStatus = { name: theProfile.name, status: "unverified" };
            }
        } else {
            // Profile should have enough information to allow validation
            profileStatus = await this.getProfileSetting(theProfile);
        }
        switch (profileStatus.status) {
            case "unverified":
                this.validProfile = ValidProfileEnum.UNVERIFIED;
                break;
            case "inactive":
                this.validProfile = ValidProfileEnum.INVALID;
                break;
            case "active":
                this.validProfile = ValidProfileEnum.VALID;
                break;
        }
        return profileStatus;
    }

    public async getProfileSetting(theProfile: zowe.imperative.IProfileLoaded): Promise<IProfileValidation> {
        ZoweLogger.trace("Profiles.getProfileSetting called.");
        let profileStatus: IProfileValidation;
        let found: boolean = false;
        this.profilesValidationSetting.forEach((instance) => {
            if (instance.name === theProfile.name && instance.setting === false) {
                profileStatus = {
                    status: "unverified",
                    name: instance.name,
                };
                if (this.profilesForValidation.length > 0) {
                    this.profilesForValidation.forEach((profile) => {
                        if (profile.name === theProfile.name && profile.status === "unverified") {
                            found = true;
                        }
                        if (profile.name === theProfile.name && profile.status !== "unverified") {
                            found = true;
                            const index = this.profilesForValidation.lastIndexOf(profile);
                            this.profilesForValidation.splice(index, 1, profileStatus);
                        }
                    });
                }
                if (!found) {
                    this.profilesForValidation.push(profileStatus);
                }
            }
        });
        if (profileStatus === undefined) {
            profileStatus = await this.validateProfiles(theProfile);
        }
        return profileStatus;
    }

    public disableValidation(node: IZoweNodeType): IZoweNodeType {
        ZoweLogger.trace("Profiles.disableValidation called.");
        this.disableValidationContext(node);
        return node;
    }

    public disableValidationContext(node: IZoweNodeType): IZoweNodeType {
        ZoweLogger.trace("Profiles.disableValidationContext called.");
        const theProfile: zowe.imperative.IProfileLoaded = node.getProfile();
        this.validationArraySetup(theProfile, false);
        if (node.contextValue.includes(globals.VALIDATE_SUFFIX)) {
            node.contextValue = node.contextValue.replace(globals.VALIDATE_SUFFIX, "");
            node.contextValue += globals.NO_VALIDATE_SUFFIX;
        } else if (node.contextValue.includes(globals.NO_VALIDATE_SUFFIX)) {
            return node;
        } else {
            node.contextValue += globals.VALIDATE_SUFFIX;
        }
        return node;
    }

    public enableValidation(node: IZoweNodeType): IZoweNodeType {
        ZoweLogger.trace("Profiles.enableValidation called.");
        this.enableValidationContext(node);
        return node;
    }

    public enableValidationContext(node: IZoweNodeType): IZoweNodeType {
        ZoweLogger.trace("Profiles.enableValidationContext called.");
        const theProfile: zowe.imperative.IProfileLoaded = node.getProfile();
        this.validationArraySetup(theProfile, true);
        if (node.contextValue.includes(globals.NO_VALIDATE_SUFFIX)) {
            node.contextValue = node.contextValue.replace(globals.NO_VALIDATE_SUFFIX, "");
            node.contextValue += globals.VALIDATE_SUFFIX;
        } else if (node.contextValue.includes(globals.VALIDATE_SUFFIX)) {
            return node;
        } else {
            node.contextValue += globals.VALIDATE_SUFFIX;
        }

        return node;
    }

    public validationArraySetup(theProfile: zowe.imperative.IProfileLoaded, validationSetting: boolean): IValidationSetting {
        ZoweLogger.trace("Profiles.validationArraySetup called.");
        let found: boolean = false;
        let profileSetting: IValidationSetting;
        if (this.profilesValidationSetting.length > 0) {
            this.profilesValidationSetting.forEach((instance) => {
                if (instance.name === theProfile.name && instance.setting === validationSetting) {
                    found = true;
                    profileSetting = {
                        name: instance.name,
                        setting: instance.setting,
                    };
                }
                if (instance.name === theProfile.name && instance.setting !== validationSetting) {
                    found = true;
                    profileSetting = {
                        name: instance.name,
                        setting: validationSetting,
                    };
                    const index = this.profilesValidationSetting.lastIndexOf(instance);
                    this.profilesValidationSetting.splice(index, 1, profileSetting);
                }
            });
            if (!found) {
                profileSetting = {
                    name: theProfile.name,
                    setting: validationSetting,
                };
                this.profilesValidationSetting.push(profileSetting);
            }
        } else {
            profileSetting = {
                name: theProfile.name,
                setting: validationSetting,
            };
            this.profilesValidationSetting.push(profileSetting);
        }
        return profileSetting;
    }

    /**
     * Adds a new Profile to the provided treeview by clicking the 'Plus' button and
     * selecting which profile you would like to add from the drop-down that appears.
     * The profiles that are in the tree view already will not appear in the
     * drop-down.
     *
     * @export
     * @param {USSTree} zoweFileProvider - either the USS, MVS, JES tree
     */
    public async createZoweSession(zoweFileProvider: IZoweTree<IZoweTreeNode>): Promise<void> {
        ZoweLogger.trace("Profiles.createZoweSession called.");
        let profileNamesList: string[] = [];
        const treeType = zoweFileProvider.getTreeType();
        const allProfiles = Profiles.getInstance().allProfiles;
        try {
            if (allProfiles) {
                // Get all profiles and filter to list of the APIs available for current tree explorer
                profileNamesList = allProfiles
                    .map((profile) => profile.name)
                    .filter((profileName) => {
                        const profile = Profiles.getInstance().loadNamedProfile(profileName);
                        const notInSessionNodes = !zoweFileProvider.mSessionNodes?.find(
                            (sessionNode) => sessionNode.getProfileName() === profileName
                        );
                        if (profile) {
                            if (zoweFileProvider.getTreeType() === PersistenceSchemaEnum.USS) {
                                const ussProfileTypes = ZoweExplorerApiRegister.getInstance().registeredUssApiTypes();
                                return ussProfileTypes.includes(profile.type) && notInSessionNodes;
                            }
                            if (zoweFileProvider.getTreeType() === PersistenceSchemaEnum.Dataset) {
                                const mvsProfileTypes = ZoweExplorerApiRegister.getInstance().registeredMvsApiTypes();
                                return mvsProfileTypes.includes(profile.type) && notInSessionNodes;
                            }
                            if (zoweFileProvider.getTreeType() === PersistenceSchemaEnum.Job) {
                                const jesProfileTypes = ZoweExplorerApiRegister.getInstance().registeredJesApiTypes();
                                return jesProfileTypes.includes(profile.type) && notInSessionNodes;
                            }
                        }

                        return false;
                    });
            }
        } catch (err) {
            ZoweLogger.warn(err);
        }
        // Set Options according to profile management in use

        const createNewConfig = "Create a New Team Configuration File";
        const editConfig = "Edit Team Configuration File";

        const configPick = new FilterDescriptor("\uFF0B " + createNewConfig);
        const configEdit = new FilterDescriptor("\u270F " + editConfig);
        const items: vscode.QuickPickItem[] = [];
        let mProfileInfo: zowe.imperative.ProfileInfo;
        try {
            mProfileInfo = await this.getProfileInfo();
            const profAllAttrs = mProfileInfo.getAllProfiles();
            for (const pName of profileNamesList) {
                const osLocInfo = mProfileInfo.getOsLocInfo(profAllAttrs.find((p) => p.profName === pName));
                items.push(new FilterItem({ text: pName, icon: this.getProfileIcon(osLocInfo)[0] }));
            }
        } catch (err) {
            ZoweLogger.warn(err);
        }

        const quickpick = Gui.createQuickPick();
        let addProfilePlaceholder = "";
        switch (zoweFileProvider.getTreeType()) {
            case PersistenceSchemaEnum.Dataset:
                addProfilePlaceholder = localize(
                    "createZoweSession.ds.quickPickOption",
                    'Choose "Create new..." to define or select a profile to add to the DATA SETS Explorer'
                );
                break;
            case PersistenceSchemaEnum.Job:
                addProfilePlaceholder = localize(
                    "createZoweSession.job.quickPickOption",
                    'Choose "Create new..." to define or select a profile to add to the JOBS Explorer'
                );
                break;
            default:
                // Use USS View as default for placeholder text
                addProfilePlaceholder = localize(
                    "createZoweSession.uss.quickPickOption",
                    'Choose "Create new..." to define or select a profile to add to the USS Explorer'
                );
        }
        if (allProfiles.length > 0) {
            quickpick.items = [configPick, configEdit, ...items];
        } else {
            quickpick.items = [configPick, ...items];
        }

        quickpick.placeholder = addProfilePlaceholder;
        quickpick.ignoreFocusOut = true;
        quickpick.show();
        const choice = await Gui.resolveQuickPick(quickpick);
        quickpick.hide();
        const debugMsg = localize("createZoweSession.cancelled", "Profile selection has been cancelled.");
        if (!choice) {
            ZoweLogger.debug(debugMsg);
            Gui.showMessage(debugMsg);
            return;
        }
        if (choice === configPick) {
            await this.createZoweSchema(zoweFileProvider);
            return;
        }
        if (choice === configEdit) {
            await this.editZoweConfigFile();
            return;
        }
        let chosenProfile: string = "";
        if (choice instanceof FilterDescriptor) {
            chosenProfile = "";
        } else {
            // remove any icons from the label
            chosenProfile = choice.label.replace(/\$\(.*\)\s/g, "");
        }
        if (chosenProfile === "") {
            let config: zowe.imperative.ProfileInfo;
            try {
                config = await this.getProfileInfo();
            } catch (error) {
                ZoweLogger.error(error);
                ZoweExplorerExtender.showZoweConfigError(error.message);
            }
            const profiles = config.getAllProfiles();
            const currentProfile = await this.getProfileFromConfig(profiles[0].profName);
            const filePath = currentProfile.profLoc.osLoc[0];
            await this.openConfigFile(filePath);
        } else if (chosenProfile) {
            ZoweLogger.info(localize("createZoweSession.addProfile", "The profile {0} has been added to the {1} tree.", chosenProfile, treeType));
            await zoweFileProvider.addSession(chosenProfile);
        } else {
            ZoweLogger.debug(debugMsg);
        }
    }

    public async editSession(profileLoaded: zowe.imperative.IProfileLoaded, profileName: string): Promise<any | undefined> {
        const currentProfile = await this.getProfileFromConfig(profileLoaded.name);
        const filePath = currentProfile.profLoc.osLoc[0];
        await this.openConfigFile(filePath);
    }

    public async getProfileType(): Promise<string> {
        ZoweLogger.trace("Profiles.getProfileType called.");
        let profileType: string;
        const profTypes = ZoweExplorerApiRegister.getInstance().registeredApiTypes();
        const typeOptions = Array.from(profTypes);
        if (typeOptions.length === 1 && typeOptions[0] === "zosmf") {
            profileType = typeOptions[0];
        } else {
            const quickPickTypeOptions: vscode.QuickPickOptions = {
                placeHolder: localize("getProfileType.qp.placeholder", "Profile Type"),
                ignoreFocusOut: true,
                canPickMany: false,
            };
            profileType = await Gui.showQuickPick(typeOptions, quickPickTypeOptions);
        }
        return profileType;
    }

    public async createZoweSchema(_zoweFileProvider: IZoweTree<IZoweTreeNode>): Promise<string> {
        ZoweLogger.trace("Profiles.createZoweSchema called.");
        try {
            let user = false;
            let global = true;
            let rootPath = getZoweDir();
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                const choice = await this.getConfigLocationPrompt("create");
                if (choice === undefined) {
                    Gui.showMessage(this.profilesOpCancelled);
                    return;
                }
                if (choice === "project") {
                    rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    user = true;
                    global = false;
                }
            }
            // call check for existing and prompt here
            const existingFile = await this.checkExistingConfig(rootPath);
            if (!existingFile) {
                return;
            }
            if (existingFile.includes("zowe")) {
                if (existingFile.includes("user")) {
                    user = true;
                    global = false;
                } else {
                    user = false;
                    global = true;
                }
            }
            const config = await zowe.imperative.Config.load("zowe", {
                homeDir: getZoweDir(),
                projectDir: getFullPath(rootPath),
            });
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
                config.api.layers.activate(user, global, rootPath);
            }

            const impConfig: zowe.imperative.IImperativeConfig = zowe.getImperativeConfig();
            const knownCliConfig: zowe.imperative.ICommandProfileTypeConfiguration[] = impConfig.profiles;
            // add extenders config info from global variable
            globals.EXTENDER_CONFIG.forEach((item) => {
                knownCliConfig.push(item);
            });
            knownCliConfig.push(impConfig.baseProfile);
            config.setSchema(zowe.imperative.ConfigSchema.buildSchema(knownCliConfig));

            // Note: IConfigBuilderOpts not exported
            // const opts: IConfigBuilderOpts = {
            const opts: any = {
                // getSecureValue: this.promptForProp.bind(this),
                populateProperties: true,
            };

            // Build new config and merge with existing layer
            const newConfig: zowe.imperative.IConfig = await zowe.imperative.ConfigBuilder.build(impConfig, opts);

            // Create non secure profile if VS Code setting is false
            this.createNonSecureProfile(newConfig);

            config.api.layers.merge(newConfig);
            await config.save(false);
            let configName;
            if (user) {
                configName = config.userConfigName;
            } else {
                configName = config.configName;
            }
            await this.openConfigFile(path.join(rootPath, configName));
            await this.promptToRefreshForProfiles(rootPath);
            return path.join(rootPath, configName);
        } catch (err) {
            ZoweLogger.error(err);
            ZoweExplorerExtender.showZoweConfigError(err.message);
        }
    }

    public async editZoweConfigFile(): Promise<void> {
        ZoweLogger.trace("Profiles.editZoweConfigFile called.");
        const existingLayers = await this.getConfigLayers();
        if (existingLayers) {
            if (existingLayers.length === 1) {
                await this.openConfigFile(existingLayers[0].path);
            }
            if (existingLayers.length > 1) {
                const choice = await this.getConfigLocationPrompt("edit");
                switch (choice) {
                    case "project":
                        for (const file of existingLayers) {
                            if (file.user) {
                                await this.openConfigFile(file.path);
                            }
                        }
                        break;
                    case "global":
                        for (const file of existingLayers) {
                            if (file.global) {
                                await this.openConfigFile(file.path);
                            }
                        }
                        break;
                    default:
                        Gui.showMessage(this.profilesOpCancelled);
                        return;
                }
                return;
            }
        }
    }

    public async promptCredentials(profile: string | zowe.imperative.IProfileLoaded, rePrompt?: boolean): Promise<string[]> {
        const userInputBoxOptions: vscode.InputBoxOptions = {
            placeHolder: localize("promptCredentials.userInputBoxOptions.placeholder", "User Name"),
            prompt: localize("promptCredentials.userInputBoxOptions.prompt", "Enter the user name for the connection. Leave blank to not store."),
        };
        const passwordInputBoxOptions: vscode.InputBoxOptions = {
            placeHolder: localize("promptCredentials.passwordInputBoxOptions.placeholder", "Password"),
            prompt: localize("promptCredentials.passwordInputBoxOptions.prompt", "Enter the password for the connection. Leave blank to not store."),
        };

        const promptInfo = await ZoweVsCodeExtension.updateCredentials(
            {
                sessionName: typeof profile !== "string" ? profile.name : profile,
                sessionType: typeof profile !== "string" ? profile.type : undefined,
                rePrompt,
                secure: (await this.getProfileInfo()).isSecured(),
                userInputBoxOptions,
                passwordInputBoxOptions,
            },
            ZoweExplorerApiRegister.getInstance()
        );
        if (!promptInfo) {
            Gui.showMessage(this.profilesOpCancelled);
            return; // See https://github.com/zowe/vscode-extension-for-zowe/issues/1827
        }

        const updSession = promptInfo.profile as zowe.imperative.ISession;
        const returnValue = [updSession.user, updSession.password, updSession.base64EncodedAuth];
        this.updateProfilesArrays(promptInfo);
        return returnValue;
    }

    public async getDeleteProfile(): Promise<zowe.imperative.IProfileLoaded> {
        ZoweLogger.trace("Profiles.getDeleteProfile called.");
        const allProfiles: zowe.imperative.IProfileLoaded[] = this.allProfiles;
        const profileNamesList = allProfiles.map((temprofile) => {
            return temprofile.name;
        });

        if (!profileNamesList.length) {
            Gui.showMessage(localize("getDeleteProfile.noProfiles", "No profiles available"));
            return;
        }

        const quickPickList: vscode.QuickPickOptions = {
            placeHolder: localize("getDeleteProfile.qp.placeholder", "Select the profile you want to delete"),
            ignoreFocusOut: true,
            canPickMany: false,
        };
        const sesName = await Gui.showQuickPick(profileNamesList, quickPickList);

        if (sesName === undefined) {
            Gui.showMessage(this.profilesOpCancelled);
            return;
        }

        return allProfiles.find((temprofile) => temprofile.name === sesName);
    }

    public async deleteProfile(
        datasetTree: IZoweTree<IZoweDatasetTreeNode>,
        ussTree: IZoweTree<IZoweUSSTreeNode>,
        jobsProvider: IZoweTree<IZoweJobTreeNode>,
        node?: IZoweNodeType
    ): Promise<void> {
        ZoweLogger.trace("Profiles.deleteProfile called.");
        let deletedProfile: zowe.imperative.IProfileLoaded;
        if (!node) {
            deletedProfile = await this.getDeleteProfile();
        } else {
            deletedProfile = node.getProfile();
        }
        if (!deletedProfile) {
            return;
        }

        const deleteLabel = deletedProfile.name;

        const currentProfile = await this.getProfileFromConfig(deleteLabel);
        const filePath = currentProfile.profLoc.osLoc[0];
        await this.openConfigFile(filePath);
    }

    public async validateProfiles(theProfile: zowe.imperative.IProfileLoaded): Promise<IProfileValidation> {
        ZoweLogger.trace("Profiles.validateProfiles called.");
        let filteredProfile: IProfileValidation;
        let profileStatus;
        const getSessStatus = await ZoweExplorerApiRegister.getInstance().getCommonApi(theProfile);

        // Check if the profile is already validated as active
        const desiredProfile = this.profilesForValidation.find((profile) => profile.name === theProfile.name && profile.status === "active");
        if (desiredProfile) {
            filteredProfile = {
                status: desiredProfile.status,
                name: desiredProfile.name,
            };
        }

        // If not yet validated or inactive, call getStatus and validate the profile
        // status will be stored in profilesForValidation
        if (filteredProfile === undefined) {
            try {
                if (getSessStatus.getStatus) {
                    profileStatus = await Gui.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: localize("validateProfiles.progress", "Validating {0} Profile.", theProfile.name),
                            cancellable: true,
                        },
                        async (progress, token) => {
                            token.onCancellationRequested(() => {
                                // will be returned as undefined
                                Gui.showMessage(localize("validateProfiles.cancelled", "Validating {0} was cancelled.", theProfile.name));
                            });
                            return getSessStatus.getStatus(theProfile, theProfile.type);
                        }
                    );
                } else {
                    profileStatus = "unverified";
                }

                switch (profileStatus) {
                    case "active":
                        filteredProfile = {
                            status: "active",
                            name: theProfile.name,
                        };
                        this.profilesForValidation.push(filteredProfile);
                        break;
                    case "inactive":
                        filteredProfile = {
                            status: "inactive",
                            name: theProfile.name,
                        };
                        this.profilesForValidation.push(filteredProfile);
                        break;
                    // default will cover "unverified" and undefined
                    default:
                        filteredProfile = {
                            status: "unverified",
                            name: theProfile.name,
                        };
                        this.profilesForValidation.push(filteredProfile);
                        break;
                }
            } catch (error) {
                ZoweLogger.info(localize("validateProfiles.error", "Profile validation failed for {0}.", theProfile.name));
                await errorHandling(error, theProfile.name);
                filteredProfile = {
                    status: "inactive",
                    name: theProfile.name,
                };
                this.profilesForValidation.push(filteredProfile);
            }
        }

        return filteredProfile;
    }

    public async ssoLogin(node?: IZoweNodeType, label?: string): Promise<void> {
        ZoweLogger.trace("Profiles.ssoLogin called.");
        let loginToken: string;
        let loginTokenType: string;
        let creds: string[];
        let serviceProfile: zowe.imperative.IProfileLoaded;
        let session: zowe.imperative.Session;
        if (node) {
            serviceProfile = node.getProfile();
        } else {
            serviceProfile = this.loadNamedProfile(label.trim());
        }
        // This check will handle service profiles that have username and password
        if (serviceProfile.profile.user && serviceProfile.profile.password) {
            Gui.showMessage(localize("ssoAuth.noBase", "This profile does not support token authentication."));
            return;
        }

        try {
            loginTokenType = await ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).getTokenTypeName();
        } catch (error) {
            ZoweLogger.warn(error);
            Gui.showMessage(localize("ssoAuth.noBase", "This profile does not support token authentication."));
            return;
        }
        if (loginTokenType && loginTokenType !== zowe.imperative.SessConstants.TOKEN_TYPE_APIML) {
            // this will handle extenders
            if (node) {
                session = node.getSession();
            } else {
                session = await ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).getSession();
            }
            creds = await this.loginCredentialPrompt();
            if (!creds) {
                return;
            }
            session.ISession.user = creds[0];
            session.ISession.password = creds[1];
            try {
                loginToken = await ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).login(session);
                const profIndex = this.allProfiles.findIndex((profile) => profile.name === serviceProfile.name);
                this.allProfiles[profIndex] = { ...serviceProfile, profile: { ...serviceProfile, ...session } };
                node.setProfileToChoice({
                    ...node.getProfile(),
                    profile: { ...node.getProfile().profile, ...session },
                });
            } catch (error) {
                const message = localize("ssoLogin.error", "Unable to log in with {0}. {1}", serviceProfile.name, error?.message);
                ZoweLogger.error(message);
                Gui.errorMessage(message);
                return;
            }
        } else {
            const baseProfile = await this.fetchBaseProfile();
            if (baseProfile) {
                creds = await this.loginCredentialPrompt();
                if (!creds) {
                    return;
                }
                try {
                    const updSession = new zowe.imperative.Session({
                        hostname: serviceProfile.profile.host,
                        port: serviceProfile.profile.port,
                        user: creds[0],
                        password: creds[1],
                        rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                        tokenType: loginTokenType,
                        type: zowe.imperative.SessConstants.AUTH_TYPE_TOKEN,
                    });
                    loginToken = await ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).login(updSession);
                    const updBaseProfile: zowe.imperative.IProfile = {
                        tokenType: loginTokenType,
                        tokenValue: loginToken,
                    };
                    await this.updateBaseProfileFileLogin(baseProfile, updBaseProfile);
                    const baseIndex = this.allProfiles.findIndex((profile) => profile.name === baseProfile.name);
                    this.allProfiles[baseIndex] = { ...baseProfile, profile: { ...baseProfile, ...updBaseProfile } };
                    node.setProfileToChoice({
                        ...node.getProfile(),
                        profile: { ...node.getProfile().profile, ...updBaseProfile },
                    });
                } catch (error) {
                    const errMsg = localize("ssoLogin.unableToLogin", "Unable to log in with {0}. {1}", serviceProfile.name, error?.message);
                    ZoweLogger.error(errMsg);
                    Gui.errorMessage(errMsg);
                    return;
                }
            }
        }
        Gui.showMessage(localize("ssoLogin.successful", "Login to authentication service was successful."));
    }

    public async ssoLogout(node: IZoweNodeType): Promise<void> {
        ZoweLogger.trace("Profiles.ssoLogout called.");
        const serviceProfile = node.getProfile();
        // This check will handle service profiles that have username and password
        if (serviceProfile.profile?.user && serviceProfile.profile?.password) {
            Gui.showMessage(localize("ssoAuth.noBase", "This profile does not support token authentication."));
            return;
        }
        try {
            // this will handle extenders
            if (serviceProfile.type !== "zosmf" && serviceProfile.profile?.tokenType !== zowe.imperative.SessConstants.TOKEN_TYPE_APIML) {
                await ZoweExplorerApiRegister.getInstance()
                    .getCommonApi(serviceProfile)
                    .logout(await node.getSession());
            } else {
                // this will handle base profile apiml tokens
                const baseProfile = await this.fetchBaseProfile();
                const loginTokenType = ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).getTokenTypeName();
                const updSession = new zowe.imperative.Session({
                    hostname: serviceProfile.profile.host,
                    port: serviceProfile.profile.port,
                    rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                    tokenType: loginTokenType,
                    tokenValue: serviceProfile.profile.tokenValue,
                    type: zowe.imperative.SessConstants.AUTH_TYPE_TOKEN,
                });
                await ZoweExplorerApiRegister.getInstance().getCommonApi(serviceProfile).logout(updSession);

                await this.updateBaseProfileFileLogout(baseProfile);
            }
            Gui.showMessage(localize("ssoLogout.successful", "Logout from authentication service was successful for {0}.", serviceProfile.name));
        } catch (error) {
            const message = localize("ssoLogout.error", "Unable to log out with {0}. {1}", serviceProfile.name, error?.message);
            ZoweLogger.error(message);
            Gui.errorMessage(message);
            return;
        }
    }

    public async openConfigFile(filePath: string): Promise<void> {
        ZoweLogger.trace("Profiles.openConfigFile called.");
        const document = await vscode.workspace.openTextDocument(filePath);
        await Gui.showTextDocument(document);
    }

    private async getConfigLocationPrompt(action: string): Promise<string> {
        ZoweLogger.trace("Profiles.getConfigLocationPrompt called.");
        let placeHolderText: string;
        if (action === "create") {
            placeHolderText = localize("getConfigLocationPrompt.placeholder.create", "Select the location where the config file will be initialized");
        } else {
            placeHolderText = localize("getConfigLocationPrompt.placeholder.edit", "Select the location of the config file to edit");
        }
        const quickPickOptions: vscode.QuickPickOptions = {
            placeHolder: placeHolderText,
            ignoreFocusOut: true,
            canPickMany: false,
        };
        const globalText = localize("getConfigLocationPrompt.showQuickPick.global", "Global: in the Zowe home directory");
        const projectText = localize("getConfigLocationPrompt.showQuickPick.project", "Project: in the current working directory");
        const location = await Gui.showQuickPick([globalText, projectText], quickPickOptions);
        // call check for existing and prompt here
        switch (location) {
            case globalText:
                return "global";
            case projectText:
                return "project";
        }
        return;
    }

    private async checkExistingConfig(filePath: string): Promise<string> {
        ZoweLogger.trace("Profiles.checkExistingConfig called.");
        let found = false;
        let location: string;
        const existingLayers = await this.getConfigLayers();
        for (const file of existingLayers) {
            if (file.path.includes(filePath)) {
                found = true;
                const createButton = localize("checkExistingConfig.createNew.button", "Create New");
                const message = localize(
                    "checkExistingConfig.createNew.message",
                    // eslint-disable-next-line max-len
                    `A Team Configuration File already exists in this location\n{0}\nContinuing may alter the existing file, would you like to proceed?`,
                    file.path
                );
                await Gui.infoMessage(message, { items: [createButton], vsCodeOpts: { modal: true } }).then(async (selection) => {
                    if (selection) {
                        location = path.basename(file.path);
                    } else {
                        await this.openConfigFile(file.path);
                        location = undefined;
                    }
                });
            }
        }
        if (found) {
            return location;
        }
        return "none";
    }

    private async getConfigLayers(): Promise<zowe.imperative.IConfigLayer[]> {
        ZoweLogger.trace("Profiles.getConfigLayers called.");
        const existingLayers: zowe.imperative.IConfigLayer[] = [];
        const config = await zowe.imperative.Config.load("zowe", {
            homeDir: getZoweDir(),
            projectDir: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        });
        const layers = config.layers;
        layers.forEach((layer) => {
            if (layer.exists) {
                existingLayers.push(layer);
            }
        });
        return existingLayers;
    }

    private async promptToRefreshForProfiles(rootPath: string): Promise<void> {
        ZoweLogger.trace("Profiles.promptToRefreshForProfiles called.");
        if (globals.ISTHEIA) {
            const reloadButton = localize("createZoweSchema.reload.button", "Refresh Zowe Explorer");
            const infoMsg = localize(
                "createZoweSchema.reload.infoMessage",
                "Team Configuration file created. Location: {0}. \n Please update file and refresh Zowe Explorer via button or command palette.",
                rootPath
            );
            await Gui.showMessage(infoMsg, { items: [reloadButton] }).then(async (selection) => {
                if (selection === reloadButton) {
                    await vscode.commands.executeCommand("zowe.extRefresh");
                }
            });
        }
    }

    private getProfileIcon(osLocInfo: zowe.imperative.IProfLocOsLoc[]): string[] {
        ZoweLogger.trace("Profiles.getProfileIcon called.");
        const ret: string[] = [];
        for (const loc of osLocInfo ?? []) {
            if (loc.global) {
                ret.push("$(home)");
            } else {
                ret.push("$(folder)");
            }
        }
        return ret;
    }

    private async updateBaseProfileFileLogin(profile: zowe.imperative.IProfileLoaded, updProfile: zowe.imperative.IProfile): Promise<void> {
        ZoweLogger.trace("Profiles.updateBaseProfileFileLogin called.");
        const upd = { profileName: profile.name, profileType: profile.type };
        const mProfileInfo = await this.getProfileInfo();
        const setSecure = mProfileInfo.isSecured();
        await mProfileInfo.updateProperty({ ...upd, property: "tokenType", value: updProfile.tokenType });
        await mProfileInfo.updateProperty({ ...upd, property: "tokenValue", value: updProfile.tokenValue, setSecure });
    }

    private async updateBaseProfileFileLogout(profile: zowe.imperative.IProfileLoaded): Promise<void> {
        ZoweLogger.trace("Profiles.updateBaseProfileFileLogout called.");
        const mProfileInfo = await this.getProfileInfo();
        const setSecure = mProfileInfo.isSecured();
        const prof = mProfileInfo.getAllProfiles(profile.type).find((p) => p.profName === profile.name);
        const mergedArgs = mProfileInfo.mergeArgsForProfile(prof);
        await mProfileInfo.updateKnownProperty({ mergedArgs, property: "tokenValue", value: undefined, setSecure });
        await mProfileInfo.updateKnownProperty({ mergedArgs, property: "tokenType", value: undefined });
    }

    private async loginCredentialPrompt(): Promise<string[]> {
        ZoweLogger.trace("Profiles.loginCredentialPrompt called.");
        let newPass: string;
        const newUser = await this.userInfo();
        if (!newUser) {
            Gui.showMessage(this.profilesOpCancelled);
            return;
        } else {
            newPass = await this.passwordInfo();
            if (!newPass) {
                Gui.showMessage(this.profilesOpCancelled);
                return;
            }
        }
        return [newUser, newPass];
    }

    private async userInfo(input?: string): Promise<string> {
        ZoweLogger.trace("Profiles.userInfo called.");
        let userName: string;

        if (input) {
            userName = input;
        }
        InputBoxOptions = {
            placeHolder: localize("userInfo.inputBoxOptions.placeholder", "User Name"),
            prompt: localize("userInfo.inputBoxOptions.prompt", "Enter the user name for the connection. Leave blank to not store."),
            ignoreFocusOut: true,
            value: userName,
        };
        userName = await Gui.showInputBox(InputBoxOptions);

        if (userName === undefined) {
            Gui.showMessage(this.profilesOpCancelled);
            return undefined;
        }

        return userName.trim();
    }

    private async passwordInfo(input?: string): Promise<string> {
        ZoweLogger.trace("Profiles.passwordInfo called.");
        let passWord: string;

        if (input) {
            passWord = input;
        }

        InputBoxOptions = {
            placeHolder: localize("passwordInfo.inputBoxOptions.placeholder", "Password"),
            prompt: localize("passwordInfo.inputBoxOptions.prompt", "Enter the password for the connection. Leave blank to not store."),
            password: true,
            ignoreFocusOut: true,
            value: passWord,
        };
        passWord = await Gui.showInputBox(InputBoxOptions);

        if (passWord === undefined) {
            Gui.showMessage(this.profilesOpCancelled);
            return undefined;
        }

        return passWord.trim();
    }

    // Temporary solution for handling unsecure profiles until CLI team's work is made
    // Remove secure properties and set autoStore to false when vscode setting is true
    private createNonSecureProfile(newConfig: zowe.imperative.IConfig): void {
        ZoweLogger.trace("Profiles.createNonSecureProfile called.");
        const isSecureCredsEnabled: boolean = SettingsConfig.getDirectValue(globals.SETTINGS_SECURE_CREDENTIALS_ENABLED);
        if (!isSecureCredsEnabled) {
            for (const profile of Object.entries(newConfig?.profiles)) {
                delete newConfig.profiles[profile[0]].secure;
            }
            newConfig.autoStore = false;
        }
    }

    public async refresh(apiRegister?: IRegisterClient): Promise<void> {
        return super.refresh(apiRegister ?? ZoweExplorerApiRegister.getInstance());
    }
}
