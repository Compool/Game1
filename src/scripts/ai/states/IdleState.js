import * as THREE from 'three';

/**
 * IdleState — 웨이포인트 순찰 & 경계
 * 전이: canSeePlayer() → Chase / alertPos → Chase
 */
export class IdleState {
  constructor(agent) {
    this._agent     = agent;
    this._waitTimer = 0;
    this._waiting   = false;
    this._patrolIdx = 0;
    this._patrolPts = null;
  }

  enter() {
    this._agent.log('Idle');
    this._buildPatrol();
    this._waiting = false;
    this._waitTimer = 0;
  }

  _buildPatrol() {
    const pos = this._agent.mesh.position;
    const r   = this._agent.params.patrolRadius ?? 10;
    const n   = 4;
    this._patrolPts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this._patrolPts.push({
        x: pos.x + Math.cos(a) * r * (0.5 + Math.random() * 0.5),
        z: pos.z + Math.sin(a) * r * (0.5 + Math.random() * 0.5),
      });
    }
  }

  update(dt) {
    const agent = this._agent;

    // 전이: 플레이어 감지
    if (agent.perception.canSeePlayer() || agent.perception.alertPos) {
      agent.perception.alertPos = null;
      agent.setState('chase');
      return;
    }

    if (this._waiting) {
      this._waitTimer -= dt;
      if (this._waitTimer <= 0) {
        this._waiting = false;
        this._patrolIdx = (this._patrolIdx + 1) % this._patrolPts.length;
      }
      return;
    }

    const pt = this._patrolPts[this._patrolIdx];
    const { x, z } = pt;
    const target = new THREE.Vector3(x, 0, z);
    agent.nav.setTarget(target);
    const arrived = agent.nav.moveTo(dt, agent.params.moveSpeed);
    if (arrived) {
      this._waiting   = true;
      this._waitTimer = 1.5 + Math.random() * 1.5;
    }
  }

  exit() {}
}
