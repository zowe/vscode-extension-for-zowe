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
import * as zowe from "@zowe/cli";
import {
    createBasicZosmfSession, createInstanceOfProfile,
    createIProfile,
    createISession, createISessionWithoutCredentials, createTextDocument,
    createTreeView
} from "../../../__mocks__/mockCreators/shared";
import {
    createDatasetAttributes,
    createDatasetSessionNode,
    createDatasetTree
} from "../../../__mocks__/mockCreators/datasets";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";
import { bindMvsApi, createMvsApi } from "../../../__mocks__/mockCreators/api";
import * as dsActions from "../../../src/dataset/actions";
import * as globals from "../../../src/globals";
import * as path from "path";
import * as fs from "fs";
import * as sharedUtils from "../../../src/shared/utils";
import { Profiles } from "../../../src/Profiles";

// Missing the definition of path module, because I need the original logic for tests
jest.mock("fs");

let mockClipboardData = null;
let clipboard;

function createGlobalMocks() {
    clipboard = {
        writeText: jest.fn().mockImplementation((value) => mockClipboardData = value),
        readText: jest.fn().mockImplementation(() => mockClipboardData),
    };

    Object.defineProperty(vscode.window, "withProgress", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "Upload", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Upload, "bufferToDataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Upload, "pathToDataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showErrorMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showWarningMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.workspace, "openTextDocument", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showTextDocument", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.commands, "executeCommand", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals, "LOG", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "debug", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "error", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "Download", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Download, "dataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "Delete", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Delete, "dataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(fs, "unlinkSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(fs, "existsSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(sharedUtils, "concatChildNodes", { value: jest.fn(), configurable: true });
    Object.defineProperty(Profiles, "getInstance", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "List", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.List, "dataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode, "ProgressLocation", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "createWebviewPanel", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.env, "clipboard", { value: clipboard, configurable: true });
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("Dataset Actions Unit Tests - Function createMember", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking of common dataset member creation", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, blockMocks.session);

        mocked(vscode.window.showInputBox).mockResolvedValue("testMember");
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        jest.spyOn(blockMocks.mvsApi, "getContents").mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.createMember(parent, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showInputBox)).toBeCalledWith({ placeHolder: "Name of Member" });
        expect(mocked(zowe.Upload.bufferToDataSet)).toBeCalledWith(
            blockMocks.zosmfSession,
            Buffer.from(""),
            parent.label + "(testMember)",
            undefined
        );
    });
    it("Checking failed attempt to create dataset member", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, blockMocks.session);

        mocked(vscode.window.showInputBox).mockResolvedValue("testMember");
        mocked(zowe.Upload.bufferToDataSet).mockRejectedValueOnce(Error("test"));

        try {
            await dsActions.createMember(parent, blockMocks.testDatasetTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith("Unable to create member: test Error: test");
    });
    it("Checking of attempt to create member without name", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, blockMocks.session);

        mocked(vscode.window.showInputBox).mockResolvedValue("");
        await dsActions.createMember(parent, blockMocks.testDatasetTree);

        expect(mocked(zowe.Upload.bufferToDataSet)).not.toBeCalled();
    });
    it("Checking of member creation for favorite dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, blockMocks.session);
        const nonFavoriteLabel = parent.label;
        parent.label = `[${blockMocks.datasetSessionNode.label}]: ${parent.label}`;
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        mocked(vscode.window.showInputBox).mockResolvedValue("testMember");
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        jest.spyOn(blockMocks.mvsApi, "getContents").mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.createMember(parent, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showInputBox)).toBeCalledWith({ placeHolder: "Name of Member" });
        expect(mocked(zowe.Upload.bufferToDataSet)).toBeCalledWith(
            blockMocks.zosmfSession,
            Buffer.from(""),
            nonFavoriteLabel + "(testMember)",
            undefined
        );
    });
});

