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

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as driverFirefox from "./theia/extension.theiaFirefox";
import * as driverChrome from "./theia/extension.theiaChrome";

const TIMEOUT = 45000;
const SLEEPTIME = 15000;
const SHORTSLEEPTIME = 2000;
const wait5sec = 5000;
declare var it: any;
const expect = chai.expect;
chai.use(chaiAsPromised);

describe("Locate Tree Nodes", () => {
    before(async () => {
        await driverFirefox.openBrowser();
        await driverFirefox.sleepTime(SHORTSLEEPTIME);
        await driverFirefox.OpenTheiaInFirefox();
        await driverFirefox.sleepTime(SLEEPTIME);
        await driverFirefox.clickOnZoweExplorer();
    });

    it("should open Zowe Explorer and find the Favorites node", async () => {
        const favoriteLink = await driverFirefox.getFavouritesNode();
        expect(favoriteLink).to.equal("Favorites");
    }).timeout(TIMEOUT);

    it("should find the Data Sets node", async () => {
        const datasetLink = await driverFirefox.getDatasetNode();
        expect(datasetLink).to.equal("DATA SETS");
    }).timeout(TIMEOUT);

    it("should find the USS node", async () => {
        const ussLink = await driverFirefox.getUssNode();
        expect(ussLink).to.equal("UNIX SYSTEM SERVICES (USS)");
    }).timeout(TIMEOUT);

    it("should find the Jobs node", async () => {
        const jobsLink = await driverFirefox.getJobsNode();
        expect(jobsLink).to.equal("JOBS");
    }).timeout(TIMEOUT);

    after(async () => driverFirefox.closeBrowser());
});

describe("Add Default Profile and Profile in DATASETS", () => {
    before(async () => {
        await driverChrome.openBrowser();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.OpenTheiaInChrome();
        await driverChrome.sleepTime(SLEEPTIME);
        await driverChrome.clickOnZoweExplorer();
    });

    it("Should Add Default Profile in DATASETS", async () => {
        await driverChrome.clickOnDatasetsPanel();
        console.error("clickOnDatasetsPanel");
        await driverChrome.clickOnAddSessionInDatasets();
        console.error("clickOnAddSessionInDatasets");
        await driverChrome.addProfileDetails("DefaultProfile");
        console.error("addProfileDetails");
        const datasetProfile = await driverChrome.getDatasetsDefaultProfilename();
        console.error("getDatasetsDefaultProfilename");
        expect(datasetProfile).to.equal("DefaultProfile");
    });

    it("Should Add Profile in DATASETS", async () => {
        await driverChrome.clickOnDatasetsPanel();
        await driverChrome.clickOnAddSessionInDatasets();
        await driverChrome.addProfileDetails("TestSeleniumProfile");
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const datasetProfile = await driverChrome.getDatasetsProfilename();
        expect(datasetProfile).to.equal("TestSeleniumProfile");
    });

    after(async () => driverChrome.closeBrowser());
});

describe("Default profile Visible in USS and JOBS", () => {
    before(async () => {
        await driverFirefox.openBrowser();
        await driverFirefox.sleepTime(SHORTSLEEPTIME);
        await driverFirefox.OpenTheiaInFirefox();
        await driverFirefox.sleepTime(SLEEPTIME);
        await driverFirefox.clickOnZoweExplorer();
        await driverFirefox.sleepTime(wait5sec);
    });

    it("Should Default profile visible in USS", async () => {
        await driverFirefox.clickOnDatasetsTab();
        await driverFirefox.clickOnUssTab();
        const ussProfile = await driverFirefox.getUssDefaultProfilename();
        expect(ussProfile).to.equal("DefaultProfile");
    });

    it("Should Default profile visible in JOBS", async () => {
        await driverFirefox.clickOnUssTabs();
        await driverFirefox.clickOnJobsTab();
        const jobsProfile = await driverFirefox.getJobsDefaultProfilename();
        expect(jobsProfile).to.equal("DefaultProfile");
    });

    after(async () => driverFirefox.closeBrowser());
});

describe("Add Existing Profiles in USS and JOBS", () => {
    before(async () => {
        await driverFirefox.openBrowser();
        await driverFirefox.sleepTime(SHORTSLEEPTIME);
        await driverFirefox.OpenTheiaInFirefox();
        await driverFirefox.sleepTime(SLEEPTIME);
        await driverFirefox.clickOnZoweExplorer();
        await driverFirefox.sleepTime(wait5sec);
    });

    it("Should Add Existing Profile in USS", async () => {
        await driverFirefox.clickOnDatasetsTab();
        await driverFirefox.clickOnUssTab();
        await driverFirefox.clickOnUssPanel();
        await driverFirefox.clickOnAddSessionInUss();
        await driverFirefox.addProfileDetailsInUss("TestSeleniumProfile");
        const ussProfile = await driverFirefox.getUssProfilename();
        expect(ussProfile).to.equal("TestSeleniumProfile");
    });

    it("Should Add Existing Profile in JOBS", async () => {
        await driverFirefox.clickOnUssTabs();
        await driverFirefox.clickOnJobsTab();
        await driverFirefox.clickOnJobsPanel();
        await driverFirefox.clickOnAddSessionInJobs();
        await driverFirefox.addProfileDetailsInJobs("TestSeleniumProfile");
        const jobsProfile = await driverFirefox.getJobsProfilename();
        expect(jobsProfile).to.equal("TestSeleniumProfile");
    });

    after(async () => driverFirefox.closeBrowser());
});

