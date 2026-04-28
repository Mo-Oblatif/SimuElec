/**
 * Exercises.js — Système d'exercices guidés
 * Génère des exercices de câblage avec validation et feedback.
 */

'use strict';

const EXERCISES = [
  /* ======================== EX 1 ======================== */
  {
    id: 'ex01',
    title: 'Circuit éclairage simple',
    difficulty: 'Débutant',
    description: `
      <p>Branchez un circuit d'éclairage simple composé :</p>
      <ul>
        <li>Un <strong>disjoncteur 16A</strong> protégeant le circuit</li>
        <li>Une <strong>lampe</strong> connectée en sortie</li>
        <li>Un <strong>bornier neutre</strong> pour le retour de courant</li>
      </ul>
      <p>La phase entre par le haut du disjoncteur (borne 1) et sort par le bas (borne 2) vers la lampe. Le neutre revient du bornier vers la lampe.</p>
    `,
    hint: 'Phase : peigne → disjoncteur (borne 1) → lampe (L). Neutre : bornier N → lampe (N).',
    requiredComponents: ['disjoncteur16', 'lampe', 'bornier_neutre'],
    checkFn(editor) {
      const comps = [...editor.components.values()];
      const dj = comps.find(c => c.typeId === 'disjoncteur16');
      const lamp = comps.find(c => c.typeId === 'lampe');
      const bn = comps.find(c => c.typeId === 'bornier_neutre');

      const errors = [], ok = [];

      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' });
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' });
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' });

      if (!dj || !lamp || !bn) return { score: 0, errors, ok };

      // Vérifier fil phase: dj.t_out → lamp.ph
      const djToLamp = editor.wires.find(w =>
        w.fromCompId === dj.id && w.fromTermId === 't_out' &&
        w.toCompId === lamp.id && w.toTermId === 'ph' && w.wireType === 'phase'
      ) || editor.wires.find(w =>
        w.toCompId === dj.id && w.toTermId === 't_out' &&
        w.fromCompId === lamp.id && w.fromTermId === 'ph' && w.wireType === 'phase'
      );

      if (djToLamp) ok.push({ msg: 'Phase disjoncteur → lampe : OK ✓' });
      else errors.push({ msg: 'Branchez la sortie du disjoncteur (borne 2) à la borne L de la lampe (fil phase).' });

      // Vérifier fil neutre: bn → lamp.n
      const bnToLamp = editor.wires.find(w =>
        (w.fromCompId === bn.id && w.toCompId === lamp.id && w.toTermId === 'n' && w.wireType === 'neutre') ||
        (w.toCompId === bn.id && w.fromCompId === lamp.id && w.fromTermId === 'n' && w.wireType === 'neutre')
      );

      if (bnToLamp) ok.push({ msg: 'Neutre bornier → lampe : OK ✓' });
      else errors.push({ msg: 'Branchez une borne du bornier neutre à la borne N de la lampe (fil bleu).' });

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100);
      return { score, errors, ok };
    },
  },

  /* ======================== EX 2 ======================== */
  {
    id: 'ex02',
    title: 'Circuit prise de courant',
    difficulty: 'Débutant',
    description: `
      <p>Réalisez un circuit de <strong>prise de courant 16A</strong> conforme :</p>
      <ul>
        <li>Disjoncteur <strong>20A</strong> (protection prise)</li>
        <li>Une <strong>prise 16A</strong></li>
        <li>Bornier neutre et <strong>bornier terre</strong></li>
      </ul>
      <p>La prise doit être raccordée en Phase (L), Neutre (N) ET Terre (PE).</p>
    `,
    hint: 'N\'oubliez pas la terre ! La prise a 3 bornes : L (phase), N (neutre), PE (terre).',
    requiredComponents: ['disjoncteur20', 'prise', 'bornier_neutre', 'bornier_terre'],
    checkFn(editor) {
      const comps = [...editor.components.values()];
      const dj = comps.find(c => c.typeId === 'disjoncteur20');
      const prise = comps.find(c => c.typeId === 'prise');
      const bn = comps.find(c => c.typeId === 'bornier_neutre');
      const bt = comps.find(c => c.typeId === 'bornier_terre');

      const errors = [], ok = [];

      if (!dj)    errors.push({ msg: 'Ajoutez un disjoncteur 20A.' });
      if (!prise) errors.push({ msg: 'Ajoutez une prise 16A.' });
      if (!bn)    errors.push({ msg: 'Ajoutez un bornier neutre.' });
      if (!bt)    errors.push({ msg: 'Ajoutez un bornier terre (PE).' });

      if (!dj || !prise || !bn || !bt) return { score: 0, errors, ok };

      const hasWire = (fromId, fromTerm, toId, toTerm, type) =>
        editor.wires.some(w =>
          (w.fromCompId === fromId && w.fromTermId === fromTerm && w.toCompId === toId && w.toTermId === toTerm && w.wireType === type) ||
          (w.toCompId === fromId && w.toTermId === fromTerm && w.fromCompId === toId && w.fromTermId === toTerm && w.wireType === type)
        );

      if (hasWire(dj.id, 't_out', prise.id, 'ph', 'phase'))
        ok.push({ msg: 'Phase disjoncteur 20A → prise (L) ✓' });
      else
        errors.push({ msg: 'Sortie du disjoncteur 20A (borne 2) → borne L de la prise (fil rouge/marron).' });

      if (hasWire(bn.id, null, prise.id, 'n', 'neutre') ||
          editor.wires.some(w => (w.fromCompId === bn.id || w.toCompId === bn.id) && (w.fromCompId === prise.id && w.fromTermId === 'n' || w.toCompId === prise.id && w.toTermId === 'n') && w.wireType === 'neutre'))
        ok.push({ msg: 'Neutre bornier → prise (N) ✓' });
      else
        errors.push({ msg: 'Branchez un neutre du bornier à la borne N de la prise (fil bleu).' });

      if (editor.wires.some(w =>
        ((w.fromCompId === bt.id || w.toCompId === bt.id) &&
         (w.fromCompId === prise.id && w.fromTermId === 'pe' || w.toCompId === prise.id && w.toTermId === 'pe') &&
         w.wireType === 'terre')))
        ok.push({ msg: 'Terre bornier PE → prise (PE) ✓' });
      else
        errors.push({ msg: 'Branchez la terre (bornier PE) à la borne PE de la prise (fil vert/jaune).' });

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100);
      return { score, errors, ok };
    },
  },

  /* ======================== EX 3 ======================== */
  {
    id: 'ex03',
    title: 'Commande télérupteur + bouton',
    difficulty: 'Intermédiaire',
    description: `
      <p>Réalisez un circuit de commande d'éclairage par <strong>télérupteur</strong> :</p>
      <ul>
        <li>Disjoncteur <strong>16A</strong></li>
        <li><strong>Télérupteur</strong> (bobine A1/A2, contacts 11/14)</li>
        <li><strong>Bouton poussoir</strong> (commande bobine)</li>
        <li><strong>Lampe</strong> (charge sur contacts 11/14)</li>
        <li>Borniers neutre</li>
      </ul>
      <p>La bobine (A1-A2) reçoit la phase via le bouton. Les contacts (11-14) commutent la charge (lampe).</p>
    `,
    hint: 'Bobine : Phase → bouton → A1 du télérupteur, A2 → neutre. Contacts : 11 → phase sortie disj, 14 → lampe L, N → neutre.',
    requiredComponents: ['disjoncteur16', 'telerupteur', 'bouton', 'lampe', 'bornier_neutre'],
    checkFn(editor) {
      const comps = [...editor.components.values()];
      const dj    = comps.find(c => c.typeId === 'disjoncteur16');
      const tele  = comps.find(c => c.typeId === 'telerupteur');
      const btn   = comps.find(c => c.typeId === 'bouton');
      const lamp  = comps.find(c => c.typeId === 'lampe');
      const bn    = comps.find(c => c.typeId === 'bornier_neutre');

      const errors = [], ok = [];
      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' });
      if (!tele) errors.push({ msg: 'Ajoutez un télérupteur.' });
      if (!btn)  errors.push({ msg: 'Ajoutez un bouton poussoir.' });
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' });
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' });
      if (errors.length) return { score: 0, errors, ok };

      const wireExists = (cid1, tid1, cid2, tid2, type) =>
        editor.wires.some(w => {
          const match = (a, b, c, d) => w.fromCompId === a && w.fromTermId === b && w.toCompId === c && w.toTermId === d;
          return (match(cid1, tid1, cid2, tid2) || match(cid2, tid2, cid1, tid1)) && (!type || w.wireType === type);
        });

      // Bobine : phase (via bouton) → A1
      const btnToA1 = wireExists(btn.id, 'out', tele.id, 'a1', 'phase') ||
                      wireExists(btn.id, 'out', tele.id, 'a1', 'signal');
      if (btnToA1) ok.push({ msg: 'Bouton → Bobine A1 ✓' });
      else errors.push({ msg: 'Connectez la sortie du bouton à la borne A1 du télérupteur.' });

      // A2 → neutre
      const a2ToN = editor.wires.some(w =>
        ((w.fromCompId === tele.id && w.fromTermId === 'a2') ||
         (w.toCompId === tele.id && w.toTermId === 'a2')) && w.wireType === 'neutre');
      if (a2ToN) ok.push({ msg: 'Bobine A2 → Neutre ✓' });
      else errors.push({ msg: 'Reliez la borne A2 du télérupteur au bornier neutre (fil bleu).' });

      // Contact 14 → lampe
      const c14ToLamp = wireExists(tele.id, '14', lamp.id, 'ph', 'phase') ||
                        wireExists(tele.id, '14', lamp.id, 'ph', 'signal');
      if (c14ToLamp) ok.push({ msg: 'Contact 14 → Lampe (L) ✓' });
      else errors.push({ msg: 'Connectez la borne 14 du télérupteur à la borne L de la lampe.' });

      // Lampe N → neutre
      const lampN = editor.wires.some(w =>
        ((w.fromCompId === lamp.id && w.fromTermId === 'n') ||
         (w.toCompId === lamp.id && w.toTermId === 'n')) && w.wireType === 'neutre');
      if (lampN) ok.push({ msg: 'Lampe N → Neutre ✓' });
      else errors.push({ msg: 'Reliez la borne N de la lampe au bornier neutre.' });

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100);
      return { score, errors, ok };
    },
  },

  /* ======================== EX 4 ======================== */
  {
    id: 'ex04',
    title: 'Tableau avec interrupteur différentiel',
    difficulty: 'Intermédiaire',
    description: `
      <p>Installez une <strong>protection différentielle</strong> en tête d'un circuit :</p>
      <ul>
        <li><strong>Interrupteur différentiel 30mA</strong> en entrée</li>
        <li>Un disjoncteur <strong>16A</strong> en aval (protégé par l'ID)</li>
        <li>Une <strong>lampe</strong> sur le disjoncteur</li>
        <li>Borniers neutre</li>
      </ul>
      <p>L'ID filtre la phase ET le neutre. Sa sortie L' alimente le disjoncteur, sa sortie N' va au bornier sous protection.</p>
    `,
    hint: 'ID : L (haut) et N (haut) = entrée. L\' (bas) → disjoncteur 16A. N\' (bas) → bornier neutre aval.',
    requiredComponents: ['differentiel', 'disjoncteur16', 'lampe', 'bornier_neutre'],
    checkFn(editor) {
      const comps = [...editor.components.values()];
      const id   = comps.find(c => c.typeId === 'differentiel');
      const dj   = comps.find(c => c.typeId === 'disjoncteur16');
      const lamp = comps.find(c => c.typeId === 'lampe');
      const bn   = comps.find(c => c.typeId === 'bornier_neutre');

      const errors = [], ok = [];
      if (!id)   errors.push({ msg: 'Ajoutez un interrupteur différentiel 30mA.' });
      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' });
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' });
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' });
      if (errors.length) return { score: 0, errors, ok };

      const wireExists = (cid1, tid1, cid2, tid2) =>
        editor.wires.some(w =>
          (w.fromCompId === cid1 && w.fromTermId === tid1 && w.toCompId === cid2 && w.toTermId === tid2) ||
          (w.fromCompId === cid2 && w.fromTermId === tid2 && w.toCompId === cid1 && w.toTermId === tid1)
        );

      if (wireExists(id.id, 'ph_out', dj.id, 't_in'))
        ok.push({ msg: 'ID sortie L\' → disjoncteur ✓' });
      else
        errors.push({ msg: 'Reliez la sortie L\' de l\'ID à l\'entrée du disjoncteur 16A.' });

      if (wireExists(dj.id, 't_out', lamp.id, 'ph'))
        ok.push({ msg: 'Disjoncteur → lampe L ✓' });
      else
        errors.push({ msg: 'Reliez la sortie du disjoncteur à la borne L de la lampe.' });

      const idNOut = editor.wires.some(w =>
        ((w.fromCompId === id.id && w.fromTermId === 'n_out') ||
         (w.toCompId === id.id && w.toTermId === 'n_out')) && w.wireType === 'neutre');
      if (idNOut) ok.push({ msg: 'ID sortie N\' → bornier neutre ✓' });
      else errors.push({ msg: 'Reliez la sortie N\' de l\'ID au bornier neutre.' });

      if (editor.wires.some(w =>
        ((w.fromCompId === bn.id || w.toCompId === bn.id) &&
         (w.fromCompId === lamp.id && w.fromTermId === 'n' || w.toCompId === lamp.id && w.toTermId === 'n') &&
         w.wireType === 'neutre')))
        ok.push({ msg: 'Neutre → lampe N ✓' });
      else
        errors.push({ msg: 'Reliez le bornier neutre à la borne N de la lampe.' });

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100);
      return { score, errors, ok };
    },
  },

  /* ======================== EX 5 ======================== */
  {
    id: 'ex05',
    title: 'Tableau complet — Logement',
    difficulty: 'Avancé',
    description: `
      <p>Réalisez un tableau divisionnaire complet pour un petit logement :</p>
      <ul>
        <li><strong>ID 30mA</strong> en tête du groupe éclairage</li>
        <li>Disjoncteur <strong>16A</strong> → lampe (éclairage)</li>
        <li>Disjoncteur <strong>20A</strong> → prise (séjour)</li>
        <li>Disjoncteur <strong>32A</strong> → prise (cuisine)</li>
        <li>Borniers neutre et terre</li>
      </ul>
      <p>Respectez l'ordre logique : ID → disjoncteurs → charges. Toutes les prises doivent avoir la terre.</p>
    `,
    hint: 'Commencez par placer tous les composants. L\'ID protège l\'éclairage. Les prises ont chacune leur disjoncteur propre.',
    requiredComponents: ['differentiel', 'disjoncteur16', 'disjoncteur20', 'disjoncteur32', 'lampe', 'prise', 'bornier_neutre', 'bornier_terre'],
    checkFn(editor) {
      const comps = [...editor.components.values()];
      const errors = [], ok = [];

      const has = (type) => comps.some(c => c.typeId === type);
      const get = (type) => comps.find(c => c.typeId === type);

      const requiredTypes = ['differentiel', 'disjoncteur16', 'disjoncteur20', 'disjoncteur32', 'lampe', 'prise', 'bornier_neutre', 'bornier_terre'];
      for (const t of requiredTypes) {
        if (!has(t)) errors.push({ msg: `Composant manquant : ${COMPONENT_TYPES[t].label}` });
      }

      const wireCount = editor.wires.length;
      if (wireCount < 8) {
        errors.push({ msg: `Câblage incomplet — au moins 8 connexions nécessaires (${wireCount} actuellement).` });
      } else {
        ok.push({ msg: `Câblage : ${wireCount} connexions ✓` });
      }

      if (ok.length > 0 && errors.length === 0) {
        ok.push({ msg: 'Tableau complet — Bravo !' });
      }

      const score = Math.max(0, Math.round((ok.length / Math.max(ok.length + errors.length, 1)) * 100));
      return { score, errors, ok };
    },
  },
];

