/* Obstáculos estáticos (blocos, vegetação, buracos, blocos suspensos) e gerador de padrões */
window.BR = window.BR || {};

BR.OBSTACLE_TYPES = {
  crate:     { w: 40, h: 40, draw(R, x, y, w, h) { R(x, y, w, h, '#8a5a2b'); R(x + 3, y + 3, w - 6, h - 6, '#b07a3c'); R(x + 3, y + h / 2 - 2, w - 6, 4, '#8a5a2b'); R(x + w / 2 - 2, y + 3, 4, h - 6, '#8a5a2b'); } },
  stone:     { w: 40, h: 40, tall: [40, 80], draw(R, x, y, w, h) { R(x, y, w, h, '#6e6e74'); for (let i = 0; i < h; i += 20) for (let j = 0; j < w; j += 20) R(x + j + 2, y + i + 2, 16, 16, ((i + j) / 20) % 2 ? '#8c8c93' : '#7c7c83'); } },
  bush:      { w: 44, h: 32, draw(R, x, y, w, h, pal) { R(x, y + 8, w, h - 8, BR.Biomes.rgb(pal.leaf)); R(x + 6, y, w - 12, 12, BR.Biomes.rgb(pal.leaf, -14)); R(x + 10, y + 14, 4, 4, '#c44'); } },
  log:       { w: 84, h: 32, draw(R, x, y, w, h, pal) { R(x, y, w, h, BR.Biomes.rgb(pal.trunk)); R(x, y + 8, w, 4, BR.Biomes.rgb(pal.trunk, 18)); R(x, y, 10, h, '#d9b57c'); R(x + 3, y + 8, 4, 16, '#b08a50'); } },
  stump:     { w: 40, h: 40, draw(R, x, y, w, h, pal) { R(x + 2, y + 6, w - 4, h - 6, BR.Biomes.rgb(pal.trunk)); R(x, y, w, 8, '#d9b57c'); R(x + 10, y + 2, w - 20, 4, '#b08a50'); } },
  cactus:    { w: 28, h: 58, draw(R, x, y, w, h) { R(x + 8, y, 12, h, '#2f8a3a'); R(x + 8, y, 4, h, '#46a84e'); R(x, y + 16, 10, 6, '#2f8a3a'); R(x, y + 8, 6, 14, '#2f8a3a'); R(x + 18, y + 26, 10, 6, '#2f8a3a'); R(x + 22, y + 18, 6, 14, '#2f8a3a'); R(x + 11, y - 3, 6, 3, '#e8467c'); } },
  sandstone: { w: 40, h: 40, tall: [40, 80], draw(R, x, y, w, h) { R(x, y, w, h, '#c9a860'); for (let i = 0; i < h; i += 20) R(x, y + i, w, 3, '#e6cd8a'); R(x, y + h - 4, w, 4, '#a58a48'); } },
  rock:      { w: 48, h: 36, draw(R, x, y, w, h) { R(x, y + 10, w, h - 10, '#7a7a80'); R(x + 8, y, w - 16, 14, '#8e8e95'); R(x + 14, y + 16, 6, 6, '#666'); } },
  ice:       { w: 40, h: 40, draw(R, x, y, w, h) { R(x, y, w, h, '#9fdcf5'); R(x + 3, y + 3, w - 6, h - 6, '#c9f0ff'); R(x + 6, y + 6, 10, 4, '#fff'); } },
  hang:      { w: 80, h: 40, draw(R, x, y, w, h) { R(x, y, w, h, '#4a3a5a'); R(x + 3, y + 3, w - 6, h - 6, '#6a5a7a'); for (let i = 0; i < w; i += 20) R(x + i + 8, y + h, 4, 6, '#8a7a9a'); } }
};

BR.Obstacles = {
  create(kind, x, opts) {
    opts = opts || {};
    const G = BR.Physics.GROUND_Y;
    if (kind === 'pit') return { type: 'obstacle', kind: 'pit', x, y: G, w: opts.w, h: 80 };
    if (kind === 'hang') { const t = BR.OBSTACLE_TYPES.hang, w = opts.w || t.w; return { type: 'obstacle', kind: 'hang', name: 'hang', x, y: G - 46 - t.h, w, h: t.h }; }
    const t = BR.OBSTACLE_TYPES[kind]; let h = t.h;
    if (t.tall && opts.tall) h = t.tall[1];
    return { type: 'obstacle', kind: 'block', name: kind, x, y: G - h, w: t.w, h };
  },
  hitbox(o) {
    if (o.kind === 'pit') return { x: o.x + 14, y: o.y, w: o.w - 28, h: 80 };      // margem de tolerância nas bordas
    return BR.Physics.shrink(o, 4);
  },
  draw(ctx, o, pal, biome) {
    const R = BR.Draw.r.bind(BR.Draw, ctx);
    if (o.kind === 'pit') {
      const x = Math.round(o.x), G = o.y;
      ctx.fillStyle = biome.water ? BR.Biomes.rgb(biome.water) : '#05060c';
      ctx.fillRect(x, G, o.w, 120);
      if (biome.water) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, G + 2, o.w, 3); }
      return;
    }
    BR.OBSTACLE_TYPES[o.name].draw(R, Math.round(o.x), Math.round(o.y), o.w, o.h, pal);
  }
};

