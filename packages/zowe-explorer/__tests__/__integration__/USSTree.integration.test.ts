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

import * as zosmf from "@zowe/zosmf-for-zowe-sdk";
import { imperative } from "@zowe/zowe-explorer-api";
import * as chai from "chai";
import * as sinon from "sinon";
import * as chaiAsPromised from "chai-as-promised";
import * as expect from "expect";
import * as vscode from "vscode";
import * as testConst from "../../resources/testProfileData";
import { USSTree } from "../../src/uss/USSTree";
import { ZoweUSSNode } from "../../src/uss/ZoweUSSNode";
import * as globals from "../../src/globals";

declare let it: any;

const testProfile: imperative.IProfileLoaded = {
    name: testConst.profile.name,
    profile: testConst.profile,
    type: testConst.profile.type,
    message: "",
    failNotFound: false,
};

describe("USSTree Integration Tests", async () => {
    const TIMEOUT = 120000;
    chai.use(chaiAsPromised);

    // Uses loaded profile to create a zosmf session with Zowe
    const cmdArgs: imperative.ICommandArguments = {
        $0: "zowe",
        _: [""],
        host: testProfile.profile.host,
        port: testProfile.profile.port,
        basePath: testProfile.profile.basePath,
        rejectUnauthorized: testProfile.profile.rejectUnauthorized,
        user: testProfile.profile.user,
        password: testProfile.profile.password,
    };
    const sessCfg = zosmf.ZosmfSession.createSessCfgFromArgs(cmdArgs);
    imperative.ConnectionPropsForSessCfg.resolveSessCfgProps(sessCfg, cmdArgs);
    const session = new imperative.Session(sessCfg);
    const sessNode = new ZoweUSSNode({
        label: testConst.profile.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        session,
        profile: testConst.profile.profile,
    });
    sessNode.contextValue = globals.USS_SESSION_CONTEXT;
    const path = testConst.ussPattern;
    sessNode.fullPath = path;
    const testTree = new USSTree();
    testTree.mSessionNodes.splice(-1, 0, sessNode);
    let sandbox;

    beforeEach(async function () {
        this.timeout(TIMEOUT);
        sandbox = sinon.createSandbox();
    });

    afterEach(async function () {
        this.timeout(TIMEOUT);
        sandbox.restore();
    });

    const oldSettings = vscode.workspace.getConfiguration(Constants.Settings.USS_HISTORY);

    after(async () => {
        await vscode.workspace.getConfiguration().update(Constants.Settings.USS_HISTORY, oldSettings, vscode.ConfigurationTarget.Global);
    });

    /*************************************************************************************************************
     * Creates a USSTree and checks that its members are all initialized by the constructor
     *************************************************************************************************************/
    it("Tests that the directory tree is defined", async () => {
        expect(testTree.mOnDidChangeTreeData).toBeDefined();
        expect(testTree.mSessionNodes).toBeDefined();
    });

    /*************************************************************************************************************
     * Calls getTreeItem with sample element and checks the return is vscode.TreeItem
     *************************************************************************************************************/
    it("Tests the getTreeItem method", async () => {
        const sampleElement = new ZoweUSSNode({ label: "testValue", collapsibleState: vscode.TreeItemCollapsibleState.None });
        chai.expect(testTree.getTreeItem(sampleElement)).to.be.instanceOf(vscode.TreeItem);
    });
    /*************************************************************************************************************
     * Creates sample list of ZoweUSSNodes and checks that USS
     * Tree.getChildren() returns correct array of children
     *************************************************************************************************************/
    it("Tests that getChildren returns valid list of elements", async () => {
        // Waiting until we populate rootChildren with what getChildren returns
        const rootChildren = await testTree.getChildren();
        rootChildren[0].dirty = true;
        const sessChildren1 = await testTree.getChildren(rootChildren[0]);
        sessChildren1[3].dirty = true;
        const sessChildren2 = await testTree.getChildren(sessChildren1[3]);
        sessChildren2[2].dirty = true;
        const dirChildren = await testTree.getChildren(sessChildren2[2]);

        const sampleRChildren: ZoweUSSNode[] = [
            new ZoweUSSNode({ label: path + "/group/aDir3", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, parentNode: sessNode }),
            new ZoweUSSNode({ label: path + "/group/aDir4", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, parentNode: sessNode }),
            new ZoweUSSNode({ label: path + "/group/aDir5", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, parentNode: sessNode }),
            new ZoweUSSNode({ label: path + "/group/aDir6", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, parentNode: sessNode }),
        ];

        sampleRChildren[0].command = {
            command: "zowe.uss.ZoweUSSNode.open",
            title: "",
            arguments: [sampleRChildren[0]],
        };
        sampleRChildren[3].command = {
            command: "zowe.uss.ZoweUSSNode.open",
            title: "",
            arguments: [sampleRChildren[3]],
        };

        const samplePChildren: ZoweUSSNode[] = [
            new ZoweUSSNode({ label: "/aFile4.txt", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sampleRChildren[2] }),
            new ZoweUSSNode({ label: "/aFile5.txt", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sampleRChildren[2] }),
        ];

        samplePChildren[0].command = {
            command: "zowe.uss.ZoweUSSNode.open",
            title: "",
            arguments: [samplePChildren[0]],
        };
        samplePChildren[1].command = {
            command: "zowe.uss.ZoweUSSNode.open",
            title: "",
            arguments: [samplePChildren[1]],
        };
        sampleRChildren[2].children = samplePChildren;

        // Checking that the rootChildren are what they are expected to be
        expect(rootChildren).toEqual(testTree.mSessionNodes);
        expect(sessChildren2.length).toEqual(sampleRChildren.length);
        expect(dirChildren.length).toBe(2);
        expect(dirChildren[0].label).toBe("aFile4.txt");
        expect(dirChildren[0].getParent().tooltip).toContain("/group/aDir5");
        expect(dirChildren[0].tooltip).toContain("/group/aDir5/aFile4.txt");
        expect(dirChildren[1].label).toBe("aFile5.txt");
        expect(dirChildren[1].tooltip).toContain("/group/aDir5/aFile5.txt");
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Testing refresh
     *************************************************************************************************************/
    it("Tests refresh", async () => {
        let eventFired = false;

        const listener = () => {
            eventFired = true;
        };

        // start listening
        const subscription = testTree.mOnDidChangeTreeData.event(listener);
        await testTree.refresh();

        expect(eventFired).toBe(true);

        subscription.dispose(); // stop listening
    }).timeout(TIMEOUT);

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
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Creates a child with a rootNode as parent and checks that a getParent() call returns null.
     * Also creates a child with a non-rootNode parent and checks that getParent() returns the correct ZoweUSSNode
     *************************************************************************************************************/
    it("Tests that getParent returns the correct ZoweUSSNode when called on a non-rootNode ZoweUSSNode", async () => {
        // Creating structure of files and folders under profile
        const sampleChild1: ZoweUSSNode = new ZoweUSSNode({
            label: path + "/aDir5",
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            parentNode: sessNode,
        });

        const parent1 = testTree.getParent(sampleChild1);

        // It's expected that parent is null because when getParent() is called on a child
        // of the rootNode, it should return null
        expect(parent1).toBe(sessNode);

        const sampleChild2: ZoweUSSNode = new ZoweUSSNode({
            label: path + "/aDir5/aFile4.txt",
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            parentNode: sampleChild1,
        });
        const parent2 = testTree.getParent(sampleChild2);

        expect(parent2).toBe(sampleChild1);
    });

    /*************************************************************************************************************
     * Tests the deleteSession() function
     *************************************************************************************************************/
    it("Tests the deleteSession() function", async () => {
        const len = testTree.mSessionNodes.length;
        testTree.deleteSession(sessNode);
        expect(testTree.mSessionNodes.length).toEqual(len - 1);
    });

    /*************************************************************************************************************
     * Tests the deleteSession() function
     *************************************************************************************************************/
    it("Tests the addSession() function by adding a default, deleting, then adding a passed session", async () => {
        let len = testTree.mSessionNodes.length;
        await testTree.addSession();
        expect(testTree.mSessionNodes.length).toBeGreaterThanOrEqual(len + 1);
        len = testTree.mSessionNodes.length;
        const testNode = testTree.mSessionNodes[len - 1];
        testTree.deleteSession(testNode);
        len--;
        expect(testTree.mSessionNodes.length).toEqual(len);
        await testTree.addSession(testNode.label as string);
        expect(testTree.mSessionNodes.length).toEqual(len + 1);
    }).timeout(TIMEOUT);

    describe("add USS Favorite for a file and a search", () => {
        beforeEach(() => {
            const favProfileNode = new ZoweUSSNode({
                label: testConst.profile.name,
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                session,
            });
            favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
            testTree.mFavorites.push(favProfileNode);
        });
        afterEach(() => {
            testTree.mFavorites = [];
        });
        it("should add the selected file to the treeView", async () => {
            const favoriteNode = new ZoweUSSNode({
                label: "file.txt",
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                parentNode: sessNode,
                profile: testConst.profile.profile,
                parentPath: sessNode.fullPath,
            });
            await testTree.addFavorite(favoriteNode);
            const filtered = testTree.mFavorites[0].children.filter((temp) => temp.label === `${favoriteNode.label}`);
            expect(filtered.length).toEqual(1);
            expect(filtered[0].label).toContain("file.txt");
        }).timeout(TIMEOUT);

        it("should add a favorite search", async () => {
            await testTree.addFavorite(sessNode);
            const filtered = testTree.mFavorites[0].children.filter((temp) => temp.label === `${sessNode.fullPath}`);
            expect(filtered.length).toEqual(1);
            expect(filtered[0].label).toContain(`${sessNode.fullPath}`);
        }).timeout(TIMEOUT);
    });
});
