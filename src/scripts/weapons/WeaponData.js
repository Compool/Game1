import weaponsJson from '../../config/weapons.json';

/**
 * WeaponData — weapons.json 로드 및 무기 스탯 조회
 */
export class WeaponData {
  constructor() {
    this._data = weaponsJson;
  }

  getWeapon(id) {
    const w = this._data[id];
    if (!w) throw new Error(`WeaponData: Unknown weapon id "${id}"`);
    return { ...w };
  }

  list() {
    return Object.keys(this._data);
  }
}
