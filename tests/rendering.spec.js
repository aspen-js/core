import { test as __TEST__, expect } from "@playwright/test";
import { html, signal } from "#aspen";
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

const threeLaws = [
  {
    title: "First law",
    body: "A body at rest tends to remain at rest and a body in motion tends to remain in motion.",
  },
  {
    title: "Second law",
    body: "Force equals mass times acceleration.",
  },
  {
    title: "Third law",
    body: "For every action there is an equal and opposite reaction.",
  },
];

export const ThreeLaws = () => html`<Accordion sections=${threeLaws} />`;

export function Accordion({ sections }) {
  const $expanded = signal(0);

  return html`
    ${sections.map(
      (section, i) => html(section.title)`
        <h2
          style="cursor: pointer;"
          onclick=${() => {
            if ($expanded.v === i) {
              $expanded.v = undefined;
            } else {
              $expanded.v = i;
            }
          }}
        >
          ${$expanded.v === i ? "-" : "+"} ${section.title}
        </h2>
        ${$expanded.v === i ? html`<p>${section.body}</p>` : undefined}
      `,
    )}
  `;
}

__TEST__(
  "Can toggle accordion items by returning undefined for collapsed items",
  async ({ page }) => {
    await mount(page, ThreeLaws);

    const heading1 = page.getByText(threeLaws[0].title);
    const law1 = page.getByText(threeLaws[0].body);

    const heading2 = page.getByText(threeLaws[1].title);
    const law2 = page.getByText(threeLaws[1].body);

    const heading3 = page.getByText(threeLaws[2].title);
    const law3 = page.getByText(threeLaws[2].body);

    await expect(heading1).toBeVisible();
    heading1.click();

    await expect(law1).toBeVisible();
    await expect(law2).not.toBeVisible();
    await expect(law3).not.toBeVisible();

    await expect(heading2).toBeVisible();
    heading2.click();

    await expect(law1).not.toBeVisible();
    await expect(law2).toBeVisible();
    await expect(law3).not.toBeVisible();

    await expect(heading3).toBeVisible();
    heading3.click();

    await expect(law1).not.toBeVisible();
    await expect(law2).not.toBeVisible();
    await expect(law3).toBeVisible();

    heading3.click();

    await expect(law1).not.toBeVisible();
    await expect(law2).not.toBeVisible();
    await expect(law3).not.toBeVisible();
  },
);
