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

import {
    createISessionWithoutCredentials,
    createTreeView,
    createValidIProfile,
    createISession,
    createInstanceOfProfileInfo,
    createQuickPickItem,
    createQuickPickInstance,
    createConfigInstance,
    createConfigLoad,
    createTeamConfigMock,
    createUnsecureTeamConfigMock,
} from "../../__mocks__/mockCreators/shared";
import { createDatasetSessionNode, createDatasetTree } from "../../__mocks__/mockCreators/datasets";
import { createProfileManager } from "../../__mocks__/mockCreators/profiles";
import * as vscode from "vscode";
import * as utils from "../../src/utils/ProfilesUtils";
import * as globals from "../../src/globals";
import * as zowe from "@zowe/cli";
import { Gui, ProfilesCache, ZoweTreeNode, ZoweVsCodeExtension } from "@zowe/zowe-explorer-api";
import { Profiles } from "../../src/Profiles";
import { ZoweExplorerExtender } from "../../src/ZoweExplorerExtender";
import { ZoweExplorerApiRegister } from "../../../zowe-explorer/src/ZoweExplorerApiRegister";
import { createUSSNode, createUSSSessionNode, createUSSTree } from "../../__mocks__/mockCreators/uss";
import { createIJobObject, createJobsTree } from "../../__mocks__/mockCreators/jobs";
import * as path from "path";
import { SettingsConfig } from "../../src/utils/SettingsConfig";
import { ZoweLogger } from "../../src/utils/LoggerUtils";
import { ZoweLocalStorage } from "../../src/utils/ZoweLocalStorage";
jest.mock("../../src/utils/LoggerUtils");

jest.mock("child_process");
jest.mock("fs");
jest.mock("fs-extra");

async function createGlobalMocks() {
    const newMocks = {
        log: zowe.imperative.Logger.getAppLogger(),
        mockShowInputBox: jest.fn(),
        mockGetConfiguration: jest.fn(),
        mockCreateQuickPick: createQuickPickInstance(),
        mockShowQuickPick: jest.fn(),
        mockShowInformationMessage: jest.fn(),
        mockShowErrorMessage: jest.fn(),
        mockCreateInputBox: jest.fn(),
        mockLog: jest.fn(),
        mockDebug: jest.fn(),
        mockError: jest.fn(),
        mockConfigurationTarget: jest.fn(),
        mockCreateSessCfgFromArgs: jest.fn(),
        testProfile: createValidIProfile(),
        testTeamConfigProfile: createTeamConfigMock(),
        testUnsecureTeamConfigProfile: createUnsecureTeamConfigMock(),
        testUSSTree: null,
        testSession: createISession(),
        mockCliProfileManager: createProfileManager(),
        ProgressLocation: jest.fn().mockImplementation(() => {
            return {
                Notification: 15,
            };
        }),
        withProgress: null,
        mockCallback: null,
        mockUrlInfo: {
            valid: true,
            protocol: "https",
            host: "fake.com",
            port: 143,
        },
        mockProfileInstance: null,
        mockProfilesCache: null,
        mockConfigInstance: createConfigInstance(),
        mockConfigLoad: null,
    };

    newMocks.mockProfilesCache = new ProfilesCache(zowe.imperative.Logger.getAppLogger());
    newMocks.withProgress = jest.fn().mockImplementation((_progLocation, _callback) => {
        return newMocks.mockCallback;
    });

    Object.defineProperty(vscode.window, "showInformationMessage", {
        value: newMocks.mockShowInformationMessage,
        configurable: true,
    });
    Object.defineProperty(vscode.window, "showInputBox", { value: newMocks.mockShowInputBox, configurable: true });
    Object.defineProperty(vscode.window, "showErrorMessage", {
        value: newMocks.mockShowErrorMessage,
        configurable: true,
    });
    Object.defineProperty(Gui, "showQuickPick", { value: newMocks.mockShowQuickPick, configurable: true });

    Object.defineProperty(Gui, "createQuickPick", {
        value: jest.fn(() => {
            return newMocks.mockCreateQuickPick;
        }),
        configurable: true,
    });
    Object.defineProperty(vscode.window, "createInputBox", { value: newMocks.mockCreateInputBox, configurable: true });
    Object.defineProperty(zowe.ZosmfSession, "createSessCfgFromArgs", {
        value: newMocks.mockCreateSessCfgFromArgs,
        configurable: true,
    });
    Object.defineProperty(globals, "ISTHEIA", { get: () => false, configurable: true });
    Object.defineProperty(vscode.window, "createTreeView", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode, "ConfigurationTarget", {
        value: newMocks.mockConfigurationTarget,
        configurable: true,
    });
    Object.defineProperty(vscode, "ProgressLocation", { value: newMocks.ProgressLocation, configurable: true });
    Object.defineProperty(vscode.window, "withProgress", { value: newMocks.withProgress, configurable: true });

    Object.defineProperty(ZoweLocalStorage, "storage", {
        value: {
            get: jest.fn(() => ({ persistence: true })),
            update: jest.fn(),
            keys: jest.fn(),
        },
        configurable: true,
    });

    newMocks.mockProfileInstance = new Profiles(newMocks.log);
    Object.defineProperty(Profiles, "CreateInstance", {
        value: () => newMocks.mockProfileInstance,
        configurable: true,
    });
    Object.defineProperty(Profiles, "getInstance", {
        value: () => newMocks.mockProfileInstance,
        configurable: true,
    });
    Object.defineProperty(newMocks.mockProfileInstance, "allProfiles", {
        value: [{ name: "sestest" }, { name: "profile1" }, { name: "profile2" }],
        configurable: true,
    });
    Object.defineProperty(newMocks.mockProfileInstance, "getProfileInfo", {
        value: jest.fn(() => {
            return createInstanceOfProfileInfo();
        }),
        configurable: true,
    });

    Object.defineProperty(zowe.imperative, "Config", {
        value: () => newMocks.mockConfigInstance,
        configurable: true,
    });
    newMocks.mockConfigLoad = Object.defineProperty(zowe.imperative.Config, "load", {
        value: jest.fn(() => {
            return createConfigLoad();
        }),
        configurable: true,
    });
    Object.defineProperty(vscode.workspace, "openTextDocument", {
        value: () => {},
        configurable: true,
    });
    Object.defineProperty(vscode.window, "showTextDocument", {
        value: () => {},
        configurable: true,
    });

    Object.defineProperty(utils.ProfilesUtils, "usingTeamConfig", {
        value: jest.fn(() => {
            return true;
        }),
        configurable: true,
    });

    newMocks.testUSSTree = createUSSTree(undefined, [createUSSNode(newMocks.testSession, newMocks.testProfile)], createTreeView());

    return newMocks;
}

