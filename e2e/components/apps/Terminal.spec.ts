import { expect, test } from "@playwright/test";
import directory from "contexts/process/directory";
import { ROOT_PUBLIC_TEST_FILE, TERMINAL_BASE_CD } from "e2e/constants";
import {
  captureConsoleLogs,
  didCaptureConsoleLogs,
  disableWallpaper,
  sendKeyToTerminal,
  sendTextToTerminal,
  sendToTerminal,
  sheepIsVisible,
  terminalDirectoryMatchesPublicFolder,
  terminalDoesNotHaveText,
  terminalFileMatchesPublicFile,
  terminalHasRows,
  terminalHasText,
  windowIsHidden,
  windowTitlebarTextIsVisible,
  windowsAreVisible,
} from "e2e/functions";

test.beforeEach(captureConsoleLogs);
test.beforeEach(disableWallpaper);
test.beforeEach(async ({ page }) => page.goto("/?app=Terminal"));
test.beforeEach(windowsAreVisible);
test.beforeEach(terminalHasRows);

test.describe("has file system access", () => {
  test.describe("has current directory", () => {
    test("default base", async ({ page }) => {
      await terminalHasText({ page }, `${TERMINAL_BASE_CD}>`, 1, true);
      await sendToTerminal({ page }, "pwd");
      await terminalHasText({ page }, TERMINAL_BASE_CD, 3);
    });

    test("can change", async ({ page }) => {
      await sendToTerminal({ page }, "cd /");
      await terminalHasText({ page }, "/>", 1, true);
    });
  });

  test.describe("can read", () => {
    test.describe("file", () => {
      test("contents", async ({ page }) => {
        const testFile = `${TERMINAL_BASE_CD}/desktop.ini`;

        await sendToTerminal({ page }, `type ${testFile}`);
        await terminalFileMatchesPublicFile({ page }, testFile);
      });

      test("mime type", async ({ page }) => {
        const testFile = "sitemap.xml";

        await sendToTerminal({ page }, `file /${testFile}`);
        await terminalHasText({ page }, `/${testFile}: application/xml`);
      });
    });

    test.describe("folder", () => {
      test("has base directory", async ({ page }) =>
        terminalDirectoryMatchesPublicFolder({ page }, TERMINAL_BASE_CD));

      test("has 'Program Files'", async ({ page }) =>
        terminalDirectoryMatchesPublicFolder({ page }, "/Program Files"));

      test("has 'System'", async ({ page }) =>
        terminalDirectoryMatchesPublicFolder({ page }, "/System"));

      test("has 'Users'", async ({ page }) =>
        terminalDirectoryMatchesPublicFolder({ page }, "/Users"));
    });
  });

  test.describe("can create", () => {
    test("file", async ({ page }) => {
      const testFileName = "test.txt";

      await sendToTerminal({ page }, `touch ${testFileName}`);

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, `0 ${testFileName}`);

      await sendToTerminal({ page }, `ls ${testFileName}`);
      await terminalDoesNotHaveText({ page }, "File Not Found");
    });

    test("folder", async ({ page }) => {
      const testFolderName = "test_folder";

      await sendToTerminal({ page }, `md ${testFolderName}`);

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, `<DIR>         ${testFolderName}`);

      await sendToTerminal({ page }, `cd ${testFolderName}`);
      await terminalHasText(
        { page },
        `${TERMINAL_BASE_CD}/${testFolderName}>`,
        1,
        true
      );
    });
  });

  test.describe("can copy", () => {
    test("file", async ({ page }) => {
      const testFile = ROOT_PUBLIC_TEST_FILE;
      const newTestFile = "test.ini";

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, testFile);

      await sendToTerminal({ page }, `copy ${testFile} ${newTestFile}`);
      await sendToTerminal({ page }, "clear");

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, testFile);
      await terminalHasText({ page }, newTestFile);
    });
  });

  test.describe("can delete", () => {
    test("file", async ({ page }) => {
      const testFile = ROOT_PUBLIC_TEST_FILE;

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, testFile);

      await sendToTerminal({ page }, `del ${testFile}`);
      await sendToTerminal({ page }, "clear");

      await sendToTerminal({ page }, "ls");
      await terminalDoesNotHaveText({ page }, testFile);
    });

    test("folder", async ({ page }) => {
      const testFolder = "Music";

      await sendToTerminal({ page }, "ls");
      await terminalHasText({ page }, testFolder);

      await sendToTerminal({ page }, `rd ${testFolder}`);
      await sendToTerminal({ page }, "clear");

      await sendToTerminal({ page }, "ls");
      await terminalDoesNotHaveText({ page }, testFolder);
    });
  });

  test.describe("can find", () => {
    test("existing file", async ({ page }) => {
      await sendToTerminal({ page }, "find credit");
      await terminalHasText({ page }, "/CREDITS.md");
    });

    test("new file", async ({ page }) => {
      const testFile = "abc123.txt";

      await sendToTerminal({ page }, `find ${testFile}`);
      await terminalDoesNotHaveText({ page }, `/Users/Public/${testFile}`);

      await sendToTerminal({ page }, `touch ${testFile}`);
      await sendToTerminal({ page }, `find ${testFile}`);
      await terminalHasText({ page }, `/Users/Public/${testFile}`);
    });

    test("folder", async ({ page }) => {
      await sendToTerminal({ page }, "find document");
      await terminalHasText(
        { page },
        "/Users/Public/Documents",
        1,
        false,
        true
      );
    });
  });
});

