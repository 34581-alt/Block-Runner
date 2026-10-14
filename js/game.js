/* Núcleo do jogo: estados, loop (único), spawn, colisões, dificuldade e renderização */
window.BR = window.BR || {};

BR.Game = {
  state: 'menu',            // menu | playing | paused | over
  canvas: null, ctx: null, scale: 1,
  rafId: 0, last: 0, tick: 0,

  BASE_SPEED: 380, MAX_SPEED: 760, ACCEL: 4.5,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.player = new BR.Player();
    this.scenery = new BR.Scenery();
    this.spawner = new BR.Spawner();
    this.dn = new BR.DayNight();
    this.obstacles = []; this.creatures = []; this.ores = []; this.particles = [];
    this.worldX = 0; this.speed = this.BASE_SPEED;
    this.run = this.newRun();
    this.lastBiome = null;
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
    this.resize();
    this.bindInput();
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    this.startLoop();
  },

  newRun() { return { score: 0, ores: { iron: 0, gold: 0, emerald: 0, diamond: 0, netherite: 0 }, oreScore: 0, distance: 0, time: 0 }; },

  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.scale = this.canvas.width / BR.Physics.W;
  },

  /* ---------- entradas ---------- */
  bindInput() {
    const P = () => this.player;
    window.addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); return; }
      if (this.state !== 'playing') return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') P().pressJump();
      if (e.code === 'ArrowDown' || e.code === 'KeyS') P().pressDown();
    });
    window.addEventListener('keyup', e => {
      if (this.state !== 'playing') return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') P().releaseJump();
      if (e.code === 'ArrowDown' || e.code === 'KeyS') P().releaseDown();
    });
    // toque / mouse no palco: pular
    this.canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (this.state === 'playing') P().pressJump(); });
    window.addEventListener('pointerup', () => { if (this.state === 'playing') P().releaseJump(); });
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());
    const hold = (id, down, up) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (this.state === 'playing') down(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, e => { e.stopPropagation(); if (this.state === 'playing') up(); }));
    };
    hold('btn-jump', () => P().pressJump(), () => P().releaseJump());
    hold('btn-slide', () => P().pressDown(), () => P().releaseDown());
    document.getElementById('btn-pause').addEventListener('click', () => this.pause());
  },

  /* ---------- fluxo ---------- */
  start() {
    BR.Sfx.unlock();
    const P = this.player;
    P.setSkin(BR.Save.data.selected); P.reset();
    this.obstacles.length = 0; this.creatures.length = 0; this.ores.length = 0; this.particles.length = 0;
    this.scenery.reset(); this.spawner.reset();
    this.dn = new BR.DayNight();
    this.worldX = 0; this.speed = this.BASE_SPEED; this.run = this.newRun(); this.lastBiome = null;
    this.state = 'playing';
    BR.UI.show(null); BR.UI.setHud(true);
  },
  pause() { if (this.state !== 'playing') return; this.state = 'paused'; this.player.releaseDown(); BR.UI.show('pause'); },
  resume() { if (this.state !== 'paused') return; this.state = 'playing'; this.last = performance.now(); BR.UI.show(null); },
  toMenu() { this.state = 'menu'; BR.UI.setHud(false); BR.UI.show('menu'); this.player.reset(); this.obstacles.length = 0; this.creatures.length = 0; this.ores.length = 0; },

  die(reason) {
    if (this.state !== 'playing') return;
    this.state = 'over';
    BR.Sfx.play('hit');
    this.run.distance = Math.floor(this.worldX / 40);
    const recs = BR.Save.commitRun({ score: this.run.score, distance: this.run.distance, ores: this.run.ores });
    BR.UI.setHud(false);
    BR.UI.showGameOver(this.run, recs);
  },

  /* ---------- loop único ---------- */
  startLoop() {
    if (this.rafId) return;                         // impede múltiplos ciclos simultâneos
    this.last = performance.now();
    const frame = now => {
      this.rafId = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.tick += dt;
      BR.UI.frame(dt);
      if (this.state === 'playing') this.update(dt);
      else if (this.state === 'menu') this.updateAttract(dt);
      else if (this.state === 'over') this.updateParticles(dt);
      this.render();
    };
    this.rafId = requestAnimationFrame(frame);
  },

  updateAttract(dt) {                                // cenário rolando ao fundo do menu
    this.worldX += 170 * dt; this.dn.update(dt * 4);
    this.scenery.update(this.worldX, BR.Physics.W, null);
    this.player.t += dt; this.player.anim.update(dt);
    if (this.player.state !== 'run') { this.player.state = 'run'; this.player.anim.play('run', true); }
  },

  hasGround(x) {
    for (const o of this.obstacles) if (o.kind === 'pit' && x > o.x + 14 && x < o.x + o.w - 14) return false;
    return true;
  },

  update(dt) {
    const run = this.run, P = this.player;
    run.time += dt;
    this.speed = Math.min(this.MAX_SPEED, this.BASE_SPEED + run.time * this.ACCEL);
    const level = (this.speed - this.BASE_SPEED) / (this.MAX_SPEED - this.BASE_SPEED);
    const dx = this.speed * dt;
    this.worldX += dx;
    run.distance = Math.floor(this.worldX / 40);
    this.dn.update(dt);

    const info = BR.Biomes.at(this.worldX);
    if (this.lastBiome !== info.dominant.id) { if (this.lastBiome) BR.UI.toast(info.dominant.name); this.lastBiome = info.dominant.id; }

    this.scenery.update(this.worldX, BR.Physics.W, info);
    this.spawner.update(dt, this.speed, level, this.dn, info.dominant, { obstacles: this.obstacles, creatures: this.creatures, ores: this.ores });

    // mover e limpar objetos fora da tela
    for (let i = this.obstacles.length - 1; i >= 0; i--) { const o = this.obstacles[i]; o.x -= dx; if (o.x + o.w < -60) this.obstacles.splice(i, 1); }
    for (let i = this.creatures.length - 1; i >= 0; i--) { const c = this.creatures[i]; BR.Creatures.update(c, dt, this.speed); if (c.x + c.w < -60) this.creatures.splice(i, 1); }
    for (let i = this.ores.length - 1; i >= 0; i--) { const m = this.ores[i]; m.x -= dx; m.t += dt; if (m.got || m.x < -60) this.ores.splice(i, 1); }

    P.update(dt, this.hasGround(P.x));
    if (P.justLanded) this.dust(P.x, BR.Physics.GROUND_Y, 6);
    if (this.player.y > BR.Physics.GROUND_Y + 50) return this.die('pit');

    // colisões
    const hb = P.hitbox();
    for (const o of this.obstacles) {
      if (o.kind === 'pit') continue;
      if (o.x > P.x + 100 || o.x + o.w < P.x - 100) continue;
      if (BR.Physics.aabb(hb, BR.Obstacles.hitbox(o))) return this.die('obstacle');
    }
    for (const c of this.creatures) {
      if (Math.abs(c.x - P.x) > 120) continue;
      if (BR.Physics.aabb(hb, BR.Physics.shrink(BR.Creatures.hitbox(c), 2))) return this.die('creature');
    }
    const half = BR.Minerals.SIZE / 2 + 2;
    for (const m of this.ores) {
      if (m.got) continue;
      if (hb.x < m.x + half && hb.x + hb.w > m.x - half && hb.y < m.y + half && hb.y + hb.h > m.y - half) this.collect(m);
    }

    run.score = run.oreScore + Math.floor(run.distance / 10);
    this.updateParticles(dt);
    BR.UI.updateHud(run, this.dn);
  },

  collect(m) {
    m.got = true;
    const def = BR.MINERALS[m.type];
    this.run.ores[m.type]++; this.run.oreScore += def.points;
    BR.Sfx.play(m.type === 'netherite' || m.type === 'diamond' ? 'rare' : 'ore');
    for (let i = 0; i < 6; i++) this.particles.push({ x: m.x, y: m.y, vx: (Math.random() - .5) * 220, vy: -Math.random() * 240, life: .45, max: .45, c: def.color, s: 4 });
    this.run.score = this.run.oreScore + Math.floor(this.run.distance / 10);
  },
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push({ x: x + (Math.random() - .5) * 20, y: y - 2, vx: (Math.random() - .7) * 120, vy: -Math.random() * 90, life: .35, max: .35, c: 'rgba(230,230,230,.8)', s: 5 });
    if (this.particles.length > 140) this.particles.splice(0, this.particles.length - 140);
  },
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt; if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt;
    }
  },

  /* ---------- renderização ---------- */
  render() {
    const ctx = this.ctx, W = BR.Physics.W, H = BR.Physics.H, G = BR.Physics.GROUND_Y;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const info = BR.Biomes.at(this.worldX), pal = info.pal, biome = info.dominant;

    this.dn.drawSky(ctx, W, H, { top: pal.skyTop, bottom: pal.skyBot }, this.tick);
    this.scenery.drawHills(ctx, W, G, this.worldX, pal, this.dn.night);
    this.scenery.draw(ctx, this.worldX, G, pal, this.tick);
    this.drawGround(ctx, W, H, G, pal);

    // buracos (por cima do chão)
    for (const o of this.obstacles) if (o.kind === 'pit' && o.x < W && o.x + o.w > 0) BR.Obstacles.draw(ctx, o, pal, biome);
    for (const m of this.ores) if (m.x > -40 && m.x < W + 40) BR.Minerals.draw(ctx, m.type, m.x, m.y + Math.sin(m.t * 4) * 3, BR.Minerals.SIZE, m.t);
    for (const o of this.obstacles) if (o.kind !== 'pit' && o.x < W && o.x + o.w > 0) BR.Obstacles.draw(ctx, o, pal, biome);
    for (const c of this.creatures) if (c.x > -80 && c.x < W + 80) BR.Creatures.draw(ctx, c);

    if (this.state !== 'over' || this.player.y <= G + 50) this.player.draw(ctx);
    for (const p of this.particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    ctx.globalAlpha = 1;
    this.dn.drawDarkness(ctx, W, H);
  },

  drawGround(ctx, W, H, G, pal) {
    const T = 40, off = this.worldX % T, grass = BR.Biomes.rgb(pal.grass), dirt = BR.Biomes.rgb(pal.dirt), dirt2 = BR.Biomes.rgb(pal.dirt2);
    const first = Math.floor(this.worldX / T);
    for (let i = 0; i <= Math.ceil(W / T) + 1; i++) {
      const x = Math.round(i * T - off), id = first + i;
      for (let row = 0, y = G; y < H; row++, y += T) {
        const h = (id * 73 + row * 31) % 7;
        ctx.fillStyle = h < 3 ? dirt : dirt2; ctx.fillRect(x, y, T + 1, T + 1);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + (h * 5) % 28, y + (h * 9) % 28, 8, 8);
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 4, y + 4, 10, 4);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y, 1, T); ctx.fillRect(x, y, T, 1);
      }
      ctx.fillStyle = grass; ctx.fillRect(x, G, T + 1, 12);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, G + 10, T + 1, 4);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x + (id * 7) % 30, G, 8, 3);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, G, 1, 14);
    }
  }
};
