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

/* eslint-disable @typescript-eslint/restrict-plus-operands */

import { Gui, MessageSeverity, ZoweLogger } from "@zowe/zowe-explorer-api";
import * as vscode from "vscode";
import { SettingsConfig } from "@zowe/zowe-explorer-api/src/utils/SettingsConfig";
import { ZoweLocalStorage } from "@zowe/zowe-explorer-api/src/utils/ZoweLocalStorage";

export class LoggerUtils {
    public static async initVscLogger(context: vscode.ExtensionContext, logFileLocation: string): Promise<vscode.OutputChannel> {
        const outputChannel = Gui.createOutputChannel(vscode.l10n.t("Zowe Explorer"));
        this.writeVscLoggerInfo(outputChannel, logFileLocation, context);
        ZoweLogger.info(vscode.l10n.t("Initialized logger for Zowe Explorer"));
        await this.compareCliLogSetting();
        return outputChannel;
    }

    private static writeVscLoggerInfo(outputChannel: vscode.OutputChannel, logFileLocation: string, context: vscode.ExtensionContext): void {
        outputChannel.appendLine(`${context.extension.packageJSON.displayName as string} ${context.extension.packageJSON.version as string}`);
        outputChannel.appendLine(
            vscode.l10n.t({
                message: "This log file can be found at {0}",
                args: [logFileLocation],
                comment: ["Log file location"],
            })
        );
        outputChannel.appendLine(
            vscode.l10n.t({
                message: "Zowe Explorer log level: {0}",
                args: [ZoweLogger.getLogSetting()],
                comment: ["Log setting"],
            })
        );
    }

    private static async compareCliLogSetting(): Promise<void> {
        const cliLogSetting = this.getZoweLogEnvVar();
        const zeLogSetting = ZoweLogger.getLogSetting();
        if (cliLogSetting && +MessageSeverity[zeLogSetting] !== +MessageSeverity[cliLogSetting]) {
            const notified = SettingsConfig.getCliLoggerSetting();
            if (!notified) {
                await this.updateVscLoggerSetting(cliLogSetting);
            }
        }
    }

    private static async updateVscLoggerSetting(cliSetting: string): Promise<void> {
        const updateLoggerButton = vscode.l10n.t("Update");
        const message = vscode.l10n.t({
            message: `Zowe Explorer now has a VS Code logger with a default log level of INFO.
                \nIt looks like the Zowe CLI's ZOWE_APP_LOG_LEVEL={0}.
                \nWould you like Zowe Explorer to update to the the same log level?`,
            args: [cliSetting],
            comment: ["CLI setting"],
        });
        await Gui.infoMessage(message, {
            items: [updateLoggerButton],
            vsCodeOpts: { modal: true },
        }).then(async (selection) => {
            if (selection === updateLoggerButton) {
                await this.setLogSetting(cliSetting);
            }
            SettingsConfig.setCliLoggerSetting(true);
        });
    }

    private static setLogSetting(setting: string): void {
        ZoweLocalStorage.setValue("zowe.logger", setting);
    }

    private static getZoweLogEnvVar(): string {
        return process.env.ZOWE_APP_LOG_LEVEL;
    }
}
