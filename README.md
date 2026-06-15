# Aspen

Aspen is a lightweight no-build front-end framework. It should feel familiar if
you know React or JSX. A few distinctives of Aspen are that state is set and
read by updating and accessing properties of deeply reactive signal objects, an
html template function is used for markup, and there is no virtual dom.

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

## API reference

### createRoot

Use this to set up your app. The first arg is the dom node to render to, and the
second arg should be a star import of the file containing the component you
would like to render at root.

Call the `render` method on the return value to mount your app. Pass an html
template that uses the component(s) made a available by the star import.

> 👆 Note
>
> For how component imports work, see the [Components](#components) section.

### Components

#### Defining components

A valid Aspen component is a function that returns an ``html`..` `` template or
an allowed primitive (a string, number, boolean, undefined, or null), has a
`.name` property that begins with a capital letter, and is a named export from
the file where it is defined.

> 👆 Note
>
> In modern JS if you define an arrow function as part of a variable
> declaration, the function's `.name` property will be set to the name of the
> variable.

> 👆 Note
>
> Named exports are how Aspen is able to associate a component name used in an
> ``html`...` `` template with the function itself at runtime.

#### Re-using components

To re-use a component defined in the same file, simply include it an ``html`..`
`` template, for example ``html`<MyComponent />` ``.

To re-use a component defined a different file, you must first use a named star
export to re-export the entire contents of the file where the component is
defined. Use the name of the component as the name of the export, for example
`export * as MyOtherComponent from "./my-other-component.js"`. You can then
include the component in an ``html`..` `` template: ``html`<MyOtherComponent
/>` ``.

> 💡
>
> Although odd, this syntax uses the built-in JS module system and is about the
> same amount of typing as an equivalent JSX import. It ensures that at runtime
> Aspen has enough information to associate a component name used in a template
> with the function itself. Otherwise component functions would have to be
> interpolated (like in no-build Preact) which adds noise to the markup.

\*more documentation coming soon™
