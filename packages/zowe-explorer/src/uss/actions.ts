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
import * as fs from "fs";
import * as globals from "../globals";
import * as path from "path";
import { concatChildNodes, uploadContent, getSelectedNodeList } from "../shared/utils";
import { errorHandling } from "../utils/ProfilesUtils";
import { Gui, imperative, Validation, IZoweUSSTreeNode, Types, ZoweLogger } from "@zowe/zowe-explorer-api";
import { Profiles } from "../Profiles";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";
import { isBinaryFileSync } from "isbinaryfile";
import * as contextually from "@zowe/zowe-explorer-api/src/shared/context";
import { markDocumentUnsaved, setFileSaved } from "../utils/workspace";
import { refreshAll } from "../shared/refresh";
import * as zosfiles from "@zowe/zos-files-for-zowe-sdk";
import { autoDetectEncoding, fileExistsCaseSensitiveSync } from "./utils";
import { UssFileTree, UssFileType } from "./FileStructure";
import { AttributeView } from "./AttributeView";
import { LocalFileManagement } from "../utils/LocalFileManagement";

/**
 * Prompts the user for a path, and populates the [TreeView]{@link vscode.TreeView} based on the path
 *
 * @param {ZoweUSSNode} node - The session node
 * @param {ussTree} ussFileProvider - Current ussTree used to populate the TreeView
 * @returns {Promise<void>}
 */
export async function createUSSNode(
    node: IZoweUSSTreeNode,
    ussFileProvider: Types.IZoweUSSTreeType,
    nodeType: string,
    isTopLevel?: boolean
): Promise<void> {
    ZoweLogger.trace("uss.actions.createUSSNode called.");
    await ussFileProvider.checkCurrentProfile(node);
    let filePath = "";
    if (contextually.isSession(node)) {
        const filePathOptions: vscode.InputBoxOptions = {
            placeHolder: vscode.l10n.t({
                message: "{0} location",
                args: [nodeType],
                comment: ["Node type"],
            }),
            prompt: vscode.l10n.t({
                message: "Choose a location to create the {0}",
                args: [nodeType],
                comment: ["Node type"],
            }),
            value: node.tooltip as string,
        };
        filePath = await Gui.showInputBox(filePathOptions);
    } else {
        filePath = node.fullPath;
    }
    const nameOptions: vscode.InputBoxOptions = {
        placeHolder: vscode.l10n.t("Name of file or directory"),
    };
    const name = await Gui.showInputBox(nameOptions);
    if (name && filePath) {
        try {
            filePath = `${filePath}/${name}`;
            await ZoweExplorerApiRegister.getUssApi(node.getProfile()).create(filePath, nodeType);
            if (isTopLevel) {
                await refreshAll(ussFileProvider);
            } else {
                ussFileProvider.refreshElement(node);
            }
            const newNode = await node.getChildren().then((children) => children.find((child) => child.label === name));
            await ussFileProvider.getTreeView().reveal(node, { select: true, focus: true });
            ussFileProvider.getTreeView().reveal(newNode, { select: true, focus: true });
            const localPath = `${node.getUSSDocumentFilePath()}/${name}`;
            const fileExists = fs.existsSync(localPath);
            if (fileExists && !fileExistsCaseSensitiveSync(localPath)) {
                Gui.showMessage(
                    vscode.l10n.t(
                        `There is already a file with the same name.
                        Please change your OS file system settings if you want to give case sensitive file names.`
                    )
                );
                ussFileProvider.refreshElement(node);
            }
        } catch (err) {
            if (err instanceof Error) {
                await errorHandling(err, node.getProfileName(), vscode.l10n.t("Unable to create node:"));
            }
            throw err;
        }
    }
}

export async function refreshUSSInTree(node: IZoweUSSTreeNode, ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.refreshUSSInTree called.");
    await ussFileProvider.refreshElement(node);
}

export async function refreshDirectory(node: IZoweUSSTreeNode, ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.refreshDirectory called.");
    try {
        await node.getChildren();
        ussFileProvider.refreshElement(node);
    } catch (err) {
        await errorHandling(err, node.getProfileName());
    }
}

