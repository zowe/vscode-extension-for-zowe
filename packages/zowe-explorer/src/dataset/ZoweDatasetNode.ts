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

import * as zowe from "@zowe/cli";
import * as vscode from "vscode";
import * as globals from "../globals";
import { errorHandling, syncSessionNode } from "../utils/ProfilesUtils";
import { Gui, IZoweDatasetTreeNode, ZoweTreeNode } from "@zowe/zowe-explorer-api";
import { ZoweExplorerApiRegister } from "../ZoweExplorerApiRegister";
import { getIconByNode } from "../generators/icons";
import * as contextually from "../shared/context";
import * as nls from "vscode-nls";
import { Profiles } from "../Profiles";
import { ZoweLogger } from "../utils/LoggerUtils";
// Set up localization
nls.config({
    messageFormat: nls.MessageFormat.bundle,
    bundleFormat: nls.BundleFormat.standalone,
})();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

/**
 * A type of TreeItem used to represent sessions and data sets
 *
 * @export
 * @class ZoweDatasetNode
 * @extends {vscode.TreeItem}
 */
export class ZoweDatasetNode extends ZoweTreeNode implements IZoweDatasetTreeNode {
    public command: vscode.Command;
    public pattern = "";
    public memberPattern = "";
    public dirty = true;
    public children: ZoweDatasetNode[] = [];
    public errorDetails: zowe.imperative.ImperativeError;

