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
import * as profileLoader from "../../../src/Profiles";
import { Gui, Validation } from "@zowe/zowe-explorer-api";
import { MvsCommandHandler } from "../../../src/command/MvsCommandHandler";
import * as globals from "../../../src/globals";
import * as utils from "../../../src/utils/ProfilesUtils";
import { imperative } from "@zowe/cli";
import { ZoweExplorerApiRegister } from "../../../src/ZoweExplorerApiRegister";
import { ZoweLogger } from "../../../src/utils/LoggerUtils";
import { ZoweLocalStorage } from "../../../src/utils/ZoweLocalStorage";
import { ProfileManagement } from "../../../src/utils/ProfileManagement";

describe("mvsCommandActions unit testing", () => {
    const showErrorMessage = jest.fn();
    const showInputBox = jest.fn();
    const showInformationMessage = jest.fn();
    const showQuickPick = jest.fn();
    const getConfiguration = jest.fn();
    const createOutputChannel = jest.fn();

    const appendLine = jest.fn();
    const outputChannel: vscode.OutputChannel = {
        append: jest.fn(),
        name: "fakeChannel",
        appendLine,
        clear: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
        replace: jest.fn(),
    };
    createOutputChannel.mockReturnValue(outputChannel);
    const qpItem: vscode.QuickPickItem = new utils.FilterDescriptor("\uFF0B " + "Create a new filter");

    const mockLoadNamedProfile = jest.fn();
    Object.defineProperty(profileLoader.Profiles, "createInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [{ name: "firstName" }, { name: "secondName" }],
                defaultProfile: { name: "firstName" },
            };
        }),
    });
    Object.defineProperty(ZoweLocalStorage, "storage", {
        value: {
            get: () => ({ persistence: true, favorites: [], history: [], sessions: ["zosmf"], searchHistory: [], fileHistory: [] }),
            update: jest.fn(),
            keys: () => [],
        },
        configurable: true,
    });
    Object.defineProperty(ZoweLogger, "error", { value: jest.fn(), configurable: true });
    Object.defineProperty(ZoweLogger, "trace", { value: jest.fn(), configurable: true });
    Object.defineProperty(ProfileManagement, "getRegisteredProfileNameList", {
        value: jest.fn().mockReturnValue(["firstName", "secondName"]),
        configurable: true,
    });

    const ProgressLocation = jest.fn().mockImplementation(() => {
        return {
            Notification: 15,
        };
    });
    const submitResponse = {
        success: true,
        commandResponse: "d iplinfo..",
    };

    const withProgress = jest.fn().mockImplementation(() => {
        return submitResponse;
    });

    const session = new imperative.Session({
        user: "fake",
        password: "fake",
        hostname: "fake",
        port: 443,
        protocol: "https",
        type: "basic",
    });

    const profileOne: imperative.IProfileLoaded = {
        name: "aProfile",
        profile: {},
        type: "zosmf",
        message: "",
        failNotFound: false,
    };

    Object.defineProperty(vscode.window, "showErrorMessage", { value: showErrorMessage });
    Object.defineProperty(vscode.window, "showInputBox", { value: showInputBox });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: showInformationMessage });
    Object.defineProperty(vscode.window, "showQuickPick", { value: showQuickPick });
    Object.defineProperty(vscode.window, "createOutputChannel", { value: createOutputChannel });
    Object.defineProperty(vscode, "ProgressLocation", { value: ProgressLocation });
    Object.defineProperty(vscode.window, "withProgress", { value: withProgress });

    getConfiguration.mockReturnValue({
        get: (_setting: string) => undefined,
        update: jest.fn(() => {
            return {};
        }),
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const apiRegisterInstance = ZoweExplorerApiRegister.getInstance();
    const mvsActions = MvsCommandHandler.getInstance();

    it("tests the issueMvsCommand function - theia route", async () => {
        const originalTheia = globals.ISTHEIA;
        const profilesForValidation = { status: "active", name: "fake" };
        Object.defineProperty(globals, "ISTHEIA", { get: () => true });
        // First run enters a command directly
        Object.defineProperty(profileLoader.Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{ name: "firstName", profile: { user: "firstName", password: "12345" } }, { name: "secondName" }],
                    defaultProfile: { name: "firstName" },
                    zosmfProfile: mockLoadNamedProfile,
                    checkCurrentProfile: jest.fn(() => {
                        return profilesForValidation;
                    }),
                    validateProfiles: jest.fn(),
                    getBaseProfile: jest.fn(),
                    validProfile: Validation.ValidationType.VALID,
                };
            }),
        });

        const mockMvsApi = await ZoweExplorerApiRegister.getMvsApi(profileOne);
        const getMvsApiMock = jest.fn();
        getMvsApiMock.mockReturnValue(mockMvsApi);
        ZoweExplorerApiRegister.getMvsApi = getMvsApiMock.bind(ZoweExplorerApiRegister);
        jest.spyOn(mockMvsApi, "getSession").mockReturnValue(session);

        showQuickPick.mockReturnValueOnce("firstName");

        const mockCommandApi = await apiRegisterInstance.getCommandApi(profileOne);
        const getCommandApiMock = jest.fn();
        getCommandApiMock.mockReturnValue(mockCommandApi);
        apiRegisterInstance.getCommandApi = getCommandApiMock.bind(apiRegisterInstance);

        showInputBox.mockReturnValueOnce("/d iplinfo1");
        jest.spyOn(mockCommandApi, "issueMvsCommand").mockReturnValue("iplinfo1" as any);

        await mvsActions.issueMvsCommand();

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command",
        });
        expect(showInputBox.mock.calls.length).toBe(1);
        expect(appendLine.mock.calls.length).toBe(2);
        expect(appendLine.mock.calls[0][0]).toBe("> d iplinfo1");
        expect(appendLine.mock.calls[1][0]).toBe(submitResponse.commandResponse);
        expect(showInformationMessage.mock.calls.length).toBe(0);

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();
        appendLine.mockReset();

        // Second run selects previously added run
        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce({ label: "d iplinfo2" });
        jest.spyOn(Gui, "resolveQuickPick").mockImplementation(() => Promise.resolve(qpItem));

        await mvsActions.issueMvsCommand();

        expect(showQuickPick.mock.calls.length).toBe(2);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command",
        });
        expect(appendLine.mock.calls[0][0]).toBe("> d iplinfo2");
        expect(withProgress.mock.calls.length).toBe(1);

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();
        appendLine.mockReset();

        // Third run selects an alternative value
        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce(new utils.FilterItem({ text: "/d m=cpu" }));
        jest.spyOn(Gui, "resolveQuickPick").mockImplementation(() => Promise.resolve(qpItem));

        await mvsActions.issueMvsCommand();

        expect(showQuickPick.mock.calls.length).toBe(2);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select the Profile to use to submit the command",
        });
        expect(withProgress.mock.calls.length).toBe(1);

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();
        showInformationMessage.mockReset();
        appendLine.mockReset();

        showQuickPick.mockReturnValueOnce("firstName");
        showQuickPick.mockReturnValueOnce(undefined);
        jest.spyOn(Gui, "resolveQuickPick").mockImplementation(() => Promise.resolve(qpItem));

        await mvsActions.issueMvsCommand();

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made. Operation cancelled.");

        showQuickPick.mockReset();
        showInputBox.mockReset();
        withProgress.mockReset();

        Object.defineProperty(globals, "ISTHEIA", { get: () => originalTheia });
    });
});
