import * as THREE from 'three';
import gameCfg from '../config/game.json';

/**
 * Renderer — Three.js WebGLRenderer, Scene, Camera, Lights 초기화
 * PointerLockControls 없이 직접 카메라를 InputManager와 연동한다.
 */
export class Renderer {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene  = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this._initRenderer();
    this._initCamera();
    this._initLights();
    this._initFog();
    this._handleResize();

    // Stats overlay (개발용)
    this._frameCount = 0;
    this._lastFpsTime = performance.now();
    this._fps = 0;
    this._statsEl = this._createStatsEl();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = gameCfg.graphics.shadowsEnabled;
    this.renderer.shadowMap.type   = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  _initCamera() {
    const cfg = gameCfg.camera;
    this.camera = new THREE.PerspectiveCamera(
      cfg.fovDefault,
      window.innerWidth / window.innerHeight,
      0.05,
      300,
    );
    this.camera.position.set(0, cfg.eyeHeight ?? 1.65, 0);
  }

  _initLights() {
    // 환경광
    const hemi = new THREE.HemisphereLight(0x8ec5d6, 0x3d3020, 0.7);
    this.scene.add(hemi);

    // 태양광 (그림자)
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 150;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top   = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // 보조 채움광
    const fill = new THREE.DirectionalLight(0x4060a0, 0.4);
    fill.position.set(-20, 10, -20);
    this.scene.add(fill);
  }

  _initFog() {
    if (gameCfg.graphics.fogEnabled) {
      this.scene.fog = new THREE.Fog(
        0x1a2030,
        gameCfg.graphics.fogNear,
        gameCfg.graphics.fogFar,
      );
    }
  }

  _handleResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _createStatsEl() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:8px; left:8px; z-index:9999;
      font:11px monospace; color:#0f0; background:rgba(0,0,0,0.55);
      padding:3px 7px; border-radius:3px; pointer-events:none;
    `;
    document.body.appendChild(el);
    return el;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    // FPS counter
    this._frameCount++;
    const now = performance.now();
    if (now - this._lastFpsTime >= 500) {
      this._fps = Math.round(this._frameCount / ((now - this._lastFpsTime) / 1000));
      this._frameCount = 0;
      this._lastFpsTime = now;
      this._statsEl.textContent = `${this._fps} FPS`;
    }
  }

  setFOV(fov) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
}
