/* Build (ADR-021): src/app.js and its StyleX styles -> /app.js as one classic-script bundle, with the generated
   CSS inlined into index.html's <style id="stylex"> so the page still renders from a single HTML request.
   Run after every change to src/ and commit the output: GitHub Pages serves this folder as it is. */
import esbuild from "esbuild";
import stylex from "@stylexjs/unplugin";
import fs from "node:fs";

await esbuild.build({
  entryPoints: ["src/app.js"], outfile: "app.js", bundle: true, format: "iife", minify: true,
  target: ["es2020", "safari15"], legalComments: "none", metafile: true, logLevel: "warning",
  plugins: [stylex.esbuild({ dev: false, useCSSLayers: false, unstable_moduleResolution: { type: "commonJS", rootDir: process.cwd() } })],
});
// the plugin writes the collected CSS next to the bundle; minify it into the page and drop the file
const { code } = await esbuild.transform(fs.readFileSync("stylex.css", "utf8"), { loader: "css", minify: true });
fs.rmSync("stylex.css");
const html = fs.readFileSync("index.html", "utf8"), block = /(<style id="stylex">)[\s\S]*?(<\/style>)/;
if (!block.test(html)) throw new Error('index.html has no <style id="stylex"> block');
fs.writeFileSync("index.html", html.replace(block, (_, open, close) => open + code.trim() + close));
console.log(`app.js ${fs.statSync("app.js").size} B, StyleX CSS ${code.length} B`);
