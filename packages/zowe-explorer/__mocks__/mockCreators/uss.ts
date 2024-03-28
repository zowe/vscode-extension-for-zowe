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

import { ZoweUSSNode } from "../../src/uss/ZoweUSSNode";
import * as vscode from "vscode";
import * as globals from "../../src/globals";
import { ZoweTreeProvider } from "../../src/abstract/ZoweTreeProvider";
import { getIconByNode } from "../../src/generators/icons";
import { removeNodeFromArray } from "./shared";
import { USSTree } from "../../src/uss/USSTree";
import { imperative, PersistenceSchemaEnum } from "@zowe/zowe-explorer-api";

export function createUSSTree(favoriteNodes: ZoweUSSNode[], sessionNodes: ZoweUSSNode[], treeView?: vscode.TreeView<ZoweTreeProvider>): USSTree {
    const newTree = new USSTree();
    newTree.mSessionNodes = [...sessionNodes];
    newTree.mFavorites = favoriteNodes;
    newTree.addSession = jest.fn();
    newTree.getSessions = jest.fn();
    newTree.getFavorites = jest.fn();
    newTree.getSearchHistory = jest.fn();
    newTree.removeSearchHistory = jest.fn();
    newTree.resetSearchHistory = jest.fn();
    newTree.resetFileHistory = jest.fn();
    newTree.refresh = jest.fn();
    newTree.nodeDataChanged = jest.fn();
    newTree.checkCurrentProfile = jest.fn();
    newTree.refreshElement = jest.fn();
    newTree.getChildren = jest.fn();
    newTree.addFavorite = jest.fn().mockImplementation((newFavorite) => newTree.mFavorites.push(newFavorite));
    newTree.removeFavorite = jest.fn().mockImplementation((badFavorite) => removeNodeFromArray(badFavorite, newTree.mFavorites));
    newTree.openItemFromPath = jest.fn();
    newTree.deleteSession = jest.fn().mockImplementation((badSession) => removeNodeFromArray(badSession, newTree.mSessionNodes));
    newTree.getAllLoadedItems = jest.fn();
    newTree.getTreeView = jest.fn().mockImplementation(() => treeView);
    newTree.getTreeItem = jest.fn().mockImplementation(() => new vscode.TreeItem("test"));
    newTree.getTreeType = jest.fn().mockImplementation(() => PersistenceSchemaEnum.USS);
    newTree.setItem = jest.fn();
    newTree.addSearchHistory = jest.fn();
    newTree.getFileHistory = jest.fn();

    return newTree;
}

export function createUSSNode(session, profile) {
    const parentNode = new ZoweUSSNode({
        label: "parentNode",
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        session,
        profile,
    });
    const ussNode = new ZoweUSSNode({
        label: "usstest",
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        parentNode,
        session,
        profile,
    });
    parentNode.contextValue = globals.USS_SESSION_CONTEXT;
    ussNode.contextValue = globals.USS_DIR_CONTEXT;
    parentNode.fullPath = "/u/myuser";
    ussNode.fullPath = "/u/myuser/usstest";
    return ussNode;
}

export function createUSSSessionNode(session: imperative.Session, profile: imperative.IProfileLoaded) {
    const zoweUSSNode = new ZoweUSSNode({
        label: "sestest",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        session,
        profile,
        parentPath: "/",
    });
    zoweUSSNode.fullPath = "test";
    zoweUSSNode.contextValue = globals.USS_SESSION_CONTEXT;
    const targetIcon = getIconByNode(zoweUSSNode);
    if (targetIcon) {
        zoweUSSNode.iconPath = targetIcon.path;
    }

    return zoweUSSNode;
}

// This is NOT a favorite equivalent of the node created by createdUSSNode.
// This is a favorited textfile node. createUSSNode creates a USS session node.
export function createFavoriteUSSNode(session, profile) {
    const parentNode = new ZoweUSSNode({
        label: "parentNode",
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        session,
        profile,
    });
    const ussNodeF = new ZoweUSSNode({
        label: "usstest",
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        parentNode,
        session,
        profile,
    });
    parentNode.contextValue = globals.FAV_PROFILE_CONTEXT;
    ussNodeF.contextValue = globals.USS_TEXT_FILE_CONTEXT + globals.FAV_SUFFIX;
    ussNodeF.fullPath = "/u/myuser/usstest";
    ussNodeF.tooltip = "/u/myuser/usstest";
    return ussNodeF;
}
