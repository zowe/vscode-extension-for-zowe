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

import { ValidProfileEnum, Profiles } from "../../../src/Profiles";
import { createUSSTree, USSTree } from "../../../src/uss/USSTree";
import { ZoweUSSNode } from "../../../src/uss/ZoweUSSNode";
import { Logger } from "@zowe/imperative";
import * as utils from "../../../src/utils";
import { createIProfile, createISession, createISessionWithoutCredentials, createFileResponse } from "../../../__mocks__/mockCreators/shared";
import * as globals from "../../../src/globals";
import * as vscode from "vscode";
import * as zowe from "@zowe/cli";
import { createUSSNode, createFavoriteUSSNode, createUSSSessionNode } from "../../../__mocks__/mockCreators/uss";
import { getIconByNode } from "../../../src/generators/icons";

async function createGlobalMocks() {
    const globalMocks = {
        mockLoadNamedProfile: jest.fn(),
        mockDefaultProfile: jest.fn(),
        executeCommand: jest.fn(),
        Utilities: jest.fn(),
        showQuickPick: jest.fn(),
        renameUSSFile: jest.fn(),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        filters: jest.fn(),
        getFilters: jest.fn(),
        createTreeView: jest.fn(),
        createQuickPick: jest.fn(),
        getConfiguration: jest.fn(),
        ZosmfSession: jest.fn(),
        createBasicZosmfSession: jest.fn(),
        withProgress: jest.fn(),
        ProgressLocation: jest.fn().mockImplementation(() => {
            return {
                Notification: 15
            };
        }),
        testProfile: createIProfile(),
        testSession: createISession(),
        testResponse: createFileResponse({items: []}),
        testUSSNode: null,
        testTree: null
    };

    Object.defineProperty(vscode.window, "createTreeView", { value: globalMocks.createTreeView, configurable: true });
    Object.defineProperty(vscode.commands, "executeCommand", { value: globalMocks.executeCommand, configurable: true });
    Object.defineProperty(globalMocks.Utilities, "renameUSSFile", { value: globalMocks.renameUSSFile, configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: globalMocks.showQuickPick, configurable: true });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: globalMocks.showInformationMessage, configurable: true });
    Object.defineProperty(globalMocks.ZosmfSession, "createBasicZosmfSession",
        { value: globalMocks.createBasicZosmfSession, configurable: true });
    Object.defineProperty(zowe, "ZosmfSession", { value: globalMocks.ZosmfSession, configurable: true });
    Object.defineProperty(globalMocks.filters, "getFilters", { value: globalMocks.getFilters, configurable: true });
    Object.defineProperty(vscode.window, "createQuickPick", { value: globalMocks.createQuickPick, configurable: true });
    Object.defineProperty(zowe, "Utilities", { value: globalMocks.Utilities, configurable: true });
    Object.defineProperty(vscode.window, "showErrorMessage", { value: globalMocks.showErrorMessage, configurable: true });
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: globalMocks.getConfiguration, configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: globalMocks.showInputBox, configurable: true });
    Object.defineProperty(vscode, "ProgressLocation", { value: globalMocks.ProgressLocation, configurable: true });
    Object.defineProperty(vscode.window, "withProgress", { value: globalMocks.withProgress, configurable: true });
    Object.defineProperty(Profiles, "getInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [globalMocks.testProfile, { name: "firstName" }, { name: "secondName" }],
                getDefaultProfile: globalMocks.mockDefaultProfile,
                validProfile: ValidProfileEnum.VALID,
                checkCurrentProfile: jest.fn(),
                loadNamedProfile: globalMocks.mockLoadNamedProfile
            };
        }),
        configurable: true
    });

    globalMocks.withProgress.mockImplementation((progLocation, callback) => callback());
    globalMocks.withProgress.mockReturnValue(globalMocks.testResponse);
    globalMocks.getFilters.mockReturnValue(["/u/aDir{directory}", "/u/myFile.txt{textFile}"]);
    globalMocks.mockLoadNamedProfile.mockReturnValue(globalMocks.testProfile);
    globalMocks.mockDefaultProfile.mockReturnValue(globalMocks.testProfile);
    globalMocks.getConfiguration.mockReturnValue({
        get: (setting: string) => [
            "[test]: /u/aDir{directory}",
            "[test]: /u/myFile.txt{textFile}",
        ],
        update: jest.fn(()=>{
            return {};
        })
    });
    globalMocks.testUSSNode = createUSSNode(globalMocks.testSession, globalMocks.testProfile);
    globalMocks.testTree = new USSTree();
    const ussSessionTestNode = createUSSSessionNode(globalMocks.testSession, globalMocks.testProfile);
    globalMocks.testTree.mSessionNodes.push(ussSessionTestNode);
    globalMocks.testTree.addHistory("/u/myuser");

    return globalMocks;
}

