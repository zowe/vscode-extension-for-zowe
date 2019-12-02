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

jest.mock("vscode");
jest.mock("fs");
jest.mock("Session");
jest.mock("@brightside/core");
jest.mock("@brightside/imperative");
jest.mock("../../src/Profiles");
import * as vscode from "vscode";
import { DatasetTree } from "../../src/DatasetTree";
import { ZoweNode } from "../../src/ZoweNode";
import { Session, Logger } from "@brightside/imperative";
import * as zowe from "@brightside/core";
import * as utils from "../../src/utils";
import { Profiles } from "../../src/Profiles";
import * as extension from "../../src/extension";

describe("DatasetTree Unit Tests", () => {

    const session = new Session({
        user: "fake",
        password: "fake",
        hostname: "fake",
        port: 443,
        protocol: "https",
        type: "basic",
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

    // Filter prompt
    const showInformationMessage = jest.fn();
    const showInputBox = jest.fn();
    const showQuickPick = jest.fn();
    const filters = jest.fn();
    const getFilters = jest.fn();
    const createQuickPick = jest.fn();
    Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
    Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
    Object.defineProperty(vscode.window, "showQuickPick", {value: showQuickPick});
    Object.defineProperty(vscode.window, "showInputBox", {value: showInputBox});
    Object.defineProperty(filters, "getFilters", { value: getFilters });
    Object.defineProperty(vscode.window, "createQuickPick", {value: createQuickPick});
    Object.defineProperty(vscode, "ProgressLocation", {value: ProgressLocation});
    Object.defineProperty(vscode.window, "withProgress", {value: withProgress});
    getFilters.mockReturnValue(["HLQ", "HLQ.PROD1"]);
    const getConfiguration = jest.fn();
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: getConfiguration });
    getConfiguration.mockReturnValue({
        persistence: true,
        get: (setting: string) => [
            "[test]: brtvs99.public1.test{pds}",
            "[test]: brtvs99.test{ds}",
            "[test]: brtvs99.fail{fail}",
            "[test]: brtvs99.test.search{session}",
        ],
        update: jest.fn(()=>{
            return {};
        })
    });
    const enums = jest.fn().mockImplementation(() => {
        return {
            Global: 1,
            Workspace: 2,
            WorkspaceFolder: 3
        };
    });
    Object.defineProperty(vscode, "ConfigurationTarget", {value: enums});
    const mockLoadNamedProfile = jest.fn();
    mockLoadNamedProfile.mockReturnValue({name:"aProfile", profile: {name:"aProfile", type:"zosmf", profile:{name:"aProfile", type:"zosmf"}}});
    Object.defineProperty(Profiles, "getInstance", {
        value: jest.fn(() => {
            return {
                allProfiles: [{name: "firstName"}, {name: "secondName"}],
                defaultProfile: {name: "firstName"},
                loadNamedProfile: mockLoadNamedProfile
            };
        })
    });
    Profiles.createInstance(Logger.getAppLogger());
    const testTree = new DatasetTree();
    testTree.mSessionNodes.push(new ZoweNode("testSess", vscode.TreeItemCollapsibleState.Collapsed, null, session));
    testTree.mSessionNodes[1].contextValue = extension.DS_SESSION_CONTEXT;
    testTree.mSessionNodes[1].pattern = "test";
    testTree.mSessionNodes[1].iconPath = utils.applyIcons(testTree.mSessionNodes[1]);

    afterAll(() => {
        jest.restoreAllMocks();
    });
    afterEach(async () => {
        getConfiguration.mockClear();
    });

    /*************************************************************************************************************
     * Creates a datasetTree and checks that its members are all initialized by the constructor
     *************************************************************************************************************/
    it("Testing that the dataset tree is defined", async () => {
        expect(testTree.mSessionNodes).toBeDefined();
    });

    /*************************************************************************************************************
     * Calls getTreeItem with sample element and checks the return is vscode.TreeItem
     *************************************************************************************************************/
    it("Testing the getTreeItem method", async () => {
        const sampleElement = new ZoweNode("BRTVS99", vscode.TreeItemCollapsibleState.None,
            null, null);
        expect(testTree.getTreeItem(sampleElement)).toBeInstanceOf(vscode.TreeItem);
    });

    /*************************************************************************************************************
     * Creates sample list of ZoweNodes and checks that datasetTree.getChildren() returns correct array of children
     *************************************************************************************************************/
    it("Tests that getChildren returns valid list of elements", async () => {
        // Waiting until we populate rootChildren with what getChildren return
        const rootChildren = await testTree.getChildren();

        // Creating a rootNode
        const sessNode = [
            new ZoweNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, null, null),
            new ZoweNode("testSess", vscode.TreeItemCollapsibleState.Collapsed, null, session),
        ];
        sessNode[0].contextValue = extension.FAVORITE_CONTEXT;
        sessNode[1].contextValue = extension.DS_SESSION_CONTEXT;
        sessNode[1].pattern = "test";
        sessNode[0].iconPath = utils.applyIcons(sessNode[0]);
        sessNode[1].iconPath = utils.applyIcons(sessNode[1]);

        // Checking that the rootChildren are what they are expected to be
        expect(sessNode[0]).toMatchObject(rootChildren[0]);
        expect(sessNode[1].children).toMatchObject(rootChildren[1].children);
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
     * Also creates a child with a non-rootNode parent and checks that getParent() returns the correct ZoweNode
     *************************************************************************************************************/
    it("Tests that getParent returns the correct ZoweNode when called on a non-rootNode ZoweNode", async () => {
        // Creating fake datasets and dataset members to test
        const sampleChild1: ZoweNode = new ZoweNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[0], session);
        const parent1 = testTree.getParent(sampleChild1);

        // Creating fake datasets and dataset members to test
        const sampleChild2: ZoweNode = new ZoweNode("BRTVS99.PUBLIC.TEST", vscode.TreeItemCollapsibleState.None,
            sampleChild1, null);
        const parent2 = testTree.getParent(sampleChild2);

        // The first expect expected that parent is null because when getParent() is called on a child
        // of the rootNode, it should return null
        expect(testTree.getParent(testTree.mSessionNodes[0])).toBe(null);
        expect(parent1).toBe(testTree.mSessionNodes[0]);
        expect(parent2).toBe(sampleChild1);

    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweNodes when called and passed an element of type ZoweNode<session>", async () => {

        testTree.mSessionNodes[1].dirty = true;
        // Waiting until we populate rootChildren with what getChildren return
        const sessChildren = await testTree.getChildren(testTree.mSessionNodes[1]);
        // Creating fake datasets and dataset members to test
        const sampleChildren: ZoweNode[] = [
            new ZoweNode("BRTVS99", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], null),
            new ZoweNode("BRTVS99.CA10", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[1], null, extension.DS_MIGRATED_FILE_CONTEXT),
            new ZoweNode("BRTVS99.CA11.SPFTEMP0.CNTL", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null),
            new ZoweNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null),
        ];

        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };

        // Checking that the rootChildren are what they are expected to be
        expect(sessChildren).toEqual(sampleChildren);
    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweNodes when called and passed an element of type ZoweNode<favorite>", async () => {

        // Waiting until we populate rootChildren with what getChildren return
        testTree.mFavorites.push(new ZoweNode("BRTVS99", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[0], null));
        const favChildren = await testTree.getChildren(testTree.mSessionNodes[0]);
        // Creating fake datasets and dataset members to test
        const sampleChildren: ZoweNode[] = [
            new ZoweNode("BRTVS99", vscode.TreeItemCollapsibleState.None, testTree.mSessionNodes[0], null)
        ];

        // Checking that the rootChildren are what they are expected to be
        expect(favChildren).toEqual(sampleChildren);
    });

    /*************************************************************************************************************
     * Tests that getChildren() method returns an array of all child nodes of passed ZoweNode
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct ZoweNodes when called and passed an element of type ZoweNode<pds>", async () => {
        const pds = new ZoweNode("BRTVS99.PUBLIC", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null);
        pds.dirty = true;
        // Waiting until we populate rootChildren with what getChildren return
        const pdsChildren = await testTree.getChildren(pds);
        // Creating fake datasets and dataset members to test
        const sampleChildren: ZoweNode[] = [
            new ZoweNode("BRTVS99", vscode.TreeItemCollapsibleState.None, pds, null),
            new ZoweNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.None, pds, null),
        ];

        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };
        sampleChildren[1].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[1]] };

        // Checking that the rootChildren are what they are expected to be
        expect(pdsChildren).toEqual(sampleChildren);
    });

    /*************************************************************************************************************
     * Tests that the DatasetTree refresh function exists and doesn't error
     *************************************************************************************************************/
    it("Calling the refresh button ", async () => {
        await testTree.refresh();
    });

    /*************************************************************************************************************
     * Test the addSession command
     *************************************************************************************************************/
    it("Test the addSession command ", async () => {
        const log = new Logger(undefined);

        testTree.addSession();

        testTree.addSession("fake");
    });

    /*************************************************************************************************************
     * Testing that addFavorite works properly
     *************************************************************************************************************/
    it("Testing that addFavorite works properly", async () => {
        testTree.mFavorites = [];
        const parent = new ZoweNode("Parent", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null);
        const member = new ZoweNode("Child", vscode.TreeItemCollapsibleState.None,
            parent, null);

        getConfiguration.mockReturnValue({
            persistence: true,
            get: (setting: string) => [
                "[test]: brtvs99.public.test{pds}",
                "[test]: brtvs99.test{ds}",
                "[test]: brtvs99.fail{fail}",
                "[test]: brtvs99.test.search{session}",
            ],
            update: jest.fn(()=>{
                return {};
            })
        });

        await testTree.addFavorite(member);

        // Check adding duplicates
        const pds = new ZoweNode("Parent", vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1], null);

        await testTree.addFavorite(pds);

        // Check adding ps
        const ps = new ZoweNode("Dataset", vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1], null);

        testTree.addFavorite(ps);

        expect(testTree.mFavorites.length).toEqual(2);

        // Check adding a session
        testTree.addFavorite(testTree.mSessionNodes[1]);

        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(3);

        // Test adding member already present
        parent.contextValue = extension.DS_PDS_CONTEXT + extension.FAV_SUFFIX;
        member.contextValue = extension.DS_MEMBER_CONTEXT;
        await testTree.addFavorite(member);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("PDS already in favorites");

        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(3);

        testTree.mSessionNodes[1].pattern = "aHLQ";
        await testTree.addFavorite(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(4);

        testTree.mSessionNodes[1].pattern = "zHLQ";
        await testTree.addFavorite(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(5);

        testTree.mSessionNodes[1].pattern = "rHLQ";
        await testTree.addFavorite(testTree.mSessionNodes[1]);
        // tslint:disable-next-line: no-magic-numbers
        expect(testTree.mFavorites.length).toEqual(6);

        /*************************************************************************************************************
        * Testing that removeFavorite works properly
        *************************************************************************************************************/
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);
        testTree.removeFavorite(testTree.mFavorites[0]);
        expect(testTree.mFavorites).toEqual([]);

    });

    /*************************************************************************************************************
     * Testing that deleteSession works properly
     *************************************************************************************************************/
    it("Testing that deleteSession works properly", async () => {
        const startLength = testTree.mSessionNodes.length;
        testTree.mSessionNodes.push(new ZoweNode("testSess2", vscode.TreeItemCollapsibleState.Collapsed, null, session));
        testTree.addSession("testSess2");
        testTree.mSessionNodes[startLength].contextValue = extension.DS_SESSION_CONTEXT;
        testTree.mSessionNodes[startLength].pattern = "test";
        testTree.mSessionNodes[startLength].iconPath = utils.applyIcons(testTree.mSessionNodes[1]);
        testTree.deleteSession(testTree.mSessionNodes[startLength]);
        expect(testTree.mSessionNodes.length).toEqual(startLength);
    });


    /*************************************************************************************************************
     * Testing that expand tree is executed successfully
     *************************************************************************************************************/
    it("Testing that expand tree is executed successfully", async () => {
        const refresh = jest.fn();
        Object.defineProperty(testTree, "refresh", {value: refresh});
        refresh.mockReset();
        const pds = new ZoweNode("BRTVS99.PUBLIC", vscode.TreeItemCollapsibleState.Collapsed, testTree.mSessionNodes[1], null);
        await testTree.flipState(pds, true);
        expect(JSON.stringify(pds.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(pds, false);
        expect(JSON.stringify(pds.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(pds, true);
        expect(JSON.stringify(pds.iconPath)).toContain("folder-open.svg");
    });

     /*************************************************************************************************************
     * Dataset Filter prompts
     *************************************************************************************************************/
    it("Testing that user filter prompts are executed successfully, theia route", async () => {
        let theia = true;
        Object.defineProperty(extension, "ISTHEIA", { get: () => theia });
        testTree.initialize(Logger.getAppLogger());
        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce("\uFF0B " + "Create a new filter");
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce("HLQ.PROD1.STUFF");

        // Assert choosing the new filter specification followed by a path
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].contextValue).toEqual(extension.DS_SESSION_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");

        // Assert edge condition user cancels the input path box
        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce("\uFF0B " + "Create a new filter");
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce(undefined);
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a pattern.");

        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce(new utils.FilterDescriptor("HLQ.PROD2.STUFF"));
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD2.STUFF");

        // Assert edge condition user cancels the quick pick
        showInformationMessage.mockReset();
        showQuickPick.mockReset();
        showQuickPick.mockReturnValueOnce(undefined);
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
        theia = false;
    });

    it("Testing that user filter prompts are executed successfully for favorites", async () => {
        // Executing from favorites
        const favoriteSearch = new ZoweNode("[aProfile]: HLQ.PROD1.STUFF",
        vscode.TreeItemCollapsibleState.None, testTree.mFavoriteSession, null);
        favoriteSearch.contextValue = extension.DS_SESSION_CONTEXT + extension.FAV_SUFFIX;
        const checkSession = jest.spyOn(testTree, "addSession");
        expect(checkSession).not.toHaveBeenCalled();
        await testTree.datasetFilterPrompt(favoriteSearch);
        expect(checkSession).toHaveBeenCalledTimes(1);
        expect(checkSession).toHaveBeenLastCalledWith("aProfile");
    });

    it("Testing that user filter prompts are executed successfully, VSCode route", async () => {
        testTree.initialize(Logger.getAppLogger());
        let qpItem: vscode.QuickPickItem = new utils.FilterDescriptor("\uFF0B " + "Create a new filter");
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
        showInputBox.mockReturnValueOnce("HARRY.PROD");
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HARRY.PROD");

        // User cancels out of input field
        showInformationMessage.mockReset();
        showInputBox.mockReset();
        showInputBox.mockReturnValueOnce(undefined);
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a pattern.");

        // User enters a value in the QuickPick and presses create new
        entered = "HLQ.PROD1.STUFF";
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
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].contextValue).toEqual(extension.DS_SESSION_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");

        showQuickPick.mockReset();
        qpItem = new utils.FilterItem("HLQ.PROD2.STUFF");
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
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD2.STUFF");

        // Assert edge condition user cancels from the quick pick
        showInformationMessage.mockReset();
        qpItem = undefined;
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("No selection made.");
    });

    /*************************************************************************************************************
     * Testing the onDidConfiguration
     *************************************************************************************************************/
    it("Testing the onDidConfiguration", async () => {
        getConfiguration.mockReturnValue({
            get: (setting: string) => [
                "[test]: HLQ.PROD2{directory}",
                "[test]: HLQ.PROD2{textFile}",
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
        await testTree.onDidChangeConfiguration(e);
        expect(getConfiguration.mock.calls.length).toBe(2);
    });

    it("Should rename a favorited node", async () => {
        const sessionNode = testTree.mSessionNodes[1];
        const newLabel = "USER.NEW.LABEL";
        testTree.mFavorites = [];
        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);

        testTree.addFavorite(node);
        node.label = `[${sessionNode.label.trim()}]: ${node.label}`;
        testTree.renameFavorite(node, newLabel);

        expect(testTree.mFavorites.length).toEqual(1);
        expect(testTree.mFavorites[0].label).toBe(`[${sessionNode.label.trim()}]: ${newLabel}`);
    });

    it("Should rename a node", async () => {
        const sessionNode = testTree.mSessionNodes[1];
        const newLabel = "USER.NEW.LABEL";
        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);
        sessionNode.children.push(node);
        testTree.renameNode(sessionNode.label.trim(), "node", newLabel);

        expect(sessionNode.children[sessionNode.children.length-1].label).toBe(newLabel);
        sessionNode.children.pop();
    });

    it("tests the dataset filter prompt credentials", async () => {
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
        const sessNode = new ZoweNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session);
        sessNode.contextValue = extension.DS_SESSION_CONTEXT;
        const dsNode = new ZoweNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred);
        dsNode.contextValue = extension.DS_SESSION_CONTEXT;
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

        await testTree.datasetFilterPrompt(dsNode);

        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");

    });

    it("tests the dataset filter prompt credentials error", async () => {
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
        const sessNode = new ZoweNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session);
        sessNode.contextValue = extension.DS_SESSION_CONTEXT;
        const dsNode = new ZoweNode("testSess", vscode.TreeItemCollapsibleState.Expanded, sessNode, sessionwocred);
        dsNode.contextValue = extension.DS_SESSION_CONTEXT;
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "firstName", profile: {user:undefined, password: undefined}}, {name: "secondName"}],
                    defaultProfile: {name: "firstName"}
                };
            })
        });

        await testTree.datasetFilterPrompt(dsNode);

        expect(showInformationMessage.mock.calls[0][0]).toEqual("No selection made.");

    });

    it("Should find a favorited node", async () => {
        testTree.mFavorites = [];
        const sessionNode = testTree.mSessionNodes[1];
        const nonFavoritedNode = new ZoweNode("node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);
        const favoritedNode = new ZoweNode("[testSess]: node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);
        favoritedNode.contextValue = extension.DS_PDS_CONTEXT + extension.FAV_SUFFIX;

        testTree.mFavorites.push(favoritedNode);
        const foundNode = testTree.findFavoritedNode(nonFavoritedNode);

        expect(foundNode).toBe(favoritedNode);
        testTree.mFavorites.pop();
    });

    it("Should find a non-favorited node", async () => {
        const sessionNode = testTree.mSessionNodes[1];
        const nonFavoritedNode = new ZoweNode("node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);
        const favoritedNode = new ZoweNode("[testSess]: node", vscode.TreeItemCollapsibleState.Collapsed, sessionNode, null);

        sessionNode.children.push(nonFavoritedNode);

        const foundNode = testTree.findNonFavoritedNode(favoritedNode);

        expect(foundNode).toBe(nonFavoritedNode);
        sessionNode.children.pop();
    });
});
