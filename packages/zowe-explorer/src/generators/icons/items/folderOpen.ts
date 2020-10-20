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

import { IconHierarchyType, IconId, IIconItem } from "../index";
import { getIconPathInResources } from "../../../shared/utils";
import folderIcon from "./folder";
import { TreeItemCollapsibleState } from "vscode";

const icon: IIconItem = {
    id: IconId.folderOpen,
    type: IconHierarchyType.derived,
    path: getIconPathInResources("folder-open.svg"),
    check: (node) => {
        const parentCheck = folderIcon.check(node);
        return parentCheck && node.collapsibleState === TreeItemCollapsibleState.Expanded;
    },
};

export default icon;
