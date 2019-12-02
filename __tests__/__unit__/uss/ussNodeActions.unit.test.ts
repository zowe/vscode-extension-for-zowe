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
import { ZoweUSSNode } from "../../../src/ZoweUSSNode";
import * as brtimperative from "@brightside/imperative";
import * as zowe from "@brightside/core";
import * as ussNodeActions from "../../../src/uss/ussNodeActions";
import * as extension from "../../../src/extension";
import * as path from "path";
import * as fs from "fs";
import { Profiles } from "../../../src/Profiles";

const Create = jest.fn();
const Delete = jest.fn();
const Utilities = jest.fn();
const uss = jest.fn();
const ussFile = jest.fn();
const renameUSSFile = jest.fn();
const mockAddUSSSession = jest.fn();
const mockUSSRefresh = jest.fn();
const mockUSSRefreshElement = jest.fn();
const mockGetUSSChildren = jest.fn();
const mockRemoveUSSFavorite = jest.fn();
const mockAddUSSFavorite = jest.fn();
const mockInitializeFavorites = jest.fn();
const showInputBox = jest.fn();
const showErrorMessage = jest.fn();
const showInformationMessage = jest.fn();
const showQuickPick = jest.fn();
const getConfiguration = jest.fn();
const showOpenDialog = jest.fn();
const openTextDocument = jest.fn();
const Upload = jest.fn();
const fileToUSSFile = jest.fn();
const writeText = jest.fn();
const existsSync = jest.fn();
const createBasicZosmfSession = jest.fn();

