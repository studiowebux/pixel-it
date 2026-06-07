// deno serve -A --watch server.ts
import { Hono, type Context } from "jsr:@hono/hono@^4.6.3";
import { Jimp } from "npm:jimp@^1.6.0";
import { extractColors } from "npm:extract-colors";
import getPixels from "npm:get-pixels";

const app = new Hono();

// ── Static assets ──────────────────────────────────────────────────────────

app.get("/style.css", async (c: Context) => {
  const css = await Deno.readTextFile(new URL("./style.css", import.meta.url));
  return c.text(css, 200, { "Content-Type": "text/css" });
});

app.get("/js/:file", async (c: Context) => {
  const file = c.req.param("file") ?? "";
  if (!/^[\w-]+\.js$/.test(file)) return c.text("Not found", 404);
  try {
    const js = await Deno.readTextFile(new URL(`./js/${file}`, import.meta.url));
    return c.text(js, 200, { "Content-Type": "application/javascript" });
  } catch {
    return c.text("Not found", 404);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 120;
}

async function getColorPalette(image: string, maxColors: number = 64): Promise<{hex: string}[]> {
  return new Promise((resolve, reject) => {
    getPixels(image, async (err: Error | null, pixels: { data: number[]; shape: number[] }) => {
      if (err) return reject(new Error(String(err)));
      const data = [...pixels.data];
      const [width, height] = pixels.shape;
      const scale = Math.max(0.02, 0.2 / Math.sqrt(maxColors / 8));
      const palette = await extractColors(
        { data, width, height },
        {
          pixels: Math.max(64000, width * height),
          distance: scale,
          colorValidator: (_r: number, _g: number, _b: number, alpha = 255) => alpha > 250,
          saturationDistance: scale,
          lightnessDistance: scale,
          hueDistance: scale / 2,
        },
      );
      resolve((palette as {hex: string}[]).slice(0, maxColors));
    });
  });
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  if (max === r) return (((g - b) / d + (g < b ? 6 : 0)) / 6) * 360;
  if (max === g) return (((b - r) / d + 2) / 6) * 360;
  return (((r - g) / d + 4) / 6) * 360;
}

function renderSwatches(colors: {hex: string}[], prefix: string): string {
  return colors.map((color) => {
    const id = "color-" + prefix + "-" + color.hex.replace("#", "");
    const cls = isDarkColor(color.hex) ? "text-white" : "text-black";
    return "<label for='" + id + "' class='rounded " + cls + "' style='background-color:" + color.hex + "'>"
      + "<input type='checkbox' id='" + id + "' value='" + color.hex + "' onchange='pixelitColorToggle(this)' hidden />"
      + color.hex
      + "</label>";
  }).join("");
}

// ── Routes ─────────────────────────────────────────────────────────────────

app.get("/", (c: Context) => {
  return c.html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pixel-it</title>
  <link rel="stylesheet" href="/style.css" />
  <script src="https://unpkg.com/htmx.org@2.0.2" integrity="sha384-Y7hw+L/jvKeWIRRkqWYfPcvVxHzVzn5REgzbawhxAuQGwX1XWe70vji+VSeHOThJ" crossorigin="anonymous"></script>
  <script src="/js/toggle.js"></script>
  <script src="/js/panel.js"></script>
  <script src="/js/export.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      htmx.on("#form", "htmx:xhr:progress", function(evt) {
        document.getElementById("progress").setAttribute("value", (evt.detail.loaded / evt.detail.total) * 100);
      });
    });
  </script>
</head>
<body>
  <header class="app-header">
    <h1>Pixel-it</h1>
  </header>

  <div class="app-body">
    <div class="toolbar-card">
      <form
        id="form"
        class="toolbar"
        hx-encoding="multipart/form-data"
        hx-post="/upload"
        hx-target="#images"
        hx-swap="beforeend"
        hx-indicator="#indicator"
        hx-on::after-request="this.reset()"
      >
        <input type="file" name="file" required />
        <div class="extract-wrap">
          <label for="maxColors">Extract</label>
          <input type="number" id="maxColors" name="maxColors" min="1" placeholder="64" />
          <span>colors</span>
        </div>
        <button type="submit" class="primary">Upload</button>
        <button type="button" class="muted" onclick="pixelitClearAll()">Clear all</button>
      </form>
      <div id="indicator" class="indicator">
        <progress id="progress" value="0" max="100"></progress>
      </div>
    </div>

    <div class="page-layout">
      <div id="images"></div>
      <aside id="palette-panel">
        <div class="panel-header">
          <h3>My Palette</h3>
          <span id="palette-count" class="panel-count">(0)</span>
        </div>
        <div id="palette-list">
          <p id="palette-empty" class="panel-empty">Upload an image and click colors to add them here.</p>
        </div>
        <hr class="panel-divider" />
        <button onclick="pixelitExportPNG()" class="full">Export PNG</button>
      </aside>
    </div>
  </div>

  <footer class="app-footer">
    <span>Made by Studiowebux &copy; 2024</span>
    <span>Deno / Hono / Jimp / extract-colors / HTMX</span>
    <a href="https://github.com/studiowebux/pixel-it">Github</a>
  </footer>
</body>
</html>`);
});

app.post("/upload", async (c: Context) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const maxColors = Math.max(1, parseInt(body["maxColors"] as string) || 64);

  if (!file || typeof file === "string") {
    return c.html("<p>Invalid file.</p>", 400);
  }

  try {
    const input = await Jimp.read(await (file as File).arrayBuffer());
    const sections: string[] = [];

    const sortByHue = (colors: {hex: string}[]) => [...colors].sort((a, b) => hexToHue(a.hex) - hexToHue(b.hex));

    const origPalette = await getColorPalette(await input.getBase64("image/png"), maxColors);
    sections.push(
      "<div class='palette-section'>"
      + "<h2>Original</h2>"
      + "<div class='original-color-palette'>" + renderSwatches(sortByHue(origPalette), "orig-" + (file as File).name) + "</div>"
      + "</div>"
    );

    for (const size of [2, 3, 4, 5, 6, 8, 12, 24]) {
      const pixelated = await input.pixelate(size).getBase64("image/png");
      const palette = await getColorPalette(pixelated, maxColors);
      sections.push(
        "<div class='palette-section'>"
        + "<h2>Pixelate &times; " + size + "</h2>"
        + "<div class='output'>"
        + "<img src='data:image/png;base64" + pixelated + "' alt='Pixelate x" + size + "' />"
        + "<div class='color-palette'>" + renderSwatches(sortByHue(palette), "px" + size + "-" + (file as File).name) + "</div>"
        + "</div>"
        + "</div>"
      );
    }

    return c.html(
      "<div class='upload-section'>"
      + "<div class='upload-section-title'>" + (file as File).name + "</div>"
      + sections.join("")
      + "</div>"
    );
  } catch (e: unknown) {
    return c.html("<p>" + (e as Error).message + "</p>", 500);
  }
});

export default app;
