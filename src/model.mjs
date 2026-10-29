export const WEAPONS = {
  dumbbell: { name: 'Haltères', icon: '🏋', color: '#ffb75e', subtitle: 'Le respect, au corps à corps.', damage: 24, delay: 0.85, range: 100 },
  plate: { name: 'Disques', icon: '◉', color: '#a8b6ff', subtitle: 'Retour de fonte imminent.', damage: 16, delay: 0.7, range: 330 },
  shaker: { name: 'Shakers', icon: '⚗', color: '#b6ee77', subtitle: '100 % protéines. 200 % dégâts.', damage: 12, delay: 1.1, range: 260 },
};
export const COMBOS = {
  'dumbbell+dumbbell': ['Double biceps', 'Une onde de choc à faire sauter les coutures.'],
  'dumbbell+plate': ['Jour de jambes', 'Un tourbillon de fonte, sans échauffement.'],
  'dumbbell+shaker': ['Mixeur de compétition', 'Une explosion de protéines brûlantes.'],
  'plate+plate': ['Disco fonte', 'Des disques. Partout. Surtout dans les slimes.'],
  'plate+shaker': ['Smoothie orbital', 'Une pluie de projectiles protéinés.'],
  'shaker+shaker': ['Surdose de whey', 'Un bain de protéines hautement déconseillé.'],
};
export const comboKey = (weapons) => [...weapons].sort().join('+');
export const talentCost = (level) => 8 + level * 7;
export const weaponCost = (level) => 12 + level * 10;
export const skillNames = ['Muscles', 'Endurance', 'Fureur'];
export function freshSave() {
  return { version: 1, body: [0, 0, 0], gear: [0, 0, 0], earnedBody: [0, 0, 0], earnedGear: [0, 0, 0], skills: [0, 0, 0], levels: { dumbbell: 1, plate: 0, shaker: 0 }, weapons: ['dumbbell', 'dumbbell'], talents: [[0, 0, 0], [0, 0, 0]], unlocked: 1, codex: [], bodyPresets: [], gearPresets: [], muted: false, runs: 0, bestKills: 0 };
}
export function validateSave(input) {
  if (!input || typeof input !== 'object' || input.version !== 1) throw new Error('Format de sauvegarde non reconnu.');
  const s = freshSave();
  const num = (n, max = 1e9) => Number.isInteger(n) && n >= 0 && n <= max;
  const triple = (v, max = 1e9) => Array.isArray(v) && v.length === 3 && v.every(n => num(n, max));
  for (const k of ['body', 'gear', 'earnedBody', 'earnedGear']) {
    if (!triple(input[k])) throw new Error('Réserves de gelée invalides.');
    s[k] = [...input[k]];
  }
  if (!triple(input.skills, 5)) throw new Error('Talents de personnage invalides.');
  s.skills = [...input.skills];
  const loadout = (p) => p && Array.isArray(p.weapons) && p.weapons.length === 2 && p.weapons.every(w => Object.hasOwn(WEAPONS, w)) && Array.isArray(p.talents) && p.talents.length === 2 && p.talents.every(t => triple(t, 3));
  for (const w of Object.keys(WEAPONS)) {
    if (!num(input.levels?.[w], 5)) throw new Error('Niveaux d’armes invalides.');
    s.levels[w] = input.levels[w];
  }
  if (!s.levels.dumbbell || !loadout(input) || input.weapons.some(w => !s.levels[w])) throw new Error('Équipement invalide.');
  s.weapons = [...input.weapons]; s.talents = input.talents.map(t => [...t]);
  if (!num(input.unlocked, 3) || input.unlocked < 1) throw new Error('Difficulté invalide.');
  s.unlocked = input.unlocked;
  s.codex = Array.isArray(input.codex) ? [...new Set(input.codex.filter(k => Object.hasOwn(COMBOS, k)))] : [];
  for (const k of ['runs', 'bestKills']) { if (num(input[k])) s[k] = input[k]; }
  s.muted = input.muted === true;
  const nameValid = p => typeof p?.name === 'string' && p.name.trim().length > 0 && p.name.length <= 32;
  if (Array.isArray(input.bodyPresets)) s.bodyPresets = input.bodyPresets.filter(p => nameValid(p) && triple(p.skills, 5)).slice(0, 12).map(p => ({name: p.name, skills: [...p.skills]}));
  if (Array.isArray(input.gearPresets)) s.gearPresets = input.gearPresets.filter(p => nameValid(p) && loadout(p)).slice(0, 12).map(p => ({name: p.name, weapons: [...p.weapons], talents: p.talents.map(t => [...t])}));
  return s;
}
export function investment(values, cost = talentCost) {
  return values.map(n => Array.from({ length: n }, (_, i) => cost(i)).reduce((a, b) => a + b, 0));
}
// Purchases are transactional: a failed preset never partially changes a wallet.
export function replaceTalents(wallet, current, next, cost = talentCost) {
  const oldCost = investment(current, cost), newCost = investment(next, cost);
  const result = wallet.map((v, i) => v + oldCost[i] - newCost[i]);
  return result.every(v => v >= 0) ? result : null;
}
export function replaceGear(save, preset) {
  if (preset.weapons.some(w => !save.levels[w])) return null;
  const refund = investment(save.talents[0]).map((v,i) => v + investment(save.talents[1])[i]);
  const cost = investment(preset.talents[0]).map((v,i) => v + investment(preset.talents[1])[i]);
  const wallet = save.gear.map((v,i) => v + refund[i] - cost[i]);
  return wallet.every(v => v >= 0) ? wallet : null;
}
