<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1 align="center">PixiCode</h1>

  <p align="center">
    Agence Web & Mobile sur mesure – Éco-conception numérique
    <br />
    <strong>Expert en développement durable et haute performance</strong>
    <br />
    <br />
    <a href="https://pixicode.dev">Visiter le site</a>
    ·
    <a href="https://pixicode.dev/portfolio/">Voir nos projets</a>
    ·
    <a href="https://pixicode.dev/contact/">Nous contacter</a>
  </p>
</div>

---

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table des matières</summary>
  <ol>
    <li><a href="#à-propos-du-projet">À propos du projet</a>
      <ul>
        <li><a href="#technos-utilisées">Technos utilisées</a></li>
      </ul>
    </li>
    <li><a href="#démarrage">Démarrage</a>
      <ul>
        <li><a href="#prérequis">Prérequis</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#compilation-et-lancement">Compilation et lancement</a></li>
      </ul>
    </li>
    <li><a href="#structure-du-projet">Structure du projet</a></li>
    <li><a href="#nos-services">Nos services</a></li>
    <li><a href="#licence">Licence</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

Pour lire ce document en anglais, [cliquez ici](README_en.md).

---

## À propos du projet

**PixiCode** est une agence de développement web et mobile basée à **Angoulême**, spécialisée dans l'éco-conception numérique et la haute performance.

### Nos valeurs
- 🌱 **Éco-conception** : Certifiée [Label INR](https://inr.societe-numerique.fr/) pour nos pratiques durables
- ⚡ **Performance** : Sites ultra-rapides et applications optimisées
- 🔐 **Propriétaire** : Code maîtrisé et transparent, sans dépendances externes inutiles
- 🤝 **Partenariat** : Nous travaillons comme des partenaires, pas comme des prestataires

### Nos services
- 🌐 **Sites Internet** : Avec Hugo pour une performance maximale
- 📱 **Applications Mobiles** : Développées en Flutter (iOS & Android)
- 🔌 **API & Backend** : Architecture scalable et sécurisée
- ☁️ **DevOps & Hébergement** : Infrastructure optimisée et monitoring

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

### Technos utilisées

Ce site et ses projets associés utilisent :

* [![Hugo][Hugo.sh]][Hugo-url] – Générateur de site statique haute performance
* [![Flutter][Flutter.dev]][Flutter-url] – Développement mobile cross-platform
* [![Node.js][Node.js]][Node-url] – Environnement JavaScript/TypeScript
* [![PostCSS][PostCSS]][PostCSS-url] – Traitement CSS avancé
* [![Bootstrap][Bootstrap.com]][Bootstrap-url] – Framework CSS
* [![SCSS][SCSS]][SCSS-url] – Préprocesseur CSS

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

## Démarrage

### Prérequis

Vous avez besoin de :
- **Hugo** (v0.118+) – [Installation](https://gohugo.io/installation/)
- **Node.js** (v18+) – [Installation](https://nodejs.org/)
- **npm** ou **yarn** pour gérer les dépendances

```bash
# Vérifier les versions
hugo version
node --version
npm --version
```

### Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/pixicode-dev/website.git
   cd pixicode
   ```

2. **Installer les dépendances Node.js**
   ```bash
   npm install
   ```

3. **Vérifier la configuration**
   
   Éditer `config.toml` pour adapter :
   - `baseURL` : L'URL de votre domaine
   - `title` : Le titre du site
   - Paramètres de contact et réseaux sociaux

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

### Compilation et lancement

**Mode développement** (avec rechargement automatique)
```bash
hugo server
```
Le site sera accessible à `http://localhost:1313`

**Mode production** (générer les fichiers statiques)
```bash
hugo --minify
```
Les fichiers compilés seront dans le dossier `public/`

**Traiter le CSS avec PostCSS** (purge + minification)
```bash
npm run build:css
```

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

## Structure du projet

```
.
├── archetypes/              # Modèles pour le contenu
├── assets/                  # Ressources (CSS, JS, images)
│   └── css/
│       └── custom.scss      # Styles personnalisés
├── config.toml              # Configuration globale Hugo
├── content/                 # Pages et articles
│   ├── about/               # À propos
│   ├── services/            # Services (API, Mobile, DevOps, Web)
│   ├── portfolio/           # Portfolio
│   ├── blog/                # Articles de blog
│   ├── contact/             # Page de contact
│   └── team/                # Équipe
├── data/                    # Données YAML (CTA, témoignages, etc.)
├── public/                  # Fichiers générés (à la compilation)
├── resources/               # Assets compilés par Hugo
├── static/                  # Fichiers statiques (robots.txt, etc.)
├── themes/                  # Thème roxo-hugo-pixicode
└── tools/                   # Scripts utilitaires
    ├── generate-critical.mjs    # CSS critique
    └── strapi-to-hugo.mjs       # Migration Strapi → Hugo
```

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

## Nos services

### 🌐 Sites Internet
Création de sites web haute performance avec Hugo, optimisés pour SEO et accessibilité.

### 📱 Applications Mobiles
Applications iOS et Android natives avec Flutter – performance, offline-first, UX fluide.

### 🔌 API & Backend
Architectures scalables, sécurisées et testées. Backend propriétaire sans dépendances externes.

### ☁️ DevOps & Hébergement
Infrastructure optimisée, monitoring, CI/CD, déploiement automatisé.

[👉 En savoir plus sur nos services](https://pixicode.dev/services/)

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

## Licence

Distribué sous la licence ISC. Voir `LICENSE` pour plus d'informations.

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

## Contact

**PixiCode**
- 📧 Email : [contact@pixicode.dev](mailto:contact@pixicode.dev)
- 📞 Téléphone : [05 45 91 38 57](tel:0545913857)
- 📍 Adresse : 16000 Angoulême, France
- 🌐 Site : [https://pixicode.dev](https://pixicode.dev)

[👉 Demander un devis](https://pixicode.dev/contact/)

<p align="right">(<a href="#readme-top">retour en haut</a>)</p>

---

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/othneildrew/Best-README-Template.svg?style=for-the-badge
[contributors-url]: https://github.com/othneildrew/Best-README-Template/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/othneildrew/Best-README-Template/network/members
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/othneildrew/Best-README-Template/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/othneildrew/Best-README-Template/issues
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/othneildrew/Best-README-Template/blob/master/LICENSE.txt

[Hugo.sh]: https://img.shields.io/badge/Hugo-0.118+-FF4088?style=for-the-badge&logo=hugo&logoColor=white
[Hugo-url]: https://gohugo.io
[Flutter.dev]: https://img.shields.io/badge/Flutter-3.0+-02569B?style=for-the-badge&logo=flutter&logoColor=white
[Flutter-url]: https://flutter.dev
[Node.js]: https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org
[PostCSS]: https://img.shields.io/badge/PostCSS-8.5+-DD3A0A?style=for-the-badge&logo=postcss&logoColor=white
[PostCSS-url]: https://postcss.org
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-5+-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[SCSS]: https://img.shields.io/badge/SCSS-1.69+-CC6699?style=for-the-badge&logo=sass&logoColor=white
[SCSS-url]: https://sass-lang.com
