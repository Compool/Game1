/**
 * HUD — 게임 중 UI 상태 업데이트
 * HTML DOM을 직접 조작하는 방식으로 Three.js와 독립적으로 동작
 */
export class HUD {
  constructor() {
    this._hpFill    = document.getElementById('hp-bar-fill');
    this._hpValue   = document.getElementById('hp-value');
    this._ammoCur   = document.getElementById('ammo-current');
    this._ammoRes   = document.getElementById('ammo-reserve');
    this._reloadInd = document.getElementById('reload-indicator');
    this._killFeed  = document.getElementById('kill-feed');
    this._scoreEl   = document.getElementById('hud-score');
    this._killsEl   = document.getElementById('score-kills');
    this._aliveEl   = document.getElementById('score-alive');
  }

  setHP(current, max) {
    const pct = (current / max) * 100;
    this._hpFill.style.width = `${pct}%`;
    this._hpValue.textContent = Math.ceil(current);
    // 30% 이하 경고색
    if (pct <= 30) {
      this._hpFill.classList.add('low');
    } else {
      this._hpFill.classList.remove('low');
    }
  }

  setAmmo(current, reserve) {
    this._ammoCur.textContent = current;
    this._ammoRes.textContent = reserve;
  }

  setReloading(isReloading) {
    if (isReloading) {
      this._reloadInd.classList.remove('hidden');
    } else {
      this._reloadInd.classList.add('hidden');
    }
  }

  addKillFeed(text) {
    const entry = document.createElement('div');
    entry.className = 'kf-entry';
    entry.textContent = text;
    this._killFeed.appendChild(entry);
    // 3초 후 제거
    setTimeout(() => entry.remove(), 3000);
  }

  updateScore(kills, aliveCount) {
    this._killsEl.textContent = kills;
    this._aliveEl.textContent = aliveCount;
  }

  show() { document.getElementById('screen-hud').classList.remove('hidden'); }
  hide() { document.getElementById('screen-hud').classList.add('hidden'); }
}