describe("USSTree Unit Tests - Function USSTree.initialize()", () => {
    it("Tests that initialize() is executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        const testTree1 = await createUSSTree(Logger.getAppLogger());
        expect(testTree1.mSessionNodes).toBeDefined();
        expect(testTree1.mFavorites.length).toBe(2);

        const expectedUSSFavorites: ZoweUSSNode[] = [
            new ZoweUSSNode("/u/aDir", vscode.TreeItemCollapsibleState.Collapsed, undefined, globalMocks.testSession, "",
                false, "test"),
            new ZoweUSSNode("/u/myFile.txt", vscode.TreeItemCollapsibleState.None, undefined, globalMocks.testSession, "",
                false, "test"),
        ];

        expectedUSSFavorites.forEach((node) => node.contextValue += globals.FAV_SUFFIX);
        expectedUSSFavorites.forEach((node) => {
            if (node.contextValue !== globals.USS_DIR_CONTEXT + globals.FAV_SUFFIX) {
                node.command = { command: "zowe.uss.ZoweUSSNode.open", title: "Open", arguments: [node] };
            }
        });
        expect(testTree1.mFavorites[0].fullPath).toEqual("/u/aDir");
        expect(testTree1.mFavorites[1].label).toEqual("[test]: myFile.txt");
    });
});

describe("USSTree Unit Tests - Function initializeUSSTree()", () => {
    it("Tests if initializeUSSTree() is executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        const expectedUSSFavorites: ZoweUSSNode[] = [
            new ZoweUSSNode("/u/aDir", vscode.TreeItemCollapsibleState.Collapsed, undefined, globalMocks.testSession, "",
                false, "test"),
            new ZoweUSSNode("/u/myFile.txt", vscode.TreeItemCollapsibleState.None, undefined, globalMocks.testSession, "",
                false, "test"),
        ];

        expectedUSSFavorites.forEach((node) => node.contextValue += globals.FAV_SUFFIX);
        expectedUSSFavorites.forEach((node) => {
            if (node.contextValue !== globals.USS_DIR_CONTEXT + globals.FAV_SUFFIX) {
                node.command = { command: "zowe.uss.ZoweUSSNode.open", title: "Open", arguments: [node] };
            }
        });

        const testTree1 = await createUSSTree(Logger.getAppLogger());
        expect(testTree1.mFavorites.length).toBe(2);
        expect(testTree1.mFavorites[0].fullPath).toEqual("/u/aDir");
        expect(testTree1.mFavorites[1].label).toEqual("[test]: myFile.txt");
    });
});

