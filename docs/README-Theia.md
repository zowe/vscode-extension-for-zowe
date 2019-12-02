# Developing for Eclipse Theia

VS Code extensions are not only limited to run inside VS Code, but the editor has become so popular that there are other editors out there now that provide a compatibility API to also consume VS Code extensions. One of the most popular ones is the Web-based [Eclipse Theia](https://theia-ide.org/). Theia is also the default editor for the container-based [Eclipse Che](https://www.eclipse.org/che/) platform as well. Hence, developing Zowe Explorer for not only VS Code, but also Theia will open the project up for an even larger community than VS Code already provides.

## API compatibility

Theia strives for full compatibility of the VS Code APIs. As Theia as well as VS Code evolve the Theia team is keeping track of the status of the VS Code API implementation in Theia here: <https://che-incubator.github.io/vscode-theia-comparator/status.html>

If new issues are found the team accepts issue reports here using the tag vscode: <https://github.com/eclipse-theia/theia/labels/vscode>

## Trying Theia with Zowe Explorer

For development and debugging it is recommended to clone the full Theia repository, but to quickly try Theia with Zowe Explorer you can either build it locally or load the default Docker image.

### Building it locally

1. Follow the [instructions here](https://theia-ide.org/docs/composing_applications/) to build Theia using node and yarn with the two modifications described below.

1. After pasting the contents for the `package.json` file add the following additional entries into the `dependencies` object:

   ```json
    "@theia/plugin-dev": "next",
    "@theia/plugin-ext-vscode": "next"
   ```

  As the name indicates, these will add VS Code Extension compatibility.

1. Before you run the `yarn theia start` command, download Zowe Explorer's vsix file from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Zowe.vscode-extension-for-zowe) using the "Download Extension" link on the right.

1. Create a folder called `plugins` in the directory where you built Theia and drop the downloaded vsix file into that folder.

1. The start Theia with this augmented command

   ```bash
   yarn theia start --plugins=local-dir:./plugins
   ```

1. Now open a Web browser and navigate to <http://localhost:3000>.

Theia will load and you see the Zowe Explorer view available on the left. It is that easy.

### Running a Docker container

If you are a fan of Docker you can get started much quicker than above by using the continuously publish Theia Docker images. This page provides a great overview to the available Docker images maintained by the Theia team: <https://github.com/theia-ide/theia-apps>.

As the default Theia Docker image does not include the VS Code Plugin extension either, we recommend loading the `theia-full` image.

1. Make sure are not running any other Theia app anymore or change the mapped port in the command. Then run this command to download the image and start a container

    ```bash
    docker run -it --init -p 3000:3000 theiaide/theia-full:next --plugins=local-dir:/home/theia/plugins
    ```

1. Open a Web browser and navigate to <http://localhost:3000>.

1. At the moment the Zowe Explorer is not included, yet. You can update the docker container by copying the extension into the container:

   ```bash
   docker cp ~/Downloads/Zowe.vscode-extension-for-zowe-0.29.0.vsix ${container-id}:/home/theia
   ```

   Replace `${container-id}` with the actual container id and adjust for your OS.

1. And then move it in the right place as root:

    ```bash
   $ docker exec -u 0 -it ${container-id} bash
   # mkdir plugins
   # mv Zowe.vscode-extension-for-zowe-0.29.0.vsix plugins
   ```

1. Then stop and start the container and reload your browser.

You will now see again the Zowe Explorer views. To install more into the container go back to the container root shell. For example, you could install the Zowe CLI now as well.

## Setting up a development environment

If you want to develop and test Zowe Explorer to work with Theia it is recommended to set-up a full Theia development workspace to be able to run debug session out of that workspace as well as be able to fully explore Theia code and set break points if needed.

### Setting up your Theia workspace

The Theia development team provides a very detailed document on how to set up your workspace. In particular it lists all the dependencies required on your development machine, which differ quite a bit depending on the OS you are working on.

Go here to find the main Theia Developer Guide: <https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md>.

The main prerequisites are Node v10 and Yarn that can easily be installed on Macs using [Brew](https://brew.sh). On a Windows PC you need a couple more dependencies such as the Windows Build Tools. The [guide proposes](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#building-on-windows) to install the Windows package manager Choco and to then use that for installation of dependencies.

Once set-up, the steps for building are basically to clone the repo and run `yarn` to build everything. If the build process aborts with errors then check for these in the various [Troubleshoot sections of the Theia development guide](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#troubleshooting) for fixes.

Then, just running Theia with Zowe Explorer would be following these steps:

- Create a `plugins` folder in the top-level Theia folder you cloned.
- Copy the Zowe Explorer vsix file into that `plugins` folder.
- `cd examples/browser`
- `yarn start`
- Open a Web browser and navigate to <http://localhost:3000>.

### Setting up a debug session for Zowe Explorer in Theia

By just running Zowe Explorer as a vsix file in Theia you can test functionality and find issues. However, you also want to be able to link Zowe Explorer directly from your Theia installation so that you can set break points and see changes that you make for testing them immediately. For that you would actually not copy vsix files into the plugins folder, but link in the extension at runtime. (Hence, remove it from the plugins directory now if you did the steps of the previous section.)

For the following steps we assume that you have cloned the Zowe Explorer's Github repo into a parallel directory to Theia and have it all setup, built and can run it from the workspace. We also assume that you have them both (Theia and Zowe Explorer) open in two separate VS Code windows and can switch back and forth between them. If you do not plan to set break points in Theia itself, just Zowe Explorer then you can just use a command shell for building and starting Theia.

- Make sure Zowe Explorer is fully build with `npm run build`.
- Optionally, you can start watching the Zowe Explorer extension for code changes you make with `npm run watch`. However, when you save changes in Zowe Explorer you need to stop and start the Theia Hosted Plugin as described below, because watch will automatically build changes, but not deploy them into Theia.
- Make sure that the Zowe Explorer vsix file is not inside the `plugins` directory anymore, if you ran the steps in the previous section.
- Build and start Theia:
  - `yarn` (in the main directory)
  - `cd examples/browser`
  - `yarn start`
- Open a browser and go to <http://localhost:3000>.
- In that browser the Theia IDE will appear and you will use Theia's and not VS Code's Debugger to actually debug the VS Code extension.
- In Theia open your Zowe Explorer development workspace with `File > Open..`, e.g. select the `vscode-extension-for-zowe` in the file dialog.
- You can now open files and set breakpoints. Changes you make in VS Code will appear here and vice versa as both editors have file watchers.
- To start debugging you need to do commands that you start using the `F1` function key in Theia and then start typing the command until it appears:
  - `Hosted Plugin: Select Path`: it opens a dialog in which you need to select again the folder of the Zowe Explorer VS Code extension.
  - `Hosted Plugin: Debug Instance`: it will prompt you to open an new browser window with a new Theia instance that has now the VS Code extension that you selected loaded.
- In that new Theia browser window you can now load your test files and use the extension. If it hits a breakpoint it will show that in the other, first Theia editor. Make sure you open them as two separate browser windows on different computer screens if available, so that you can switch back and forth easily.
- In the Theia editor with your breakpoints open the Debug view for stepping through the code and inspecting variables.
- You see at the bottom of the Theia editor with the Debug view a green bar labeled `Hosted Plugin:...` that shows the status.
- Click on it to stop and start this debug session. For example, if you make code changes in the VS Code editor that has the Zowe Explorer VS Code extension on watch you still need to stop and start the debug session for the changes to take effect.

There is also a gif video with all of these steps [here in the Theia Github repo](https://github.com/theia-ide/theia/issues/3251#issuecomment-461484406).
