# SimuÉlec — Simulateur Tableau Électrique Domestique
## Fichier de contexte projet (pour reprise en session future)

---

## Description du projet

Application web interactive (frontend pur, aucune dépendance externe) permettant de simuler le câblage d'un tableau électrique divisionnaire domestique. L'utilisateur peut placer des composants sur un canvas, les relier avec des fils colorés, lancer une simulation pour voir quels circuits sont alimentés, et s'entraîner via des exercices guidés.

---

## Objectifs

1. **Pédagogique** : Apprendre le câblage électrique domestique (norme NF C 15-100)
2. **Simulation réaliste** : Propagation de courant par graphe, détection d'erreurs
3. **UX intuitive** : Drag & drop, code couleur des fils, feedback immédiat
4. **Mode entraînement** : Exercices progressifs avec validation automatique

---

## Structure des fichiers

```
Simulateur TD/
├── index.html          — Structure HTML complète
├── css/
│   └── styles.css      — Dark theme professionnel, responsive
├── js/
│   ├── data.js         — Définitions des types de composants (COMPONENT_TYPES)
│   ├── Component.js    — Classe Component (instance canvas + rendu)
│   ├── Wire.js         — Classe Wire (connexion + rendu bezier)
│   ├── Circuit.js      — Moteur simulation électrique (BFS)
│   ├── Editor.js       — Éditeur canvas (drag, zoom, sélection)
│   ├── Exercises.js    — Exercices guidés + validation
│   └── App.js          — Bootstrap, UI glue, modals, toasts
└── PROJECT_CONTEXT.md  — Ce fichier
```

---

## Composants disponibles

| Type              | Bornes                  | Logique          | Modules DIN |
|-------------------|-------------------------|------------------|-------------|
| disjoncteur16     | t_in / t_out            | breaker          | 1           |
| disjoncteur20     | t_in / t_out            | breaker          | 1           |
| disjoncteur32     | t_in / t_out            | breaker          | 1           |
| differentiel      | ph_in, n_in / ph_out, n_out | differential | 2           |
| telerupteur       | a1, a2 (bobine) / 11, 14 (contacts) | relay | 2          |
| bouton            | in / out                | pushbutton       | libre       |
| lampe             | ph / n                  | lamp             | libre       |
| prise             | ph / n / pe             | socket           | libre       |
| bornier_neutre    | main + n1..n5           | busbar (neutre)  | libre       |
| bornier_terre     | main + pe1..pe5         | busbar (terre)   | libre       |

---

## Logique électrique simplifiée

### Sources d'alimentation
- **Phase (L)** : Le "peigne" de phase alimente automatiquement les bornes `phase_in` de tous les disjoncteurs et différentiels (représente le raccordement EDF).
- **Neutre (N)** : Tout bornier neutre est une source de potentiel neutre.
- **Terre (PE)** : Tout bornier terre est une source de protection.

### Propagation (algorithme BFS)
```
1. Initialiser les nœuds sources (phase, neutre, terre)
2. Pour chaque nœud source : parcourir les voisins via fils (wires)
   et connexions internes (si composant fermé/closed)
3. Marquer comme "énergisé" tous les nœuds atteints
4. Évaluer les charges (lampe, prise) : on si phase ET neutre atteints
```

### Connexions internes (traversée autorisée si état = closed)
- **Disjoncteur fermé** : t_in ↔ t_out (phase passe)
- **Différentiel fermé** : ph_in ↔ ph_out ET n_in ↔ n_out
- **Télérupteur fermé** : 11 ↔ 14 (contacts commutent)
- **Bouton pressé** : in ↔ out
- **Busbar** : toutes les bornes interconnectées

### Couleurs des fils
| Couleur    | Code      | Usage                    |
|------------|-----------|--------------------------|
| Rouge/brun | `#c0392b` | Phase (L)                |
| Bleu       | `#2980b9` | Neutre (N)               |
| Vert/jaune | `#27ae60` | Terre (PE)               |
| Orange     | `#e67e22` | Signal (commande)        |

---

## Fonctionnalités implémentées

### Interface
- [x] Dark theme professionnel
- [x] Palette latérale avec miniatures des composants
- [x] Barre d'outils (sélection, fil, suppression, zoom)
- [x] Panneau propriétés à droite (état, bornes, actions)
- [x] Status bar avec coordonnées
- [x] Notifications toast (succès, erreur, info, warning)
- [x] Modal générique (sauvegarde, chargement, exercices)

### Éditeur canvas
- [x] Drag & drop depuis palette → canvas
- [x] Sélection et déplacement des composants
- [x] Sélection des fils au clic
- [x] Tracé de fils (clic terminal → clic terminal)
- [x] Courbes de Bézier pour les fils
- [x] Zoom molette centré sur curseur
- [x] Panoramique (bouton milieu souris)
- [x] Grille d'accrochage (snap 8px)
- [x] Undo/Redo (Ctrl+Z / Ctrl+Y)
- [x] Double-clic pour basculer l'état d'un composant
- [x] Raccourcis clavier (S, W, Del, +, -, 0)
- [x] Terminaux colorés (orange = libre, vert = connecté)

### Simulation
- [x] Propagation BFS phase/neutre/terre
- [x] Lampes qui s'allument (halo visuel)
- [x] Prises qui s'activent
- [x] Fils énergisés qui brillent (glow)
- [x] Détection : fil sur mauvaise borne
- [x] Détection : borne de sortie inutilisée
- [x] Avertissement prise sans terre
- [x] Résultats dans le panneau propriétés

