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
import { writeOverridesFile } from "../../../src/utils/ProfilesUtils";

jest.mock("fs");

async function createGlobalMocks() {
    const globalMocks = {
        mockReadFileSync: jest.fn(),
        mockWriteFileSync: jest.fn(),
        mockFileRead: { overrides: { CredentialManager: "@zowe/cli" } },
        zoweDir: path.normalize("__tests__/.zowe/settings/imperative.json"),
        encoding: "utf8",
    };
    Object.defineProperty(fs, "writeFileSync", { value: globalMocks.mockWriteFileSync, configurable: true });
    Object.defineProperty(fs, "existsSync", {
        value: () => {
            return true;
        },
        configurable: true,
    });
    return globalMocks;
}

afterEach(() => {
    jest.clearAllMocks();
});

describe("ProfileUtils Unit Tests", () => {
    it("should have file exist", async () => {
        const globalMocks = await createGlobalMocks();
        const fileJson = { overrides: { CredentialManager: "@zowe/cli", testValue: true } };
        const content = JSON.stringify(fileJson, null, 2);
        jest.spyOn(fs, "readFileSync").mockReturnValueOnce(
            JSON.stringify({ overrides: { CredentialManager: false, testValue: true } }, null, 2)
        );
        const spy = jest.spyOn(fs, "writeFileSync");
        writeOverridesFile();
        expect(spy).toBeCalledWith(globalMocks.zoweDir, content, globalMocks.encoding);
        spy.mockClear();
    });
    it("should have no change to global variable PROFILE_SECURITY and returns", async () => {
        const fileJson = { overrides: { CredentialManager: "@zowe/cli", testValue: true } };
        jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify(fileJson, null, 2));
        const spy = jest.spyOn(fs, "writeFileSync");
        writeOverridesFile();
        expect(spy).toBeCalledTimes(0);
        spy.mockClear();
    });
    it("should have not exist and create default file", async () => {
        const globalMocks = await createGlobalMocks();
        Object.defineProperty(fs, "existsSync", {
            value: () => {
                return false;
            },
            configurable: true,
        });
        const content = JSON.stringify(globalMocks.mockFileRead, null, 2);
        const spyRead = jest.spyOn(fs, "readFileSync");
        const spy = jest.spyOn(fs, "writeFileSync");
        writeOverridesFile();
        expect(spy).toBeCalledWith(globalMocks.zoweDir, content, globalMocks.encoding);
        expect(spyRead).toBeCalledTimes(0);
        spy.mockClear();
        spyRead.mockClear();
    });
});
