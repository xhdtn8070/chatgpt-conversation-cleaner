import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(root, "public", "icons");
const svgPath = path.join(iconDir, "icon.svg");
const svg = await readFile(svgPath, "utf8");
const encodedSvg = Buffer.from(svg).toString("base64");
const sizes = [16, 32, 48, 128];

await mkdir(iconDir, { recursive: true });

const browser = await chromium.launch();

try {
  for (const size of sizes) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { width: size, height: size }
    });

    await page.setContent(`
      <!doctype html>
      <html>
        <head>
          <style>
            html,
            body {
              width: ${size}px;
              height: ${size}px;
              margin: 0;
              background: transparent;
            }

            img {
              display: block;
              width: ${size}px;
              height: ${size}px;
            }
          </style>
        </head>
        <body>
          <img src="data:image/svg+xml;base64,${encodedSvg}" alt="" />
        </body>
      </html>
    `);

    await page.locator("img").evaluate((image) => {
      const img = image;
      return img.decode();
    });

    await page.screenshot({
      omitBackground: true,
      path: path.join(iconDir, `icon-${size}.png`)
    });

    await page.close();
  }
} finally {
  await browser.close();
}
