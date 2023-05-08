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

import * as fs from "fs";
import * as crypto from "crypto";
import * as tmp from "tmp";
import * as zowe from "@zowe/cli";
import * as path from "path";

import { CreateDataSetTypeEnum, IUploadOptions } from "@zowe/zos-files-for-zowe-sdk";

import { Gui, MessageSeverity, ZoweExplorerApi } from "@zowe/zowe-explorer-api";
import { DataSetUtils, TRANSFER_TYPE_ASCII, TRANSFER_TYPE_BINARY } from "@zowe/zos-ftp-for-zowe-cli";
import { AbstractFtpApi } from "./ZoweExplorerAbstractFtpApi";
import { ZoweLogger } from "./extension";
// The Zowe FTP CLI plugin is written and uses mostly JavaScript, so relax the rules here.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const MAX_MEMBER_NAME_LEN = 8;

export class FtpMvsApi extends AbstractFtpApi implements ZoweExplorerApi.IMvs {
    public async dataSet(filter: string, _options?: zowe.IListOptions): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        const session = this.getSession(this.profile);
        if (session.mvsListConnection === undefined || session.mvsListConnection.connected === false) {
            session.mvsListConnection = await this.ftpClient(this.checkedProfile());
        }
        if (session.mvsListConnection.connected === true) {
            const response = await DataSetUtils.listDataSets(session.mvsListConnection, filter);
            if (response) {
                result.success = true;
                result.apiResponse.items = response.map((element) => ({
                    dsname: element.dsname,
                    dsorg: element.dsorg,
                    volume: element.volume,
                    recfm: element.recfm,
                    blksz: element.blksz,
                    lrecl: element.lrecl,
                    migr: element.volume && (element.volume as string).toUpperCase() === "MIGRATED" ? "YES" : "NO",
                }));
            }
        }
        return result;
    }

    public async allMembers(dataSetName: string, _options?: zowe.IListOptions): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection) {
                const response = await DataSetUtils.listMembers(connection, dataSetName);
                if (response) {
                    result.success = true;
                    result.apiResponse.items = response.map((element) => ({
                        member: element.name,
                        changed: element.changed,
                        created: element.created,
                        id: element.id,
                    }));
                }
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async getContents(dataSetName: string, options: zowe.IDownloadOptions): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        const targetFile = options.file;
        const transferOptions = {
            transferType: options.binary ? TRANSFER_TYPE_BINARY : TRANSFER_TYPE_ASCII,
            localFile: targetFile,
            encoding: options.encoding,
        };
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection && targetFile) {
                zowe.imperative.IO.createDirsSyncFromFilePath(targetFile);
                await DataSetUtils.downloadDataSet(connection, dataSetName, transferOptions);
                result.success = true;
                result.commandResponse = "";
                result.apiResponse.etag = await this.hashFile(targetFile);
            } else {
                ZoweLogger.logImperativeMessage(result.commandResponse, MessageSeverity.ERROR);
                await Gui.errorMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async putContents(inputFilePath: string, dataSetName: string, options: IUploadOptions): Promise<zowe.IZosFilesResponse> {
        const transferOptions = {
            transferType: options.binary ? TRANSFER_TYPE_BINARY : TRANSFER_TYPE_ASCII,
            localFile: inputFilePath,
            encoding: options.encoding,
        };
        const file = path.basename(inputFilePath).replace(/[^a-z0-9]+/gi, "");
        const member = file.substr(0, MAX_MEMBER_NAME_LEN);
        let targetDataset: string;
        const end = dataSetName.indexOf("(");
        let dataSetNameWithoutMember: string;
        if (end > 0) {
            dataSetNameWithoutMember = dataSetName.substr(0, end);
        } else {
            dataSetNameWithoutMember = dataSetName;
        }
        const dsAtrribute = await this.dataSet(dataSetNameWithoutMember);
        const dsorg = dsAtrribute.apiResponse.items[0].dsorg;
        if (dsorg === "PS" || dataSetName.substr(dataSetName.length - 1) == ")") {
            targetDataset = dataSetName;
        } else {
            targetDataset = dataSetName + "(" + member + ")";
        }
        const result = this.getDefaultResponse();
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (!connection) {
                ZoweLogger.logImperativeMessage(result.commandResponse, MessageSeverity.ERROR);
                throw new Error(result.commandResponse);
            }
            // Save-Save with FTP requires loading the file first
            if (options.returnEtag && options.etag) {
                const contentsTag = await this.getContentsTag(dataSetName);
                if (contentsTag && contentsTag !== options.etag) {
                    // TODO: extension.ts should not check for zosmf errors.
                    await Gui.errorMessage("Save conflict. Please pull the latest content from mainframe first.", {
                        logger: ZoweLogger,
                    });
                    throw new Error();
                }
            }
            const lrecl: number = dsAtrribute.apiResponse.items[0].lrecl;
            const data = fs.readFileSync(inputFilePath, { encoding: "utf8" });
            const lines = data.split(/\r?\n/);
            const foundIndex = lines.findIndex((line) => line.length > lrecl);
            if (foundIndex !== -1) {
                const message1 = `zftp Warning: At least one line, like line ${foundIndex + 1},
                is longer than dataset LRECL, ${lrecl}.`;
                const message2 = "The exceeding part will be truncated.";
                const message3 = "Do you want to continue?";
                const warningMessage = `${message1} ${message2}\n${message3}`;
                const select = await Gui.warningMessage(warningMessage, {
                    items: ["Yes", "No"],
                });
                if (select === "No") {
                    result.commandResponse = "";
                    return result;
                }
            }
            await DataSetUtils.uploadDataSet(connection, targetDataset, transferOptions);
            result.success = true;
            if (options.returnEtag) {
                const contentsTag = await this.getContentsTag(dataSetName);
                result.apiResponse = [
                    {
                        etag: contentsTag,
                    },
                ];
            }
            result.commandResponse = "Data set uploaded successfully.";
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async createDataSet(
        dataSetType: CreateDataSetTypeEnum,
        dataSetName: string,
        options?: Partial<zowe.ICreateDataSetOptions>
    ): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        const dcbList = [];
        if (options?.alcunit) {
            dcbList.push(`ALCUNIT=${options.alcunit}`);
        }
        if (options?.blksize) {
            dcbList.push(`BLKSIZE=${options.blksize}`);
        }
        if (options?.dirblk) {
            dcbList.push(`DIRECTORY=${options.dirblk}`);
        }
        if (options?.dsorg) {
            dcbList.push(`DSORG=${options.dsorg}`);
        }
        if (options?.lrecl) {
            dcbList.push(`LRECL=${options.lrecl}`);
        }
        if (options?.primary) {
            dcbList.push(`PRIMARY=${options.primary}`);
        }
        if (options?.recfm) {
            dcbList.push(`RECFM=${options.recfm}`);
        }
        if (options?.secondary) {
            dcbList.push(`SECONDARY=${options.secondary}`);
        }
        const dcb = dcbList.join(" ");
        const allocateOptions = {
            dcb: dcb,
        };
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection) {
                await DataSetUtils.allocateDataSet(connection, dataSetName, allocateOptions);
                result.success = true;
                result.commandResponse = "Data set created successfully.";
            } else {
                await Gui.errorMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async createDataSetMember(dataSetName: string, options?: IUploadOptions): Promise<zowe.IZosFilesResponse> {
        const transferOptions = {
            transferType: options ? TRANSFER_TYPE_BINARY : TRANSFER_TYPE_ASCII,
            content: "",
            encoding: options.encoding,
        };
        const result = this.getDefaultResponse();
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (!connection) {
                await Gui.errorMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }

            await DataSetUtils.uploadDataSet(connection, dataSetName, transferOptions);
            result.success = true;
            result.commandResponse = "Member created successfully.";
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async allocateLikeDataSet(_dataSetName: string, _likeDataSetName: string): Promise<zowe.IZosFilesResponse> {
        await Gui.errorMessage("Allocate like data set is not supported in ftp extension.", { logger: ZoweLogger });
        throw new Error();
    }

    public async copyDataSetMember(
        { dsn: _fromDataSetName, member: _fromMemberName }: zowe.IDataSet,
        { dsn: _toDataSetName, member: _toMemberName }: zowe.IDataSet,
        _options?: { replace?: boolean }
    ): Promise<zowe.IZosFilesResponse> {
        await Gui.errorMessage("Copy data set is not supported in ftp extension.", { logger: ZoweLogger });
        throw new Error();
    }

    public async copyDataSet(_fromDataSetName: string, _toDataSetName: string, _enq?: string, _replace?: boolean): Promise<zowe.IZosFilesResponse> {
        await Gui.errorMessage("Copy data set is not supported in ftp extension.", { logger: ZoweLogger });
        throw new Error();
    }

    public async renameDataSet(currentDataSetName: string, newDataSetName: string): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection) {
                await DataSetUtils.renameDataSet(connection, currentDataSetName, newDataSetName);
                result.success = true;
                result.commandResponse = "Rename completed successfully.";
            } else {
                await Gui.errorMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async renameDataSetMember(dataSetName: string, currentMemberName: string, newMemberName: string): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        const currentName = dataSetName + "(" + currentMemberName + ")";
        const newName = dataSetName + "(" + newMemberName + ")";
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection) {
                await DataSetUtils.renameDataSet(connection, currentName, newName);
                result.success = true;
                result.commandResponse = "Rename completed successfully.";
            } else {
                await Gui.infoMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    public async hMigrateDataSet(_dataSetName: string): Promise<zowe.IZosFilesResponse> {
        await Gui.errorMessage("Migrate data set is not supported in ftp extension.", { logger: ZoweLogger });
        throw new Error();
    }

    public async hRecallDataSet(_dataSetName: string): Promise<zowe.IZosFilesResponse> {
        await Gui.errorMessage("Recall data set is not supported in ftp extension.", { logger: ZoweLogger });
        throw new Error();
    }
    public async deleteDataSet(dataSetName: string, _options?: zowe.IDeleteDatasetOptions): Promise<zowe.IZosFilesResponse> {
        const result = this.getDefaultResponse();
        let connection;
        try {
            connection = await this.ftpClient(this.checkedProfile());
            if (connection) {
                await DataSetUtils.deleteDataSet(connection, dataSetName);
                result.success = true;
                result.commandResponse = "Delete completed successfully.";
            } else {
                await Gui.errorMessage(result.commandResponse, { logger: ZoweLogger });
                throw new Error();
            }
            return result;
        } finally {
            this.releaseConnection(connection);
        }
    }

    private async getContentsTag(dataSetName: string): Promise<string> {
        const tmpFileName = tmp.tmpNameSync();
        const options: zowe.IDownloadOptions = {
            binary: false,
            file: tmpFileName,
        };
        const loadResult = await this.getContents(dataSetName, options);
        const etag: string = loadResult.apiResponse.etag;
        return etag;
    }
    private getDefaultResponse(): zowe.IZosFilesResponse {
        return {
            success: false,
            commandResponse: "Could not get a valid FTP connection.",
            apiResponse: {},
        };
    }

    private hashFile(filename: string): Promise<string> {
        return new Promise((resolve) => {
            const hash = crypto.createHash("sha1");
            const input = fs.createReadStream(filename);
            input.on("readable", () => {
                const data = input.read();
                if (data) {
                    hash.update(data as unknown as crypto.BinaryLike);
                } else {
                    resolve(`${hash.digest("hex")}`);
                }
            });
        });
    }
}
