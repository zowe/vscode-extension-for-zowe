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

import * as dsUtils from "../dataset/utils";
import * as vscode from "vscode";
import * as fs from "fs";
import * as zowe from "@zowe/cli";
import * as globals from "../globals";
import * as path from "path";
import { errorHandling } from "../utils";
import { labelHack, refreshTree, getDocumentFilePath, concatChildNodes, checkForAddedSuffix, willForceUpload } from "../shared/utils";
import { Profiles, ValidProfileEnum } from "../Profiles";
import { ZoweExplorerApiRegister } from "../api/ZoweExplorerApiRegister";
import { IZoweTree } from "../api/IZoweTree";
import { TextUtils, IProfileLoaded, Session } from "@zowe/imperative";
import { getIconByNode } from "../generators/icons";
import { IZoweDatasetTreeNode, IZoweTreeNode, IZoweNodeType } from "../api/IZoweTreeNode";
import { ZoweDatasetNode } from "./ZoweDatasetNode";
import { DatasetTree } from "./DatasetTree";
import * as contextually from "../shared/context";

import * as nls from "vscode-nls";
const localize = nls.config({messageFormat: nls.MessageFormat.file})();

/**
 * Refreshes treeView
 *
 * @param {DataSetTree} datasetProvider
 */
export async function refreshAll(datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    await Profiles.getInstance().refresh();
    datasetProvider.mSessionNodes.forEach((sessNode) => {
        if (contextually.isSessionNotFav(sessNode)) {
            labelHack(sessNode);
            sessNode.children = [];
            sessNode.dirty = true;
            refreshTree(sessNode);
        }
    });
    datasetProvider.refresh();
}

export async function uploadDialog(node: ZoweDatasetNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    const fileOpenOptions = {
       canSelectFiles: true,
       openLabel: "Upload File",
       canSelectMany: true
    };

    const value = await vscode.window.showOpenDialog(fileOpenOptions);

    if (value && value.length) {
        await Promise.all(
            value.map(async (item) => {
                    // Convert to vscode.TextDocument
                    const doc = await vscode.workspace.openTextDocument(item);
                    await uploadFile(node, doc);
                }
            ));

        // refresh Tree View & favorites
        datasetProvider.refreshElement(node);
        if (contextually.isFavorite(node) || contextually.isFavoriteContext(node.getParent())) {
            const nonFavNode = datasetProvider.findNonFavoritedNode(node);
            if (nonFavNode) {
                datasetProvider.refreshElement(nonFavNode);
            }
        } else {
            const favNode = datasetProvider.findFavoritedNode(node);
            if (favNode) {
                datasetProvider.refreshElement(favNode);
            }
        }
    } else {
        vscode.window.showInformationMessage(localize("enterPattern.pattern", "No selection made."));
    }
}

export async function uploadFile(node: ZoweDatasetNode, doc: vscode.TextDocument) {
    try {
        const datasetName = dsUtils.getDatasetLabel(node);
        await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).putContents(doc.fileName, datasetName);
    } catch (e) {
        errorHandling(e, node.getProfileName(), e.message);
    }
}

/**
 * Creates a PDS member
 *
 * @export
 * @param {IZoweDatasetTreeNode} parent - The parent Node
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function createMember(parent: IZoweDatasetTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    const name = await vscode.window.showInputBox({ placeHolder: localize("createMember.inputBox", "Name of Member") });
    globals.LOG.debug(localize("createMember.log.debug.createNewDataSet", "creating new data set member of name ") + name);
    if (name) {
        let label = parent.label.trim();
        if (contextually.isFavoritePds(parent)) {
            label = parent.label.substring(parent.label.indexOf(":") + 2); // TODO MISSED TESTING
        }

        try {
            await ZoweExplorerApiRegister.getMvsApi(parent.getProfile()).createDataSetMember(label + "(" + name + ")");
        } catch (err) {
            globals.LOG.error(localize("createMember.log.error", "Error encountered when creating member! ") + JSON.stringify(err));
            errorHandling(err, label, localize("createMember.error", "Unable to create member: ") + err.message);
            throw (err);
        }
        parent.dirty = true;
        datasetProvider.refreshElement(parent);
        openPS(
            new ZoweDatasetNode(name, vscode.TreeItemCollapsibleState.None, parent, null, undefined, undefined, parent.getProfile()),
            true, datasetProvider);
        datasetProvider.refresh();
    }
}

/**
 * Downloads and displays a PS in a text editor view
 *
 * @param {IZoweDatasetTreeNode} node
 */
