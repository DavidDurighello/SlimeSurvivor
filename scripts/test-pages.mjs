import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

// Serve the actual production artifact under the same prefix as GitHub Pages.
const root = resolve("dist");
const prefix = "/SlimeSurvivor/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const file = resolve(root, pathname.slice(prefix.length) || "index.html");
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const port = server.address().port;
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (req) => errors.push(req.url()));
    page.on("response", (res) => {
      if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
    });
    await page.goto(`http://127.0.0.1:${port}${prefix}`);
    await expect(
      page.getByRole("heading", { name: "C’est l’heure du bulk." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "C’EST PARTI" }).click();
    await expect(page.locator("#hud")).toBeVisible();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await expect(
      page.getByRole("heading", { name: "Pause protéinée." }),
    ).toBeVisible();
    assert.deepEqual(
      errors,
      [],
      "Production assets must load without runtime or HTTP errors",
    );
    console.log(
      `PASS: production under ${prefix} at ${viewport.width}×${viewport.height}`,
    );
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
