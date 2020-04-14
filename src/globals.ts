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

import * as path from "path";
import { Logger } from "@zowe/imperative";
import * as vscode from "vscode";

// Globals
export let ZOWETEMPFOLDER;
export let ZOWE_TMP_FOLDER;
export let USS_DIR;
export let DS_DIR;
export let ISTHEIA: boolean = false; // set during activate
export let LOG: Logger;
export const CONTEXT_PREFIX = "_";
export const FAV_SUFFIX = CONTEXT_PREFIX + "fav";
export const RC_SUFFIX = CONTEXT_PREFIX + "rc=";
export const INFORMATION_CONTEXT = "information";
export const FAVORITE_CONTEXT = "favorite";
export const DS_FAV_CONTEXT = "ds_fav";
export const PDS_FAV_CONTEXT = "pds_fav";
export const DS_SESSION_CONTEXT = "session";
export const DS_PDS_CONTEXT = "pds";
export const DS_DS_CONTEXT = "ds";
export const DS_MEMBER_CONTEXT = "member";
export const DS_TEXT_FILE_CONTEXT = "textFile";
export const DS_FAV_TEXT_FILE_CONTEXT = "textFile_fav";
export const DS_BINARY_FILE_CONTEXT = "binaryFile";
export const DS_MIGRATED_FILE_CONTEXT = "migr";
export const USS_SESSION_CONTEXT = "ussSession";
export const USS_DIR_CONTEXT = "directory";
export const USS_FAV_DIR_CONTEXT = "directory_fav";
export const JOBS_SESSION_CONTEXT = "server";
export const JOBS_JOB_CONTEXT = "job";
export const JOBS_SPOOL_CONTEXT = "spool";
export const ICON_STATE_OPEN = "open";
export const ICON_STATE_CLOSED = "closed";
export const THEIA = "Eclipse Theia";

/**
 * Defines all global variables
 * @param tempPath File path for temporary folder defined in preferences
 */
export function defineGlobals(tempPath: string | undefined) {
    // Set app name
    const appName: string = vscode.env.appName;
    if (appName && appName === this.THEIA) { this.ISTHEIA = true; }

    // Set temp path & folder paths
    tempPath !== "" && tempPath !== undefined ?
        ZOWETEMPFOLDER = path.join(tempPath, "temp") :
        ZOWETEMPFOLDER = path.join(__dirname, "..", "..", "resources", "temp");

    ZOWE_TMP_FOLDER = path.join(ZOWETEMPFOLDER, "tmp");
    USS_DIR = path.join(ZOWETEMPFOLDER, "_U_");
    DS_DIR = path.join(ZOWETEMPFOLDER, "_D_");
}

/**
 * Initializes Imperative Logger
 * @param context The extension context
 */
export function initLogger(context: vscode.ExtensionContext) {
    const loggerConfig = require(path.join(context.extensionPath, "log4jsconfig.json"));
    loggerConfig.log4jsConfig.appenders.default.filename = path.join(context.extensionPath, "logs", "imperative.log");
    loggerConfig.log4jsConfig.appenders.imperative.filename = path.join(context.extensionPath, "logs", "imperative.log");
    loggerConfig.log4jsConfig.appenders.app.filename = path.join(context.extensionPath, "logs", "zowe.log");
    Logger.initLogger(loggerConfig);
    this.LOG = Logger.getAppLogger();
}
