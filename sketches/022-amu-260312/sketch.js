// ==========================================================
// MA - Integrated Sacred Geometry Gallery Version (Loop Fixed)
// p5.js
// ==========================================================

// ---------- Global ----------
let scene;
let particles = [];
let geoLayers = [];
let auraField;
let resonanceSystem;

const PHI = 1.61803398875;

const PALETTE = {
  bg: [2, 2, 5],
  core: [255, 255, 255],
  main: [140, 120, 255],
  sub: [190, 170, 255],
  outer: [110, 150, 255]
};

// ==========================================================
// Setup / Draw
// ==========================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  angleMode(RADIANS);
  smooth();
  strokeCap(ROUND);
  strokeJoin(ROUND);

  scene = new SceneController(84.0);
  auraField = new AuraField();
  resonanceSystem = new ResonanceRingSystem();

  initGeoLayers();
  initParticles();

  background(...PALETTE.bg);
}

function draw() {
  scene.update();

  const state = scene.getState();
  const phaseProgress = scene.getPhaseProgress();
  const breath = scene.getBreath();
  const bloomStrength = scene.getBloomStrength();
  const loopBlend = scene.getLoopBlend();

  noStroke();
  let bgFade = 10 + loopBlend * 10;
  fill(PALETTE.bg[0], PALETTE.bg[1], PALETTE.bg[2], bgFade);
  rect(0, 0, width, height);

  translate(width / 2, height / 2);

  auraField.update(state, breath, phaseProgress);
  auraField.draw(state, breath, phaseProgress);

  resonanceSystem.update(state, breath, phaseProgress, bloomStrength);
  resonanceSystem.draw();

  for (let layer of geoLayers) {
    layer.update(state, breath, bloomStrength, phaseProgress);
    layer.draw(state, breath, bloomStrength, phaseProgress);
  }

  updateParticles(state, breath, phaseProgress, bloomStrength);

  drawRadiantBeams(state, breath, phaseProgress, bloomStrength);
  drawCore(state, breath, phaseProgress, bloomStrength);

  if (state === "SILENCE" || loopBlend > 0.0) {
    let s = min(width, height);
    let hint = state === "SILENCE"
      ? (1.0 - scene.getPhaseProgress())
      : loopBlend * 0.8;

    noStroke();
    fill(0, 0, 0, 10 + hint * 10);
    rect(-width / 2, -height / 2, width, height);

    blendMode(ADD);
    noFill();

    for (let i = 0; i < 18; i++) {
      let r = s * 0.010 + i * s * 0.0022;
      let a = (8 - i * 0.35) * hint;
      stroke(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], a);
      strokeWeight(1.2);
      circle(0, 0, r * 2);
    }

    blendMode(BLEND);

    noStroke();
    fill(255, 255, 255, 24 * hint);
    circle(0, 0, s * 0.020);
  }

  resetMatrix();
  drawVignette();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGeoLayers();
}

// ==========================================================
// Scene Controller
// ==========================================================
class SceneController {
  constructor(cycleDurationSec = 84.0) {
    this.cycleDuration = cycleDurationSec;
    this.startMillis = millis();

    this.phases = [
      { name: "VOID", start: 0.00, end: 0.16 },
      { name: "SEED", start: 0.16, end: 0.30 },
      { name: "PULSE", start: 0.30, end: 0.54 },
      { name: "BLOOM", start: 0.54, end: 0.76 },
      { name: "ORBIT", start: 0.76, end: 0.91 },
      { name: "DISSOLVE", start: 0.91, end: 0.98 },
      { name: "SILENCE", start: 0.98, end: 1.00 }
    ];
  }

  update() {}

  getCycleT() {
    const elapsed = (millis() - this.startMillis) / 1000.0;
    return (elapsed % this.cycleDuration) / this.cycleDuration;
  }

  getState() {
    const t = this.getCycleT();
    for (let p of this.phases) {
      if (t >= p.start && t < p.end) return p.name;
    }
    return "VOID";
  }

  getPhaseProgress() {
    const t = this.getCycleT();
    for (let p of this.phases) {
      if (t >= p.start && t < p.end) {
        return constrain(map(t, p.start, p.end, 0, 1), 0, 1);
      }
    }
    return 0;
  }

