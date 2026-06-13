// ==========================================================
// MA - Advanced Fixed Final Version
// smooth radial glow / natural circle color transition
// fixed black center artifact
// ==========================================================

let scene;
let particles = [];
let geoLayers = [];
let auraField;

const PALETTE = {
  bg: [3, 4, 8],
  core: [238, 246, 255],
  main: [128, 112, 255],
  sub: [176, 150, 255],
  outer: [96, 135, 255]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  angleMode(RADIANS);
  smooth();
  strokeCap(ROUND);
  strokeJoin(ROUND);

  scene = new SceneController(72.0);
  auraField = new AuraField();

  initGeoLayers();
  initParticles();

  background(...PALETTE.bg);
}

function draw() {
  scene.update();

  // 背景フェードを少し弱めて残光を自然にする
  noStroke();
  fill(PALETTE.bg[0], PALETTE.bg[1], PALETTE.bg[2], 12);
  rect(0, 0, width, height);

  translate(width / 2, height / 2);

  const state = scene.getState();
  const phaseProgress = scene.getPhaseProgress();
  const breath = scene.getBreath();
  const bloomStrength = scene.getBloomStrength();

  auraField.update(state, breath, phaseProgress);
  auraField.draw(state, breath, phaseProgress);

  for (let layer of geoLayers) {
    layer.update(state, breath, bloomStrength, phaseProgress);
    layer.draw(state, breath, bloomStrength, phaseProgress);
  }

  updateParticles(state, breath, phaseProgress, bloomStrength);

  drawRadiantBeams(state, breath, phaseProgress, bloomStrength);
  drawCore(state, breath, phaseProgress, bloomStrength);

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
  constructor(cycleDurationSec = 72.0) {
    this.cycleDuration = cycleDurationSec;
    this.startMillis = millis();

    this.phases = [
      { name: "VOID", start: 0.00, end: 0.17 },
      { name: "SEED", start: 0.17, end: 0.33 },
      { name: "PULSE", start: 0.33, end: 0.56 },
      { name: "BLOOM", start: 0.56, end: 0.79 },
      { name: "ORBIT", start: 0.79, end: 0.91 },
      { name: "DISSOLVE", start: 0.91, end: 1.00 }
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

  getBreath() {
    const t = (millis() - this.startMillis) * 0.001;
    const cycle = (t % 12.0) / 12.0;

    let b = 0;

    if (cycle < 0.32) {
      let x = map(cycle, 0.0, 0.32, 0, 1);
      b = easeInOutSine(x);
    } else if (cycle < 0.45) {
      b = 1.0;
    } else if (cycle < 0.88) {
      let x = map(cycle, 0.45, 0.88, 1, 0);
      b = easeInOutCubic(x);
    } else {
      let x = map(cycle, 0.88, 1.0, 0, 1);
      b = 0.05 * (1.0 - easeInOutSine(x));
    }

    const state = this.getState();
    const p = this.getPhaseProgress();

    let phaseAmp = 0.05;
    if (state === "VOID") phaseAmp = 0.03;
    if (state === "SEED") phaseAmp = lerp(0.06, 0.20, p);
    if (state === "PULSE") phaseAmp = lerp(0.25, 0.58, p);
    if (state === "BLOOM") phaseAmp = lerp(0.62, 1.00, p);
    if (state === "ORBIT") phaseAmp = 0.92;
    if (state === "DISSOLVE") phaseAmp = lerp(0.70, 0.06, p);

    return b * phaseAmp;
  }

  getBloomStrength() {
    const state = this.getState();
    const p = this.getPhaseProgress();

    if (state === "VOID") return 0.0;
    if (state === "SEED") return p * 0.15;
    if (state === "PULSE") return lerp(0.15, 0.45, p);
    if (state === "BLOOM") return lerp(0.45, 1.0, p);
    if (state === "ORBIT") return 1.0;
    if (state === "DISSOLVE") return lerp(1.0, 0.0, p);

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
    this.rotation = random(TWO_PI);
    this.points = [];
    this.visible = 0;
    this.n1Current = this.n1Min;
    this.n2Current = this.n2Min;
  }

  update(state, breath, bloomStrength, phaseProgress) {
    if (state === "VOID") this.visible = 0.0;
    else if (state === "SEED") this.visible = this.layerType === "seed" ? phaseProgress : 0.0;
    else if (state === "PULSE") this.visible = this.layerType === "seed" ? 1.0 : phaseProgress * 0.40;
    else if (state === "BLOOM") this.visible = this.layerType === "orbit" ? phaseProgress * 0.75 : 0.45 + phaseProgress * 0.55;
    else if (state === "ORBIT") this.visible = 1.0;
    else if (state === "DISSOLVE") this.visible = 1.0 - phaseProgress;

    this.rotation += this.rotSpeed;

    this.n1Current = lerp(this.n1Min, this.n1Max, bloomStrength);
    this.n2Current = lerp(this.n2Min, this.n2Max, bloomStrength);

    this.points = [];
    const detail = 480;
    const dissolveAmount = state === "DISSOLVE" ? phaseProgress : 0.0;

    for (let i = 0; i <= detail; i++) {
      const theta = map(i, 0, detail, 0, TWO_PI);

      const microNoise =
        (noise(
          cos(theta) * 0.9 + frameCount * 0.0035,
          sin(theta) * 0.9 + frameCount * 0.0035
        ) - 0.5) * 3.5;

      const petalNoise =
        (noise(
          theta * 0.5 + 10.0,
          frameCount * 0.002 + 20.0
        ) - 0.5) * 2.0;

      let r =
        this.baseRadius +
        this.amp1 * sin(this.n1Current * theta + this.phase1 + breath * 1.25) +
        this.amp2 * sin(this.n2Current * theta + this.phase2 - breath * 0.85) +
        breath * this.baseRadius * 0.16 +
        microNoise +
        petalNoise;

      if (state === "BLOOM" || state === "ORBIT") {
        r *= 1.0 + bloomStrength * 0.12;
      }

      if (state === "DISSOLVE") {
        let dir = noise(theta * 1.7, frameCount * 0.01) - 0.5;
        r += dir * dissolveAmount * 22.0;
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

    const c = this.color;
    const alpha = this.alphaBase * this.visible;

    noFill();
    for (let g = 0; g < 4; g++) {
      stroke(c[0], c[1], c[2], alpha * max(0, 0.06 - g * 0.01));
      strokeWeight(this.weightBase + g * 2.0);
      beginShape();
      for (let p of this.points) vertex(p.x, p.y);
      endShape(CLOSE);
    }

    stroke(c[0], c[1], c[2], alpha);
    strokeWeight(this.weightBase + breath * 0.8);
    beginShape();
    for (let p of this.points) vertex(p.x, p.y);
    endShape(CLOSE);

    stroke(c[0], c[1], c[2], alpha * 0.45);
    strokeWeight(max(0.6, this.weightBase * 0.45));
    beginShape();
    for (let p of this.points) {
      vertex(p.x * 0.992, p.y * 0.992);
    }
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

      let rr = lerp(PALETTE.sub[0], PALETTE.core[0], 0.18 * (1.0 - t));
      let gg = lerp(PALETTE.sub[1], PALETTE.core[1], 0.18 * (1.0 - t));
      let bb = lerp(PALETTE.sub[2], PALETTE.core[2], 0.18 * (1.0 - t));

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
// Particle
// ==========================================================
class OrbitalParticle {
  constructor() {
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
  }

  respawnFromPoint(x, y) {
    this.pos = createVector(x, y);
    let ang = atan2(y, x) + random(-0.5, 0.5);
    this.vel = p5.Vector.fromAngle(ang).mult(random(0.2, 1.0));
    this.size = random(1.2, 3.6);
    this.alpha = random(30, 110);
    this.life = random(50, 120);
    this.maxLife = this.life;
  }

  update(state, breath, phaseProgress, bloomStrength) {
    const angle = atan2(this.pos.y, this.pos.x);
    const radialDir = createVector(cos(angle), sin(angle));
    const tangent = createVector(-sin(angle), cos(angle));

    let radialForce = 0;
    if (state === "BLOOM") radialForce = 0.008 + breath * 0.04;
    else if (state === "ORBIT") radialForce = 0.003;
    else if (state === "DISSOLVE") radialForce = 0.03 + phaseProgress * 0.08;
    else radialForce = -0.002 + breath * 0.01;

    let tangentForce = 0.008 + bloomStrength * 0.03;

    const noiseVal = noise(this.pos.x * 0.003, this.pos.y * 0.003, frameCount * 0.003);
    const drift = p5.Vector.fromAngle(noiseVal * TWO_PI * 2.0).mult(0.01);

    this.vel.add(radialDir.mult(radialForce));
    this.vel.add(tangent.mult(tangentForce));
    this.vel.add(drift);
    this.vel.mult(state === "DISSOLVE" ? 0.992 : 0.984);

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

  geoLayers = [
    new GeoLayer({
      name: "seedCoreRing",
      baseRadius: s * 0.052,
      amp1: s * 0.004,
      amp2: s * 0.002,
      n1Min: 6,
      n1Max: 10,
      n2Min: 12,
      n2Max: 18,
      phase1: 0.0,
      phase2: 0.7,
      rotSpeed: 0.0009,
      weightBase: 1.1,
      alphaBase: 78,
      color: PALETTE.sub,
      layerType: "seed"
    }),

    new GeoLayer({
      name: "mainBloom",
      baseRadius: s * 0.185,
      amp1: s * 0.038,
      amp2: s * 0.020,
      n1Min: 8,
      n1Max: 12,
      n2Min: 16,
      n2Max: 24,
      phase1: 0.45,
      phase2: 1.25,
      rotSpeed: 0.00115,
      weightBase: 1.9,
      alphaBase: 118,
      color: PALETTE.main,
      layerType: "bloom"
    }),

    new GeoLayer({
      name: "outerOrbit",
      baseRadius: s * 0.315,
      amp1: s * 0.017,
      amp2: s * 0.010,
      n1Min: 12,
      n1Max: 18,
      n2Min: 24,
      n2Max: 36,
      phase1: 1.7,
      phase2: 0.2,
      rotSpeed: -0.00062,
      weightBase: 1.1,
      alphaBase: 76,
      color: PALETTE.outer,
      layerType: "orbit"
    })
  ];
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 140; i++) {
    particles.push(new OrbitalParticle());
  }
}

// ==========================================================
// Draw Helpers
// ==========================================================
function updateParticles(state, breath, phaseProgress, bloomStrength) {
  if (state === "DISSOLVE" && frameCount % 3 === 0) {
    for (let layer of geoLayers) {
      if (random() < 0.28 && layer.points.length > 0) {
        let idx = floor(random(layer.points.length));
        let p = layer.points[idx];
        let picked = random(particles);
        picked.respawnFromPoint(p.x, p.y);
      }
    }
  }

  for (let p of particles) {
    p.update(state, breath, phaseProgress, bloomStrength);
    p.draw();
  }
}

function drawCore(state, breath, phaseProgress, bloomStrength) {
  push();

  const s = min(width, height);

  const base = s * 0.012;
  const pulseRaw = base + breath * s * 0.022;
  const pulse = max(s * 0.012, pulseRaw);
  const maxGlow = pulse * 10.5;

  // 1) 外側グロー
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

  // 2) 外側リング（中心に近すぎない位置）
  blendMode(BLEND);
  noFill();

  stroke(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], 85);
  strokeWeight(1.0 + breath * 0.35);
  circle(0, 0, pulse * 4.2);

  stroke(PALETTE.sub[0], PALETTE.sub[1], PALETTE.sub[2], 42);
  strokeWeight(0.8);
  circle(0, 0, pulse * 6.0);

  // 3) 最後に中心を完全上書きして黒残りを消す
  noStroke();
  fill(PALETTE.core[0], PALETTE.core[1], PALETTE.core[2], 255);
  circle(0, 0, pulse * 1.9);

  fill(255, 255, 255, 180);
  circle(0, 0, pulse * 1.15);

  pop();
}

function drawRadiantBeams(state, breath, phaseProgress, bloomStrength) {
  push();

  const s = min(width, height);
  const beamCount = floor(lerp(8, 20, bloomStrength));
  const innerR = s * 0.038 + breath * s * 0.010;
  const outerR = s * 0.11 + bloomStrength * s * 0.085 + breath * s * 0.022;

  let stateStrength = 0;
  if (state === "SEED") stateStrength = phaseProgress * 0.15;
  if (state === "PULSE") stateStrength = lerp(0.15, 0.50, phaseProgress);
  if (state === "BLOOM") stateStrength = lerp(0.50, 1.00, phaseProgress);
  if (state === "ORBIT") stateStrength = 0.92;
  if (state === "DISSOLVE") stateStrength = lerp(0.70, 0.0, phaseProgress);

  const beamAlpha = 55 * stateStrength;
  const beamWeight = 1.6 + bloomStrength * 2.8 + breath * 0.8;

  for (let j = 0; j < 2; j++) {
    stroke(
      PALETTE.core[0],
      PALETTE.core[1],
      PALETTE.core[2],
      j === 0 ? beamAlpha * 0.9 : beamAlpha * 0.28
    );
    strokeWeight(j === 0 ? beamWeight : beamWeight * 2.6);

    for (let i = 0; i < beamCount; i++) {
      let a = map(i, 0, beamCount, 0, TWO_PI);
      a += frameCount * 0.0004 * (j === 0 ? 1 : -1);

      let wobble = sin(frameCount * 0.01 + i * 0.7) * s * 0.003;
      let x1 = cos(a) * (innerR + wobble);
      let y1 = sin(a) * (innerR + wobble);
      let x2 = cos(a) * (outerR + wobble);
      let y2 = sin(a) * (outerR + wobble);

      line(x1, y1, x2, y2);
    }
  }

  pop();
}

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
