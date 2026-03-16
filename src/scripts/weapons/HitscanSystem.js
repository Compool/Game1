import * as THREE from 'three';

/**
 * HitscanSystem — Raycaster 기반 히트스캔 사격
 * 카메라 중심에서 레이를 쏘아 AI 에이전트 또는 정적 지형에 충돌을 판정한다.
 */
export class HitscanSystem {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this._raycaster = new THREE.Raycaster();
    this._raycaster.far = 300;

    // 비주얼 피드백 — 총알 궤적선
    this._tracerPool = [];
    this._POOL_SIZE  = 8;
    this._initTracerPool();
  }

  _initTracerPool() {
    const mat = new THREE.LineBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < this._POOL_SIZE; i++) {
      const geo  = new THREE.BufferGeometry();
      const pts  = new Float32Array(6); // 2점 × 3
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const line = new THREE.Line(geo, mat.clone());
      line.visible = false;
      this.scene.add(line);
      this._tracerPool.push({ line, timer: 0 });
    }
  }

  /**
   * 발사
   * @param {THREE.Vector3} origin — 카메라 눈 위치
   * @param {THREE.Vector3} direction — 카메라 전방 벡터 (분산 포함)
   * @param {Object} weaponData — 무기 스탯
   * @param {Array} aiAgents — 피격 가능한 AI 에이전트 배열
   * @param {Array} staticObjects — 지형 오브젝트 배열 (관통 방지)
   * @returns {{ hit: boolean, agent?: AIAgent, damage?: number }}
   */
  fire(origin, direction, weaponData, aiAgents, staticObjects) {
    // 분산(spread) 적용
    const spread = weaponData._spread ?? 0;
    const d = direction.clone();
    if (spread > 0) {
      d.x += (Math.random() - 0.5) * spread * 2;
      d.y += (Math.random() - 0.5) * spread * 2;
      d.normalize();
    }

    this._raycaster.set(origin, d);

    // AI 자식 메시 수집 (Group 내 body/head mesh)
    const aiMeshes = [];
    for (const agent of aiAgents) {
      if (!agent.isAlive) continue;
      agent.mesh.traverse(child => {
        if (child.isMesh) aiMeshes.push(child);
      });
    }

    // 전체 충돌 대상
    const targets = [...aiMeshes, ...staticObjects];
    const intersects = this._raycaster.intersectObjects(targets, false);

    // 궤적 비주얼
    const hitPoint = intersects.length > 0
      ? intersects[0].point
      : origin.clone().addScaledVector(d, 80);
    this._spawnTracer(origin, hitPoint);

    if (intersects.length === 0) return { hit: false };

    const first = intersects[0];

    // AI 에이전트 명중 확인: mesh._agentRef 역참조
    const hitAgent = first.object._agentRef ?? aiAgents.find(a => {
      let found = false;
      a.mesh.traverse(c => { if (c === first.object) found = true; });
      return found;
    });
    if (hitAgent && hitAgent.isAlive) {
      // 부위 판정 (단순 Y 위치로 추정)
      const localY = first.point.y - hitAgent.mesh.position.y;
      const zone   = this._getHitZone(localY, hitAgent);
      const mult   = weaponData.hitMultipliers?.[zone] ?? 1.0;
      const damage = Math.round(weaponData.damage * mult);

      hitAgent.takeDamage(damage);
      this._spawnHitEffect(first.point, zone === 'head');

      return { hit: true, agent: hitAgent, damage, zone };
    }

    // 지형 명중 — 파티클 효과
    this._spawnHitEffect(first.point, false);
    return { hit: true, agent: null };
  }

  _getHitZone(localY, agent) {
    // 에이전트 높이 기준으로 head/torso/limb 구분
    const h = agent.agentHeight ?? 1.8;
    const ratio = localY / h;
    if (ratio > 0.75) return 'head';
    if (ratio > 0.3)  return 'torso';
    return 'limb';
  }

  _spawnTracer(from, to) {
    const entry = this._tracerPool.find(e => !e.line.visible) ?? this._tracerPool[0];
    const pos   = entry.line.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x,   to.y,   to.z);
    pos.needsUpdate = true;
    entry.line.visible = true;
    entry.timer = 0.08; // 80ms 표시
  }

  _spawnHitEffect(point, isHeadshot) {
    // 임팩트 파티클: 작은 구체로 표현
    const color = isHeadshot ? 0xff2222 : 0xffbb44;
    const geo   = new THREE.SphereGeometry(0.06, 6, 6);
    const mat   = new THREE.MeshBasicMaterial({ color });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.copy(point);
    this.scene.add(spark);
    setTimeout(() => { this.scene.remove(spark); geo.dispose(); mat.dispose(); }, 200);
  }

  /** 궤적선 타이머 업데이트 */
  update(dt) {
    for (const entry of this._tracerPool) {
      if (!entry.line.visible) continue;
      entry.timer -= dt;
      if (entry.timer <= 0) entry.line.visible = false;
    }
  }
}
