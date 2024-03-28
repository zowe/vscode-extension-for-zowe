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
import * as sinon from "sinon";
import * as testConst from "../../../resources/testProfileData";
import * as vscode from "vscode";
import { ZosJobsProvider } from "../../../src/job/ZosJobsProvider";
import * as refreshActions from "../../../src/shared/refresh";
import { ZoweJobNode } from "../../../src/job/ZoweJobNode";
import * as globals from "../../../src/globals";
import { DatasetTree } from "../../../src/dataset/DatasetTree";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";

const TIMEOUT = 45000;
declare let it: Mocha.TestFunction;

describe("jobNodeActions integration test", async () => {
    const expect = chai.expect;
    chai.use(chaiAsPromised);

    const cmdArgs: imperative.ICommandArguments = {
        $0: "zowe",
        _: [""],
        host: testConst.profile.host,
        port: testConst.profile.port,
        basePath: testConst.profile.basePath,
        rejectUnauthorized: testConst.profile.rejectUnauthorized,
        user: testConst.profile.user,
        password: testConst.profile.password,
    };
    const sessCfg = zosmf.ZosmfSession.createSessCfgFromArgs(cmdArgs);
    imperative.ConnectionPropsForSessCfg.resolveSessCfgProps(sessCfg, cmdArgs);
    const session = new imperative.Session(sessCfg);
    const testProfileLoaded: imperative.IProfileLoaded = {
        name: testConst.profile.name,
        profile: testConst.profile,
        type: testConst.profile.type,
        message: "",
        failNotFound: false,
    };

    // Test Jobs session node & tree
    const jobSessionNode = new ZoweJobNode({ label: testConst.profile.name, collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, session });
    jobSessionNode.contextValue = globals.JOBS_SESSION_CONTEXT;
    const testJobsTree = new ZosJobsProvider();
    testJobsTree.mSessionNodes.push(jobSessionNode);

    // Test Dataset session node & tree
    const datasetSessionNode = new ZoweDatasetNode({
        label: testConst.profile.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        session,
        profile: testProfileLoaded,
    });
    datasetSessionNode.contextValue = globals.DS_SESSION_CONTEXT;
    const pattern = testConst.normalPattern.toUpperCase();
    datasetSessionNode.pattern = pattern;
    const testDatasetTree = new DatasetTree();
    testDatasetTree.mSessionNodes.push(datasetSessionNode);

    let sandbox;

    beforeEach(async function () {
        this.timeout(TIMEOUT);
        sandbox = sinon.createSandbox();
    });

    afterEach(async function () {
        this.timeout(TIMEOUT);
        sandbox.restore();
    });

    const oldSettings = vscode.workspace.getConfiguration(Constants.Settings.DS_HISTORY);

    after(async () => {
        await vscode.workspace.getConfiguration().update(Constants.Settings.DS_HISTORY, oldSettings, vscode.ConfigurationTarget.Global);
    });

    describe("refreshAll", async () => {
        it("It should call the refreshAll function on a Jobs tree", async () => {
            let eventFired = false;

            const listener = () => {
                eventFired = true;
            };

            const subscription = testJobsTree.mOnDidChangeTreeData.event(listener);
            await refreshActions.refreshAll(testJobsTree);

            expect(eventFired).equals(true);

            subscription.dispose();
        }).timeout(TIMEOUT);
    });

    describe("refreshAll", async () => {
        it("It should call the refreshAll function on a Dataset tree", async () => {
            let eventFired = false;

            const listener = () => {
                eventFired = true;
            };

            const subscription = testDatasetTree.mOnDidChangeTreeData.event(listener);
            await refreshActions.refreshAll(testDatasetTree);

            expect(eventFired).equals(true);

            subscription.dispose();
        }).timeout(TIMEOUT);
    });
});