afterEach(() => {
    jest.clearAllMocks();
});

describe("Profiles Unit Test - Function createInstance", () => {
    const mockWorkspaceFolders = jest.fn();

    beforeAll(() => {
        // We need to create a persistent "vscode" mock that will apply for the
        // deferred requires in this test suite.
        const originalVscodeMock = jest.requireMock("vscode");
        jest.doMock("vscode", () => {
            Object.defineProperty(originalVscodeMock.workspace, "workspaceFolders", {
                get: mockWorkspaceFolders,
                configurable: true,
            });
            return originalVscodeMock;
        });
    });

    beforeEach(() => {
        // Reset module cache and re-require the Profiles API in each test
        // below. This ensures that the tests cover static properties defined
        // at import time in the zowe-explorer-api package.
        jest.resetModules();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it("should create instance when there is no workspace", async () => {
        mockWorkspaceFolders.mockClear().mockReturnValue(undefined);

        const { Profiles: testProfiles } = require("../../src/Profiles");
        jest.spyOn(testProfiles.prototype, "refresh").mockResolvedValueOnce(undefined);
        const profilesInstance = await testProfiles.createInstance(undefined);
        expect(mockWorkspaceFolders).toHaveBeenCalledTimes(1);
        expect(profilesInstance.cwd).toBeUndefined();
    });

    it("should create instance when there is empty workspace", async () => {
        mockWorkspaceFolders.mockClear().mockReturnValue([undefined]);

        const { Profiles: testProfiles } = require("../../src/Profiles");
        jest.spyOn(testProfiles.prototype, "refresh").mockResolvedValueOnce(undefined);
        const profilesInstance = await testProfiles.createInstance(undefined);
        expect(mockWorkspaceFolders).toHaveBeenCalledTimes(1);
        expect(profilesInstance.cwd).toBeUndefined();
    });

    it("should create instance when there is non-empty workspace", async () => {
        mockWorkspaceFolders.mockClear().mockReturnValue([
            {
                uri: { fsPath: "fakePath" },
            },
        ]);

        const { Profiles: testProfiles } = require("../../src/Profiles");
        jest.spyOn(testProfiles.prototype, "refresh").mockResolvedValueOnce(undefined);
        const profilesInstance = await testProfiles.createInstance(undefined);
        expect(mockWorkspaceFolders).toHaveBeenCalledTimes(1);
        expect(profilesInstance.cwd).toBe("fakePath");
    });
});

describe("Profiles Unit Tests - Function createZoweSession", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            session: createISessionWithoutCredentials(),
            treeView: createTreeView(),
            testDatasetSessionNode: null,
            testDatasetTree: null,
            quickPickItem: createQuickPickItem(),
            qpPlaceholder: 'Choose "Create new..." to define a new profile or select an existing profile to add to the Data Set Explorer',
        };
        newMocks.testDatasetSessionNode = createDatasetSessionNode(newMocks.session, globalMocks.mockProfileInstance);
        newMocks.testDatasetTree = createDatasetTree(newMocks.testDatasetSessionNode, newMocks.treeView);

        return newMocks;
    }
    it("Tests that createZoweSession presents correct message when escaping selection of quickpick", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);
        const spy = jest.spyOn(Gui, "createQuickPick");
        jest.spyOn(Gui, "resolveQuickPick").mockResolvedValueOnce(undefined);
        await Profiles.getInstance().createZoweSession(blockMocks.testDatasetTree);
        expect(spy).toBeCalled();
        expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile selection has been cancelled.");
        expect(ZoweLogger.debug).toBeCalledWith("Profile selection has been cancelled.");
        spy.mockClear();
    });

    it("Tests that createZoweSession runs successfully", async () => {
        const globalMocks = await createGlobalMocks();
        const spyConfig = jest.spyOn(Profiles.getInstance(), "openConfigFile");
        jest.spyOn(Gui, "createQuickPick").mockReturnValue({
            show: jest.fn(),
            hide: jest.fn(),
            value: "test",
        } as any);
        jest.spyOn(Gui, "resolveQuickPick").mockResolvedValueOnce(new utils.FilterDescriptor("Test"));
        jest.spyOn(Profiles.getInstance(), "getProfileInfo").mockResolvedValueOnce(createInstanceOfProfileInfo());
        jest.spyOn(Gui, "showInputBox").mockResolvedValue("test");

        await expect(Profiles.getInstance().createZoweSession(globalMocks.testUSSTree)).resolves.not.toThrow();
        expect(spyConfig).toBeCalled();
        spyConfig.mockClear();
    });

    it("Tests that createZoweSession catches error and log warning", async () => {
        const globalMocks = await createGlobalMocks();
        jest.spyOn(Gui, "createQuickPick").mockReturnValue({
            show: jest.fn(),
            hide: jest.fn(),
            value: "test",
        } as any);
        jest.spyOn(Gui, "resolveQuickPick").mockResolvedValueOnce(new utils.FilterDescriptor("Test"));
        jest.spyOn(Profiles.getInstance(), "getProfileInfo").mockRejectedValueOnce(new Error("test error"));
        await expect(Profiles.getInstance().createZoweSession(globalMocks.testUSSTree)).resolves.not.toThrow();
        expect(ZoweLogger.warn).toBeCalledTimes(1);
        expect(ZoweLogger.warn).toBeCalledWith(Error("test error"));
    });
});

