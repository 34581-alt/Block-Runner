# Block Runner — Entre Blocos e Perigos

Endless runner 2D em HTML5 + Canvas + JavaScript puro. Abra `index.html` no navegador (ou sirva a pasta com qualquer servidor estático, ex.: `python3 -m http.server`).

Teste rápido de um bioma: `index.html?biome=0..5` (0 Planícies, 1 Floresta, 2 Deserto, 3 Taiga, 4 Selva, 5 Pântano).

## Controles
- Computador: Espaço / ↑ pula (segure = pulo mais alto) · ↓ desliza (no ar, cai mais rápido) · Esc pausa.
- Celular: toque na tela ou botão ▲ pula · botão ▼ desliza · botão ❚❚ pausa.

## Estrutura
| Arquivo | Função |
|---|---|
| `js/physics.js` | constantes de física (gravidade, pulo, chão) e colisão AABB |
| `js/progression.js` | LocalStorage com validação, recursos, gastos e recordes |
| `js/animation.js` | carregador/validador de assets, `Animator` de spritesheets, placeholders |
| `js/skins.js` | registro das 8 skins (arquivos, animações, requisitos de desbloqueio) |
| `js/dayNight.js` | ciclo dia/noite suave |
| `js/biomes.js` | 6 biomas, paletas, cenário modular e transições graduais |
| `js/minerals.js` | minérios (pontos e frequências configuráveis) |
| `js/creatures.js` | animais passivos (dia) e criaturas hostis (noite) |
| `js/obstacles.js` | obstáculos e gerador de padrões |
| `js/player.js` | estados e hitbox do jogador |
| `js/ui.js` | menus, HUD, skins, estatísticas, sons |
| `js/game.js` / `js/main.js` | loop único, colisões, renderização e inicialização |

## Como trocar um placeholder por um sprite real
Cada skin procura seus arquivos em `assets/sprites/<skin>/<animação>.png`
(`idle`, `run`, `jump`, `fall`, `land`, `slide`). Se o arquivo existir e as dimensões baterem com a configuração, ele é usado automaticamente; senão o jogo desenha um **placeholder** (o cartão da skin mostra "sprite provisório").

Ajuste a configuração em `js/skins.js` (`DEFAULT_ANIM` ou `overrides` por skin):

```js
{ id: 'steve', ..., overrides: { run: { frameW: 48, frameH: 64, frames: 6, fps: 10, pivot: { x: 24, y: 64 }, scale: 1.2 } } }
```

Campos: `frameW`, `frameH`, `frames`, `fps`, `loop`, `pivot` (ponto dos pés), `scale`, e opcionalmente `cols`/`row` (spritesheet em grade), `srcFrames: [...]` (imagens individuais) e `removeCheckerboard: true` (remove fundo quadriculado desenhado na imagem).
Se as dimensões não baterem, o aviso aparece no console e o placeholder continua em uso — nada quebra.

Minérios podem ter sprites em `assets/objects/iron.png`, `gold.png`, `emerald.png`, `diamond.png`, `netherite.png`.

## Desbloqueios (configuráveis em `js/skins.js`)
Steve grátis · Alex 500 pts · Aldeão 15 esmeraldas (somente) · Zumbi 1500 pts · Esqueleto 2500 pts · Creeper 3500 pts · Enderman 5000 pts · Herobrine 20 Netherite (somente).
