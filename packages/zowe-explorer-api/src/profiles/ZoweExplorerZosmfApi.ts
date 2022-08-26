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

import * as zowe from "@zowe/cli";
import { ZoweExplorerApi } from "./ZoweExplorerApi";

/**
 * An implementation of the Zowe Explorer API Common interface for zOSMF.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
class ZosmfApiCommon implements ZoweExplorerApi.ICommon {
    public static getProfileTypeName(): string {
        return "zosmf";
    }

    private session: zowe.imperative.Session;
    public constructor(public profile?: zowe.imperative.IProfileLoaded) {}

    public getProfileTypeName(): string {
        return ZosmfUssApi.getProfileTypeName();
    }

    public getSessionFromCommandArgument(cmdArgs: zowe.imperative.ICommandArguments): zowe.imperative.Session {
        const sessCfg = zowe.ZosmfSession.createSessCfgFromArgs(cmdArgs);
        zowe.imperative.ConnectionPropsForSessCfg.resolveSessCfgProps(sessCfg, cmdArgs);
        const sessionToUse = new zowe.imperative.Session(sessCfg);
        return sessionToUse;
    }

    public getSession(profile?: zowe.imperative.IProfileLoaded): zowe.imperative.Session {
        if (!this.session) {
            try {
                if (!this.profile.profile.tokenValue) {
                    const serviceProfile = profile || this.profile;
                    const cmdArgs: zowe.imperative.ICommandArguments = {
                        $0: "zowe",
                        _: [""],
                        host: serviceProfile.profile.host,
                        port: serviceProfile.profile.port,
                        basePath: serviceProfile.profile.basePath,
                        rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                        user: serviceProfile.profile.user,
                        password: serviceProfile.profile.password,
                    };

                    this.session = this.getSessionFromCommandArgument(cmdArgs);
                } else {
                    const serviceProfile = this.profile;
                    const cmdArgs: zowe.imperative.ICommandArguments = {
                        $0: "zowe",
                        _: [""],
                        host: serviceProfile.profile.host,
                        port: serviceProfile.profile.port,
                        basePath: serviceProfile.profile.basePath,
                        rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                        tokenType: serviceProfile.profile.tokenType,
                        tokenValue: serviceProfile.profile.tokenValue,
                    };

                    this.session = this.getSessionFromCommandArgument(cmdArgs);
                }
            } catch (error) {
                // todo: initialize and use logging
            }
        }
        return this.session;
    }

    public async getStatus(validateProfile?: zowe.imperative.IProfileLoaded, profileType?: string): Promise<string> {
        // This API call is specific for z/OSMF profiles
        let validateSession: zowe.imperative.Session;
        if (profileType === "zosmf") {
            if (validateProfile.profile.tokenValue) {
                const serviceProfile = validateProfile;
                const cmdArgs: zowe.imperative.ICommandArguments = {
                    $0: "zowe",
                    _: [""],
                    host: serviceProfile.profile.host,
                    port: serviceProfile.profile.port,
                    basePath: serviceProfile.profile.basePath,
                    rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                    tokenType: serviceProfile.profile.tokenType,
                    tokenValue: serviceProfile.profile.tokenValue,
                };

                validateSession = this.getSessionFromCommandArgument(cmdArgs);
            } else {
                const serviceProfile = validateProfile;
                const cmdArgs: zowe.imperative.ICommandArguments = {
                    $0: "zowe",
                    _: [""],
                    host: serviceProfile.profile.host,
                    port: serviceProfile.profile.port,
                    basePath: serviceProfile.profile.basePath,
                    rejectUnauthorized: serviceProfile.profile.rejectUnauthorized,
                    user: serviceProfile.profile.user,
                    password: serviceProfile.profile.password,
                };

                validateSession = this.getSessionFromCommandArgument(cmdArgs);
            }

            const sessionStatus = await zowe.CheckStatus.getZosmfInfo(validateSession);

            if (sessionStatus) {
                return "active";
            } else {
                return "inactive";
            }
        } else {
            return "unverified";
        }
    }

    public getTokenTypeName(): string {
        return zowe.imperative.SessConstants.TOKEN_TYPE_APIML;
    }

    public login(session: zowe.imperative.Session): Promise<string> {
        return zowe.Login.apimlLogin(session);
    }

    public logout(session: zowe.imperative.Session): Promise<void> {
        return zowe.Logout.apimlLogout(session);
    }
}

/**
 * An implementation of the Zowe Explorer USS API interface for zOSMF.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
export class ZosmfUssApi extends ZosmfApiCommon implements ZoweExplorerApi.IUss {
    public async fileList(ussFilePath: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.List.fileList(this.getSession(), ussFilePath);
    }

    public async isFileTagBinOrAscii(ussFilePath: string): Promise<boolean> {
        return await zowe.Utilities.isFileTagBinOrAscii(this.getSession(), ussFilePath);
    }

    public async getContents(inputFilePath: string, options: zowe.IDownloadOptions): Promise<zowe.IZosFilesResponse> {
        return await zowe.Download.ussFile(this.getSession(), inputFilePath, options);
    }

    /**
     * API method to wrap to the newer `putContent`.
     * @deprecated
     */
    public async putContents(
        inputFilePath: string,
        ussFilePath: string,
        binary?: boolean,
        localEncoding?: string,
        etag?: string,
        returnEtag?: boolean
    ): Promise<zowe.IZosFilesResponse> {
        return await this.putContent(inputFilePath, ussFilePath, {
            binary,
            localEncoding,
            etag,
            returnEtag,
        });
    }

    public async putContent(
        inputFilePath: string,
        ussFilePath: string,
        options: zowe.IUploadOptions
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Upload.fileToUssFile(this.getSession(), inputFilePath, ussFilePath, options);
    }

    public async uploadDirectory(
        inputDirectoryPath: string,
        ussDirectoryPath: string,
        options?: zowe.IUploadOptions
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Upload.dirToUSSDirRecursive(this.getSession(), inputDirectoryPath, ussDirectoryPath, options);
    }

    public async create(ussPath: string, type: string, mode?: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.Create.uss(this.getSession(), ussPath, type, mode);
    }

    public async delete(ussPath: string, recursive?: boolean): Promise<zowe.IZosFilesResponse> {
        // handle zosmf api issue with file paths
        const fixedName = ussPath.startsWith("/") ? ussPath.substring(1) : ussPath;
        return await zowe.Delete.ussFile(this.getSession(), fixedName, recursive);
    }

    public async rename(currentUssPath: string, newUssPath: string): Promise<zowe.IZosFilesResponse> {
        const result = await zowe.Utilities.renameUSSFile(this.getSession(), currentUssPath, newUssPath);
        return {
            success: true,
            commandResponse: null,
            apiResponse: result,
        };
    }
}

