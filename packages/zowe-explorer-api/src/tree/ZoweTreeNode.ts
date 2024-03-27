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
import * as imperative from "@zowe/imperative";
import { IZoweNodeState, IZoweTreeNode } from "./IZoweTreeNode";
import { ZoweTreeProvider } from "./ZoweTreeProvider";

export interface IZoweTreeNodeOpts extends Required<Pick<IZoweTreeNode, "label" | "collapsibleState" | "parent">> {
    session: imperative.ISession;
    profile?: imperative.IProfileLoaded;
}

/**
 * Common implementation of functions and methods associated with the
 * IZoweTreeNode
 *
 * @export
 * @class ZoweDatasetNode
 * @extends {vscode.TreeItem}
 */
export class ZoweTreeNode extends vscode.TreeItem implements IZoweTreeNode {
    public command: vscode.Command;
    public fullPath = "";
    public dirty = false;
    public children: IZoweTreeNode[] = [];
    public treeProvider?: ZoweTreeProvider;
    public parent?: IZoweTreeNode;
    public profile?: imperative.IProfileLoaded;
    public session?: imperative.Session;

    /**
     * Creates an instance of ZoweDatasetNode
     *
     * @param {string} label - Displayed in the [TreeView]
     * @param {vscode.TreeItemCollapsibleState} mCollapsibleState - file/folder
     * @param {IZoweTreeNode} mParent
     * @param {imperative..Session} session
     * @param {string} etag
     */
    public constructor(opts: IZoweTreeNodeOpts) {
        super(opts.label, opts.collapsibleState);
        this.parent = opts.parent;
        // TODO Check this
        if (!opts.profile && this.parent && this.parent.getProfile()) {
            this.profile = this.parent.getProfile();
        }
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async getChildren(): Promise<IZoweTreeNode[]> {
        return this.children;
    }

    public getSessionNode(): IZoweTreeNode {
        return this.treeProvider?.getSessionNode();
    }

    /**
     * Retrieves parent node of this IZoweTreeNode
     *
     * @returns {Promise<IZoweTreeNode>}
     */
    public getParent(): IZoweTreeNode {
        return this.parent;
    }

    /**
     * Returns the [imperative.Session] for this node
     *
     * @returns {imperative.Session}
     */
    public getSession(): imperative.Session {
        return this.session ?? this.getParent()?.getSession();
    }

    /**
     * Returns the imperative.IProfileLoaded profile for this node
     *
     * @returns {imperative.IProfileLoaded}
     */
    public getProfile(): imperative.IProfileLoaded {
        return this.profile ?? this.getParent()?.getProfile();
    }

    /**
     * Implements access to profile name
     *
     * @returns {string}
     */
    public getProfileName(): string {
        return this.getProfile()?.name;
    }

    /**
     * This is the default was that the label should be accessed as it
     * automatically trims the value
     */
    public getLabel(): string | vscode.TreeItemLabel {
        return this.label;
    }

    public setState(state: IZoweNodeState): void {
        this.treeProvider?.setNodeState(this.id, state);
    }

    /**
     * Sets the imperative.IProfileLoaded profile for this node to the one chosen in parameters.
     *
     * @param {imperative.IProfileLoaded} The profile you will set the node to use
     */
    public setProfileToChoice(aProfile: imperative.IProfileLoaded): void {
        this.profile = aProfile;
    }
    /**
     * Sets the session for this node to the one chosen in parameters.
     *
     * @param aSession The session you will set the node to use
     */
    public setSessionToChoice(aSession: imperative.Session): void {
        this.session = aSession;
    }
}
