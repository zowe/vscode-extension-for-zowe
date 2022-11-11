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

// // import {
//     createISessionWithoutCredentials,
//     createTreeView,
//     createIProfile,
//     createInstanceOfProfile,
//     createQuickPickItem,
//     createQuickPickContent,
//     createInputBox,
//     createSessCfgFromArgs,
//     createPersistentConfig,
//     createInvalidIProfile,
//     createValidIProfile,
//     createISession,
//     createAltTypeIProfile,
//     createInstanceOfProfileInfo,
//     createInstanceOfProfilesCache,
// } from "../../__mocks__/mockCreators/shared";
// import { createDatasetSessionNode, createDatasetTree } from "../../__mocks__/mockCreators/datasets";
// import { createProfileManager, createTestSchemas } from "../../__mocks__/mockCreators/profiles";
// import * as vscode from "vscode";
// import * as utils from "../../src/utils/ProfilesUtils";
// import * as child_process from "child_process";
// import * as globals from "../../src/globals";
// import { ValidProfileEnum, IZoweNodeType, ProfilesCache } from "@zowe/zowe-explorer-api";
// import { ZosmfSession } from "@zowe/cli";
// import { ZoweExplorerApiRegister } from "../../src/ZoweExplorerApiRegister";
// import { Profiles } from "../../src/Profiles";
// import { ZoweUSSNode } from "../../src/uss/ZoweUSSNode";
// import { ZoweDatasetNode } from "../../src/dataset/ZoweDatasetNode";
// import { Job } from "../../src/job/ZoweJobNode";
// import { createUSSSessionNode, createUSSTree } from "../../__mocks__/mockCreators/uss";
// import { createJobsTree, createIJobObject, createJobSessionNode } from "../../__mocks__/mockCreators/jobs";

// jest.mock("vscode");
// jest.mock("child_process");
// jest.mock("fs");
// jest.mock("fs-extra");

// async function createGlobalMocks() {
//     const newMocks = {
//         mockShowInputBox: jest.fn(),
//         mockGetConfiguration: jest.fn(),
//         mockCreateQuickPick: jest.fn(),
//         mockShowQuickPick: jest.fn(),
//         mockShowInformationMessage: jest.fn(),
//         mockGetInstance: jest.fn(),
//         mockShowErrorMessage: jest.fn(),
//         mockCreateInputBox: jest.fn(),
//         mockLog: jest.fn(),
//         mockProfileInstance: null,
//         mockDebug: jest.fn(),
//         mockError: jest.fn(),
//         mockConfigurationTarget: jest.fn(),
//         mockCreateSessCfgFromArgs: jest.fn(),
//         testProfile: createValidIProfile(),
//         testSession: createISession(),
//         mockCliProfileManager: createProfileManager(),
//         ProgressLocation: jest.fn().mockImplementation(() => {
//             return {
//                 Notification: 15,
//             };
//         }),
//         withProgress: null,
//         mockCallback: null,
//         mockUrlInfo: {
//             valid: true,
//             protocol: "https",
//             host: "fake.com",
//             port: 143,
//         },
//         mockGlobalProfileInfo: null,
//     };

//     newMocks.mockProfileInstance = createInstanceOfProfile(newMocks.testProfile);
//     newMocks.mockGetInstance.mockReturnValue(newMocks.mockProfileInstance);
//     newMocks.withProgress = jest.fn().mockImplementation((progLocation, callback) => {
//         return newMocks.mockCallback;
//     });

//     Object.defineProperty(vscode.window, "showInformationMessage", {
//         value: newMocks.mockShowInformationMessage,
//         configurable: true,
//     });
//     Object.defineProperty(vscode.window, "showInputBox", { value: newMocks.mockShowInputBox, configurable: true });
//     Object.defineProperty(vscode.window, "showErrorMessage", {
//         value: newMocks.mockShowErrorMessage,
//         configurable: true,
//     });
//     Object.defineProperty(vscode.window, "showQuickPick", { value: newMocks.mockShowQuickPick, configurable: true });
//     Object.defineProperty(vscode.window, "createQuickPick", {
//         value: newMocks.mockCreateQuickPick,
//         configurable: true,
//     });
//     Object.defineProperty(Profiles, "getInstance", { value: () => newMocks.mockGetInstance, configurable: true });
//     Object.defineProperty(globals, "LOG", { value: newMocks.mockLog, configurable: true });
//     Object.defineProperty(vscode.window, "createInputBox", { value: newMocks.mockCreateInputBox, configurable: true });
//     Object.defineProperty(globals.LOG, "debug", { value: newMocks.mockDebug, configurable: true });
//     Object.defineProperty(ZosmfSession, "createSessCfgFromArgs", {
//         value: newMocks.mockCreateSessCfgFromArgs,
//         configurable: true,
//     });
//     Object.defineProperty(globals.LOG, "error", { value: newMocks.mockError, configurable: true });
//     Object.defineProperty(globals, "ISTHEIA", { get: () => false, configurable: true });
//     Object.defineProperty(vscode.window, "createTreeView", { value: jest.fn(), configurable: true });
//     Object.defineProperty(vscode.workspace, "getConfiguration", {
//         value: newMocks.mockGetConfiguration,
//         configurable: true,
//     });
//     Object.defineProperty(vscode, "ConfigurationTarget", {
//         value: newMocks.mockConfigurationTarget,
//         configurable: true,
//     });
//     Object.defineProperty(vscode, "ProgressLocation", { value: newMocks.ProgressLocation, configurable: true });
//     Object.defineProperty(vscode.window, "withProgress", { value: newMocks.withProgress, configurable: true });
//     Object.defineProperty(ProfilesCache, "getProfileInfo", {
//         value: jest.fn(() => Promise.resolve(createInstanceOfProfileInfo())),
//         configurable: true,
//     });

//     return newMocks;
// }

// describe("Profiles Unit Tests - Function createZoweSession", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             session: createISessionWithoutCredentials(),
//             treeView: createTreeView(),
//             mockLoadNamedProfile: jest.fn(),
//             imperativeProfile: createIProfile(),
//             quickPickItem: createQuickPickItem(),
//             qpPlaceholder:
//                 'Choose "Create new..." to define a new profile or select an existing profile to add to the Data Set Explorer',
//             profiles: null,
//             testJobNode: createIJobObject(),
//             testDatasetSessionNode: null,
//             testUSSSessionNode: null,
//             testJobsSessionNode: null,
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobsTree: null,
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile);
//         newMocks.profileInstance.loadNamedProfile = newMocks.mockLoadNamedProfile;
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profileInstance);
//         newMocks.testDatasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.profileInstance);
//         newMocks.testUSSSessionNode = createUSSSessionNode(newMocks.session, newMocks.profileInstance);
//         newMocks.testJobsSessionNode = createJobSessionNode(newMocks.session, newMocks.profileInstance);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.testDatasetSessionNode, newMocks.treeView);
//         newMocks.testUSSTree = createUSSTree([], [newMocks.testUSSSessionNode], newMocks.treeView);
//         newMocks.testJobsTree = createJobsTree(
//             newMocks.session,
//             newMocks.testJobNode,
//             newMocks.profileInstance,
//             newMocks.treeView
//         );

//         return newMocks;
//     }

//     it("Tests that createZoweSession fails if profile name is invalid", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = undefined;
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(entered);

//         // Assert edge condition user cancels the input path box
//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await Profiles.getInstance().loadNamedProfile("profile1");
//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toEqual(
//             "Profile Name was not supplied. Operation Cancelled"
//         );
//     });

//     it("Tests that createZoweSession successfully creates a new session with profile name supplied by user", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = undefined;
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");

//         // Assert edge condition user cancels the input path box
//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(blockMocks.testDatasetTree.addSession).toBeCalled();
//         expect(blockMocks.testDatasetTree.addSession.mock.calls[0][0]).toEqual({ newprofile: "fake" });
//     });

//     it("Tests that createZoweSession correctly gets APIs available for USS tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = undefined;
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");

//         const apiRegisterInstance = ZoweExplorerApiRegister.getInstance();
//         const registeredTypesSpy = jest.spyOn(apiRegisterInstance, "registeredUssApiTypes");

//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testUSSTree);
//         expect(registeredTypesSpy).toBeCalled();
//     });

//     it("Tests that createZoweSession correctly gets APIs available for dataset tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = undefined;
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");

