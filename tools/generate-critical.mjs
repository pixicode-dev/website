import { generate } from "critical";

(async () => {
  await generate({
    base: "public/",
    src: "index.html",
    target: "index.html",
    inline: true,

    dimensions: [
      {
        height: 800,
        width: 375,
      },
      {
        height: 900,
        width: 1440,
      },
      {
        height: 1080,
        width: 1920,
      },
    ],
  });
})();
