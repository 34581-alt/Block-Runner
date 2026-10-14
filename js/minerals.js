/* Minérios coletáveis — valores e frequências configuráveis */
window.BR = window.BR || {};

BR.MINERALS = {
  iron:      { name: 'Ferro',     points: 1,  weight: 50, color: '#d8d8dc', edge: '#8a8a90' },
  gold:      { name: 'Ouro',      points: 3,  weight: 28, color: '#ffd23f', edge: '#b88a10' },
  emerald:   { name: 'Esmeralda', points: 5,  weight: 13, color: '#2ed46a', edge: '#127a35' },
  diamond:   { name: 'Diamante',  points: 10, weight: 6,  color: '#4de8ff', edge: '#168aa0' },
  netherite: { name: 'Netherite', points: 25, weight: 1.5, color: '#5a4a68', edge: '#2a2030' }   // ≈1,5% dos minérios: rara, porém alcançável
};

BR.Minerals = {
  SIZE: 28,
  pick() {
    const keys = BR.ORES, total = keys.reduce((a, k) => a + BR.MINERALS[k].weight, 0);
    let r = Math.random() * total;
    for (const k of keys) { r -= BR.MINERALS[k].weight; if (r <= 0) return k; }
    return 'iron';
  },
  /** Ícone (usado no jogo e na HUD). Se existir assets/objects/<tipo>.png, ele é usado. */
  draw(ctx, type, cx, cy, size, t) {
    const m = BR.MINERALS[type], s = size || this.SIZE, R = BR.Draw.r.bind(BR.Draw, ctx);
    const img = BR.Assets.get('assets/objects/' + type + '.png');
    if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s); return; }
    const x = cx - s / 2, y = cy - s / 2;
    if (type === 'iron' || type === 'gold' || type === 'netherite') {      // lingote
      R(x, y + s * 0.25, s, s * 0.5, m.edge); R(x + 2, y + s * 0.25 + 2, s - 4, s * 0.5 - 4, m.color); R(x + 4, y + s * 0.3, s * 0.4, 3, 'rgba(255,255,255,.55)');
      if (type === 'netherite') R(x + s * 0.55, y + s * 0.45, 4, 4, '#b08aff');
    } else {                                                                 // gema em losango de blocos
      const u = s / 5;
      R(cx - u * 0.5, y, u, u, m.edge); R(cx - u * 1.5, y + u, u * 3, u, m.color); R(cx - u * 2.5, y + u * 2, u * 5, u, m.color);
      R(cx - u * 1.5, y + u * 3, u * 3, u, m.color); R(cx - u * 0.5, y + u * 4, u, u, m.edge);
      R(cx - u * 1.5, y + u, u, u, 'rgba(255,255,255,.7)'); R(cx - u * 2.5, y + u * 2, u * 5, 2, m.edge);
    }
  },
  /** Cor/ícone CSS da HUD */
  css(type) { return BR.MINERALS[type].color; }
};
