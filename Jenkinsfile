/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

@Library('shared-pipelines') import org.zowe.pipelines.nodejs.NodeJSPipeline

node('ca-jenkins-agent') {
  // This is the product name used by the build machine to store information about the builds
  def PRODUCT_NAME = "Zowe Explorer"

  // This is the what should be considered the master branch (for deployment purposes)
  def MASTER_BRANCH = "master"

  // Artifactory Details
  def ARTIFACTORY_CREDENTIALS_ID = "zowe.jfrog.io"
  def ARTIFACTORY_UPLOAD_URL = "https://zowe.jfrog.io/zowe/libs-release-local/org/zowe/vscode"

  // Other Credential IDs
  def PUBLISH_TOKEN = "vsce-publish-key"
  def ZOWE_ROBOT_TOKEN = "zowe-robot-github"
  def CODECOV_CREDENTIALS_ID = 'CODECOV_ZOWE_VSCODE'

  // Testing related variables
  def TEST_ROOT = "results"
  def UNIT_TEST_ROOT = "$TEST_ROOT/unit"
  def UNIT_JUNIT_OUTPUT = "$UNIT_TEST_ROOT/junit.xml"
  def SYSTEM_TEST_ROOT = "$TEST_ROOT/system"
  def SYSTEM_JUNIT_OUTPUT = "$SYSTEM_TEST_ROOT/junit.xml"

  // Initialize the pipeline
  def pipeline = new NodeJSPipeline(this)

  // Build admins, users that can approve the build and receieve emails for all protected branch builds.
  pipeline.admins.add("stonecc", "zfernand0", "mikebauerca")

  // Comma-separated list of emails that should receive notifications about every build on every branch : )
  // There are plans to send branch-specific emails to the developers in questions. For more information please look for emailProviders
  pipeline.emailList = "fernando.rijocedeno@broadcom.com"

  // Protected branch property definitions
  pipeline.protectedBranches.addMap([
      [name: "master", tag: "latest", dependencies: ["@zowe/cli": "zowe-v1-lts"]]
  ])

  // Git configuration information
  pipeline.gitConfig = [
      email: 'zowe.robot@gmail.com',
      credentialsId: 'zowe-robot-github'
  ]

  // Initialize the pipeline library, should create 5 steps
  pipeline.setup()

  // Lint the source code
  pipeline.lint()

  // Build the application
  pipeline.build(
      timeout: [ time: 10, unit: 'MINUTES' ],
      operation: {
        // Create a dummy TestProfileData in order to build the source code. See issue #556
        sh "cp resources/testProfileData.example.ts resources/testProfileData.ts"
        sh "npm run build"
      },
      archiveOperation: {
        // Gather details for build archives
        def vscodePackageJson = readJSON file: "package.json"
        def date = new Date()
        String buildDate = date.format("yyyyMMddHHmmss")
        def fileName = "vscode-extension-for-zowe-v${vscodePackageJson.version}-${BRANCH_NAME}-${buildDate}"

        // Generate a vsix for archiving purposes
        sh "npx vsce package -o ${fileName}.vsix"

        // Upload vsix to Artifactory
        withCredentials([usernamePassword(credentialsId: ARTIFACTORY_CREDENTIALS_ID, usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
          def uploadUrlArtifactory = "https://zowe.jfrog.io/zowe/libs-snapshot-local/org/zowe/vscode/${fileName}.vsix"
          sh "curl -u ${USERNAME}:${PASSWORD} --data-binary \"@${fileName}.vsix\" -H \"Content-Type: application/octet-stream\" -X PUT ${uploadUrlArtifactory}"
        }
      }
  )

  // Perform Unit Tests and capture the results
  pipeline.test(
      name: "Unit",
      operation: {
        sh "npm run test:unit"
      },
      timeout: [ time: 10, unit: 'MINUTES' ],
      environment: [
        JEST_JUNIT_OUTPUT: UNIT_JUNIT_OUTPUT,
        JEST_SUIT_NAME: "Unit Tests",
        JEST_JUNIT_ANCESTOR_SEPARATOR: " > ",
        JEST_JUNIT_CLASSNAME: "Unit.{classname}",
        JEST_JUNIT_TITLE: "{title}",
        JEST_STARE_RESULT_DIR: "${UNIT_TEST_ROOT}/jest-stare",
        JEST_STARE_RESULT_HTML: "index.html"
      ],
      testResults: [dir: "${UNIT_TEST_ROOT}/jest-stare", files: "index.html", name: "${PRODUCT_NAME} - Unit Test Report"],
      coverageResults: [dir: "${UNIT_TEST_ROOT}/coverage/lcov-report", files: "index.html", name: "${PRODUCT_NAME} - Unit Test Coverage Report"],
      junitOutput: UNIT_JUNIT_OUTPUT,
      cobertura: [
        coberturaReportFile: "${UNIT_TEST_ROOT}/coverage/cobertura-coverage.xml",
        maxNumberOfBuilds: 20,
        sourceEncoding: 'ASCII'
      ]
  )

  // Upload Reports to Codecov. This may be replaced with Sonar Cloud in the near future. See #473
  pipeline.createStage(
    name: "Codecov",
    stage: {
      withCredentials([usernamePassword(credentialsId: CODECOV_CREDENTIALS_ID, usernameVariable: 'CODECOV_USERNAME', passwordVariable: 'CODECOV_TOKEN')]) {
        sh "curl -s https://codecov.io/bash | bash -s"
      }
    }
  )

  // Check for Vulnerabilities
  pipeline.checkVulnerabilities()

  // Publish a new version of the extensions if needed
  pipeline.createStage(
    name: "Publish",
    shouldExecute: { env.BRANCH_NAME == MASTER_BRANCH },
    timeout: [ time: 10, unit: 'MINUTES' ],
    stage: {
      // Gather details about the extension for comparison
      def vscodePackageJson = readJSON file: "package.json"
      def extensionMetadata = sh(returnStdout: true, script: "npx vsce show ${vscodePackageJson.publisher}.${vscodePackageJson.name} --json").trim()
      def extensionInfo = readJSON text: extensionMetadata

      // Check if we need to publish a new version
      if (extensionInfo.versions[0].version == vscodePackageJson.version) {
        echo "No new version to publish at this time (${vscodePackageJson.version})"

        // Will stop here if there wasn't a requirement to publish anything
        return;
      }

      // Publish new version
      echo "Publishing version ${vscodePackageJson.version} since it's different from ${extensionInfo.versions[0].version}"
      withCredentials([string(credentialsId: PUBLISH_TOKEN, variable: 'TOKEN')]) {
        sh "npx vsce publish -p $TOKEN"
      }

      // Prepare GitHub Release
      def version = "v${vscodePackageJson.version}"
      def versionName = "vscode-extension-for-zowe-v${vscodePackageJson.version}"
      sh "npx vsce package -o ${versionName}.vsix"

      // Upload Final VSIX to Artifactory
      withCredentials([usernamePassword(credentialsId: ARTIFACTORY_CREDENTIALS_ID, usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
        def uploadUrlArtifactory = "${ARTIFACTORY_UPLOAD_URL}/${versionName}.vsix"
        sh "curl -u ${USERNAME}:${PASSWORD} --data-binary \"@${versionName}.vsix\" -H \"Content-Type: application/octet-stream\" -X PUT ${uploadUrlArtifactory}"
      }

      // Create the GitHub Release
      withCredentials([usernamePassword(credentialsId: ZOWE_ROBOT_TOKEN, usernameVariable: 'USERNAME', passwordVariable: 'TOKEN')]) {
        sh "git push --tags https://$TOKEN:x-oauth-basic@github.com/zowe/vscode-extension-for-zowe.git"

        // Grab changelog, convert to unix line endings, get changes under current version, publish release to github with changes in body
        def releaseVersion = sh(returnStdout: true, script: "echo ${version} | cut -c 2-").trim()
        sh "npm install ssp-dos2unix"
        sh "node ./scripts/d2uChangelog.js"
        def releaseChanges = sh(returnStdout: true, script: "awk -v ver=${releaseVersion} '/## / {if (p) { exit }; if (\$2 ~ ver) { p=1; next} } p && NF' CHANGELOG.md | tr \\\" \\` | sed -z 's/\\n/\\\\n/g'").trim()

        // Gather details about the GitHub APIs used to publish a release
        def releaseAPI = "repos/zowe/vscode-extension-for-zowe/releases"
        def releaseDetails = "{\"tag_name\":\"$version\",\"target_commitish\":\"master\",\"name\":\"$version\",\"body\":\"$releaseChanges\",\"draft\":false,\"prerelease\":false}"
        def releaseUrl = "https://$TOKEN:x-oauth-basic@api.github.com/${releaseAPI}"

        // Create the release
        def releaseCreated = sh(returnStdout: true, script: "curl -H \"Content-Type: application/json\" -X POST -d '${releaseDetails}' ${releaseUrl}").trim()
        def releaseParsed = readJSON text: releaseCreated

        // Upload vsix to the release that was just created
        def uploadUrl = "https://$TOKEN:x-oauth-basic@uploads.github.com/${releaseAPI}/${releaseParsed.id}/assets?name=${versionName}.vsix"
        sh "curl -X POST --data-binary @${versionName}.vsix -H \"Content-Type: application/octet-stream\" ${uploadUrl}"
      }
    }
  )

  // Once called, no stages can be added and all added stages will be executed.
  // On completion appropriate emails will be sent out by the shared library.
  pipeline.end()
}
