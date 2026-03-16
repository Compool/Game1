import * as THREE from 'three';

/**
 * SceneManager — 맵(바닥/벽/커버) 생성 + CoverPoint/SpawnPoint 등록
 * 박스 지오메트리로 구성된 프로토타입 맵. 이후 GLB 로드 방식으로 교체 가능.
 */
export class SceneManager {
  constructor(scene) {
    this.scene = scene;
    /** @type {THREE.Vector3[]} */
    this.coverPoints  = [];
    /** @type {THREE.Vector3[]} */
    this.spawnPoints  = [];
    /** @type {THREE.Vector3} */
    this.playerSpawn  = new THREE.Vector3(0, 0, 0);
    /** @type {THREE.Object3D[]} 히트스캔이 충돌 검사할 정적 지형 */
    this.staticObjects = [];

    this._buildMap();
  }

  _mat(color, roughness = 0.85, metalness = 0.05) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  _box(w, h, d, mat, x, y, z, rx = 0, ry = 0) {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.staticObjects.push(mesh);
    return mesh;
  }

  _buildMap() {
    /* ── 바닥 ── */
    const floorMat = this._mat(0x3d4a38, 0.95, 0.0);
    this._box(80, 0.4, 80, floorMat, 0, -0.2, 0);

    /* ── 외벽 ── */
    const wallMat = this._mat(0x5a5a6a, 0.9, 0.1);
    this._box(80, 5, 1,  wallMat,  0, 2.5, -40);  // 북
    this._box(80, 5, 1,  wallMat,  0, 2.5,  40);  // 남
    this._box(1,  5, 80, wallMat, -40, 2.5,  0);  // 서
    this._box(1,  5, 80, wallMat,  40, 2.5,  0);  // 동

    /* ── 커버 오브젝트 배치 ── */
    const coverMat  = this._mat(0x7a6a50, 0.8, 0.15);
    const barrelMat = this._mat(0x8b3a2a, 0.7, 0.3);
    const crateMat  = this._mat(0x8b7355, 0.85, 0.1);

    const covers = [
      // [w, h, d, x, z] — y 자동 계산
      [3, 1.2, 1, -8, -8],
      [1, 1.2, 3,  8, -8],
      [2, 1.2, 2, -8,  8],
      [2, 1.2, 1,  8,  8],
      [1, 1.5, 1, -4, -2],
      [1, 1.5, 1,  4,  2],
      [3, 1.0, 1,  0, -14],
      [3, 1.0, 1,  0,  14],
      [1, 1.0, 3, -14,  0],
      [1, 1.0, 3,  14,  0],
      [2, 0.9, 2, -16, -16],
      [2, 0.9, 2,  16,  16],
      [2, 0.9, 2, -16,  16],
      [2, 0.9, 2,  16, -16],
    ];

    const mats = [coverMat, barrelMat, crateMat];
    covers.forEach(([w, h, d, x, z], i) => {
      const mesh = this._box(w, h, d, mats[i % mats.length], x, h / 2, z);
      // 커버 포인트 = 오브젝트 뒤쪽 (z 방향으로 약간 떨어진 위치)
      this.coverPoints.push(new THREE.Vector3(x, 0, z + (z >= 0 ? 1.5 : -1.5)));
      this.coverPoints.push(new THREE.Vector3(x + (x >= 0 ? 1.5 : -1.5), 0, z));
    });

    /* ── 스폰 포인트 (AI용) ── */
    const spawnPositions = [
      [-18, -18], [18, -18], [-18, 18], [18, 18],
      [-24,   0], [24,   0], [  0, -24], [0,  24],
    ];
    spawnPositions.forEach(([x, z]) => {
      this.spawnPoints.push(new THREE.Vector3(x, 0, z));
    });

    /* ── 플레이어 스폰 ── */
    this.playerSpawn.set(0, 0, 0);

    /* ── 장식: 사각 기둥들 ── */
    const pillarMat = this._mat(0x656070, 0.75, 0.2);
    [[-20, -20], [20, -20], [-20, 20], [20, 20]].forEach(([x, z]) => {
      this._box(1.2, 4, 1.2, pillarMat, x, 2, z);
    });

    /* ── 하늘 배경색 ── */
    this.scene.background = new THREE.Color(0x1a2030);
  }

  /** AI 에이전트용 랜덤 스폰포인트 반환 (중복 없음) */
  getAISpawnPoints(count) {
    const shuffled = [...this.spawnPoints].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /** 현재 등록된 커버 포인트 중 가장 가까운 것 반환 */
  findNearestCover(position, excludeRadius = 1.5) {
    let best = null;
    let bestDist = Infinity;
    for (const cp of this.coverPoints) {
      const d = cp.distanceTo(position);
      if (d > excludeRadius && d < bestDist) {
        bestDist = d;
        best = cp;
      }
    }
    return best ?? this.coverPoints[0];
  }
}
