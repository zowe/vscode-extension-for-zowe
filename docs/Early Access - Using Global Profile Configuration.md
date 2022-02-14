# Zowe Explorer Profile Configuration

Zowe Explorer vNext enables you to use the team configuration file that centralizes and simplifies your profile management.

> vNext is developed by the [Zowe CLI Squad](https://github.com/zowe/zowe-cli/blob/next/docs/Early%20Access%20-%20Using%20Global%20Profile%20Configuration.md).

You can configure global profiles and project-specific profiles.

## Prerequisites

Meet the following software requirements before you use the team configuration file:

1. Install [Zowe CLI vNext version](https://github.com/zowe/zowe-cli/blob/next/docs/Early%20Access%20-%20Using%20Global%20Profile%20Configuration.md#installing-next-version).

   Ensure that Zowe Explorer and the CLI versions are compatible.

   | Zowe Explorer version    | Zowe CLI version        |
   | ------------------------ | ----------------------- |
   | v2.0.0-next.202107151328 | 7.0.0-next.202106012053 |
   | v2.0.0-next.202110141604 | 7.0.0-next.202109281609 |
   | v2.0.0-next.202112161700 | 7.0.0-next.202109281609 |

2. Initialize the Global Configuration file by using either [the Zowe CLI](https://github.com/zowe/zowe-cli/blob/next/docs/Early%20Access%20-%20Using%20Global%20Profile%20Configuration.md#initializing-global-configuration) or [Zowe Explorer](#create-a-team-configuration-file).

   Your Zowe home directory should contain the `zowe.config.json` and `zowe.schema.json` files.

3. Customize the Global Configuration file by using either [the Zowe CLI](https://github.com/zowe/zowe-cli/blob/next/docs/Early%20Access%20-%20Using%20Global%20Profile%20Configuration.md#editing-configuration) or [Zowe Explorer](#manage-a-profile).

## Install the vNext Release version

Install vNext.

**Follow these steps**:

1. Download the [vNext-enabled Zowe Explorer version](https://github.com/zowe/vscode-extension-for-zowe/releases) from the Zowe Explorer Github release page.
2. Open VS Code.
3. Navigate to **File** > **Preferences** > **Extensions** > **Install from vsix\*\***.
4. Select the .vsix file to install.
5. Reload your VS Code window.

### Load a Profile

**Follow these steps**:

1. Navigate to the explorer tree.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. From the drop-down menu, select the profile that you want to use.

You can now use your global or project-specific profile.

## Profile Configuration

The global profile functionality simplifies profile management by enabling you to edit, store, and share mainframe configuration details in one location. You can use a text editor or an IDE to populate configuration files with connection details for your mainframe services. By default, your global configuration file is located in .zowe home folder, whereas a project-level configuration file is located in the main directory of your project.

**Note**: A project context takes precedence over global configuration.

### Create a Team Configuration File

Create a team configuration file.

1. Navigate to the explorer tree.
2. Hover over **DATA SETS**, **USS**, or **JOBS**.
3. Click the **+** icon.
4. Select **Create a New Team Configuration File**.
5. Chose either a global configuration file or a project-level configuration file.
6. Reload your VS Code window when prompted.

Your team configuration file appears either in your `.zowe` folder if you choose the global configuration file option, or in your workspace directory if you choose the project-level configuration file option.

### Manage a Profile

You can edit your project-level or global configuration files.

**Follow these steps**:

1. Right-click on your profile.
2. Select the **Add**, **Update**, or **Delete Profile** options to edit the global `zowe.config.json` file.

   **Tip**: Use the Intellisense prompts if you need assistance with filling parameters in the .json file.

3. Reload your VS Code window by clicking **View** > **Command Palette** > **Developer: Reload Window** so that the changes take effect.

   Alternatively, press F1 to open the command palette, type and execute the **Developer: Reload Window** option.

You successfully edited your configuration file.

### Sample Profile Configuration

View the profile configuration sample. In the sample, the default `lpar1.zosmf` profile will be loaded upon activation.

You can use the sample to customize your profile configuration file. Ensure that you edit the `host` and `port` values before you work in your environment.

```json
{
  "$schema": "./zowe.schema.json",
  "profiles": {
    "lpar1": {
      "properties": {
        "host": "192.86.32.67"
      },
      "profiles": {
        "zosmf": {
          "type": "zosmf",
          "properties": {
            "port": 10443
          },
          "secure": []
        },
        "tso": {
          "type": "tso",
          "properties": {
            "account": "",
            "codePage": "1047",
            "logonProcedure": "IZUFPROC"
          },
          "secure": []
        },
        "ssh": {
          "type": "ssh",
          "properties": {
            "port": 22
          },
          "secure": []
        },
        "zftp": {
          "type": "zftp",
          "properties": {
            "port": 21
          },
          "secure": []
        }
      }
    },
    "my_base": {
      "type": "base",
      "properties": {
        "rejectUnauthorized": false
      },
      "secure": ["user", "password"]
    }
  },
  "defaults": {
    "zosmf": "lpar1.zosmf",
    "tso": "lpar1.tso",
    "ssh": "lpar1.ssh",
    "zftp": "lpar1.zftp",
    "base": "my_base"
  },
  "plugins": []
}
```