export async function createUSSNodeDialog(node: IZoweUSSTreeNode, ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.createUSSNodeDialog called.");
    await ussFileProvider.checkCurrentProfile(node);
    if (
        Profiles.getInstance().validProfile === Validation.ValidationType.VALID ||
        Profiles.getInstance().validProfile === Validation.ValidationType.UNVERIFIED
    ) {
        const quickPickOptions: vscode.QuickPickOptions = {
            placeHolder: `What would you like to create at ${node.fullPath}?`,
            ignoreFocusOut: true,
            canPickMany: false,
        };
        const type = await Gui.showQuickPick([globals.USS_DIR_CONTEXT, "File"], quickPickOptions);
        const isTopLevel = true;
        return createUSSNode(node, ussFileProvider, type, isTopLevel);
    }
}

/**
 * Marks file as deleted from disk
 *
 * @param {ZoweUSSNode} node
 */
export function deleteFromDisk(node: IZoweUSSTreeNode, filePath: string): void {
    ZoweLogger.trace("uss.actions.deleteFromDisk called.");
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        ZoweLogger.warn(err);
    }
}

export async function uploadDialog(node: IZoweUSSTreeNode, ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.uploadDialog called.");
    const fileOpenOptions = {
        canSelectFiles: true,
        openLabel: "Upload Files",
        canSelectMany: true,
        defaultUri: LocalFileManagement.getDefaultUri(),
    };

    const value = await Gui.showOpenDialog(fileOpenOptions);

    await Promise.all(
        value.map(async (item) => {
            const isBinary = isBinaryFileSync(item.fsPath);

            if (isBinary) {
                await uploadBinaryFile(node, item.fsPath);
            } else {
                const doc = await vscode.workspace.openTextDocument(item);
                await uploadFile(node, doc);
            }
        })
    );
    ussFileProvider.refresh();
}

export async function uploadBinaryFile(node: IZoweUSSTreeNode, filePath: string): Promise<void> {
    ZoweLogger.trace("uss.actions.uploadBinaryFile called.");
    try {
        const localFileName = path.parse(filePath).base;
        const ussName = `${node.fullPath}/${localFileName}`;
        await ZoweExplorerApiRegister.getUssApi(node.getProfile()).putContent(filePath, ussName, { binary: true });
    } catch (e) {
        await errorHandling(e, node.getProfileName());
    }
}

export async function uploadFile(node: IZoweUSSTreeNode, doc: vscode.TextDocument): Promise<void> {
    ZoweLogger.trace("uss.actions.uploadFile called.");
    try {
        const localFileName = path.parse(doc.fileName).base;
        const ussName = `${node.fullPath}/${localFileName}`;
        const prof = node.getProfile();

        const task: imperative.ITaskWithStatus = {
            percentComplete: 0,
            statusMessage: vscode.l10n.t("Uploading USS file"),
            stageName: 0, // TaskStage.IN_PROGRESS - https://github.com/kulshekhar/ts-jest/issues/281
        };
        const options: zosfiles.IUploadOptions = {
            task,
            responseTimeout: prof.profile?.responseTimeout,
        };
        if (prof.profile.encoding) {
            options.encoding = prof.profile.encoding;
        }
        await ZoweExplorerApiRegister.getUssApi(prof).putContent(doc.fileName, ussName, options);
    } catch (e) {
        await errorHandling(e, node.getProfileName());
    }
}

export function editAttributes(context: vscode.ExtensionContext, fileProvider: Types.IZoweUSSTreeType, node: IZoweUSSTreeNode): AttributeView {
    return new AttributeView(context, fileProvider, node);
}

/**
 * Copies full path for the selected Zowe USS node
 *
 * @param {ZoweUSSNode} node
 */
export function copyPath(node: IZoweUSSTreeNode): void {
    ZoweLogger.trace("uss.actions.copyPath called.");
    vscode.env.clipboard.writeText(node.fullPath);
}

function findEtag(node: IZoweUSSTreeNode, directories: Array<string>, index: number): boolean {
    if (node === undefined || directories.indexOf(node.label.toString().trim()) === -1) {
        return false;
    }
    if (directories.indexOf(node.label.toString().trim()) === directories.length - 1) {
        return node.getEtag() !== "";
    }

    let flag: boolean = false;
    for (const child of node.children) {
        flag = flag || findEtag(child, directories, directories.indexOf(node.label.toString().trim()) + 1);
    }
    return flag;
}

/**
 * Uploads the file to the mainframe
 *
 * @export
 * @param {Session} session - Desired session
 * @param {vscode.TextDocument} doc - TextDocument that is being saved
 */