describe("Profiles Unit Tests - Function editZoweConfigFile", () => {
    it("Tests that editZoweConfigFile presents correct message when escaping selection of quickpick", async () => {
        const globalMocks = await createGlobalMocks();

        const spy = jest.spyOn(Gui, "showQuickPick");
        spy.mockResolvedValueOnce(undefined);
        await Profiles.getInstance().editZoweConfigFile();
        expect(spy).toBeCalled();
        expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        spy.mockClear();
    });
    it("Tests that editZoweConfigFile opens correct file when Global is selected", async () => {
        const globalMocks = await createGlobalMocks();

        const spyQuickPick = jest.spyOn(Gui, "showQuickPick");
        spyQuickPick.mockResolvedValueOnce("Global: in the Zowe home directory" as any);
        const spyOpenFile = jest.spyOn(globalMocks.mockProfileInstance, "openConfigFile");
        await Profiles.getInstance().editZoweConfigFile();
        expect(spyQuickPick).toBeCalled();
        expect(spyOpenFile).toBeCalledWith("file://globalPath/.zowe/zowe.config.json");
        spyQuickPick.mockClear();
        spyOpenFile.mockClear();
    });
    it("Tests that editZoweConfigFile opens correct file when only Global config available", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.mockConfigLoad.load.mockResolvedValueOnce({
            layers: [
                {
                    path: "globalPath",
                    exists: true,
                    properties: undefined,
                    global: true,
                    user: false,
                },
            ],
        } as any);
        const spyOpenFile = jest.spyOn(globalMocks.mockProfileInstance, "openConfigFile");
        await Profiles.getInstance().editZoweConfigFile();
        expect(spyOpenFile).toBeCalledWith("globalPath");
        spyOpenFile.mockClear();
    });
    it("Tests that editZoweConfigFile opens correct file when Project is selected", async () => {
        const globalMocks = await createGlobalMocks();

        const spyQuickPick = jest.spyOn(Gui, "showQuickPick");
        spyQuickPick.mockResolvedValueOnce("Project: in the current working directory" as any);
        const spyOpenFile = jest.spyOn(globalMocks.mockProfileInstance, "openConfigFile");
        await Profiles.getInstance().editZoweConfigFile();
        expect(spyQuickPick).toBeCalled();
        expect(spyOpenFile).toBeCalledWith("file://projectPath/zowe.user.config.json");
        spyQuickPick.mockClear();
        spyOpenFile.mockClear();
    });
    it("Tests that editZoweConfigFile opens correct file when only Project config available", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.mockConfigLoad.load.mockResolvedValueOnce({
            layers: [
                {
                    path: "projectPath",
                    exists: true,
                    properties: undefined,
                    global: false,
                    user: true,
                },
            ],
        } as any);
        const spyOpenFile = jest.spyOn(globalMocks.mockProfileInstance, "openConfigFile");
        await Profiles.getInstance().editZoweConfigFile();
        expect(spyOpenFile).toBeCalledWith("projectPath");
        spyOpenFile.mockClear();
    });
});

