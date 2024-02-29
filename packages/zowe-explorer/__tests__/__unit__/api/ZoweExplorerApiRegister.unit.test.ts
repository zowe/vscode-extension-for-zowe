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

import * as zosfiles from "@zowe/zos-files-for-zowe-sdk";
import { imperative, MainframeInteraction, ZoweExplorerZosmf } from "@zowe/zowe-explorer-api";
import { ZoweExplorerApiRegister } from "../../../src/ZoweExplorerApiRegister";
import { createInstanceOfProfile, createValidIProfile } from "../../../__mocks__/mockCreators/shared";
import { ZoweExplorerExtender } from "../../../src/ZoweExplorerExtender";

class MockUssApi1 implements MainframeInteraction.IUss {
    public profile?: imperative.IProfileLoaded;
    public getProfileTypeName(): string {
        return "api1typename";
    }
    public fileList(ussFilePath: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public copy(outputPath: string, options?: Omit<object, "request">): Promise<Buffer> {
        throw new Error("Method not implemented.");
    }
    public isFileTagBinOrAscii(ussFilePath: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    public getContents(ussFilePath: string, options: zosfiles.IDownloadOptions): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public putContents(
        inputFilePath: string,
        ussFilePath: string,
        binary?: boolean,
        localEncoding?: string,
        etag?: string,
        returnEtag?: boolean
    ): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public putContent(inputFilePath: string, ussFilePath: string, options: zosfiles.IUploadOptions): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public uploadDirectory(
        inputDirectoryPath: string,
        ussDirectoryPath: string,
        options: zosfiles.IUploadOptions
    ): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public create(ussPath: string, type: string, mode?: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public delete(ussPath: string, recursive?: boolean): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public rename(currentUssPath: string, newUssPath: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public getSession(profile?: imperative.IProfileLoaded): imperative.Session {
        throw new Error("Method not implemented.");
    }
    public getStatus?(profile?: imperative.IProfileLoaded): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public getTokenTypeName?(): string {
        throw new Error("Method not implemented.");
    }
    public login?(session: imperative.Session): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public logout?(session: imperative.Session): Promise<string> {
        throw new Error("Method not implemented.");
    }
}

class MockUssApi2 implements MainframeInteraction.IUss {
    public profile?: imperative.IProfileLoaded;
    public getProfileTypeName(): string {
        return "api2typename";
    }
    public fileList(ussFilePath: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public copy(outputPath: string, options?: Omit<object, "request">): Promise<Buffer> {
        throw new Error("Method not implemented.");
    }
    public isFileTagBinOrAscii(ussFilePath: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    public getContents(ussFilePath: string, options: zosfiles.IDownloadOptions): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public putContents(
        inputFilePath: string,
        ussFilePath: string,
        binary?: boolean,
        localEncoding?: string,
        etag?: string,
        returnEtag?: boolean
    ): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public putContent(inputFilePath: string, ussFilePath: string, options: zosfiles.IUploadOptions): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public uploadDirectory(
        inputDirectoryPath: string,
        ussDirectoryPath: string,
        options: zosfiles.IUploadOptions
    ): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public create(ussPath: string, type: string, mode?: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public delete(ussPath: string, recursive?: boolean): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public rename(currentUssPath: string, newUssPath: string): Promise<zosfiles.IZosFilesResponse> {
        throw new Error("Method not implemented.");
    }
    public getSession(profile?: imperative.IProfileLoaded): imperative.Session {
        throw new Error("Method not implemented.");
    }
    public getStatus?(profile?: imperative.IProfileLoaded): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public getTokenTypeName?(): string {
        throw new Error("Method not implemented.");
    }
    public login?(session: imperative.Session): Promise<string> {
        throw new Error("Method not implemented.");
    }
    public logout?(session: imperative.Session): Promise<string> {
        throw new Error("Method not implemented.");
    }
}

async function createGlobalMocks() {
    const newMocks = {
        registry: ZoweExplorerApiRegister.getInstance(),
        testProfile: createValidIProfile(),
        mockGetInstance: jest.fn(),
        profiles: null,
    };
    newMocks.profiles = createInstanceOfProfile(newMocks.testProfile);
    newMocks.profiles.getDefaultProfile.mockReturnValue({
        name: "sestest",
        profile: {
            host: "host.com",
            user: "fake",
            password: "fake",
            rejectUnauthorized: true,
            protocol: "https",
        },
        type: "zosmf",
        message: "",
        failNotFound: false,
    });

    return newMocks;
}
afterEach(() => {
    jest.resetAllMocks();
});

describe("ZoweExplorerApiRegister unit testing", () => {
    it("registers an API only once per profile type", async () => {
        const globalMocks = await createGlobalMocks();
        const defaultProfile = globalMocks.profiles.getDefaultProfile();

        const defaultUssApi = globalMocks.registry.getUssApi(defaultProfile);
        globalMocks.registry.registerUssApi(new ZoweExplorerZosmf.UssApi());
        const anotherUssApiInstance = globalMocks.registry.getUssApi(defaultProfile);
        expect(anotherUssApiInstance).toEqual(defaultUssApi);

        const defaultMvsApi = globalMocks.registry.getMvsApi(defaultProfile);
        globalMocks.registry.registerMvsApi(new ZoweExplorerZosmf.MvsApi());
        const anotherMvsApiInstance = globalMocks.registry.getMvsApi(defaultProfile);
        expect(anotherMvsApiInstance).toEqual(defaultMvsApi);

        const defaultJesApi = globalMocks.registry.getJesApi(defaultProfile);
        globalMocks.registry.registerJesApi(new ZoweExplorerZosmf.JesApi());
        const anotherJesApiInstance = globalMocks.registry.getJesApi(defaultProfile);
        expect(anotherJesApiInstance).toEqual(defaultJesApi);
    });

    it("registers multiple API instances in parallel", async () => {
        const globalMocks = await createGlobalMocks();
        const mockRefresh = jest.fn(async (): Promise<void> => {
            return;
        });
        const profilesForValidation = { status: "active", name: "fake" };
        Object.defineProperty(ZoweExplorerExtender.prototype, "getProfilesCache", {
            value: jest.fn(() => {
                return {
                    refresh: mockRefresh,
                    checkCurrentProfile: jest.fn(() => {
                        return profilesForValidation;
                    }),
                    validateProfiles: jest.fn(),
                };
            }),
        });

        const api1 = new MockUssApi1();
        const api2 = new MockUssApi2();

        globalMocks.registry.registerUssApi(api1);
        await globalMocks.registry.getExplorerExtenderApi().reloadProfiles();
        globalMocks.registry.registerUssApi(api2);
        await globalMocks.registry.getExplorerExtenderApi().reloadProfiles();

        expect(mockRefresh.mock.calls.length).toBe(2);
    });

    it("throws errors when registering invalid APIs", async () => {
        const globalMocks = await createGlobalMocks();
        const api1 = new MockUssApi1();
        const mockGetProfileTypeName = jest.fn(() => undefined);
        api1.getProfileTypeName = mockGetProfileTypeName;
        expect(() => {
            globalMocks.registry.registerUssApi(api1);
        }).toThrow();
        expect(() => {
            globalMocks.registry.registerUssApi(undefined);
        }).toThrow();

        const mvsApi = new ZoweExplorerZosmf.MvsApi();
        mvsApi.getProfileTypeName = mockGetProfileTypeName;
        expect(() => {
            globalMocks.registry.registerMvsApi(mvsApi);
        }).toThrow();
        expect(() => {
            globalMocks.registry.registerMvsApi(undefined);
        }).toThrow();

        const jesApi = new ZoweExplorerZosmf.JesApi();
        jesApi.getProfileTypeName = mockGetProfileTypeName;
        expect(() => {
            globalMocks.registry.registerJesApi(jesApi);
        }).toThrow();
        expect(() => {
            globalMocks.registry.registerJesApi(undefined);
        }).toThrow();
    });

    it("throws errors when invalid APIs requested", async () => {
        const globalMocks = await createGlobalMocks();
        const invalidProfile = {
            type: "invalid_profile_type",
        } as imperative.IProfileLoaded;
        expect(() => {
            globalMocks.registry.getUssApi(undefined);
        }).toThrow();
        expect(() => {
            globalMocks.registry.getMvsApi(undefined);
        }).toThrow();
        expect(() => {
            globalMocks.registry.getJesApi(undefined);
        }).toThrow();
        expect(() => {
            ZoweExplorerApiRegister.getCommonApi(invalidProfile);
        }).toThrowError("Internal error: Tried to call a non-existing Common API in API register: invalid_profile_type");
        expect(() => {
            ZoweExplorerApiRegister.getCommandApi(invalidProfile);
        }).toThrowError("Internal error: Tried to call a non-existing Command API in API register: invalid_profile_type");
    });

    it("returns an API extender instance for getExplorerExtenderApi()", () => {
        const explorerExtenderApiSpy = jest.spyOn(ZoweExplorerApiRegister.getInstance(), "getExplorerExtenderApi");
        ZoweExplorerApiRegister.getExplorerExtenderApi();
        expect(explorerExtenderApiSpy).toHaveBeenCalled();
    });

    it("provides access to the common api for a profile registered to any api regsitry", async () => {
        const globalMocks = await createGlobalMocks();
        const defaultProfile = globalMocks.profiles.getDefaultProfile();
        const ussApi = ZoweExplorerApiRegister.getUssApi(defaultProfile);
        const profileUnused: imperative.IProfileLoaded = {
            name: "profileUnused",
            profile: {
                user: undefined,
                password: undefined,
            },
            type: "zftp",
            message: "",
            failNotFound: false,
        };

        expect(ZoweExplorerApiRegister.getCommonApi(defaultProfile)).toEqual(ussApi);
        expect(ZoweExplorerApiRegister.getCommonApi(defaultProfile).getProfileTypeName()).toEqual(defaultProfile.type);
        expect(() => {
            ZoweExplorerApiRegister.getCommonApi(profileUnused);
        }).toThrow();
    });

    it("provides access to the callback defined by the extender if available", () => {
        Object.defineProperty(ZoweExplorerApiRegister.getInstance().onProfilesUpdateEmitter, "event", {
            value: {},
            configurable: true,
        });
        expect(ZoweExplorerApiRegister.getInstance().onProfilesUpdate).toEqual({});
        ZoweExplorerApiRegister.getInstance()["onProfilesUpdateCallback"] = undefined;
    });
});