function getUSSNode() {
    const ussNode1 = new ZoweUSSNode("usstest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    const mParent = new ZoweUSSNode("parentNode", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    ussNode1.contextValue = extension.USS_SESSION_CONTEXT;
    ussNode1.fullPath = "/u/myuser";
    ussNode1.mParent = mParent;
    return ussNode1;
}

function getFavoriteUSSNode() {
    const ussNodeF = new ZoweUSSNode("[profile]: usstest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    const mParent = new ZoweUSSNode("Favorites", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    mParent.contextValue = extension.FAVORITE_CONTEXT;
    ussNodeF.contextValue = extension.DS_TEXT_FILE_CONTEXT + extension.FAV_SUFFIX;
    ussNodeF.fullPath = "/u/myuser/usstest";
    ussNodeF.tooltip = "/u/myuser/usstest";
    ussNodeF.mParent = mParent;
    return ussNodeF;
}

function getUSSTree() {
    const ussNode1= getUSSNode();
    const ussNodeFav= getFavoriteUSSNode();
    const USSTree = jest.fn().mockImplementation(() => {
        return {
            mSessionNodes: [],
            mFavorites: [ussNodeFav],
            addSession: mockAddUSSSession,
            refresh: mockUSSRefresh,
            refreshAll: mockUSSRefresh,
            refreshElement: mockUSSRefreshElement,
            getChildren: mockGetUSSChildren,
            addUSSFavorite: mockAddUSSFavorite,
            removeUSSFavorite: mockRemoveUSSFavorite,
            initializeUSSFavorites: mockInitializeFavorites
        };
    });
    const testUSSTree1 = USSTree();
    testUSSTree1.mSessionNodes = [];
    testUSSTree1.mSessionNodes.push(ussNode1);
    return testUSSTree1;
}

const session = new brtimperative.Session({
    user: "fake",
    password: "fake",
    hostname: "fake",
    protocol: "https",
    type: "basic",
});

const ussNode = getUSSNode();
const ussFavNode = getFavoriteUSSNode();
const testUSSTree = getUSSTree();

Object.defineProperty(zowe, "Create", { value: Create });
Object.defineProperty(zowe, "Delete", { value: Delete });
Object.defineProperty(zowe, "Utilities", { value: Utilities });
Object.defineProperty(Create, "uss", { value: uss });
Object.defineProperty(Delete, "ussFile", { value: ussFile });
Object.defineProperty(Utilities, "renameUSSFile", { value: renameUSSFile });
Object.defineProperty(vscode.window, "showInputBox", { value: showInputBox });
Object.defineProperty(vscode.window, "showErrorMessage", { value: showErrorMessage });
Object.defineProperty(vscode.window, "showQuickPick", { value: showQuickPick });
Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
Object.defineProperty(vscode.workspace, "getConfiguration", { value: getConfiguration });
Object.defineProperty(vscode.window, "showOpenDialog", {value: showOpenDialog});
Object.defineProperty(vscode.workspace, "openTextDocument", {value: openTextDocument});
Object.defineProperty(vscode.env.clipboard, "writeText", {value: writeText});
Object.defineProperty(fs, "existsSync", {value: existsSync});
Object.defineProperty(zowe.ZosmfSession, "createBasicZosmfSession", { value: createBasicZosmfSession});

describe("ussNodeActions", () => {
    beforeEach(() => {
        showErrorMessage.mockReset();
        testUSSTree.refresh.mockReset();
        testUSSTree.refreshAll.mockReset();
        showQuickPick.mockReset();
        showInputBox.mockReset();
        existsSync.mockReturnValue(true);
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe("createUSSNodeDialog", () => {
        it("createUSSNode is executed successfully", async () => {
            showQuickPick.mockResolvedValueOnce("File");
            showInputBox.mockReturnValueOnce("USSFolder");
            await ussNodeActions.createUSSNodeDialog(ussNode, testUSSTree);
            expect(testUSSTree.refreshAll).toHaveBeenCalled();
            expect(testUSSTree.refreshElement).not.toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
        });
    });

    describe("createUSSNode", () => {
        it("createUSSNode is executed successfully", async () => {
            showInputBox.mockReturnValueOnce("USSFolder");
            await ussNodeActions.createUSSNode(ussNode, testUSSTree, "file");
            expect(testUSSTree.refreshElement).toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
        });
        it("createUSSNode does not execute if node name was not entered", async () => {
            showInputBox.mockReturnValueOnce("");
            await ussNodeActions.createUSSNode(ussNode, testUSSTree, "file");
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
        });
        it("should refresh only the child folder", async () => {
            showInputBox.mockReturnValueOnce("USSFolder");
            const isTopLevel = false;
            spyOn(ussNodeActions, "refreshAllUSS");
            await ussNodeActions.createUSSNode(ussNode, testUSSTree, "folder", isTopLevel);
            expect(testUSSTree.refreshElement).toHaveBeenCalled();
            expect(ussNodeActions.refreshAllUSS).not.toHaveBeenCalled();
        });
        it("createUSSNode throws an error", async () => {
            showInputBox.mockReturnValueOnce("USSFolder");
            showErrorMessage.mockReset();
            testUSSTree.refreshElement.mockReset();
            uss.mockImplementationOnce(() => {
                throw (Error("testError"));
            });
            try {
                await ussNodeActions.createUSSNode(ussNode, testUSSTree, "file");
            // tslint:disable-next-line:no-empty
            } catch (err) {
            }
            expect(testUSSTree.refreshElement).not.toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(1);
        });
        it("tests the uss create node credentials", async () => {
            showQuickPick.mockReset();
            showInputBox.mockReset();
            showInformationMessage.mockReset();
            const sessionwocred = new brtimperative.Session({
                user: "",
                password: "",
                hostname: "fake",
                port: 443,
                protocol: "https",
                type: "basic",
            });
            const sessNode = new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
            sessNode.contextValue = extension.USS_SESSION_CONTEXT;
            const dsNode = new ZoweUSSNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred, null);
            dsNode.contextValue = extension.USS_SESSION_CONTEXT;
            Object.defineProperty(Profiles, "getInstance", {
                value: jest.fn(() => {
                    return {
                        allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                        defaultProfile: {name: "firstName"},
                        promptCredentials: jest.fn(()=> {
                            return [{values: "fake"}, {values: "fake"}, {values: "fake"}];
                        }),
                    };
                })
            });

            showInputBox.mockReturnValueOnce("fake");
            showInputBox.mockReturnValueOnce("fake");

            await ussNodeActions.createUSSNodeDialog(dsNode, testUSSTree);

            expect(testUSSTree.refresh).toHaveBeenCalled();

        });

        it("tests the uss filter prompt credentials error", async () => {
            showQuickPick.mockReset();
            showInputBox.mockReset();
            showInformationMessage.mockReset();
            const sessionwocred = new brtimperative.Session({
                user: "",
                password: "",
                hostname: "fake",
                port: 443,
                protocol: "https",
                type: "basic",
            });
            const sessNode = new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
            sessNode.contextValue = extension.USS_SESSION_CONTEXT;
            const dsNode = new ZoweUSSNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred, null);
            dsNode.contextValue = extension.USS_SESSION_CONTEXT;
            Object.defineProperty(Profiles, "getInstance", {
                value: jest.fn(() => {
                    return {
                        allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                        defaultProfile: {name: "firstName"}
                    };
                })
            });

            await ussNodeActions.createUSSNodeDialog(dsNode, testUSSTree);

            expect(testUSSTree.refresh).not.toHaveBeenCalled();
        });
    });
    describe("deleteUSSNode", () => {
        it("should delete node if user verified", async () => {
            showQuickPick.mockResolvedValueOnce("Yes");
            await ussNodeActions.deleteUSSNode(ussNode, testUSSTree, "");
            expect(testUSSTree.refresh).toHaveBeenCalled();
        });
        it("should not delete node if user did not verify", async () => {
            showQuickPick.mockResolvedValueOnce("No");
            await ussNodeActions.deleteUSSNode(ussNode, testUSSTree, "");
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
        });
        it("should not delete node if user cancelled", async () => {
            showQuickPick.mockResolvedValueOnce(undefined);
            await ussNodeActions.deleteUSSNode(ussNode, testUSSTree, "");
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
        });
        it("should not delete node if an error thrown", async () => {
            showErrorMessage.mockReset();
            showQuickPick.mockResolvedValueOnce("Yes");
            ussFile.mockImplementationOnce(() => {
                throw (Error("testError"));
            });
            try {
                await ussNodeActions.deleteUSSNode(ussNode, testUSSTree, "");
            // tslint:disable-next-line:no-empty
            } catch (err) {
            }
            expect(showErrorMessage.mock.calls.length).toBe(1);
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
        });
    });

    describe("renameUSSNode", () => {
        it("should exit if blank input is provided", () => {
            showInputBox.mockReturnValueOnce("");
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(0);
        });
        it("should execute rename USS file and and refresh the tree", async () => {
            showInputBox.mockReturnValueOnce("new name");
            await ussNodeActions.renameUSSNode(ussNode, testUSSTree, "file");
            expect(testUSSTree.refresh).toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(1);
        });
        it("should execute rename USS file and and refreshAll the tree", async () => {
            renameUSSFile.mockReset();
            showInputBox.mockReturnValueOnce("new name");
            ussNode.contextValue = extension.USS_DIR_CONTEXT;
            await ussNodeActions.renameUSSNode(ussNode, testUSSTree, extension.DS_SESSION_CONTEXT);
            // expect(testUSSTree.refreshAll).toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(1);
        });
        it("should attempt rename USS file but abort with no name", async () => {
            showInputBox.mockReturnValueOnce(undefined);
            await ussNodeActions.renameUSSNode(ussNode, testUSSTree, "file");
            expect(testUSSTree.refresh).not.toHaveBeenCalled();
        });
        it("should attempt to rename USS file but throw an error", async () => {
            showErrorMessage.mockReset();
            showInputBox.mockReturnValueOnce("new name");
            renameUSSFile.mockImplementationOnce(() => {
                throw (Error("testError"));
            });
            try {
                await ussNodeActions.renameUSSNode(ussNode, testUSSTree, "file");
            // tslint:disable-next-line:no-empty
            } catch (err) {
            }
            expect(showErrorMessage.mock.calls.length).toBe(1);
        });
        it("should execute rename favorite USS file", async () => {
            showInputBox.mockReturnValueOnce("new name");
            await ussNodeActions.renameUSSNode(ussFavNode, testUSSTree, "file");
            expect(testUSSTree.refresh).toHaveBeenCalled();
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(1);
            expect(mockRemoveUSSFavorite.mock.calls.length).toBe(1);
            expect(mockAddUSSFavorite.mock.calls.length).toBe(1);
        });
    });
    describe("uploadFile", () => {
        Object.defineProperty(zowe, "Upload", {value: Upload});
        Object.defineProperty(Upload, "fileToUSSFile", {value: fileToUSSFile});

        it("should call upload dialog and upload file", async () => {
            fileToUSSFile.mockReset();
            const testDoc2: vscode.TextDocument = {
                fileName: path.normalize("/sestest/tmp/foo.txt"),
                uri: null,
                isUntitled: null,
                languageId: null,
                version: null,
                isDirty: null,
                isClosed: null,
                save: null,
                eol: null,
                lineCount: null,
                lineAt: null,
                offsetAt: null,
                positionAt: null,
                getText: null,
                getWordRangeAtPosition: null,
                validateRange: null,
                validatePosition: null
            };

            const fileUri = {fsPath: "/tmp/foo.txt"};
            showOpenDialog.mockReturnValue([fileUri]);
            openTextDocument.mockResolvedValueOnce(testDoc2);
            await ussNodeActions.uploadDialog(ussNode, testUSSTree);
            expect(showOpenDialog).toBeCalled();
            expect(openTextDocument).toBeCalled();
            expect(testUSSTree.refresh).toBeCalled();
        });
        it("should attempt to upload USS file but throw an error", async () => {
            showInputBox.mockReturnValueOnce("new name");
            showErrorMessage.mockReset();
            fileToUSSFile.mockReset();
            fileToUSSFile.mockImplementationOnce(() => {
                throw (Error("testError"));
            });
            const testDoc2: vscode.TextDocument = {
                fileName: path.normalize("/sestest/tmp/foo.txt"),
                uri: null,
                isUntitled: null,
                languageId: null,
                version: null,
                isDirty: null,
                isClosed: null,
                save: null,
                eol: null,
                lineCount: null,
                lineAt: null,
                offsetAt: null,
                positionAt: null,
                getText: null,
                getWordRangeAtPosition: null,
                validateRange: null,
                validatePosition: null
            };
            const fileUri = {fsPath: "/tmp/foo.txt"};
            showOpenDialog.mockReturnValue([fileUri]);
            openTextDocument.mockResolvedValueOnce(testDoc2);

            try {
                await ussNodeActions.uploadDialog(ussNode, testUSSTree);
            // tslint:disable-next-line:no-empty
            } catch (err) {
            }
            expect(showErrorMessage.mock.calls.length).toBe(1);
        });
    });
    describe("copyPath", () => {
        it("should copy the node's full path to the system clipboard", async () => {
            await ussNodeActions.copyPath(ussNode);
            expect(writeText).toBeCalledWith(ussNode.fullPath);
        });
        it("should not copy the node's full path to the system clipboard if theia", async () => {
            let theia = true;
            Object.defineProperty(extension, "ISTHEIA", { get: () => theia });
            await ussNodeActions.copyPath(ussNode);
            expect(writeText).not.toBeCalled();
            theia = false;
        });
    });
});