describe("USSTree Unit Tests - Function USSTree.rename()", () => {
    it("Tests that USSTree.rename() is executed successfully", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.testUSSNode.label = "";
        globalMocks.testUSSNode.shortLabel = "";

        globalMocks.showInputBox.mockReturnValueOnce("new name");

        await globalMocks.testTree.rename(globalMocks.testUSSNode);
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(0);
        expect(globalMocks.renameUSSFile.mock.calls.length).toBe(1);
    });

    it("Tests that USSTree.rename() exits when blank input is provided", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.testUSSNode.label = "";
        globalMocks.testUSSNode.shortLabel = "";

        const refreshSpy = jest.spyOn(globalMocks.testTree, "refreshElement");
        globalMocks.showInputBox.mockReturnValueOnce("");

        await globalMocks.testTree.rename(globalMocks.testUSSNode);
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(0);
        expect(globalMocks.renameUSSFile.mock.calls.length).toBe(0);
        expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("Tests that USSTree.rename() fails when error is thrown", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.testUSSNode.label = "";
        globalMocks.testUSSNode.shortLabel = "";

        globalMocks.showInputBox.mockReturnValueOnce("new name");
        globalMocks.renameUSSFile.mockRejectedValueOnce(Error("testError"));

        try {
            await globalMocks.testTree.rename(globalMocks.testUSSNode);
            // tslint:disable-next-line:no-empty
        } catch (err) { }
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(1);
    });

    it("Tests that USSTree.rename() is executed successfully for a favorited USS file", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.testUSSNode.label = "";
        globalMocks.testUSSNode.shortLabel = "";

        const ussFavNode = createFavoriteUSSNode(globalMocks.testSession, globalMocks.testProfile);
        globalMocks.testTree.mFavorites.push(ussFavNode);
        const removeFavorite = jest.spyOn(globalMocks.testTree, "removeFavorite");
        const addFavorite = jest.spyOn(globalMocks.testTree, "addFavorite");
        globalMocks.showInputBox.mockReturnValueOnce("new name");

        await globalMocks.testTree.rename(ussFavNode);
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(0);
        expect(globalMocks.renameUSSFile.mock.calls.length).toBe(1);
        expect(removeFavorite.mock.calls.length).toBe(1);
        expect(addFavorite.mock.calls.length).toBe(1);
    });
});

describe("USSTree Unit Tests - Functions USSTree.addRecall() & USSTree.getRecall()", () => {
    it("Tests that addRecall() & getRecall() are executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.testTree.addRecall("testHistory");
        expect(globalMocks.testTree.getRecall()[0]).toEqual("TESTHISTORY");
    });
});

describe("USSTree Unit Tests - Functions USSTree.removeRecall()", () => {
    it("Tests that removeRecall() is executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.testTree.removeRecall("testHistory");
        expect(globalMocks.testTree.getRecall().includes("TESTHISTORY")).toEqual(false);
    });
});

describe("USSTree Unit Tests - Functions USSTree.addFavorite()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            childFile: null,
            parentDir: new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, "/")
        };
        newMocks.childFile = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None, newMocks.parentDir, null, "/parent");
        newMocks.childFile.contextValue = globals.DS_TEXT_FILE_CONTEXT;
        globalMocks.testTree.mFavorites = [];

        return newMocks;
    }

    it("Tests that addFavorite() works for directories", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.parentDir.fullPath);
    });

    it("Tests that addFavorite() works for files", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.childFile);
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.childFile.fullPath);
    });

    it("Tests that addFavorite() doesn't add duplicates", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });
});

describe("USSTree Unit Tests - Function USSTree.removeFavorite()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            testDir: new ZoweUSSNode("testDir", vscode.TreeItemCollapsibleState.Collapsed,
                                     globalMocks.testTree.mSessionNodes[1], null, "/")
        };
        globalMocks.testTree.mFavorites = [newMocks.testDir];

        return newMocks;
    }

    it("Tests that removeFavorite() works properly", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        // Checking that favorites are set successfully before test
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.testDir.fullPath);

        await globalMocks.testTree.removeFavorite(globalMocks.testTree.mFavorites[0]);
        expect(globalMocks.testTree.mFavorites).toEqual([]);
    });
});

