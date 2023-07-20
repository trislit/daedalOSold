import type { Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  BACKGROUND_CANVAS_SELECTOR,
  CLOCK_REGEX,
  CONTEXT_MENU_SELECTOR,
  DESKTOP_ENTRIES_SELECTOR,
  DESKTOP_SELECTOR,
  FILE_EXPLORER_ENTRIES_SELECTOR,
  SHEEP_SELECTOR,
  START_BUTTON_SELECTOR,
  START_MENU_SELECTOR,
  TASKBAR_ENTRIES_SELECTOR,
  TASKBAR_SELECTOR,
  WINDOW_SELECTOR,
  WINDOW_TITLEBAR_SELECTOR,
} from "e2e/constants";

type TestProps = {
  page: Page;
};

export const disableOffscreenCanvas = (): void => {
  delete (window as Partial<Window & typeof globalThis>).OffscreenCanvas;
};

// action
export const loadApp = async ({ page }: TestProps): Promise<Response | null> =>
  page.goto("/");

// locator->first->action
export const clickFirstDesktopEntry = async ({
  page,
}: TestProps): Promise<void> =>
  page.locator(DESKTOP_ENTRIES_SELECTOR).first().click();

// locator->action
export const clickDesktop = async ({ page }: TestProps): Promise<void> =>
  page.locator(DESKTOP_SELECTOR).click();

export const clickStartButton = async ({ page }: TestProps): Promise<void> =>
  page.locator(START_BUTTON_SELECTOR).click();

export const focusOnWindow = async ({ page }: TestProps): Promise<void> =>
  page.locator(WINDOW_SELECTOR).focus();

// locator->getByLabel->action
export const clickClock = async (
  { page }: TestProps,
  clickCount = 1
): Promise<void> =>
  page
    .locator(TASKBAR_SELECTOR)
    .getByLabel(/^Clock$/)
    .click({ clickCount });

export const clickCloseWindow = async ({ page }: TestProps): Promise<void> =>
  page
    .locator(WINDOW_TITLEBAR_SELECTOR)
    .getByLabel(/^Close$/)
    .click();

export const clickMaximizeWindow = async ({ page }: TestProps): Promise<void> =>
  page
    .locator(WINDOW_TITLEBAR_SELECTOR)
    .getByLabel(/^Maximize$/)
    .click();

export const clickMinimizeWindow = async ({ page }: TestProps): Promise<void> =>
  page
    .locator(WINDOW_TITLEBAR_SELECTOR)
    .getByLabel(/^Minimize$/)
    .click();

// Q: Is this even needed?
export const windowAnimationIsFinished = async ({
  page,
}: TestProps): Promise<Animation[]> =>
  page
    .locator(WINDOW_SELECTOR)
    .evaluate((element) =>
      Promise.all(element.getAnimations().map(({ finished }) => finished))
    );

// expect->waitForFunction (Q: Could these be a poll/eval?)
export const backgroundIsUrl = async ({ page }: TestProps): Promise<void> =>
  expect(
    await page.waitForFunction(() =>
      window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("background-image")
        .match(/^url\(.*?\)$/)
    )
  ).toBeTruthy();

export const windowIsMaximized = async ({ page }: TestProps): Promise<void> =>
  expect(
    await page.waitForFunction(
      ([windowSelector, taskbarSelector]: string[]) =>
        window.innerWidth ===
          (document.querySelector(windowSelector) as HTMLElement)
            ?.clientWidth &&
        window.innerHeight -
          ((document.querySelector(taskbarSelector) as HTMLElement)
            ?.clientHeight || 0) ===
          (document.querySelector(windowSelector) as HTMLElement)?.clientHeight,
      [WINDOW_SELECTOR, TASKBAR_SELECTOR]
    )
  ).toBeTruthy();

// expect->locator->getBy
export const calendarIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(DESKTOP_SELECTOR).getByLabel(/^Calendar$/)).toBeVisible();

export const clockIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(TASKBAR_SELECTOR).getByLabel(/^Clock$/)).toBeVisible();