describe("Dataset Actions Unit Tests - Function refreshPS", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking common PS dataset refresh", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE7", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.refreshPS(node);

        expect(mocked(zowe.Download.dataSet)).toBeCalledWith(
            blockMocks.zosmfSession,
            node.label,
            {
                file: path.join(globals.DS_DIR, node.getSessionNode().label, node.label),
                returnEtag: true
            }
        );
        expect(mocked(vscode.workspace.openTextDocument)).toBeCalledWith(path.join(globals.DS_DIR,
            node.getSessionNode().label, node.label));
        expect(mocked(vscode.window.showTextDocument)).toBeCalledTimes(2);
        expect(mocked(vscode.commands.executeCommand)).toBeCalledWith("workbench.action.closeActiveEditor");
    });
    it("Checking duplicate PS dataset refresh attempt", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE7", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: false } as any);
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.refreshPS(node);

        expect(mocked(vscode.commands.executeCommand)).not.toBeCalled();
    });
    it("Checking failed attempt to refresh PS dataset (not found exception)", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE7", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockRejectedValueOnce(Error("not found"));

        await dsActions.refreshPS(node);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("Unable to find file: " + node.label + " was probably deleted.");
        expect(mocked(vscode.commands.executeCommand)).not.toBeCalled();
    });
    it("Checking failed attempt to refresh PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockRejectedValueOnce(Error(""));

        await dsActions.refreshPS(child);

        expect(mocked(zowe.Download.dataSet)).toBeCalledWith(
            blockMocks.zosmfSession,
            child.getParent().getLabel() + "(" + child.label + ")",
            {
                file: path.join(globals.DS_DIR, child.getSessionNode().label, `${child.getParent().label}(${child.label})`),
                returnEtag: true
            }
        );
        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith(" Error");
    });
    it("Checking favorite empty PDS refresh", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE7", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.refreshPS(node);
        expect(mocked(vscode.workspace.openTextDocument)).toBeCalled();
        expect(mocked(vscode.window.showTextDocument)).toBeCalledTimes(2);
        expect(mocked(vscode.commands.executeCommand)).toBeCalledWith("workbench.action.closeActiveEditor");
    });
    it("Checking favorite PDS Member refresh", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.refreshPS(child);
        expect(mocked(vscode.workspace.openTextDocument)).toBeCalled();
        expect(mocked(vscode.window.showTextDocument)).toBeCalledTimes(2);
        expect(mocked(vscode.commands.executeCommand)).toBeCalledWith("workbench.action.closeActiveEditor");
    });
    it("Checking favorite PS refresh", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);
        parent.contextValue = globals.FAVORITE_CONTEXT;

        mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce({ isDirty: true } as any);
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: null,
            apiResponse: {
                etag: "123"
            }
        });

        await dsActions.refreshPS(child);
        expect(mocked(vscode.workspace.openTextDocument)).toBeCalled();
        expect(mocked(vscode.window.showTextDocument)).toBeCalledTimes(2);
        expect(mocked(vscode.commands.executeCommand)).toBeCalledWith("workbench.action.closeActiveEditor");
    });
});

