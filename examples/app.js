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
