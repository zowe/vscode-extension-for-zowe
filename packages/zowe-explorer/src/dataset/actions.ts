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

import * as dsUtils from "../dataset/utils";
import * as vscode from "vscode";
import * as fs from "fs";
import * as zosfiles from "@zowe/zos-files-for-zowe-sdk";
import * as globals from "../globals";
import * as path from "path";
import { FilterItem, errorHandling } from "../utils/ProfilesUtils";
import {
    getDocumentFilePath,
    concatChildNodes,
    checkForAddedSuffix,
    getSelectedNodeList,
    JobSubmitDialogOpts,
    JOB_SUBMIT_DIALOG_OPTS,
    uploadContent,
} from "../shared/utils";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";
import { Profiles } from "../Profiles";
import { getIconByNode } from "../generators/icons";
import { ZoweDatasetNode } from "./ZoweDatasetNode";
import * as contextually from "../shared/context";
import { markDocumentUnsaved, setFileSaved } from "../utils/workspace";
import { ProfileManagement } from "../utils/ProfileManagement";
import { LocalFileManagement } from "../utils/LocalFileManagement";
import { Gui, imperative, IZoweDatasetTreeNode, Validation, Types, ZoweLogger } from "@zowe/zowe-explorer-api";

let typeEnum: zosfiles.CreateDataSetTypeEnum;
// Make a nice new mutable array for the DS properties
let newDSProperties;

/**
 * Localized strings that are used multiple times within the file
 */
const localizedStrings = {
    dsBinary: vscode.l10n.t("Partitioned Data Set: Binary"),
    dsC: vscode.l10n.t("Partitioned Data Set: C"),
    dsClassic: vscode.l10n.t("Partitioned Data Set: Classic"),
    dsPartitioned: vscode.l10n.t("Partitioned Data Set: Default"),
    dsExtended: vscode.l10n.t("Partitioned Data Set: Extended"),
    dsSequential: vscode.l10n.t("Sequential Data Set"),
    opCancelled: vscode.l10n.t("Operation Cancelled"),
    copyingFiles: vscode.l10n.t("Copying File(s)"),
    profileInvalid: vscode.l10n.t("Profile is invalid, check connection details."),
    allocString: vscode.l10n.t("Allocate Data Set"),
    editString: vscode.l10n.t("Edit Attributes"),
};

/**
 * Allocates a copy of a data set or member
 *
 */
export async function allocateLike(datasetProvider: Types.IZoweDatasetTreeType, node?: IZoweDatasetTreeNode): Promise<void> {
    let profile: imperative.IProfileLoaded;
    let likeDSName: string;
    let currSession: IZoweDatasetTreeNode;

    // User called allocateLike from the command palette
    if (!node) {
        // The user must choose a session
        const qpItems = [];
        const quickpick = Gui.createQuickPick();
        quickpick.placeholder = vscode.l10n.t("Select the profile to which the original data set belongs");
        quickpick.ignoreFocusOut = true;

        for (const thisSession of datasetProvider.mSessionNodes) {
            if (!thisSession.label.toString().includes("Favorites")) {
                qpItems.push(new FilterItem({ text: thisSession.label as string }));
            }
        }
        quickpick.items = [...qpItems];

        quickpick.show();
        const selection = await Gui.resolveQuickPick(quickpick);
        if (!selection) {
            Gui.showMessage(vscode.l10n.t("You must select a profile."));
            return;
        } else {
            ZoweLogger.trace(`${selection?.toString()} was profile chosen to allocate a data set.`);
            currSession = datasetProvider.mSessionNodes.find((thisSession) => thisSession.label === selection.label);
            profile = currSession.getProfile();
        }
        quickpick.dispose();

        // The user must enter the name of a data set to copy
        const currSelection = datasetProvider.getTreeView().selection.length > 0 ? datasetProvider.getTreeView().selection[0].label : null;
        const inputBoxOptions: vscode.InputBoxOptions = {
            ignoreFocusOut: true,
            placeHolder: vscode.l10n.t("Enter the name of the data set to copy attributes from"),
            value: currSelection as string,
            validateInput: (text) => {
                return dsUtils.validateDataSetName(text) === true ? null : vscode.l10n.t("Enter a valid data set name.");
            },
        };
        likeDSName = await Gui.showInputBox(inputBoxOptions);
        if (!likeDSName) {
            Gui.showMessage(vscode.l10n.t("You must enter a new data set name."));
            return;
        }
        ZoweLogger.trace(`${likeDSName} was entered to use attributes for new data set.`);
    } else {
        // User called allocateLike by right-clicking a node
        profile = node.getProfile();
        likeDSName = node.label.toString().replace(/\[.*\]: /g, "");
    }
    ZoweLogger.info(
        vscode.l10n.t({
            message: "Allocating data set like {0}.",
            args: [likeDSName],
            comment: ["Like Data Set name"],
        })
    );

    // Get new data set name
    const options: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: vscode.l10n.t("Enter a name for the new data set"),
        validateInput: (text) => {
            return dsUtils.validateDataSetName(text) === true ? null : vscode.l10n.t("Enter a valid data set name.");
        },
    };
    const newDSName = await Gui.showInputBox(options);
    if (!newDSName) {
        Gui.showMessage(vscode.l10n.t("You must enter a new data set name."));
        return;
    } else {
        ZoweLogger.trace(`${newDSName} was entered for the name of the new data set.`);
        // Allocate the data set, or throw an error
        try {
            await ZoweExplorerApiRegister.getMvsApi(profile).allocateLikeDataSet(newDSName.toUpperCase(), likeDSName);
        } catch (err) {
            if (err instanceof Error) {
                await errorHandling(err, newDSName, vscode.l10n.t("Unable to create data set."));
            }
            throw err;
        }
    }

    // Refresh tree and open new node, if applicable
    if (!currSession) {
        currSession = datasetProvider.mSessionNodes.find((thisSession) => thisSession.label.toString().trim() === profile.name);
    }

    const theFilter = datasetProvider.createFilterString(newDSName, currSession);
    currSession.tooltip = currSession.pattern = theFilter.toUpperCase();
    datasetProvider.refresh();
    currSession.dirty = true;
    datasetProvider.refreshElement(currSession);
    const newNode = (await currSession.getChildren()).find((child) => child.label.toString() === newDSName.toUpperCase());
    await datasetProvider.getTreeView().reveal(currSession, { select: true, focus: true });
    datasetProvider.getTreeView().reveal(newNode, { select: true, focus: true });
    ZoweLogger.info(
        vscode.l10n.t({
            message: "{0} was created like {1}.",
            args: [newDSName, likeDSName],
            comment: ["New Data Set name", "Like Data Set name"],
        })
    );
}

export async function uploadDialog(node: ZoweDatasetNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.uploadDialog called.");
    const fileOpenOptions = {
        canSelectFiles: true,
        openLabel: "Upload File",
        canSelectMany: true,
        defaultUri: LocalFileManagement.getDefaultUri(),
    };
    const value = await Gui.showOpenDialog(fileOpenOptions);
    if (value?.length > 0) {
        await Gui.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t("Uploading to data set"),
                cancellable: true,
            },
            async (progress, token) => {
                let index = 0;
                for (const item of value) {
                    if (token.isCancellationRequested) {
                        Gui.showMessage(vscode.l10n.t("Upload action was cancelled."));
                        break;
                    }
                    Gui.reportProgress(progress, value.length, index, "Uploading");
                    const response = await uploadFile(node, item.fsPath);
                    if (!response?.success) {
                        await errorHandling(response?.commandResponse, node.getProfileName(), response?.commandResponse);
                        break;
                    }
                    index++;
                }
            }
        );

        // refresh Tree View & favorites
        datasetProvider.refreshElement(node);
        datasetProvider.getTreeView().reveal(node, { expand: true, focus: true });
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
        Gui.showMessage(localizedStrings.opCancelled);
    }
}

export async function uploadFile(node: ZoweDatasetNode, docPath: string): Promise<zosfiles.IZosFilesResponse> {
    ZoweLogger.trace("dataset.actions.uploadFile called.");
    try {
        const datasetName = node.label as string;
        const prof = node.getProfile();

        const response = await ZoweExplorerApiRegister.getMvsApi(prof).putContents(docPath, datasetName, {
            encoding: prof.profile?.encoding,
            responseTimeout: prof.profile?.responseTimeout,
        });
        return response;
    } catch (e) {
        await errorHandling(e, node.getProfileName());
    }
}

/**
 * Deletes nodes from the data set tree & delegates deletion of data sets, members, and profiles
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node selected for deletion
 * @param datasetProvider - the tree which contains the nodes
 */