describe("USSTree Unit Tests - Function USSTree.openItemFromPath()", () => {
    it("Tests that openItemFromPath opens a USS file in the tree", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.withProgress.mockReturnValue(globalMocks.testResponse);

        const file = new ZoweUSSNode("c.txt", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[0], null, "/a/b");
        spyOn(globalMocks.testTree, "getChildren").and.returnValue(Promise.resolve([file]));

        await globalMocks.testTree.openItemFromPath("/a/b/c.txt", globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.getHistory().includes("[sestest]: /a/b/c.txt")).toBe(true);
    });

    it("Tests that openItemFromPath fails when the node no longer exists", async () => {
        const globalMocks = await createGlobalMocks();
        globalMocks.withProgress.mockReturnValue(globalMocks.testResponse);

        spyOn(globalMocks.testTree, "getChildren").and.returnValue(Promise.resolve([]));
        const recallSpy = jest.spyOn(globalMocks.testTree, "removeRecall");

        await globalMocks.testTree.openItemFromPath("/d.txt", globalMocks.testTree.mSessionNodes[1]);
        expect(recallSpy).toBeCalledWith("[sestest]: /d.txt");
    });
});

describe("USSTree Unit Tests - Function USSTree.addSession()", () => {
    it("Tests if addSession works properly", async () => {
        const globalMocks = await createGlobalMocks();

        const testSessionNode = new ZoweUSSNode("testSessionNode", vscode.TreeItemCollapsibleState.Collapsed,
                                                null, globalMocks.testSession, null);
        globalMocks.testTree.mSessionNodes.push(testSessionNode);
        globalMocks.testTree.addSession("testSessionNode");

        const foundNode = globalMocks.testTree.mSessionNodes.includes(testSessionNode);
        expect(foundNode).toEqual(true);
    });
});

describe("USSTree Unit Tests - Function USSTree.deleteSession()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            testTree2: new USSTree(),
            testSessionNode: new ZoweUSSNode("testSessionNode", vscode.TreeItemCollapsibleState.Collapsed,
                null, globalMocks.testSession, null),
            startLength: null
        };
        const ussSessionTestNode = createUSSSessionNode(globalMocks.testSession, globalMocks.testProfile);
        newMocks.testTree2.mSessionNodes.push(ussSessionTestNode);
        newMocks.testTree2.mSessionNodes.push(newMocks.testSessionNode);
        newMocks.startLength = newMocks.testTree2.mSessionNodes.length;

        return newMocks;
    }

    it("Tests that deleteSession works properly", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.testTree2.deleteSession(blockMocks.testTree2.mSessionNodes[blockMocks.startLength - 1]);
        expect(blockMocks.testTree2.mSessionNodes.length).toEqual(blockMocks.startLength - 1);
    });
});