/* ---------- Gerador de padrões (distância percorrida → novos objetos) ---------- */
BR.Spawner = class {
  constructor() { this.reset(); }
  reset() { this.dist = 700; this.lastKind = ''; }

  /** speed em px/s; out: { obstacles, creatures, ores } */
  update(dt, speed, level, dn, biome, out) {
    this.dist -= speed * dt;
    if (this.dist > 0) return;
    const G = BR.Physics.GROUND_Y, X = BR.Physics.W + 90;
    const maxCluster = Math.min(220, speed * 0.36);
    const r = Math.random();
    let width = 60, extraGap = 0, topH = 0, spawnedAny = true;
    const pick = list => list[(Math.random() * list.length) | 0];

    // chance de padrões mais complexos cresce com o nível (0..1)
    const pCreature = 0.2 + level * 0.15, pHang = 0.1 + level * 0.1, pPit = 0.08 + level * 0.1, pDouble = 0.12 + level * 0.2;
    let kind;
    if (r < pCreature) kind = 'creature'; else if (r < pCreature + pHang) kind = 'hang'; else if (r < pCreature + pHang + pPit) kind = 'pit';
    else if (r < pCreature + pHang + pPit + pDouble) kind = 'double'; else kind = 'single';
    if (kind === this.lastKind && (kind === 'pit' || kind === 'hang')) kind = 'single';   // evita repetições cansativas
    if (kind === 'pit' && this.recentPit) kind = 'single';

    if (kind === 'creature') {
      const id = BR.Creatures.pick(dn, biome);
      if (id) {
        const c = BR.Creatures.create(id, X + 30); out.creatures.push(c);
        width = c.w; extraGap = c.cfg.speed * 0.9; topH = c.h;
      } else kind = 'single';            // transição dia/noite: nenhum animal nem criatura
    }
    if (kind === 'single' || kind === 'double') {
      const names = biome.obst, n1 = pick(names), tp = BR.OBSTACLE_TYPES[n1];
      const o1 = BR.Obstacles.create(n1, X, { tall: level > 0.25 && Math.random() < 0.3 });
      out.obstacles.push(o1); width = o1.w; topH = o1.h;
      if (kind === 'double') {
        const n2 = pick(names), o2 = BR.Obstacles.create(n2, X + o1.w + (Math.random() < 0.5 ? 0 : 20), { tall: false });
        if (o1.w + o2.w + 20 <= maxCluster) { out.obstacles.push(o2); width = o2.x - X + o2.w; topH = Math.max(o1.h, o2.h); }
      }
    } else if (kind === 'hang') {
      const o = BR.Obstacles.create('hang', X, { w: 60 + ((Math.random() * 3) | 0) * 20 });
      out.obstacles.push(o); width = o.w; topH = 0;
      // minério no chão sob o bloco: recompensa deslizar
      for (let i = 0; i < 3; i++) out.ores.push({ type: BR.Minerals.pick(), x: X + 10 + i * (o.w / 3), y: G - 24, got: false, t: Math.random() * 6 });
    } else if (kind === 'pit') {
      const w = Math.round(BR.Physics.clamp(speed * 0.3, 110, 230) + Math.random() * 20);
      const o = BR.Obstacles.create('pit', X, { w }); out.obstacles.push(o); width = w; topH = 0;
      for (let i = 0; i < 4; i++) out.ores.push({ type: BR.Minerals.pick(), x: X + w * (0.15 + 0.23 * i), y: G - 70 - Math.sin(Math.PI * i / 3) * 40, got: false, t: Math.random() * 6 });
    }
    this.recentPit = kind === 'pit'; this.lastKind = kind;

    // minérios em arco por cima do obstáculo (recompensa o pulo)
    if (kind === 'single' || kind === 'double' || kind === 'creature') {
      if (Math.random() < 0.55) {
        const n = 3 + ((Math.random() * 3) | 0), base = Math.min(G - 120, G - topH - 44), cx = X + width / 2;
        for (let i = 0; i < n; i++) out.ores.push({ type: BR.Minerals.pick(), x: cx + (i - (n - 1) / 2) * 38, y: base - Math.sin(Math.PI * (i + .5) / n) * 26, got: false, t: Math.random() * 6 });
      }
    }

    // espaço até o próximo padrão: sempre permite pular/aterrissar com folga
    const gap = speed * (0.78 + Math.random() * 0.75 - level * 0.18) + 50 + extraGap;
    // às vezes uma fileira de minérios no meio do espaço livre
    if (Math.random() < 0.4) {
      const n = 3 + ((Math.random() * 4) | 0), sx = X + width + gap * 0.25;
      for (let i = 0; i < n; i++) out.ores.push({ type: BR.Minerals.pick(), x: sx + i * 36, y: G - 26, got: false, t: Math.random() * 6 });
    }
    this.dist = width + gap;
  }
};