export async function openPS(node: IZoweDatasetTreeNode, previewMember: boolean, datasetProvider?: IZoweTree<IZoweDatasetTreeNode>) {
    // let sesNamePrompt: string;
    // if (node.contextValue.endsWith(globals.FAV_SUFFIX)) {
    //     sesNamePrompt = node.getLabel().substring(1, node.getLabel().indexOf("]"));
    // } else {
    //     sesNamePrompt = node.getLabel();
    // }
    if (datasetProvider) { await datasetProvider.checkCurrentProfile(node); }
    if (Profiles.getInstance().validProfile === ValidProfileEnum.VALID) {
        try {
            let label: string;
            switch (true) {
                case contextually.isFavoriteContext(node.getParent()):
                    label = node.label.substring(node.label.indexOf(":") + 1).trim();
                    break;
                case contextually.isFavoritePds(node.getParent()):
                    label = node.getParent().getLabel().substring(node.getParent().getLabel().indexOf(":") + 1).trim() + "(" + node.getLabel()+ ")";
                    break;
                case contextually.isSessionNotFav(node.getParent()):
                    label = node.label.trim();
                    break;
                case contextually.isPdsNotFav(node.getParent()):
                    label = node.getParent().getLabel().trim() + "(" + node.getLabel()+ ")";
                    break;
                default:
                    vscode.window.showErrorMessage(localize("openPS.invalidNode", "openPS() called from invalid node."));
                    throw Error(localize("openPS.error.invalidNode", "openPS() called from invalid node. "));
            }
            globals.LOG.debug(localize("openPS.log.debug.openDataSet", "opening physical sequential data set from label ") + label);
            // if local copy exists, open that instead of pulling from mainframe
            const documentFilePath = getDocumentFilePath(label, node);
            if (!fs.existsSync(documentFilePath)) {
                const response = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Opening data set..."
                }, function downloadDataset() {
                    return ZoweExplorerApiRegister.getMvsApi(node.getProfile()).getContents(label, {
                        file: documentFilePath,
                        returnEtag: true
                    });
                });
                node.setEtag(response.apiResponse.etag);
            }
            const document = await vscode.workspace.openTextDocument(getDocumentFilePath(label, node));
            if (previewMember === true) {
                await vscode.window.showTextDocument(document);
            } else {
                await vscode.window.showTextDocument(document, {preview: false});
            }
        } catch (err) {
            globals.LOG.error(localize("openPS.log.error.openDataSet", "Error encountered when opening data set! ") + JSON.stringify(err));
            errorHandling(err, node.getProfileName(), err.message);
            throw (err);
        }
    }
}

