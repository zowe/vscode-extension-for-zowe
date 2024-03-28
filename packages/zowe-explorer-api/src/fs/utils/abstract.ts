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

import * as vscode from "vscode";
import { ProfilesCache } from "../../profiles/ProfilesCache";
import { IProfileLoaded } from "@zowe/imperative";
import { DirEntry, FileEntry, FilterEntry, IFileSystemEntry } from "../types";
import { Gui } from "../..";
import { posix } from "path";

export type UriFsInfo = {
    isRoot: boolean;
    slashAfterProfilePos: number;
    profileName: string;
    profile?: IProfileLoaded;
};

/**
 * Returns the metadata for a given URI in the FileSystem.
 * @param uri The "Zowe-compliant" URI to extract info from
 * @returns a metadata type with info about the URI
 */
export function getInfoForUri(uri: vscode.Uri, profilesCache?: ProfilesCache): UriFsInfo {
    // Paths pointing to the session root will have the format `<scheme>:/{lpar_name}`
    const slashAfterProfilePos = uri.path.indexOf("/", 1);
    const isRoot = slashAfterProfilePos === -1;

    // Determine where to parse profile name based on location of first slash
    const startPathPos = isRoot ? uri.path.length : slashAfterProfilePos;

    // Load profile that matches the parsed name
    const profileName = uri.path.substring(1, startPathPos);
    const profile = profilesCache?.loadNamedProfile ? profilesCache.loadNamedProfile(profileName) : null;

    return {
        isRoot,
        slashAfterProfilePos,
        profileName,
        profile,
    };
}

export function findDocMatchingUri(uri: vscode.Uri): vscode.TextDocument {
    return vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
}

export async function confirmForUnsavedDoc(uri: vscode.Uri): Promise<boolean> {
    const doc = findDocMatchingUri(uri);
    if (doc?.isDirty) {
        const confirmItem = vscode.l10n.t("Confirm");
        return (
            (await Gui.warningMessage(
                vscode.l10n.t(
                    "{0} is opened and has pending changes in the editor. By selecting 'Confirm', any unsaved changes will be lost.",
                    posix.basename(doc.fileName)
                ),
                {
                    items: [confirmItem],
                    vsCodeOpts: { modal: true },
                }
            )) === confirmItem
        );
    }

    // either the document doesn't exist or it isn't dirty
    return true;
}

export function isDirectoryEntry(entry: IFileSystemEntry): entry is DirEntry {
    return entry != null && entry["type"] === vscode.FileType.Directory;
}

export function isFileEntry(entry: IFileSystemEntry): entry is FileEntry {
    return entry != null && entry["type"] === vscode.FileType.File;
}

export function isFilterEntry(entry: IFileSystemEntry): entry is FilterEntry {
    return entry != null && "filter" in entry;
}
