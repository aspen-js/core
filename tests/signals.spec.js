import { test, expect } from "@playwright/test";
import { html, signal } from "#aspen";
import { mountFrom } from "./utils.js";

const mount = (page, component) =>
  mountFrom("signals.spec.js", page, component);

export function Counter() {
  const $count = signal(0);

  return html`
    <div>count: ${$count.val}</div>
    <button onClick=${() => $count.val++}>↑</button>
    <button onClick=${() => $count.val--}>↓</button>
  `;
}

test("Can increment and decrement a counter", async ({ page }) => {
  await mount(page, Counter);

  const increment = page.getByText("↑");
  const decrement = page.getByText("↓");
  const count = page.getByText("count: ");

  await expect(count).toBeVisible();

  for (const _ of Array(5)) {
    await increment.click();
  }

  await decrement.click();

  await increment.click();
  await increment.click();

  for (const _ of Array(8)) {
    await decrement.click();
  }

  await expect(count).toContainText("count: -2");
});
