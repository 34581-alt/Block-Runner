/* Carregador/validador de assets, animador de spritesheets e desenhos de placeholder */
window.BR = window.BR || {};

/* ---------- Carregamento e validação de imagens ---------- */
BR.Assets = {
  cache: {},          // src -> { img, ok, error }
  report: [],         // problemas encontrados (exibidos no console)

  load(src, opts) {
    opts = opts || {};
    if (this.cache[src]) return this.cache[src].promise;
    const entry = { img: null, ok: false, error: null };
    entry.promise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) { entry.error = 'imagem vazia'; this._warn(src, entry.error); return resolve(entry); }
        entry.img = opts.removeCheckerboard ? this._removeCheckerboard(img) : img;
        entry.ok = true;
        resolve(entry);
      };
      img.onerror = () => { entry.error = 'arquivo ausente ou inválido'; this._warn(src, entry.error); resolve(entry); };
      img.src = src;
    });
    this.cache[src] = entry;
    return entry.promise;
  },
  get(src) { const e = this.cache[src]; return e && e.ok ? e.img : null; },
  _warn(src, msg) { this.report.push({ src, msg }); console.info('[assets] ' + src + ': ' + msg + ' → placeholder em uso'); },

  /** Remove fundo quadriculado "desenhado" na imagem (flood-fill a partir das bordas). */
  _removeCheckerboard(img) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height;
    // cores do quadriculado = as duas mais comuns no canto superior esquerdo
    const counts = {};
    for (let yy = 0; yy < Math.min(24, H); yy++) for (let xx = 0; xx < Math.min(24, W); xx++) {
      const i = (yy * W + xx) * 4; if (p[i + 3] < 250) continue;
      const k = (p[i] >> 3) + ',' + (p[i + 1] >> 3) + ',' + (p[i + 2] >> 3);
      counts[k] = (counts[k] || 0) + 1;
    }
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2).map(k => k.split(',').map(n => n * 8 + 4));
    if (!top.length) return img;
    const isBg = i => p[i + 3] < 10 || top.some(t => Math.abs(p[i] - t[0]) < 14 && Math.abs(p[i + 1] - t[1]) < 14 && Math.abs(p[i + 2] - t[2]) < 14);
    const seen = new Uint8Array(W * H), stack = [];
    const push = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= W || yy >= H) return; const k = yy * W + xx; if (seen[k]) return; if (!isBg(k * 4)) return; seen[k] = 1; stack.push(k); };
    for (let xx = 0; xx < W; xx++) { push(xx, 0); push(xx, H - 1); }
    for (let yy = 0; yy < H; yy++) { push(0, yy); push(W - 1, yy); }
    while (stack.length) { const k = stack.pop(), xx = k % W, yy = (k / W) | 0; p[k * 4 + 3] = 0; push(xx + 1, yy); push(xx - 1, yy); push(xx, yy + 1); push(xx, yy - 1); }
    x.putImageData(d, 0, 0);
    return c;
  }
};

