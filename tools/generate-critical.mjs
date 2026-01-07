import { generate } from "critical";

import fs from "node:fs";
import path from "node:path";

function getCssFiles(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((name) => name.endsWith(".css"))
      .map((name) => path.join(dir, name));
  } catch (e) {
    return [];
  }
}

const localCssFiles = [
  ...getCssFiles("public/css/"),
  ...getCssFiles("public/scss/"),
];

console.log("🎨 Fichiers CSS locaux trouvés :", localCssFiles);

(async () => {
  await generate({
    base: "public/",
    src: "index.html",
    target: "index.html",
    inline: true,
    extract: false,

    css: localCssFiles,

    penthouse: {
      keepLargerMediaQueries: true,
      forceInclude: [".site-hero", ".navbar", ".grand-titre"],
    },

    dimensions: [
      { height: 800, width: 375 },
      { height: 900, width: 1440 },
      { height: 1080, width: 1920 },
    ],

    include: [/:root/, /--site-margin/],
  });
})();