//         const apiRegisterInstance = ZoweExplorerApiRegister.getInstance();
//         const registeredTypesSpy = jest.spyOn(apiRegisterInstance, "registeredMvsApiTypes");

//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(registeredTypesSpy).toBeCalled();
//     });

//     it("Tests that createZoweSession correctly gets APIs available for dataset tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = undefined;
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");

//         const apiRegisterInstance = ZoweExplorerApiRegister.getInstance();
//         const registeredTypesSpy = jest.spyOn(apiRegisterInstance, "registeredJesApiTypes");

//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testJobsTree);
//         expect(registeredTypesSpy).toBeCalled();
//     });

//     it("Tests that createZoweSession successfully creates a new session with profile name selected from list by user", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = "";

//         // Assert edge condition user cancels the input path box
//         const quickPickContent = createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder);
//         quickPickContent.label = "firstName";
//         globalMocks.mockCreateQuickPick.mockReturnValue(quickPickContent);
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(quickPickContent);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(blockMocks.testDatasetTree.addSession).toBeCalled();
//         expect(blockMocks.testDatasetTree.addSession.mock.calls[0][0]).toBe("firstName");
//     });

//     it("Tests that createZoweSession successfully creates a new session with profile name selected from list by user by typing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = "fake";

//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(blockMocks.testDatasetTree.addSession).not.toBeCalled();
//     });

//     it("Tests that createZoweSession fails if profile not selected", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = "";

//         // Assert edge condition user cancels the input path box
//         const quickPickContent = createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder);
//         quickPickContent.label = undefined;
//         globalMocks.mockCreateQuickPick.mockReturnValue(quickPickContent);
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(quickPickContent);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(blockMocks.testDatasetTree.addSession).not.toBeCalled();
//     });

//     it("Tests that createZoweSession fails if createNewConnection fails", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const entered = "fake";
//         blockMocks.profileInstance.createNewConnection = jest
//             .fn()
//             .mockRejectedValue(new Error("create connection error"));
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(entered);

//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);
//         const errorHandlingSpy = jest.spyOn(utils, "errorHandling");

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(errorHandlingSpy).toBeCalled();
//         expect(errorHandlingSpy.mock.calls[0][0]).toEqual(new Error("create connection error"));
//     });

//     it("Testing that createZoweSession with theia", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const entered = "";
//         const createZoweSessionSpy = jest.spyOn(blockMocks.profiles, "createZoweSession");
//         Object.defineProperty(globals, "ISTHEIA", { get: () => true, configurable: true });
//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(createZoweSessionSpy).toHaveBeenCalled();
//     });

//     it("Testing that createZoweSession with theia fails if no choice", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const entered = null;
//         const createZoweSessionSpy = jest.spyOn(blockMocks.profiles, "createZoweSession");
//         Object.defineProperty(globals, "ISTHEIA", { get: () => true, configurable: true });
//         globalMocks.mockCreateQuickPick.mockReturnValue(
//             createQuickPickContent(entered, [blockMocks.quickPickItem], blockMocks.qpPlaceholder)
//         );
//         jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

//         await blockMocks.profiles.createZoweSession(blockMocks.testDatasetTree);
//         expect(createZoweSessionSpy).toHaveBeenCalled();
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//     });
// });

// describe("Profiles Unit Tests - Function createNewConnection", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             session: createISessionWithoutCredentials(),
//             treeView: createTreeView(),
//             mockLoadNamedProfile: jest.fn(),
//             imperativeProfile: createIProfile(),
//             datasetSessionNode: null,
//             inputBox: createInputBox("input"),
//             quickPickItem: createQuickPickItem(),
//             profiles: null,
//             testSchemas: createTestSchemas(),
//             testDatasetTree: null,
//             profileInstance: null,
//         };
//         newMocks.imperativeProfile.name = "profile1";
//         newMocks.imperativeProfile.profile.user = "fake";
//         newMocks.imperativeProfile.profile.password = "1234";
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile);
//         newMocks.profileInstance.loadNamedProfile = newMocks.mockLoadNamedProfile;
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profileInstance);
//         globalMocks.mockCreateInputBox.mockReturnValue(newMocks.inputBox);
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);

//         return newMocks;
//     }

//     it("Tests that createNewConnection fails if profileName is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         await blockMocks.profiles.createNewConnection("");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Profile name was not supplied. Operation Cancelled"
//         );
//     });

//     it("Tests that createNewConnection fails if profileType is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve(undefined);
//             });

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "No profile type was chosen. Operation Cancelled"
//         );
//     });

//     it("Tests that createNewConnection fails if zOSMF URL is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.getUrl = () =>
//             new Promise((resolve) => {
//                 resolve(undefined);
//             });

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "No valid value for z/OS URL. Operation Cancelled"
//         );
//     });

//     it("Tests that createNewConnection fails if username is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection fails if password is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection fails if rejectUnauthorized is missing", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection fails if profileName is a duplicate", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection(blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowErrorMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowErrorMessage.mock.calls[0][0]).toBe(
//             "Profile name already exists. Please create a profile using a different name"
//         );
//     });

//     it("Tests that createNewConnection creates a new profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
//     });

//     it("Tests that createNewConnection creates a new profile with optional credentials", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValue("");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
//     });

//     it("Tests that createNewConnection stores default port value if 443 is included with hostname", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 443,
//             });
//         globalMocks.mockShowInputBox.mockResolvedValue("");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection("fake");

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
//     });

//     it("Tests that createNewConnection creates a new profile twice in a row", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake1");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection("fake1");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake1 was created.");

//         globalMocks.mockShowInputBox.mockReset();
//         globalMocks.mockShowInformationMessage.mockReset();
//         globalMocks.mockShowInputBox.mockResolvedValue("fake2");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("True - Reject connections with self-signed certificates");

//         await blockMocks.profiles.createNewConnection("fake2");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake2 was created.");
//     });

//     it("Tests that createNewConnection creates an alternate profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 234,
//             });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("13");

//         await blockMocks.profiles.createNewConnection("alternate");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile alternate was created.");
//     });

//     it("Tests that createNewConnection creates an alternate profile with default aNumber value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 234,
//             });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");

//         await blockMocks.profiles.createNewConnection("alternate");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile alternate was created.");
//     });

//     it("Tests that createNewConnection creates an alternate profile with undefined aNumber value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 234,
//             });

//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection("alternate");
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection creates an alternate profile with null aNumber value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[4];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 234,
//             });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");

//         await blockMocks.profiles.createNewConnection("alternate");
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile alternate was created.");
//     });

//     it("Tests that createNewConnection creates an alternate profile with default port value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: undefined,
//             });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("0");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("True");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("126");

//         await blockMocks.profiles.createNewConnection("alternate");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile alternate was created.");
//     });

//     it("Tests that createNewConnection fails to create an alternate profile if port is invalid", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: undefined,
//             });
//         blockMocks.profiles.portInfo = () =>
//             new Promise((resolve) => {
//                 resolve("fake");
//             });

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Invalid Port number provided or operation was cancelled"
//         );
//     });

//     it("Tests that createNewConnection fails to create an alternate profile if aBoolean is invalid", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection fails to create an alternate profile if aOther is undefined", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: 234,
//             });

//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that createNewConnection creates an alternate profile with an optional port", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () =>
//             new Promise((resolve) => {
//                 resolve(blockMocks.testSchemas[2]);
//             });
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(Number("143"));
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.createNewConnection("fake");
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
//     });
// });

// describe("Profiles Unit Tests - Function promptCredentials", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             mockLoadNamedProfile: jest.fn(),
//             imperativeProfile: createIProfile(),
//             profiles: null,
//             profileInstance: null,
//         };
//         newMocks.imperativeProfile.name = "profile1";
//         newMocks.imperativeProfile.profile.user = "fake";
//         newMocks.imperativeProfile.profile.password = "1234";
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.imperativeProfile);
//         newMocks.profiles.allProfiles[1].profile = { user: "test", password: "test" };
//         newMocks.profiles.loadNamedProfile = newMocks.mockLoadNamedProfile;

//         const mockMvsApi = await ZoweExplorerApiRegister.getMvsApi(globalMocks.testProfile);
//         const getMvsApiMock = jest.fn();
//         getMvsApiMock.mockReturnValue(mockMvsApi);
//         globalMocks.testSession.ISession.base64EncodedAuth = "fake";
//         ZoweExplorerApiRegister.getMvsApi = getMvsApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockMvsApi, "getSession").mockReturnValue(globalMocks.testSession);

