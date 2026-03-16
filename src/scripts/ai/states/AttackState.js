import * as THREE from 'three';

/**
 * AttackState — 플레이어를 조준하고 사격
 * 전이: HP< threshold → Cover / 탄약 0 → Cover / 거리 너무 멀 → Chase
 */
export class AttackState {
  constructor(agent) {
    this._agent       = agent;
    this._fireTimer   = 0;
    this._reactionTimer = 0;
    this._ammo        = 20; // AI 내부 탄약 (간략화)
  }

  enter() {
    this._agent.log('Attack');
    this._reactionTimer = this._agent.params.reactionTime ?? 0.45;
    this._ammo = 20;
  }

  update(dt) {
    const agent   = this._agent;
    const params  = agent.params;
    const player  = agent.playerRef;

    // 반응 지연
    if (this._reactionTimer > 0) {
      this._reactionTimer -= dt;
      return;
    }

    if (!player?.isAlive) { agent.setState('idle'); return; }

    // 플레이어 방향으로 회전
    const toPlayer = new THREE.Vector3()
      .subVectors(player.position, agent.mesh.position);
    toPlayer.y = 0;
    agent.yaw = Math.atan2(toPlayer.x, toPlayer.z);

    // 사격
    this._fireTimer -= dt;
    const fireInterval = 60 / (params.attackRpm ?? 300);
    if (this._fireTimer <= 0 && agent.perception.canSeePlayer()) {
      this._fireBullet(params, player);
      this._fireTimer = fireInterval;
      this._ammo--;
    }

    // 전이 조건
    const dist = agent.mesh.position.distanceTo(player.position);
    if (agent.hp / agent.maxHp < params.coverHpThreshold) {
      agent.setState('cover'); return;
    }
    if (this._ammo <= 0) {
      agent.setState('cover'); return;
    }
    if (dist > params.attackRange * 1.6 || !agent.perception.canSeePlayer()) {
      agent.setState('chase'); return;
    }
  }

  _fireBullet(params, player) {
    // accuracy 기반 명중 여부 (서버 없이 클라이언트 확률로만 처리)
    if (Math.random() > (params.accuracy ?? 0.72)) return;

    const damage = params.attackDamage ?? 15;
    player.takeDamage(damage);
  }

  exit() {}
}
