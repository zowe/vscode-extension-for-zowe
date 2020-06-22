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
import * as globals from "../../../src/globals";
import * as fs from "fs";
import * as zowe from "@zowe/cli";
import { DatasetTree } from "../../../src/dataset/DatasetTree";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";
import * as utils from "../../../src/utils";
import { Profiles } from "../../../src/Profiles";
import { getIconByNode } from "../../../src/generators/icons";
import {
    createInstanceOfProfile,
    createIProfile,
    createISession, createISessionWithoutCredentials, createQuickPickContent,
    createTreeView, createWorkspaceConfiguration
} from "../../../__mocks__/mockCreators/shared";
import { createDatasetSessionNode } from "../../../__mocks__/mockCreators/datasets";
import { bindMvsApi, createMvsApi } from "../../../__mocks__/mockCreators/api";

jest.mock("fs");
jest.mock("util");

function createGlobalMocks() {
    const isTheia = jest.fn();

    Object.defineProperty(vscode.window, "createTreeView", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: jest.fn(), configurable: true });
    Object.defineProperty(Profiles, "getInstance", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "createQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "Rename", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Rename, "dataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Rename, "dataSetMember", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals, "ISTHEIA", { get: isTheia, configurable: true });
    Object.defineProperty(fs, "unlinkSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(fs, "existsSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode, "ProgressLocation", {
        value: jest.fn().mockImplementation(() => {
            return {
                Notification: 15
            };
        }),
        configurable: true
    });
    Object.defineProperty(vscode, "ConfigurationTarget", {
        value: jest.fn().mockImplementation(() => {
            return {
                Global: 1,
                Workspace: 2,
                WorkspaceFolder: 3
            };
        }),
        configurable: true
    });
    Object.defineProperty(vscode.window, "withProgress", {
        value: jest.fn().mockImplementation((progLocation, callback) => {
            return callback();
        }),
        configurable: true
    });

    return {
        isTheia
    };
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("Dataset Tree Unit Tests - Initialisation", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            treeView,
            datasetSessionNode
        };
    }

    it("Checking definition of the dataset tree", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        expect(testTree.mSessionNodes.map((node) => node.label)).toEqual(["Favorites", blockMocks.datasetSessionNode.label]);
        expect(testTree.getTreeView()).toEqual(blockMocks.treeView);
    });
});