export async function deleteDatasetPrompt(datasetProvider: Types.IZoweDatasetTreeType, node?: IZoweDatasetTreeNode): Promise<void> {
    ZoweLogger.trace("dataset.actions.deleteDatasetPrompt called.");
    let nodes: IZoweDatasetTreeNode[];
    const treeView = datasetProvider.getTreeView();
    let selectedNodes = treeView.selection;
    let includedSelection = false;
    if (node) {
        for (const item of selectedNodes) {
            if (node.getLabel().toString() === item.getLabel().toString()) {
                includedSelection = true;
            }
        }
    }

    // Check that child and parent aren't both in array, removing children whose parents are in
    // array to avoid errors from host when deleting none=existent children.
    const childArray: IZoweDatasetTreeNode[] = [];
    for (const item of selectedNodes) {
        if (contextually.isDsMember(item)) {
            for (const parent of selectedNodes) {
                if (parent.getLabel() === item.getParent().getLabel()) {
                    childArray.push(item);
                }
            }
        }
    }
    selectedNodes = selectedNodes.filter((val) => !childArray.includes(val));

    if (includedSelection || !node) {
        // Filter out sessions and information messages
        nodes = selectedNodes.filter(
            (selectedNode) => selectedNode.getParent() && !contextually.isSession(selectedNode) && !contextually.isInformation(selectedNode)
        );
    } else {
        if (node.getParent() && !contextually.isSession(node) && !contextually.isInformation(node)) {
            nodes = [];
            nodes.push(node);
        }
    }

    // Check that there are items to be deleted
    if (!nodes || nodes.length === 0) {
        Gui.showMessage(vscode.l10n.t("No data sets selected for deletion, cancelling..."));
        return;
    }

    // The names of the nodes that should be deleted
    const nodesToDelete: string[] = nodes.map((deletedNode) => {
        return contextually.isDsMember(deletedNode)
            ? ` ${deletedNode.getParent().getLabel().toString()}(${deletedNode.getLabel().toString()})`
            : ` ${deletedNode.getLabel().toString()}`;
    });
    nodesToDelete.sort((a, b) => a.localeCompare(b));

    const nodesDeleted: string[] = [];

    // The member parent nodes that should be refreshed individually
    const memberParents: IZoweDatasetTreeNode[] = [];
    for (const deletedNode of nodes) {
        if (contextually.isDsMember(deletedNode)) {
            const parent = deletedNode.getParent();
            if (memberParents.filter((alreadyAddedParent) => alreadyAddedParent.label.toString() === parent.label.toString()).length === 0) {
                memberParents.push(parent);
            }
        }
    }

    nodes.map((deletedNode) => {
        return contextually.isDsMember(deletedNode) ? deletedNode.getParent() : ` ${deletedNode.getLabel().toString()}`;
    });

    // Confirm that the user really wants to delete
    ZoweLogger.debug(
        vscode.l10n.t({
            message: "Deleting data set(s): {0}",
            args: [nodesToDelete.join(",")],
            comment: ["Data Sets to delete"],
        })
    );
    const deleteButton = vscode.l10n.t("Delete");
    const message = vscode.l10n.t({
        message: `Are you sure you want to delete the following {0} item(s)?\nThis will permanently remove these data sets and/or members from your system.\n\n{1}`,
        args: [nodesToDelete.length, nodesToDelete.toString().replace(/(,)/g, "\n")],
        comment: ["Data Sets to delete length", "Data Sets to delete"],
    });
    await Gui.warningMessage(message, {
        items: [deleteButton],
        vsCodeOpts: { modal: true },
    }).then((selection) => {
        if (!selection || selection === "Cancel") {
            ZoweLogger.debug(localizedStrings.opCancelled);
            nodes = [];
            return;
        }
    });

    if (nodes.length === 0) {
        return;
    }
    if (nodes.length === 1) {
        await deleteDataset(nodes[0], datasetProvider);
        const deleteItemName = contextually.isDsMember(nodes[0])
            ? ` ${nodes[0].getParent().getLabel().toString()}(${nodes[0].getLabel().toString()})`
            : ` ${nodes[0].getLabel().toString()}`;
        nodesDeleted.push(deleteItemName);
    }
    if (nodes.length > 1) {
        // Delete multiple selected nodes
        await Gui.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: vscode.l10n.t("Deleting items"),
                cancellable: true,
            },
            async (progress, token) => {
                for (const [index, currNode] of nodes.entries()) {
                    if (token.isCancellationRequested) {
                        Gui.showMessage(localizedStrings.opCancelled);
                        return;
                    }
                    Gui.reportProgress(progress, nodes.length, index, "Deleting");
                    try {
                        await deleteDataset(currNode, datasetProvider);
                        const deleteItemName = contextually.isDsMember(currNode)
                            ? ` ${currNode.getParent().getLabel().toString()}(${currNode.getLabel().toString()})`
                            : ` ${currNode.getLabel().toString()}`;
                        nodesDeleted.push(deleteItemName);
                    } catch (err) {
                        ZoweLogger.error(err);
                    }
                }
            }
        );
    }
    if (nodesDeleted.length > 0) {
        nodesDeleted.sort((a, b) => a.localeCompare(b));
        Gui.showMessage(
            vscode.l10n.t({
                message: "The following {0} item(s) were deleted: {1}",
                args: [nodesDeleted.length, nodesDeleted.toString().trim()],
                comment: ["Data Sets deleted length", "Data Sets deleted"],
            })
        );
    }

    // refresh Tree View & favorites
    datasetProvider.refresh();
    for (const member of memberParents) {
        datasetProvider.refreshElement(member);
    }
}

/**
 * Creates a PDS member
 *
 * @export
 * @param {IZoweDatasetTreeNode} parent - The parent Node
 * @param datasetProvider - the tree which contains the nodes
 */
export async function createMember(parent: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.createMember called.");
    const options: vscode.InputBoxOptions = {
        placeHolder: vscode.l10n.t("Name of Member"),
        validateInput: (text) => {
            return dsUtils.validateMemberName(text) === true ? null : vscode.l10n.t("Enter valid member name");
        },
    };
    const name = await Gui.showInputBox(options);
    ZoweLogger.debug(
        vscode.l10n.t({
            message: "Creating new data set member {0}",
            args: [name],
            comment: ["Data Set member name"],
        })
    );
    if (name) {
        const label = parent.label as string;
        const profile = parent.getProfile();
        try {
            await ZoweExplorerApiRegister.getMvsApi(profile).createDataSetMember(label + "(" + name + ")", {
                responseTimeout: profile.profile?.responseTimeout,
            });
        } catch (err) {
            if (err instanceof Error) {
                await errorHandling(err, label, vscode.l10n.t("Unable to create member."));
            }
            throw err;
        }
        parent.dirty = true;
        datasetProvider.refreshElement(parent);

        await new ZoweDatasetNode({
            label: name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            parentNode: parent,
            profile: parent.getProfile(),
        }).openDs(false, true, datasetProvider);

        // Refresh corresponding tree parent to reflect addition
        const otherTreeParent = datasetProvider.findEquivalentNode(parent, contextually.isFavorite(parent));
        if (otherTreeParent != null) {
            datasetProvider.refreshElement(otherTreeParent);
        }

        datasetProvider.refresh();
    }
}

export function getDataSetTypeAndOptions(type: string): {
    typeEnum: zosfiles.CreateDataSetTypeEnum;
    createOptions: vscode.WorkspaceConfiguration;
} {
    let createOptions: vscode.WorkspaceConfiguration;
    switch (type) {
        case localizedStrings.dsBinary:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_BINARY;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_BINARY);
            break;
        case localizedStrings.dsC:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_C;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_C);
            break;
        case localizedStrings.dsClassic:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_CLASSIC;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_CLASSIC);
            break;
        case localizedStrings.dsPartitioned:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_PARTITIONED;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_PDS);
            break;
        case localizedStrings.dsExtended:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_BLANK;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_EXTENDED);
            break;
        case localizedStrings.dsSequential:
            typeEnum = zosfiles.CreateDataSetTypeEnum.DATA_SET_SEQUENTIAL;
            createOptions = vscode.workspace.getConfiguration(globals.SETTINGS_DS_DEFAULT_PS);
            break;
    }
    return {
        typeEnum,
        createOptions,
    };
}

/**
 * Creates a new file and uploads to the server
 * @export
 * @param {IZoweDatasetTreeNode} node - Desired Zowe session
 * @param datasetProvider - the tree which contains the nodes
 */
