import autoprefixer from "autoprefixer";
import purgecss from "@fullhuman/postcss-purgecss";

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
            safelist: [], // Ajoutez ici les classes dynamiques si besoin
          }),
        ]
      : []),
  ],
};
