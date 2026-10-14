/* Progresso persistente (LocalStorage) com validação dos dados */
window.BR = window.BR || {};

BR.ORES = ['iron', 'gold', 'emerald', 'diamond', 'netherite'];

BR.Save = (function () {
  const KEY = 'blockrunner.save.v1';

  function defaults() {
    return {
      version: 1,
      points: 0,                                   // pontos acumulados (gastáveis)
      resources: { iron: 0, gold: 0, emerald: 0, diamond: 0, netherite: 0 }, // recursos gastáveis
      spent: { points: 0, iron: 0, gold: 0, emerald: 0, diamond: 0, netherite: 0 }, // total já gasto
      unlocked: ['steve'],
      selected: 'steve',
      records: { bestScore: 0, bestDistance: 0 },
      stats: { games: 0, totalOres: 0, totalDistance: 0, oresByType: { iron: 0, gold: 0, emerald: 0, diamond: 0, netherite: 0 } },
      settings: { sound: true, touchButtons: null }
    };
  }

  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : d);

  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    try {
      d.points = num(raw.points);
      BR.ORES.forEach(o => {
        d.resources[o] = num(raw.resources && raw.resources[o]);
        d.stats.oresByType[o] = num(raw.stats && raw.stats.oresByType && raw.stats.oresByType[o]);
      });
      Object.keys(d.spent).forEach(k => d.spent[k] = num(raw.spent && raw.spent[k]));
      if (Array.isArray(raw.unlocked)) {
        const ids = raw.unlocked.filter(x => typeof x === 'string');
        d.unlocked = Array.from(new Set(['steve'].concat(ids)));
      }
      if (typeof raw.selected === 'string') d.selected = raw.selected;
      if (!d.unlocked.includes(d.selected)) d.selected = 'steve';
      d.records.bestScore = num(raw.records && raw.records.bestScore);
      d.records.bestDistance = num(raw.records && raw.records.bestDistance);
      d.stats.games = num(raw.stats && raw.stats.games);
      d.stats.totalOres = num(raw.stats && raw.stats.totalOres);
      d.stats.totalDistance = num(raw.stats && raw.stats.totalDistance);
      if (raw.settings) {
        d.settings.sound = raw.settings.sound !== false;
        d.settings.touchButtons = typeof raw.settings.touchButtons === 'boolean' ? raw.settings.touchButtons : null;
      }
    } catch (e) { return defaults(); }
    return d;
  }

  let data = defaults();

  return {
    load() {
      try {
        const txt = localStorage.getItem(KEY);
        data = sanitize(txt ? JSON.parse(txt) : null);
      } catch (e) { data = defaults(); }
      return data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* modo privado etc. */ } },
    get data() { return data; },
    reset() { data = defaults(); this.save(); },

    /** Registra o resultado de uma partida. Não apaga nada do progresso. */
    commitRun(run) {
      data.points += run.score;
      BR.ORES.forEach(o => {
        data.resources[o] += run.ores[o] || 0;
        data.stats.oresByType[o] += run.ores[o] || 0;
        data.stats.totalOres += run.ores[o] || 0;
      });
      const newBestScore = run.score > data.records.bestScore;
      const newBestDist = run.distance > data.records.bestDistance;
      if (newBestScore) data.records.bestScore = run.score;
      if (newBestDist) data.records.bestDistance = run.distance;
      data.stats.games += 1;
      data.stats.totalDistance += run.distance;
      this.save();
      return { newBestScore, newBestDist };
    },

    /** Saldo disponível de um recurso ('points' ou minério). */
    balance(k) { return k === 'points' ? data.points : data.resources[k] || 0; },

    /** Tenta pagar um custo { points?, iron?, ... }. */
    canAfford(cost) { return Object.keys(cost).every(k => this.balance(k) >= cost[k]); },
    pay(cost) {
      if (!this.canAfford(cost)) return false;
      Object.keys(cost).forEach(k => {
        if (k === 'points') data.points -= cost[k]; else data.resources[k] -= cost[k];
        data.spent[k] = (data.spent[k] || 0) + cost[k];
      });
      this.save();
      return true;
    }
  };
})();