/**
 * Creates a new file and uploads to the server
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * TODO: Consider changing configuration to allow "custom" data set specifications
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * @export
 * @param {IZoweDatasetTreeNode} node - Desired Zowe session
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function createFile(node: IZoweDatasetTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    const quickPickOptions: vscode.QuickPickOptions = {
        placeHolder: localize("createFile.quickPickOption.dataSetType", "Type of Data Set to be Created"),
        ignoreFocusOut: true,
        canPickMany: false
    };
    const types = [
        localize("createFile.dataSetBinary", "Data Set Binary"),
        localize("createFile.dataSetC", "Data Set C"),
        localize("createFile.dataSetClassic", "Data Set Classic"),
        localize("createFile.dataSetPartitioned", "Data Set Partitioned"),
        localize("createFile.dataSetSequential", "Data Set Sequential")
    ];
    // let sesNamePrompt: string;
    // if (node.contextValue.endsWith(globals.FAV_SUFFIX)) {
    //     sesNamePrompt = node.label.substring(1, node.label.indexOf("]"));
    // } else {
    //     sesNamePrompt = node.label;
    // }

    datasetProvider.checkCurrentProfile(node);
    if (Profiles.getInstance().validProfile === ValidProfileEnum.VALID) {
        // get data set type
        const type = await vscode.window.showQuickPick(types, quickPickOptions);
        if (type == null) {
            globals.LOG.debug(localize("createFile.log.debug.noValidTypeSelected", "No valid data type selected"));
            return;
        } else {
            globals.LOG.debug(localize("createFile.log.debug.creatingNewDataSet", "Creating new data set"));
        }

        let typeEnum;
        let createOptions;
        switch (type) {
            case localize("createFile.dataSetBinary", "Data Set Binary"):
                typeEnum = zowe.CreateDataSetTypeEnum.DATA_SET_BINARY;
                createOptions = vscode.workspace.getConfiguration("Zowe-Default-Datasets-Binary");
                break;
            case localize("createFile.dataSetC", "Data Set C"):
                typeEnum = zowe.CreateDataSetTypeEnum.DATA_SET_C;
                createOptions = vscode.workspace.getConfiguration("Zowe-Default-Datasets-C");
                break;
            case localize("createFile.dataSetClassic", "Data Set Classic"):
                typeEnum = zowe.CreateDataSetTypeEnum.DATA_SET_CLASSIC;
                createOptions = vscode.workspace.getConfiguration("Zowe-Default-Datasets-Classic");
                break;
            case localize("createFile.dataSetPartitioned", "Data Set Partitioned"):
                typeEnum = zowe.CreateDataSetTypeEnum.DATA_SET_PARTITIONED;
                createOptions = vscode.workspace.getConfiguration("Zowe-Default-Datasets-PDS");
                break;
            case localize("createFile.dataSetSequential", "Data Set Sequential"):
                typeEnum = zowe.CreateDataSetTypeEnum.DATA_SET_SEQUENTIAL;
                createOptions = vscode.workspace.getConfiguration("Zowe-Default-Datasets-PS");
                break;
        }

        // get name of data set
        let name = await vscode.window.showInputBox({placeHolder: localize("dataset.name", "Name of Data Set")});
        if (name) {
            name = name.trim().toUpperCase();

            try {
                await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).createDataSet(typeEnum, name, createOptions);
                node.dirty = true;

                const theFilter = await datasetProvider.createFilterString(name, node);
                datasetProvider.addHistory(theFilter);
                datasetProvider.refresh();

                // Show newly-created data set in expanded tree view
                if (name) {
                    node.label = `${node.label} `;
                    node.label = node.label.trim();
                    node.tooltip = node.pattern = theFilter.toUpperCase();
                    node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                    const icon = getIconByNode(node);
                    if (icon) {
                        node.iconPath = icon.path;
                    }
                    node.dirty = true;

                    const newNode = await node.getChildren().then((children) => children.find((child) => child.label === name));
                    datasetProvider.getTreeView().reveal(newNode, { select: true });
                }
            } catch (err) {
                globals.LOG.error(localize("createDataSet.error", "Error encountered when creating data set! ") + JSON.stringify(err));
                errorHandling(err, node.getProfileName(), localize("createDataSet.error", "Error encountered when creating data set! ") +
                    err.message);
                throw (err);
            }
        }
    }
}

/**
 * Shows data set attributes in a new text editor
 *
 * @export
 * @param {IZoweDatasetTreeNode} parent - The parent Node
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function showDSAttributes(parent: IZoweDatasetTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {

    let label = parent.label.trim();
    if (contextually.isFavoritePds(parent) || contextually.isFavoriteDs(parent)) {
        label = parent.label.trim().substring(parent.label.trim().indexOf(":") + 2);
    }

    globals.LOG.debug(localize("showDSAttributes.debug", "showing attributes of data set ") + label);
    let attributes: any;
    try {
        attributes = await ZoweExplorerApiRegister.getMvsApi(parent.getProfile()).dataSet(label, { attributes: true });
        attributes = attributes.apiResponse.items;
        attributes = attributes.filter((dataSet) => {
            return dataSet.dsname.toUpperCase() === label.toUpperCase();
        });
        if (attributes.length === 0) {
            throw new Error(localize("showDSAttributes.lengthError", "No matching data set names found for query: ") + label);
        }
    } catch (err) {
        globals.LOG.error(localize("showDSAttributes.log.error", "Error encountered when listing attributes! ") + JSON.stringify(err));
        errorHandling(err, parent.getProfileName(), localize("showDSAttributes.error", "Unable to list attributes: ") + err.message);
        throw (err);
    }

    // shouldn't be possible for there to be two cataloged data sets with the same name,
    // but just in case we'll display all of the results
    // if there's only one result (which there should be), we will just pass in attributes[0]
    // so that prettyJson doesn't display the attributes as an array with a hyphen character
    const attributesText = TextUtils.prettyJson(attributes.length > 1 ? attributes : attributes[0], undefined, false);
    // const attributesFilePath = path.join(ZOWETEMPFOLDER, label + ".yaml");
    // fs.writeFileSync(attributesFilePath, attributesText);
    // const document = await vscode.workspace.openTextDocument(attributesFilePath);
    // await vscode.window.showTextDocument(document);
    const attributesMessage = localize("attributes.title", "Attributes");
    const webviewHTML = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${label} "${attributesMessage}"</title>
    </head>
    <body>
     ${attributesText.replace(/\n/g, "</br>")}
    </body>
    </html>`;
    const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
        "zowe",
        label + " " + localize("attributes.title", "Attributes"),
        column || 1,
        {}
    );
    panel.webview.html = webviewHTML;
}

/**
 * Rename data sets
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function renameDataSet(node: IZoweDatasetTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    let beforeDataSetName = node.label.trim();
    let favPrefix = "";
    let isFavourite;

    if (node.contextValue.includes(globals.FAV_SUFFIX)) {
        isFavourite = true;
        favPrefix = node.label.substring(0, node.label.indexOf(":") + 2);
        beforeDataSetName = node.label.substring(node.label.indexOf(":") + 2);
    }
    const afterDataSetName = await vscode.window.showInputBox({value: beforeDataSetName});
    const beforeFullPath = getDocumentFilePath(node.getLabel(), node);
    const closedOpenedInstance = await closeOpenedTextFile(beforeFullPath);

    globals.LOG.debug(localize("renameDataSet.log.debug", "Renaming data set ") + afterDataSetName);
    if (afterDataSetName) {
        try {
            await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).renameDataSet(beforeDataSetName, afterDataSetName);
            node.label = `${favPrefix}${afterDataSetName}`;

            if (isFavourite) {
                const profile = favPrefix.substring(1, favPrefix.indexOf("]"));
                datasetProvider.renameNode(profile, beforeDataSetName, afterDataSetName);
            } else {
                const temp = node.label;
                node.label = "[" + node.getSessionNode().label.trim() + "]: " + beforeDataSetName;
                datasetProvider.renameFavorite(node, afterDataSetName);
                node.label = temp;
            }
            datasetProvider.refreshElement(node);
            datasetProvider.updateFavorites();

            if (fs.existsSync(beforeFullPath)) {
              fs.unlinkSync(beforeFullPath);
            }

            if (closedOpenedInstance) {
                vscode.commands.executeCommand("zowe.ZoweNode.openPS", node);
            }
        } catch (err) {
            globals.LOG.error(localize("renameDataSet.log.error", "Error encountered when renaming data set! ") + JSON.stringify(err));
            errorHandling(err, favPrefix, localize("renameDataSet.error", "Unable to rename data set: ") + err.message);
            throw err;
        }
    }
}

/**
 * Submit the contents of the editor as JCL.
 *
 * @export
 * @param {DatasetTree} datasetProvider - our DatasetTree object
 */
