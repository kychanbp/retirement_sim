/**
 * Patch html2canvas's color parser to handle modern CSS color functions
 * (lab, oklch, oklab, lch) that Tailwind CSS v4 emits.
 *
 * html2canvas only supports rgb/rgba/hsl/hsla and throws on anything else,
 * crashing the entire render. This patch converts the throw into a
 * graceful fallback (transparent), keeping the rest of the pipeline intact.
 *
 * Run automatically via the "postinstall" script in package.json.
 */
const fs = require("fs");
const path = require("path");

const colorFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "html2canvas",
  "dist",
  "lib",
  "css",
  "types",
  "color.js"
);

if (!fs.existsSync(colorFile)) {
  console.log("html2canvas not installed yet, skipping patch");
  process.exit(0);
}

let src = fs.readFileSync(colorFile, "utf8");

// The original line throws on any color function not in SUPPORTED_COLOR_FUNCTIONS:
//   throw new Error("Attempting to parse an unsupported color function \"" + value.name + "\"");
// Replace with a return of 0x00000000 (transparent black) so parsing continues.
const needle = /throw new Error\("Attempting to parse an unsupported color function/;

if (!needle.test(src)) {
  // Already patched or source changed — skip
  console.log("html2canvas color patch: already applied or source changed, skipping");
  process.exit(0);
}

src = src.replace(
  needle,
  'return 0x00000000; // patched: fallback for unsupported color functions // '
);

fs.writeFileSync(colorFile, src, "utf8");
console.log("html2canvas color patch: applied successfully");