describe("Dataset Actions Unit Tests - Function deleteDataset", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking common PS dataset deletion", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");

        await dsActions.deleteDataset(node, blockMocks.testDatasetTree);

        expect(deleteSpy).toBeCalledWith(node.label);
        expect(mocked(fs.existsSync)).toBeCalledWith(path.join(globals.DS_DIR,
            node.getSessionNode().label, node.label));
        expect(mocked(fs.unlinkSync)).toBeCalledWith(path.join(globals.DS_DIR,
            node.getSessionNode().label, node.label));
    });
    it("Checking common PS dataset deletion with not existing local file", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(false);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");

        await dsActions.deleteDataset(node, blockMocks.testDatasetTree);

        expect(mocked(fs.unlinkSync)).not.toBeCalled();
        expect(deleteSpy).toBeCalledWith(node.label);
    });
    it("Checking common PS dataset failed deletion attempt due to absence on remote", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");
        deleteSpy.mockRejectedValueOnce(Error("not found"));

        await expect(dsActions.deleteDataset(node, blockMocks.testDatasetTree)).rejects.toEqual(Error("not found"));

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("Unable to find file: " + node.label + " was probably already deleted.");
    });
    it("Checking common PS dataset failed deletion attempt", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");
        deleteSpy.mockRejectedValueOnce(Error(""));

        await expect(dsActions.deleteDataset(node, blockMocks.testDatasetTree)).rejects.toEqual(Error(""));
        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith(" Error");
    });
    it("Checking PS deletion attempt which was rejected by user in the process", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("No" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");
        deleteSpy.mockClear();

        await dsActions.deleteDataset(node, blockMocks.testDatasetTree);

        expect(mocked(fs.unlinkSync)).not.toBeCalled();
        expect(deleteSpy).not.toBeCalled();
    });
    it("Checking Favorite PDS dataset deletion", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        parent.contextValue = globals.FAVORITE_CONTEXT;
        const node = new ZoweDatasetNode("HLQ.TEST.NODE", vscode.TreeItemCollapsibleState.None,
            parent, null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");

        await dsActions.deleteDataset(node, blockMocks.testDatasetTree);

        expect(deleteSpy).toBeCalledWith(node.label);
        expect(blockMocks.testDatasetTree.removeFavorite).toBeCalledWith(node);
        expect(blockMocks.testDatasetTree.refreshElement).toBeCalledWith(parent);
        expect(mocked(fs.existsSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, "HLQ.TEST.NODE"));
        expect(mocked(fs.unlinkSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, "HLQ.TEST.NODE"));
    });
    it("Checking Favorite PDS Member deletion", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");

        await dsActions.deleteDataset(child, blockMocks.testDatasetTree);

        expect(deleteSpy).toBeCalledWith(`${child.getParent().label}(${child.label})`);
        expect(blockMocks.testDatasetTree.removeFavorite).toBeCalledWith(child);
        expect(blockMocks.testDatasetTree.refreshElement).toBeCalledWith(parent);
        expect(mocked(fs.existsSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, `${child.getParent().label}(${child.label})`));
        expect(mocked(fs.unlinkSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, `${child.getParent().label}(${child.label})`));
    });
    it("Checking Favorite PS dataset deletion", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("[sestest]: HLQ.TEST.DELETE.PARENT",
            vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        parent.contextValue = globals.FAVORITE_CONTEXT;
        const child = new ZoweDatasetNode("[sestest]: HLQ.TEST.DELETE.NODE", vscode.TreeItemCollapsibleState.None, parent, null);
        blockMocks.datasetSessionNode.children.push(parent, child);
        blockMocks.testDatasetTree.mFavorites.push(child);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");

        await dsActions.deleteDataset(child, blockMocks.testDatasetTree);

        expect(deleteSpy).toBeCalledWith("HLQ.TEST.DELETE.NODE");
        expect(blockMocks.testDatasetTree.removeFavorite).toBeCalledWith(child);
        expect(mocked(fs.existsSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, "HLQ.TEST.DELETE.NODE"));
        expect(mocked(fs.unlinkSync)).toBeCalledWith(path.join(globals.DS_DIR,
            parent.getSessionNode().label, "HLQ.TEST.DELETE.NODE"));
    });
    it("Checking incorrect dataset failed deletion attempt", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        parent.contextValue = "junk";
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None,
            parent, null, undefined, undefined, blockMocks.imperativeProfile);

        mocked(fs.existsSync).mockReturnValueOnce(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce("Yes" as any);
        const deleteSpy = jest.spyOn(blockMocks.mvsApi, "deleteDataSet");
        deleteSpy.mockClear();

        await expect(dsActions.deleteDataset(child, blockMocks.testDatasetTree)).rejects.toEqual(Error("deleteDataSet() called from invalid node."));
        expect(deleteSpy).not.toBeCalled();
    });
});

