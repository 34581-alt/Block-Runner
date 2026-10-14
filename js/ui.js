/* Interface: telas, HUD, menu de skins, estatísticas, configurações e efeitos sonoros */
window.BR = window.BR || {};

/* ---------- Sons simples (WebAudio, sem arquivos) ---------- */
BR.Sfx = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  beep(freq, dur, type, vol, slide) {
    if (!this.ctx || !BR.Save.data.settings.sound) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(n) {
    switch (n) {
      case 'jump': this.beep(330, 0.14, 'square', 0.04, 260); break;
      case 'slide': this.beep(180, 0.15, 'sawtooth', 0.03, -80); break;
      case 'ore': this.beep(880, 0.08, 'triangle', 0.06, 440); break;
      case 'rare': this.beep(660, 0.25, 'triangle', 0.07, 880); break;
      case 'hit': this.beep(160, 0.35, 'sawtooth', 0.07, -120); break;
      case 'ui': this.beep(520, 0.06, 'square', 0.03); break;
      case 'unlock': this.beep(520, 0.3, 'triangle', 0.06, 700); break;
    }
  }
};

BR.UI = {
  current: 'menu', previews: [], hudCache: {},

  init() {
    const $ = id => document.getElementById(id);
    // chips de minério na HUD
    const box = $('hud-ores');
    BR.ORES.forEach(o => {
      const d = document.createElement('div'); d.className = 'ore-chip';
      d.innerHTML = '<span class="ore-dot" style="background:' + BR.Minerals.css(o) + '"></span><span id="hud-ore-' + o + '">0</span>';
      box.appendChild(d);
    });
    // ações dos botões
    document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => this.action(b.dataset.action)));
    $('set-sound').addEventListener('change', e => { BR.Save.data.settings.sound = e.target.checked; BR.Save.save(); BR.Sfx.unlock(); BR.Sfx.play('ui'); });
    $('set-touch').addEventListener('change', e => { BR.Save.data.settings.touchButtons = e.target.checked; BR.Save.save(); });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Apagar todo o progresso (recursos, skins e recordes)?')) { BR.Save.reset(); BR.Game.player.setSkin('steve'); this.renderSettings(); this.toast('Progresso apagado'); }
    });
    this.show('menu');
  },

  action(a) {
    BR.Sfx.unlock(); BR.Sfx.play('ui');
    const G = BR.Game;
    switch (a) {
      case 'play': case 'restart': G.start(); break;
      case 'resume': G.resume(); break;
      case 'menu': G.toMenu(); break;
      case 'menu-quit': G.toMenu(); break;
      case 'skins': this.renderSkins(); this.show('skins'); break;
      case 'stats': this.renderStats(); this.show('stats'); break;
      case 'settings': this.renderSettings(); this.show('settings'); break;
    }
  },

  show(name) {
    this.current = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (name) document.getElementById('screen-' + name).classList.remove('hidden');
    if (name !== 'skins') this.previews.length = 0;
  },

  /* ---------- HUD ---------- */
  touchEnabled() { const s = BR.Save.data.settings.touchButtons; return s === null ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : s; },
  setHud(on) {
    document.getElementById('hud').classList.toggle('hidden', !on);
    const t = on && this.touchEnabled();
    document.getElementById('btn-jump').classList.toggle('hidden', !t);
    document.getElementById('btn-slide').classList.toggle('hidden', !t);
    if (on) this.updateHud(BR.Game.run, BR.Game.dn, true);
  },
  updateHud(run, dn, force) {
    const c = this.hudCache, set = (id, v) => { if (c[id] !== v || force) { c[id] = v; document.getElementById(id).textContent = v; } };
    set('hud-score', run.score); set('hud-dist', run.distance + ' m');
    BR.ORES.forEach(o => set('hud-ore-' + o, run.ores[o]));
    const w = Math.round(dn.night * 100) + '%'; if (c.dn !== w || force) { c.dn = w; document.getElementById('hud-dn-fill').style.width = w; }
  },

  toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('hidden'), 1800);
  },

  /* ---------- Game Over ---------- */
  showGameOver(run, recs) {
    const d = BR.Save.data, ores = BR.ORES.filter(o => run.ores[o] > 0).map(o => BR.MINERALS[o].name + ' ×' + run.ores[o]).join(' · ') || '—';
    document.getElementById('over-body').innerHTML =
      '<div class="row"><span>Pontuação</span><b>' + run.score + (recs.newBestScore ? ' ★ novo recorde!' : '') + '</b></div>' +
      '<div class="row"><span>Distância</span><b>' + run.distance + ' m' + (recs.newBestDist ? ' ★' : '') + '</b></div>' +
      '<div class="row"><span>Minérios</span><b style="font-size:.8em">' + ores + '</b></div>' +
      '<div class="row"><span>Recorde pessoal</span><b>' + d.records.bestScore + ' pts · ' + d.records.bestDistance + ' m</b></div>';
    setTimeout(() => { if (BR.Game.state === 'over') this.show('over'); }, 450);
  },

  /* ---------- Estatísticas ---------- */
  renderStats() {
    const d = BR.Save.data, s = d.stats;
    document.getElementById('stats-body').innerHTML =
      '<div class="row"><span>Maior distância</span><b>' + d.records.bestDistance + ' m</b></div>' +
      '<div class="row"><span>Maior pontuação</span><b>' + d.records.bestScore + '</b></div>' +
      '<div class="row"><span>Total de partidas</span><b>' + s.games + '</b></div>' +
      '<div class="row"><span>Distância total</span><b>' + s.totalDistance + ' m</b></div>' +
      '<div class="row"><span>Minérios coletados</span><b>' + s.totalOres + '</b></div>' +
      '<div class="row"><span>Skins desbloqueadas</span><b>' + d.unlocked.length + ' / ' + BR.SKINS.length + '</b></div>';
  },

  /* ---------- Configurações ---------- */
  renderSettings() {
    document.getElementById('set-sound').checked = BR.Save.data.settings.sound;
    document.getElementById('set-touch').checked = this.touchEnabled();
  },

  /* ---------- Skins ---------- */
  costText(skin) {
    const u = skin.unlock; if (u.type === 'free') return 'Grátis';
    return Object.keys(u.cost).map(k => u.cost[k] + ' ' + (k === 'points' ? 'pontos' : BR.NAMES[k] === 'Esmeralda' ? 'esmeraldas' : BR.NAMES[k])).join(' + ');
  },
  renderSkins() {
    const d = BR.Save.data, grid = document.getElementById('skin-grid');
    grid.innerHTML = ''; this.previews.length = 0;
    document.getElementById('skin-msg').textContent = '';
    document.getElementById('wallet').innerHTML = '<span>Pontos: <b style="color:#ffd23f">' + d.points + '</b></span>' +
      BR.ORES.map(o => '<span><i class="ore-dot" style="display:inline-block;width:1.1cqw;height:1.1cqw;margin-right:.4cqw;background:' + BR.Minerals.css(o) + '"></i>' + d.resources[o] + '</span>').join('');

    BR.SKINS.forEach(skin => {
      const unlocked = BR.Skins.isUnlocked(skin.id), selected = d.selected === skin.id;
      const card = document.createElement('div');
      card.className = 'skin-card' + (unlocked ? '' : ' locked') + (selected ? ' sel' : '');
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 80;
      const real = BR.Skins.isFullyReal(skin);
      card.appendChild(cv);
      card.insertAdjacentHTML('beforeend',
        '<div class="nm">' + (unlocked ? '' : '🔒 ') + skin.name + '</div>' +
        '<div class="req">' + (unlocked ? 'Desbloqueada' : 'Requer: ' + this.costText(skin)) + '</div>' +
        (real ? '' : '<div class="ph">sprite provisório</div>'));
      const btn = document.createElement('button'); btn.className = 'btn small';
      if (unlocked) { btn.textContent = selected ? 'EM USO' : 'SELECIONAR'; btn.disabled = selected; btn.onclick = () => { BR.Skins.select(skin.id); BR.Game.player.setSkin(skin.id); BR.Sfx.play('ui'); this.renderSkins(); }; }
      else {
        const can = BR.Save.canAfford(skin.unlock.cost);
        btn.textContent = 'DESBLOQUEAR'; btn.disabled = !can;
        btn.onclick = () => {
          const r = BR.Skins.unlock(skin.id);
          if (r.ok) { BR.Skins.select(skin.id); BR.Game.player.setSkin(skin.id); BR.Sfx.unlock(); BR.Sfx.play('unlock'); this.renderSkins(); document.getElementById('skin-msg').textContent = skin.name + ' desbloqueado!'; }
          else document.getElementById('skin-msg').textContent = r.msg;
        };
      }
      card.appendChild(btn); grid.appendChild(card);
      this.previews.push({ cv, ctx: cv.getContext('2d'), skin, anim: new BR.Animator(skin.anims), t: 0 });
    });
    this.previews.forEach(p => p.anim.play('run'));
  },
  /** chamado a cada quadro pelo loop do jogo enquanto a tela de skins está aberta */
  frame(dt) {
    if (this.current !== 'skins') return;
    for (const p of this.previews) {
      p.t += dt; p.anim.update(dt);
      p.ctx.clearRect(0, 0, 64, 80); p.ctx.imageSmoothingEnabled = false;
      if (!p.anim.draw(p.ctx, 32, 78, false)) BR.Draw.humanoid(p.ctx, 32, 78, { c: p.skin.colors, state: 'run', t: p.t });
    }
  }
};
