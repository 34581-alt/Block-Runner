/* Ciclo contínuo de dia e noite.
   phase 0..1:  0 = meio-dia, 0.5 = meia-noite. 'night' (0..1) é suavizado, nunca muda de forma instantânea. */
window.BR = window.BR || {};

BR.DayNight = class {
  constructor() {
    this.cycle = 120;        // segundos para um ciclo completo
    this.t = 0;              // começa de dia
    this.night = 0;
    this.isNight = false;    // com histerese, usado para decidir o que pode surgir
  }
  update(dt) {
    this.t = (this.t + dt) % this.cycle;
    const phase = this.t / this.cycle;
    // 0 durante o dia, 1 durante a noite, transições longas e suaves
    const raw = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);   // 0..1
    this.night = BR.Physics.clamp((raw - 0.25) / 0.5, 0, 1);  // platôs de dia/noite + rampas
    this.night = this.night * this.night * (3 - 2 * this.night);
    if (this.night > 0.7) this.isNight = true; else if (this.night < 0.3) this.isNight = false;
    this.phase = phase;
  }
  /** Spawn seguro: só permite uma categoria por vez (nunca nos dois no meio da transição). */
  get allowPassive() { return this.night < 0.25; }
  get allowHostile() { return this.night > 0.6; }

  skyColors(biomeSky) {
    // biomeSky: { top:[r,g,b], bottom:[r,g,b] }
    const nightTop = [8, 12, 40], nightBot = [24, 30, 70];
    const m = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
    return { top: m(biomeSky.top, nightTop, this.night), bottom: m(biomeSky.bottom, nightBot, this.night) };
  }

  /** Desenha astros (sol/lua) e estrelas. */
  drawSky(ctx, W, H, biomeSky, tick) {
    const c = this.skyColors(biomeSky);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c.top); g.addColorStop(1, c.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // estrelas
    if (this.night > 0.05) {
      ctx.globalAlpha = this.night;
      for (let i = 0; i < 40; i++) {
        const sx = (i * 197) % W, sy = (i * 83) % 200, tw = (Math.sin(tick * 2 + i) + 1) * 0.5;
        ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 2, 2); if (tw > 0.8) ctx.fillRect(sx - 1, sy, 4, 2);
      }
      ctx.globalAlpha = 1;
    }
    // sol e lua percorrem um arco
    const ang = this.phase * Math.PI * 2;
    const sunX = W * 0.5 + Math.sin(ang) * W * 0.42, sunY = 230 - Math.cos(ang) * 190;
    const moonX = W * 0.5 - Math.sin(ang) * W * 0.42, moonY = 230 + Math.cos(ang) * 190;
    if (sunY < 260) { ctx.fillStyle = '#fff3a0'; ctx.fillRect(sunX - 24, sunY - 24, 48, 48); ctx.fillStyle = '#ffe14d'; ctx.fillRect(sunX - 16, sunY - 16, 32, 32); }
    if (moonY < 260) { ctx.fillStyle = '#e9efff'; ctx.fillRect(moonX - 20, moonY - 20, 40, 40); ctx.fillStyle = '#c4cde8'; ctx.fillRect(moonX - 8, moonY - 10, 10, 10); ctx.fillRect(moonX + 6, moonY + 4, 8, 8); }
  }
  /** Escurece a cena (aplicado por cima do cenário e personagens). */
  drawDarkness(ctx, W, H) {
    if (this.night <= 0.01) return;
    ctx.fillStyle = 'rgba(8,12,40,' + (this.night * 0.42).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
};
