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
import * as zosjobs from "@zowe/zos-jobs-for-zowe-sdk";
import { Sorting } from "./sorting";
import { ZoweTreeNodeActions } from "./ZoweNodeActions";
import type { Types } from "../Types";
import { ZoweTreeProvider } from "./ZoweTreeProvider";

interface TextEncoding {
    kind: "text";
}

interface BinaryEncoding {
    kind: "binary";
}

interface OtherEncoding {
    kind: "other";
    codepage: string;
}

export type ZosEncoding = TextEncoding | BinaryEncoding | OtherEncoding;

/**
 * The base interface for Zowe tree nodes that are implemented by vscode.TreeItem.
 *
 * @export
 * @interface IZoweTreeNode
 */
export interface IZoweTreeNode {
    /**
     * The icon path or [ThemeIcon](#ThemeIcon) for the tree item.
     */
    iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;
    /**
     * Indicator that the child data may have become stale and requires refreshing.
     */
    dirty: boolean;
    /**
     *  A human-readable string describing this item.
     */
    label?: string | vscode.TreeItemLabel;
    /**
     * A description for this tree item.
     */
    description?: string | boolean;
    /**
     * A unique identifier for this tree item.
     * Used to prevent VScode from losing track of TreeItems in a TreeProvider.
     */
    id?: string;
    /**
     * The parent node that contains this node (optional)
     */
    parent?: IZoweTreeNode;
    profile?: imperative.IProfileLoaded;
    /**
     * The tooltip text when you hover over this item.
     */
    tooltip?: string | vscode.MarkdownString | undefined;
    /**
     * The tree provider that contains this node.
     */
    treeProvider?: ZoweTreeProvider;
    /**
     * Children nodes of this node
     */
    children?: IZoweTreeNode[];
    /**
     * [TreeItemCollapsibleState](#TreeItemCollapsibleState) of the tree item.
     */
    collapsibleState?: vscode.TreeItemCollapsibleState;
    /**
     * Context value of the tree item. This can be used to contribute item specific actions in the tree.
     *
     * This will show action `extension.deleteFolder` only for items with `contextValue` is `folder`.
     */
    contextValue?: string;
    /**
     * Any ongoing actions that must be awaited before continuing
     */
    ongoingActions?: Record<ZoweTreeNodeActions.Interactions | string, Promise<any>>;
    /**
     * whether the node was double-clicked
     */
    wasDoubleClicked?: boolean;
    /**
     *
     */
    session?: imperative.Session;
    /**
     * Sorting method for this node's children
     */
    sort?: Sorting.NodeSort;
    /**
     * Retrieves the node label
     */
    getLabel(): string | vscode.TreeItemLabel;
    /**
     * Retrieves the nodes parent node
     */
    getParent(): IZoweTreeNode;
    /**
     * Retrieves the nodes children nodes
     */
    getChildren(): Promise<IZoweTreeNode[]>;
    /**
     * Retrieves the profile name in use with this node
     */
    getProfileName(): string;
    /**
     * Retrieves the session node in use with this node
     */
    getSessionNode(): IZoweTreeNode;
    /**
     * Retrieves the session object in use with this node
     */
    getSession(): imperative.Session;
    /**
     * Retrieves the profile object in use with this node
     */
    getProfile(): imperative.IProfileLoaded;
    /**
     * Set the profile to use for this node to be the one chosen in the parameters
     *
     * @param profileObj The profile you will set the node to use
     */
    setProfileToChoice(profileObj: imperative.IProfileLoaded): void;
    /**
     * Set the session to use for this node to be the one chosen in the parameters
     *
     * @param sessionObj The session you will set the node to use
     */
    setSessionToChoice(sessionObj: imperative.Session): void;
}

export interface IZoweNodeState {
    label?: string;
}

export interface IZoweDatasetState extends IZoweNodeState, Pick<IZoweDatasetTreeNode, "binary" | "encoding" | "encodingMap" | "stats"> {}

export interface IZoweUSSState extends Pick<IZoweUSSTreeNode, "attributes" | "binary" | "encoding" | "encodingMap"> {
    /**
     * Describes the full path of a file
     */
    fullPath?: string;
}

export interface IZoweJobState extends Pick<IZoweJobTreeNode, "filtered" | "job" | "owner" | "prefix" | "searchId" | "status"> {}

/**
 * Extended interface for Zowe Dataset tree nodes.
 *
 * @export
 * @interface export interface IZoweDatasetTreeNode extends IZoweTreeNode {
 */
export interface IZoweDatasetTreeNode extends IZoweTreeNode {
    /**
     * Search criteria for a Dataset search
     */
    pattern?: string;
    /**
     * Search criteria for a Dataset member search
     */
    memberPattern?: string;
    /**
     * Additional statistics about this data set
     */
    stats?: Partial<Types.DatasetStats>;
    /**
     * Filter method for this data set's children
     */
    filter?: Sorting.DatasetFilter;
    /**
     * List of child nodes and user-selected encodings
     */
    encodingMap?: Record<string, ZosEncoding>;
    /**
     * Binary indicator. Default false (text)
     */
    binary?: boolean;
    /**
     * Remote encoding of the data set
     *
     * * `null` = user selected z/OS default codepage
     * * `undefined` = user did not specify
     */
    encoding?: string;
    /**
     * Retrieves child nodes of this IZoweDatasetTreeNode
     *
     * @returns {Promise<IZoweDatasetTreeNode[]>}
     */
    getChildren(): Promise<IZoweDatasetTreeNode[]>;
    /**
     * Retrieves the etag value for the file
     *
     * @returns {string}
     */
    getEtag?(): string;
    /**
     * Sets the etag value for the file
     *
     * @param {string}
     */
    setEtag?(etag: string);
    /**
     * Downloads and displays a file in a text editor view
     *
     * @param download Download the file default false
     * @param preview the file, true or false
     * @param datasetFileProvider the tree provider
     */
    openDs?(download: boolean, previewFile: boolean, datasetFileProvider: Types.IZoweDatasetTreeType): Promise<void>;
    /**
     * Sets the codepage value for the file
     *
     * @param {string}
     */
    setEncoding?(encoding: ZosEncoding);
}

