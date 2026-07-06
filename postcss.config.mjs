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
            // hugo_stats.json ne contient que les classes émises par les
            // templates : les classes ajoutées dynamiquement en JS doivent
            // être safelistées pour ne pas être purgées.
            safelist: [
              /^embla__/, // puces/état des carrousels Embla (ajoutés en JS)
              "show", // Bootstrap collapse (menu mobile ouvert)
              "collapsing",
              "collapsed",
              "active", // filtres portfolio, pagination
              "fade",
              /^variant-/, // variantes de couleur des cartes blog (JS)
              "btn-page", // pagination JS du blog
            ],
          }),
        ]
      : []),
  ],
};