describe("Dataset Actions Unit Tests - Function enterPattern", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking common dataset filter action", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.pattern = "TEST";
        node.contextValue = globals.DS_SESSION_CONTEXT;

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("test");
        await dsActions.enterPattern(node, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showInputBox)).toBeCalledWith({
            prompt: "Search data sets by entering patterns: use a comma to separate multiple patterns",
            value: node.pattern
        });
        expect(mocked(vscode.window.showInformationMessage)).not.toBeCalled();
    });
    it("Checking common dataset filter failed attempt", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.pattern = "TEST";
        node.contextValue = globals.DS_SESSION_CONTEXT;

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("");
        await dsActions.enterPattern(node, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("You must enter a pattern.");
    });
    it("Checking favorite dataset filter action", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favoriteSample = new ZoweDatasetNode("[sestest]: HLQ.TEST", vscode.TreeItemCollapsibleState.None, undefined, null);

        await dsActions.enterPattern(favoriteSample, blockMocks.testDatasetTree);
        expect(blockMocks.testDatasetTree.addSession).toBeCalledWith("sestest");
    });
});

describe("Dataset Actions Unit Tests - Function saveFile", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking common dataset saving action when no session is defined", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const nodeWithoutSession = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None,
            null, null, undefined, undefined, blockMocks.imperativeProfile);

        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([nodeWithoutSession]);
        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([nodeWithoutSession]);
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const getSessionSpy = jest.spyOn(blockMocks.mvsApi, "getSession").mockReturnValueOnce(blockMocks.sessionWithoutCredentials);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(getSessionSpy).toReturnWith(blockMocks.sessionWithoutCredentials);
    });
    it("Checking common dataset saving failed attempt due to inability to locate session and profile", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const nodeWithoutSession = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None,
            null, null, undefined, undefined, blockMocks.imperativeProfile);

        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(undefined);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([nodeWithoutSession]);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith("Couldn't locate session when saving data set!");
    });
    it("Checking common dataset saving failed attempt due to its absence on the side of the server", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, undefined, undefined, undefined, blockMocks.imperativeProfile);

        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([node, blockMocks.datasetSessionNode]);
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const dataSetSpy = jest.spyOn(blockMocks.mvsApi, "dataSet").mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(dataSetSpy).toBeCalledWith("HLQ.TEST.AFILE");
        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith("Data set failed to save. Data set may have been deleted on mainframe.");
    });
    it("Checking common dataset saving", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        blockMocks.datasetSessionNode.children.push(node);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }, { dsname: "HLQ.TEST.AFILE(mem)" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: "success",
            apiResponse: [{
                etag: "123"
            }]
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const mockSetEtag = jest.spyOn(node, "setEtag").mockImplementation(() => null);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
        expect(mockSetEtag).toHaveBeenCalledWith("123");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("success");
    });
    it("Checking common dataset failed saving attempt", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        blockMocks.datasetSessionNode.children.push(node);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }, { dsname: "HLQ.TEST.AFILE(mem)" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: false,
            commandResponse: "failed",
            apiResponse: [{
                etag: "123"
            }]
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith("failed");
    });
    it("Checking favorite dataset saving", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        const favoriteNode = new ZoweDatasetNode("[TestSessionName]: HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);
        favoriteNode.contextValue = globals.DS_DS_CONTEXT + globals.FAV_SUFFIX;
        blockMocks.datasetSessionNode.children.push(node);
        blockMocks.testDatasetTree.mFavorites.push(favoriteNode);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }, { dsname: "HLQ.TEST.AFILE(mem)" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: "success",
            apiResponse: [{
                etag: "123"
            }]
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        blockMocks.profileInstance.loadNamedProfile.mockReturnValue(blockMocks.imperativeProfile);
        const mockSetEtag = jest.spyOn(node, "setEtag").mockImplementation(() => null);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, blockMocks.imperativeProfile.name, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
        expect(mockSetEtag).toHaveBeenCalledWith("123");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("success");
    });
    it("Checking favorite PDS Member saving", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode(`[${blockMocks.imperativeProfile.name}]: HLQ.TEST.AFILE`, vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_PDS_CONTEXT;
        const childNode = new ZoweDatasetNode("MEM", vscode.TreeItemCollapsibleState.None,
            node, null, undefined, undefined, blockMocks.imperativeProfile);
        const favoriteNode = new ZoweDatasetNode(`[${blockMocks.imperativeProfile.name}]: HLQ.TEST.AFILE`, vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);
        favoriteNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const favoriteChildNode = new ZoweDatasetNode("MEM", vscode.TreeItemCollapsibleState.None,
            favoriteNode, null, undefined, undefined, blockMocks.imperativeProfile);
        node.children.push(childNode);
        favoriteNode.children.push(favoriteChildNode);
        blockMocks.testDatasetTree.mFavorites.push(favoriteNode);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node, childNode]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }, { dsname: "HLQ.TEST.AFILE(MEM)" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: "success",
            apiResponse: [{
                etag: "123"
            }]
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const mockSetEtag = jest.spyOn(childNode, "setEtag").mockImplementation(() => null);
        const testDocument = createTextDocument("HLQ.TEST.AFILE(MEM)", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, blockMocks.imperativeProfile.name, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
        expect(mockSetEtag).toHaveBeenCalledWith("123");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("success");
        expect(blockMocks.profileInstance.loadNamedProfile).toBeCalledWith(blockMocks.imperativeProfile.name);
    });
    it("Checking common dataset failed saving attempt due to incorrect document path", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        blockMocks.datasetSessionNode.children.push(node);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(zowe.List.dataSet)).not.toBeCalled();
        expect(mocked(zowe.Upload.pathToDataSet)).not.toBeCalled();
    });
    it("Checking PDS member saving attempt", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode(
            "HLQ.TEST.AFILE(mem)", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        blockMocks.datasetSessionNode.children.push(node);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }, { dsname: "HLQ.TEST.AFILE(mem)" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: "success",
            apiResponse: [{
                etag: "123"
            }]
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const testDocument = createTextDocument("HLQ.TEST.AFILE(mem)", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("success");
    });
    it("Checking common dataset saving failed due to conflict with server version", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.AFILE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        blockMocks.datasetSessionNode.children.push(node);

        mocked(sharedUtils.concatChildNodes).mockReturnValueOnce([node]);
        blockMocks.testDatasetTree.getChildren.mockReturnValueOnce([blockMocks.datasetSessionNode]);
        mocked(zowe.List.dataSet).mockResolvedValue({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [{ dsname: "HLQ.TEST.AFILE" }]
            }
        });
        mocked(zowe.Upload.pathToDataSet).mockResolvedValueOnce({
            success: false,
            commandResponse: "Rest API failure with HTTP(S) status 412",
            apiResponse: []
        });
        mocked(zowe.Download.dataSet).mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                etag: ""
            }
        });
        mocked(vscode.window.withProgress).mockImplementation((progLocation, callback) => {
            return callback();
        });
        blockMocks.profileInstance.loadNamedProfile.mockReturnValueOnce(blockMocks.imperativeProfile);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const testDocument = createTextDocument("HLQ.TEST.AFILE", blockMocks.datasetSessionNode);
        (testDocument as any).fileName = path.join(globals.DS_DIR, testDocument.fileName);

        await dsActions.saveFile(testDocument, blockMocks.testDatasetTree);

        expect(mocked(vscode.window.showWarningMessage)).toBeCalledWith("Remote file has been modified in the meantime.\nSelect 'Compare' to resolve the conflict.");
        expect(mocked(sharedUtils.concatChildNodes)).toBeCalled();
    });
});

