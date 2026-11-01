import { generate } from "critical";
import fs from "node:fs";
import path from "node:path";

// 1. Fonction pour trouver les fichiers CSS (Style & Bootstrap)
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

// 2. NOUVEAU : Fonction pour trouver TOUS les fichiers HTML récursivement
// (Cherche dans public/, public/blog/, public/contact/, etc.)
const getAllHtmlFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    const fullPath = path.join(dirPath, "/", file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllHtmlFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith(".html")) {
        // On garde le chemin relatif par rapport à 'public/' pour la config Critical
        // Ex: "blog/mon-article/index.html"
        arrayOfFiles.push(
          fullPath.replace("public/", "").replace("public\\", ""),
        );
      }
    }
  });

  return arrayOfFiles;
};

// Exécution
const localCssFiles = [
  ...getCssFiles("public/css/"),
  ...getCssFiles("public/scss/"),
];

// On récupère la liste de toutes les pages
const allPages = getAllHtmlFiles("public/");

console.log("🎨 Fichiers CSS locaux :", localCssFiles);
console.log(`🚀 Génération du CSS Critique pour ${allPages.length} pages...`);

(async () => {
  // On boucle sur chaque page trouvée
  for (const page of allPages) {
    // Petit log pour suivre la progression (c'est satisfaisant à voir)
    console.log(`Processing: ${page}`);

    try {
      await generate({
        base: "public/",
        src: page,
        target: page, // Écrase le fichier original avec la version optimisée
        inline: {
          strategy: "media", // Équivalent de `inline: true`
          // Sélecteur explicite OBLIGATOIRE : sans lui, inline-critical construit
          // ",:not(noscript) > link[...]" (virgule en tête) et nwsapi >= 2.2.28
          // résout ça sur <html> → "Regular expression too large" sur chaque page.
          selector: ':not(noscript) > link[rel="stylesheet"]',
        },
        extract: false,
        css: localCssFiles,

        penthouse: {
          keepLargerMediaQueries: true,
          blockJSRequests: false,
          forceInclude: [
            // 1. STRUCTURE GLOBALE (Vital pour toutes les pages)
            "body",
            "main",
            ".container",
            ".row",
            ".navbar",
            ".site-navigation",
            ".footer", // Important pour les pages courtes

            // 2. HERO SECTION (Surtout pour l'accueil, mais ne gêne pas ailleurs)
            ".site-hero",
            ".site-hero img",
            ".column-section",
            ".grand-titre",
            ".hero-description",
            ".hero-actions",

            // 3. CLASSES UTILITAIRES
            ".img-fluid",
            ".d-block",
            ".d-flex",
            ".position-relative",
            ".background-size",
            ".section-padding",
            ".section-padding-services",

            // 5. SECTION APPROCHE (C'est ici que le SVG sautait !)
            /\.approach-section/, // Le conteneur global
            /\.approach-wrapper/, // Wrapper
            /\.approach-container/, // Le parent RELATIF du SVG (VITAL)
            /\.connecting-line-svg/, // Le SVG lui-même
            /\.bg-hashtag/, // Le gros # en fond
            /\.approach-card/, // Les cartes
            /\.icon-wrapper/, // Les icônes
            /\.section-headline/, // Les titres de section
          ],
        },

        // Dimensions augmentées pour couvrir tous les cas
        dimensions: [
          { height: 900, width: 375 },
          { height: 1200, width: 1440 },
          { height: 1440, width: 2560 },
        ],

        include: [
          /:root/,
          /--site-margin/, // TRES IMPORTANT pour votre layout responsive
          /html/,
          /body/,
          /main/,
          /aspect-ratio/,
          /padding-top/, // Pour compenser le menu fixe
          /min-height/,
          /\.site-hero/,
          /\.about-section/,
          /\.portfolio-card/,
          /\.navbar/,
          /\.nav/, // Souvent utilisé par Bootstrap
          /\.col-/,
          /\.btn/, // Boutons présents partout
        ],
      });
    } catch (err) {
      console.error(`❌ Erreur sur ${page}:`, err);
      // On continue la boucle même si une page échoue
    }
  }
  console.log("✅ Terminé ! Tout le site est optimisé.");
})();
