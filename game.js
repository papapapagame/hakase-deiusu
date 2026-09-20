(function () {
  "use strict";

  const W = 960;
  const H = 540;
  const APP_VERSION = "1.29";
  const BEST_KEY = "hakaseDeusBest";
  const BEST_NORMAL_KEY = "hakaseDeusBestNormal";
  const BEST_CHEAT_KEY = "hakaseDeusBestCheat";
  const SFX_KEY = "hakaseDeusSfx";
  const PAD_MODE_KEY = "hakaseDeusPadMode";
  const PAD_SIZE_KEY = "hakaseDeusPadSize";
  const EASY_KEY = "hakaseDeusEasy";
  const DEBUG_TAPS_NEEDED = 10;
  const SHOT_INTERVAL = 0.13;
  const LASER_INTERVAL = SHOT_INTERVAL / 1.2;
  const DROP_CHANCE_SMALL = 0.22;
  const DROP_CHANCE_MID = 0.42;
  const MAX_SPEED = 5;
  const MAX_OPTION = 2;
  const MAX_MISSILE = 2;
  const MAX_LASER = 3;
  const MAX_DOUBLE = 3;
  const MAX_HOMING = 5;
  const MAX_LIVES = 3;
  const SHIELD_HITS = 3;
  const BGM_VOL = 0.42;
  const BOSS_WARN_DUR = 2.5;
  const BGM_FADE_DUR = 1.8;
  const DOUBLE_SPREAD_EVERY = [
    0, 0,
    Math.round(3 / SHOT_INTERVAL),
    Math.round(2 / SHOT_INTERVAL),
    Math.round(1 / SHOT_INTERVAL),
    Math.max(2, Math.round(0.5 / SHOT_INTERVAL)),
  ];
  const DOUBLE_SPREAD_ANG = 0.16;
  const CHEAT_SEQ = ["U", "U", "D", "D", "L", "R", "L", "R", "B", "B"];
  const HYPER_LASER_LV = 5;
  const HYPER_DOUBLE_LV = 5;
  const DOUBLE_UP_ANG = Math.atan2(-320, 460);
  const PLAYER_R = 22;
  const HIT_R = 7;

  const POWER_LABEL = {
    speed: "SPEED UP",
    missile: "MISSILE",
    double: "DOUBLE",
    laser: "LASER",
    option: "OPTION",
    shield: "SHIELD",
    homing: "HOMING",
  };
  const POWER_COLOR = {
    speed: "#4aa3ff",
    missile: "#6adf6a",
    double: "#ffb14a",
    laser: "#5ef0ff",
    option: "#ffe14a",
    shield: "#ff7ab8",
    homing: "#c77dff",
  };

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const app = document.getElementById("app");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score-value");
  const bestEl = document.getElementById("best-value");
  const titleBestEl = document.getElementById("title-best");
  const titleBestCheatEl = document.getElementById("title-best-cheat");
  const stageEl = document.getElementById("stage-value");
  const livesRow = document.getElementById("lives-row");
  const livesBox = document.getElementById("lives-box");
  const railLeft = document.getElementById("rail-left");
  const stickLayer = document.getElementById("stick-layer");
  const stickBase = document.getElementById("stick-base");
  const stickKnob = document.getElementById("stick-knob");
  const dpad = document.getElementById("dpad");
  const dpadBtns = dpad ? Array.prototype.slice.call(dpad.querySelectorAll(".dpad-btn")) : [];
  const titleScreen = document.getElementById("title-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const resultTitle = document.getElementById("result-title");
  const finalScoreEl = document.getElementById("final-score");
  const newBestEl = document.getElementById("new-best");
  const sfxToggle = document.getElementById("toggle-sfx");
  const brandI = document.getElementById("brand-i");
  const btnDebugTitle = document.getElementById("btn-debug-title");
  const debugBadge = document.getElementById("debug-badge");
  const btnBomb = document.getElementById("btn-bomb");
  const btnPause = document.getElementById("btn-pause");
  const pauseScreen = document.getElementById("pause-screen");
  const cheatFlashEl = document.getElementById("cheat-flash");
  const bombCountEl = document.getElementById("bomb-count");
  const powerSlots = Array.prototype.slice.call(document.querySelectorAll(".power-slot"));

  let state = "title";
  let score = 0;
  let bestNormal = Number(localStorage.getItem(BEST_NORMAL_KEY));
  if (!isFinite(bestNormal) || bestNormal < 0) bestNormal = 0;
  if (localStorage.getItem(BEST_NORMAL_KEY) == null) {
    const oldBest = Number(localStorage.getItem(BEST_KEY) || 0);
    bestNormal = isFinite(oldBest) && oldBest > 0 ? oldBest : 0;
    if (bestNormal > 0) localStorage.setItem(BEST_NORMAL_KEY, String(bestNormal));
  }
  let bestCheat = Number(localStorage.getItem(BEST_CHEAT_KEY) || 0);
  if (!isFinite(bestCheat) || bestCheat < 0) bestCheat = 0;
  let sfxOn = localStorage.getItem(SFX_KEY) !== "0";
  let lives = MAX_LIVES;
  let controlMode = localStorage.getItem(PAD_MODE_KEY) === "dpad" ? "dpad" : "stick";
  let padSize = localStorage.getItem(PAD_SIZE_KEY) || "s";
  if (padSize !== "s" && padSize !== "m" && padSize !== "l") padSize = "s";
  let easyMode = localStorage.getItem(EASY_KEY) === "1";
  let time = 0;
  let lastT = 0;
  let waveI = 0;
  let spawnAcc = 0;
  let boss = null;
  let cleared = false;
  let flash = 0;
  let audioCtx = null;
  let bgm = null;
  let bgmSrc = "";
  let bgmFade = 0;
  let bgmFadeMax = 1;
  let bgmRetryT = 0;
  let bgmNeedGesture = false;
  let bossWarn = null;
  let bossTheme = false;
  let extraIntro = null;
  let extraNextT = 0;
  let eid = 1;
  let stage = 1;
  let loopN = 1;
  let extraMode = false;
  let extraBossI = 0;
  let stageClearT = 0;
  let banner = "";
  let bannerT = 0;
  let debugMode = false;
  let debugTapCount = 0;
  let paused = false;
  let cheatUsed = false;
  let cheatSeqI = 0;
  let cheatLastDir = "";
  const hazards = [];
  const EXTRA_KINDS = ["deus", "volcano", "idol", "final"];

  const keys = Object.create(null);
  const stick = { active: false, id: null, ox: 0, oy: 0, nx: 0, ny: 0, scale: 40 };
  const player = makePlayer();
  const bullets = [];
  const eBullets = [];
  const enemies = [];
  const items = [];
  const shocks = [];
  const particles = [];
  const floats = [];
  const stars = [];
  const hills = [];

  for (let i = 0; i < 70; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      z: 0.35 + Math.random() * 1.4,
      r: 0.6 + Math.random() * 1.6,
    });
  }
  for (let i = 0; i < 8; i++) {
    hills.push({ x: i * 180, w: 160 + Math.random() * 80, h: 40 + Math.random() * 50 });
  }

  const WAVES_1 = [
    { t: 5, fn: function () { spawnGruntLine(160, 5, 38); } },
    { t: 8, fn: function () { spawnGruntLine(380, 5, 38); } },
    { t: 12, fn: function () { spawnSine(240, 5); } },
    { t: 16, fn: function () { spawnGruntLine(120, 4, 42); spawnGruntLine(420, 4, 42); } },
    { t: 21, fn: function () { spawnDivers(3); } },
    { t: 26, fn: function () { spawnTurrets(2); } },
    { t: 32, fn: function () { spawnSine(180, 4); } },
    { t: 38, fn: function () { spawnTanks(1); spawnGruntLine(220, 4, 40); } },
    { t: 44, fn: function () { spawnSpreads(1); } },
    { t: 50, fn: function () { spawnDivers(3); } },
    { t: 56, fn: function () { spawnMid(); } },
    { t: 64, fn: function () { spawnGruntLine(150, 5, 36); spawnGruntLine(390, 5, 36); } },
    { t: 72, fn: function () { spawnTurrets(2); spawnSine(260, 4); } },
    { t: 80, fn: function () { spawnSpreads(1); spawnTanks(1); } },
    { t: 90, fn: function () { startBossWarning("deus"); } },
  ];
  const WAVES_2 = [
    { t: 5, fn: function () { spawnBirds(4); } },
    { t: 12, fn: function () { spawnLavaTurrets(2); spawnRocks(3); } },
    { t: 20, fn: function () { spawnBirds(5); } },
    { t: 28, fn: function () { spawnLavaTurrets(3); } },
    { t: 36, fn: function () { spawnRocks(4); spawnTanks(1); } },
    { t: 46, fn: function () { spawnMid(); spawnBirds(3); } },
    { t: 58, fn: function () { spawnLavaTurrets(2); spawnRocks(3); } },
    { t: 68, fn: function () { spawnBirds(4); spawnSpreads(1); } },
    { t: 80, fn: function () { startBossWarning("volcano"); } },
  ];
  const WAVES_3 = [
    { t: 6, fn: function () { spawnSine(200, 4); spawnPillars(2); } },
    { t: 14, fn: function () { spawnMirrors(2); } },
    { t: 22, fn: function () { spawnSine(340, 4); spawnTurrets(2); } },
    { t: 32, fn: function () { spawnPillars(2); spawnMirrors(2); } },
    { t: 42, fn: function () { spawnSine(240, 5); } },
    { t: 52, fn: function () { spawnMid(); spawnPillars(1); } },
    { t: 64, fn: function () { spawnMirrors(3); spawnSine(180, 3); } },
    { t: 76, fn: function () { spawnTurrets(2); spawnPillars(2); } },
    { t: 88, fn: function () { startBossWarning("idol"); } },
  ];
  const WAVES_4 = [
    { t: 5, fn: function () { spawnGruntLine(160, 4, 40); spawnGruntLine(380, 4, 40); } },
    { t: 14, fn: function () { spawnSpreads(1); spawnDivers(3); } },
    { t: 24, fn: function () { spawnMid(); } },
    { t: 36, fn: function () { spawnTanks(1); spawnSine(250, 4); } },
    { t: 48, fn: function () { spawnSpreads(1); spawnTurrets(2); } },
    { t: 58, fn: function () { spawnMid(); } },
    { t: 70, fn: function () { spawnDivers(4); spawnGruntLine(270, 5, 34); } },
    { t: 82, fn: function () { startBossWarning("final"); } },
  ];
  const WAVES_EXTRA = [];
  const STAGE_WAVES = [null, WAVES_1, WAVES_2, WAVES_3, WAVES_4];
  const STAGE_NAME = [null, "1面 夜の荒野", "2面 溶岩回廊", "3面 地下遺跡", "4面 でぃうすコア"];

  function makePlayer() {
    return {
      x: 140,
      y: H / 2,
      r: PLAYER_R,
      vx: 0,
      vy: 0,
      speedLv: 0,
      missile: 0,
      weapon: "normal",
      laserLv: 0,
      doubleLv: 0,
      doubleCount: 0,
      options: 0,
      shield: 0,
      homing: 0,
      bombs: 1,
      hyper: false,
      invuln: 0,
      fireT: 0,
      misT: 0,
      homT: 0,
      trail: [],
      blink: 0,
    };
  }

  function volMult() {
    if (loopN <= 1) return 1;
    return 1.1 + 0.1 * loopN;
  }

  function hpMult() {
    if (loopN <= 1) return 1;
    return 1.6 + 0.2 * loopN;
  }

  function scaledHp(n) {
    return Math.max(1, Math.round(n * hpMult()));
  }

  function atkMult() {
    return easyMode ? 0.5 : 1;
  }

  function packN(n) {
    if (!easyMode) return n;
    return Math.max(1, Math.round(n * 0.5));
  }

  function shootWait(base) {
    return (base / volMult()) / atkMult();
  }

  function themeId() {
    if (extraMode) return extraBossI + 1;
    return stage;
  }

  function currentWaves() {
    if (extraMode) return WAVES_EXTRA;
    return STAGE_WAVES[stage] || WAVES_1;
  }

  function stageLabel() {
    if (extraMode) return "EX" + (loopN - 1) + " ボス" + (extraBossI + 1);
    return STAGE_NAME[stage] || (stage + "面");
  }

  function playBounds() {
    const th = themeId();
    if (th === 3) {
      const mid = H / 2 + Math.sin(time * 0.45) * 46;
      return { top: Math.max(58, mid - 150), bot: Math.min(H - 42, mid + 150) };
    }
    if (th === 4) {
      const w = 124 - Math.min(28, time * 0.22);
      const mid = H / 2 + Math.sin(time * 0.5) * 34;
      return { top: mid - w, bot: mid + w };
    }
    if (th === 2) return { top: 62, bot: H - 52 };
    return { top: 62, bot: H - 52 };
  }

  function hitsPillar(x, y) {
    for (let j = 0; j < hazards.length; j++) {
      const h = hazards[j];
      if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return true;
    }
    return false;
  }

  function resetRun() {
    score = 0;
    lives = MAX_LIVES;
    stage = 1;
    loopN = 1;
    extraMode = false;
    extraBossI = 0;
    stageClearT = 0;
    cheatUsed = false;
    cheatSeqI = 0;
    cheatLastDir = "";
    setPaused(false);
    beginStage(1, true);
  }

  function clearField(keepItems) {
    time = 0;
    waveI = 0;
    spawnAcc = 0;
    boss = null;
    flash = 0;
    bossWarn = null;
    bossTheme = false;
    extraIntro = null;
    extraNextT = 0;
    bgmFade = 0;
    bullets.length = 0;
    eBullets.length = 0;
    enemies.length = 0;
    if (!keepItems) items.length = 0;
    shocks.length = 0;
    particles.length = 0;
    floats.length = 0;
    hazards.length = 0;
    stick.nx = 0;
    stick.ny = 0;
    stick.active = false;
    Object.keys(keys).forEach(function (k) { keys[k] = false; });
  }

  function beginStage(n, fullReset) {
    if (fullReset) {
      const p = makePlayer();
      player.x = p.x;
      player.y = p.y;
      player.speedLv = 0;
      player.missile = 0;
      player.weapon = "normal";
      player.laserLv = 0;
      player.doubleLv = 0;
      player.doubleCount = 0;
      player.options = 0;
      player.shield = 0;
      player.homing = 0;
      player.homT = 0;
      player.hyper = false;
    }
    stage = n;
    clearField(!fullReset);
    player.bombs = easyMode ? 3 : 1;
    player.invuln = 2.2;
    player.fireT = 0;
    player.misT = 0;
    player.trail = [];
    player.x = 140;
    player.y = H / 2;
    if (!fullReset) {
      if (easyMode) {
        if (lives < MAX_LIVES) spawnFloat(player.x, player.y - 36, "LIFE MAX", "#ffe14a");
        lives = MAX_LIVES;
      } else {
        const before = lives;
        lives = Math.min(MAX_LIVES, lives + 1);
        if (lives > before) spawnFloat(player.x, player.y - 36, "LIFE +1", "#ffe14a");
      }
    }
    banner = extraMode ? ("EX LOOP " + (loopN - 1) + "  " + EXTRA_KINDS[extraBossI].toUpperCase()) : STAGE_NAME[stage];
    bannerT = 2.4;
    if (stageEl) stageEl.textContent = stageLabel();
    updateHud();
    updateBombUi();
    syncBgm();
  }

  function moveSpeed() {
    return 210 + player.speedLv * 38;
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function wantedBgm() {
    if (state !== "playing" || !sfxOn) return "";
    if (extraMode) return "audio/extra.mp3";
    if (bossWarn) return "";
    const kind = boss && boss.kind;
    if (kind === "final" || (bossTheme && stage === 4)) return "audio/finalboss.mp3";
    if (bossTheme || boss) return "audio/boss.mp3";
    if (stage === 1) return "audio/stage1.mp3";
    if (stage === 2) return "audio/stage2.mp3";
    if (stage === 3) return "audio/stage3.mp3";
    if (stage === 4) return "audio/stage4.mp3";
    return "";
  }

  function ensureBgmEl() {
    if (bgm) return bgm;
    bgm = new Audio();
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.playsInline = true;
    try { bgm.setAttribute("playsinline", "true"); } catch (err) {}
    bindBgmLoop(bgm);
    return bgm;
  }

  function bindBgmLoop(audio) {
    if (!audio || audio._loopBound) return;
    audio._loopBound = true;
    audio.loop = true;
    audio.addEventListener("ended", function () {
      restartBgmEl(audio);
    });
  }

  function restartBgmEl(audio) {
    if (!audio || audio !== bgm) return;
    audio.loop = true;
    try { audio.currentTime = 0; } catch (err) {}
    playBgmEl();
  }

  function playBgmEl() {
    if (!bgm) return;
    const play = bgm.play();
    if (play && play.then) {
      play.then(function () {
        bgmNeedGesture = false;
      }).catch(function () {
        bgmNeedGesture = true;
      });
    }
  }

  function kickBgm() {
    if (state !== "playing" || paused || !sfxOn) return;
    if (bgmNeedGesture || (bgm && bgm.paused && bgmSrc)) syncBgm();
  }

  function stopBgm() {
    if (bgm) {
      bgm.pause();
      try { bgm.currentTime = 0; } catch (err) {}
    }
    bgmSrc = "";
    bgmFade = 0;
  }

  function fadeBgmOut(dur) {
    if (!bgm || !bgmSrc) {
      bgmFade = 0;
      return;
    }
    bgmFade = dur;
    bgmFadeMax = dur || 1;
  }

  function updateBgmFade(dt) {
    if (bgmFade <= 0) return;
    bgmFade -= dt;
    if (bgm) {
      const u = Math.max(0, bgmFade / bgmFadeMax);
      bgm.volume = BGM_VOL * u * u;
    }
    if (bgmFade <= 0) {
      bgmFade = 0;
      if (bgm) {
        bgm.pause();
        try { bgm.currentTime = 0; } catch (err) {}
      }
      bgmSrc = "";
      syncBgm();
    }
  }

  function syncBgm() {
    if (bgmFade > 0 || bossWarn) return;
    const src = wantedBgm();
    ensureBgmEl();
    if (!src) {
      stopBgm();
      return;
    }
    if (bgmSrc !== src) {
      bgm.pause();
      bgmSrc = src;
      bgm.src = src;
      bgm.loop = true;
    }
    bgm.loop = true;
    bgm.muted = false;
    bgm.volume = BGM_VOL;
    if (bgm.ended) {
      try { bgm.currentTime = 0; } catch (err) {}
    }
    playBgmEl();
  }

  function keepBgmAlive(dt) {
    if (state !== "playing" || paused || !sfxOn) return;
    if (bgmFade > 0 || bossWarn) return;
    const src = wantedBgm();
    if (!src) return;
    bgmRetryT -= dt;
    const dead = !bgmSrc || bgmSrc !== src || !bgm || bgm.paused || bgm.ended;
    if (!dead) return;
    if (bgmRetryT > 0) return;
    bgmRetryT = 0.8;
    syncBgm();
  }

  function startBossWarning(kind) {
    if (boss || bossWarn || extraMode) return;
    bossTheme = true;
    bossWarn = { t: BOSS_WARN_DUR, maxT: BOSS_WARN_DUR, kind: kind, pulseT: 0, pulseN: 0 };
    fadeBgmOut(BGM_FADE_DUR);
    flash = 0.35;
    playWarningPulse(true);
  }

  function startExtraIntro() {
    extraIntro = { t: BOSS_WARN_DUR, maxT: BOSS_WARN_DUR };
    if (bgm) fadeBgmOut(BGM_FADE_DUR);
    else syncBgm();
    flash = 0.28;
  }

  function spawnExtraNextBoss() {
    spawnBossKind(EXTRA_KINDS[extraBossI] || "deus");
    if (stageEl) stageEl.textContent = stageLabel();
    if (bgmSrc !== "audio/extra.mp3") syncBgm();
  }

  function enterExtra() {
    extraMode = true;
    loopN = 2;
    extraBossI = 0;
    waveI = 999;
    boss = null;
    bossTheme = false;
    bossWarn = null;
    extraNextT = 0;
    eBullets.length = 0;
    for (let i = enemies.length - 1; i >= 0; i--) enemies.splice(i, 1);
    hazards.length = 0;
    player.bombs = 1;
    player.invuln = 1.6;
    const before = lives;
    lives = Math.min(MAX_LIVES, lives + 1);
    if (lives > before) spawnFloat(player.x, player.y - 36, "LIFE +1", "#ffe14a");
    if (stageEl) stageEl.textContent = stageLabel();
    updateHud();
    updateBombUi();
    startExtraIntro();
  }

  function updateExtraIntro(dt) {
    if (!extraIntro) return;
    extraIntro.t -= dt;
    if (extraIntro.t <= 0) {
      extraIntro = null;
      spawnExtraNextBoss();
      syncBgm();
    }
  }

  function playWarningPulse(high) {
    if (!sfxOn) return;
    beep(high ? 980 : 560, 0.16, "square", 0.09);
    beep(high ? 980 : 560, 0.16, "sawtooth", 0.03);
  }

  function updateBossWarn(dt) {
    if (!bossWarn) return;
    bossWarn.t -= dt;
    bossWarn.pulseT -= dt;
    if (bossWarn.pulseT <= 0) {
      bossWarn.pulseT = 0.2;
      playWarningPulse(bossWarn.pulseN % 2 === 0);
      bossWarn.pulseN += 1;
    }
    if (bossWarn.t <= 0) {
      const kind = bossWarn.kind;
      bossWarn = null;
      spawnBossKind(kind);
      syncBgm();
    }
  }

  function beep(freq, dur, type, vol) {
    if (!sfxOn || !audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.05;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  }

  function sfxShot() { beep(880, 0.05, "square", 0.02); }
  function sfxHit() { beep(220, 0.07, "sawtooth", 0.04); }
  function sfxBoom() {
    beep(90, 0.22, "sawtooth", 0.07);
    beep(160, 0.16, "square", 0.04);
  }
  function sfxItem() { beep(660, 0.08, "square", 0.05); beep(990, 0.12, "square", 0.04); }
  function sfxHurt() { beep(140, 0.28, "sawtooth", 0.08); }
  function sfxClear() { beep(523, 0.2, "square", 0.06); beep(784, 0.35, "square", 0.05); }
  function sfxBomb() {
    beep(70, 0.32, "sawtooth", 0.09);
    beep(180, 0.22, "square", 0.05);
    beep(420, 0.18, "triangle", 0.03);
  }

  function addScore(n) {
    score += n;
    scoreEl.textContent = String(score);
  }

  function spawnFloat(x, y, text, color) {
    floats.push({ x: x, y: y, text: text, color: color || "#fff", t: 0.8 });
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < (n || 10); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 180;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: 2 + Math.random() * 3,
        color: color,
        t: 0.35 + Math.random() * 0.35,
      });
    }
  }

  function spawnEnemy(spec) {
    spec.id = eid++;
    enemies.push(spec);
  }

  function spawnGruntLine(y, n, gap) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "grunt", x: W + 40 + i * gap, y: y, vx: -130, vy: 0,
        hp: 1, r: 14, score: 100, drop: DROP_CHANCE_SMALL, t: 0, shoot: i % 2 === 0 ? 2.8 + i * 0.45 : 99,
      });
    }
  }

  function spawnSine(y, n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "sine", x: W + 50 + i * 44, y: y, vx: -150, vy: 0,
        hp: 1, r: 13, score: 120, drop: DROP_CHANCE_SMALL, t: i * 0.2, baseY: y, amp: 70, shoot: i % 2 === 0 ? 3.0 + i * 0.5 : 99,
      });
    }
  }

  function spawnDivers(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "diver", x: W + 30 + i * 70, y: 40 + Math.random() * 80, vx: -80, vy: 90,
        hp: 1, r: 15, score: 150, drop: DROP_CHANCE_SMALL, t: 0, shoot: 1.6 + i * 0.5,
      });
    }
  }

  function spawnTurrets(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "turret", x: W + 80 + i * 160, y: H - 58, vx: -90, vy: 0,
        hp: 4, r: 18, score: 250, drop: DROP_CHANCE_MID, t: 0, shoot: 1.5 + i * 0.55, ground: true,
      });
    }
  }

  function spawnTanks(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "tank", x: W + 60 + i * 140, y: H - 52, vx: -70, vy: 0,
        hp: 6, r: 20, score: 300, drop: DROP_CHANCE_MID, t: 0, shoot: 1.8 + i * 0.4, ground: true,
      });
    }
  }

  function spawnSpreads(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "spread", x: W + 40 + i * 90, y: 120 + i * 90, vx: -95, vy: 0,
        hp: 5, r: 18, score: 350, drop: 0.5, t: 0, shoot: 1.6 + i * 0.5,
      });
    }
  }

  function spawnMid() {
    spawnEnemy({
      type: "mid", x: W + 50, y: H / 2, vx: -70, vy: 0,
      hp: scaledHp(18), r: 28, score: 800, drop: 1, t: 0, shoot: 1.4,
    });
  }

  function spawnBirds(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "bird", x: W + 30 + i * 64, y: 50 + Math.random() * 90, vx: -190, vy: 70,
        hp: 1, r: 15, score: 160, drop: DROP_CHANCE_SMALL, t: 0, shoot: 1.8 + i * 0.4,
      });
    }
  }

  function spawnLavaTurrets(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "turret", x: W + 90 + i * 170, y: H - 78, vx: -88, vy: 0,
        hp: scaledHp(4), r: 18, score: 260, drop: DROP_CHANCE_MID, t: 0, shoot: 1.7 + i * 0.5, ground: true, lava: true,
      });
    }
  }

  function spawnRocks(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "rock", x: W + 40 + i * 90, y: 40 + Math.random() * 80, vx: -70, vy: 90 + Math.random() * 50,
        hp: 2, r: 16, score: 120, drop: 0.12, t: 0, shoot: 99,
      });
    }
  }

  function spawnMirrors(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      spawnEnemy({
        type: "mirror", x: W + 50 + i * 110, y: 140 + i * 80, vx: -85, vy: 0,
        hp: scaledHp(8), r: 18, score: 280, drop: 0.4, t: 0, shoot: 2.2,
      });
    }
  }

  function spawnPillars(n) {
    n = packN(n);
    for (let i = 0; i < n; i++) {
      hazards.push({
        type: "pillar", x: W + 80 + i * 220, y: 70 + (i % 2) * 220, w: 28, h: 160,
      });
    }
  }

  function spawnBossKind(kind) {
    if (boss) return;
    const spec = {
      type: "boss", kind: kind, x: W + 80, y: H / 2, vx: -55, vy: 0,
      drop: 0, t: 0, shoot: 0.5, parked: false, phase: 0, armor: false, cores: 0, mouthOpen: false,
    };
    if (kind === "deus") { spec.hp = scaledHp(220); spec.r = 52; spec.score = 10000; }
    else if (kind === "volcano") { spec.hp = scaledHp(260); spec.r = 58; spec.score = 12000; }
    else if (kind === "idol") { spec.hp = scaledHp(180); spec.r = 48; spec.score = 14000; spec.armor = true; spec.cores = 4; }
    else { spec.hp = scaledHp(340); spec.r = 56; spec.score = 20000; }
    spec.maxHp = spec.hp;
    boss = spec;
    spawnEnemy(boss);
    if (kind === "idol") {
      for (let i = 0; i < 4; i++) {
        spawnEnemy({
          type: "core", parent: spec, i: i, hp: scaledHp(30), r: 14, score: 400, drop: 0.55,
          t: 0, x: spec.x, y: spec.y, shoot: 1.4 + i * 0.25, vx: 0, vy: 0,
        });
      }
    }
    const names = { deus: "でぃうす", volcano: "火山竜", idol: "機械神像", final: "でぃうすコア" };
    spawnFloat(W / 2, 80, names[kind] || "BOSS", "#ff6a8a");
    beep(200, 0.4, "sawtooth", 0.08);
  }

  function spawnExtraBoss() {
    spawnBossKind(EXTRA_KINDS[extraBossI] || "deus");
  }

  function pickDropType() {
    const pool = [];
    if (player.speedLv < MAX_SPEED) { pool.push("speed"); pool.push("speed"); }
    if (player.missile < MAX_MISSILE) pool.push("missile");
    if (player.weapon !== "double" || player.doubleLv < MAX_DOUBLE) pool.push("double");
    if (player.laserLv < MAX_LASER) pool.push("laser");
    if (player.options < MAX_OPTION) { pool.push("option"); pool.push("option"); }
    if (player.shield <= 0) pool.push("shield");
    if (player.homing < MAX_HOMING) pool.push("homing");
    if (!pool.length) return "score";
    return pool[(Math.random() * pool.length) | 0];
  }

  function dropItem(x, y, chance) {
    if (Math.random() > chance) return;
    items.push({
      type: pickDropType(),
      x: x, y: y, t: 0, r: 18,
    });
  }

  function applyItem(type) {
    if (type === "score") {
      addScore(500);
      spawnFloat(player.x, player.y - 30, "+500", "#ffe14a");
      return;
    }
    if (type === "speed") {
      if (player.speedLv < MAX_SPEED) player.speedLv += 1;
      else addScore(500);
    } else if (type === "missile") {
      if (player.missile < MAX_MISSILE) player.missile += 1;
      else addScore(500);
    } else if (type === "double") {
      if (player.weapon === "double") {
        if (player.doubleLv < MAX_DOUBLE) player.doubleLv += 1;
        else addScore(500);
      } else {
        player.weapon = "double";
        player.doubleLv = 1;
        player.laserLv = 0;
        player.doubleCount = 0;
      }
    } else if (type === "laser") {
      player.weapon = "laser";
      player.doubleLv = 0;
      player.doubleCount = 0;
      if (player.laserLv < MAX_LASER) player.laserLv += 1;
      else addScore(500);
    } else if (type === "option") {
      if (player.options < MAX_OPTION) player.options += 1;
      else addScore(500);
    } else if (type === "shield") {
      player.shield = SHIELD_HITS;
    } else if (type === "homing") {
      if (player.homing < MAX_HOMING) {
        player.homing += 1;
        player.homT = Math.min(player.homT, 0.12);
      } else addScore(500);
    }
    let label = POWER_LABEL[type] || type;
    if (type === "laser" && player.laserLv > 1) label = "LASER x" + player.laserLv;
    if (type === "double" && player.doubleLv > 1) label = "DOUBLE x" + player.doubleLv;
    if (type === "homing" && player.homing > 1) label = "HOMING x" + player.homing;
    spawnFloat(player.x, player.y - 32, label, POWER_COLOR[type] || "#fff");
    updatePowerBar();
  }

  function optionPos(i) {
    const delay = 10 + i * 12;
    const tr = player.trail[player.trail.length - delay];
    if (tr) return tr;
    return { x: player.x - 28 * (i + 1), y: player.y };
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const l2 = vx * vx + vy * vy || 1;
    let t = ((px - x1) * vx + (py - y1) * vy) / l2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const dx = px - (x1 + t * vx);
    const dy = py - (y1 + t * vy);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fireLaser(x, y, lv, ang) {
    ang = ang || 0;
    const len = Math.max(140, Math.sqrt(W * W + H * H) - 40);
    bullets.push({
      type: "laser",
      x: x + 18,
      y: y,
      vx: 0,
      vy: 0,
      r: 5 + (lv - 1) * 6,
      len: len,
      ang: ang,
      dmg: 1,
      pierce: true,
      life: 0.09,
      hits: {},
      lv: lv,
    });
  }

  function fireSpread(x, y) {
    const spd = 560;
    pushShot(x + 16, y, spd, 0);
    pushShot(x + 16, y, Math.cos(-DOUBLE_SPREAD_ANG) * spd, Math.sin(-DOUBLE_SPREAD_ANG) * spd);
    pushShot(x + 16, y, Math.cos(DOUBLE_SPREAD_ANG) * spd, Math.sin(DOUBLE_SPREAD_ANG) * spd);
  }

  function fireFrom(x, y, fromOption) {
    if (player.hyper) {
      const lv = HYPER_LASER_LV;
      fireLaser(x, y, lv, 0);
      fireLaser(x, y, lv, DOUBLE_UP_ANG);
      const every = DOUBLE_SPREAD_EVERY[HYPER_DOUBLE_LV] || 4;
      if (!fromOption) player.doubleCount += 1;
      if (every > 0 && player.doubleCount > 0 && player.doubleCount % every === 0) fireSpread(x, y);
    } else if (player.weapon === "laser") {
      fireLaser(x, y, Math.max(1, player.laserLv), 0);
    } else {
      const isDouble = player.weapon === "double";
      const dLv = isDouble ? Math.max(1, player.doubleLv) : 0;
      const every = DOUBLE_SPREAD_EVERY[dLv] || 0;
      if (isDouble && every > 0 && !fromOption) player.doubleCount += 1;
      const spread = isDouble && every > 0 && player.doubleCount > 0 && player.doubleCount % every === 0;
      if (spread) fireSpread(x, y);
      else pushShot(x + 16, y, 560, 0);
      if (isDouble) {
        pushShot(x + 12, y - 6, 460, -320);
      }
    }
    if (!fromOption) sfxShot();
  }

  function pushShot(x, y, vx, vy) {
    bullets.push({ type: "shot", x: x, y: y, vx: vx, vy: vy, r: 4, dmg: 1, pierce: false });
  }

  function fireMissiles() {
    bullets.push({ type: "missile", x: player.x, y: player.y + 8, vx: 140, vy: 180, r: 4, dmg: 2, pierce: false, g: 420 });
    if (player.missile >= 2) {
      bullets.push({ type: "missile", x: player.x, y: player.y - 8, vx: 140, vy: -180, r: 4, dmg: 2, pierce: false, g: -420 });
    }
  }

  function homingInterval() {
    const lv = Math.max(1, Math.min(MAX_HOMING, player.homing || 1));
    return 3 - (lv - 1) * 0.5;
  }

  function nearestEnemy(x, y) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function fireHoming() {
    const lv = Math.max(1, player.homing);
    const target = nearestEnemy(player.x, player.y);
    let vx = 340;
    let vy = 0;
    if (target) {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      vx = (dx / len) * 340;
      vy = (dy / len) * 340;
    }
    bullets.push({
      type: "homing",
      x: player.x + 14,
      y: player.y,
      vx: vx,
      vy: vy,
      r: 6,
      dmg: lv,
      pierce: false,
      targetId: target ? target.id : 0,
      spd: 380,
    });
    beep(740, 0.07, "sine", 0.03);
  }

  function steerHoming(b) {
    let target = null;
    if (b.targetId) {
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].id === b.targetId) { target = enemies[i]; break; }
      }
    }
    if (!target) target = nearestEnemy(b.x, b.y);
    if (!target) return;
    b.targetId = target.id;
    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = b.spd || 380;
    b.vx = (dx / len) * spd;
    b.vy = (dy / len) * spd;
  }

  function updateBombUi() {
    if (!btnBomb) return;
    const on = state === "playing";
    const n = player.bombs || 0;
    btnBomb.classList.toggle("hidden", !on);
    btnBomb.classList.toggle("empty", n <= 0 && !paused);
    btnBomb.disabled = !on || (!paused && n <= 0);
    if (bombCountEl) bombCountEl.textContent = String(n);
    if (btnPause) btnPause.classList.toggle("hidden", !on);
  }

  function bombReach(x, y) {
    const corners = [[0, 0], [W, 0], [0, H], [W, H]];
    let max = 0;
    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i][0] - x;
      const dy = corners[i][1] - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > max) max = d;
    }
    return max + 24;
  }

  function useBomb() {
    if (paused) {
      feedCheat("B");
      return;
    }
    kickBgm();
    if (state !== "playing") return;
    if ((player.bombs || 0) <= 0) return;
    player.bombs -= 1;
    updateBombUi();
    const maxR = bombReach(player.x, player.y);
    shocks.push({ x: player.x, y: player.y, r: 18, maxR: maxR, life: 0.7, maxLife: 0.7 });
    flash = 0.1;
    sfxBomb();
  }

  function isBombImmune(e) {
    return e.type === "boss" || e.type === "core";
  }

  function updateShocks(dt) {
    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      s.life -= dt;
      const u = 1 - Math.max(0, s.life) / s.maxLife;
      s.r = 18 + (s.maxR - 18) * u;
      for (let j = eBullets.length - 1; j >= 0; j--) {
        const b = eBullets[j];
        const dx = b.x - s.x;
        const dy = b.y - s.y;
        if (dx * dx + dy * dy <= (s.r + b.r) * (s.r + b.r)) {
          burst(b.x, b.y, "#ffe14a", 4);
          eBullets.splice(j, 1);
        }
      }
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (isBombImmune(e)) continue;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        if (dx * dx + dy * dy <= (s.r + e.r) * (s.r + e.r)) {
          killEnemy(e, j);
        }
      }
      if (s.life <= 0) shocks.splice(i, 1);
    }
  }

  function enemyShoot(e, aimed, spread) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = 170 * (0.92 + 0.08 * volMult());
    if (spread) {
      const arms = Math.max(1, Math.round((1 + Math.round(2 * volMult())) * atkMult()));
      for (let i = -(arms - 1) / 2; i <= (arms - 1) / 2; i++) {
        const a = Math.atan2(dy, dx) + i * 0.28;
        eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 4 });
      }
      return;
    }
    if (aimed) {
      eBullets.push({ x: e.x, y: e.y, vx: (dx / len) * spd, vy: (dy / len) * spd, r: 4 });
    } else {
      eBullets.push({ x: e.x, y: e.y, vx: -200 * (0.92 + 0.08 * volMult()), vy: 0, r: 4 });
    }
  }

  function hitPlayer(ignoreShield) {
    if (debugMode) return;
    if (player.invuln > 0) return;
    if (!ignoreShield && player.shield > 0) {
      player.shield -= 1;
      player.invuln = 0.35;
      burst(player.x + 18, player.y, "#ff7ab8", 12);
      sfxHit();
      updatePowerBar();
      return;
    }
    lives -= 1;
    player.invuln = 2.1;
    player.options = 0;
    player.shield = 0;
    flash = 0.2;
    burst(player.x, player.y, "#fff0a8", 22);
    sfxHurt();
    updateHud();
    if (lives <= 0) {
      endGame(false);
    }
  }

  function killEnemy(e, i) {
    enemies.splice(i, 1);
    addScore(e.score);
    const isBoss = e.type === "boss";
    burst(e.x, e.y, isBoss ? "#ffd24a" : "#9ad0ff", isBoss ? 40 : 14);
    spawnFloat(e.x, e.y - 10, "+" + e.score, "#fff");
    sfxBoom();
    if (e.type === "core" && e.parent) {
      e.parent.cores = Math.max(0, (e.parent.cores || 1) - 1);
      if (e.parent.cores <= 0) e.parent.armor = false;
      dropItem(e.x, e.y, e.drop || 0);
      return;
    }
    if (isBoss) {
      boss = null;
      for (let k = enemies.length - 1; k >= 0; k--) {
        if (enemies[k].type === "core") enemies.splice(k, 1);
      }
      dropItem(e.x, e.y, 1);
      dropItem(e.x + 20, e.y - 20, 1);
      dropItem(e.x - 20, e.y + 20, 1);
      sfxClear();
      if (extraMode) {
        extraBossI += 1;
        if (extraBossI >= 4) {
          extraBossI = 0;
          loopN += 1;
        }
        extraNextT = 1.15;
        if (stageEl) stageEl.textContent = stageLabel();
        return;
      }
      banner = "STAGE CLEAR";
      bannerT = 2;
      stageClearT = 2.4;
      return;
    }
    dropItem(e.x, e.y, e.drop || 0);
  }

  function advanceAfterClear() {
    if (extraMode) {
      extraNextT = 0.4;
      return;
    }
    if (stage < 4) {
      beginStage(stage + 1, false);
      return;
    }
    if (easyMode) {
      endGame(true);
      return;
    }
    enterExtra();
  }

  function endGame(win) {
    state = win ? "clear" : "gameover";
    cleared = win;
    stickLayer.classList.add("hidden");
    hud.classList.add("hidden");
    livesBox.classList.add("hidden");
    app.classList.remove("playing");
    gameoverScreen.classList.remove("hidden");
    setPaused(false);
    syncDebugUi();
    updateBombUi();
    resultTitle.textContent = win ? (easyMode ? "イージークリア！" : "ステージクリア！") : "ゲームオーバー";
    finalScoreEl.textContent = String(score);
    const recordable = !debugMode && !easyMode;
    let isBest = false;
    if (recordable && cheatUsed) {
      if (score > bestCheat) {
        bestCheat = score;
        localStorage.setItem(BEST_CHEAT_KEY, String(bestCheat));
        isBest = true;
      }
    } else if (recordable) {
      if (score > bestNormal) {
        bestNormal = score;
        localStorage.setItem(BEST_NORMAL_KEY, String(bestNormal));
        isBest = true;
      }
    }
    renderBestScores();
    newBestEl.classList.toggle("hidden", !isBest);
    syncBgm();
  }

  function renderBestScores() {
    const normal = Math.max(0, bestNormal | 0);
    const cheat = Math.max(0, bestCheat | 0);
    if (bestEl) bestEl.textContent = normal + "  (" + cheat + ")";
    if (titleBestEl) titleBestEl.textContent = String(normal);
    if (titleBestCheatEl) titleBestCheatEl.textContent = String(cheat);
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    renderBestScores();
    livesRow.innerHTML = "";
    const n = Math.max(0, lives);
    for (let i = 0; i < n; i++) {
      const pip = document.createElement("span");
      pip.className = "life-pip";
      livesRow.appendChild(pip);
    }
    updatePowerBar();
  }

  function updatePowerBar() {
    powerSlots.forEach(function (el) {
      const p = el.getAttribute("data-p");
      let on = false;
      if (p === "speed") on = player.speedLv > 0;
      if (p === "missile") on = player.missile > 0;
      if (p === "double") on = player.weapon === "double" || player.hyper;
      if (p === "laser") on = player.weapon === "laser" || player.hyper;
      if (p === "option") on = player.options > 0;
      if (p === "shield") on = player.shield > 0;
      if (p === "homing") on = player.homing > 0;
      el.classList.toggle("on", on);
      if (p === "speed" && on) el.textContent = "SPEED x" + player.speedLv;
      else if (p === "missile" && on) el.textContent = player.missile >= 2 ? "MISSILE 2" : "MISSILE";
      else if (p === "double" && on) el.textContent = player.doubleLv >= 2 ? "DOUBLE x" + player.doubleLv : "DOUBLE";
      else if (p === "laser" && on) el.textContent = player.laserLv >= 2 ? "LASER x" + player.laserLv : "LASER";
      else if (p === "option" && on) el.textContent = "OPTION x" + player.options;
      else if (p === "homing" && on) el.textContent = player.homing >= 2 ? "HOMING x" + player.homing : "HOMING";
      else el.textContent = p.toUpperCase();
    });
  }

  function padSurface() {
    return controlMode === "dpad" && dpad ? dpad : stickBase;
  }

  function syncDpadVisual(nx, ny) {
    dpadBtns.forEach(function (el) {
      const dir = el.getAttribute("data-dir");
      let on = false;
      if (dir === "left") on = nx < 0;
      if (dir === "right") on = nx > 0;
      if (dir === "up") on = ny < 0;
      if (dir === "down") on = ny > 0;
      el.classList.toggle("on", on);
    });
  }

  function setStickFrom(nx, ny) {
    const mag = Math.sqrt(nx * nx + ny * ny);
    if (mag > 1) { nx /= mag; ny /= mag; }
    stick.nx = nx;
    stick.ny = ny;
    if (stickKnob && controlMode !== "dpad") {
      const size = stickBase ? stickBase.getBoundingClientRect().width : 112;
      const max = size * 0.26;
      stickKnob.style.transform = "translate(" + (nx * max) + "px," + (ny * max) + "px)";
    }
    if (controlMode === "dpad") syncDpadVisual(nx, ny);
  }

  function setDpadFromEvent(ev) {
    const el = padSurface();
    if (!el) return;
    const origin = el.getBoundingClientRect();
    const dx = ev.clientX - (origin.left + origin.width / 2);
    const dy = ev.clientY - (origin.top + origin.height / 2);
    const mag = Math.sqrt(dx * dx + dy * dy);
    const dead = Math.max(10, origin.width * 0.16);
    if (mag < dead) {
      setStickFrom(0, 0);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) setStickFrom(dx > 0 ? 1 : -1, 0);
    else setStickFrom(0, dy > 0 ? 1 : -1);
  }

  function captureStickOrigin() {
    const el = padSurface();
    const origin = el.getBoundingClientRect();
    stick.ox = origin.left + origin.width / 2;
    stick.oy = origin.top + origin.height / 2;
    stick.scale = Math.max(28, origin.width * 0.42);
  }

  function onPointerDown(ev) {
    if (state !== "playing") return;
    if (ev.target && ev.target.closest && ev.target.closest("#lives-box")) return;
    stick.active = true;
    stick.id = ev.pointerId;
    captureStickOrigin();
    if (controlMode === "dpad") setDpadFromEvent(ev);
    else setStickFrom((ev.clientX - stick.ox) / stick.scale, (ev.clientY - stick.oy) / stick.scale);
    noteCheatPad();
    kickBgm();
    try { railLeft.setPointerCapture(ev.pointerId); } catch (err) {}
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!stick.active || ev.pointerId !== stick.id) return;
    if (controlMode === "dpad") setDpadFromEvent(ev);
    else setStickFrom((ev.clientX - stick.ox) / stick.scale, (ev.clientY - stick.oy) / stick.scale);
    noteCheatPad();
  }

  function onPointerUp(ev) {
    if (ev.pointerId !== stick.id && stick.id !== null) return;
    stick.active = false;
    stick.id = null;
    setStickFrom(0, 0);
    noteCheatPad();
  }

  railLeft.addEventListener("pointerdown", onPointerDown);
  railLeft.addEventListener("pointermove", onPointerMove);
  railLeft.addEventListener("pointerup", onPointerUp);
  railLeft.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", function (ev) {
    keys[ev.code] = true;
    if (ev.code === "Space" || ev.code.indexOf("Arrow") === 0) ev.preventDefault();
    if (!ev.repeat && (ev.code === "Escape" || ev.code === "KeyP")) {
      if (state === "playing") setPaused(!paused);
      return;
    }
    if (paused) noteCheatPad();
    else kickBgm();
    if (!ev.repeat && (ev.code === "KeyZ" || ev.code === "KeyB" || ev.code === "Space")) useBomb();
  });
  window.addEventListener("keyup", function (ev) {
    keys[ev.code] = false;
    if (paused) noteCheatPad();
  });

  function inputAxis() {
    let x = stick.nx;
    let y = stick.ny;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;
    const m = Math.sqrt(x * x + y * y);
    if (m > 1) { x /= m; y /= m; }
    if (Math.abs(x) < 0.12) x = 0;
    if (Math.abs(y) < 0.12) y = 0;
    return { x: x, y: y };
  }

  function update(dt) {
    time += dt;
    player.blink += dt;
    if (flash > 0) flash -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (bannerT > 0) bannerT -= dt;
    updateBgmFade(dt);
    keepBgmAlive(dt);
    updateBossWarn(dt);
    updateExtraIntro(dt);
    if (extraNextT > 0) {
      extraNextT -= dt;
      if (extraNextT <= 0 && extraMode && !boss && !extraIntro) spawnExtraNextBoss();
    }
    if (stageClearT > 0) {
      stageClearT -= dt;
      if (stageClearT <= 0) advanceAfterClear();
    }

    const waves = currentWaves();
    while (waveI < waves.length && time >= waves[waveI].t) {
      waves[waveI].fn();
      waveI += 1;
    }

    const axis = inputAxis();
    const spd = moveSpeed();
    player.x += axis.x * spd * dt;
    player.y += axis.y * spd * dt;
    const bound = playBounds();
    player.x = Math.max(36, Math.min(W * 0.56, player.x));
    player.y = Math.max(bound.top, Math.min(bound.bot, player.y));
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 48) player.trail.shift();

    if (themeId() === 2 && player.y > H - 70) hitPlayer(true);
    if (themeId() === 4 && (player.y <= bound.top + 6 || player.y >= bound.bot - 6)) hitPlayer(false);

    player.fireT -= dt;
    if (player.fireT <= 0) {
      player.fireT = (player.weapon === "laser" || player.hyper) ? LASER_INTERVAL : SHOT_INTERVAL;
      fireFrom(player.x, player.y, false);
      for (let i = 0; i < player.options; i++) {
        const op = optionPos(i);
        fireFrom(op.x, op.y, true);
      }
    }
    if (player.missile > 0) {
      player.misT -= dt;
      if (player.misT <= 0) {
        player.misT = 0.42;
        fireMissiles();
      }
    }
    if (player.homing > 0) {
      player.homT -= dt;
      if (player.homT <= 0) {
        player.homT = homingInterval();
        fireHoming();
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.g) b.vy += b.g * dt;
      if (b.type === "homing") steerHoming(b);
      if (b.life != null) {
        b.life -= dt;
        if (b.life <= 0) { bullets.splice(i, 1); continue; }
      }
      if (b.type !== "laser" && b.type !== "homing" && hitsPillar(b.x, b.y)) { bullets.splice(i, 1); continue; }
      if (b.type !== "laser" && (b.x > W + 40 || b.x < -40 || b.y > H + 40 || b.y < -40)) bullets.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += dt;
      if (e.type === "sine") {
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 3.2) * e.amp;
      } else if (e.type === "diver" || e.type === "bird") {
        e.x += (e.type === "bird" ? -200 : -210) * dt;
        e.y += Math.sin(e.t * 2.4) * 90 * dt + 40 * dt;
        if (e.y > H - 80) e.y = H - 80;
      } else if (e.type === "rock") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y > H - 70) { e.y = H - 70; e.vy *= -0.3; }
      } else if (e.type === "core") {
        const p = e.parent;
        if (!p || p.hp <= 0) { enemies.splice(i, 1); continue; }
        const a = e.t * 1.4 + e.i * (Math.PI / 2);
        e.x = p.x + Math.cos(a) * 78;
        e.y = p.y + Math.sin(a) * 78;
      } else if (e.type === "boss") {
        if (!e.parked) {
          e.x += e.vx * dt;
          if (e.x <= W - 170) { e.x = W - 170; e.parked = true; e.vx = 0; }
        } else {
          e.y = H / 2 + Math.sin(e.t * 0.7) * 100;
          if (e.kind === "volcano") e.mouthOpen = (e.t % 5.2) > 2.3 && (e.t % 5.2) < 4.0;
          if (e.kind === "final") e.phase = e.hp < e.maxHp * 0.33 ? 2 : e.hp < e.maxHp * 0.66 ? 1 : 0;
          else if (e.kind === "deus") e.phase = e.hp < e.maxHp * 0.45 ? 1 : 0;
        }
      } else if (e.type === "mid") {
        e.x += e.vx * dt;
        e.y = H / 2 + Math.sin(e.t * 1.3) * 120;
      } else {
        e.x += e.vx * dt;
        e.y += (e.vy || 0) * dt;
      }

      e.shoot -= dt;
      if (e.shoot <= 0 && e.x < W - 10 && e.x > 40) {
        if (e.type === "grunt" || e.type === "sine") { enemyShoot(e, false, false); e.shoot = shootWait(2.8); }
        else if (e.type === "diver" || e.type === "bird") { enemyShoot(e, true, false); e.shoot = shootWait(2.1); }
        else if (e.type === "turret") { enemyShoot(e, true, false); e.shoot = shootWait(2.0); }
        else if (e.type === "tank") { enemyShoot(e, true, true); e.shoot = shootWait(2.3); }
        else if (e.type === "spread") { enemyShoot(e, true, true); e.shoot = shootWait(1.9); }
        else if (e.type === "mid") { enemyShoot(e, true, true); e.shoot = shootWait(1.5); }
        else if (e.type === "mirror") { enemyShoot(e, true, false); e.shoot = shootWait(2.2); }
        else if (e.type === "core") { enemyShoot(e, true, false); e.shoot = shootWait(2.0); }
        else if (e.type === "boss") {
          bossFire(e);
          const gap = e.kind === "final" && e.phase === 2 ? 0.32 : e.phase ? 0.38 : 0.48;
          e.shoot = shootWait(gap);
        }
      }

      if (e.x < -80 || e.y < -80 || e.y > H + 80) {
        if (e.type === "boss" || e.type === "core") continue;
        enemies.splice(i, 1);
        continue;
      }

      if (player.invuln <= 0) {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        if (dx * dx + dy * dy < (e.r + HIT_R) * (e.r + HIT_R)) hitPlayer();
      }
    }

    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        eBullets.splice(i, 1);
        continue;
      }
      if (hitsPillar(b.x, b.y)) { eBullets.splice(i, 1); continue; }
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const pr = player.shield > 0 ? HIT_R + 14 : HIT_R;
      if (dx * dx + dy * dy < (b.r + pr) * (b.r + pr)) {
        eBullets.splice(i, 1);
        hitPlayer();
      }
    }

    updateShocks(dt);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let consumed = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        let hit = false;
        if (b.type === "laser") {
          const ang = b.ang || 0;
          const x2 = b.x + Math.cos(ang) * b.len;
          const y2 = b.y + Math.sin(ang) * b.len;
          hit = distToSeg(e.x, e.y, b.x, b.y, x2, y2) < e.r + b.r;
        } else {
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const rr = b.r + e.r;
          hit = dx * dx + dy * dy < rr * rr;
        }
        if (!hit) continue;
        if (b.type !== "laser" && b.type !== "homing" && hitsPillar(b.x, b.y)) { consumed = true; break; }
        if (e.type === "mirror" && b.type !== "laser" && b.type !== "homing") {
          eBullets.push({ x: b.x, y: b.y, vx: -Math.abs(b.vx || 280), vy: (b.vy || 0) * -0.4, r: 4 });
          consumed = true;
          break;
        }
        if (e.type === "boss" && e.kind === "volcano" && !e.mouthOpen) {
          if (!b.pierce) consumed = true;
          if (b.pierce) {
            if (!b.hits) b.hits = {};
            b.hits[e.id] = true;
          }
          break;
        }
        if (e.type === "boss" && e.armor) {
          if (!b.pierce) consumed = true;
          if (b.pierce) {
            if (!b.hits) b.hits = {};
            b.hits[e.id] = true;
          }
          continue;
        }
        if (b.pierce && b.hits && b.hits[e.id]) continue;
        if (b.pierce) {
          if (!b.hits) b.hits = {};
          b.hits[e.id] = true;
        }
        e.hp -= b.dmg;
        burst(e.x - e.r, e.y, "#fff", 4);
        sfxHit();
        if (!b.pierce) consumed = true;
        if (e.hp <= 0) killEnemy(e, j);
        if (consumed) break;
      }
      if (consumed) bullets.splice(i, 1);
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      it.x -= 55 * dt;
      it.y += Math.sin(it.t * 4) * 18 * dt;
      if (it.x < -20) { items.splice(i, 1); continue; }
      const dx = it.x - player.x;
      const dy = it.y - player.y;
      if (dx * dx + dy * dy < (it.r + player.r) * (it.r + player.r)) {
        applyItem(it.type);
        sfxItem();
        burst(it.x, it.y, POWER_COLOR[it.type] || "#fff", 10);
        items.splice(i, 1);
      }
    }

    const hazSpd = themeId() === 4 ? 140 : 90;
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.x -= hazSpd * dt;
      if (h.x + (h.w || 20) < -40) { hazards.splice(i, 1); continue; }
      if (player.invuln <= 0 && player.x > h.x && player.x < h.x + h.w && player.y > h.y && player.y < h.y + h.h) {
        hitPlayer(false);
      }
    }

    if (themeId() === 4 && boss && boss.kind === "final" && boss.phase >= 2 && boss.parked) {
      if (Math.floor(time * 2) !== Math.floor((time - dt) * 2)) {
        const fromTop = Math.sin(time * 3) > 0;
        eBullets.push({ x: 80 + (time * 180) % (W - 160), y: fromTop ? bound.top : bound.bot, vx: 0, vy: fromTop ? 280 : -280, r: 6 });
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.t <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      floats[i].t -= dt;
      floats[i].y -= 28 * dt;
      if (floats[i].t <= 0) floats.splice(i, 1);
    }
  }

  function bossFire(e) {
    const kind = e.kind || "deus";
    const nFan = Math.max(3, Math.round(8 * volMult() * atkMult()));
    const nRing = Math.max(4, Math.round(12 * volMult() * atkMult()));
    if (kind === "volcano") {
      if (e.mouthOpen) {
        enemyShoot(e, true, true);
        eBullets.push({ x: e.x - 20, y: e.y, vx: -240, vy: 0, r: 7 });
      } else {
        eBullets.push({ x: e.x, y: e.y - 40, vx: -180, vy: -80, r: 4 });
        eBullets.push({ x: e.x, y: e.y + 40, vx: -180, vy: 80, r: 4 });
      }
      return;
    }
    if (kind === "idol") {
      if (e.armor) {
        enemyShoot(e, true, false);
        return;
      }
      for (let i = 0; i < nFan; i++) {
        const a = e.t * 1.6 + i * (Math.PI * 2 / nFan);
        eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, r: 4 });
      }
      return;
    }
    if (kind === "final") {
      if (e.phase === 0) {
        enemyShoot(e, true, true);
      } else if (e.phase === 1) {
        for (let i = 0; i < nFan; i++) {
          const a = e.t * 2 + i * (Math.PI * 2 / nFan);
          eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 4 });
        }
        eBullets.push({ x: e.x - 20, y: e.y, vx: -230, vy: 0, r: 6 });
      } else {
        for (let i = -2; i <= 2; i++) {
          eBullets.push({ x: e.x - 24, y: e.y + i * 26, vx: -250, vy: 0, r: 5 });
        }
      }
      return;
    }
    const cycle = e.t % 6;
    if (e.phase === 0) {
      if (cycle < 2.4) enemyShoot(e, true, true);
      else if (cycle < 4.2) {
        for (let i = 0; i < nFan; i++) {
          const a = e.t * 2 + i * (Math.PI * 2 / nFan);
          eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 4 });
        }
      } else {
        enemyShoot(e, true, false);
        eBullets.push({ x: e.x, y: e.y - 30, vx: -220, vy: 0, r: 5 });
        eBullets.push({ x: e.x, y: e.y + 30, vx: -220, vy: 0, r: 5 });
      }
    } else {
      if (cycle < 2) {
        for (let i = -2; i <= 2; i++) {
          eBullets.push({ x: e.x - 20, y: e.y + i * 28, vx: -260, vy: 0, r: 5 });
        }
      } else if (cycle < 4) {
        for (let i = 0; i < nRing; i++) {
          const a = i * (Math.PI * 2 / nRing) + e.t;
          eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 4 });
        }
      } else {
        enemyShoot(e, true, true);
        if (Math.random() < 0.35) {
          spawnEnemy({
            type: "grunt", x: e.x - 40, y: e.y - 40 + Math.random() * 80, vx: -160, vy: 0,
            hp: 1, r: 14, score: 100, drop: 0.15, t: 0, shoot: 1.4,
          });
        }
      }
    }
  }

  function drawBg() {
    const th = themeId();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (th === 2) {
      g.addColorStop(0, "#2a1010");
      g.addColorStop(0.5, "#4a2018");
      g.addColorStop(1, "#7a3010");
    } else if (th === 3) {
      g.addColorStop(0, "#161018");
      g.addColorStop(0.55, "#2a2438");
      g.addColorStop(1, "#3a3048");
    } else if (th === 4) {
      g.addColorStop(0, "#100818");
      g.addColorStop(0.5, "#241030");
      g.addColorStop(1, "#180820");
    } else {
      g.addColorStop(0, "#0a1230");
      g.addColorStop(0.55, "#152048");
      g.addColorStop(1, "#1a3050");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = th === 2 ? "#ffd0a0" : "#e8f0ff";
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.globalAlpha = 0.35 + s.z * 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const bound = playBounds();
    if (th === 4) {
      ctx.fillStyle = "#5a2060";
      ctx.fillRect(0, 0, W, bound.top);
      ctx.fillRect(0, bound.bot, W, H - bound.bot);
      ctx.fillStyle = "#ff6a8a";
      ctx.fillRect(0, bound.top - 3, W, 3);
      ctx.fillRect(0, bound.bot, W, 3);
    } else if (th === 3) {
      ctx.fillStyle = "rgba(40, 30, 50, 0.55)";
      ctx.fillRect(0, 0, W, bound.top);
      ctx.fillRect(0, bound.bot, W, H - bound.bot);
    }

    if (th === 2) {
      ctx.fillStyle = "#c04010";
      ctx.fillRect(0, H - 48, W, 48);
      ctx.fillStyle = "#ff6a18";
      ctx.globalAlpha = 0.7 + Math.sin(time * 6) * 0.15;
      ctx.fillRect(0, H - 36, W, 36);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#8a2810";
    } else {
      ctx.fillStyle = "#16324a";
      ctx.fillRect(0, H - 36, W, 36);
      ctx.fillStyle = "#1e4660";
    }
    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      if (h.x < -200) h.x += 180 * hills.length;
      ctx.beginPath();
      ctx.moveTo(h.x, H - 36);
      ctx.lineTo(h.x + h.w * 0.5, H - 36 - h.h);
      ctx.lineTo(h.x + h.w, H - 36);
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < hazards.length; i++) {
      const h = hazards[i];
      ctx.fillStyle = "#6a5a48";
      ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.fillStyle = "#8a7a60";
      ctx.fillRect(h.x + 4, h.y + 8, h.w - 8, h.h - 16);
    }
  }

  function drawLaserBeam(x, y, lv, ang) {
    const pulse = 0.38 + 0.5 * (0.5 + 0.5 * Math.sin(time * 2.05));
    const glow = 4 + lv * 4;
    const core = 1.5 + lv * 1.2;
    const len = Math.max(140, Math.sqrt(W * W + H * H) - 40);
    ang = ang || 0;
    ctx.save();
    ctx.translate(x + 18, y);
    ctx.rotate(ang);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(120, 240, 255, 1)";
    ctx.globalAlpha = pulse * 0.5;
    ctx.lineWidth = glow + 7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.globalAlpha = pulse;
    ctx.lineWidth = glow;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, pulse + 0.2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = core;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawHakase(x, y, r, ghost) {
    ctx.save();
    ctx.translate(x, y);
    if (ghost && Math.floor(player.invuln * 18) % 2 === 0) ctx.globalAlpha = 0.4;
    const gold = ctx.createRadialGradient(-6, -8, 3, 0, 0, r + 6);
    gold.addColorStop(0, "#fff0a8");
    gold.addColorStop(0.45, "#e8b820");
    gold.addColorStop(1, "#9a6a08");
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 8);
    ctx.quadraticCurveTo(-r * 1.4, 4, -r * 1.55, -6);
    ctx.quadraticCurveTo(-r * 1.1, 10, -r * 0.2, 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 0.35, r * 0.7, r * 0.55, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c99610";
    ctx.beginPath();
    ctx.ellipse(r * 0.85, -r * 0.1, r * 0.45, r * 0.28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e0";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 0.7 + i * 5, -r * 0.05);
      ctx.lineTo(r * 0.73 + i * 5, 4);
      ctx.lineTo(r * 0.78 + i * 5, -r * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.45, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(r * 0.58, -r * 0.48, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c99610";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(14, 6);
    ctx.lineTo(18, 2);
    ctx.stroke();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, r - 4);
    ctx.lineTo(-2, r + 6);
    ctx.moveTo(8, r - 4);
    ctx.lineTo(12, r + 5);
    ctx.stroke();
    ctx.restore();
  }

  function drawOption(x, y) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
    g.addColorStop(0, "#fff8c8");
    g.addColorStop(1, "#e8b820");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.arc(3, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.type === "grunt") {
      ctx.fillStyle = "#7a6adf";
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "sine") {
      ctx.fillStyle = "#5dce7a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-22, -8, -18, 0);
      ctx.quadraticCurveTo(-22, 8, -10, 0);
      ctx.fill();
    } else if (e.type === "diver") {
      ctx.fillStyle = "#c070d0";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-18, -14);
      ctx.lineTo(6, -2);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "bird") {
      ctx.fillStyle = "#ff6a28";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-20, -16);
      ctx.lineTo(8, -2);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "rock") {
      ctx.fillStyle = "#8a6a50";
      ctx.beginPath();
      ctx.moveTo(-14, 6);
      ctx.lineTo(-6, -14);
      ctx.lineTo(12, -8);
      ctx.lineTo(14, 10);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "mirror") {
      ctx.fillStyle = "#c8e8ff";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -16);
      ctx.lineTo(-10, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    } else if (e.type === "core") {
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-2, -2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "turret") {
      ctx.fillStyle = "#6a7a8a";
      ctx.fillRect(-14, -4, 28, 18);
      ctx.fillStyle = "#c0d0e0";
      ctx.fillRect(0, -10, 18, 8);
    } else if (e.type === "tank") {
      ctx.fillStyle = "#8a6a40";
      ctx.fillRect(-18, -8, 36, 18);
      ctx.fillStyle = "#d0b070";
      ctx.fillRect(2, -14, 16, 8);
    } else if (e.type === "spread") {
      ctx.fillStyle = "#ff8a4a";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const fn = i === 0 ? ctx.moveTo : ctx.lineTo;
        fn.call(ctx, Math.cos(a) * 16, Math.sin(a) * 16);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.type === "mid") {
      ctx.fillStyle = "#d0a020";
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff0a8";
      ctx.beginPath();
      ctx.arc(10, -4, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === "boss") {
      if (e.kind === "volcano") {
        ctx.fillStyle = e.mouthOpen ? "#ff6a20" : "#8a3010";
        ctx.beginPath();
        ctx.ellipse(0, 8, 56, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c04010";
        ctx.beginPath();
        ctx.ellipse(18, -18, 28, 22, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.mouthOpen ? "#1a0800" : "#4a1808";
        ctx.beginPath();
        ctx.ellipse(36, -8, e.mouthOpen ? 16 : 8, e.mouthOpen ? 12 : 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "800 11px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VOLCANO", 0, 52);
      } else if (e.kind === "idol") {
        ctx.fillStyle = e.armor ? "#8a90a8" : "#d0a040";
        ctx.fillRect(-28, -48, 56, 90);
        ctx.beginPath();
        ctx.arc(0, -58, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "800 11px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.armor ? "CORE" : "IDOL", 0, 52);
      } else {
        ctx.fillStyle = "rgba(255, 80, 120, 0.2)";
        ctx.beginPath();
        ctx.arc(0, 0, 70 + Math.sin(e.t * 3) * 4, 0, Math.PI * 2);
        ctx.fill();
        const core = ctx.createRadialGradient(-10, -10, 8, 0, 0, 52);
        core.addColorStop(0, "#fff0c8");
        core.addColorStop(0.4, e.kind === "final" ? "#c040ff" : "#e070a0");
        core.addColorStop(1, "#5a1848");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1020";
        ctx.beginPath();
        ctx.arc(8, -6, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4a6a";
        ctx.beginPath();
        ctx.arc(10, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c04070";
        ctx.fillRect(-70, -14, 24, 28);
        ctx.fillRect(-18, -64, 28, 20);
        ctx.fillRect(-18, 44, 28, 20);
        ctx.fillStyle = "#fff";
        ctx.font = "800 11px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.kind === "final" ? "DEUS CORE" : "DEUS", 0, 44);
      }
    }
    ctx.restore();
  }

  function draw() {
    drawBg();

    if (state === "playing" && boss) {
      const w = 280;
      const x = W / 2 - w / 2;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x, 28, w, 10);
      ctx.fillStyle = "#ff4a6a";
      ctx.fillRect(x, 28, w * Math.max(0, boss.hp / boss.maxHp), 10);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(x, 28, w, 10);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.t * 2);
      ctx.fillStyle = POWER_COLOR[it.type] || "#ffe14a";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1020";
      ctx.font = "800 11px 'M PLUS Rounded 1c', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const ch = it.type === "score" ? "500" : it.type.charAt(0).toUpperCase();
      ctx.fillText(ch, 0, 1);
      ctx.restore();
    }

    for (let i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);

    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (b.type === "laser") continue;
      if (b.type === "missile") {
        ctx.fillStyle = "#6adf6a";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 7, 3.5, Math.atan2(b.vy, b.vx), 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === "homing") {
        ctx.fillStyle = "#e8b8ff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#fff0a8";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#ff6a8a";
    for (let i = 0; i < eBullets.length; i++) {
      const b = eBullets[i];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < shocks.length; i++) {
      const s = shocks[i];
      const a = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.fillStyle = "rgba(255, 236, 160, " + (0.06 + a * 0.1) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 236, 160, " + (0.35 + a * 0.55) + ")";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, " + (0.2 + a * 0.4) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(4, s.r - 8), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state === "playing" || state === "clear") {
      if (player.weapon === "laser" || player.hyper) {
        const lv = player.hyper ? HYPER_LASER_LV : Math.max(1, player.laserLv);
        drawLaserBeam(player.x, player.y, lv, 0);
        if (player.hyper) drawLaserBeam(player.x, player.y, lv, DOUBLE_UP_ANG);
        for (let i = 0; i < player.options; i++) {
          const op = optionPos(i);
          drawLaserBeam(op.x, op.y, lv, 0);
          if (player.hyper) drawLaserBeam(op.x, op.y, lv, DOUBLE_UP_ANG);
        }
      }
      if (player.shield > 0) {
        ctx.strokeStyle = "rgba(255, 122, 184, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, PLAYER_R + 10, -0.9, 0.9);
        ctx.stroke();
      }
      for (let i = 0; i < player.options; i++) {
        const op = optionPos(i);
        drawOption(op.x, op.y);
      }
      drawHakase(player.x, player.y, PLAYER_R, player.invuln > 0);
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.t * 3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.font = "800 14px 'M PLUS Rounded 1c', sans-serif";
    for (let i = 0; i < floats.length; i++) {
      const f = floats[i];
      ctx.globalAlpha = Math.max(0, f.t * 1.4);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,80,80," + (flash * 1.4) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    if (bossWarn) {
      const blink = Math.floor(time * 8) % 2 === 0;
      ctx.fillStyle = "rgba(160, 0, 36, " + (blink ? 0.22 : 0.1) + ")";
      ctx.fillRect(0, 0, W, H);
      if (blink) {
        ctx.fillStyle = "#ff3a5a";
        ctx.font = "800 34px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("////// WARNING //////", W / 2, H * 0.42);
        ctx.font = "800 18px 'M PLUS Rounded 1c', sans-serif";
        ctx.fillStyle = "#fff0a8";
        ctx.fillText("WARNING  WARNING  WARNING", W / 2, H * 0.42 + 36);
      }
    }

    if (extraIntro) {
      const blink = Math.floor(time * 8) % 2 === 0;
      ctx.fillStyle = "rgba(70, 20, 120, " + (blink ? 0.24 : 0.1) + ")";
      ctx.fillRect(0, 0, W, H);
      if (blink) {
        ctx.fillStyle = "#ffe14a";
        ctx.font = "800 32px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("//////ＥＸＴＲＡ ＳＴＡＧＥ//////", W / 2, H * 0.42);
        ctx.font = "800 16px 'M PLUS Rounded 1c', sans-serif";
        ctx.fillStyle = "#c77dff";
        ctx.fillText("BOSS RUSH", W / 2, H * 0.42 + 36);
      }
    }

    if (bannerT > 0 && banner) {
      ctx.globalAlpha = Math.min(1, bannerT);
      ctx.fillStyle = "#fff8e8";
      ctx.font = "800 26px 'M PLUS Rounded 1c', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(banner, W / 2, 86);
      ctx.globalAlpha = 1;
    }

    if (state === "title") {
      drawHakase(W * 0.16, H * 0.55, 34, false);
    }
  }

  function loop(ts) {
    try {
      if (!lastT) lastT = ts;
      let dt = (ts - lastT) / 1000;
      lastT = ts;
      if (dt > 0.05) dt = 0.05;
      if (debugMode && state === "playing") dt *= 3;
      if (state === "playing" && !paused) update(dt);
      else if (state === "playing" && paused) noteCheatPad();
      const starSpd = (state === "playing" && !paused) ? (themeId() === 4 ? 100 : 55) : 22;
      for (let i = 0; i < stars.length; i++) {
        stars[i].x -= starSpd * stars[i].z * dt;
        if (stars[i].x < 0) stars[i].x += W;
      }
      if (state === "playing" && !paused) {
        const hs = themeId() === 4 ? 140 : 90;
        for (let i = 0; i < hills.length; i++) hills[i].x -= hs * dt;
      }
      draw();
    } catch (err) {
      if (typeof console !== "undefined" && console.error) console.error(err);
    }
    requestAnimationFrame(loop);
  }

  function syncDebugUi() {
    const on = debugMode && state === "playing";
    if (btnDebugTitle) btnDebugTitle.classList.toggle("hidden", !on);
    if (debugBadge) debugBadge.classList.toggle("hidden", !on);
  }

  function cheatDirFromAxis(x, y) {
    if (Math.abs(x) < 0.32 && Math.abs(y) < 0.32) return "";
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? "R" : "L";
    return y > 0 ? "D" : "U";
  }

  function noteCheatPad() {
    if (!paused || cheatUsed) return;
    const a = inputAxis();
    const d = cheatDirFromAxis(a.x, a.y);
    if (d && d !== cheatLastDir) feedCheat(d);
    cheatLastDir = d;
  }

  function syncCheatFlash() {
    if (!cheatFlashEl) return;
    cheatFlashEl.classList.toggle("hidden", !(paused && cheatUsed));
  }

  function feedCheat(sym) {
    if (!paused || cheatUsed) return;
    if (CHEAT_SEQ[cheatSeqI] === sym) {
      cheatSeqI += 1;
      beep(360 + cheatSeqI * 70, 0.06, "square", 0.04);
      if (cheatSeqI >= CHEAT_SEQ.length) {
        applyCheat();
        cheatSeqI = 0;
      }
    } else {
      cheatSeqI = CHEAT_SEQ[0] === sym ? 1 : 0;
      if (sym === CHEAT_SEQ[0]) beep(360 + 70, 0.06, "square", 0.04);
    }
  }

  function applyCheat() {
    if (cheatUsed) return;
    cheatUsed = true;
    lives = MAX_LIVES;
    player.speedLv = MAX_SPEED;
    player.missile = MAX_MISSILE;
    player.weapon = "laser";
    player.hyper = true;
    player.laserLv = HYPER_LASER_LV;
    player.doubleLv = HYPER_DOUBLE_LV;
    player.doubleCount = 0;
    player.options = MAX_OPTION;
    player.shield = SHIELD_HITS;
    player.homing = MAX_HOMING;
    player.homT = 0.08;
    player.invuln = Math.max(player.invuln, 1.4);
    spawnFloat(player.x, player.y - 40, "MAX POWER", "#c77dff");
    burst(player.x, player.y, "#ffe14a", 28);
    sfxItem();
    sfxClear();
    updateHud();
    syncCheatFlash();
  }

  function setPaused(on) {
    if (on && state !== "playing") return;
    paused = !!on;
    if (pauseScreen) pauseScreen.classList.toggle("hidden", !paused);
    app.classList.toggle("paused", paused);
    updateBombUi();
    if (paused) {
      cheatSeqI = 0;
      cheatLastDir = "";
      if (bgm) bgm.pause();
    } else if (bgm && sfxOn && bgmSrc) {
      playBgmEl();
    }
    syncCheatFlash();
  }

  function applyControlSettings() {
    app.setAttribute("data-pad-size", padSize);
    app.setAttribute("data-pad-mode", controlMode);
    if (stickBase) stickBase.classList.toggle("hidden", controlMode === "dpad");
    if (dpad) dpad.classList.toggle("hidden", controlMode !== "dpad");
    document.querySelectorAll("#opt-pad-mode button").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-mode") === controlMode);
    });
    document.querySelectorAll("#opt-pad-size button").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-size") === padSize);
    });
    document.querySelectorAll("#opt-easy button").forEach(function (btn) {
      const want = easyMode ? "1" : "0";
      btn.classList.toggle("on", btn.getAttribute("data-easy") === want);
    });
    syncDpadVisual(0, 0);
  }

  function showTitle() {
    state = "title";
    debugMode = false;
    debugTapCount = 0;
    gameoverScreen.classList.add("hidden");
    titleScreen.classList.remove("hidden");
    hud.classList.add("hidden");
    stickLayer.classList.add("hidden");
    livesBox.classList.add("hidden");
    app.classList.remove("playing");
    setPaused(false);
    syncDebugUi();
    updateBombUi();
    syncBgm();
  }

  function startGame(asDebug) {
    ensureAudio();
    ensureBgmEl();
    debugMode = !!asDebug;
    debugTapCount = 0;
    state = "playing";
    resetRun();
    titleScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    stickLayer.classList.remove("hidden");
    livesBox.classList.remove("hidden");
    app.classList.add("playing");
    setStickFrom(0, 0);
    syncDebugUi();
    updateBombUi();
    syncBgm();
  }

  document.getElementById("btn-start").addEventListener("click", function () {
    startGame(false);
  });
  document.getElementById("btn-retry").addEventListener("click", function () {
    startGame(false);
  });
  document.getElementById("btn-title").addEventListener("click", showTitle);
  if (btnBomb) {
    btnBomb.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      useBomb();
    });
  }
  if (btnDebugTitle) {
    btnDebugTitle.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      showTitle();
    });
  }
  if (brandI) {
    brandI.addEventListener("pointerup", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (state !== "title") return;
      debugTapCount += 1;
      brandI.classList.remove("brand-i-pop");
      void brandI.offsetWidth;
      brandI.classList.add("brand-i-pop");
      if (debugTapCount >= DEBUG_TAPS_NEEDED) startGame(true);
    });
  }
  sfxToggle.checked = sfxOn;
  sfxToggle.addEventListener("change", function () {
    sfxOn = sfxToggle.checked;
    localStorage.setItem(SFX_KEY, sfxOn ? "1" : "0");
    ensureAudio();
    if (!sfxOn) stopBgm();
    else syncBgm();
  });
  document.getElementById("opt-pad-mode").addEventListener("click", function (ev) {
    const btn = ev.target.closest("button[data-mode]");
    if (!btn) return;
    controlMode = btn.getAttribute("data-mode") === "dpad" ? "dpad" : "stick";
    localStorage.setItem(PAD_MODE_KEY, controlMode);
    applyControlSettings();
  });
  document.getElementById("opt-pad-size").addEventListener("click", function (ev) {
    const btn = ev.target.closest("button[data-size]");
    if (!btn) return;
    const size = btn.getAttribute("data-size");
    if (size !== "s" && size !== "m" && size !== "l") return;
    padSize = size;
    localStorage.setItem(PAD_SIZE_KEY, padSize);
    applyControlSettings();
  });
  document.getElementById("opt-easy").addEventListener("click", function (ev) {
    const btn = ev.target.closest("button[data-easy]");
    if (!btn) return;
    easyMode = btn.getAttribute("data-easy") === "1";
    localStorage.setItem(EASY_KEY, easyMode ? "1" : "0");
    applyControlSettings();
  });
  if (btnPause) {
    btnPause.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (state === "playing") setPaused(!paused);
    });
  }
  const btnResume = document.getElementById("btn-resume");
  if (btnResume) {
    btnResume.addEventListener("click", function (ev) {
      ev.preventDefault();
      setPaused(false);
    });
  }
  const btnPauseTitle = document.getElementById("btn-pause-title");
  if (btnPauseTitle) {
    btnPauseTitle.addEventListener("click", function (ev) {
      ev.preventDefault();
      setPaused(false);
      showTitle();
    });
  }
  applyControlSettings();

  window.addEventListener("contextmenu", function (ev) {
    ev.preventDefault();
  });
  window.addEventListener("selectstart", function (ev) {
    ev.preventDefault();
  });
  window.addEventListener("dragstart", function (ev) {
    ev.preventDefault();
  });
  function isUiControl(el) {
    return !!(el && el.closest && el.closest("button, input, textarea, label, a, .seg"));
  }
  function blockCallout(ev) {
    if (isUiControl(ev.target)) return;
    ev.preventDefault();
  }
  document.addEventListener("touchstart", blockCallout, { passive: false });
  document.addEventListener("touchmove", blockCallout, { passive: false });

  document.getElementById("app-version").textContent = "Ver." + APP_VERSION;
  renderBestScores();
  requestAnimationFrame(loop);
})();
