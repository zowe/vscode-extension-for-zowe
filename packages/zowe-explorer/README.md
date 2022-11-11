# Zowe Explorer

[![version](https://vsmarketplacebadge.apphb.com/version-short/Zowe.vscode-extension-for-zowe.png)](https://vsmarketplacebadge.apphb.com/version-short/Zowe.vscode-extension-for-zowe.png)
[![downloads](https://vsmarketplacebadge.apphb.com/downloads-short/Zowe.vscode-extension-for-zowe.png)](https://vsmarketplacebadge.apphb.com/downloads-short/Zowe.vscode-extension-for-zowe.png)
[![codecov](https://codecov.io/gh/zowe/vscode-extension-for-zowe/branch/main/graph/badge.svg)](https://codecov.io/gh/zowe/vscode-extension-for-zowe)
[![slack](https://img.shields.io/badge/chat-on%20Slack-blue)](https://slack.openmainframeproject.org/)

## Introduction

[Zowe Explorer](https://github.com/zowe/community#zowe-explorer) is a sub-project of Zowe, focusing on modernizing mainframe experience. [Zowe](https://www.zowe.org/) is a project hosted by the [Open Mainframe Project](https://www.openmainframeproject.org/), a [Linux Foundation](https://www.linuxfoundation.org/) project.

The Zowe Explorer extension modernizes the way developers and system administrators interact with z/OS mainframes by:

- Enabling you to create, modify, rename, copy, and upload data sets directly to a z/OS mainframe.
- Enabling you to create, modify, rename, and upload USS files directly to a z/OS mainframe.
- Providing a more streamlined way to access data sets, uss files, and jobs.
- Letting you create, edit, and delete Zowe CLI `zosmf` compatible profiles.
- Letting you leverage the API Mediation Layer token-based authentication to access z/OSMF.

## Contents

- [Sample use cases](#sample-use-cases)
- [Prerequisites tasks](#prerequisite-tasks)
- [Getting started](#getting-started)
- [Usage tips](#usage-tips)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Extending Zowe Explorer](#extending-zowe-explorer)
- [More information](#more-information)

> Zowe Explorer is compatible only with Theia 1.18.0 or higher.
> Zowe Explorer could experience possible unexpected behaviors with the latest Theia releases.

## Sample use cases

Review the following use cases and their procedures to understand how to work with data sets in Zowe Explorer. For the complete list of features including USS and jobs, see [Zowe Explorer Sample Use Cases](https://docs.zowe.org/stable/user-guide/ze-usage/#sample-use-cases).

- [View data sets and use multiple filters](#view-data-sets-and-use-multiple-filters): View multiple data sets simultaneously and apply filters to show specified data sets.
- [Refresh the data set list](#refresh-the-list-of-data-sets): Refresh the list of pre-filtered data sets.
- [Rename data sets](#rename-data-sets): Rename specified data sets.
- [Copy data set members](#copy-data-set-members): Copy specified data set members.
- [Edit and upload a data set member](#edit-and-upload-a-data-set-member): You can instantly pull data sets and data set members from the mainframe, edit them, and upload back.
- [Prevent merge conflicts](#use-the-save-option-to-prevent-merge-conflicts): The save option includes a **compare** mechanism letting you resolve potential merge conflicts.
- [Create data sets and data set members](#create-a-new-data-set-and-add-a-member): Create a new data set and data set members.
- [Create data sets and specify the parameters](#create-data-sets-and-specify-the-parameters): Create a new data set and specify parameter values.
- [Delete data sets and data set members](#delete-data-sets-and-data-set-members): Delete one or more data sets and data set members.
- [View and access multiple profiles simultaneously](#view-and-access-multiple-profiles-simultaneously): Work with data sets from multiple profiles.
- [Submit a JCL](#submit-a-jcl): You can submit a jcl from a chose data set.
- [Allocate Like](#allocate-like): Create a copy of a chosen data set with the same parameters.

### View data sets and use multiple filters

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Hover over the profile that you want to apply the filter to.
4. Click the **Search** icon.
5. Enter a pattern you want to create a filter for.
   The data sets that match your pattern(s) are displayed in the **Side Bar**.

**Tip:** To provide multiple filters, separate entries with a comma. You can append or postpend any filter with an \* to apply wildcard searching. You cannot enter an \* as the entire pattern.

![View Data Set](/docs/images/ZE-multiple-search.gif?raw=true "View Data Set")
<br /><br />

### View data sets with member filters

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Hover over the profile that you want to apply the filter to.
4. Click the **Search** icon.
5. Enter a search pattern in the `HLQ.ZZZ.SSS(MEMBERNAME)` format to filter for and display the specified member in the tree.

![View Data Set With Member Pattern](/docs/images/ZE-member-filter-search.gif?raw=true "View Data Set With Member Pattern")

**Note:** You cannot favorite a data set or member that includes a member filter search pattern.
<br /><br />

### Refresh the list of data sets

1. Navigate to the **Side Bar**.
2. Click **Refresh All** button (circular arrow icon) on the right of the **DATA SETS** explorer bar.

### Rename data sets

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Select a data set you want to rename.
4. Right-click the data set and select the **Rename Data Set** option.
5. Enter the new name of the data set.

![Rename Data Set](/docs/images/ZE-rename.gif?raw=true "Rename Data Set")
<br /><br />

### Copy data set members

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Select a data set member you want to copy.
4. Right-click the member and select the **Copy Member** option.
5. Right-click a data set that you want to paste the member to and select the **Paste Member** option.
6. Enter the name of the copied member.

![Copy Data Set](/docs/images/ZE-copy-member.gif?raw=true "Copy Data Set")
<br /><br />

### Edit and upload a data set member

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Open a profile.
4. Select the data set member you want to edit.

   **Note:** To view the members of a data set, click the data to expand the tree.

   The data set member is displayed in the text editor window of VS Code.

5. Edit the document.
6. Navigate back to the data set member in the explorer tree, and press `Ctrl`+`S` or `Command`+`S` (OSx) to upload the member.

   Your data set member is uploaded.

**Note:** If someone else has made changes to the data set member while you were editing it, you can merge your conflicts before uploading the member to the mainframe.

![Edit](/docs/images/ZE-edit-upload.gif?raw=true "Edit")
<br /><br />

### Use the save option to prevent merge conflicts

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Open a member of a data set you want to edit.
4. Edit the selected member.
5. Press `Ctrl`+`S` or `Command`+`S` (OSx) to save the changes.

   If the original content in your local version no longer matches the same file in the mainframe, a warning message displays advising the user to compare both versions.

6. If necessary, use the editor tool bar to resolve any merge conflicts.

![Save](/docs/images/ZE-safe-save.gif?raw=true "Save")
<br /><br />

### Create a new data set and add a member

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Right-click on the profile where you want to create a data set and select **Create New Data Set**.
4. Enter a name for your data set.
5. From the drop-down menu, select the data set type that you want to create.
6. Select **+Allocate Data Set** to create the data set.
7. Right-click your newly-created data set and select **Create New Member**.
8. Enter a name for your new data set member and press the `Enter` key.
   The member is created and opened in the workspace.

### Create data sets and specify the parameters

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Right-click the profile you want to create a data set with and select **Create New Data Set**.
4. Enter a name for your data set and press `Enter`.
5. From the drop-down menu, select the data set type that you want to create and press `Enter`.
6. Select **Edit Attributes** in the drop-down menu and press the `Enter` key.

   The attributes list for the data set appears. You can edit the following attributes:

   - Allocation Unit

   - Average Block Length

   - Block Size

   - Data Class

   - Device Type

   - Directory Block

   - Data Set Type

   - Management Class

   - Data Set Name

   - Data Set Organization

   - Primary Space

   - Record Format

   - Record Length

   - Secondary Space

   - Size

   - Storage Class

   - Volume Serial

7. Select the attribute you want to edit, provide the value in the **Command Palette**, and press the `Enter` key.
8. (Optional) Edit the parameters of your data set.
9. Select the **+ Allocate Data Set** option to create the data set.

   The data set has been created successfully.

   ![Parameters](/docs/images/ZE-set-params.gif?raw=true "Parameters")
   <br /><br />

### Delete data sets and data set members

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Select one or more data sets and/or data set members.

   **Tip:** Hold the `Ctrl`/`Cmd` key while clicking data sets or data set members to select more than one item for deletion.

4. Press the `Delete` key on your keyboard.

   Alternatively, right-click on the item and select the **Delete Data Set** or **Delete Member** option.

5. Confirm the deletion by clicking **Delete** in the drop-down menu.

   ![Delete Data Sets and Members](/docs/images/ZE-delete-ds2.gif?raw=true "Delete Data Sets and Members")
   <br /><br />

### View and access multiple profiles simultaneously

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Click the **+** icon on the right of the **DATA SET** bar.
4. Select a profile from the drop-down menu in the **Command Palette**. This adds the profile to the **Side Bar**, from where you can search for data sets.

![Add Profile](/docs/images/ze-access-multiple-profiles-simultaneously.gif?raw=true "Add Profile")

### Submit a JCL

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Select the data set or data set member you want to submit.
4. Right-click the data set or member and select the **Submit Job** option.

**Note:** Click on the hyperlink on the notification pop-up to view the job.

![Submit a JCL](/docs/images/ZE-submit-jcl.gif?raw=true "Submit a JCL")

### Allocate Like

1. Navigate to the **Side Bar**.
2. Open the **DATA SETS** bar.
3. Right-click a data set and select the **Allocate Like (New Data Set with Same Attributes)** option.
4. Enter a new data set name.

![Allocate Like](/docs/images/ZE-allocate.gif?raw=true "Allocate Like")

## Prerequisite tasks

- Configure TSO/E address space services, z/OS data set, file REST interface, and z/OS jobs REST interface. For more information, see [z/OS Requirements](https://docs.zowe.org/stable/user-guide/systemrequirements-zosmf.html#z-os-requirements).
- Create a Zowe Explorer profile.

## Getting started

This section includes steps for the tasks you need to complete to get started using Zowe Explorer.

Create a [v1 profile](#create-a-v1-profile) or a [team configuration file](#create-a-team-configuration-file) for profile manangement, review the [sample use cases](#sample-use-cases) to familiarize yourself with the capabilities of Zowe Explorer, and you are ready to use Zowe Explorer.

### Create a v1 profile

**Note:** If a team configuration file is in place, v1 profile creation and use will not be available.

1. Navigate to the **Side Bar**.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. Select **Create a New Connection to z/OS**. The user name and password fields are optional.
5. Follow the instructions, and enter all required information to complete the profile creation.

![New Connection](/docs/images/ZE-newProfiles.gif?raw=true "New Connection")
<br /><br />

You can now use all the functionalities of the extension.

### Create a team configuration file

1. Navigate to the **Side Bar**.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. Select **Create a New Team Configuration File**.
5. If no workspace is open, a global configuration file is created. If a workspace is open, chose either a global configuration file or a project-level configuration file.
6. Edit the config file to include the host and other connection information, and save.

Your team configuration file appears either in your .zowe folder if you chose the global configuration file option, or in your workspace directory if you chose the project-level configuration file option. The notification message that shows in VS Code after config file creation includes the path of the created file.

### Updating securely stored credentials

Securing credentials for v1 profiles and secure fields in the team configuration file are handled by the Zowe Imperative dependency. To update securely stored user names and passwords in Zowe Explorer, the user can right click the profile and select **Update Credentials**. This prompts the user for the new credentials and the secure credentials vault is updated.

### Editing team configuration file

1. Navigate to the **Side Bar**.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. If team configuration file is in place, the **Edit Team Configuration File** option displays.
   ![Edit Team Configuration File](/docs/images/ZE-edit-config.png)
   <br /><br />
5. If only a global or project level config is in place, it opens to be edited. If both a global and project level config are in place, the user must select which file to edit.
   ![Edit Config Location Option](/docs/images/ZE-edit-options.png)
   <br /><br />

### Profile validation

**Note:** The following information applies to Zowe CLI V1 profiles (one yaml file for each user profile) and Zowe CLI team profiles (Zowe CLI V2).

Zowe Explorer includes the profile validation feature that helps to ensure that the specified connection to z/OS is successfully established and your profile is ready for use. If a profile is valid, the profile is active and can be used.

By default, this feature is automatically enabled. You can disable the feature by right-clicking on your profile and selecting the **Disable Validation for Profile** option. Alternatively, you can enable or disable the feature for all profiles in the VS Code settings

1. In VS Code, navigate to **Settings**.
2. Navigate to Zowe Explorer settings.
3. Check the **Automatic Profile Validation** checkbox to enable the automatic validation of profiles option. Uncheck to disable.
4. Restart VS Code.

### Use base profile and token with existing profiles

As a Zowe user, you can leverage the base profile functionality to access multiple services through Single Sign-on. Base profiles enable you to authenticate using the Zowe API Mediation Layer (API ML). You can use base profiles with more than one service profile. For more information, see [Base Profiles](https://docs.zowe.org/stable/user-guide/cli-using-using-profiles/#base-profiles).

**Note:** Before using the base profile functionality with v1 profiles, ensure that you have [Zowe CLI](https://docs.zowe.org/stable/user-guide/cli-installcli.html) v6.0.0 or higher installed.

1. Zowe Explorer has a right click action for profiles to log in and log out of the authentication service for existing Base profiles. If a v1 Base profile hasn't been created, open a terminal and run the following Zowe CLI command: `zowe auth login apiml`.
2. Follow the instructions to complete the login.
   A local base profile is created that contains your token.

   **Note:** For more information about the process, see [Token Management](https://docs.zowe.org/stable/user-guide/cli-using-integrating-apiml/#how-token-management-works).

3. Open VS Code and select the **Zowe Explorer** icon in the **Side Bar**.

4. Hover over **DATA SETS**, **USS**, or **JOBS**.

5. Click the **+** icon.

6. Select the profile you use with your base profile with the token.

   The profile appears in the tree and you can now use this profile to access z/OSMF via the API Mediation Layer.

For more information, see [Integrating with API Mediation Layer](https://docs.zowe.org/stable/user-guide/cli-using-integrating-apiml).

#### Log in to the Authentication Service

If the token for your base profile is no longer valid, you can log in again to get a new token with the **Log in to Authentication Service** feature.

**Notes:**

- The feature is only available for base profiles.
- The feature supports only API Mediation Layer at the moment. Other extenders may use a different authentication service.

1. Open VS Code and select the Zowe Explorer icon in the **Side Bar**.
2. Right-click your profile.
3. Select the **Log in to Authentication Service** option.

   You are prompted to enter your username and password.

The token is stored in the corresponding base profile file, YAML file for v1 Profiles, or the team configuration file.

If you do not want to store your token, you can request the server to end your session token. Use the **Log out from Authentication Service** feature to invalidate the token:

1. Open Zowe Explorer.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. Right-click your profile.
5. Select the **Log out from Authentication Service** option.

Your token has been successfully invalidated.

## Usage tips

- Use the **Add to Favorite** feature to permanently store chosen data sets, USS files, and jobs in the **Favorites** folder. Right-click on a data set, USS file or jobs and select **Add Favorite**.

- **Syntax Highlighting:** Zowe Explorer supports syntax highlighting for data sets. You can search for and install such extensions in VS Code Marketplace.

- **Update a profile**: Right-click a profile, select the **Update Profile** option, and modify the information inside the profile.

- **Delete a profile**: Right-click a profile and select the **Delete Profile** option to permanently delete the profile. This deletes the profile from your `.zowe` folder.

- **Hide a profile**: You can hide a profile from the profile tree by right-clicking the profile and selecting the **Hide Profile** option. To unhide the profile, click the **+** button and select the profile from the quick pick list.

- **Open recent members**: Zowe Explorer lets you open a list of members you worked on earlier. You can access the list by pressing `Ctrl`+`Alt`+`R` (Windows) or `Command`+`Option`+`R` (Mac).

For the comprehensive Zowe Explorer documentation that also includes information about USS and Jobs interactions, see [the Zowe Explorer documentation](https://docs.zowe.org/stable/user-guide/ze-install.html) in Zowe Docs.

## Keyboard Shortcuts

- Restart Zowe Explorer

  - Windows: `ctrl`+`alt`+`z`
  - Mac: `⌘`+`⌥`+`z`

- Open Recent Member

  - Windows: `ctrl`+`alt`+`r`
  - Mac: `⌘`+`⌥`+`r`

- Search in all Loaded Items
  - Windows: `ctrl`+`alt`+`p`
  - Mac: `⌘`+`⌥`+`p`

## Extending Zowe Explorer

You can add new functionalities to Zowe Explorer by creating your own extension. For more information, see [Extensions for Zowe Explorer](https://github.com/zowe/vscode-extension-for-zowe/blob/main/docs/README-Extending.md).

**Tip:** View an example of a Zowe Explorer extension: [Zowe Explorer FTP extension documentation](https://github.com/zowe/zowe-explorer-ftp-extension#zowe-explorer-ftp-extension).

## More information

- For the complete Zowe Explorer documentation, see [Zowe Docs](https://docs.zowe.org/stable/user-guide/ze-install.html).
- Join the **#zowe-explorer** channel on [Slack](https://openmainframeproject.slack.com/) to stay in touch with the Zowe community.
