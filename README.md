# pixicode.dev

Site Hugo (thème `themes/roxo-hugo-pixicode` en submodule). Le blog et le portfolio viennent de Strapi, synchronisés au build par `tools/strapi-to-hugo.mjs` : ils se modifient dans Strapi, pas dans `content/blog/` ni `content/portfolio/`. Chaque push sur `main` (ou publication Strapi) reconstruit et déploie le site via GitHub Actions.

## À chaque changement de grille tarifaire

Les prix sont affichés à plusieurs endroits, à mettre à jour ensemble :

- le front matter `pricing` des pages services et de `/collectivites/` (cartes de prix et JSON-LD `Offer`) ;
- la prose, les blocs `essentiel` et les FAQ des landings (`content/*/_index.md`) ;
- **`static/llms.txt`** (présentation du site lue par les IA) : prix, pages piliers et date de mise à jour en tête de fichier ;
- `static/js/estimateur.js` (mode démo) et le workflow n8n « estimation », qui calcule le vrai devis en ligne ;
- les articles Strapi qui citent des prix.

## Bon à savoir

- `hugo_stats.json` est versionné : PurgeCSS le lit pendant le build CI. Une classe CSS ajoutée dans un template doit y figurer au moment du commit, sinon son style est purgé en production.
- Un lien markdown vers une page absente du build (article Strapi pas encore publié) est rendu en texte simple et signalé par un `WARN` dans le log du build, au lieu de produire une 404 (`layouts/_default/_markup/render-link.html` du thème).