//         globalMocks.mockProfileInstance.getProfileInfo().usingTeamConfig = true;
//         globalMocks.mockProfileInstance.getProfileInfo().getAllProfiles = [
//             {
//                 profName: newMocks.imperativeProfile.name,
//                 profType: newMocks.imperativeProfile.type,
//                 profile: newMocks.imperativeProfile.name,
//                 profLoc: { osLoc: ["dummy"] },
//             },
//         ];
//         globalMocks.mockProfileInstance.getProfileInfo().mergeArgsForProfile = { knownArgs: [], missingArgs: [] };
//         // Object.defineProperty(ProfilesCache, "getConfigInstance", {
//         //     value: jest.fn(() => {
//         //         return {
//         //             usingTeamConfig: true,
//         //             getAllProfiles: () => [
//         //                 {
//         //                     profName: newMocks.imperativeProfile.name,
//         //                     profType: newMocks.imperativeProfile.type,
//         //                     profile: newMocks.imperativeProfile.name,
//         //                     profLoc: { osLoc: ["dummy"] },
//         //                 },
//         //             ],
//         //             mergeArgsForProfile: () => {
//         //                 return { knownArgs: [], missingArgs: [] };
//         //             },
//         //             updateProperty: jest.fn(),
//         //         };
//         //     }),
//         // });

//         return newMocks;
//     }

//     it("Tests that promptCredentials is executed successfully", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: undefined, password: undefined };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce([1]);

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toEqual(["fake", "fake", "fake"]);
//     });

//     it("Tests that promptCredentials is executed successfully with rePrompt equals true", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: "fake", password: "fake" };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce("Save Credentials");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce([1]);

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name, true);
//         expect(res).toEqual(["fake", "fake", "fake"]);
//     });

//     it("Tests that promptCredentials is executed successfully when profile doesn't have a username", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: undefined, password: "oldfake" };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "oldfake", base64EncodedAuth: "fake" },
//         });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("oldfake");
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce([1]);
//         globalMocks.testSession.ISession.password = "oldfake";

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toEqual(["fake", "oldfake", "fake"]);
//     });

//     it("Tests that promptCredentials is executed successfully when profile doesn't have a password", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: "oldfake", password: undefined };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "oldfake", password: "fake", base64EncodedAuth: "fake" },
//         });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("oldfake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce([1]);
//         globalMocks.testSession.ISession.user = "oldfake";

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toEqual(["oldfake", "fake", "fake"]);
//     });

//     it("Tests that promptCredentials is executed successfully when profile already contains username/password", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: "oldfake", password: "oldfake" };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInformationMessage.mockResolvedValueOnce("Save Credentials");

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toEqual(["fake", "fake", "fake"]);
//     });

//     it("Tests that promptCredentials fails if username is invalid", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: undefined, password: undefined };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toBeUndefined();
//     });

//     it("Tests that promptCredentials fails if password is invalid", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.imperativeProfile.profile = { user: undefined, password: undefined };
//         blockMocks.mockLoadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         const res = await blockMocks.profiles.promptCredentials(blockMocks.imperativeProfile.name);
//         expect(res).toBeUndefined();
//     });
// });

// describe("Profiles Unit Tests - Function validateAndParseUrl", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that validateAndParseUrl returns invalid for invalid URL", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const input = "fake/url";
//         const res = await blockMocks.profiles.validateAndParseUrl(input);
//         expect(res.valid).toBe(false);
//     });

//     it("Tests that validateAndParseUrl successfully validates a URL with a port", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const input = "https://fake:143";

//         const res = await blockMocks.profiles.validateAndParseUrl(input);
//         expect(res.valid).toBe(true);
//         expect(res.host).toBe("fake");
//         // tslint:disable-next-line: no-magic-numbers
//         expect(res.port).toBe(143);
//     });

//     it("Tests that validateAndParseUrl returns invalid for invalid port", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const res = await blockMocks.profiles.validateAndParseUrl("http://10.142.0.23:9999999999/some/path");
//         expect(res.valid).toBe(false);
//     });

//     it("Tests that validateAndParseUrl returns invalid for invalid URL syntax", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const res = await blockMocks.profiles.validateAndParseUrl("https://fake::80");
//         expect(res.valid).toBe(false);
//     });
// });

// describe("Profiles Unit Tests - Function getProfileType", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that getProfileType returns correct profile type when receiving only one type", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         ZoweExplorerApiRegister.getInstance().registeredApiTypes = () => ["zosmf"];

//         const response = await blockMocks.profiles.getProfileType();
//         expect(response).toEqual("zosmf");
//     });

//     it("Tests that getProfileType returns correct profile type when receiving multiple types", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         ZoweExplorerApiRegister.getInstance().registeredApiTypes = () => ["zosmf", "alternate"];
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("alternate");

//         const res = await blockMocks.profiles.getProfileType();
//         expect(res).toEqual("alternate");
//     });
// });

// describe("Profiles Unit Tests - Function getSchema", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             testSchemas: createTestSchemas(),
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that getSchema returns correct schema for zosmf profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         blockMocks.profiles.getCliProfileManager = () => globalMocks.mockCliProfileManager;

//         const response = blockMocks.profiles.getSchema("zosmf");
//         // tslint:disable-next-line: no-magic-numbers
//         expect(response).toEqual(blockMocks.testSchemas[3]);
//     });
// });

// describe("Profiles Unit Tests - Function updateProfile", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             imperativeProfile: createIProfile(),
//             changedImperativeProfile: createIProfile(),
//             profileInfo: null,
//             log: Logger.getAppLogger(),
//             profiles: null,
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.changedImperativeProfile.profile = { user: "test2", password: "test2", rejectUnauthorize: true };
//         newMocks.profileInfo = newMocks.changedImperativeProfile;
//         Object.defineProperty(globalMocks.mockCliProfileManager, "load", {
//             value: jest.fn(() => {
//                 return new Promise((resolve) => {
//                     resolve(newMocks.imperativeProfile);
//                 });
//             }),
//             configurable: true,
//         });
//         Object.defineProperty(globalMocks.mockCliProfileManager, "update", { value: jest.fn(), configurable: true });
//         newMocks.profiles.getCliProfileManager = () => globalMocks.mockCliProfileManager;

//         return newMocks;
//     }

//     it("Tests that updateProfile successfully updates a profile of undefined type", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         blockMocks.profileInfo.type = undefined;

//         await blockMocks.profiles.updateProfile(blockMocks.profileInfo);
//         expect(blockMocks.imperativeProfile.profile).toEqual(blockMocks.changedImperativeProfile.profile);
//     });

//     it("Tests that updateProfile successfully updates a profile of defined type (zosmf)", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         await blockMocks.profiles.updateProfile(blockMocks.profileInfo);
//         expect(blockMocks.imperativeProfile.profile).toEqual(blockMocks.changedImperativeProfile.profile);
//     });
// });

// describe("Profiles Unit Tests - Function editSession", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             session: createISessionWithoutCredentials(),
//             mockLoadNamedProfile: jest.fn(),
//             imperativeProfile: createIProfile(),
//             datasetSessionNode: null,
//             inputBox: createInputBox("input"),
//             profiles: null,
//             testSchemas: createTestSchemas(),
//             profileInstance: null,
//         };
//         newMocks.imperativeProfile.name = "profile1";
//         newMocks.imperativeProfile.profile.user = "fake";
//         newMocks.imperativeProfile.profile.password = "1234";
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile);
//         globalMocks.mockCreateInputBox.mockReturnValue(newMocks.inputBox);
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);

//         return newMocks;
//     }

//     it("Tests that editSession successfully edits a session of type zosmf", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession stores default port value if 443 is included with hostname", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with entered port number", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with default aNumber", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with empty aNumber", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with undefined aNumber", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with null aNumber", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[4];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with empty aOther value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile was successfully updated");
//     });

//     it("Tests that editSession successfully edits a session of type alternate with undefined aOther value", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[2];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession fails with error", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValue("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowErrorMessage.mock.calls.length).toEqual(1);
//     });

//     it("Tests that editSession fails with invalid url supplied", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.getUrl = () => Promise.resolve(undefined);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "No valid value for z/OS URL. Operation Cancelled"
//         );
//     });

