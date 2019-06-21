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
jest.mock("vscode");
jest.mock("Session");
jest.mock("@brightside/core");
jest.mock("@brightside/imperative");
jest.mock("fs");
jest.mock("fs-extra");
jest.mock("../src/DatasetTree");
jest.mock("../src/USSTree");
jest.mock("../src/ProfileLoader");

import * as vscode from "vscode";
import * as treeMock from "../src/DatasetTree";
import * as treeUSSMock from "../src/USSTree";
import { ZoweUSSNode } from "../src/ZoweUSSNode";
import { ZoweNode } from "../src/ZoweNode";
import * as brtimperative from "@brightside/imperative";
import * as extension from "../src/extension";
import * as path from "path";
import * as brightside from "@brightside/core";
import * as fs from "fs";
import * as fsextra from "fs-extra";
import * as profileLoader from "../src/ProfileLoader";
import * as ussNodeActions from "../src/uss/ussNodeActions";
import { Job } from "../src/zosjobs";

describe("Extension Unit Tests", () => {
    // Globals
    const session = new brtimperative.Session({
        user: "fake",
        password: "fake",
        hostname: "fake",
        protocol: "https",
        type: "basic",
    });

    const iJob: brightside.IJob = {
        "jobid": "JOB1234",
        "jobname": "TESTJOB",
        "files-url": "fake/files",
        "job-correlator": "correlator",
        "phase-name": "PHASE",
        "reason-not-running": "",
        "step-data": [{
            "proc-step-name": "",
            "program-name": "",
            "step-name": "",
            "step-number": 1,
            "active": "",
            "smfid": ""

        }],
        "class": "A",
        "owner": "USER",
        "phase": 0,
        "retcode": "",
        "status": "ACTIVE",
        "subsystem": "SYS",
        "type": "JOB",
        "url": "fake/url"
    };

    const iJobFile: brightside.IJobFile = {
        "byte-count": 128,
        "job-correlator": "",
        "record-count": 1,
        "records-url": "fake/records",
        "class": "A",
        "ddname": "STDOUT",
        "id": 100,
        "jobid": "100",
        "jobname": "TESTJOB",
        "lrecl": 80,
        "procstep": "",
        "recfm": "FB",
        "stepname": "",
        "subsystem": ""
    };

    const sessNode = new ZoweNode("sestest", vscode.TreeItemCollapsibleState.Expanded, null, session);
    sessNode.contextValue = "session";
    sessNode.pattern = "test hlq";

    const ussNode = new ZoweUSSNode("usstest", vscode.TreeItemCollapsibleState.Expanded, null, session, null);
    ussNode.contextValue = "uss_session";
    ussNode.fullPath = "/u/myuser";

    const jobNode = new Job("jobtest", vscode.TreeItemCollapsibleState.Expanded, null, session, iJob);

    const mkdirSync = jest.fn();
    const moveSync = jest.fn();
    const getAllProfileNames = jest.fn();
    const createTreeView = jest.fn();
    // const Uri = jest.fn();
    // const parse = jest.fn();
    const pathMock = jest.fn();
    const registerCommand = jest.fn();
    const onDidSaveTextDocument = jest.fn();
    const existsSync = jest.fn();
    const createReadStream = jest.fn();
    const readdirSync = jest.fn();
    const unlinkSync = jest.fn();
    const rmdirSync = jest.fn();
    const readFileSync = jest.fn();
    // const lstatSync = jest.fn();
    // const lstat = jest.fn();
    const showErrorMessage = jest.fn();
    const showInputBox = jest.fn();
    const showOpenDialog = jest.fn();
    const ZosmfSession = jest.fn();
    const createBasicZosmfSession = jest.fn();
    const Upload = jest.fn();
    const Delete = jest.fn();
    const bufferToDataSet = jest.fn();
    const pathToDataSet = jest.fn();
    const delDataset = jest.fn();
    const Create = jest.fn();
    const dataSetCreate = jest.fn();
    const Download = jest.fn();
    const dataSet = jest.fn();
    const ussFile = jest.fn();
    const List = jest.fn();
    const fileToUSSFile = jest.fn();
    const dataSetList = jest.fn();
    const fileList = jest.fn();
    const openTextDocument = jest.fn();
    const showTextDocument = jest.fn();
    const showInformationMessage = jest.fn();
    const showQuickPick = jest.fn();
    const mockAddSession = jest.fn();
    const mockAddUSSSession = jest.fn();
    const mockRefresh = jest.fn();
    const mockUSSRefresh = jest.fn();
    const mockGetChildren = jest.fn();
    const mockGetUSSChildren = jest.fn();
    const mockRemoveFavorite = jest.fn();
    const getConfiguration = jest.fn();
    const onDidChangeConfiguration = jest.fn();
    const executeCommand = jest.fn();
    const activeTextEditor = jest.fn();
    const document = jest.fn();
    const getText = jest.fn();
    const save = jest.fn();
    const isFile = jest.fn();
    const load = jest.fn();
    const DeleteJobs = jest.fn();
    const deleteJob = jest.fn();
    const GetJobs = jest.fn();
    const getSpoolContentById = jest.fn();
    const getJclForJob = jest.fn();
    const DownloadJobs = jest.fn();
    const downloadAllSpoolContentCommon = jest.fn();
    const SubmitJobs = jest.fn();
    const submitJcl = jest.fn();
    const IssueCommand = jest.fn();
    const issueSimple = jest.fn();
    const ProgressLocation = jest.fn().mockImplementation(() => {
        return {
            Notification: 15
        };
    });
    const CliProfileManager = jest.fn().mockImplementation(() => {
        return {getAllProfileNames, load};
    });
    const DatasetTree = jest.fn().mockImplementation(() => {
        return {
            mSessionNodes: [],
            mFavorites: [],
            addSession: mockAddSession,
            refresh: mockRefresh,
            getChildren: mockGetChildren,
            removeFavorite: mockRemoveFavorite
        };
    });
    const USSTree = jest.fn().mockImplementation(() => {
        return {
            mSessionNodes: [],
            addSession: mockAddUSSSession,
            refresh: mockUSSRefresh,
            getChildren: mockGetUSSChildren,
        };
    });
    const JobsTree = jest.fn().mockImplementation(() => {
        return {
            mSessionNodes: [],
            getChildren: jest.fn(),
            addSession: jest.fn(),
            refresh: jest.fn(),
        };
    });
    // const lstatSync = jest.fn().mockImplementation(() => {
    //     return { lstat };
    // });
    // const lstat = jest.fn().mockImplementation(() => {
    //     return {
    //         isFile(): true;
    //      };
    // });
    const withProgress = jest.fn().mockImplementation(() => {
        return {
            location: 15,
            title: "Saving file..."
        };
    });

    enum CreateDataSetTypeEnum {
        DATA_SET_BINARY = 0,
        DATA_SET_C = 1,
        DATA_SET_CLASSIC = 2,
        DATA_SET_PARTITIONED = 3,
        DATA_SET_SEQUENTIAL = 4,
    }

    const testTree = DatasetTree();
    testTree.mSessionNodes = [];
    testTree.mSessionNodes.push(sessNode);

    const testUSSTree = USSTree();
    testUSSTree.mSessionNodes = [];
    testUSSTree.mSessionNodes.push(ussNode);

    const testJobsTree = JobsTree();
    testJobsTree.mSessionNodes = [];
    testJobsTree.mSessionNodes.push(jobNode);

    Object.defineProperty(profileLoader, "loadNamedProfile", {value: jest.fn()});
    Object.defineProperty(profileLoader, "loadAllProfiles", {
        value: jest.fn(() => {
            return [{name: "firstName"}, {name: "secondName"}];
        })
    });
    Object.defineProperty(profileLoader, "loadDefaultProfile", {value: jest.fn()});

    Object.defineProperty(fs, "mkdirSync", {value: mkdirSync});
    Object.defineProperty(brtimperative, "CliProfileManager", {value: CliProfileManager});
    Object.defineProperty(vscode.window, "createTreeView", {value: createTreeView});
    // Object.defineProperty(vscode, "Uri", {value: Uri});
    Object.defineProperty(vscode, "ProgressLocation", {value: ProgressLocation});
    // Object.defineProperty(Uri, "parse", { value: parse });
    // Object.defineProperty(parse, "path", { value: pathMock });
    Object.defineProperty(vscode.commands, "registerCommand", {value: registerCommand});
    Object.defineProperty(vscode.workspace, "onDidSaveTextDocument", {value: onDidSaveTextDocument});
    Object.defineProperty(vscode.workspace, "getConfiguration", {value: getConfiguration});
    Object.defineProperty(vscode.workspace, "onDidChangeConfiguration", {value: onDidChangeConfiguration});
    Object.defineProperty(fs, "readdirSync", {value: readdirSync});
    Object.defineProperty(fs, "createReadStream", {value: createReadStream});
    Object.defineProperty(fs, "existsSync", {value: existsSync});
    Object.defineProperty(fs, "unlinkSync", {value: unlinkSync});
    Object.defineProperty(fs, "rmdirSync", {value: rmdirSync});
    Object.defineProperty(fs, "readFileSync", {value: readFileSync});
    Object.defineProperty(fsextra, "moveSync", {value: moveSync});
    Object.defineProperty(vscode.window, "showErrorMessage", {value: showErrorMessage});
    Object.defineProperty(vscode.window, "showInputBox", {value: showInputBox});
    Object.defineProperty(vscode.window, "activeTextEditor", {value: activeTextEditor});
    Object.defineProperty(activeTextEditor, "document", {value: document});
    Object.defineProperty(document, "save", {value: save});
    Object.defineProperty(document, "getText", {value: getText});
    Object.defineProperty(vscode.commands, "executeCommand", {value: executeCommand});
    Object.defineProperty(brightside, "ZosmfSession", {value: ZosmfSession});
    Object.defineProperty(ZosmfSession, "createBasicZosmfSession", {value: createBasicZosmfSession});
    Object.defineProperty(brightside, "Upload", {value: Upload});
    Object.defineProperty(Upload, "bufferToDataSet", {value: bufferToDataSet});
    Object.defineProperty(Upload, "pathToDataSet", {value: pathToDataSet});
    Object.defineProperty(Upload, "fileToUSSFile", {value: fileToUSSFile});
    Object.defineProperty(brightside, "Create", {value: Create});
    Object.defineProperty(Create, "dataSet", {value: dataSetCreate});
    Object.defineProperty(brightside, "List", {value: List});
    Object.defineProperty(List, "dataSet", {value: dataSetList});
    Object.defineProperty(List, "fileList", {value: fileList});
    Object.defineProperty(vscode.workspace, "openTextDocument", {value: openTextDocument});
    Object.defineProperty(vscode.window, "showInformationMessage", {value: showInformationMessage});
    Object.defineProperty(vscode.window, "showTextDocument", {value: showTextDocument});
    Object.defineProperty(vscode.window, "showErrorMessage", {value: showErrorMessage});
    Object.defineProperty(vscode.window, "showOpenDialog", {value: showOpenDialog});
    Object.defineProperty(vscode.window, "showQuickPick", {value: showQuickPick});
    Object.defineProperty(vscode.window, "withProgress", {value: withProgress});
    Object.defineProperty(brightside, "Download", {value: Download});
    Object.defineProperty(Download, "dataSet", {value: dataSet});
    Object.defineProperty(treeMock, "DatasetTree", {value: DatasetTree});
    Object.defineProperty(treeUSSMock, "USSTree", {value: USSTree});
    Object.defineProperty(brightside, "Delete", {value: Delete});
    Object.defineProperty(Delete, "dataSet", {value: delDataset});
    Object.defineProperty(brightside, "CreateDataSetTypeEnum", {value: CreateDataSetTypeEnum});
    // Object.defineProperty(fs, "lstatSync", { value: lstatSync });
    // Object.defineProperty(fs, "lstat", { value: lstat });
    Object.defineProperty(Download, "ussFile", {value: ussFile});
    Object.defineProperty(brightside, "DeleteJobs", {value: DeleteJobs});
    Object.defineProperty(DeleteJobs, "deleteJob", {value: deleteJob});
    Object.defineProperty(brightside, "GetJobs", {value: GetJobs});
    Object.defineProperty(GetJobs, "getSpoolContentById", {value: getSpoolContentById});
    Object.defineProperty(GetJobs, "getJclForJob", {value: getJclForJob});
    Object.defineProperty(brightside, "DownloadJobs", {value: DownloadJobs});
    Object.defineProperty(DownloadJobs, "downloadAllSpoolContentCommon", {value: downloadAllSpoolContentCommon});
    Object.defineProperty(brightside, "SubmitJobs", {value: SubmitJobs});
    Object.defineProperty(SubmitJobs, "submitJcl", {value: submitJcl});
    Object.defineProperty(brightside, "IssueCommand", {value: IssueCommand});
    Object.defineProperty(IssueCommand, "issueSimple", {value: issueSimple});

    it("Testing that activate correctly executes", async () => {
        createTreeView.mockReturnValue("testDisposable");

        existsSync.mockReturnValueOnce(true);
        existsSync.mockReturnValueOnce(true);
        existsSync.mockReturnValueOnce(false);
        readdirSync.mockReturnValueOnce(["firstFile.txt", "secondFile.txt", "firstDir"]);
        isFile.mockReturnValueOnce(true);
        readdirSync.mockReturnValueOnce(["thirdFile.txt"]);
        readdirSync.mockReturnValue([]);
        // lstatSync.mockReturnValue(lstat);
        isFile.mockReturnValueOnce(false);
        // rmdirSync.mockImplementationOnce(() => {
        //     throw Error;
        // });
        // parse.mockReturnValue({path: "lame"});
        (profileLoader.loadNamedProfile as any).mockImplementation(() => {
            return {
                profile: "SampleProfile"
            };
        });
        (profileLoader.loadDefaultProfile as any).mockImplementation(() => {
            return {
                profile: "SampleProfile"
            };
        });

        getConfiguration.mockReturnValueOnce({
            get: () => ""
        });

        getConfiguration.mockReturnValueOnce({
            get: (setting: string) => [
                "[test]: brtvs99.public.test{pds}",
                "[test]: brtvs99.test{ds}",
                "[test]: brtvs99.fail{fail}",
                "[test]: brtvs99.test.search{session}",
            ]
        });
        spyOn(ussNodeActions, "initializeUSSFavorites").and.returnValue(undefined);
// tslint:disable-next-line: no-object-literal-type-assertion
        const extensionMock = jest.fn(() => ({
            subscriptions: [],
            extensionPath: path.join(__dirname, "..")
        } as vscode.ExtensionContext));
        const mock = new extensionMock();

        await extension.activate(mock);

        const sampleFavorites = [
            new ZoweNode("[test]: brtvs99.public.test", vscode.TreeItemCollapsibleState.Collapsed, undefined, undefined),
            new ZoweNode("[test]: brtvs99.test", vscode.TreeItemCollapsibleState.None, undefined, undefined),
            new ZoweNode("[test]: brtvs99.test.search", vscode.TreeItemCollapsibleState.None, undefined, null)
        ];
        sampleFavorites[0].contextValue = "pdsf";
        sampleFavorites[1].contextValue = "dsf";
        sampleFavorites[2].contextValue = "sessionf";
        sampleFavorites[1].command = {
            command: "zowe.ZoweNode.openPS",
            title: "",
            arguments: [sampleFavorites[1]]
        };
        sampleFavorites[2].command = {command: "zowe.pattern", title: "", arguments: [sampleFavorites[2]]};
        sampleFavorites[2].iconPath = {
            dark: path.join(__dirname, "..", "..", "resources", "dark", "pattern.svg"),
            light: path.join(__dirname, "..", "..", "resources", "light", "pattern.svg")
        };
        // expect(createBasicZosmfSession.mock.calls.length).toBe(2);
        expect(mkdirSync.mock.calls.length).toBe(3);
        expect(createTreeView.mock.calls.length).toBe(3);
        expect(createTreeView.mock.calls[0][0]).toBe("zowe.explorer");
        expect(createTreeView.mock.calls[1][0]).toBe("zowe.uss.explorer");
        expect(createTreeView.mock.calls[0][1]).toEqual({
            treeDataProvider:
                {
                    addSession: mockAddSession,
                    mSessionNodes: [],
                    mFavorites: sampleFavorites,
                    refresh: mockRefresh,
                    getChildren: mockGetChildren,
                    removeFavorite: mockRemoveFavorite
                }
        });
        expect(createTreeView.mock.calls[1][1]).toEqual({
            treeDataProvider:
                {
                    mSessionNodes: [],
                    addSession: mockAddUSSSession,
                    refresh: mockUSSRefresh,
                    getChildren: mockGetUSSChildren,
                }
        });
        expect(registerCommand.mock.calls.length).toBe(47);
        expect(registerCommand.mock.calls[0][0]).toBe("zowe.addSession");
        expect(registerCommand.mock.calls[0][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[1][0]).toBe("zowe.addFavorite");
        expect(registerCommand.mock.calls[1][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[2][0]).toBe("zowe.refreshAll");
        expect(registerCommand.mock.calls[2][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[3][0]).toBe("zowe.refreshNode");
        expect(registerCommand.mock.calls[3][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[4][0]).toBe("zowe.pattern");
        expect(registerCommand.mock.calls[4][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[5][0]).toBe("zowe.ZoweNode.openPS");
        expect(registerCommand.mock.calls[5][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[6][0]).toBe("zowe.createDataset");
        expect(registerCommand.mock.calls[6][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[7][0]).toBe("zowe.createMember");
        expect(registerCommand.mock.calls[7][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[8][0]).toBe("zowe.deleteDataset");
        expect(registerCommand.mock.calls[8][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[9][0]).toBe("zowe.deletePDS");
        expect(registerCommand.mock.calls[9][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[10][0]).toBe("zowe.uploadDialog");
        expect(registerCommand.mock.calls[10][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[11][0]).toBe("zowe.deleteMember");
        expect(registerCommand.mock.calls[11][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[12][0]).toBe("zowe.removeSession");
        expect(registerCommand.mock.calls[12][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[13][0]).toBe("zowe.removeFavorite");
        expect(registerCommand.mock.calls[13][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[14][0]).toBe("zowe.safeSave");
        expect(registerCommand.mock.calls[14][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[15][0]).toBe("zowe.saveSearch");
        expect(registerCommand.mock.calls[15][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[16][0]).toBe("zowe.removeSavedSearch");
        expect(registerCommand.mock.calls[16][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[17][0]).toBe("zowe.submitJcl");
        expect(registerCommand.mock.calls[17][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[18][0]).toBe("zowe.submitMember");
        expect(registerCommand.mock.calls[18][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[19][0]).toBe("zowe.showDSAttributes");
        expect(registerCommand.mock.calls[19][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[20][0]).toBe("zowe.uss.addFavorite");
        expect(registerCommand.mock.calls[20][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[21][0]).toBe("zowe.uss.removeFavorite");
        expect(registerCommand.mock.calls[21][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[22][0]).toBe("zowe.uss.addSession");
        expect(registerCommand.mock.calls[22][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[23][0]).toBe("zowe.uss.refreshAll");
        expect(registerCommand.mock.calls[23][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[24][0]).toBe("zowe.uss.refreshUSS");
        expect(registerCommand.mock.calls[24][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[25][0]).toBe("zowe.uss.fullPath");
        expect(registerCommand.mock.calls[25][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[26][0]).toBe("zowe.uss.ZoweUSSNode.open");
        expect(registerCommand.mock.calls[26][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[27][0]).toBe("zowe.uss.removeSession");
        expect(registerCommand.mock.calls[27][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[28][0]).toBe("zowe.uss.createFile");
        expect(registerCommand.mock.calls[28][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[29][0]).toBe("zowe.uss.createFolder");
        expect(registerCommand.mock.calls[29][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[30][0]).toBe("zowe.uss.deleteNode");
        expect(registerCommand.mock.calls[30][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[31][0]).toBe("zowe.uss.binary");
        expect(registerCommand.mock.calls[31][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[32][0]).toBe("zowe.uss.text");
        expect(registerCommand.mock.calls[32][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[33][0]).toBe("zowe.uss.renameNode");
        expect(registerCommand.mock.calls[33][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[34][0]).toBe("zowe.zosJobsOpenspool");
        expect(registerCommand.mock.calls[34][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[35][0]).toBe("zowe.deleteJob");
        expect(registerCommand.mock.calls[35][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[36][0]).toBe("zowe.runModifyCommand");
        expect(registerCommand.mock.calls[36][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[37][0]).toBe("zowe.runStopCommand");
        expect(registerCommand.mock.calls[37][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[38][0]).toBe("zowe.refreshJobsServer");
        expect(registerCommand.mock.calls[38][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[39][0]).toBe("zowe.refreshAllJobs");
        expect(registerCommand.mock.calls[39][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[40][0]).toBe("zowe.addJobsSession");
        expect(registerCommand.mock.calls[40][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[41][0]).toBe("zowe.setOwner");
        expect(registerCommand.mock.calls[41][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[42][0]).toBe("zowe.setPrefix");
        expect(registerCommand.mock.calls[42][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[43][0]).toBe("zowe.removeJobsSession");
        expect(registerCommand.mock.calls[43][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[44][0]).toBe("zowe.downloadSpool");
        expect(registerCommand.mock.calls[44][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[45][0]).toBe("zowe.getJobJcl");
        expect(registerCommand.mock.calls[45][1]).toBeInstanceOf(Function);
        expect(registerCommand.mock.calls[46][0]).toBe("zowe.setJobSpool");
        expect(registerCommand.mock.calls[46][1]).toBeInstanceOf(Function);
        expect(onDidSaveTextDocument.mock.calls.length).toBe(1);
        expect(existsSync.mock.calls.length).toBe(3);
        expect(existsSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(readdirSync.mock.calls.length).toBe(1);
        expect(readdirSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(unlinkSync.mock.calls.length).toBe(2);
        expect(unlinkSync.mock.calls[0][0]).toBe(path.join(extension.BRIGHTTEMPFOLDER + "/firstFile.txt"));
        expect(unlinkSync.mock.calls[1][0]).toBe(path.join(extension.BRIGHTTEMPFOLDER + "/secondFile.txt"));
        expect(rmdirSync.mock.calls.length).toBe(1);
        expect(rmdirSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(showErrorMessage.mock.calls.length).toBe(2);
        expect(showErrorMessage.mock.calls[0][0]).toBe("Favorites file corrupted: [test]: brtvs99.fail{fail}");

        existsSync.mockReset();
        readdirSync.mockReset();
        existsSync.mockReturnValueOnce(false);
// tslint:disable-next-line: no-empty
        rmdirSync.mockImplementationOnce(() => {
        });
        showErrorMessage.mockReset();
        readFileSync.mockReturnValue("");

        getConfiguration.mockReturnValueOnce({
            get: () => ""
        });

        getConfiguration.mockReturnValueOnce({
            get: (setting: string) => [
                "[test]: brtvs99.public.test{pds}",
                "[test]: brtvs99.test{ds}",
                "[test]: brtvs99.fail{fail}",
                "[test]: brtvs99.test.search{session}",
            ]
        });

        getConfiguration.mockReturnValueOnce({
            get: (setting: string) => [
                "",
            ]
        });
        existsSync.mockReturnValueOnce(true);

        await extension.activate(mock);

        expect(existsSync.mock.calls.length).toBe(1);
        expect(readdirSync.mock.calls.length).toBe(0);

        existsSync.mockReset();
        readdirSync.mockReset();
        existsSync.mockReturnValueOnce(true);
        existsSync.mockReturnValueOnce(true);
        readdirSync.mockReturnValueOnce(["firstFile", "secondFile"]);
        getConfiguration.mockReturnValueOnce({
            get: () => {
                return [""];
            }
        });
        unlinkSync.mockImplementationOnce(() => {
            return;
        });
        unlinkSync.mockImplementationOnce(() => {
            return;
        });
        unlinkSync.mockImplementationOnce(() => {
            throw (Error("testError"));
        });

        await extension.activate(mock);
    });

    it("Testing that createMember correctly executes", async () => {
        const parent = new ZoweNode("parent", vscode.TreeItemCollapsibleState.Collapsed, sessNode, null);

        showInputBox.mockResolvedValue("testMember");

        await extension.createMember(parent, testTree);

        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInputBox.mock.calls[0][0]).toEqual({placeHolder: "Name of Member"});
        expect(bufferToDataSet.mock.calls.length).toBe(1);
        expect(bufferToDataSet.mock.calls[0][0]).toBe(session);
        expect(bufferToDataSet.mock.calls[0][1]).toEqual(Buffer.from(""));
        expect(bufferToDataSet.mock.calls[0][2]).toBe(parent.mLabel + "(testMember)");

        bufferToDataSet.mockRejectedValueOnce(Error("test"));
        showErrorMessage.mockReset();
        try {
            await extension.createMember(parent, testTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("Unable to create member: test");

        bufferToDataSet.mockReset();


        showInputBox.mockResolvedValue("");

        await extension.createMember(parent, testTree);

        expect(bufferToDataSet.mock.calls.length).toBe(0);

        parent.contextValue = "pdsf";
        await extension.createMember(parent, testTree);
    });

    it("Testing that refreshPS correctly executes with and without error", async () => {
        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null);
        const parent = new ZoweNode("parent", vscode.TreeItemCollapsibleState.Collapsed, sessNode, null);
        const child = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        showErrorMessage.mockReset();
        openTextDocument.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        dataSet.mockReset();
        showTextDocument.mockReset();

        await extension.refreshPS(node);

        expect(dataSet.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls[0][0]).toBe(node.getSession());
        expect(dataSet.mock.calls[0][1]).toBe(node.mLabel);
        expect(dataSet.mock.calls[0][2]).toEqual({
            file: path.join(extension.DS_DIR, node.mLabel +
                "[" + node.getSessionNode().mLabel + "]")
        });
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(path.join(extension.DS_DIR, node.mLabel +
            "[" + node.getSessionNode().mLabel + "]"));
        expect(showTextDocument.mock.calls.length).toBe(2);
        expect(executeCommand.mock.calls.length).toBe(1);


        showInformationMessage.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: false});
        executeCommand.mockReset();

        await extension.refreshPS(node);

        expect(executeCommand.mock.calls.length).toBe(0);

        dataSet.mockRejectedValueOnce(Error("not found"));
        showInformationMessage.mockReset();

        await extension.refreshPS(node);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("Unable to find file: " + node.mLabel + " was probably deleted.");

        showErrorMessage.mockReset();
        dataSet.mockReset();
        dataSet.mockRejectedValueOnce(Error(""));

        await extension.refreshPS(child);

        expect(dataSet.mock.calls[0][1]).toBe(child.mParent.mLabel + "(" + child.mLabel + ")");
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual(Error(""));

        showErrorMessage.mockReset();
        openTextDocument.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        dataSet.mockReset();
        showTextDocument.mockReset();

        node.contextValue = "dsf";
        await extension.refreshPS(node);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        dataSet.mockReset();
        openTextDocument.mockReset();

        parent.contextValue = "pdsf";
        await extension.refreshPS(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        dataSet.mockReset();
        openTextDocument.mockReset();

        parent.contextValue = "favorite";
        await extension.refreshPS(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        showErrorMessage.mockReset();
        dataSet.mockReset();
        openTextDocument.mockReset();
        parent.contextValue = "turnip";
        await extension.safeSave(child);
        expect(openTextDocument.mock.calls.length).toBe(0);
        expect(dataSet.mock.calls.length).toBe(0);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("safeSave() called from invalid node.");

    });

    it("Testing that addSession is executed successfully", async () => {
        showQuickPick.mockReset();

        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([{name: "firstName"}, {name: "secondName"}]);
        await extension.addSession(testTree);

        // expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        // tslint:disable-next-line
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select a Profile to Add to the Data Set Explorer"
        });

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([]);

        await extension.addSession(testTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No profiles detected");

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([]);
        await extension.addSession(testTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No profiles detected");

        showErrorMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockImplementationOnce(() => {
            throw (Error("testError"));
        });

        try {
            await extension.addSession(testTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("Unable to load all profiles: testError");

    });

    it("Testing that addJobsSession is executed successfully", async () => {
        showQuickPick.mockReset();

        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([{ name: "firstName" }, { name: "secondName" }]);
        await extension.addJobsSession(testJobsTree);

        // expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName", "secondName"]);
        // tslint:disable-next-line
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select a Profile to Add to the Jobs Explorer"
        });

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([]);

        await extension.addJobsSession(testJobsTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No more profiles to add");

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([]);
        await extension.addJobsSession(testJobsTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No more profiles to add");

        showErrorMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockImplementationOnce(() => {
            throw (Error("testError"));
        });

        try {
            await extension.addJobsSession(testJobsTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("Unable to load all profiles: testError");

    });

    it("Testing that createFile is executed successfully", async () => {
        showQuickPick.mockReset();
        getConfiguration.mockReset();
        showInputBox.mockReset();
        dataSetCreate.mockReset();

        getConfiguration.mockReturnValue("FakeConfig");
        showInputBox.mockReturnValueOnce("FakeName");


        showQuickPick.mockResolvedValueOnce("Data Set Binary");
        await extension.createFile(sessNode, testTree);
        showQuickPick.mockResolvedValueOnce("Data Set C");
        await extension.createFile(sessNode, testTree);
        showQuickPick.mockResolvedValueOnce("Data Set Classic");
        await extension.createFile(sessNode, testTree);
        showQuickPick.mockResolvedValueOnce("Data Set Partitioned");
        await extension.createFile(sessNode, testTree);
        showQuickPick.mockResolvedValueOnce("Data Set Sequential");
        await extension.createFile(sessNode, testTree);

        expect(showQuickPick.mock.calls.length).toBe(5);
        expect(getConfiguration.mock.calls.length).toBe(5);
        expect(getConfiguration.mock.calls[0][0]).toBe("Zowe-Default-Datasets-Binary");
        expect(getConfiguration.mock.calls[1][0]).toBe("Zowe-Default-Datasets-C");
        expect(getConfiguration.mock.calls[2][0]).toBe("Zowe-Default-Datasets-Classic");
        expect(getConfiguration.mock.calls[3][0]).toBe("Zowe-Default-Datasets-PDS");
        expect(getConfiguration.mock.calls[4][0]).toBe("Zowe-Default-Datasets-PS");
        expect(showInputBox.mock.calls.length).toBe(5);
        expect(dataSetCreate.mock.calls.length).toBe(5);
        expect(dataSetCreate.mock.calls[0][0]).toEqual(session);

        showQuickPick.mockReset();
        getConfiguration.mockReset();
        showInputBox.mockReset();
        dataSetCreate.mockReset();
        showInformationMessage.mockReset();
        showErrorMessage.mockReset();

        showQuickPick.mockResolvedValueOnce("Data Set Sequential");
        getConfiguration.mockReturnValue("FakeConfig");
        showInputBox.mockReturnValueOnce("FakeName");
        await extension.createFile(sessNode, testTree);

        showQuickPick.mockResolvedValueOnce("Data Set Sequential");
        getConfiguration.mockReturnValue("FakeConfig");
        showInputBox.mockReturnValueOnce("FakeName");
        dataSetCreate.mockRejectedValueOnce(Error("Generic Error"));
        try {
            await extension.createFile(sessNode, testTree);
        } catch (err) {
            // do nothing
        }

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("Generic Error");


        showQuickPick.mockReset();
        showErrorMessage.mockReset();

        showQuickPick.mockReturnValueOnce(undefined);
        try {
            await extension.createFile(sessNode, testTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls.length).toBe(0);
    });

    it("Testing that deleteDataset is executed successfully", async () => {
        existsSync.mockReset();
        unlinkSync.mockReset();
        showQuickPick.mockReset();

        let node = new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null);
        const parent = new ZoweNode("parent", vscode.TreeItemCollapsibleState.Collapsed, sessNode, null);
        let child = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        existsSync.mockReturnValueOnce(true);
        showQuickPick.mockResolvedValueOnce("Yes");
        await extension.deleteDataset(node, testTree);
        expect(delDataset.mock.calls.length).toBe(1);
        expect(delDataset.mock.calls[0][0]).toBe(session);
        expect(delDataset.mock.calls[0][1]).toBe(node.label);
        expect(existsSync.mock.calls.length).toBe(1);
        expect(existsSync.mock.calls[0][0]).toBe(path.join(extension.DS_DIR, node.label +
            "[" + node.getSessionNode().mLabel + "]"));
        expect(unlinkSync.mock.calls.length).toBe(1);
        expect(unlinkSync.mock.calls[0][0]).toBe(path.join(extension.DS_DIR, node.label +
            "[" + node.getSessionNode().mLabel + "]"));

        unlinkSync.mockReset();
        delDataset.mockReset();
        existsSync.mockReturnValueOnce(false);
        showQuickPick.mockResolvedValueOnce("Yes");
        await extension.deleteDataset(child, testTree);

        expect(unlinkSync.mock.calls.length).toBe(0);
        expect(delDataset.mock.calls[0][1]).toBe(child.mParent.mLabel + "(" + child.label + ")");

        delDataset.mockReset();
        delDataset.mockRejectedValueOnce(Error("not found"));
        showQuickPick.mockResolvedValueOnce("Yes");

        await extension.deleteDataset(node, testTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("Unable to find file: " + node.mLabel + " was probably already deleted.");

        delDataset.mockReset();
        showErrorMessage.mockReset();
        delDataset.mockRejectedValueOnce(Error(""));
        showQuickPick.mockResolvedValueOnce("Yes");

        await extension.deleteDataset(child, testTree);

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual(Error(""));

        showQuickPick.mockResolvedValueOnce("No");

        await extension.deleteDataset(child, testTree);

        existsSync.mockReturnValueOnce(true);
        node = new ZoweNode("node[sestest]", vscode.TreeItemCollapsibleState.None, sessNode, null);
        node.contextValue = "dsf";
        await extension.deleteDataset(node, testTree);

        existsSync.mockReturnValueOnce(true);
        node.contextValue = "pdsf";
        child = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, node, null);
        await extension.deleteDataset(child, testTree);
    });

    it("Testing that enterPattern is executed successfully", async () => {
        showInformationMessage.mockReset();
        showInputBox.mockReset();

        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null);
        node.pattern = "TEST";
        node.contextValue = "session";

        showInputBox.mockReturnValueOnce("test");
        await extension.enterPattern(node, testTree);

        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInputBox.mock.calls[0][0]).toEqual({
            prompt: "Search data sets by entering patterns: use a comma to separate multiple patterns",
            value: node.pattern
        });
        expect(showInformationMessage.mock.calls.length).toBe(0);

        showInputBox.mockReturnValueOnce("");
        showInputBox.mockReset();
        showInformationMessage.mockReset();
        await extension.enterPattern(node, testTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a pattern.");
    });

    it("Testing that saveFile is executed successfully", async () => {
        const testDoc: vscode.TextDocument = {
            fileName: path.join(extension.DS_DIR, "/testFile[sestest]"),
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

        const testResponse = {
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        };
        testTree.getChildren.mockReturnValueOnce([new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null), sessNode]);
        dataSetList.mockReset();
        showErrorMessage.mockReset();

        dataSetList.mockResolvedValueOnce(testResponse);

        await extension.saveFile(testDoc, testTree);

        expect(dataSetList.mock.calls.length).toBe(1);
        expect(dataSetList.mock.calls[0][0]).toEqual(session);
        expect(dataSetList.mock.calls[0][1]).toBe("testFile");
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("Data set failed to save. Data set may have been deleted on mainframe.");

        testResponse.apiResponse.items = ["Item1"];
        dataSetList.mockReset();
        pathToDataSet.mockReset();
        showErrorMessage.mockReset();

        testTree.getChildren.mockReturnValueOnce([sessNode]);
        dataSetList.mockResolvedValueOnce(testResponse);
        testResponse.success = true;
        pathToDataSet.mockResolvedValueOnce(testResponse);

        await extension.saveFile(testDoc, testTree);

        testTree.getChildren.mockReturnValueOnce([sessNode]);
        dataSetList.mockResolvedValueOnce(testResponse);
        testResponse.success = false;
        testResponse.commandResponse = "Save failed";
        pathToDataSet.mockResolvedValueOnce(testResponse);

        await extension.saveFile(testDoc, testTree);

        testTree.getChildren.mockReturnValueOnce([sessNode]);
        dataSetList.mockResolvedValueOnce(testResponse);
        pathToDataSet.mockRejectedValueOnce(Error("Test Error"));

        await extension.saveFile(testDoc, testTree);

        expect(dataSetList.mock.calls.length).toBe(3);
        expect(dataSetList.mock.calls[0][0]).toEqual(session);
        expect(dataSetList.mock.calls[0][1]).toBe("testFile");
        // expect(pathToDataSet.mock.calls.length).toBe(3);
        // expect(pathToDataSet.mock.calls[0][0]).toEqual(session);
        // expect(pathToDataSet.mock.calls[0][1]).toBe(testDoc.fileName);
        // expect(pathToDataSet.mock.calls[0][2]).toBe("testFile");
        // expect(showErrorMessage.mock.calls.length).toBe(3);
        // expect(showErrorMessage.mock.calls[0][0]).toBe("Save failed");
        // expect(showErrorMessage.mock.calls[1][0]).toBe("Test Error");

        const testDoc2: vscode.TextDocument = {
            fileName: path.normalize("testFile[sestest]"),
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

        testTree.getChildren.mockReturnValueOnce([sessNode]);
        dataSetList.mockReset();

        await extension.saveFile(testDoc2, testTree);

        expect(dataSetList.mock.calls.length).toBe(0);

        const testDoc3: vscode.TextDocument = {
            fileName: path.join(extension.DS_DIR, "/testFile(mem)[sestest]"),
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

        dataSetList.mockReset();
//        pathToDataSet.mockReset();
        showErrorMessage.mockReset();

        testTree.getChildren.mockReturnValueOnce([sessNode]);
        dataSetList.mockResolvedValueOnce(testResponse);
        testResponse.success = true;
//        pathToDataSet.mockResolvedValueOnce(testResponse);

        await extension.saveFile(testDoc3, testTree);

        // expect(pathToDataSet.mock.calls.length).toBe(1);
        // expect(pathToDataSet.mock.calls[0][0]).toEqual(session);
        // expect(pathToDataSet.mock.calls[0][1]).toBe(testDoc3.fileName);
        // expect(pathToDataSet.mock.calls[0][2]).toBe("testFile(mem)");

        testTree.getChildren.mockReturnValueOnce([new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null), sessNode]);
        dataSetList.mockReset();
        showErrorMessage.mockReset();

        dataSetList.mockImplementationOnce(() => {
            throw Error("Test Error");
        });

        await extension.saveFile(testDoc, testTree);

        expect(showErrorMessage.mock.calls.length).toBe(2);

    });

    it("Testing that refreshAll is executed successfully", async () => {
        extension.refreshAll(testTree);
    });

    it("Testing that openPS is executed successfully", async () => {
        dataSet.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        showErrorMessage.mockReset();
        existsSync.mockReset();

        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null);
        const parent = new ZoweNode("parent", vscode.TreeItemCollapsibleState.Collapsed, sessNode, null);
        const child = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        existsSync.mockReturnValue(null);
        openTextDocument.mockResolvedValueOnce("test doc");

        await extension.openPS(node);

        expect(existsSync.mock.calls.length).toBe(1);
        expect(existsSync.mock.calls[0][0]).toBe(path.join(extension.DS_DIR, node.mLabel +
            "[" + node.getSessionNode().mLabel + "]"));
        expect(dataSet.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls[0][0]).toBe(session);
        expect(dataSet.mock.calls[0][1]).toBe(node.mLabel);
        expect(dataSet.mock.calls[0][2]).toEqual({file: extension.getDocumentFilePath(node.mLabel, node)});
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(extension.getDocumentFilePath(node.mLabel, node));
        expect(showTextDocument.mock.calls.length).toBe(1);
        expect(showTextDocument.mock.calls[0][0]).toBe("test doc");

        openTextDocument.mockResolvedValueOnce("test doc");
        const node2 = new ZoweNode("node[sestest]", vscode.TreeItemCollapsibleState.None, sessNode, null);

        await extension.openPS(node2);

        dataSet.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        existsSync.mockReset();

        existsSync.mockReturnValue("exists");
        showTextDocument.mockRejectedValueOnce(Error("testError"));

        try {
            await extension.openPS(child);
        } catch (err) {
            // do nothing
        }

        expect(dataSet.mock.calls.length).toBe(0);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(extension.getDocumentFilePath(parent.mLabel + "(" + child.mLabel + ")", node));
        expect(showTextDocument.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("testError");

        const child2 = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, node2, null);
        try {
            await extension.openPS(child2);
        } catch (err) {
            // do nothing
        }

        openTextDocument.mockReset();
        showTextDocument.mockReset();
        parent.contextValue = "pdsf";
        await extension.openPS(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(showTextDocument.mock.calls.length).toBe(1);

        showTextDocument.mockReset();
        openTextDocument.mockReset();

        parent.contextValue = "favorite";
        await extension.openPS(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(showTextDocument.mock.calls.length).toBe(1);

        showErrorMessage.mockReset();
    });

    it("Testing that safeSave is executed successfully", async () => {
        dataSet.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        showInformationMessage.mockReset();

        const node = new ZoweNode("node", vscode.TreeItemCollapsibleState.None, sessNode, null);
        const parent = new ZoweNode("parent", vscode.TreeItemCollapsibleState.Collapsed, sessNode, null);
        const child = new ZoweNode("child", vscode.TreeItemCollapsibleState.None, parent, null);

        openTextDocument.mockResolvedValueOnce("test");

        await extension.safeSave(node);

        expect(dataSet.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls[0][0]).toBe(session);
        expect(dataSet.mock.calls[0][1]).toBe(node.mLabel);
        expect(dataSet.mock.calls[0][2]).toEqual({file: extension.getDocumentFilePath(node.mLabel, node)});
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(path.join(extension.DS_DIR, node.mLabel +
            "[" + node.getSessionNode().mLabel + "]"));
        expect(showTextDocument.mock.calls.length).toBe(1);
        expect(showTextDocument.mock.calls[0][0]).toBe("test");
        expect(save.mock.calls.length).toBe(1);

        dataSet.mockReset();
        dataSet.mockRejectedValueOnce(Error("not found"));

        await extension.safeSave(node);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("Unable to find file: " + node.mLabel + " was probably deleted.");

        dataSet.mockReset();
        showErrorMessage.mockReset();
        dataSet.mockRejectedValueOnce(Error(""));

        await extension.safeSave(child);

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("");

        openTextDocument.mockResolvedValueOnce("test");
        openTextDocument.mockResolvedValueOnce("test");

        dataSet.mockReset();
        openTextDocument.mockReset();
        node.contextValue = "dsf";
        await extension.safeSave(node);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        dataSet.mockReset();
        openTextDocument.mockReset();
        parent.contextValue = "pdsf";
        await extension.safeSave(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        dataSet.mockReset();
        openTextDocument.mockReset();
        parent.contextValue = "favorite";
        await extension.safeSave(child);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(dataSet.mock.calls.length).toBe(1);

        showErrorMessage.mockReset();
        dataSet.mockReset();
        openTextDocument.mockReset();
        parent.contextValue = "turnip";
        await extension.safeSave(child);
        expect(openTextDocument.mock.calls.length).toBe(0);
        expect(dataSet.mock.calls.length).toBe(0);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("safeSave() called from invalid node.");
    });

    it("Testing that refreshUSS correctly executes with and without error", async () => {
        const node = new ZoweUSSNode("node", vscode.TreeItemCollapsibleState.None, ussNode, null, null);
        const parent = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, ussNode, null, null);
        const child = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None, parent, null, null);

        showErrorMessage.mockReset();
        openTextDocument.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        ussFile.mockReset();
        showTextDocument.mockReset();
        executeCommand.mockReset();

        await extension.refreshUSS(node);

        expect(ussFile.mock.calls.length).toBe(1);
        expect(ussFile.mock.calls[0][0]).toBe(node.getSession());
        expect(ussFile.mock.calls[0][1]).toBe(node.fullPath);
        expect(ussFile.mock.calls[0][2]).toEqual({
            file: extension.getUSSDocumentFilePath(node)
        });
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(path.join(extension.getUSSDocumentFilePath(node)));
        expect(showTextDocument.mock.calls.length).toBe(2);
        expect(executeCommand.mock.calls.length).toBe(1);


        showInformationMessage.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: false});
        executeCommand.mockReset();

        await extension.refreshUSS(node);

        expect(executeCommand.mock.calls.length).toBe(0);

        ussFile.mockRejectedValueOnce(Error("not found"));
        showInformationMessage.mockReset();

        await extension.refreshUSS(node);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("Unable to find file: " + node.mLabel + " was probably deleted.");

        showErrorMessage.mockReset();
        ussFile.mockReset();
        ussFile.mockRejectedValueOnce(Error(""));

        await extension.refreshUSS(child);

        expect(ussFile.mock.calls[0][1]).toBe(child.fullPath);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual(Error(""));

        showErrorMessage.mockReset();
        openTextDocument.mockReset();
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        openTextDocument.mockResolvedValueOnce({isDirty: true});
        ussFile.mockReset();
        showTextDocument.mockReset();

        node.contextValue = "file";
        await extension.refreshUSS(node);

        node.contextValue = "directory";
        await extension.refreshUSS(child);

        ussFile.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        existsSync.mockReset();
        showErrorMessage.mockReset();

        const badparent = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, ussNode, null, null);
        badparent.contextValue = "turnip";
        const brat = new ZoweUSSNode("brat", vscode.TreeItemCollapsibleState.None, badparent, null, null);
        try {
            await extension.refreshUSS(brat);
// tslint:disable-next-line: no-empty
        } catch (err) {
        }
        expect(ussFile.mock.calls.length).toBe(0);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("refreshUSS() called from invalid node.");
    });

    it("Testing that addSession is executed correctly for a USS explorer", async () => {
        showQuickPick.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();

        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([{name: "firstName"}, {name: "secondName"}]);

        await extension.addUSSSession(testTree);

        expect((profileLoader.loadAllProfiles as any).mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls.length).toBe(1);
        expect(showQuickPick.mock.calls[0][0]).toEqual(["firstName","secondName"]);
        expect(showQuickPick.mock.calls[0][1]).toEqual({
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select a Profile to Add to the USS Explorer"
        });

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([]);

        await extension.addSession(testTree);

        expect((profileLoader.loadAllProfiles as any).mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No profiles detected");

        showInformationMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([{name: "sestest"}]);

        await extension.addSession(testTree);

        expect((profileLoader.loadAllProfiles as any).mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual("No more profiles to add");

        showErrorMessage.mockReset();
        (profileLoader.loadAllProfiles as any).mockImplementationOnce(() => {
            throw (Error("testError"));
        });

        try {
            await extension.addSession(testTree);
            // tslint:disable-next-line:no-empty
        } catch (err) {
        }

        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toEqual("Unable to load all profiles: testError");

    });

    it("Testing that enterPattern is executed successfully", async () => {
        showInformationMessage.mockReset();
        showInputBox.mockReset();

        const node = new ZoweUSSNode("node", vscode.TreeItemCollapsibleState.None, ussNode, null, null);
        node.fullPath = "/u/test";
        node.contextValue = "uss_session";

        showInputBox.mockReturnValueOnce("/u/test");
        await extension.enterUSSPattern(node, testTree);

        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInputBox.mock.calls[0][0]).toEqual({
            prompt: "Search Unix System Services (USS) by entering a path name starting with a /",
            value: node.fullPath
        });
        expect(showInformationMessage.mock.calls.length).toBe(0);

        showInputBox.mockReturnValueOnce("");
        showInputBox.mockReset();
        showInformationMessage.mockReset();
        await extension.enterUSSPattern(node, testTree);

        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toBe("You must enter a path.");
    });

    it("Testing that refreshAllUSS is executed successfully", async () => {
        const spy = jest.fn(testTree.refresh);
        extension.refreshAllUSS(testTree);
        expect(testTree.refresh).toHaveBeenCalled();
    });

    it("Testing that open is executed successfully", async () => {
        ussFile.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        showErrorMessage.mockReset();
        existsSync.mockReset();

        const node = new ZoweUSSNode("node", vscode.TreeItemCollapsibleState.None, ussNode, null, "/");
        const parent = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, ussNode, null, "/");
        const child = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None, parent, null, "/parent");

        existsSync.mockReturnValue(null);
        openTextDocument.mockResolvedValueOnce("test.doc");

        await extension.openUSS(node);

        expect(existsSync.mock.calls.length).toBe(1);
        expect(existsSync.mock.calls[0][0]).toBe(path.join(extension.USS_DIR, "/" + node.getSessionNode().mProfileName + "/", node.fullPath));
        expect(ussFile.mock.calls.length).toBe(1);
        expect(ussFile.mock.calls[0][0]).toBe(session);
        expect(ussFile.mock.calls[0][1]).toBe(node.fullPath);
        expect(ussFile.mock.calls[0][2]).toEqual({file: extension.getUSSDocumentFilePath(node), binary: node.binary});
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(extension.getUSSDocumentFilePath(node));
        expect(showTextDocument.mock.calls.length).toBe(1);
        expect(showTextDocument.mock.calls[0][0]).toBe("test.doc");

        openTextDocument.mockResolvedValueOnce("test.doc");
        const node2 = new ZoweUSSNode("usstest", vscode.TreeItemCollapsibleState.None, ussNode, null, null);

        await extension.openUSS(node2);

        ussFile.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        existsSync.mockReset();

        existsSync.mockReturnValue("exists");
        showTextDocument.mockRejectedValueOnce(Error("testError"));

        try {
            await extension.openUSS(child);
        } catch (err) {
            // do nothing
        }

        expect(ussFile.mock.calls.length).toBe(0);
        expect(openTextDocument.mock.calls.length).toBe(1);
        expect(openTextDocument.mock.calls[0][0]).toBe(extension.getUSSDocumentFilePath(child));
        expect(showTextDocument.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("testError");

        const child2 = new ZoweUSSNode("child", vscode.TreeItemCollapsibleState.None, node2, null, null);
        try {
            await extension.openUSS(child2);
        } catch (err) {
            // do nothing
        }

        ussFile.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        existsSync.mockReset();
        showErrorMessage.mockReset();

        const badparent = new ZoweUSSNode("parent", vscode.TreeItemCollapsibleState.Collapsed, ussNode, null, null);
        badparent.contextValue = "turnip";
        const brat = new ZoweUSSNode("brat", vscode.TreeItemCollapsibleState.None, badparent, null, null);
        try {
            await extension.openUSS(brat);
// tslint:disable-next-line: no-empty
        } catch (err) {
        }
        expect(ussFile.mock.calls.length).toBe(0);
        expect(showErrorMessage.mock.calls.length).toBe(2);
        expect(showErrorMessage.mock.calls[0][0]).toBe("open() called from invalid node.");
        expect(showErrorMessage.mock.calls[1][0]).toBe("open() called from invalid node.");
    });

    it("Tests that openUSS executes successfully with favorited files", async () => {
        ussFile.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();

        openTextDocument.mockResolvedValueOnce("test.doc");

        // Set up mock favorite session
        const favoriteSession = new ZoweUSSNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, null, session, null);
        favoriteSession.contextValue = "favorite";

        // Set up favorited nodes (directly under Favorites)
        const favoriteFile = new ZoweUSSNode("favFile", vscode.TreeItemCollapsibleState.None, favoriteSession, null, "/");
        favoriteFile.contextValue = "textfilef";
        const favoriteParent = new ZoweUSSNode("favParent", vscode.TreeItemCollapsibleState.Collapsed, favoriteSession, null, "/");
        favoriteParent.contextValue = "directoryf";
        // Set up child of favoriteDir - make sure we can open the child of a favorited directory
        const child = new ZoweUSSNode("favChild", vscode.TreeItemCollapsibleState.Collapsed, favoriteParent, null, "/favDir");
        child.contextValue = "textfile";

        // For each node, make sure that code below the log.debug statement is execute
        await extension.openUSS(favoriteFile);
        expect(showTextDocument.mock.calls.length).toBe(1);
        showTextDocument.mockReset();

        await extension.openUSS(child);
        expect(showTextDocument.mock.calls.length).toBe(1);
        showTextDocument.mockReset();
    });

    it("Testing that saveUSSFile is executed successfully", async () => {
        const testDoc: vscode.TextDocument = {
            fileName: path.join(extension.USS_DIR, "testFile"),
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

        const testResponse = {
            success: true,
            commandResponse: "",
            apiResponse: {
                items: []
            }
        };
        testUSSTree.getChildren.mockReturnValueOnce([
            new ZoweUSSNode("testFile", vscode.TreeItemCollapsibleState.None, ussNode, null, "/"), sessNode]);

        testResponse.apiResponse.items = ["Item1"];
        fileToUSSFile.mockReset();
        showErrorMessage.mockReset();

        testResponse.success = true;
        fileToUSSFile.mockResolvedValueOnce(testResponse);
        withProgress.mockReturnValueOnce(testResponse);

        await extension.saveUSSFile(testDoc, testUSSTree);

        testResponse.success = false;
        testResponse.commandResponse = "Save failed";
        fileToUSSFile.mockResolvedValueOnce(testResponse);
        withProgress.mockReturnValueOnce(testResponse);

        await extension.saveUSSFile(testDoc, testUSSTree);

        fileToUSSFile.mockRejectedValueOnce(Error("Test Error"));
        showErrorMessage.mockReset();
        withProgress.mockRejectedValueOnce(Error("Test Error"));

        await extension.saveUSSFile(testDoc, testUSSTree);
        expect(showErrorMessage.mock.calls.length).toBe(1);
        expect(showErrorMessage.mock.calls[0][0]).toBe("Test Error");

        const testDoc2: vscode.TextDocument = {
            fileName: path.normalize("testFile[sestest]"),
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

        testUSSTree.getChildren.mockReturnValueOnce([sessNode]);

        await extension.saveUSSFile(testDoc2, testUSSTree);

        const testDoc3: vscode.TextDocument = {
            fileName: path.join(extension.DS_DIR, "/testFile(mem)[sestest]"),
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

        fileToUSSFile.mockReset();
        showErrorMessage.mockReset();

        testUSSTree.getChildren.mockReturnValueOnce([sessNode]);
        testResponse.success = true;
        fileToUSSFile.mockResolvedValueOnce(testResponse);

        await extension.saveUSSFile(testDoc3, testUSSTree);
    });

    it("tests that the prefix is set correctly on the job", async () => {
        showInformationMessage.mockReset();
        showInputBox.mockReset();

        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null, session, null);

        showInputBox.mockReturnValueOnce("*");
        await extension.setPrefix(node, testJobsTree);

        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInputBox.mock.calls[0][0]).toEqual({
            prompt: "Prefix"
        });
        expect(showInformationMessage.mock.calls.length).toBe(0);
    });

    it("tests that the owner is set correctly on the job", async () => {
        showInformationMessage.mockReset();
        showInputBox.mockReset();

        const node = new Job("job", vscode.TreeItemCollapsibleState.None, null, session, iJob);

        showInputBox.mockReturnValueOnce("OWNER");
        await extension.setOwner(node, testJobsTree);

        expect(showInputBox.mock.calls.length).toBe(1);
        expect(showInputBox.mock.calls[0][0]).toEqual({
            prompt: "Owner",
        });
        expect(showInformationMessage.mock.calls.length).toBe(0);
    });

    it("tests that the user is informed when a job is deleted", async () => {
        showInformationMessage.mockReset();
        await extension.deleteJob(jobNode);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual(
            `Job ${jobNode.job.jobname}(${jobNode.job.jobid}) deleted`
        );
    });

    it("tests that the spool content is opened in a new document", async () => {
        showTextDocument.mockReset();
        await extension.getSpoolContent(session, iJobFile);
        expect(showTextDocument.mock.calls.length).toBe(1);
    });

    it("tests that a stop command is issued", async () => {
        showInformationMessage.mockReset();
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});
        await extension.stopCommand(jobNode);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual(
            "Command response: fake response"
        );
    });

    it("tests that a modify command is issued", async () => {
        showInformationMessage.mockReset();
        showInputBox.mockReset();
        showInputBox.mockReturnValue("modify");
        issueSimple.mockReturnValueOnce({commandResponse: "fake response"});
        await extension.modifyCommand(jobNode);
        expect(showInformationMessage.mock.calls.length).toBe(1);
        expect(showInformationMessage.mock.calls[0][0]).toEqual(
            "Command response: fake response"
        );
    });

    it("tests that the spool is downloaded", async () => {
        const fileUri = {fsPath: "/tmp/foo"};
        showOpenDialog.mockReturnValue([fileUri]);
        await extension.downloadSpool(jobNode);
        expect(showOpenDialog).toBeCalled();
        expect(downloadAllSpoolContentCommon).toBeCalled();
        expect(downloadAllSpoolContentCommon.mock.calls[0][0]).toEqual(jobNode.session);
        expect(downloadAllSpoolContentCommon.mock.calls[0][1]).toEqual(
            {
                jobid: jobNode.job.jobid,
                jobname: jobNode.job.jobname,
                outDir: fileUri.fsPath
            }
        );
    });

    it("tests that the jcl is downloaded", async () => {
        getJclForJob.mockReset();
        openTextDocument.mockReset();
        showTextDocument.mockReset();
        await extension.downloadJcl(jobNode);
        expect(getJclForJob).toBeCalled();
        expect(openTextDocument).toBeCalled();
        expect(showTextDocument).toBeCalled();
    });

    it("tests that the jcl is submitted", async () => {
        (profileLoader.loadAllProfiles as any).mockReset();
        (profileLoader.loadAllProfiles as any).mockReturnValueOnce([{ name: "firstName" }, { name: "secondName" }]);
        createBasicZosmfSession.mockReturnValue(session);
        submitJcl.mockReturnValue(iJob);
        await extension.submitJcl(testTree);
        expect(submitJcl).toBeCalled();
        expect(showInformationMessage).toBeCalled();
    });

    it("Tests that temp folder handles default preference", () => {
        mkdirSync.mockReset();
        moveSync.mockReset();

        const originalPreferencePath = "";
        const updatedPreferencePath = "/testing";
        const defaultPreference = extension.BRIGHTTEMPFOLDER;

        extension.moveTempFolder(originalPreferencePath, updatedPreferencePath);

        expect(mkdirSync.mock.calls.length).toBe(3);
        expect(mkdirSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(moveSync.mock.calls.length).toBe(1);
        expect(moveSync.mock.calls[0][0]).toBe(defaultPreference);
        expect(moveSync.mock.calls[0][1]).toBe("/testing/temp");
    });

    it("Tests that temp folder is moved successfully", () => {
        mkdirSync.mockReset();
        moveSync.mockReset();

        const originalPreferencePath = "/test/path";
        const updatedPreferencePath = "/new/test/path";

        extension.moveTempFolder(originalPreferencePath, updatedPreferencePath);

        expect(mkdirSync.mock.calls.length).toBe(3);
        expect(mkdirSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(moveSync.mock.calls.length).toBe(1);
        expect(moveSync.mock.calls[0][0]).toBe("/test/path/temp");
        expect(moveSync.mock.calls[0][1]).toBe("/new/test/path/temp");
    });

    it("Tests that temp folder does not update on duplicate preference", () => {
        mkdirSync.mockReset();
        moveSync.mockReset();

        const originalPreferencePath = "/test/path";
        const updatedPreferencePath = "/test/path";

        extension.moveTempFolder(originalPreferencePath, updatedPreferencePath);

        expect(mkdirSync.mock.calls.length).toBe(3);
        expect(mkdirSync.mock.calls[0][0]).toBe(extension.BRIGHTTEMPFOLDER);
        expect(moveSync.mock.calls.length).toBe(0);
    });
});