describe("USSTree Unit Tests - Function USSTree.filterPrompt()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            theia: false,
            qpValue: "",
            qpItem: new utils.FilterDescriptor("\uFF0B " + "Create a new filter"),
            resolveQuickPickHelper: jest.spyOn(utils, "resolveQuickPickHelper")
        };
        Object.defineProperty(globals, "ISTHEIA", { get: () => newMocks.theia });
        newMocks.resolveQuickPickHelper.mockImplementation(
            () => Promise.resolve(newMocks.qpItem)
        );
        globalMocks.createQuickPick.mockReturnValue({
            placeholder: "Select a filter",
            activeItems: [newMocks.qpItem],
            ignoreFocusOut: true,
            items: [newMocks.qpItem],
            value: newMocks.qpValue,
            show: jest.fn(()=>{
                return {};
            }),
            hide: jest.fn(()=>{
                return {};
            }),
            onDidAccept: jest.fn(()=>{
                return {};
            })
        });

        return newMocks;
    }

    it("Tests that filter() works properly when user enters path", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.qpValue = "/U/HARRY";
        globalMocks.showInputBox.mockReturnValueOnce("/U/HARRY");

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mSessionNodes[1].fullPath).toEqual("/U/HARRY");
    });

    it("Tests that filter() exits when user cancels out of input field", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.showInputBox.mockReturnValueOnce(undefined);

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.showInformationMessage.mock.calls.length).toBe(1);
        expect(globalMocks.showInformationMessage.mock.calls[0][0]).toBe("You must enter a path.");
    });

    it("Tests that filter() works on a file", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.qpValue = "/U/HLQ/STUFF";
        blockMocks.qpItem = new utils.FilterDescriptor("/U/HLQ/STUFF");
        globalMocks.showInputBox.mockReturnValueOnce("/U/HLQ/STUFF");

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mSessionNodes[1].fullPath).toEqual("/U/HLQ/STUFF");
    });

    it("Tests that filter() exits when user cancels the input path box", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.qpItem = undefined;

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.showInformationMessage.mock.calls.length).toBe(1);
        expect(globalMocks.showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
    });

    it("Tests that filter() works when new path is specified (Theia)", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.theia = true;
        blockMocks.qpValue = "/u/myFiles";
        globalMocks.showQuickPick.mockReturnValueOnce(" -- Specify Filter -- ");
        globalMocks.showInputBox.mockReturnValueOnce("/u/myFiles");

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mSessionNodes[1].fullPath).toEqual("/u/myFiles");
    });

    it("Tests that filter() exits when user cancels the input path box (Theia)", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.theia = true;
        globalMocks.showQuickPick.mockReturnValueOnce("\uFF0B " + "Create a new filter");
        globalMocks.showInputBox.mockReturnValueOnce(undefined);

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.showInformationMessage.mock.calls.length).toBe(1);
        expect(globalMocks.showInformationMessage.mock.calls[0][0]).toBe("You must enter a path.");
    });

    it("Tests that filter() works with a file (Theia)", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.theia = true;
        blockMocks.qpValue = "/u/thisFile";
        globalMocks.showQuickPick.mockReturnValueOnce(new utils.FilterDescriptor("/u/thisFile"));

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mSessionNodes[1].fullPath).toEqual("/u/thisFile");
    });

    it("Tests that filter() exits when no selection made (Theia)", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        blockMocks.theia = true;
        globalMocks.showQuickPick.mockReturnValueOnce(undefined);

        await globalMocks.testTree.filterPrompt(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.showInformationMessage.mock.calls.length).toBe(1);
        expect(globalMocks.showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
    });

    it("Tests that filter() works correctly for favorites", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const sessionNoCred = createISessionWithoutCredentials();
        globalMocks.createBasicZosmfSession.mockReturnValue(sessionNoCred);
        const dsNode = new ZoweUSSNode(
            "[ussTestSess2]: /u/myFile.txt", vscode.TreeItemCollapsibleState.Expanded, null, sessionNoCred, null, false, "ussTestSess2");
        dsNode.mProfileName = "ussTestSess2";
        dsNode.getSession().ISession.user = "";
        dsNode.getSession().ISession.password = "";
        dsNode.getSession().ISession.base64EncodedAuth = "";
        dsNode.contextValue = globals.USS_SESSION_CONTEXT + globals.FAV_SUFFIX;
        globalMocks.testTree.mSessionNodes.push(dsNode);

        await globalMocks.testTree.filterPrompt(dsNode);
        globalMocks.testTree.mSessionNodes.forEach((sessionNode) => {
            if (sessionNode === dsNode) { expect(sessionNode.fullPath).toEqual("/u/myFile.txt"); }
        });
    });
});

describe("USSTree Unit Tests - Function USSTree.searchInLoadedItems()", () => {
    it("Testing that searchInLoadedItems() returns the correct array", async () => {
        const globalMocks = await createGlobalMocks();

        const folder = new ZoweUSSNode("folder", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, "/");
        const file = new ZoweUSSNode("file", vscode.TreeItemCollapsibleState.None, folder, null, "/folder");
        globalMocks.testTree.mSessionNodes[1].children = [folder];
        folder.children.push(file);

        const treeGetChildren = jest.spyOn(globalMocks.testTree, "getChildren").mockImplementationOnce(
            () => Promise.resolve([globalMocks.testTree.mSessionNodes[1]])
        );
        const sessionGetChildren = jest.spyOn(globalMocks.testTree.mSessionNodes[1], "getChildren").mockImplementationOnce(
            () => Promise.resolve(globalMocks.testTree.mSessionNodes[1].children)
        );

        const loadedItems = await globalMocks.testTree.searchInLoadedItems();
        expect(loadedItems).toStrictEqual([file, folder]);
    });
});

