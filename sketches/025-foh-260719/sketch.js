// ==========================================================
// Flower of Harmony — 3D Motion Edition
// p5.js / WEBGL
//
// 6枚の花びらと中央円の構成を維持しながら、
// 前後運動・傾斜・輪郭のねじれ・高速回転を加えた
// 30秒シームレスループ。
// ==========================================================

// ----------------------------------------------------------
// 基本設定
// ----------------------------------------------------------

const FPS = 30;
const DURATION = 30;
const TOTAL_FRAMES = FPS * DURATION;
const DEBUG = false;

// 黒背景・白線
const PALETTE = {
  background: [0, 0, 0],
  main: [255, 255, 255],
  middle: [255, 255, 255],
  soft: [255, 255, 255]
};

// ----------------------------------------------------------
// 図形設定
// ----------------------------------------------------------

const FLOWER = {
  // 画面の短辺を基準とした全体サイズ
  scale: 0.84,

  // 中央円の半径
  centerR: 0.170,

  // 花びらの半長軸
  petalA: 0.280,

  // 花びらの半短軸
  petalB: 0.110,

  // 中心から花びら中心までの距離
  offset: 0.250,

  // 花びら輪郭の分割数
  points: 180,

  // 基本線幅
  lineWeight: 4.2
};

// ----------------------------------------------------------
// 立体モーション設定
// ----------------------------------------------------------

const MOTION = {
  // 30秒で8回転
  // 数値を増やすと回転速度が上がる
  totalTurns: 8,

  // 花びら全体の前後移動量
  depthTravel: 54,

  // 花びら輪郭のZ方向へのねじれ量
  contourDepth: 16,

  // X軸方向の最大傾斜角
  maxTiltX: 27,

  // Y軸方向の最大傾斜角
  maxTiltY: 34,

  // カメラの移動量
  cameraX: 58,
  cameraY: 34,

  // カメラと図形の距離
  cameraZ: 760
};

let paused = false;
let restartOffset = 0;

// ==========================================================
// 初期設定
// ==========================================================

function setup() {
  createCanvas(960, 540, WEBGL);

  pixelDensity(1);
  frameRate(FPS);

  strokeCap(ROUND);
  strokeJoin(ROUND);
}

// ==========================================================
// メイン描画
// ==========================================================

function draw() {
  background(
    PALETTE.background[0],
    PALETTE.background[1],
    PALETTE.background[2]
  );

  // Rキーでリスタートした位置を差し引く
  const localFrame = frameCount - restartOffset - 1;

  // 30秒ごとに0へ戻る
  const frameInLoop =
    ((localFrame % TOTAL_FRAMES) + TOTAL_FRAMES) %
    TOTAL_FRAMES;

  // p5.jsの予約済み関数名「phase」は使用しない
  // 0以上1未満のループ進行度
  const loopProgress = frameInLoop / TOTAL_FRAMES;

  // 0〜2πのループ角度
  const loopAngle = TWO_PI * loopProgress;

  // 開始時と終了時に0になる立体運動量
  // 中間地点で最大になる
  const motionEnvelope =
    sq(sin(PI * loopProgress));

  // 回転はゆっくり始まり、中盤で高速になり、
  // 終了時に滑らかに減速する
  const spinProgress =
    smootherstep(loopProgress);

  // 30秒で8回転する
  const wholeRotation =
    -TWO_PI *
    MOTION.totalTurns *
    spinProgress;

  // --------------------------------------------------------
  // カメラの立体移動
  // --------------------------------------------------------

  const camX =
    MOTION.cameraX *
    sin(loopAngle) *
    motionEnvelope;

  const camY =
    MOTION.cameraY *
    sin(loopAngle * 2.0) *
    motionEnvelope;

  const camZ =
    MOTION.cameraZ +
    24 *
    cos(loopAngle) *
    motionEnvelope;

  perspective(
    PI / 3.1,
    width / height,
    10,
    4000
  );

  camera(
    camX,
    camY,
    camZ,
    0,
    0,
    0,
    0,
    1,
    0
  );

  // --------------------------------------------------------
  // 図形全体の呼吸
  // --------------------------------------------------------

  const breathing =
    1.0 +
    0.025 *
    sin(loopAngle * 3.0) *
    motionEnvelope;

  push();

  scale(breathing);

  // 図形全体を高速回転
  rotateZ(wholeRotation);

  // 6枚の花びら
  drawSixPetals(
    loopAngle,
    motionEnvelope
  );

  // 中央円
  drawCenterRing(
    loopAngle,
    motionEnvelope
  );

  pop();

  // デバッグ表示
  if (DEBUG) {
    drawDebug(
      loopProgress,
      motionEnvelope
    );
  }
}

