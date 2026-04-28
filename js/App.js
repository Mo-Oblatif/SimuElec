/**
 * App.js — Bootstrap et orchestration de l'application
 */

'use strict';

const App = {
  editor: null,
  exercises: null,
  simRunning: false,

  init() {
    const canvas  = document.getElementById('mainCanvas');
    const wrapper = document.getElementById('canvasWrapper');

    this.editor    = new Editor(canvas, wrapper);
    this.exercises = new ExerciseManager(this.editor);

    // Injecter les prévisualisations dans la palette
    this._renderPreviews();

    // Connexions UI
    this._bindToolbar();
    this._bindModeNav();
    this._bindHeaderActions();
    this._bindWireTypes();
    this._bindExercisePanel();
    this._bindProperties();
    this._bindModalClose();

    // Callbacks editor
    this.editor.onSelectionChange = (sel) => this._updateProperties(sel);
    this.editor.onStatusChange    = (msg) => {
      const el = document.getElementById('status-text');
      if (el) el.textContent = msg;
    };

    // Drag depuis palette
    document.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', el.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });

    // État initial
    this.editor._pushHistory();
    this.editor._emitCountChange();

    // Charger autosave si présent
    const saves = this.editor.getSaves();
    if (saves['__autosave__']) {
      this.editor.load('__autosave__');
    }

    // Autosave toutes les 30s
    setInterval(() => {
      if (this.editor.components.size > 0) {
        this.editor.save('__autosave__');
      }
    }, 30000);

    console.log('SimuÉlec prêt.');
  },

  /* ---- Palette previews ---- */
  _renderPreviews() {
    document.querySelectorAll('canvas[data-preview]').forEach(cvs => {
      try {
        Component.drawPreview(cvs, cvs.dataset.preview);
      } catch {}
    });
  },

  /* ---- Barre d'outils ---- */
  _bindToolbar() {
    document.getElementById('tool-select').addEventListener('click', () => this.editor.setTool('select'));
    document.getElementById('tool-wire').addEventListener('click',   () => this.editor.setTool('wire'));
    document.getElementById('tool-delete').addEventListener('click', () => this.editor.setTool('delete'));

    document.getElementById('zoom-in').addEventListener('click',    () => this.editor._zoomBy(1.25));
    document.getElementById('zoom-out').addEventListener('click',   () => this.editor._zoomBy(0.8));
    document.getElementById('zoom-reset').addEventListener('click', () => this.editor.resetZoom());

    document.getElementById('btn-undo').addEventListener('click', () => this.editor.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.editor.redo());
  },

  /* ---- Mode nav ---- */
  _bindModeNav() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.mode === 'training') {
          this._showTrainingModal();
        } else {
          this.exercises.exit();
        }
      });
    });
  },

  _showTrainingModal() {
    let html = '<p style="margin-bottom:12px;color:var(--text-muted)">Choisissez un exercice :</p><div style="display:flex;flex-direction:column;gap:8px">';
    EXERCISES.forEach((ex, i) => {
      const colors = { 'Débutant': 'badge-green', 'Intermédiaire': 'badge-yellow', 'Avancé': 'badge-red' };
      html += `
        <div style="padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer"
             onclick="App._startExercise(${i})" class="exercise-choice">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <strong style="color:var(--text)">${i + 1}. ${ex.title}</strong>
            <span class="prop-badge ${colors[ex.difficulty] || 'badge-blue'}">${ex.difficulty}</span>
          </div>
        </div>`;
    });
    html += '</div>';

    this._showModal('Mode Entraînement', html, []);
  },

  _startExercise(index) {
    this._closeModal();
    this.exercises.start(index);
    // Réinitialiser le mode nav
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.mode-btn[data-mode="training"]').classList.add('active');
  },

  /* ---- Header actions ---- */
  _bindHeaderActions() {
    document.getElementById('btn-simulate').addEventListener('click', () => this._toggleSimulation());

    document.getElementById('btn-save').addEventListener('click', () => this._showSaveModal());

    document.getElementById('btn-load').addEventListener('click', () => this._showLoadModal());

    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Effacer tout le schéma ? Cette action est irréversible.')) {
        this.editor.clearAll();
        this.toast('Schéma effacé.', 'info');
      }
    });
  },

  /* ---- Simulation ---- */
  _toggleSimulation() {
    const btn = document.getElementById('btn-simulate');
    const simSection = document.getElementById('simSection');

    if (this.simRunning) {
      this.editor.stopSimulation();
      this.simRunning = false;
      btn.textContent = '▶ Simuler';
      btn.classList.remove('simulating');
      simSection.style.display = 'none';
      this.toast('Simulation arrêtée.', 'info');
    } else {
      const result = this.editor.runSimulation();
      this.simRunning = true;
      btn.textContent = '■ Arrêter';
      btn.classList.add('simulating');
      simSection.style.display = '';
      this._renderSimResults(result);

      if (result.errors.length > 0) {
        this.toast(`${result.errors.length} erreur(s) détectée(s) — voir panneau.`, 'error');
      } else if (result.loads.some(l => l.on)) {
        this.toast('Simulation : circuit fonctionnel !', 'success');
      } else {
        this.toast('Simulation : aucune charge alimentée.', 'warning');
      }
    }
  },

  _renderSimResults(result) {
    const el = document.getElementById('sim-content');
    let html = '';

    for (const load of result.loads) {
      const icon = load.on ? '💡' : '⚫';
      const status = load.on ? 'Alimenté' : 'Hors tension';
      const cls = load.on ? 'badge-green' : 'badge-red';
      html += `
        <div class="sim-result-item">
          <span class="sim-icon">${icon}</span>
          <div class="sim-text">
            <strong>${load.comp.label}</strong>
            <span class="prop-badge ${cls}">${status}</span>
          </div>
        </div>`;
    }

    for (const err of result.errors) {
      html += `<div class="feedback-item feedback-err" style="margin-top:4px">⚠ ${err.msg}</div>`;
    }
    for (const w of result.warnings) {
      html += `<div class="feedback-item feedback-warn" style="margin-top:4px">⚡ ${w.msg}</div>`;
    }

    if (!html) {
      html = '<p class="hint-text">Aucune charge dans le schéma.</p>';
    }

    el.innerHTML = html;
  },

  /* ---- Types de fils ---- */
  _bindWireTypes() {
    document.querySelectorAll('.wire-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.wire-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.activeWireType = btn.dataset.wire;
        if (this.editor.tool !== 'wire') this.editor.setTool('wire');
      });
    });
  },

  /* ---- Panneau exercice ---- */
  _bindExercisePanel() {
    document.getElementById('btn-validate').addEventListener('click', () => this.exercises.validate());
    document.getElementById('btn-hint').addEventListener('click',    () => this.exercises.hint());
    document.getElementById('btn-next-ex').addEventListener('click', () => this.exercises.next());
    document.getElementById('btn-exit-training').addEventListener('click', () => {
      this.exercises.exit();
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.mode-btn[data-mode="sandbox"]').classList.add('active');
    });
  },

  /* ---- Propriétés composant ---- */
  _bindProperties() {
    this.editor.onSelectionChange = (sel) => this._updateProperties(sel);
  },

  _updateProperties(sel) {
    const el = document.getElementById('properties-content');
    if (!sel) {
      el.innerHTML = '<p class="hint-text">Sélectionnez un composant.</p>';
      return;
    }

    if (sel instanceof Component) {
      const def = sel.def;
      const stateColors = {
        closed: 'badge-green', open: 'badge-red', tripped: 'badge-red',
        on: 'badge-green', off: 'badge-red', active: 'badge-green', inactive: 'badge-red',
        pressed: 'badge-blue', released: 'badge-red',
      };
      const cls = stateColors[sel.state] || 'badge-blue';

      el.innerHTML = `
        <div class="prop-row"><span class="prop-label">Type</span><span class="prop-value">${def.label}</span></div>
        <div class="prop-row"><span class="prop-label">ID</span><span class="prop-value" style="font-size:10px;opacity:.6">${sel.id.slice(-8)}</span></div>
        <div class="prop-row"><span class="prop-label">État</span><span class="prop-badge ${cls}">${sel.state}</span></div>
        ${def.amperage ? `<div class="prop-row"><span class="prop-label">Calibre</span><span class="prop-value">${def.amperage}A</span></div>` : ''}
        ${def.sensitivity ? `<div class="prop-row"><span class="prop-label">Sensibilité</span><span class="prop-value">${def.sensitivity}mA</span></div>` : ''}
        <div class="prop-row"><span class="prop-label">Bornes</span><span class="prop-value">${def.terminals.length}</span></div>
        <div class="prop-row"><span class="prop-label">Position</span><span class="prop-value">${Math.round(sel.x)}, ${Math.round(sel.y)}</span></div>
        ${def.toggleable ? `<button class="prop-btn" onclick="App.editor.selected.toggle()">⇄ Basculer état</button>` : ''}
        <button class="prop-btn" style="color:var(--danger);margin-top:4px" onclick="App.editor._deleteSelected();App.editor._pushHistory()">🗑 Supprimer</button>
        <div style="margin-top:8px;font-size:10px;color:var(--text-dim);line-height:1.4">${def.description || ''}</div>
      `;
    } else if (sel instanceof Wire) {
      const color = WIRE_COLORS[sel.wireType] || '#888';
      el.innerHTML = `
        <div class="prop-row"><span class="prop-label">Fil</span><span class="prop-value" style="color:${color}">${sel.wireType.toUpperCase()}</span></div>
        <div class="prop-row"><span class="prop-label">De</span><span class="prop-value" style="font-size:10px">${sel.fromCompId.slice(-6)}:${sel.fromTermId}</span></div>
        <div class="prop-row"><span class="prop-label">Vers</span><span class="prop-value" style="font-size:10px">${sel.toCompId.slice(-6)}:${sel.toTermId}</span></div>
        <button class="prop-btn" style="color:var(--danger);margin-top:8px" onclick="App.editor._deleteSelected();App.editor._pushHistory()">🗑 Supprimer le fil</button>
      `;
    }
  },

  /* ---- Sauvegarde ---- */
  _showSaveModal() {
    const html = `
      <div class="save-input-group">
        <input type="text" id="save-name-input" placeholder="Nom de la sauvegarde…" value="Mon schéma">
        <button class="btn-primary" onclick="App._doSave()">Sauvegarder</button>
      </div>
      <div id="existing-saves">${this._renderSaveList()}</div>
    `;
    this._showModal('Sauvegarder le schéma', html, []);
    setTimeout(() => document.getElementById('save-name-input')?.focus(), 50);
  },

  _doSave() {
    const name = document.getElementById('save-name-input')?.value.trim();
    if (!name) { this.toast('Entrez un nom.', 'warning'); return; }
    this.editor.save(name);
    this.toast(`Schéma "${name}" sauvegardé.`, 'success');
    this._closeModal();
  },

  _showLoadModal() {
    const saves = this.editor.getSaves();
    const filtered = Object.entries(saves).filter(([k]) => k !== '__autosave__');
    if (filtered.length === 0) {
      this._showModal('Charger un schéma', '<p class="hint-text">Aucune sauvegarde.</p>', []);
      return;
    }
    this._showModal('Charger un schéma', this._renderSaveList(true), []);
  },

  _renderSaveList(forLoad = false) {
    const saves = this.editor.getSaves();
    const filtered = Object.entries(saves).filter(([k]) => k !== '__autosave__');
    if (filtered.length === 0) return '<p class="hint-text">Aucune sauvegarde existante.</p>';

    let html = '<div class="save-list">';
    for (const [name, data] of filtered) {
      const date = new Date(data.date).toLocaleString('fr-FR');
      html += `
        <div class="save-item">
          <div>
            <div class="save-item-name">${name}</div>
            <div class="save-item-date">${date}</div>
          </div>
          <div class="save-item-actions">
            ${forLoad ? `<button onclick="App._doLoad('${name}')">Charger</button>` : ''}
            <button class="del-btn" onclick="App._doDeleteSave('${name}')">✕</button>
          </div>
        </div>`;
    }
    return html + '</div>';
  },

  _doLoad(name) {
    const ok = this.editor.load(name);
    if (ok) { this.toast(`"${name}" chargé.`, 'success'); this._closeModal(); }
    else this.toast('Erreur de chargement.', 'error');
  },

  _doDeleteSave(name) {
    if (!confirm(`Supprimer la sauvegarde "${name}" ?`)) return;
    this.editor.deleteSave(name);
    this.toast(`"${name}" supprimé.`, 'info');
    // Refresh
    const body = document.getElementById('modal-body');
    if (body) body.innerHTML = this._renderSaveList(true);
  },

  /* ---- Modal générique ---- */
  _showModal(title, body, buttons) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;

    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.className = b.cls || 'btn-secondary';
      btn.onclick = b.action;
      footer.appendChild(btn);
    }

    document.getElementById('modal-overlay').style.display = 'flex';
  },

  _closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  },

  _bindModalClose() {
    document.getElementById('modal-close').addEventListener('click', () => this._closeModal());
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) this._closeModal();
    });
  },

  /* ---- Toast ---- */
  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },
};

/* ---- Démarrage ---- */
document.addEventListener('DOMContentLoaded', () => App.init());
