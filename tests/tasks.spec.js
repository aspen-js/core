import { test, expect } from "@playwright/test";

import { html, signal, task } from "#aspen";

import { mountFrom } from "./utils.js";

const mount = (page, component) => mountFrom("tasks.spec.js", page, component);

export function DoubleCounter() {
  const $count = signal(0);

  task(() => {
    $count.val++;
  });

  return html`
    <button onclick=${() => $count.val++}>count: ${$count.val}</button>
  `;
}

test("ACCESSING AND UPDATING A SIGNAL VALUE FROM INSIDE A TASK DOESN'T CAUSE INFINITE RECURSION", async ({
  page,
}) => {
  await mount(page, DoubleCounter);

  const button = page.getByText("count: 1");
  await expect(button).toBeVisible();

  await button.click();
  await expect(page.getByText("count: 3")).toBeVisible();
});

export function ClickLogger() {
  const $clicks = signal(0);

  console.log("Rendering ClickLogger");

  task(() => {
    console.log(`You clicked ${$clicks.val} times`);
  });

  return html`<button onclick=${() => $clicks.val++}>Click me!</button>`;
}

export function ClickLogger2X() {
  const $clicks = signal(0);

  console.log("Rendering ClickLogger2X");

  task(() => {
    console.log(`You clicked ${$clicks.val} times`);
  });

  task(() => {
    console.log(`In case you missed it, you clicked ${$clicks.val} times!`);
  });

  return html`<button onclick=${() => $clicks.val++}>Click me!</button>`;
}

test("TASKS RERUN EVEN WHEN NOTHING RERENDERS", async ({ page }) => {
  let logs = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await mount(page, ClickLogger);
  const button = page.getByText("Click me!");

  await button.click();
  await button.click();
  await button.click();

  expect(logs.filter((log) => log === "Rendering ClickLogger").length).toBe(1);

  // Clicks + 1 for the task running on mount
  expect(logs.filter((log) => log.startsWith("You clicked")).length).toBe(4);
  expect(logs.findLast((log) => log.startsWith("You clicked"))).toBe(
    "You clicked 3 times",
  );

  logs = [];

  // Tasks must wait for any components to finish rendering before running, but they should
  // not wait if the only other pending operations are other tasks (if a task
  // incorrectly decides to wait then it will never run)
  await mount(page, ClickLogger2X);

  await button.click();
  await button.click();
  await button.click();

  expect(logs.filter((log) => log === "Rendering ClickLogger2X").length).toBe(
    1,
  );

  // Clicks + 1 for the task running on mount
  expect(logs.filter((log) => log.startsWith("You clicked")).length).toBe(4);
  expect(logs.findLast((log) => log.startsWith("You clicked"))).toBe(
    "You clicked 3 times",
  );

  expect(
    logs.filter((log) => log.startsWith("In case you missed it")).length,
  ).toBe(4);
  expect(logs.findLast((log) => log.startsWith("In case you missed it"))).toBe(
    "In case you missed it, you clicked 3 times!",
  );
});

const $count = signal(0);

task(() => {
  console.log("The count is", $count.val);
});

export function Counter() {
  return html`
    <button onclick=${() => $count.val++}>count: ${$count.val}</button>
  `;
}

test("TASKS WORK OUTSIDE COMOPONENTS", async ({ page }) => {
  const logs = [];
  page.on("console", (msg) => logs.push(msg.text()));

  await mount(page, Counter);

  const button = page.getByText("count:");

  await button.click();
  await button.click();
  await button.click();

  await expect(button).toContainText("count: 3");

  // Clicks + 1 for the initial render
  expect(logs.filter((log) => log.startsWith("The count is")).length).toBe(4);
});
