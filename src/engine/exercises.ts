import type { Component, Wire } from '../store/types'

export interface ExerciseCheckResult {
  score: number
  ok: Array<{ msg: string }>
  errors: Array<{ msg: string }>
}

export interface Exercise {
  id: string
  title: string
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé'
  description: string
  hint: string
  requiredComponents: string[]
  checkFn: (components: Map<string, Component>, wires: Wire[]) => ExerciseCheckResult
}

function hasWire(
  wires: Wire[],
  cid1: string, tid1: string,
  cid2: string, tid2: string,
  type?: string
): boolean {
  return wires.some((w) => {
    const match =
      (w.fromCompId === cid1 && w.fromTermId === tid1 && w.toCompId === cid2 && w.toTermId === tid2) ||
      (w.fromCompId === cid2 && w.fromTermId === tid2 && w.toCompId === cid1 && w.toTermId === tid1)
    return type ? match && w.type === type : match
  })
}

function anyWireOn(wires: Wire[], compId: string, termId: string, type?: string): boolean {
  return wires.some((w) => {
    const on =
      (w.fromCompId === compId && w.fromTermId === termId) ||
      (w.toCompId === compId && w.toTermId === termId)
    return type ? on && w.type === type : on
  })
}

export const EXERCISES: Exercise[] = [
  {
    id: 'ex01',
    title: 'Circuit éclairage simple',
    difficulty: 'Débutant',
    description: `
      <p>Branchez un circuit d'éclairage simple :</p>
      <ul>
        <li>Un <strong>disjoncteur 16A</strong> protégeant le circuit</li>
        <li>Une <strong>lampe</strong> connectée en sortie</li>
        <li>Un <strong>bornier neutre</strong> pour le retour</li>
      </ul>
      <p>La phase sort du disjoncteur (t_out) vers la lampe (ph). Le neutre revient du bornier vers la lampe (n).</p>
    `,
    hint: 'Phase : disjoncteur (t_out) → lampe (ph). Neutre : bornier N (n1) → lampe (n).',
    requiredComponents: ['disjoncteur16', 'lampe', 'bornier_neutre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const dj   = comps.find((c) => c.typeId === 'disjoncteur16')
      const lamp = comps.find((c) => c.typeId === 'lampe')
      const bn   = comps.find((c) => c.typeId === 'bornier_neutre')
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' })
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' })
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' })
      if (!dj || !lamp || !bn) return { score: 0, errors, ok }

      if (hasWire(wires, dj.id, 't_out', lamp.id, 'ph', 'phase'))
        ok.push({ msg: 'Phase disjoncteur → lampe ✓' })
      else
        errors.push({ msg: 'Branchez la sortie du disjoncteur (t_out) à la borne ph de la lampe (fil phase).' })

      const neutreToLamp = wires.some(
        (w) =>
          ((w.fromCompId === bn.id || w.toCompId === bn.id) &&
            ((w.fromCompId === lamp.id && w.fromTermId === 'n') ||
              (w.toCompId === lamp.id && w.toTermId === 'n'))) &&
          w.type === 'neutre'
      )
      if (neutreToLamp) ok.push({ msg: 'Neutre bornier → lampe ✓' })
      else errors.push({ msg: 'Branchez un neutre du bornier à la borne n de la lampe (fil bleu).' })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },

  {
    id: 'ex02',
    title: 'Circuit prise de courant',
    difficulty: 'Débutant',
    description: `
      <p>Réalisez un circuit de <strong>prise 16A</strong> conforme NF C 15-100 :</p>
      <ul>
        <li><strong>Disjoncteur 20A</strong> (protection prise)</li>
        <li>Une <strong>prise 16A</strong></li>
        <li><strong>Bornier neutre</strong> et <strong>bornier terre</strong></li>
      </ul>
      <p>La prise doit être raccordée en Phase (ph), Neutre (n) ET Terre (pe).</p>
    `,
    hint: "N'oubliez pas la terre ! La prise a 3 bornes : ph (phase), n (neutre), pe (terre).",
    requiredComponents: ['disjoncteur20', 'prise', 'bornier_neutre', 'bornier_terre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const dj    = comps.find((c) => c.typeId === 'disjoncteur20')
      const prise = comps.find((c) => c.typeId === 'prise')
      const bn    = comps.find((c) => c.typeId === 'bornier_neutre')
      const bt    = comps.find((c) => c.typeId === 'bornier_terre')
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      if (!dj)    errors.push({ msg: 'Ajoutez un disjoncteur 20A.' })
      if (!prise) errors.push({ msg: 'Ajoutez une prise 16A.' })
      if (!bn)    errors.push({ msg: 'Ajoutez un bornier neutre.' })
      if (!bt)    errors.push({ msg: 'Ajoutez un bornier terre (PE).' })
      if (!dj || !prise || !bn || !bt) return { score: 0, errors, ok }

      if (hasWire(wires, dj.id, 't_out', prise.id, 'ph', 'phase'))
        ok.push({ msg: 'Phase disjoncteur 20A → prise ✓' })
      else
        errors.push({ msg: 'Sortie du disjoncteur (t_out) → borne ph de la prise (fil phase).' })

      if (wires.some((w) =>
        ((w.fromCompId === bn.id || w.toCompId === bn.id) &&
         ((w.fromCompId === prise.id && w.fromTermId === 'n') ||
          (w.toCompId === prise.id && w.toTermId === 'n'))) && w.type === 'neutre'))
        ok.push({ msg: 'Neutre bornier → prise ✓' })
      else
        errors.push({ msg: 'Branchez un neutre du bornier à la borne n de la prise (fil bleu).' })

      if (wires.some((w) =>
        ((w.fromCompId === bt.id || w.toCompId === bt.id) &&
         ((w.fromCompId === prise.id && w.fromTermId === 'pe') ||
          (w.toCompId === prise.id && w.toTermId === 'pe'))) && w.type === 'terre'))
        ok.push({ msg: 'Terre bornier PE → prise ✓' })
      else
        errors.push({ msg: 'Branchez le bornier PE à la borne pe de la prise (fil vert/jaune).' })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },

  {
    id: 'ex03',
    title: 'Commande télérupteur + bouton',
    difficulty: 'Intermédiaire',
    description: `
      <p>Réalisez un circuit d'éclairage par <strong>télérupteur</strong> :</p>
      <ul>
        <li><strong>Disjoncteur 16A</strong></li>
        <li><strong>Télérupteur</strong> (bobine a1/a2, contacts 11/14)</li>
        <li><strong>Bouton poussoir</strong> (commande bobine)</li>
        <li><strong>Lampe</strong> sur les contacts</li>
        <li><strong>Bornier neutre</strong></li>
      </ul>
    `,
    hint: 'Bobine : bouton (out) → a1, a2 → neutre. Contacts : 14 → lampe (ph), lampe (n) → neutre.',
    requiredComponents: ['disjoncteur16', 'telerupteur', 'bouton', 'lampe', 'bornier_neutre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const dj   = comps.find((c) => c.typeId === 'disjoncteur16')
      const tele = comps.find((c) => c.typeId === 'telerupteur')
      const btn  = comps.find((c) => c.typeId === 'bouton')
      const lamp = comps.find((c) => c.typeId === 'lampe')
      const bn   = comps.find((c) => c.typeId === 'bornier_neutre')
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' })
      if (!tele) errors.push({ msg: 'Ajoutez un télérupteur.' })
      if (!btn)  errors.push({ msg: 'Ajoutez un bouton poussoir.' })
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' })
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' })
      if (errors.length) return { score: 0, errors, ok }

      const btnToA1 =
        hasWire(wires, btn!.id, 'out', tele!.id, 'a1', 'phase') ||
        hasWire(wires, btn!.id, 'out', tele!.id, 'a1', 'signal')
      if (btnToA1) ok.push({ msg: 'Bouton → Bobine a1 ✓' })
      else errors.push({ msg: 'Connectez la sortie du bouton (out) à la borne a1 du télérupteur.' })

      if (anyWireOn(wires, tele!.id, 'a2', 'neutre'))
        ok.push({ msg: 'Bobine a2 → Neutre ✓' })
      else
        errors.push({ msg: 'Reliez la borne a2 du télérupteur au bornier neutre (fil bleu).' })

      const c14ToLamp =
        hasWire(wires, tele!.id, '14', lamp!.id, 'ph', 'phase') ||
        hasWire(wires, tele!.id, '14', lamp!.id, 'ph', 'signal')
      if (c14ToLamp) ok.push({ msg: 'Contact 14 → Lampe (ph) ✓' })
      else errors.push({ msg: 'Connectez la borne 14 du télérupteur à la borne ph de la lampe.' })

      if (anyWireOn(wires, lamp!.id, 'n', 'neutre'))
        ok.push({ msg: 'Lampe (n) → Neutre ✓' })
      else
        errors.push({ msg: 'Reliez la borne n de la lampe au bornier neutre.' })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },

  {
    id: 'ex04',
    title: 'Protection différentielle',
    difficulty: 'Intermédiaire',
    description: `
      <p>Installez une <strong>protection différentielle</strong> :</p>
      <ul>
        <li><strong>ID 30mA</strong> en tête</li>
        <li><strong>Disjoncteur 16A</strong> en aval</li>
        <li>Une <strong>lampe</strong></li>
        <li><strong>Bornier neutre</strong></li>
      </ul>
      <p>L'ID filtre phase ET neutre. Sa sortie ph_out → disjoncteur, n_out → bornier neutre aval.</p>
    `,
    hint: "ID : ph_out → disjoncteur (t_in). Disjoncteur : t_out → lampe (ph). ID n_out → bornier neutre.",
    requiredComponents: ['differentiel', 'disjoncteur16', 'lampe', 'bornier_neutre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const id   = comps.find((c) => c.typeId === 'differentiel')
      const dj   = comps.find((c) => c.typeId === 'disjoncteur16')
      const lamp = comps.find((c) => c.typeId === 'lampe')
      const bn   = comps.find((c) => c.typeId === 'bornier_neutre')
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      if (!id)   errors.push({ msg: 'Ajoutez un interrupteur différentiel 30mA.' })
      if (!dj)   errors.push({ msg: 'Ajoutez un disjoncteur 16A.' })
      if (!lamp) errors.push({ msg: 'Ajoutez une lampe.' })
      if (!bn)   errors.push({ msg: 'Ajoutez un bornier neutre.' })
      if (errors.length) return { score: 0, errors, ok }

      if (hasWire(wires, id!.id, 'ph_out', dj!.id, 't_in'))
        ok.push({ msg: "ID sortie ph_out → disjoncteur ✓" })
      else
        errors.push({ msg: "Reliez la sortie ph_out de l'ID à l'entrée (t_in) du disjoncteur." })

      if (hasWire(wires, dj!.id, 't_out', lamp!.id, 'ph'))
        ok.push({ msg: 'Disjoncteur → lampe (ph) ✓' })
      else
        errors.push({ msg: 'Reliez la sortie du disjoncteur (t_out) à la borne ph de la lampe.' })

      if (anyWireOn(wires, id!.id, 'n_out', 'neutre'))
        ok.push({ msg: "ID sortie n_out → bornier neutre ✓" })
      else
        errors.push({ msg: "Reliez la sortie n_out de l'ID au bornier neutre." })

      if (wires.some((w) =>
        ((w.fromCompId === bn!.id || w.toCompId === bn!.id) &&
         ((w.fromCompId === lamp!.id && w.fromTermId === 'n') ||
          (w.toCompId === lamp!.id && w.toTermId === 'n'))) && w.type === 'neutre'))
        ok.push({ msg: 'Neutre → lampe (n) ✓' })
      else
        errors.push({ msg: 'Reliez le bornier neutre à la borne n de la lampe.' })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },

  {
    id: 'ex05',
    title: 'Tableau complet — Logement',
    difficulty: 'Avancé',
    description: `
      <p>Réalisez un <strong>tableau divisionnaire complet</strong> pour un logement :</p>
      <ul>
        <li><strong>ID 30mA</strong> en tête du groupe éclairage</li>
        <li>Disjoncteur <strong>16A</strong> → lampe (éclairage)</li>
        <li>Disjoncteur <strong>20A</strong> → prise (séjour)</li>
        <li>Disjoncteur <strong>32A</strong> → prise (cuisine)</li>
        <li><strong>Bornier neutre</strong> et <strong>bornier terre</strong></li>
      </ul>
      <p>L'ID filtre phase ET neutre. Respectez : ID → disjoncteurs → charges. Les prises ont toutes la terre.</p>
    `,
    hint: "ID : ph_out → disjoncteur 16A. Disj 16A → lampe. Disj 20A et 32A → prises avec terre. Câblez au moins 8 fils.",
    requiredComponents: ['differentiel', 'disjoncteur16', 'disjoncteur20', 'disjoncteur32', 'lampe', 'prise', 'bornier_neutre', 'bornier_terre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      const requiredTypes: Record<string, string> = {
        differentiel: 'Interrupteur différentiel 30mA',
        disjoncteur16: 'Disjoncteur 16A',
        disjoncteur20: 'Disjoncteur 20A',
        disjoncteur32: 'Disjoncteur 32A',
        lampe: 'Lampe',
        prise: 'Prise',
        bornier_neutre: 'Bornier neutre',
        bornier_terre: 'Bornier terre',
      }
      for (const [t, label] of Object.entries(requiredTypes)) {
        if (!comps.some(c => c.typeId === t))
          errors.push({ msg: `Composant manquant : ${label}` })
      }

      if (errors.length) return { score: 0, errors, ok }

      const id   = comps.find(c => c.typeId === 'differentiel')!
      const dj16 = comps.find(c => c.typeId === 'disjoncteur16')!
      const dj20 = comps.find(c => c.typeId === 'disjoncteur20')!
      const dj32 = comps.find(c => c.typeId === 'disjoncteur32')!
      const lamp = comps.find(c => c.typeId === 'lampe')!
      const prise = comps.find(c => c.typeId === 'prise')!
      const bn   = comps.find(c => c.typeId === 'bornier_neutre')!
      const bt   = comps.find(c => c.typeId === 'bornier_terre')!

      if (hasWire(wires, id.id, 'ph_out', dj16.id, 't_in'))
        ok.push({ msg: 'ID sortie ph_out → disjoncteur 16A ✓' })
      else
        errors.push({ msg: "Reliez la sortie ph_out de l'ID à l'entrée t_in du disjoncteur 16A." })

      if (hasWire(wires, dj16.id, 't_out', lamp.id, 'ph'))
        ok.push({ msg: 'Disjoncteur 16A → lampe ✓' })
      else
        errors.push({ msg: 'Reliez la sortie t_out du disjoncteur 16A à la borne ph de la lampe.' })

      if (anyWireOn(wires, lamp.id, 'n', 'neutre'))
        ok.push({ msg: 'Neutre → lampe ✓' })
      else
        errors.push({ msg: 'Reliez un neutre du bornier à la borne n de la lampe.' })

      if (hasWire(wires, dj20.id, 't_out', prise.id, 'ph', 'phase'))
        ok.push({ msg: 'Disjoncteur 20A → prise (ph) ✓' })
      else
        errors.push({ msg: 'Reliez la sortie t_out du disjoncteur 20A à la borne ph de la prise.' })

      const priseN = wires.some(w =>
        ((w.fromCompId === bn.id || w.toCompId === bn.id) &&
         ((w.fromCompId === prise.id && w.fromTermId === 'n') ||
          (w.toCompId === prise.id && w.toTermId === 'n'))) && w.type === 'neutre'
      )
      if (priseN) ok.push({ msg: 'Neutre bornier → prise ✓' })
      else errors.push({ msg: 'Reliez le bornier neutre à la borne n de la prise (fil bleu).' })

      const prisePE = wires.some(w =>
        ((w.fromCompId === bt.id || w.toCompId === bt.id) &&
         ((w.fromCompId === prise.id && w.fromTermId === 'pe') ||
          (w.toCompId === prise.id && w.toTermId === 'pe'))) && w.type === 'terre'
      )
      if (prisePE) ok.push({ msg: 'Terre bornier PE → prise ✓' })
      else errors.push({ msg: 'Reliez le bornier PE à la borne pe de la prise (fil vert/jaune).' })

      if (wires.length >= 8)
        ok.push({ msg: `Câblage complet : ${wires.length} connexions ✓` })
      else
        errors.push({ msg: `Câblage incomplet — ${wires.length}/8 connexions minimum.` })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },

  {
    id: 'ex06',
    title: 'Circuit cuisine spécialisé',
    difficulty: 'Avancé',
    description: `
      <p>Câblez un circuit cuisine avec <strong>2 circuits spécialisés</strong> conformes NF C 15-100 :</p>
      <ul>
        <li><strong>Disjoncteur 20A</strong> → Prise hotte aspirante</li>
        <li><strong>Disjoncteur 32A</strong> → Prise four encastré</li>
        <li><strong>Bornier neutre</strong> et <strong>bornier terre</strong></li>
      </ul>
      <p>Chaque prise doit être raccordée en Phase (ph), Neutre (n) ET Terre (pe). La terre est obligatoire sur tous les circuits cuisine.</p>
    `,
    hint: "Reliez chaque disjoncteur à une prise (ph). Puis reliez le bornier neutre et le bornier PE aux 2 prises.",
    requiredComponents: ['disjoncteur20', 'disjoncteur32', 'prise', 'prise', 'bornier_neutre', 'bornier_terre'],
    checkFn(components, wires) {
      const comps = [...components.values()]
      const dj20  = comps.find(c => c.typeId === 'disjoncteur20')
      const dj32  = comps.find(c => c.typeId === 'disjoncteur32')
      const prises = comps.filter(c => c.typeId === 'prise')
      const bn    = comps.find(c => c.typeId === 'bornier_neutre')
      const bt    = comps.find(c => c.typeId === 'bornier_terre')
      const errors: Array<{ msg: string }> = []
      const ok: Array<{ msg: string }> = []

      if (!dj20)            errors.push({ msg: 'Ajoutez un disjoncteur 20A.' })
      if (!dj32)            errors.push({ msg: 'Ajoutez un disjoncteur 32A.' })
      if (prises.length < 2) errors.push({ msg: `Il faut 2 prises (${prises.length}/2 présentes).` })
      if (!bn)              errors.push({ msg: 'Ajoutez un bornier neutre.' })
      if (!bt)              errors.push({ msg: 'Ajoutez un bornier terre (PE).' })
      if (errors.length)    return { score: 0, errors, ok }

      // dj20 → une prise (phase)
      const dj20Prise = prises.find(p =>
        wires.some(w =>
          ((w.fromCompId === dj20!.id && w.fromTermId === 't_out' && w.toCompId === p.id && w.toTermId === 'ph') ||
           (w.toCompId === dj20!.id && w.toTermId === 't_out' && w.fromCompId === p.id && w.fromTermId === 'ph')) &&
          w.type === 'phase'
        )
      )
      if (dj20Prise) ok.push({ msg: 'Disjoncteur 20A → prise hotte (ph) ✓' })
      else errors.push({ msg: "Reliez la sortie t_out du disjoncteur 20A à la borne ph d'une prise (fil phase)." })

      // dj32 → une autre prise (phase)
      const dj32Prise = prises.find(p =>
        wires.some(w =>
          ((w.fromCompId === dj32!.id && w.fromTermId === 't_out' && w.toCompId === p.id && w.toTermId === 'ph') ||
           (w.toCompId === dj32!.id && w.toTermId === 't_out' && w.fromCompId === p.id && w.fromTermId === 'ph')) &&
          w.type === 'phase'
        )
      )
      if (dj32Prise) ok.push({ msg: 'Disjoncteur 32A → prise four (ph) ✓' })
      else errors.push({ msg: "Reliez la sortie t_out du disjoncteur 32A à la borne ph d'une prise (fil phase)." })

      // Neutre → chaque prise
      let neutreCount = 0
      for (const p of prises) {
        if (wires.some(w =>
          ((w.fromCompId === bn!.id || w.toCompId === bn!.id) &&
           ((w.fromCompId === p.id && w.fromTermId === 'n') ||
            (w.toCompId === p.id && w.toTermId === 'n'))) && w.type === 'neutre'
        )) neutreCount++
      }
      if (neutreCount >= 2)
        ok.push({ msg: 'Neutre bornier → 2 prises (n) ✓' })
      else
        errors.push({ msg: `Reliez le bornier neutre aux 2 prises (borne n) — ${neutreCount}/2 connectées.` })

      // Terre → chaque prise
      let terreCount = 0
      for (const p of prises) {
        if (wires.some(w =>
          ((w.fromCompId === bt!.id || w.toCompId === bt!.id) &&
           ((w.fromCompId === p.id && w.fromTermId === 'pe') ||
            (w.toCompId === p.id && w.toTermId === 'pe'))) && w.type === 'terre'
        )) terreCount++
      }
      if (terreCount >= 2)
        ok.push({ msg: 'Terre bornier PE → 2 prises (pe) ✓' })
      else
        errors.push({ msg: `Reliez le bornier PE aux 2 prises (borne pe) — ${terreCount}/2 connectées.` })

      const score = Math.round((ok.length / (ok.length + errors.length)) * 100)
      return { score, errors, ok }
    },
  },
]