describe("USSTree Unit Tests - Function USSTree.saveSearch()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            folder: new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, "/"),
            file: null,
            resolveQuickPickHelper: jest.spyOn(utils, "resolveQuickPickHelper")
        };
        globalMocks.testTree.mFavorites = [];
        newMocks.file = new ZoweUSSNode("abcd", vscode.TreeItemCollapsibleState.None, newMocks.folder, null, "/parent");
        newMocks.file.contextValue = globals.USS_SESSION_CONTEXT;

        return newMocks;
    }

    it("Testing that saveSearch() works properly for a folder", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.folder);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });

    it("Testing that saveSearch() works properly for a file", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.file);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });

    it("Testing that saveSearch() works properly for a file", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.testTree.mSessionNodes[1].fullPath = "/z1234";
        await globalMocks.testTree.saveSearch(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });

    it("Testing that saveSearch() works properly for a session", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.testTree.mSessionNodes[1].fullPath = "/z1234";
        await globalMocks.testTree.saveSearch(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });

    it("Testing that saveSearch() works properly on the same session, different path", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.testTree.mSessionNodes[1].fullPath = "/a1234";
        await globalMocks.testTree.saveSearch(globalMocks.testTree.mSessionNodes[1]);
        globalMocks.testTree.mSessionNodes[1].fullPath = "/r1234";
        await globalMocks.testTree.saveSearch(globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.mFavorites.length).toEqual(2);
    });
});

describe("USSTree Unit Tests - Function USSTree.getChildren()", () => {
    it("Tests that USSTree.rename() exits when blank input is provided", async () => {
        const globalMocks = await createGlobalMocks();

        const refreshSpy = jest.spyOn(globalMocks.testTree, "refreshElement");
        globalMocks.showInputBox.mockReturnValueOnce("");

        await globalMocks.testTree.rename(globalMocks.testUSSNode);
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(0);
        expect(globalMocks.renameUSSFile.mock.calls.length).toBe(0);
        expect(refreshSpy).not.toHaveBeenCalled();
    });

    it("Tests that USSTree.rename() fails when error is thrown", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.showInputBox.mockReturnValueOnce("new name");
        globalMocks.renameUSSFile.mockRejectedValueOnce(Error("testError"));

        try {
            await globalMocks.testTree.rename(globalMocks.testUSSNode);
            // tslint:disable-next-line:no-empty
        } catch (err) { }
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(1);
    });

    it("Tests that USSTree.rename() is executed successfully for a favorited USS file", async () => {
        const globalMocks = await createGlobalMocks();

        const ussFavNode = createFavoriteUSSNode(globalMocks.testSession, globalMocks.testProfile);
        const removeFavorite = jest.spyOn(globalMocks.testTree, "removeFavorite");
        const addFavorite = jest.spyOn(globalMocks.testTree, "addFavorite");
        globalMocks.showInputBox.mockReturnValueOnce("new name");

        await globalMocks.testTree.rename(ussFavNode);
        expect(globalMocks.showErrorMessage.mock.calls.length).toBe(0);
        expect(globalMocks.renameUSSFile.mock.calls.length).toBe(1);
        expect(removeFavorite.mock.calls.length).toBe(1);
        expect(addFavorite.mock.calls.length).toBe(1);
    });
});

describe("USSTree Unit Tests - Functions USSTree.addRecall() & USSTree.getRecall()", () => {
    it("Tests that addRecall() & getRecall() are executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.testTree.addRecall("testHistory");
        expect(globalMocks.testTree.getRecall()[0]).toEqual("TESTHISTORY");
    });
});

