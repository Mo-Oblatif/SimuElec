/**
 * Editor.js — Éditeur canvas principal
 * Gère : rendu, drag&drop, tracé de fils, sélection, zoom/pan
 */

'use strict';

const TERMINAL_RADIUS = 6;
const SNAP_GRID = 8;

class Editor {
  constructor(canvasEl, wrapperEl) {
    this.canvas = canvasEl;
    this.wrapper = wrapperEl;
    this.ctx = canvasEl.getContext('2d');

    this.components = new Map(); // id → Component
    this.wires = [];             // Wire[]

    // Outil actif : 'select' | 'wire' | 'delete'
    this.tool = 'select';
    this.activeWireType = 'phase';

    // Zoom & pan
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    // État interaction
    this.selected = null;         // Component | Wire | null
    this.dragging = null;         // { comp, startX, startY, mouseX, mouseY }
    this.wireStart = null;        // { comp, terminalId, x, y }
    this.mousePos = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0, px: 0, py: 0 };

    // Undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.MAX_HISTORY = 50;

    // Simulation
    this.simMode = false;

    // Callbacks
    this.onSelectionChange = null;
    this.onStatusChange = null;
    this.onComponentCountChange = null;

    this._setupCanvas();
    this._setupListeners();
    this._renderLoop();
  }

  /* ============================================================
     SETUP
     ============================================================ */

  _setupCanvas() {
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  _setupListeners() {
    const c = this.canvas;

    c.addEventListener('mousedown',  e => this._onMouseDown(e));
    c.addEventListener('mousemove',  e => this._onMouseMove(e));
    c.addEventListener('mouseup',    e => this._onMouseUp(e));
    c.addEventListener('wheel',      e => this._onWheel(e), { passive: false });
    c.addEventListener('dblclick',   e => this._onDblClick(e));
    c.addEventListener('contextmenu', e => { e.preventDefault(); this._onRightClick(e); });

    // Drag depuis la palette
    this.wrapper.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    this.wrapper.addEventListener('drop', e => this._onDrop(e));

    // Touches clavier
    document.addEventListener('keydown', e => this._onKeyDown(e));
  }

  /* ============================================================
     BOUCLE DE RENDU
     ============================================================ */

  _renderLoop() {
    requestAnimationFrame(() => this._renderLoop());
    this._render();
  }

  _render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    this._drawGrid();
    this._drawTableau();

    // Pré-calcul des terminaux connectés
    const connectedTerms = this._computeConnectedTerms();

    // Fils (derrière les composants)
    for (const wire of this.wires) {
      const p1 = this._getTerminalWorldPos(wire.fromCompId, wire.fromTermId);
      const p2 = this._getTerminalWorldPos(wire.toCompId, wire.toTermId);
      wire.draw(ctx, p1, p2, this.simMode);
    }

    // Fil en cours de tracé
    if (this.wireStart) {
      Wire.drawInProgress(ctx, this.wireStart, this._screenToWorld(this.mousePos), this.activeWireType);
    }

    // Composants
    for (const comp of this.components.values()) {
      // Injecter l'info "connecté" dans les terminaux pour l'affichage
      comp.def.terminals.forEach(t => {
        t._connected = connectedTerms.has(`${comp.id}:${t.id}`);
      });
      comp.draw(ctx, this.zoom, this.simMode);
    }

    ctx.restore();
  }

  _drawGrid() {
    const ctx = this.ctx;
    const w = this.canvas.width / this.zoom;
    const h = this.canvas.height / this.zoom;
    const ox = -this.panX / this.zoom;
    const oy = -this.panY / this.zoom;
    const grid = SNAP_GRID * 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;

    const startX = Math.floor(ox / grid) * grid;
    const startY = Math.floor(oy / grid) * grid;

    for (let x = startX; x < ox + w; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + h); ctx.stroke();
    }
    for (let y = startY; y < oy + h; y += grid) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + w, y); ctx.stroke();
    }
  }

  _drawTableau() {
    const ctx = this.ctx;
    // Fond du tableau électrique (zone grise)
    const tw = 700, th = 500, tx = 50, ty = 50;
    ctx.fillStyle = '#11151c';
    ctx.strokeStyle = '#2e3348';
    ctx.lineWidth = 2;
    this._roundRect(ctx, tx, ty, tw, th, 8);
    ctx.fill();
    ctx.stroke();

    // Titre
    ctx.fillStyle = '#3d4460';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TABLEAU DIVISIONNAIRE', tx + 10, ty + 16);

    // Rails DIN (guides visuels horizontaux)
    const rails = [ty + 60, ty + 180, ty + 300, ty + 420];
    for (const ry of rails) {
      ctx.fillStyle = '#1e2535';
      ctx.fillRect(tx + 10, ry - 4, tw - 20, 8);
      ctx.strokeStyle = '#3d4460';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tx + 10, ry - 4, tw - 20, 8);
    }

    // Peigne de phase (barre L) — ligne rouge en haut à gauche
    ctx.strokeStyle = WIRE_COLORS.phase + 'aa';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(tx + 10, ty + 30);
    ctx.lineTo(tx + tw - 10, ty + 30);
    ctx.stroke();
    ctx.fillStyle = WIRE_COLORS.phase;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('L (Phase)', tx + 12, ty + 27);

    ctx.strokeStyle = WIRE_COLORS.neutre + '88';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(tx + tw - 60, ty + 30);
    ctx.lineTo(tx + tw - 60, ty + th - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _computeConnectedTerms() {
    const s = new Set();
    for (const w of this.wires) {
      s.add(`${w.fromCompId}:${w.fromTermId}`);
      s.add(`${w.toCompId}:${w.toTermId}`);
    }
    return s;
  }

  /* ============================================================
     CONVERSION COORDONNÉES
     ============================================================ */

  _screenToWorld(pt) {
    return {
      x: (pt.x - this.panX) / this.zoom,
      y: (pt.y - this.panY) / this.zoom,
    };
  }

  _getMouseWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this._screenToWorld({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  _getMouseScreen(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _getTerminalWorldPos(compId, termId) {
    const comp = this.components.get(compId);
    if (!comp) return null;
    return comp.getTerminalPos(termId);
  }

  /* ============================================================
     GESTION DES ÉVÉNEMENTS
     ============================================================ */

  _onMouseDown(e) {
    e.preventDefault();
    const world = this._getMouseWorld(e);
    const screen = this._getMouseScreen(e);

    // Panoramique avec bouton milieu ou Espace
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStart = { x: screen.x, y: screen.y, px: this.panX, py: this.panY };
      this.wrapper.classList.add('cursor-grabbing');
      return;
    }

    if (e.button !== 0) return;

    switch (this.tool) {
      case 'select': this._selectDown(world); break;
      case 'wire':   this._wireDown(world); break;
      case 'delete': this._deleteAt(world); break;
    }
  }

  _onMouseMove(e) {
    const world = this._getMouseWorld(e);
    const screen = this._getMouseScreen(e);
    this.mousePos = screen;

    if (this.isPanning) {
      this.panX = this.panStart.px + (screen.x - this.panStart.x);
      this.panY = this.panStart.py + (screen.y - this.panStart.y);
      return;
    }

    if (this.dragging) {
      const dx = world.x - this.dragging.mouseX;
      const dy = world.y - this.dragging.mouseY;
      this.dragging.comp.x = this._snap(this.dragging.origX + dx);
      this.dragging.comp.y = this._snap(this.dragging.origY + dy);
      return;
    }

    // Surbrillance terminal si outil wire
    if (this.tool === 'wire') {
      const t = this._findTerminalAt(world);
      this.wrapper.classList.toggle('cursor-crosshair', !t);
    }

    // Status bar coords
    if (this.onStatusChange) {
      const tx = this._findTerminalAt(world);
      if (tx) {
        this.onStatusChange(`Terminal: ${tx.label || tx.id} (${tx.type})`);
      }
    }
    if (document.getElementById('coords-display')) {
      document.getElementById('coords-display').textContent = `${Math.round(world.x)}, ${Math.round(world.y)}`;
    }
  }

  _onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.wrapper.classList.remove('cursor-grabbing');
      return;
    }

    if (this.dragging) {
      this._pushHistory();
      this.dragging = null;
      return;
    }

    if (this.tool === 'wire' && this.wireStart) {
      const world = this._getMouseWorld(e);
      this._wireUp(world);
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const screen = this._getMouseScreen(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.2, Math.min(4, this.zoom * factor));

    // Zoom centré sur la souris
    this.panX = screen.x - (screen.x - this.panX) * (newZoom / this.zoom);
    this.panY = screen.y - (screen.y - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;

    const el = document.getElementById('zoom-level');
    if (el) el.textContent = Math.round(newZoom * 100) + '%';
  }

  _onDblClick(e) {
    const world = this._getMouseWorld(e);
    const comp = this._findCompAt(world);
    if (comp && comp.def.toggleable) {
      comp.toggle();
      this._pushHistory();
      this._emitCountChange();
    }
  }

  _onRightClick(e) {
    const world = this._getMouseWorld(e);
    const comp = this._findCompAt(world);
    if (comp) {
      this._selectComponent(comp);
    }
  }

  _onDrop(e) {
    e.preventDefault();
    const typeId = e.dataTransfer.getData('text/plain');
    if (!typeId || !COMPONENT_TYPES[typeId]) return;

    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = this._screenToWorld(screen);

    const comp = new Component(typeId, this._snap(world.x - 20), this._snap(world.y - 20));
    this.components.set(comp.id, comp);
    this._selectComponent(comp);
    this._pushHistory();
    this._emitCountChange();
  }

  _onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 's': case 'S': this.setTool('select'); break;
      case 'w': case 'W': this.setTool('wire'); break;
      case 'Delete': case 'Backspace': this._deleteSelected(); break;
      case 'Escape': this.wireStart = null; this.setTool('select'); break;
      case 'z': if (e.ctrlKey) { e.preventDefault(); this.undo(); } break;
      case 'y': if (e.ctrlKey) { e.preventDefault(); this.redo(); } break;
      case '+': case '=': this._zoomBy(1.2); break;
      case '-': this._zoomBy(1 / 1.2); break;
      case '0': this.resetZoom(); break;
    }
  }

  /* ============================================================
     OUTILS
     ============================================================ */

  setTool(tool) {
    this.tool = tool;
    this.wireStart = null;
    document.querySelectorAll('.tool-btn[id^="tool-"]').forEach(btn => {
      btn.classList.toggle('active', btn.id === `tool-${tool}`);
    });

    const cursors = { select: '', wire: 'cursor-crosshair', delete: 'cursor-not-allowed' };
    this.wrapper.className = 'canvas-wrapper ' + (cursors[tool] || '');

    const msgs = {
      select: 'Outil: Sélection — Cliquez pour sélectionner, double-clic pour basculer',
      wire:   `Outil: Fil (${this.activeWireType}) — Cliquez sur un terminal, puis sur un autre`,
      delete: 'Outil: Supprimer — Cliquez sur un composant ou un fil',
    };
    this._status(msgs[tool] || '');
  }

  /* ---- Select ---- */
  _selectDown(world) {
    // 1. Terminal ?
    const term = this._findTerminalAt(world);
    if (term) { this.setTool('wire'); this._wireDown(world); return; }

    // 2. Composant ?
    const comp = this._findCompAt(world);
    if (comp) {
      this._selectComponent(comp);
      this.dragging = {
        comp,
        mouseX: world.x, mouseY: world.y,
        origX: comp.x, origY: comp.y,
      };
      return;
    }

    // 3. Fil ?
    const wire = this._findWireAt(world);
    if (wire) { this._selectWire(wire); return; }

    // 4. Désélectionner
    this._deselect();
  }

  _selectComponent(comp) {
    this._deselect();
    comp.selected = true;
    this.selected = comp;
    if (this.onSelectionChange) this.onSelectionChange(comp);
  }

  _selectWire(wire) {
    this._deselect();
    wire.selected = true;
    this.selected = wire;
    if (this.onSelectionChange) this.onSelectionChange(wire);
  }

  _deselect() {
    if (this.selected instanceof Component) this.selected.selected = false;
    if (this.selected instanceof Wire) this.selected.selected = false;
    this.selected = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
  }

  _deleteSelected() {
    if (!this.selected) return;
    if (this.selected instanceof Component) {
      const id = this.selected.id;
      this.components.delete(id);
      // Supprimer les fils connectés
      this.wires = this.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
    } else if (this.selected instanceof Wire) {
      this.wires = this.wires.filter(w => w !== this.selected);
    }
    this.selected = null;
    if (this.onSelectionChange) this.onSelectionChange(null);
    this._pushHistory();
    this._emitCountChange();
  }

  _deleteAt(world) {
    // Composant ?
    const comp = this._findCompAt(world);
    if (comp) {
      const id = comp.id;
      this.components.delete(id);
      this.wires = this.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
      if (this.selected === comp) { this.selected = null; if (this.onSelectionChange) this.onSelectionChange(null); }
      this._pushHistory(); this._emitCountChange();
      return;
    }
    // Fil ?
    const wire = this._findWireAt(world);
    if (wire) {
      this.wires = this.wires.filter(w => w !== wire);
      if (this.selected === wire) { this.selected = null; if (this.onSelectionChange) this.onSelectionChange(null); }
      this._pushHistory();
    }
  }

  /* ---- Wire ---- */
  _wireDown(world) {
    const term = this._findTerminalAt(world);
    if (!term) { this.wireStart = null; return; }

    if (!this.wireStart) {
      // Début du fil
      this.wireStart = {
        x: term.x, y: term.y,
        compId: term.compId, termId: term.id,
      };
      this._status(`Fil démarré depuis ${term.label || term.id} — Cliquez sur le terminal de destination`);
    } else {
      // Fin du fil (même composant = annulation)
      if (term.compId === this.wireStart.compId && term.id === this.wireStart.termId) {
        this.wireStart = null;
        return;
      }
      this._createWire(this.wireStart, term);
      this.wireStart = null;
    }
  }

  _wireUp(world) {
    // Pas de fin sur mouseup si pas de terminal trouvé
  }

  _createWire(from, to) {
    // Vérifier doublon
    const exists = this.wires.some(w =>
      (w.fromCompId === from.compId && w.fromTermId === from.termId && w.toCompId === to.compId && w.toTermId === to.id) ||
      (w.fromCompId === to.compId && w.fromTermId === to.id && w.toCompId === from.compId && w.toTermId === from.termId)
    );
    if (exists) { this._toast('Connexion déjà existante.', 'warning'); return; }

    const wire = new Wire(from.compId, from.termId, to.compId, to.id, this.activeWireType);
    this.wires.push(wire);
    this._pushHistory();
    this._toast(`Fil ${this.activeWireType} ajouté.`, 'success');
    this._emitCountChange();
  }

  /* ============================================================
     RECHERCHE
     ============================================================ */

  _findCompAt(world) {
    // Ordre inverse (dernier ajouté = en avant)
    const comps = [...this.components.values()];
    for (let i = comps.length - 1; i >= 0; i--) {
      if (comps[i].hitTest(world.x, world.y)) return comps[i];
    }
    return null;
  }

  _findTerminalAt(world) {
    for (const comp of this.components.values()) {
      const t = comp.hitTestTerminal(world.x, world.y, TERMINAL_RADIUS / this.zoom * 1.5);
      if (t) return t;
    }
    return null;
  }

  _findWireAt(world) {
    for (const wire of this.wires) {
      const p1 = this._getTerminalWorldPos(wire.fromCompId, wire.fromTermId);
      const p2 = this._getTerminalWorldPos(wire.toCompId, wire.toTermId);
      if (wire.hitTest(world.x, world.y, p1, p2, 8 / this.zoom)) return wire;
    }
    return null;
  }

  /* ============================================================
     ZOOM / PAN
     ============================================================ */

  _zoomBy(factor) {
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    const newZoom = Math.max(0.2, Math.min(4, this.zoom * factor));
    this.panX = cx - (cx - this.panX) * (newZoom / this.zoom);
    this.panY = cy - (cy - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    const el = document.getElementById('zoom-level');
    if (el) el.textContent = Math.round(newZoom * 100) + '%';
  }

  resetZoom() {
    this.zoom = 1; this.panX = 0; this.panY = 0;
    const el = document.getElementById('zoom-level');
    if (el) el.textContent = '100%';
  }

  /* ============================================================
     SIMULATION
     ============================================================ */

  runSimulation() {
    this.simMode = true;
    const circuit = new Circuit(this.components, this.wires);
    const result = circuit.simulate();
    return result;
  }

  stopSimulation() {
    this.simMode = false;
    // Reset états visuels
    for (const comp of this.components.values()) {
      comp.energized = false;
      if (comp.def.electricLogic === 'lamp') comp.state = 'off';
      if (comp.def.electricLogic === 'socket') comp.state = 'inactive';
    }
    for (const wire of this.wires) wire.energized = false;
  }

  /* ============================================================
     UNDO / REDO
     ============================================================ */

  _pushHistory() {
    const state = this._serialize();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    else this.historyIndex++;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this._deserialize(this.history[this.historyIndex]);
    this._emitCountChange();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this._deserialize(this.history[this.historyIndex]);
    this._emitCountChange();
  }

  /* ============================================================
     SÉRIALISATION
     ============================================================ */

  _serialize() {
    return JSON.stringify({
      components: [...this.components.values()].map(c => c.toJSON()),
      wires: this.wires.map(w => w.toJSON()),
    });
  }

  _deserialize(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    this.components.clear();
    this.wires = [];
    this.selected = null;
    for (const cData of data.components || []) {
      try {
        const comp = Component.fromJSON(cData);
        this.components.set(comp.id, comp);
      } catch {}
    }
    for (const wData of data.wires || []) {
      try {
        const wire = Wire.fromJSON(wData);
        // Vérifier que les composants existent
        if (this.components.has(wire.fromCompId) && this.components.has(wire.toCompId)) {
          this.wires.push(wire);
        }
      } catch {}
    }
  }

  save(name) {
    const data = { name, date: new Date().toISOString(), schema: this._serialize() };
    const saves = JSON.parse(localStorage.getItem('simuElec_saves') || '{}');
    saves[name] = data;
    localStorage.setItem('simuElec_saves', JSON.stringify(saves));
  }

  load(name) {
    const saves = JSON.parse(localStorage.getItem('simuElec_saves') || '{}');
    const data = saves[name];
    if (!data) return false;
    this._deserialize(data.schema);
    this._pushHistory();
    this._emitCountChange();
    return true;
  }

  getSaves() {
    return JSON.parse(localStorage.getItem('simuElec_saves') || '{}');
  }

  deleteSave(name) {
    const saves = JSON.parse(localStorage.getItem('simuElec_saves') || '{}');
    delete saves[name];
    localStorage.setItem('simuElec_saves', JSON.stringify(saves));
  }

  clearAll() {
    this.components.clear();
    this.wires = [];
    this.selected = null;
    this.wireStart = null;
    this.simMode = false;
    this._pushHistory();
    this._emitCountChange();
    if (this.onSelectionChange) this.onSelectionChange(null);
  }

  /* ============================================================
     UTILITAIRES
     ============================================================ */

  _snap(v) { return Math.round(v / SNAP_GRID) * SNAP_GRID; }

  _status(msg) {
    const el = document.getElementById('status-text');
    if (el) el.textContent = msg;
  }

  _toast(msg, type = 'info') {
    if (window.App && App.toast) App.toast(msg, type);
  }

  _emitCountChange() {
    const el = document.getElementById('component-count');
    if (el) el.textContent = `${this.components.size} composant${this.components.size !== 1 ? 's' : ''}, ${this.wires.length} fil${this.wires.length !== 1 ? 's' : ''}`;
  }
}