describe("Profiles Unit Tests - Function createZoweSchema", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            session: createISessionWithoutCredentials(),
            treeView: createTreeView(),
            testDatasetSessionNode: null,
            testDatasetTree: null,
            quickPickItem: createQuickPickItem(),
            mockWsFolder: null,
            qpPlaceholder: 'Choose "Create new..." to define a new profile or select an existing profile to add to the Data Set Explorer',
        };
        newMocks.testDatasetSessionNode = createDatasetSessionNode(newMocks.session, globalMocks.mockProfileInstance);
        newMocks.testDatasetTree = createDatasetTree(newMocks.testDatasetSessionNode, newMocks.treeView);
        Object.defineProperty(zowe, "getZoweDir", {
            value: jest.fn().mockReturnValue("file://globalPath/.zowe"),
            configurable: true,
        });
        Object.defineProperty(vscode.workspace, "workspaceFolders", {
            get: () => [{ uri: "file://projectPath/zowe.user.config.json", name: "zowe.user.config.json", index: 0 }],
            configurable: true,
        });

        return newMocks;
    }
    it("Tests that createZoweSchema presents correct message when escaping selection of config location prompt", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const spy = jest.spyOn(Gui, "showQuickPick");
        spy.mockResolvedValueOnce(undefined);
        await Profiles.getInstance().createZoweSchema(blockMocks.testDatasetTree);
        expect(spy).toBeCalled();
        expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        spy.mockClear();
    });
    it("Tests that createZoweSchema will open correct config file when cancelling creation in location with existing config file", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const spyQuickPick = jest.spyOn(Gui, "showQuickPick");
        globalMocks.mockShowQuickPick.mockResolvedValueOnce("Global: in the Zowe home directory");
        const spyLayers = jest.spyOn(globalMocks.mockProfileInstance, "getConfigLayers");
        spyLayers.mockResolvedValueOnce(createConfigLoad().layers);
        const spyInfoMessage = jest.spyOn(vscode.window, "showInformationMessage");
        globalMocks.mockShowInformationMessage.mockResolvedValueOnce(undefined);
        const spyOpenFile = jest.spyOn(globalMocks.mockProfileInstance, "openConfigFile");
        await Profiles.getInstance().createZoweSchema(blockMocks.testDatasetTree);

        expect(spyQuickPick).toBeCalled();
        expect(spyInfoMessage).toBeCalled();
        expect(spyOpenFile).toBeCalled();

        spyQuickPick.mockClear();
        spyLayers.mockClear();
        spyInfoMessage.mockClear();
        spyOpenFile.mockClear();
    });
    it("Test that createZoweSchema will open config on error if error deals with parsing file", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const spyQuickPick = jest.spyOn(Gui, "showQuickPick");
        globalMocks.mockShowQuickPick.mockResolvedValueOnce("Global: in the Zowe home directory");
        const spyLayers = jest.spyOn(Profiles.getInstance() as any, "checkExistingConfig").mockRejectedValueOnce(new Error("Error Parsing JSON"));
        const spyZoweConfigError = jest.spyOn(ZoweExplorerExtender, "showZoweConfigError");
        jest.spyOn(Gui, "errorMessage").mockResolvedValueOnce("Show config");
        await Profiles.getInstance().createZoweSchema(blockMocks.testDatasetTree);

        expect(spyQuickPick).toBeCalled();
        expect(spyZoweConfigError).toBeCalled();

        spyQuickPick.mockClear();
        spyLayers.mockClear();
        spyZoweConfigError.mockClear();
    });
    it("Test that createZoweSchema will auto create global if VSC not in project and config doesn't exist", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);
        Object.defineProperty(vscode.workspace, "workspaceFolders", {
            get: () => undefined,
            configurable: true,
        });

        const spyQuickPick = jest.spyOn(Gui, "showQuickPick");
        const privateProf = Profiles.getInstance() as any;
        const spyLayers = jest.spyOn(privateProf, "getConfigLayers");
        spyLayers.mockResolvedValueOnce([
            {
                path: "file://projectPath/zowe.user.config.json",
                exists: true,
                properties: undefined,
                global: false,
                user: true,
            },
        ]);
        Object.defineProperty(zowe.imperative.Config, "load", {
            value: jest.fn().mockResolvedValue(createConfigLoad()),
            configurable: true,
        });
        Object.defineProperty(zowe, "getImperativeConfig", {
            value: jest.fn(() => ({
                profiles: [],
                baseProfile: {
                    type: "base",
                    schema: {
                        type: "object",
                        title: "Base profile",
                    },
                } as zowe.imperative.ICommandProfileTypeConfiguration,
            })),
            configurable: true,
        });

        Object.defineProperty(SettingsConfig, "getDirectValue", {
            value: jest.fn().mockReturnValue(true),
            configurable: true,
        });
        const spyConfig = jest.spyOn(Profiles.getInstance(), "openConfigFile").mockImplementation();

        await Profiles.getInstance().createZoweSchema(blockMocks.testDatasetTree);

        expect(spyQuickPick).not.toBeCalled();
        expect(spyConfig).toBeCalled();

        spyQuickPick.mockClear();
        spyLayers.mockClear();
    });

    it("Tests that createZoweSchema will return the config file path", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        Object.defineProperty(globals, "ISTHEIA", { value: true, configurable: true });
        Object.defineProperty(vscode.workspace, "workspaceFolders", {
            value: undefined,
            configurable: true,
        });
        jest.spyOn(globalMocks.mockProfileInstance, "checkExistingConfig").mockReturnValue("zowe");
        jest.spyOn(globalMocks.mockProfileInstance, "getConfigLayers").mockResolvedValueOnce([
            {
                path: "file://projectPath/zowe.user.config.json",
                exists: true,
                properties: undefined,
                global: false,
                user: true,
            },
        ]);

        Object.defineProperty(zowe, "getImperativeConfig", {
            value: jest.fn(() => ({
                profiles: [],
                baseProfile: {
                    type: "base",
                    schema: {
                        type: "object",
                        title: "Base profile",
                    },
                } as zowe.imperative.ICommandProfileTypeConfiguration,
            })),
            configurable: true,
        });

        Object.defineProperty(zowe.imperative.Config, "setSchema", {
            value: jest.fn(),
            configurable: true,
        });

        jest.spyOn(globalMocks.mockProfileInstance, "createNonSecureProfile").mockImplementation();
        const expectedValue =
            process.platform === "win32"
                ? "file:\\globalPath\\.zowe\\zowe.config.json"
                : "file:/globalPath/.zowe/zowe.config.json".split(path.sep).join(path.posix.sep);

        await expect(Profiles.getInstance().createZoweSchema(blockMocks.testDatasetTree)).resolves.toBe(expectedValue);
    });
});