  getLoopBlend() {
    const t = this.getCycleT();
    if (t >= 0.94) {
      return map(t, 0.94, 1.00, 0, 1);
    } else if (t <= 0.08) {
      return map(t, 0.00, 0.08, 1, 0);
    }
    return 0;
  }

  getBreath() {
    const t = (millis() - this.startMillis) * 0.001;
    const cycle = (t % 16.0) / 16.0;

    let b = 0;

    if (cycle < 0.32) {
      let x = map(cycle, 0.0, 0.32, 0, 1);
      b = easeInOutSine(x);
    } else if (cycle < 0.46) {
      b = 1.0;
    } else if (cycle < 0.88) {
      let x = map(cycle, 0.46, 0.88, 1, 0);
      b = easeInOutCubic(x);
    } else {
      let x = map(cycle, 0.88, 1.0, 0, 1);
      b = 0.045 * (1.0 - easeInOutSine(x));
    }

    const state = this.getState();
    const p = this.getPhaseProgress();

    let phaseAmp = 0.05;
    if (state === "VOID") phaseAmp = 0.02;
    if (state === "SEED") phaseAmp = lerp(0.05, 0.18, p);
    if (state === "PULSE") phaseAmp = lerp(0.22, 0.52, p);
    if (state === "BLOOM") phaseAmp = lerp(0.58, 1.00, p);
    if (state === "ORBIT") phaseAmp = 0.90;
    if (state === "DISSOLVE") phaseAmp = lerp(0.62, 0.08, p);
    if (state === "SILENCE") phaseAmp = lerp(0.06, 0.0, p);

    return b * phaseAmp;
  }

  getBloomStrength() {
    const state = this.getState();
    const p = this.getPhaseProgress();

    if (state === "VOID") return 0.0;
    if (state === "SEED") return p * 0.12;
    if (state === "PULSE") return lerp(0.12, 0.42, p);
    if (state === "BLOOM") return lerp(0.42, 1.0, p);
    if (state === "ORBIT") return 1.0;
    if (state === "DISSOLVE") return lerp(1.0, 0.18, p);
    if (state === "SILENCE") return lerp(0.18, 0.0, p);

    return 0.0;
  }
}

// ==========================================================
// Geometry Layer
// ==========================================================
class GeoLayer {
  constructor(opts) {
    this.name = opts.name;
    this.baseRadius = opts.baseRadius;
    this.amp1 = opts.amp1;
    this.amp2 = opts.amp2;
    this.n1Min = opts.n1Min;
    this.n1Max = opts.n1Max;
    this.n2Min = opts.n2Min;
    this.n2Max = opts.n2Max;
    this.phase1 = opts.phase1 || 0;
    this.phase2 = opts.phase2 || 0;
    this.rotSpeed = opts.rotSpeed || 0;
    this.weightBase = opts.weightBase || 1.0;
    this.alphaBase = opts.alphaBase || 100;
    this.color = opts.color || PALETTE.main;
    this.layerType = opts.layerType || "bloom";

    this.openFactor = opts.openFactor || 0.0;
    this.openBias = opts.openBias || 0.0;
    this.openAmount = 0.0;

    this.rotation = random(TWO_PI);
    this.points = [];
    this.visible = 0;
    this.n1Current = this.n1Min;
    this.n2Current = this.n2Min;
  }

