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

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

import { FtpUssApi } from "../../../src/ZoweExplorerFtpUssApi";
import { UssUtils } from "@zowe/zos-ftp-for-zowe-cli";
import TestUtils from "../utils/TestUtils";
import * as zowe from "@zowe/cli";

// two methods to mock modules: create a __mocks__ file for zowe-explorer-api.ts and direct mock for extension.ts
jest.mock("../../../__mocks__/@zowe/zowe-explorer-api.ts");
jest.mock("../../../src/extension.ts");

const stream = require("stream");
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
const readableStream = stream.Readable.from([]);
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
fs.createReadStream = jest.fn().mockReturnValue(readableStream);
const UssApi = new FtpUssApi();

describe("FtpUssApi", () => {
    beforeAll(() => {
        UssApi.checkedProfile = jest.fn().mockReturnValue({ message: "success", type: "zftp", failNotFound: false });
        UssApi.ftpClient = jest.fn().mockReturnValue({ host: "", user: "", password: "", port: "" });
        UssApi.releaseConnection = jest.fn();
    });

    it("should list uss files.", async () => {
        const response = [
            { name: "file1", size: "123" },
            { name: "dir1", size: "456" },
        ];
        UssUtils.listFiles = jest.fn().mockReturnValue(response);
        const mockParams = {
            ussFilePath: "/a/b/c",
        };
        const result = await UssApi.fileList(mockParams.ussFilePath);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(result.apiResponse.items[0].name).toContain("file1");
        expect(UssUtils.listFiles).toBeCalledTimes(1);
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should view uss files.", async () => {
        const localFile = "/tmp/testfile1.txt";
        const response = TestUtils.getSingleLineStream();
        UssUtils.downloadFile = jest.fn().mockReturnValue(response);

        const mockParams = {
            ussFilePath: "/a/b/c.txt",
            options: {
                file: localFile,
            },
        };
        const result = await UssApi.getContents(mockParams.ussFilePath, mockParams.options);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(result.apiResponse.etag).toHaveLength(40);
        expect(UssUtils.downloadFile).toBeCalledTimes(1);
        expect(UssApi.releaseConnection).toBeCalled();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        expect(response._readableState.buffer.head.data.toString()).toContain("Hello world");
    });

    it("should upload uss files.", async () => {
        const localFile = "/tmp/testfile1.txt";
        const response = TestUtils.getSingleLineStream();
        UssUtils.uploadFile = jest.fn().mockReturnValue(response);
        UssApi.getContents = jest.fn().mockReturnValue({ apiResponse: { etag: "123" } });
        const mockParams = {
            inputFilePath: localFile,
            ussFilePath: "/a/b/c.txt",
            etag: "123",
            returnEtag: true,
            options: {
                file: localFile,
            },
        };
        const result = await UssApi.putContents(mockParams.inputFilePath, mockParams.ussFilePath);
        expect(result.commandResponse).toContain("File updated.");
        expect(UssUtils.downloadFile).toBeCalledTimes(1);
        expect(UssUtils.uploadFile).toBeCalledTimes(1);
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should upload uss directory.", async () => {
        const localpath = "/tmp";
        const files = ["file1", "file2"];
        zowe.ZosFilesUtils.getFileListFromPath = jest.fn().mockReturnValue(files);
        const mockParams = {
            inputDirectoryPath: localpath,
            ussDirectoryPath: "/a/b/c",
            options: {},
        };
        const response = {};
        UssApi.putContents = jest.fn().mockReturnValue(response);
        await UssApi.uploadDirectory(mockParams.inputDirectoryPath, mockParams.ussDirectoryPath, mockParams.options);
        expect(UssApi.putContents).toBeCalledTimes(2);
    });

    it("should create uss directory.", async () => {
        UssUtils.makeDirectory = jest.fn();
        UssUtils.uploadFile = jest.fn();
        const mockParams = {
            ussPath: "/a/b/c",
            type: "directory",
        };
        const result = await UssApi.create(mockParams.ussPath, mockParams.type);
        expect(result.commandResponse).toContain("Directory or file created.");
        expect(UssUtils.makeDirectory).toBeCalledTimes(1);
        expect(UssUtils.uploadFile).not.toBeCalled;
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should create uss file.", async () => {
        UssUtils.makeDirectory = jest.fn();
        UssUtils.uploadFile = jest.fn();
        const mockParams = {
            ussPath: "/a/b/c",
            type: "file",
        };
        const result = await UssApi.create(mockParams.ussPath, mockParams.type);
        expect(result.commandResponse).toContain("Directory or file created.");
        expect(UssUtils.uploadFile).toBeCalledTimes(1);
        expect(UssUtils.makeDirectory).not.toBeCalled;
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should delete uss directory with recursive.", async () => {
        UssUtils.deleteDirectory = jest.fn();
        UssUtils.deleteFile = jest.fn();
        const mockParams = {
            ussPath: "/a/b/c",
            recursive: true,
        };
        const result = await UssApi.delete(mockParams.ussPath, mockParams.recursive);
        expect(result.commandResponse).toContain("Delete completed.");
        expect(UssUtils.deleteDirectory).toBeCalledTimes(1);
        expect(UssUtils.deleteFile).not.toBeCalled;
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should delete uss file.", async () => {
        UssUtils.deleteDirectory = jest.fn();
        UssUtils.deleteFile = jest.fn();
        const mockParams = {
            ussPath: "/a/b/c",
            recursive: false,
        };
        const result = await UssApi.delete(mockParams.ussPath, mockParams.recursive);
        expect(result.commandResponse).toContain("Delete completed.");
        expect(UssUtils.deleteFile).toBeCalledTimes(1);
        expect(UssUtils.deleteDirectory).not.toBeCalled;
        expect(UssApi.releaseConnection).toBeCalled();
    });

    it("should rename uss file or directory.", async () => {
        UssUtils.renameFile = jest.fn();
        const mockParams = {
            currentUssPath: "/a/b/c",
            newUssPath: "/d/e/f",
        };
        const result = await UssApi.rename(mockParams.currentUssPath, mockParams.newUssPath);
        expect(result.commandResponse).toContain("Rename completed.");
        expect(UssUtils.renameFile).toBeCalledTimes(1);
        expect(UssApi.releaseConnection).toBeCalled();
    });
});
