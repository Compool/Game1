/**
 * CoverState — 가장 가까운 엄폐물로 이동 후 회복/재장전
 * 전이: 회복/재장전 완료 → Attack
 */
export class CoverState {
  constructor(agent) {
    this._agent      = agent;
    this._coverTimer = 0;
    this._reached    = false;
    this._coverPoint = null;
  }

  enter() {
    this._agent.log('Cover');
    this._reached = false;
    this._coverPoint = this._agent.nav.findNearestCover(
      this._agent.mesh.position,
    );
    if (this._coverPoint) {
      this._agent.nav.setTarget(this._coverPoint);
    }
    this._coverTimer = this._agent.params.coverDuration ?? 3.0;
  }

  update(dt) {
    const agent  = this._agent;
    const params = agent.params;

    if (!this._reached) {
      const arrived = agent.nav.moveTo(dt, params.chaseSpeed * 1.1);
      if (arrived) {
        this._reached = true;
        // HP 회복
        agent.hp = Math.min(agent.maxHp, agent.hp + agent.maxHp * 0.25);
      }
      return;
    }

    // 엄폐 중 대기
    this._coverTimer -= dt;
    if (this._coverTimer <= 0) {
      agent.setState('attack');
    }
  }

  exit() {
    this._agent.nav.clearTarget();
  }
}