  update(state, breath, bloomStrength, phaseProgress) {
    if (state === "VOID") {
      this.visible = this.layerType === "seed" ? 0.08 : 0.0;
    } else if (state === "SEED") {
      this.visible = this.layerType === "seed" ? phaseProgress : 0.0;
    } else if (state === "PULSE") {
      this.visible = this.layerType === "seed" ? 1.0 : phaseProgress * 0.38;
    } else if (state === "BLOOM") {
      this.visible = this.layerType === "orbit" ? phaseProgress * 0.70 : 0.42 + phaseProgress * 0.58;
    } else if (state === "ORBIT") {
      this.visible = 1.0;
    } else if (state === "DISSOLVE") {
      this.visible = 1.0 - phaseProgress * 0.92;
    } else if (state === "SILENCE") {
      this.visible = 0.0;
    }

    this.rotation += this.rotSpeed;

    if (this.layerType === "bloom" || this.layerType === "innerBloom") {
      const staged = stagedPetalCount(bloomStrength);
      this.n1Current = staged;
      this.n2Current = staged * 2;
    } else {
      this.n1Current = lerp(this.n1Min, this.n1Max, bloomStrength);
      this.n2Current = lerp(this.n2Min, this.n2Max, bloomStrength);
    }

    this.openAmount = 0.0;
    if (this.layerType === "bloom" || this.layerType === "innerBloom") {
      if (state === "PULSE") {
        this.openAmount = lerp(0.0, this.openBias, phaseProgress);
      } else if (state === "BLOOM") {
        this.openAmount = lerp(this.openBias, 1.0, phaseProgress);
      } else if (state === "ORBIT") {
        this.openAmount = 1.0;
      } else if (state === "DISSOLVE") {
        this.openAmount = lerp(1.0, 0.0, phaseProgress);
      }
    }

    this.points = [];
    const detail = 480;
    const dissolveAmount = state === "DISSOLVE" ? phaseProgress : 0.0;

    for (let i = 0; i <= detail; i++) {
      const thetaBase = map(i, 0, detail, 0, TWO_PI);

      let thetaWarp = 0.0;
      if (this.openFactor > 0.0) {
        let openEnv = easeInOutSine(constrain(this.openAmount, 0, 1));
        thetaWarp =
          sin(thetaBase * 0.5 + this.phase1) *
          this.openFactor *
          openEnv *
          (0.35 + bloomStrength * 0.65);
      }

      const theta = thetaBase + thetaWarp;

      const microNoise =
        (noise(
          cos(theta) * 0.9 + frameCount * 0.0035,
          sin(theta) * 0.9 + frameCount * 0.0035
        ) - 0.5) * 3.2;

      const petalNoise =
        (noise(
          theta * 0.5 + 10.0,
          frameCount * 0.002 + 20.0
        ) - 0.5) * 1.8;

      let waveA = this.amp1 * sin(this.n1Current * theta + this.phase1 + breath * 1.25);
      let waveB = this.amp2 * sin(this.n2Current * theta + this.phase2 - breath * 0.85);

      let r =
        this.baseRadius +
        waveA +
        waveB +
        breath * this.baseRadius * 0.16 +
        microNoise +
        petalNoise;

      if (this.layerType === "bloom" || this.layerType === "innerBloom") {
        let vesicaGate = pow(abs(sin(thetaBase * this.n1Current * 0.5)), 1.22);

        let vesicaMin = this.layerType === "innerBloom" ? 0.90 : 0.88;
        let vesicaMax = this.layerType === "innerBloom" ? 1.10 : 1.12;

        let vesicaShape = lerp(vesicaMin, vesicaMax, vesicaGate);
        let phiBloom = bloomStrength * this.baseRadius * (PHI - 1.0) * 0.12;

        r = (r + phiBloom) * vesicaShape;
      }

      if (this.openFactor > 0.0) {
        let petalOpen =
          sin(thetaBase * 0.5 + this.phase2) *
          this.baseRadius *
          0.055 *
          this.openAmount;
        r += petalOpen;
      }

      if (state === "BLOOM" || state === "ORBIT") {
        r *= 1.0 + bloomStrength * 0.10;
      }

      if (state === "DISSOLVE") {
        let dir = noise(theta * 1.7, frameCount * 0.01) - 0.5;
        r += dir * dissolveAmount * 8.0;
      }

      const x = r * cos(theta);
      const y = r * sin(theta);
      this.points.push(createVector(x, y));
    }
  }