// ==========================================================
// 6枚の花びら
// ==========================================================

function drawSixPetals(
  loopAngle,
  motionEnvelope
) {
  const baseSize =
    min(width, height) *
    FLOWER.scale;

  const petalLongRadius =
    baseSize *
    FLOWER.petalA;

  const petalShortRadius =
    baseSize *
    FLOWER.petalB;

  const petalOffset =
    baseSize *
    FLOWER.offset;

  for (let i = 0; i < 6; i++) {
    // 6枚を60度間隔で配置
    const baseAngle =
      (TWO_PI * i) / 6;

    // 隣接する花びらに時間差を与える
    const petalMotionAngle =
      loopAngle * 2.0 +
      (TWO_PI * i) / 6;

    // 花びらの前後移動
    const zTravel =
      MOTION.depthTravel *
      sin(petalMotionAngle) *
      motionEnvelope;

    // X軸方向の傾斜
    const tiltX =
      radians(MOTION.maxTiltX) *
      cos(
        loopAngle +
        i * PI / 3
      ) *
      motionEnvelope;

    // Y軸方向の傾斜
    const tiltY =
      radians(MOTION.maxTiltY) *
      sin(petalMotionAngle) *
      motionEnvelope;

    // 花びら輪郭のねじれ
    const contourDepth =
      MOTION.contourDepth *
      sin(
        loopAngle +
        i * TWO_PI / 6
      ) *
      motionEnvelope;

    push();

    // 花びらを放射状に配置
    rotateZ(baseAngle);

    // 中心から外側へ移動し、
    // 同時に手前・奥へ動かす
    translate(
      petalOffset,
      0,
      zTravel
    );

    // 花びらの面を立体的に傾ける
    rotateX(tiltX);
    rotateY(tiltY);

    drawPetalVolume(
      petalLongRadius,
      petalShortRadius,
      contourDepth,
      loopAngle,
      i,
      motionEnvelope
    );

    pop();
  }
}

// ==========================================================
// 花びらの立体的な厚み
// ==========================================================

function drawPetalVolume(
  petalLongRadius,
  petalShortRadius,
  contourDepth,
  loopAngle,
  petalIndex,
  motionEnvelope
) {
  // 白線をZ方向へ重ねて、
  // 発光しているような薄い厚みを作る
  const layers = 5;

  for (
    let layer = 0;
    layer < layers;
    layer++
  ) {
    const layerPosition =
      layer -
      (layers - 1) / 2;

    const depthOffset =
      layerPosition * 1.8;

    const centerDistance =
      abs(layerPosition) /
      ((layers - 1) / 2);

    // 中央の線を濃くし、
    // 外側の重複線を薄くする
    const alpha =
      lerp(
        225,
        45,
        centerDistance
      );

    const weight =
      lerp(
        FLOWER.lineWeight,
        FLOWER.lineWeight * 0.52,
        centerDistance
      );

    stroke(
      PALETTE.main[0],
      PALETTE.main[1],
      PALETTE.main[2],
      alpha
    );

    strokeWeight(weight);
    noFill();

    push();

    translate(
      0,
      0,
      depthOffset
    );

    drawPetalContour(
      petalLongRadius,
      petalShortRadius,
      contourDepth,
      loopAngle,
      petalIndex,
      motionEnvelope
    );

    pop();
  }
}

// ==========================================================
// 花びらの非平面輪郭
// ==========================================================

