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

import * as vscode from "vscode";
import { IZoweNodeType, IZoweDatasetTreeNode, IZoweUSSTreeNode, IZoweJobTreeNode } from "./IZoweTreeNode";

/**
 * The base interface for Zowe tree browsers that implement the
 * vscode.TreeDataProvider.
 *
 * @export
 * @interface IZoweTree
 * @extends {vscode.TreeDataProvider<T>}
 * @template T provide a subtype of vscode.TreeItem
 */
export interface IZoweTree<T> extends vscode.TreeDataProvider<T> {
    /**
     * Root session nodes
     */
    mSessionNodes: IZoweNodeType[];
    /**
     * Root favorites node
     */
    mFavoriteSession: IZoweNodeType;
    /**
     * Array of favorite nodes
     * @deprecated should not be visible outside of class
     */
    mFavorites: IZoweNodeType[];

    /**
     * Adds a session to the container
     * @param sessionName
     * @param type e.g. zosmf
     */
    addSession(sessionName?: string, type?: string): Promise<void>;
    /**
     * Adds a favorite node
     * @param favorite Adds a favorite node
     */
    addFavorite(favorite: IZoweNodeType);
    /**
     * Removes a favorite node
     * @param favorite Adds a favorite node
     */
    removeFavorite(node: IZoweNodeType);
    /**
     * Refreshes the tree
     */
    refresh(): void;
    /**
     * Refreshes an element of the tree
     * @param favorite Node to refresh
     */
    refreshElement(node: IZoweNodeType): void;
    /**
     * Event Emitters used to notify subscribers that the refresh event has fired
     */
    onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent);
    /**
     * Change the state of an expandable node
     * @param element the node being flipped
     * @param isOpen the intended state of the the tree view provider, true or false
     */
    flipState(element: IZoweNodeType, isOpen: boolean);

    /**
     * Rename the node. Begins a dialog.
     * @param the node to be renamed
     */
    rename(node: IZoweNodeType);
    /**
     * Opens the node. Begins a dialog.
     * @param node: the node to be opened
     * @param preview: open in preview of edit mode
     */
    open(node: IZoweNodeType, preview: boolean);
    /**
     * Begins a copy operation on the node.
     * @param node: the node to be copied
     */
    copy(node: IZoweNodeType);
    /**
     * Concludes a copy/paste operation on the node.
     * @param node: the node to be pasted
     */
    paste(node: IZoweNodeType);
    /**
     * Deletes a node.
     * @param node: the node to be deleted
     */
    delete(node: IZoweNodeType);
    /**
     * Reveals and selects a node within the tree.
     * @param treeView: the vscode tree container
     * @param node: the node to be selected
     */
    setItem(treeView: vscode.TreeView<IZoweNodeType>, node: IZoweNodeType);
    /**
     * Saves the currently employed filter as a favorite.
     * @param node: A root node representing a session
     */
    saveSearch(node: IZoweNodeType);
    /**
     * Saves an edited file.
     * @param node: the node to be saved
     */
    saveFile(document: vscode.TextDocument);

    // TODO
    refreshPS(node: IZoweNodeType);

    uploadDialog(node: IZoweDatasetTreeNode): any;

    // TODO replace with filterPrompt
    // datasetFilterPrompt(node: IZoweNodeType): any;
    // filterPrompt(node: IZoweUSSTreeNode): any;
    // searchPrompt(node: IZoweJobTreeNode): any;
    /**
     * Begins a filter/serach operation on a node.
     * @param node: the root node to be searched from
     */
    filterPrompt(node: IZoweNodeType);

    /**
     * Adds a history(Recall) element to persisted settings.
     * @param node: the root node representing the operation
     */
    addHistory(element: string);
    /**
     * Retrieves history(Recall) elements from persisted settings.
     */
    getHistory();
    /**
     * Deletes a root node from the tree.
     * @param node: A root node representing a session
     */
    deleteSession(node: IZoweNodeType): any;
    /**
     * Retrieves the vscode tree container
     */
    getTreeView(): vscode.TreeView<IZoweNodeType>;

    /**
     * Finds an equivalent node but not as a favorite
     *
     * @param {IZoweDatasetTreeNode} node
     * @deprecated should not be visible outside of class
     */
    findFavoritedNode(node: IZoweNodeType): IZoweNodeType;
    /**
     * Finds the equivalent node but not as a favorite
     *
     * @param {IZoweDatasetTreeNode} node
     * @deprecated should not be visible outside of class
     */
    findNonFavoritedNode(node: IZoweNodeType): IZoweNodeType;
    /**
     * Updates favorite
     *
     * @deprecated should not be visible outside of class
     */
    updateFavorites();
    /**
     * Renames a node from the favorites list
     *
     * @param {IZoweDatasetTreeNode} node
     * @deprecated should not be visible outside of class
     */
    renameFavorite(node: IZoweDatasetTreeNode, newLabel: string);
    /**
     * Renames a node based on the profile and it's label
     * @deprecated should not be visible outside of class
     *
     * @param {string} profileLabel
     * @param {string} beforeLabel
     * @param {string} afterLabel
     */
    renameNode(profile: string, beforeDataSetName: string, afterDataSetName: string);
}