/* ---------- Animador reutilizável ----------
   Config de uma animação:
   { src, frameW, frameH, frames, fps, loop, pivot:{x,y}, scale, cols?, row?, srcFrames?, removeCheckerboard? }
   - spritesheet: um arquivo com 'frames' quadros de frameW×frameH (em 'cols' colunas, a partir da linha 'row')
   - imagens soltas: srcFrames:[ 'a.png', 'b.png' ... ]
*/
BR.Animator = class {
  constructor(animSet) {
    this.set = animSet || {};
    this.name = null; this.t = 0; this.finished = false;
  }
  /** Carrega todos os arquivos referenciados. Nunca rejeita. */
  preload() {
    const jobs = [];
    Object.keys(this.set).forEach(n => {
      const c = this.set[n];
      (c.srcFrames || (c.src ? [c.src] : [])).forEach(s => jobs.push(BR.Assets.load(s, { removeCheckerboard: c.removeCheckerboard })));
    });
    return Promise.all(jobs);
  }
  /** Uma animação só é "real" se todos os arquivos existem e as dimensões batem. */
  has(name) {
    const c = this.set[name]; if (!c) return false;
    if (c._valid !== undefined) return c._valid;
    let ok = true;
    if (c.srcFrames) ok = c.srcFrames.every(s => BR.Assets.get(s));
    else {
      const img = c.src && BR.Assets.get(c.src);
      if (!img) ok = false;
      else {
        const cols = c.cols || c.frames, rows = Math.ceil(c.frames / cols);
        const need = { w: cols * c.frameW, h: ((c.row || 0) + rows) * c.frameH };
        const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
        if (need.w > iw || need.h > ih) {
          ok = false;
          BR.Assets._warn(c.src, 'dimensões não batem com a configuração (' + iw + '×' + ih + ', esperado ≥ ' + need.w + '×' + need.h + ') — substitua o arquivo ou ajuste frameW/frameH');
        }
      }
    }
    // só memoriza quando todos os assets já terminaram de carregar
    if (!ok && c.src && BR.Assets.cache[c.src] && !BR.Assets.cache[c.src].ok && !BR.Assets.cache[c.src].error) return false;
    c._valid = ok; return ok;
  }
  play(name, restart) {
    if (this.name === name && !restart) return;
    this.name = name; this.t = 0; this.finished = false;
  }
  update(dt) {
    const c = this.set[this.name]; if (!c) return;
    this.t += dt;
    if (!c.loop && this.t * (c.fps || 8) >= c.frames) this.finished = true;
  }
  /** Retorna true se desenhou um sprite real; false → o chamador desenha o placeholder. */
  draw(ctx, x, y, flip) {
    const c = this.set[this.name];
    if (!c || !this.has(this.name)) return false;
    let i = Math.floor(this.t * (c.fps || 8));
    i = c.loop === false ? Math.min(i, c.frames - 1) : i % c.frames;
    const sc = c.scale || 1, px = (c.pivot ? c.pivot.x : c.frameW / 2), py = (c.pivot ? c.pivot.y : c.frameH);
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    if (c.srcFrames) {
      const im = BR.Assets.get(c.srcFrames[i]);
      ctx.drawImage(im, -px * sc, -py * sc, im.width * sc, im.height * sc);
    } else {
      const im = BR.Assets.get(c.src), cols = c.cols || c.frames;
      const sx = (i % cols) * c.frameW, sy = ((c.row || 0) + Math.floor(i / cols)) * c.frameH;
      ctx.drawImage(im, sx, sy, c.frameW, c.frameH, -px * sc, -py * sc, c.frameW * sc, c.frameH * sc);
    }
    ctx.restore();
    return true;
  }
};

