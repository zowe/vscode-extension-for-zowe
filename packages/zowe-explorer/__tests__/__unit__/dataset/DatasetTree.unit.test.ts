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
import * as globals from "../../../src/globals";
import * as fs from "fs";
import * as zowe from "@zowe/cli";
import { Logger } from "@zowe/imperative";
import { DatasetTree } from "../../../src/dataset/DatasetTree";
import { ZoweDatasetNode } from "../../../src/dataset/ZoweDatasetNode";
import { IZoweDatasetTreeNode, ValidProfileEnum } from "@zowe/zowe-explorer-api";
import { ZoweExplorerApiRegister } from "../../../src/ZoweExplorerApiRegister";
import { Profiles } from "../../../src/Profiles";
import * as utils from "../../../src/utils/ProfilesUtils";
import { getIconByNode } from "../../../src/generators/icons";
import {
    createInstanceOfProfile,
    createIProfile,
    createISession,
    createISessionWithoutCredentials,
    createQuickPickContent,
    createTreeView,
    createWorkspaceConfiguration,
    createPersistentConfig,
    createValidIProfile,
} from "../../../__mocks__/mockCreators/shared";
import {
    createDatasetSessionNode,
    createDatasetTree,
    createDatasetFavoritesNode,
} from "../../../__mocks__/mockCreators/datasets";
import { bindMvsApi, createMvsApi } from "../../../__mocks__/mockCreators/api";
import * as workspaceUtils from "../../../src/utils/workspace";
import { PersistentFilters } from "../../../src/PersistentFilters";

jest.mock("fs");
jest.mock("util");

function createGlobalMocks() {
    const globalMocks = {
        isTheia: jest.fn(),
        testProfileLoaded: createValidIProfile(),
        mockProfileInstance: null,
    };

    globalMocks.mockProfileInstance = createInstanceOfProfile(globalMocks.testProfileLoaded);

    Object.defineProperty(vscode.window, "createTreeView", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInformationMessage", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: jest.fn(), configurable: true });
    Object.defineProperty(Profiles, "getInstance", {
        value: jest.fn().mockReturnValue(globalMocks.mockProfileInstance),
        configurable: true,
    });
    Object.defineProperty(vscode.window, "showQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "createQuickPick", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.window, "showInputBox", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe, "Rename", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Rename, "dataSet", { value: jest.fn(), configurable: true });
    Object.defineProperty(zowe.Rename, "dataSetMember", { value: jest.fn(), configurable: true });
    Object.defineProperty(globals, "ISTHEIA", { get: globalMocks.isTheia, configurable: true });
    Object.defineProperty(fs, "unlinkSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(fs, "existsSync", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode.commands, "executeCommand", { value: jest.fn(), configurable: true });
    Object.defineProperty(workspaceUtils, "closeOpenedTextFile", { value: jest.fn(), configurable: true });
    Object.defineProperty(vscode, "ProgressLocation", {
        value: jest.fn().mockImplementation(() => {
            return {
                Notification: 15,
            };
        }),
        configurable: true,
    });
    Object.defineProperty(vscode, "ConfigurationTarget", {
        value: jest.fn().mockImplementation(() => {
            return {
                Global: 1,
                Workspace: 2,
                WorkspaceFolder: 3,
            };
        }),
        configurable: true,
    });
    Object.defineProperty(vscode.window, "withProgress", {
        value: jest.fn().mockImplementation((progLocation, callback) => {
            return callback();
        }),
        configurable: true,
    });
    Object.defineProperty(PersistentFilters, "getDirectValue", {
        value: jest.fn(() => {
            return {
                "Zowe-Automatic-Validation": true,
            };
        }),
    });

    return globalMocks;
}

// Idea is borrowed from: https://github.com/kulshekhar/ts-jest/blob/master/src/util/testing.ts
const mocked = <T extends (...args: any[]) => any>(fn: T): jest.Mock<ReturnType<T>> => fn as any;

describe("Dataset Tree Unit Tests - Initialisation", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            treeView,
            datasetSessionNode,
        };
    }

    it("Checking definition of the dataset tree", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        expect(testTree.mSessionNodes.map((node) => node.label)).toEqual([
            "Favorites",
            blockMocks.datasetSessionNode.label,
        ]);
        expect(testTree.getTreeView()).toEqual(blockMocks.treeView);
    });
});

