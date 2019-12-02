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

import { IProfileLoaded, Logger, CliProfileManager, Imperative, ImperativeConfig, IProfile, Session, ISession } from "@brightside/imperative";
import * as nls from "vscode-nls";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import * as zowe from "@brightside/core";
import * as ProfileLoader from "./ProfileLoader";
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
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

export class Profiles { // Processing stops if there are no profiles detected
    public static async createInstance(log: Logger) {
        Profiles.loader = new Profiles(log);
        await Profiles.loader.refresh();
        return Profiles.loader;

    }
    public static getInstance() {
        return Profiles.loader;
    }
    private static loader: Profiles;
    public allProfiles: IProfileLoaded[] = [];
    public defaultProfile: IProfileLoaded;

    private spawnValue: number = -1;
    private initValue: number = -1;
    private constructor(public log: Logger) {}

    public loadNamedProfile(name: string): IProfileLoaded {
        for (const profile of this.allProfiles) {
            if (profile.name === name && profile.type === "zosmf") {
                return profile;
            }
        }
        throw new Error(localize("loadNamedProfile.error.profileName", "Could not find profile named: ")
            + name + localize("loadNamedProfile.error.period", "."));
    }
    public getDefaultProfile(): IProfileLoaded {
        return this.defaultProfile;
    }
    public async refresh() {
        if (this.isSpawnReqd() === 0) {
            this.allProfiles = ProfileLoader.loadAllProfiles();
            try {
                this.defaultProfile = ProfileLoader.loadDefaultProfile(this.log);
            } catch (err) {
                // Unable to load a default profile
                this.log.warn(localize("loadNamedProfile.warn.noDefaultProfile",
                    "Unable to locate a default profile. CLI may not be installed. ") + err.message);
            }
        } else {
            const profileManager = new CliProfileManager({
                profileRootDirectory: path.join(os.homedir(), ".zowe", "profiles"),
                type: "zosmf"
            });
            this.allProfiles = (await profileManager.loadAll()).filter((profile) => {
                return profile.type === "zosmf";
            });
            if (this.allProfiles.length > 0) {
                this.defaultProfile = (await profileManager.load({ loadDefault: true }));
            } else {
                ProfileLoader.loadDefaultProfile(this.log);
            }
        }
    }

    public listProfile() {
        try {
            this.allProfiles = ProfileLoader.loadAllProfiles();
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        this.allProfiles.map((profile) => {
            return profile.name;
        });
        return this.allProfiles;
    }

    public validateAndParseUrl = (newUrl: string): IUrlValidator => {

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

    public async createNewConnection(profileName) {
        let userName: string;
        let passWord: string;
        let zosmfURL: string;
        let rejectUnauthorize: boolean;
        let options: vscode.InputBoxOptions;

        zosmfURL = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: localize("createNewConnection.option.prompt.url.placeholder", "https://url:port"),
            prompt: localize("createNewConnection.option.prompt.url",
                "Enter a z/OSMF URL in the format 'https://url:port'."),
            validateInput: (text: string) => (this.validateAndParseUrl(text).valid ? "" : "Please enter a valid URL."),
            value: zosmfURL
        });

        if (!zosmfURL) {
            vscode.window.showInformationMessage(localize("createNewConnection.enterzosmfURL",
                "No valid value for z/OSMF URL. Operation Cancelled"));
            return;
        }

        const zosmfUrlParsed = this.validateAndParseUrl(zosmfURL);

        options = {
            placeHolder: localize("createNewConnection.option.prompt.userName.placeholder", "Optional: User Name"),
            prompt: localize("createNewConnection.option.prompt.userName", "Enter the user name for the connection"),
            value: userName
        };
        userName = await vscode.window.showInputBox(options);

        options = {
            placeHolder: localize("createNewConnection.option.prompt.password.placeholder", "Optional: Password"),
            prompt: localize("createNewConnection.option.prompt.password", "Enter a password for the connection"),
            password: true,
            value: passWord
        };
        passWord = await vscode.window.showInputBox(options);

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
            return;
        }

