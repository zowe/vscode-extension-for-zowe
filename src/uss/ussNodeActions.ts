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

import { USSTree } from "../USSTree";
import { ZoweUSSNode } from "../ZoweUSSNode";
import * as vscode from "vscode";
import * as zowe from "@brightside/core";
import * as fs from "fs";
import * as utils from "../utils";
import * as nls from "vscode-nls";
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import * as path from "path";
import { loadNamedProfile } from "../ProfileLoader";
/**
 * Prompts the user for a path, and populates the [TreeView]{@link vscode.TreeView} based on the path
 *
 * @param {ZoweUSSNode} node - The session node
 * @param {ussTree} ussFileProvider - Current ussTree used to populate the TreeView
 * @returns {Promise<void>}
 */
export async function createUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, nodeType: string, isTopLevel?: boolean) {
    const name = await vscode.window.showInputBox({placeHolder:
        localize("createUSSNode.name", "Name of file or directory")});
    if (name) {
        try {
            const filePath = `${node.fullPath}/${name}`;
            await zowe.Create.uss(node.getSession(), filePath, nodeType);
            if (isTopLevel) {
                refreshAllUSS(ussFileProvider);
            } else {
                ussFileProvider.refreshElement(node);
            }
        } catch (err) {
            vscode.window.showErrorMessage(
                localize("createUSSNode.error.create", "Unable to create node: ") + err.message);
            throw (err);
        }
        ussFileProvider.refresh();
    }
}

export async function createUSSNodeDialog(node: ZoweUSSNode, ussFileProvider: USSTree) {
    const quickPickOptions: vscode.QuickPickOptions = {
        placeHolder: `What would you like to create at ${node.fullPath}?`,
        ignoreFocusOut: true,
        canPickMany: false
    };
    const type = await vscode.window.showQuickPick(["Directory", "File"], quickPickOptions);
    const isTopLevel = true;
    createUSSNode(node, ussFileProvider, type, isTopLevel);
}

export async function deleteUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, filePath: string) {
    // handle zosmf api issue with file paths
    const nodePath = node.fullPath.startsWith("/") ?  node.fullPath.substring(1) :  node.fullPath;
    const quickPickOptions: vscode.QuickPickOptions = {
        placeHolder: localize("deleteUSSNode.quickPickOption", "Are you sure you want to delete ") + node.label,
        ignoreFocusOut: true,
        canPickMany: false
    };
    if (await vscode.window.showQuickPick([localize("deleteUSSNode.showQuickPick.yes","Yes"),
                                           localize("deleteUSSNode.showQuickPick.no", "No")],
                                           quickPickOptions) !== localize("deleteUSSNode.showQuickPick.yes","Yes"))
    {
        return;
    }
    try {
        const isRecursive = node.contextValue === "directory" ? true : false;
        await zowe.Delete.ussFile(node.getSession(), nodePath, isRecursive);
        node.mParent.dirty = true;
        deleteFromDisk(node, filePath);
    } catch (err) {
        vscode.window.showErrorMessage(localize("deleteUSSNode.error.node", "Unable to delete node: ") + err.message);
        throw (err);
    }

    // Remove node from the USS Favorites tree
    ussFileProvider.removeUSSFavorite(node);
    ussFileProvider.refresh();
}

/**
 * Refreshes treeView
 *
 * @param {USSTree} ussFileProvider
 */
export async function refreshAllUSS(ussFileProvider: USSTree) {
    ussFileProvider.mSessionNodes.forEach( (sessNode) => {
        if (sessNode.contextValue === "uss_session") {
            utils.labelHack(sessNode);
            sessNode.children = [];
            sessNode.dirty = true;
        }
    });
    ussFileProvider.refresh();
}

export async function renameUSSNode(node: ZoweUSSNode, ussFileProvider: USSTree, filePath: string) {
    const newName = await vscode.window.showInputBox({value: node.label});
    if (!newName) {
        return;
    }
    try {
        const newNamePath = node.mParent.fullPath + "/" +  newName;
        await zowe.Utilities.renameUSSFile(node.getSession(), node.fullPath, newNamePath);
        if (node.contextValue === "directory" || node.mParent.contextValue === "uss_session") {
            refreshAllUSS(ussFileProvider);
        } else {
            ussFileProvider.refresh();
        }
    } catch (err) {
        vscode.window.showErrorMessage(localize("renameUSSNode.error", "Unable to rename node: ") + err.message);
        throw (err);
    }
}

/**
 * Marks file as deleted from disk
 *
 * @param {ZoweUSSNode} node
 */
export async function deleteFromDisk(node: ZoweUSSNode, filePath: string) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
// tslint:disable-next-line: no-empty
        catch (err) {}
}

export async function initializeUSSFavorites(ussFileProvider: USSTree) {
    const lines: string[] = vscode.workspace.getConfiguration("Zowe-USS-Persistent-Favorites").get("favorites");
    lines.forEach((line) => {
        const profileName = line.substring(1, line.lastIndexOf("]"));
        const nodeName = (line.substring(line.indexOf(":") + 1, line.indexOf("{"))).trim();
        const sesName = line.substring(1, line.lastIndexOf("]")).trim();
        try {
            const zosmfProfile = loadNamedProfile(sesName);
            const session = zowe.ZosmfSession.createBasicZosmfSession(zosmfProfile.profile);
            let node: ZoweUSSNode;
            if (line.substring(line.indexOf("{") + 1, line.lastIndexOf("}")) === "directory") {
                node = new ZoweUSSNode(
                    nodeName,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    ussFileProvider.mFavoriteSession,
                    session,
                    "",
                    false,
                    profileName
                );
            } else {
                node = new ZoweUSSNode(
                    nodeName,
                    vscode.TreeItemCollapsibleState.None,
                    ussFileProvider.mFavoriteSession,
                    session,
                    "",
                    false,
                    profileName
                );
                node.command = {command: "zowe.uss.ZoweUSSNode.open",
                                title: localize("initializeUSSFavorites.lines.title", "Open"), arguments: [node]};
            }
            node.contextValue += "f";
            node.iconPath = utils.applyIcons(node);
            ussFileProvider.mFavorites.push(node);
    } catch(e) {
        vscode.window.showErrorMessage(
            localize("initializeUSSFavorites.error.profile1",
            "Error: You have Zowe USS favorites that refer to a non-existent CLI profile named: ") + profileName +
            localize("intializeUSSFavorites.error.profile2",
            ". To resolve this, you can create a profile with this name, ") +
            localize("initializeUSSFavorites.error.profile3",
            "or remove the favorites with this profile name from the Zowe-USS-Persistent-Favorites setting, ") +
            localize("initializeUSSFavorites.error.profile4", "which can be found in your VS Code user settings."));
        return;
    }
    });
}

export async function uploadDialog(node: ZoweUSSNode, ussFileProvider: USSTree) {
    const fileOpenOptions = {
        canSelectFiles: true,
        openLabel: "Upload Files",
        canSelectMany: true
     };

    const value = await vscode.window.showOpenDialog(fileOpenOptions);

    await Promise.all(
        value.map(async (item) => {
            const doc = await vscode.workspace.openTextDocument(item);
            await uploadFile(node, doc);
        }
     ));
    ussFileProvider.refresh();
}

export async function uploadFile(node: ZoweUSSNode, doc: vscode.TextDocument) {
    try {
        const localFileName = path.parse(doc.fileName).base;
        const ussName = `${node.fullPath}/${localFileName}`;
        await zowe.Upload.fileToUSSFile(node.getSession(), doc.fileName, ussName);
    } catch (e) {
        vscode.window.showErrorMessage(e.message);
    }
}
