import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const scriptSource = fs.readFileSync(
  path.join(import.meta.dirname, "..", "multiselect-to-combobox.js"),
  "utf-8"
);

// Helper: load fixture and inject script with custom config
async function loadFixture(page, configOverrides = {}) {
  if (Object.keys(configOverrides).length > 0) {
    // Intercept the script request and serve a modified version
    const modifiedScript = scriptSource.replace(
      /const CONFIG = \{[^}]+\};/,
      `const CONFIG = ${JSON.stringify({
        minOptions: 6,
        targetIds: [],
        excludeIds: [],
        pillBg: "",
        pillColor: "",
        pillRemoveColor: "",
        pillRemoveHoverColor: "",
        ...configOverrides,
      })};`
    );
    await page.route("**/multiselect-to-combobox.js", (route) => {
      route.fulfill({ contentType: "application/javascript", body: modifiedScript });
    });
  }

  await page.goto("/test/fixture.html");
}

// ──────────────────────────────────────────────
// Conversion logic
// ──────────────────────────────────────────────

test.describe("conversion rules", () => {
  test("converts groups with >= 6 options by default", async ({ page }) => {
    await loadFixture(page);
    const wrapper = page.locator("#group-a .mscombo-wrapper");
    await expect(wrapper).toBeVisible();
  });

  test("does not convert groups with < 6 options", async ({ page }) => {
    await loadFixture(page);
    const wrapper = page.locator("#group-b .mscombo-wrapper");
    await expect(wrapper).toHaveCount(0);
    // Original checkboxes should still be visible
    const checkboxes = page.locator('#group-b input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);
    await expect(checkboxes.first()).toBeVisible();
  });

  test("targetIds forces conversion below threshold", async ({ page }) => {
    await loadFixture(page, { targetIds: ["group-c-force"] });
    const wrapper = page.locator("#group-c-force .mscombo-wrapper");
    await expect(wrapper).toBeVisible();
  });

  test("excludeIds prevents conversion above threshold", async ({ page }) => {
    await loadFixture(page, { excludeIds: ["group-d-exclude"] });
    const wrapper = page.locator("#group-d-exclude .mscombo-wrapper");
    await expect(wrapper).toHaveCount(0);
    const checkboxes = page.locator('#group-d-exclude input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();
  });

  test("minOptions: 0 converts all groups", async ({ page }) => {
    await loadFixture(page, { minOptions: 0 });
    const wrappers = page.locator(".mscombo-wrapper");
    await expect(wrappers).toHaveCount(4);
  });

  test("does not double-convert groups", async ({ page }) => {
    await loadFixture(page);
    const wrappers = page.locator("#group-a .mscombo-wrapper");
    await expect(wrappers).toHaveCount(1);
  });
});

// ──────────────────────────────────────────────
// UI behavior
// ──────────────────────────────────────────────

test.describe("combobox UI", () => {
  test.beforeEach(async ({ page }) => {
    await loadFixture(page);
  });

  test("shows placeholder when nothing is selected", async ({ page }) => {
    await expect(page.locator("#group-a .mscombo-placeholder")).toHaveText(
      "Select options..."
    );
  });

  test("opens dropdown on click", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    const dropdown = page.locator("#group-a .mscombo-wrapper.open");
    await expect(dropdown).toBeVisible();
  });

  test("closes dropdown on outside click", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await expect(
      page.locator("#group-a .mscombo-wrapper.open")
    ).toBeVisible();
    await page.click("body", { position: { x: 0, y: 0 } });
    await expect(page.locator("#group-a .mscombo-wrapper.open")).toHaveCount(0);
  });

  test("search filters options", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    const search = page.locator("#group-a .mscombo-search");
    await search.fill("delta");
    const options = page.locator("#group-a .mscombo-option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Delta Equipment");
  });

  test("shows no results message for empty search", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-search").fill("zzzzz");
    await expect(page.locator("#group-a .mscombo-no-results")).toHaveText(
      "No results found"
    );
  });
});

// ──────────────────────────────────────────────
// Selection
// ──────────────────────────────────────────────

