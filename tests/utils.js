export async function mountFrom(filename, page, component) {
  await page.setContent(`
    <html>
      <head>
        <title>
          Test doc
        </title>
        <script type="importmap">
          {
            "imports": {
              "#aspen": "http://localhost:3002/src/aspen.js",
              "@playwright/test": "http://localhost:3002/tests/shims/playwright.js",
              "./utils.js": "http://localhost:3002/tests/shims/utils.js"
            }
          }
        </script>
        <script type="module">
          import { createRoot, html } from "#aspen";
          import * as app from "http://localhost:3002/tests/${filename}";

          try {
            const root = createRoot(document.getElementById("root"), app);
            root.render(html\`<${component.name} />\`);
          } catch(e) {
            console.log("Error:", e);
          }
        </script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
`);
}
