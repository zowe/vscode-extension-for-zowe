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
import {
    createInstanceOfProfile,
    createIProfile,
    createISessionWithoutCredentials, createQuickPickContent, createQuickPickItem, createTreeView
} from "../../../__mocks__/mockCreators/shared";
import * as extension from "../../../src/extension";
import { createDatasetSessionNode, createDatasetTree } from "../../../__mocks__/mockCreators/datasets";
import { Profiles } from "../../../src/Profiles";
import * as utils from "../../../src/utils";
import * as globals from "../../../src/globals";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";
import * as sharedActions from "../../../src/shared/actions";
import { createUSSSessionNode, createUSSTree } from "../../../__mocks__/mockCreators/uss";
import * as dsActions from "../../../src/dataset/actions";
import { ZoweUSSNode } from "../../../src/uss/ZoweUSSNode";

function createGlobalMocks() {
    Object.defineProperty(vscode.window, "showInformationMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showErrorMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "createQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(Profiles, "getInstance", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals, "LOG", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "debug", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "error", { value: jest.fn(), configurable: true });
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("Shared Actions Unit Tests - Function addZoweSession", () => {
    let blockMocks;

    function createBlockMocks() {
        const session = createISessionWithoutCredentials();
        const treeView = createTreeView();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const quickPickItem = createQuickPickItem();

        return {
            session,
            imperativeProfile,
            profileInstance,
            datasetSessionNode,
            testDatasetTree: createDatasetTree(datasetSessionNode, treeView),
            quickPickItem
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking that addSession will cancel if there is no profile name", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = undefined;
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(entered);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);

        // Assert edge condition user cancels the input path box
        mocked(vscode.window.createQuickPick)
            .mockReturnValue(createQuickPickContent(entered, blockMocks.quickPickItem));
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual("Profile Name was not supplied. Operation Cancelled");
    });
    it("Checking that addSession works correctly with supplied profile name", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = undefined;
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("fake");
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);

        // Assert edge condition user cancels the input path box
        mocked(vscode.window.createQuickPick).mockReturnValue(createQuickPickContent(entered, blockMocks.quickPickItem));
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(blockMocks.testDatasetTree.addSession).toBeCalled();
        expect(blockMocks.testDatasetTree.addSession.mock.calls[0][0]).toEqual({ newprofile: "fake" });
    });
    it("Checking that addSession works correctly with existing profile", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = "";
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);

        // Assert edge condition user cancels the input path box
        const quickPickContent = createQuickPickContent(entered, blockMocks.quickPickItem);
        quickPickContent.label = "firstName";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(quickPickContent);

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(blockMocks.testDatasetTree.addSession).toBeCalled();
        expect(blockMocks.testDatasetTree.addSession.mock.calls[0][0]).toBe("firstName");
    });
    it("Checking that addSession works correctly with supplied resolveQuickPickHelper", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = "fake";
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);

        mocked(vscode.window.createQuickPick).mockReturnValue(createQuickPickContent(entered, blockMocks.quickPickItem));
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(blockMocks.testDatasetTree.addSession).not.toBeCalled();
    });
    it("Checking that addSession works correctly with undefined profile", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = "";
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);

        // Assert edge condition user cancels the input path box
        const quickPickContent = createQuickPickContent(entered, blockMocks.quickPickItem);
        quickPickContent.label = undefined;
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(quickPickContent);

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(blockMocks.testDatasetTree.addSession).not.toBeCalled();
    });
    it("Checking that addSession works correctly if createNewConnection is invalid", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const entered = "fake";
        blockMocks.profileInstance.createNewConnection = jest.fn().mockRejectedValue(new Error("create connection error"));
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(entered);

        mocked(vscode.window.createQuickPick).mockReturnValue(createQuickPickContent(entered, blockMocks.quickPickItem));
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(blockMocks.quickPickItem);
        const errorHandlingSpy = jest.spyOn(utils, "errorHandling");

        await extension.addZoweSession(blockMocks.testDatasetTree);
        expect(errorHandlingSpy).toBeCalled();
        expect(errorHandlingSpy.mock.calls[0][0]).toEqual(new Error("create connection error"));
    });
});

