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

test("CAN INCREMENT AND DECREMENT A COUNTER", async ({ page }) => {
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
      // TODO: Keys should be able to contain spaces
      (section, i) => html(section.title.replaceAll(" ", "-"))`
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

test("CAN TOGGLE ACCORDION ITEMS", async ({ page }) => {
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
});
