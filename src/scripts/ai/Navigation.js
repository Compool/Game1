import * as THREE from 'three';

/**
 * Navigation — 웨이포인트 이동 및 커버포인트 조회
 */
export class Navigation {
  constructor(agent, sceneManager) {
    this._agent   = agent;
    this._scene   = sceneManager;
    this._target  = null;
    this._arrived = false;
  }

  /** 목표 설정 */
  setTarget(vec3) {
    this._target  = vec3.clone();
    this._target.y = 0;
    this._arrived = false;
  }

  clearTarget() { this._target = null; }

  /** 매 프레임 목표 방향으로 이동
   *  @returns {boolean} 도착 여부
   */
  moveTo(dt, speed) {
    if (!this._target) return true;

    const pos  = this._agent.mesh.position;
    const toT  = new THREE.Vector3().subVectors(this._target, pos);
    toT.y = 0;
    const dist = toT.length();

    if (dist < 0.5) {
      this._arrived = true;
      return true;
    }

    const dir = toT.normalize();
    pos.addScaledVector(dir, speed * dt);

    // 에이전트 회전 방향 갱신
    this._agent.yaw = Math.atan2(dir.x, dir.z);

    // 맵 경계
    const limit = 38.5;
    pos.x = Math.max(-limit, Math.min(limit, pos.x));
    pos.z = Math.max(-limit, Math.min(limit, pos.z));

    return false;
  }

  hasArrived() { return this._arrived; }

  findNearestCover(position) {
    return this._scene.findNearestCover(position);
  }
}
