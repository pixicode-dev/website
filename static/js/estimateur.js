/*
 * Estimateur de devis PixiCode — front (vanilla JS, sans dépendance).
 * Flux : 3 étapes (type de projet → détails → coordonnées) puis résultat.
 * À la soumission : POST du payload vers le webhook n8n, affichage de la réponse.
 * Mode démo : ?demo=1 dans l'URL ou data-webhook vide → estimation locale factice
 *             (pour prévisualiser l'interface sans n8n).
 *
 * Contrats de données (payload envoyé / réponse attendue) : voir la doc n8n.
 */
(function () {
  "use strict";

  var root = document.getElementById("estimateur");
  if (!root) return;

  var CONFIG = {
    webhook: (root.dataset.webhook || "").trim(),
    recaptchaKey: (root.dataset.recaptcha || "").trim(),
    demo:
      root.dataset.demo === "1" ||
      new URLSearchParams(window.location.search).has("demo"),
  };

  var TJM = 480; // Taux journalier moyen (grille §1) — sert au mode démo.

  /* ---------------------------------------------------------------------------
   * 0. Icônes SVG (style PixiCode — traits, couleur héritée via currentColor).
   *    Aucune police d'icônes / emoji : SVG inline cohérents avec le reste du site.
   * ------------------------------------------------------------------------- */
  var SVG_ATTR =
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var ICONS = {
    // Site internet — fenêtre de navigateur
    site_web:
      "<svg " +
      SVG_ATTR +
      '><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6 6.5h.01M8.5 6.5h.01"/></svg>',
    // Application mobile — smartphone
    application_mobile:
      "<svg " +
      SVG_ATTR +
      '><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    // Logiciel métier / API — chevrons de code < / >
    logiciel_metier:
      "<svg " +
      SVG_ATTR +
      '><path d="M8.5 8.5 4.5 12l4 3.5"/><path d="M15.5 8.5 19.5 12l-4 3.5"/><path d="M13.6 6.4l-3.2 11.2"/></svg>',
    // Site de collectivité — bâtiment institutionnel
    site_collectivite:
      "<svg " +
      SVG_ATTR +
      '><path d="M3.5 9.5 12 4l8.5 5.5"/><path d="M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8"/><path d="M3.5 21h17"/></svg>',
    // Hébergement / infogérance — serveurs
    hebergement:
      "<svg " +
      SVG_ATTR +
      '><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
    // Confirmation — coche dans un cercle
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-5"/></svg>',
    // Autre projet — point d'interrogation
    autre_projet:
      "<svg " +
      SVG_ATTR +
      '><circle cx="12" cy="12" r="9"/><path d="M9.6 9.1a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.5 1-1.5 1.9v.4"/><path d="M11.5 16.6h.01"/></svg>',
    // Info — note de démonstration
    info:
      "<svg " +
      SVG_ATTR +
      '><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/></svg>',
  };

  /* ---------------------------------------------------------------------------
   * 1. Définition des types de projet et de leurs questions
   * ------------------------------------------------------------------------- */
  var PROJECT_TYPES = [
    {
      value: "site_web",
      label: "Site internet",
      icon: ICONS.site_web,
      desc: "Vitrine, blog, site sur mesure",
    },
    {
      value: "application_mobile",
      label: "Application mobile",
      icon: ICONS.application_mobile,
      desc: "iOS &amp; Android (Flutter)",
    },
    {
      value: "logiciel_metier",
      label: "Logiciel / outil métier",
      icon: ICONS.logiciel_metier,
      desc: "Gestion, automatisation, connexion d'outils",
    },
    /*{
      value: "site_collectivite",
      label: "Site de collectivité",
      icon: ICONS.site_collectivite,
      desc: "Commune, EPCI, office de tourisme",
    },*/
    {
      value: "hebergement",
      label: "Hébergement / maintenance",
      icon: ICONS.hebergement,
      desc: "Un site ou une app déjà en ligne",
    },
    {
      value: "autre_projet",
      label: "Autre projet",
      icon: ICONS.autre_projet || ICONS.logiciel_metier,
      desc: "Rien ne colle ? Décrivez-nous tout",
    },
  ];

  // type: "single" (un choix), "multi" (plusieurs), "bool" (oui/non)
  // Règle : aucune question ne bloque. Chaque question fermée a une échappatoire,
  // et les options marquées input:true ouvrent un champ « précisez ».
  var QUESTIONS = {
    site_web: [
      {
        id: "objectif",
        label: "Votre projet, c'est…",
        type: "single",
        required: true,
        help: "Refaire un site garde votre adresse et vos contenus, mais repart sur une base moderne.",
        options: [
          { value: "creation", label: "Un nouveau site" },
          { value: "refonte", label: "Refaire un site existant" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "volume",
        label: "Quelle taille de site ?",
        type: "single",
        required: true,
        help: "Comptez une page par grande rubrique : accueil, services, à propos, contact…",
        options: [
          { value: "one_page", label: "Une seule page" },
          { value: "standard", label: "Environ 4 pages" },
          { value: "complet", label: "Environ 6 pages + un blog" },
          { value: "sur_mesure", label: "Plus grand que ça" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "cms",
        label: "Voudrez-vous modifier le site vous-même ?",
        type: "single",
        required: true,
        help: "Changer un texte ou une photo depuis une interface simple, sans nous appeler et sans rien casser.",
        options: [
          { value: "none", label: "Non, il bougera peu" },
          { value: "strapi", label: "Oui, en autonomie" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "formulaire",
        label: "Vos visiteurs pourront-ils vous écrire depuis le site ?",
        type: "single",
        help: "Un formulaire simple envoie les messages sur votre email. Un formulaire avancé gère devis, réservations ou pièces jointes.",
        options: [
          { value: "aucun", label: "Non" },
          { value: "standard", label: "Oui, un formulaire de contact" },
          { value: "personnalise", label: "Oui, un formulaire avancé" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "options_site",
        label: "Envie d'options en plus ?",
        type: "multi",
        help: "Cochez tout ce qui vous parle, même dans le doute : on précisera ensemble.",
        options: [
          { value: "rdv", label: "Prise de rendez-vous en ligne" },
          { value: "galerie", label: "Galerie photos" },
          { value: "multilingue", label: "Plusieurs langues" },
          { value: "espace_membre", label: "Espace réservé avec connexion" },
          { value: "autre", label: "Autre chose", input: true },
          { value: "aucune", label: "Rien de tout ça" },
        ],
      },
      {
        id: "hebergement",
        label: "Qui s'occupera de l'hébergement ?",
        type: "single",
        help: "Nous pouvons héberger, surveiller et sauvegarder votre site à partir de 15 € HT par mois.",
        options: [
          { value: "pixicode", label: "PixiCode" },
          { value: "autre", label: "Moi ou un autre prestataire" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
    ],
    application_mobile: [
      {
        id: "plateformes",
        label: "Sur quels téléphones ?",
        type: "single",
        required: true,
        help: "Dans le doute, les deux : notre technologie couvre iPhone et Android pour un seul développement.",
        options: [
          { value: "les_deux", label: "iPhone et Android" },
          { value: "ios", label: "iPhone uniquement" },
          { value: "android", label: "Android uniquement" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "ampleur",
        label: "Quelle taille d'application ?",
        type: "single",
        required: true,
        help: "Un écran = une vue de l'app : accueil, liste, fiche, profil, réglages…",
        options: [
          { value: "petit", label: "Petite (moins de 5 écrans)" },
          { value: "moyen", label: "Moyenne (5 à 15 écrans)" },
          { value: "grand", label: "Grande (plus de 15 écrans)" },
          { value: "nsp", label: "Difficile à dire" },
        ],
      },
      {
        id: "comptes",
        label: "Vos utilisateurs auront-ils un compte ?",
        type: "bool",
        help: "Se connecter (email, Google, Apple) pour retrouver ses informations d'un appareil à l'autre.",
      },
      {
        id: "paiement",
        label: "Y aura-t-il des paiements dans l'app ?",
        type: "single",
        help: "Un achat ponctuel (commande, billet…) ou un abonnement prélevé régulièrement.",
        options: [
          { value: "aucun", label: "Non" },
          { value: "ponctuel", label: "Oui, des achats ponctuels" },
          { value: "abonnement", label: "Oui, des abonnements" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "backoffice",
        label: "Voudrez-vous piloter l'app depuis un espace d'administration ?",
        type: "bool",
        help: "Un espace web pour gérer contenus, utilisateurs et commandes, sans développeur.",
      },
      {
        id: "integrations",
        label: "L'app devra-t-elle se connecter à d'autres services ?",
        type: "multi",
        help: "Cochez tout ce qui s'applique, même dans le doute.",
        options: [
          { value: "paiement", label: "Paiement en ligne (Stripe…)" },
          { value: "crm_erp", label: "Votre logiciel de gestion" },
          { value: "ia", label: "Intelligence artificielle" },
          { value: "api_tierces", label: "Autres services", input: true },
          { value: "aucune", label: "Aucun / je ne sais pas" },
        ],
      },
      {
        id: "avance",
        label: "Des fonctions particulières ?",
        type: "multi",
        help: "Ces fonctions font varier le budget, autant les repérer tôt.",
        options: [
          { value: "temps_reel", label: "Messagerie / chat en direct" },
          { value: "geoloc", label: "Carte / géolocalisation" },
          { value: "hors_ligne", label: "Utilisable sans connexion" },
          { value: "notifications", label: "Notifications sur le téléphone" },
          { value: "autre", label: "Autre chose", input: true },
          { value: "aucune", label: "Aucune" },
        ],
      },
      {
        id: "contenus",
        label: "Et au quotidien, vos utilisateurs pourront…",
        type: "multi",
        help: "Les usages qu'on retrouve dans la plupart des applications.",
        options: [
          { value: "photos_medias", label: "Envoyer des photos ou vidéos" },
          { value: "avis", label: "Laisser des avis et des notes" },
          { value: "agenda", label: "Réserver des créneaux (agenda)" },
          {
            value: "multilingue",
            label: "Utiliser l'app en plusieurs langues",
          },
          { value: "aucune", label: "Rien de tout ça" },
        ],
      },
    ],
    logiciel_metier: [
      {
        id: "nature",
        label: "Quel genre d'outil imaginez-vous ?",
        type: "single",
        required: true,
        help: "Dans le doute, choisissez « Autre » et racontez : c'est notre métier de traduire.",
        options: [
          {
            value: "erp_crm",
            label: "Un outil de gestion (clients, stocks, plannings…)",
          },
          {
            value: "automatisation",
            label: "Automatiser des tâches répétitives",
          },
          {
            value: "api_backend",
            label: "Faire communiquer mes logiciels entre eux",
          },
          { value: "saas", label: "Un produit en ligne à vendre (SaaS)" },
          { value: "autre", label: "Autre / je ne sais pas", input: true },
        ],
      },
      {
        id: "perimetre",
        label: "Combien de grands domaines doit-il couvrir ?",
        type: "single",
        required: true,
        help: "Un domaine = un grand bloc : facturation, planning, stock, rapports…",
        options: [
          { value: "cible", label: "1 ou 2" },
          { value: "moyen", label: "3 à 5" },
          { value: "large", label: "Plus de 5" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "roles",
        label: "Qui l'utilisera ?",
        type: "single",
        help: "Des droits différents selon les personnes : direction, employés, clients…",
        options: [
          { value: "mono", label: "Une seule sorte d'utilisateur" },
          {
            value: "multi_roles",
            label: "Plusieurs profils avec des droits différents",
          },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
      {
        id: "integrations",
        label: "Devra-t-il se connecter à vos outils actuels ?",
        type: "multi",
        help: "Les outils que votre logiciel devra faire parler ensemble.",
        options: [
          { value: "comptabilite", label: "Comptabilité / facturation" },
          { value: "paiement", label: "Paiement en ligne" },
          { value: "ia", label: "Intelligence artificielle" },
          { value: "api_tierces", label: "D'autres logiciels", input: true },
          { value: "aucune", label: "Aucun / je ne sais pas" },
        ],
      },
      {
        id: "migration",
        label: "Des données à récupérer d'un ancien outil ?",
        type: "bool",
        help: "Par exemple un fichier Excel ou un vieux logiciel dont il faut reprendre l'historique.",
      },
      {
        id: "existant",
        label: "On part de quoi ?",
        type: "single",
        help: "Faire évoluer un outil existant commence par un audit de ce qui est en place.",
        options: [
          { value: "scratch", label: "De zéro" },
          {
            value: "sur_existant",
            label: "D'un outil existant à faire évoluer",
          },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
    ],
    site_collectivite: [
      {
        id: "structure",
        label: "Quelle structure ?",
        type: "single",
        required: true,
        options: [
          { value: "commune", label: "Commune / mairie" },
          { value: "epci_syndicat", label: "EPCI / syndicat" },
          { value: "office_tourisme", label: "Office de tourisme" },
          { value: "autre", label: "Autre structure publique", input: true },
        ],
      },
      {
        id: "gestion",
        label: "Qui mettra le site à jour au quotidien ?",
        type: "single",
        required: true,
        help: "Soit vous nous envoyez vos actualités et nous publions, soit vos agents publient eux-mêmes (formation incluse).",
        options: [
          { value: "pixicode", label: "PixiCode s'en charge" },
          { value: "autonome", label: "Nos agents, en autonomie" },
          { value: "nsp", label: "À discuter" },
        ],
      },
      {
        id: "rgaa",
        label: "Souhaitez-vous la mise en conformité accessibilité (RGAA) ?",
        type: "bool",
        help: "L'accessibilité est une obligation légale pour les sites publics ; nous auditons et mettons en conformité.",
      },
      {
        id: "volume",
        label: "Quelle ampleur de site ?",
        type: "single",
        options: [
          { value: "vitrine", label: "Site vitrine" },
          { value: "complet", label: "Site complet (nombreuses rubriques)" },
          { value: "nsp", label: "Je ne sais pas encore" },
        ],
      },
    ],
    hebergement: [
      {
        id: "techno",
        label: "Que faut-il héberger ou maintenir ?",
        type: "single",
        required: true,
        help: "Nous gérons aussi les applications et les cas particuliers : dans le doute, choisissez « Autre » et décrivez votre installation.",
        options: [
          { value: "statique", label: "Un site vitrine" },
          { value: "wordpress", label: "Un site WordPress" },
          {
            value: "app_plateforme",
            label: "Une application web / plateforme",
          },
          { value: "autre", label: "Autre / je ne sais pas", input: true },
        ],
      },
      {
        id: "formulaires",
        label: "Votre site a-t-il des formulaires actifs ?",
        type: "bool",
        help: "Contact, devis, inscription : tout ce qui envoie des messages depuis le site.",
      },
      {
        id: "cms",
        label: "Modifiez-vous le contenu vous-même ?",
        type: "bool",
        help: "Textes, photos ou articles mis à jour par vos soins, via une interface d'administration.",
      },
      {
        id: "collectivite",
        label: "Êtes-vous une structure publique / collectivité ?",
        type: "bool",
        help: "Une gamme dédiée existe pour les communes, avec réversibilité incluse.",
      },
    ],
    autre_projet: [],
  };

  var CONSENT_TEXT =
    "J'accepte que PixiCode utilise mes coordonnées pour me recontacter au sujet de ma demande d'estimation.";

  /* ---------------------------------------------------------------------------
   * 2. État
   * ------------------------------------------------------------------------- */
  var state = {
    step: 0, // 0=type, 1=détails, 2=coordonnées, 3=résultat
    type: null,
    answers: {},
    description: "",
    contact: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      role: "",
    },
    consent: false,
  };
  var TOTAL_STEPS = 3;

  /* ---------------------------------------------------------------------------
   * 3. Utilitaires DOM
   * ------------------------------------------------------------------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return; // on n'ajoute pas les attributs vides
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.indexOf("on") === 0 && typeof v === "function")
          node.addEventListener(k.slice(2), v);
        else if (k === "checked") node.checked = true;
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isPhone(v) {
    return v.replace(/[^0-9+]/g, "").length >= 8;
  }

  /* ---------------------------------------------------------------------------
   * 4. Rendu
   * ------------------------------------------------------------------------- */
  function render() {
    clear(root);
    root.appendChild(buildProgress());
    var body = el("div", { class: "est-body" });
    if (state.step === 0) body.appendChild(renderTypeStep());
    else if (state.step === 1) body.appendChild(renderDetailsStep());
    else if (state.step === 2) body.appendChild(renderContactStep());
    root.appendChild(body);
    // focus sur le premier champ interactif pour l'accessibilité
    var first = body.querySelector("button, input, textarea, [tabindex]");
    if (first && state.step > 0) first.focus();
  }

  function buildProgress() {
    var pct = (Math.min(state.step, TOTAL_STEPS) / TOTAL_STEPS) * 100;
    var labels = ["Projet", "Détails", "Coordonnées"];
    var steps = labels.map(function (lbl, i) {
      return el(
        "span",
        { class: "est-progress-step" + (i <= state.step ? " is-active" : "") },
        [
          el("span", { class: "est-progress-dot" }, [String(i + 1)]),
          el("span", { class: "est-progress-label" }, [lbl]),
        ],
      );
    });
    return el("div", { class: "est-progress", "aria-hidden": "true" }, [
      el("div", { class: "est-progress-track" }, [
        el("div", { class: "est-progress-fill", style: "width:" + pct + "%" }),
      ]),
      el("div", { class: "est-progress-steps" }, steps),
    ]);
  }

  /* --- Étape 0 : type de projet --- */
  function renderTypeStep() {
    var wrap = el("fieldset", { class: "est-step" }, [
      el("legend", { class: "est-legend" }, ["Quel est votre projet ?"]),
      el("p", { class: "est-hint" }, [
        "Sélectionnez la catégorie la plus proche — vous préciserez ensuite.",
      ]),
    ]);
    var grid = el("div", { class: "est-type-grid" });
    PROJECT_TYPES.forEach(function (t) {
      var selected = state.type === t.value;
      var card = el(
        "button",
        {
          type: "button",
          class: "est-type-card" + (selected ? " is-selected" : ""),
          "aria-pressed": selected ? "true" : "false",
          onclick: function () {
            state.type = t.value;
            state.answers = {};
            state.step = 1;
            render();
          },
        },
        [
          el("span", { class: "est-type-icon", html: t.icon }),
          el("span", { class: "est-type-label" }, [t.label]),
          el("span", { class: "est-type-desc", html: t.desc }),
        ],
      );
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* --- Étape 1 : détails --- */
  function renderDetailsStep() {
    var qs = QUESTIONS[state.type] || [];
    var typeLabel = typeMeta(state.type).label;
    var wrap = el("div", { class: "est-step" }, [
      el("div", { class: "est-step-head" }, [
        el("h3", { class: "est-legend" }, ["Votre projet : " + typeLabel]),
        el(
          "button",
          {
            type: "button",
            class: "est-link",
            onclick: function () {
              state.step = 0;
              render();
            },
          },
          ["← changer"],
        ),
      ]),
    ]);

    qs.forEach(function (q) {
      wrap.appendChild(renderQuestion(q));
    });

    // Description libre (obligatoire pour « Autre projet », qui n'a pas de questions)
    var isAutre = state.type === "autre_projet";
    wrap.appendChild(
      el("div", { class: "est-field" }, [
        el("label", { class: "est-q-label", for: "est-desc" }, [
          isAutre
            ? "Décrivez votre projet ou votre besoin"
            : "Décrivez votre projet en quelques lignes",
          isAutre
            ? el("span", { class: "est-req", title: "Requis" }, [" *"])
            : null,
        ]),
        el("span", { class: "est-hint" }, [
          isAutre
            ? "Quelques phrases suffisent : ce que vous voulez faire, pour qui, et ce qui existe déjà. On s'occupe de la traduction technique."
            : "Optionnel, mais ça affine nettement l'estimation.",
        ]),
        el("textarea", {
          id: "est-desc",
          class: "est-textarea",
          rows: "4",
          placeholder: isAutre
            ? "Par exemple : « Je voudrais un outil pour… aujourd'hui on fait ça avec… »"
            : "Contexte, objectifs, contraintes, délais souhaités…",
          oninput: function (e) {
            state.description = e.target.value;
            clearError();
          },
        }),
      ]),
    );
    if (state.description)
      wrap.querySelector("#est-desc").value = state.description;

    wrap.appendChild(
      el("div", { class: "est-error", id: "est-error", "aria-live": "polite" }),
    );
    wrap.appendChild(
      navButtons(
        function () {
          state.step = 0;
          render();
        },
        function () {
          if (validateDetails()) {
            state.step = 2;
            render();
          }
        },
        "Continuer",
      ),
    );
    return wrap;
  }

  function renderQuestion(q) {
    var field = el("div", { class: "est-field", "data-qid": q.id });
    field.appendChild(
      el("span", { class: "est-q-label" }, [
        decode(q.label),
        q.required
          ? el("span", { class: "est-req", title: "Requis" }, [" *"])
          : null,
      ]),
    );
    if (q.help) field.appendChild(el("span", { class: "est-hint" }, [q.help]));

    if (q.type === "bool") {
      field.appendChild(
        renderChoices(
          q,
          [
            { value: "oui", label: "Oui" },
            { value: "non", label: "Non" },
          ],
          false,
        ),
      );
    } else {
      field.appendChild(renderChoices(q, q.options, q.type === "multi"));
    }

    // Champ « précisez » quand une option marquée input:true est sélectionnée
    var opts = q.type === "bool" ? [] : q.options || [];
    var needsInput = opts.some(function (o) {
      if (!o.input) return false;
      return q.type === "multi"
        ? Array.isArray(state.answers[q.id]) &&
            state.answers[q.id].indexOf(o.value) !== -1
        : state.answers[q.id] === o.value;
    });
    if (needsInput) {
      field.appendChild(
        el("div", { class: "est-precision" }, [
          el("input", {
            class: "est-input",
            type: "text",
            placeholder: "Dites-nous en quelques mots (facultatif)",
            value: state.answers[q.id + "_precision"] || "",
            oninput: function (e) {
              state.answers[q.id + "_precision"] = e.target.value;
            },
          }),
        ]),
      );
    }
    return field;
  }

  function renderChoices(q, options, multi) {
    var group = el("div", {
      class: "est-choices",
      role: multi ? "group" : "radiogroup",
      "aria-label": decode(q.label),
    });
    options.forEach(function (opt) {
      var active = multi
        ? Array.isArray(state.answers[q.id]) &&
          state.answers[q.id].indexOf(opt.value) !== -1
        : state.answers[q.id] === opt.value;
      var chip = el(
        "button",
        {
          type: "button",
          class: "est-chip" + (active ? " is-active" : ""),
          role: multi ? "checkbox" : "radio",
          "aria-checked": active ? "true" : "false",
          onclick: function () {
            if (multi) {
              var arr = Array.isArray(state.answers[q.id])
                ? state.answers[q.id].slice()
                : [];
              if (opt.value === "aucune") {
                arr = ["aucune"];
              } else {
                arr = arr.filter(function (v) {
                  return v !== "aucune";
                });
                var i = arr.indexOf(opt.value);
                if (i === -1) arr.push(opt.value);
                else arr.splice(i, 1);
              }
              state.answers[q.id] = arr;
            } else {
              state.answers[q.id] = opt.value;
            }
            // re-render local du groupe
            var parent = chip.closest(".est-field");
            var fresh = renderQuestion(q);
            parent.parentNode.replaceChild(fresh, parent);
            clearError();
          },
        },
        [decode(opt.label)],
      );
      group.appendChild(chip);
    });
    return group;
  }

  /* --- Étape 2 : coordonnées --- */
  function renderContactStep() {
    var wrap = el("div", { class: "est-step" }, [
      el("h3", { class: "est-legend" }, ["Vos coordonnées"]),
      el("p", { class: "est-hint" }, [
        "Nous vous envoyons votre estimation détaillée et vous recontactons sous 24 h ouvrées. Aucune donnée n'est revendue.",
      ]),
    ]);
    var grid = el("div", { class: "est-contact-grid" });
    grid.appendChild(textField("first_name", "Prénom", "text", true));
    grid.appendChild(textField("last_name", "Nom", "text", true));
    grid.appendChild(textField("email", "Email", "email", true));
    grid.appendChild(textField("phone", "Téléphone", "tel", true));
    grid.appendChild(
      textField("company", "Entreprise / organisation", "text", true),
    );
    grid.appendChild(
      textField("role", "Votre fonction (optionnel)", "text", false),
    );
    wrap.appendChild(grid);

    var consentId = "est-consent";
    wrap.appendChild(
      el("label", { class: "est-consent", for: consentId }, [
        el("input", {
          type: "checkbox",
          id: consentId,
          checked: state.consent ? "checked" : null,
          onchange: function (e) {
            state.consent = e.target.checked;
            clearError();
          },
        }),
        el("span", {}, [
          CONSENT_TEXT + " ",
          el(
            "a",
            {
              href: "/politique-confidentialite/",
              target: "_blank",
              rel: "noopener",
            },
            ["Politique de confidentialité"],
          ),
          ".",
        ]),
      ]),
    );

    wrap.appendChild(
      el("div", { class: "est-error", id: "est-error", "aria-live": "polite" }),
    );
    wrap.appendChild(
      navButtons(
        function () {
          state.step = 1;
          render();
        },
        submit,
        "Obtenir mon estimation",
      ),
    );
    return wrap;
  }

  function textField(id, label, type, required) {
    var inputId = "est-" + id;
    return el("div", { class: "est-field" }, [
      el("label", { class: "est-q-label", for: inputId }, [
        label,
        required ? el("span", { class: "est-req" }, [" *"]) : null,
      ]),
      el("input", {
        id: inputId,
        class: "est-input",
        type: type,
        value: state.contact[id] || "",
        autocomplete:
          id === "first_name"
            ? "given-name"
            : id === "last_name"
              ? "family-name"
              : id === "email"
                ? "email"
                : id === "phone"
                  ? "tel"
                  : id === "company"
                    ? "organization"
                    : "off",
        oninput: function (e) {
          state.contact[id] = e.target.value;
          clearError();
        },
      }),
    ]);
  }

  function navButtons(onBack, onNext, nextLabel) {
    return el("div", { class: "est-nav" }, [
      el(
        "button",
        { type: "button", class: "est-btn est-btn-ghost", onclick: onBack },
        ["← Retour"],
      ),
      el(
        "button",
        {
          type: "button",
          class: "est-btn est-btn-primary",
          id: "est-next",
          onclick: onNext,
        },
        [nextLabel],
      ),
    ]);
  }

  /* ---------------------------------------------------------------------------
   * 5. Validation
   * ------------------------------------------------------------------------- */
  function validateDetails() {
    if (state.type === "autre_projet" && !state.description.trim()) {
      showError(
        "Décrivez votre projet en quelques phrases pour qu'on puisse l'estimer.",
      );
      var d = root.querySelector("#est-desc");
      if (d) d.focus();
      return false;
    }
    var qs = QUESTIONS[state.type] || [];
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (q.required) {
        var a = state.answers[q.id];
        var empty =
          a == null || a === "" || (Array.isArray(a) && a.length === 0);
        if (empty) {
          showError("Merci de répondre à : « " + decode(q.label) + " »");
          var node = root.querySelector('[data-qid="' + q.id + '"]');
          if (node)
            node.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }
    }
    return true;
  }

  function validateContact() {
    var c = state.contact;
    if (!c.first_name.trim() || !c.last_name.trim())
      return "Merci d'indiquer votre prénom et votre nom.";
    if (!isEmail(c.email)) return "L'adresse email ne semble pas valide.";
    if (!isPhone(c.phone))
      return "Le numéro de téléphone ne semble pas valide.";
    if (!c.company.trim())
      return "Merci d'indiquer votre entreprise ou organisation.";
    if (!state.consent)
      return "Merci d'accepter d'être recontacté pour recevoir votre estimation.";
    return null;
  }

  function showError(msg) {
    var box = root.querySelector("#est-error");
    if (!box) {
      alert(msg);
      return;
    }
    box.textContent = msg;
    box.classList.add("is-visible");
  }
  function clearError() {
    var box = root.querySelector("#est-error");
    if (box) {
      box.textContent = "";
      box.classList.remove("is-visible");
    }
  }

  /* ---------------------------------------------------------------------------
   * 6. Soumission
   * ------------------------------------------------------------------------- */
  function buildPayload(token) {
    return {
      meta: {
        source: "estimateur-pixicode",
        version: "1.0",
        page: window.location.href,
        submitted_at_client: new Date().toISOString(),
      },
      project: {
        type: state.type,
        type_label: typeMeta(state.type).label,
        answers: state.answers,
        answers_readable: readableAnswers(),
      },
      description: state.description || "",
      contact: {
        first_name: state.contact.first_name.trim(),
        last_name: state.contact.last_name.trim(),
        email: state.contact.email.trim(),
        phone: state.contact.phone.trim(),
        company: state.contact.company.trim(),
        role: (state.contact.role || "").trim(),
      },
      consent: {
        rgpd: true,
        timestamp: new Date().toISOString(),
        text: CONSENT_TEXT,
      },
      recaptcha_token: token || "",
    };
  }

  function readableAnswers() {
    var qs = QUESTIONS[state.type] || [];
    var out = [];
    qs.forEach(function (q) {
      var a = state.answers[q.id];
      if (a == null || a === "" || (Array.isArray(a) && a.length === 0)) return;
      out.push({ question: decode(q.label), answer: labelFor(q, a) });
    });
    return out;
  }

  function labelFor(q, a) {
    if (q.type === "bool") return a === "oui" ? "Oui" : "Non";
    var opts = q.options || [];
    function lab(v) {
      for (var i = 0; i < opts.length; i++)
        if (opts[i].value === v) return decode(opts[i].label);
      return v;
    }
    var txt = Array.isArray(a) ? a.map(lab).join(", ") : lab(a);
    var prec = state.answers[q.id + "_precision"];
    if (prec && String(prec).trim())
      txt += " (précision : " + String(prec).trim() + ")";
    return txt;
  }

  function submit() {
    var err = validateContact();
    if (err) {
      showError(err);
      return;
    }
    clearError();
    setLoading(true);

    getRecaptchaToken(function (token) {
      var payload = buildPayload(token);

      if (CONFIG.demo || !CONFIG.webhook) {
        window.setTimeout(function () {
          setLoading(false);
          showResult(mockEstimate(), true);
        }, 900);
        return;
      }

      fetch(CONFIG.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          setLoading(false);
          showResult(data, false);
        })
        .catch(function () {
          setLoading(false);
          showNetworkError();
        });
    });
  }

  function setLoading(on) {
    var btn = root.querySelector("#est-next");
    if (!btn) return;
    btn.disabled = on;
    btn.textContent = on ? "Calcul en cours…" : "Obtenir mon estimation";
  }

  /* --- reCAPTCHA v3 (optionnel) --- */
  function getRecaptchaToken(cb) {
    if (!CONFIG.recaptchaKey || CONFIG.demo) {
      cb("");
      return;
    }
    try {
      if (window.grecaptcha && window.grecaptcha.execute) {
        window.grecaptcha.ready(function () {
          window.grecaptcha
            .execute(CONFIG.recaptchaKey, { action: "estimation" })
            .then(function (t) {
              cb(t);
            })
            .catch(function () {
              cb("");
            });
        });
      } else {
        cb("");
      }
    } catch (e) {
      cb("");
    }
  }

  /* ---------------------------------------------------------------------------
   * 7. Résultat
   * ------------------------------------------------------------------------- */
  function fmt(n) {
    return Number(n).toLocaleString("fr-FR");
  }

  // Construit l'affichage d'un prix (nœuds DOM). Si low == high → un seul montant.
  // rangePrefix (ex. "Entre ") n'apparaît que pour une vraie fourchette.
  function priceNodes(low, high, suffix, rangePrefix) {
    if (high == null || high === low) {
      return [el("strong", {}, [fmt(low)]), " " + suffix];
    }
    var out = [];
    var sep = rangePrefix ? " et " : " – ";
    if (rangePrefix) out.push(rangePrefix);
    out.push(
      el("strong", {}, [fmt(low)]),
      sep,
      el("strong", {}, [fmt(high)]),
      " " + suffix,
    );
    return out;
  }

  function showResult(data, isDemo) {
    clear(root);
    data = data || {};
    var card = el("div", {
      class: "est-result",
      role: "status",
      "aria-live": "polite",
    });

    var hasRange = data.range && data.range.low != null;
    var hasRecurring = data.recurring && data.recurring.low != null;

    if (data.status === "needs_scoping" || (!hasRange && !hasRecurring)) {
      card.appendChild(
        el("div", { class: "est-result-badge" }, ["Projet à cadrer ensemble"]),
      );
      card.appendChild(
        el("h3", { class: "est-result-title" }, [
          "Votre projet mérite un échange dédié",
        ]),
      );
      card.appendChild(
        el("p", { class: "est-result-msg" }, [
          data.message ||
            "Il sort du cadre d'une estimation automatique. Nous revenons vers vous très vite pour en parler précisément.",
        ]),
      );
    } else {
      card.appendChild(
        el("div", { class: "est-result-badge" }, [
          "Votre estimation indicative",
        ]),
      );

      // isMonthly : uniquement du récurrent (hébergement/maintenance), pas de forfait
      var isMonthly = !hasRange && hasRecurring;
      var per = (data.recurring && data.recurring.period) || "mois";

      if (hasRange) {
        // Forfait (chiffre principal)
        card.appendChild(
          el(
            "div",
            { class: "est-result-range" },
            priceNodes(data.range.low, data.range.high, "€ HT", "Entre "),
          ),
        );
        // Récurrent éventuel affiché EN DESSOUS
        if (hasRecurring) {
          card.appendChild(
            el(
              "div",
              { class: "est-result-recurring" },
              ["puis " + (data.recurring.label || "abonnement") + " : "].concat(
                priceNodes(
                  data.recurring.low,
                  data.recurring.high,
                  "€ / " + per + " HT",
                ),
              ),
            ),
          );
        }
      } else {
        // Mensuel seul : le mensuel devient le chiffre principal, pas d'annualisation
        card.appendChild(
          el(
            "div",
            { class: "est-result-range" },
            priceNodes(
              data.recurring.low,
              data.recurring.high,
              "€ / " + per + " HT",
            ),
          ),
        );
        if (data.recurring.label) {
          card.appendChild(
            el("div", { class: "est-result-recurring" }, [
              data.recurring.label,
            ]),
          );
        }
      }

      if (data.message)
        card.appendChild(el("p", { class: "est-result-msg" }, [data.message]));

      if (Array.isArray(data.lines) && data.lines.length) {
        var suffix = isMonthly ? " €/" + per : " €";
        var ul = el("ul", { class: "est-result-lines" });
        data.lines.forEach(function (l) {
          ul.appendChild(
            el("li", {}, [
              el("span", {}, [l.label]),
              el("span", { class: "est-result-amount" }, [
                l.amount != null ? fmt(l.amount) + suffix : "—",
              ]),
            ]),
          );
        });
        card.appendChild(
          el("details", { class: "est-result-detail" }, [
            el("summary", {}, ["Voir le détail"]),
            ul,
          ]),
        );
      }
    }

    card.appendChild(
      el("p", { class: "est-result-disclaimer" }, [
        data.disclaimer ||
          "Estimation indicative HT, hors taxes, sous réserve d'un cadrage. Elle ne constitue pas un devis contractuel. Valable 30 jours.",
      ]),
    );

    card.appendChild(
      el("div", { class: "est-result-cta" }, [
        el("span", {
          class: "est-result-confirm",
          html:
            ICONS.check +
            "<span>Votre demande nous est parvenue nous vous recontactons sous 24 h ouvrées.</span>",
        }),
        el("a", { class: "est-btn est-btn-primary", href: "/contact/" }, [
          "Nous contacter directement",
        ]),
      ]),
    );

    if (isDemo) {
      card.appendChild(
        el("p", {
          class: "est-demo-note",
          html:
            ICONS.info +
            "<span>Aperçu de démonstration (n8n non connecté) — chiffres illustratifs.</span>",
        }),
      );
    }

    root.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showNetworkError() {
    clearError();
    var box =
      root.querySelector("#est-error") ||
      root.appendChild(el("div", { class: "est-error", id: "est-error" }));
    box.classList.add("is-visible");
    clear(box);
    box.appendChild(
      el("span", {}, [
        "Une erreur réseau a interrompu l'envoi. Réessayez, ou écrivez-nous à ",
      ]),
    );
    box.appendChild(
      el("a", { href: "mailto:contact@pixicode.dev" }, [
        "contact@pixicode.dev",
      ]),
    );
    box.appendChild(el("span", {}, ["."]));
    setLoading(false);
  }

  /* ---------------------------------------------------------------------------
   * 8. Mode démo — estimation locale factice
   * ------------------------------------------------------------------------- */
  function mockEstimate() {
    var a = state.answers;
    if (state.type === "autre_projet") {
      return {
        status: "needs_scoping",
        message:
          "Votre demande est bien enregistrée. Elle sort des cas standards, alors c'est un humain qui la chiffre : nous revenons vers vous sous 24 h ouvrées avec une première estimation.",
      };
    }
    var range = null,
      recurring = null,
      days = null,
      lines = [];

    if (state.type === "site_web") {
      var base = {
        one_page: [900, 1100],
        standard: [3150, 3800],
        complet: [4080, 4900],
        sur_mesure: [4800, 7000],
      }[a.volume] || [900, 1100];
      if (a.cms === "strapi" && a.volume !== "sur_mesure") base = [4800, 6500];
      function opt(v) {
        return (
          Array.isArray(a.options_site) && a.options_site.indexOf(v) !== -1
        );
      }
      if (opt("espace_membre") && base[0] < 4800) base = [4800, 6500];
      lines.push({ label: "Création du site", amount: base[0] });
      if (a.formulaire === "personnalise") {
        lines.push({
          label: "Formulaire avancé + mise en production",
          amount: 600,
        });
        base = [base[0] + 600, base[1] + 600];
      }
      if (opt("rdv")) {
        lines.push({ label: "Prise de rendez-vous en ligne", amount: 1900 });
        base = [base[0] + 1900, base[1] + 1900];
      }
      if (opt("multilingue")) {
        lines.push({ label: "Version multilingue", amount: 1400 });
        base = [base[0] + 1400, base[1] + 1400];
      }
      if (opt("galerie")) {
        lines.push({ label: "Galerie photos / portfolio", amount: 500 });
        base = [base[0] + 500, base[1] + 500];
      }
      range = { low: base[0], high: base[1] };
      recurring =
        a.hebergement === "autre"
          ? null
          : {
              low: 15,
              high: 55,
              period: "mois",
              label: "Hébergement & infogérance",
            };
    } else if (state.type === "site_collectivite") {
      var lo = 5760,
        hi = 8000;
      if (a.rgaa === "oui") {
        lines.push({ label: "Audit & conformité RGAA", amount: 1440 });
        lo += 1440;
        hi += 1440;
      }
      lines.unshift({
        label: "Site de collectivité (sur mesure)",
        amount: 5760,
      });
      range = { low: lo, high: hi };
      recurring = {
        low: 30,
        high: 95,
        period: "mois",
        label: "Hébergement gamme Communes",
      };
    } else if (state.type === "hebergement") {
      if (a.techno === "wordpress")
        recurring = {
          low: 85,
          high: 95,
          period: "mois",
          label: "Infogérance WordPress",
        };
      else if (a.techno === "app_plateforme")
        recurring = {
          low: 120,
          high: 190,
          period: "mois",
          label: "TMA applicative (Socle à Critique)",
        };
      else if (a.techno === "autre")
        recurring = {
          low: 15,
          high: 190,
          period: "mois",
          label: "Infogérance sur mesure (à préciser ensemble)",
        };
      else
        recurring = {
          low: 15,
          high: 55,
          period: "mois",
          label: "Hébergement & infogérance",
        };
      // Hébergement = mensuel seul (pas de forfait, pas d'annualisation trompeuse)
      return {
        status: "ok",
        range: null,
        recurring: recurring,
        message:
          "Il s'agit d'un abonnement mensuel d'hébergement et d'infogérance (un mois offert au règlement annuel). Nous confirmons le forfait exact après un rapide échange sur votre installation.",
      };
    } else {
      // mobile / logiciel → jours × TJM, haute +20 %
      var d =
        state.type === "application_mobile"
          ? { petit: 15, moyen: 28, grand: 50 }[a.ampleur] || 20
          : { cible: 15, moyen: 30, large: 55 }[a.perimetre] || 20;
      // quelques modificateurs illustratifs (cohérents avec le barème du prompt)
      function picked(id, v) {
        return Array.isArray(a[id]) && a[id].indexOf(v) !== -1;
      }
      if (a.paiement === "abonnement") d += 7;
      else if (a.paiement === "ponctuel") d += 3;
      if (a.comptes === "oui") d += 4;
      if (a.backoffice === "oui") d += 8;
      if (a.roles === "multi_roles") d += 7;
      if (a.migration === "oui") d += 7;
      if (picked("integrations", "ia")) d += 6;
      if (
        picked("integrations", "paiement") ||
        picked("integrations", "crm_erp") ||
        picked("integrations", "comptabilite") ||
        picked("integrations", "api_tierces")
      )
        d += 3;
      if (picked("avance", "temps_reel")) d += 6;
      if (picked("avance", "hors_ligne")) d += 5;
      if (picked("avance", "geoloc")) d += 3;
      if (picked("avance", "notifications")) d += 2;
      if (picked("contenus", "photos_medias")) d += 3;
      if (picked("contenus", "agenda")) d += 4;
      if (picked("contenus", "avis")) d += 2;
      if (picked("contenus", "multilingue")) d += 3;
      days = d;
      range = {
        low: Math.round((d * TJM) / 100) * 100,
        high: Math.round((Math.ceil(d * 1.2) * TJM) / 100) * 100,
      };
    }

    return {
      status: "ok",
      range: range,
      recurring: recurring,
      estimated_days: days,
      lines: lines,
    };
  }

  /* ---------------------------------------------------------------------------
   * 9. Helpers divers
   * ------------------------------------------------------------------------- */
  function typeMeta(v) {
    for (var i = 0; i < PROJECT_TYPES.length; i++)
      if (PROJECT_TYPES[i].value === v) return PROJECT_TYPES[i];
    return { label: v, icon: "" };
  }
  // décode les entités HTML présentes dans les libellés (&amp; etc.)
  var _dec = document.createElement("textarea");
  function decode(s) {
    _dec.innerHTML = s;
    return _dec.value;
  }

  /* --- Go --- */
  render();
})();
