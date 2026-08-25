import { html, signal } from "#aspen";

export function CounterWithChildren({ children, reverse }) {
  const $count = signal(0);

  if (reverse) {
    return html`
      <div>
        ${children}
        <button id="count-bttn" onclick=${() => $count.val++}>
          count: ${$count.val}
        </button>
      </div>
    `;
  }

  return html`
    <div>
      <button id="count-bttn" onclick=${() => $count.val++}>
        count: ${$count.val}
      </button>
      ${children}
    </div>
  `;
}