test.describe("has commands", () => {
  test("echo & clear", async ({ page }) => {
    await sendToTerminal({ page }, "echo hi");
    await terminalHasText({ page }, "hi", 2);

    await sendToTerminal({ page }, "clear");
    await terminalDoesNotHaveText({ page }, "hi");
  });

  test("color", async ({ page }) => {
    await sendToTerminal({ page }, "color E3");
    await terminalHasText({ page }, "Background: Light Yellow");
    await terminalHasText({ page }, "Foreground: Aqua");
  });

  test("exit", async ({ page }) => {
    await sendToTerminal({ page }, "exit");
    await windowIsHidden({ page });
  });

  test("ipconfig", async ({ page }) => {
    await sendToTerminal({ page }, "ipconfig");
    await terminalHasText({ page }, "IPv4 Address");
  });

  test("history", async ({ page }) => {
    await sendToTerminal({ page }, "history");
    await terminalHasText({ page }, "1 history");
  });

  test("neofetch", async ({ page }) => {
    await sendToTerminal({ page }, "neofetch");
    await terminalHasText(
      { page },
      `Packages: ${Object.keys(directory).length}`
    );
  });

  test("nslookup", async ({ page }) => {
    await sendToTerminal({ page }, "nslookup dustinbrett.com");
    await terminalHasText({ page }, "Server:  cloudflare-dns.com");
    await terminalHasText({ page }, "Address:  1.1.1.1");
    await terminalHasText({ page }, "Name:    dustinbrett.com");
  });

  test("sheep", async ({ page }) => {
    await sendToTerminal({ page }, "sheep");
    await sheepIsVisible({ page });
  });

  test("shutdown", async ({ page }) => {
    let pageLoaded = false;

    page.once("load", () => {
      pageLoaded = true;
    });

    expect(pageLoaded).toBeFalsy();

    await sendToTerminal({ page }, "shutdown");
    await expect(() => expect(pageLoaded).toBeTruthy()).toPass();
  });

  test("taskkill", async ({ page }) => {
    await sendToTerminal({ page }, "taskkill Terminal");
    await windowIsHidden({ page });
  });

  test("tasklist", async ({ page }) => {
    await sendToTerminal({ page }, "tasklist");
    await terminalHasText({ page }, "Terminal", -1);
  });

  test("title", async ({ page }) => {
    const testTitle = "Testing";

    await sendToTerminal({ page }, `title ${testTitle}`);
    await windowTitlebarTextIsVisible(testTitle, { page });
  });

  test("time", async ({ page }) => {
    await sendToTerminal({ page }, "time");
    await terminalHasText(
      { page },
      /The current time is: ([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{2}/
    );
  });

  test("date", async ({ page }) => {
    await sendToTerminal({ page }, "date");
    await terminalHasText({ page }, /The current date is: \d{4}-\d{2}-\d{2}/);
  });

  test("uptime", async ({ page }) => {
    await sendToTerminal({ page }, "uptime");
    await terminalHasText({ page }, /Uptime: \d+ second(s)?/);
  });
});

test.describe("has tab completion", () => {
  test("can see file/folder list", async ({ page }) => {
    await sendTextToTerminal({ page }, "d");
    await sendKeyToTerminal({ page }, "Tab");

    await terminalHasText({ page }, "Documents");
    await terminalHasText({ page }, ROOT_PUBLIC_TEST_FILE);
  });

  test("can complete folder name", async ({ page }) => {
    await sendTextToTerminal({ page }, "Vi");
    await sendKeyToTerminal({ page }, "Tab");

    await terminalHasText({ page }, "Videos", 1, true);
  });

  test("can complete command name", async ({ page }) => {
    await sendTextToTerminal({ page }, "he");
    await sendKeyToTerminal({ page }, "Tab");

    await terminalHasText({ page }, "help", 1, true);
  });
});

test.afterEach(didCaptureConsoleLogs);