describe("USSTree Unit Tests - Functions USSTree.removeRecall()", () => {
    it("Tests that removeRecall() is executed successfully", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.testTree.removeRecall("testHistory");
        expect(globalMocks.testTree.getRecall().includes("TESTHISTORY")).toEqual(false);
    });
});

describe("USSTree Unit Tests - Functions USSTree.addFavorite()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            parentDir: new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, "/"),
            childFile: null,
        };
        newMocks.childFile = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None, newMocks.parentDir, null, "/parent");
        newMocks.childFile.contextValue = globals.DS_TEXT_FILE_CONTEXT;
        globalMocks.testTree.mFavorites = [];

        return newMocks;
    }

    it("Tests that addFavorite() works for directories", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.parentDir.fullPath);
    });

    it("Tests that addFavorite() works for files", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.childFile);
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.childFile.fullPath);
    });

    it("Tests that addFavorite() doesn't add duplicates", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        await globalMocks.testTree.addFavorite(blockMocks.parentDir);
        expect(globalMocks.testTree.mFavorites.length).toEqual(1);
    });
});

describe("USSTree Unit Tests - Function USSTree.removeFavorite()", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            testDir: new ZoweUSSNode("testDir", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, "/"),
        };
        globalMocks.testTree.mFavorites = [];
        await globalMocks.testTree.addFavorite(newMocks.testDir);

        return newMocks;
    }

    it("Tests that removeFavorite() works properly", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        // Checking that favorites are set successfully before test
        expect(globalMocks.testTree.mFavorites[0].fullPath).toEqual(blockMocks.testDir.fullPath);

        await globalMocks.testTree.removeFavorite(globalMocks.testTree.mFavorites[0]);
        expect(globalMocks.testTree.mFavorites).toEqual([]);
    });
});

describe("USSTree Unit Tests - Function USSTree.openItemFromPath()", () => {
    it("Tests that openItemFromPath opens a USS file in the tree", async () => {
        const globalMocks = await createGlobalMocks();

        const file = new ZoweUSSNode("c.txt", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[0], null, "/a/b");
        spyOn(globalMocks.testTree, "getChildren").and.returnValue(Promise.resolve([file]));

        await globalMocks.testTree.openItemFromPath("/a/b/c.txt", globalMocks.testTree.mSessionNodes[1]);
        expect(globalMocks.testTree.getHistory().includes("[sestest]: /a/b/c.txt")).toBe(true);
    });

    it("Tests that openItemFromPath fails when the node no longer exists", async () => {
        const globalMocks = await createGlobalMocks();

        spyOn(globalMocks.testTree, "getChildren").and.returnValue(Promise.resolve([]));
        const recallSpy = jest.spyOn(globalMocks.testTree, "removeRecall");

        await globalMocks.testTree.openItemFromPath("/d.txt", globalMocks.testTree.mSessionNodes[1]);
        expect(recallSpy).toBeCalledWith("[sestest]: /d.txt");
    });
});

describe("USSTree Unit Tests - Function USSTree.addSession()", () => {
    it("Tests if addSession works properly", async () => {
        const globalMocks = await createGlobalMocks();

        const testSessionNode = new ZoweUSSNode("testSessionNode", vscode.TreeItemCollapsibleState.Collapsed,
                                                null, globalMocks.testSession, null);
        globalMocks.testTree.mSessionNodes.push(testSessionNode);
        globalMocks.testTree.addSession("testSessionNode");

        const foundNode = globalMocks.testTree.mSessionNodes.includes(testSessionNode);
        expect(foundNode).toEqual(true);
    });
});

