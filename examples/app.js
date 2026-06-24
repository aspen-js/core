import { html, signal, task } from "aspen";

export * from "./todo-list.js";

export function Counter() {
  const $count = signal(0);

  task(() => {
    console.log("[task] count:", $count.val);
  });

  return html`
    <div>${$count.val}</div>
    <button onclick=${() => $count.val++}>↑</button>
    <button onclick=${() => $count.val--}>↓</button>
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
