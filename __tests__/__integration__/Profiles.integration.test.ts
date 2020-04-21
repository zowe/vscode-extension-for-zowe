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

import * as sinon from "sinon";
import * as vscode from "vscode";
import { IProfileLoaded, IProfile } from "@zowe/imperative";
import { Profiles } from "../../src/Profiles";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

declare var it: Mocha.ITestDefinition;
const TIMEOUT = 45000;

describe("Create profiles integration tests", async () => {
    const expect = chai.expect;
    chai.use(chaiAsPromised);
    const profiles = Profiles.getInstance();
    let sandbox;
    const testProfile: IProfile = {
        type : "zosmf",
        host: "testHost",
        port: 1443,
        user: "testUser",
        password: "testPass",
        rejectUnauthorized: false,
        name: "testProfileIntegration" // @NOTE: This profile name must match an existing zowe profile in the ~/.zowe/profiles/zosmf folder
    };
    const testProfileLoaded: IProfileLoaded = {
        name: "testProfileIntegration",
        profile: testProfile,
        type: "zosmf",
        message: "",
        failNotFound: false
    };

    beforeEach(async function() {
        this.timeout(TIMEOUT);
        sandbox = sinon.createSandbox();
    });

    afterEach(async function() {
        this.timeout(TIMEOUT);
        sandbox.restore();
    });

    it ("Tests if profile is created successfully", async () => {
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns("https://testurl.com:1001");
        const showInputStub = sandbox.stub(vscode.window, "showInputBox");
        showInputStub.onCall(0).returns("testUser");
        showInputStub.onCall(1).returns("testPass");
        const showQuickPickStub = sandbox.stub(vscode.window, "showQuickPick");
        showQuickPickStub.returns("True - Reject connections with self-signed certificates");
        const saveProfileStub = sandbox.stub(profiles, "saveProfile");
        saveProfileStub.returns(testProfile);

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.deep.equal("testProfileIntegration");
    }).timeout(TIMEOUT);

    it ("Tests if operation is cancelled when URL input is empty", async () => {
        const showInfoSpy = sandbox.spy(vscode.window, "showInformationMessage");
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns(undefined);

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.equal(undefined);
        const messageSent = showInfoSpy.calledWith("No valid value for z/OSMF URL. Operation Cancelled");
        expect(messageSent).to.equal(true);
    }).timeout(TIMEOUT);

    it ("Tests if operation is cancelled when username input is empty", async () => {
        const showInfoSpy = sandbox.spy(vscode.window, "showInformationMessage");
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns("https://testurl.com:1001");
        const showInputStub = sandbox.stub(vscode.window, "showInputBox");
        showInputStub.returns(undefined);

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.equal(undefined);
        const messageSent = showInfoSpy.calledWith("Operation Cancelled");
        expect(messageSent).to.equal(true);
    }).timeout(TIMEOUT);

    it ("Tests if operation is cancelled when password input is empty", async () => {
        const showInfoSpy = sandbox.spy(vscode.window, "showInformationMessage");
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns("https://testurl.com:1001");
        const showInputStub = sandbox.stub(vscode.window, "showInputBox");
        showInputStub.onCall(0).returns("testUser");
        showInputStub.onCall(1).returns(undefined);

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.equal(undefined);
        const messageSent = showInfoSpy.calledWith("Operation Cancelled");
        expect(messageSent).to.equal(true);
    }).timeout(TIMEOUT);

    it ("Tests if operation is cancelled when rejectUnauthorized input is empty", async () => {
        const showInfoSpy = sandbox.spy(vscode.window, "showInformationMessage");
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns("https://testurl.com:1001");
        const showInputStub = sandbox.stub(vscode.window, "showInputBox");
        showInputStub.onCall(0).returns("testUser");
        showInputStub.onCall(1).returns("testPass");
        const showQuickPickStub = sandbox.stub(vscode.window, "showQuickPick");
        showQuickPickStub.returns(undefined);

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.equal(undefined);
        const messageSent = showInfoSpy.calledWith("Operation Cancelled");
        expect(messageSent).to.equal(true);
    }).timeout(TIMEOUT);

    it ("Tests if operation is cancelled when username is already taken", async () => {
        const showErrorSpy = sandbox.spy(vscode.window, "showErrorMessage");
        profiles.allProfiles.push(testProfileLoaded);
        const getUrlStub = sandbox.stub(profiles, "getUrl");
        getUrlStub.returns("https://testurl.com:1001");
        const showInputStub = sandbox.stub(vscode.window, "showInputBox");
        showInputStub.onCall(0).returns("testUser");
        showInputStub.onCall(1).returns("testPass");
        const showQuickPickStub = sandbox.stub(vscode.window, "showQuickPick");
        showQuickPickStub.returns("True - Reject connections with self-signed certificates");

        const response = await profiles.createNewConnection("testProfileIntegration");
        expect(response).to.equal(undefined);
        const messageSent = showErrorSpy.calledWith("Profile name already exists. Please create a profile using a different name");
        expect(messageSent).to.equal(true);
    }).timeout(TIMEOUT);
});
