/* Criaturas-obstáculo (independentes das skins jogáveis).
   speed = velocidade própria para a esquerda (px/s), somada à do cenário. */
window.BR = window.BR || {};

BR.CREATURES = {
  /* ----- passivos (dia) ----- */
  cow:     { kind: 'passive', name: 'Vaca',    w: 64, h: 48, hit: { w: 52, h: 38 }, speed: 0,  weight: 3, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 64, h: 48, t, body: '#5b4636', head: '#4a3828', spot: '#f1ede4', snout: '#d9b8a0', horn: '#ddd' }) },
  sheep:   { kind: 'passive', name: 'Ovelha',  w: 56, h: 44, hit: { w: 46, h: 36 }, speed: 0,  weight: 3, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 56, h: 44, t, body: '#eeeeee', head: '#3d3d3d', leg: '#8a8a8a', snout: '#555' }) },
  pig:     { kind: 'passive', name: 'Porco',   w: 54, h: 38, hit: { w: 44, h: 30 }, speed: 20, weight: 3, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 54, h: 38, t, body: '#f2a1a8', head: '#f2a1a8', snout: '#d9737c' }) },
  chicken: { kind: 'passive', name: 'Galinha', w: 34, h: 36, hit: { w: 26, h: 30 }, speed: 40, weight: 3, draw: (c, x, y, t) => { BR.Draw.quad(c, x, y, { w: 34, h: 34, t, body: '#fafafa', head: '#fafafa', leg: '#e0a030', snout: '#e8a020', tail: '#eee' }); BR.Draw.r(c, x + 1, y - 40, 4, 6, '#d9473f'); } },
  rabbit:  { kind: 'passive', name: 'Coelho',  w: 34, h: 32, hit: { w: 26, h: 26 }, speed: 70, weight: 2, hop: true, draw: (c, x, y, t) => { BR.Draw.quad(c, x, y, { w: 34, h: 28, t, body: '#b8905a', head: '#b8905a', moving: false, tail: '#fff' }); BR.Draw.r(c, x, y - 40, 4, 12, '#b8905a'); BR.Draw.r(c, x + 7, y - 40, 4, 12, '#b8905a'); } },
  fox:     { kind: 'passive', name: 'Raposa',  w: 52, h: 36, hit: { w: 42, h: 28 }, speed: 60, weight: 2, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 52, h: 36, t, body: '#e0732a', head: '#e0732a', leg: '#3a2a20', snout: '#fff', tail: '#fff' }) },
  bear:    { kind: 'passive', name: 'Urso',    w: 72, h: 60, hit: { w: 60, h: 50 }, speed: 0,  weight: 1, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 72, h: 60, t, body: '#f4f4f4', head: '#f4f4f4', leg: '#d8d8d8', snout: '#222' }) },
  wolf:    { kind: 'passive', name: 'Lobo',    w: 52, h: 42, hit: { w: 42, h: 34 }, speed: 50, weight: 2, draw: (c, x, y, t) => BR.Draw.quad(c, x, y, { w: 52, h: 42, t, body: '#a8a8ac', head: '#b8b8bc', leg: '#8a8a90', snout: '#444', tail: '#8a8a90' }) },

  /* ----- hostis (noite) ----- */
  zombie:   { kind: 'hostile', name: 'Zumbi',    w: 40, h: 70, hit: { w: 28, h: 64 }, speed: 70,  weight: 4, humanoid: { skin: '#5f9e4a', hair: '#3f7a32', shirt: '#2fa7c9', pants: '#3a3aa8', shoe: '#333', eye: '#111', eyeBg: '#2a4a22' } },
  skeleton: { kind: 'hostile', name: 'Esqueleto',w: 40, h: 70, hit: { w: 26, h: 64 }, speed: 90,  weight: 3, humanoid: { skin: '#dcdcdc', shirt: '#bdbdbd', pants: '#a8a8a8', shoe: '#8a8a8a', eye: '#222', eyeBg: '#444' } },
  creeper:  { kind: 'hostile', name: 'Creeper',  w: 38, h: 66, hit: { w: 28, h: 60 }, speed: 50,  weight: 3, humanoid: { skin: '#58b04a', shirt: '#4a9a3e', pants: '#3f8836', shoe: '#2f6a2a', eye: '#111', eyeBg: '#111', noArms: true, quad: true, mouth: '#111' }, flash: true },
  spider:   { kind: 'hostile', name: 'Aranha',   w: 62, h: 30, hit: { w: 56, h: 24 }, speed: 130, weight: 3, draw: (c, x, y, t) => { const R = BR.Draw.r.bind(BR.Draw, c), sw = Math.sin(t * 16) * 3; for (let i = 0; i < 4; i++) { R(x - 6 + i * 14, y - 10 + (i % 2 ? sw : -sw), 4, 10, '#2b1d1d'); R(x - 14 + i * 16, y - 18, 3, 12, '#2b1d1d'); } R(x - 10, y - 24, 40, 14, '#3a2a2a'); R(x - 20, y - 26, 16, 16, '#4a3434'); R(x - 18, y - 22, 3, 3, '#ff3030'); R(x - 12, y - 22, 3, 3, '#ff3030'); } },
  enderman: { kind: 'hostile', name: 'Enderman', w: 36, h: 100, hit: { w: 24, h: 94 }, speed: 40, weight: 1, blink: true, draw: (c, x, y, t) => { const R = BR.Draw.r.bind(BR.Draw, c), sw = Math.sin(t * 8) * 4; R(x - 8 + sw, y - 46, 6, 46, '#14141a'); R(x + 3 - sw, y - 46, 6, 46, '#14141a'); R(x - 9, y - 80, 18, 36, '#1a1a22'); R(x - 14, y - 82, 5, 50, '#14141a'); R(x + 9, y - 82, 5, 50, '#14141a'); R(x - 9, y - 100, 18, 18, '#1a1a22'); R(x - 6, y - 93, 5, 3, '#e24bff'); R(x + 1, y - 93, 5, 3, '#e24bff'); } }
};

