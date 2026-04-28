/**
 * Component.js — Instance d'un composant électrique sur le canvas
 */

'use strict';

class Component {
  constructor(typeId, x, y) {
    this.id = generateId('comp');
    this.typeId = typeId;
    this.def = COMPONENT_TYPES[typeId];
    if (!this.def) throw new Error(`Type inconnu: ${typeId}`);

    this.x = x;
    this.y = y;
    this.state = this.def.defaultState;
    this.selected = false;
    this.energized = false; // résultat simulation
    this.label = this.def.label;
    this.customLabel = '';
  }

  get w() { return this.def.w; }
  get h() { return this.def.h; }

  /* Coordonnée absolue du centre du composant */
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  /* Position absolue d'un terminal */
  getTerminalPos(terminalId) {
    const tDef = this.def.terminals.find(t => t.id === terminalId);
    if (!tDef) return null;
    return {
      x: this.x + tDef.rx * this.w,
      y: this.y + tDef.ry * this.h,
    };
  }

  /* Tous les terminaux avec position absolue */
  getTerminals() {
    return this.def.terminals.map(tDef => ({
      ...tDef,
      compId: this.id,
      x: this.x + tDef.rx * this.w,
      y: this.y + tDef.ry * this.h,
    }));
  }

  /* Basculer l'état (si toggleable) */
  toggle() {
    const states = this.def.states;
    const idx = states.indexOf(this.state);
    if (idx === -1) return;
    this.state = states[(idx + 1) % states.length];
  }

  /* Réinitialiser à l'état par défaut */
  reset() {
    this.state = this.def.defaultState;
    this.energized = false;
  }

