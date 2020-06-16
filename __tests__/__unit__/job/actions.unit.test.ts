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
import { Job } from "../../../src/job/ZoweJobNode";
import {
    createISession,
    createIProfile,
    createTreeView, createISessionWithoutCredentials, createTextDocument, createInstanceOfProfile
} from "../../../__mocks__/mockCreators/shared";
import { createIJobObject, createJobsTree } from "../../../__mocks__/mockCreators/jobs";
import { createJesApi, bindJesApi } from "../../../__mocks__/mockCreators/api";
import * as jobActions from "../../../src/job/actions";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";
import * as dsActions from "../../../src/dataset/actions";
import * as globals from "../../../src/globals";
import { createDatasetSessionNode, createDatasetTree } from "../../../__mocks__/mockCreators/datasets";
import { Profiles } from "../../../src/Profiles";

const activeTextEditorDocument = jest.fn();

function createGlobalMocks() {
    Object.defineProperty(vscode.window, "showInformationMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showErrorMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "IssueCommand", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.IssueCommand, "issueSimple", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showOpenDialog", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "GetJobs", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.GetJobs, "getJclForJob", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.workspace, "openTextDocument", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showTextDocument", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "ZosmfSession", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.ZosmfSession, "createBasicZosmfSession", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "activeTextEditor", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window.activeTextEditor, "document", {
        get: activeTextEditorDocument,
        configurable: true
    });
    Object.defineProperty(globals, "LOG", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "debug", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals.LOG, "error", { value: jest.fn(), configurable: true });
    Object.defineProperty(Profiles, "getInstance", { value: jest.fn(), configurable: true });
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("Jobs Actions Unit Tests - Function setPrefix", () => {
    function createBlockMocks() {
        const session = createISession();
        const treeView = createTreeView();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();

        return {
            session,
            treeView,
            iJob,
            imperativeProfile,
            testJobsTree: createJobsTree(session, iJob, imperativeProfile, treeView)
        };
    }

    it("Checking that the prefix is set correctly on the job", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null, blockMocks.session, null, null);

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("*");
        await jobActions.setPrefix(node, blockMocks.testJobsTree);

        expect(mocked(vscode.window.showInputBox).mock.calls.length).toBe(1);
        expect(mocked(vscode.window.showInputBox).mock.calls[0][0]).toEqual({
            prompt: "Prefix"
        });
        expect(mocked(vscode.window.showInformationMessage).mock.calls.length).toBe(0);
    });
});

describe("Jobs Actions Unit Tests - Function setOwner", () => {
    function createBlockMocks() {
        const session = createISession();
        const treeView = createTreeView();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();

        return {
            session,
            treeView,
            iJob,
            imperativeProfile,
            testJobsTree: createJobsTree(session, iJob, imperativeProfile, treeView)
        };
    }

    it("Checking that the owner is set correctly on the job", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null,
            blockMocks.session, blockMocks.iJob, blockMocks.imperativeProfile);

        mocked(vscode.window.showInputBox).mockResolvedValueOnce("OWNER");
        await jobActions.setOwner(node, blockMocks.testJobsTree);

        expect(mocked(vscode.window.showInputBox).mock.calls.length).toBe(1);
        expect(mocked(vscode.window.showInputBox).mock.calls[0][0]).toEqual({
            prompt: "Owner",
        });
        expect(mocked(vscode.window.showInformationMessage).mock.calls.length).toBe(0);
    });
});

describe("Jobs Actions Unit Tests - Function stopCommand", () => {
    function createBlockMocks() {
        const session = createISession();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();

        return {
            session,
            iJob,
            imperativeProfile,
        };
    }

    it("Checking that stop command of Job Node is executed properly", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null,
            blockMocks.session, blockMocks.iJob, blockMocks.imperativeProfile);

        mocked(zowe.IssueCommand.issueSimple).mockResolvedValueOnce({
            success: false,
            zosmfResponse: [],
            commandResponse: "fake response"
        });
        await jobActions.stopCommand(node);
        expect(mocked(vscode.window.showInformationMessage).mock.calls.length).toBe(1);
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Command response: fake response"
        );
    });
    it("Checking failed attempt to issue stop command for Job Node.", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(zowe.IssueCommand.issueSimple).mockResolvedValueOnce({
            success: false,
            zosmfResponse: [],
            commandResponse: "fake response"
        });
        await jobActions.stopCommand(undefined);
        expect(mocked(vscode.window.showErrorMessage).mock.calls.length).toBe(1);
    });
});

