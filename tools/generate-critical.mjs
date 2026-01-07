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

    include: [
      /\.card/,
      /\.testimonial/,
      /\.embla/,
      /\.row/,
      /\.col-/,

      // --- AJOUTS INDISPENSABLES ---
      // 1. La structure de base
      "body",
      "html",
      ".container",

      // 2. La Navigation (Vital pour ne pas voir le menu explosé)
      ".navbar",
      ".navbar-expand-lg",
      ".site-navigation",
      ".navbar-brand",
      ".navbar-nav",
      ".nav-item",
      ".nav-link",

      // 3. La Section Hero (Le haut de page visuel)
      ".site-hero", // Votre image de fond est ici
      ".grand-titre", // Le gros titre H1
      ".hero-description",
      ".hero-actions",
      ".btn-pixi", // Vos boutons d'appel à l'action

      // 4. Utilitaires Bootstrap fréquents en haut de page
      ".d-block",
      ".d-none",
      ".d-lg-block",
      ".img-fluid",
      ".text-white",
    ],
  });
})();
