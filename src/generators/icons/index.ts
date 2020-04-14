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

import { TreeItem } from "vscode";
import { ZoweUSSNode } from "../../uss/ZoweUSSNode";
import { ZoweTreeNode } from "../../abstract/ZoweTreeNode";

export enum IconId {
    "document" = "document",
    "documentBinary" = "documentBinary",
    "downloadedDocument" = "downloadedDocument",
    "documentBinaryDownloaded" = "documentBinaryDownloaded",
    "pattern" = "pattern",
    "session" = "session",
    "sessionOpen" = "sessionOpen",
    "sessionFavourite" = "sessionFavourite",
    "sessionFavouriteOpen" = "sessionFavouriteOpen",
    "folder" = "folder",
    "folderOpen" = "folderOpen",
    "migrated" = "migrated"
}
export enum IconHierarchyType {
    "base" = "base",
    "derived" = "derived"
}

type CombinedNode = TreeItem | ZoweUSSNode | ZoweTreeNode;
export interface IIconItem {
    id: IconId;
    type: IconHierarchyType;
    path: { light: string; dark: string; };
    check: (node: CombinedNode) => boolean;
}

const items = [
    require("./items/document"),
    require("./items/documentBinary"),
    require("./items/downloadedDocument"),
    require("./items/documentBinaryDownloaded"),
    require("./items/pattern"),
    require("./items/session"),
    require("./items/sessionOpen"),
    require("./items/sessionFavourite"),
    require("./items/sessionFavouriteOpen"),
    require("./items/folder"),
    require("./items/folderOpen"),
    require("./items/migrated")
].map((item) => item.default) as IIconItem[];

export function getIconById(id: IconId): IIconItem {
    return items.find((item) => item.id === id);
}

export function getIconByNode(node: CombinedNode) {
    const targetItems = items.filter((item) => item.check(node));

    if (targetItems.some((item) => item.type === IconHierarchyType.derived)) {
        return targetItems.filter((item) => item.type === IconHierarchyType.derived).pop();
    } else {
        return targetItems.pop();
    }
}
