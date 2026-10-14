/* Registro central das skins: arquivos de sprite, animações e requisitos de desbloqueio.
   Para trocar um placeholder pelo sprite final, basta colocar o arquivo no caminho indicado
   (assets/sprites/<skin>/<animação>.png) e ajustar frameW/frameH/frames/fps se necessário.
   Nada mais precisa mudar no código do jogo. */
window.BR = window.BR || {};

(function () {
  const ANIMS = ['idle', 'run', 'jump', 'fall', 'land', 'slide'];

  // Valores padrão — cada skin pode sobrescrever qualquer animação individualmente
  const DEFAULT_ANIM = {
    idle:  { frameW: 64, frameH: 80, frames: 4, fps: 4,  loop: true },
    run:   { frameW: 64, frameH: 80, frames: 8, fps: 12, loop: true },
    jump:  { frameW: 64, frameH: 80, frames: 3, fps: 8,  loop: false },
    fall:  { frameW: 64, frameH: 80, frames: 2, fps: 6,  loop: true },
    land:  { frameW: 64, frameH: 80, frames: 3, fps: 20, loop: false },
    slide: { frameW: 64, frameH: 80, frames: 3, fps: 10, loop: true }
  };

  function makeSet(folder, overrides) {
    const set = {};
    ANIMS.forEach(a => {
      set[a] = Object.assign({}, DEFAULT_ANIM[a], {
        src: 'assets/sprites/' + folder + '/' + a + '.png',
        pivot: { x: 32, y: 80 },   // ponto de referência: pés, centro horizontal
        scale: 1
      }, (overrides && overrides[a]) || {});
    });
    return set;
  }

  const col = (o) => Object.assign({ eye: '#2a3d8f', eyeBg: '#fff' }, o);

  /* unlock: { type:'free' } | { type:'cost', cost:{ points:N } } | { type:'cost', cost:{ emerald:N } } ...
     Aldeão: SOMENTE esmeraldas. Herobrine: SOMENTE netherite. (valores configuráveis aqui) */
  BR.SKINS = [
    { id: 'steve', name: 'Steve', folder: 'steve', unlock: { type: 'free' },
      colors: col({ skin: '#c58c65', hair: '#4a2f1a', shirt: '#2fa7c9', pants: '#3a3aa8', shoe: '#555' }) },
    { id: 'alex', name: 'Alex', folder: 'alex', unlock: { type: 'cost', cost: { points: 500 } },
      colors: col({ skin: '#e8b992', hair: '#d9701f', shirt: '#6aa84f', pants: '#7a5230', shoe: '#444', eye: '#2c7a3a' }) },
    { id: 'aldeao', name: 'Aldeão', folder: 'aldeao', unlock: { type: 'cost', cost: { emerald: 15 } },
      colors: col({ skin: '#b98b6a', hair: '#6b4a32', shirt: '#7b5a3c', pants: '#5a4330', shoe: '#3b2c20', mouth: '#7a4a3a', eye: '#2c7a3a' }) },
    { id: 'zumbi', name: 'Zumbi', folder: 'zumbi', unlock: { type: 'cost', cost: { points: 1500 } },
      colors: col({ skin: '#5f9e4a', hair: '#3f7a32', shirt: '#2fa7c9', pants: '#3a3aa8', shoe: '#333', eye: '#111', eyeBg: '#2a4a22' }) },
    { id: 'esqueleto', name: 'Esqueleto', folder: 'esqueleto', unlock: { type: 'cost', cost: { points: 2500 } },
      colors: col({ skin: '#dcdcdc', hair: null, shirt: '#bdbdbd', pants: '#a8a8a8', shoe: '#8a8a8a', eye: '#222', eyeBg: '#444' }) },
    { id: 'enderman', name: 'Enderman', folder: 'enderman', unlock: { type: 'cost', cost: { points: 5000 } },
      colors: col({ skin: '#1a1a1f', hair: null, shirt: '#14141a', pants: '#14141a', shoe: '#0c0c10', eye: '#e24bff', eyeBg: '#e24bff' }) },
    { id: 'creeper', name: 'Creeper', folder: 'creeper', unlock: { type: 'cost', cost: { points: 3500 } },
      colors: col({ skin: '#58b04a', hair: null, shirt: '#4a9a3e', pants: '#3f8836', shoe: '#2f6a2a', eye: '#111', eyeBg: '#111', noArms: true, quad: true, mouth: '#111' }) },
    { id: 'herobrine', name: 'Herobrine', folder: 'herobrine', unlock: { type: 'cost', cost: { netherite: 20 } },
      colors: col({ skin: '#c58c65', hair: '#4a2f1a', shirt: '#2fa7c9', pants: '#3a3aa8', shoe: '#555', eye: '#ffffff', eyeBg: '#ffffff' }) }
  ];

  BR.SKINS.forEach(s => { s.anims = makeSet(s.folder, s.overrides); });

  BR.Skins = {
    get(id) { return BR.SKINS.find(s => s.id === id) || BR.SKINS[0]; },
    isUnlocked(id) { return BR.Save.data.unlocked.includes(id); },
    cost(id) { const u = this.get(id).unlock; return u.type === 'cost' ? u.cost : null; },

    unlock(id) {
      const s = this.get(id), d = BR.Save.data;
      if (d.unlocked.includes(id)) return { ok: true };
      if (s.unlock.type !== 'cost') return { ok: false, msg: 'Não pode ser desbloqueada.' };
      if (!BR.Save.canAfford(s.unlock.cost)) return { ok: false, msg: 'Recursos insuficientes.' };
      BR.Save.pay(s.unlock.cost);
      d.unlocked.push(id); BR.Save.save();
      return { ok: true };
    },
    select(id) {
      if (!this.isUnlocked(id)) return false;   // skin bloqueada nunca pode ser selecionada
      BR.Save.data.selected = id; BR.Save.save(); return true;
    },
    /** Carrega todos os arquivos (os ausentes viram placeholder). */
    preloadAll() { return Promise.all(BR.SKINS.map(s => new BR.Animator(s.anims).preload())); },
    /** True se a skin usa sprites reais em todas as animações. */
    isFullyReal(skin) { const a = new BR.Animator(skin.anims); return ANIMS.every(n => a.has(n)); }
  };

  BR.NAMES = { iron: 'Ferro', gold: 'Ouro', emerald: 'Esmeralda', diamond: 'Diamante', netherite: 'Netherite', points: 'pontos' };
})();