  draw(state, breath, bloomStrength, phaseProgress) {
    if (this.visible <= 0.001) return;

    push();
    rotate(this.rotation);

    let alpha = this.alphaBase * this.visible;
    if (state === "DISSOLVE") {
      let dissolveHold = 1.0 - phaseProgress * 0.72;
      alpha = this.alphaBase * max(0, dissolveHold);
    }

    const c = this.color;

    noFill();

    for (let g = 0; g < 4; g++) {
      stroke(c[0], c[1], c[2], alpha * max(0, 0.06 - g * 0.01));
      strokeWeight(this.weightBase + g * 2.0);
      beginShape();
      for (let p of this.points) vertex(p.x, p.y);
      endShape(CLOSE);
    }

    stroke(c[0], c[1], c[2], alpha);
    strokeWeight(this.weightBase + breath * 0.75);
    beginShape();
    for (let p of this.points) vertex(p.x, p.y);
    endShape(CLOSE);

    stroke(c[0], c[1], c[2], alpha * 0.42);
    strokeWeight(max(0.6, this.weightBase * 0.45));
    beginShape();
    for (let p of this.points) vertex(p.x * 0.992, p.y * 0.992);
    endShape(CLOSE);

    pop();
  }
}

// ==========================================================
// Aura Field
// ==========================================================
class AuraField {
  constructor() {
    this.z = random(1000);
  }

  update(state, breath, phaseProgress) {
    this.z += 0.002;
  }

  draw(state, breath, phaseProgress) {
    push();

    let s = min(width, height);

    blendMode(ADD);
    noFill();

    let maxR = s * 0.58;
    let minR = s * 0.05;
    let steps = 140;

    for (let i = 0; i < steps; i++) {
      let t = i / (steps - 1);
      let r = lerp(minR, maxR, t);
      let falloff = pow(1.0 - t, 2.2);
      let a = (18 + breath * 12) * falloff;

      let rr = lerp(PALETTE.sub[0], PALETTE.core[0], 0.16 * (1.0 - t));
      let gg = lerp(PALETTE.sub[1], PALETTE.core[1], 0.16 * (1.0 - t));
      let bb = lerp(PALETTE.sub[2], PALETTE.core[2], 0.16 * (1.0 - t));

      stroke(rr, gg, bb, a);
      strokeWeight(2.0);
      circle(0, 0, r * 2);
    }

    blendMode(BLEND);

    noStroke();
    for (let i = 0; i < 120; i++) {
      let x = map(noise(i * 0.11, frameCount * 0.0018), 0, 1, -width * 0.45, width * 0.45);
      let y = map(noise(i * 0.17, frameCount * 0.0018 + 99), 0, 1, -height * 0.45, height * 0.45);
      let a = map(noise(i * 0.13, frameCount * 0.0022 + 199), 0, 1, 2, 10);
      fill(255, a);
      circle(x, y, random(0.8, 2.0));
    }

    pop();
  }
}

// ==========================================================
// Resonance Ring System
// ==========================================================
class ResonanceRingSystem {
  constructor() {
    this.rings = [];
    this.lastEmitFrame = -999;
  }

  update(state, breath, phaseProgress, bloomStrength) {
    if (state === "DISSOLVE" || state === "SILENCE") {
      for (let i = this.rings.length - 1; i >= 0; i--) {
        this.rings[i].update(state, breath);
        if (this.rings[i].dead) {
          this.rings.splice(i, 1);
        }
      }
      return;
    }

    let shouldEmit = false;

    if (state === "PULSE" && breath > 0.22 && frameCount - this.lastEmitFrame > 22) {
      shouldEmit = true;
    }
    if (state === "BLOOM" && breath > 0.38 && frameCount - this.lastEmitFrame > 14) {
      shouldEmit = true;
    }
    if (state === "ORBIT" && breath > 0.30 && frameCount - this.lastEmitFrame > 20) {
      shouldEmit = true;
    }

    if (shouldEmit) {
      this.emit(state, breath, bloomStrength);
      this.lastEmitFrame = frameCount;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].update(state, breath);
      if (this.rings[i].dead) {
        this.rings.splice(i, 1);
      }
    }
  }

  emit(state, breath, bloomStrength) {
    let s = min(width, height);

    const r0 = s * 0.072;
    const r1 = r0 * PHI;
    const r2 = r1 * PHI;
    const r3 = r2 * PHI;
    const r4 = r3 * PHI;

    let startR = r1 * (0.68 + breath * 0.08);

    let ringTargets = [
      r1 * 1.10,
      r2 * 1.00,
      r3 * 0.95,
      r4 * 0.72
    ];

    let endR = ringTargets[floor(random(ringTargets.length))];

    let life = 70;
    if (state === "PULSE") life = 82;
    if (state === "BLOOM") life = 68;
    if (state === "ORBIT") life = 92;

    let baseAlpha = 20;
    if (state === "BLOOM") baseAlpha = 28;
    if (state === "ORBIT") baseAlpha = 18;

    let weight = 1.4 + bloomStrength * 1.0;

    this.rings.push(
      new ResonanceRing(startR, endR, life, baseAlpha, weight, state)
    );

    if (state === "BLOOM" && random() < 0.6) {
      this.rings.push(
        new ResonanceRing(
          startR * 1.05,
          endR * 1.08,
          floor(life * 0.9),
          baseAlpha * 0.55,
          max(0.8, weight * 0.7),
          state
        )
      );
    }
  }

  draw() {
    for (let ring of this.rings) {
      ring.draw();
    }
  }
}