describe("Dataset Tree Unit Tests - Function getTreeItem", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking function with PS Dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const node = new ZoweDatasetNode(
            "BRTVS99",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            blockMocks.session
        );
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        expect(testTree.getTreeItem(node)).toBeInstanceOf(vscode.TreeItem);
    });
});
describe("Dataset Tree Unit tests - Function initializeFavChildNodeForProfile", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            imperativeProfile,
            session,
            datasetSessionNode,
        };
    }

    it("Checking function for PDS favorite", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new DatasetTree();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            null
        );
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        const node = new ZoweDatasetNode(
            "BRTVS99.PUBLIC",
            vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode,
            undefined,
            globals.PDS_FAV_CONTEXT
        );

        const favChildNodeForProfile = await testTree.initializeFavChildNodeForProfile(
            "BRTVS99.PUBLIC",
            globals.DS_PDS_CONTEXT,
            favProfileNode
        );

        expect(favChildNodeForProfile).toEqual(node);
    });
    it("Checking function for sequential DS favorite", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new DatasetTree();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            null
        );
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        const node = new ZoweDatasetNode(
            "BRTVS99.PS",
            vscode.TreeItemCollapsibleState.None,
            favProfileNode,
            undefined,
            globals.DS_FAV_CONTEXT
        );
        node.command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [node] };

        const favChildNodeForProfile = await testTree.initializeFavChildNodeForProfile(
            "BRTVS99.PS",
            globals.DS_DS_CONTEXT,
            favProfileNode
        );

        expect(favChildNodeForProfile).toEqual(node);
    });
    it("Checking function for invalid context value", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new DatasetTree();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            null
        );
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        const showErrorMessageSpy = jest.spyOn(vscode.window, "showErrorMessage");
        await testTree.initializeFavChildNodeForProfile("BRTVS99.BAD", "badContextValue", favProfileNode);

        expect(showErrorMessageSpy).toBeCalledTimes(1);
    });
});
describe("Dataset Tree Unit Tests - Function getChildren", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const profile = createInstanceOfProfile(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            imperativeProfile,
            session,
            profile,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking function for root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const favoriteSessionNode = new ZoweDatasetNode(
            "Favorites",
            vscode.TreeItemCollapsibleState.Collapsed,
            null,
            null
        );
        favoriteSessionNode.contextValue = globals.FAVORITE_CONTEXT;
        const targetIcon = getIconByNode(favoriteSessionNode);
        if (targetIcon) {
            favoriteSessionNode.iconPath = targetIcon.path;
        }

        const children = await testTree.getChildren();

        expect(favoriteSessionNode).toMatchObject(children[0]);
        expect(blockMocks.datasetSessionNode).toMatchObject(children[1]);
    });
    it("Checking function for session node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        blockMocks.datasetSessionNode.pattern = "test";
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mSessionNodes[1].dirty = true;
        const sampleChildren: ZoweDatasetNode[] = [
            new ZoweDatasetNode(
                "BRTVS99",
                vscode.TreeItemCollapsibleState.None,
                testTree.mSessionNodes[1],
                null,
                undefined,
                undefined,
                blockMocks.imperativeProfile
            ),
            new ZoweDatasetNode(
                "BRTVS99.CA10",
                vscode.TreeItemCollapsibleState.None,
                testTree.mSessionNodes[1],
                null,
                globals.DS_MIGRATED_FILE_CONTEXT,
                undefined,
                blockMocks.imperativeProfile
            ),
            new ZoweDatasetNode(
                "BRTVS99.CA11.SPFTEMP0.CNTL",
                vscode.TreeItemCollapsibleState.Collapsed,
                testTree.mSessionNodes[1],
                null,
                undefined,
                undefined,
                blockMocks.imperativeProfile
            ),
            new ZoweDatasetNode(
                "BRTVS99.DDIR",
                vscode.TreeItemCollapsibleState.Collapsed,
                testTree.mSessionNodes[1],
                null,
                undefined,
                undefined,
                blockMocks.imperativeProfile
            ),
            new ZoweDatasetNode(
                "BRTVS99.VS1",
                vscode.TreeItemCollapsibleState.None,
                testTree.mSessionNodes[1],
                null,
                globals.VSAM_CONTEXT,
                undefined,
                blockMocks.imperativeProfile
            ),
        ];
        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };

        const children = await testTree.getChildren(testTree.mSessionNodes[1]);

        expect(children).toEqual(sampleChildren);
    });
    it("Checking function for favorite node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            blockMocks.session
        );
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mFavorites.push(favProfileNode);

        const children = await testTree.getChildren(testTree.mSessionNodes[0]);

        expect(children).toEqual([favProfileNode]);
    });
    it("Checking function for profile node in Favorites section", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const log = Logger.getAppLogger();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            null
        );
        favProfileNode.contextValue = globals.FAV_PROFILE_CONTEXT;
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mFavorites.push(favProfileNode);
        const loadProfilesForFavoritesSpy = jest.spyOn(testTree, "loadProfilesForFavorites");

        await testTree.getChildren(favProfileNode);

        expect(loadProfilesForFavoritesSpy).toHaveBeenCalledWith(log, favProfileNode);
    });
    it("Checking function for PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(
            "BRTVS99.PUBLIC",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            null
        );
        parent.dirty = true;
        const sampleChildren: ZoweDatasetNode[] = [
            new ZoweDatasetNode("BRTVS99", vscode.TreeItemCollapsibleState.None, parent, null),
            new ZoweDatasetNode("BRTVS99.DDIR", vscode.TreeItemCollapsibleState.None, parent, null),
        ];
        sampleChildren[0].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[0]] };
        sampleChildren[1].command = { command: "zowe.ZoweNode.openPS", title: "", arguments: [sampleChildren[1]] };

        const children = await testTree.getChildren(parent);

        expect(children).toEqual(sampleChildren);
    });
});
describe("Dataset Tree Unit Tests - Function loadProfilesForFavorites", () => {
    function createBlockMocks() {
        const log = Logger.getAppLogger();
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetFavoriteNode = createDatasetFavoritesNode();
        const mvsApi = createMvsApi(imperativeProfile);
        bindMvsApi(mvsApi);

        return {
            log,
            imperativeProfile,
            session,
            datasetFavoriteNode,
            treeView,
            mvsApi,
        };
    }

    it("Checking that loaded profile and session values are added to the profile grouping node in Favorites", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoriteNode,
            null,
            globals.FAV_PROFILE_CONTEXT,
            undefined,
            undefined
        );
        const testTree = new DatasetTree();
        testTree.mFavorites.push(favProfileNode);
        const expectedFavProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoriteNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );

        // Mock successful loading of profile/session
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    loadNamedProfile: jest.fn(() => {
                        return blockMocks.imperativeProfile;
                    }),
                    checkCurrentProfile: jest.fn(() => {
                        return {
                            name: blockMocks.imperativeProfile.name,
                            status: "unverified",
                        };
                    }),
                    validProfile: ValidProfileEnum.VALID,
                };
            }),
        });
        Object.defineProperty(blockMocks.mvsApi, "getSession", {
            value: jest.fn(() => {
                return blockMocks.session;
            }),
        });

        await testTree.loadProfilesForFavorites(blockMocks.log, favProfileNode);
        const resultFavProfileNode = testTree.mFavorites[0];

        expect(resultFavProfileNode).toEqual(expectedFavProfileNode);
    });
    it("Checking that error is handled if profile not successfully loaded for profile grouping node in Favorites", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favProfileNode = new ZoweDatasetNode(
            "badTestProfile",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoriteNode,
            null,
            globals.FAV_PROFILE_CONTEXT,
            undefined,
            undefined
        );
        const testTree = new DatasetTree();
        testTree.mFavorites.push(favProfileNode);
        const errorHandlingSpy = jest.spyOn(utils, "errorHandling");

        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    loadNamedProfile: jest.fn(() => {
                        throw new Error();
                    }),
                };
            }),
        });
        await testTree.loadProfilesForFavorites(blockMocks.log, favProfileNode);

        expect(errorHandlingSpy).toBeCalledTimes(1);
    });
    it("Checking that favorite nodes with pre-existing profile/session values continue using those values", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoriteNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        const favPdsNode = new ZoweDatasetNode(
            "favoritePds",
            vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode,
            blockMocks.session,
            globals.PDS_FAV_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        const testTree = new DatasetTree();
        favProfileNode.children.push(favPdsNode);
        testTree.mFavorites.push(favProfileNode);
        const expectedFavPdsNode = new ZoweDatasetNode(
            "favoritePds",
            vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode,
            blockMocks.session,
            globals.PDS_FAV_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );

        await testTree.loadProfilesForFavorites(blockMocks.log, favProfileNode);
        const resultFavPdsNode = testTree.mFavorites[0].children[0];

        expect(resultFavPdsNode).toEqual(expectedFavPdsNode);
    });
    it("Checking that loaded profile/session from profile node in Favorites gets passed to child favorites without profile/session", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const favProfileNode = new ZoweDatasetNode(
            "testProfile",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoriteNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        // Leave mParent parameter undefined for favPDsNode and expectedFavPdsNode to test undefined profile/session condition
        const favPdsNode = new ZoweDatasetNode(
            "favoritePds",
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            undefined,
            globals.PDS_FAV_CONTEXT,
            undefined,
            undefined
        );
        const testTree = new DatasetTree();
        favProfileNode.children.push(favPdsNode);
        testTree.mFavorites.push(favProfileNode);
        const expectedFavPdsNode = new ZoweDatasetNode(
            "favoritePds",
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            blockMocks.session,
            globals.PDS_FAV_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );

        await testTree.loadProfilesForFavorites(blockMocks.log, favProfileNode);
        const resultFavPdsNode = testTree.mFavorites[0].children[0];

        expect(resultFavPdsNode).toEqual(expectedFavPdsNode);
    });
});
describe("Dataset Tree Unit Tests - Function getParent", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking function on the root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        const parentNode = testTree.getParent(blockMocks.datasetSessionNode);

        expect(parentNode).toBeNull();
    });
    it("Checking function on the non-root node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "BRTVS99",
            vscode.TreeItemCollapsibleState.None,
            blockMocks.datasetSessionNode,
            blockMocks.session
        );

        expect(testTree.getParent(node)).toMatchObject(blockMocks.datasetSessionNode);
    });
});
describe("Dataset Tree Unit Tests - Function getSearchHistory", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addSearchHistory("testHistory");

        expect(testTree.getSearchHistory()).toEqual(["testHistory"]);
    });
});
describe("Dataset Tree Unit Tests - Function addFileHistory", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addFileHistory("testFileHistory");

        expect(testTree.getFileHistory()).toEqual(["TESTFILEHISTORY"]);
    });
});
describe("Dataset Tree Unit Tests - Function removeFileHistory", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addFileHistory("testFileHistory");
        expect(testTree.getFileHistory()).toEqual(["TESTFILEHISTORY"]);
        testTree.removeFileHistory("testFileHistory");
        expect(testTree.getFileHistory()).toEqual([]);
    });
});
describe("Dataset Tree Unit Tests - Function addSession", () => {
    async function createBlockMocks() {
        const newMocks = {
            log: Logger.getAppLogger(),
            session: createISession(),
            imperativeProfile: createIProfile(),
            treeView: createTreeView(),
            testDatasetTree: null,
            datasetSessionNode: null,
            profile: null,
            mockResetValidation: jest.fn(),
            mockDefaultProfile: jest.fn(),
            mockLoadNamedProfile: jest.fn(),
            mockValidationSetting: jest.fn(),
            mockAddSingleSession: jest.fn(),
            mockDisableValidationContext: jest.fn(),
            mockEnableValidationContext: jest.fn(),
            mockLoadDefaultProfile: jest.fn(),
            mockProfileInstance: null,
            mockMHistory: PersistentFilters,
            mockGetConfiguration: jest.fn(),
            mockPersistenceSchema: createPersistentConfig(),
        };

        newMocks.datasetSessionNode = createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
        newMocks.testDatasetTree = createDatasetTree(newMocks.datasetSessionNode, newMocks.treeView);

        // Profile instance mocks
        newMocks.mockProfileInstance = createInstanceOfProfile(newMocks.imperativeProfile);
        newMocks.mockLoadNamedProfile.mockReturnValue(newMocks.imperativeProfile);
        newMocks.mockProfileInstance.loadNamedProfile = newMocks.mockLoadNamedProfile;
        newMocks.mockLoadDefaultProfile.mockReturnValue(newMocks.imperativeProfile);
        newMocks.mockProfileInstance.getDefaultProfile = newMocks.mockLoadDefaultProfile;
        newMocks.mockProfileInstance.enableValidationContext = newMocks.mockEnableValidationContext;
        newMocks.mockProfileInstance.disableValidationContext = newMocks.mockDisableValidationContext;
        newMocks.mockProfileInstance.validProfile = ValidProfileEnum.VALID;
        newMocks.mockProfileInstance.allProfiles = jest.fn().mockReturnValue([newMocks.imperativeProfile]);

        return newMocks;
    }
    it("Checking successful adding of session", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        testTree.addSession(blockMocks.imperativeProfile.name);
        expect(testTree.mSessionNodes[1].label).toBe(blockMocks.imperativeProfile.name);
    });

    it("Checking successful adding of session with disabled validation", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = createDatasetTree(blockMocks.datasetSessionNode, blockMocks.treeView);
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        Object.defineProperty(testTree.mHistory, "getSessions", {
            value: jest.fn(() => {
                return ["sestest", "profile1", "profile2"];
            }),
        });

        blockMocks.mockProfileInstance.validationSetting = blockMocks.mockValidationSetting.mockReturnValueOnce(false);

        testTree.addSession(blockMocks.imperativeProfile.name);
        expect(testTree.mSessionNodes[1].label).toBe(blockMocks.imperativeProfile.name);
    });

    it("Checking successful adding of session without sessname passed", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = createDatasetTree(blockMocks.datasetSessionNode, blockMocks.treeView);
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mHistory.push(blockMocks.imperativeProfile.name);

        testTree.addSession();
        expect(testTree.mSessionNodes[1].label).toBe(blockMocks.imperativeProfile.name);
    });

    it("Checking failed attempt to add a session due to the missing profile", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();

        testTree.addSession("fake");

        expect(testTree.mSessionNodes[1]).not.toBeDefined();
    });
});

