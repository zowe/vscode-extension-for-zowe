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

import * as semver from "semver";
import * as vscode from "vscode";
import { ProfilesCache, ZoweExplorerApi } from "../profiles";
import { IZoweLogger, MessageSeverityEnum } from "../logger/IZoweLogger";
import { ISession, IProfileLoaded, Logger } from "@zowe/imperative";
import { IPromptCredentialsOptions, IPromptUserPassOptions } from "./doc/IPromptCredentials";

/**
 * Collection of utility functions for writing Zowe Explorer VS Code extensions.
 */
export class ZoweVsCodeExtension {
    /**
     * @param {string} [requiredVersion] Optional semver string specifying the minimal required version
     *           of Zowe Explorer that needs to be installed for the API to be usable to the client.
     * @returns an initialized instance `ZoweExplorerApi.IApiRegisterClient` that extenders can use
     *          to access the Zowe Explorer APIs or `undefined`. Also `undefined` if requiredVersion
     *          is larger than the version of Zowe Explorer found.
     */
    private static profilesCache = new ProfilesCache(Logger.getAppLogger());
    public static getZoweExplorerApi(requiredVersion?: string): ZoweExplorerApi.IApiRegisterClient {
        const zoweExplorerApi = vscode.extensions.getExtension("Zowe.vscode-extension-for-zowe");
        if (zoweExplorerApi?.exports) {
            const zoweExplorerVersion =
                ((zoweExplorerApi.packageJSON as Record<string, unknown>).version as string) || "15.0.0";
            if (requiredVersion && semver.valid(requiredVersion) && !semver.gte(zoweExplorerVersion, requiredVersion)) {
                return undefined;
            }
            return zoweExplorerApi.exports as ZoweExplorerApi.IApiRegisterClient;
        }
        return undefined;
    }

    /**
     * Reveal an error in VSCode, and log the error to the Imperative log
     *
     */
    public static showVsCodeMessage(message: string, severity: MessageSeverityEnum, logger: IZoweLogger): void {
        logger.logImperativeMessage(message, severity);

        let errorMessage;
        switch (true) {
            case severity < 3:
                errorMessage = `${logger.getExtensionName()}: ${message}`;
                void vscode.window.showInformationMessage(errorMessage);
                break;
            case severity === 3:
                errorMessage = `${logger.getExtensionName()}: ${message}`;
                void vscode.window.showWarningMessage(errorMessage);
                break;
            case severity > 3:
                errorMessage = `${logger.getExtensionName()}: ${message}`;
                void vscode.window.showErrorMessage(errorMessage);
                break;
        }
    }

    /**
     * Helper function to standardize the way we ask the user for credentials
     * @param options Set of options to use when prompting for credentials
     * @returns Instance of IProfileLoaded containing information about the updated profile
     */
    public static async promptCredentials(options: IPromptCredentialsOptions): Promise<IProfileLoaded> {
        const loadProfile = await this.profilesCache.getLoadedProfConfig(options.sessionName.trim());
        const loadSession = loadProfile.profile as ISession;

        const creds = await ZoweVsCodeExtension.promptUserPass({ session: loadSession, ...options });

        if (creds && creds.length > 0) {
            loadProfile.profile.user = loadSession.user = creds[0];
            loadProfile.profile.password = loadSession.password = creds[1];

            const upd = { profileName: loadProfile.name, profileType: loadProfile.type };
            await (
                await this.profilesCache.getProfileInfo()
            ).updateProperty({ ...upd, property: "user", value: creds[0] });
            await (
                await this.profilesCache.getProfileInfo()
            ).updateProperty({ ...upd, property: "password", value: creds[1] });

            return loadProfile;
        }
        return undefined;
    }

    public static async inputBox(inputBoxOptions: vscode.InputBoxOptions): Promise<string> {
        if (!inputBoxOptions.validateInput) {
            // adding this for the theia breaking changes with input boxes
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            inputBoxOptions.validateInput = (value) => null;
        }
        return await vscode.window.showInputBox(inputBoxOptions);
    }

    private static async promptUserPass(options: IPromptUserPassOptions): Promise<string[] | undefined> {
        let newUser = options.session.user;
        if (!newUser || options.rePrompt) {
            newUser = await ZoweVsCodeExtension.inputBox({
                placeHolder: "User Name",
                prompt: "Enter the user name for the connection. Leave blank to not store.",
                ignoreFocusOut: true,
                value: newUser,
                ...(options.userInputBoxOptions ?? {}),
            });
            options.session.user = newUser;
        }
        if (!newUser || (options.rePrompt && newUser === "")) {
            return undefined;
        }

        let newPass = options.session.password;
        if (!newPass || options.rePrompt) {
            newPass = await ZoweVsCodeExtension.inputBox({
                placeHolder: "Password",
                prompt: "Enter the password for the connection. Leave blank to not store.",
                password: true,
                ignoreFocusOut: true,
                value: newPass,
                ...(options.passwordInputBoxOptions ?? {}),
            });
            options.session.password = newPass;
        }
        if (!newPass || (options.rePrompt && newPass === "")) {
            return undefined;
        }

        return [newUser.trim(), newPass.trim()];
    }
}
