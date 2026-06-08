// deno serve -A --watch server.ts
import { Hono, type Context } from "jsr:@hono/hono@^4.6.3";
import { serveStatic } from "jsr:@hono/hono/deno";
import { Jimp } from "npm:jimp@^1.6.0";
import { extractColors } from "npm:extract-colors";
import getPixels from "npm:get-pixels";

const app = new Hono();

// ── Static assets ──────────────────────────────────────────────────────────

app.use("/", serveStatic({ path: "./index.html" }));
app.use("/style.css", serveStatic({ root: "./" }));
app.use("/js/*", serveStatic({ root: "./" }));

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
      + "<input type='checkbox' id='" + id + "' value='" + color.hex + "' onchange='pixelitColorToggle(this,event)' hidden />"
      + color.hex
      + "</label>";
  }).join("");
}

// ── Routes ─────────────────────────────────────────────────────────────────

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

    const pickAllBtn = (paletteClass: string) =>
      "<button class='pick-all-btn' onclick='pixelitPickAll(this,\"" + paletteClass + "\")'>Pick all</button>";

    const origPalette = await getColorPalette(await input.getBase64("image/png"), maxColors);
    const origPrefix = "orig-" + (file as File).name;
    sections.push(
      "<div class='palette-section'>"
      + "<div class='section-header'><h2>Original</h2>" + pickAllBtn("original-color-palette") + "</div>"
      + "<div class='original-color-palette'>" + renderSwatches(sortByHue(origPalette), origPrefix) + "</div>"
      + "</div>"
    );

    for (const size of [2, 3, 4, 5, 6, 8, 12, 24]) {
      const pixelated = await input.pixelate(size).getBase64("image/png");
      const palette = await getColorPalette(pixelated, maxColors);
      sections.push(
        "<div class='palette-section'>"
        + "<div class='section-header'><h2>Pixelate &times; " + size + "</h2>" + pickAllBtn("color-palette") + "</div>"
        + "<div class='output'>"
        + "<div class='img-wrapper'>"
        + "<img src='data:image/png;base64" + pixelated + "' alt='Pixelate x" + size + "' />"
        + "<canvas class='img-overlay'></canvas>"
        + "</div>"
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