    /**
     * Creates an instance of ZoweDatasetNode
     *
     * @param {string} label - Displayed in the [TreeView]
     * @param {vscode.TreeItemCollapsibleState} mCollapsibleState - file/folder
     * @param {ZoweDatasetNode} mParent
     * @param {Session} session
     */
    public constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        mParent: IZoweDatasetTreeNode,
        session: zowe.imperative.Session,
        contextOverride?: string,
        private etag?: string,
        profile?: zowe.imperative.IProfileLoaded
    ) {
        super(label, collapsibleState, mParent, session, profile);

        if (contextOverride) {
            this.contextValue = contextOverride;
        } else if (collapsibleState !== vscode.TreeItemCollapsibleState.None) {
            this.contextValue = globals.DS_PDS_CONTEXT;
        } else if (mParent && mParent.getParent()) {
            this.contextValue = globals.DS_MEMBER_CONTEXT;
        } else {
            this.contextValue = globals.DS_DS_CONTEXT;
        }
        this.tooltip = this.label as string;
        const icon = getIconByNode(this);
        if (icon) {
            this.iconPath = icon.path;
        }
        if (!globals.ISTHEIA && this.getParent() && contextually.isSession(this.getParent())) {
            this.id = `${mParent?.id ?? mParent?.label?.toString() ?? "<root>"}.${this.label as string}`;
        }
    }

    /**
     * Implements access to profile name
     * for {IZoweDatasetTreeNode}.
     *
     * @returns {string}
     */
    public getProfileName(): string {
        ZoweLogger.trace("ZoweDatasetNode.getProfileName called.");
        return this.getProfile() ? this.getProfile().name : undefined;
    }

    /**
     * Retrieves child nodes of this ZoweDatasetNode
     *
     * @returns {Promise<ZoweDatasetNode[]>}
     */
    public async getChildren(): Promise<ZoweDatasetNode[]> {
        ZoweLogger.trace("ZoweDatasetNode.getChildren called.");
        if (!this.pattern && contextually.isSessionNotFav(this)) {
            return [
                new ZoweDatasetNode(
                    localize("getChildren.search", "Use the search button to display data sets"),
                    vscode.TreeItemCollapsibleState.None,
                    this,
                    null,
                    globals.INFORMATION_CONTEXT
                ),
            ];
        }
        if (contextually.isDocument(this) || contextually.isInformation(this)) {
            return [];
        }

        if (!this.dirty || this.label === "Favorites") {
            return this.children;
        }

        if (!this.label) {
            Gui.errorMessage(localize("getChildren.error.invalidNode", "Invalid node"));
            throw Error(localize("getChildren.error.invalidNode", "Invalid node"));
        }

        // Gets the datasets from the pattern or members of the dataset and displays any thrown errors
        const responses = await this.getDatasets();
        if (!responses || responses.length === 0) {
            ZoweLogger.debug("returning undefined node.getchildren");
            return undefined;
        }

        // push nodes to an object with property names to avoid duplicates
        const elementChildren: { [k: string]: ZoweDatasetNode } = {};
        for (const response of responses) {
            // Throws reject if the Zowe command does not throw an error but does not succeed
            // The dataSetsMatchingPattern API may return success=false and apiResponse=[] when no data sets found
            if (!response.success && !(Array.isArray(response.apiResponse) && response.apiResponse.length === 0)) {
                return void errorHandling(localize("getChildren.responses.error", "The response from Zowe CLI was not successful"));
            }

            // Loops through all the returned dataset members and creates nodes for them
            for (const item of response.apiResponse.items ?? response.apiResponse) {
                const existing = this.children.find((element) => element.label.toString() === item.dsname);
                if (existing) {
                    elementChildren[existing.label.toString()] = existing;
                    // Creates a ZoweDatasetNode for a PDS
                } else if (item.dsorg === "PO" || item.dsorg === "PO-E") {
                    const temp = new ZoweDatasetNode(
                        item.dsname,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this,
                        null,
                        undefined,
                        undefined,
                        this.getProfile()
                    );
                    elementChildren[temp.label.toString()] = temp;
                    // Creates a ZoweDatasetNode for a dataset with imperative errors
                } else if (item.error instanceof zowe.imperative.ImperativeError) {
                    const temp = new ZoweDatasetNode(
                        item.dsname,
                        vscode.TreeItemCollapsibleState.None,
                        this,
                        null,
                        globals.DS_FILE_ERROR_CONTEXT,
                        undefined,
                        this.getProfile()
                    );
                    temp.errorDetails = item.error; // Save imperative error to avoid extra z/OS requests
                    elementChildren[temp.label.toString()] = temp;
                    // Creates a ZoweDatasetNode for a migrated dataset
                } else if (item.migr && item.migr.toUpperCase() === "YES") {
                    const temp = new ZoweDatasetNode(
                        item.dsname,
                        vscode.TreeItemCollapsibleState.None,
                        this,
                        null,
                        globals.DS_MIGRATED_FILE_CONTEXT,
                        undefined,
                        this.getProfile()
                    );
                    elementChildren[temp.label.toString()] = temp;
                    // Creates a ZoweDatasetNode for a VSAM file
                } else if (item.dsorg === "VS") {
                    let altLabel = item.dsname;
                    let endPoint = altLabel.indexOf(".DATA");
                    if (endPoint === -1) {
                        endPoint = altLabel.indexOf(".INDEX");
                    }
                    if (endPoint > -1) {
                        altLabel = altLabel.substring(0, endPoint);
                    }
                    if (!elementChildren[altLabel]) {
                        elementChildren[altLabel] = new ZoweDatasetNode(
                            altLabel,
                            vscode.TreeItemCollapsibleState.None,
                            this,
                            null,
                            globals.VSAM_CONTEXT,
                            undefined,
                            this.getProfile()
                        );
                    }
                } else if (contextually.isSessionNotFav(this)) {
                    // Creates a ZoweDatasetNode for a PS
                    const temp = new ZoweDatasetNode(
                        item.dsname,
                        vscode.TreeItemCollapsibleState.None,
                        this,
                        null,
                        undefined,
                        undefined,
                        this.getProfile()
                    );
                    temp.command = { command: "zowe.ds.ZoweNode.openPS", title: "", arguments: [temp] };
                    elementChildren[temp.label.toString()] = temp;
                } else {
                    // Creates a ZoweDatasetNode for a PDS member
                    const temp = new ZoweDatasetNode(
                        item.member,
                        vscode.TreeItemCollapsibleState.None,
                        this,
                        null,
                        undefined,
                        undefined,
                        this.getProfile()
                    );
                    temp.command = { command: "zowe.ds.ZoweNode.openPS", title: "", arguments: [temp] };
                    elementChildren[temp.label.toString()] = temp;
                }
            }
        }

        this.dirty = false;
        if (Object.keys(elementChildren).length === 0) {
            this.children = [
                new ZoweDatasetNode(
                    localize("getChildren.noDataset", "No data sets found"),
                    vscode.TreeItemCollapsibleState.None,
                    this,
                    null,
                    globals.INFORMATION_CONTEXT
                ),
            ];
        } else {
            const newChildren = Object.keys(elementChildren)
                .sort()
                .filter((label) => this.children.find((c) => (c.label as string) === label) == null)
                .map((label) => elementChildren[label]);

            this.children = this.children.concat(newChildren).filter((c) => (c.label as string) in elementChildren);
        }

        return this.children;
    }

    public getSessionNode(): IZoweDatasetTreeNode {
        ZoweLogger.trace("ZoweDatasetNode.getSessionNode called.");
        return this.getParent() ? this.getParent().getSessionNode() : this;
    }
    /**
     * Returns the [etag] for this node
     *
     * @returns {string}
     */
    public getEtag(): string {
        ZoweLogger.trace("ZoweDatasetNode.getEtag called.");
        return this.etag;
    }

    /**
     * Set the [etag] for this node
     *
     * @returns {void}
     */
    public setEtag(etagValue): void {
        ZoweLogger.trace("ZoweDatasetNode.setEtag called.");
        this.etag = etagValue;
    }

    private async getDatasets(): Promise<zowe.IZosFilesResponse[]> {
        ZoweLogger.trace("ZoweDatasetNode.getDatasets called.");
        const sessNode = this.getSessionNode();
        const cachedProfile = sessNode.getProfile();
        const responses: zowe.IZosFilesResponse[] = [];
        const options: zowe.IListOptions = {
            attributes: true,
            responseTimeout: cachedProfile.profile.responseTimeout,
        };
        if (contextually.isSessionNotFav(this)) {
            const dsPatterns = [
                ...new Set(
                    this.pattern
                        .toUpperCase()
                        .split(",")
                        .map((p) => p.trim())
                ),
            ];
            const mvsApi = ZoweExplorerApiRegister.getMvsApi(cachedProfile);
            if (mvsApi.dataSetsMatchingPattern) {
                responses.push(await mvsApi.dataSetsMatchingPattern(dsPatterns));
                ZoweLogger.debug(String(responses));
                return responses;
            }
            for (const dsp of dsPatterns) {
                responses.push(await mvsApi.dataSet(dsp));
            }
            ZoweLogger.debug(String(responses));
            return responses;
        }
        if (this.memberPattern) {
            this.memberPattern = this.memberPattern.toUpperCase();
            for (const memPattern of this.memberPattern.split(",")) {
                options.pattern = memPattern;
                responses.push(await ZoweExplorerApiRegister.getMvsApi(cachedProfile).allMembers(this.label as string, options));
            }
            ZoweLogger.debug(String(responses));
            return responses;
        }
        responses.push(await ZoweExplorerApiRegister.getMvsApi(cachedProfile).allMembers(this.label as string, options));
    }
}