describe("Jobs Actions Unit Tests - Function modifyCommand", () => {
    function createBlockMocks() {
        const session = createISession();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();

        return {
            session,
            iJob,
            imperativeProfile,
        };
    }

    it("Checking modification of Job Node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null,
            blockMocks.session, blockMocks.iJob, blockMocks.imperativeProfile);

        mocked(vscode.window.showInputBox).mockResolvedValue("modify");
        mocked(zowe.IssueCommand.issueSimple).mockResolvedValueOnce({
            success: false,
            zosmfResponse: [],
            commandResponse: "fake response"
        });
        await jobActions.modifyCommand(node);
        expect(mocked(vscode.window.showInformationMessage).mock.calls.length).toBe(1);
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Command response: fake response"
        );
    });
    it("Checking failed attempt to modify Job Node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.showInputBox).mockResolvedValue("modify");
        mocked(zowe.IssueCommand.issueSimple).mockResolvedValueOnce({
            success: false,
            zosmfResponse: [],
            commandResponse: "fake response"
        });
        await jobActions.modifyCommand(undefined);
        expect(mocked(vscode.window.showErrorMessage).mock.calls.length).toBe(1);
    });
});

describe("Jobs Actions Unit Tests - Function downloadSpool", () => {
    function createBlockMocks() {
        const session = createISession();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();
        const jesApi = createJesApi(imperativeProfile);
        bindJesApi(jesApi);

        return {
            session,
            iJob,
            imperativeProfile,
            jesApi
        };
    }

    it("Checking download of Job Spool", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null,
            blockMocks.session, blockMocks.iJob, blockMocks.imperativeProfile);
        const fileUri = {
            fsPath: "/tmp/foo",
            scheme: "",
            authority: "",
            fragment: "",
            path: "",
            query: ""
        };
        mocked(vscode.window.showOpenDialog).mockResolvedValue([fileUri as vscode.Uri]);
        const downloadFileSpy = jest.spyOn(blockMocks.jesApi, "downloadSpoolContent");

        await jobActions.downloadSpool(node);
        expect(mocked(vscode.window.showOpenDialog)).toBeCalled();
        expect(downloadFileSpy).toBeCalled();
        expect(downloadFileSpy.mock.calls[0][0]).toEqual(
            {
                jobid: node.job.jobid,
                jobname: node.job.jobname,
                outDir: fileUri.fsPath
            }
        );
    });
    it("Checking failed attempt to download Job Spool", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const fileUri = {
            fsPath: "/tmp/foo",
            scheme: "",
            authority: "",
            fragment: "",
            path: "",
            query: ""
        };
        mocked(vscode.window.showOpenDialog).mockResolvedValue([fileUri as vscode.Uri]);
        await jobActions.downloadSpool(undefined);
        expect(mocked(vscode.window.showErrorMessage).mock.calls.length).toBe(1);
    });
});

describe("Jobs Actions Unit Tests - Function downloadJcl", () => {
    function createBlockMocks() {
        const session = createISession();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();

        return {
            session,
            iJob,
            imperativeProfile
        };
    }

    it("Checking download of Job JCL", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null,
            blockMocks.session, blockMocks.iJob, blockMocks.imperativeProfile);

        await jobActions.downloadJcl(node);
        expect(mocked(zowe.GetJobs.getJclForJob)).toBeCalled();
        expect(mocked(vscode.workspace.openTextDocument)).toBeCalled();
        expect(mocked(vscode.window.showTextDocument)).toBeCalled();
    });
    it("Checking failed attempt to download Job JCL", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        await jobActions.downloadJcl(undefined);
        expect(mocked(vscode.window.showErrorMessage)).toBeCalled();
    });
});