class ExerciseManager {
  constructor(editor) {
    this.editor = editor;
    this.current = null;
    this.currentIndex = 0;
    this.totalScore = 0;
    this.attempts = 0;
  }

  start(index = 0) {
    this.currentIndex = Math.max(0, Math.min(index, EXERCISES.length - 1));
    this.current = EXERCISES[this.currentIndex];
    this.editor.clearAll();
    this._renderExercise();
    document.getElementById('exercisePanel').style.display = '';
    document.getElementById('exercise-num').textContent = `Exercice ${this.currentIndex + 1}/${EXERCISES.length}`;
    document.getElementById('exercise-title').textContent = this.current.title;
    document.getElementById('exerciseDescription').innerHTML = this.current.description;
    document.getElementById('exerciseFeedback').innerHTML = '';
    document.getElementById('btn-next-ex').style.display = 'none';
  }

  _renderExercise() {
    // Pré-placer les composants requis sur le canvas
    const types = this.current.requiredComponents;
    let x = 90, y = 90;
    for (const typeId of types) {
      const comp = new Component(typeId, x, y);
      this.editor.components.set(comp.id, comp);
      x += (COMPONENT_TYPES[typeId].w || 40) + 30;
      if (x > 650) { x = 90; y += 100; }
    }
    this.editor._pushHistory();
    this.editor._emitCountChange();
  }

