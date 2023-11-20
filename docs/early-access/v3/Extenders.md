# Version 3.0.0 Changes Affecting Zowe Explorer Extenders

## No longer supported

- Removed support for v1 Profiles
- Updated supported VS Code engine to 1.79.0

## Removal of deprecated APIs from Extensibility API for Zowe Explorer

- Logger type `MessageSeverityEnum` removed in favor of `MessageSeverity`.
- `IUss.putContents` removed in favor of `IUss.putContent`.
- `IJes.getJobsByOwnerAndPrefix` removed in favor of `IJes.getJobsByParameters`.
- `ICommand.issueTsoCommand` removed in favor of `ICommand.issueTsoCommandWithParms`.
- `ZoweVsCodeExtension.showVsCodeMessage` removed in favor of `Gui.showMessage`.
- `ZoweVsCodeExtension.inputBox` removed in favor of `Gui.showInputBox`.
- `ZoweVsCodeExtension.promptCredentials` removed in favor of `ZoweVsCodeExtension.updateCredentials`.