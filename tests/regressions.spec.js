import { test as __TEST__, expect } from "@playwright/test";
import { html, signal, task } from "#aspen";
import { mountFrom } from "./utils.js";

const mount = (page, component) =>
  mountFrom("regressions.spec.js", page, component);

export function InputWithResetBttn() {
  const $resets = signal(0);
  const $text = signal("");

  // NOTE: using a task to sync one signal with another like this is generally
  // an anti-pattern, but here it provides a helpful test-case
  task(() => {
    if ($resets.val > 0) {
      $text.val = "";
    }
  });

  return html`
    <input
      placeholder="Your text here"
      value=${$text.val}
      oninput=${(e) => ($text.val = e.target.value)}
    />
    <button
      onclick=${() => {
        console.log("resetting text");
        $resets.val++;
      }}
    >
      X
    </button>
    <span>(input was reset ${$resets.val} times)</span>
  `;
}

__TEST__(
  "Updating a signal from a task doesn't cause extra listeners to be attached",
  async ({ page }) => {
    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));

    await mount(page, InputWithResetBttn);

    const button = page.getByText("X");
    const input = page.getByPlaceholder("Your text here");

    await input.fill("hello world");

    expect(await input.getAttribute("value")).toBe("hello world");

    await button.click();
    await input.fill("hello");

    await button.click();
    await input.fill("hola");

    await button.click();

    expect(logs.filter((message) => message === "resetting text").length).toBe(
      3,
    );
  },
);

export function DoubleCounter() {
  const $count = signal(0);

  task(() => {
    $count.val++;
  });

  return html`
    <div>count: ${$count.val}</div>
    <button onclick=${() => $count.val++}>↑</button>
    <button onclick=${() => $count.val--}>↓</button>
  `;
}

__TEST__(
  "Cannot decrement counter with a task that increments the count",
  async ({ page }) => {
    await mount(page, DoubleCounter);

    const count = page.getByText("count:");

    const increment = page.getByText("↑");
    const decrement = page.getByText("↓");

    await increment.click();
    await increment.click();

    await expect(count).toContainText("count: 5");

    await decrement.click();
    await expect(count).toContainText("count: 5");

    await decrement.click();
    await expect(count).toContainText("count: 5");

    await decrement.click();
    await expect(count).toContainText("count: 5");
  },
);
