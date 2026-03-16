/**
 * WeaponController — 발사율, 재장전, 탄약 관리
 * HitscanSystem을 통해 실제 피격 판정을 위임한다.
 */
export class WeaponController {
  constructor(weaponData, hitscanSystem, aimingSystem, hud) {
    this._hitscan  = hitscanSystem;
    this._aiming   = aimingSystem;
    this._hud      = hud;

    this.setWeapon(weaponData);

    this._shotTimer    = 0;
    this._reloadTimer  = 0;
    this._isReloading  = false;

    // 통계
    this.shotsFired = 0;
    this.shotsHit   = 0;
  }

  setWeapon(weaponData) {
    this._weapon       = weaponData;
    this._fireInterval = 60 / weaponData.rpm; // 초 단위
    this._ammo         = weaponData.magazine;
    this._reserve      = weaponData.reserveAmmo;
    this._aiming.setWeapon(weaponData);
    this._updateAmmoHUD();
  }

  /**
   * 매 프레임 호출
   * @param {boolean} triggerHeld — 마우스 좌클릭 상태
   * @param {boolean} reloadKey   — R키 상태
   */
  update(dt, triggerHeld, reloadKey, player, aiAgents, staticObjects) {
    // 재장전 타이머
    if (this._isReloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0) {
        const need   = this._weapon.magazine - this._ammo;
        const take   = Math.min(need, this._reserve);
        this._ammo   += take;
        this._reserve -= take;
        this._isReloading = false;
        this._hud.setReloading(false);
        this._updateAmmoHUD();
      }
      return;
    }

    // 수동 재장전
    if (reloadKey && this._ammo < this._weapon.magazine && this._reserve > 0) {
      this._startReload();
      return;
    }

    // 자동 재장전 (탄약 0)
    if (this._ammo === 0 && this._reserve > 0) {
      this._startReload();
      return;
    }

    // 발사율 타이머
    this._shotTimer -= dt;

    if (triggerHeld && this._ammo > 0 && this._shotTimer <= 0) {
      this._fire(player, aiAgents, staticObjects);
      this._shotTimer = this._fireInterval;
    }
  }

  _startReload() {
    this._isReloading = true;
    this._reloadTimer = this._weapon.reloadTime;
    this._hud.setReloading(true);
  }

  _fire(player, aiAgents, staticObjects) {
    this._ammo--;
    this.shotsFired++;

    const origin    = player.getEyePosition();
    const direction = player.getLookDirection();
    const spread    = this._aiming.getSpread();
    this._weapon._spread = spread;

    const result = this._hitscan.fire(
      origin, direction, this._weapon, aiAgents, staticObjects,
    );

    if (result.hit && result.agent) {
      this.shotsHit++;
      player.hits++;
      if (!result.agent.isAlive) {
        this._hud.addKillFeed(`${player.callsign ?? 'YOU'} → AI-${result.agent.id}`);
      }
    }

    player.shots++;
    this._aiming.applyRecoil(player);
    this._updateAmmoHUD();
  }

  _updateAmmoHUD() {
    this._hud?.setAmmo(this._ammo, this._reserve);
  }

  getAccuracy() {
    return this.shotsFired > 0
      ? Math.round((this.shotsHit / this.shotsFired) * 100)
      : 0;
  }
}