        for (const profile of this.allProfiles) {
            if (profile.name === profileName) {
                vscode.window.showErrorMessage(localize("createNewConnection.duplicateProfileName",
                    "Profile name already exists. Please create a profile using a different name"));
                return;
            }
        }

        IConnection = {
            name: profileName,
            host: zosmfUrlParsed.host,
            port: zosmfUrlParsed.port,
            user: userName,
            password: passWord,
            rejectUnauthorized: rejectUnauthorize
        };

        let newProfile: IProfile;

        try {
            newProfile = await this.saveProfile(IConnection, IConnection.name, "zosmf");
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        await zowe.ZosmfSession.createBasicZosmfSession(newProfile);
        vscode.window.showInformationMessage("Profile " + profileName + " was created.");
        return profileName;
    }

    public async promptCredentials(sessName) {
        let userName: string;
        let passWord: string;
        let options: vscode.InputBoxOptions;

        const loadProfile = this.loadNamedProfile(sessName);
        const loadSession = loadProfile.profile as ISession;

        if (!loadSession.user) {

            options = {
                placeHolder: localize("promptcredentials.option.prompt.userName.placeholder", "User Name"),
                prompt: localize("promptcredentials.option.prompt.userName", "Enter the user name for the connection"),
                value: userName
            };
            userName = await vscode.window.showInputBox(options);

            if (!userName) {
                vscode.window.showErrorMessage(localize("promptcredentials.invalidusername",
                        "Please enter your z/OS username. Operation Cancelled"));
                return;
            } else {
                loadSession.user = userName;
            }
        }

        if (!loadSession.password) {
            passWord = loadSession.password;

            options = {
                placeHolder: localize("promptcredentials.option.prompt.passWord.placeholder", "Password"),
                prompt: localize("promptcredentials.option.prompt.password", "Enter a password for the connection"),
                password: true,
                value: passWord
            };
            passWord = await vscode.window.showInputBox(options);

            if (!passWord) {
                vscode.window.showErrorMessage(localize("promptcredentials.invalidpassword",
                        "Please enter your z/OS password. Operation Cancelled"));
                return;
            } else {
                loadSession.password = passWord.trim();
            }
        }

        const updSession = await zowe.ZosmfSession.createBasicZosmfSession(loadSession as IProfile);
        return [updSession.ISession.user, updSession.ISession.password, updSession.ISession.base64EncodedAuth];
    }

    private async saveProfile(ProfileInfo, ProfileName, ProfileType) {
        const mainZoweDir = path.join(require.resolve("@brightside/core"), "..", "..", "..", "..");
        // we have to mock a few things to get the Imperative.init to work properly
        try {
            (process.mainModule as any).filename = require.resolve("@brightside/core");
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        try {
            ((process.mainModule as any).paths as any).unshift(mainZoweDir);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        if (this.initValue === -1) {
            try {
            // we need to call Imperative.init so that any installed credential manager plugins are loaded
                await Imperative.init({ configurationModule: require.resolve("@brightside/core/lib/imperative.js") });
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
            this.initValue = 0;
        }
        let zosmfProfile: IProfile;
        try {
            zosmfProfile = await new CliProfileManager({
                profileRootDirectory: path.join(ImperativeConfig.instance.cliHome, "profiles"),
                type: "zosmf"
            }).save({ profile: ProfileInfo, name: ProfileName, type: ProfileType });
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }
        return zosmfProfile.profile;
    }

    private isSpawnReqd() {
        if (this.spawnValue === -1) {
            const homedir = os.homedir();
            this.spawnValue = 0;
            try {
                const fileName = path.join(homedir, ".zowe", "settings", "imperative.json");
                const settings = JSON.parse(fs.readFileSync(fileName).toString());
                const value = settings.overrides.CredentialManager;
                this.spawnValue = value !== false ? 0 : 1;
            } catch (error) {
                // default to spawn
                this.spawnValue = 0;
            }
        }
        return this.spawnValue;
    }
}