describe("Jobs Actions Unit Tests - Function submitJcl", () => {
    function createBlockMocks() {
        const session = createISessionWithoutCredentials();
        const treeView = createTreeView();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const textDocument = createTextDocument("HLQ.TEST.AFILE(mem)", datasetSessionNode);
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const jesApi = createJesApi(imperativeProfile);
        bindJesApi(jesApi);

        return {
            session,
            treeView,
            iJob,
            imperativeProfile,
            datasetSessionNode,
            testDatasetTree: createDatasetTree(datasetSessionNode, treeView),
            textDocument,
            profileInstance,
            jesApi
        };
    }

    it("Checking submit of active text editor content as JCL", async () => {
        createGlobalMocks();
        const blockMocks: any = createBlockMocks();
        mocked(zowe.ZosmfSession.createBasicZosmfSession).mockReturnValue(blockMocks.session);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(vscode.window.showQuickPick).mockReturnValueOnce(new Promise((resolve) => {
            resolve(blockMocks.datasetSessionNode.label);
        }));
        blockMocks.testDatasetTree.getChildren.mockResolvedValueOnce([
            new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null),
            blockMocks.datasetSessionNode
        ]);
        activeTextEditorDocument.mockReturnValue(blockMocks.textDocument);
        const submitJclSpy = jest.spyOn(blockMocks.jesApi, "submitJcl");
        submitJclSpy.mockClear();
        submitJclSpy.mockResolvedValueOnce(blockMocks.iJob);
        await dsActions.submitJcl(blockMocks.testDatasetTree);

        expect(submitJclSpy).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage).mock.calls.length).toBe(1);
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual("Job submitted [JOB1234](command:zowe.setJobSpool?%5B%22sestest%22%2C%22JOB1234%22%5D)");
    });

    it("Checking failed attempt to submit of active text editor content as JCL", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(zowe.ZosmfSession.createBasicZosmfSession).mockReturnValue(blockMocks.session);
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(null); // Here we imitate the case when no profile was selected
        blockMocks.testDatasetTree.getChildren.mockResolvedValueOnce([
            new ZoweDatasetNode("node", vscode.TreeItemCollapsibleState.None, blockMocks.datasetSessionNode, null),
            blockMocks.datasetSessionNode
        ]);
        activeTextEditorDocument.mockReturnValue(blockMocks.textDocument);
        const submitJclSpy = jest.spyOn(blockMocks.jesApi, "submitJcl");
        submitJclSpy.mockClear();
        submitJclSpy.mockResolvedValueOnce(blockMocks.iJob);

        await dsActions.submitJcl(blockMocks.testDatasetTree);

        expect(submitJclSpy).not.toBeCalled();
        expect(mocked(globals.LOG.error)).toBeCalled();
    });
});

