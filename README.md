# Aspen

Aspen is a lightweight no-build framework that should feel familiar if you know
React. Besides being no-build, a few distinctives of Aspen are that state is
set and read by mutating deeply reactive signal objects and accessing their
properties, tagged template literals are used for markup, and there is no
virtual dom.

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

> 💡 Note
>
> For performance you may want to avoid loading Aspen from a cdn in production
> environments. Instead, you can copy `src/aspen.js` into your own project
> directly and serve it with your other files. This is called
> [vendoring](https://htmx.org/essays/vendoring/).

## API reference

### createRoot

`createRoot(domElement, components)`

The `createRoot` function accepts a dom element and a star import of the file
where the component(s) you want to render at your application root are defined,
and it returns an object with a method called `render` that you can use to
mount your application.

The `render` method accepts an [html tagged template literal](#html) and
renders the specified markup inside the dom element passed to `createRoot`,
replacing its contents.

```javascript
import { createRoot, html } from "aspen";
import * as app from "./app.js";

const root = createRoot(document.getElementById("root"), app);
root.render(html`<MyApp />`);
```

The markup passed to `root.render` doesn't have to just be a single component.

```javascript
import { createRoot, html } from "aspen";
import * as app from "./app.js";

const root = createRoot(document.getElementById("root"), app);
root.render(html`
  <div style="display: flex; flex-direction: row;">
    <Sidebar />
    <PageContent />
  </div>
  <PageFooter />
`);
```

### html

``html`...` ``, ``html(key)`...` ``, or ``html({ key })`...` ``

The `html` function allows you to specify markup with [tagged
templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)
using a syntax similar to JSX. Usually tagged templates are used
in [component](#components) return statements.

```javascript
export function Greeting() {
  return html`<div>hello world</div>`;
}
```

However, unlike JSX, the string parts of tagged templates are
just strings, so html attribute names are used, not JavaScript property names,
and camel casing is optional.

```javascript
export function SubmitButton({ submitForm }) {
  // Html attributes are case-insensitive, so both formnovalidate and onClick
  // are valid
  return html`
    <button formnovalidate class="primary" onClick=${() => submitForm()}>
      ${submitting ? "Saving..." : "Submit"}
    </button>
  `;
}
```

Another difference from JSX is that tagged templates can specify multiple
elements at the top level without the need for a containing element or
fragment.

```javascript
export function SubmitButton() {
  return html`
    <div>Please fill out the form and click "Submit"</div>
    <button>Submit</button>
  `;
}
```

Tagged templates can be assigned to variables.

```javascript
const labelElement = html`<label for=${htmlFor}>${label}</label>`;
```

Tagged templates can also be exported.

> 💡 Note
>
> An exported tagged template that is not defined inside a component may only
> contain html elements, it can't reference components.

```javascript
export const submitButton = html`
  <button class="primary" type="submit">Submit</button>
`;
```

Using tagged templates this way has a couple interesting benefits:

1. Your entire app is just JavaScript, so there's no build step.
2. Markup is made up of strings and expressions, so Aspen can tell what
   changed between renders without any complicated dom diffing logic.

#### Attributes

Attributes must be specified in full as raw strings like `<button
type="button">`, or fully replaced with an expression like `<button
type=${myBttnType}>` with no leading or trailing `"`. If you only need part of
an attribute to be dynamic, you still need to use an expression for the whole
value.

```javascript
export function SubmitButton({ submitting }) {
  return html`
    <button class=${`button primary ${submitting ? "subdued" : ""}`}>
      Submit
    </button>
  `;
}
```

##### Event listeners

You can attach a listener by setting the attribute corresponding to the event
name to a function. The first argument is the event.

```javascript
export function ClickMe() {
  html`
    <button
      onclick=${(e) => {
        e.target.textContent = "Clicekd";
      }}
    >
      Click me!
    </button>
  `;
}
```

#### Nesting templates

Tagged templates can be nested in other tagged templates.

```javascript
export function FormFooter({ hasErrors }) {
  return html`
    <div class="form-footer">
      ${hasErrors
        ? html`<span class="error">Please fix the errors and resubmit</span>`
        : undefined}
      <button>Submit</button>
    </div>
  `;
}
```

An array of tagged templates can be nested, but each tagged template in the
array must be passed a key arg. Keys have to be unique within an array as Aspen
uses them to tell when items have been added, removed, or reordered.

```javascript
const flavors = ["chocolate", "vanilla", "strawberry"];

export function Flavors() {
  return html`
    <ul class="flavors-card">
      ${flavors.map(
        (flavor) =>
          // here flavor is used as the key
          html(flavor)`
            <li>${flavor}</li>
          `,
      )}
    </ul>
  `;
}
```

> 💡 Note
>
> To provide a key you call `html` like a regular function, passing the key as
> an argument, and tag a template with the return value: ``html(key)`...` `` or
> ``html({ key: yourKey })`...` ``.

Resource ids make good keys.

```javascript
export function Comments({ comments }) {
  return html`
    ${comments.map(
      (comment) => html({ key: comment.id })`
        <div>${comment.text}</div>
      `,
    )}
  `;
}
```

Symbols are also allowed as keys, which can be useful for representing locally
created items that haven't been saved to the server and don't have a
permanent id yet.

```javascript
export function Todos() {
  const $todos = signal([
    { id: Symbol(), text: "Learn aspen" },
    { id: Symbol(), text: "See more $" },
  ]);

  // send todos to the server
  task(() => {
    // ...
  });

  return html`
    Todos:
    <ol>
      ${$todos.val.map(
        (todo) => html(todo.id)`
          <li>
            <input 
              value=${todo.text} 
              oninput=${(e) => (todo.text = e.target.value)} 
            />
          </li>
        `,
      )}
    </ol>
    <button onclick=${() => $todos.val.push({ id: Symbol(), text: "" })}>
      Add todo
    </button>
  `;
}
```

#### Components

Components are defined by exporting a function that returns a tagged template.
Components can also return primitive values, but only strings and numbers will
be rendered.

```javascript
export function Greeting() {
  return html`<div>hello world</div>`;
}
```

```javascript
export const Greeting () => "Hi there"
```

A component cannot be the default export of the file where it is defined and it
must have a non-empty `.name` property (named functions, arrow functions if
declared with `const MyComponent = () => {...}`, etc.).

##### Composing components

To compose components defined in the same file, you simply reference them in
your tagged templates like you would in JSX.

```javascript
export function MyComponent() {
  return html`
    This will render "hello world":
    <MyOtherComponent />
  `;
}

export function MyOtherComponent() {
  return html`<div>hello world</div>`;
}
```

##### Props

The syntax for passing props to components is like the syntax for setting
attribute values on elements.

```javascript
export function MyComponent() {
  return html`
    This will render "hi Bob"
    <Greeting message=${"hi Bob"} />
  `;
}

export function Greeting({ message }) {
  return html`<div>${message}</div>`;
}
```

The `children` prop is special and represents any child elements passed to the
component between its opening and closing tags in the markup.

```javascript
export function MyComponent() {
  return html`
    This will render "hello world" as a heading
    <Heading>hello world</Heading>
  `;
}

export function Heading({ children }) {
  return html`<h1>${children}</h1>`;
}
```

You can also set the children prop explicitly.

```javascript
export function MyComponent() {
  return html`<Heading children="hello world" />`;
}
```

##### Using components from other files

To use a component defined in a different file, you have to use a named star
export to re-export the entire contents of that file, using the name of the
component as the name of the export. You can then reference the component in
tagged templates.

```javascript
// my-app.js
export * as Greeting from "./greeting.js";

export function App() {
  return html`<Greeting message="hello world" />`;
}
```

```javascript
// greeting.js

export function Greeting({ message }) {
  return html`<div>${message}</div>`;
}
```

> 💡 Note
>
> This syntax is a little odd, but it's only a few more characters than an
> import and it means that Aspen has enough information at runtime to associate
> a component function with a component reference in a tagged template, without
> having to interpolate function calls into the markup. This makes for cleaner
> markup and a more efficient rendering model.
