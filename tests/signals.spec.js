import { test as __TEST__, expect } from "@playwright/test";
import { html, signal, task } from "#aspen";
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

__TEST__("Can increment and decrement a counter", async ({ page }) => {
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

export function Name({ $user }) {
  console.log("[Name] rendering");

  return html`
    <input
      placeholder="Name"
      value=${$user.val.name}
      oninput=${(e) => ($user.val.name = e.target.value)}
    />
  `;
}

export function Password({ $user }) {
  console.log("[Password] rendering");

  return html`
    <input
      placeholder="Password"
      value=${$user.val.password}
      oninput=${(e) => ($user.val.password = e.target.value)}
    />
  `;
}

export function Email({ $user }) {
  console.log("[Email] rendering");

  return html`<input
    placeholder="Email"
    type="email"
    value=${$user.val.contact.email}
    oninput=${(e) => ($user.val.contact.email = e.target.value)}
  />`;
}

export function Phone({ $user }) {
  console.log("[Phone] rendering");

  return html`
    <input
      placeholder="Phone"
      value=${$user.val.contact.phone}
      oninput=${(e) => ($user.val.contact.phone = e.target.value)}
    />
  `;
}

export function UserCard() {
  console.log("[UserCard] rendering");

  const $saving = signal(false);
  const $user = signal({
    name: "",
    password: "********",
    contact: { email: "", phone: "" },
  });

  task(() => {
    console.log("[task] user:", JSON.stringify($user.val, null, 2));
  });

  return html`
    <div style="display: flex; flex-direction: column; width: 248px; gap: 12px">
      <Name $user=${$user} />
      <Password $user=${$user} />
      <Email $user=${$user} />
      <Phone $user=${$user} />
      <div style="display: flex; flex-direction: row; gap: 12px;">
        <button
          style="flex: 1;"
          onclick=${() => {
            $user.val = {
              name: "",
              password: "********",
              contact: { email: "", phone: "" },
            };
          }}
        >
          Reset
        </button>
        <button
          style="flex: 1"
          onclick=${() => {
            if (!$saving.val) {
              $saving.val = true;
              setTimeout(() => ($saving.val = false), 450);
            }
          }}
        >
          ${$saving.val ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  `;
}

__TEST__(
  "Nested updates within objects trigger atomic renders",
  async ({ page }) => {
    let logs = [];
    page.on("console", (msg) => {
      const log = msg.text();
      if (
        log.startsWith("[task]") ||
        log.startsWith("[UserCard]") ||
        log.startsWith("[Name]") ||
        log.startsWith("[Password]") ||
        log.startsWith("[Email]") ||
        log.startsWith("[Phone]")
      ) {
        logs.push(msg.text());
      }
    });

    await mount(page, UserCard);

    const name = page.getByPlaceholder("Name");
    const phone = page.getByPlaceholder("Phone");

    logs = [];

    await name.fill("The real slim shady");

    expect(logs.length).toBe(2);
    expect(logs[0]).toBe("[Name] rendering");
    expect(logs[1]).toBe(
      `[task] user: ${JSON.stringify(
        {
          name: "The real slim shady",
          password: "********",
          contact: { email: "", phone: "" },
        },
        null,
        2,
      )}`,
    );

    logs = [];

    await phone.fill("(123) 456-7890");

    expect(logs.length).toBe(2);
    expect(logs[0]).toBe("[Phone] rendering");
    expect(logs[1]).toBe(
      `[task] user: ${JSON.stringify(
        {
          name: "The real slim shady",
          password: "********",
          contact: { email: "", phone: "(123) 456-7890" },
        },
        null,
        2,
      )}`,
    );
  },
);

__TEST__(
  "Replacing an object with another object with different properties triggers atomic renders",
  async ({ page }) => {
    let logs = [];
    page.on("console", (msg) => {
      const log = msg.text();
      if (
        log.startsWith("[task]") ||
        log.startsWith("[UserCard]") ||
        log.startsWith("[Name]") ||
        log.startsWith("[Password]") ||
        log.startsWith("[Email]") ||
        log.startsWith("[Phone]")
      ) {
        logs.push(msg.text());
      }
    });

    await mount(page, UserCard);

    const name = page.getByPlaceholder("Name");
    const phone = page.getByPlaceholder("Phone");
    const reset = page.getByText("Reset");

    logs = [];

    await name.fill("The real slim shady");
    await phone.fill("(123) 456-7890");

    expect(logs.length).toBe(4);
    expect(logs.at(-1)).toBe(
      `[task] user: ${JSON.stringify(
        {
          name: "The real slim shady",
          password: "********",
          contact: { email: "", phone: "(123) 456-7890" },
        },
        null,
        2,
      )}`,
    );

    logs = [];

    await reset.click();

    expect(logs.length).toBe(3);
    expect(logs[0]).toBe("[Name] rendering");
    expect(logs[1]).toBe("[Phone] rendering");
    expect(logs[2]).toBe(
      `[task] user: ${JSON.stringify(
        {
          name: "",
          password: "********",
          contact: { email: "", phone: "" },
        },
        null,
        2,
      )}`,
    );
  },
);

__TEST__(
  "Replacing an object with another object with same properties does not trigger a render",
  async ({ page }) => {
    let logs = [];
    page.on("console", (msg) => {
      const log = msg.text();
      if (
        log.startsWith("[task]") ||
        log.startsWith("[UserCard]") ||
        log.startsWith("[Name]") ||
        log.startsWith("[Password]") ||
        log.startsWith("[Email]") ||
        log.startsWith("[Phone]")
      ) {
        logs.push(msg.text());
      }
    });

    await mount(page, UserCard);

    expect(logs.length).toBe(6);
    expect(logs[0]).toBe("[UserCard] rendering");
    expect(logs.at(-1)).toBe(
      `[task] user: ${JSON.stringify(
        {
          name: "",
          password: "********",
          contact: { email: "", phone: "" },
        },
        null,
        2,
      )}`,
    );

    logs = [];

    const reset = page.getByText("Reset");

    await reset.click();
    await reset.click();
    await reset.click();

    expect(logs.length).toBe(0);
  },
);