describe("USSTree Unit Tests - Function USSTree.addSingleSession()", () => {
    function createBlockMocks() {
        const newMocks = {
            mockProfilesInstance: null,
            testProfile: createIProfile(),
            testBaseProfile: createValidIProfile(),
            testCombinedProfile: createValidIProfile(),
            testSession: createISession(),
            testUSSNode: null,
            testTree: null,
            profilesForValidation: { status: "active", name: "fake" },
        };

        newMocks.testBaseProfile.profile.tokenType = "tokenType";
        newMocks.testBaseProfile.profile.tokenValue = "testTokenValue";
        newMocks.testCombinedProfile.profile.tokenType = "tokenType";
        newMocks.testCombinedProfile.profile.tokenValue = "testTokenValue";
        newMocks.mockProfilesInstance = createInstanceOfProfile(newMocks.testProfile);
        newMocks.mockProfilesInstance.getBaseProfile.mockResolvedValue(newMocks.testBaseProfile);
        newMocks.mockProfilesInstance.loadNamedProfile.mockReturnValue(newMocks.testProfile);
        newMocks.mockProfilesInstance.getCombinedProfile.mockReturnValue(newMocks.testCombinedProfile);
        newMocks.mockProfilesInstance.allProfiles = [
            newMocks.testProfile,
            { name: "firstName" },
            { name: "secondName" },
        ];
        newMocks.testTree = new DatasetTree();
        const datasetSessionTestNode = createDatasetSessionNode(newMocks.testSession, newMocks.testProfile);
        newMocks.testTree.mSessionNodes.push(datasetSessionTestNode);
        mocked(Profiles.getInstance).mockReturnValue(newMocks.mockProfilesInstance);

        return newMocks;
    }
    it("Tests if addSingleSession uses the baseProfile to get the combined profile information", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        blockMocks.testTree.mSessionNodes.pop();
        blockMocks.testSession.ISession.tokenType = blockMocks.testBaseProfile.profile.tokenType;
        blockMocks.testSession.ISession.tokenValue = blockMocks.testBaseProfile.profile.tokenValue;

        // Mock the USS API so that getSession returns the correct value
        const mockMvsApi = await ZoweExplorerApiRegister.getMvsApi(blockMocks.testProfile);
        const getMvsApiMock = jest.fn();
        getMvsApiMock.mockReturnValue(mockMvsApi);
        ZoweExplorerApiRegister.getMvsApi = getMvsApiMock.bind(ZoweExplorerApiRegister);
        jest.spyOn(mockMvsApi, "getSession").mockReturnValue(blockMocks.testSession);

        await blockMocks.testTree.addSingleSession(blockMocks.testProfile);

        expect(blockMocks.testTree.mSessionNodes[1].session.ISession.tokenValue).toEqual("testTokenValue");
    });

    it("Tests if addSingleSession throws an error if  getCombinedProfile fails", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        jest.spyOn(blockMocks.mockProfilesInstance, "getCombinedProfile").mockRejectedValue("Test error!");

        let error;
        try {
            await blockMocks.testTree.addSingleSession(blockMocks.testProfile);
        } catch (err) {
            error = err;
        }

        expect(error).toEqual("Test error!");
    });

    it("Tests that addSingleSession doesn't add the session again, if it was already added", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        await blockMocks.testTree.addSingleSession(blockMocks.testProfile);

        expect(blockMocks.testTree.mSessionNodes.length).toEqual(2);
    });

    it("Tests that addSingleSession successfully adds a session", async () => {
        await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        blockMocks.testTree.mSessionNodes.pop();
        blockMocks.testSession.ISession.tokenType = blockMocks.testBaseProfile.profile.tokenType;
        blockMocks.testSession.ISession.tokenValue = blockMocks.testBaseProfile.profile.tokenValue;

        // Mock the USS API so that getSession returns the correct value
        const mockMvsApi = await ZoweExplorerApiRegister.getMvsApi(blockMocks.testProfile);
        const getMvsApiMock = jest.fn();
        getMvsApiMock.mockReturnValue(mockMvsApi);
        ZoweExplorerApiRegister.getMvsApi = getMvsApiMock.bind(ZoweExplorerApiRegister);
        jest.spyOn(mockMvsApi, "getSession").mockReturnValue(blockMocks.testSession);

        await blockMocks.testTree.addSingleSession(blockMocks.testProfile);

        expect(blockMocks.testTree.mSessionNodes.length).toEqual(2);
        expect(blockMocks.testTree.mSessionNodes[1].profile.name).toEqual(blockMocks.testProfile.name);
    });
});