/**
 * Extended interface for Zowe USS tree nodes.
 *
 * @export
 * @interface export interface IZoweUSSTreeNode extends IZoweTreeNode {
 */
export interface IZoweUSSTreeNode extends IZoweTreeNode {
    /**
     * Retrieves an abridged for of the label
     */
    shortLabel?: string;
    /**
     * List of child nodes and user-selected encodings
     */
    encodingMap?: Record<string, ZosEncoding>;
    /**
     * Binary indicator. Default false (text)
     */
    binary?: boolean;
    /**
     * The full path to the USS file.
     */
    fullPath?: string;
    /**
     * File attributes
     */
    attributes?: Types.FileAttributes;
    /**
     * Event that fires whenever an existing node is updated.
     */
    onUpdateEmitter?: vscode.EventEmitter<IZoweUSSTreeNode>;
    /**
     * Remote encoding of the data set
     *
     * * `null` = user selected z/OS default codepage
     * * `undefined` = user did not specify
     */
    encoding?: string;
    /**
     * Event that fires whenever an existing node is updated.
     */
    onUpdate?: vscode.Event<IZoweUSSTreeNode>;
    /**
     * Retrieves child nodes of this IZoweUSSTreeNode
     *
     * @returns {Promise<IZoweUSSTreeNode[]>}
     */
    getChildren(): Promise<IZoweUSSTreeNode[]>;
    /**
     * Retrieves the etag value for the file
     *
     * @returns {string}
     */
    getEtag?(): string;
    /**
     * Sets the etag value for the file
     *
     * @param {string}
     */
    setEtag?(etag: string);
    /**
     * Renaming a USS Node. This could be a Favorite Node
     *
     * @param {string} newNamePath
     */
    rename?(newNamePath: string);
    /**
     * Sets the codepage value for the file
     *
     * @param {string}
     */
    setEncoding?(encoding: ZosEncoding);
    // /**
    //  * Opens the text document
    //  * @return vscode.TextDocument
    //  */
    // getOpenedDocumentInstance?(): vscode.TextDocument;
    /**
     * Downloads and displays a file in a text editor view
     *
     * @param download Download the file default false
     * @param preview the file, true or false
     * @param ussFileProvider the tree provider
     */
    openUSS?(download: boolean, previewFile: boolean, ussFileProvider: Types.IZoweUSSTreeType): Promise<void>;
    /**
     * Returns the local file path for the ZoweUSSNode
     *
     */
    getUSSDocumentFilePath?(): string;
    /**
     * Refreshes the node with current mainframe data
     *
     */
    refreshUSS?();
    /**
     *
     * @param ussFileProvider Deletes the USS tree node
     * @param filePath
     * @param cancelled optional
     */
    deleteUSSNode?(ussFileProvider: Types.IZoweUSSTreeType, filePath: string, cancelled?: boolean);
    /**
     * Process for renaming a USS Node. This could be a Favorite Node
     *
     * @param {USSTree} ussFileProvider
     * @param {string} filePath
     */
    renameUSSNode?(ussFileProvider: Types.IZoweUSSTreeType, filePath: string);
    /**
     * Refreshes node and reopens it.
     * @param hasClosedInstance
     * @deprecated Use reopen instead. Will be removed by version 2.0.
     */
    refreshAndReopen?(hasClosedInstance?: boolean);
    /**
     * Reopens a file if it was closed (e.g. while it was being renamed).
     * @param hasClosedInstance
     */
    reopen?(hasClosedInstance?: boolean);
    /**
     * Adds a search node to the USS favorites list
     *
     * @param {USSTree} ussFileProvider
     */
    saveSearch?(ussFileProvider: Types.IZoweUSSTreeType);
    /**
     * uploads selected uss node(s) to from clipboard to mainframe
     * @deprecated in favor of `pasteUssTree`
     */
    copyUssFile?();

    /**
     * Uploads a tree of USS file(s)/folder(s) to mainframe
     */
    pasteUssTree?();
}

/**
 * Extended interface for Zowe Job tree nodes.
 *
 * @export
 * @interface export interface IZoweJobTreeNode extends IZoweTreeNode {
 */
export interface IZoweJobTreeNode extends IZoweTreeNode {
    /**
     * Use Job-specific tree node for children.
     */
    children?: IZoweJobTreeNode[];
    /**
     * Standard job response document
     * Represents the attributes and status of a z/OS batch job
     * @interface IJob
     */
    job?: zosjobs.IJob;
    /**
     * Search criteria for a Job search
     */
    searchId?: string;
    /**
     * Job Prefix i.e "MYJOB"
     * Attribute of Job query
     */
    prefix?: string;
    /**
     * Job Owner i.e "MYID"
     * Attribute of Job query
     */
    owner?: string;
    /**
     * Job Status i.e "ACTIVE"
     * Attribute of Job query
     */
    status?: string;
    /**
     * Returns whether the job node is a filtered search
     */
    filtered?: boolean;
    /**
     * Filter method for this job search
     */
    filter?: string;
    /**
     * Array of original filter search results job's children
     */
    actualJobs?: IZoweTreeNode[];
    /**
     * Retrieves child nodes of this IZoweJobTreeNode
     *
     * @returns {Promise<IZoweJobTreeNode[]>}
     */
    getChildren(): Promise<IZoweJobTreeNode[]>;
}
