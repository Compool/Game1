/**
 * ChaseState — 플레이어를 향해 추적
 * 전이: attackRange 이내 → Attack / lostDuration > 5s → Idle
 */
export class ChaseState {
  constructor(agent) {
    this._agent = agent;
  }

  enter() {
    this._agent.log('Chase');
  }

  update(dt) {
    const agent      = this._agent;
    const perception = agent.perception;
    const { THREE }  = agent;
    const params     = agent.params;

    const lastSeen = perception.getLastSeenPos() ?? agent.playerRef?.position;
    if (!lastSeen) { agent.setState('idle'); return; }

    // 추적
    agent.nav.setTarget(lastSeen);
    agent.nav.moveTo(dt, params.chaseSpeed);

    const pos  = agent.mesh.position;
    const dist = pos.distanceTo(lastSeen);

    // 공격 범위 도달
    if (dist <= params.attackRange && perception.canSeePlayer()) {
      agent.setState('attack');
      return;
    }

    // 시야 상실 5초 → Idle
    if (!perception.canSeePlayer() && perception.getLostDuration() > 5) {
      agent.setState('idle');
    }
  }

  exit() {
    this._agent.nav.clearTarget();
  }
}