export async function createFile(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    datasetProvider.checkCurrentProfile(node);
    if (Profiles.getInstance().validProfile === Validation.ValidationType.INVALID) {
        return;
    }
    newDSProperties = JSON.parse(JSON.stringify(globals.DATA_SET_PROPERTIES));
    // 1st step: Get data set name
    let dsName = await getDataSetName();
    if (!dsName) {
        ZoweLogger.debug(localizedStrings.opCancelled);
        Gui.showMessage(localizedStrings.opCancelled);
        return;
    }
    // 2nd step: Get data set type
    const type = await getDsTypeForCreation(datasetProvider);
    if (!type) {
        ZoweLogger.debug(localizedStrings.opCancelled);
        Gui.showMessage(localizedStrings.opCancelled);
        return;
    }
    const propertiesFromDsType = getDsProperties(type, datasetProvider);
    // 3rd step: Ask if we allocate, or show DS attributes
    const choice = await allocateOrEditAttributes();
    if (!choice) {
        ZoweLogger.debug(localizedStrings.opCancelled);
        Gui.showMessage(localizedStrings.opCancelled);
        return;
    }
    if (choice.includes(localizedStrings.allocString)) {
        // User wants to allocate straightaway - skip Step 4
        const allocMsg = vscode.l10n.t("Allocating new data set");
        ZoweLogger.debug(allocMsg);
        Gui.showMessage(allocMsg);
    } else {
        // 4th step (optional): Show data set attributes
        const choice2 = await handleUserSelection();
        if (!choice2) {
            ZoweLogger.debug(localizedStrings.opCancelled);
            Gui.showMessage(localizedStrings.opCancelled);
            return;
        }
        ZoweLogger.debug(vscode.l10n.t("Attempting to allocate new data set"));
    }
    const isMatch = compareDsProperties(type, datasetProvider);
    // Format properties for use by API
    const dsPropsForAPI = {};
    newDSProperties?.forEach((property) => {
        if (property.value) {
            if (property.key === `dsName`) {
                dsName = property.value;
            } else {
                if (typeof propertiesFromDsType[property.key] === "number" || property.type === "number") {
                    dsPropsForAPI[property.key] = Number(property.value);
                } else {
                    dsPropsForAPI[property.key] = property.value;
                }
            }
        }
    });
    await allocateNewDataSet(node, dsName, dsPropsForAPI, datasetProvider);
    if (!isMatch) {
        await saveDsTemplate(datasetProvider, dsPropsForAPI);
    }
}

async function handleUserSelection(): Promise<string> {
    // Create the array of items in the quickpick list
    const qpItems = [];
    qpItems.push(new FilterItem({ text: `\u002B ${localizedStrings.allocString}`, show: true }));
    newDSProperties?.forEach((prop) => {
        const propLabel = `\u270F ${prop.label as string}`;
        qpItems.push(new FilterItem({ text: propLabel, description: prop.value, show: true }));
    });

    // Provide the settings for the quickpick's appearance & behavior
    const quickpick = Gui.createQuickPick();
    quickpick.placeholder = vscode.l10n.t("Click on parameters to change them");
    quickpick.ignoreFocusOut = true;
    quickpick.items = [...qpItems];
    quickpick.matchOnDescription = false;
    quickpick.onDidHide(() => {
        if (quickpick.selectedItems.length === 0) {
            ZoweLogger.debug(localizedStrings.opCancelled);
            Gui.showMessage(localizedStrings.opCancelled);
        }
    });

    // Show quickpick and store the user's input
    quickpick.show();
    const choice2 = await Gui.resolveQuickPick(quickpick);
    quickpick.dispose();
    if (!choice2) {
        return;
    }
    const pattern = choice2.label;
    const showPatternOptions = async (): Promise<void> => {
        const options: vscode.InputBoxOptions = {
            value: newDSProperties?.find((prop) => pattern.includes(prop.label))?.value,
            placeHolder: newDSProperties?.find((prop) => prop.label === pattern)?.placeHolder,
        };
        newDSProperties.find((prop) => pattern.includes(prop.label)).value = await Gui.showInputBox(options);
    };

    if (pattern) {
        // Parse pattern for selected attribute
        if (pattern.includes(localizedStrings.allocString)) {
            return Promise.resolve(localizedStrings.allocString);
        } else {
            await showPatternOptions();
        }
        return Promise.resolve(handleUserSelection());
    }
}

async function getDataSetName(): Promise<string> {
    const options: vscode.InputBoxOptions = {
        placeHolder: vscode.l10n.t("Name of Data Set"),
        ignoreFocusOut: true,
        validateInput: (text) => {
            return dsUtils.validateDataSetName(text) === true ? null : vscode.l10n.t("Enter valid dataset name");
        },
    };
    let dsName = await Gui.showInputBox(options);
    if (!dsName) {
        return;
    }
    dsName = dsName.trim().toUpperCase();
    return dsName;
}

async function getDsTypeForCreation(datasetProvider: Types.IZoweDatasetTreeType): Promise<string> {
    const stepTwoOptions: vscode.QuickPickOptions = {
        placeHolder: vscode.l10n.t("Template of Data Set to be Created"),
        ignoreFocusOut: true,
        canPickMany: false,
    };
    //get array of template names
    const dsTemplateNames = getTemplateNames(datasetProvider);
    const stepTwoChoices = [
        ...dsTemplateNames,
        localizedStrings.dsBinary,
        localizedStrings.dsC,
        localizedStrings.dsClassic,
        localizedStrings.dsPartitioned,
        localizedStrings.dsExtended,
        localizedStrings.dsSequential,
    ];
    return Promise.resolve(Gui.showQuickPick(stepTwoChoices, stepTwoOptions));
}

function getTemplateNames(datasetProvider: Types.IZoweDatasetTreeType): string[] {
    const templates = datasetProvider.getDsTemplates();
    const templateNames: string[] = [];
    templates?.forEach((template) => {
        Object.entries(template).forEach(([key, value]) => {
            templateNames.push(key);
        });
    });
    return templateNames;
}

function compareDsProperties(type: string, datasetProvider: Types.IZoweDatasetTreeType): boolean {
    let isMatch = true;
    const templates: Types.DataSetAllocTemplate[] = datasetProvider.getDsTemplates();
    let propertiesFromDsType: Partial<zosfiles.ICreateDataSetOptions>;
    // Look for template
    templates?.forEach((template) => {
        for (const [key, value] of Object.entries(template)) {
            if (type === key) {
                propertiesFromDsType = value;
            }
        }
    });
    if (!propertiesFromDsType) {
        propertiesFromDsType = getDefaultDsTypeProperties(type);
    }
    newDSProperties?.forEach((property) => {
        Object.keys(propertiesFromDsType).forEach((typeProperty) => {
            if (typeProperty === property.key) {
                if (property.value !== propertiesFromDsType[typeProperty].toString()) {
                    isMatch = false;
                    return;
                }
            }
        });
    });
    return isMatch;
}

function getDsProperties(type: string, datasetProvider: Types.IZoweDatasetTreeType): Partial<zosfiles.ICreateDataSetOptions> {
    const templates: Types.DataSetAllocTemplate[] = datasetProvider.getDsTemplates();
    let propertiesFromDsType: Partial<zosfiles.ICreateDataSetOptions>;
    // Look for template
    templates?.forEach((template) => {
        Object.entries(template).forEach(([key, value]) => {
            if (type === key) {
                if (template[key].dsorg === "PS") {
                    typeEnum = 4;
                } else {
                    typeEnum = 3;
                }
                propertiesFromDsType = value;
            }
        });
    });
    if (!propertiesFromDsType) {
        propertiesFromDsType = getDefaultDsTypeProperties(type);
    }
    newDSProperties?.forEach((property) => {
        Object.keys(propertiesFromDsType).forEach((typeProperty) => {
            if (typeProperty === property.key) {
                property.value = propertiesFromDsType[typeProperty].toString();
                property.placeHolder = propertiesFromDsType[typeProperty];
            }
        });
    });
    return propertiesFromDsType;
}

function getDefaultDsTypeProperties(dsType: string): zosfiles.ICreateDataSetOptions {
    typeEnum = getDataSetTypeAndOptions(dsType)?.typeEnum;

    if (typeEnum === zosfiles.CreateDataSetTypeEnum.DATA_SET_BLANK) {
        const options = getDataSetTypeAndOptions(dsType)?.createOptions;
        return getDsTypePropertiesFromWorkspaceConfig(options);
    } else {
        const cliDefaultsKey = globals.CreateDataSetTypeWithKeysEnum[typeEnum]?.replace("DATA_SET_", "");
        return zosfiles.CreateDefaults.DATA_SET[cliDefaultsKey] as zosfiles.ICreateDataSetOptions;
    }
}

