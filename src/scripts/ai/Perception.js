import * as THREE from 'three';

/**
 * Perception — AI 시야(Raycast) + 소리 이벤트
 */
export class Perception {
  constructor(agent, scene, staticObjects) {
    this._agent   = agent;
    this._scene   = scene;
    this._statics = staticObjects;
    this._raycaster = new THREE.Raycaster();
    this._raycaster.far = 30;

    this.fovAngle   = 90 * (Math.PI / 180); // 반각 → 실제 FOV 90°
    this.alertPos   = null; // 사운드 이벤트로 받은 위치
    this._canSee    = false;
    this._lastSeen  = null; // 마지막으로 플레이어를 본 위치
    this._lostTimer = 0;
  }

  /** 매 프레임 업데이트 */
  update(dt, playerPos, playerAlive, detRange) {
    if (!playerAlive) { this._canSee = false; return; }

    const agentPos = this._agent.mesh.position;
    const toPlayer = new THREE.Vector3().subVectors(playerPos, agentPos);
    const dist     = toPlayer.length();

    if (dist > detRange) {
      this._tickLost(dt);
      return;
    }

    // 시야각 체크
    const forward = new THREE.Vector3(
      Math.sin(this._agent.yaw),
      0,
      Math.cos(this._agent.yaw),
    );
    const angle = Math.acos(
      Math.max(-1, Math.min(1, forward.dot(toPlayer.clone().normalize()))),
    );

    if (angle > this.fovAngle) {
      this._tickLost(dt);
      return;
    }

    // 가시선(LOS) 레이캐스트
    this._raycaster.far = dist + 0.5;
    this._raycaster.set(agentPos.clone().setY(agentPos.y + 1.0), toPlayer.clone().normalize());
    const hits = this._raycaster.intersectObjects(this._statics, false);

    if (hits.length > 0 && hits[0].distance < dist - 0.3) {
      this._tickLost(dt);
      return;
    }

    // 플레이어 감지 성공
    this._canSee    = true;
    this._lastSeen  = playerPos.clone();
    this._lostTimer = 0;
  }

  _tickLost(dt) {
    if (this._canSee) {
      this._canSee    = false;
      this._lostTimer = 0;
    } else {
      this._lostTimer += dt;
    }
  }

  canSeePlayer()    { return this._canSee; }
  getLastSeenPos()  { return this._lastSeen; }
  getLostDuration() { return this._lostTimer; }

  /** 총성 이벤트 수신 */
  onSoundEvent(pos) {
    this.alertPos = pos.clone();
  }
}