describe("Profiles Unit Tests - function getProfileIcon", () => {
    it("should retrieve the profile icon successfully", () => {
        const privateProfile = Profiles.getInstance() as any;
        expect(
            privateProfile.getProfileIcon([
                {
                    global: "test",
                },
                {
                    user: "test",
                },
            ])
        ).toEqual(["$(home)", "$(folder)"]);
    });
});

describe("Profiles Unit Tests - function promptCredentials", () => {
    it("should return the user credentials", async () => {
        jest.spyOn(Profiles.getInstance(), "getProfileInfo").mockResolvedValue({
            isSecured: () => false,
        } as any);
        jest.spyOn(ZoweVsCodeExtension, "updateCredentials").mockResolvedValue({
            profile: {
                user: "test",
                password: "12345",
                base64EncodedAuth: "encodedAuth",
            } as zowe.imperative.IProfile,
        } as zowe.imperative.IProfileLoaded);
        jest.spyOn(Profiles.getInstance(), "updateProfilesArrays").mockImplementation();
        await expect(Profiles.getInstance().promptCredentials("secure_config_props")).resolves.toEqual(["test", "12345", "encodedAuth"]);
    });
});

describe("Profiles Unit Tests - function getDeleteProfile", () => {
    it("should return the list of profiles cached excluding the now deleted profile", async () => {
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(Profiles.getInstance(), "allProfiles", {
            value: [
                {
                    name: "test1",
                    user: "test1",
                    password: "123",
                    message: "",
                    type: "",
                    failNotFound: false,
                } as zowe.imperative.IProfileLoaded,
                {
                    name: "test2",
                    user: "test2",
                    password: "123",
                    message: "",
                    type: "",
                    failNotFound: false,
                } as zowe.imperative.IProfileLoaded,
            ],
            configurable: true,
        });
        jest.spyOn(Gui, "showQuickPick").mockResolvedValue("test2" as any);
        await expect(privateProfile.getDeleteProfile()).resolves.toEqual({
            name: "test2",
            user: "test2",
            password: "123",
            message: "",
            type: "",
            failNotFound: false,
        });
    });
    it("should show a message saying 'No profiles available'", async () => {
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(Profiles.getInstance(), "allProfiles", {
            value: [],
            configurable: true,
        });
        const showMessageSpy = jest.spyOn(Gui, "showMessage");
        await expect(privateProfile.getDeleteProfile()).resolves.toEqual(undefined);
        expect(showMessageSpy).toBeCalledWith("No profiles available");
    });
    it("should show a message saying 'Operation Cancelled'", async () => {
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(Profiles.getInstance(), "allProfiles", {
            value: [
                {
                    name: "test1",
                    user: "test1",
                    password: "123",
                    message: "",
                    type: "",
                    failNotFound: false,
                } as zowe.imperative.IProfileLoaded,
                {
                    name: "test2",
                    user: "test2",
                    password: "123",
                    message: "",
                    type: "",
                    failNotFound: false,
                } as zowe.imperative.IProfileLoaded,
            ],
            configurable: true,
        });
        const showMessageSpy = jest.spyOn(Gui, "showMessage");
        jest.spyOn(Gui, "showQuickPick").mockResolvedValue(undefined);
        await expect(privateProfile.getDeleteProfile()).resolves.toEqual(undefined);
        expect(showMessageSpy).toBeCalledWith("Operation Cancelled");
    });
});

