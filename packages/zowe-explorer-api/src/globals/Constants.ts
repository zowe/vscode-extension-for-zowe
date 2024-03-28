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

/**
 * Global variables accessed across the API
 */
export namespace Constants {
    export const ZOWE_EXPLORER = "Zowe Explorer";
    export const SCS_ZOWE_PLUGIN = "Zowe-Plugin";
    export const SCS_ZOWE_CLI_V2 = "Zowe";
    export const SCS_BRIGHTSIDE = "@brightside/core";
    export const SCS_ZOWE_CLI = "@zowe/cli";
    export const SCS_BROADCOM_PLUGIN = "Broadcom-Plugin";
    export const SCS_DEFAULT = SCS_ZOWE_CLI_V2;
    export const CONTEXT_PREFIX = "_";
    export const DEFAULT_PORT = 443;
    export const DOUBLE_CLICK_SPEED_MS = 500;
    export const PERM_VALUES = {
        r: 4,
        w: 2,
        x: 1,
    };

    export const FAV_SUFFIX = CONTEXT_PREFIX + "fav";
    export const HOME_SUFFIX = CONTEXT_PREFIX + "home";
    export const FAV_PROFILE_CONTEXT = "profile_fav";
    export const RC_SUFFIX = CONTEXT_PREFIX + "rc=";
    export const VALIDATE_SUFFIX = CONTEXT_PREFIX + "validate";
    export const NO_VALIDATE_SUFFIX = CONTEXT_PREFIX + "noValidate";
    export const INFORMATION_CONTEXT = "information";
    export const FAVORITE_CONTEXT = "favorite";
    export const DS_FAV_CONTEXT = "ds_fav";
    export const PDS_FAV_CONTEXT = "pds_fav";
    export const DS_SESSION_FAV_CONTEXT = "session_fav";
    export const DS_SESSION_CONTEXT = "session";
    export const DS_PDS_CONTEXT = "pds";
    export const DS_DS_CONTEXT = "ds";
    export const DS_DS_BINARY_CONTEXT = "dsBinary";
    export const DS_MEMBER_CONTEXT = "member";
    export const DS_MEMBER_BINARY_CONTEXT = "memberBinary";
    export const DS_MIGRATED_FILE_CONTEXT = "migr";
    export const DS_FILE_ERROR_CONTEXT = "fileError";
    export const USS_SESSION_CONTEXT = "ussSession";
    export const USS_DIR_CONTEXT = "directory";
    export const USS_FAV_DIR_CONTEXT = "directory_fav";
    export const USS_TEXT_FILE_CONTEXT = "textFile";
    export const USS_FAV_TEXT_FILE_CONTEXT = "textFile_fav";
    export const USS_BINARY_FILE_CONTEXT = "binaryFile";
    export const JOBS_SESSION_CONTEXT = "server";
    export const JOBS_JOB_CONTEXT = "job";
    export const JOBS_SPOOL_CONTEXT = "spool";
    export const POLL_CONTEXT = CONTEXT_PREFIX + "polling";
    export const VSAM_CONTEXT = "vsam";
    export const INACTIVE_CONTEXT = CONTEXT_PREFIX + "Inactive";
    export const ACTIVE_CONTEXT = CONTEXT_PREFIX + "Active";
    export const UNVERIFIED_CONTEXT = CONTEXT_PREFIX + "Unverified";
    export const ICON_STATE_OPEN = "open";
    export const ICON_STATE_CLOSED = "closed";
    export const FILTER_SEARCH = "isFilterSearch";

    export const MAX_SEARCH_HISTORY = 5;
    export const MAX_FILE_HISTORY = 10;

    export namespace Settings {
        export const OLD_SETTINGS_MIGRATED = "zowe.settings.oldSettingsMigrated";
        export const LOCAL_STORAGE_MIGRATED = "zowe.settings.localStorageMigrated";
        export const TEMP_FOLDER_PATH = "zowe.files.temporaryDownloadsFolder.path";
        export const TEMP_FOLDER_CLEANUP = "zowe.files.temporaryDownloadsFolder.cleanup";
        export const TEMP_FOLDER_HIDE = "zowe.files.temporaryDownloadsFolder.hide";
        export const LOGS_FOLDER_PATH = "zowe.files.logsFolder.path";
        export const LOGS_SETTING_PRESENTED = "zowe.cliLoggerSetting.presented";
        export const DS_DEFAULT_BINARY = "zowe.ds.default.binary";
        export const DS_DEFAULT_C = "zowe.ds.default.c";
        export const DS_DEFAULT_CLASSIC = "zowe.ds.default.classic";
        export const DS_DEFAULT_PDS = "zowe.ds.default.pds";
        export const DS_DEFAULT_EXTENDED = "zowe.ds.default.extended";
        export const DS_DEFAULT_PS = "zowe.ds.default.ps";
        export const COMMANDS_HISTORY = "zowe.commands.history";
        export const COMMANDS_ALWAYS_EDIT = "zowe.commands.alwaysEdit";
        export const AUTOMATIC_PROFILE_VALIDATION = "zowe.automaticProfileValidation";
        export const DS_HISTORY = "zowe.ds.history";
        export const USS_HISTORY = "zowe.uss.history";
        export const JOBS_HISTORY = "zowe.jobs.history";
        export const SECURE_CREDENTIALS_ENABLED = "zowe.security.secureCredentialsEnabled";
        export const CHECK_FOR_CUSTOM_CREDENTIAL_MANAGERS = "zowe.security.checkForCustomCredentialManagers";

        // Dictionary describing translation from old configuration names to new standardized names
        export const CONFIG: { [k: string]: string } = {
            "Zowe-Default-Datasets-Binary": DS_DEFAULT_BINARY,
            "Zowe-Default-Datasets-C": DS_DEFAULT_C,
            "Zowe-Default-Datasets-Classic": DS_DEFAULT_CLASSIC,
            "Zowe-Default-Datasets-PDS": DS_DEFAULT_PDS,
            "Zowe-Default-Datasets-Extended": DS_DEFAULT_EXTENDED,
            "Zowe-Default-Datasets-PS": DS_DEFAULT_PS,
            "Zowe-Temp-Folder-Location": TEMP_FOLDER_PATH,
            "Zowe Commands: History": COMMANDS_HISTORY,
            "Zowe Commands: Always edit": COMMANDS_ALWAYS_EDIT,
            "Zowe-Automatic-Validation": AUTOMATIC_PROFILE_VALIDATION,
            "Zowe-DS-Persistent": DS_HISTORY,
            "Zowe-USS-Persistent": USS_HISTORY,
            "Zowe-Jobs-Persistent": JOBS_HISTORY,
        };
    }
}
