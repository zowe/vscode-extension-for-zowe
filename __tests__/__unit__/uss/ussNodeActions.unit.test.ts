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
import * as profileLoader from "../../../src/ProfileLoader";
import * as path from "path";

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
const showInputBox = jest.fn();
const showErrorMessage = jest.fn();
const showQuickPick = jest.fn();
const getConfiguration = jest.fn();
const showOpenDialog = jest.fn();
const openTextDocument = jest.fn();
const Upload = jest.fn();
const fileToUSSFile = jest.fn();
const createBasicZosmfSession = jest.fn();

function getUSSNode() {
    const ussNode1 = new ZoweUSSNode("usstest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    const mParent = new ZoweUSSNode("parentNode", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    ussNode1.contextValue = "uss_session";
    ussNode1.fullPath = "/u/myuser";
    ussNode1.mParent = mParent;
    return ussNode1;
}

function getUSSTree() {
    const ussNode1= getUSSNode();
    const USSTree = jest.fn().mockImplementation(() => {
        return {
            mSessionNodes: [],
            mFavorites: [],
            addSession: mockAddUSSSession,
            refresh: mockUSSRefresh,
            refreshElement: mockUSSRefreshElement,
            getChildren: mockGetUSSChildren,
            removeUSSFavorite: mockRemoveUSSFavorite
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
Object.defineProperty(vscode.workspace, "getConfiguration", { value: getConfiguration });
Object.defineProperty(vscode.window, "showOpenDialog", {value: showOpenDialog});
Object.defineProperty(vscode.workspace, "openTextDocument", {value: openTextDocument});
Object.defineProperty(zowe.ZosmfSession, "createBasicZosmfSession", { value: createBasicZosmfSession});

describe("ussNodeActions", () => {
    beforeEach(() => {
        showErrorMessage.mockReset();
        testUSSTree.refresh.mockReset();
        showQuickPick.mockReset();
        showInputBox.mockReset();
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
    });
    describe("initializingUSSFavorites", () => {
        it("initializeUSSFavorites is executed successfully", async () => {
            getConfiguration.mockReturnValueOnce({
                get: (setting: string) => [
                    "[test]: /u/aDir{directory}",
                    "[test]: /u/myFile.txt{textFile}",
                ]
            });
            spyOn(profileLoader, "loadNamedProfile").and.returnValue({profile: session});
            createBasicZosmfSession.mockReturnValue(session);
            await ussNodeActions.initializeUSSFavorites(testUSSTree);
            expect(testUSSTree.mFavorites.length).toBe(2);

            const expectedUSSFavorites: ZoweUSSNode[] = [
                new ZoweUSSNode("/u/aDir", vscode.TreeItemCollapsibleState.Collapsed, undefined, session, "",
                    false, "test"),
                new ZoweUSSNode("/u/myFile.txt", vscode.TreeItemCollapsibleState.None, undefined, session, "",
                    false, "test"),
            ];

            expectedUSSFavorites.map((node) => node.contextValue += "f");
            expectedUSSFavorites.forEach((node) => {
                if (node.contextValue !== "directoryf") {
                    node.command = { command: "zowe.uss.ZoweUSSNode.open", title: "Open", arguments: [node] };
                }
            });
            expect(testUSSTree.mFavorites).toEqual(expectedUSSFavorites);
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
    });
});
