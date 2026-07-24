import { test as __TEST__, expect } from "@playwright/test";
import { html, signal, task } from "#aspen";
import { mountFrom } from "./utils.js";

const mount = (page, component) =>
  mountFrom("rendering.spec.js", page, component);

export function InputWithReset() {
  const $value = signal("");

  return html`
    <input
      value=${$value.val}
      placeholder="Search"
      oninput=${(e) => ($value.val = e.target.value)}
    />
    <button onclick=${() => ($value.val = undefined)}>Reset</button>
  `;
}

__TEST__(
  "Undefined input value on rererender is rendered as empty string",
  async ({ page }) => {
    await mount(page, InputWithReset);

    const input = page.getByPlaceholder("Search");
    const reset = page.getByText("Reset");

    await input.fill("hello world");

    await expect(input).toHaveAttribute("value", "hello world");
    await reset.click();

    expect(await input.getAttribute("value")).toBe(null);
    await expect(input).toHaveValue("");
  },
);
