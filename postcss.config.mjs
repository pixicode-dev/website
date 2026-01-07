import autoprefixer from "autoprefixer";
import _purgecss from "@fullhuman/postcss-purgecss";

const purgecss = _purgecss.default || _purgecss;

export default {
  plugins: [
    autoprefixer(),
    ...(process.env.HUGO_ENVIRONMENT === "production"
      ? [
          purgecss({
            content: ["./hugo_stats.json"],
            defaultExtractor: (content) => {
              const els = JSON.parse(content).htmlElements;
              return [
                ...(els.tags || []),
                ...(els.classes || []),
                ...(els.ids || []),
              ];
            },
            safelist: [],
          }),
        ]
      : []),
  ],
};