describe("Dataset Actions Unit Tests - Function showDSAttributes", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking PS dataset attributes showing", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("AUSER.A1557332.A996850.TEST1", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT;

        mocked(vscode.window.createWebviewPanel).mockReturnValueOnce({
            webview: {
                html: ""
            }
        } as any);
        const datasetListSpy = jest.spyOn(blockMocks.mvsApi, "dataSet");
        datasetListSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [createDatasetAttributes(node.label, node.contextValue)]
            }
        });

        await dsActions.showDSAttributes(node, blockMocks.testDatasetTree);

        expect(datasetListSpy).toBeCalledWith(node.label, { attributes: true });
        expect(mocked(vscode.window.createWebviewPanel)).toBeCalled();
    });
    it("Checking PDS dataset attributes showing", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("AUSER.A1557332.A996850.TEST1", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_PDS_CONTEXT;

        mocked(vscode.window.createWebviewPanel).mockReturnValueOnce({
            webview: {
                html: ""
            }
        } as any);
        const datasetListSpy = jest.spyOn(blockMocks.mvsApi, "dataSet");
        datasetListSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [createDatasetAttributes(node.label, node.contextValue)]
            }
        });

        await dsActions.showDSAttributes(node, blockMocks.testDatasetTree);

        expect(datasetListSpy).toBeCalledWith(node.label, { attributes: true });
        expect(mocked(vscode.window.createWebviewPanel)).toBeCalled();
    });
    it("Checking Favorite PS dataset attributes showing", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("[session]: AUSER.A1557332.A996850.TEST1", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT + globals.FAV_SUFFIX;
        const normalisedLabel = node.label.split(":").pop().trim();

        mocked(vscode.window.createWebviewPanel).mockReturnValueOnce({
            webview: {
                html: ""
            }
        } as any);
        const datasetListSpy = jest.spyOn(blockMocks.mvsApi, "dataSet");
        datasetListSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [createDatasetAttributes(normalisedLabel, node.contextValue)]
            }
        });

        await dsActions.showDSAttributes(node, blockMocks.testDatasetTree);

        expect(datasetListSpy).toBeCalledWith(normalisedLabel, { attributes: true });
        expect(mocked(vscode.window.createWebviewPanel)).toBeCalled();
    });
    it("Checking Favorite PDS dataset attributes showing", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("[session]: AUSER.A1557332.A996850.TEST1", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const normalisedLabel = node.label.split(":").pop().trim();

        mocked(vscode.window.createWebviewPanel).mockReturnValueOnce({
            webview: {
                html: ""
            }
        } as any);
        const datasetListSpy = jest.spyOn(blockMocks.mvsApi, "dataSet");
        datasetListSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [createDatasetAttributes(normalisedLabel, node.contextValue)]
            }
        });

        await dsActions.showDSAttributes(node, blockMocks.testDatasetTree);

        expect(datasetListSpy).toBeCalledWith(normalisedLabel, { attributes: true });
        expect(mocked(vscode.window.createWebviewPanel)).toBeCalled();
    });
    it("Checking failed attempt of dataset attributes showing (empty response)", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("AUSER.A1557332.A996850.TEST1", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT;

        mocked(vscode.window.createWebviewPanel).mockReturnValueOnce({
            webview: {
                html: ""
            }
        } as any);
        const datasetListSpy = jest.spyOn(blockMocks.mvsApi, "dataSet");
        datasetListSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });

        await expect(dsActions.showDSAttributes(node, blockMocks.testDatasetTree)).rejects.toEqual(
            Error("No matching data set names found for query: AUSER.A1557332.A996850.TEST1"));
        expect(mocked(vscode.window.showErrorMessage)).toBeCalledWith("Unable to list attributes: No matching data set names found for query: AUSER.A1557332.A996850.TEST1 Error: No matching data set names found for query: AUSER.A1557332.A996850.TEST1");
        expect(mocked(vscode.window.createWebviewPanel)).not.toBeCalled();
    });
});

