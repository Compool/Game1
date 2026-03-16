import * as THREE from 'three';
import gameCfg from '../../config/game.json';

/**
 * Player — 이동·충돌·HP 관리
 * 카메라 오브젝트를 직접 제어하여 1인칭 시점 구현
 */
export class Player {
  constructor(camera, inputManager, staticObjects) {
    this.camera       = camera;
    this.input        = inputManager;
    this.staticObjects = staticObjects;

    const cfg = gameCfg.player;
    this.hp          = cfg.hp;
    this.maxHp       = cfg.hp;
    this.walkSpeed   = cfg.walkSpeed;
    this.sprintSpeed = cfg.sprintSpeed;
    this.crouchSpeed = cfg.crouchSpeed;
    this.height      = cfg.height;
    this.eyeHeight   = cfg.eyeHeight;
    this.radius      = cfg.radius;
    this.gravity     = cfg.gravity;

    this.position    = new THREE.Vector3(0, 0, 0);
    this.velocity    = new THREE.Vector3();
    this.yaw         = 0;    // 수평 회전 (rad)
    this.pitch       = 0;    // 수직 회전 (rad)
    this.isOnGround  = true;
    this.isCrouching = false;
    this.isSprinting = false;
    this.isAlive     = true;

    this._moveDir    = new THREE.Vector3();
    this._forward    = new THREE.Vector3();
    this._right      = new THREE.Vector3();

    // 피격 플래시 엘리먼트
    this._flashEl = document.createElement('div');
    this._flashEl.id = 'damage-flash';
    document.body.appendChild(this._flashEl);

    // 통계
    this.shots  = 0;
    this.hits   = 0;
    this.deaths = 0;
  }

  /** 스폰 위치 설정 */
  spawn(pos) {
    this.position.copy(pos);
    this.position.y = 0;
    this.velocity.set(0, 0, 0);
    this.hp = this.maxHp;
    this.isAlive = true;
    this.yaw = 0;
    this.pitch = 0;
    this._syncCamera();
  }

  /** 매 프레임 업데이트 */
  update(dt, adsActive) {
    if (!this.isAlive) return;
    this._processLook(adsActive);
    this._processMove(dt, adsActive);
    this._applyGravity(dt);
    this._collideFloor();
    this._syncCamera();
  }

  _processLook(adsActive) {
    const sens   = gameCfg.camera.mouseSensitivity;
    const adsMul = adsActive ? 0.45 : 1.0;
    const maxPitch = (gameCfg.camera.maxPitch * Math.PI) / 180;

    this.yaw   -= this.input.mouseDeltaX * sens * adsMul;
    this.pitch -= this.input.mouseDeltaY * sens * adsMul;
    this.pitch  = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  _processMove(dt, adsActive) {
    const inp = this.input;
    this.isSprinting = inp.isKeyDown('ShiftLeft') && !adsActive;
    this.isCrouching = inp.isKeyDown('ControlLeft') || inp.isKeyDown('KeyC');

    let speed = this.walkSpeed;
    if (this.isSprinting) speed = this.sprintSpeed;
    if (this.isCrouching) speed = this.crouchSpeed;
    if (adsActive)        speed *= 0.65;

    // 방향 계산 (yaw 기준)
    this._forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this._moveDir.set(0, 0, 0);
    if (inp.isKeyDown('KeyW') || inp.isKeyDown('ArrowUp'))    this._moveDir.addScaledVector(this._forward, -1);
    if (inp.isKeyDown('KeyS') || inp.isKeyDown('ArrowDown'))  this._moveDir.addScaledVector(this._forward,  1);
    if (inp.isKeyDown('KeyA') || inp.isKeyDown('ArrowLeft'))  this._moveDir.addScaledVector(this._right, -1);
    if (inp.isKeyDown('KeyD') || inp.isKeyDown('ArrowRight')) this._moveDir.addScaledVector(this._right,  1);

    if (this._moveDir.lengthSq() > 0) {
      this._moveDir.normalize();
      this.position.addScaledVector(this._moveDir, speed * dt);
    }

    // 맵 경계 클램프
    const limit = 38.5;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));
  }

  _applyGravity(dt) {
    if (!this.isOnGround) {
      this.velocity.y -= this.gravity * dt;
      this.position.y += this.velocity.y * dt;
    }
  }

  _collideFloor() {
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isOnGround = true;
    }
  }

  _syncCamera() {
    const eyeH = this.isCrouching ? this.eyeHeight * 0.6 : this.eyeHeight;
    this.camera.position.set(
      this.position.x,
      this.position.y + eyeH,
      this.position.z,
    );
    // 오일러 회전 적용 (YXZ 순서)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /** 피격 처리 */
  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp = Math.max(0, this.hp - amount);
    this._flashDamage();
    if (this.hp <= 0) {
      this.isAlive = false;
      this.deaths++;
    }
  }

  _flashDamage() {
    this._flashEl.classList.add('active');
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flashEl.classList.remove('active');
    }, 120);
  }

  getHpRatio() { return this.hp / this.maxHp; }

  /** 카메라 월드 위치 (히트스캔용) */
  getEyePosition() { return this.camera.position.clone(); }

  /** 카메라가 바라보는 방향 벡터 */
  getLookDirection() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}