//     it("Tests that editSession fails with invalid username supplied", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession fails with invalid password supplied", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession fails with invalid rejectUnauthorized value supplied", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("zosmf");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[0];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession fails with invalid aBoolean value supplied on alternate profile type", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () => Promise.resolve(globalMocks.mockUrlInfo);
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that editSession fails if invalid port value supplied", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.getProfileType = () =>
//             new Promise((resolve) => {
//                 resolve("alternate");
//             });
//         blockMocks.profiles.getSchema = () => blockMocks.testSchemas[1];
//         blockMocks.profiles.urlInfo = () =>
//             Promise.resolve({
//                 valid: true,
//                 protocol: "https",
//                 host: "fake.com",
//                 port: undefined,
//             });
//         globalMocks.mockCreateInputBox.mockReturnValue(blockMocks.inputBox);
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("False");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("123");
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });

//         await blockMocks.profiles.editSession(blockMocks.imperativeProfile, blockMocks.imperativeProfile.name);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Invalid Port number provided or operation was cancelled"
//         );
//     });
// });

// describe("Profiles Unit Tests - Function deleteProfile", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobTree: null,
//             mockLoadNamedProfile: jest.fn(),
//             treeView: createTreeView(),
//             datasetSessionNode: null,
//             USSSessionNode: null,
//             iJob: createIJobObject(),
//             imperativeProfile: createIProfile(),
//             session: null,

//             testSchemas: createTestSchemas(),
//             profileInstance: null,
//         };
//         globalMocks.mockCreateSessCfgFromArgs.mockReturnValue({
//             ISession: { user: "fake", password: "fake", base64EncodedAuth: "fake" },
//         });
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.session = createSessCfgFromArgs(newMocks.imperativeProfile);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile);
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profileInstance);
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.USSSessionNode = createUSSSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);
//         newMocks.testUSSTree = createUSSTree([], [newMocks.USSSessionNode], newMocks.treeView);
//         newMocks.testJobTree = createJobsTree(
//             newMocks.session,
//             newMocks.iJob,
//             newMocks.profileInstance,
//             newMocks.treeView
//         );
//         newMocks.testDatasetTree.addFileHistory("[profile1]: TEST.NODE");
//         newMocks.testUSSTree.addFileHistory("[profile1]: /u/myuser");
//         globalMocks.mockGetConfiguration.mockReturnValue(createPersistentConfig());

//         return newMocks;
//     }

//     it("Tests that deleteProfile successfully deletes a profile from the command palette", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("profile1");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile profile1 was deleted.");
//     });

//     it("Tests that deleteProfile successfully handles missing profile name selection", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         globalMocks.mockShowQuickPick.mockResolvedValueOnce(undefined);

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that deleteProfile successfully handles case where user selects No", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("profile1");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("No");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
//     });

//     it("Tests that deleteProfile successfully executes when there are no profiles to delete", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.profiles.allProfiles = [];

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("No profiles available");
//     });

//     it("Tests that deleteProfile successfully deletes profile from context menu", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const dsNode = new ZoweDatasetNode(
//             "testNode",
//             vscode.TreeItemCollapsibleState.Expanded,
//             null,
//             blockMocks.session,
//             undefined,
//             undefined,
//             blockMocks.imperativeProfile
//         );
//         dsNode.contextValue = globals.DS_SESSION_CONTEXT;
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree,
//             dsNode
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//     });

//     it("Tests that deleteProfile successfully deletes a profile from a dataset tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const startLength = blockMocks.testDatasetTree.mSessionNodes.length;
//         const favoriteLength = blockMocks.testDatasetTree.mFavorites.length;
//         // Use existing test session node
//         const dsNode = blockMocks.testDatasetTree.mSessionNodes[0];
//         // Set up dsNode in Favorites
//         const favedDsNode = dsNode;
//         favedDsNode.contextValue = dsNode.contextValue + globals.FAV_SUFFIX;
//         const dsProfileNodeInFavs = new ZoweDatasetNode(
//             `sestest`,
//             vscode.TreeItemCollapsibleState.None,
//             blockMocks.testDatasetTree.mFavoriteSession,
//             blockMocks.session,
//             globals.FAV_PROFILE_CONTEXT,
//             null,
//             dsNode.getProfile()
//         );
//         dsProfileNodeInFavs.children.push(favedDsNode);
//         blockMocks.testDatasetTree.mFavorites.push(dsProfileNodeInFavs);

//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree,
//             dsNode
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//         expect(blockMocks.testDatasetTree.mSessionNodes.length).toEqual(startLength - 1);
//         expect(blockMocks.testDatasetTree.mFavorites.length).toEqual(favoriteLength);
//     });

//     it("Tests that deleteProfile successfully deletes a profile from a USS tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const startLength = blockMocks.testUSSTree.mSessionNodes.length;
//         const favoriteLength = blockMocks.testUSSTree.mFavorites.length;
//         // Set up session node in USS
//         const ussNode = new ZoweUSSNode(
//             "testNode",
//             vscode.TreeItemCollapsibleState.Expanded,
//             null,
//             blockMocks.session,
//             null,
//             false,
//             blockMocks.imperativeProfile.name,
//             null,
//             blockMocks.imperativeProfile
//         );
//         ussNode.contextValue = globals.USS_SESSION_CONTEXT;
//         ussNode.profile = blockMocks.imperativeProfile;
//         blockMocks.testUSSTree.mSessionNodes.push(ussNode);
//         // Set up favorites
//         const favProfileNode = new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Collapsed, null, null, null);
//         favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
//         const ussNodeAsFavorite = new ZoweUSSNode(
//             "testNode",
//             vscode.TreeItemCollapsibleState.None,
//             favProfileNode,
//             blockMocks.session,
//             null,
//             false,
//             blockMocks.imperativeProfile.name,
//             null,
//             blockMocks.imperativeProfile
//         );
//         favProfileNode.children.push(ussNodeAsFavorite);
//         blockMocks.testUSSTree.mFavorites.push(favProfileNode);
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree,
//             ussNode
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//         expect(blockMocks.testUSSTree.mSessionNodes.length).toEqual(startLength);
//         expect(blockMocks.testUSSTree.mFavorites.length).toEqual(favoriteLength);
//     });

//     it("Tests that deleteProfile successfully deletes a profile from a jobs tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const startLength = blockMocks.testJobTree.mSessionNodes.length;
//         const favoriteLength = blockMocks.testJobTree.mFavorites.length;
//         // Set up job node
//         const jobNode = new Job(
//             "sestest",
//             vscode.TreeItemCollapsibleState.Expanded,
//             null,
//             blockMocks.session,
//             blockMocks.iJob,
//             blockMocks.imperativeProfile
//         );
//         jobNode.contextValue = globals.JOBS_SESSION_CONTEXT;
//         blockMocks.testJobTree.mSessionNodes.push(jobNode);
//         // Set up jobNode in Favorites
//         const favedJobNode = jobNode;
//         favedJobNode.contextValue = jobNode.contextValue + globals.FAV_SUFFIX;
//         const jobProfileNodeInFavs = new Job(
//             `sestest`,
//             vscode.TreeItemCollapsibleState.Expanded,
//             blockMocks.testJobTree.mFavoriteSession,
//             blockMocks.session,
//             null,
//             blockMocks.imperativeProfile
//         );
//         jobProfileNodeInFavs.contextValue = globals.FAV_PROFILE_CONTEXT;
//         jobProfileNodeInFavs.children.push(favedJobNode);
//         blockMocks.testJobTree.mFavorites.push(jobProfileNodeInFavs);
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree,
//             jobNode
//         );

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//         expect(blockMocks.testJobTree.mSessionNodes.length).toEqual(startLength);
//         expect(blockMocks.testJobTree.mFavorites.length).toEqual(favoriteLength);
//     });

//     it("Tests that deleteProfile successfully deletes all related file history items for a dataset tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.testDatasetTree.mFileHistory = ["[SESTEST]: TEST.DATA"];
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("sestest");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//         expect(blockMocks.testDatasetTree.getFileHistory()[0]).toBeUndefined();
//     });

//     it("Tests that deleteProfile successfully deletes all related file history items for a USS tree", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.testUSSTree.addFileHistory("[SESTEST]: /node1/node2/node3.txt");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("sestest");
//         globalMocks.mockShowQuickPick.mockResolvedValueOnce("Delete");

//         await blockMocks.profiles.deleteProfile(
//             blockMocks.testDatasetTree,
//             blockMocks.testUSSTree,
//             blockMocks.testJobTree
//         );
//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe("Profile sestest was deleted.");
//         expect(blockMocks.testUSSTree.getFileHistory()[1]).toBeUndefined();
//     });
// });

