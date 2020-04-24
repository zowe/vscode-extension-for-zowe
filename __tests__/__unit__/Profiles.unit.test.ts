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

jest.mock("vscode");
jest.mock("child_process");
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";
import * as child_process from "child_process";
import { Logger, IProfileLoaded } from "@zowe/imperative";
import * as testConst from "../../resources/testProfileData";
import { Profiles, ValidProfileEnum } from "../../src/Profiles";
import { ZosmfSession } from "@zowe/cli";
import { ZoweExplorerApiRegister } from "../../src/api/ZoweExplorerApiRegister";

describe("Profile class unit tests", () => {
    // Mocking log.debug
    const log = Logger.getAppLogger();

    const profileOne = { name: "profile1", profile: {}, type: "zosmf" };
    const profileTwo = { name: "profile2", profile: {}, type: "zosmf" };
    const inputBox: vscode.InputBox = {
        value: "input",
        title: null,
        enabled: true,
        busy: false,
        show: jest.fn(),
        hide: jest.fn(),
        step: null,
        dispose: jest.fn(),
        ignoreFocusOut: false,
        totalSteps: null,
        placeholder: undefined,
        password: false,
        onDidChangeValue: jest.fn(),
        onDidAccept: jest.fn(),
        onDidHide: jest.fn(),
        buttons: [],
        onDidTriggerButton: jest.fn(),
        prompt: undefined,
        validationMessage: undefined
    };
    const schema: {} = {
        host:{type:"string",optionDefinition:{description:"description"}},
        port:{type:"number",optionDefinition:{description:"description", defaultValue: 443}},
        user:{type:"string",secure:true,optionDefinition:{description:"description"}},
        password:{type:"string",secure:true,optionDefinition:{description:"description"}},
        rejectUnauthorized:{type:"boolean",optionDefinition:{description:"description"}},
        basePath:{type:"string",optionDefinition:{description:"description"}}
    };

    const schema2: {} = {
        host:{type:"string",optionDefinition:{description:"description"}},
        port:{type:"number",optionDefinition:{description:"description",defaultValue: 123}},
        user:{type:"string",secure:true,optionDefinition:{description:"description"}},
        password:{type:"string",secure:true,optionDefinition:{description:"description"}},
        basePath:{type:"string",optionDefinition:{description:"description"}},
        aBoolean:{type:"boolean",optionDefinition:{description:"description"}},
        aNumber:{type:"number",optionDefinition:{description:"description",defaultValue: 123}},
        aOther:{type:"string" && null, optionDefinition:{description:"description"}}
    };

    const schema3: {} = {
        host:{type:"string",optionDefinition:{description:"description"}},
        port:{type:"number",optionDefinition:{description:"description"}},
        aNumber:{type:"number",optionDefinition:{description:"description"}}
    };

    // tslint:disable-next-line:max-line-length
    const cpmReturn = {mLoadCounter:{},mLogger:{mJsLogger:{category:"imperative",context:{}},category:"imperative",initStatus:true},mProfileType:"zosmf",mProfileRootDirectory:"",mProfileTypeConfigurations:[{type:"ssh",schema:{type:"object",title:"z/OS SSH Profile",description:"z/OS SSH Profile",properties:{host:{type:"string",optionDefinition:{name:"host",aliases:["H"],description:"The z/OS SSH server host name.",type:"string",required:true,group:"z/OS Ssh Connection Options"}},port:{type:"number",optionDefinition:{name:"port",aliases:["P"],description:"The z/OS SSH server port.",type:"number",defaultValue:22,group:"z/OS Ssh Connection Options"}},user:{type:"string",optionDefinition:{name:"user",aliases:["u"],description:"Mainframe user name, which can be the same as your TSO login.",type:"string",required:true,group:"z/OS Ssh Connection Options"}},password:{type:"string",secure:true,optionDefinition:{name:"password",aliases:["pass","pw"],description:"Mainframe password, which can be the same as your TSO password.",type:"string",group:"z/OS Ssh Connection Options"}},privateKey:{type:"string",optionDefinition:{name:"privateKey",aliases:["key","pk"],description:"Path to a file containing your private key, that must match a public key stored in the server for authentication",type:"string",group:"z/OS Ssh Connection Options"}},keyPassphrase:{type:"string",secure:true,optionDefinition:{name:"keyPassphrase",aliases:["passphrase","kp"],description:"Private key passphrase, which unlocks the private key.",type:"string",group:"z/OS Ssh Connection Options"}},handshakeTimeout:{type:"number",optionDefinition:{name:"handshakeTimeout",aliases:["timeout","to"],description:"How long in milliseconds to wait for the SSH handshake to complete.",type:"number",group:"z/OS Ssh Connection Options"}}},required:["host","user"]},createProfileExamples:[{options:"ssh111 --host sshhost --user ibmuser --password myp4ss",description:"Create a ssh profile called 'ssh111' to connect to z/OS SSH server at host 'zos123' and default port 22"},{options:"ssh222 --host sshhost --port 13022 --user ibmuser --password myp4ss",description:"Create a ssh profile called 'ssh222' to connect to z/OS SSH server at host 'zos123' and port 13022"},{options:"ssh333 --host sshhost --user ibmuser --privateKey /path/to/privatekey --keyPassphrase privateKeyPassphrase",description:"Create a ssh profile called 'ssh333' to connect to z/OS SSH server at host 'zos123' using a privatekey '/path/to/privatekey' and its decryption passphrase 'privateKeyPassphrase' for privatekey authentication"}]},{type:"tso",schema:{type:"object",title:"TSO Profile",description:"z/OS TSO/E User Profile",properties:{account:{type:"string",optionDefinition:{name:"account",aliases:["a"],description:"Your z/OS TSO/E accounting information.",type:"string",required:true,group:"TSO ADDRESS SPACE OPTIONS"}},characterSet:{type:"string",optionDefinition:{name:"character-set",aliases:["cs"],description:"Character set for address space to convert messages and responses from UTF-8 to EBCDIC.",type:"string",defaultValue:"697",group:"TSO ADDRESS SPACE OPTIONS"}},codePage:{type:"string",optionDefinition:{name:"code-page",aliases:["cp"],description:"Codepage value for TSO/E address space to convert messages and responses from UTF-8 to EBCDIC.",type:"string",defaultValue:"1047",group:"TSO ADDRESS SPACE OPTIONS"}},columns:{type:"number",optionDefinition:{name:"columns",aliases:["cols"],description:"The number of columns on a screen.",type:"number",defaultValue:80,group:"TSO ADDRESS SPACE OPTIONS"}},logonProcedure:{type:"string",optionDefinition:{name:"logon-procedure",aliases:["l"],description:"The logon procedure to use when creating TSO procedures on your behalf.",type:"string",defaultValue:"IZUFPROC",group:"TSO ADDRESS SPACE OPTIONS"}},regionSize:{type:"number",optionDefinition:{name:"region-size",aliases:["rs"],description:"Region size for the TSO/E address space.",type:"number",defaultValue:4096,group:"TSO ADDRESS SPACE OPTIONS"}},rows:{type:"number",optionDefinition:{name:"rows",description:"The number of rows on a screen.",type:"number",defaultValue:24,group:"TSO ADDRESS SPACE OPTIONS"}}},required:["account"]},createProfileExamples:[{description:"Create a tso profile called 'myprof' with default settings and JES accounting information of 'IZUACCT'",options:"myprof -a IZUACCT"},{description:"Create a tso profile called 'largeregion' with a region size of 8192, a logon procedure of MYPROC, and JES accounting information of '1234'",options:"largeregion -a 1234 --rs 8192"}],updateProfileExamples:[{description:"Update a tso profile called myprof with new JES accounting information",options:"myprof -a NEWACCT"}]},{type:"zosmf",schema:{type:"object",title:"z/OSMF Profile",description:"z/OSMF Profile",properties:{host:{type:"string",optionDefinition:{name:"host",aliases:["H"],description:"The z/OSMF server host name.",type:"string",required:true,group:"Zosmf Connection Options"}},port:{type:"number",optionDefinition:{name:"port",aliases:["P"],description:"The z/OSMF server port.",type:"number",defaultValue:443,group:"Zosmf Connection Options"}},user:{type:"string",secure:true,optionDefinition:{name:"user",aliases:["u"],description:"Mainframe (z/OSMF) user name, which can be the same as your TSO login.",type:"string",required:true,group:"Zosmf Connection Options"}},password:{type:"string",secure:true,optionDefinition:{name:"password",aliases:["pass","pw"],description:"Mainframe (z/OSMF) password, which can be the same as your TSO password.",type:"string",group:"Zosmf Connection Options",required:true}},rejectUnauthorized:{type:"boolean",optionDefinition:{name:"reject-unauthorized",aliases:["ru"],description:"Reject self-signed certificates.",type:"boolean",defaultValue:true,group:"Zosmf Connection Options"}},basePath:{type:"string",optionDefinition:{name:"base-path",aliases:["bp"],description:"The base path for your API mediation layer instance. Specify this option to prepend the base path to all z/OSMF resources when making REST requests. Do not specify this option if you are not using an API mediation layer.",type:"string",group:"Zosmf Connection Options"}}},required:["host"]},createProfileExamples:[{options:"zos123 --host zos123 --port 1443 --user ibmuser --password myp4ss",description:"Create a zosmf profile called 'zos123' to connect to z/OSMF at host zos123 and port 1443"},{options:"zos124 --host zos124 --user ibmuser --password myp4ss --reject-unauthorized false",description:"Create a zosmf profile called 'zos124' to connect to z/OSMF at the host zos124 (default port - 443) and allow self-signed certificates"},{options:"zosAPIML --host zosAPIML --port 2020 --user ibmuser --password myp4ss --reject-unauthorized false --base-path basePath",description:"Create a zosmf profile called 'zos124' to connect to z/OSMF at the host zos124 (default port - 443) and allow self-signed certificates"}],updateProfileExamples:[{options:"zos123 --user newuser --password newp4ss",description:"Update a zosmf profile named 'zos123' with a new username and password"}]}],mConstructorParms:{profileRootDirectory:"",type:"zosmf"},mProfileTypeConfiguration:{type:"zosmf",schema:{type:"object",title:"z/OSMF Profile",description:"z/OSMF Profile",properties:{host:{type:"string",optionDefinition:{name:"host",aliases:["H"],description:"The z/OSMF server host name.",type:"string",required:true,group:"Zosmf Connection Options"}},port:{type:"number",optionDefinition:{name:"port",aliases:["P"],description:"The z/OSMF server port.",type:"number",defaultValue:443,group:"Zosmf Connection Options"}},user:{type:"string",secure:true,optionDefinition:{name:"user",aliases:["u"],description:"Mainframe (z/OSMF) user name, which can be the same as your TSO login.",type:"string",required:true,group:"Zosmf Connection Options"}},password:{type:"string",secure:true,optionDefinition:{name:"password",aliases:["pass","pw"],description:"Mainframe (z/OSMF) password, which can be the same as your TSO password.",type:"string",group:"Zosmf Connection Options",required:true}},rejectUnauthorized:{type:"boolean",optionDefinition:{name:"reject-unauthorized",aliases:["ru"],description:"Reject self-signed certificates.",type:"boolean",defaultValue:true,group:"Zosmf Connection Options"}},basePath:{type:"string",optionDefinition:{name:"base-path",aliases:["bp"],description:"The base path for your API mediation layer instance. Specify this option to prepend the base path to all z/OSMF resources when making REST requests. Do not specify this option if you are not using an API mediation layer.",type:"string",group:"Zosmf Connection Options"}}},required:["host"]},createProfileExamples:[{options:"zos123 --host zos123 --port 1443 --user ibmuser --password myp4ss",description:"Create a zosmf profile called 'zos123' to connect to z/OSMF at host zos123 and port 1443"},{options:"zos124 --host zos124 --user ibmuser --password myp4ss --reject-unauthorized false",description:"Create a zosmf profile called 'zos124' to connect to z/OSMF at the host zos124 (default port - 443) and allow self-signed certificates"},{options:"zosAPIML --host zosAPIML --port 2020 --user ibmuser --password myp4ss --reject-unauthorized false --base-path basePath",description:"Create a zosmf profile called 'zos124' to connect to z/OSMF at the host zos124 (default port - 443) and allow self-signed certificates"}],updateProfileExamples:[{options:"zos123 --user newuser --password newp4ss",description:"Update a zosmf profile named 'zos123' with a new username and password"}]},mProfileTypeSchema:{type:"object",title:"z/OSMF Profile",description:"z/OSMF Profile",properties:{host:{type:"string",optionDefinition:{name:"host",aliases:["H"],description:"The z/OSMF server host name.",type:"string",required:true,group:"Zosmf Connection Options"}},port:{type:"number",optionDefinition:{name:"port",aliases:["P"],description:"The z/OSMF server port.",type:"number",defaultValue:443,group:"Zosmf Connection Options"}},user:{type:"string",secure:true,optionDefinition:{name:"user",aliases:["u"],description:"Mainframe (z/OSMF) user name, which can be the same as your TSO login.",type:"string",required:true,group:"Zosmf Connection Options"}},password:{type:"string",secure:true,optionDefinition:{name:"password",aliases:["pass","pw"],description:"Mainframe (z/OSMF) password, which can be the same as your TSO password.",type:"string",group:"Zosmf Connection Options",required:true}},rejectUnauthorized:{type:"boolean",optionDefinition:{name:"reject-unauthorized",aliases:["ru"],description:"Reject self-signed certificates.",type:"boolean",defaultValue:true,group:"Zosmf Connection Options"}},basePath:{type:"string",optionDefinition:{name:"base-path",aliases:["bp"],description:"The base path for your API mediation layer instance. Specify this option to prepend the base path to all z/OSMF resources when making REST requests. Do not specify this option if you are not using an API mediation layer.",type:"string",group:"Zosmf Connection Options"}}},required:["host"]},mProfileTypeRootDirectory:"",mProfileTypeMetaFileName:"zosmf_meta"};

    const homedir = path.join(os.homedir(), ".zowe");
    const mockJSONParse = jest.spyOn(JSON, "parse");
    const showInformationMessage = jest.fn();
    const showInputBox = jest.fn();
    const createInputBox = jest.fn();
    const showQuickPick = jest.fn();
    const showErrorMessage = jest.fn();
    const getConfiguration = jest.fn();
    const createTreeView = jest.fn();
    const createBasicZosmfSession = jest.fn();

    Object.defineProperty(vscode.window, "showInformationMessage", { value: showInformationMessage });
    Object.defineProperty(vscode.window, "showErrorMessage", { value: showErrorMessage });
    Object.defineProperty(vscode.window, "showInputBox", { value: showInputBox });
    Object.defineProperty(vscode.window, "createInputBox", { value: createInputBox });
    Object.defineProperty(vscode.window, "showQuickPick", { value: showQuickPick });
    Object.defineProperty(vscode.window, "createTreeView", {value: createTreeView});
    Object.defineProperty(vscode.workspace, "getConfiguration", { value: getConfiguration });
    Object.defineProperty(ZosmfSession, "createBasicZosmfSession", { value: createBasicZosmfSession });

    beforeEach(() => {
        mockJSONParse.mockReturnValue({
            overrides: {
                CredentialManager: false
            }
        });
    });
    afterEach(() => {
        jest.resetAllMocks();
    });

    it("should create an instance", async () => {
        const profiles = await Profiles.createInstance(log);
        expect(Profiles.getInstance()).toBe(profiles);
    });

    it("should return all profiles ", async () => {
        const profiles = await Profiles.createInstance(log);
        const loadedProfiles = profiles.allProfiles;
        expect(loadedProfiles).toEqual([profileOne, profileTwo]);
    });

    it("should return a default profile", async () => {
        const profiles = await Profiles.createInstance(log);
        const loadedProfiles = profiles.getDefaultProfile();
        expect(loadedProfiles).toEqual(profileOne);
    });

    it("should load a named profile ", async () => {
        const profiles = await Profiles.createInstance(log);
        const loadedProfile = profiles.loadNamedProfile("profile2");
        expect(loadedProfile).toEqual(profileTwo);
    });

    it("should fail to load a non existing profile ", async () => {
        let success = false;
        const profiles = await Profiles.createInstance(log);
        try {
            profiles.loadNamedProfile("profile3");
        } catch (error) {
            expect(error.message).toEqual("Could not find profile named: profile3.");
            success = true;
        }
        expect(success).toBe(true);
    });

    describe("Creating a new connection", () => {
        let profiles: Profiles;
        beforeEach(async () => {
            profiles = await Profiles.createInstance(log);
            Object.defineProperty(Profiles, "getInstance", {
                value: jest.fn(() => {
                    return {
                        allProfiles: [{name: "profile1"}, {name: "profile2"}],
                        defaultProfile: {name: "profile1"},
                        loadNamedProfile: [{name: "profile1"}, {profile: {user: "fake", password: "1234"}}],
                        promptCredentials: jest.fn(()=> {
                            return {};
                        }),
                        checkCurrentProfile: jest.fn(()=> {
                            return {};
                        }),
                        createNewConnection: jest.fn(()=>{
                            return {};
                        }),
                        listProfile: jest.fn(()=>{
                            return {};
                        }),
                        saveProfile: jest.fn(()=>{
                            return {profile: {}};
                        }),
                        validateAndParseUrl: jest.fn(()=>{
                            return {};
                        }),
                        updateProfile: jest.fn(()=>{
                            return {};
                        }),
                    };
                })
            });
        });

        afterEach(() => {
            showInputBox.mockReset();
            showQuickPick.mockReset();
            createInputBox.mockReset();
            showInformationMessage.mockReset();
            showErrorMessage.mockReset();
        });

        it("should indicate missing property: zos host", async () => {
            // No valid zos host value
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("No valid value for z/OS Host. Operation Cancelled");
        });

        it("should indicate missing property: username", async () => {
            // Enter z/OS password
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("should indicate missing property: password", async () => {
            // Enter z/OS password
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("should indicate missing property: rejectUnauthorized", async () => {
            // Operation cancelled
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("should validate that profile name already exists", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
            await profiles.createNewConnection(profileOne.name);
            expect(showErrorMessage.mock.calls.length).toBe(1);
            expect(showErrorMessage.mock.calls[0][0]).toBe("Profile name already exists. Please create a profile using a different name");
        });

        it("should create new profile", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("True - Reject connections with self-signed certificates");
            showInputBox.mockResolvedValueOnce("fake");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create new alternative profile", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema2); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False");
            showInputBox.mockResolvedValueOnce("123");
            showInputBox.mockResolvedValueOnce("True");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create alternate profile type with default aNumber", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema2); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False");
            showInputBox.mockResolvedValueOnce(undefined);
            showInputBox.mockResolvedValueOnce("False");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should indicate missing property: aNumber", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema2); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("should create alternate profile type with aNumber", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema3); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce(Number("321"));
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("alternate profile type with aNumber thats NaN", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema3); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("string");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create alternate profile type with aOther string value", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema2); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("True");
            showInputBox.mockResolvedValueOnce(undefined);
            showInputBox.mockResolvedValueOnce("fake");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should indicate missing property: aBoolean", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema2); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce(undefined);
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("should create profile with optional credentials", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("");
            showInputBox.mockResolvedValueOnce("");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create profile and trim https+443 from host", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("https://fake:443");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("True - Reject connections with self-signed certificates");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create new profile with basepath", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
            showInputBox.mockResolvedValueOnce("fake");
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should create 2 consecutive profiles", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake.com");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake1");
            showInputBox.mockResolvedValueOnce("fake1");
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("False - Accept connections with self-signed certificates");
            showInputBox.mockResolvedValueOnce("fake");
            await profiles.createNewConnection("fake1");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake1 was created.");

            showInputBox.mockReset();
            showInformationMessage.mockReset();

            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake2.com");
            showInputBox.mockResolvedValueOnce(Number("143"));
            showInputBox.mockResolvedValueOnce("fake2");
            showInputBox.mockResolvedValueOnce("fake2");

            showQuickPick.mockReset();

            showQuickPick.mockResolvedValueOnce("True - Reject connections with self-signed certificates");
            showInputBox.mockResolvedValueOnce("fake");
            await profiles.createNewConnection("fake2");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake2 was created.");
        });

        it("should prompt credentials", async () => {
            const promptProfile = {name: "profile1", profile: {user: undefined, password: undefined}};
            profiles.loadNamedProfile = jest.fn(() => {
                return promptProfile as any;
            });
            Object.defineProperty(ZosmfSession, "createBasicZosmfSession", {
                value: jest.fn(() => {
                    return { ISession: {user: "fake", password: "fake", base64EncodedAuth: "fake"} };
                })
            });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce("fake");
            const res = await profiles.promptCredentials(promptProfile.name);
            expect(res).toEqual(["fake", "fake", "fake"]);
            (profiles.loadNamedProfile as any).mockReset();
          });

        it("should rePrompt credentials", async () => {
        const promptProfile = {name: "profile1", profile: {user: "oldfake", password: "oldfake"}};
        profiles.loadNamedProfile = jest.fn(() => {
            return promptProfile as any;
        });

        Object.defineProperty(ZosmfSession, "createBasicZosmfSession", {
            value: jest.fn(() => {
                return { ISession: {user: "fake", password: "fake", base64EncodedAuth: "fake"} };
            })
        });

        showInputBox.mockResolvedValueOnce("fake");
        showInputBox.mockResolvedValueOnce("fake");
        const res = await profiles.promptCredentials(promptProfile.name, true);
        expect(res).toEqual(["fake", "fake", "fake"]);
        (profiles.loadNamedProfile as any).mockReset();
        });

        it("should prompt credentials: username invalid", async () => {
            const promptProfile = {name: "profile1", profile: {user: undefined, password: undefined}};
            profiles.loadNamedProfile = jest.fn(() => {
                return promptProfile as any;
            });
            showInputBox.mockResolvedValueOnce(undefined);
            const res = await profiles.promptCredentials(promptProfile.name);
            expect(res).toBeUndefined();
            expect(showErrorMessage.mock.calls.length).toBe(1);
            expect(showErrorMessage.mock.calls[0][0]).toBe("Please enter your z/OS username. Operation Cancelled");
            (profiles.loadNamedProfile as any).mockReset();
        });

        it("should prompt credentials: password invalid", async () => {
            const promptProfile = {name: "profile1", profile: {user: undefined, password: undefined}};
            profiles.loadNamedProfile = jest.fn(() => {
                return promptProfile as any;
            });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(undefined);
            const res = await profiles.promptCredentials(promptProfile.name);
            expect(res).toBeUndefined();
            expect(showErrorMessage.mock.calls.length).toBe(1);
            expect(showErrorMessage.mock.calls[0][0]).toBe("Please enter your z/OS password. Operation Cancelled");
            (profiles.loadNamedProfile as any).mockReset();
        });

        it("should reject port if Not a Number", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("9999999999/some/path"));
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Invalid Port number provided or operation was cancelled");
        });

        it("should create new alternative profile without a default port", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("alternate"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema3); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("143"));
            await profiles.createNewConnection("fake");
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Profile fake was created.");
        });

        it("should use default zosmf port", async () => {
            profiles.getProfileType = () => new Promise((resolve) => { resolve("zosmf"); });
            profiles.getSchema = () => new Promise((resolve) => { resolve(schema); });
            showInputBox.mockResolvedValueOnce("fake");
            showInputBox.mockResolvedValueOnce(Number("0"));
            await profiles.createNewConnection(profileOne.name);
            expect(showInformationMessage.mock.calls.length).toBe(1);
            expect(showInformationMessage.mock.calls[0][0]).toBe("Operation Cancelled");
        });

        it("Tests getProfileType() with only zosmf profile type", async () => {
            ZoweExplorerApiRegister.getInstance().registeredApiTypes = () => (["zosmf"]);
            const response = await profiles.getProfileType();
            expect(response).toEqual("zosmf");
        });

        it("Tests getProfileType() with multiple profile types", async () => {
            ZoweExplorerApiRegister.getInstance().registeredApiTypes = () => (["zosmf","alternate"]);
            showQuickPick.mockReset();
            showQuickPick.mockResolvedValueOnce("alternate");
            const res = await profiles.getProfileType();
            expect(res).toEqual("alternate");
        });

        it("Tests getSchema() with unknown profile type", async () => {
            profiles.getCliProfileManager = () => (JSON.parse(cpmReturn));
            // mock.mockReturnValue(Promise.resolve({host:{type:"string",optionDefinition:{name:"host"}}}));
            const response = await profiles.getSchema("zosmf");
            // tslint:disable-next-line:no-console
            console.log(response);
            expect(response).toEqual({host:{type:"string",optionDefinition:{name:"host"}}});
        });
    });

    it("should route through to spawn. Covers conditional test", async () => {
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "profile1", profile: {}, type: "zosmf"}, {name: "profile2", profile: {}, type: "zosmf"}],
                    defaultProfile: {name: "profile1", profile: {}, type: "zosmf"},
                    createNewConnection: jest.fn(()=>{
                        return {newprofile: "fake"};
                    }),
                    listProfile: jest.fn(()=>{
                        return {};
                    }),
                };
            })
        });
        (child_process.spawnSync as any) = jest.fn((program: string, args: string[], options: any) => {
            const createFakeChildProcess = (status: number, stdout: string, stderr: string) => {
                return {
                    status: 0,
                    stdout,
                    stderr
                };
            };
            if (args[0].indexOf("getAllProfiles") >= 0) {
                return createFakeChildProcess(0, JSON.stringify([profileOne, profileTwo]), "");
            } else {
                // load default profile
                return createFakeChildProcess(0, JSON.stringify(profileOne), "");
            }
        });
        mockJSONParse.mockReturnValueOnce({
            overrides: {
                CredentialManager: "ANO"
            }
        });
        mockJSONParse.mockReturnValueOnce([profileOne, profileTwo]);
        mockJSONParse.mockReturnValueOnce(profileOne);
        await Profiles.createInstance(log);
        expect(Profiles.getInstance().allProfiles).toEqual([profileOne, profileTwo]);
    });

    it("should route through to spawn. Coverage of error handling", async () => {
        // tslint:disable-next-line: prefer-const
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    allProfiles: [{name: "profile1", profile: {}, type: "zosmf"}, {name: "profile2", profile: {}, type: "zosmf"}],
                    defaultProfile: {name: "profile1", profile: {}, type: "zosmf"},
                    createNewConnection: jest.fn(()=>{
                        return {};
                    }),
                    listProfile: jest.fn(()=>{
                        return {};
                    }),
                };
            })
        });
        (child_process.spawnSync as any) = jest.fn((program: string, args: string[], options: any) => {
            const createFakeChildProcess = (status: number, stdout: string, stderr: string) => {
                return {
                    status: 0,
                    stdout,
                    stderr
                };
            };
            if (args[0].indexOf("getAllProfiles") >= 0) {
                return createFakeChildProcess(0, JSON.stringify([profileOne, profileTwo]), "");
            } else {
                // load default profile
                return createFakeChildProcess(0, JSON.stringify(profileOne), "");
            }
        });
        mockJSONParse.mockReturnValueOnce({
            overrides: undefined
        });
        mockJSONParse.mockReturnValueOnce([profileOne, profileTwo]);
        mockJSONParse.mockReturnValueOnce(profileOne);
        await Profiles.createInstance(log);
        expect(Profiles.getInstance().allProfiles).toEqual([profileOne, profileTwo]);
    });

    it("Tests checkCurrentProfile() with valid profile", async () => {
        const theProfiles = await Profiles.createInstance(log);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    promptCredentials: jest.fn(() => {
                        return ["testUser", "testPass", "fake"];
                    })
                };
            })
        });
        const testProfile = {
            type : "zosmf",
            host: null,
            port: 1443,
            user: null,
            password: null,
            rejectUnauthorized: false,
            name: "testName"
        };
        const testIProfile: IProfileLoaded = {
            name: "testProf",
            profile: testProfile,
            type: "zosmf",
            message: "",
            failNotFound: false
        };
        theProfiles.validProfile = -1;
        await theProfiles.checkCurrentProfile(testIProfile);
        expect(theProfiles.validProfile).toBe(ValidProfileEnum.VALID);
    });

    it("Tests checkCurrentProfile() with invalid profile", async () => {
        const theProfiles = await Profiles.createInstance(log);
        Object.defineProperty(Profiles, "getInstance", {
            value: jest.fn(() => {
                return {
                    promptCredentials: jest.fn(() => {
                        return undefined;
                    })
                };
            })
        });
        const testProfile = {
            type : "zosmf",
            host: null,
            port: 1443,
            user: null,
            password: null,
            rejectUnauthorized: false,
            name: "testName"
        };
        const testIProfile: IProfileLoaded = {
            name: "testProf",
            profile: testProfile,
            type: "zosmf",
            message: "",
            failNotFound: false
        };
        await theProfiles.checkCurrentProfile(testIProfile);
        expect(theProfiles.validProfile).toBe(ValidProfileEnum.INVALID);
    });
});
