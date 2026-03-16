import { Renderer }        from './Renderer.js';
import { InputManager }    from './InputManager.js';
import { SceneManager }    from './SceneManager.js';
import { Player }          from '../scripts/player/Player.js';
import { AimingSystem }    from '../scripts/player/AimingSystem.js';
import { WeaponController } from '../scripts/player/WeaponController.js';
import { WeaponData }      from '../scripts/weapons/WeaponData.js';
import { HitscanSystem }   from '../scripts/weapons/HitscanSystem.js';
import { GameManager }     from '../scripts/GameManager.js';
import { HUD }             from '../ui/HUD.js';
import gameCfg             from '../config/game.json';

// ─────────────────────────────────────────────
// GameState FSM
// LOADING → LOBBY → PLAYING → POST_MATCH → LOBBY...
// ─────────────────────────────────────────────
const GameState = Object.freeze({
  LOADING:    'LOADING',
  LOBBY:      'LOBBY',
  PLAYING:    'PLAYING',
  POST_MATCH: 'POST_MATCH',
});

// ─────────────────────────────────────────────
// 시스템 생성
// ─────────────────────────────────────────────
const renderer    = new Renderer();
const input       = new InputManager();
const sceneMgr    = new SceneManager(renderer.scene);
const hud         = new HUD();
const weaponDb    = new WeaponData();
const hitscan     = new HitscanSystem(renderer.scene, renderer.camera);
const gameMgr     = new GameManager(
  renderer.scene,
  sceneMgr,
  sceneMgr.staticObjects,
  hud,
);

// 플레이어 (인스턴스 생성, 스폰은 매치 시작 시)
const player = new Player(renderer.camera, input, sceneMgr.staticObjects);

// 조준 시스템 (초기 무기 없이 생성 — 매치 시작 후 setWeapon)
const aimSys = new AimingSystem(renderer, null);

// 무기 컨트롤러 (매치 시작 후 초기화)
let weaponCtrl = null;

let currentState = GameState.LOADING;

// ─────────────────────────────────────────────
// 로딩 화면
// ─────────────────────────────────────────────
function runLoading() {
  const tips = [
    'ADS to zoom in — right mouse button',
    'Take cover when HP is low',
    'Enemies will hunt you down…',
    'Spray control: recover from recoil',
  ];
  let progress = 0;
  const bar    = document.getElementById('loading-bar');
  const tipEl  = document.getElementById('loading-tip');

  const interval = setInterval(() => {
    progress += 5 + Math.random() * 10;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(goToLobby, 400);
    }
    bar.style.width = `${Math.min(100, progress)}%`;
    tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];
  }, 80);
}

// ─────────────────────────────────────────────
// 로비 화면
// ─────────────────────────────────────────────
function goToLobby() {
  currentState = GameState.LOBBY;
  hideAll();
  document.getElementById('screen-lobby').classList.remove('hidden');
  input.exitPointerLock();
}

function bindLobbyUI() {
  const rangeEl   = document.getElementById('lobby-ai-count');
  const valEl     = document.getElementById('lobby-ai-count-val');
  rangeEl.addEventListener('input', () => { valEl.textContent = rangeEl.value; });

  document.getElementById('btn-start').addEventListener('click', startMatch);
  document.getElementById('btn-lobby').addEventListener('click', () => {
    gameMgr.resetMatch();
    goToLobby();
  });

  // 포인터락 오버레이 클릭 → 잠금 재획득
  document.getElementById('pointer-lock-overlay').addEventListener('click', () => {
    input.requestPointerLock();
    document.getElementById('pointer-lock-overlay').classList.add('hidden');
  });

  document.addEventListener('pointerlockchange', () => {
    if (currentState !== GameState.PLAYING) return;
    const overlay = document.getElementById('pointer-lock-overlay');
    if (document.pointerLockElement === document.body) {
      overlay.classList.add('hidden');
    } else {
      overlay.classList.remove('hidden');
    }
  });

  // ESC 누르면 로비로
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && currentState === GameState.PLAYING) {
      // pointerlock 해제는 브라우저가 자동으로 함
    }
  });
}

// ─────────────────────────────────────────────
// 매치 시작
// ─────────────────────────────────────────────
function startMatch() {
  currentState = GameState.PLAYING;

  const aiCount    = parseInt(document.getElementById('lobby-ai-count').value, 10);
  const difficulty = document.getElementById('lobby-difficulty').value;
  const mode       = document.getElementById('lobby-mode').value;
  const callsign   = document.getElementById('lobby-callsign').value || 'OPERATOR';

  player.callsign = callsign;

  // 무기 설정
  const weaponId = gameCfg.player.defaultWeapon;
  const wData    = weaponDb.getWeapon(weaponId);
  aimSys.setWeapon(wData);

  weaponCtrl = new WeaponController(wData, hitscan, aimSys, hud);

  // 플레이어 스폰
  player.spawn(sceneMgr.playerSpawn);

  // GameManager 시작
  gameMgr.setOnMatchEnd(onMatchEnd);
  gameMgr.startMatch({ aiCount, difficulty, mode, player });

  hideAll();
  hud.show();
  hud.setHP(player.hp, player.maxHp);

  // PointerLock
  input.requestPointerLock();
}

// ─────────────────────────────────────────────
// 매치 종료
// ─────────────────────────────────────────────
function onMatchEnd(result, stats) {
  currentState = GameState.POST_MATCH;
  input.exitPointerLock();
  hud.hide();

  const titleEl = document.getElementById('postmatch-title');
  titleEl.textContent = result === 'victory' ? 'MISSION COMPLETE' : 'KIA';
  titleEl.className   = result === 'victory' ? '' : 'fail';

  document.getElementById('pm-kills').textContent    = stats.kills;
  document.getElementById('pm-deaths').textContent   = stats.deaths;
  document.getElementById('pm-accuracy').textContent =
    stats.shots > 0 ? `${Math.round((stats.hits / stats.shots) * 100)}%` : '0%';

  hideAll();
  document.getElementById('screen-postmatch').classList.remove('hidden');
}

// ─────────────────────────────────────────────
// 렌더 루프
// ─────────────────────────────────────────────
let lastTime = performance.now();

function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // 최대 50ms cap
  lastTime = timestamp;

  input.flush();

  if (currentState === GameState.PLAYING) {
    const adsActive = input.isRMBDown();
    const reloadKey = input.isKeyDown('KeyR') && !lastReloadKey;
    lastReloadKey   = input.isKeyDown('KeyR');

    // 시스템 업데이트 순서
    player.update(dt, adsActive);
    aimSys.update(dt, player, adsActive);
    weaponCtrl?.update(
      dt,
      input.isLMBDown(),
      reloadKey,
      player,
      gameMgr.agents,
      sceneMgr.staticObjects,
    );
    hitscan.update(dt);
    gameMgr.update(dt);

    // 총성 소리 이벤트 전파 (발사 시)
    if (input.isLMBDown()) {
      gameMgr.broadcastSound(player.position, 20);
    }

    // HUD 업데이트
    hud.setHP(player.hp, player.maxHp);
  }

  renderer.render();
}

let lastReloadKey = false;

// ─────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────
function hideAll() {
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
}

// ─────────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────────
bindLobbyUI();
runLoading();
requestAnimationFrame(loop);
