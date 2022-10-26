# Change Log

All notable changes to the "zowe-explorer-api" extension will be documented in this file.

## TBD Release

- Fixed refresh for Zowe Explorer activation and Refresh Extension issues in web based editors. [#1807](https://github.com/zowe/vscode-extension-for-zowe/issues/1807)

## `2.2.1`

- Bugfix: Fix for extenders that call registerCustomProfileType() and recieved error when team configuration file was in place. [#1870](https://github.com/zowe/vscode-extension-for-zowe/issues/1870)

## `2.2.0`

- New API `ZoweVsCodeExtension.updateCredentials` for credential prompting that updates the ProfilesCache after obtaining credentials from user.
- New API `ProfilesCache.updateProfilesArrays` to update `ProfilesCache.allProfiles` for profiles that don't store credentials locally in profile file.
- New API `ProfilesCache.isCredentialsSecured` to check if credentials are stored securely.
- Deprecated `ZoweVsCodeExtension.promptCredentials` in favor of `ZoweVsCodeExtension.updateCredentials`.

## `2.0.0`

- Major: Introduced Team Profiles and more. See the prerelease items (if any) below for more details.

## `2.0.0-next.202204081040`

- Added documentation on promptCredentials(). [1728](https://github.com/zowe/vscode-extension-for-zowe/pull/1728)
- Updated ProfilesCache.refresh() to handle the merging on v1 and v2 profiles. [1729](https://github.com/zowe/vscode-extension-for-zowe/pull/1729)

## `2.0.0-next.202204041200`

- Added new API to expose `promptCredentials` for extender use. [#1699](https://github.com/zowe/vscode-extension-for-zowe/pull/1699)

## `1.17.0`

- Zowe Explorer extenders can now have their profile type's folder with meta file created in the /.zowe/profiles home directory upon initialization by calling the ZoweExplorerApiRegister.getExplorerExtenderApi().initForZowe(type: string, meta:imperative.ICommandProfileTypeConfiguration[]) during their activation with Zowe Explorer.

## `1.10.1`

- Initial release
