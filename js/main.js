/* Ponto de entrada: carrega progresso e assets e inicia o jogo */
(function () {
  function boot() {
    BR.Save.load();
    // Biomas: ?biome=0..5 permite testar qualquer bioma diretamente
    const q = new URLSearchParams(location.search).get('biome');
    if (q !== null && !isNaN(+q)) BR.Biomes.startIndex = ((+q % 6) + 6) % 6;

    BR.UI.init();
    BR.Game.init();
    BR.UI.renderSettings();

    // Carrega sprites/objetos opcionais em segundo plano; os ausentes usam placeholders.
    const extra = BR.ORES.map(o => BR.Assets.load('assets/objects/' + o + '.png'));
    Promise.all([BR.Skins.preloadAll()].concat(extra)).then(() => {
      if (BR.Assets.report.length) console.info('[block-runner] ' + BR.Assets.report.length + ' asset(s) ausente(s)/inválido(s) — placeholders em uso.');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
