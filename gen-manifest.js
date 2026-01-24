const fs = require("fs");
const browserType = process.argv[2];

if (browserType !== "chrome" && browserType !== "firefox") {
  console.log("Usage: node getn-manifest.js [chrome|firefox]");
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync("manifest.base.json"));
const chromeOverrides = JSON.parse(fs.readFileSync("manifest.chrome.json"));
const firefoxOverrides = JSON.parse(fs.readFileSync("manifest.firefox.json"));

fs.writeFileSync(
  "manifest.json",
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