export function getDsTypePropertiesFromWorkspaceConfig(createOptions: vscode.WorkspaceConfiguration): zosfiles.ICreateDataSetOptions {
    const dsTypeProperties = {} as zosfiles.ICreateDataSetOptions;
    if (createOptions) {
        dsTypeProperties.dsntype = createOptions.get("dsntype");
        dsTypeProperties.dsorg = createOptions.get("dsorg");
        dsTypeProperties.alcunit = createOptions.get("alcunit");
        dsTypeProperties.primary = createOptions.get("primary");
        dsTypeProperties.secondary = createOptions.get("secondary");
        dsTypeProperties.dirblk = createOptions.get("dirblk");
        dsTypeProperties.recfm = createOptions.get("recfm");
        dsTypeProperties.blksize = createOptions.get("blksize");
        dsTypeProperties.lrecl = createOptions.get("lrecl");
    }
    return dsTypeProperties;
}

async function allocateOrEditAttributes(): Promise<string> {
    const stepThreeOptions: vscode.QuickPickOptions = {
        ignoreFocusOut: true,
        canPickMany: false,
    };
    const allocate = `\u002B ${localizedStrings.allocString}`;
    const editAtts = `\u270F ${localizedStrings.editString}`;
    const stepThreeChoices = [allocate, editAtts];
    return Promise.resolve(Gui.showQuickPick(stepThreeChoices, stepThreeOptions));
}

async function allocateNewDataSet(
    node: IZoweDatasetTreeNode,
    dsName: string,
    dsPropsForAPI: {},
    datasetProvider: Types.IZoweDatasetTreeType
): Promise<void> {
    const profile = node.getProfile();
    try {
        // Allocate the data set
        await ZoweExplorerApiRegister.getMvsApi(profile).createDataSet(typeEnum, dsName, {
            responseTimeout: profile?.profile?.responseTimeout,
            ...dsPropsForAPI,
        });
        node.dirty = true;
        const theFilter = datasetProvider.createFilterString(dsName, node);
        datasetProvider.refresh();

        // Show newly-created data set in expanded tree view
        await focusOnNewDs(node, dsName, datasetProvider, theFilter);
    } catch (err) {
        const errorMsg = vscode.l10n.t("Error encountered when creating data set.");
        ZoweLogger.error(errorMsg + JSON.stringify(err));
        if (err instanceof Error) {
            await errorHandling(err, node.getProfileName(), errorMsg);
        }
        throw new Error(err);
    }
}

async function focusOnNewDs(node: IZoweDatasetTreeNode, dsName: string, datasetProvider: Types.IZoweDatasetTreeType, theFilter: any): Promise<void> {
    node.tooltip = node.pattern = theFilter.toUpperCase();
    node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    const icon = getIconByNode(node);
    if (icon) {
        node.iconPath = icon.path;
    }
    node.dirty = true;

    const newNode = await node.getChildren().then((children) => children.find((child) => child.label === dsName));
    datasetProvider
        .getTreeView()
        .reveal(node, { select: true, focus: true })
        .then(() => datasetProvider.getTreeView().reveal(newNode, { select: true, focus: true }));
}

async function saveDsTemplate(datasetProvider: Types.IZoweDatasetTreeType, dsPropsForAPI: any): Promise<void> {
    // newDSProperties
    await Gui.infoMessage("Would you like to save these attributes as a template for future data set creation?", {
        items: ["Save"],
        vsCodeOpts: { modal: true },
    }).then(async (selection) => {
        if (selection) {
            const options: vscode.InputBoxOptions = {
                placeHolder: vscode.l10n.t("Name of Data Set Template"),
                ignoreFocusOut: true,
            };
            const templateName = await vscode.window.showInputBox(options);
            if (!templateName) {
                ZoweLogger.debug(localizedStrings.opCancelled);
                Gui.showMessage(localizedStrings.opCancelled);
                return;
            }
            const newTemplate: Types.DataSetAllocTemplate = {
                [templateName]: dsPropsForAPI,
            };
            datasetProvider.addDsTemplate(newTemplate);
        }
    });
}

/**
 * Shows data set attributes in a new text editor
 *
 * @export
 * @param {IZoweDatasetTreeNode} node   - The node to show attributes for
 * @param datasetProvider - the tree which contains the nodes
 */