describe("Shared Actions Unit Tests - Function searchForLoadedItems", () => {
    let blockMocks;

    function createBlockMocks() {
        const session = createISessionWithoutCredentials();
        const treeView = createTreeView();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        // It's required to have proper mock of profile for USS Node generation
        mocked(Profiles.getInstance).mockReturnValue(profileInstance);
        const ussSessionNode = createUSSSessionNode(session, imperativeProfile);

        return {
            session,
            imperativeProfile,
            profileInstance,
            datasetSessionNode,
            ussSessionNode,
            testDatasetTree: createDatasetTree(datasetSessionNode, treeView),
            testUssTree: createUSSTree([], [ussSessionNode], treeView)
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking that searchForLoadedItems works for a PDS", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const testNode = new ZoweDatasetNode("HLQ.PROD2.STUFF", null,
            blockMocks.datasetSessionNode, blockMocks.session, globals.DS_PDS_CONTEXT);
        testNode.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        blockMocks.testDatasetTree.searchInLoadedItems.mockResolvedValueOnce([testNode]);
        blockMocks.testUssTree.searchInLoadedItems.mockResolvedValueOnce([]);
        blockMocks.testDatasetTree.getChildren.mockImplementation((arg) => {
            if (arg) {
                return Promise.resolve([testNode]);
            } else {
                return Promise.resolve([blockMocks.datasetSessionNode]);
            }
        });

        const qpItem = new utils.FilterItem("[sestest]: HLQ.PROD2.STUFF");
        const quickPickContent = createQuickPickContent(qpItem, qpItem);
        quickPickContent.placeholder = "Select a filter";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(qpItem);

        await sharedActions.searchInAllLoadedItems(blockMocks.testDatasetTree, blockMocks.testUssTree);
        expect(blockMocks.testDatasetTree.addHistory).not.toBeCalled();
    });
    it("Checking that searchForLoadedItems works for a member", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const testNode = new ZoweDatasetNode("HLQ.PROD2.STUFF", null,
            blockMocks.datasetSessionNode, blockMocks.session, globals.DS_DS_CONTEXT);
        testNode.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        const testMember = new ZoweDatasetNode("TESTMEMB", null, testNode,
            blockMocks.session, globals.DS_MEMBER_CONTEXT);
        testMember.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        testNode.children.push(testMember);
        blockMocks.testDatasetTree.getChildren.mockReturnValue([blockMocks.datasetSessionNode]);

        jest.spyOn(dsActions, "openPS").mockResolvedValueOnce(null);
        blockMocks.testDatasetTree.searchInLoadedItems.mockResolvedValueOnce([testMember]);
        blockMocks.testUssTree.searchInLoadedItems.mockResolvedValueOnce([]);
        blockMocks.testDatasetTree.getChildren.mockImplementation((arg) => {
            if (arg === testNode) {
                return Promise.resolve([testMember]);
            } else if (arg) {
                return Promise.resolve([testNode]);
            } else {
                return Promise.resolve([blockMocks.datasetSessionNode]);
            }
        });
        const qpItem = new utils.FilterItem("[sestest]: HLQ.PROD2.STUFF(TESTMEMB)");
        const quickPickContent = createQuickPickContent(qpItem, qpItem);
        quickPickContent.placeholder = "Select a filter";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(qpItem);

        await sharedActions.searchInAllLoadedItems(blockMocks.testDatasetTree, blockMocks.testUssTree);
        expect(blockMocks.testDatasetTree.addHistory).toBeCalledWith("HLQ.PROD2.STUFF(TESTMEMB)");
    });
    it("Checking that searchForLoadedItems works for a USS folder", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const folder = new ZoweUSSNode("folder", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.ussSessionNode, null, "/");
        blockMocks.testDatasetTree.getChildren.mockReturnValue([blockMocks.ussSessionNode]);

        blockMocks.testDatasetTree.searchInLoadedItems.mockResolvedValueOnce([]);
        blockMocks.testUssTree.searchInLoadedItems.mockResolvedValueOnce([folder]);
        jest.spyOn(folder, "getProfileName").mockImplementationOnce(() => "firstName");
        jest.spyOn(blockMocks.ussSessionNode, "getChildren").mockResolvedValueOnce([folder]);

        const qpItem = new utils.FilterItem("[sestest]: /folder");
        const quickPickContent = createQuickPickContent(qpItem, qpItem);
        quickPickContent.placeholder = "Select a filter";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(qpItem);

        const openNode = jest.spyOn(folder, "openUSS");
        await sharedActions.searchInAllLoadedItems(blockMocks.testDatasetTree, blockMocks.testUssTree);
        expect(openNode).not.toBeCalled();
    });
    it("Checking that searchForLoadedItems works for a USS file", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        const folder = new ZoweUSSNode("folder", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.ussSessionNode, null, "/");
        const file = new ZoweUSSNode("file", vscode.TreeItemCollapsibleState.None, folder, null, "/folder");
        blockMocks.testDatasetTree.getChildren.mockReturnValue([blockMocks.ussSessionNode]);

        blockMocks.testDatasetTree.searchInLoadedItems.mockResolvedValueOnce([]);
        blockMocks.testUssTree.searchInLoadedItems.mockResolvedValueOnce([file]);
        jest.spyOn(blockMocks.ussSessionNode, "getChildren").mockResolvedValueOnce([folder]);
        jest.spyOn(folder, "getChildren").mockResolvedValueOnce([file]);

        const qpItem = new utils.FilterItem("[sestest]: /folder/file");
        const quickPickContent = createQuickPickContent(qpItem, qpItem);
        quickPickContent.placeholder = "Select a filter";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(qpItem);

        const openNode = jest.spyOn(file, "openUSS");
        await sharedActions.searchInAllLoadedItems(blockMocks.testDatasetTree, blockMocks.testUssTree);

        expect(blockMocks.testUssTree.addHistory).toBeCalledWith("/folder/file");
        expect(openNode).toHaveBeenCalledWith(false, true, blockMocks.testUssTree);
    });
    it("Checking that searchForLoadedItems fails when no pattern is entered", async () => {
        createGlobalMocks();
        blockMocks = createBlockMocks();
        blockMocks.testDatasetTree.searchInLoadedItems.mockResolvedValueOnce([]);
        blockMocks.testUssTree.searchInLoadedItems.mockResolvedValueOnce([]);
        const qpItem = null;
        const quickPickContent = createQuickPickContent(qpItem, qpItem);
        quickPickContent.placeholder = "Select a filter";
        mocked(vscode.window.createQuickPick).mockReturnValue(quickPickContent);
        jest.spyOn(utils, "resolveQuickPickHelper").mockResolvedValueOnce(qpItem);

        await sharedActions.searchInAllLoadedItems(blockMocks.testDatasetTree, blockMocks.testUssTree);
        expect(blockMocks.testUssTree.addHistory).not.toBeCalled();
    });
});
