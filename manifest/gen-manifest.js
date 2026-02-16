const fs = require("fs");
const path = require("path");
const browserType = process.argv[2];

if (browserType !== "chrome" && browserType !== "firefox") {
  console.log("Usage: node manifest/gen-manifest.js [chrome|firefox]");
  process.exit(1);
}

const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, file)));

const base = read("manifest.base.json");
const chromeOverrides = read("manifest.chrome.json");
const firefoxOverrides = read("manifest.firefox.json");

fs.writeFileSync(
  path.join(__dirname, "..", "manifest.json"),
  JSON.stringify(
    {
      ...base,
      ...(browserType === "chrome" ? chromeOverrides : firefoxOverrides),
    },
    null,
    2,
  ),
);
console.log(`Generated ${browserType} manifest in manifest.json`);
