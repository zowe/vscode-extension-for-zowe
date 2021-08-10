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

import * as PromiseQueue from "promise-queue";
import * as imperative from "@zowe/imperative";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import {
    ZoweExplorerApi,
    ZoweExplorerTreeApi,
    IZoweTree,
    IZoweTreeNode,
    IZoweDatasetTreeNode,
    IZoweUSSTreeNode,
    IZoweJobTreeNode,
    ProfilesCache,
} from "@zowe/zowe-explorer-api";
import { Profiles } from "./Profiles";
import { getProfile, getLinkedProfile } from "./ProfileLink";
import { ZoweExplorerApiRegister } from "./ZoweExplorerApiRegister";
import * as nls from "vscode-nls";

// Set up localization
nls.config({ messageFormat: nls.MessageFormat.bundle, bundleFormat: nls.BundleFormat.standalone })();
const localize: nls.LocalizeFunc = nls.loadMessageBundle();

/**
 * The Zowe Explorer API Register singleton that gets exposed to other VS Code
 * extensions to contribute their implementations.
 * @export
 */
export class ZoweExplorerExtender implements ZoweExplorerApi.IApiExplorerExtender, ZoweExplorerTreeApi {
    public static ZoweExplorerExtenderInst: ZoweExplorerExtender;

    /**
     * Access the singleton instance.
     * @static
     * @returns {ZoweExplorerExtender} the ZoweExplorerExtender singleton instance
     */
    public static createInstance(
        datasetProvider?: IZoweTree<IZoweDatasetTreeNode>,
        ussFileProvider?: IZoweTree<IZoweUSSTreeNode>,
        jobsProvider?: IZoweTree<IZoweJobTreeNode>
    ): ZoweExplorerExtender {
        ZoweExplorerExtender.instance.datasetProvider = datasetProvider;
        ZoweExplorerExtender.instance.ussFileProvider = ussFileProvider;
        ZoweExplorerExtender.instance.jobsProvider = jobsProvider;
        return ZoweExplorerExtender.instance;
    }

    public static getInstance(): ZoweExplorerExtender {
        return ZoweExplorerExtender.instance;
    }

    // Queue of promises to process sequentially when multiple extension register in parallel
    private static refreshProfilesQueue = new PromiseQueue(1, Infinity);
    /**
     * This object represents a collection of the APIs that get exposed to other VS Code
     * extensions that want to contribute alternative implementations such as alternative ways
     * of retrieving files and data from z/OS.
     */
    private static instance = new ZoweExplorerExtender();

    // Instances will be created via createInstance()
    private constructor(
        // Not all extenders will need to refresh trees
        public datasetProvider?: IZoweTree<IZoweDatasetTreeNode>,
        public ussFileProvider?: IZoweTree<IZoweUSSTreeNode>,
        public jobsProvider?: IZoweTree<IZoweJobTreeNode>
    ) {}

    /**
     *
     * @implements ZoweExplorerApi.IApiExplorerExtender.initForZowe()
     * @param {string} profileType
     * @param {imperative.ICommandProfileTypeConfiguration[]} profileTypeConfigurations
     */
    public async initForZowe(
        profileType: string,
        profileTypeConfigurations: imperative.ICommandProfileTypeConfiguration[]
    ) {
        // Ensure that when a user has not installed the profile type's CLI plugin
        // and/or created a profile that the profile directory in ~/.zowe/profiles
        // will be created with the appropriate meta data. If not called the user will
        // see errors when creating a profile of any type.
        imperative.ImperativeConfig.instance.loadedConfig = {
            defaultHome: path.join(os.homedir(), ".zowe"),
            envVariablePrefix: "ZOWE",
        };
        const configOptions = Array.from(profileTypeConfigurations);
        const exists = fs.existsSync(path.posix.join(`${os.homedir()}/.zowe/profiles/${profileType}`));
        if (configOptions && !exists) {
            await imperative.CliProfileManager.initialize({
                configuration: configOptions,
                profileRootDirectory: path.join(imperative.ImperativeConfig.instance.cliHome, "profiles"),
            });
        }
        // sequentially reload the internal profiles cache to satisfy all the newly added profile types
        await ZoweExplorerExtender.refreshProfilesQueue.add(() =>
            Profiles.getInstance().refresh(ZoweExplorerApiRegister.getInstance())
        );
    }

    /**
     * This method can be used by other VS Code Extensions to access the primary profile.
     *
     * @param primaryNode represents the Tree item that is being used
     * @return The requested profile
     *
     */
    public getProfile(primaryNode: IZoweTreeNode): imperative.IProfileLoaded {
        return getProfile(primaryNode);
    }

    /**
     * This method can be used by other VS Code Extensions to access an alternative
     * profile types that can be employed in conjunction with the primary profile to provide
     * alternative support.
     *
     * @deprecated
     * @param primaryNode represents the Tree item that is being used
     * @return The requested profile
     */
    public getLinkedProfile(primaryNode: IZoweTreeNode, type: string): Promise<imperative.IProfileLoaded> {
        return getLinkedProfile(primaryNode, type);
    }

    /**
     * Gives extenders access to the profiles loaded into memory by Zowe Explorer.
     *
     * @implements ZoweExplorerApi.IApiExplorerExtender.getProfilesCache()
     * @returns {ProfilesCache}
     */
    public getProfilesCache(): ProfilesCache {
        return Profiles.getInstance();
    }

    /**
     * After an extenders registered all its API extensions it
     * might want to request that profiles should get reloaded
     * to make them automatically appears in the Explorer drop-
     * down dialogs.
     *
     * @implements ZoweExplorerApi.IApiExplorerExtender.reloadProfiles()
     * @param profileType optional profile type that the extender can specify
     */
    public async reloadProfiles(profileType?: string): Promise<void> {
        // sequentially reload the internal profiles cache to satisfy all the newly added profile types
        await ZoweExplorerExtender.refreshProfilesQueue.add(() =>
            Profiles.getInstance().refresh(ZoweExplorerApiRegister.getInstance())
        );
        // profileType is used to load a default extender profile if no other profiles are populating the trees
        this.datasetProvider?.addSession(undefined, profileType);
        this.ussFileProvider?.addSession(undefined, profileType);
        this.jobsProvider?.addSession(undefined, profileType);
    }
}
