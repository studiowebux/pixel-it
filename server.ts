// deno serve -A --watch server.ts
import { Hono, type Context } from "jsr:@hono/hono@^4.6.3";
import { Jimp } from "npm:jimp@^1.6.0";
import { extractColors } from "npm:extract-colors";
import getPixels from "npm:get-pixels";

const app = new Hono();

function isDarkColor(color: string): boolean {
  const r = parseInt(color.substr(1, 2), 16);
  const g = parseInt(color.substr(3, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const brigthness = (r * 299 + g * 587 + b * 114) / 1000;
  return brigthness < 120;
}

async function getColorPalette(image: string, maxColors: number = 64) {
  return new Promise((resolve, reject) => {
    getPixels(image, async (err, pixels) => {
      if (err) {
        return reject(new Error(err));
      }
      const data = [...pixels.data];
      const [width, height] = pixels.shape;

      const palette = await extractColors(
        { data, width, height },
        {
          pixels: 64000,
          distance: 0.1,
          colorValidator: (red, green, blue, alpha = 255) => alpha > 250,
          saturationDistance: 0.2,
          lightnessDistance: 0.2,
          hueDistance: 0.083333333,
        },
      );
      return resolve((palette as unknown[]).slice(0, maxColors));
    });
  });
}

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
          <script>
              function pixelitColorToggle(checkbox) {
                  checkbox.parentElement.classList.toggle("selected", checkbox.checked);
                  document.dispatchEvent(new CustomEvent(
                      checkbox.checked ? "pixelit:pick" : "pixelit:unpick",
                      { detail: { hex: checkbox.value, checkboxId: checkbox.id } }
                  ));
              }
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

              .h2 {
                  margin-top:2em;
              }

              .rounded {
                  border-radius: 25%;
                  padding: 0.75em;
                  font-weight: bold;
                  flex-basis: 7em;
                  min-width: 7em;
                  align-content: center;
                  text-align: center;
              }

              .original-color-palette {
                  display: flex;
                  gap: 0.5em;
                  margin-top: 0.25em;
                  flex-wrap: wrap;
                  margin: 0 auto;
                  justify-content: center;
              }

              .color-palette {
                  display: flex;
                  height: 3em;
                  flex-wrap: wrap;
                  gap: 0.25em;
                  justify-content: space-evenly;
                  margin: 0 auto;
              }

              .text-white {
                  color: white;
              }

              .text-black {
                  color: black;
              }

              .output {
                  display: flex;
                  justify-content: space-between;
                  gap: 1em;
              }

              img {
                  max-width:512px;
              }

              .rounded.selected {
                  outline: 3px solid white;
                  box-shadow: 0 0 0 5px black;
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
                      <label for="maxColors">Colors to extract (default 64)</label>
                      <input type="number" id="maxColors" name="maxColors" min="1" placeholder="64" />
                      <button>Upload</button>
                  </form>
              </article>

              <div id="indicator" class="htmx-indicator">
                  <progress id="progress" value="0" max="100"></progress>
                  <span aria-busy="true">Generating your images...</span>
              </div>

              <article><div id="images">...</div></article>
          </main>

          <footer>
            <div class="grid">
              <b>Made by Studiowebux @ 2024</b>
              <p style="text-align: right">Powered by Deno / Hono / Jimp / extract-colors / get-pixels / PicoCSS / HTMX</p>
            </div>
            <div>
              <p style="text-align: center">Use on your local machine: <a href="https://github.com/studiowebux/pixel-it">Github</a></p>
            </div>
          </footer>
      </body>
  </html>
`);
});

app.post("/upload", async (c: Context) => {
  const body = await c.req.parseBody();

  const file: File | string = body["file"];
  const maxColors = Math.max(1, parseInt(body["maxColors"] as string) || 64);

  if (!file || typeof file === "string") {
    return c.text("Oops, try another file", 500);
  }

  try {
    const input = await Jimp.read(await file.arrayBuffer());
    const output: string[] = [];
    const originalColorPalette = await getColorPalette(
      await input.getBase64("image/png"),
      maxColors,
    );
    const renderSwatches = (colors: {hex: string}[], prefix: string) =>
      colors.map((color) => {
        const id = `color-${prefix}-${color.hex.replace("#", "")}`;
        const dark = isDarkColor(color.hex);
        return `<label for="${id}" class="rounded ${dark ? "text-white" : "text-black"}" style="background-color:${color.hex};cursor:pointer">
          <input type="checkbox" id="${id}" value="${color.hex}" onchange="pixelitColorToggle(this)" style="display:none" />
          ${color.hex}
        </label>`;
      }).join("");

    output.push(`
      <h2>Original Color Palette</h2>
      <div class="original-color-palette">
        ${renderSwatches(originalColorPalette as {hex: string}[], `orig-${file.name}`)}
      </div>
    `);
    for (const i of [2, 3, 4, 5, 6, 8, 12, 24]) {
      const pixelated = await input.pixelate(i).getBase64("image/png");
      const colorPalette = await getColorPalette(pixelated, maxColors);
      output.push(`
        <div>
          <h2 class="h2">Pixelate Size: ${i}</h2>
          <div class="output">
            <img src="data:image/png;base64${pixelated}" alt="Pixelate Size: ${i}" />
            <div class="color-palette">
              ${renderSwatches(colorPalette as {hex: string}[], `px${i}-${file.name}`)}
            </div>
          </div>
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
