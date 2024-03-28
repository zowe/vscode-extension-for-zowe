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

import {
    BaseProvider,
    BufferBuilder,
    DirEntry,
    DsEntry,
    DsEntryMetadata,
    MemberEntry,
    PdsEntry,
    getInfoForUri,
    isDirectoryEntry,
    isFilterEntry,
    isPdsEntry,
    FilterEntry,
    Gui,
    ZosEncoding,
} from "@zowe/zowe-explorer-api";
import * as path from "path";
import * as vscode from "vscode";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";

// Set up localization
import { Profiles } from "../Profiles";
import { IZosFilesResponse } from "@zowe/zos-files-for-zowe-sdk";

export class DatasetFSProvider extends BaseProvider implements vscode.FileSystemProvider {
    private static _instance: DatasetFSProvider;
    private constructor() {
        super(Profiles.getInstance());
        this.root = new DirEntry("");
    }

    /**
     * @returns the Data Set FileSystemProvider singleton instance
     */
    public static get instance(): DatasetFSProvider {
        if (!DatasetFSProvider._instance) {
            DatasetFSProvider._instance = new DatasetFSProvider();
        }

        return DatasetFSProvider._instance;
    }

    public watch(_uri: vscode.Uri, _options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => {});
    }

    /**
     * Returns file statistics about a given URI.
     * @param uri A URI that must exist as an entry in the provider
     * @returns A structure containing file type, time, size and other metrics
     */
    public stat(uri: vscode.Uri): vscode.FileStat {
        return this._lookup(uri, false);
    }

    /**
     * Reads a directory located at the given URI.
     * @param uri A valid URI within the provider
     * @returns An array of tuples containing each entry name and type
     */
    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const dsEntry = this._lookupAsDirectory(uri, false);
        const uriInfo = getInfoForUri(uri, Profiles.getInstance());

        const results: [string, vscode.FileType][] = [];

        if (isFilterEntry(dsEntry)) {
            const mvsApi = ZoweExplorerApiRegister.getMvsApi(uriInfo.profile);
            const datasetResponses: IZosFilesResponse[] = [];
            const dsPatterns = [
                ...new Set(
                    dsEntry.filter["pattern"]
                        .toUpperCase()
                        .split(",")
                        .map((p) => p.trim())
                ),
            ];

            if (mvsApi.dataSetsMatchingPattern) {
                datasetResponses.push(await mvsApi.dataSetsMatchingPattern(dsPatterns));
            } else {
                for (const dsp of dsPatterns) {
                    datasetResponses.push(await mvsApi.dataSet(dsp));
                }
            }

            for (const resp of datasetResponses) {
                for (const ds of resp.apiResponse?.items ?? resp.apiResponse ?? []) {
                    let tempEntry = dsEntry.entries.get(ds.dsname);
                    if (tempEntry == null) {
                        if (ds.dsorg === "PO" || ds.dsorg === "PO-E") {
                            // Entry is a PDS
                            tempEntry = new PdsEntry(ds.dsname);
                        } else if (ds.dsorg === "VS") {
                            // TODO: Add VSAM and ZFS support in Zowe Explorer
                            continue;
                        } else if (ds.migr?.toUpperCase() === "YES") {
                            // migrated
                            tempEntry = new DsEntry(ds.dsname);
                        } else {
                            // PS
                            tempEntry = new DsEntry(ds.dsname);
                        }
                        dsEntry.entries.set(ds.dsname, tempEntry);
                    }
                    results.push([tempEntry.name, tempEntry instanceof DsEntry ? vscode.FileType.File : vscode.FileType.Directory]);
                }
            }
        } else if (isDirectoryEntry(dsEntry)) {
            const members = await ZoweExplorerApiRegister.getMvsApi(uriInfo.profile).allMembers(dsEntry.name);

            for (const ds of members.apiResponse?.items || []) {
                let tempEntry = dsEntry.entries.get(ds.member);
                if (tempEntry == null) {
                    tempEntry = new MemberEntry(ds.member);
                    dsEntry.entries.set(ds.member, tempEntry);
                }
                results.push([tempEntry.name, vscode.FileType.File]);
            }
        }

        return results;
    }

    public updateFilterForUri(uri: vscode.Uri, pattern: string): void {
        const filterEntry = this._lookup(uri, false);
        if (!isFilterEntry(filterEntry)) {
            return;
        }

        filterEntry.filter["pattern"] = pattern;
    }

    /**
     * Creates a directory entry in the provider at the given URI.
     * @param uri The URI that represents a new directory path
     */
    public createDirectory(uri: vscode.Uri, filter?: string): void {
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri, false);
        const profInfo =
            parent !== this.root
                ? {
                      profile: parent.metadata.profile,
                      // we can strip profile name from path because its not involved in API calls
                      path: path.posix.join(parent.metadata.path, basename),
                  }
                : this._getInfoFromUri(uri);

        if (isFilterEntry(parent)) {
            const entry = new PdsEntry(basename);
            entry.metadata = profInfo;
            parent.entries.set(entry.name, entry);
        } else {
            const entry = new FilterEntry(basename);
            entry.filter["pattern"] = filter;
            entry.metadata = profInfo;
            parent.entries.set(entry.name, entry);
        }

        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon(
            { type: vscode.FileChangeType.Changed, uri: uri.with({ path: path.posix.join(uri.path, "..") }) },
            { type: vscode.FileChangeType.Created, uri }
        );
    }

    /**
     * Fetches a data set from the remote system at the given URI.
     * @param uri The URI pointing to a valid file to fetch from the remote system
     * @param editor (optional) An editor instance to reload if the URI is already open
     */
    public async fetchDatasetAtUri(uri: vscode.Uri, editor?: vscode.TextEditor | null): Promise<void> {
        const file = this._lookupAsFile(uri) as DsEntry;
        // we need to fetch the contents from the mainframe since the file hasn't been accessed yet
        const bufBuilder = new BufferBuilder();
        const metadata = file.metadata ?? this._getInfoFromUri(uri);
        const profileEncoding = file.encoding ? null : file.metadata.profile.profile?.encoding;
        const resp = await ZoweExplorerApiRegister.getMvsApi(metadata.profile).getContents(metadata.dsName, {
            binary: file.encoding?.kind === "binary",
            encoding: file.encoding?.kind === "other" ? file.encoding.codepage : profileEncoding,
            responseTimeout: metadata.profile.profile?.responseTimeout,
            returnEtag: true,
            stream: bufBuilder,
        });

        file.data = bufBuilder.read() ?? new Uint8Array();
        file.etag = resp.apiResponse.etag;
        if (editor) {
            await this._updateResourceInEditor(uri);
        }
    }

    /**
     * Reads a data set at the given URI and fetches it from the remote system (if not yet accessed).
     * @param uri The URI pointing to a valid data set on the remote system
     * @returns The data set's contents as an array of bytes
     */
    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const file = this._lookupAsFile(uri);
        const profInfo = this._getInfoFromUri(uri);

        if (profInfo.profile == null) {
            throw vscode.FileSystemError.FileNotFound(vscode.l10n.t("Profile does not exist for this file."));
        }

        // we need to fetch the contents from the mainframe if the file hasn't been accessed yet
        if (!file.wasAccessed) {
            await this.fetchDatasetAtUri(uri);
            file.wasAccessed = true;
        }

        return file.data;
    }

    public makeEmptyDsWithEncoding(uri: vscode.Uri, encoding: ZosEncoding): void {
        const parentDir = this._lookupParentDirectory(uri);
        const fileName = path.posix.basename(uri.path);
        const entry = new DsEntry(fileName);
        entry.encoding = encoding;
        entry.metadata = new DsEntryMetadata({
            ...parentDir.metadata,
            path: path.posix.join(parentDir.metadata.path, fileName),
        });
        entry.data = new Uint8Array();
        parentDir.entries.set(fileName, entry);
    }

    private async uploadEntry(parent: DirEntry, entry: DsEntry, content: Uint8Array, shouldForceUpload?: boolean): Promise<IZosFilesResponse> {
        const mvsApi = ZoweExplorerApiRegister.getMvsApi(entry.metadata.profile);

        const isPdsMember = isPdsEntry(parent) && !isFilterEntry(parent);
        const fullName = isPdsMember ? `${parent.name}(${entry.name})` : entry.name;
        const profileEncoding = entry.encoding ? null : entry.metadata.profile.profile?.encoding;
        return mvsApi.uploadFromBuffer(Buffer.from(content), fullName, {
            binary: entry.encoding?.kind === "binary",
            encoding: entry.encoding?.kind === "other" ? entry.encoding.codepage : profileEncoding,
            etag: shouldForceUpload ? undefined : entry.etag,
            returnEtag: true,
        });
    }

    /**
     * Attempts to write a data set at the given URI.
     * @param uri The URI pointing to a data set entry that should be written
     * @param content The content to write to the data set, as an array of bytes
     * @param options Options for writing the data set
     * - `create` - Creates the data set if it does not exist
     * - `overwrite` - Overwrites the content if the data set exists
     */
    public async writeFile(uri: vscode.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean }): Promise<void> {
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (isDirectoryEntry(entry)) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }

        // Attempt to write data to remote system, and handle any conflicts from e-tag mismatch
        const statusMsg = Gui.setStatusBarMessage(vscode.l10n.t("$(sync~spin) Saving data set..."));
        const urlQuery = new URLSearchParams(uri.query);
        const shouldForceUpload = urlQuery.has("forceUpload");

        try {
            if (!entry) {
                entry = new DsEntry(basename);
                entry.data = content;
                const profInfo = parent.metadata
                    ? new DsEntryMetadata({
                          profile: parent.metadata.profile,
                          path: path.posix.join(parent.metadata.path, basename),
                      })
                    : this._getInfoFromUri(uri);
                entry.metadata = profInfo;

                if (content.byteLength > 0) {
                    // Update e-tag if write was successful.
                    const resp = await this.uploadEntry(parent, entry as DsEntry, content, shouldForceUpload);
                    entry.etag = resp.apiResponse.etag;
                    entry.data = content;
                    statusMsg.dispose();
                }
                parent.entries.set(basename, entry);
                this._fireSoon({ type: vscode.FileChangeType.Created, uri });
            } else {
                if (urlQuery.has("inDiff")) {
                    // Allow users to edit files in diff view.
                    // If in diff view, we don't want to make any API calls, just keep track of latest
                    // changes to data.
                    entry.data = content;
                    entry.mtime = Date.now();
                    entry.size = content.byteLength;
                    entry.inDiffView = true;
                    return;
                }

                if (entry.wasAccessed || content.length > 0) {
                    const resp = await this.uploadEntry(parent, entry as DsEntry, content, shouldForceUpload);
                    entry.etag = resp.apiResponse.etag;
                    entry.data = content;
                    statusMsg.dispose();
                } else {
                    // if the entry hasn't been accessed yet, we don't need to call the API since we are just creating the file
                    entry.data = content;
                }
            }
        } catch (err) {
            statusMsg.dispose();
            if (!err.message.includes("Rest API failure with HTTP(S) status 412")) {
                throw err;
            }

            // Prompt the user with the conflict dialog
            await this._handleConflict(uri, entry);
            return;
        }

        entry.mtime = Date.now();
        entry.size = content.byteLength;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    /**
     * Returns metadata about the data set entry from the context of z/OS.
     * @param uri A URI with a path in the format `zowe-*:/{lpar_name}/{full_path}?`
     * @returns Metadata for the URI that contains the profile instance and path
     */
    private _getInfoFromUri(uri: vscode.Uri): DsEntryMetadata {
        const uriInfo = getInfoForUri(uri, Profiles.getInstance());
        return new DsEntryMetadata({
            profile: uriInfo.profile,
            path: uri.path.substring(uriInfo.slashAfterProfilePos),
        });
    }

    public async delete(uri: vscode.Uri, _options: { readonly recursive: boolean }): Promise<void> {
        const entry = this._lookup(uri, false);
        const parent = this._lookupParentDirectory(uri);
        let fullName: string = "";
        if (isPdsEntry(parent)) {
            fullName = `${parent.name}(${entry.name})`;
        } else {
            fullName = entry.name;
        }

        try {
            await ZoweExplorerApiRegister.getMvsApi(entry.metadata.profile).deleteDataSet(fullName, {
                responseTimeout: entry.metadata.profile.profile?.responseTimeout,
            });
        } catch (err) {
            await Gui.errorMessage(
                vscode.l10n.t({
                    message: "Deleting {0} failed due to API error: {1}",
                    args: [entry.metadata.path, err.message],
                    comment: ["File path", "Error message"],
                })
            );
            return;
        }

        parent.entries.delete(entry.name);
        parent.size -= 1;

        this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });
    }

    public async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean }): Promise<void> {
        const newUriEntry = this._lookup(newUri, true);
        if (!options.overwrite && newUriEntry) {
            throw vscode.FileSystemError.FileExists(`Rename failed: ${path.posix.basename(newUri.path)} already exists`);
        }

        const entry = this._lookup(oldUri, false) as PdsEntry | DsEntry;
        const parentDir = this._lookupParentDirectory(oldUri);

        const oldName = entry.name;
        const newName = path.posix.basename(newUri.path);

        try {
            if (isPdsEntry(entry)) {
                await ZoweExplorerApiRegister.getMvsApi(entry.metadata.profile).renameDataSet(oldName, newName);
            } else {
                const pdsName = path.basename(path.posix.join(entry.metadata.path, ".."));
                await ZoweExplorerApiRegister.getMvsApi(entry.metadata.profile).renameDataSetMember(pdsName, oldName, newName);
            }
        } catch (err) {
            await Gui.errorMessage(
                vscode.l10n.t({
                    message: "Renaming {0} failed due to API error: {1}",
                    args: [oldName, err.message],
                    comment: ["File name", "Error message"],
                })
            );
            return;
        }

        parentDir.entries.delete(entry.name);
        entry.name = newName;

        // Build the new path using the previous path and new file/folder name.
        const newPath = path.posix.join(entry.metadata.path, "..", newName);

        entry.metadata.path = newPath;
        parentDir.entries.set(newName, entry);

        this._fireSoon({ type: vscode.FileChangeType.Deleted, uri: oldUri }, { type: vscode.FileChangeType.Created, uri: newUri });
    }
}