describe("Dataset Tree Unit Tests - Function addFavorite", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const profile = createInstanceOfProfile(imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
            profile,
            imperativeProfile,
        };
    }

    it("Checking adding of PS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );

        testTree.addFavorite(node);

        expect(testTree.mFavorites[0].label).toBe(`${blockMocks.datasetSessionNode.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.FAV_PROFILE_CONTEXT}`);
        expect(testTree.mFavorites[0].children[0].label).toBe(`${node.label}`);
        expect(testTree.mFavorites[0].children[0].contextValue).toBe(`${globals.DS_DS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        node.contextValue = globals.DS_PDS_CONTEXT;

        testTree.addFavorite(node);

        expect(testTree.mFavorites[0].label).toBe(`${blockMocks.datasetSessionNode.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.FAV_PROFILE_CONTEXT}`);
        expect(testTree.mFavorites[0].children[0].label).toBe(`${node.label}`);
        expect(testTree.mFavorites[0].children[0].contextValue).toBe(`${globals.DS_PDS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of PDS Member node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        const child = new ZoweDatasetNode("Child", vscode.TreeItemCollapsibleState.None, parent, null);
        parent.contextValue = globals.DS_PDS_CONTEXT;
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        testTree.addFavorite(child);

        expect(testTree.mFavorites[0].label).toBe(`${blockMocks.datasetSessionNode.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.FAV_PROFILE_CONTEXT}`);
        expect(testTree.mFavorites[0].children[0].label).toBe(`${parent.label}`);
        expect(testTree.mFavorites[0].children[0].contextValue).toBe(`${globals.DS_PDS_CONTEXT}${globals.FAV_SUFFIX}`);
    });
    it("Checking adding of Session node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profile);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.mSessionNodes[1].pattern = "test";

        await testTree.addFavorite(testTree.mSessionNodes[1]);

        expect(testTree.mFavorites[0].label).toBe(`${blockMocks.datasetSessionNode.label}`);
        expect(testTree.mFavorites[0].contextValue).toBe(`${globals.FAV_PROFILE_CONTEXT}`);
        expect(testTree.mFavorites[0].children[0].label).toBe(`${testTree.mSessionNodes[1].pattern}`);
        expect(testTree.mFavorites[0].children[0].contextValue).toBe(
            `${globals.DS_SESSION_CONTEXT}${globals.FAV_SUFFIX}`
        );
    });
    it("Checking attempt to add a duplicate node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );

        testTree.addFavorite(node);
        testTree.addFavorite(node);

        expect(testTree.mFavorites[0].children.map((entry) => entry.label)).toEqual([`${node.label}`]);
    });
    it("Checking attempt to add a member of favorite PDS", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        const child = new ZoweDatasetNode("Child", vscode.TreeItemCollapsibleState.None, parent, null);
        parent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        child.contextValue = globals.DS_MEMBER_CONTEXT;

        testTree.addFavorite(child);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("PDS already in favorites");
    });
});
describe("Dataset Tree Unit Tests - Function removeFavorite", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking removeFavorite when starting with more than one favorite for the profile", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node1 = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        const node2 = new ZoweDatasetNode(
            "Dataset2",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        const removeFavProfileSpy = jest.spyOn(testTree, "removeFavProfile");

        // We're breaking rule 1 function call per 1 it block, but there's no over proper way to verify the functionality
        // First we need to have the item and be sure that it's properly added to have legit removal operation
        testTree.addFavorite(node1);
        testTree.addFavorite(node2);
        const profileNodeInFavs = testTree.mFavorites[0];
        expect(profileNodeInFavs.children[0].label).toBe(`${node1.label}`);
        expect(profileNodeInFavs.children[1].label).toBe(`${node2.label}`);

        // Actual test
        testTree.removeFavorite(profileNodeInFavs.children[0]);
        expect(removeFavProfileSpy).not.toBeCalled();
        expect(profileNodeInFavs.children.length).toBe(1);
        expect(profileNodeInFavs.children[0].label).toBe(`${node2.label}`);
    });
    it("Checking removeFavorite when starting with only one favorite for the profile", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );

        const removeFavProfileSpy = jest.spyOn(testTree, "removeFavProfile");

        // We're breaking rule 1 function call per 1 it block, but there's no over proper way to verify the functionality
        // First we need to have the item and be sure that it's properly added to have legit removal operation
        testTree.addFavorite(node);
        const profileNodeInFavs = testTree.mFavorites[0];
        expect(profileNodeInFavs.children[0].label).toBe(`${node.label}`);
        await testTree.removeFavorite(profileNodeInFavs.children[0]);
        expect(removeFavProfileSpy).toHaveBeenCalledWith(profileNodeInFavs.label, false);
        expect(testTree.mFavorites.length).toBe(0);
    });
});
describe("Dataset Tree Unit Tests - Function  - Function removeFavProfile", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const testTree = new DatasetTree();
        testTree.mFavorites = [];
        testTree.mSessionNodes.push(datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            null
        );
        testTree.addFavorite(node);
        const profileNodeInFavs: IZoweDatasetTreeNode = testTree.mFavorites[0];

        return {
            treeView,
            testTree,
            profileNodeInFavs,
        };
    }
    it("Tests successful removal of profile node in Favorites when user confirms they want to Continue removing it", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const updateFavoritesSpy = jest.spyOn(blockMocks.testTree, "updateFavorites");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        // Make sure favorite is added before the actual unit test
        expect(blockMocks.testTree.mFavorites.length).toEqual(1);

        Object.defineProperty(vscode.window, "showQuickPick", {
            value: jest.fn(() => {
                return "Continue";
            }),
        });

        await blockMocks.testTree.removeFavProfile(blockMocks.profileNodeInFavs.label, true);

        // Check that favorite is removed from UI
        expect(blockMocks.testTree.mFavorites.length).toEqual(0);
        // Check that favorite is removed from settings file
        expect(updateFavoritesSpy).toBeCalledTimes(1);
    });
    it("Tests that removeFavProfile leaves profile node in Favorites when user cancels", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        // Make sure favorite is added before the actual unit test
        expect(blockMocks.testTree.mFavorites.length).toEqual(1);

        Object.defineProperty(vscode.window, "showQuickPick", {
            value: jest.fn(() => {
                return "Cancel";
            }),
        });
        const expectedFavProfileNode = blockMocks.testTree.mFavorites[0];

        await blockMocks.testTree.removeFavProfile(blockMocks.profileNodeInFavs.label, true);

        expect(blockMocks.testTree.mFavorites.length).toEqual(1);
        expect(blockMocks.testTree.mFavorites[0]).toEqual(expectedFavProfileNode);
    });
    it("Tests that removeFavProfile successfully removes profile node in Favorites when called outside user command", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        // Make sure favorite is added before the actual unit test
        expect(blockMocks.testTree.mFavorites.length).toEqual(1);

        await blockMocks.testTree.removeFavProfile(blockMocks.profileNodeInFavs.label, false);

        expect(blockMocks.testTree.mFavorites.length).toEqual(0);
    });
});
describe("Dataset Tree Unit Tests - Function deleteSession", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        testTree.deleteSession(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes.map((node) => node.label)).toEqual(["Favorites"]);
    });
});
describe("Dataset Tree Unit Tests - Function flipState", () => {
    function createBlockMocks() {
        const session = createISession();
        const sessionWithoutCreds = createISessionWithoutCredentials();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            sessionWithoutCreds,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking flipping of PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            null
        );
        node.contextValue = globals.DS_PDS_CONTEXT;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
    it("Checking flipping of Favorite PDS Dataset node", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            null
        );
        node.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
    it("Checking flipping of PDS Dataset with credential prompt", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "Dataset",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            blockMocks.sessionWithoutCreds
        );
        node.contextValue = globals.DS_PDS_CONTEXT;

        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
        await testTree.flipState(node, false);
        expect(JSON.stringify(node.iconPath)).toContain("folder-closed.svg");
        await testTree.flipState(node, true);
        expect(JSON.stringify(node.iconPath)).toContain("folder-open.svg");
    });
});
describe("Dataset Tree Unit Tests - Function datasetFilterPrompt", () => {
    async function createBlockMocks(globalMocks) {
        const newMocks = {
            log: Logger.getAppLogger(),
            session: createISession(),
            imperativeProfile: createIProfile(),
            mockDefaultProfile: jest.fn(),
            mockGetProfileSetting: jest.fn(),
            mockCheckCurrentProfile: jest.fn(),
            treeView: createTreeView(),
            mockLoadNamedProfile: jest.fn(),
            datasetSessionNode: null,
            mockResetValidationSettings: jest.fn(),
            qpPlaceholder:
                'Choose "Create new..." to define a new profile or select an existing profile to Add to the Data Set Explorer',
            mockEnableValidationContext: jest.fn(),
        };

        newMocks.datasetSessionNode = await createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
        globalMocks.mockProfileInstance.allProfiles = [
            newMocks.imperativeProfile,
            { name: "firstName" },
            { name: "secondName" },
        ];
        globalMocks.mockProfileInstance.loadNamedProfile.mockReturnValueOnce(newMocks.imperativeProfile);
        globalMocks.mockProfileInstance.resetValidationSettings.mockReturnValue(newMocks.datasetSessionNode);
        globalMocks.mockProfileInstance.getProfileSetting.mockReturnValue({
            name: newMocks.imperativeProfile.name,
            status: "active",
        });
        globalMocks.mockProfileInstance.checkCurrentProfile.mockReturnValue({
            name: newMocks.imperativeProfile.name,
            status: "active",
        });

        return newMocks;
    }

    it("Checking adding of new filter - Theia", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.ACTIVE_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelled attempt to add a filter - Theia", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("You must enter a pattern.");
    });
    it("Checking usage of existing filter - Theia", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(new utils.FilterDescriptor("HLQ.PROD1.STUFF"));
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addSearchHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelling of filter prompt with available filters - Theia", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        globalMocks.isTheia.mockReturnValue(true);
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addSearchHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("No selection made.");
    });
    it("Checking function on favorites", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const addSessionSpy = jest.spyOn(testTree, "addSession");
        const favoriteSearch = new ZoweDatasetNode(
            `[${blockMocks.datasetSessionNode.label}]: HLQ.PROD1.STUFF`,
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session,
            undefined,
            undefined,
            blockMocks.imperativeProfile
        );
        favoriteSearch.contextValue = globals.DS_SESSION_CONTEXT + globals.FAV_SUFFIX;

        await testTree.datasetFilterPrompt(favoriteSearch);

        expect(addSessionSpy).toHaveBeenLastCalledWith(blockMocks.datasetSessionNode.label.trim());
    });
    it("Checking adding of new filter", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.ACTIVE_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking adding of new filter with data set member", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1(MEMBER)");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);
        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.ACTIVE_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1");
    });
    it("Checking adding of new filter with Unverified profile", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    checkCurrentProfile: blockMocks.mockCheckCurrentProfile.mockReturnValueOnce({
                        name: blockMocks.imperativeProfile.name,
                        status: "unverified",
                    }),
                    validProfile: ValidProfileEnum.UNVERIFIED,
                };
            }),
        });

        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].contextValue).toEqual(globals.DS_SESSION_CONTEXT + globals.UNVERIFIED_CONTEXT);
        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelled attempt to add a filter", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(
            new utils.FilterDescriptor("\uFF0B " + "Create a new filter")
        );
        mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("You must enter a pattern.");
    });
    it("Checking usage of existing filter", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const quickPickItem = new utils.FilterDescriptor("HLQ.PROD1.STUFF");
        mocked(vscode.window.createQuickPick).mockReturnValueOnce(
            createQuickPickContent("HLQ.PROD1.STUFF", [quickPickItem], blockMocks.qpPlaceholder)
        );
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(quickPickItem);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.PROD1.STUFF");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const resolveQuickPickSpy = jest.spyOn(utils, "resolveQuickPickHelper");
        resolveQuickPickSpy.mockResolvedValueOnce(quickPickItem);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addSearchHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(testTree.mSessionNodes[1].pattern).toEqual("HLQ.PROD1.STUFF");
    });
    it("Checking cancelling of filter prompt with available filters", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks(globalMocks);

        const quickPickItem = undefined;
        mocked(vscode.window.createQuickPick).mockReturnValueOnce(
            createQuickPickContent("HLQ.PROD1.STUFF", quickPickItem, blockMocks.qpPlaceholder)
        );
        mocked(vscode.window.showQuickPick).mockResolvedValueOnce(quickPickItem);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const resolveQuickPickSpy = jest.spyOn(utils, "resolveQuickPickHelper");
        resolveQuickPickSpy.mockResolvedValueOnce(quickPickItem);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        testTree.addSearchHistory("test");

        await testTree.datasetFilterPrompt(testTree.mSessionNodes[1]);

        expect(mocked(vscode.window.showInformationMessage)).toBeCalledWith("No selection made.");
    });
});
describe("Dataset Tree Unit Tests - Function editSession", () => {
    async function createBlockMocks() {
        const newMocks = {
            log: Logger.getAppLogger(),
            session: createISession(),
            imperativeProfile: createIProfile(),
            mockDefaultProfile: jest.fn(),
            treeView: createTreeView(),
            datasetSessionNode: null,
            profile: null,
            mockGetProfileSetting: jest.fn(),
            mockEditSession: jest.fn(),
        };

        newMocks.datasetSessionNode = await createDatasetSessionNode(newMocks.session, newMocks.imperativeProfile);
        newMocks.profile = await Profiles.createInstance(newMocks.log);

        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [newMocks.imperativeProfile, { name: "firstName" }, { name: "secondName" }],
                    getDefaultProfile: newMocks.mockDefaultProfile,
                    validProfile: ValidProfileEnum.VALID,
                    getProfileSetting: newMocks.mockGetProfileSetting.mockReturnValue({
                        name: newMocks.imperativeProfile.name,
                        status: "active",
                    }),
                    editSession: newMocks.mockEditSession.mockReturnValueOnce("testProfile"),
                };
            }),
        });

        return newMocks;
    }

    it("Checking common run of function", async () => {
        const globalMocks = await createGlobalMocks();
        const blockMocks = await createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "EditSession",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            null
        );

        await testTree.editSession(node, testTree);

        expect(node.getProfile().profile).toBe("testProfile");
    });
});
describe("Dataset Tree Unit Tests - Function getAllLoadedItems", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.PROD2.STUFF",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            blockMocks.session,
            globals.DS_DS_CONTEXT
        );
        testTree.mSessionNodes[1].children.push(node);

        const items = await testTree.getAllLoadedItems();

        expect(items).toEqual([node]);
    });
});
describe("Dataset Tree Unit Tests - Function onDidConfiguration", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const workspaceConfiguration = createWorkspaceConfiguration();

        return {
            session,
            datasetSessionNode,
            treeView,
            workspaceConfiguration,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.workspace.getConfiguration).mockReturnValue(blockMocks.workspaceConfiguration);
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        const event = {
            affectsConfiguration: jest.fn(),
        };
        event.affectsConfiguration.mockReturnValue(true);
        mocked(vscode.workspace.getConfiguration).mockClear();

        await testTree.onDidChangeConfiguration(event);

        expect(mocked(vscode.workspace.getConfiguration)).toBeCalledTimes(2);
    });
});
describe("Dataset Tree Unit Tests - Function renameNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new DatasetTree();
        const beforeNode = new ZoweDatasetNode(
            "TO.RENAME",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            blockMocks.session,
            globals.DS_PDS_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        const afterNode = new ZoweDatasetNode(
            "RENAMED",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            blockMocks.session,
            globals.DS_PDS_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        blockMocks.datasetSessionNode.children.push(beforeNode);
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);

        await testTree.renameNode("sestest", "TO.RENAME", "RENAMED");

        expect(testTree.mSessionNodes[1].children[0]).toEqual(afterNode);
    });
});
describe("Dataset Tree Unit Tests - Function renameFavorite", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const testTree = new DatasetTree();
        const nodeFromSession = new ZoweDatasetNode(
            "TO.RENAME",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            blockMocks.session,
            globals.DS_PDS_CONTEXT,
            undefined,
            blockMocks.imperativeProfile
        );
        // Parent is normally a profile node in Favorites section, but is null here because it does not matter for this test
        const matchingFavNode = new ZoweDatasetNode(
            "TO.RENAME",
            vscode.TreeItemCollapsibleState.Collapsed,
            null,
            blockMocks.session,
            globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX,
            undefined,
            blockMocks.imperativeProfile
        );
        const expectedMatchingFavNodeResult = new ZoweDatasetNode(
            "RENAMED",
            vscode.TreeItemCollapsibleState.Collapsed,
            null,
            blockMocks.session,
            globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX,
            undefined,
            blockMocks.imperativeProfile
        );
        Object.defineProperty(testTree, "findFavoritedNode", {
            value: jest.fn(() => {
                return matchingFavNode;
            }),
        });

        await testTree.renameFavorite(nodeFromSession, "RENAMED");

        expect(matchingFavNode).toEqual(expectedMatchingFavNodeResult);
    });
});
describe("Dataset Tree Unit Tests - Function findFavoritedNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const datasetFavoritesNode = createDatasetFavoritesNode();

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
            datasetFavoritesNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "node",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            null
        );
        const favProfileNode = new ZoweDatasetNode(
            blockMocks.imperativeProfile.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoritesNode,
            null,
            globals.FAV_PROFILE_CONTEXT
        );
        const favoriteNode = new ZoweDatasetNode(
            `${node.label}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode,
            null
        );
        favoriteNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        favProfileNode.children.push(favoriteNode);
        testTree.mFavorites.push(favProfileNode);

        const foundNode = testTree.findFavoritedNode(node);

        expect(foundNode).toBe(favoriteNode);
    });
    it("Checking that function does not error when there is no favorite or matching profile node in Favorites", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "node",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            null
        );

        expect(() => {
            testTree.findFavoritedNode(node);
        }).not.toThrow();
    });
});
describe("Dataset Tree Unit Tests - Function findNonFavoritedNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking common run of function", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "node",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            blockMocks.session,
            null,
            null,
            blockMocks.imperativeProfile
        );
        const favoriteNode = new ZoweDatasetNode(
            "node",
            vscode.TreeItemCollapsibleState.Collapsed,
            null,
            blockMocks.session,
            null,
            null,
            blockMocks.imperativeProfile
        );
        favoriteNode.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        testTree.mSessionNodes[1].children.push(node);

        const foundNode = testTree.findNonFavoritedNode(favoriteNode);

        expect(foundNode).toBe(node);
    });
});

describe("Dataset Tree Unit Tests - Function openItemFromPath", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);

        return {
            session,
            datasetSessionNode,
            treeView,
        };
    }

    it("Checking opening of PS Dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "TEST.DS",
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetSessionNode,
            null
        );
        testTree.mSessionNodes[1].children.push(node);
        testTree.mSessionNodes[1].pattern = "test";
        spyOn(testTree.mSessionNodes[1], "getChildren").and.returnValue(Promise.resolve([node]));

        await testTree.openItemFromPath(
            `[${blockMocks.datasetSessionNode.label}]: ${node.label}`,
            blockMocks.datasetSessionNode
        );

        expect(testTree.getSearchHistory()).toEqual([node.label]);
    });

    it("Checking opening of PDS Member", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(
            "TEST.PDS",
            vscode.TreeItemCollapsibleState.Collapsed,
            testTree.mSessionNodes[1],
            null
        );
        const child = new ZoweDatasetNode("TESTMEMB", vscode.TreeItemCollapsibleState.None, parent, null);
        testTree.mSessionNodes[1].children.push(parent);
        testTree.mSessionNodes[1].pattern = "test";
        spyOn(testTree.mSessionNodes[1], "getChildren").and.returnValue(Promise.resolve([parent]));
        spyOn(parent, "getChildren").and.returnValue(Promise.resolve([child]));

        await testTree.openItemFromPath(
            `[${blockMocks.datasetSessionNode.label}]: ${parent.label}(${child.label})`,
            blockMocks.datasetSessionNode
        );

        expect(testTree.getSearchHistory()).toEqual([`${parent.label}(${child.label})`]);
    });
});

describe("Dataset Tree Unit Tests - Function renameNode", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const node = new ZoweDatasetNode(
            "TEST.PDS",
            vscode.TreeItemCollapsibleState.Collapsed,
            datasetSessionNode,
            null
        );
        const testTree = new DatasetTree();

        datasetSessionNode.children.push(node);
        testTree.mSessionNodes.push(datasetSessionNode);
        spyOn(datasetSessionNode, "getChildren").and.returnValue(Promise.resolve([datasetSessionNode]));

        return {
            imperativeProfile,
            node,
            datasetSessionNode,
            testTree,
        };
    }

    it("Checking opening of PS Dataset", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        await blockMocks.testTree.renameNode(blockMocks.imperativeProfile.name, blockMocks.node.label, "newLabel");

        expect(blockMocks.node.label).toEqual("newLabel");
    });
});

describe("Dataset Tree Unit Tests - Function createFilterString", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            datasetSessionNode,
            session
        );
        const testTree = new DatasetTree();
        const historySpy = jest.spyOn(testTree, "getSearchHistory");

        node.pattern = "filter1,filter2";
        datasetSessionNode.children.push(node);
        testTree.mSessionNodes.push(datasetSessionNode);
        jest.spyOn(datasetSessionNode, "getChildren").mockReturnValue(Promise.resolve([node]));
        historySpy.mockReturnValue(["filter1, filter2"]);

        return {
            imperativeProfile,
            node,
            testTree,
            historySpy,
        };
    }

    it("Tests that createFilterString() creates a new filter from a string and a node's old filter", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const newFilterString = await blockMocks.testTree.createFilterString("newFilter", blockMocks.node);

        expect(newFilterString).toEqual("filter1,filter2,newFilter");
    });

    it("Tests that createFilterString() doesn't add a filter twice", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        const newFilterString = await blockMocks.testTree.createFilterString("filter2", blockMocks.node);

        expect(newFilterString).toEqual("filter1,filter2");
    });

    it("Tests that createFilterString() works if the node has no filter applied", async () => {
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        blockMocks.node.pattern = "";
        blockMocks.historySpy.mockReturnValue([]);

        const newFilterString = await blockMocks.testTree.createFilterString("newFilter", blockMocks.node);

        expect(newFilterString).toEqual("newFilter");
    });
});

describe("Dataset Tree Unit Tests - Function rename", () => {
    function createBlockMocks() {
        const session = createISession();
        const imperativeProfile = createIProfile();
        const profileInstance = createInstanceOfProfile(imperativeProfile);
        const treeView = createTreeView();
        const datasetSessionNode = createDatasetSessionNode(session, imperativeProfile);
        const datasetFavoritesNode = createDatasetFavoritesNode();
        const mvsApi = createMvsApi(imperativeProfile);
        const mockCheckCurrentProfile = jest.fn();
        bindMvsApi(mvsApi);

        return {
            session,
            imperativeProfile,
            datasetSessionNode,
            datasetFavoritesNode,
            treeView,
            mvsApi,
            profileInstance,
            mockCheckCurrentProfile,
        };
    }

    it("Tests that rename() renames a node", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });

    it("Checking function with PS Dataset using Unverified profile", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    checkCurrentProfile: blockMocks.mockCheckCurrentProfile.mockReturnValueOnce({
                        name: blockMocks.imperativeProfile.name,
                        status: "unverified",
                    }),
                    validProfile: ValidProfileEnum.UNVERIFIED,
                };
            }),
        });
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });

    it("Checking function with PS Dataset given lowercase name", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.new");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });

    it("Checking function with Favorite PS Dataset", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();

        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        node.contextValue = "ds_fav";
        testTree.mSessionNodes[1].children.push(node);
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        await testTree.rename(node);

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
    });
    it("Checking failed attempt to rename PS Dataset", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const defaultError = new Error("Default error message");
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(zowe.Rename.dataSet).mockImplementation(() => {
            throw defaultError;
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("HLQ.TEST.RENAME.NODE.NEW");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const node = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const renameDataSetSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSet");

        let error;
        try {
            await testTree.rename(node);
        } catch (err) {
            error = err;
        }

        expect(renameDataSetSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "HLQ.TEST.RENAME.NODE.NEW");
        expect(error).toBe(defaultError);
    });
    it("Checking function with PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("MEM2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        // Create nodes in Session section
        const parent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        // Simulate corresponding nodes in favorites
        const favProfileNode = new ZoweDatasetNode(
            blockMocks.imperativeProfile.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoritesNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT
        );
        const favParent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            favProfileNode,
            blockMocks.session
        );
        const favChild = new ZoweDatasetNode(
            "mem1",
            vscode.TreeItemCollapsibleState.None,
            favParent,
            blockMocks.session
        );
        favParent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        favChild.contextValue = globals.DS_MEMBER_CONTEXT;
        // Push test nodes to respective arrays
        parent.children.push(child);
        testTree.mSessionNodes[1].children.push(parent);
        favParent.children.push(favChild);
        favProfileNode.children.push(favParent);
        testTree.mFavorites.push(favProfileNode);

        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        await testTree.rename(child);

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "MEM2");
    });
    it("Checking function with PDS Member given in lowercase", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("mem2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        // Create nodes in Session section
        const parent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        // Simulate corresponding nodes in favorites
        const favProfileNode = new ZoweDatasetNode(
            blockMocks.imperativeProfile.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoritesNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT
        );
        const favParent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            favProfileNode,
            blockMocks.session
        );
        const favChild = new ZoweDatasetNode(
            "mem1",
            vscode.TreeItemCollapsibleState.None,
            favParent,
            blockMocks.session
        );
        favParent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        favChild.contextValue = globals.DS_MEMBER_CONTEXT;
        // Push test nodes to respective arrays
        parent.children.push(child);
        testTree.mSessionNodes[1].children.push(parent);
        favParent.children.push(favChild);
        favProfileNode.children.push(favParent);
        testTree.mFavorites.push(favProfileNode);
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        await testTree.rename(child);

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "MEM2");
    });
    it("Checking function with favorite PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("MEM2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        // Create nodes in Session section
        const parent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session,
            globals.PDS_FAV_CONTEXT
        );
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        // Simulate corresponding nodes in favorites
        const favProfileNode = new ZoweDatasetNode(
            blockMocks.imperativeProfile.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            blockMocks.datasetFavoritesNode,
            blockMocks.session,
            globals.FAV_PROFILE_CONTEXT
        );
        const favParent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.Collapsed,
            favProfileNode,
            blockMocks.session,
            null,
            null,
            blockMocks.imperativeProfile
        );
        const favChild = new ZoweDatasetNode(
            "mem1",
            vscode.TreeItemCollapsibleState.None,
            favParent,
            blockMocks.session,
            null,
            null,
            blockMocks.imperativeProfile
        );
        favParent.contextValue = globals.DS_PDS_CONTEXT + globals.FAV_SUFFIX;
        favChild.contextValue = globals.DS_MEMBER_CONTEXT;
        // Push test nodes to respective arrays
        parent.children.push(child);
        testTree.mSessionNodes[1].children.push(parent);
        favParent.children.push(favChild);
        favProfileNode.children.push(favParent);
        testTree.mFavorites.push(favProfileNode);
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        await testTree.rename(favChild);

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "MEM2");
    });
    it("Checking failed attempt to rename PDS Member", async () => {
        globals.defineGlobals("");
        createGlobalMocks();
        const blockMocks = createBlockMocks();
        const defaultError = new Error("Default error message");
        mocked(Profiles.getInstance).mockReturnValue(blockMocks.profileInstance);
        mocked(workspaceUtils.closeOpenedTextFile).mockResolvedValueOnce(false);
        mocked(zowe.Rename.dataSetMember).mockImplementation(() => {
            throw defaultError;
        });
        mocked(vscode.window.showInputBox).mockResolvedValueOnce("MEM2");
        mocked(vscode.window.createTreeView).mockReturnValueOnce(blockMocks.treeView);
        const testTree = new DatasetTree();
        testTree.mSessionNodes.push(blockMocks.datasetSessionNode);
        const parent = new ZoweDatasetNode(
            "HLQ.TEST.RENAME.NODE",
            vscode.TreeItemCollapsibleState.None,
            testTree.mSessionNodes[1],
            blockMocks.session
        );
        const child = new ZoweDatasetNode("mem1", vscode.TreeItemCollapsibleState.None, parent, blockMocks.session);
        child.contextValue = globals.DS_MEMBER_CONTEXT;
        const renameDataSetMemberSpy = jest.spyOn(blockMocks.mvsApi, "renameDataSetMember");

        let error;
        try {
            await testTree.rename(child);
        } catch (err) {
            error = err;
        }

        expect(renameDataSetMemberSpy).toHaveBeenLastCalledWith("HLQ.TEST.RENAME.NODE", "mem1", "MEM2");
        expect(error).toBe(defaultError);
    });
});
