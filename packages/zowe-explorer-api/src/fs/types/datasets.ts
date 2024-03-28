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

import { DirEntry, EntryMetadata, FileEntry } from "../types";
import { IProfileLoaded } from "@zowe/imperative";

export class DsEntry extends FileEntry {
    public metadata: DsEntryMetadata;

    public constructor(name: string) {
        super(name);
    }
}

export class MemberEntry extends DsEntry {}

export class PdsEntry extends DirEntry {
    public entries: Map<string, MemberEntry>;

    public constructor(name: string) {
        super(name);
        this.entries = new Map();
    }
}

export class DsEntryMetadata implements EntryMetadata {
    public profile: IProfileLoaded;
    public path: string;

    public constructor(metadata: EntryMetadata) {
        this.profile = metadata.profile;
        this.path = metadata.path;
    }

    public get dsName(): string {
        const segments = this.path.split("/").filter(Boolean);
        return segments[1] ? `${segments[0]}(${segments[1]})` : segments[0];
    }
}