describe("Jobs Actions Unit Tests - Function submitMember", () => {
    function createBlockMocks() {
        const session = createISessionWithoutCredentials();
        const iJob = createIJobObject();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const jesApi = createJesApi(imperativeProfile);
        bindJesApi(jesApi);

        return {
            session,
            iJob,
            imperativeProfile,
            datasetSessionNode,
            profileInstance,
            jesApi
        };
    }

    it("Checking Submit Job for PDS Member content", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const subNode = new ZoweDatasetNode("dataset", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, null);
        subNode.contextValue = globals.DS_PDS_CONTEXT;
        const member = new ZoweDatasetNode("member", vscode.TreeItemCollapsibleState.None, subNode, null);
        member.contextValue = globals.DS_MEMBER_CONTEXT;
        const submitJobSpy = jest.spyOn(blockMocks.jesApi, "submitJob");
        submitJobSpy.mockResolvedValueOnce(blockMocks.iJob);

        await dsActions.submitMember(member);
        expect(submitJobSpy).toBeCalled();
        expect(submitJobSpy.mock.calls[0][0]).toEqual("dataset(member)");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Job submitted [JOB1234](command:zowe.setJobSpool?%5B%22sestest%22%2C%22JOB1234%22%5D)");
    });
    it("Checking Submit Job for PS Dataset content", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const dataset = new ZoweDatasetNode("dataset", vscode.TreeItemCollapsibleState.Collapsed, blockMocks.datasetSessionNode, null);
        dataset.contextValue = globals.DS_DS_CONTEXT;
        const submitJobSpy = jest.spyOn(blockMocks.jesApi, "submitJob");
        submitJobSpy.mockClear();
        submitJobSpy.mockResolvedValueOnce(blockMocks.iJob);

        await dsActions.submitMember(dataset);
        expect(submitJobSpy).toBeCalled();
        expect(submitJobSpy.mock.calls[0][0]).toEqual("dataset");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Job submitted [JOB1234](command:zowe.setJobSpool?%5B%22sestest%22%2C%22JOB1234%22%5D)");
    });
    it("Checking Submit Job for Favourite PDS Member content", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favoriteSession = new ZoweDatasetNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, null);
        favoriteSession.contextValue = globals.FAVORITE_CONTEXT;
        const favoriteSubNode = new ZoweDatasetNode("[test]: TEST.JCL", vscode.TreeItemCollapsibleState.Collapsed,
            favoriteSession, null);
        favoriteSubNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        const favoriteMember = new ZoweDatasetNode(globals.DS_PDS_CONTEXT, vscode.TreeItemCollapsibleState.Collapsed,
            favoriteSubNode, null);
        favoriteMember.contextValue = globals.DS_MEMBER_CONTEXT;
        const submitJobSpy = jest.spyOn(blockMocks.jesApi, "submitJob");
        submitJobSpy.mockClear();
        submitJobSpy.mockResolvedValueOnce(blockMocks.iJob);

        await dsActions.submitMember(favoriteMember);
        expect(submitJobSpy).toBeCalled();
        expect(submitJobSpy.mock.calls[0][0]).toEqual("TEST.JCL(pds)");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Job submitted [JOB1234](command:zowe.setJobSpool?%5B%22test%22%2C%22JOB1234%22%5D)");
    });
    it("Checking Submit Job for Favourite PS Dataset content", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const favoriteSession = new ZoweDatasetNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, null);
        favoriteSession.contextValue = globals.FAVORITE_CONTEXT;
        const favoriteDataset = new ZoweDatasetNode("[test]: TEST.JCL", vscode.TreeItemCollapsibleState.Collapsed,
            favoriteSession, null);
        favoriteDataset.contextValue = globals.DS_DS_CONTEXT + globals.FAV_SUFFIX;
        const submitJobSpy = jest.spyOn(blockMocks.jesApi, "submitJob");
        submitJobSpy.mockClear();
        submitJobSpy.mockResolvedValueOnce(blockMocks.iJob);

        await dsActions.submitMember(favoriteDataset);
        expect(submitJobSpy).toBeCalled();
        expect(submitJobSpy.mock.calls[0][0]).toEqual("TEST.JCL");
        expect(mocked(vscode.window.showInformationMessage)).toBeCalled();
        expect(mocked(vscode.window.showInformationMessage).mock.calls[0][0]).toEqual(
            "Job submitted [JOB1234](command:zowe.setJobSpool?%5B%22test%22%2C%22JOB1234%22%5D)");
    });
    it("Checking Submit Job for unsupported Dataset content", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const corruptedNode = new ZoweDatasetNode("gibberish", vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode, null);
        corruptedNode.contextValue = "gibberish";
        const corruptedSubNode = new ZoweDatasetNode("gibberishmember", vscode.TreeItemCollapsibleState.Collapsed, corruptedNode, null);
        const submitJobSpy = jest.spyOn(blockMocks.jesApi, "submitJob");
        submitJobSpy.mockClear();
        submitJobSpy.mockResolvedValueOnce(blockMocks.iJob);

        try {
            await dsActions.submitMember(corruptedSubNode);
        } catch (e) {
            expect(e.message).toEqual("submitMember() called from invalid node.");
        }
        expect(submitJobSpy).not.toBeCalled();
        expect(mocked(vscode.window.showInformationMessage)).not.toBeCalled();
        expect(mocked(vscode.window.showErrorMessage)).toBeCalled();
        expect(mocked(vscode.window.showErrorMessage).mock.calls[0][0]).toEqual("submitMember() called from invalid node.");
    });
});

describe("refreshAll", () => {
    function createBlockMocks() {
        const newMocks = {
            session: createISessionWithoutCredentials(),
            iJob: createIJobObject(),
            imperativeProfile: createIProfile(),
            profileInstance: null,
            treeView: createTreeView(),
            jobsTree: null,
            jesApi: null
        };
        newMocks.jesApi = createJesApi(newMocks.imperativeProfile);
        newMocks.profileInstance = createInstanceOfProfile(newMocks.imperativeProfile);
        newMocks.jobsTree = createJobsTree(newMocks.session, newMocks.iJob, newMocks.profileInstance, newMocks.treeView);
        bindJesApi(newMocks.jesApi);

        return newMocks;
    }

    it("Testing that refreshAllJobs is executed successfully", async () => {
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        const submitJclSpy = jest.spyOn(jobActions, "refreshAllJobs");
        jobActions.refreshAllJobs(blockMocks.jobsTree);
        expect(submitJclSpy).toHaveBeenCalledTimes(1);
    });
});