/* ---------- Placeholders desenhados por código (claramente provisórios) ---------- */
BR.Draw = {
  r(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },

  /** Humanoide blocado. Pés em (x,y). o: { c:cores, state, t, scale, flip } */
  humanoid(ctx, x, y, o) {
    const c = o.c, st = o.state || 'run', t = o.t || 0, S = o.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    if (st === 'slide') { ctx.translate(0, -9); ctx.rotate(-1.42); ctx.translate(0, 35 * S); }
    ctx.scale(S, S);
    let sq = 1; if (st === 'land') sq = 0.9;
    ctx.scale(1 / sq * (st === 'land' ? 1.08 : 1), sq);
    const sw = st === 'run' ? Math.sin(t * 13) : 0;        // balanço da corrida
    const bob = st === 'run' ? Math.abs(Math.sin(t * 13)) * 2 : (st === 'idle' ? Math.sin(t * 3) * 1 : 0);
    const R = this.r.bind(this, ctx);
    // pernas
    const lh = 26;
    if (c.quad) {                       // creeper: quatro pés
      R(-10, -lh * 0.5 - 0, 8, lh * 0.5, c.pants); R(2, -lh * 0.5, 8, lh * 0.5, c.pants);
      R(-12 + sw * 3, -lh * 0.5, 8, lh * 0.5, c.shoe); R(4 - sw * 3, -lh * 0.5, 8, lh * 0.5, c.shoe);
    } else {
      let lx1 = -9, lx2 = 1, lw = 8;
      if (st === 'run') { lx1 += sw * 6; lx2 -= sw * 6; }
      if (st === 'jump') { lx1 += 3; lx2 -= 1; }
      if (st === 'fall') { lx1 -= 3; lx2 += 3; }
      R(lx1, -lh + bob * 0, lw, lh - 4, c.pants); R(lx1, -4, lw, 4, c.shoe);
      R(lx2, -lh, lw, lh - 4, c.pants); R(lx2, -4, lw, 4, c.shoe);
    }
    // tronco
    const by = -lh - 26 + bob;
    R(-9, by, 18, 26, c.shirt);
    // braços
    if (!c.noArms) {
      let a1 = 0, a2 = 0, ay = by + 1;
      if (st === 'run') { a1 = -sw * 7; a2 = sw * 7; }
      if (st === 'jump' || st === 'fall') { R(-14, ay - 8, 5, 22, c.skin); R(9, ay - 8, 5, 22, c.skin); }
      else { R(-14 + a1, ay, 5, 22, c.skin); R(9 + a2, ay, 5, 22, c.skin); }
    }
    // cabeça
    const hy = by - 18;
    R(-9, hy, 18, 18, c.skin);
    if (c.hair) { R(-9, hy, 18, 5, c.hair); R(-9, hy, 4, 10, c.hair); }
    // olhos (rosto olha para a direita)
    R(1, hy + 7, 4, 3, c.eyeBg || '#fff'); R(3, hy + 7, 2, 3, c.eye || '#2a3d8f');
    R(-5, hy + 7, 4, 3, c.eyeBg || '#fff'); R(-5, hy + 7, 2, 3, c.eye || '#2a3d8f');
    if (c.mouth) R(-3, hy + 13, 6, 2, c.mouth);
    ctx.restore();
  },

  /** Quadrúpede/blocado genérico. Pés em (x,y). o: { w,h,body,head,leg,spot,eye,snout,t,moving } */
  quad(ctx, x, y, o) {
    const R = this.r.bind(this, ctx), t = o.t || 0, w = o.w, h = o.h;
    const legH = Math.max(6, h * 0.34), sw = o.moving === false ? 0 : Math.sin(t * 10) * 3;
    ctx.save(); ctx.translate(x, y);
    // pernas
    R(w * 0.12 + sw, -legH, w * 0.14, legH, o.leg || o.body); R(w * 0.34 - sw, -legH, w * 0.14, legH, o.leg || o.body);
    R(w * 0.60 + sw, -legH, w * 0.14, legH, o.leg || o.body); R(w * 0.80 - sw, -legH, w * 0.14, legH, o.leg || o.body);
    // corpo
    R(w * 0.06, -h * 0.9 + 0, w * 0.84, h * 0.56, o.body);
    if (o.spot) { R(w * 0.22, -h * 0.84, w * 0.2, h * 0.24, o.spot); R(w * 0.58, -h * 0.6, w * 0.2, h * 0.2, o.spot); }
    // cabeça (à esquerda: andam contra o jogador)
    const hw = w * 0.3, hh = h * 0.46;
    R(-hw * 0.5, -h * 0.98, hw, hh, o.head || o.body);
    if (o.snout) R(-hw * 0.7, -h * 0.98 + hh * 0.5, hw * 0.35, hh * 0.45, o.snout);
    R(-hw * 0.18, -h * 0.98 + hh * 0.3, 3, 3, o.eye || '#111');
    if (o.horn) { R(-hw * 0.4, -h * 1.05, 3, 6, o.horn); R(hw * 0.2, -h * 1.05, 3, 6, o.horn); }
    if (o.tail) R(w * 0.92, -h * 0.85, 4, h * 0.3, o.tail);
    ctx.restore();
  }
};
