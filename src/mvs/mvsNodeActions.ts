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

import * as zowe from "@brightside/core";
import * as vscode from "vscode";
import { ZoweNode } from "../ZoweNode";
import { DatasetTree } from "../DatasetTree";

export async function uploadDialog(node: ZoweNode, datasetProvider: DatasetTree) {
    const fileOpenOptions = {
       canSelectFiles: true,
       openLabel: "Upload File",
       canSelectMany: true
    };

    const value = await vscode.window.showOpenDialog(fileOpenOptions);

    await Promise.all(
        value.map(async (item) => {
            // Convert to vscode.TextDocument
            const doc = await vscode.workspace.openTextDocument(item);
            await uploadFile(node, doc);
        }
    ));
    datasetProvider.refresh();
}

export async function uploadFile(node: ZoweNode, doc: vscode.TextDocument) {
    try {
        await zowe.Upload.fileToDataset(node.getSession(), doc.fileName, node.label);
    } catch (e) {
        vscode.window.showErrorMessage(e.message);
    }
}