class ResonanceRing {
  constructor(startR, endR, life, baseAlpha, weight, state) {
    this.startR = startR;
    this.endR = endR;
    this.life = life;
    this.maxLife = life;
    this.baseAlpha = baseAlpha;
    this.weight = weight;
    this.state = state;
    this.dead = false;

    this.phase = random(TWO_PI);
    this.wobbleAmp = random(0.6, 2.2);
    this.detail = 220;
  }

  update(state, breath) {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw() {
    if (this.dead) return;

    let t = 1.0 - this.life / this.maxLife;
    let r = lerp(this.startR, this.endR, easeOutCubic(t));

    let envIn = sin(min(1, t * 1.2) * PI * 0.5);
    let envOut = pow(1.0 - t, 1.35);
    let alpha = this.baseAlpha * envIn * envOut;

    let coreMix = 0.35;
    let rr = lerp(PALETTE.sub[0], PALETTE.core[0], coreMix);
    let gg = lerp(PALETTE.sub[1], PALETTE.core[1], coreMix);
    let bb = lerp(PALETTE.sub[2], PALETTE.core[2], coreMix);

    push();
    blendMode(ADD);
    noFill();

    for (let g = 0; g < 3; g++) {
      stroke(rr, gg, bb, alpha * (0.18 - g * 0.04));
      strokeWeight(this.weight + g * 1.8);
      this.drawRingShape(r + g * 0.6, 0.35 + g * 0.18);
    }

    stroke(rr, gg, bb, alpha);
    strokeWeight(this.weight);
    this.drawRingShape(r, 1.0);

    pop();
  }

  drawRingShape(radius, irregularityScale) {
    beginShape();
    for (let i = 0; i <= this.detail; i++) {
      let a = map(i, 0, this.detail, 0, TWO_PI);

      let n =
        (noise(
          cos(a) * 0.8 + this.phase,
          sin(a) * 0.8 + frameCount * 0.004
        ) - 0.5) *
        this.wobbleAmp *
        irregularityScale;

      let rr = radius + n;
      let x = cos(a) * rr;
      let y = sin(a) * rr;
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}

// ==========================================================
// Particles
// ==========================================================
class OrbitalParticle {
  constructor() {
    this.mode = "orbit";
    this.reset(true);
  }

  reset(randomRadius = false) {
    let a = random(TWO_PI);
    let r = randomRadius
      ? random(min(width, height) * 0.06, min(width, height) * 0.34)
      : min(width, height) * 0.14;

    this.pos = createVector(cos(a) * r, sin(a) * r);
    this.vel = p5.Vector.random2D().mult(random(0.04, 0.18));
    this.size = random(1.0, 3.0);
    this.alpha = random(16, 95);
    this.life = random(120, 280);
    this.maxLife = this.life;
    this.mode = "orbit";
  }

  respawnFromPoint(x, y, mode = "outward") {
    this.pos = createVector(x, y);

    let baseAngle = atan2(y, x);

    if (mode === "outward") {
      this.vel = p5.Vector.fromAngle(baseAngle + random(-0.45, 0.45)).mult(random(0.25, 1.0));
    } else if (mode === "inward") {
      this.vel = p5.Vector.fromAngle(baseAngle + PI + random(-0.35, 0.35)).mult(random(0.18, 0.75));
    } else {
      this.vel = p5.Vector.random2D().mult(random(0.08, 0.25));
    }

    this.size = random(1.1, 3.4);
    this.alpha = random(28, 110);
    this.life = random(55, 130);
    this.maxLife = this.life;
    this.mode = mode;
  }

  update(state, breath, phaseProgress, bloomStrength) {
    const angle = atan2(this.pos.y, this.pos.x);
    const radialDir = createVector(cos(angle), sin(angle));
    const tangent = createVector(-sin(angle), cos(angle));

    let radialForce = 0;
    let tangentForce = 0.008 + bloomStrength * 0.03;

    if (this.mode === "outward") {
      radialForce = 0.028 + phaseProgress * 0.06;
      tangentForce *= 0.45;
    } else if (this.mode === "inward") {
      radialForce = -0.020 - phaseProgress * 0.045;
      tangentForce *= 0.35;
    } else {
      if (state === "BLOOM") radialForce = 0.008 + breath * 0.04;
      else if (state === "ORBIT") radialForce = 0.003;
      else if (state === "DISSOLVE") radialForce = 0.01;
      else radialForce = -0.002 + breath * 0.01;
    }

    const noiseVal = noise(this.pos.x * 0.003, this.pos.y * 0.003, frameCount * 0.003);
    const drift = p5.Vector.fromAngle(noiseVal * TWO_PI * 2.0).mult(0.01);

    this.vel.add(radialDir.mult(radialForce));
    this.vel.add(tangent.mult(tangentForce));
    this.vel.add(drift);

    if (this.mode === "outward") {
      this.vel.mult(0.991);
    } else if (this.mode === "inward") {
      this.vel.mult(0.987);
    } else {
      this.vel.mult(state === "DISSOLVE" ? 0.992 : 0.984);
    }

    this.pos.add(this.vel);
    this.life--;

    if (this.life <= 0 || this.pos.mag() > min(width, height) * 0.7) {
      this.reset(true);
    }
  }

  draw() {
    noStroke();
    fill(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], this.alpha);
    circle(this.pos.x, this.pos.y, this.size);
  }
}

// ==========================================================
// Init
// ==========================================================
function initGeoLayers() {
  const s = min(width, height);

  const r0 = s * 0.072;
  const r1 = r0 * PHI;
  const r2 = r1 * PHI;
  const r3 = r2 * PHI;

  geoLayers = [
    new GeoLayer({
      name: "seedCoreRing",
      baseRadius: r1 * 0.50,
      amp1: s * 0.0035,
      amp2: s * 0.0018,
      n1Min: 6,
      n1Max: 10,
      n2Min: 12,
      n2Max: 18,
      phase1: 0.0,
      phase2: 0.7,
      rotSpeed: 0.0007,
      weightBase: 1.0,
      alphaBase: 64,
      color: PALETTE.sub,
      layerType: "seed"
    }),

    new GeoLayer({
      name: "innerBloom",
      baseRadius: r2 * 0.46,
      amp1: s * 0.020,
      amp2: s * 0.010,
      n1Min: 8,
      n1Max: 21,
      n2Min: 16,
      n2Max: 42,
      phase1: 0.42,
      phase2: 1.18,
      rotSpeed: 0.00095,
      weightBase: 1.35,
      alphaBase: 58,
      color: PALETTE.sub,
      layerType: "innerBloom",
      openFactor: 0.14,
      openBias: 0.10
    }),

    new GeoLayer({
      name: "mainBloom",
      baseRadius: r2 * 0.70,
      amp1: s * 0.028,
      amp2: s * 0.014,
      n1Min: 8,
      n1Max: 34,
      n2Min: 16,
      n2Max: 68,
      phase1: 0.45,
      phase2: 1.25,
      rotSpeed: 0.00100,
      weightBase: 1.65,
      alphaBase: 92,
      color: PALETTE.main,
      layerType: "bloom",
      openFactor: 0.18,
      openBias: 0.13
    }),

    new GeoLayer({
      name: "outerOrbit",
      baseRadius: r3 * 0.80,
      amp1: s * 0.012,
      amp2: s * 0.007,
      n1Min: 12,
      n1Max: 18,
      n2Min: 24,
      n2Max: 36,
      phase1: 1.7,
      phase2: 0.2,
      rotSpeed: -0.00050,
      weightBase: 1.0,
      alphaBase: 64,
      color: PALETTE.outer,
      layerType: "orbit"
    })
  ];
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 160; i++) {
    particles.push(new OrbitalParticle());
  }
}

// ==========================================================
// Particle Update
// ==========================================================
function updateParticles(state, breath, phaseProgress, bloomStrength) {
  const loopBlend = scene.getLoopBlend();

  if (state === "DISSOLVE" && loopBlend < 0.85) {
    let transferCount = floor(lerp(2, 10, phaseProgress));

    for (let n = 0; n < transferCount; n++) {
      let layer = random(geoLayers);
      if (layer.points.length > 0) {
        let idx = floor(random(layer.points.length));
        let p = layer.points[idx];
        let picked = random(particles);

        let mode = random() < 0.48 ? "outward" : "inward";
        picked.respawnFromPoint(p.x, p.y, mode);
      }
    }
  }

  for (let p of particles) {
    if (loopBlend > 0.0 && p.mode !== "inward") {
      if (random() < 0.08 + loopBlend * 0.25) {
        p.mode = "inward";
      }
    }

    p.update(state, breath, phaseProgress, bloomStrength);

    if (p.mode === "inward" && p.pos.mag() < min(width, height) * 0.035) {
      p.reset(true);
    }

    p.draw();
  }
}

// ==========================================================
// Core
// ==========================================================
function drawCore(state, breath, phaseProgress, bloomStrength) {
  push();

  const s = min(width, height);
  const base = s * 0.012;
  const pulseRaw = base + breath * s * 0.022;
  const pulse = max(s * 0.012, pulseRaw);
  const maxGlow = pulse * 10.5;

  blendMode(ADD);
  noFill();

  let steps = 90;
  for (let i = 0; i < steps; i++) {
    let t = i / (steps - 1);
    let r = lerp(pulse * 1.05, maxGlow, t);
    let falloff = pow(1.0 - t, 2.8);
    let a = 24 * falloff + breath * 8 * falloff;

    let rr = lerp(PALETTE.core[0], PALETTE.sub[0], t * 0.22);
    let gg = lerp(PALETTE.core[1], PALETTE.sub[1], t * 0.22);
    let bb = lerp(PALETTE.core[2], PALETTE.sub[2], t * 0.22);

    stroke(rr, gg, bb, a);
    strokeWeight(2);
    circle(0, 0, r * 2);
  }

  blendMode(BLEND);
  noFill();

  stroke(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], 85);
  strokeWeight(1.0 + breath * 0.35);
  circle(0, 0, pulse * 4.2);