  /* Vérifie si le point (px, py) est dans la boîte du composant */
  hitTest(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  /* Vérifie si un point est proche d'un terminal (retourne le terminal ou null) */
  hitTestTerminal(px, py, radius = 8) {
    for (const t of this.getTerminals()) {
      const dx = px - t.x, dy = py - t.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return t;
    }
    return null;
  }

  /* Bounding box (pour sélection multiple, zoom) */
  getBBox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  /* Sérialisation pour localStorage */
  toJSON() {
    return {
      id: this.id,
      typeId: this.typeId,
      x: this.x,
      y: this.y,
      state: this.state,
      customLabel: this.customLabel,
    };
  }

  static fromJSON(data) {
    const c = new Component(data.typeId, data.x, data.y);
    c.id = data.id;
    c.state = data.state || c.def.defaultState;
    c.customLabel = data.customLabel || '';
    return c;
  }

  /* ============================================================
     RENDU CANVAS
     ============================================================ */

  draw(ctx, scale = 1, simMode = false) {
    const { x, y, w, h } = this;
    ctx.save();

    // Ombre si sélectionné
    if (this.selected) {
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 12 / scale;
    }

    // Fond avec couleur selon état
    const energizedTint = simMode && this.energized;
    this._drawBody(ctx, x, y, w, h, energizedTint);

    ctx.shadowBlur = 0;

    // Dessin spécifique au type
    switch (this.def.electricLogic) {
      case 'breaker':       this._drawBreaker(ctx, x, y, w, h, scale); break;
      case 'differential':  this._drawDifferential(ctx, x, y, w, h, scale); break;
      case 'relay':         this._drawRelay(ctx, x, y, w, h, scale); break;
      case 'pushbutton':    this._drawButton(ctx, x, y, w, h, scale); break;
      case 'lamp':          this._drawLamp(ctx, x, y, w, h, scale, simMode); break;
      case 'socket':        this._drawSocket(ctx, x, y, w, h, scale, simMode); break;
      case 'busbar':        this._drawBusbar(ctx, x, y, w, h, scale); break;
    }

    // Terminaux
    this._drawTerminals(ctx, scale);

    // Label
    this._drawLabel(ctx, x, y, w, h, scale);

    // Bordure de sélection
    if (this.selected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([4 / scale, 3 / scale]);
      ctx.strokeRect(x - 3 / scale, y - 3 / scale, w + 6 / scale, h + 6 / scale);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  _drawBody(ctx, x, y, w, h, energized) {
    const def = this.def;
    ctx.fillStyle = energized ? this._lighten(def.color, 30) : def.color;
    ctx.strokeStyle = def.borderColor;
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.stroke();
  }

  _lighten(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _drawBreaker(ctx, x, y, w, h, scale) {
    const cx = x + w / 2;
    const closed = this.state === 'closed';
    const tripped = this.state === 'tripped';

    // Barre centrale (contact)
    ctx.fillStyle = tripped ? '#ef4444' : (closed ? '#22c55e' : '#6b7280');
    ctx.fillRect(cx - 3, y + h * 0.2, 6, h * 0.6);

    // Levier
    ctx.fillStyle = closed ? '#4ade80' : '#9ca3af';
    ctx.fillRect(cx - 4, y + h * 0.35, 8, h * 0.25);

    // Indicateur état
    ctx.fillStyle = tripped ? '#ef4444' : (closed ? '#22c55e' : '#94a3b8');
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Ampérage
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `bold ${Math.max(7, 8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(this.def.amperage + 'A', cx, y + h * 0.88);
  }

  _drawDifferential(ctx, x, y, w, h, scale) {
    const cx = x + w / 2;
    const closed = this.state === 'closed';
    const tripped = this.state === 'tripped';

    // Deux pôles
    for (let i = 0; i < 2; i++) {
      const px = x + w * (i === 0 ? 0.3 : 0.7);
      ctx.fillStyle = tripped ? '#ef4444' : (closed ? '#22c55e' : '#6b7280');
      ctx.fillRect(px - 2.5, y + h * 0.2, 5, h * 0.55);
    }

    // Bouton test
    ctx.fillStyle = '#fbbf24';
    this._roundRect(ctx, x + w * 0.35, y + h * 0.6, w * 0.3, h * 0.12, 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = `${Math.max(5, 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TEST', cx, y + h * 0.695);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.max(6, 7)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('30mA', cx, y + h * 0.88);
    ctx.fillText(this.def.amperage + 'A', cx, y + h * 0.95);
  }

  _drawRelay(ctx, x, y, w, h, scale) {
    const cx = x + w / 2;
    const closed = this.state === 'closed';

    // Zone bobine (haut)
    ctx.strokeStyle = '#7a5538';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h * 0.35);
    ctx.fillStyle = '#241a10';
    ctx.fillRect(x + 4, y + 4, w - 8, h * 0.35);
    ctx.fillStyle = '#a0845c';
    ctx.font = `${Math.max(6, 7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Bobine', cx, y + h * 0.22);

    // Flèche bobine→contact
    ctx.strokeStyle = closed ? '#f59e0b' : '#4b5563';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.4);
    ctx.lineTo(cx, y + h * 0.55);
    ctx.stroke();
    ctx.setLineDash([]);

    // Contact
    ctx.fillStyle = closed ? '#22c55e' : '#4b5563';
    ctx.fillRect(cx - 4, y + h * 0.55, 8, h * 0.3);
    ctx.fillStyle = closed ? '#bbf7d0' : '#9ca3af';
    ctx.font = `bold ${Math.max(7, 8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(closed ? '●' : '○', cx, y + h * 0.76);
  }

  _drawButton(ctx, x, y, w, h, scale) {
    const cx = x + w / 2, cy = y + h / 2;
    const pressed = this.state === 'pressed';

    // Corps
    ctx.fillStyle = pressed ? '#3b82f6' : '#374151';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pressed ? '#60a5fa' : '#6b7280';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Point central
    ctx.fillStyle = pressed ? '#bfdbfe' : '#9ca3af';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawLamp(ctx, x, y, w, h, scale, simMode) {
    const cx = x + w / 2, cy = y + h / 2;
    const on = simMode && this.state === 'on';
    const r = Math.min(w, h) * 0.35;

    if (on) {
      // Halo lumineux
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
      grad.addColorStop(0, 'rgba(255, 230, 100, 0.4)');
      grad.addColorStop(1, 'rgba(255, 200, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cercle ampoule
    ctx.fillStyle = on ? '#fef3c7' : '#374151';
    ctx.strokeStyle = on ? '#fbbf24' : '#6b7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Croix intérieure (symbole lampe)
    ctx.strokeStyle = on ? '#d97706' : '#4b5563';
    ctx.lineWidth = 1.5;
    const c = r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - c, cy - c); ctx.lineTo(cx + c, cy + c);
    ctx.moveTo(cx + c, cy - c); ctx.lineTo(cx - c, cy + c);
    ctx.stroke();
  }

  _drawSocket(ctx, x, y, w, h, scale, simMode) {
    const cx = x + w / 2, cy = y + h / 2;
    const active = simMode && this.state === 'active';

    // Corps prise
    ctx.fillStyle = active ? '#1e3a5f' : '#1e293b';
    ctx.strokeStyle = active ? '#3b82f6' : '#475569';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    ctx.stroke();

    // Alvéoles
    ctx.fillStyle = active ? '#1e40af' : '#374151';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 4, 3, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Broche centrale (terre)
    ctx.fillStyle = active ? '#22c55e' : '#4b5563';
    ctx.fillRect(cx - 1.5, cy + 2, 3, 7);
  }

  _drawBusbar(ctx, x, y, w, h, scale) {
    const isNeutre = this.def.busbarType === 'neutre';
    const color = isNeutre ? WIRE_COLORS.neutre : WIRE_COLORS.terre;

    ctx.fillStyle = color + '30';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, h, 2);
    ctx.fill();
    ctx.stroke();

    // Taquets de connexion
    const terms = this.def.terminals.filter(t => !t.isSource);
    ctx.fillStyle = color;
    for (const t of terms) {
      const tx = x + t.rx * w;
      const ty = y + t.ry * h;
      ctx.fillRect(tx - 2, ty - 4, 4, 4);
    }

    // Label
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(7, 8)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(isNeutre ? ' N' : 'PE', x + 4, y + h / 2 + 3);
  }

  _drawTerminals(ctx, scale) {
    const r = 4;
    for (const t of this.getTerminals()) {
      const connected = t._connected; // injecté par Editor
      ctx.fillStyle = connected ? '#22c55e' : '#f59e0b';
      ctx.strokeStyle = connected ? '#166534' : '#92400e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (t.label) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `${Math.max(5, 6)}px sans-serif`;
        ctx.textAlign = 'center';
        const offset = t.side === 'top' ? -6 : (t.side === 'bottom' ? 8 : 0);
        ctx.fillText(t.label, t.x, t.y + offset);
      }
    }
  }

  _drawLabel(ctx, x, y, w, h, scale) {
    const label = this.customLabel || '';
    if (!label) return;
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.max(8, 9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y - 6);
  }

  /* ---- Miniature pour la palette ---- */
  static drawPreview(canvas, typeId) {
    const def = COMPONENT_TYPES[typeId];
    if (!def) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const scale = Math.min(cw / def.w, ch / def.h) * 0.85;
    const ox = (cw - def.w * scale) / 2;
    const oy = (ch - def.h * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    const dummy = new Component(typeId, 0, 0);
    dummy.draw(ctx, scale, false);
    ctx.restore();
  }
}