describe("USSTree Unit Tests - Function USSTree.deleteSession()", () => {
    it("Tests that getChildren() returns valid list of elements", async () => {
        const globalMocks = await createGlobalMocks();

        const rootChildren = await globalMocks.testTree.getChildren();
        // Creating rootNode
        const sessNode = [
            new ZoweUSSNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, null, null, null, false),
            new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Collapsed, null, globalMocks.testSession,
                            "/", false, globalMocks.testProfile.name)
        ];
        sessNode[0].contextValue = globals.FAVORITE_CONTEXT;
        sessNode[1].contextValue = globals.USS_SESSION_CONTEXT;
        sessNode[1].fullPath = "test";

        // Set icon
        let targetIcon = getIconByNode(sessNode[0]);
        if (targetIcon) {
            sessNode[0].iconPath = targetIcon.path;
        }
        targetIcon = getIconByNode(sessNode[1]);
        if (targetIcon) {
            sessNode[1].iconPath = targetIcon.path;
        }

        expect(sessNode).toEqual(rootChildren);
        expect(JSON.stringify(sessNode[0].iconPath)).toContain("folder-root-favorite-star-closed.svg");
    });

    it("Testing that getChildren() returns correct ZoweUSSNodes when passed element of type ZoweUSSNode<session>", async () => {
        const globalMocks = await createGlobalMocks();

        const testDir = new ZoweUSSNode("testDir", vscode.TreeItemCollapsibleState.Collapsed,
                                        globalMocks.testTree.mSessionNodes[1], null, "test");
        globalMocks.testTree.mSessionNodes[1].children.push(testDir);
        const mockApiResponseItems = {
            items: [{
                mode: "d",
                mSessionName: "sestest",
                name: "testDir"
            }]
        };
        const mockApiResponseWithItems = createFileResponse(mockApiResponseItems);
        globalMocks.withProgress.mockReturnValue(mockApiResponseWithItems);
        const sessChildren = await globalMocks.testTree.getChildren(globalMocks.testTree.mSessionNodes[1]);
        const sampleChildren: ZoweUSSNode[] = [testDir];

        expect(sessChildren[0].label).toEqual(sampleChildren[0].label);
    });

    it("Testing that getChildren() returns correct ZoweUSSNodes when passed element of type ZoweUSSNode<favorite>", async () => {
        const globalMocks = await createGlobalMocks();

        globalMocks.testTree.mFavorites.push(new ZoweUSSNode("/u/myUser", vscode.TreeItemCollapsibleState.None,
                                                 globalMocks.testTree.mSessionNodes[0], null, null));
        const favChildren = await globalMocks.testTree.getChildren(globalMocks.testTree.mSessionNodes[0]);
        const sampleChildren: ZoweUSSNode[] = [
            new ZoweUSSNode("/u/myUser", vscode.TreeItemCollapsibleState.None, globalMocks.testTree.mSessionNodes[0], null, null)
        ];

        expect(favChildren).toEqual(sampleChildren);
    });

    it("Testing that getChildren() returns correct ZoweUSSNodes when passed element of type ZoweUSSNode<directory>", async () => {
        const globalMocks = await createGlobalMocks();

        const directory = new ZoweUSSNode("/u", vscode.TreeItemCollapsibleState.Collapsed, globalMocks.testTree.mSessionNodes[1], null, null);
        const file = new ZoweUSSNode("myFile.txt", vscode.TreeItemCollapsibleState.None, directory, null, null);
        const sampleChildren: ZoweUSSNode[] = [file];
        sampleChildren[0].command = { command: "zowe.uss.ZoweUSSNode.open", title: "", arguments: [sampleChildren[0]] };
        directory.children.push(file);
        directory.dirty = true;
        const mockApiResponseItems = {
            items: [{
                mode: "f",
                mSessionName: "sestest",
                name: "myFile.txt"
            }]
        };
        const mockApiResponseWithItems = createFileResponse(mockApiResponseItems);
        globalMocks.withProgress.mockReturnValue(mockApiResponseWithItems);

        const dirChildren = await globalMocks.testTree.getChildren(directory);
        expect(dirChildren[0].label).toEqual(sampleChildren[0].label);
    });
});
