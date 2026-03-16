import * as THREE from 'three';
import gameCfg from '../../config/game.json';

/**
 * AimingSystem — ADS/Hip-fire FOV 보간, 리코일, View-kick
 */
export class AimingSystem {
  constructor(renderer, weaponData) {
    this._renderer   = renderer;
    this._weaponData = weaponData;

    const cam = gameCfg.camera;
    this.fovDefault  = cam.fovDefault;
    this.fovADS      = cam.fovADS;
    this.fovLerp     = cam.fovLerpSpeed;
    this.currentFOV  = cam.fovDefault;

    this.isADS       = false;
    this.recoilPitch = 0;   // 현재 리코일 오프셋 (rad)
    this._adsVigEl   = document.getElementById('ads-vignette');
    this._crossEl    = document.getElementById('crosshair');
  }

  setWeapon(weaponData) {
    this._weaponData = weaponData;
  }

  update(dt, player, adsInput) {
    this.isADS = adsInput && !player.isSprinting;

    // FOV 보간
    const targetFOV = this.isADS
      ? this.fovDefault * (this._weaponData?.adsZoom ?? 0.67)
      : this.fovDefault;
    this.currentFOV += (targetFOV - this.currentFOV) * Math.min(1, this.fovLerp * dt);
    this._renderer.setFOV(this.currentFOV);

    // ADS 비네트 & 크로스헤어
    if (this.isADS) {
      this._adsVigEl.classList.remove('hidden');
      this._crossEl.style.opacity = '0.35';
    } else {
      this._adsVigEl.classList.add('hidden');
      this._crossEl.style.opacity = '1';
    }

    // 리코일 회복
    const recoveryRate = this._weaponData?.recoilRecoveryRate ?? 6.0;
    if (this.recoilPitch > 0) {
      this.recoilPitch = Math.max(0, this.recoilPitch - recoveryRate * dt);
      player.pitch -= recoveryRate * dt * 0.35; // 카메라 복귀
      player.pitch = Math.max(
        -(gameCfg.camera.maxPitch * Math.PI) / 180,
        player.pitch,
      );
    }
  }

  /** 발사 시 리코일 적용 */
  applyRecoil(player) {
    const r = this._weaponData?.recoilPerShot ?? 0.9;
    const kick = r * 0.012;

    // 카메라 위로 kick
    player.pitch -= kick;

    // 리코일 잔량 누적
    this.recoilPitch += kick * 0.6;

    // 크로스헤어 퍼짐
    this._crossEl.classList.add('spread');
    clearTimeout(this._spreadTimer);
    this._spreadTimer = setTimeout(() => {
      this._crossEl?.classList.remove('spread');
    }, 120);
  }

  /** 현재 조준 정확도(분산) 반환 */
  getSpread() {
    const base = this.isADS
      ? (this._weaponData?.adsSpread ?? 0.003)
      : (this._weaponData?.hipFireSpread ?? 0.012);
    const recoilBonus = this.recoilPitch * 0.8;
    return base + recoilBonus;
  }
}