describe("Profiles Unit Tests - function validateProfile", () => {
    it("should return an object with profile validation status if validated profiles exist", async () => {
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [
                {
                    name: "test1",
                    message: "",
                    type: "",
                    status: "active",
                    failNotFound: false,
                },
            ],
            configurable: true,
        });
        jest.spyOn(Gui, "withProgress").mockResolvedValue(undefined);
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockResolvedValueOnce({
            getStatus: () => "active",
        } as never);
        await expect(
            Profiles.getInstance().validateProfiles({
                name: "test1",
                message: "",
                type: "",
                failNotFound: false,
            })
        ).resolves.toEqual({
            name: "test1",
            status: "active",
        });
    });
    it("should return an object with profile validation status of 'active' from session status if validated profiles does not exist", async () => {
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [],
            configurable: true,
        });
        jest.spyOn(Gui, "withProgress").mockResolvedValue("active");
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockResolvedValueOnce({
            getStatus: () => "active",
        } as never);
        await expect(
            Profiles.getInstance().validateProfiles({
                name: "test1",
                message: "",
                type: "",
                failNotFound: false,
            })
        ).resolves.toEqual({
            name: "test1",
            status: "active",
        });
    });
    it("should return an object with profile validation status of 'inactive' from session status if validated profiles does not exist", async () => {
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [],
            configurable: true,
        });
        jest.spyOn(Gui, "withProgress").mockResolvedValue("inactive");
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockResolvedValueOnce({
            getStatus: () => "inactive",
        } as never);
        await expect(
            Profiles.getInstance().validateProfiles({
                name: "test1",
                message: "",
                type: "",
                failNotFound: false,
            })
        ).resolves.toEqual({
            name: "test1",
            status: "inactive",
        });
    });
    it("should handle the error if call to getStatus fails", async () => {
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [],
            configurable: true,
        });
        const errorHandlingSpy = jest.spyOn(utils, "errorHandling");
        const testError = new Error("failed to validate profile");
        jest.spyOn(Gui, "withProgress").mockImplementation(() => {
            throw testError;
        });
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockResolvedValueOnce({
            getStatus: () => "inactive",
        } as never);
        await Profiles.getInstance().validateProfiles({
            name: "test1",
            message: "",
            type: "",
            failNotFound: false,
        });
        expect(errorHandlingSpy).toBeCalledWith(testError, "test1");
    });
    it("should return an object with profile validation status of 'unverified' from session status if validated profiles doesn't exist", async () => {
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [],
            configurable: true,
        });
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockResolvedValueOnce({
            getStatus: undefined,
        } as never);
        await expect(
            Profiles.getInstance().validateProfiles({
                name: "test1",
                message: "",
                type: "",
                failNotFound: false,
            })
        ).resolves.toEqual({
            name: "test1",
            status: "unverified",
        });
    });
});

describe("Profiles Unit Tests - function deleteProfile", () => {
    it("should delete profile", async () => {
        const globalMocks = await createGlobalMocks();

        const datasetSessionNode = createDatasetSessionNode(globalMocks.testSession, globalMocks.testProfile);
        const datasetTree = createDatasetTree(datasetSessionNode, globalMocks.testProfile);
        const ussSessionNode = [createUSSSessionNode(globalMocks.testSession, globalMocks.testProfile)];
        const ussTree = createUSSTree([], ussSessionNode);
        const jobsTree = createJobsTree(globalMocks.testSession, createIJobObject(), globalMocks.testProfile, createTreeView());

        jest.spyOn(datasetTree, "getFileHistory").mockReturnValue(["[SESTEST]: TEST.LIST"]);
        jest.spyOn(ussTree, "getFileHistory").mockReturnValue(["[SESTEST]: /u/test/test.txt"]);

        const testNode = new (ZoweTreeNode as any)("test", vscode.TreeItemCollapsibleState.None, undefined);
        testNode.setProfileToChoice(globalMocks.testProfile);
        testNode.contextValue = "session server";

        // jest.spyOn(Profiles.getInstance() as any, "deletePrompt").mockReturnValue("success");
        jest.spyOn(SettingsConfig, "setDirectValue").mockImplementation();

        // mock DS call to vs code settings
        jest.spyOn(SettingsConfig, "getDirectValue").mockReturnValueOnce({
            persistence: true,
            favorites: ["test"],
            history: [],
            sessions: ["test", "test1", "test2"],
            fileHistory: ["[TEST]: TEST.LIST"],
            searchHistory: ["TEST.*"],
        });

        // mock USS call to vs code settings
        jest.spyOn(SettingsConfig, "getDirectValue").mockReturnValueOnce({
            persistence: true,
            favorites: ["test"],
            history: [],
            sessions: ["test", "test1", "test2"],
            fileHistory: ["[TEST]: /u/test/test.txt"],
            searchHistory: ["/u/test"],
        });

        // mock Jobs call to vs code settings
        jest.spyOn(SettingsConfig, "getDirectValue").mockReturnValueOnce({
            persistence: true,
            favorites: ["test"],
            history: [],
            sessions: ["test", "test1", "test2"],
            fileHistory: ["TEST"],
            searchHistory: ["Owner:TEST Prefix:*"],
        });

        await expect(Profiles.getInstance().deleteProfile(datasetTree, ussTree, jobsTree, testNode)).resolves.not.toThrow();
    });
});

