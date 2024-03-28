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

import * as path from "path";
import * as vscode from "vscode";
import { FileManagement, imperative, IZoweTreeNode, ZoweLogger } from "@zowe/zowe-explorer-api";
import type { Profiles } from "./Profiles";

// Globals
export let SETTINGS_TEMP_FOLDER_LOCATION;
export let ZOWETEMPFOLDER: string;
export let ZOWE_TMP_FOLDER: string;
export let USS_DIR: string;
export let DS_DIR: string;
export let CONFIG_PATH; // set during activate
export let LOG: imperative.Logger;
export const COMMAND_COUNT = 121;
export const MS_PER_SEC = 1000;
export const STATUS_BAR_TIMEOUT_MS = 5000;
export const VSCODE_APPNAME: string[] = ["Visual Studio Code", "VSCodium"];
export const ROOTPATH = path.join(__dirname, "..", "..");
export const LOGGER_SETTINGS = "zowe.logger";
export const EXTENDER_CONFIG: imperative.ICommandProfileTypeConfiguration[] = [];
export const ZOWE_CLI_SCM = "@zowe/cli";
export const MAX_DATASET_LENGTH = 44;
export const MAX_MEMBER_LENGTH = 8;
export const DS_NAME_REGEX_CHECK = /^[a-zA-Z#@$][a-zA-Z0-9#@$-]{0,7}(\.[a-zA-Z#@$][a-zA-Z0-9#@$-]{0,7})*$/;
export const MEMBER_NAME_REGEX_CHECK = /^[a-zA-Z#@$][a-zA-Z0-9#@$]{0,7}$/;
export let ACTIVATED = false;
export let SAVED_PROFILE_CONTENTS = new Uint8Array();
export const JOBS_MAX_PREFIX = 8;
export let FILE_SELECTED_TO_COMPARE: boolean;
export let filesToCompare: IZoweTreeNode[];
export let PROFILES_CACHE: Profiles; // Works around circular dependency, see https://github.com/zowe/vscode-extension-for-zowe/issues/2756

export enum Trees {
    USS,
    MVS,
    JES,
}

export enum CreateDataSetTypeWithKeysEnum {
    DATA_SET_BINARY,
    DATA_SET_C,
    DATA_SET_CLASSIC,
    DATA_SET_PARTITIONED,
    DATA_SET_SEQUENTIAL,
    DATA_SET_BLANK,
}
export const DATA_SET_PROPERTIES = [
    {
        key: `alcunit`,
        label: `Allocation Unit`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter an allocation unit`),
    },
    {
        key: `avgblk`,
        label: `Average Block Length`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter the average block length (if allocation unit = BLK)`),
    },
    {
        key: `blksize`,
        label: `Block Size`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter a block size`),
    },
    {
        key: `dataclass`,
        label: `Data Class`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter an SMS data class`),
    },
    {
        key: `unit`,
        label: `Device Type`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter a device type (unit)`),
    },
    {
        key: `dirblk`,
        label: `Directory Blocks`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter the number of directory blocks`),
    },
    {
        key: `dsntype`,
        label: `Data Set Type (DSNTYPE)`,
        value: null,
        placeHolder: vscode.l10n.t(`Specify the data set type (DSNTYPE)`),
    },
    {
        key: `mgntclass`,
        label: `Management Class`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter the SMS management class`),
    },
    {
        key: `dsName`,
        label: `Data Set Name`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter a data set name`),
    },
    {
        key: `dsorg`,
        label: `Data Set Organization (DSORG)`,
        value: null,
        placeHolder: vscode.l10n.t(`Select a data set organization (DSORG)`),
    },
    {
        key: `primary`,
        label: `Primary Space`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter the primary space allocation`),
    },
    {
        key: `recfm`,
        label: `Record Format`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter the data set's record format`),
    },
    {
        key: `lrecl`,
        label: `Record Length`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter the logical record length`),
    },
    {
        key: `secondary`,
        label: `Secondary Space`,
        value: null,
        type: `number`,
        placeHolder: vscode.l10n.t(`Enter the secondary space allocation`),
    },
    {
        key: `size`,
        label: `Size`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter the size of the data set`),
    },
    {
        key: `storclass`,
        label: `Storage Class`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter the SMS storage class`),
    },
    {
        key: `volser`,
        label: `Volume Serial`,
        value: null,
        placeHolder: vscode.l10n.t(`Enter the volume serial on which the data set should be placed`),
    },
];

export const JOB_STATUS = [
    {
        key: `All`,
        label: `*`,
        value: null,
        picked: true,
    },
    {
        key: `Active`,
        label: `Active`,
        value: `Active`,
        picked: false,
    },
    {
        key: `Input`,
        label: `Input`,
        value: null,
        picked: false,
    },
    {
        key: `Output`,
        label: `Output`,
        value: null,
        picked: false,
    },
];

export const JOB_STATUS_UNSUPPORTED = [
    {
        key: `All`,
        label: `*`,
        value: null,
        picked: true,
    },
];

export enum JobPickerTypes {
    QuerySearch = "QuerySearch",
    IdSearch = "IdSearch",
    History = "History",
}

export const SEPARATORS = {
    BLANK: { kind: vscode.QuickPickItemKind.Separator, label: "" },
    RECENT: { kind: vscode.QuickPickItemKind.Separator, label: vscode.l10n.t("zowe.separator.recent", "Recent") },
    RECENT_FILTERS: { kind: vscode.QuickPickItemKind.Separator, label: vscode.l10n.t(`Recent Filters`) },
    OPTIONS: { kind: vscode.QuickPickItemKind.Separator, label: vscode.l10n.t(`Options`) },
};

/**
 * Defines all global variables
 * @param tempPath File path for temporary folder defined in preferences
 */
export function defineGlobals(tempPath: string | undefined): void {
    SETTINGS_TEMP_FOLDER_LOCATION = tempPath;
    // Set temp path & folder paths
    ZOWETEMPFOLDER = tempPath ? path.join(tempPath, "temp") : path.join(__dirname, "..", "..", "resources", "temp");
    ZoweLogger.info(
        vscode.l10n.t({
            message: `Zowe Explorer's temp folder is located at {0}`,
            args: [ZOWETEMPFOLDER],
            comment: ["Zowe temp folder"],
        })
    );
    ZOWE_TMP_FOLDER = path.join(ZOWETEMPFOLDER, "tmp");
    USS_DIR = path.join(ZOWETEMPFOLDER, "_U_");
    DS_DIR = path.join(ZOWETEMPFOLDER, "_D_");
}

export function setConfigPath(configPath: string | undefined): void {
    if (configPath) {
        CONFIG_PATH = configPath;
    } else {
        CONFIG_PATH = FileManagement.getZoweDir();
    }
}

export function setActivated(value: boolean): void {
    if (value) {
        ZoweLogger.info(vscode.l10n.t(`Zowe Explorer has activated successfully.`));
    }
    ACTIVATED = value;
}

export function setSavedProfileContents(value: Uint8Array): void {
    SAVED_PROFILE_CONTENTS = value;
}

export function setCompareSelection(val: boolean): void {
    FILE_SELECTED_TO_COMPARE = val;
    vscode.commands.executeCommand("setContext", "zowe.compareFileStarted", val);
}

export function resetCompareChoices(): void {
    setCompareSelection(false);
    filesToCompare = [];
}

export function setProfilesCache(profilesCache: Profiles): void {
    PROFILES_CACHE = profilesCache;
}
