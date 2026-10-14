/* Seis biomas, paletas, cenário modular (peças desenhadas por código) e transições graduais */
window.BR = window.BR || {};

BR.BIOMES = [
  { id: 'plains', name: 'Planícies',
    pal: { skyTop: [96, 170, 240], skyBot: [190, 225, 250], hill: [96, 160, 90], grass: [92, 168, 58], dirt: [134, 92, 58], dirt2: [112, 76, 46], leaf: [58, 128, 40], trunk: [100, 70, 40] },
    decor: { tree: 3, bush: 3, flower: 4, tuft: 3, rock: 1 }, obst: ['crate', 'bush', 'stone'], animals: ['cow', 'sheep', 'pig', 'chicken'] },
  { id: 'forest', name: 'Floresta',
    pal: { skyTop: [80, 140, 200], skyBot: [160, 205, 215], hill: [48, 112, 62], grass: [60, 140, 48], dirt: [118, 80, 50], dirt2: [98, 66, 40], leaf: [34, 100, 38], trunk: [84, 58, 34] },
    decor: { tree: 7, bush: 3, mushroom: 3, tuft: 2, log: 1 }, obst: ['log', 'bush', 'stump'], animals: ['pig', 'rabbit', 'fox', 'wolf'] },
  { id: 'desert', name: 'Deserto',
    pal: { skyTop: [120, 190, 235], skyBot: [250, 232, 190], hill: [226, 200, 130], grass: [226, 200, 122], dirt: [214, 186, 114], dirt2: [196, 166, 96], leaf: [60, 140, 60], trunk: [60, 140, 60] },
    decor: { cactus: 5, dune: 3, rock: 3, deadbush: 2 }, obst: ['cactus', 'sandstone', 'rock'], animals: ['rabbit', 'fox'] },
  { id: 'taiga', name: 'Taiga nevada',
    pal: { skyTop: [140, 175, 215], skyBot: [225, 238, 248], hill: [170, 200, 215], grass: [238, 244, 250], dirt: [140, 112, 84], dirt2: [118, 94, 70], leaf: [30, 90, 70], trunk: [80, 58, 40] },
    decor: { pine: 7, snowpile: 3, rock: 2, log: 2 }, obst: ['log', 'ice', 'stone'], animals: ['wolf', 'bear', 'fox', 'rabbit'] },
  { id: 'jungle', name: 'Selva',
    pal: { skyTop: [70, 160, 190], skyBot: [150, 220, 200], hill: [30, 110, 60], grass: [46, 150, 44], dirt: [110, 78, 46], dirt2: [90, 62, 38], leaf: [24, 120, 40], trunk: [92, 66, 36] },
    decor: { bigtree: 5, bamboo: 4, fern: 4, flower: 2, vine: 2 }, obst: ['log', 'bush', 'stone'], animals: ['pig', 'chicken', 'fox'] },
  { id: 'swamp', name: 'Pântano',
    pal: { skyTop: [70, 100, 110], skyBot: [130, 150, 140], hill: [52, 80, 60], grass: [70, 98, 56], dirt: [86, 70, 48], dirt2: [68, 56, 38], leaf: [50, 84, 52], trunk: [66, 52, 38] },
    decor: { deadtree: 5, vine: 3, lily: 4, reed: 4, mushroom: 1 }, obst: ['stump', 'bush', 'stone'], animals: ['pig', 'wolf', 'chicken'], water: [58, 110, 120] }
];

BR.Biomes = {
  LEN: 450 * 40,       // comprimento de cada bioma (px) ≈ 450 m
  FADE: 70 * 40,       // zona de transição gradual (px) antes de entrar no próximo
  startIndex: 0,

  index(distPx) { return (Math.floor(distPx / this.LEN) + this.startIndex) % BR.BIOMES.length; },

  /** Paleta misturada + bioma dominante para o ponto da corrida. */
  at(distPx) {
    const i = this.index(distPx), cur = BR.BIOMES[i], nxt = BR.BIOMES[(i + 1) % BR.BIOMES.length];
    const into = distPx % this.LEN;
    let t = 0;
    if (into > this.LEN - this.FADE) t = (into - (this.LEN - this.FADE)) / this.FADE;
    t = t * t * (3 - 2 * t);
    const pal = {};
    Object.keys(cur.pal).forEach(k => { pal[k] = cur.pal[k].map((v, j) => Math.round(v + (nxt.pal[k][j] - v) * t)); });
    return { pal, cur, next: nxt, t, dominant: t > 0.5 ? nxt : cur };
  },
  rgb(c, dark) { const d = dark || 0; return 'rgb(' + Math.max(0, c[0] - d) + ',' + Math.max(0, c[1] - d) + ',' + Math.max(0, c[2] - d) + ')'; }
};

