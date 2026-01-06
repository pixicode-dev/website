---
title: "Sous le capot : Pourquoi nous avons choisi une architecture JAMstack (Hugo + Strapi)"
date: "2025-11-02T11:00:30.436Z"
lastmod: "2026-01-03T17:02:55.780Z"
draft: false
description: "Analyse technique de notre propre site web. Comment nous combinons performance extrême, sécurité et éco-conception grâce à une architecture découplée."
cover: "/uploads/articles/comment-est-construit-le-site-de-pixi-code-cover.png"
categories:
  - Tech & Dév
tags:
  - "\"Hugo\""
  - "\"Eco-conception\""
  - "\"Performance\""
keywords: 
---

### Sous le capot : Pourquoi nous avons choisi une architecture JAMstack

C'est une règle d'or chez PixiCode : nous n'utilisons pas de technologies par "habitude", mais par "conviction".

Pour notre propre site, nous aurions pu installer un WordPress classique en 5 minutes. Nous avons choisi une voie différente, plus exigeante, mais infiniment plus performante : la **JAMstack**.

Il s'agit d'une architecture découplée (Headless) qui sépare le contenu de la technique. C'est ce qui rend ce site sur lequel vous naviguez ultra-rapide, sécurisé et éco-conçu.

Et par souci de transparence totale, notre code est **Open Source**.  
👉 [Voir le code du site sur GitHub](https://github.com/pixicode-dev/website)

---

### 1. Le problème des sites classiques

La majorité des sites web fonctionnent de manière "Dynamique". À chaque fois que vous cliquez sur une page :
1.  Le serveur reçoit la demande.
2.  Il réveille une base de données.
3.  Il assemble le HTML, le CSS et les images à la volée.
4.  Il vous l'envoie.

**Le problème ?** C'est lent, ça consomme beaucoup d'énergie (calculs serveurs inutiles) et c'est vulnérable (si la base de données tombe, le site tombe).

---

### 2. Notre solution : Le "Statique Dynamique"

Nous avons inversé la logique. Au lieu de construire la page quand vous la demandez, nous construisons toutes les pages **une seule fois**, au moment de la mise à jour du contenu.

Quand vous visitez PixiCode.dev, le serveur ne "calcule" rien. Il vous sert simplement des fichiers HTML déjà prêts. C'est instantané.

#### Les ingrédients de notre Stack :

##### Hugo (Le Moteur)
C'est le générateur de site statique le plus rapide du monde (écrit en Go). C'est lui qui transforme notre code en pages web.
* **Avantage :** Vitesse de build incroyable (moins d'une seconde pour générer tout le site).

##### Strapi (Le Cerveau)
C'est notre CMS "Headless". C'est l'interface où nous rédigeons nos articles et gérons nos projets. Contrairement à WordPress, Strapi ne gère pas l'affichage, il gère juste les données brutes (API).
* **Avantage :** Flexibilité totale et structure de données sur mesure.

##### Les Webhooks (Le Déclencheur)
C'est la magie qui lie le tout. Dès que nous publions un article sur Strapi, un signal automatique (Webhook) est envoyé pour dire à Hugo de reconstruire le site et de le mettre à jour.

---

### 3. Pourquoi c'est une approche "Éco-conçue" ?

L'impact carbone du numérique est majoritairement lié à l'énergie consommée par les terminaux et les serveurs.

Avec cette architecture :
1.  **Zéro calcul à la visite :** Le serveur consomme le strict minimum d'énergie pour livrer le fichier.
2.  **Poids plume :** Pas de scripts lourds ou de plugins inutiles. Le site est léger, donc rapide à télécharger (moins de données transférées = moins de CO2).
3.  **Durabilité :** Un site statique ne "casse" pas. Il n'y a pas de base de données à pirater ni de plugin à mettre à jour en urgence. Dans 5 ans, ce site fonctionnera toujours à l'identique.

---

### 4. Sécurité par Design

C'est l'argument qui convainc nos clients institutionnels.
Sur un site classique, la base de données est exposée à internet. C'est une porte d'entrée pour les pirates (Injections SQL).

Sur notre site, **il n'y a pas de base de données en production**.
Le site n'est composé que de fichiers HTML et CSS. On ne peut pas "hacker" un fichier texte. La surface d'attaque est réduite à néant.

---

### En résumé

| Critère | Site Classique (Monolithique) | Site PixiCode (JAMstack) |
| :--- | :--- | :--- |
| **Vitesse** | Variable (dépend du serveur) | Instantanée (CDN) |
| **Sécurité** | Faible (Base de données exposée) | Maximale (Fichiers statiques) |
| **Coût Héb.** | Élevé (Besoin de puissance) | Faible (Fichiers légers) |
| **Maintenance** | Lourde (Mises à jour constantes) | Nulle (Pas de plugin) |

C'est cette architecture que nous déployons pour nos clients qui ont des besoins critiques de performance et de sécurité.

*Envie de passer à la vitesse supérieure ? Discutons de votre migration vers une architecture moderne.*