### Persistence
- [x] Sauvegarde localStorage (nommée)
- [x] Chargement depuis localStorage
- [x] Autosave toutes les 30s
- [x] Suppression de sauvegardes

### Mode entraînement
- [x] 5 exercices progressifs (Débutant → Avancé)
- [x] Pré-placement des composants requis
- [x] Validation automatique avec score
- [x] Feedback par item (✓ / ✗)
- [x] Système d'indices
- [x] Navigation entre exercices

---

## Exercices disponibles

| # | Titre                          | Difficulté   | Concepts                    |
|---|--------------------------------|--------------|-----------------------------|
| 1 | Circuit éclairage simple       | Débutant     | Disj. 16A + lampe           |
| 2 | Circuit prise de courant       | Débutant     | Disj. 20A + prise + terre   |
| 3 | Commande télérupteur + bouton  | Intermédiaire| Bobine, contacts, logique   |
| 4 | Tableau avec différentiel      | Intermédiaire| ID 30mA en cascade          |
| 5 | Tableau complet logement       | Avancé       | Assemblage complet          |

---

## Choix techniques

| Décision            | Choix retenu       | Raison                                              |
|---------------------|--------------------|-----------------------------------------------------|
| Framework           | Vanilla JS ES6     | Zéro dépendance, démarrage instantané               |
| Rendu               | HTML5 Canvas 2D    | Performances, contrôle total du rendu               |
| Fils                | Courbes de Bézier  | Lisibilité, évite les croisements durs              |
| Simulation          | BFS sur graphe     | Simple, extensible, correct pour circuits DC/AC     |
| Stockage            | localStorage       | Pas de backend requis, suffisant pour PoC           |
| Style               | CSS custom props   | Thème facile à modifier sans preprocesseur          |

---

## Roadmap d'évolution

### Court terme (v1.1)
- [ ] Multi-sélection (rectangle de sélection)
- [ ] Copier/coller des composants
- [ ] Labels éditables sur les composants
- [ ] Export PNG du schéma
- [ ] Rotation des composants (90°)

### Moyen terme (v2.0)
- [ ] Nouveaux composants : minuterie, détecteur mouvement, variateur
- [ ] Simulation biphasée (400V / tri)
- [ ] Calcul des chutes de tension selon longueur de câble
- [ ] Vérification automatique de conformité NF C 15-100
- [ ] Mode "schéma unifilaire" vs "mode réaliste"

### Long terme (v3.0)
- [ ] Backend léger (Node.js) pour partage de schémas
- [ ] Mode collaboratif temps réel (WebSocket)
- [ ] Générateur automatique de tableaux depuis liste de circuits
- [ ] Impression / export PDF de la documentation

---

## Règles métier (logique électrique)

### Règles NF C 15-100 simplifiées implémentées
1. Chaque circuit doit être protégé par un disjoncteur approprié
2. Les prises doivent avoir une protection différentielle 30mA
3. Les prises 2P+T doivent avoir le conducteur de terre (PE)
4. Le neutre ne doit pas passer par des interrupteurs de phase
5. Le télérupteur est commandé par la bobine (A1/A2) et commute via les contacts (11/14)

### Erreurs détectées automatiquement
- Fil de mauvaise couleur sur une borne incompatible
- Borne de sortie alimentée mais non connectée (circuit ouvert)
- Prise sans conducteur de terre

---

## Instructions de démarrage local

```bash
# 1. Ouvrir le dossier
cd "c:/Users/Martinez/Desktop/Simulateur TD"

# 2. Lancer un serveur local (Python 3)
python -m http.server 8080

# 3. Ouvrir dans le navigateur
# http://localhost:8080

# Alternative sans serveur : ouvrir index.html directement dans Chrome/Firefox
# (fonctionne car pas de requêtes CORS)
```

**Note** : Le projet fonctionne directement en ouvrant `index.html` dans un navigateur moderne (Chrome, Firefox, Edge). Aucun build, aucun npm, aucune compilation nécessaire.

---

## Points d'extension pour nouveaux composants

Pour ajouter un nouveau composant, 3 étapes :

**1. Dans `data.js`** — ajouter dans `COMPONENT_TYPES` :
```js
monComposant: {
  label: 'Mon Composant',
  category: 'protection', // ou 'command', 'load', 'busbar'
  slotWidth: 1, w: 18, h: 72,
  color: '#2d3561', borderColor: '#4a5490',
  terminals: [
    { id: 'in',  label: '1', side: 'top',    rx: 0.5, ry: 0.05, type: 'phase_in',  wireTypes: ['phase'] },
    { id: 'out', label: '2', side: 'bottom', rx: 0.5, ry: 0.95, type: 'phase_out', wireTypes: ['phase'] },
  ],
  states: ['closed', 'open'],
  defaultState: 'closed',
  toggleable: true,
  electricLogic: 'breaker', // réutiliser une logique existante
  description: 'Description du composant.',
},
```

**2. Dans `Component.js`** — ajouter un case dans `draw()` si rendu spécifique :
```js
case 'monLogic': this._drawMonComposant(ctx, x, y, w, h, scale); break;
```

**3. Dans `index.html`** — ajouter dans la palette :
```html
<div class="palette-item" draggable="true" data-type="monComposant">
  <canvas class="comp-preview" width="40" height="56" data-preview="monComposant"></canvas>
  <span>Mon Composant</span>
</div>
```

---

*Généré le 2026-04-28 — SimuÉlec v1.0*
