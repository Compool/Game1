import { AIAgent }        from './ai/AIAgent.js';
import aiConfig            from '../config/ai.json';

/**
 * GameManager — 매치 흐름(스폰, 스코어, 종료) 관리
 */
export class GameManager {
  constructor(scene, sceneManager, staticObjects, hud) {
    this._sceneManager  = sceneManager;
    this._staticObjects = staticObjects;
    this._hud           = hud;
    this._scene         = scene;

    /** @type {AIAgent[]} */
    this.agents  = [];
    this.kills   = 0;
    this.deaths  = 0;

    this._onMatchEnd = null; // callback(result)
    this._mode       = 'solo';
    this._waveNum    = 0;
    this._waveTimer  = 0;
  }

  /**
   * 매치 시작
   * @param {Object} opts — { aiCount, difficulty, mode, player }
   */
  startMatch(opts) {
    this._mode      = opts.mode ?? 'solo';
    this._aiCount   = opts.aiCount ?? 4;
    this._params    = aiConfig[opts.difficulty ?? 'normal'];
    this._player    = opts.player;
    this.kills      = 0;
    this.deaths     = 0;
    this._waveNum   = 0;
    this._waveTimer = 0;

    this._spawnWave(this._aiCount);
    AIAgent._nextId = 0;
  }

  _spawnWave(count) {
    this._waveNum++;
    // 기존 에이전트 정리
    for (const a of this.agents) {
      if (!a.isAlive) continue;
      a.mesh.visible = false;
    }
    this.agents = [];

    const spawnPts = this._sceneManager.getAISpawnPoints(count);
    for (let i = 0; i < count; i++) {
      const agent = new AIAgent(
        this._scene,
        this._sceneManager,
        this._staticObjects,
        { ...this._params },
      );
      agent.playerRef = this._player;
      const pt = spawnPts[i % spawnPts.length];
      agent.spawn(pt);
      this.agents.push(agent);
    }

    this._hud.updateScore(this.kills, this.agents.filter(a => a.isAlive).length);
    console.log(`[GameManager] Wave ${this._waveNum} — ${count} AI spawned`);
  }

  /** 매 프레임 호출 */
  update(dt) {
    if (!this._player) return;

    let aliveCount = 0;
    for (const agent of this.agents) {
      agent.update(dt);
      if (agent.isAlive) aliveCount++;
    }

    // 킬 카운팅
    const newKills = this.agents.filter(a => !a.isAlive && !a._counted).length;
    for (const a of this.agents) {
      if (!a.isAlive && !a._counted) {
        a._counted = true;
        this.kills++;
      }
    }

    this._hud.updateScore(this.kills, aliveCount);

    // 플레이어 사망
    if (!this._player.isAlive) {
      this.deaths++;
      this._endMatch('defeat');
      return;
    }

    // Wave Survival: 모든 AI 제거 → 다음 웨이브
    if (aliveCount === 0) {
      if (this._mode === 'wave') {
        this._waveTimer += dt;
        if (this._waveTimer >= 3) {
          this._waveTimer = 0;
          this._spawnWave(this._aiCount + this._waveNum);
        }
      } else {
        // Solo Skirmish: 클리어
        this._endMatch('victory');
      }
    }
  }

  _endMatch(result) {
    if (this._matchEnded) return;
    this._matchEnded = true;
    console.log(`[GameManager] Match ended: ${result}`);
    this._onMatchEnd?.(result, {
      kills:   this.kills,
      deaths:  this.deaths,
      shots:   this._player.shots ?? 0,
      hits:    this._player.hits  ?? 0,
    });
  }

  resetMatch() {
    this._matchEnded = false;
    for (const a of this.agents) {
      this._scene.remove(a.mesh);
    }
    this.agents = [];
    this.kills  = 0;
    this.deaths = 0;
  }

  /** 소리 이벤트를 모든 AI에 전파 (반경 내) */
  broadcastSound(pos, radius = 20) {
    for (const agent of this.agents) {
      if (!agent.isAlive) continue;
      if (agent.mesh.position.distanceTo(pos) <= radius) {
        agent.alertSound(pos);
      }
    }
  }

  setOnMatchEnd(cb) { this._onMatchEnd = cb; }
}