  validate() {
    if (!this.current) return;
    this.attempts++;
    const result = this.current.checkFn(this.editor);
    this._showFeedback(result);

    if (result.score === 100) {
      this.totalScore += 100;
      document.getElementById('btn-next-ex').style.display = '';
      App.toast(`Excellent ! Score : 100/100`, 'success');
    } else {
      App.toast(`Score : ${result.score}/100 — Corrigez les erreurs.`, result.score > 50 ? 'warning' : 'error');
    }
    document.getElementById('exercise-score').textContent = result.score;
  }

  _showFeedback(result) {
    const el = document.getElementById('exerciseFeedback');
    let html = '';
    for (const item of result.ok) {
      html += `<div class="feedback-item feedback-ok">✓ ${item.msg}</div>`;
    }
    for (const err of result.errors) {
      html += `<div class="feedback-item feedback-err">✗ ${err.msg}</div>`;
    }
    el.innerHTML = html;
  }

  hint() {
    if (!this.current) return;
    App.toast(this.current.hint, 'info');
  }

  next() {
    if (this.currentIndex < EXERCISES.length - 1) {
      this.start(this.currentIndex + 1);
    } else {
      App.toast(`Formation terminée ! Score total : ${this.totalScore}/${EXERCISES.length * 100}`, 'success');
      this.exit();
    }
  }

  exit() {
    document.getElementById('exercisePanel').style.display = 'none';
    this.current = null;
    this.editor.clearAll();
  }
}
