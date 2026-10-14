/* Jogador: estados (parado, corrida, pulo, queda, aterrissagem, deslize), pulo variável e hitbox */
window.BR = window.BR || {};

BR.Player = class {
  constructor() {
    this.x = 150;
    this.setSkin(BR.Save.data.selected);
    this.reset();
  }
  setSkin(id) {
    this.skin = BR.Skins.get(id);
    this.anim = new BR.Animator(this.skin.anims);
  }
  reset() {
    const P = BR.Physics;
    this.y = P.GROUND_Y; this.vy = 0;
    this.onGround = true; this.state = 'run';
    this.slideT = 0; this.landT = 0; this.jumpBuf = 0; this.coyote = 0;
    this.holdingDown = false; this.dead = false; this.t = 0; this.justLanded = false;
    this.anim.play('run', true);
  }

  /* --- entradas --- */
  pressJump() { this.jumpBuf = BR.Physics.JUMP_BUFFER; }
  releaseJump() { if (this.vy < 0) this.vy *= BR.Physics.JUMP_CUT; this.jumpBuf = 0; }
  pressDown() {
    this.holdingDown = true;
    if (this.onGround && this.slideT <= 0) { this.slideT = BR.Physics.SLIDE_TIME; BR.Sfx && BR.Sfx.play('slide'); }
  }
  releaseDown() { this.holdingDown = false; if (this.slideT > 0.12) this.slideT = 0.12; }

  hitbox() {
    if (this.slideT > 0 && this.onGround) return { x: this.x - 28, y: this.y - 32, w: 56, h: 32 };
    return { x: this.x - 14, y: this.y - 66, w: 28, h: 66 };
  }

  /** hasGround(xCenter) → false quando o jogador está sobre um buraco */
  update(dt, hasGround) {
    const P = BR.Physics;
    this.t += dt; this.justLanded = false;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.onGround) this.coyote = P.COYOTE; else this.coyote = Math.max(0, this.coyote - dt);

    // pulo (com buffer e coyote time)
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = P.JUMP_V; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.slideT = 0;
      BR.Sfx && BR.Sfx.play('jump');
    }

    // gravidade
    const g = P.GRAVITY * (this.holdingDown && !this.onGround ? P.FAST_FALL : 1);
    if (!this.onGround) {
      this.vy += g * dt; this.y += this.vy * dt;
      if (this.y >= P.GROUND_Y && this.vy >= 0 && hasGround) {   // aterrissagem confiável: sempre fica exatamente no chão
        this.y = P.GROUND_Y; this.vy = 0; this.onGround = true; this.landT = P.LAND_TIME; this.justLanded = true;
      }
    } else if (!hasGround) {          // andou para fora da borda
      this.onGround = false; this.coyote = 0;
    }

    if (this.slideT > 0) { this.slideT -= dt; if (!this.onGround) this.slideT = 0; }
    if (this.landT > 0) this.landT -= dt;

    // estado → animação
    let s;
    if (!this.onGround) s = this.vy < 0 ? 'jump' : 'fall';
    else if (this.slideT > 0) s = 'slide';
    else if (this.landT > 0) s = 'land';
    else s = 'run';
    if (s !== this.state) { this.state = s; this.anim.play(s, true); }
    this.anim.update(dt);
  }

  draw(ctx, stateOverride) {
    const st = stateOverride || this.state;
    if (stateOverride && this.anim.name !== st) this.anim.play(st);
    // sprite real (se existir e for válido); senão placeholder identificável
    const used = this.anim.draw(ctx, Math.round(this.x), Math.round(this.y), false) ||
      // se a animação específica não existir, tenta a de corrida real antes do placeholder
      false;
    if (!used) BR.Draw.humanoid(ctx, Math.round(this.x), Math.round(this.y), { c: this.skin.colors, state: st, t: this.t });
  }
};