/* ---------- Cenário modular ---------- */
BR.Scenery = class {
  constructor() { this.items = []; this.nextX = 300; this.hills = []; }
  reset() { this.items.length = 0; this.nextX = 300; }

  /** Gera decoração à frente da câmera conforme o bioma dominante. */
  update(worldX, viewW, info) {
    const horizon = worldX + viewW + 200;
    while (this.nextX < horizon) {
      const b = BR.Biomes.at(this.nextX).dominant;     // bioma onde o item será colocado
      const types = Object.keys(b.decor), weights = types.map(t => b.decor[t]);
      let r = Math.random() * weights.reduce((a, c) => a + c, 0), k = 0;
      while ((r -= weights[k]) > 0) k++;
      this.items.push({ type: types[k], x: this.nextX, v: Math.random(), layer: Math.random() < 0.35 ? 0 : 1 });
      this.nextX += 60 + Math.random() * (b.id === 'forest' || b.id === 'jungle' ? 90 : 190);
    }
    // limpeza: itens que saíram pela esquerda
    while (this.items.length && this.items[0].x < worldX - 250) this.items.shift();
  }

  drawHills(ctx, W, groundY, worldX, pal, night) {
    const col = BR.Biomes.rgb(pal.hill);
    ctx.fillStyle = col;
    const off = worldX * 0.25, step = 20;
    for (let sx = -step; sx < W + step; sx += step) {
      const wx = Math.floor((sx + off) / step) * step;
      const h = 50 + Math.sin(wx * 0.004) * 36 + Math.sin(wx * 0.011 + 2) * 18;
      ctx.fillRect(sx - ((off) % step), groundY - h, step + 1, h);
    }
    // segunda camada, mais escura e mais lenta
    ctx.fillStyle = BR.Biomes.rgb(pal.hill, 22);
    const off2 = worldX * 0.12;
    for (let sx = -step; sx < W + step; sx += step) {
      const wx = Math.floor((sx + off2) / step) * step;
      const h = 90 + Math.sin(wx * 0.0025 + 1) * 40 + Math.sin(wx * 0.009) * 14;
      ctx.fillRect(sx - ((off2) % step), groundY - h - 20, step + 1, h);
    }
  }

  draw(ctx, worldX, groundY, pal, tick) {
    const R = BR.Draw.r.bind(BR.Draw, ctx), leaf = BR.Biomes.rgb(pal.leaf), leaf2 = BR.Biomes.rgb(pal.leaf, 18), trunk = BR.Biomes.rgb(pal.trunk);
    for (const it of this.items) {
      const x = Math.round(it.x - worldX), y = groundY, v = it.v;
      if (x < -120 || x > 1100) continue;
      const dim = it.layer === 0 ? 14 : 0;   // camada de fundo mais escura
      switch (it.type) {
        case 'tree': { const h = 60 + (v * 3 | 0) * 16; R(x - 6, y - h, 12, h, trunk); R(x - 28, y - h - 30, 56, 34, BR.Biomes.rgb(pal.leaf, dim)); R(x - 18, y - h - 52, 36, 24, BR.Biomes.rgb(pal.leaf, dim + 12)); break; }
        case 'bigtree': { const h = 130 + v * 40; R(x - 8, y - h, 16, h, trunk); R(x - 40, y - h - 36, 80, 40, BR.Biomes.rgb(pal.leaf, dim)); R(x - 26, y - h - 62, 52, 28, BR.Biomes.rgb(pal.leaf, dim + 14)); R(x - 3, y - h + 20, 4, 60, '#2c8a3a'); break; }
        case 'pine': { const h = 70 + v * 50; R(x - 4, y - h * 0.5, 8, h * 0.5, trunk); for (let i = 0; i < 4; i++) { const w = 54 - i * 12; R(x - w / 2, y - h * 0.4 - i * 22, w, 18, BR.Biomes.rgb(pal.leaf, dim)); R(x - w / 2, y - h * 0.4 - i * 22 - 5, w, 6, '#f2f6fa'); } break; }
        case 'deadtree': { const h = 70 + v * 40; R(x - 5, y - h, 10, h, trunk); R(x - 22, y - h * 0.7, 20, 6, trunk); R(x + 4, y - h * 0.5, 22, 6, trunk); R(x - 22, y - h * 0.7 - 12, 6, 14, trunk); R(x + 20, y - h * 0.5 - 12, 6, 14, trunk); if (v > 0.4) R(x + 5, y - h * 0.9, 3, 40, leaf); break; }
        case 'cactus': { const h = 44 + v * 30; R(x - 5, y - h, 10, h, '#2f8a3a'); R(x - 5, y - h, 3, h, '#46a84e'); R(x - 15, y - h * 0.6, 10, 5, '#2f8a3a'); R(x - 15, y - h * 0.6 - 14, 5, 16, '#2f8a3a'); R(x + 5, y - h * 0.4, 10, 5, '#2f8a3a'); R(x + 10, y - h * 0.4 - 12, 5, 14, '#2f8a3a'); break; }
        case 'dune': { const w = 90 + v * 70; R(x - w / 2, y - 18, w, 18, BR.Biomes.rgb(pal.grass, 10)); R(x - w / 3, y - 32, w * 0.66, 14, BR.Biomes.rgb(pal.grass, 8)); R(x - w / 6, y - 42, w / 3, 10, BR.Biomes.rgb(pal.grass, 5)); break; }
        case 'bamboo': { const h = 100 + v * 70; for (let i = 0; i < 3; i++) { const bx = x + i * 9 - 9, bh = h - i * 15; R(bx, y - bh, 6, bh, '#7bbf3a'); for (let k = 0; k < bh; k += 22) R(bx - 1, y - k - 2, 8, 3, '#4f8a22'); } break; }
        case 'vine': { const h = 60 + v * 60; R(x, y - h - 120, 3, h + 120 - 0, leaf2); R(x - 3, y - h - 40, 3, 8, leaf); break; }
        case 'flower': { R(x, y - 12, 2, 12, '#3a8a2a'); R(x - 3, y - 18, 8, 6, v > 0.5 ? '#e84a4a' : '#ffd23f'); R(x - 1, y - 16, 4, 3, '#fff'); break; }
        case 'tuft': R(x - 5, y - 8, 3, 8, leaf); R(x, y - 12, 3, 12, leaf2); R(x + 5, y - 7, 3, 7, leaf); break;
        case 'fern': R(x - 12, y - 10, 24, 6, leaf); R(x - 8, y - 18, 16, 8, leaf2); R(x - 3, y - 26, 6, 8, leaf); break;
        case 'bush': R(x - 18, y - 22, 36, 22, BR.Biomes.rgb(pal.leaf, dim)); R(x - 10, y - 30, 20, 10, leaf2); break;
        case 'mushroom': R(x - 2, y - 10, 5, 10, '#e8e0d0'); R(x - 8, y - 18, 16, 8, v > 0.5 ? '#d9473f' : '#b07a4a'); R(x - 4, y - 16, 3, 3, '#fff'); break;
        case 'rock': R(x - 14, y - 14, 28, 14, '#8a8a90'); R(x - 8, y - 22, 16, 9, '#9c9ca3'); break;
        case 'deadbush': R(x - 8, y - 4, 16, 4, '#7a5a30'); R(x - 6, y - 12, 3, 10, '#7a5a30'); R(x + 3, y - 14, 3, 12, '#7a5a30'); break;
        case 'log': R(x - 30, y - 16, 60, 16, trunk); R(x - 30, y - 16, 6, 16, BR.Biomes.rgb(pal.trunk, -40)); break;
        case 'snowpile': R(x - 24, y - 12, 48, 12, '#f4f8fc'); R(x - 14, y - 20, 28, 9, '#fff'); break;
        case 'lily': R(x - 14, y - 4, 28, 4, '#3f8a46'); if (v > 0.6) R(x - 2, y - 9, 5, 5, '#f7a8d0'); break;
        case 'reed': R(x, y - 40 - v * 20, 3, 40 + v * 20, '#6a8a40'); R(x - 4, y - 48 - v * 20, 10, 12, '#6a4a2a'); break;
      }
    }
  }
};