export async function submitJcl(datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    if (!vscode.window.activeTextEditor) {
        vscode.window.showErrorMessage(
            localize("submitJcl.noDocumentOpen", "No editor with a document that could be submitted as JCL is currently open."));
        return;
    }
    const doc = vscode.window.activeTextEditor.document;
    globals.LOG.debug(localize("submitJcl.log.debug", "Submitting JCL in document ") + doc.fileName);
    // get session name
    const sessionregex = /\[(.*)(\])(?!.*\])/g;
    const regExp = sessionregex.exec(doc.fileName);
    const profiles = Profiles.getInstance();
    let sessProfileName;
    if (regExp === null) {
        const allProfiles: IProfileLoaded[] = profiles.allProfiles;
        const profileNamesList = allProfiles.map((profile) => {
            return profile.name;
        });
        if (profileNamesList.length) {
            const quickPickOptions: vscode.QuickPickOptions = {
                placeHolder: localize("submitJcl.quickPickOption", "Select the Profile to use to submit the job"),
                ignoreFocusOut: true,
                canPickMany: false
            };
            sessProfileName = await vscode.window.showQuickPick(profileNamesList, quickPickOptions);
        } else {
            vscode.window.showInformationMessage(localize("submitJcl.noProfile", "No profiles available"));
        }
    } else {
        sessProfileName = regExp[1];
        if (sessProfileName.includes("[")) {
            // if submitting from favorites, sesName might be the favorite node, so extract further
            sessProfileName = sessionregex.exec(sessProfileName)[1];
        }
    }

    // get profile from session name
    let sessProfile: IProfileLoaded;
    const sesNode = (await datasetProvider.getChildren()).find((child) => child.label.trim() === sessProfileName);
    if (sesNode) {
        sessProfile = sesNode.getProfile();
    } else {
        // if submitting from favorites, a session might not exist for this node
        sessProfile = profiles.loadNamedProfile(sessProfileName);
    }
    if (sessProfile == null) {
        globals.LOG.error(localize("submitJcl.log.error.nullSession", "Session for submitting JCL was null or undefined!"));
        return;
    }
    try {
        const job = await ZoweExplorerApiRegister.getJesApi(sessProfile).submitJcl(doc.getText());
        const args = [sessProfileName, job.jobid];
        const setJobCmd = `command:zowe.setJobSpool?${encodeURIComponent(JSON.stringify(args))}`;
        vscode.window.showInformationMessage(localize("submitJcl.jobSubmitted", "Job submitted ") + `[${job.jobid}](${setJobCmd})`);
    } catch (error) {
        errorHandling(error, sessProfileName, localize("submitJcl.jobSubmissionFailed", "Job submission failed\n") + error.message);
    }
}

/**
 * Submit the selected dataset member as a Job.
 *
 * @export
 * @param node The dataset member
 */
export async function submitMember(node: IZoweTreeNode) {
    const labelregex = /\[(.+)\]\: (.+)/g;
    let label;
    let sesName;
    let sessProfile;
    let regex;
    const profiles = Profiles.getInstance();
    switch (true) {
        case contextually.isFavoriteContext(node.getParent()):
            regex = labelregex.exec(node.getLabel());
            sesName = regex[1];
            label = regex[2];
            sessProfile = profiles.loadNamedProfile(sesName);
            break;
        case contextually.isFavoritePds(node.getParent()):
            regex = labelregex.exec(node.getParent().getLabel());
            sesName = regex[1];
            label = regex[2] + "(" + node.label.trim()+ ")";
            sessProfile = node.getParent().getProfile();
            break;
        case contextually.isSessionNotFav(node.getParent()):
            sesName = node.getParent().getLabel();
            label = node.label;
            sessProfile = node.getParent().getProfile();
            break;
        case contextually.isPdsNotFav(node.getParent()):
            sesName = node.getParent().getParent().getLabel();
            label = node.getParent().getLabel() + "(" + node.label.trim()+ ")";
            sessProfile = node.getParent().getParent().getProfile();
            break;
        default:
            vscode.window.showErrorMessage(localize("submitMember.invalidNode", "submitMember() called from invalid node."));
            throw Error(localize("submitMember.error.invalidNode", "submitMember() called from invalid node."));
    }
    try {
        const job = await ZoweExplorerApiRegister.getJesApi(sessProfile).submitJob(label);
        const args = [sesName, job.jobid];
        const setJobCmd = `command:zowe.setJobSpool?${encodeURIComponent(JSON.stringify(args))}`;
        vscode.window.showInformationMessage(localize("submitMember.jobSubmitted", "Job submitted ") + `[${job.jobid}](${setJobCmd})`);
    } catch (error) {
        errorHandling(error, sesName, localize("submitMember.jobSubmissionFailed", "Job submission failed\n") + error.message);
    }
}