export const desktopEntryIsHidden = async (
  label: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(page.locator(DESKTOP_ENTRIES_SELECTOR).getByLabel(label)).toBeHidden();

export const desktopEntryIsVisible = async (
  label: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    page.locator(DESKTOP_ENTRIES_SELECTOR).getByLabel(label)
  ).toBeVisible();

export const fileExplorerEntryIsHidden = async (
  label: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    page.locator(FILE_EXPLORER_ENTRIES_SELECTOR).getByLabel(label)
  ).toBeHidden();

export const fileExplorerEntryIsVisible = async (
  label: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    page.locator(FILE_EXPLORER_ENTRIES_SELECTOR).getByLabel(label)
  ).toBeVisible();

export const taskbarEntryIsVisible = async (
  label: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    page.locator(TASKBAR_ENTRIES_SELECTOR).getByLabel(label)
  ).toBeVisible();

export const windowTitlebarTextIsVisible = async (
  text: string,
  { page }: TestProps
): Promise<void> =>
  expect(page.locator(WINDOW_TITLEBAR_SELECTOR).getByText(text)).toBeVisible();

// expect->locator->getBy->getBy
export const clockTextIsHidden = async ({ page }: TestProps): Promise<void> =>
  expect(
    page
      .locator(TASKBAR_SELECTOR)
      .getByLabel(/^Clock$/)
      .getByText(CLOCK_REGEX)
  ).toBeHidden();

export const clockTextIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(
    page
      .locator(TASKBAR_SELECTOR)
      .getByLabel(/^Clock$/)
      .getByText(CLOCK_REGEX)
  ).toBeVisible();

// expect->locator->getBy->getAttr
export const taskbarEntryHasTooltip = async (
  label: RegExp,
  title: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    await page
      .locator(TASKBAR_ENTRIES_SELECTOR)
      .getByLabel(label)
      .getAttribute("title")
  ).toMatch(title);

// expect->locator->getBy->locator
export const clockCanvasIsHidden = async ({ page }: TestProps): Promise<void> =>
  expect(
    page
      .locator(TASKBAR_SELECTOR)
      .getByLabel(/^Clock$/)
      .locator("canvas")
  ).toBeHidden();

export const clockCanvasIsVisible = async ({
  page,
}: TestProps): Promise<void> =>
  expect(
    page
      .locator(TASKBAR_SELECTOR)
      .getByLabel(/^Clock$/)
      .locator("canvas")
  ).toBeVisible();

export const taskbarEntryHasIcon = async (
  label: RegExp,
  src: RegExp,
  { page }: TestProps
): Promise<void> =>
  expect(
    page.locator(TASKBAR_ENTRIES_SELECTOR).getByLabel(label).locator("img")
  ).toHaveAttribute("src", src);

// expect->poll_count->locator_first
export const desktopFileEntriesAreVisible = async ({
  page,
}: TestProps): Promise<void> => {
  const desktopEntries = page.locator(DESKTOP_ENTRIES_SELECTOR);

  await expect.poll(async () => desktopEntries.count()).toBeGreaterThan(0);
  await expect(desktopEntries.first()).toBeVisible();
};

export const fileExplorerFileEntriesAreVisible = async ({
  page,
}: TestProps): Promise<void> => {
  const fileExplorerEntries = page.locator(FILE_EXPLORER_ENTRIES_SELECTOR);

  await expect.poll(async () => fileExplorerEntries.count()).toBeGreaterThan(0);
  await expect(fileExplorerEntries.first()).toBeVisible();
};

export const taskbarEntriesAreVisible = async ({
  page,
}: TestProps): Promise<void> => {
  const taskbarEntries = page.locator(TASKBAR_ENTRIES_SELECTOR);

  await expect.poll(async () => taskbarEntries.count()).toBeGreaterThan(0);
  await expect(taskbarEntries.first()).toBeVisible();
};

// expect->locator
export const canvasBackgroundIsHidden = async ({
  page,
}: TestProps): Promise<void> =>
  expect(page.locator(BACKGROUND_CANVAS_SELECTOR)).toBeHidden();

export const canvasBackgroundIsVisible = async ({
  page,
}: TestProps): Promise<void> =>
  expect(page.locator(BACKGROUND_CANVAS_SELECTOR)).toBeVisible();

export const contextMenuIsVisible = async ({
  page,
}: TestProps): Promise<void> =>
  expect(page.locator(CONTEXT_MENU_SELECTOR)).toBeVisible();

export const desktopIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(DESKTOP_SELECTOR)).toBeVisible();

export const sheepIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(SHEEP_SELECTOR)).toBeVisible();

export const startButtonIsVisible = async ({
  page,
}: TestProps): Promise<void> =>
  expect(page.locator(START_BUTTON_SELECTOR)).toBeVisible();

export const startMenuIsHidden = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(START_MENU_SELECTOR)).toBeHidden();

export const startMenuIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(START_MENU_SELECTOR)).toBeVisible();

export const taskbarIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(TASKBAR_SELECTOR)).toBeVisible();

export const windowIsHidden = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(WINDOW_SELECTOR)).toBeHidden();

export const windowIsVisible = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(WINDOW_SELECTOR)).toBeVisible();

export const windowIsTransparent = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(WINDOW_SELECTOR)).toHaveCSS("opacity", "0");

export const windowIsOpaque = async ({ page }: TestProps): Promise<void> =>
  expect(page.locator(WINDOW_SELECTOR)).toHaveCSS("opacity", "1");

export const windowTitlebarIsVisible = async ({
  page,
}: TestProps): Promise<void> =>
  expect(page.locator(WINDOW_TITLEBAR_SELECTOR)).toBeVisible();