describe("Profiles Unit Tests - function checkCurrentProfile", () => {
    const environmentSetup = (globalMocks) => {
        globalMocks.testProfile.profile.password = null;
        globalMocks.testProfile.profile.tokenType = "";
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [
                {
                    name: "sestest",
                    message: "",
                    type: "",
                    status: "active",
                    failNotFound: false,
                },
            ],
            configurable: true,
        });
        Object.defineProperty(Profiles.getInstance(), "profilesValidationSetting", {
            value: [
                {
                    name: "otherSestest",
                    setting: false,
                },
            ],
            configurable: true,
        });
    };

    it("should show as active in status of profile", async () => {
        const globalMocks = await createGlobalMocks();
        environmentSetup(globalMocks);
        jest.spyOn(Profiles.getInstance(), "validateProfiles").mockReturnValue({ status: "active", name: "sestest" } as any);
        jest.spyOn(Profiles.getInstance(), "promptCredentials").mockResolvedValue(["sestest", "12345", "base64Auth"]);
        await expect(Profiles.getInstance().checkCurrentProfile(globalMocks.testProfile)).resolves.toEqual({ name: "sestest", status: "active" });
    });
    it("should show as unverified in status of profile", async () => {
        const globalMocks = await createGlobalMocks();
        environmentSetup(globalMocks);
        jest.spyOn(Profiles.getInstance(), "promptCredentials").mockResolvedValue(undefined);
        await expect(Profiles.getInstance().checkCurrentProfile(globalMocks.testProfile)).resolves.toEqual({ name: "sestest", status: "unverified" });
    });
    it("should show as inactive in status of profile", async () => {
        const globalMocks = await createGlobalMocks();
        await expect(Profiles.getInstance().checkCurrentProfile(globalMocks.testProfile)).resolves.toEqual({ name: "sestest", status: "inactive" });
    });
});

describe("Profiles Unit Tests - function getProfileSetting", () => {
    it("should retrive the profile with a status of unverified", async () => {
        const globalMocks = await createGlobalMocks();
        Object.defineProperty(Profiles.getInstance(), "profilesValidationSetting", {
            value: [
                {
                    name: "sestest",
                    setting: false,
                },
                {
                    name: "sestest2",
                    setting: false,
                },
            ],
            configurable: true,
        });
        Object.defineProperty(Profiles.getInstance(), "profilesForValidation", {
            value: [
                {
                    name: "sestest",
                    message: "",
                    type: "",
                    status: "active",
                    failNotFound: false,
                },
                {
                    name: "sestest",
                    message: "",
                    type: "",
                    status: "unverified",
                    failNotFound: false,
                },
            ],
            configurable: true,
        });

        await expect(Profiles.getInstance().getProfileSetting(globalMocks.testProfile)).resolves.toEqual({
            name: "sestest",
            status: "unverified",
        });
    });
});

describe("Profiles Unit Tests - function disableValidationContext", () => {
    it("should disable validation context and return updated node", async () => {
        const globalMocks = await createGlobalMocks();
        const testNode = new (ZoweTreeNode as any)(
            "test",
            vscode.TreeItemCollapsibleState.None,
            undefined,
            globalMocks.testSession,
            globalMocks.testProfile
        );

        // Mimic scenario for toggling validation (branch 1)
        testNode.contextValue = globals.VALIDATE_SUFFIX;
        await Profiles.getInstance().disableValidationContext(testNode);
        expect(testNode.contextValue).toContain(globals.NO_VALIDATE_SUFFIX);

        // Mimic scenario where validation is already disabled, but function was called again (branch 2)
        const prevContext = testNode.contextValue;
        await Profiles.getInstance().disableValidationContext(testNode);
        expect(prevContext).toBe(testNode.contextValue);
    });
});

describe("Profiles Unit Tests - function enableValidationContext", () => {
    it("should enable validation context and return updated node", async () => {
        const globalMocks = await createGlobalMocks();
        const testNode = new (ZoweTreeNode as any)(
            "test",
            vscode.TreeItemCollapsibleState.None,
            undefined,
            globalMocks.testSession,
            globalMocks.testProfile
        );
        // Mimic scenario for toggling validation (branch 1)
        testNode.contextValue = globals.NO_VALIDATE_SUFFIX;
        await Profiles.getInstance().enableValidationContext(testNode);
        expect(testNode.contextValue).toContain(globals.VALIDATE_SUFFIX);

        // Mimic scenario where validation is already enabled, but function was called again (branch 2)
        const prevContext = testNode.contextValue;
        await Profiles.getInstance().enableValidationContext(testNode);
        expect(prevContext).toBe(testNode.contextValue);
    });
});

describe("Profiles Unit Tests - function ssoLogin", () => {
    let testNode;
    let globalMocks;
    beforeEach(async () => {
        globalMocks = await createGlobalMocks();
        testNode = new (ZoweTreeNode as any)(
            "fake",
            vscode.TreeItemCollapsibleState.None,
            undefined,
            globalMocks.testSession,
            globalMocks.testProfile
        );
        testNode.profile.profile.password = undefined;
        testNode.profile.profile.user = "fake";
        Object.defineProperty(Profiles.getInstance(), "allProfiles", {
            value: [
                {
                    name: "fake",
                },
            ],
            configurable: true,
        });
        jest.spyOn(Gui, "showMessage").mockImplementation();
    });
    it("should perform an SSOLogin successfully while fetching the base profile", async () => {
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockReturnValue({
            getTokenTypeName: () => zowe.imperative.SessConstants.TOKEN_TYPE_APIML,
            login: () => "ajshdlfkjshdalfjhas",
        } as never);
        jest.spyOn(Profiles.getInstance() as any, "loginCredentialPrompt").mockReturnValue(["fake", "12345"]);
        jest.spyOn(Profiles.getInstance() as any, "updateBaseProfileFileLogin").mockImplementation();
        await expect(Profiles.getInstance().ssoLogin(testNode, "fake")).resolves.not.toThrow();
    });
    it("should perform an SSOLogin successfully while fetching from session", async () => {
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockReturnValue({
            getTokenTypeName: () => "tokenType",
            login: () => "ajshdlfkjshdalfjhas",
            getSession: () => globalMocks.testSession,
        } as never);
        jest.spyOn(Profiles.getInstance() as any, "loginCredentialPrompt").mockReturnValue(["fake", "12345"]);
        await expect(Profiles.getInstance().ssoLogin(testNode, "fake")).resolves.not.toThrow();
    });
    it("should catch error getting token type and log warning", async () => {
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockReturnValueOnce({
            getTokenTypeName: () => {
                throw new Error("test error.");
            },
            login: () => "ajshdlfkjshdalfjhas",
        } as never);
        await expect(Profiles.getInstance().ssoLogin(testNode, "fake")).resolves.not.toThrow();
        expect(ZoweLogger.warn).toBeCalledWith(Error("test error."));
    });
    it("should catch error during login and log error", async () => {
        jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getCommonApi").mockReturnValueOnce({
            getTokenTypeName: () => zowe.imperative.SessConstants.TOKEN_TYPE_APIML,
            login: () => {
                throw new Error("test error.");
            },
        } as never);
        jest.spyOn(Profiles.getInstance() as any, "loginCredentialPrompt").mockReturnValue(["fake", "12345"]);
        await expect(Profiles.getInstance().ssoLogin(testNode, "fake")).resolves.not.toThrow();
        expect(ZoweLogger.error).toBeCalled();
    });
});

