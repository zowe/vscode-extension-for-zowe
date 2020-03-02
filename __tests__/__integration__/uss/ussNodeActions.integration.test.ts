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

// tslint:disable:no-magic-numbers
import * as zowe from "@zowe/cli";
import { Logger, IProfileLoaded } from "@zowe/imperative";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as testConst from "../../../resources/testProfileData";
import * as vscode from "vscode";
import { USSTree } from "../../../src/USSTree";
import { ZoweUSSNode } from "../../../src/ZoweUSSNode";
import * as extension from "../../../src/extension";
import { renameUSSNode } from "../../../src/uss/ussNodeActions";

const TIMEOUT = 45000;
declare var it: Mocha.ITestDefinition;
// declare var describe: any;

const testProfile: IProfileLoaded = {
    name: testConst.profile.name,
    profile: testConst.profile,
    type: testConst.profile.type,
    message: "",
    failNotFound: false
};

describe("ussNodeActions integration test", async () => {
    const expect = chai.expect;
    chai.use(chaiAsPromised);

    const session = zowe.ZosmfSession.createBasicZosmfSession(testConst.profile);
    const sessionNode = new ZoweUSSNode(testConst.profile.name, vscode.TreeItemCollapsibleState.Expanded,
        null, session, null, false, testProfile.name);
    sessionNode.contextValue = extension.DS_SESSION_CONTEXT;
    const testTree = new USSTree();
    testTree.mSessionNodes.push(sessionNode);

    let sandbox;

    beforeEach(async function() {
        this.timeout(TIMEOUT);
        sandbox = sinon.createSandbox();
    });

    afterEach(async function() {
        this.timeout(TIMEOUT);
        sandbox.restore();
    });

    const oldSettings = vscode.workspace.getConfiguration("Zowe-USS-Persistent");

    after(async () => {
        await vscode.workspace.getConfiguration().update("Zowe-USS-Persistent", oldSettings, vscode.ConfigurationTarget.Global);
    });

    describe("Initialize USS Favorites", async () => {
        it("should show an error message and still load other valid-profile favorites when given a favorite with invalid profile name", async () => {
            const profileName = testConst.profile.name;
            // Reset testTree's favorites to be empty
            testTree.mFavorites = [];
            // Then, update
            const favorites = [`[${profileName}]: /u/tester1{directory}`,
                `[${profileName}]: /u/tester1/testfile1{textfile}`,
                `['badProfileName']: /u/tester1{directory}`,
                `[${profileName}]: /u/tester2{directory}`,
                `[${profileName}]: /u/tester2/testfile2{textfile}`];
            await vscode.workspace.getConfiguration().update("Zowe-USS-Persistent",
                {persistence: true, favorites}, vscode.ConfigurationTarget.Global);
            const showErrorStub = sandbox.spy(vscode.window, "showErrorMessage");
            await testTree.initialize(Logger.getAppLogger());
            const ussFavoritesArray = [`[${profileName}]: tester1`,
                `[${profileName}]: testfile1`,
                `[${profileName}]: tester2`,
                `[${profileName}]: testfile2`];
            const gotCalledOnce = showErrorStub.calledOnce;
            expect(testTree.mFavorites.map((node) => node.label)).to.deep.equal(ussFavoritesArray);
            expect(gotCalledOnce).to.equal(true);
        }).timeout(TIMEOUT);
    });
    describe("Rename USS File", async () => {
        const path = testConst.ussPattern;
        const beforeFileName = `${path}/filetest1`;
        const afterFileName = `${path}/filetest1rename`;

        afterEach(async () => {
            await Promise.all([
                zowe.Delete.ussFile(sessionNode.getSession(), beforeFileName),
                zowe.Delete.ussFile(sessionNode.getSession(), afterFileName),
            ].map((p) => p.catch((err) => err)));
        });
        beforeEach(async () => {
            await zowe.Create.uss(
                sessionNode.getSession(),
                beforeFileName,
                "file"
            ).catch((err) => err);
        });

        it("should rename a uss file", async () => {
            let error;
            let list;
            const beforeNameBase = beforeFileName.split("/").pop();
            const afterNameBase = afterFileName.split("/").pop();

            try {
                const testFolder = new ZoweUSSNode(path, vscode.TreeItemCollapsibleState.Expanded,
                    sessionNode, session, null, false, testProfile.name);
                const testNode = new ZoweUSSNode(beforeNameBase, vscode.TreeItemCollapsibleState.None,
                    testFolder, session, testFolder.label, false, testProfile.name);
                const inputBoxStub = sandbox.stub(vscode.window, "showInputBox");
                inputBoxStub.returns(afterNameBase);

                await renameUSSNode(testNode, testTree, testNode.getUSSDocumentFilePath());
                list = await zowe.List.fileList(sessionNode.getSession(), path);
                list = list.apiResponse.items ? list.apiResponse.items.map((entry) => entry.name) : [];
            } catch (err) {
                error = err;
            }

            expect(error).to.be.equal(undefined);
            expect(list).not.to.contain(beforeNameBase);
            expect(list).to.contain(afterNameBase);
        }).timeout(TIMEOUT);
    });
});