describe("Dataset Actions Unit Tests - Function copyDataSet", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking copy the label of a node to the clipboard", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.DELETE.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT;

        await dsActions.copyDataSet(node);

        expect(clipboard.readText()).toBe(JSON.stringify({
            profileName: "sestest",
            dataSetName: "HLQ.TEST.DELETE.NODE"
        }));
    });
    it("Checking copy the label of a favorite node to the clipboard", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("[sestest]: HLQ.TEST.DELETE.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT + globals.FAV_SUFFIX;

        await dsActions.copyDataSet(node);

        expect(clipboard.readText()).toBe(JSON.stringify({
            profileName: "sestest",
            dataSetName: "HLQ.TEST.DELETE.NODE"
        }));
    });
    it("Checking copy the label of a member to the clipboard", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("parent", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        parent.contextValue = globals.DS_PDS_CONTEXT;
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        await dsActions.copyDataSet(child);

        expect(clipboard.readText()).toBe(JSON.stringify({
            profileName: "sestest",
            dataSetName: "parent",
            memberName: "child"
        }));
    });
    it("Checking copy the label of a favorite member to the clipboard", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const parent = new ZoweDatasetNode("[sestest]: parent", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const child = new ZoweDatasetNode("child", vscode.TreeItemCollapsibleState.None, parent, null);
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        await dsActions.copyDataSet(child);

        expect(clipboard.readText()).toBe(JSON.stringify({
            profileName: "sestest",
            dataSetName: "parent",
            memberName: "child"
        }));
    });
});

