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
import * as chaiAsPromised from "chai-as-promised";
import * as expect from "expect";
import * as vscode from "vscode";
import { ZoweDatasetNode } from "../../src/dataset/ZoweDatasetNode";
import * as testConst from "../../resources/testProfileData";
import { DS_SESSION_CONTEXT, DS_PDS_CONTEXT } from "../../src/globals";

declare let it: any;

const testProfile: imperative.IProfileLoaded = {
    name: testConst.profile.name,
    profile: testConst.profile,
    type: testConst.profile.type,
    message: "",
    failNotFound: false,
};

describe("ZoweNode Integration Tests", async () => {
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
    const sessNode = new ZoweDatasetNode({
        label: testConst.profile.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        session,
        profile: testProfile,
    });
    sessNode.contextValue = DS_SESSION_CONTEXT;
    sessNode.dirty = true;
    const pattern = testConst.normalPattern.toUpperCase();
    sessNode.pattern = pattern + ".PUBLIC";

    /*************************************************************************************************************
     * Creates an ZoweDatasetNode and checks that its members are all initialized by the constructor
     *************************************************************************************************************/
    it("Testing that the ZoweDatasetNode is defined", async () => {
        // Tests empty PO node
        const emptyPONode = new ZoweDatasetNode({
            label: pattern + ".TCLASSIC",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            parentNode: sessNode,
        });

        expect(emptyPONode.label).toBeDefined();
        expect(emptyPONode.collapsibleState).toBeDefined();
        expect(emptyPONode.getParent()).toBeDefined();

        // Tests PS node
        const PSNode = new ZoweDatasetNode({ label: pattern + ".TPS", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode });

        expect(PSNode.label).toBeDefined();
        expect(PSNode.collapsibleState).toBeDefined();
        expect(PSNode.getParent()).toBeDefined();
    });

    /*************************************************************************************************************
     * Checks that the ZoweDatasetNode constructor works as expected when the label parameter is the empty string
     *************************************************************************************************************/
    it("Testing that the ZoweDatasetNode constructor works as expected when the label parameter is the empty string", async () => {
        // The ZoweDatasetNode should still be constructed, and should not throw an error.
        const edgeNode = new ZoweDatasetNode({ label: "", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode });

        expect(edgeNode.label).toBeDefined();
        expect(edgeNode.collapsibleState).toBeDefined();
        expect(edgeNode.getParent()).toBeDefined();
    });

    /*************************************************************************************************************
     * Creates sample ZoweDatasetNode list and checks that getChildren() returns the correct array
     *************************************************************************************************************/
    it("Testing that getChildren returns the correct Thenable<ZoweDatasetNode[]>", async () => {
        const sessChildren = await sessNode.getChildren();

        // Creating structure of files and folders under BRTVS99 profile
        const sampleChildren: ZoweDatasetNode[] = [
            new ZoweDatasetNode({ label: pattern + ".PUBLIC.BIN", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode }),
            new ZoweDatasetNode({
                label: pattern + ".PUBLIC.TCLASSIC",
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                parentNode: sessNode,
            }),
            new ZoweDatasetNode({
                label: pattern + ".PUBLIC.TPDS",
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                parentNode: sessNode,
            }),
            new ZoweDatasetNode({ label: pattern + ".PUBLIC.TPS", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode }),
        ];

        // Checking that the rootChildren are what they are expected to be
        expect(sessChildren).toEqual(sampleChildren);
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Checks that getChildren() returns the expected value when passed an ZoweDatasetNode with all null parameters
     *************************************************************************************************************/
    it("Testing that getChildren works as expected on the null value", async () => {
        const expectChai = chai.expect;
        chai.use(chaiAsPromised);

        // The method should throw an error.
        const nullNode = new ZoweDatasetNode({ label: "", collapsibleState: vscode.TreeItemCollapsibleState.None, contextOverride: DS_PDS_CONTEXT });
        nullNode.dirty = true;
        await expectChai(nullNode.getChildren()).to.eventually.be.rejectedWith("Invalid node");
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Checks that getChildren() returns the expected value when passed an ZoweDatasetNode with all undefined parameters
     *************************************************************************************************************/
    it("Testing that getChildren works as expected on an undefined value", async () => {
        const expectChai = chai.expect;
        chai.use(chaiAsPromised);

        // The method should throw an error.
        const undefinedNode = new ZoweDatasetNode({
            label: "",
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextOverride: DS_PDS_CONTEXT,
        });
        undefinedNode.dirty = true;
        await expectChai(undefinedNode.getChildren()).to.eventually.be.rejectedWith("Invalid node");
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Checks that getChildren() returns the expected value when passed a PS node
     *************************************************************************************************************/
    it("Testing that getChildren works as expected on a PS node", async () => {
        // The method should return an empty array.
        const PSNode = new ZoweDatasetNode({ label: pattern + ".TPS", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode });
        const PSNodeChildren = await PSNode.getChildren();

        expect(PSNodeChildren).toEqual([]);
    }).timeout(TIMEOUT);

    /*************************************************************************************************************
     * Checks that getSession() returns the expected value
     *************************************************************************************************************/
    it("Testing that getSession() works as expected", async () => {
        const PDSNode = new ZoweDatasetNode({
            label: pattern + ".TPDS",
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            parentNode: sessNode,
        });
        const PSNode = new ZoweDatasetNode({ label: pattern + ".TPS", collapsibleState: vscode.TreeItemCollapsibleState.None, parentNode: sessNode });
        const MemNode = new ZoweDatasetNode({
            label: pattern + ".TPDS(TCHILD1)",
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            parentNode: PDSNode,
        });

        expect(sessNode.getSession()).toEqual(session);
        expect(PDSNode.getSession()).toEqual(session);
        expect(PSNode.getSession()).toEqual(session);
        expect(MemNode.getSession()).toEqual(session);
    }).timeout(TIMEOUT);
});
