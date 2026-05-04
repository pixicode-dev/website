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
    Custom Web & Mobile Agency – Eco-friendly Digital Design
    <br />
    <strong>Expert in Sustainable Development & High Performance</strong>
    <br />
    <br />
    <a href="https://pixicode.dev">Visit Website</a>
    ·
    <a href="https://pixicode.dev/portfolio/">See Our Work</a>
    ·
    <a href="https://pixicode.dev/contact/">Get in Touch</a>
  </p>
</div>

---

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#build--launch">Build & Launch</a></li>
      </ul>
    </li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#our-services">Our Services</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

To read this document in French, [click here](README_.md).

---

## About The Project

**PixiCode** is a web and mobile development agency based in **Angoulême**, France, specializing in eco-friendly digital design and high-performance solutions.

### Our Values
- 🌱 **Eco-Friendly Design** : Certified with [INR Label](https://inr.societe-numerique.fr/) for sustainable practices
- ⚡ **High Performance** : Ultra-fast websites and optimized applications
- 🔐 **Proprietary Code** : Full control and transparency, no unnecessary dependencies
- 🤝 **Partnership** : We work as partners, not just service providers

### What We Do
- 🌐 **Websites** : Built with Hugo for maximum performance
- 📱 **Mobile Apps** : Developed with Flutter (iOS & Android)
- 🔌 **APIs & Backend** : Scalable and secure architecture
- ☁️ **DevOps & Hosting** : Optimized infrastructure and monitoring

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Built With

This website and related projects are built with :

* [![Hugo][Hugo.sh]][Hugo-url] – High-performance static site generator
* [![Flutter][Flutter.dev]][Flutter-url] – Cross-platform mobile development
* [![Node.js][Node.js]][Node-url] – JavaScript/TypeScript runtime
* [![PostCSS][PostCSS]][PostCSS-url] – Advanced CSS processing
* [![Bootstrap][Bootstrap.com]][Bootstrap-url] – CSS framework
* [![SCSS][SCSS]][SCSS-url] – CSS preprocessor

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

You'll need:
- **Hugo** (v0.118+) – [Installation Guide](https://gohugo.io/installation/)
- **Node.js** (v18+) – [Installation](https://nodejs.org/)
- **npm** or **yarn** for dependency management

```bash
# Check versions
hugo version
node --version
npm --version
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pixicode-dev/website.git
   cd pixicode
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Configure the project**
   
   Edit `config.toml` to customize:
   - `baseURL` : Your domain URL
   - `title` : Website title
   - Contact info and social media links

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Build & Launch

**Development mode** (with auto-reload)
```bash
hugo server
```
The site will be accessible at `http://localhost:1313`

**Production mode** (generate static files)
```bash
hugo --minify
```
Compiled files will be in the `public/` folder

**Process CSS with PostCSS** (purge + minification)
```bash
npm run build:css
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Structure

```
.
├── archetypes/              # Content templates
├── assets/                  # Resources (CSS, JS, images)
│   └── css/
│       └── custom.scss      # Custom styles
├── config.toml              # Hugo global configuration
├── content/                 # Pages and articles
│   ├── about/               # About
│   ├── services/            # Services (API, Mobile, DevOps, Web)
│   ├── portfolio/           # Portfolio
│   ├── blog/                # Blog articles
│   ├── contact/             # Contact page
│   └── team/                # Team
├── data/                    # YAML data (CTA, testimonials, etc.)
├── public/                  # Generated files (after build)
├── resources/               # Assets compiled by Hugo
├── static/                  # Static files (robots.txt, etc.)
├── themes/                  # roxo-hugo-pixicode theme
└── tools/                   # Utility scripts
    ├── generate-critical.mjs    # Critical CSS
    └── strapi-to-hugo.mjs       # Strapi → Hugo migration
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Our Services

### 🌐 Websites
High-performance websites built with Hugo, optimized for SEO and accessibility.

### 📱 Mobile Apps
Native iOS and Android applications with Flutter – high-performance, offline-first, smooth UX.

### 🔌 APIs & Backend
Scalable, secure, and tested architectures. Proprietary backend with no external dependencies.

### ☁️ DevOps & Hosting
Optimized infrastructure, monitoring, CI/CD, automatic deployment.

[👉 Learn more about our services](https://pixicode.dev/services/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

Distributed under the ISC License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Contact

**PixiCode**
- 📧 Email : [contact@pixicode.dev](mailto:contact@pixicode.dev)
- 📞 Phone : [+33 5 45 91 38 57](tel:+33545913857)
- 📍 Address : 16000 Angoulême, France
- 🌐 Website : [https://pixicode.dev](https://pixicode.dev)

[👉 Request a quote](https://pixicode.dev/contact/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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