describe("Profiles Unit Tests - function updateBaseProfileFileLogin", () => {
    it("should update the property of mProfileInfo", async () => {
        const privateProfile = Profiles.getInstance() as any;
        const globalMocks = await createGlobalMocks();
        const updatePropertyMock = jest.fn();
        jest.spyOn(privateProfile, "getProfileInfo").mockReturnValue({
            isSecured: () => true,
            updateProperty: updatePropertyMock,
        });
        await expect(privateProfile.updateBaseProfileFileLogin(globalMocks.testProfile, globalMocks.testProfile.profile)).resolves.not.toThrow();
        expect(updatePropertyMock).toBeCalledTimes(2);
    });
});

describe("Profiles Unit Tests - function updateBaseProfileFileLogout", () => {
    it("should update the property of mProfileInfo", async () => {
        const privateProfile = Profiles.getInstance() as any;
        const globalMocks = await createGlobalMocks();
        const updateKnownPropertyMock = jest.fn();
        jest.spyOn(privateProfile, "getProfileInfo").mockReturnValue({
            isSecured: () => true,
            getAllProfiles: () => [
                {
                    profName: "sestest",
                },
            ],
            mergeArgsForProfile: jest.fn(),
            updateKnownProperty: updateKnownPropertyMock,
        });
        await expect(privateProfile.updateBaseProfileFileLogout(globalMocks.testProfile, globalMocks.testProfile.profile)).resolves.not.toThrow();
        expect(updateKnownPropertyMock).toBeCalledTimes(2);
    });
});

describe("Profiles Unit Tests - function createNonSecureProfile", () => {
    it("should create an unsecured profile by removing secure arrays and setting autoStore to false", async () => {
        const globalMocks = await createGlobalMocks();
        const changingConfig = globalMocks.testTeamConfigProfile;
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(SettingsConfig, "getDirectValue", {
            value: jest.fn().mockReturnValue(false),
            configurable: true,
        });
        expect(privateProfile.createNonSecureProfile(changingConfig)).toBeUndefined();
        expect(changingConfig).toEqual(globalMocks.testUnsecureTeamConfigProfile);
    });
});

describe("Profiles Unit Tests - function validationArraySetup", () => {
    it("should setup the validation array", async () => {
        const globalMocks = await createGlobalMocks();
        Object.defineProperty(Profiles.getInstance(), "profilesValidationSetting", {
            value: [
                {
                    name: globalMocks.testProfile.name,
                    setting: true,
                },
                {
                    name: globalMocks.testProfile.name,
                    setting: false,
                },
            ],
        });
        expect(Profiles.getInstance().validationArraySetup(globalMocks.testProfile, true)).toEqual({
            name: globalMocks.testProfile.name,
            setting: true,
        });
    });
});

describe("Profiles Unit Tests - function loginCredentialPrompt", () => {
    afterEach(() => {
        jest.resetAllMocks();
        jest.clearAllMocks();
    });

    it("should show a gui message if there is not a newUser", async () => {
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(privateProfile, "userInfo", {
            value: () => null,
        });
        const showMessageSpy = jest.spyOn(Gui, "showMessage").mockImplementation();
        await expect(privateProfile.loginCredentialPrompt()).resolves.toEqual(undefined);
        expect(showMessageSpy).toBeCalledTimes(1);
    });

    it("should show a gui message if there is not a newUser", async () => {
        const privateProfile = Profiles.getInstance() as any;
        Object.defineProperty(Profiles, "getInstance", {
            value: () => ({
                userInfo: () => "test",
                passwordInfo: () => null,
            }),
        });
        const showMessageSpy = jest.spyOn(Gui, "showMessage").mockImplementation();
        await expect(privateProfile.loginCredentialPrompt()).resolves.toEqual(undefined);
        expect(showMessageSpy).toBeCalledTimes(1);
    });
});