/**
 * Rename data set members
 *
 * @export
 * @param {IZoweTreeNode} node - The node
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function renameDataSetMember(node: IZoweTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    const beforeMemberName = node.label.trim();
    let dataSetName;
    let profileLabel;

    if (node.getParent().contextValue.includes(globals.FAV_SUFFIX)) {
        profileLabel = node.getParent().getLabel().substring(0, node.getParent().getLabel().indexOf(":") + 2);
        dataSetName = node.getParent().getLabel().substring(node.getParent().getLabel().indexOf(":") + 2);
    } else {
        dataSetName = node.getParent().getLabel();
    }
    const afterMemberName = await vscode.window.showInputBox({value: beforeMemberName});
    const beforeFullPath = getDocumentFilePath(`${node.getParent().getLabel()}(${node.getLabel()})`, node);
    const closedOpenedInstance = await closeOpenedTextFile(beforeFullPath);

    globals.LOG.debug(localize("renameDataSet.log.debug", "Renaming data set ") + afterMemberName);
    if (afterMemberName) {
        try {
            await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).renameDataSetMember(dataSetName, beforeMemberName, afterMemberName);
            node.label = afterMemberName;
        } catch (err) {
            globals.LOG.error(localize("renameDataSet.log.error", "Error encountered when renaming data set! ") + JSON.stringify(err));
            errorHandling(err, profileLabel, localize("renameDataSet.error", "Unable to rename data set: ") + err.message);
            throw err;
        }
        let otherParent;

        if (node.getParent().contextValue.includes(globals.FAV_SUFFIX)) {
            otherParent = datasetProvider.findNonFavoritedNode(node.getParent());
        } else {
            otherParent = datasetProvider.findFavoritedNode(node.getParent());
        }
        if (otherParent) {
            const otherMember = otherParent.children.find((child) => child.label === beforeMemberName);
            if (otherMember) {
                otherMember.label = afterMemberName;
                datasetProvider.refreshElement(otherMember);
            }
        }
        datasetProvider.refreshElement(node);

        if (fs.existsSync(beforeFullPath)) {
            fs.unlinkSync(beforeFullPath);
        }

        if (closedOpenedInstance) {
            vscode.commands.executeCommand("zowe.ZoweNode.openPS", node);
        }
    }
}

/**
 * Deletes a dataset
 *
 * @export
 * @param {IZoweTreeNode} node - The node to be deleted
 * @param {IZoweTree<IZoweDatasetTreeNode>} datasetProvider - the tree which contains the nodes
 */
export async function deleteDataset(node: IZoweTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    globals.LOG.debug(localize("deleteDataset.log.debug", "Deleting data set ") + node.label);
    const quickPickOptions: vscode.QuickPickOptions = {
        placeHolder: localize("deleteDataset.quickPickOption", "Are you sure you want to delete ") + node.label,
        ignoreFocusOut: true,
        canPickMany: false
    };
    // confirm that the user really wants to delete
    if (await vscode.window.showQuickPick([localize("deleteDataset.showQuickPick.yes", "Yes"),
        localize("deleteDataset.showQuickPick.no", "No")], quickPickOptions) !== localize("deleteDataset.showQuickPick.yes", "Yes")) {
        globals.LOG.debug(localize("deleteDataset.showQuickPick.log.debug", "User picked no. Cancelling delete of data set"));
        return;
    }

    let label = "";
    let fav = false;
    try {
        switch (node.getParent().contextValue) {
            case (globals.FAVORITE_CONTEXT):
                label = node.label.substring(node.label.indexOf(":") + 1).trim();
                fav = true;
                break;
            case (globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX):
                label = node.getParent().getLabel().substring(node.getParent().getLabel().indexOf(":") + 1).trim() + "(" + node.getLabel()+ ")";
                fav = true;
                break;
            case (globals.DS_SESSION_CONTEXT):
                label = node.getLabel();
                break;
            case (globals.DS_PDS_CONTEXT):
                label = node.getParent().getLabel()+ "(" + node.getLabel()+ ")";
                break;
            default:
                throw Error(localize("deleteDataSet.invalidNode.error", "deleteDataSet() called from invalid node."));
        }
        await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).deleteDataSet(label);
    } catch (err) {
        globals.LOG.error(localize("deleteDataSet.delete.log.error", "Error encountered when deleting data set! ") + JSON.stringify(err));
        if (err.message.includes(localize("deleteDataSet.error.notFound", "not found"))) {
            vscode.window.showInformationMessage(localize("deleteDataSet.notFound.error1", "Unable to find file: ") + label +
                localize("deleteDataSet.notFound.error2", " was probably already deleted."));
        } else {
            errorHandling(err, node.getProfileName(), err.message);
        }
        throw err;
    }

    // remove node from tree
    if (fav) {
        datasetProvider.mSessionNodes.forEach((ses) => {
            if (node.label.substring(node.label.indexOf("[") + 1, node.label.indexOf("]")) === ses.label.trim()||
                node.getParent().getLabel().substring(node.getParent().getLabel().indexOf("["),
                        node.getParent().getLabel().indexOf("]")) === ses.label) {
                ses.dirty = true;
            }
        });
        datasetProvider.removeFavorite(node);
    } else {
        node.getSessionNode().dirty = true;
        const temp = node.label;
        node.label = "[" + node.getSessionNode().label.trim() + "]: " + node.label;
        datasetProvider.removeFavorite(node);
        node.label = temp;
    }

    // refresh Tree View & favorites
    if (node.getParent() && node.getParent().contextValue !== globals.DS_SESSION_CONTEXT) {
        datasetProvider.refreshElement(node.getParent());
        if (contextually.isFavorite(node) || contextually.isFavoriteContext(node.getParent())) {
            const nonFavNode = datasetProvider.findNonFavoritedNode(node.getParent());
            if (nonFavNode) { datasetProvider.refreshElement(nonFavNode); }
        } else {
            const favNode = datasetProvider.findFavoritedNode(node.getParent());
            if (favNode) { datasetProvider.refreshElement(favNode); }
        }
    } else {
        datasetProvider.refresh();
    }

    // remove local copy of file
    const fileName = getDocumentFilePath(label, node);
    try {
        if (fs.existsSync(fileName)) {
            fs.unlinkSync(fileName);
        }
    } catch (err) {
        // do nothing
    }
}