export async function showAttributes(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.showAttributes called.");
    await datasetProvider.checkCurrentProfile(node);
    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        const label = node.label as string;
        ZoweLogger.debug(
            vscode.l10n.t({
                message: "Showing attributes for {0}.",
                args: [label],
                comment: ["Label"],
            })
        );
        let attributes: any;
        try {
            const nodeProfile = node.getProfile();
            if (contextually.isDsMember(node)) {
                const dsName = node.getParent().getLabel() as string;
                attributes = await ZoweExplorerApiRegister.getMvsApi(nodeProfile).allMembers(dsName.toUpperCase(), {
                    attributes: true,
                    pattern: label.toUpperCase(),
                    responseTimeout: nodeProfile?.profile?.responseTimeout,
                });
            } else {
                attributes = await ZoweExplorerApiRegister.getMvsApi(nodeProfile).dataSet(label, {
                    attributes: true,
                    responseTimeout: nodeProfile?.profile?.responseTimeout,
                });
            }
            attributes = attributes.apiResponse.items;
            if (contextually.isDs(node)) {
                attributes = attributes.filter((dataSet) => {
                    return dataSet.dsname.toUpperCase() === label.toUpperCase();
                });
            }
            if (attributes.length === 0) {
                throw new Error(
                    vscode.l10n.t({
                        message: "No matching names found for query: {0}",
                        args: [label],
                        comment: ["Label"],
                    })
                );
            }
        } catch (err) {
            if (err instanceof Error) {
                await errorHandling(err, node.getProfileName(), vscode.l10n.t("Unable to list attributes."));
            }
            throw err;
        }

        const attributesMessage = vscode.l10n.t("Attributes");
        const webviewHTML = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${label} "${attributesMessage}"</title>
        </head>
        <body>
        <table style="margin-top: 2em; border-spacing: 2em 0">
        ${Object.keys(attributes[0]).reduce(
            (html, key) =>
                html.concat(`
                <tr>
                    <td align="left" style="color: var(--vscode-editorLink-activeForeground); font-weight: bold">${key}:</td>
                    <td align="right" style="color: ${
                        isNaN(attributes[0][key]) ? "var(--vscode-settings-textInputForeground)" : "var(--vscode-problemsWarningIcon-foreground)"
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    }">${attributes[0][key]}</td>
                </tr>
        `),
            ""
        )}
        </table>
        </body>
        </html>`;
        const panel: vscode.WebviewPanel = Gui.createWebviewPanel({
            viewType: "zowe",
            title: label + " " + vscode.l10n.t("Attributes"),
            showOptions: vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : 1,
        });
        panel.webview.html = webviewHTML;
    }
}

/**
 * Submit the contents of the editor or file as JCL.
 *
 * @export
 * @param datasetProvider DatasetTree object
 */
// This function does not appear to currently be made available in the UI
export async function submitJcl(datasetProvider: Types.IZoweDatasetTreeType, file?: vscode.Uri): Promise<void> {
    ZoweLogger.trace("dataset.actions.submitJcl called.");
    if (!vscode.window.activeTextEditor && !file) {
        const notActiveEditorMsg = vscode.l10n.t("No editor with a document that could be submitted as JCL is currently open.");
        Gui.errorMessage(notActiveEditorMsg);
        ZoweLogger.error(notActiveEditorMsg);
        return;
    }

    if (file) {
        await vscode.window.showTextDocument(file, { preview: false });
    }
    const doc = vscode.window.activeTextEditor.document;
    ZoweLogger.debug(
        vscode.l10n.t({
            message: "Submitting as JCL in document {0}",
            args: [doc.fileName],
            comment: ["Document file name"],
        })
    );

    // prompts for job submit confirmation when submitting local JCL from editor/palette
    // no node passed in, ownsJob is true because local file is always owned by userID, passes in local file name
    if (!(await confirmJobSubmission(doc.fileName, true))) {
        return;
    }

    // get session name
    const sessionregex = /\[(.*)(\])(?!.*\])/;
    const regExp = sessionregex.exec(doc.fileName);
    const profiles = Profiles.getInstance();
    let sessProfileName;
    if (regExp === null) {
        if (!doc.uri.fsPath.includes(globals.ZOWETEMPFOLDER)) {
            const profileNamesList = ProfileManagement.getRegisteredProfileNameList(globals.Trees.JES);
            if (profileNamesList.length > 1) {
                const quickPickOptions: vscode.QuickPickOptions = {
                    placeHolder: vscode.l10n.t("Select the Profile to use to submit the job"),
                    ignoreFocusOut: true,
                    canPickMany: false,
                };
                sessProfileName = await Gui.showQuickPick(profileNamesList, quickPickOptions);
                if (!sessProfileName) {
                    Gui.infoMessage(localizedStrings.opCancelled);
                    return;
                }
            } else if (profileNamesList.length > 0) {
                sessProfileName = profileNamesList[0];
            } else {
                Gui.showMessage(vscode.l10n.t("No profiles available"));
            }
        } else {
            const filePathArray = doc.uri.fsPath.split(path.sep);
            sessProfileName = filePathArray[filePathArray.length - 2];
        }
    } else {
        sessProfileName = regExp[1];
        if (sessProfileName.includes("[")) {
            // if submitting from favorites, sesName might be the favorite node, so extract further
            sessProfileName = sessionregex.exec(sessProfileName)[1];
        }
    }

    // get profile from session name
    let sessProfile: imperative.IProfileLoaded;
    const sesNode = (await datasetProvider.getChildren()).find((child) => child.label.toString() === sessProfileName);
    if (sesNode) {
        sessProfile = sesNode.getProfile();
    } else {
        // if submitting from favorites, a session might not exist for this node
        sessProfile = profiles.loadNamedProfile(sessProfileName);
    }
    if (sessProfile == null) {
        ZoweLogger.error(vscode.l10n.t("Session for submitting JCL was null or undefined!"));
        return;
    }
    await Profiles.getInstance().checkCurrentProfile(sessProfile);
    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        try {
            const job = await ZoweExplorerApiRegister.getJesApi(sessProfile).submitJcl(doc.getText());
            const args = [sessProfileName, job.jobid];
            const setJobCmd = `command:zowe.jobs.setJobSpool?${encodeURIComponent(JSON.stringify(args))}`;
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Job submitted {0}",
                    args: [`[${job.jobid}](${setJobCmd})`],
                    comment: ["Job ID and set job command"],
                })
            );
            ZoweLogger.info(
                vscode.l10n.t({
                    message: "Job submitted {0} using profile {1}.",
                    args: [job.jobid, sessProfileName],
                    comment: ["Job ID", "Profile name"],
                })
            );
        } catch (error) {
            if (error instanceof Error) {
                await errorHandling(error, sessProfileName, vscode.l10n.t("Job submission failed."));
            }
        }
    } else {
        Gui.errorMessage(localizedStrings.profileInvalid);
    }
}

/**
 * Shows a confirmation dialog (if needed) when submitting a job.
 *
 * @param nodeOrFileName The node/member that is being submitted, or the filename to submit
 * @param ownsJob Whether the current user profile owns this job
 * @returns Whether the job submission should continue.
 */
export async function confirmJobSubmission(nodeOrFileName: IZoweDatasetTreeNode | string, ownsJob: boolean): Promise<boolean> {
    ZoweLogger.trace("dataset.actions.confirmJobSubmission called.");

    const jclName = typeof nodeOrFileName === "string" ? path.basename(nodeOrFileName) : nodeOrFileName.getLabel().toString();

    const showConfirmationDialog = async (): Promise<boolean> => {
        const selection = await Gui.warningMessage(
            vscode.l10n.t({
                message: "Are you sure you want to submit the following job?\n\n{0}",
                args: [jclName],
                comment: ["JCL name"],
            }),
            {
                items: [{ title: "Submit" }],
                vsCodeOpts: { modal: true },
            }
        );
        return selection != null && selection?.title === "Submit";
    };

    const confirmationOption: string = vscode.workspace.getConfiguration().get("zowe.jobs.confirmSubmission");

    switch (JOB_SUBMIT_DIALOG_OPTS.indexOf(confirmationOption)) {
        case JobSubmitDialogOpts.OtherUserJobs:
            if (!ownsJob && !(await showConfirmationDialog())) {
                return false;
            }
            break;
        case JobSubmitDialogOpts.YourJobs:
            if (ownsJob && !(await showConfirmationDialog())) {
                return false;
            }
            break;
        case JobSubmitDialogOpts.AllJobs:
            if (!(await showConfirmationDialog())) {
                return false;
            }
            break;
        case JobSubmitDialogOpts.Disabled:
        default:
            break;
    }
    return true;
}

/**
 * Submit the selected dataset member as a Job.
 *
 * @export
 * @param node The dataset member
 */
export async function submitMember(node: IZoweDatasetTreeNode): Promise<void> {
    ZoweLogger.trace("dataset.actions.submitMember called.");
    let label: string;
    let sesName: string;
    let sessProfile: imperative.IProfileLoaded;
    const profiles = Profiles.getInstance();
    const nodeProfile = node.getProfile();
    await profiles.checkCurrentProfile(nodeProfile);

    const datasetName = contextually.isDsMember(node) ? node.getParent().getLabel().toString() : node.getLabel().toString();
    const ownsJob = datasetName.split(".")[0] === nodeProfile.profile?.user?.toUpperCase();

    if (!(await confirmJobSubmission(node, ownsJob))) {
        return;
    }

    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        const defaultMessage = vscode.l10n.t("Cannot submit, item invalid.");
        switch (true) {
            // For favorited or non-favorited sequential DS:
            case contextually.isFavorite(node):
            case contextually.isSessionNotFav(node.getParent()):
                sesName = node.getParent().getLabel() as string;
                label = node.label as string;
                sessProfile = node.getProfile();
                break;
            // For favorited or non-favorited data set members:
            case contextually.isFavoritePds(node.getParent()):
            case contextually.isPdsNotFav(node.getParent()):
                sesName = node.getParent().getParent().getLabel() as string;
                label = node.getParent().getLabel().toString() + "(" + node.label.toString() + ")";
                sessProfile = node.getProfile();
                break;
            default:
                Gui.errorMessage(defaultMessage);
                throw Error(defaultMessage);
        }
        try {
            const job = await ZoweExplorerApiRegister.getJesApi(sessProfile).submitJob(label);
            const args = [sesName, job.jobid];
            const setJobCmd = `command:zowe.jobs.setJobSpool?${encodeURIComponent(JSON.stringify(args))}`;
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Job submitted {0}",
                    args: [`[${job.jobid}](${setJobCmd})`],
                    comment: ["Job ID and set job command"],
                })
            );
            ZoweLogger.info(
                vscode.l10n.t({
                    message: "Job submitted {0} using profile {1}.",
                    args: [job.jobid, sesName],
                    comment: ["Job ID", "Session name"],
                })
            );
        } catch (error) {
            if (error instanceof Error) {
                await errorHandling(error, sesName, vscode.l10n.t("Job submission failed."));
            }
        }
    }
}

/**
 * Deletes a dataset/data set member
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node to be deleted
 * @param {Types.IZoweDatasetTreeType} datasetProvider - the tree which contains the nodes
 */
export async function deleteDataset(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.deleteDataset called.");
    let label = "";
    let fav = false;

    const parent = node.getParent();
    try {
        const parentContext = parent.contextValue;
        if (parentContext.includes(globals.FAV_SUFFIX)) {
            label = node.getLabel() as string;
            fav = true;
            if (parentContext.includes(globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX)) {
                label = parent.getLabel().toString() + "(" + node.getLabel().toString() + ")";
            }
        } else if (parentContext.includes(globals.DS_SESSION_CONTEXT)) {
            label = node.getLabel() as string;
        } else if (parentContext.includes(globals.DS_PDS_CONTEXT)) {
            label = parent.getLabel().toString() + "(" + node.getLabel().toString() + ")";
        } else {
            throw Error(vscode.l10n.t("Cannot delete, item invalid."));
        }
        await datasetProvider.checkCurrentProfile(node);
        if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
            const profile = node.getProfile();
            await ZoweExplorerApiRegister.getMvsApi(profile).deleteDataSet(label, { responseTimeout: profile.profile?.responseTimeout });
        } else {
            return;
        }
    } catch (err) {
        if (err?.message.includes(vscode.l10n.t("not found"))) {
            ZoweLogger.error(
                vscode.l10n.t({
                    message: "Error encountered when deleting data set. {0}",
                    args: [JSON.stringify(err)],
                    comment: ["Stringified JSON error"],
                })
            );
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Unable to find file {0}",
                    args: [label],
                    comment: ["Label"],
                })
            );
        } else {
            await errorHandling(err, node.getProfileName());
        }
        throw err;
    }

    // remove node from tree
    if (fav) {
        datasetProvider.mSessionNodes.forEach((ses) => {
            if (node.getProfileName() === ses.label.toString()) {
                ses.dirty = true;
            }
        });
    } else {
        node.getSessionNode().dirty = true;
    }
    datasetProvider.removeFavorite(node);

    const isMember = contextually.isDsMember(node);

    // If the node is a dataset member, go up a level in the node tree
    // to find the relevant, matching node
    const nodeOfInterest = isMember ? node.getParent() : node;
    const parentNode = datasetProvider.findEquivalentNode(nodeOfInterest, fav);

    if (parentNode != null) {
        // Refresh the correct node (parent of node to delete) to reflect changes
        datasetProvider.refreshElement(isMember ? parentNode : parentNode.getParent());
    }

    datasetProvider.refreshElement(node.getSessionNode());

    // remove local copy of file
    const fileName = getDocumentFilePath(label, node);
    try {
        if (fs.existsSync(fileName)) {
            fs.unlinkSync(fileName);
        }
    } catch (err) {
        ZoweLogger.warn(err);
    }
}

/**
 * Refreshes the passed node with current mainframe data
 *
 * @param {IZoweDatasetTreeNode} node - The node which represents the dataset
 */
// This is not a UI refresh.
export async function refreshPS(node: IZoweDatasetTreeNode): Promise<void> {
    ZoweLogger.trace("dataset.actions.refreshPS called.");
    let label: string;
    try {
        switch (true) {
            // For favorited or non-favorited sequential DS:
            case contextually.isFavorite(node):
            case contextually.isSessionNotFav(node.getParent()):
                label = node.label as string;
                break;
            // For favorited or non-favorited data set members:
            case contextually.isFavoritePds(node.getParent()):
            case contextually.isPdsNotFav(node.getParent()):
                label = node.getParent().getLabel().toString() + "(" + node.getLabel().toString() + ")";
                break;
            default:
                throw Error(vscode.l10n.t("Item invalid."));
        }
        const documentFilePath = getDocumentFilePath(label, node);
        const prof = node.getProfile();
        const response = await ZoweExplorerApiRegister.getMvsApi(prof).getContents(label, {
            file: documentFilePath,
            returnEtag: true,
            binary: node.binary,
            encoding: node.encoding !== undefined ? node.encoding : prof.profile?.encoding,
            responseTimeout: prof.profile?.responseTimeout,
        });
        node.setEtag(response.apiResponse.etag);

        const document = await vscode.workspace.openTextDocument(documentFilePath);
        Gui.showTextDocument(document, { preview: false });
        // if there are unsaved changes, vscode won't automatically display the updates, so close and reopen
        if (document.isDirty) {
            await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            Gui.showTextDocument(document, { preview: false });
        }
    } catch (err) {
        if (err.message.includes(vscode.l10n.t("not found"))) {
            ZoweLogger.error(
                vscode.l10n.t({
                    message: "Error encountered when refreshing data set view. {0}",
                    args: [JSON.stringify(err)],
                    comment: ["Stringified JSON error"],
                })
            );
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Unable to find file {0}",
                    args: [label],
                    comment: ["Label"],
                })
            );
        } else {
            await errorHandling(err, node.getProfileName());
        }
    }
}

/**
 * Refreshes the names of each member within a PDS
 *
 * @param {IZoweDatasetTreeNode} node - The node which represents the parent PDS of members
 * @param datasetProvider
 */
export async function refreshDataset(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.refreshDataset called.");
    try {
        await node.getChildren();
        datasetProvider.refreshElement(node);
    } catch (err) {
        await errorHandling(err, node.getProfileName());
    }
}

/**
 * Prompts the user for a pattern, and populates the [TreeView]{@link vscode.TreeView} based on the pattern
 *
 * @param {IZoweDatasetTreeNode} node - The session node
 * @param datasetProvider - Current DatasetTree used to populate the TreeView
 * @returns {Promise<void>}
 */
// This function does not appear to be called by anything except unit and integration tests.
export async function enterPattern(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.enterPattern called.");
    let pattern: string;
    if (contextually.isSessionNotFav(node)) {
        // manually entering a search
        const options: vscode.InputBoxOptions = {
            prompt: vscode.l10n.t("Search Data Sets: use a comma to separate multiple patterns"),
            value: node.pattern,
        };
        // get user input
        pattern = await Gui.showInputBox(options);
        if (!pattern) {
            Gui.showMessage(vscode.l10n.t("You must enter a pattern."));
            return;
        }
        ZoweLogger.debug(
            vscode.l10n.t({
                message: "Prompted for a data set pattern, recieved {0}.",
                args: [pattern],
                comment: ["Data Set pattern"],
            })
        );
    } else {
        // executing search from saved search in favorites
        pattern = node.label.toString().substring(node.label.toString().indexOf(":") + 2);
        const sessionName = node.label.toString().substring(node.label.toString().indexOf("[") + 1, node.label.toString().indexOf("]"));
        await datasetProvider.addSession(sessionName.trim());
        node = datasetProvider.mSessionNodes.find((tempNode) => tempNode.label.toString().trim() === sessionName.trim());
    }

    // update the treeview with the new pattern
    // TODO figure out why a label change is needed to refresh the treeview,
    // instead of changing the collapsible state
    // change label so the treeview updates
    node.tooltip = node.pattern = pattern.toUpperCase();
    node.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    node.dirty = true;
    const icon = getIconByNode(node);
    if (icon) {
        node.iconPath = icon.path;
    }
    datasetProvider.addSearchHistory(node.pattern);
}

/**
 * Copy data set info
 *
 * @export
 * @deprecated Please use copyDataSets
 * @param {IZoweNodeType} node - The node to copy
 */
export async function copyDataSet(node: Types.IZoweNodeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.copyDataSet called.");
    return vscode.env.clipboard.writeText(JSON.stringify(dsUtils.getNodeLabels(node)));
}

/**
 * Copy data sets
 *
 * @export
 * @param {ZoweDatasetNode} node Node to copy,
 * @param {ZoweDatasetNode[]} nodeList - Multiple selected Nodes to copy
 * @param datasetProvider
 */
export async function copyDataSets(node, nodeList: ZoweDatasetNode[], datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.copyDataSets called.");
    let selectedNodes: ZoweDatasetNode[] = [];
    if (!(node || nodeList)) {
        selectedNodes = datasetProvider.getTreeView().selection as ZoweDatasetNode[];
    } else {
        selectedNodes = getSelectedNodeList(node, nodeList) as ZoweDatasetNode[];
    }

    const unique = [...new Set(selectedNodes.map((item) => item.contextValue))];
    if (unique.length > 1) {
        Gui.showMessage(vscode.l10n.t("Cannot perform the copy operation as the data sets selected have different types"));
        return;
    }
    if (contextually.isDsMember(selectedNodes[0])) {
        // multiple member
        const filePaths = [];
        selectedNodes.forEach((el) => {
            filePaths.push(dsUtils.getNodeLabels(el));
        });
        return vscode.env.clipboard.writeText(JSON.stringify(filePaths.length > 1 ? filePaths : filePaths[0]));
    }
    if (contextually.isDs(selectedNodes[0])) {
        await copySequentialDatasets(selectedNodes);
        return refreshDataset(selectedNodes[0].getParent(), datasetProvider);
    } else if (contextually.isPds(selectedNodes[0])) {
        await copyPartitionedDatasets(selectedNodes);
        return refreshDataset(selectedNodes[0].getParent(), datasetProvider);
    }
}

/**
 * Migrate data sets
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node to migrate
 */
export async function hMigrateDataSet(node: ZoweDatasetNode): Promise<zosfiles.IZosFilesResponse> {
    ZoweLogger.trace("dataset.actions.hMigrateDataSet called.");
    await Profiles.getInstance().checkCurrentProfile(node.getProfile());
    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        const { dataSetName } = dsUtils.getNodeLabels(node);
        try {
            const response = await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).hMigrateDataSet(dataSetName);
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Migration of data set {0} requested.",
                    args: [dataSetName],
                    comment: ["Data Set name"],
                })
            );
            return response;
        } catch (err) {
            ZoweLogger.error(err);
            Gui.errorMessage(err.message);
            return;
        }
    } else {
        Gui.errorMessage(localizedStrings.profileInvalid);
    }
}

/**
 * Recall data sets
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node to recall
 */
export async function hRecallDataSet(node: ZoweDatasetNode): Promise<zosfiles.IZosFilesResponse> {
    ZoweLogger.trace("dataset.actions.hRecallDataSet called.");
    await Profiles.getInstance().checkCurrentProfile(node.getProfile());
    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        const { dataSetName } = dsUtils.getNodeLabels(node);
        try {
            const response = await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).hRecallDataSet(dataSetName);
            Gui.showMessage(
                vscode.l10n.t({
                    message: "Recall of data set {0} requested.",
                    args: [dataSetName],
                    comment: ["Data Set name"],
                })
            );
            return response;
        } catch (err) {
            ZoweLogger.error(err);
            Gui.errorMessage(err.message);
            return;
        }
    } else {
        Gui.errorMessage(localizedStrings.profileInvalid);
    }
}

/**
 * Show File Error details when gathering attributes for these data sets
 *
 * @export
 * @param {IZoweDatasetTreeNode} node - The node to get details from
 */
export async function showFileErrorDetails(node: ZoweDatasetNode): Promise<void> {
    ZoweLogger.trace("dataset.actions.showFileErrorDetails called.");
    await Profiles.getInstance().checkCurrentProfile(node.getProfile());
    if (Profiles.getInstance().validProfile === Validation.ValidationType.INVALID) {
        Gui.errorMessage(localizedStrings.profileInvalid);
    } else {
        const { dataSetName } = dsUtils.getNodeLabels(node);
        if (node.errorDetails) {
            ZoweLogger.error(JSON.stringify(node.errorDetails, null, 2));
            Gui.errorMessage(node.errorDetails.message);
        } else {
            try {
                await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).hRecallDataSet(dataSetName);
                Gui.errorMessage(vscode.l10n.t("Unable to gather more information"));
            } catch (err) {
                ZoweLogger.error(JSON.stringify(err, null, 2));
                Gui.errorMessage(err.message);
            }
        }
    }
}

/**
 * Paste member
 *
 * @export
 * @param {ZoweNode} node - The node to paste to
 * @param datasetProvider - the tree which contains the nodes
 */
export async function pasteMember(node: IZoweDatasetTreeNode, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.pasteMember called.");
    const { profileName, dataSetName } = dsUtils.getNodeLabels(node);
    let memberName: string;
    let beforeDataSetName: string;
    let beforeProfileName: string;
    let beforeMemberName: string;

    await Profiles.getInstance().checkCurrentProfile(node.getProfile());
    if (Profiles.getInstance().validProfile !== Validation.ValidationType.INVALID) {
        try {
            ({
                dataSetName: beforeDataSetName,
                memberName: beforeMemberName,
                profileName: beforeProfileName,
            } = JSON.parse(await vscode.env.clipboard.readText()));
        } catch (err) {
            throw Error(vscode.l10n.t("Invalid paste. Copy data set(s) first."));
        }
        if (node.contextValue.includes(globals.DS_PDS_CONTEXT)) {
            const inputBoxOptions: vscode.InputBoxOptions = {
                value: beforeMemberName,
                placeHolder: vscode.l10n.t("Name of Data Set Member"),
                validateInput: (text) => {
                    return dsUtils.validateMemberName(text) === true ? null : vscode.l10n.t("Enter valid member name");
                },
            };
            memberName = await Gui.showInputBox(inputBoxOptions);
            if (!memberName) {
                return;
            }
        }

        if (beforeProfileName === profileName) {
            let replace: shouldReplace;
            if (memberName) {
                replace = await determineReplacement(node.getProfile(), `${dataSetName}(${memberName})`, "mem");
            }
            if (replace !== "cancel") {
                try {
                    await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).copyDataSetMember(
                        { dsn: beforeDataSetName, member: beforeMemberName },
                        { dsn: dataSetName, member: memberName },
                        { replace: replace === "replace" }
                    );
                } catch (err) {
                    ZoweLogger.error(err);
                    Gui.errorMessage(err.message);
                    return;
                }
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
                    await refreshPS(node);
                }
            }
        }
    }
}

/**
 * Uploads the file to the mainframe
 *
 * @export
 * @param {vscode.TextDocument} doc - TextDocument that is being saved
 */
export async function saveFile(doc: vscode.TextDocument, datasetProvider: Types.IZoweDatasetTreeType): Promise<void> {
    ZoweLogger.trace("dataset.actions.saveFile called.");
    // Check if file is a data set, instead of some other file
    const docPath = path.join(doc.fileName, "..");
    ZoweLogger.debug(
        vscode.l10n.t({
            message: "Requested to save data set {0}",
            args: [doc.fileName],
            comment: ["Document file name"],
        })
    );
    if (docPath.toUpperCase().indexOf(globals.DS_DIR.toUpperCase()) === -1) {
        ZoweLogger.error(
            vscode.l10n.t({
                message: "path.relative returned a non-blank directory. Assuming we are not in the DS_DIR directory: {0}",
                args: [path.relative(docPath, globals.DS_DIR)],
                comment: ["Relative path to Data Set directory"],
            })
        );
        return;
    }
    const start = path.join(globals.DS_DIR + path.sep).length;
    const ending = doc.fileName.substring(start);
    const sesName = ending.substring(0, ending.indexOf(path.sep));
    const profile = Profiles.getInstance().loadNamedProfile(sesName);
    const fileLabel = path.basename(doc.fileName);
    const dataSetName = fileLabel.substring(0, fileLabel.indexOf("("));
    const memberName = fileLabel.substring(fileLabel.indexOf("(") + 1, fileLabel.indexOf(")"));
    if (!profile) {
        const sessionError = vscode.l10n.t("Could not locate session when saving data set.");
        ZoweLogger.error(sessionError);
        await Gui.errorMessage(sessionError);
        return;
    }

    const etagFavorites = (
        datasetProvider.mFavorites
            .find((child) => child.label.toString().trim() === sesName)
            ?.children.find((child) => child.label.toString().trim() === dataSetName)
            ?.children.find((child) => child.label.toString().trim() === memberName) as IZoweDatasetTreeNode
    )?.getEtag();
    const sesNode =
        etagFavorites !== "" && etagFavorites !== undefined
            ? datasetProvider.mFavorites.find((child) => child.label.toString().trim() === sesName)
            : datasetProvider.mSessionNodes.find((child) => child.label.toString().trim() === sesName);
    if (!sesNode) {
        // if saving from favorites, a session might not exist for this node
        ZoweLogger.debug(vscode.l10n.t("Could not find session node"));
    }

    // If not a member
    let label = doc.fileName.substring(
        doc.fileName.lastIndexOf(path.sep) + 1,
        checkForAddedSuffix(doc.fileName) ? doc.fileName.lastIndexOf(".") : doc.fileName.length
    );
    label = label.toUpperCase().trim();
    ZoweLogger.info(
        vscode.l10n.t({
            message: "Saving file {0}",
            args: [label],
            comment: ["Label"],
        })
    );
    const dsname = label.includes("(") ? label.slice(0, label.indexOf("(")) : label;
    try {
        // Checks if file still exists on server
        const response = await ZoweExplorerApiRegister.getMvsApi(profile).dataSet(dsname, { responseTimeout: profile.profile?.responseTimeout });
        if (!response.apiResponse.items.length) {
            const saveError = vscode.l10n.t("Data set failed to save. Data set may have been deleted or renamed on mainframe.");
            ZoweLogger.error(saveError);
            await Gui.errorMessage(saveError);
            return;
        }
    } catch (err) {
        await errorHandling(err, sesName);
    }
    // Get specific node based on label and parent tree (session / favorites)
    const nodes = concatChildNodes(sesNode ? [sesNode] : datasetProvider.mSessionNodes);
    const node: IZoweDatasetTreeNode =
        nodes.find((zNode) => {
            if (contextually.isDsMember(zNode)) {
                const zNodeDetails = dsUtils.getProfileAndDataSetName(zNode);
                return `${zNodeDetails.profileName}(${zNodeDetails.dataSetName})` === `${label}`;
            } else if (contextually.isDs(zNode) || contextually.isDsSession(zNode)) {
                return zNode.label.toString().trim() === label;
            } else {
                return false;
            }
        }) ?? datasetProvider.openFiles?.[doc.uri.fsPath];

    // define upload options
    const uploadOptions: zosfiles.IUploadOptions = {
        etag: node?.getEtag(),
        returnEtag: true,
    };

    const prof = node?.getProfile() ?? profile;
    try {
        const uploadResponse = await Gui.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: vscode.l10n.t("Saving data set..."),
            },
            () => {
                return uploadContent(node, doc, label, prof, uploadOptions.etag, uploadOptions.returnEtag);
            }
        );
        if (uploadResponse.success) {
            Gui.setStatusBarMessage(uploadResponse.commandResponse, globals.STATUS_BAR_TIMEOUT_MS);
            // set local etag with the new etag from the updated file on mainframe
            node?.setEtag(uploadResponse.apiResponse[0].etag);
            setFileSaved(true);
        } else if (!uploadResponse.success && uploadResponse.commandResponse.includes("Rest API failure with HTTP(S) status 412")) {
            await LocalFileManagement.compareSavedFileContent(doc, node, label, profile);
        } else {
            await markDocumentUnsaved(doc);
            Gui.errorMessage(uploadResponse.commandResponse);
        }
    } catch (err) {
        await markDocumentUnsaved(doc);
        await errorHandling(err, sesName);
    }
}

/**
 * Paste members
 *
 * @export
 * @param datasetProvider - the tree which contains the nodes
 */
export async function pasteDataSetMembers(datasetProvider: Types.IZoweDatasetTreeType, node: ZoweDatasetNode): Promise<void> {
    ZoweLogger.trace("dataset.actions.pasteDataSetMembers called.");
    let clipboardContent;
    try {
        clipboardContent = JSON.parse(await vscode.env.clipboard.readText());
    } catch (err) {
        Gui.errorMessage(vscode.l10n.t("Invalid paste. Copy data set(s) first."));
        return;
    }
    if (!Array.isArray(clipboardContent) && clipboardContent.memberName) {
        return pasteMember(node, datasetProvider);
    }

    await Gui.withProgress(
        {
            location: vscode.ProgressLocation.Window,
            title: localizedStrings.copyingFiles,
        },
        async function copyDsMember() {
            for (const content of clipboardContent) {
                if (content.memberName) {
                    try {
                        await ZoweExplorerApiRegister.getMvsApi(node.getProfile()).copyDataSetMember(
                            { dsn: content.dataSetName, member: content.memberName },
                            { dsn: node.getLabel().toString(), member: content.memberName }
                        );
                    } catch (err) {
                        Gui.errorMessage(err.message);
                        return;
                    }
                }
            }
            datasetProvider.refreshElement(node);
            vscode.env.clipboard.writeText("");
        }
    );
}

/**
 * copies given sequential dataset nodes
 *
 * @export
 * @param {ZoweDatasetNode[]} nodes - nodes to be copied
 */
export async function copySequentialDatasets(nodes: ZoweDatasetNode[]): Promise<void> {
    ZoweLogger.trace("dataset.actions.copySequentialDatasets called.");
    await _copyProcessor(nodes, "ps", async (node: ZoweDatasetNode, dsname: string, replace: shouldReplace) => {
        const lbl = node.getLabel().toString();
        const mvsApi = ZoweExplorerApiRegister.getMvsApi(node.getProfile());
        if (mvsApi?.copyDataSet == null) {
            await Gui.errorMessage(vscode.l10n.t("Copying data sets is not supported."));
        } else {
            await Gui.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: localizedStrings.copyingFiles,
                },
                () => {
                    return mvsApi.copyDataSet(lbl, dsname, null, replace === "replace");
                }
            );
        }
    });
}

/**
 * copies given partitioned dataset nodes
 *
 * @export
 * @param {ZoweDatasetNode[]} nodes - nodes to be copied
 */
export async function copyPartitionedDatasets(nodes: ZoweDatasetNode[]): Promise<void> {
    ZoweLogger.trace("dataset.actions.copyPartitionedDatasets called.");
    await _copyProcessor(nodes, "po", async (node: ZoweDatasetNode, dsname: string, replace: shouldReplace) => {
        const lbl = node.getLabel().toString();
        const uploadOptions: zosfiles.IUploadOptions = {
            etag: node.getEtag(),
            returnEtag: true,
        };

        const children = await node.getChildren();
        const prof = node.getProfile();
        if (prof.profile.encoding) {
            uploadOptions.encoding = prof.profile.encoding;
        }

        await Gui.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: localizedStrings.copyingFiles,
            },
            () => {
                return Promise.all(
                    children.map((child) =>
                        ZoweExplorerApiRegister.getMvsApi(node.getProfile()).copyDataSetMember(
                            { dsn: lbl, member: child.getLabel().toString() },
                            { dsn: dsname, member: child.getLabel().toString() },
                            { replace: replace === "replace" }
                        )
                    )
                );
            }
        );
    });
}

/**
 * Type of z/os dataset or member intended for replacement
 * @export
 */
export type replaceDstype = "ps" | "po" | "mem";

/**
 * String type to determine whether or not the z/os dataset should be replaced
 * @export
 */
export type shouldReplace = "replace" | "cancel" | "notFound";

/**
 * Helper function to determine whether or not we should replace some z/os content
 *
 * @param nodeProfile The node for which we are going to determine replacement
 * @param name The fully quallified name of the dataset (member included)
 * @param type The type of z/os dataset (or member) that we should determine whether or not to replace
 * @returns string that explain whether or not to replace the z/os content
 */
export async function determineReplacement(nodeProfile: imperative.IProfileLoaded, name: string, type: replaceDstype): Promise<shouldReplace> {
    ZoweLogger.trace("dataset.actions.determineReplacement called.");
    const mvsApi = ZoweExplorerApiRegister.getMvsApi(nodeProfile);
    const options = { responseTimeout: nodeProfile.profile?.responseTimeout };
    const stringReplace = vscode.l10n.t("Replace");
    const stringCancel = vscode.l10n.t("Cancel");
    let q: string = null;
    let replace = false;
    if (type === "mem") {
        const dsname = name.split("(")[0];
        const member = name.split("(")[1].slice(0, -1);
        const res = await mvsApi.allMembers(dsname, options);
        if (res?.success && res.apiResponse?.items.some((m) => m.member === member.toUpperCase())) {
            q = vscode.l10n.t("The data set member already exists.\nDo you want to replace it?");
            replace = stringReplace === (await Gui.showMessage(q, { items: [stringReplace, stringCancel] }));
        }
    } else {
        const res = await mvsApi.dataSet(name, options);
        if (res?.success && res.apiResponse?.items.length > 0) {
            if (type === "ps") {
                q = vscode.l10n.t("The physical sequential (PS) data set already exists.\nDo you want to replace it?");
            } else if (type === "po") {
                q = vscode.l10n.t("The partitioned (PO) data set already exists.\nDo you want to merge them while replacing any existing members?");
            }
            replace = stringReplace === (await Gui.showMessage(q, { items: [stringReplace, stringCancel] }));
        }
    }
    // Sonar cloud code-smell :'(
    const returnValueIfNotReplacing = q === null ? "notFound" : "cancel";
    return replace ? "replace" : returnValueIfNotReplacing;
}

/**
 * Helper funciton to process the copy operation on all selected nodes
 *
 * @param nodes List of selected nodes to process
 * @param type Type of replacement that should occur
 * @param action Function that will perform the actual replacement/copy operation
 * @returns void - Please don't expect a return value from this method
 */
export async function _copyProcessor(
    nodes: ZoweDatasetNode[],
    type: replaceDstype,
    action: (_node: ZoweDatasetNode, _dsname: string, _shouldReplace: shouldReplace) => Promise<void>
): Promise<void> {
    ZoweLogger.trace("dataset.actions._copyProcessor called.");
    for (const node of nodes) {
        try {
            const lbl = node.getLabel().toString();
            const inputBoxOptions: vscode.InputBoxOptions = {
                prompt: vscode.l10n.t("Enter a name for the new data set"),
                value: lbl,
                placeHolder: vscode.l10n.t("Name of Data Set"),
                validateInput: (text) => {
                    return dsUtils.validateDataSetName(text) && (lbl !== text) === true ? null : vscode.l10n.t("Enter a valid data set name.");
                },
            };

            const dsname = await Gui.showInputBox(inputBoxOptions);
            if (!dsname) {
                return;
            }
            const replace = await determineReplacement(nodes[0].getProfile(), dsname, type);
            let res: zosfiles.IZosFilesResponse;
            if (replace === "notFound") {
                res = await ZoweExplorerApiRegister.getMvsApi(nodes[0].getProfile()).allocateLikeDataSet(dsname, lbl);
            }
            if (res?.success || replace !== "cancel") {
                await action(node, dsname, replace);
            }
        } catch (error) {
            if (error instanceof Error) {
                await errorHandling(error, dsUtils.getNodeLabels(node).dataSetName, vscode.l10n.t("Unable to copy data set."));
            }
        }
    }
}
