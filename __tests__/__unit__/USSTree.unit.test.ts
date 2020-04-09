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

// tslint:disable:no-shadowed-variable
import { getIconByNode } from "../../src/generators/icons";

jest.mock("vscode");
jest.mock("@zowe/imperative");
jest.mock("Session");
jest.mock("../../src/Profiles");

import * as zowe from "@zowe/cli";
import { Session, Logger, IProfileLoaded } from "@zowe/imperative";
import * as vscode from "vscode";
import { USSTree, createUSSTree } from "../../src/uss/USSTree";
import * as utils from "../../src/utils";
import { ZoweUSSNode } from "../../src/uss/ZoweUSSNode";
import * as globals from "../../src/globals";
import { Profiles, ValidProfileEnum } from "../../src/Profiles";
import { IZoweTree } from "../../src/api/IZoweTree";
import { IZoweUSSTreeNode } from "../../src/api/IZoweTreeNode";

describe("Unit Tests (Jest)", () => {
    // Globals
    const session = new Session({
        user: "fake",
        password: "fake",
        hostname: "fake",
        protocol: "https",
        type: "basic",
    });

    function getUSSNode() {
        const mParent = new ZoweUSSNode("parentNode", vscode.TreeItemCollapsibleState.Expanded, null, session, null, false, profileOne.name);
        const ussNode1 = new ZoweUSSNode("usstest", vscode.TreeItemCollapsibleState.Expanded, mParent, session, null, false, profileOne.name);
        ussNode1.contextValue = globals.USS_SESSION_CONTEXT;
        ussNode1.fullPath = "/u/myuser";
        return ussNode1;
    }

    function getFavoriteUSSNode() {
        const ussNodeF = new ZoweUSSNode("[profile]: usstest", vscode.TreeItemCollapsibleState.Expanded, null, session, null, false, profileOne.name);
        const mParent = new ZoweUSSNode("Favorites", vscode.TreeItemCollapsibleState.Expanded, null, session, null, false, profileOne.name);
        mParent.contextValue = globals.FAVORITE_CONTEXT;
        ussNodeF.contextValue = globals.DS_TEXT_FILE_CONTEXT + globals.FAV_SUFFIX;
        ussNodeF.fullPath = "/u/myuser/usstest";
        ussNodeF.tooltip = "/u/myuser/usstest";
        return ussNodeF;
    }

    const getConfiguration = jest.fn();
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: getConfiguration });
    getConfiguration.mockReturnValue({
        get: (setting: string) => [
            "[test]: /u/aDir{directory}",
            "[test]: /u/myFile.txt{textFile}",
        ],
        update: jest.fn(()=>{
            return {};
        })
    });
    const ProgressLocation = jest.fn().mockImplementation(() => {
        return {
            Notification: 15
        };
    });
    const withProgress = jest.fn().mockImplementation(() => {
        return {
            location: 15,
            title: "Saving file..."
        };
    });
    const testResponse = {
        success: true,
        commandResponse: "",
        apiResponse: {
            items: []
        }
    };
    withProgress.mockReturnValue(testResponse);

    const showErrorMessage = jest.fn();
    const showInformationMessage = jest.fn();
    const showInputBox = jest.fn();
    const createQuickPick = jest.fn();
    const createTreeView = jest.fn();
    const showQuickPick = jest.fn();
    const filters = jest.fn();
    const getFilters = jest.fn();
    const Utilities = jest.fn();
    const renameUSSFile = jest.fn();
    Object.defineProperty(vscode.window, "showErrorMessage", {value: showErrorMessage});
    Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
    Object.defineProperty(vscode.window, "createQuickPick", {value: createQuickPick});
    Object.defineProperty(vscode.window, "showQuickPick", {value: showQuickPick});
    Object.defineProperty(vscode.window, "showInputBox", {value: showInputBox});
    Object.defineProperty(zowe, "Utilities", { value: Utilities });
    Object.defineProperty(Utilities, "renameUSSFile", { value: renameUSSFile });
    Object.defineProperty(filters, "getFilters", { value: getFilters });
    Object.defineProperty(vscode, "ProgressLocation", {value: ProgressLocation});
    Object.defineProperty(vscode.window, "withProgress", {value: withProgress});
    Object.defineProperty(vscode.window, "createTreeView", {value: createTreeView});
    getFilters.mockReturnValue(["/u/aDir{directory}", "/u/myFile.txt{textFile}"]);
    createTreeView.mockReturnValue("testTreeView");

    const testTree: IZoweTree<IZoweUSSTreeNode> = new USSTree();
    const profileOne: IProfileLoaded = {
        name: "aProfile",
        profile: {
            user:undefined,
            password: undefined
        },
        type: "zosmf",
        message: "",
        failNotFound: false
    };
    const mockLoadNamedProfile = jest.fn();
    mockLoadNamedProfile.mockReturnValue(profileOne);
    const mockDefaultProfile = jest.fn();
    mockDefaultProfile.mockReturnValue(profileOne);
    Object.defineProperty(Profiles, "getInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [profileOne, {name: "secondName"}],
                getDefaultProfile: mockDefaultProfile,
                validProfile: ValidProfileEnum.VALID,
                checkCurrentProfile: jest.fn(),
                loadNamedProfile: mockLoadNamedProfile
            };
        })
    });
    testTree.mSessionNodes.push(new ZoweUSSNode("ussTestSess", vscode.TreeItemCollapsibleState.Collapsed, null, session,
        null, false, profileOne.name, undefined));
    testTree.mSessionNodes[1].contextValue = globals.USS_SESSION_CONTEXT;
    testTree.mSessionNodes[1].fullPath = "test";
    const targetIcon = getIconByNode(testTree.mSessionNodes[1]);
    if (targetIcon) {
        testTree.mSessionNodes[1].iconPath = targetIcon.path;
    }

    beforeEach(() => {
        withProgress.mockImplementation((progLocation, callback) => {
            return callback();
        });
    });

    afterEach(async () => {
        getConfiguration.mockClear();
    });
    afterAll(() => {
        jest.resetAllMocks();
    });
    /*************************************************************************************************************
     * Creates an ZoweUSSNode and checks that its members are all initialized by the constructor
     *************************************************************************************************************/
    it("Testing that the ZoweUSSNode is defined", async () => {
        const testNode = new ZoweUSSNode("/u", vscode.TreeItemCollapsibleState.None, null, session, null);
        testNode.contextValue = globals.USS_SESSION_CONTEXT;

        expect(testNode.label).toBeDefined();
        expect(testNode.collapsibleState).toBeDefined();
        expect(testNode.label).toBeDefined();
        expect(testNode.getParent()).toBeDefined();
        expect(testNode.getSession()).toBeDefined();
    });

    /*************************************************************************************************************
     * Creates a ussTree and checks that its members are all initialized by the constructor
     *************************************************************************************************************/
    it("Testing that the uss tree is defined", async () => {
        expect(testTree.mSessionNodes).toBeDefined();
        expect(testTree.getTreeView()).toEqual("testTreeView");
    });

    /*************************************************************************************************************
     * Calls getTreeItem with sample element and checks the return is vscode.TreeItem
     *************************************************************************************************************/
    it("Testing the getTreeItem method", async () => {
        const sampleElement = new ZoweUSSNode("/u/myUser", vscode.TreeItemCollapsibleState.None,
            null, null, null);
        expect(testTree.getTreeItem(sampleElement)).toBeInstanceOf(vscode.TreeItem);
    });

    /*************************************************************************************************************
     * Creates sample list of ZoweUSSNodes and checks that ussTree.getChildren() returns correct array of children
     *************************************************************************************************************/
    it("Tests that getChildren returns valid list of elements", async () => {
        // Waiting until we populate rootChildren with what getChildren return
        const rootChildren = await testTree.getChildren();
        // Creating a rootNode
        const sessNode = [
            new ZoweUSSNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, null, null, null, false),
            new ZoweUSSNode("ussTestSess", vscode.TreeItemCollapsibleState.Collapsed, null, session, null, false, profileOne.name),
        ];
        sessNode[0].contextValue = globals.FAVORITE_CONTEXT;
        let targetIcon = getIconByNode(sessNode[0]);
        if (targetIcon) {
            sessNode[0].iconPath = targetIcon.path;
        }
        sessNode[1].contextValue = globals.USS_SESSION_CONTEXT;
        targetIcon = getIconByNode(sessNode[1]);
        if (targetIcon) {
            sessNode[1].iconPath = targetIcon.path;
        }
        sessNode[1].fullPath = "test";

        // Checking that the rootChildren are what they are expected to be
        expect(sessNode).toEqual(rootChildren);

        // Additional tests for favorite icon state coverage
        expect(JSON.stringify(sessNode[0].iconPath)).toContain("folder-root-favorite-closed.svg");
        await testTree.flipState(sessNode[0], true);
        expect(JSON.stringify(sessNode[0].iconPath)).toContain("folder-root-favorite-open.svg");
    });

    /*************************************************************************************************************
     * Creates a rootNode and checks that a getParent() call returns null
     *************************************************************************************************************/
    it("Tests that getParent returns null when called on a rootNode", async () => {
        // Waiting until we populate rootChildren with what getChildren() returns
        const rootChildren = await testTree.getChildren();
        const parent = testTree.getParent(rootChildren[0]);
        // We expect parent to equal null because when we call getParent() on the rootNode
        // It should return null rather than itself
        expect(parent).toEqual(null);
    });

    /*************************************************************************************************************
     * Creates a child with a rootNode as parent and checks that a getParent() call returns null.
     * Also creates a child with a non-rootNode parent and checks that getParent() returns the correct ZoweUSSNode
     *************************************************************************************************************/
    it("Tests that getParent returns the correct ZoweUSSNode when called on a non-rootNode ZoweUSSNode", async () => {
        // Creating fake directories and uss members to test
        const sampleChild1: ZoweUSSNode = new ZoweUSSNode("/u/myUser/zowe1", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[0], session, null);
        const parent1 = testTree.getParent(sampleChild1);

        // Creating fake directories and uss members to test
        const sampleChild2: ZoweUSSNode = new ZoweUSSNode("/u/myUser/zowe2", vscode.TreeItemCollapsibleState.None,
            sampleChild1, null, null);
        const parent2 = testTree.getParent(sampleChild2);

        // The first expect expected that parent is null because when getParent() is called on a child
        // of the rootNode, it should return null
        expect(testTree.getParent(testTree.mSessionNodes[0])).toBe(null);
        expect(parent1).toBe(testTree.mSessionNodes[0]);
        expect(parent2).toBe(sampleChild1);

    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweUSSNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweUSSNodes when called and passed an element of type ZoweUSSNode<session>", async () => {
        testTree.mSessionNodes[1].dirty = true;
        // Waiting until we populate rootChildren with what getChildren return
        const sessChildren = await testTree.getChildren(testTree.mSessionNodes[1]);
        // Creating fake datasets and uss members to test
        const sampleChildren: ZoweUSSNode[] = [
            new ZoweUSSNode("aDir", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null, null),
        ];

        // Checking that the rootChildren are what they are expected to be
        expect(sessChildren[0].label).toEqual(sampleChildren[0].label);
    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweUSSNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweUSSNodes when called and passed an element of type ZoweUSSNode<favorite>", async () => {

        // Waiting until we populate rootChildren with what getChildren return
        testTree.mFavorites.push(new ZoweUSSNode("/u/myUser", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[0], null, null));
        const favChildren = await testTree.getChildren(testTree.mSessionNodes[0]);
        // Creating fake datasets and uss members to test
        const sampleChildren: ZoweUSSNode[] = [
            new ZoweUSSNode("/u/myUser", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[0], null, null)
        ];

        // Checking that the rootChildren are what they are expected to be
        expect(favChildren).toEqual(sampleChildren);
    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweUSSNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweUSSNodes when called and passed an element of type ZoweUSSNode<directory>", async () => {
        const directory = new ZoweUSSNode("/u", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null, null);
        directory.dirty = true;
        // Waiting until we populate rootChildren with what getChildren return
        const dirChildren = await testTree.getChildren(directory);
        // Creating fake directory and files to test
        const sampleChildren: ZoweUSSNode[] = [
            new ZoweUSSNode("myFile.txt", vscode.TreeItemCollapsibleState.None, directory, null, null),
        ];
        sampleChildren[0].command = { command: "zowe.uss.ZoweUSSNode.open", title: "", arguments: [sampleChildren[0]] };

        // Checking that the rootChildren are what they are expected to be
        expect(dirChildren[1].label).toEqual(sampleChildren[0].label);
        // expect(dirChildren[1].command).toEqual("zowe.uss.ZoweUSSNode.open");
    });

    /*************************************************************************************************************
     * Tests that the USSTree refresh function exists and doesn't error
     *************************************************************************************************************/
    it("Calling the refresh button ", async () => {
        await testTree.refresh();
    });

    /*************************************************************************************************************
     * Test the addSession command
     *************************************************************************************************************/
    it("Test the addSession command ", async () => {

        testTree.addSession();

        testTree.addSession("fake");
    });

    /*************************************************************************************************************
     * Testing that addUSSFavorite works properly
     *************************************************************************************************************/
    it("Testing that addUSSFavorite works properly", async () => {
        testTree.mFavorites = [];
        const parentDir = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null, "/");
        const childFile = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None,
            parentDir, null, "/parent");
        childFile.contextValue = globals.DS_TEXT_FILE_CONTEXT;

        // Check adding directory
        await testTree.addFavorite(parentDir);
        // Check adding duplicates
        await testTree.addFavorite(parentDir);
        // Check adding file
        await testTree.addFavorite(childFile);

        expect(testTree.mFavorites.length).toEqual(2);
    });

    /*************************************************************************************************************
     * Testing searchInLoadedItems
     *************************************************************************************************************/
    it("Testing that searchInLoadedItems returns the correct array", async () => {
        const folder = new ZoweUSSNode("folder", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null, "/");
        const file = new ZoweUSSNode("file", vscode.TreeItemCollapsibleState.None, folder, null, "/folder");
        testTree.mSessionNodes[1].children = [folder];
        folder.children.push(file);
        const treeGetChildren = jest.spyOn(testTree, "getChildren").mockImplementationOnce(
            () => Promise.resolve([testTree.mSessionNodes[1]])
        );
        const sessionGetChildren = jest.spyOn(testTree.mSessionNodes[1], "getChildren").mockImplementationOnce(
            () => Promise.resolve(testTree.mSessionNodes[1].children)
        );

        const loadedItems = await testTree.searchInLoadedItems();

        expect(loadedItems).toStrictEqual([file, folder]);
    });

    /*************************************************************************************************************
     * Testing that deleteSession works properly
     *************************************************************************************************************/
    it("Testing that deleteSession works properly", async () => {
        const startLength = testTree.mSessionNodes.length;
        testTree.mSessionNodes.push(new ZoweUSSNode("ussTestSess2", vscode.TreeItemCollapsibleState.Collapsed, null, session, null));
        testTree.addSession("ussTestSess2");
        testTree.mSessionNodes[startLength].contextValue = globals.USS_SESSION_CONTEXT;
        testTree.mSessionNodes[startLength].fullPath = "test";
        const targetIcon = getIconByNode(testTree.mSessionNodes[startLength]);
        if (targetIcon) {
            testTree.mSessionNodes[startLength].iconPath = targetIcon.path;
        }
        testTree.deleteSession(testTree.mSessionNodes[startLength]);
        expect(testTree.mSessionNodes.length).toEqual(startLength);
    });

    /*************************************************************************************************************
     * Testing that removeFavorite works properly
     *************************************************************************************************************/
    it("Testing that removeFavorite works properly", async () => {
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);

        expect(testTree.mFavorites).toEqual([]);
    });

    /*************************************************************************************************************
     * Test the addRecall/getRecall commands
     *************************************************************************************************************/
    it("Tests the addRecall & getRecall commands", async () => {
        testTree.addRecall("testHistory");
        expect(testTree.getRecall()[0]).toEqual("testHistory");
    });

    /*************************************************************************************************************
     * Test the removeRecall commands
     *************************************************************************************************************/
    it("Tests the removeRecall command", async () => {
        testTree.removeRecall("testHistory");
        expect(testTree.getRecall().includes("testHistory")).toEqual(false);
    });

    /*************************************************************************************************************
     * Testing that addUSSFavorite sorting works
     *************************************************************************************************************/
    it("Testing that saveSearch works properly", async () => {
        testTree.mFavorites = [];
        const parentDir = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null, "/");
        let childFile = new ZoweUSSNode("abcd", vscode.TreeItemCollapsibleState.None,
            parentDir, null, "/parent");
        childFile.contextValue = globals.USS_SESSION_CONTEXT;

        // Check adding file
        await testTree.addFavorite(childFile);

        expect(testTree.mFavorites.length).toEqual(1);

        childFile = new ZoweUSSNode("folder", vscode.TreeItemCollapsibleState.None,
        parentDir, null, "/parent");
        childFile.contextValue = globals.USS_DIR_CONTEXT;
        await testTree.addFavorite(childFile);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(2);

        testTree.mSessionNodes[1].fullPath = "/z1234";
        await testTree.saveSearch(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(3);

        testTree.mSessionNodes[1].fullPath = "/a1234";
        await testTree.saveSearch(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(4);

        testTree.mSessionNodes[1].fullPath = "/r1234";
        await testTree.saveSearch(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(5);
    });

    /*************************************************************************************************************
     * Testing that expand tree is executed successfully
     *************************************************************************************************************/
    it("Testing that expand tree is executed successfully", async () => {
        const refresh = jest.fn();
        Object.defineProperty(testTree, "refresh", {value: refresh});
        refresh.mockReset();
        const folder = new ZoweUSSNode("/u/myuser", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[0], session, null);
        folder.contextValue = globals.USS_DIR_CONTEXT;
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(folder, false);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-open.svg");
    });

    it("Testing that expand tree with credential prompt is executed successfully", async () => {
        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
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
        const folder = new ZoweUSSNode("/u/myuser", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[0], sessionwocred, null);
        folder.contextValue = globals.USS_DIR_CONTEXT;
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(folder, false);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).toContain("folder-open.svg");
    });

    it("Testing that expand tree with credential prompt ends in error", async () => {
        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"}
                };
            })
        });
        const folder = new ZoweUSSNode("/u/myuser", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[0], sessionwocred, null);
        folder.contextValue = globals.USS_DIR_CONTEXT;
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).not.toEqual("folder-open.svg");
        await testTree.flipState(folder, false);
        expect(JSON.stringify(folder.iconPath)).not.toEqual("folder-closed.svg");
        await testTree.flipState(folder, true);
        expect(JSON.stringify(folder.iconPath)).not.toEqual("folder-open.svg");
    });

    it("initialize USSTree is executed successfully", async () => {
        const mockLoadNamedProfile = jest.fn();
        mockLoadNamedProfile.mockReturnValue(profileOne);
        const mockDefaultProfile = jest.fn();
        mockDefaultProfile.mockReturnValue(profileOne);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName"}, {name: "secondName"}],
                    getDefaultProfile: mockDefaultProfile,
                    loadNamedProfile: mockLoadNamedProfile,
                    validProfile: ValidProfileEnum.VALID,
                    checkCurrentProfile: jest.fn(),
                };
            })
        });
        const testTree1 = await createUSSTree(Logger.getAppLogger());
        expect(testTree1.mFavorites.length).toBe(2);

        const expectedUSSFavorites: ZoweUSSNode[] = [
            new ZoweUSSNode("/u/aDir", vscode.TreeItemCollapsibleState.Collapsed, undefined, session, "",
                false, "test"),
            new ZoweUSSNode("/u/myFile.txt", vscode.TreeItemCollapsibleState.None, undefined, session, "",
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

    /*************************************************************************************************************
     * USS Filter prompts
     *************************************************************************************************************/
    it("Testing that user filter prompts are executed successfully, theia specific route", async () => {
        let theia = true;
        Object.defineProperty(globals, "ISTHEIA", { get: () => theia });
        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce(" -- Specify Filter -- ");
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce("/u/myFiles");

        // Assert choosing the new filter specification followed by a path
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].fullPath).toEqual("/u/myFiles");

        // Assert edge condition user cancels the input path box
        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce("\uFF0B " + "Create a new filter");
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce(undefined);
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a path.");

        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce(new utils.FilterDescriptor("/u/thisFile"));
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].fullPath).toEqual("/u/thisFile");

        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce(undefined);
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
        theia = false;
    });

    it("Testing that user filter prompts are executed successfully, VSCode route", async () => {
        // testTree.initialize(Logger.getAppLogger());
        let qpItem: vscode.QuickPickItem = new utils.FilterDescriptor("\uFF0B " + "Create a new filter");
        expect(qpItem.description).toBeFalsy();
        expect(qpItem.alwaysShow).toBe(true);

        const resolveQuickPickHelper = jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );
        let entered;

        // Assert edge condition user cancels the input path box
        createQuickPick.mockReturnValue({
            placeholder: "Select a filter",
            activeItems: [qpItem],
            ignoreFocusOut: true,
            items: [qpItem],
            value: entered,
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

        // Normal route chooses create new then enters a value
        showInformationMessage.mockReset();
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce("/U/HARRY");
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].fullPath).toEqual("/U/HARRY");

        // User cancels out of input field
        showInformationMessage.mockReset();
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce(undefined);
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a path.");

        // User enters a value in the QuickPick and presses create new
        entered = "/U/HLQ/BIGSTUFF";
        createQuickPick.mockReturnValueOnce({
            placeholder: "Select a filter",
            activeItems: [qpItem],
            ignoreFocusOut: true,
            items: [qpItem],
            value: entered,
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

        showInformationMessage.mockReset();
        // Assert choosing the new filter specification but fills in path in QuickPick
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.USS_SESSION_CONTEXT);
        expect(testTree.mSessionNodes[1].fullPath).toEqual("/U/HLQ/BIGSTUFF");

        showQuickPick.mockReset();
        qpItem = new utils.FilterItem("/U/HLQ/STUFF");
        expect(qpItem.description).toBeFalsy();
        expect(qpItem.alwaysShow).toBe(false);
        createQuickPick.mockReturnValueOnce({
            placeholder: "Select a filter",
            activeItems: [qpItem],
            ignoreFocusOut: true,
            items: [qpItem],
            value: entered,
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
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].fullPath).toEqual("/U/HLQ/STUFF");

        // Assert edge condition user cancels from the quick pick
        showInformationMessage.mockReset();
        qpItem = undefined;
        await testTree.filterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
    });

    /*************************************************************************************************************
     * Testing the onDidConfiguration
     *************************************************************************************************************/
    it("Testing the onDidConfiguration", async () => {
        getConfiguration.mockReturnValue({
            get: (setting: string) => [
                "[test]: /u/aDir{directory}",
                "[test]: /u/myFile.txt{textFile}",
            ],
            update: jest.fn(()=>{
                return {};
            })
        });
        const mockAffects = jest.fn();
        const Event = jest.fn().mockImplementation(() => {
            return {
                affectsConfiguration: mockAffects
            };
        });
        const e = new Event();
        mockAffects.mockReturnValue(true);

        const enums = jest.fn().mockImplementation(() => {
            return {
                Global: 1,
                Workspace: 2,
                WorkspaceFolder: 3
            };
        });
        Object.defineProperty(vscode, "ConfigurationTarget", {value: enums});
        await testTree.onDidChangeConfiguration(e);
        expect(getConfiguration.mock.calls.length).toBe(2);
    });

    it("tests the uss filter prompt credentials", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();
        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
        const sessNode = new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
        sessNode.contextValue = globals.USS_SESSION_CONTEXT;
        const dsNode = new ZoweUSSNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred, null);
        dsNode.contextValue = globals.USS_SESSION_CONTEXT;
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    validProfile: ValidProfileEnum.INVALID,
                    checkCurrentProfile: jest.fn(),
                    promptCredentials: jest.fn(()=> {
                        return [{values: "fake"}, {values: "fake"}, {values: "fake"}];
                    }),
                };
            })
        });

        showInputBox.mockReturnValueOnce("fake");
        showInputBox.mockReturnValueOnce("fake");

        await testTree.filterPrompt(dsNode);

        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");
    });

    it("tests the uss filter prompt credentials, favorites route", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();

        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
        const ZosmfSession = jest.fn();
        Object.defineProperty(zowe, "ZosmfSession", { value: ZosmfSession });
        const createBasicZosmfSession = jest.fn();
        Object.defineProperty(ZosmfSession, "createBasicZosmfSession", { value: createBasicZosmfSession });
        createBasicZosmfSession.mockReturnValue(sessionwocred);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [profileOne, {name: "secondName"}],
                    defaultProfile: profileOne,
                    loadNamedProfile: mockLoadNamedProfile,
                    validProfile: ValidProfileEnum.VALID,
                    checkCurrentProfile: jest.fn(),
                    promptCredentials: jest.fn(()=> {
                        return ["fake", "fake", "fake"];
                    }),
                };
            })
        });
        const dsNode = new ZoweUSSNode(`[${profileOne.name}]: /u/myFile.txt`, vscode.TreeItemCollapsibleState.Expanded,
            null, sessionwocred, null, false, profileOne.name);
        dsNode.mProfileName = profileOne.name;
        dsNode.getSession().ISession.user = "";
        dsNode.getSession().ISession.password = "";
        dsNode.getSession().ISession.base64EncodedAuth = "";
        dsNode.contextValue = globals.USS_SESSION_CONTEXT + globals.FAV_SUFFIX;
        testTree.mSessionNodes.push(dsNode);
        const qpItem: vscode.QuickPickItem = new utils.FilterDescriptor("\uFF0B " + "Create a new filter");

        const resolveQuickPickHelper = jest.spyOn(utils, "resolveQuickPickHelper").mockImplementation(
            () => Promise.resolve(qpItem)
        );
        const spyMe = new USSTree();
        Object.defineProperty(spyMe, "filterPrompt", {
            value: jest.fn(() => {
                return {
                    tempNode: dsNode,
                    mSessionNodes: {Session: {ISession: {user: "", password: "", base64EncodedAuth: ""}}, mProfileName: profileOne.name}
                };
            })
        });
        createQuickPick.mockReturnValue({
            placeholder: "Select a filter",
            activeItems: [qpItem],
            ignoreFocusOut: true,
            items: [qpItem],
            value: "",
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

        await testTree.filterPrompt(dsNode);

        // TODO: this test does not seem correct: they fourth node is already present when the test starts
        // const nodeLength = testTree.mSessionNodes.length - 1;
        // expect(testTree.mSessionNodes[nodeLength].fullPath).toEqual("/u/myFile.txt");

    });

    it("tests the uss filter, favorites route", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();

        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
        const ZosmfSession = jest.fn();
        Object.defineProperty(zowe, "ZosmfSession", { value: ZosmfSession });
        const createBasicZosmfSession = jest.fn();
        Object.defineProperty(ZosmfSession, "createBasicZosmfSession", { value: createBasicZosmfSession });
        createBasicZosmfSession.mockReturnValue(sessionwocred);
        const dsNode = new ZoweUSSNode(
          "[ussTestSess2]: /u/myFile.txt", vscode.TreeItemCollapsibleState.Expanded, null, sessionwocred, null, false, "ussTestSess2");
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName"}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    validProfile: ValidProfileEnum.VALID,
                    checkCurrentProfile: jest.fn(),
                    loadNamedProfile: mockLoadNamedProfile,
                    promptCredentials: jest.fn(()=> {
                        return ["", "", ""];
                    }),
                };
            })
        });
        dsNode.mProfileName = "ussTestSess2";
        dsNode.getSession().ISession.user = "";
        dsNode.getSession().ISession.password = "";
        dsNode.getSession().ISession.base64EncodedAuth = "";
        dsNode.contextValue = globals.USS_SESSION_CONTEXT + globals.FAV_SUFFIX;
        testTree.mSessionNodes.push(dsNode);

        const spyMe = new USSTree();
        Object.defineProperty(spyMe, "filterPrompt", {
            value: jest.fn(() => {
                return {
                    tempNode: dsNode,
                    mSessionNodes: {Session: {ISession: {user: "", password: "", base64EncodedAuth: ""}}}
                };
            })
        });

        await testTree.filterPrompt(dsNode);

        const nodeLength = testTree.mSessionNodes.length - 1;
        expect(testTree.mSessionNodes[nodeLength].fullPath).toEqual("/u/myFile.txt");

    });

    it("tests the uss filter prompt credentials error", async () => {
        showQuickPick.mockReset();
        showInputBox.mockReset();
        const sessionwocred = new Session({
            user: "",
            password: "",
            hostname: "fake",
            port: 443,
            protocol: "https",
            type: "basic",
        });
        const sessNode = new ZoweUSSNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
        sessNode.contextValue = globals.USS_SESSION_CONTEXT;
        const dsNode = new ZoweUSSNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred, null);
        dsNode.contextValue = globals.USS_SESSION_CONTEXT;
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"},
                    validProfile: ValidProfileEnum.INVALID,
                    checkCurrentProfile: jest.fn()
                };
            })
        });

        await testTree.filterPrompt(dsNode);

        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");
    });
    describe("renameUSSNode", () => {
        const executeCommand = jest.fn();
        Object.defineProperty(vscode.commands, "executeCommand", {value: executeCommand});
        const testTree = new USSTree();
        const refreshSpy = jest.spyOn(testTree, "refreshElement");
        const removeFavorite = jest.spyOn(testTree, "removeFavorite");
        const addFavorite = jest.spyOn(testTree, "addFavorite");
        const resetMocks = () => {
            executeCommand.mockReset();
            showErrorMessage.mockReset();
            showInputBox.mockReset();
            renameUSSFile.mockReset();
        };
        const resetNode = (node: ZoweUSSNode) => {
          node.label = "";
          node.shortLabel = "";
        };
        const ussNode = getUSSNode();
        const ussFavNode = getFavoriteUSSNode();

        it("should exit if blank input is provided", async () => {
            resetMocks();
            resetNode(ussNode);

            showInputBox.mockReturnValueOnce("");
            await testTree.rename(ussNode);
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(0);
            expect(refreshSpy).not.toHaveBeenCalled();
        });
        it("should execute rename USS file and and refresh the tree", async () => {
            resetMocks();
            resetNode(ussNode);

            showInputBox.mockReturnValueOnce("new name");
            await testTree.rename(ussNode);
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(1);
        });
        it("should attempt rename USS file but abort with no name", async () => {
            resetMocks();
            resetNode(ussNode);

            showInputBox.mockReturnValueOnce(undefined);
            await testTree.rename(ussNode);
            expect(refreshSpy).not.toHaveBeenCalled();
        });
        it("should attempt to rename USS file but throw an error", async () => {
            resetMocks();
            resetNode(ussNode);

            showInputBox.mockReturnValueOnce("new name");
            renameUSSFile.mockRejectedValueOnce(Error("testError"));
            try {
                await testTree.rename(ussNode);
                // tslint:disable-next-line:no-empty
            } catch (err) {
            }
            expect(showErrorMessage.mock.calls.length).toBe(1);
        });
        it("should execute rename favorite USS file", async () => {
            resetMocks();
            showInputBox.mockReturnValueOnce("new name");
            await testTree.rename(ussFavNode);
            expect(showErrorMessage.mock.calls.length).toBe(0);
            expect(renameUSSFile.mock.calls.length).toBe(1);
            expect(removeFavorite.mock.calls.length).toBe(1);
            expect(addFavorite.mock.calls.length).toBe(1);
        });
    });
});