// describe("Profiles Unit Tests - Function createInstance", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             mockJSONParse: jest.spyOn(JSON, "parse"),
//             testProfiles: [
//                 { name: "profile1", profile: {}, type: "zosmf" },
//                 { name: "sestest", profile: {}, type: "zosmf" },
//                 { name: "profile1", profile: {}, type: "zosmf" },
//                 { name: "profile2", profile: {}, type: "zosmf" },
//             ],
//         };
//         globalMocks.mockProfileInstance.allProfiles = newMocks.testProfiles;
//         (child_process.spawnSync as any) = jest.fn((program: string, args: string[], options: any) => {
//             const createFakeChildProcess = (status: number, stdout: string, stderr: string) => {
//                 return {
//                     status: 0,
//                     stdout,
//                     stderr,
//                 };
//             };
//             if (args[0].indexOf("getAllProfiles") >= 0) {
//                 return createFakeChildProcess(0, JSON.stringify(newMocks.testProfiles), "");
//             } else {
//                 // load default profile
//                 return createFakeChildProcess(0, JSON.stringify(newMocks.testProfiles[1]), "");
//             }
//         });

//         return newMocks;
//     }

//     it("Tests that createInstance executes successfully", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         expect(Profiles.getInstance()).toStrictEqual(globalMocks.mockProfileInstance);
//     });

//     it("Tests that createInstance successfully routes through to spawn", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.mockJSONParse.mockReturnValueOnce({
//             overrides: { CredentialManager: "ANO" },
//         });
//         blockMocks.mockJSONParse.mockReturnValueOnce(blockMocks.testProfiles);
//         blockMocks.mockJSONParse.mockReturnValueOnce(blockMocks.testProfiles[1]);

//         expect(Profiles.getInstance().allProfiles).toEqual(blockMocks.testProfiles);
//     });

//     it("Tests that createInstance properly handles errors when failing to route through to spawn", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         blockMocks.mockJSONParse.mockReturnValueOnce({
//             overrides: undefined,
//         });
//         blockMocks.mockJSONParse.mockReturnValueOnce(blockMocks.testProfiles);
//         blockMocks.mockJSONParse.mockReturnValueOnce(blockMocks.testProfiles[1]);

//         await Profiles.createInstance(blockMocks.log);
//         expect(Profiles.getInstance().allProfiles).toEqual(blockMocks.testProfiles);
//     });
// });

// describe("Profiles Unit Tests - Property allProfiles", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             testProfiles: [
//                 { name: "profile1", profile: {}, type: "zosmf" },
//                 { name: "sestest", profile: {}, type: "zosmf" },
//                 { name: "profile1", profile: {}, type: "zosmf" },
//                 { name: "profile2", profile: {}, type: "zosmf" },
//             ],
//         };
//         globalMocks.mockProfileInstance.allProfiles = newMocks.testProfiles;
//         return newMocks;
//     }
//     it("Tests that allProfiles contains all profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         expect(Profiles.getInstance().allProfiles).toEqual(blockMocks.testProfiles);
//     });
// });

// describe("Profiles Unit Tests - Function getDefaultProfile", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             defaultProfile: { name: "profile1", profile: {}, type: "zosmf" },
//         };
//         globalMocks.mockProfileInstance.getDefaultProfile.mockReturnValue(newMocks.defaultProfile);
//         return newMocks;
//     }

//     it("Tests that getDefaultProfile returns the default profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         // const profiles = await Profiles.createInstance(blockMocks.log);
//         // const loadedProfiles = profiles.getDefaultProfile();
//         expect(Profiles.getInstance().getDefaultProfile()).toEqual(blockMocks.defaultProfile);
//     });
// });

// describe("Profiles Unit Tests - Function getProfiles", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             testProfiles: [
//                 { name: "sestest", profile: {}, type: "zosmf" },
//                 { name: "profile1", profile: {}, type: "zosmf" },
//                 { name: "profile2", profile: {}, type: "zosmf" },
//             ],
//         };
//         globalMocks.mockProfileInstance.getProfiles.mockReturnValue(newMocks.testProfiles);
//         return newMocks;
//     }
//     it("Tests that getProfiles returns all profiles of the specified type", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         expect(Profiles.getInstance().getProfiles()).toEqual(blockMocks.testProfiles);
//     });
// });

// describe("Profiles Unit Tests - Function directLoad", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             testProfile: { name: "profile1", profile: {}, type: "zosmf" },
//         };
//         globalMocks.mockProfileInstance.directLoad.mockResolvedValue(newMocks.testProfile);

//         return newMocks;
//     }
//     it("Tests that directLoad returns the specified profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         // const profile = await Profiles.getInstance().directLoad("zosmf", "profile1");
//         expect(await Profiles.getInstance().directLoad("zosmf", "profile1")).toEqual(blockMocks.testProfile);
//     });
// });

// describe("Profiles Unit Tests - Function getNamesForType", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that getNamesForType returns all profile names for profiles of the specified type", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         expect((await theProfiles.getNamesForType("zosmf"))[1]).toEqual("profile1");
//     });
// });

// describe("Profiles Unit Tests - Function getAllTypes", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             testTypes: ["zosmf", "banana"],
//         };
//         globalMocks.mockProfileInstance.getAllTypes.mockReturnValue(newMocks.testTypes);
//         return newMocks;
//     }
//     it("Tests that getAllTypes returns the names of all profile types", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         expect(Profiles.getInstance().getAllTypes()).toEqual(blockMocks.testTypes);
//     });
// });

// describe("Profiles Unit Tests - Function loadNamedProfile", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             testProfile: { name: "profile2", profile: {}, type: "zosmf" },
//         };
//         globalMocks.mockProfileInstance.loadNamedProfile.mockReturnValue(newMocks.testProfile);
//         return newMocks;
//     }
//     it("Tests that loadNamedProfile returns the profile with the specified name", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         expect(Profiles.getInstance().loadNamedProfile("profile2")).toEqual(blockMocks.testProfile);
//     });

//     it("Tests that loadNamedProfile fails to load a non-existent profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         let success = false;
//         const profiles = await Profiles.createInstance(blockMocks.log);
//         try {
//             profiles.loadNamedProfile("profile3");
//         } catch (error) {
//             expect(error.message).toEqual(
//                 "Zowe Explorer Profiles Cache error: Could not find profile named: profile3."
//             );
//             success = true;
//         }
//         expect(success).toBe(true);
//     });
// });

// describe("Profiles Unit Tests - Function checkCurrentProfile", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             invalidProfile: createInvalidIProfile(),
//             validProfile: createValidIProfile(),
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that checkCurrentProfile is successful when user is prompted for missing credentials", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         Object.defineProperty(theProfiles, "validateProfiles", {
//             value: jest.fn(() => {
//                 return {
//                     status: "active",
//                     name: blockMocks.invalidProfile.name,
//                 };
//             }),
//         });
//         blockMocks.profiles.promptCredentials = jest.fn(() => {
//             return ["test", "test", "test"];
//         });
//         theProfiles.validProfile = -1;
//         await theProfiles.checkCurrentProfile(blockMocks.invalidProfile);
//         expect(theProfiles.validProfile).toBe(ValidProfileEnum.VALID);
//     });

//     it("Tests that checkCurrentProfile is successful for a profile with valid stored credentials", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "validateProfiles", {
//             value: jest.fn(() => {
//                 return {
//                     status: "active",
//                     name: blockMocks.invalidProfile.name,
//                 };
//             }),
//         });
//         theProfiles.validProfile = -1;
//         await theProfiles.checkCurrentProfile(blockMocks.validProfile);
//         expect(theProfiles.validProfile).toBe(ValidProfileEnum.VALID);
//     });

//     it("Tests that checkCurrentProfile fails when user enters invalid credentials", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const mockValidateProfiles = jest.fn();
//         Object.defineProperty(theProfiles, "validateProfiles", {
//             value: mockValidateProfiles,
//         });
//         mockValidateProfiles.mockReturnValue({
//             status: "inactive",
//             name: blockMocks.invalidProfile.name,
//         });
//         blockMocks.profiles.promptCredentials = jest.fn(() => {
//             return undefined;
//         });
//         await theProfiles.checkCurrentProfile(blockMocks.invalidProfile);
//         expect(theProfiles.validProfile).toBe(ValidProfileEnum.INVALID);
//     });