/**
 * An implementation of the Zowe Explorer MVS API interface for zOSMF.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
export class ZosmfMvsApi extends ZosmfApiCommon implements ZoweExplorerApi.IMvs {
    public async dataSet(filter: string, options?: zowe.IListOptions): Promise<zowe.IZosFilesResponse> {
        return await zowe.List.dataSet(this.getSession(), filter, options);
    }

    public async allMembers(dataSetName: string, options?: zowe.IListOptions): Promise<zowe.IZosFilesResponse> {
        return await zowe.List.allMembers(this.getSession(), dataSetName, options);
    }

    public async getContents(dataSetName: string, options?: zowe.IDownloadOptions): Promise<zowe.IZosFilesResponse> {
        return await zowe.Download.dataSet(this.getSession(), dataSetName, options);
    }

    public async putContents(
        inputFilePath: string,
        dataSetName: string,
        options?: zowe.IUploadOptions
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Upload.pathToDataSet(this.getSession(), inputFilePath, dataSetName, options);
    }

    public async createDataSet(
        dataSetType: zowe.CreateDataSetTypeEnum,
        dataSetName: string,
        options?: Partial<zowe.ICreateDataSetOptions>
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Create.dataSet(this.getSession(), dataSetType, dataSetName, options);
    }

    public async createDataSetMember(
        dataSetName: string,
        options?: zowe.IUploadOptions
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Upload.bufferToDataSet(this.getSession(), Buffer.from(""), dataSetName, options);
    }

    public async allocateLikeDataSet(dataSetName: string, likeDataSetName: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.Create.dataSetLike(this.getSession(), dataSetName, likeDataSetName);
    }

    public async copyDataSetMember(
        { dsn: fromDataSetName, member: fromMemberName }: zowe.IDataSet,
        { dsn: toDataSetName, member: toMemberName }: zowe.IDataSet,
        options?: zowe.ICopyDatasetOptions
    ): Promise<zowe.IZosFilesResponse> {
        let newOptions: zowe.ICopyDatasetOptions;
        if (options) {
            if (options["from-dataset"]) {
                newOptions = options;
            } else {
                newOptions = {
                    ...options,
                    ...{ "from-dataset": { dsn: fromDataSetName, member: fromMemberName } },
                };
            }
        } else {
            // If we decide to match 1:1 the Zowe.Copy.dataSet implementation, we will need to break the interface definition in the ZoweExploreApi
            newOptions = { "from-dataset": { dsn: fromDataSetName, member: fromMemberName } };
        }
        return await zowe.Copy.dataSet(this.getSession(), { dsn: toDataSetName, member: toMemberName }, newOptions);
    }

    public async renameDataSet(currentDataSetName: string, newDataSetName: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.Rename.dataSet(this.getSession(), currentDataSetName, newDataSetName);
    }

    public async renameDataSetMember(
        dataSetName: string,
        oldMemberName: string,
        newMemberName: string
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Rename.dataSetMember(this.getSession(), dataSetName, oldMemberName, newMemberName);
    }

    public async hMigrateDataSet(dataSetName: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.HMigrate.dataSet(this.getSession(), dataSetName);
    }

    public async hRecallDataSet(dataSetName: string): Promise<zowe.IZosFilesResponse> {
        return await zowe.HRecall.dataSet(this.getSession(), dataSetName);
    }

    public async deleteDataSet(
        dataSetName: string,
        options?: zowe.IDeleteDatasetOptions
    ): Promise<zowe.IZosFilesResponse> {
        return await zowe.Delete.dataSet(this.getSession(), dataSetName, options);
    }
}

/**
 * An implementation of the Zowe Explorer JES API interface for zOSMF.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
export class ZosmfJesApi extends ZosmfApiCommon implements ZoweExplorerApi.IJes {
    public async getJobsByParameters(params: zowe.IGetJobsParms): Promise<zowe.IJob[]> {
        return zowe.GetJobs.getJobsByParameters(this.getSession(), params);
    }

    public async getJobsByOwnerAndPrefix(owner: string, prefix: string): Promise<zowe.IJob[]> {
        return await zowe.GetJobs.getJobsByOwnerAndPrefix(this.getSession(), owner, prefix); // look here
    }

    public async getJob(jobid: string): Promise<zowe.IJob> {
        return await zowe.GetJobs.getJob(this.getSession(), jobid);
    }

    public async getSpoolFiles(jobname: string, jobid: string): Promise<zowe.IJobFile[]> {
        return await zowe.GetJobs.getSpoolFiles(this.getSession(), jobname, jobid);
    }

    public async downloadSpoolContent(parms: zowe.IDownloadAllSpoolContentParms): Promise<void> {
        return await zowe.DownloadJobs.downloadAllSpoolContentCommon(this.getSession(), parms);
    }

    public async getSpoolContentById(jobname: string, jobid: string, spoolId: number): Promise<string> {
        return await zowe.GetJobs.getSpoolContentById(this.getSession(), jobname, jobid, spoolId);
    }

    public async getJclForJob(job: zowe.IJob): Promise<string> {
        return await zowe.GetJobs.getJclForJob(this.getSession(), job);
    }

    public async submitJcl(
        jcl: string,
        internalReaderRecfm?: string,
        internalReaderLrecl?: string
    ): Promise<zowe.IJob> {
        return await zowe.SubmitJobs.submitJcl(this.getSession(), jcl, internalReaderRecfm, internalReaderLrecl);
    }

    public async submitJob(jobDataSet: string): Promise<zowe.IJob> {
        return await zowe.SubmitJobs.submitJob(this.getSession(), jobDataSet);
    }

    public async deleteJob(jobname: string, jobid: string): Promise<void> {
        await zowe.DeleteJobs.deleteJob(this.getSession(), jobname, jobid);
    }

    public async deleteJobWithInfo(jobname: string, jobid: string): Promise<undefined | zowe.IJobFeedback> {
        return await zowe.DeleteJobs.deleteJob(this.getSession(), jobname, jobid);
    }
}

/**
 * An implementation of the Zowe Explorer Command API interface for zOSMF.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
export class ZosmfCommandApi extends ZosmfApiCommon implements ZoweExplorerApi.ICommand {
    public async issueTsoCommand(command: string, acctNum: string): Promise<zowe.IIssueResponse> {
        return await zowe.IssueTso.issueTsoCommand(this.getSession(), acctNum, command);
    }

    public async issueTsoCommandWithParms(command: string, parms: zowe.IStartTsoParms): Promise<zowe.IIssueResponse> {
        return await zowe.IssueTso.issueTsoCommand(this.getSession(), parms.account, command, parms);
    }

    public async issueMvsCommand(command: string): Promise<zowe.IConsoleResponse> {
        return await zowe.IssueCommand.issueSimple(this.getSession(), command);
    }
}