/**
 * Refreshes the passed node with current mainframe data
 *
 * @param {IZoweDatasetTreeNode} node - The node which represents the dataset
 */
export async function refreshPS(node: IZoweDatasetTreeNode) {
    let label;
    try {
        switch (true) {
            case contextually.isFavoriteContext(node.getParent()):
                label = node.label.substring(node.label.indexOf(":") + 1).trim();
                break;
            case contextually.isFavoritePds(node.getParent()):
                label = node.getParent().getLabel().substring(node.getParent().getLabel().indexOf(":") + 1).trim() + "(" + node.getLabel()+ ")";
                break;
            case contextually.isSessionNotFav(node.getParent()):
                label = node.label.trim();
                break;
            case contextually.isPdsNotFav(node.getParent()):
                label = node.getParent().getLabel() + "(" + node.getLabel() + ")";
                break;
            default:
                throw Error(localize("refreshPS.error.invalidNode", "refreshPS() called from invalid node."));
        }
        const documentFilePath = getDocumentFilePath(label, node);
        const response = await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).getContents(label, {
            file: documentFilePath,
            returnEtag: true
        });
        node.setEtag(response.apiResponse.etag);

        const document = await vscode.workspace.openTextDocument(documentFilePath);
        vscode.window.showTextDocument(document);
        // if there are unsaved changes, vscode won't automatically display the updates, so close and reopen
        if (document.isDirty) {
            await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            vscode.window.showTextDocument(document);
        }
    } catch (err) {
        globals.LOG.error(localize("refreshPS.log.error.refresh", "Error encountered when refreshing data set view: ") + JSON.stringify(err));
        if (err.message.includes(localize("refreshPS.error.notFound", "not found"))) {
            vscode.window.showInformationMessage(localize("refreshPS.file1", "Unable to find file: ") + label +
                localize("refreshPS.file2", " was probably deleted."));
        } else {
            errorHandling(err, node.getProfileName(), err.message);
        }
    }
}

/**
 * Prompts the user for a pattern, and populates the [TreeView]{@link vscode.TreeView} based on the pattern
 *
 * @param {IZoweDatasetTreeNode} node - The session node
 * @param {DatasetTree} datasetProvider - Current DatasetTree used to populate the TreeView
 * @returns {Promise<void>}
 */
export async function enterPattern(node: IZoweDatasetTreeNode, datasetProvider: DatasetTree) {
    if (globals.LOG) {
        globals.LOG.debug(localize("enterPattern.log.debug.prompt", "Prompting the user for a data set pattern"));
    }
    let pattern: string;
    if (contextually.isSessionNotFav(node)) {
        // manually entering a search
        const options: vscode.InputBoxOptions = {
            prompt: localize("enterPattern.options.prompt",
                                     "Search data sets by entering patterns: use a comma to separate multiple patterns"),
            value: node.pattern
        };
        // get user input
        pattern = await vscode.window.showInputBox(options);
        if (!pattern) {
            vscode.window.showInformationMessage(localize("enterPattern.pattern", "You must enter a pattern."));
            return;
        }
    } else {
        // executing search from saved search in favorites
        pattern = node.label.trim().substring(node.label.trim().indexOf(":") + 2);
        const session = node.label.trim().substring(node.label.trim().indexOf("[") + 1, node.label.trim().indexOf("]"));
        await datasetProvider.addSession(session);
        node = datasetProvider.mSessionNodes.find((tempNode) => tempNode.label.trim() === session);
    }

    // update the treeview with the new pattern
    // TODO figure out why a label change is needed to refresh the treeview,
    // instead of changing the collapsible state
    // change label so the treeview updates
    node.label = node.label.trim() + " ";
    node.label = node.label.trim();
    node.tooltip = node.pattern = pattern.toUpperCase();
    node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    node.dirty = true;
    const icon = getIconByNode(node);
    if (icon) {
        node.iconPath = icon.path;
    }
    datasetProvider.addHistory(node.pattern);
}

/**
 * Copy data sets
 *
 * @export
 * @param {IZoweNodeType} node - The node to copy
 */
