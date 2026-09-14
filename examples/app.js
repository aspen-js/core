import { html, signal, task } from "aspen";

export * from "./todo-list.js";

export function Counter() {
  const $count = signal(0);

  task(() => {
    console.log("the count is", $count.val);
  });

  return html`
    <div>${$count.val}</div>
    <button onclick=${() => $count.val++}>↑</button>
    <button onclick=${() => $count.val--}>↓</button>
  `;
}

// const $count = signal(0);
//
// task(() => {
//   console.log("the global count is ", $count.val);
// });

export function CounterWithTask() {
  console.log("[CounterWithTask] rendering");

  const $count = signal(0);

  task(() => {
    console.log("the count is", $count.val);
  });

  return html`
    <button onclick=${() => $count.val++}>count: ${$count.val}</button>
  `;
}

export function DoubleCounter() {
  const $count = signal(0);

  task(() => {
    console.log("RUNNING EFFECT");
    $count.val++;
  });

  return html`
    <div>count: ${$count.val}</div>
    <button onclick=${() => $count.val++}>↑</button>
    <button onclick=${() => $count.val--}>↓</button>
  `;
}

export function Profile({ user }) {
  console.log("[Profile] rendering...");

  return html`
    <div
      style="
         height: 48px;
         width: 48px; 
         border-radius: 24px; 
         background-position: center;
         background-image: url('https://fastly.picsum.photos/id/15/200/300.jpg?hmac=lozQletmrLG9PGBV1hTM1PnmvHxKEU0lAZWu8F2oL30')
      "
    ></div>
    <div>${user.name}</div>
  `;
}

export function ProfileCard() {
  console.log("[ProfileCard] rendering...");

  const $user = signal({ name: "John Doe" });
  const $name = signal("John Doe");

  return html`
    <Profile user=${$user.val} />
    <input value=${$name.val} oninput=${(e) => ($name.val = e.target.value)} />
    <button onclick=${() => ($user.val = { name: $name.val })}>Save</button>
  `;
}

export function MyInput() {
  // Hooray, this no longer works...
  const $text = signal(`"><img src="x" onerror="alert('gotcha!')">`);

  return html`
    <input value=${$text.val} oninput=${(e) => ($text.val = e.target.value)} />
  `;
}

export function CounterWithInput() {
  const $count = signal(0);
  const $text = signal("");

  return html`
    <button onclick=${() => $count.val++}>count: ${$count.val}</button>
    <input value=${$text.val} oninput=${(e) => ($text.val = e.target.value)} />
  `;
}

export function WithChildren(props) {
  return html` <div>${props.children}</div> `;
}

export function App() {
  const count = signal(0);
  const wrapped =
    count.val > 3
      ? html`count is <b>over</b> three`
      : html`<span style="color:green;">count is under three</span>`;

  return html`
    <button onClick=${() => count.val++}>count: ${count.val}</button>
    <WithChildren children=${wrapped} />
  `;
}

export function DivOrSpanContainer({ as, children }) {
  const wrapped = html`<div class="inner-container">${children}</div>`;

  return as === "span"
    ? html`<span>${wrapped}</span>`
    : as === "div"
      ? html`<div>${wrapped}</div>`
      : wrapped;
}

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