describe("Dataset Actions Unit Tests - Function pasteDataSet", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Should call zowe.Copy.dataSet when pasting to sequential data set", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_DS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        clipboard.writeText(JSON.stringify({
            dataSetName: "HLQ.TEST.BEFORE.NODE",
            profileName: blockMocks.imperativeProfile.name
        }));

        await dsActions.pasteDataSet(node, blockMocks.testDatasetTree);

        expect(copySpy).toHaveBeenCalledWith(
            { dataSetName: "HLQ.TEST.BEFORE.NODE" },
            { dataSetName: "HLQ.TEST.TO.NODE" }
        );
    });
    it("Should throw an error if invalid clipboard data is supplied when pasting to sequential data set", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_DS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockClear();
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        clipboard.writeText("INVALID");

        await expect(dsActions.pasteDataSet(node, blockMocks.testDatasetTree)).rejects.toEqual(
            Error("Invalid clipboard. Copy from data set first"));
        expect(copySpy).not.toBeCalled();
    });
    it("Should not call zowe.Copy.dataSet when pasting to partitioned data set with no member name", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode,
            null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_PDS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockClear();
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("");
        clipboard.writeText(JSON.stringify({ dataSetName: "HLQ.TEST.BEFORE.NODE", profileName: "sestest" }));

        await dsActions.pasteDataSet(node, blockMocks.testDatasetTree);
        expect(copySpy).not.toBeCalled();
    });
    it("Should call zowe.Copy.dataSet when pasting to partitioned data set", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null, undefined, undefined, blockMocks.imperativeProfile);
        node.contextValue = globals.DS_PDS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        const getContentsSpy = jest.spyOn(blockMocks.mvsApi, "getContents");
        getContentsSpy.mockRejectedValueOnce(Error("Member not found"));
        const listAllMembersSpy = jest.spyOn(blockMocks.mvsApi, "allMembers");
        listAllMembersSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem1");
        clipboard.writeText(JSON.stringify({ dataSetName: "HLQ.TEST.BEFORE.NODE", profileName: "sestest" }));

        await dsActions.pasteDataSet(node, blockMocks.testDatasetTree);

        expect(copySpy).toHaveBeenCalledWith(
            { dataSetName: "HLQ.TEST.BEFORE.NODE" },
            { dataSetName: "HLQ.TEST.TO.NODE", memberName: "mem1" }
        );
        expect(blockMocks.testDatasetTree.findFavoritedNode).toHaveBeenCalledWith(
            node
        );
    });
    it("Should throw an error when pasting to a member that already exists", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_PDS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockClear();
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        const listAllMembersSpy = jest.spyOn(blockMocks.mvsApi, "allMembers");
        listAllMembersSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: [
                    { member: "MEM1" },
                    { member: "MEM2" }
                ]
            }
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem1");
        clipboard.writeText(JSON.stringify({ dataSetName: "HLQ.TEST.BEFORE.NODE", profileName: "sestest" }));

        await expect(dsActions.pasteDataSet(node, blockMocks.testDatasetTree)).rejects.toEqual(
            Error("HLQ.TEST.TO.NODE(mem1) already exists. You cannot replace a member"));
        expect(copySpy).not.toBeCalled();
    });
    it("Should call zowe.Copy.dataSet when pasting to a favorited partitioned data set", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favoritedNode = new ZoweDatasetNode("[sestest]: HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null,
            undefined, undefined, blockMocks.imperativeProfile);
        favoritedNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const nonFavoritedNode = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode, null,
            undefined, undefined, blockMocks.imperativeProfile);
        nonFavoritedNode.contextValue = globals.DS_PDS_CONTEXT;

        const copySpy = jest.spyOn(blockMocks.mvsApi, "copyDataSetMember");
        copySpy.mockClear();
        copySpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {}
        });
        const getContentsSpy = jest.spyOn(blockMocks.mvsApi, "getContents");
        getContentsSpy.mockRejectedValueOnce(Error("Member not found"));
        const listAllMembersSpy = jest.spyOn(blockMocks.mvsApi, "allMembers");
        listAllMembersSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem1");
        mocked(blockMocks.testDatasetTree.findNonFavoritedNode).mockReturnValueOnce(nonFavoritedNode);
        clipboard.writeText(JSON.stringify({ dataSetName: "HLQ.TEST.BEFORE.NODE", profileName: "sestest" }));

        await dsActions.pasteDataSet(favoritedNode, blockMocks.testDatasetTree);

        expect(copySpy).toHaveBeenCalledWith(
            { dataSetName: "HLQ.TEST.BEFORE.NODE" },
            { dataSetName: "HLQ.TEST.TO.NODE", memberName: "mem1" }
        );
        expect(mocked(blockMocks.testDatasetTree.findNonFavoritedNode)).toHaveBeenCalledWith(
            favoritedNode
        );
        expect(mocked(blockMocks.testDatasetTree.refreshElement)).toHaveBeenLastCalledWith(
            nonFavoritedNode
        );
    });
});

