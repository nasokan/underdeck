export type Suit = 'S' | 'C' | 'D' | 'H';
export type BossKey = 'warden' | 'leech' | 'rust' | 'crown' | 'mimic' | 'swarm';
export type RelicKey =
  | 'whetstone' | 'trophy' | 'cloak' | 'blood' | 'packrat' | 'duelist' | 'exec'
  | 'hoarder' | 'irongut' | 'scavenger' | 'glass' | 'bloodletter' | 'tooth';

export const SYM: Record<Suit, string> = { S: '♠', C: '♣', D: '♦', H: '♥' };
export const rankName = (v: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[v] ?? String(v);

export const FLOORS = ['Hall', 'Vault', 'Lair'] as const;
// Tuning knobs. Targets for Hall / Vault / Lair at Depth 1, multiplied by GROWTH each Depth.
export const BASE_TARGETS = [35, 60, 90];
export const GROWTH = 1.45;
export const DEPTHS = 8;
export const MAX_RELICS = 5;
export const START_HP = 20;
export const START_GOLD = 4;
export const floorTarget = (depth: number, fi: number) => Math.round((BASE_TARGETS[fi] * Math.pow(GROWTH, depth - 1)) / 5) * 5;

export interface RelicDef { name: string; desc: string; cost: number }
export const RELICS: Record<RelicKey, RelicDef> = {
  whetstone: { name: 'Whetstone', desc: 'Your weapon can also hit monsters equal to its last kill.', cost: 6 },
  trophy: { name: 'Trophy Rack', desc: '+1 Fury for every 4 kills this floor.', cost: 7 },
  cloak: { name: "Coward's Cloak", desc: '+1 flee per floor.', cost: 5 },
  blood: { name: 'Blood Price', desc: 'Potions stop healing. Each one gives +2 Fury for the rest of the floor.', cost: 6 },
  packrat: { name: 'Pack Rat', desc: 'Rooms advance after you resolve 2 cards instead of 3.', cost: 7 },
  duelist: { name: 'Duelist', desc: '×2 Glory on a kill that leaves you at 5 HP or less.', cost: 6 },
  exec: { name: 'Executioner', desc: 'A weapon kill that deals you 0 damage gains Valor equal to the weapon’s power.', cost: 6 },
  hoarder: { name: 'Hoarder', desc: 'When a room is completed, gain Glory equal to your gold.', cost: 7 },
  irongut: { name: 'Iron Gut', desc: '+6 max HP.', cost: 5 },
  scavenger: { name: 'Scavenger', desc: 'Replacing a weapon pays gold equal to its chain.', cost: 4 },
  glass: { name: 'Glass Blade', desc: '+3 Fury on weapon kills. −6 max HP.', cost: 6 },
  bloodletter: { name: 'Bloodletter', desc: 'Brawl kills use your weapon’s chain for Fury.', cost: 6 },
  tooth: { name: 'Gilded Tooth', desc: '+1 gold for each monster above 10 you kill.', cost: 5 },
};

export interface BossDef { name: string; desc: string; caption: string }
export const BOSSES: Record<BossKey, BossDef> = {
  warden: { name: 'The Warden', desc: 'You cannot flee.', caption: 'Locked the exits. Kept the keys. Ate the keys.' },
  leech: { name: 'The Leech', desc: 'Potions heal half.', caption: 'Your health is its love language.' },
  rust: { name: 'The Rustking', desc: 'Weapons break after 3 kills.', caption: 'Every blade he touches retires early.' },
  crown: { name: 'The Hollow Crown', desc: 'J, Q and K monsters count as 15.', caption: 'Nobody is wearing it. Somehow that is worse.' },
  mimic: { name: 'The Mimic', desc: 'One card per room is face-down and resolves blind when you pick it.', caption: 'That chest is breathing.' },
  swarm: { name: 'The Swarm', desc: 'Rooms hold 5 cards and you resolve 4.', caption: 'Too many of them. Too few of you.' },
};

export interface Lore { name: string; caption: string }
export function bestiary(suit: Suit, v: number, risen = false): Lore {
  if (suit === 'S') {
    if (risen) return { name: 'Risen Dead', caption: 'Back again. Less of it, same attitude.' };
    if (v <= 5) return { name: 'Skeleton', caption: 'Mostly calcium. Entirely hostile.' };
    if (v <= 9) return { name: 'Ghoul', caption: 'Eats the dead. Willing to make exceptions.' };
    if (v === 10) return { name: 'Wraith', caption: 'Cold, grey and emotionally unavailable.' };
    if (v === 11) return { name: 'Revenant', caption: 'Swore an oath. Took it too far.' };
    if (v === 12) return { name: 'Banshee', caption: 'Screams at your funeral. Early.' };
    if (v === 13) return { name: 'Lich', caption: 'Hid his soul in a jar. Lost the jar.' };
    return { name: 'Bone King', caption: 'He remembers his crown. Nobody else does.' };
  }
  if (suit === 'C') {
    if (v <= 5) return { name: 'Rat Swarm', caption: 'Individually harmless. Collectively, rent.' };
    if (v <= 9) return { name: 'Dire Wolf', caption: 'A wolf, but with a grievance.' };
    if (v === 10) return { name: 'Cave Bear', caption: 'Was here first. Will mention it.' };
    if (v === 11) return { name: 'Basilisk', caption: 'Avoid eye contact. Or do, briefly.' };
    if (v === 12) return { name: 'Manticore', caption: 'Lion, scorpion, bat. Designed by committee.' };
    if (v === 13) return { name: 'Wyrm', caption: 'Skipped the wings. Went straight to spite.' };
    return { name: 'The Elder Beast', caption: 'The woods have eyes. These are them.' };
  }
  if (suit === 'D') {
    if (v <= 4) return { name: 'Dagger', caption: 'Pointy end goes in the monster.' };
    if (v <= 7) return { name: 'Sword', caption: 'Classic. Reliable. Dulls like everything else.' };
    if (v <= 9) return { name: 'Battle Axe', caption: 'Subtlety is for people with armor.' };
    return { name: 'Greatsword', caption: 'Compensating for something. It works.' };
  }
  if (v <= 4) return { name: 'Vial', caption: 'A sip of feeling slightly better.' };
  if (v <= 7) return { name: 'Flask', caption: 'Tastes like regret. Heals like hope.' };
  return { name: 'Cauldron', caption: 'Do not ask what is in it. Drink.' };
}

export const FAMILY = { S: { name: 'Undead', trait: 'Rise: face cards come back once at half value.' }, C: { name: 'Beasts', trait: 'Pack: +1 strength per other ♣ in the room.' } };
export const SIGIL_DESC: Record<Suit, string> = {
  S: 'Undead give +3 Valor per level.',
  C: 'Beasts give +3 Valor per level.',
  D: 'Weapons gain +1 power per level.',
  H: 'Potions heal +2 more per level.',
};