test.describe("selection", () => {
  test.beforeEach(async ({ page }) => {
    await loadFixture(page);
  });

  test("clicking an option selects it and shows a pill", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-option").first().click();
    const pill = page.locator("#group-a .mscombo-pill");
    await expect(pill).toHaveCount(1);
    await expect(pill).toContainText("Acme Corp");
  });

  test("clicking a selected option deselects it", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    const option = page.locator("#group-a .mscombo-option").first();
    await option.click();
    await expect(page.locator("#group-a .mscombo-pill")).toHaveCount(1);
    await option.click();
    await expect(page.locator("#group-a .mscombo-pill")).toHaveCount(0);
    await expect(page.locator("#group-a .mscombo-placeholder")).toBeVisible();
  });

  test("removing a pill deselects the option", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-option").first().click();
    // Close dropdown to click the pill remove
    await trigger.click();
    await page.locator("#group-a .mscombo-pill-remove").click();
    await expect(page.locator("#group-a .mscombo-pill")).toHaveCount(0);
  });

  test("toggling combobox syncs underlying checkboxes", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-option").first().click();

    const checked = await page.evaluate(() => {
      const cb = document.querySelector(
        '#group-a input[type="checkbox"][value="acme_corp"]'
      );
      return cb.checked;
    });
    expect(checked).toBe(true);
  });

  test("can select multiple options", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    const options = page.locator("#group-a .mscombo-option");
    await options.nth(0).click();
    await options.nth(2).click();
    await options.nth(4).click();
    const pills = page.locator("#group-a .mscombo-pill");
    await expect(pills).toHaveCount(3);
  });
});

// ──────────────────────────────────────────────
// Keyboard navigation
// ──────────────────────────────────────────────

test.describe("keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loadFixture(page);
  });

  test("Enter opens the dropdown from trigger", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("#group-a .mscombo-wrapper.open")
    ).toBeVisible();
  });

  test("Escape closes the dropdown", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#group-a .mscombo-wrapper.open")).toHaveCount(0);
  });

  test("ArrowDown navigates through options", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.keyboard.press("ArrowDown");
    const focused = page.locator("#group-a .mscombo-option.focused");
    await expect(focused).toHaveCount(1);
    await expect(focused).toContainText("Acme Corp");
  });

  test("ArrowDown then Enter selects the focused option", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#group-a .mscombo-pill")).toContainText(
      "Acme Corp"
    );
  });

  test("ArrowDown from trigger opens dropdown", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.locator("#group-a .mscombo-wrapper.open")
    ).toBeVisible();
  });

  test("Tab closes dropdown", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.keyboard.press("Tab");
    await expect(page.locator("#group-a .mscombo-wrapper.open")).toHaveCount(0);
  });
});

// ──────────────────────────────────────────────
// Accessibility
// ──────────────────────────────────────────────

test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await loadFixture(page);
  });

  test("trigger has correct ARIA attributes", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await expect(trigger).toHaveAttribute("role", "combobox");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    await expect(trigger).toHaveAttribute(
      "aria-label",
      "Dealers (10 options)"
    );
  });

  test("aria-expanded updates on open/close", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("listbox has aria-multiselectable", async ({ page }) => {
    const listbox = page.locator('#group-a [role="listbox"]');
    await expect(listbox).toHaveAttribute("aria-multiselectable", "true");
  });

  test("options have correct role and aria-selected", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    const option = page.locator("#group-a .mscombo-option").first();
    await expect(option).toHaveAttribute("role", "option");
    await expect(option).toHaveAttribute("aria-selected", "false");
    await option.click();
    await expect(option).toHaveAttribute("aria-selected", "true");
  });

  test("pill remove buttons are keyboard accessible", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-option").first().click();
    await trigger.click(); // close dropdown

    const remove = page.locator("#group-a .mscombo-pill-remove");
    await expect(remove).toHaveAttribute("role", "button");
    await expect(remove).toHaveAttribute("tabindex", "0");
    await expect(remove).toHaveAttribute("aria-label", /Remove/);
  });

  test("live region announces selections", async ({ page }) => {
    const trigger = page.locator("#group-a .mscombo-trigger");
    await trigger.click();
    await page.locator("#group-a .mscombo-option").first().click();

    const liveRegion = page.locator('#group-a [aria-live="polite"]');
    await expect(liveRegion).toContainText("Acme Corp selected");
  });

  test("original checkboxes are hidden but present", async ({ page }) => {
    const hiddenOptions = page.locator("#group-a .mscombo-hidden");
    await expect(hiddenOptions).toHaveCount(1);
    const checkboxes = page.locator('#group-a input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(10);
  });
});
