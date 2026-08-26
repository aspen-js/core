import { test as __TEST__, expect } from "@playwright/test";
import { html, signal, task } from "#aspen";
import { mountFrom } from "./utils.js";

const mount = (page, component) =>
  mountFrom("regressions.spec.js", page, component);

export function InputWithResetBttn() {
  const $resets = signal(0);
  const $text = signal("");

  // NOTE: using a task to sync one signal with another like this is generally
  // an anti-pattern, but here it provides a helpful test case
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

export function JsonLogger() {
  const $count = signal({ count: 0 });

  task(() => {
    console.log("state:", JSON.stringify($count.val, null, 2));
  });

  return html`<button onclick=${() => $count.val.count++}>
    count: ${$count.val.count}
  </button>`;
}

__TEST__(
  "Stringifying an object in a task doesn't cause extra task runs",
  async ({ page }) => {
    await mount(page, JsonLogger);

    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));

    const button = page.getByText("count:");

    await button.click();
    await button.click();
    await button.click();

    expect(button).toContainText("count: 3");
    expect(logs.filter((log) => log.startsWith("state:")).length).toBe(3);
  },
);

export * as CounterWithChildren from "../tests/fixtures/counter-with-children.js";
export * as Greeting from "../tests/fixtures/greeting.js";

export function CounterWithReversibleLayout() {
  const $reverse = signal(false);

  return html`
    <CounterWithChildren reverse=${$reverse.val}>
      <Greeting />
    </CounterWithChildren>
    <button onClick=${() => ($reverse.val = !$reverse.val)}>Reverse</button>
  `;
}

__TEST__(
  "Components are available when re-rendering children",
  async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error));

    await mount(page, CounterWithReversibleLayout);

    const elements = page.locator("#count-bttn, #greeting");
    const reverse = page.getByText("Reverse");
    const increment = page.getByText("count:");

    await expect(elements).toHaveText(["count: 0", "hello world"]);

    await reverse.click();

    await expect(elements).toHaveText(["hello world", "count: 0"], {
      timeout: 500,
    });

    await increment.click();
    await increment.click();
    await increment.click();

    await expect(increment).toHaveText("count: 3");

    expect(errors.length).toBe(0);
  },
);

export function ProfileCard({ name, pic }) {
  console.log("[ProfileCard] rendering...");

  return html`
    <div>${name}</div>
    <img src=${pic} alt=${`${name}'s profile pic`} />
  `;
}

const profiles = [
  { name: "Joe", pic: "example.com/a132rasdfa.png" },
  { name: "Sally", pic: "example.com/alijuwisfdlj.png" },
  { name: "Bob", pic: "/example.com/fafasdfjljas.png" },
];

export function ProfileToggle() {
  const $index = signal(0);

  return html`
    <ProfileCard
      name=${profiles[$index.val].name}
      pic=${profiles[$index.val].pic}
    />
    <button
      onClick=${() =>
        ($index.val = $index.val >= profiles.length - 1 ? 0 : $index.val + 1)}
    >
      Change profile
    </button>
  `;
}

__TEST__(
  "Multiple prop changes in a single cycle don't trigger multiple component renders",
  async ({ page }) => {
    const logs = [];
    page.on("console", (msg) => logs.push(msg.text()));

    await mount(page, ProfileToggle);

    const toggle = page.getByText("Change profile");

    await toggle.click();
    await toggle.click();

    expect(
      logs.filter((log) => log === "[ProfileCard] rendering...").length,
    ).toBe(3);

    await expect(page.getByText("Bob")).toBeVisible();
  },
);