export async function saveUSSFile(doc: vscode.TextDocument, ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.saveUSSFile called.");
    ZoweLogger.debug(
        vscode.l10n.t({
            message: "save requested for USS file {0}",
            args: [doc.fileName],
            comment: ["Document file name"],
        })
    );
    const start = path.join(globals.USS_DIR + path.sep).length;
    const ending = doc.fileName.substring(start);
    const sesName = ending.substring(0, ending.indexOf(path.sep));
    const profile = Profiles.getInstance().loadNamedProfile(sesName);
    if (!profile) {
        const sessionError = vscode.l10n.t("Could not locate session when saving USS file.");
        ZoweLogger.error(sessionError);
        await Gui.errorMessage(sessionError);
        return;
    }

    const remote = ending.substring(sesName.length).replace(/\\/g, "/");
    const directories = doc.fileName.split(path.sep).splice(doc.fileName.split(path.sep).indexOf("_U_") + 1);
    directories.splice(1, 2);
    const profileSesnode: IZoweUSSTreeNode = ussFileProvider.mSessionNodes.find((child) => child.label.toString().trim() === sesName);
    const etagProfiles = findEtag(profileSesnode, directories, 0);
    const favoritesSesNode: IZoweUSSTreeNode = ussFileProvider.mFavorites.find((child) => child.label.toString().trim() === sesName);
    const etagFavorites = findEtag(favoritesSesNode, directories, 0);

    // get session from session name
    let sesNode: IZoweUSSTreeNode;
    if ((etagProfiles && etagFavorites) || etagProfiles) {
        sesNode = profileSesnode;
    } else if (etagFavorites) {
        sesNode = favoritesSesNode;
    }
    // Get specific node based on label and parent tree (session / favorites)
    const nodes: IZoweUSSTreeNode[] = concatChildNodes(sesNode ? [sesNode] : ussFileProvider.mSessionNodes);
    const node: IZoweUSSTreeNode =
        nodes.find((zNode) => {
            if (contextually.isText(zNode)) {
                return zNode.fullPath.trim() === remote;
            } else {
                return false;
            }
        }) ?? ussFileProvider.openFiles?.[doc.uri.fsPath];

    // define upload options
    const etagToUpload = node?.getEtag();
    const returnEtag = etagToUpload != null;

    const prof = node?.getProfile() ?? profile;
    try {
        await autoDetectEncoding(node, prof);

        const uploadResponse: zosfiles.IZosFilesResponse = await Gui.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: vscode.l10n.t("Saving file..."),
            },
            () => {
                return uploadContent(node, doc, remote, prof, etagToUpload, returnEtag);
            }
        );
        if (uploadResponse.success) {
            Gui.setStatusBarMessage(uploadResponse.commandResponse, globals.STATUS_BAR_TIMEOUT_MS);
            // set local etag with the new etag from the updated file on mainframe
            node?.setEtag(uploadResponse.apiResponse.etag);
            setFileSaved(true);
            // this part never runs! zowe.Upload.fileToUSSFile doesn't return success: false, it just throws the error which is caught below!!!!!
        } else {
            await markDocumentUnsaved(doc);
            Gui.errorMessage(uploadResponse.commandResponse);
        }
    } catch (err) {
        // TODO: error handling must not be zosmf specific
        const errorMessage = err ? err.message : err.toString();
        if (errorMessage.includes("Rest API failure with HTTP(S) status 412")) {
            await LocalFileManagement.compareSavedFileContent(doc, node, remote, prof);
        } else {
            await markDocumentUnsaved(doc);
            await errorHandling(err, sesName);
        }
    }
}

export async function deleteUSSFilesPrompt(nodes: IZoweUSSTreeNode[]): Promise<boolean> {
    ZoweLogger.trace("uss.actions.deleteUSSFilesPrompt called.");
    const fileNames = nodes.reduce((label, currentVal) => {
        return label + currentVal.label.toString() + "\n";
    }, "");

    const deleteButton = vscode.l10n.t("Delete");
    const message = vscode.l10n.t({
        message:
            "Are you sure you want to delete the following item?\nThis will permanently remove the following file or folder from your system.\n\n{0}",
        args: [fileNames.toString()],
        comment: ["File names"],
    });
    let cancelled = false;
    await Gui.warningMessage(message, {
        items: [deleteButton],
        vsCodeOpts: { modal: true },
    }).then((selection) => {
        if (!selection || selection === "Cancel") {
            ZoweLogger.debug(vscode.l10n.t("Delete action was canceled."));
            cancelled = true;
        }
    });
    return cancelled;
}

/**
 * Builds a file/directory structure that can be traversed from root to the innermost children.
 *
 * @param node Build a tree structure starting at this node
 * @returns A tree structure containing all files/directories within this node
 */
