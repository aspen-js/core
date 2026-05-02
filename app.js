import { html, signal } from "./helix_v2.js";

export function Counter() {
  const $count = signal(0);

  return html`
    <button onclick=${() => $count.val++}>count: ${$count.val}</button>
  `;
}