//     it("Tests that checkCurrentProfile will handle inactive profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "validateProfiles", {
//             value: jest.fn(() => {
//                 return {
//                     status: "inactive",
//                     name: blockMocks.invalidProfile.name,
//                 };
//             }),
//         });
//         blockMocks.profiles.promptCredentials = jest.fn(() => {
//             return undefined;
//         });
//         await theProfiles.checkCurrentProfile(blockMocks.invalidProfile);
//         expect(theProfiles.validProfile).toBe(ValidProfileEnum.INVALID);
//     });

//     it("Tests that checkCurrentProfile will handle unverified profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "getProfileSetting", {
//             value: jest.fn(() => {
//                 return {
//                     status: "unverified",
//                     name: blockMocks.invalidProfile.name,
//                 };
//             }),
//         });

//         const response = await theProfiles.checkCurrentProfile({
//             ...blockMocks.invalidProfile,
//             ...{ profile: { tokenType: true } },
//         });
//         expect(response).toEqual({ name: blockMocks.invalidProfile.name, status: "unverified" });
//     });

//     it("Tests that checkCurrentProfile will handle inactive profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "validateProfiles", {
//             value: jest.fn(() => {
//                 return {
//                     status: "inactive",
//                     name: blockMocks.invalidProfile.name,
//                 };
//             }),
//         });
//         blockMocks.profiles.promptCredentials = jest.fn(() => {
//             return undefined;
//         });
//         await theProfiles.checkCurrentProfile(blockMocks.invalidProfile);
//         expect(theProfiles.validProfile).toBe(ValidProfileEnum.INVALID);
//     });
// });

// describe("Profiles Unit Tests - Function getProfileSetting", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             imperativeProfile: createInvalidIProfile(),
//             validProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             mockNode: null,
//             mockDisableValidationContext: jest.fn(),
//             mockLoadNamedProfile: jest.fn(),
//             mockValidateProfile: jest.fn(),
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     loadNamedProfile: newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile),
//                     validateProfiles: newMocks.mockValidateProfile.mockReturnValue({
//                         status: "active",
//                         name: "sestest",
//                     }),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that getProfileSetting returns profile status for disabled profile already set in profilesForValidation", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultSetting = { status: "unverified", name: "sestest" };
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: false }];
//         theProfiles.profilesForValidation = [{ status: "unverified", name: "sestest" }];

//         const response = await theProfiles.getProfileSetting(blockMocks.imperativeProfile);
//         expect(response).toEqual(resultSetting);
//     });

//     it("Tests that getProfileSetting returns profile status for disabled profile not already set in profilesForValidation", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultSetting = { status: "unverified", name: "sestest" };
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: false }];
//         theProfiles.profilesForValidation = [{ status: "inactive", name: "sestest" }];

//         const response = await theProfiles.getProfileSetting(blockMocks.imperativeProfile);
//         expect(response).toEqual(resultSetting);
//     });

//     it("Tests that getProfileSetting returns profile status for disabled profile non existant in profilesForValidation", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultSetting = { status: "unverified", name: "sestest" };
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: false }];
//         theProfiles.profilesForValidation = [];

//         const response = await theProfiles.getProfileSetting(blockMocks.imperativeProfile);
//         expect(response).toEqual(resultSetting);
//     });

//     it("Tests that getProfileSetting returns profile status for enabled profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultSetting = { status: "inactive", name: "sestest" };
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: true }];
//         globalMocks.mockCallback = "inactive";

//         const response = await theProfiles.getProfileSetting(blockMocks.imperativeProfile);
//         expect(response).toEqual(resultSetting);
//     });
// });

// describe("Profiles Unit Tests - Function disableValidation", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobTree: null,
//             treeView: createTreeView(),
//             datasetSessionNode: null,
//             ussSessionNode: null,
//             iJob: createIJobObject(),
//             profiles: null,
//             imperativeProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             mockNode: null,
//             mockDisableValidationContext: jest.fn(),
//             mockLoadNamedProfile: jest.fn(),
//         };
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);
//         newMocks.testJobTree = createJobsTree(
//             newMocks.session,
//             newMocks.iJob,
//             newMocks.imperativeProfile,
//             newMocks.treeView
//         );
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     loadNamedProfile: newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile),
//                     disableValidationContext: newMocks.mockDisableValidationContext.mockReturnValue(
//                         newMocks.datasetSessionNode
//                     ),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that disableValidation returns correct node context", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const ussSessionNode = createUSSSessionNode(blockMocks.session, blockMocks.imperativeProfile);
//         const ussTree = createUSSTree([], [ussSessionNode], blockMocks.treeView);
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         // tslint:disable-next-line:max-line-length
//         const response = await theProfiles.disableValidation(blockMocks.datasetSessionNode);
//         expect(response.contextValue).toContain(`${globals.VALIDATE_SUFFIX}false`);
//         expect(response.contextValue).not.toContain(`${globals.VALIDATE_SUFFIX}true`);
//     });

//     it("Tests that disableValidation returns correct node context if already enabled", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const ussSessionNode = createUSSSessionNode(blockMocks.session, blockMocks.imperativeProfile);
//         const ussTree = createUSSTree([], [ussSessionNode], blockMocks.treeView);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}true`;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         // tslint:disable-next-line:max-line-length
//         const response = await theProfiles.disableValidation(resultNode);
//         expect(response.contextValue).toContain(`${globals.VALIDATE_SUFFIX}false`);
//         expect(response.contextValue).not.toContain(`${globals.VALIDATE_SUFFIX}true`);
//     });
// });

// describe("Profiles Unit Tests - Function enableValidation", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobTree: null,
//             treeView: createTreeView(),
//             datasetSessionNode: null,
//             ussSessionNode: null,
//             iJob: createIJobObject(),
//             profiles: null,
//             imperativeProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             mockNode: null,
//             mockEnableValidationContext: jest.fn(),
//             mockLoadNamedProfile: jest.fn(),
//         };
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);
//         newMocks.testJobTree = createJobsTree(
//             newMocks.session,
//             newMocks.iJob,
//             newMocks.imperativeProfile,
//             newMocks.treeView
//         );
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     loadNamedProfile: newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile),
//                     enableValidationContext: newMocks.mockEnableValidationContext.mockReturnValue(
//                         newMocks.datasetSessionNode
//                     ),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that enableValidation returns correct node context", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const ussSessionNode = createUSSSessionNode(blockMocks.session, blockMocks.imperativeProfile);
//         const ussTree = createUSSTree([], [ussSessionNode], blockMocks.treeView);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}false`;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         // tslint:disable-next-line:max-line-length
//         const response = await theProfiles.enableValidation(resultNode);
//         expect(response.contextValue).toContain(`${globals.VALIDATE_SUFFIX}true`);
//         expect(response.contextValue).not.toContain(`${globals.VALIDATE_SUFFIX}false`);
//     });
// });

// describe("Profiles Unit Tests - Function disableValidationContext", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             imperativeProfile: createIProfile(),
//             profileInstance: null,
//             session: null,
//             datasetSessionNode: null,
//             mockNode: null,
//             mockDisableValidationContext: jest.fn(),
//         };
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     disableValidationContext: newMocks.mockDisableValidationContext.mockReturnValue(newMocks.mockNode),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that disableValidationContext returns correct node context if it is enabled", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}true`;
//         const result = await theProfiles.disableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}false`);
//     });

//     it("Tests that disableValidationContext returns correct node context if validation context isn't set", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}`;
//         const result = await theProfiles.disableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}false`);
//     });

//     it("Tests that disableValidationContext returns correct node context if it is already disabled", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}false`;
//         const result = await theProfiles.disableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}false`);
//     });
// });

// describe("Profiles Unit Tests - Function enableValidationContext", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             imperativeProfile: createIProfile(),
//             profileInstance: null,
//             session: null,
//             datasetSessionNode: null,
//             mockNode: null,
//             mockEnableValidationContext: jest.fn(),
//         };
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     enableValidationContext: newMocks.mockEnableValidationContext.mockReturnValue(newMocks.mockNode),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that enableValidationContext returns correct node context if it is disabled", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}false`;
//         const result = await theProfiles.enableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}true`);
//     });

//     it("Tests that enableValidationContext returns correct node context if it is already enabled", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}${globals.VALIDATE_SUFFIX}true`;
//         const result = await theProfiles.enableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}true`);
//     });

