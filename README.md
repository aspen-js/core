# Aspen

Aspen is a lightweight JSX/React alternative that is intended to be used
without a bundler or compiler.

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
