// deno serve --watch server.ts
import { Hono, type Context } from "jsr:@hono/hono@^4.6.3";
import { Jimp } from "npm:jimp";

const app = new Hono();

app.get("/", (c: Context) => {
  return c.html(`<!doctype html>
  <html lang="en">
      <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Document</title>
          <script
              src="https://unpkg.com/htmx.org@2.0.2"
              integrity="sha384-Y7hw+L/jvKeWIRRkqWYfPcvVxHzVzn5REgzbawhxAuQGwX1XWe70vji+VSeHOThJ"
              crossorigin="anonymous"
          ></script>
          <script defer>
              htmx.on("#form", "htmx:xhr:progress", function (evt) {
                  htmx.find("#progress").setAttribute(
                      "value",
                      (evt.detail.loaded / evt.detail.total) * 100,
                  );
              });
          </script>
          <link
              rel="stylesheet"
              href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
          />

          <style>
              .htmx-indicator {
                  display: none;
              }
              .htmx-request .htmx-indicator {
                  display: inline;
              }
              .htmx-request.htmx-indicator {
                  display: inline;
              }
          </style>
      </head>
      <body class="container">
          <header>
            <h1>Pixelate your images</h1>
          </header>
          <main>
              <article>
                  <form
                      id="form"
                      hx-encoding="multipart/form-data"
                      hx-post="/upload"
                      hx-target="#images"
                      hx-indicator="#indicator"
                  >
                      <input type="file" name="file" />
                      <button>Upload</button>
                  </form>
              </article>

              <div id="indicator" class="htmx-indicator">
                  <progress id="progress" value="0" max="100"></progress>
                  <span aria-busy="true">Generating your images...</span>
              </div>

              <article><div id="images">...</div></article>
          </main>

          <footer class="grid">
            <b>Made by Studiowebux @ 2024</b>
            <p style="text-align: right">Powered by Deno / Hono / Jimp / PicoCSS / HTMX</p>
          </footer>
      </body>
  </html>
`);
});

app.post("/upload", async (c: Context) => {
  const body = await c.req.parseBody();

  const file: File | string = body["file"];

  if (!file || typeof file === "string") {
    return c.text("Oops, try another file", 500);
  }

  try {
    const input = await Jimp.read(await file.arrayBuffer());
    const output: string[] = [];
    for (const i of [2, 3, 4, 5, 6, 8]) {
      const pixelated = await input.pixelate(i).getBase64("image/png");
      output.push(`<div>
          <h1>Pixelate Size: ${i}</h1>
          <img src="data:image/png;base64${pixelated}" alt="Pixelate Size: ${i}" />
      </div>`);
    }
    return c.html(
      `<div>
            ${output.join("\n")}
        </div>
    `,
    );
  } catch (e: unknown) {
    return c.html(`<p>${(e as Error).message}</p>`);
  }
});

export default app;
