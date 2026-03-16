import gameCfg from '../config/game.json';

/**
 * InputManager — 마우스·키보드 입력 중앙 관리
 * PointerLock API로 마우스를 캡처하고 mouseDelta를 축적한다.
 */
export class InputManager {
  constructor() {
    this.keys = {};       // 현재 눌린 키 상태
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseButtons = {}; // 0: LMB, 2: RMB
    this.isPointerLocked = false;
    this.sensitivity = gameCfg.camera.mouseSensitivity;

    this._pendingDX = 0;
    this._pendingDY = 0;

    this._bindEvents();
  }

  _bindEvents() {
    // PointerLock 상태 변화
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });

    // 마우스 이동
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this._pendingDX += e.movementX;
      this._pendingDY += e.movementY;
    });

    // 마우스 버튼
    document.addEventListener('mousedown', (e) => {
      if (this.isPointerLocked) this.mouseButtons[e.button] = true;
    });
    document.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    // 키보드
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 우클릭 메뉴 방지
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** PointerLock 요청 */
  requestPointerLock() {
    document.body.requestPointerLock();
  }

  /** PointerLock 해제 */
  exitPointerLock() {
    document.exitPointerLock();
  }

  /** GameLoop 매 프레임 호출 — 델타값 플러시 */
  flush() {
    this.mouseDeltaX = this._pendingDX;
    this.mouseDeltaY = this._pendingDY;
    this._pendingDX  = 0;
    this._pendingDY  = 0;
  }

  isKeyDown(code)   { return !!this.keys[code]; }
  isLMBDown()       { return !!this.mouseButtons[0]; }
  isRMBDown()       { return !!this.mouseButtons[2]; }
}