describe("Add Profile to Favorites", () => {
    before(async () => {
        await driverChrome.openBrowser();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.OpenTheiaInChrome();
        await driverChrome.sleepTime(SLEEPTIME);
        await driverChrome.clickOnZoweExplorer();
    });

    it("Should Add Profile to Favorites under DATASETS", async () => {
        await driverChrome.addProfileToFavoritesInDatasets();
        await driverChrome.clickOnFavoriteTabInDatasets();
        const favoriteProfile = await driverChrome.getFavoritePrfileNameFromDatasets();
        expect(favoriteProfile).to.equal("TestSeleniumProfile");
    });

    it("Should Add Profile to Favorites under USS", async () => {
        await driverChrome.clickOnDatasetsTab();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.addProfileToFavoritesInUss();
        await driverChrome.clickOnFavoriteTabInUss();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const favoriteProfile = await driverChrome.getFavoritePrfileNameFromUss();
        expect(favoriteProfile).to.equal("TestSeleniumProfile");
    });

    it("Should Add Profile to Favorites under JOBS", async () => {
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnJobsTab();
        await driverChrome.addProfileToFavoritesInJobs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnFavoriteTabInJobs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const favoriteProfile = await driverChrome.getFavoritePrfileNameFromJobs();
        expect(favoriteProfile).to.equal("TestSeleniumProfile");
    });

    after(async () => driverChrome.closeBrowser());
});

describe("Remove Profile from Favorites", () => {
    before(async () => {
        await driverChrome.openBrowser();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.OpenTheiaInChrome();
        await driverChrome.sleepTime(SLEEPTIME);
        await driverChrome.clickOnZoweExplorer();
    });

    it("Should Remove Profile from Favorites under DATA SETS", async () => {
        await driverChrome.clickOnFavoriteTabInDatasets();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.removeFavoriteProfileFromDatasets();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const favoriteProfile = await driverChrome.verifyRemovedFavoriteProfileInDatasets();
        expect(favoriteProfile).to.equal(true);
    });

    it("Should Remove Profile from Favorites under USS", async () => {
        await driverChrome.clickOnDatasetsTab();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnFavoriteTabInUss();
        await driverChrome.removeFavoriteProfileFromUss();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const favoriteProfile = await driverChrome.verifyRemovedFavoriteProfileInUss();
        expect(favoriteProfile).to.equal(true);
    });

    it("Should Remove Profile from Favorites under JOBS", async () => {
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnJobsTab();
        await driverChrome.clickOnFavoriteTabInJobs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.removeFavoriteProfileFromJobs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const favoriteProfile = await driverChrome.verifyRemovedFavoriteProfileInDatasets();
        expect(favoriteProfile).to.equal(true);
    });

    after(async () => driverChrome.closeBrowser());
});

describe("Hide Profiles", () => {
    before(async () => {
        await driverChrome.openBrowser();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.OpenTheiaInChrome();
        await driverChrome.sleepTime(SLEEPTIME);
        await driverChrome.clickOnZoweExplorer();
    });

    it("Should Hide Profile from USS", async () => {
        await driverChrome.clickOnDatasetsTab();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.hideProfileInUss();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const hiddenProfile = await driverChrome.verifyProfileIsHideInUss();
        expect(hiddenProfile).to.equal(true);
    });
    it("Should Hide Profile from JOBS", async () => {
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnJobsTab();
        await driverChrome.hideProfileInJobs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const hiddenProfile = await driverChrome.verifyProfileIsHideInJobs();
        expect(hiddenProfile).to.equal(true);
    });

    after(async () => driverChrome.closeBrowser());
});

describe("Delete Profiles", () => {
    before(async () => {
        await driverChrome.openBrowser();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.OpenTheiaInChrome();
        await driverChrome.sleepTime(SLEEPTIME);
        await driverChrome.clickOnZoweExplorer();
    });

    it("Should Delete Default Profile from DATA SETS", async () => {
        const deleteConfrmationMsg = await driverChrome.deleteDefaultProfileInDatasets();
        expect(deleteConfrmationMsg).to.equal("Profile DefaultProfile was deleted.");
    });

    it("Should Delete Profile from DATA SETS", async () => {
        await driverChrome.closeNotificationMessage();
        const deleteConfrmationMsg = await driverChrome.deleteProfileInDatasets();
        expect(deleteConfrmationMsg).to.equal("Profile TestSeleniumProfile was deleted.");
    });

    it("Should Default Profile deleted from USS", async () => {
        await driverChrome.clickOnDatasetsTab();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const deletedDefaultProfile = await driverChrome.verifyRemovedDefaultProfileInUss();
        expect(deletedDefaultProfile).to.equal(true);
    });

    it("Should Default Profile deleted from JOBS", async () => {
        await driverChrome.clickOnUssTabs();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        await driverChrome.clickOnJobsTab();
        await driverChrome.sleepTime(SHORTSLEEPTIME);
        const deletedDefaultProfile = await driverChrome.verifyRemovedDefaultProfileInJobs();
        expect(deletedDefaultProfile).to.equal(true);
    });

    after(async () => driverChrome.closeBrowser());
});
