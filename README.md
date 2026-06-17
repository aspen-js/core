# Aspen

Aspen is an experimental, lightweight no-build front-end framework. It should
feel familiar if you know React or JSX. Besides being no-build, a few
distinctives of Aspen are that state is set and read by mutating deeply
reactive signal objects and accessing their properties, an html template
function is used for markup, and there is no virtual dom.

> ⚠️ Warning
>
> This project is not production ready. The documentation may be incomplete or
> out of date and the API may change.

## Quick start

Create a new directory and in `app.js` add:

```javascript
import { html, signal } from "aspen";

export function Counter() {
  const $count = signal(0);

  return html`
    <div>${$count.val}</div>
    <button onclick=${() => $count.val++}>↑</button>
    <button onclick=${() => $count.val--}>↓</button>
  `;
}
```

In `index.html` add:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="importmap">
      {
        "imports": {
          "aspen": "https://cdn.jsdelivr.net/gh/aspen-js/core/src/aspen.min.js"
        }
      }
    </script>
    <script type="module">
      import { createRoot, html } from "aspen";
      import * as app from "./app.js";

      const root = createRoot(document.getElementById("root"), app);
      root.render(html`<Counter />`);
    </script>
  </head>
  <body>
    <div id="root">loading...</div>
  </body>
</html>
```

To launch, cd into your new directory and run `npx serve` or similar.

> ⚠️ Warning
>
> For security and performance you may want to avoid loading Aspen from a cdn
> in production environments. Instead, you can copy `src/aspen.js` into your
> own project directly and serve it with your other files.

## API reference

### Mounting an app

Call `createRoot` with the dom node to render to and a star import of the file
containing the component you would like to render at the app root.

Call the `render` method on the return value of `createRoot` with an html
template that uses the component(s) made a available by the star import.

See the [Quick start](#quick-start) for an example.

> 💡 Info
>
> In the future Aspen will have a router that, among other things, will
> automatically mount your app.

### Components

#### Defining components

A valid Aspen component is a function that returns an html template or
an allowed primitive (a string, number, boolean, undefined, or null), has a
`.name` property that begins with a capital letter, and is a named export from
the file where it is defined.

Named exports are how Aspen is able to associate a component name used in an
html template with the component function at runtime.

> 👆 Note
>
> In modern JS if you define an arrow function as part of a variable
> declaration, the function's `.name` property will be set to the name of the
> variable.

```javascript
import { html } from "aspen";

export function Greeting() {
  return "hello world";
}

export const Profile = ({ name, profilePic }) => html`
  <div class="profile-card">
    <img src=${profilePic} />
    <div>${name}</div>
  </div>
`;
```

Html templates can be assigned to variables.

```javascript
import { html } from "aspen";

export function Card({ children }) {
  const inner = html`<div class="inner-card-container">${children}</div>`;

  return html`<div class="outer-card-container">${inner}</div>`;
}
```

A component may return multiple elements in a single template without wrapping
them in another element.

```javascript
const TitledSection = ({ title, body }) => html`
  <h2>${title}</h2>
  <p>${body}</p>
`;
```

If you create an array of html templates, you must pass a unique key to each
one with the `key` arg: ``html(key)`...` ``.

```javascript
const flavors = ["mint", "vanilla", "chocolate"];

function Flavors() {
  return html`
    <ul>
      ${flavors.map((flavor) => html(flavor)`<li>${flavor}</li>`)}
    </ul>
  `;
}
```

#### Using components

To use a component defined in the same file, simply include it an html
template, for example ``html`<MyComponent />` ``.

To use a component defined in a different file, you must first use a named star
export to re-export the entire contents of the file where the component is
defined. Use the name of the component as the name of the export, for example
`export * as MyOtherComponent from "./my-other-component.js"`. You can then
include the component in an html template: ``html`<MyOtherComponent />` ``.

> 💡 Info
>
> Although odd, this syntax uses the built-in JS module system and is about the
> same amount of typing as an equivalent JSX import. It ensures that at runtime
> Aspen has enough information to associate a component name used in a template
> with the corresponding function. Otherwise component functions would have to
> be interpolated (like in no-build Preact) which adds noise to the markup.

```javascript
// todos.js
import { html, signal } from "aspen";

export function Todo({ $todo }) {
  return html`
    <div>
      <input
        type="checkbox"
        checked=${$todo.done}
        oninput=${() => ($todo.done = !$todo.done)}
      />
      <input
        type="text"
        value=${$todo.text}
        onInput=${(e) => ($todo.text = e.target.value)}
      />
    </div>
  `;
}

let count = 0;
const getTodoId = () => count++;

export const TodoList = () => {
  const $todos = signal([]);

  return html`
    <button
      onClick=${() =>
        $todos.val.push({ id: getTodoId(), done: false, text: "" })}
    >
      Add todo
    </button>
    ${$todos.val.map((todo) => html(todo.id)`<Todo $todo=${todo} />`)}
  `;
};
```

```javascript
// app.js
import { html } from "aspen";
export * as TodoList from "./todos.js";

export function TodoApp() {
  return html`
    <h1>Todos</h1>
    <TodoList />
  `;
}
```

\*more documentation coming soon™
