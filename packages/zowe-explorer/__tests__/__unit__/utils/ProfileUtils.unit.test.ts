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

import * as fs from "fs";
import * as path from "path";
import { errorHandling, writeOverridesFile } from "../../../src/utils/ProfilesUtils";
import { Gui } from "@zowe/zowe-explorer-api";
import * as globals from "../../../src/globals";
import * as profileUtils from "../../../src/utils/ProfilesUtils";
import * as vscode from "vscode";
import * as zowe from "@zowe/cli";
import { Profiles } from "../../../src/Profiles";

jest.mock("fs");
jest.mock("vscode");

afterEach(() => {
    jest.clearAllMocks();
});

describe("ProfileUtils.writeOverridesFile Unit Tests", () => {
    function createBlockMocks() {
        const newMocks = {
            mockReadFileSync: jest.fn(),
            mockWriteSync: jest.fn(),
            mockFileRead: { overrides: { CredentialManager: "@zowe/cli" } },
            zoweDir: path.normalize("__tests__/.zowe/settings/imperative.json"),
            fileHandle: process.stdout.fd,
            encoding: "utf-8",
        };
        Object.defineProperty(fs, "writeSync", { value: newMocks.mockWriteSync, configurable: true });
        Object.defineProperty(fs, "existsSync", {
            value: () => {
                return true;
            },
            configurable: true,
        });
        Object.defineProperty(Gui, "errorMessage", { value: jest.fn(), configurable: true });
        Object.defineProperty(globals, "LOG", { value: jest.fn(), configurable: true });
        Object.defineProperty(globals.LOG, "error", { value: jest.fn(), configurable: true });
        return newMocks;
    }
    it("should have file exist", async () => {
        const blockMocks = createBlockMocks();
        const fileJson = { overrides: { CredentialManager: "@zowe/cli", testValue: true } };
        const content = JSON.stringify(fileJson, null, 2);
        jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({ overrides: { CredentialManager: false, testValue: true } }, null, 2));
        const spyOpen = jest.spyOn(fs, "openSync");
        const spyWrite = jest.spyOn(fs, "writeSync");
        profileUtils.writeOverridesFile();
        expect(spyOpen).toBeCalledWith(blockMocks.zoweDir, "r+");
        expect(spyWrite).toBeCalledWith(blockMocks.fileHandle, content, 0, blockMocks.encoding);
        spyOpen.mockClear();
        spyWrite.mockClear();
    });
    it("should have no change to global variable PROFILE_SECURITY and returns", async () => {
        const fileJson = { overrides: { CredentialManager: "@zowe/cli", testValue: true } };
        jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify(fileJson, null, 2));
        const spy = jest.spyOn(fs, "writeSync");
        profileUtils.writeOverridesFile();
        expect(spy).toBeCalledTimes(0);
        spy.mockClear();
    });
    it("should have not exist and create default file", async () => {
        const blockMocks = createBlockMocks();
        Object.defineProperty(fs, "openSync", {
            value: (path: string, mode: string) => {
                if (mode.startsWith("r")) {
                    throw new Error("ENOENT");
                }
                return blockMocks.fileHandle;
            },
            configurable: true,
        });
        const content = JSON.stringify(blockMocks.mockFileRead, null, 2);
        const spyOpen = jest.spyOn(fs, "openSync");
        const spyRead = jest.spyOn(fs, "readFileSync");
        const spyWrite = jest.spyOn(fs, "writeSync");
        profileUtils.writeOverridesFile();
        expect(spyWrite).toBeCalledWith(blockMocks.fileHandle, content, 0, blockMocks.encoding);
        expect(spyOpen).toBeCalledTimes(2);
        expect(spyRead).toBeCalledTimes(0);
        spyOpen.mockClear();
        spyRead.mockClear();
        spyWrite.mockClear();
    });
    it("should log error details", async () => {
        createBlockMocks();
        const errorDetails = new Error("i haz error");
        const label = "test";
        const moreInfo = "Task failed successfully";
        await errorHandling(errorDetails, label, moreInfo);
        expect(Gui.errorMessage).toBeCalledWith(`${moreInfo} ` + errorDetails);
        expect(globals.LOG.error).toBeCalledWith(`Error: ${errorDetails.message}\n` + JSON.stringify({ errorDetails, label, moreInfo }));
    });
});

describe("ProfileUtils.promptCredentials Unit Tests", () => {
    it("calls getProfileInfo", async () => {
        const mockProfileInstance = new Profiles(zowe.imperative.Logger.getAppLogger());
        Object.defineProperty(Profiles, "getInstance", {
            value: () => mockProfileInstance,
            configurable: true,
        });
        Object.defineProperty(mockProfileInstance, "getProfileInfo", {
            value: jest.fn(() => {
                return {
                    profileName: "emptyConfig",
                };
            }),
            configurable: true,
        });
        Object.defineProperty(vscode.window, "showInputBox", {
            value: jest.fn().mockResolvedValue(undefined),
            configurable: true,
        });
        await profileUtils.promptCredentials(null);
        expect(mockProfileInstance.getProfileInfo).toHaveBeenCalled();
    });
    it("shows a message if Update Credentials operation is called when autoStore = false", async () => {
        const mockProfileInstance = new Profiles(zowe.imperative.Logger.getAppLogger());
        Object.defineProperty(Profiles, "getInstance", {
            value: () => mockProfileInstance,
            configurable: true,
        });
        Object.defineProperty(mockProfileInstance, "getProfileInfo", {
            value: jest.fn(() => {
                return {
                    profileName: "emptyConfig",
                    usingTeamConfig: true,
                    getTeamConfig: jest.fn().mockReturnValueOnce({
                        properties: {
                            autoStore: false,
                        },
                    }),
                };
            }),
            configurable: true,
        });
        Object.defineProperty(Gui, "showMessage", {
            value: jest.fn(),
            configurable: true,
        });
        await profileUtils.promptCredentials(null);
        expect(mockProfileInstance.getProfileInfo).toHaveBeenCalled();
        expect(Gui.showMessage).toHaveBeenCalledWith('"Update Credentials" operation not supported when "autoStore" is false');
    });
});

describe("ProfileUtils.readConfigFromDisk Unit Tests", () => {
    it("should readConfigFromDisk", async () => {
        Object.defineProperty(vscode.workspace, "workspaceFolders", {
            value: [
                {
                    uri: {
                        fsPath: "./test",
                    },
                },
            ],
            configurable: true,
        });
        const mockReadProfilesFromDisk = jest.fn();
        jest.spyOn(zowe.imperative, "ProfileInfo").mockResolvedValue({
            readProfilesFromDisk: mockReadProfilesFromDisk,
            usingTeamConfig: true,
            getTeamConfig: () => ({
                layers: [
                    {
                        path: "test",
                        exists: true,
                        properties: {
                            defaults: "test",
                        },
                    },
                ],
            }),
        } as never);
        Object.defineProperty(globals.LOG, "debug", {
            value: jest.fn(),
            configurable: true,
        });
        await expect(profileUtils.readConfigFromDisk()).resolves.not.toThrow();
        expect(mockReadProfilesFromDisk).toHaveBeenCalledTimes(1);
    });
});
