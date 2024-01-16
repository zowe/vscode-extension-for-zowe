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
import * as ussActions from "./actions";
import * as refreshActions from "../shared/refresh";
import * as globals from "../globals";
import { IZoweUSSTreeNode, IZoweTreeNode } from "@zowe/zowe-explorer-api";
import { Profiles } from "../Profiles";
import * as contextuals from "../shared/context";
import { getSelectedNodeList } from "../shared/utils";
import { USSTree, createUSSTree } from "./USSTree";
import { initSubscribers } from "../shared/init";
import { ZoweLogger } from "../utils/LoggerUtils";
import { TreeViewUtils } from "../utils/TreeViewUtils";
import { UssFSProvider } from "./fs/UssFSProvider";

export async function initUSSProvider(context: vscode.ExtensionContext): Promise<USSTree> {
    ZoweLogger.trace("init.initUSSProvider called.");

    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("zowe-uss", UssFSProvider.instance, { isCaseSensitive: true }));
    const ussFileProvider: USSTree = await createUSSTree(globals.LOG);
    if (ussFileProvider == null) {
        return null;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.addFavorite", async (node, nodeList) => {
            const selectedNodes = getSelectedNodeList(node, nodeList);
            for (const item of selectedNodes) {
                await ussFileProvider.addFavorite(item);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.removeFavorite", async (node, nodeList) => {
            const selectedNodes = getSelectedNodeList(node, nodeList);
            for (const item of selectedNodes) {
                await ussFileProvider.removeFavorite(item);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.addSession", async () => ussFileProvider.createZoweSession(ussFileProvider))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.refreshAll", async () => {
            await refreshActions.refreshAll(ussFileProvider);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.refreshUSS", async (node, nodeList) => {
            let selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
            selectedNodes = selectedNodes.filter((x) => contextuals.isDocument(x));
            for (const item of selectedNodes) {
                if (contextuals.isUssDirectory(item)) {
                    // just refresh item to grab latest files
                    ussFileProvider.refreshElement(item);
                } else {
                    // need to pull content for file and apply to FS entry
                    await UssFSProvider.instance.fetchFileAtUri(
                        item.resourceUri,
                        vscode.window.visibleTextEditors.find((v) => v.document.uri.path === item.resourceUri.path)
                    );
                }
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.refreshUSSInTree", (node: IZoweUSSTreeNode) => ussActions.refreshUSSInTree(node, ussFileProvider))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.refreshDirectory", async (node, nodeList) => {
            let selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
            selectedNodes = selectedNodes.filter((x) => contextuals.isUssDirectory(x));
            for (const item of selectedNodes) {
                await ussActions.refreshDirectory(item, ussFileProvider);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.fullPath", async (node: IZoweUSSTreeNode): Promise<void> => ussFileProvider.filterPrompt(node))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.editSession", async (node) => ussFileProvider.editSession(node, ussFileProvider))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.ZoweUSSNode.open", (node: IZoweUSSTreeNode): void => node.openUSS(false, true, ussFileProvider))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.removeSession", async (node: IZoweUSSTreeNode, nodeList, hideFromAllTrees: boolean) => {
            let selectedNodes = getSelectedNodeList(node, nodeList);
            selectedNodes = selectedNodes.filter((element) => contextuals.isUssSession(element));
            for (const item of selectedNodes) {
                ussFileProvider.deleteSession(item, hideFromAllTrees);
            }
            await TreeViewUtils.fixVsCodeMultiSelect(ussFileProvider);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.createFile", async (node: IZoweUSSTreeNode) =>
            ussActions.createUSSNode(node, ussFileProvider, "file")
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.createFolder", async (node: IZoweUSSTreeNode) =>
            ussActions.createUSSNode(node, ussFileProvider, "directory")
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.deleteNode", async (node, nodeList) => {
            let selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
            selectedNodes = selectedNodes.filter((x) => contextuals.isDocument(x) || contextuals.isUssDirectory(x));
            const cancelled = await ussActions.deleteUSSFilesPrompt(selectedNodes);
            if (cancelled) {
                return;
            }

            for (const item of selectedNodes) {
                await item.deleteUSSNode(ussFileProvider, "");
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.binary", async (node, nodeList) => {
            let selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
            selectedNodes = selectedNodes.filter((x) => contextuals.isText(x));
            for (const item of selectedNodes) {
                await ussActions.changeFileType(item, true, ussFileProvider);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.text", async (node, nodeList) => {
            let selectedNodes = getSelectedNodeList(node, nodeList) as IZoweUSSTreeNode[];
            selectedNodes = selectedNodes.filter((x) => contextuals.isBinary(x));
            for (const item of selectedNodes) {
                await ussActions.changeFileType(item, false, ussFileProvider);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.renameNode", async (node: IZoweUSSTreeNode): Promise<void> => ussFileProvider.rename(node))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.uploadDialog", async (node: IZoweUSSTreeNode) => ussActions.uploadDialog(node, ussFileProvider))
    );
    context.subscriptions.push(vscode.commands.registerCommand("zowe.uss.copyPath", (node: IZoweUSSTreeNode): void => ussActions.copyPath(node)));
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.editFile", (node: IZoweUSSTreeNode): void => node.openUSS(false, false, ussFileProvider))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.editAttributes", (node: IZoweUSSTreeNode) =>
            ussActions.editAttributes(context, ussFileProvider, node)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.saveSearch", async (node: IZoweUSSTreeNode): Promise<void> => {
            await ussFileProvider.saveSearch(node);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zowe.uss.removeSavedSearch",
            async (node: IZoweUSSTreeNode): Promise<void> => ussFileProvider.removeFavorite(node)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "zowe.uss.removeFavProfile",
            async (node): Promise<void> => ussFileProvider.removeFavProfile(node.label, true)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.disableValidation", (node) => {
            Profiles.getInstance().disableValidation(node);
            ussFileProvider.refreshElement(node);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.enableValidation", (node) => {
            Profiles.getInstance().enableValidation(node);
            ussFileProvider.refreshElement(node);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.ssoLogin", async (node: IZoweTreeNode): Promise<void> => ussFileProvider.ssoLogin(node))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.ssoLogout", async (node: IZoweTreeNode): Promise<void> => ussFileProvider.ssoLogout(node))
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.pasteUssFile", async (node: IZoweUSSTreeNode) => {
            if (ussFileProvider.copying != null) {
                await ussFileProvider.copying;
            }

            await ussActions.pasteUss(ussFileProvider, node);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.uss.copyUssFile", async (node: IZoweUSSTreeNode, nodeList: IZoweUSSTreeNode[]) => {
            ussFileProvider.copying = ussActions.copyUssFiles(node, nodeList, ussFileProvider);
            await ussFileProvider.copying;
        })
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            await ussFileProvider.onDidChangeConfiguration(e);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.diff.useLocalContent", async (localUri) => {
            await UssFSProvider.instance.diffOverwrite(localUri);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("zowe.diff.useRemoteContent", async (localUri) => {
            await UssFSProvider.instance.diffUseRemote(localUri);
        })
    );
    context.subscriptions.push(
        vscode.window.onDidChangeVisibleTextEditors((editors) => {
            const ussUris = editors.map((e) => e.document.uri).filter((u) => u.scheme === "zowe-uss");
            const closedOrMovedUris = UssFSProvider.instance.openedUris.filter((u) => ussUris.find((otherUri) => otherUri.path === u.path) == null);
            for (const uri of closedOrMovedUris) {
                UssFSProvider.instance.invalidateDataForUri(uri);
            }
        })
    );
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => {
            if (doc.uri.scheme !== "zowe-uss") {
                return;
            }

            UssFSProvider.instance.cacheOpenedUri(doc.uri);
        })
    );
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(USSTree.onDidCloseTextDocument));

    initSubscribers(context, ussFileProvider);
    return ussFileProvider;
}