export async function copyDataSet(node: IZoweNodeType) {
    return vscode.env.clipboard.writeText(JSON.stringify(dsUtils.getNodeLabels(node)));
}

/**
 * Migrate data sets
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node to paste to
 */
export async function hMigrateDataSet(node: ZoweDatasetNode) {
    const { dataSetName } = dsUtils.getNodeLabels(node);
    vscode.window.showInformationMessage(localize("hMigrate.requestSent1", "Migration of dataset: ") + dataSetName +
    localize("hMigrate.requestSent2", " requested."));
    return ZoweExplorerApiRegister.getMvsApi(node.getProfile()).hMigrateDataSet(dataSetName);
}

/**
 * Paste data sets
 *
 * @export
 * @param {ZoweNode} node - The node to paste to
 * @param {DatasetTree} datasetProvider - the tree which contains the nodes
 */
export async function pasteDataSet(node: IZoweDatasetTreeNode, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    const { profileName, dataSetName } = dsUtils.getNodeLabels(node);
    let memberName;
    let beforeDataSetName;
    let beforeProfileName;
    let beforeMemberName;

    if (node.contextValue.includes(globals.DS_PDS_CONTEXT)) {
        memberName = await vscode.window.showInputBox({placeHolder: localize("renameDataSet.name", "Name of Data Set Member")});
        if (!memberName) {
            return;
        }
    }

    try {
        ({
            dataSetName: beforeDataSetName,
            memberName: beforeMemberName,
            profileName: beforeProfileName,
        } = JSON.parse(await vscode.env.clipboard.readText()));
    } catch (err) {
        throw Error("Invalid clipboard. Copy from data set first");
    }

    if (beforeProfileName === profileName) {
        if (memberName) {
            const responseItem: zowe.IZosFilesResponse = await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).allMembers(`${dataSetName}`);
            if (responseItem.apiResponse.items.some( (singleItem) => singleItem.member === memberName.toUpperCase())) {
                throw Error(`${dataSetName}(${memberName}) already exists. You cannot replace a member`);
            }
        }
        await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).copyDataSetMember(
            { dataSetName: beforeDataSetName, memberName: beforeMemberName },
            { dataSetName, memberName }
        );

        if (memberName) {
            datasetProvider.refreshElement(node);
            let node2;
            if (node.contextValue.includes(globals.FAV_SUFFIX)) {
                node2 = datasetProvider.findNonFavoritedNode(node);
            } else {
                node2 = datasetProvider.findFavoritedNode(node);
            }
            if (node2) {
                datasetProvider.refreshElement(node2);
            }
        } else {
            refreshPS(node);
        }
    }
}

/**
 * Uploads the file to the mainframe
 *
 * @export
 * @param {vscode.TextDocument} doc - TextDocument that is being saved
 */
