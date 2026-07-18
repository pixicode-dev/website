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
  var SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var ICONS = {
    // Site internet — fenêtre de navigateur
    site_web:
      '<svg ' + SVG_ATTR + '><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6 6.5h.01M8.5 6.5h.01"/></svg>',
    // Application mobile — smartphone
    application_mobile:
      '<svg ' + SVG_ATTR + '><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    // Logiciel métier / API — chevrons de code < / >
    logiciel_metier:
      '<svg ' + SVG_ATTR + '><path d="M8.5 8.5 4.5 12l4 3.5"/><path d="M15.5 8.5 19.5 12l-4 3.5"/><path d="M13.6 6.4l-3.2 11.2"/></svg>',
    // Site de collectivité — bâtiment institutionnel
    site_collectivite:
      '<svg ' + SVG_ATTR + '><path d="M3.5 9.5 12 4l8.5 5.5"/><path d="M5.5 10v8M9.5 10v8M14.5 10v8M18.5 10v8"/><path d="M3.5 21h17"/></svg>',
    // Hébergement / infogérance — serveurs
    hebergement:
      '<svg ' + SVG_ATTR + '><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
    // Confirmation — coche dans un cercle
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-5"/></svg>',
    // Info — note de démonstration
    info:
      '<svg ' + SVG_ATTR + '><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01"/></svg>',
  };

  /* ---------------------------------------------------------------------------
   * 1. Définition des types de projet et de leurs questions
   * ------------------------------------------------------------------------- */
  var PROJECT_TYPES = [
    { value: "site_web", label: "Site internet", icon: ICONS.site_web, desc: "Vitrine, blog, site sur mesure" },
    { value: "application_mobile", label: "Application mobile", icon: ICONS.application_mobile, desc: "iOS &amp; Android (Flutter)" },
    { value: "logiciel_metier", label: "Logiciel métier / API", icon: ICONS.logiciel_metier, desc: "ERP, CRM, backend, automatisation" },
    { value: "site_collectivite", label: "Site de collectivité", icon: ICONS.site_collectivite, desc: "Commune, EPCI, office de tourisme" },
    { value: "hebergement", label: "Hébergement / infogérance", icon: ICONS.hebergement, desc: "Maintenance d'un site existant" },
  ];

  // type: "single" (un choix), "multi" (plusieurs), "bool" (oui/non)
  var QUESTIONS = {
    site_web: [
      { id: "objectif", label: "Votre projet, c'est…", type: "single", required: true, options: [
        { value: "creation", label: "Une création (nouveau site)" },
        { value: "refonte", label: "Une refonte (site existant à refaire)" },
      ]},
      { id: "volume", label: "Quelle ampleur ?", type: "single", required: true, options: [
        { value: "one_page", label: "Un site vitrine simple (1 page)" },
        { value: "standard", label: "Un site standard (~4 pages)" },
        { value: "complet", label: "Un site complet (~6 pages + blog)" },
        { value: "sur_mesure", label: "Plus ambitieux / sur mesure" },
      ]},
      { id: "cms", label: "Voulez-vous gérer le contenu vous-même ?", type: "single", required: true, options: [
        { value: "none", label: "Non, pas besoin" },
        { value: "strapi", label: "Oui, avec un back-office autonome (CMS)" },
      ]},
      { id: "formulaire", label: "Besoin d'un formulaire ?", type: "single", options: [
        { value: "aucun", label: "Aucun" },
        { value: "standard", label: "Formulaire de contact simple" },
        { value: "personnalise", label: "Formulaire avancé (champs conditionnels, intégrations)" },
      ]},
      { id: "hebergement", label: "Hébergement &amp; maintenance ?", type: "single", options: [
        { value: "pixicode", label: "Oui, par PixiCode" },
        { value: "autre", label: "Non, j'héberge ailleurs" },
      ]},
    ],
    application_mobile: [
      { id: "plateformes", label: "Quelles plateformes ?", type: "single", required: true, options: [
        { value: "les_deux", label: "iOS et Android" },
        { value: "ios", label: "iOS uniquement" },
        { value: "android", label: "Android uniquement" },
      ]},
      { id: "ampleur", label: "Combien d'écrans / de fonctionnalités ?", type: "single", required: true, options: [
        { value: "petit", label: "Peu (moins de 5 écrans)" },
        { value: "moyen", label: "Moyen (5 à 15 écrans)" },
        { value: "grand", label: "Beaucoup (plus de 15 écrans)" },
      ]},
      { id: "comptes", label: "Comptes utilisateurs / connexion ?", type: "bool" },
      { id: "paiement", label: "Paiement dans l'app ?", type: "single", options: [
        { value: "aucun", label: "Aucun" },
        { value: "ponctuel", label: "Paiement ponctuel" },
        { value: "abonnement", label: "Abonnements récurrents" },
      ]},
      { id: "backoffice", label: "Back-office d'administration ?", type: "bool" },
      { id: "integrations", label: "Intégrations prévues ?", type: "multi", options: [
        { value: "paiement", label: "Paiement (Stripe…)" },
        { value: "crm_erp", label: "CRM / ERP" },
        { value: "api_tierces", label: "API tierces" },
        { value: "aucune", label: "Aucune / je ne sais pas" },
      ]},
      { id: "avance", label: "Fonctions avancées ?", type: "multi", options: [
        { value: "temps_reel", label: "Temps réel (chat, live)" },
        { value: "geoloc", label: "Géolocalisation" },
        { value: "hors_ligne", label: "Mode hors-ligne" },
        { value: "notifications", label: "Notifications push" },
        { value: "aucune", label: "Aucune" },
      ]},
    ],
    logiciel_metier: [
      { id: "nature", label: "De quel type d'outil s'agit-il ?", type: "single", required: true, options: [
        { value: "erp_crm", label: "ERP / CRM (gestion métier)" },
        { value: "api_backend", label: "API / backend" },
        { value: "automatisation", label: "Automatisation de processus (n8n)" },
        { value: "saas", label: "Plateforme SaaS" },
      ]},
      { id: "perimetre", label: "Quelle ampleur fonctionnelle ?", type: "single", required: true, options: [
        { value: "cible", label: "Ciblé (1 à 2 modules)" },
        { value: "moyen", label: "Moyen (3 à 5 modules)" },
        { value: "large", label: "Large (plus de 5 modules)" },
      ]},
      { id: "roles", label: "Gestion des utilisateurs ?", type: "single", options: [
        { value: "mono", label: "Simple (un seul type d'utilisateur)" },
        { value: "multi_roles", label: "Multi-rôles / droits différenciés" },
      ]},
      { id: "integrations", label: "Connexions à d'autres outils ?", type: "multi", options: [
        { value: "comptabilite", label: "Comptabilité / facturation" },
        { value: "paiement", label: "Paiement" },
        { value: "api_tierces", label: "API tierces" },
        { value: "aucune", label: "Aucune / je ne sais pas" },
      ]},
      { id: "migration", label: "Migration de données depuis un outil existant ?", type: "bool" },
      { id: "existant", label: "Point de départ ?", type: "single", options: [
        { value: "scratch", label: "Nouveau projet, de zéro" },
        { value: "sur_existant", label: "Faire évoluer un existant" },
      ]},
    ],
    site_collectivite: [
      { id: "structure", label: "Quelle structure ?", type: "single", required: true, options: [
        { value: "commune", label: "Commune / mairie" },
        { value: "epci_syndicat", label: "EPCI / syndicat" },
        { value: "office_tourisme", label: "Office de tourisme" },
      ]},
      { id: "gestion", label: "Gestion du contenu au quotidien ?", type: "single", required: true, options: [
        { value: "pixicode", label: "Déléguée à PixiCode" },
        { value: "autonome", label: "Assurée par nos agents (autonome)" },
      ]},
      { id: "rgaa", label: "Mise en conformité accessibilité RGAA ?", help: "Obligation légale pour les sites publics.", type: "bool" },
      { id: "volume", label: "Ampleur du site ?", type: "single", options: [
        { value: "vitrine", label: "Site vitrine" },
        { value: "complet", label: "Site complet (nombreuses rubriques)" },
      ]},
    ],
    hebergement: [
      { id: "techno", label: "Quelle technologie ?", type: "single", required: true, options: [
        { value: "statique", label: "Site statique (Hugo / JAMstack)" },
        { value: "wordpress", label: "WordPress" },
      ]},
      { id: "formulaires", label: "Formulaires en production ?", type: "bool" },
      { id: "cms", label: "CMS autonome (contenu géré par vous) ?", type: "bool" },
      { id: "collectivite", label: "Structure publique / collectivité ?", type: "bool" },
    ],
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
    contact: { first_name: "", last_name: "", email: "", phone: "", company: "", role: "" },
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
    var pct = Math.min(state.step, TOTAL_STEPS) / TOTAL_STEPS * 100;
    var labels = ["Projet", "Détails", "Coordonnées"];
    var steps = labels.map(function (lbl, i) {
      return el("span", { class: "est-progress-step" + (i <= state.step ? " is-active" : "") }, [
        el("span", { class: "est-progress-dot" }, [String(i + 1)]),
        el("span", { class: "est-progress-label" }, [lbl]),
      ]);
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
      el("p", { class: "est-hint" }, ["Sélectionnez la catégorie la plus proche — vous préciserez ensuite."]),
    ]);
    var grid = el("div", { class: "est-type-grid" });
    PROJECT_TYPES.forEach(function (t) {
      var selected = state.type === t.value;
      var card = el("button", {
        type: "button",
        class: "est-type-card" + (selected ? " is-selected" : ""),
        "aria-pressed": selected ? "true" : "false",
        onclick: function () {
          state.type = t.value;
          state.answers = {};
          state.step = 1;
          render();
        },
      }, [
        el("span", { class: "est-type-icon", html: t.icon }),
        el("span", { class: "est-type-label" }, [t.label]),
        el("span", { class: "est-type-desc", html: t.desc }),
      ]);
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
        el("button", { type: "button", class: "est-link", onclick: function () { state.step = 0; render(); } }, ["← changer"]),
      ]),
    ]);

    qs.forEach(function (q) {
      wrap.appendChild(renderQuestion(q));
    });

    // Description libre
    wrap.appendChild(el("div", { class: "est-field" }, [
      el("label", { class: "est-q-label", for: "est-desc" }, ["Décrivez votre projet en quelques lignes"]),
      el("span", { class: "est-hint" }, ["Optionnel, mais ça affine nettement l'estimation."]),
      el("textarea", {
        id: "est-desc", class: "est-textarea", rows: "4",
        placeholder: "Contexte, objectifs, contraintes, délais souhaités…",
        oninput: function (e) { state.description = e.target.value; },
      }),
    ]));
    if (state.description) wrap.querySelector("#est-desc").value = state.description;

    wrap.appendChild(navButtons(
      function () { state.step = 0; render(); },
      function () { if (validateDetails()) { state.step = 2; render(); } },
      "Continuer"
    ));
    return wrap;
  }

  function renderQuestion(q) {
    var field = el("div", { class: "est-field", "data-qid": q.id });
    field.appendChild(el("span", { class: "est-q-label" }, [
      decode(q.label), q.required ? el("span", { class: "est-req", title: "Requis" }, [" *"]) : null,
    ]));
    if (q.help) field.appendChild(el("span", { class: "est-hint" }, [q.help]));

    if (q.type === "bool") {
      field.appendChild(renderChoices(q, [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
      ], false));
    } else {
      field.appendChild(renderChoices(q, q.options, q.type === "multi"));
    }
    return field;
  }

  function renderChoices(q, options, multi) {
    var group = el("div", { class: "est-choices", role: multi ? "group" : "radiogroup", "aria-label": decode(q.label) });
    options.forEach(function (opt) {
      var active = multi
        ? Array.isArray(state.answers[q.id]) && state.answers[q.id].indexOf(opt.value) !== -1
        : state.answers[q.id] === opt.value;
      var chip = el("button", {
        type: "button",
        class: "est-chip" + (active ? " is-active" : ""),
        role: multi ? "checkbox" : "radio",
        "aria-checked": active ? "true" : "false",
        onclick: function () {
          if (multi) {
            var arr = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            if (opt.value === "aucune") { arr = ["aucune"]; }
            else {
              arr = arr.filter(function (v) { return v !== "aucune"; });
              var i = arr.indexOf(opt.value);
              if (i === -1) arr.push(opt.value); else arr.splice(i, 1);
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
      }, [decode(opt.label)]);
      group.appendChild(chip);
    });
    return group;
  }

  /* --- Étape 2 : coordonnées --- */
  function renderContactStep() {
    var wrap = el("div", { class: "est-step" }, [
      el("h3", { class: "est-legend" }, ["Vos coordonnées"]),
      el("p", { class: "est-hint" }, ["Nous vous envoyons votre estimation détaillée et vous recontactons sous 24 h ouvrées. Aucune donnée n'est revendue."]),
    ]);
    var grid = el("div", { class: "est-contact-grid" });
    grid.appendChild(textField("first_name", "Prénom", "text", true));
    grid.appendChild(textField("last_name", "Nom", "text", true));
    grid.appendChild(textField("email", "Email", "email", true));
    grid.appendChild(textField("phone", "Téléphone", "tel", true));
    grid.appendChild(textField("company", "Entreprise / organisation", "text", true));
    grid.appendChild(textField("role", "Votre fonction (optionnel)", "text", false));
    wrap.appendChild(grid);

    var consentId = "est-consent";
    wrap.appendChild(el("label", { class: "est-consent", for: consentId }, [
      el("input", {
        type: "checkbox", id: consentId, checked: state.consent ? "checked" : null,
        onchange: function (e) { state.consent = e.target.checked; clearError(); },
      }),
      el("span", {}, [CONSENT_TEXT + " ", el("a", { href: "/politique-confidentialite/", target: "_blank", rel: "noopener" }, ["Politique de confidentialité"]), "."]),
    ]));

    wrap.appendChild(el("div", { class: "est-error", id: "est-error", "aria-live": "polite" }));
    wrap.appendChild(navButtons(
      function () { state.step = 1; render(); },
      submit,
      "Obtenir mon estimation"
    ));
    return wrap;
  }

  function textField(id, label, type, required) {
    var inputId = "est-" + id;
    return el("div", { class: "est-field" }, [
      el("label", { class: "est-q-label", for: inputId }, [
        label, required ? el("span", { class: "est-req" }, [" *"]) : null,
      ]),
      el("input", {
        id: inputId, class: "est-input", type: type, value: state.contact[id] || "",
        autocomplete: id === "first_name" ? "given-name" : id === "last_name" ? "family-name" : id === "email" ? "email" : id === "phone" ? "tel" : id === "company" ? "organization" : "off",
        oninput: function (e) { state.contact[id] = e.target.value; clearError(); },
      }),
    ]);
  }

  function navButtons(onBack, onNext, nextLabel) {
    return el("div", { class: "est-nav" }, [
      el("button", { type: "button", class: "est-btn est-btn-ghost", onclick: onBack }, ["← Retour"]),
      el("button", { type: "button", class: "est-btn est-btn-primary", id: "est-next", onclick: onNext }, [nextLabel]),
    ]);
  }

  /* ---------------------------------------------------------------------------
   * 5. Validation
   * ------------------------------------------------------------------------- */
  function validateDetails() {
    var qs = QUESTIONS[state.type] || [];
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (q.required) {
        var a = state.answers[q.id];
        var empty = a == null || a === "" || (Array.isArray(a) && a.length === 0);
        if (empty) {
          showError("Merci de répondre à : « " + decode(q.label) + " »");
          var node = root.querySelector('[data-qid="' + q.id + '"]');
          if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }
    }
    return true;
  }

  function validateContact() {
    var c = state.contact;
    if (!c.first_name.trim() || !c.last_name.trim()) return "Merci d'indiquer votre prénom et votre nom.";
    if (!isEmail(c.email)) return "L'adresse email ne semble pas valide.";
    if (!isPhone(c.phone)) return "Le numéro de téléphone ne semble pas valide.";
    if (!c.company.trim()) return "Merci d'indiquer votre entreprise ou organisation.";
    if (!state.consent) return "Merci d'accepter d'être recontacté pour recevoir votre estimation.";
    return null;
  }

  function showError(msg) {
    var box = root.querySelector("#est-error");
    if (!box) { alert(msg); return; }
    box.textContent = msg;
    box.classList.add("is-visible");
  }
  function clearError() {
    var box = root.querySelector("#est-error");
    if (box) { box.textContent = ""; box.classList.remove("is-visible"); }
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
      consent: { rgpd: true, timestamp: new Date().toISOString(), text: CONSENT_TEXT },
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
      for (var i = 0; i < opts.length; i++) if (opts[i].value === v) return decode(opts[i].label);
      return v;
    }
    return Array.isArray(a) ? a.map(lab).join(", ") : lab(a);
  }

  function submit() {
    var err = validateContact();
    if (err) { showError(err); return; }
    clearError();
    setLoading(true);

    getRecaptchaToken(function (token) {
      var payload = buildPayload(token);

      if (CONFIG.demo || !CONFIG.webhook) {
        window.setTimeout(function () { setLoading(false); showResult(mockEstimate(), true); }, 900);
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
        .then(function (data) { setLoading(false); showResult(data, false); })
        .catch(function () { setLoading(false); showNetworkError(); });
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
    if (!CONFIG.recaptchaKey || CONFIG.demo) { cb(""); return; }
    try {
      if (window.grecaptcha && window.grecaptcha.execute) {
        window.grecaptcha.ready(function () {
          window.grecaptcha.execute(CONFIG.recaptchaKey, { action: "estimation" })
            .then(function (t) { cb(t); })
            .catch(function () { cb(""); });
        });
      } else { cb(""); }
    } catch (e) { cb(""); }
  }

  /* ---------------------------------------------------------------------------
   * 7. Résultat
   * ------------------------------------------------------------------------- */
  function fmt(n) {
    return Number(n).toLocaleString("fr-FR");
  }

  function showResult(data, isDemo) {
    clear(root);
    data = data || {};
    var card = el("div", { class: "est-result", role: "status", "aria-live": "polite" });

    if (data.status === "needs_scoping" || !data.range) {
      card.appendChild(el("div", { class: "est-result-badge" }, ["Projet à cadrer ensemble"]));
      card.appendChild(el("h3", { class: "est-result-title" }, ["Votre projet mérite un échange dédié"]));
      card.appendChild(el("p", { class: "est-result-msg" }, [
        data.message || "Il sort du cadre d'une estimation automatique. Nous revenons vers vous très vite pour en parler précisément.",
      ]));
    } else {
      card.appendChild(el("div", { class: "est-result-badge" }, ["Votre estimation indicative"]));
      card.appendChild(el("div", { class: "est-result-range" }, [
        "Entre ", el("strong", {}, [fmt(data.range.low)]), " € et ",
        el("strong", {}, [fmt(data.range.high)]), " € HT",
      ]));
      if (data.recurring) {
        card.appendChild(el("div", { class: "est-result-recurring" }, [
          (data.recurring.label || "Abonnement") + " : ",
          el("strong", {}, [fmt(data.recurring.low) + " – " + fmt(data.recurring.high) + " €"]),
          " / " + (data.recurring.period || "mois") + " HT",
        ]));
      }
      if (data.message) card.appendChild(el("p", { class: "est-result-msg" }, [data.message]));

      if (Array.isArray(data.lines) && data.lines.length) {
        var ul = el("ul", { class: "est-result-lines" });
        data.lines.forEach(function (l) {
          ul.appendChild(el("li", {}, [
            el("span", {}, [l.label]),
            el("span", { class: "est-result-amount" }, [l.amount != null ? fmt(l.amount) + " €" : "—"]),
          ]));
        });
        card.appendChild(el("details", { class: "est-result-detail" }, [
          el("summary", {}, ["Voir le détail"]), ul,
        ]));
      }

      if (Array.isArray(data.assumptions) && data.assumptions.length) {
        var au = el("ul", { class: "est-result-assumptions" });
        data.assumptions.forEach(function (a) { au.appendChild(el("li", {}, [a])); });
        card.appendChild(el("div", { class: "est-assumptions-wrap" }, [
          el("p", { class: "est-hint" }, ["Sur la base de :"]), au,
        ]));
      }
    }

    card.appendChild(el("p", { class: "est-result-disclaimer" }, [
      data.disclaimer || "Estimation indicative HT, hors taxes, sous réserve d'un cadrage. Elle ne constitue pas un devis contractuel. Valable 30 jours.",
    ]));

    card.appendChild(el("div", { class: "est-result-cta" }, [
      el("span", { class: "est-result-confirm", html: ICONS.check + "<span>Votre demande nous est parvenue — nous vous recontactons sous 24 h ouvrées.</span>" }),
      el("a", { class: "est-btn est-btn-primary", href: "/contact/" }, ["Nous contacter directement"]),
    ]));

    if (isDemo) {
      card.appendChild(el("p", { class: "est-demo-note", html: ICONS.info + "<span>Aperçu de démonstration (n8n non connecté) — chiffres illustratifs.</span>" }));
    }

    root.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showNetworkError() {
    clearError();
    var box = root.querySelector("#est-error") || root.appendChild(el("div", { class: "est-error", id: "est-error" }));
    box.classList.add("is-visible");
    clear(box);
    box.appendChild(el("span", {}, ["Une erreur réseau a interrompu l'envoi. Réessayez, ou écrivez-nous à "]));
    box.appendChild(el("a", { href: "mailto:contact@pixicode.dev" }, ["contact@pixicode.dev"]));
    box.appendChild(el("span", {}, ["."]));
    setLoading(false);
  }

  /* ---------------------------------------------------------------------------
   * 8. Mode démo — estimation locale factice
   * ------------------------------------------------------------------------- */
  function mockEstimate() {
    var a = state.answers;
    var range = null, recurring = null, days = null, lines = [], assumptions = [];

    if (state.type === "site_web") {
      var base = { one_page: [900, 1100], standard: [3150, 3800], complet: [4080, 4900], sur_mesure: [4800, 7000] }[a.volume] || [900, 1100];
      if (a.cms === "strapi" && a.volume !== "sur_mesure") base = [4800, 6500];
      lines.push({ label: "Création du site", amount: base[0] });
      if (a.formulaire === "personnalise") { lines.push({ label: "Formulaire avancé + mise en production", amount: 600 }); base = [base[0] + 600, base[1] + 600]; }
      range = { low: base[0], high: base[1] };
      recurring = a.hebergement === "autre" ? null : { low: 15, high: 55, period: "mois", label: "Hébergement & infogérance" };
      assumptions.push("Design en partenariat Evokea Studio, intégration responsive et éco-conception incluses.");
    } else if (state.type === "site_collectivite") {
      var lo = 5760, hi = 8000;
      if (a.rgaa === "oui") { lines.push({ label: "Audit & conformité RGAA", amount: 1440 }); lo += 1440; hi += 1440; }
      lines.unshift({ label: "Site de collectivité (sur mesure)", amount: 5760 });
      range = { low: lo, high: hi };
      recurring = { low: 30, high: 95, period: "mois", label: "Hébergement gamme Communes" };
      assumptions.push("Réversibilité incluse, socle SEO et éco-conception INR.");
    } else if (state.type === "hebergement") {
      recurring = a.techno === "wordpress" ? { low: 85, high: 95, period: "mois", label: "Infogérance WordPress" } : { low: 15, high: 55, period: "mois", label: "Hébergement & infogérance" };
      range = null;
      return { status: "ok", range: { low: recurring.low * 12, high: recurring.high * 12 }, recurring: recurring, message: "Estimation d'un abonnement annuel d'hébergement/infogérance.", assumptions: ["Un mois offert au règlement annuel."] };
    } else {
      // mobile / logiciel → jours × TJM, haute +20 %
      var d = state.type === "application_mobile"
        ? { petit: 15, moyen: 28, grand: 50 }[a.ampleur] || 20
        : { cible: 15, moyen: 30, large: 55 }[a.perimetre] || 20;
      // quelques modificateurs illustratifs
      if (a.paiement === "abonnement" || (Array.isArray(a.integrations) && a.integrations.indexOf("aucune") === -1 && a.integrations.length)) d += 6;
      if (a.comptes === "oui" || a.roles === "multi_roles") d += 4;
      days = d;
      range = { low: Math.round(d * TJM / 100) * 100, high: Math.round(d * TJM * 1.2 / 100) * 100 };
      assumptions.push("Estimation = " + d + " jours × TJM 480 € HT, marge de sécurité de 20 % sur la fourchette haute.");
      assumptions.push("Le cadrage précisera le périmètre exact.");
    }

    return { status: "ok", range: range, recurring: recurring, estimated_days: days, lines: lines, assumptions: assumptions };
  }

  /* ---------------------------------------------------------------------------
   * 9. Helpers divers
   * ------------------------------------------------------------------------- */
  function typeMeta(v) {
    for (var i = 0; i < PROJECT_TYPES.length; i++) if (PROJECT_TYPES[i].value === v) return PROJECT_TYPES[i];
    return { label: v, icon: "" };
  }
  // décode les entités HTML présentes dans les libellés (&amp; etc.)
  var _dec = document.createElement("textarea");
  function decode(s) { _dec.innerHTML = s; return _dec.value; }

  /* --- Go --- */
  render();
})();