describe("Dataset Actions Unit Tests - Function hMigrateDataSet", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking PS dataset migrate", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT;

        const migrateSpy = jest.spyOn(blockMocks.mvsApi, "hMigrateDataSet");
        migrateSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });

        await dsActions.hMigrateDataSet(node);

        expect(migrateSpy).toHaveBeenCalledWith("HLQ.TEST.TO.NODE");
        expect(mocked(vscode.window.showInformationMessage)).toHaveBeenCalled();
    });
});

describe("Dataset Actions Unit Tests - Function hRecallDataSet", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCredentials = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const zosmfSession = createBasicZosmfSession(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testDatasetTree = createDatasetTree(datasetSessionNode, treeView);
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            session,
            sessionWithoutCredentials,
            zosmfSession,
            treeView,
            imperativeProfile,
            datasetSessionNode,
            mvsApi,
            profileInstance,
            testDatasetTree
        };
    }

    afterAll(() => jest.restoreAllMocks());

    it("Checking PS dataset recall", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new ZoweDatasetNode("HLQ.TEST.TO.NODE", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null);
        node.contextValue = globals.DS_DS_CONTEXT;

        const recallSpy = jest.spyOn(blockMocks.mvsApi, "hRecallDataSet");
        recallSpy.mockResolvedValueOnce({
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        });

        await dsActions.hRecallDataSet(node);

        expect(recallSpy).toHaveBeenCalledWith("HLQ.TEST.TO.NODE");
        expect(mocked(vscode.window.showInformationMessage)).toHaveBeenCalled();
    });
});
