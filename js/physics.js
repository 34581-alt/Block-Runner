/* Física e colisões — constantes ajustáveis em um só lugar */
window.BR = window.BR || {};

BR.Physics = {
  W: 960, H: 432,          // resolução lógica do jogo
  GROUND_Y: 350,           // y da superfície do chão
  BLOCK: 40,               // tamanho de um bloco
  GRAVITY: 2600,           // px/s²
  FAST_FALL: 2.2,          // multiplicador de gravidade ao apertar "baixo" no ar
  JUMP_V: -880,            // impulso do pulo (altura máx ≈ 149 px)
  JUMP_CUT: 0.45,          // soltar o botão corta o pulo
  JUMP_BUFFER: 0.12,       // s — pulo antecipado antes de aterrissar
  COYOTE: 0.07,            // s — tolerância após sair do chão
  SLIDE_TIME: 0.65,
  LAND_TIME: 0.12,

  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },
  // encolhe um retângulo (colisão mais justa)
  shrink(r, m) {
    return { x: r.x + m, y: r.y + m, w: Math.max(1, r.w - 2 * m), h: Math.max(1, r.h - 2 * m) };
  },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; }
};