  stroke(PALETTE.sub[0], PALETTE.sub[1], PALETTE.sub[2], 42);
  strokeWeight(0.8);
  circle(0, 0, pulse * 6.0);

  stroke(PALETTE.outer[0], PALETTE.outer[1], PALETTE.outer[2], 20);
  strokeWeight(0.7);
  circle(0, 0, pulse * 9.7);

  noStroke();
  fill(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], 255);
  circle(0, 0, pulse * 1.9);

  fill(255, 255, 255, 180);
  circle(0, 0, pulse * 1.15);

  pop();
}

// ==========================================================
// Brush-light Beams
// ==========================================================
function drawRadiantBeams(state, breath, phaseProgress, bloomStrength) {
  push();

  const s = min(width, height);

  const beamCount = floor(lerp(10, 24, bloomStrength));
  const innerR = s * 0.040 + breath * s * 0.010;
  const outerR = s * 0.12 + bloomStrength * s * 0.10 + breath * s * 0.025;

  let stateStrength = 0;
  if (state === "SEED") stateStrength = phaseProgress * 0.10;
  if (state === "PULSE") stateStrength = lerp(0.12, 0.45, phaseProgress);
  if (state === "BLOOM") stateStrength = lerp(0.45, 1.00, phaseProgress);
  if (state === "ORBIT") stateStrength = 0.88;
  if (state === "DISSOLVE") stateStrength = lerp(0.60, 0.0, phaseProgress);

  if (stateStrength <= 0.001) {
    pop();
    return;
  }

  for (let i = 0; i < beamCount; i++) {
    let a = map(i, 0, beamCount, 0, TWO_PI);
    a += frameCount * 0.00035;
    a += sin(frameCount * 0.003 + i * 0.7) * 0.015;

    let localOuter = outerR * randomSeeded(i, 0.96, 1.06);
    let localInner = innerR * randomSeeded(i + 100, 0.96, 1.03);
    let alphaBase = 22 + stateStrength * 48;
    let bundleCount = floor(lerp(4, 8, bloomStrength));

    drawBrushBeam(
      a,
      localInner,
      localOuter,
      bundleCount,
      alphaBase,
      stateStrength,
      i,
      breath
    );
  }

  pop();
}