//     it("Tests that enableValidationContext returns correct node context if validation context isn't set", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         resultNode.contextValue = `${globals.DS_SESSION_CONTEXT}`;
//         const result = await theProfiles.enableValidationContext(resultNode);
//         expect(result.contextValue).toContain(`${globals.VALIDATE_SUFFIX}true`);
//     });
// });

// describe("Profiles Unit Tests - Function validationArraySetup", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             imperativeProfile: createIProfile(),
//             validProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             datasetSessionNode: null,
//             mockNode: null,
//             mockEnableValidationContext: jest.fn(),
//         };
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         Object.defineProperty(Profiles, "getInstance", {
//             value: jest.fn(() => {
//                 return {
//                     enableValidationContext: newMocks.mockEnableValidationContext.mockReturnValue(newMocks.mockNode),
//                 };
//             }),
//         });
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that validationArraySetup returns profileSetting if same setting is passed", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const returnedSetting = {
//             name: blockMocks.imperativeProfile.name,
//             setting: false,
//         };

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: false }];

//         const response = await theProfiles.validationArraySetup(blockMocks.imperativeProfile, false);
//         expect(response).toEqual(returnedSetting);
//     });

//     it("Tests that validationArraySetup returns profileSetting and updates profilesValidationSetting if different setting is passed", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const returnedSetting = {
//             name: blockMocks.imperativeProfile.name,
//             setting: false,
//         };

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: true }];

//         const response = await theProfiles.validationArraySetup(blockMocks.imperativeProfile, false);
//         expect(response).toEqual(returnedSetting);
//         expect(theProfiles.profilesValidationSetting).toEqual([
//             { name: blockMocks.imperativeProfile.name, setting: false },
//         ]);
//     });

//     it("Tests that validationArraySetup returns profileSetting and updates profilesValidationSetting when array empty", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const returnedSetting = {
//             name: blockMocks.imperativeProfile.name,
//             setting: false,
//         };

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [];

//         const response = await theProfiles.validationArraySetup(blockMocks.imperativeProfile, false);
//         expect(response).toEqual(returnedSetting);
//         expect(theProfiles.profilesValidationSetting).toEqual([
//             { name: blockMocks.imperativeProfile.name, setting: false },
//         ]);
//     });

//     it("Tests that validationArraySetup returns profileSetting and updates profilesValidationSetting when profile name not found", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         blockMocks.validProfile.name = "test2";
//         const returnedSetting = {
//             name: blockMocks.validProfile.name,
//             setting: false,
//         };

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesValidationSetting = [{ name: blockMocks.imperativeProfile.name, setting: true }];

//         const response = await theProfiles.validationArraySetup(blockMocks.validProfile, false);
//         expect(response).toEqual(returnedSetting);
//         expect(theProfiles.profilesValidationSetting).toEqual([
//             { name: blockMocks.imperativeProfile.name, setting: true },
//             { name: blockMocks.validProfile.name, setting: false },
//         ]);
//     });
// });

// describe("Profiles Unit Tests - Function validateProfiles", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             invalidProfile: createInvalidIProfile(),
//             validProfile: createValidIProfile(),
//             profileInstance: null,
//             commonApi: null,
//         };
//         newMocks.commonApi = ZoweExplorerApiRegister.getInstance().getCommonApi(newMocks.validProfile);
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that validateProfiles handles active profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         globalMocks.mockCallback = "active";

//         const returnedValidation = await theProfiles.checkCurrentProfile(blockMocks.validProfile);
//         expect(returnedValidation).toEqual({ status: "active", name: blockMocks.validProfile.name });
//     });

//     it("Tests that validateProfiles handles inactive profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         globalMocks.mockCallback = "inactive";

//         const returnedValidation = await theProfiles.checkCurrentProfile(blockMocks.validProfile);
//         expect(returnedValidation).toEqual({ status: "inactive", name: blockMocks.validProfile.name });
//     });

//     it("Tests that validateProfiles handles unverified profiles", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         globalMocks.mockCallback = "unverified";

//         const returnedValidation = await theProfiles.checkCurrentProfile(blockMocks.validProfile);
//         expect(returnedValidation).toEqual({ status: "unverified", name: blockMocks.validProfile.name });
//     });
// });

// describe("Profiles Unit Tests - Function refresh", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             profiles: null,
//             invalidProfile: createInvalidIProfile(),
//             validProfile: createValidIProfile(),
//             profileInstance: null,
//         };
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that Profile refresh empties profilesForValidation[]", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         theProfiles.profilesForValidation.push({ status: "active", name: blockMocks.validProfile.name });
//         await theProfiles.refresh(ZoweExplorerApiRegister.getInstance());
//         expect(theProfiles.profilesForValidation.length).toBe(0);
//     });
// });

// describe("Profiles Unit Tests - Function ssoLogin", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobTree: null,
//             treeView: createTreeView(),
//             datasetSessionNode: null,
//             optionalCredNode: null,
//             datasetSessionNodeToken: null,
//             ussSessionNode: null,
//             iJob: createIJobObject(),
//             profiles: null,
//             imperativeProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             mockNode: null,
//             mockEnableValidationContext: jest.fn(),
//             mockLoadNamedProfile: jest.fn(),
//             testBaseProfile: createValidIProfile(),
//             testCombinedSession: createISession(),
//             testCombinedProfile: createValidIProfile(),
//             testOptionalProfile: createValidIProfile(),
//             datasetSessionNodeAltToken: null,
//             testAltTypeProfile: createAltTypeIProfile(),
//             testAltSession: createISession(),
//         };
//         newMocks.testBaseProfile.profile.tokenType = "testTokenType";
//         newMocks.testBaseProfile.profile.tokenValue = "testTokenValue";
//         newMocks.testCombinedSession.ISession.tokenType = "testTokenType";
//         newMocks.testCombinedSession.ISession.tokenValue = "testTokenValue";
//         newMocks.testCombinedProfile.profile.tokenType = "testTokenType";
//         newMocks.testCombinedProfile.profile.tokenValue = "testTokenValue";
//         newMocks.testCombinedProfile.profile.user = undefined;
//         newMocks.testCombinedProfile.profile.password = undefined;
//         newMocks.testCombinedProfile.profile.protocol = "https";
//         newMocks.testCombinedProfile.profile.host = "test";
//         newMocks.testCombinedProfile.profile.type = "basic";
//         newMocks.testOptionalProfile.profile.host = "host";
//         newMocks.testOptionalProfile.profile.port = "1443";
//         newMocks.testOptionalProfile.profile.user = undefined;
//         newMocks.testOptionalProfile.profile.password = undefined;
//         newMocks.testOptionalProfile.type = "zosmf";
//         newMocks.testAltSession.ISession.tokenType = "altTokenType";
//         newMocks.testAltSession.ISession.tokenValue = "altTokenValue";
//         newMocks.testAltTypeProfile.profile.user = undefined;
//         newMocks.testAltTypeProfile.profile.password = undefined;
//         newMocks.testAltTypeProfile.profile.tokenType = "altTokenType";
//         newMocks.testAltTypeProfile.profile.tokenValue = "altTokenValue";
//         globalMocks.mockCreateSessCfgFromArgs.mockResolvedValue(newMocks.testCombinedSession);
//         newMocks.datasetSessionNodeToken = createDatasetSessionNode(
//             newMocks.testCombinedSession,
//             newMocks.testCombinedProfile
//         );
//         newMocks.datasetSessionNodeAltToken = createDatasetSessionNode(
//             newMocks.testAltSession,
//             newMocks.testAltTypeProfile
//         );
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.optionalCredNode = createDatasetSessionNode(newMocks.session, newMocks.testOptionalProfile);
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);
//         newMocks.testJobTree = createJobsTree(
//             newMocks.session,
//             newMocks.iJob,
//             newMocks.imperativeProfile,
//             newMocks.treeView
//         );

//         Object.defineProperty(globalMocks.mockCliProfileManager, "load", {
//             value: jest.fn(() => {
//                 return new Promise((resolve) => {
//                     resolve(newMocks.imperativeProfile);
//                 });
//             }),
//             configurable: true,
//         });
//         Object.defineProperty(globalMocks.mockCliProfileManager, "update", { value: jest.fn(), configurable: true });
//         newMocks.profiles.getCliProfileManager = () => globalMocks.mockCliProfileManager;

