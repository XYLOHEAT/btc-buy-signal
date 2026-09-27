/* Build (ADR-021): src/app.js and its StyleX styles -> /app.js as one classic-script bundle, with the generated
   CSS inlined into index.html's <style id="stylex"> so the page still renders from a single HTML request.
   src/viz3d.js and three.js -> /viz3d.js, a second bundle app.js loads only when a 3D view is wanted (ADR-022,
   ADR-023). Run after every change to src/ and commit the output: GitHub Pages serves this folder as it is. */
import esbuild from "esbuild";
import stylex from "@stylexjs/unplugin";
import fs from "node:fs";

const common = { bundle: true, format: "iife", minify: true, target: ["es2020", "safari15"], logLevel: "warning" };
await Promise.all([
  esbuild.build({
    ...common, entryPoints: ["src/app.js"], outfile: "app.js", legalComments: "none",
    plugins: [stylex.esbuild({ dev: false, useCSSLayers: false, unstable_moduleResolution: { type: "commonJS", rootDir: process.cwd() } })],
  }),
  // three.js is MIT: its licence notice stays in the bundle, at the end
  esbuild.build({ ...common, entryPoints: ["src/viz3d.js"], outfile: "viz3d.js", legalComments: "eof" }),
]);
// the plugin writes the collected CSS next to the bundle; minify it into the page and drop the file
const { code } = await esbuild.transform(fs.readFileSync("stylex.css", "utf8"), { loader: "css", minify: true });
fs.rmSync("stylex.css");
const html = fs.readFileSync("index.html", "utf8"), block = /(<style id="stylex">)[\s\S]*?(<\/style>)/;
if (!block.test(html)) throw new Error('index.html has no <style id="stylex"> block');
fs.writeFileSync("index.html", html.replace(block, (_, open, close) => open + code.trim() + close));
console.log(`app.js ${fs.statSync("app.js").size} B, viz3d.js ${fs.statSync("viz3d.js").size} B, StyleX CSS ${code.length} B`);