/*************************************************************************************************************
 * Testing openItemFromPath
 *************************************************************************************************************/
describe("openItemFromPath tests", () => {
    const session = new Session({
        user: "fake",
        password: "fake",
        hostname: "fake",
        port: 443,
        protocol: "https",
        type: "basic",
    });

    const profileOne: IProfileLoaded = {
        name: "aProfile",
        profile: {
            user:undefined,
            password: undefined
        },
        type: "zosmf",
        message: "",
        failNotFound: false
    };

    const testTree = new USSTree();
    const sessionNode = new ZoweUSSNode("ussTestSess", vscode.TreeItemCollapsibleState.Collapsed, null, session,
        null, false, profileOne.name, undefined);
    const file = new ZoweUSSNode("c.txt", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null, "/a/b");

    beforeEach(async () => {
        sessionNode.children = [file];
        testTree.mSessionNodes = [sessionNode];
    });

    it("Should open a USS file in the tree", async () => {
        spyOn(sessionNode, "getChildren").and.returnValue(Promise.resolve([file]));

        await testTree.openItemFromPath("/a/b/c.txt", sessionNode);

        expect(testTree.getHistory().includes("[aProfile]: /a/b/c.txt")).toBe(true);
    });

    it("Should fail because the child no longer exists", async () => {
        spyOn(sessionNode, "getChildren").and.returnValue(Promise.resolve([]));
        const recallSpy = jest.spyOn(testTree, "removeRecall");

        await testTree.openItemFromPath("/d.txt", sessionNode);

        expect(recallSpy).toBeCalledWith("[aProfile]: /d.txt");
    });
});