//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that sso login is skipped if service profile contains user/password", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const ussSessionNode = createUSSSessionNode(blockMocks.session, blockMocks.imperativeProfile);
//         const ussTree = createUSSTree([], [ussSessionNode], blockMocks.treeView);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         const response = await theProfiles.ssoLogin(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "This profile does not support token authentication."
//         );
//     });

//     it("Tests that sso login with token for base profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeToken;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "getBaseProfile", {
//             value: jest.fn(() => {
//                 return blockMocks.testBaseProfile;
//             }),
//         });

//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue("token");

//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         await theProfiles.ssoLogin(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Login to authentication service was successful."
//         );
//     });

//     it("Test that sso login will login config file", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeToken;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "optionalCredChecks", {
//             value: jest.fn(() => {
//                 return true;
//             }),
//         });
//         globalMocks.mockProfileInstance.getProfileInfo().usingTeamConfig = true;
//         // Object.defineProperty(ProfilesCache, "getConfigInstance", {
//         //     value: jest.fn(() => {
//         //         return {
//         //             usingTeamConfig: true,
//         //         };
//         //     }),
//         // });

//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue(SessConstants.TOKEN_TYPE_APIML);

//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         await theProfiles.ssoLogin(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Login to authentication service was successful."
//         );
//     });

//     it("Tests that sso login is skipped if service profile has its own host and port", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue(SessConstants.TOKEN_TYPE_APIML);
//         Object.defineProperty(theProfiles, "getBaseProfile", {
//             value: jest.fn(() => {
//                 return blockMocks.testBaseProfile;
//             }),
//         });

//         const resultNode: IZoweNodeType = blockMocks.optionalCredNode;

//         await theProfiles.ssoLogin(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "This profile does not support token authentication."
//         );
//     });

//     it("Tests that sso login with token for alternate profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeAltToken;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue("altTokenType");

//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         globalMocks.mockShowInputBox.mockResolvedValueOnce("fake");
//         await theProfiles.ssoLogin(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Login to authentication service was successful."
//         );
//     });
// });

// describe("Profiles Unit Tests - Function ssoLogout", () => {
//     async function createBlockMocks(globalMocks) {
//         const newMocks = {
//             log: Logger.getAppLogger(),
//             testDatasetTree: null,
//             testUSSTree: null,
//             testJobTree: null,
//             treeView: createTreeView(),
//             datasetSessionNode: null,
//             datasetSessionNodeToken: null,
//             ussSessionNode: null,
//             iJob: createIJobObject(),
//             profiles: null,
//             imperativeProfile: createValidIProfile(),
//             profileInstance: null,
//             session: null,
//             mockNode: null,
//             mockEnableValidationContext: jest.fn(),
//             mockLoadNamedProfile: jest.fn(),
//             testBaseProfile: createValidIProfile(),
//             testCombinedSession: createISession(),
//             testCombinedProfile: createValidIProfile(),
//             datasetSessionNodeAltToken: null,
//             testAltTypeProfile: createAltTypeIProfile(),
//             testAltSession: createISession(),
//         };
//         newMocks.testBaseProfile.profile.tokenType = "apimlAuthenticationToken";
//         newMocks.testBaseProfile.profile.tokenValue = "testTokenValue";
//         newMocks.testCombinedSession.ISession.tokenType = "testTokenType";
//         newMocks.testCombinedSession.ISession.tokenValue = "testTokenValue";
//         newMocks.testBaseProfile.profile.host = "fake";
//         newMocks.testCombinedSession.ISession.tokenType = "apimlAuthenticationToken";
//         newMocks.testCombinedProfile.profile.tokenValue = "testTokenValue";
//         newMocks.testCombinedProfile.profile.tokenType = "apimlAuthenticationToken";
//         newMocks.testCombinedProfile.profile.user = undefined;
//         newMocks.testCombinedProfile.profile.password = undefined;
//         newMocks.testCombinedProfile.profile.protocol = "https";
//         newMocks.testCombinedProfile.profile.host = "fake";
//         newMocks.testAltSession.ISession.tokenType = "altTokenType";
//         newMocks.testAltSession.ISession.tokenValue = "altTokenValue";
//         newMocks.testAltTypeProfile.profile.user = undefined;
//         newMocks.testAltTypeProfile.profile.password = undefined;
//         newMocks.testAltTypeProfile.profile.tokenType = "altTokenType";
//         newMocks.testAltTypeProfile.profile.tokenValue = "altTokenValue";
//         globalMocks.mockCreateSessCfgFromArgs.mockResolvedValue(newMocks.testCombinedSession);
//         newMocks.datasetSessionNodeToken = createDatasetSessionNode(
//             newMocks.testCombinedSession,
//             newMocks.testCombinedProfile
//         );
//         newMocks.datasetSessionNodeAltToken = createDatasetSessionNode(
//             newMocks.testAltSession,
//             newMocks.testAltTypeProfile
//         );
//         newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
//         newMocks.mockNode = newMocks.datasetSessionNode;
//         newMocks.profiles = await Profiles.createInstance(newMocks.log);
//         newMocks.profileInstance = createInstanceOfProfile(newMocks.profiles);
//         newMocks.profileInstance.getBaseProfile.mockReturnValue(newMocks.testBaseProfile);
//         newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);
//         newMocks.testJobTree = createJobsTree(
//             newMocks.session,
//             newMocks.iJob,
//             newMocks.imperativeProfile,
//             newMocks.treeView
//         );

//         Object.defineProperty(globalMocks.mockCliProfileManager, "save", {
//             value: jest.fn(() => {
//                 return new Promise((resolve) => {
//                     resolve(newMocks.imperativeProfile);
//                 });
//             }),
//             configurable: true,
//         });
//         Object.defineProperty(globalMocks.mockCliProfileManager, "update", { value: jest.fn(), configurable: true });
//         newMocks.profiles.getCliProfileManager = () => globalMocks.mockCliProfileManager;

//         globalMocks.mockGetInstance.mockReturnValue(newMocks.profiles);

//         return newMocks;
//     }

//     it("Tests that sso logout is skipped if service profile contains user/password", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const ussSessionNode = createUSSSessionNode(blockMocks.session, blockMocks.imperativeProfile);
//         const ussTree = createUSSTree([], [ussSessionNode], blockMocks.treeView);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNode;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         const response = await theProfiles.ssoLogout(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "This profile does not support token authentication."
//         );
//     });

//     it("Tests that sso logout with token in base profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeToken;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         Object.defineProperty(theProfiles, "getBaseProfile", {
//             value: jest.fn(() => {
//                 return blockMocks.testBaseProfile;
//             }),
//         });

//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue("apimlAuthenticationToken");
//         jest.spyOn(mockCommonApi, "logout").mockReturnValue("logout success");

//         await theProfiles.ssoLogout(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Logout from authentication service was successful."
//         );
//     });

//     it("Tests that sso logout with token in alternate profile", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);

//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeAltToken;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);
//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue("altTokenType");

//         jest.spyOn(mockCommonApi, "logout").mockReturnValue("logout success");

//         await theProfiles.ssoLogout(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Logout from authentication service was successful."
//         );
//     });

//     it("Test that sso logout for config file", async () => {
//         const globalMocks = await createGlobalMocks();
//         const blockMocks = await createBlockMocks(globalMocks);
//         const resultNode: IZoweNodeType = blockMocks.datasetSessionNodeAltToken;
//         globalMocks.mockProfileInfo.usingTeamConfig = true;
//         const theProfiles = await Profiles.createInstance(blockMocks.log);

//         const mockCommonApi = await ZoweExplorerApiRegister.getInstance().getCommonApi(blockMocks.testCombinedProfile);
//         const getCommonApiMock = jest.fn();
//         getCommonApiMock.mockReturnValue(mockCommonApi);
//         ZoweExplorerApiRegister.getInstance().getCommonApi = getCommonApiMock.bind(ZoweExplorerApiRegister);
//         jest.spyOn(mockCommonApi, "getTokenTypeName").mockReturnValue(SessConstants.TOKEN_TYPE_APIML);

//         jest.spyOn(mockCommonApi, "logout").mockReturnValue("logout success");

//         await theProfiles.ssoLogout(resultNode);

//         expect(globalMocks.mockShowInformationMessage.mock.calls.length).toBe(1);
//         expect(globalMocks.mockShowInformationMessage.mock.calls[0][0]).toBe(
//             "Logout from authentication service was successful."
//         );
//     });
// });
