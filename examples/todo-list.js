import { signal, html } from "aspen";

export function TodoList() {
  console.log("[TodoList] rendering");

  const $todos = signal(
    [...Array(3)].map(() => ({
      id: Symbol(),
      checked: false,
      text: "",
    })),
  );

  return html`
    <div>
      <h1 style="display: inline">Todos</h1>
      <button
        onClick=${() =>
          $todos.val.push({ id: Symbol(), text: "", checked: false })}
      >
        +
      </button>
      <button onClick=${() => $todos.val.pop()}>-</button>
      <button onClick=${() => $todos.val.reverse()}>↑↓</button>
    </div>
    ${$todos.val.map(
      (todo, i) =>
        html(todo.id)`
          <Todo id=${todo.id} $todos=${$todos} index=${i} />
        `,
    )}
  `;
}

export function Todo({ id, $todos, index }) {
  console.log(`[Todo ${index}] rendering`);

  const $todo = $todos.val[index];

  return html`
    <div>
      <input
        type="checkbox"
        checked=${$todo.checked}
        onInput=${(e) => ($todo.checked = e.target.checked)}
      />
      <input
        type="text"
        value=${$todo.text}
        onInput=${(e) => ($todo.text = e.target.value)}
      />
      <button
        onClick=${() =>
          $todos.val.splice(index + 1, 0, {
            id: Symbol(),
            text: "",
            checked: false,
          })}
      >
        +
      </button>
      <button onClick=${() => $todos.val.splice(index, 1)}>-</button>
    </div>
  `;
}