function drawBrushBeam(angleBase, innerR, outerR, bundleCount, alphaBase, stateStrength, beamIndex, breath) {
  push();
  blendMode(ADD);

  for (let k = 0; k < bundleCount; k++) {
    let t = bundleCount <= 1 ? 0 : k / (bundleCount - 1);

    let angleOffset = map(t, 0, 1, -0.018, 0.018);

    let r1 = innerR + map(t, 0, 1, -3, 3);
    let r2 = outerR + map(t, 0, 1, -14, 14);

    let wobble1 = sin(frameCount * 0.012 + beamIndex * 0.8 + k * 0.6) * 2.5;
    let wobble2 = sin(frameCount * 0.009 + beamIndex * 0.6 + k * 0.9) * 6.0;

    let a1 = angleBase + angleOffset;
    let a2 = angleBase + angleOffset + sin(frameCount * 0.004 + beamIndex * 0.5) * 0.01;

    let x1 = cos(a1) * (r1 + wobble1);
    let y1 = sin(a1) * (r1 + wobble1);
    let x2 = cos(a2) * (r2 + wobble2);
    let y2 = sin(a2) * (r2 + wobble2);

    let segments = 18;
    let prevX = x1;
    let prevY = y1;

    for (let s = 1; s <= segments; s++) {
      let u = s / segments;

      let px = lerp(x1, x2, u);
      let py = lerp(y1, y2, u);

      let normalA = atan2(y2 - y1, x2 - x1) + HALF_PI;
      let curveAmp = (1.0 - u) * 2.5 + breath * 1.8;
      let curve = sin(u * PI + frameCount * 0.01 + beamIndex * 0.4 + k) * curveAmp;

      px += cos(normalA) * curve;
      py += sin(normalA) * curve;

      let sw = lerp(2.4, 0.35, u) * (0.65 + stateStrength * 0.7);
      let a = alphaBase * pow(1.0 - u, 1.35) *
        (0.55 + randomSeeded(beamIndex * 10 + k * 3 + s, 0.85, 1.1));

      let rr = lerp(PALETTE.core[0], PALETTE.sub[0], u * 0.65);
      let gg = lerp(PALETTE.core[1], PALETTE.sub[1], u * 0.65);
      let bb = lerp(PALETTE.core[2], PALETTE.outer[2], u * 0.75);

      stroke(rr, gg, bb, a);
      strokeWeight(sw);
      line(prevX, prevY, px, py);

      prevX = px;
      prevY = py;
    }
  }

  blendMode(BLEND);
  pop();
}

// ==========================================================
// Vignette
// ==========================================================
function drawVignette() {
  noFill();
  for (let i = 0; i < 44; i++) {
    let a = map(i, 0, 43, 0, 10);
    stroke(0, 0, 0, a);
    rect(i * 2, i * 2, width - i * 4, height - i * 4);
  }
}

// ==========================================================
// Utilities
// ==========================================================
function easeInOutSine(x) {
  return -(cos(PI * x) - 1) / 2;
}

function easeInOutCubic(x) {
  return x < 0.5
    ? 4 * x * x * x
    : 1 - pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(x) {
  return 1 - pow(1 - x, 3);
}

function randomSeeded(n, minVal, maxVal) {
  let x = sin(n * 127.1 + 311.7) * 43758.5453123;
  let f = x - floor(x);
  return lerp(minVal, maxVal, f);
}

function stagedPetalCount(bloomStrength) {
  if (bloomStrength < 0.25) return 8;
  if (bloomStrength < 0.55) return 13;
  if (bloomStrength < 0.82) return 21;
  return 34;
}
