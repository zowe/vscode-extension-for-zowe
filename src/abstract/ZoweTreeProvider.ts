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
import { Logger } from "@zowe/imperative";
import { PersistentFilters } from "../PersistentFilters";
import { OwnerFilterDescriptor } from "../job/utils";
import { IZoweTreeNode, IZoweDatasetTreeNode } from "../api/IZoweTreeNode";
import { getIconByNode } from "../generators/icons";

// tslint:disable-next-line: max-classes-per-file
export class ZoweTreeProvider {

    // Event Emitters used to notify subscribers that the refresh event has fired
    public mOnDidChangeTreeData: vscode.EventEmitter<IZoweTreeNode | undefined> = new vscode.EventEmitter<IZoweTreeNode | undefined>();
    public readonly onDidChangeTreeData: vscode.Event<IZoweTreeNode | undefined> = this.mOnDidChangeTreeData.event;
    public createOwner = new OwnerFilterDescriptor();

    protected mHistory: PersistentFilters;
    protected log: Logger = Logger.getAppLogger();
    protected validProfile: number = -1;

    constructor(protected persistenceSchema: string, public mFavoriteSession: IZoweTreeNode) {
        this.mHistory = new PersistentFilters(this.persistenceSchema);
    }

    /**
     * Takes argument of type IZoweTreeNode and returns it converted to a general [TreeItem]
     *
     * @param {IZoweTreeNode} element
     * @returns {vscode.TreeItem}
     */
    public getTreeItem(element: IZoweTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    public getParent(element: IZoweTreeNode): IZoweTreeNode {
        return element.getParent();
    }

    /**
     * Selects a specific item in the tree view
     *
     * @param {IZoweTreeNode}
     */
    public setItem(treeView: vscode.TreeView<IZoweTreeNode>, item: IZoweTreeNode) {
        treeView.reveal(item, {select: true, focus: true});
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refreshElement(element: IZoweDatasetTreeNode): void {
        element.dirty = true;
        this.mOnDidChangeTreeData.fire(element);
    }

    /**
     * Called whenever the tree needs to be refreshed, and fires the data change event
     *
     */
    public refresh(): void {
        this.mOnDidChangeTreeData.fire();
    }

    /**
     * Change the state of an expandable node
     * @param provider the tree view provider
     * @param element the node being flipped
     * @param isOpen the intended state of the the tree view provider, true or false
     */
    public async flipState(element: IZoweTreeNode, isOpen: boolean = false) {
        element.collapsibleState = isOpen ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
        const icon = getIconByNode(element);
        if (icon) {
            element.iconPath = icon.path;
        }
        element.dirty = true;
        this.mOnDidChangeTreeData.fire(element);
    }

    public async onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {
        if (e.affectsConfiguration(this.persistenceSchema)) {
            const setting: any = {...vscode.workspace.getConfiguration().get(this.persistenceSchema)};
            if (!setting.persistence) {
                setting.favorites = [];
                setting.history = [];
                await vscode.workspace.getConfiguration().update(this.persistenceSchema, setting, vscode.ConfigurationTarget.Global);
            }
        }
    }

    public getHistory() {
        return this.mHistory.getHistory();
    }

    public async addHistory(criteria: string) {
        if (criteria) {
            this.mHistory.addHistory(criteria);
            this.refresh();
        }
    }

    public findNonFavoritedNode(element: IZoweTreeNode) {
        return undefined;
    }

    public findFavoritedNode(element: IZoweTreeNode) {
        return undefined;
    }
    public renameFavorite(node: IZoweTreeNode, newLabel: string) {
        return undefined;
    }
    public renameNode(profile: string, beforeDataSetName: string, afterDataSetName: string) {
        return undefined;
    }
    protected deleteSessionByLabel(revisedLabel: string) {
        if (revisedLabel.includes("[")) {
            revisedLabel = revisedLabel.substring(0, revisedLabel.indexOf(" ["));
        }
        this.mHistory.removeSession(revisedLabel);
        this.refresh();
    }
}