BR.Creatures = {
  /** Escolhe uma criatura permitida pelo período (dia/noite) e pelo bioma. */
  pick(dn, biome) {
    let pool = [];
    if (dn.allowPassive) pool = biome.animals.map(id => BR.CREATURES[id]).filter(Boolean).map((c, i) => [biome.animals[i], c]);
    else if (dn.allowHostile) pool = Object.keys(BR.CREATURES).filter(id => BR.CREATURES[id].kind === 'hostile').map(id => [id, BR.CREATURES[id]]);
    if (!pool.length) return null;                       // transição: nada surge
    let r = Math.random() * pool.reduce((a, p) => a + p[1].weight, 0);
    for (const p of pool) { r -= p[1].weight; if (r <= 0) return p[0]; }
    return pool[0][0];
  },
  create(id, x) {
    const cfg = BR.CREATURES[id];
    return { type: 'creature', id, cfg, x, y: BR.Physics.GROUND_Y, w: cfg.w, h: cfg.h, t: Math.random() * 5, hopY: 0, kind: cfg.kind, dead: false };
  },
  update(c, dt, speed) {
    c.x -= (speed + c.cfg.speed) * dt; c.t += dt;
    c.hopY = c.cfg.hop ? Math.abs(Math.sin(c.t * 5)) * 22 : 0;
  },
  /** Caixa de colisão (menor que o sprite, para ser justo). */
  hitbox(c) {
    const h = c.cfg.hit;
    return { x: c.x - h.w / 2, y: c.y - h.h - c.hopY, w: h.w, h: h.h };
  },
  draw(ctx, c) {
    const cfg = c.cfg, x = Math.round(c.x), y = Math.round(c.y - c.hopY);
    ctx.save();
    if (cfg.blink && Math.sin(c.t * 14) > 0.85) ctx.globalAlpha = 0.55;
    if (cfg.humanoid) {
      let col = cfg.humanoid;
      ctx.translate(x, 0); ctx.scale(-1, 1);           // humanoides olham para o jogador (esquerda)
      BR.Draw.humanoid(ctx, 0, y, { c: col, state: 'run', t: c.t * 0.9, scale: cfg.h / 70 });
      ctx.scale(-1, 1); ctx.translate(-x, 0);
      if (cfg.flash && Math.floor(c.t * 4) % 2 === 0 && c.x < 700) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(x - 14, y - 66, 28, 66); }
    } else {
      // criaturas voltadas para a esquerda: o desenho já tem a cabeça à esquerda
      cfg.draw(ctx, x - cfg.w / 2, y, c.t);
    }
    ctx.restore();
  }
};