describe("Dataset Tree Unit Tests - Function getTreeItem", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking function with PS Dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const node = new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, blockMocks.session);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        expect(testTree.getTreeItem(node)).toBeInstanceOf(vscode.TreeItem);
    });
});
describe("Dataset Tree Unit Tests - Function getChildren", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const profile = createInstanceOfProfile(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            imperativeProfile,
            session,
            profile,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking function for root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const favoriteSessionNode = new ZoweDatasetNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, null, null);
        favoriteSessionNode.contextValue = globals.FAVORITE_CONTEXT;
        const targetIcon = getIconByNode(favoriteSessionNode);
        if (targetIcon) {
            favoriteSessionNode.iconPath = targetIcon.path;
        }

        const children = await testTree.getChildren();

        expect(favoriteSessionNode).toMatchObject(children[0]);
        expect(blockMocks.datasetSessionNode).toMatchObject(children[1]);
    });
    it("Checking function for session node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        blockMocks.datasetSessionNode.pattern = "test";
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mSessionNodes[1].dirty = true;
        const sampleChildren: ZoweDatasetNode[] = [
            new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], null,
                undefined, undefined, blockMocks.imperativeProfile),
            new ZoweDatasetNode("BRTVS99.CA10", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1],
                null, globals.DS_MIGRATED_FILE_CONTEXT, undefined, blockMocks.imperativeProfile),
            new ZoweDatasetNode("BRTVS99.CA11.SPFTEMP0.CNTL", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1],
                null, undefined, undefined, blockMocks.imperativeProfile),
            new ZoweDatasetNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1],
                null, undefined, undefined, blockMocks.imperativeProfile),
            new ZoweDatasetNode("BRTVS99.VS1", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1],
                null, globals.VSAM_CONTEXT, undefined, blockMocks.imperativeProfile)
        ];
        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };

        const children = await testTree.getChildren(testTree.mSessionNodes[1]);

        expect(children).toEqual(sampleChildren);
    });
    it("Checking function for favorite node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const node = new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, blockMocks.session);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mFavorites.push(node);

        const children = await testTree.getChildren(testTree.mSessionNodes[0]);

        expect(children).toEqual([node]);
    });
    it("Checking function for PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("BRTVS99.PUBLIC", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null);
        parent.dirty = true;
        const sampleChildren: ZoweDatasetNode[] = [
            new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None, parent, null),
            new ZoweDatasetNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.None, parent, null),
        ];
        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };
        sampleChildren[1].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[1]] };

        const children = await testTree.getChildren(parent);

        expect(children).toEqual(sampleChildren);
    });
});
describe("Dataset Tree Unit Tests - Function getParent", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking function on the root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        const parentNode = testTree.getParent(blockMocks.datasetSessionNode);

        expect(parentNode).toBeNull();
    });
    it("Checking function on the non-root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, blockMocks.session);

        expect(testTree.getParent(node)).toMatchObject(blockMocks.datasetSessionNode);
    });
});
describe("Dataset Tree Unit Tests - Function getHistory", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addHistory("testHistory");

        expect(testTree.getHistory()).toEqual(["testHistory"]);
    });
});
describe("Dataset Tree Unit Tests - Function addRecall", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addRecall("testRecall");

        expect(testTree.getRecall()).toEqual(["TESTRECALL"]);
    });
});
describe("Dataset Tree Unit Tests - Function removeRecall", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addRecall("testRecall");
        expect(testTree.getRecall()).toEqual(["TESTRECALL"]);
        testTree.removeRecall("testRecall");
        expect(testTree.getRecall()).toEqual([]);
    });
});
describe("Dataset Tree Unit Tests - Function addSession", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profile = createInstanceOfProfile(imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
            imperativeProfile,
            profile
        };
    }

    it("Checking successful adding of session", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        blockMocks.profile.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addSession("test");

        expect(testTree.mSessionNodes[1].label).toBe(blockMocks.imperativeProfile.name);
    });
    it("Checking failed attempt to add a session due to the missing profile", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        blockMocks.profile.loadNamedProfile.mockReturnValueOnce(null);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addSession("fake");

        expect(testTree.mSessionNodes[1]).not.toBeDefined();
    });
});
describe("Dataset Tree Unit Tests - Function addFavorite", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profile = createInstanceOfProfile(imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
            profile,
            imperativeProfile
        };
    }

    it("Checking adding of PS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);

        testTree.addFavorite(node);

        expect(testTree.mFavorites[0].label).toBe(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.DS_DS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);
        node.contextValue = globals.DS_PDS_CONTEXT;

        testTree.addFavorite(node);

        expect(testTree.mFavorites[0].label).toBe(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.DS_PDS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of PDS Member node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);
        const child = new ZoweDatasetNode("Child", vscode.TreeItemCollapsibleState.None,
            parent, null);
        parent.contextValue = globals.DS_PDS_CONTEXT;
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        testTree.addFavorite(child);

        expect(testTree.mFavorites[0].label).toBe(`[${blockMocks.datasetSessionNode.label}]: ${parent.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.DS_PDS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of Session node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mSessionNodes[1].pattern = "test";

        await testTree.addFavorite(testTree.mSessionNodes[1]);

        expect(testTree.mFavorites[0].label).toBe(`[${blockMocks.datasetSessionNode.label}]: ${testTree.mSessionNodes[1].pattern}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.DS_SESSION_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking attempt to add a duplicate node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);

        testTree.addFavorite(node);
        testTree.addFavorite(node);

        expect(testTree.mFavorites.map((entry) => entry.label)).toEqual([`[${blockMocks.datasetSessionNode.label}]: ${node.label}`]);
    });
    it("Checking attempt to add a member of favorite PDS", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);
        const child = new ZoweDatasetNode("Child", vscode.TreeItemCollapsibleState.None,
            parent, null);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        testTree.addFavorite(child);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("PDS already in favorites");
    });
});
describe("Dataset Tree Unit Tests - Function removeSession", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);

        // We're breaking rule 1 function call per 1 it block, but there's no over proper way to verify the functionality
        // First we need to have the item and be sure that it's properly added to have legit removal operation
        testTree.addFavorite(node);
        expect(testTree.mFavorites[0].label).toBe(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`);
        testTree.removeFavorite(testTree.mFavorites[0]);
        expect(testTree.mFavorites[0]).not.toBeDefined();
    });
});
describe("Dataset Tree Unit Tests - Function deleteSession", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        testTree.deleteSession(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes.map((node) => node.label)).toEqual(["Favorites"]);
    });
});
describe("Dataset Tree Unit Tests - Function flipState", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCreds = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            sessionWithoutCreds,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking flipping of PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null);
        node.contextValue = globals.DS_PDS_CONTEXT;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
    it("Checking flipping of Favorite PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null);
        node.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
    it("Checking flipping of PDS Dataset with credential prompt", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("Dataset", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], blockMocks.sessionWithoutCreds);
        node.contextValue = globals.DS_PDS_CONTEXT;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
    it("Checking flipping of favorite Dataset session", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mSessionNodes[1].contextValue = globals.DS_SESSION_CONTEXT + globals.FAV_SUFFIX;

        await testTree.flipState(testTree.mSessionNodes[1], true);

        expect(JSON.stringify(testTree.mSessionNodes[1].iconPath)).toContain("pattern.svg");
    });
});
describe("Dataset Tree Unit Tests - Function datasetFilterPrompt", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profile = createInstanceOfProfile(imperativeProfile);

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
            treeView,
            profile
        };
    }

    it("Checking adding of new filter - Theia", async () => {
        const globalMocks = createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("\uFF0B " + "Create a new filter"));
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.ACTIVE_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelled attempt to add a filter - Theia", async () => {
        const globalMocks = createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("\uFF0B " + "Create a new filter"));
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("You must enter a pattern.");
    });
    it("Checking usage of existing filter - Theia", async () => {
        const globalMocks = createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("HLQ.PROD1.STUFF"));
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelling of filter prompt with available filters - Theia", async () => {
        const globalMocks = createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("No selection made.");
    });
    it("Checking function on favorites", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const addSessionSpy = jest.spyOn(testTree, "addSession");
        const favoriteSearch = new ZoweDatasetNode(`[${blockMocks.datasetSessionNode.label}]: HLQ.PROD1.STUFF`,
            vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session, undefined, undefined, blockMocks.imperativeProfile);
        favoriteSearch.contextValue = globals.DS_SESSION_CONTEXT + globals.FAV_SUFFIX;

        await testTree.datasetFilterPrompt(favoriteSearch);

        expect(addSessionSpy).toHaveBeenLastCalledWith(blockMocks.datasetSessionNode.label.trim());
    });
    it("Checking adding of new filter", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("\uFF0B " + "Create a new filter"));
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.ACTIVE_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelled attempt to add a filter", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("\uFF0B " + "Create a new filter"));
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("You must enter a pattern.");
    });
    it("Checking usage of existing filter", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        const quickPickItem = new utils.FilterDescriptor("HLQ.PROD1.STUFF");
        mocked(vscode.window.createQuickPick).mockReturnValueOnce(createQuickPickContent("HLQ.PROD1.STUFF", quickPickItem));
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(quickPickItem);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const resolveQuickPickSpy = jest.spyOn(utils, "resolveQuickPickHelper");
        resolveQuickPickSpy.mockResolvedValueOnce(quickPickItem);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelling of filter prompt with available filters", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        const quickPickItem = undefined;
        mocked(vscode.window.createQuickPick).mockReturnValueOnce(createQuickPickContent("HLQ.PROD1.STUFF", quickPickItem));
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(quickPickItem);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const resolveQuickPickSpy = jest.spyOn(utils, "resolveQuickPickHelper");
        resolveQuickPickSpy.mockResolvedValueOnce(quickPickItem);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("No selection made.");
    });
});
describe("Dataset Tree Unit Tests - Function editSession", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profile = createInstanceOfProfile(imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
            profile
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        blockMocks.profile.editSession.mockResolvedValueOnce("testProfile");
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("EditSession", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null);

        await testTree.editSession(node);

        expect(node.getProfile().profile).toBe("testProfile");
    });
});
describe("Dataset Tree Unit Tests - Function searchInLoadedItems", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("HLQ.PROD2.STUFF", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], blockMocks.session, globals.DS_DS_CONTEXT);
        testTree.mSessionNodes[1].children.push(node);

        const items = await testTree.searchInLoadedItems();

        expect(items).toEqual([node]);
    });
});
describe("Dataset Tree Unit Tests - Function onDidConfiguration", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const workspaceConfiguration = createWorkspaceConfiguration();

        return {
            session,
            datasetSessionNode,
            treeView,
            workspaceConfiguration
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.workspace.getConfiguration).mockReturnValue(blockMocks.workspaceConfiguration);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        const event = {
            affectsConfiguration: jest.fn()
        };
        event.affectsConfiguration.mockReturnValue(true);
        mocked(vscode.workspace.getConfiguration).mockClear();

        await testTree.onDidChangeConfiguration(event);

        expect(mocked(vscode.workspace.getConfiguration)).toBeCalledTimes(2);
    });
});
describe("Dataset Tree Unit Tests - Function findFavoritedNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        const favoriteNode = new ZoweDatasetNode(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`,
            vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        favoriteNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        testTree.mFavorites.push(favoriteNode);

        const foundNode = testTree.findFavoritedNode(node);

        expect(foundNode).toBe(favoriteNode);
    });
});
describe("Dataset Tree Unit Tests - Function findNonFavoritedNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        const favoriteNode = new ZoweDatasetNode(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`,
            vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        favoriteNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        testTree.mSessionNodes[1].children.push(node);

        const foundNode = testTree.findNonFavoritedNode(favoriteNode);

        expect(foundNode).toBe(node);
    });
});
describe("Dataset Tree Unit Tests - Function openItemFromPath", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView
        };
    }

    it("Checking opening of PS Dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("TEST.DS", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        testTree.mSessionNodes[1].children.push(node);
        testTree.mSessionNodes[1].pattern = "test";
        spyOn(testTree.mSessionNodes[1], "getChildren").and.returnValue(Promise.resolve([node]));

        await testTree.openItemFromPath(`[${blockMocks.datasetSessionNode.label}]: ${node.label}`, blockMocks.datasetSessionNode);

        expect(testTree.getHistory()).toEqual([node.label]);
    });
    it("Checking opening of PDS Member", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("TEST.PDS", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null);
        const child = new ZoweDatasetNode("TESTMEMB", vscode.TreeItemCollapsibleState.None, parent, null);
        testTree.mSessionNodes[1].children.push(parent);
        testTree.mSessionNodes[1].pattern = "test";
        spyOn(testTree.mSessionNodes[1], "getChildren").and.returnValue(Promise.resolve([parent]));
        spyOn(parent, "getChildren").and.returnValue(Promise.resolve([child]));

        await testTree.openItemFromPath(`[${blockMocks.datasetSessionNode.label}]: ${parent.label}(${child.label})`, blockMocks.datasetSessionNode);

        expect(testTree.getHistory()).toEqual([`${parent.label}(${child.label})`]);
    });
});
describe("Dataset Tree Unit Tests - Function rename", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            datasetSessionNode,
            treeView,
            mvsApi
        };
    }

    it("Checking function with PS Dataset", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("HLQ.TEST.RENAME.NODE", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });
    it("Checking function with Favorite PS Dataset", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(`[${blockMocks.datasetSessionNode.label}]: HLQ.TEST.RENAME.NODE`,
            vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        node.contextValue = "ds_fav";
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });
    it("Checking failed attempt to rename PS Dataset", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const defaultError = new Error("Default error message");

        mocked(zowe.Rename.dataSet).mockImplementation(() => {
            throw defaultError;
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode("HLQ.TEST.RENAME.NODE", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        let error;
        try {
            await testTree.rename(node);
        } catch (err) {
            error = err;
        }

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
        expect(error).toBe(defaultError);
    });
    it("Checking function with PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        await testTree.rename(child);

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "mem2");
    });
    it("Checking function with favorite PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(`[${blockMocks.datasetSessionNode.label}]: HLQ.TEST.RENAME.NODE`,
            vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        await testTree.rename(child);

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "mem2");
    });
    it("Checking failed attempt to rename PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const defaultError = new Error("Default error message");

        mocked(zowe.Rename.dataSetMember).mockImplementation(() => {
            throw defaultError;
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode("HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], blockMocks.session);
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        let error;
        try {
            await testTree.rename(child);
        } catch (err) {
            error = err;
        }

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "mem2");
        expect(error).toBe(defaultError);
    });
});