function drawPetalContour(
  petalLongRadius,
  petalShortRadius,
  contourDepth,
  loopAngle,
  petalIndex,
  motionEnvelope
) {
  beginShape();

  for (
    let pointIndex = 0;
    pointIndex <= FLOWER.points;
    pointIndex++
  ) {
    const contourAngle =
      (TWO_PI * pointIndex) /
      FLOWER.points;

    // 楕円のXY座標
    const x =
      petalLongRadius *
      cos(contourAngle);

    const y =
      petalShortRadius *
      sin(contourAngle);

    // 輪郭をZ方向へ波打たせ、
    // 花びら自体にねじれを与える
    const z =
      contourDepth *
        sin(
          contourAngle * 2.0 +
          loopAngle * 1.5 +
          petalIndex * PI / 3
        ) +
      2.5 *
        sin(
          contourAngle * 3.0 -
          loopAngle +
          petalIndex
        ) *
        motionEnvelope;

    vertex(x, y, z);
  }

  endShape(CLOSE);
}

// ==========================================================
// 中央円
// ==========================================================

function drawCenterRing(
  loopAngle,
  motionEnvelope
) {
  const baseSize =
    min(width, height) *
    FLOWER.scale;

  // 中央円の呼吸
  const pulse =
    1.0 +
    0.025 *
    sin(
      loopAngle * 3.0 +
      HALF_PI
    ) *
    motionEnvelope;

  const radius =
    baseSize *
    FLOWER.centerR *
    pulse;

  // 中央円も複数の線を重ねて
  // わずかな厚みを与える
  const layers = 7;

  for (
    let layer = 0;
    layer < layers;
    layer++
  ) {
    const layerPosition =
      layer -
      (layers - 1) / 2;

    const depthOffset =
      layerPosition * 1.55;

    const centerDistance =
      abs(layerPosition) /
      ((layers - 1) / 2);

    const alpha =
      lerp(
        235,
        35,
        centerDistance
      );

    const weight =
      lerp(
        FLOWER.lineWeight,
        FLOWER.lineWeight * 0.46,
        centerDistance
      );

    stroke(
      PALETTE.main[0],
      PALETTE.main[1],
      PALETTE.main[2],
      alpha
    );

    strokeWeight(weight);
    noFill();

    push();

    // 中央円を花びらよりわずかに手前に置く
    translate(
      0,
      0,
      7 + depthOffset
    );

    beginShape();

    for (
      let pointIndex = 0;
      pointIndex <= 180;
      pointIndex++
    ) {
      const circleAngle =
        (TWO_PI * pointIndex) /
        180;

      // 中央円にも小さなZ方向変形を与える
      const z =
        2.8 *
        sin(
          circleAngle * 2.0 -
          loopAngle * 2.0
        ) *
        motionEnvelope;

      vertex(
        radius *
          cos(circleAngle),

        radius *
          sin(circleAngle),

        z
      );
    }

    endShape(CLOSE);

    pop();
  }
}

// ==========================================================
// キーボード操作
// ==========================================================

function keyPressed() {
  // Pまたはスペース：
  // 一時停止・再開
  if (
    key === "p" ||
    key === "P" ||
    key === " "
  ) {
    paused = !paused;

    if (paused) {
      noLoop();
    } else {
      loop();
    }
  }

  // R：
  // ループを最初から再生
  if (
    key === "r" ||
    key === "R"
  ) {
    restartOffset = frameCount - 1;

    if (paused) {
      paused = false;
      loop();
    }
  }

  // S：
  // 現在の画面をPNG保存
  if (
    key === "s" ||
    key === "S"
  ) {
    saveCanvas(
      "flower-of-harmony-3d",
      "png"
    );
  }
}

// ==========================================================
// 補助関数
// ==========================================================

// 0から1へ滑らかに変化する。
// 始点と終点の速度が0になるため、
// 回転開始と終了が自然になる。
function smootherstep(x) {
  const normalizedX =
    constrain(x, 0, 1);

  return (
    normalizedX *
    normalizedX *
    normalizedX *
    (
      normalizedX *
      (
        normalizedX * 6 -
        15
      ) +
      10
    )
  );
}

// ==========================================================
// デバッグ表示
// ==========================================================

function drawDebug(
  loopProgress,
  motionEnvelope
) {
  push();

  resetMatrix();

  translate(
    -width / 2,
    -height / 2
  );

  noStroke();

  fill(255);

  textSize(14);
  textAlign(LEFT, TOP);

  text(
    "time: " +
      nf(
        loopProgress * DURATION,
        2,
        2
      ) +
      " sec\n" +
      "motion: " +
      nf(
        motionEnvelope,
        1,
        3
      ),
    14,
    14
  );

  pop();
}