export async function buildFileStructure(node: IZoweUSSTreeNode): Promise<UssFileTree> {
    ZoweLogger.trace("uss.actions.buildFileStructure called.");
    if (contextually.isUssDirectory(node)) {
        const directory: UssFileTree = {
            localPath: node.getUSSDocumentFilePath(),
            ussPath: node.fullPath,
            baseName: node.getLabel() as string,
            sessionName: node.getSessionNode().getLabel() as string,
            type: UssFileType.Directory,
            children: [],
        };

        const children = await node.getChildren();
        if (children != null && children.length > 0) {
            for (const child of children) {
                // This node is either another directory or a file
                const subnode = await buildFileStructure(child);
                directory.children.push(subnode);
            }
        }

        return directory;
    }

    return {
        children: [],
        binary: node.binary,
        localPath: node.getUSSDocumentFilePath(),
        ussPath: node.fullPath,
        baseName: node.getLabel() as string,
        sessionName: node.getSessionNode().getLabel() as string,
        type: UssFileType.File,
    };
}

/**
 * Collects USS file info and builds a tree used for copying and pasting files/folders.
 *
 * @param selectedNodes The list of USS tree nodes that were selected for copying.
 * @returns A file tree containing the USS file/directory paths to be pasted.
 */
export async function ussFileStructure(selectedNodes: IZoweUSSTreeNode[]): Promise<UssFileTree> {
    ZoweLogger.trace("uss.actions.ussFileStructure called.");
    const rootStructure: UssFileTree = {
        ussPath: "",
        type: UssFileType.Directory,
        children: [],
    };

    for (const node of selectedNodes) {
        rootStructure.children.push(await buildFileStructure(node));
    }

    return rootStructure;
}

/**
 * Helper function for `copyUssFiles` that will copy the USS file structure to a JSON
 * object, saving it into a clipboard for future use.
 *
 * @param selectedNodes The list of USS tree nodes that were selected for copying.
 */
export async function copyUssFilesToClipboard(selectedNodes: IZoweUSSTreeNode[]): Promise<void> {
    ZoweLogger.trace("uss.actions.copyUssFilesToClipboard called.");
    const filePaths = await ussFileStructure(selectedNodes);
    vscode.env.clipboard.writeText(JSON.stringify(filePaths));
}

export async function copyUssFiles(node: IZoweUSSTreeNode, nodeList: IZoweUSSTreeNode[], ussFileProvider: Types.IZoweUSSTreeType): Promise<void> {
    ZoweLogger.trace("uss.actions.copyUssFiles called.");
    let selectedNodes;
    if (node || nodeList) {
        selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
    } else {
        selectedNodes = ussFileProvider.getTreeView().selection;
    }
    await Gui.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: vscode.l10n.t("Copying file structure..."),
        },
        () => {
            return copyUssFilesToClipboard(selectedNodes);
        }
    );
}

export async function refreshChildNodesDirectory(node: IZoweUSSTreeNode): Promise<void> {
    ZoweLogger.trace("uss.actions.refreshChildNodesDirectory called.");
    const childNodes = await node.getChildren();
    if (childNodes != null && childNodes.length > 0) {
        for (const child of childNodes) {
            await refreshChildNodesDirectory(child);
        }
    } else {
        if (node.contextValue !== globals.USS_DIR_CONTEXT) {
            await node.refreshUSS();
        }
    }
}

/**
 * @deprecated use `pasteUss`
 * @param ussFileProvider File provider for USS tree
 * @param node The node to paste within
 */
export async function pasteUssFile(ussFileProvider: Types.IZoweUSSTreeType, node: IZoweUSSTreeNode): Promise<void> {
    ZoweLogger.trace("uss.actions.pasteUssFile called.");
    return pasteUss(ussFileProvider, node);
}

/**
 * Paste copied USS nodes into the selected node.
 * @param ussFileProvider File provider for USS tree
 * @param node The node to paste within
 */
export async function pasteUss(ussFileProvider: Types.IZoweUSSTreeType, node: IZoweUSSTreeNode): Promise<void> {
    ZoweLogger.trace("uss.actions.pasteUss called.");
    if (node.pasteUssTree == null && node.copyUssFile == null) {
        await Gui.infoMessage(vscode.l10n.t("The paste operation is not supported for this node."));
        return;
    }
    await Gui.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: vscode.l10n.t("Pasting files..."),
        },
        async () => {
            await (node.pasteUssTree ? node.pasteUssTree() : node.copyUssFile());
        }
    );
    ussFileProvider.refreshElement(node);
}
