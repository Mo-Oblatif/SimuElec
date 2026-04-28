/**
 * Wire.js — Connexion entre deux terminaux
 */

'use strict';

class Wire {
  constructor(fromCompId, fromTermId, toCompId, toTermId, wireType = 'phase') {
    this.id = generateId('wire');
    this.fromCompId = fromCompId;
    this.fromTermId = fromTermId;
    this.toCompId = toCompId;
    this.toTermId = toTermId;
    this.wireType = wireType; // 'phase' | 'neutre' | 'terre' | 'signal'
    this.energized = false;   // résultat simulation
    this.selected = false;
  }

  get color() { return WIRE_COLORS[this.wireType] || '#888'; }
  get glowColor() { return WIRE_COLORS_GLOW[this.wireType] || '#aaa'; }

  toJSON() {
    return {
      id: this.id,
      fromCompId: this.fromCompId,
      fromTermId: this.fromTermId,
      toCompId: this.toCompId,
      toTermId: this.toTermId,
      wireType: this.wireType,
    };
  }

  static fromJSON(data) {
    const w = new Wire(data.fromCompId, data.fromTermId, data.toCompId, data.toTermId, data.wireType);
    w.id = data.id;
    return w;
  }

  /* ---- Dessin d'un fil entre deux points ---- */
  draw(ctx, p1, p2, simMode = false) {
    if (!p1 || !p2) return;
    ctx.save();

    const color = this.color;
    const energized = simMode && this.energized;

    // Halo si énergisé
    if (energized) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;
    }

    // Fil sélectionné
    if (this.selected) {
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 5;
      ctx.setLineDash([]);
      this._drawPath(ctx, p1, p2);
      ctx.stroke();
    }

    // Fil principal
    ctx.strokeStyle = energized ? this.glowColor : color;
    ctx.lineWidth = this.selected ? 3 : 2;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    this._drawPath(ctx, p1, p2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawPath(ctx, p1, p2) {
    // Courbe de Bézier cubique — tangentes verticales/horizontales selon distance
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bend = Math.min(dist * 0.5, 60);

    // Tangentes basées sur le côté de connexion
    const cp1x = p1.x;
    const cp1y = p1.y + (dy > 0 ? bend : -bend);
    const cp2x = p2.x;
    const cp2y = p2.y + (dy < 0 ? bend : -bend);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  /* ---- Fil en cours de tracé (mouse to terminal) ---- */
  static drawInProgress(ctx, p1, p2, wireType) {
    const color = WIRE_COLORS[wireType] || '#888';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.75;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const bend = Math.min(Math.abs(dy) * 0.5, 50);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(p1.x, p1.y + bend, p2.x, p2.y - bend, p2.x, p2.y);
    ctx.stroke();

    // Petit cercle à la pointe
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ---- Hit-test pour sélectionner un fil au clic ---- */
  hitTest(mx, my, p1, p2, threshold = 8) {
    if (!p1 || !p2) return false;
    // Approximation linéaire sur N segments de la courbe
    const steps = 20;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const bend = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.5, 60);
    const cp1x = p1.x, cp1y = p1.y + (dy > 0 ? bend : -bend);
    const cp2x = p2.x, cp2y = p2.y + (dy < 0 ? bend : -bend);

    let prevX = p1.x, prevY = p1.y;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const bx = mt ** 3 * p1.x + 3 * mt ** 2 * t * cp1x + 3 * mt * t ** 2 * cp2x + t ** 3 * p2.x;
      const by = mt ** 3 * p1.y + 3 * mt ** 2 * t * cp1y + 3 * mt * t ** 2 * cp2y + t ** 3 * p2.y;

      // Distance point → segment
      const segDx = bx - prevX, segDy = by - prevY;
      const segLen2 = segDx * segDx + segDy * segDy;
      if (segLen2 > 0) {
        const tt = Math.max(0, Math.min(1, ((mx - prevX) * segDx + (my - prevY) * segDy) / segLen2));
        const nx = prevX + tt * segDx, ny = prevY + tt * segDy;
        const dist = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2);
        if (dist < threshold) return true;
      }
      prevX = bx; prevY = by;
    }
    return false;
  }
}