export async function saveFile(doc: vscode.TextDocument, datasetProvider: IZoweTree<IZoweDatasetTreeNode>) {
    // Check if file is a data set, instead of some other file
    globals.LOG.debug(localize("saveFile.log.debug.request", "requested to save data set: ") + doc.fileName);
    const docPath = path.join(doc.fileName, "..");
    globals.LOG.debug("requested to save data set: " + doc.fileName);
    if (docPath.toUpperCase().indexOf(globals.DS_DIR.toUpperCase()) === -1) {
        globals.LOG.debug(localize("saveFile.log.debug.path", "path.relative returned a non-blank directory.") +
            localize("saveFile.log.debug.directory",
                             "Assuming we are not in the DS_DIR directory: ") + path.relative(docPath, globals.DS_DIR));
        return;
    }
    const start = path.join(globals.DS_DIR + path.sep).length;
    const ending = doc.fileName.substring(start);
    const sesName = ending.substring(0, ending.indexOf(path.sep));
    const profile = (await Profiles.getInstance()).loadNamedProfile(sesName);
    if (!profile) {
        globals.LOG.error(localize("saveFile.log.error.session", "Couldn't locate session when saving data set!"));
        return vscode.window.showErrorMessage(localize("saveFile.log.error.session", "Couldn't locate session when saving data set!"));
    }

    // get session from session name
    let documentSession: Session;
    let node: IZoweDatasetTreeNode;
    const sesNode = (await datasetProvider.getChildren()).find((child) =>
        child.label.trim() === sesName);
    if (sesNode) {
        globals.LOG.debug(localize("saveFile.log.debug.load", "Loading session from session node in saveFile()"));
        documentSession = sesNode.getSession();
    } else {
        // if saving from favorites, a session might not exist for this node
        globals.LOG.debug(localize("saveFile.log.debug.sessionNode", "couldn't find session node, loading profile with CLI profile manager"));
        documentSession = ZoweExplorerApiRegister.getMvsApi(profile).getSession();
    }

    // If not a member
    let label = doc.fileName.substring(doc.fileName.lastIndexOf(path.sep) + 1,
        checkForAddedSuffix(doc.fileName) ? doc.fileName.lastIndexOf(".") : doc.fileName.length);
    label = label.toUpperCase();
    globals.LOG.debug(localize("saveFile.log.debug.saving", "Saving file ") + label);
    if (!label.includes("(")) {
        try {
            // Checks if file still exists on server
            const response = await ZoweExplorerApiRegister.getMvsApi(profile).dataSet(label);
            if (!response.apiResponse.items.length) {
                return vscode.window.showErrorMessage(
                    localize("saveFile.error.saveFailed", "Data set failed to save. Data set may have been deleted on mainframe."));
            }
        } catch (err) {
            errorHandling(err, sesName, err.message);
        }
    }
    // Get specific node based on label and parent tree (session / favorites)
    let nodes: IZoweNodeType[];
    let isFromFavorites: boolean;
    if (!sesNode || sesNode.children.length === 0) {
        // saving from favorites
        nodes = concatChildNodes(datasetProvider.mFavorites);
        isFromFavorites = true;
    } else {
        // saving from session
        nodes = concatChildNodes([sesNode]);
        isFromFavorites = false;
    }
    node = nodes.find((zNode) => {
        // dataset in Favorites
        if (contextually.isFavoriteDs(zNode)) {
            return (zNode.label === `[${sesName}]: ${label}`);
            // member in Favorites
        } else if (contextually.isDsMember(zNode) && isFromFavorites) {
            const zNodeDetails = dsUtils.getProfileAndDataSetName(zNode);
            return (`${zNodeDetails.profileName}(${zNodeDetails.dataSetName})` === `[${sesName}]: ${label}`);
        } else if (contextually.isDsMember(zNode) && !isFromFavorites) {
            const zNodeDetails = dsUtils.getProfileAndDataSetName(zNode);
            return (`${zNodeDetails.profileName}(${zNodeDetails.dataSetName})` === `${label}`);
        } else if (contextually.isDs(zNode)) {
            return (zNode.label.trim() === label);
        } else {
            return false;
        }
    });

    // define upload options
    let uploadOptions: zowe.IUploadOptions;
    if (node) {
        uploadOptions = {
            etag: node.getEtag(),
            returnEtag: true
        };
    }

    try {
        const uploadResponse = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize("saveFile.response.save.title", "Saving data set...")
        }, () => {
            return ZoweExplorerApiRegister.getMvsApi(node ? node.getProfile(): profile).putContents(doc.fileName, label, uploadOptions);
        });
        if (uploadResponse.success) {
            vscode.window.showInformationMessage(uploadResponse.commandResponse);
            // set local etag with the new etag from the updated file on mainframe
            if (node) {
                node.setEtag(uploadResponse.apiResponse[0].etag);
            }
        } else if (!uploadResponse.success && uploadResponse.commandResponse.includes(
            localize("saveFile.error.ZosmfEtagMismatchError", "Rest API failure with HTTP(S) status 412"))) {
            if (globals.ISTHEIA) {
                await willForceUpload(node, doc, label, node ? node.getProfile(): profile);
            } else {
                const oldDoc = doc;
                const oldDocText = oldDoc.getText();
                const downloadResponse = await ZoweExplorerApiRegister.getMvsApi(node ? node.getProfile(): profile).getContents(label, {
                    file: doc.fileName,
                    returnEtag: true
                });
                // re-assign etag, so that it can be used with subsequent requests
                const downloadEtag = downloadResponse.apiResponse.etag;
                if (node && downloadEtag !== node.getEtag()) {
                    node.setEtag(downloadEtag);
                }
                vscode.window.showWarningMessage(localize("saveFile.error.etagMismatch",
                "Remote file has been modified in the meantime.\nSelect 'Compare' to resolve the conflict."));
                // Store document in a separate variable, to be used on merge conflict
                const startPosition = new vscode.Position(0, 0);
                const endPosition = new vscode.Position(oldDoc.lineCount, 0);
                const deleteRange = new vscode.Range(startPosition, endPosition);
                await vscode.window.activeTextEditor.edit((editBuilder) => {
                    // re-write the old content in the editor view
                    editBuilder.delete(deleteRange);
                    editBuilder.insert(startPosition, oldDocText);
                });
                await vscode.window.activeTextEditor.document.save();
            }
        } else {
            vscode.window.showErrorMessage(uploadResponse.commandResponse);
        }
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

/**
 * Opens the next tab in editor with given delay
 */
function openNextTab(delay: number) {
    return new Promise((resolve) => {
        vscode.commands.executeCommand("workbench.action.nextEditor");
        setTimeout(() => resolve(), delay);
    });
}

interface IExtTextEditor extends vscode.TextEditor { id: string; }

/**
 * Closes opened file tab using iteration through the tabs
 * This kind of method is caused by incompleteness of VSCode API, which allows to close only currently selected editor
 * For us it means we need to select editor first, which is again not possible via existing VSCode APIs
 */
export async function closeOpenedTextFile(filePath: string) {
    const tabSwitchDelay = 200;
    const openedWindows = [] as IExtTextEditor[];

    let selectedEditor = vscode.window.activeTextEditor as IExtTextEditor;
    while (selectedEditor && !openedWindows.some((window) => window.id === selectedEditor.id)) {
        openedWindows.push(selectedEditor);

        await openNextTab(tabSwitchDelay);
        selectedEditor = vscode.window.activeTextEditor as IExtTextEditor;

        if (selectedEditor && selectedEditor.document.fileName === filePath) {
            vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            return true;
        }
    }

    return false;
}
