import * as THREE from 'three';
import { Perception }   from './Perception.js';
import { Navigation }   from './Navigation.js';
import { IdleState }    from './states/IdleState.js';
import { ChaseState }   from './states/ChaseState.js';
import { AttackState }  from './states/AttackState.js';
import { CoverState }   from './states/CoverState.js';

/**
 * AIAgent — 개별 AI 캐릭터. FSM + Perception + Navigation 통합.
 */
export class AIAgent {
  static _nextId = 0;

  constructor(scene, sceneManager, staticObjects, aiParams) {
    this.id       = ++AIAgent._nextId;
    this.THREE    = THREE; // 상태 클래스가 THREE를 사용할 수 있도록 전달
    this.params   = aiParams;
    this.maxHp    = 100;
    this.hp       = this.maxHp;
    this.isAlive  = true;
    this.yaw      = 0;
    this.agentHeight = 1.8;

    /** @type {import('../player/Player').Player | null} */
    this.playerRef = null;

    // Mesh (캡슐 형태 — BoxGeometry로 근사)
    this.mesh = this._createMesh(scene);

    // 서브 시스템
    this.perception = new Perception(this, scene, staticObjects);
    this.nav        = new Navigation(this, sceneManager);

    // FSM 상태 등록
    this._states = {
      idle:   new IdleState(this),
      chase:  new ChaseState(this),
      attack: new AttackState(this),
      cover:  new CoverState(this),
    };
    this._currentStateName = null;
    this.setState('idle');

    // HP바 (화면 위 텍스트 — 간단히 mesh color로 표현)
    this._baseColor = new THREE.Color(0x2196f3);
    this._hitColor  = new THREE.Color(0xff5722);
    this._flashTimer = 0;
  }

  _createMesh(scene) {
    // 몸통
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.4, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.7 });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;

    // 머리
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.8 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;

    // 루트 그룹
    const root = new THREE.Group();
    root.add(body, head);
    root.castShadow = true;
    scene.add(root);

    // 히트스캔용 단일 메시 참조 (body를 대표 메시로)
    body._agentRef = this;
    this._bodyMesh = body;

    // mesh = root (위치 이동에 사용)
    root._agentRef = this;
    return root;
  }

  spawn(pos) {
    this.mesh.position.set(pos.x, pos.y, pos.z);
    this.hp = this.maxHp;
    this.isAlive = true;
    this.mesh.visible = true;
    this.setState('idle');
  }

  /** FSM 상태 전이 */
  setState(name) {
    if (this._currentStateName === name) return;
    this._states[this._currentStateName]?.exit();
    this._currentStateName = name;
    this._states[name].enter();
  }

  /** 매 프레임 업데이트 */
  update(dt) {
    if (!this.isAlive) return;

    // 회전 동기화
    this.mesh.rotation.y = this.yaw;

    // HP 플래시 회복
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this._bodyMesh.material.color.copy(this._baseColor);
      }
    }

    // 퍼셉션 업데이트
    const playerPos   = this.playerRef?.position ?? new THREE.Vector3();
    const playerAlive = this.playerRef?.isAlive ?? false;
    this.perception.update(dt, playerPos, playerAlive, this.params.detectionRange);

    // 상태 업데이트
    this._states[this._currentStateName]?.update(dt);
  }

  /** 피격 처리 */
  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp = Math.max(0, this.hp - amount);

    // 피격 색상 플래시
    this._bodyMesh.material.color.copy(this._hitColor);
    this._flashTimer = 0.18;

    console.log(`[AI-${this.id}] HP: ${this.hp}/${this.maxHp} (-${amount})`);

    if (this.hp <= 0) this._die();
  }

  _die() {
    this.isAlive = false;
    this.mesh.visible = false;
    console.log(`[AI-${this.id}] ELIMINATED`);
  }

  /** 소리 이벤트 알림 */
  alertSound(pos) {
    this.perception.onSoundEvent(pos);
  }

  log(stateName) {
    console.log(`[AI-${this.id}] → ${stateName}`);
  }
}
