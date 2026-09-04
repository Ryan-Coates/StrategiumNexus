import type { GameSize, ZoneWaveResult, SpawnTableEntry, DespairCard } from '../types/horde'

export const CAMPAIGN_POOL_CAP = 3000

export function zoneCountForGameSize(gameSize: GameSize): number {
  return gameSize === 'small' ? 2 : 4
}

/** Spawn roll modifier from the round-based escalation rules. */
export function calcRoundModifier(round: number): number {
  if (round >= 5) return 2
  if (round >= 3) return 1
  return 0
}

/** Number of Despair Cards drawn at the start of this round. */
export function calcDespairCardCount(round: number): number {
  if (round >= 5) return 3
  if (round >= 2) return 1
  return 0
}

export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6)
}

export function roll2d6(): number {
  return rollD6() + rollD6()
}

/**
 * Converts a modified 2D6 SpawnRoll into a Wave Points (WP) budget for that zone.
 * 2D6 alone ranges 2-12; the round modifier (+0/+1/+2) can push it up to 14, so these
 * breakpoints are spaced across the full 2-14 range rather than the old 2-17-ish scale —
 * otherwise the top tiers (50/60 WP) were mathematically unreachable at any round.
 */
export function calcWavePoints(spawnRoll: number): number {
  if (spawnRoll <= 6) return 10
  if (spawnRoll <= 8) return 20
  if (spawnRoll <= 10) return 30
  if (spawnRoll <= 12) return 40
  if (spawnRoll <= 13) return 50
  return 60
}

/** Short "Tier N" label for a unit's WP cost, matching the calcWavePoints tier scale (10WP=Tier 1 ... 60WP=Tier 6). */
export function tierLabelForPoints(pointsCost: number): string {
  const tier = Math.min(6, Math.max(1, Math.ceil(pointsCost / 10)))
  return `Tier ${tier}`
}

export interface WaveTierFaction {
  faction: string
  units: string
}

export interface WaveTier {
  pointsCost: number
  label: string
  factions: WaveTierFaction[]
}

/**
 * Default Chaos Wave Table tiers — shared by the Wave Generator's seeded table and the Horde Mode
 * rules reference. Example units/sizes (with model counts in brackets) are pulled directly from the
 * Chaos Space Marines, Chaos Daemons, and Chaos Knights tabs of the source Horde Spawn Tables
 * spreadsheet, so this table is a one-stop-shop reference without needing to open the spreadsheet.
 */
export const WAVE_POINTS_TIERS: WaveTier[] = [
  {
    pointsCost: 10,
    label: 'Troops & Cultists',
    factions: [
      { faction: 'CSM', units: 'Cultist Mob (10), Traitor Guardsmen, Sorcerer' },
      { faction: 'Daemons', units: 'Nurglings (3), Flesh Hounds (5), Screamers (3)' },
      { faction: 'Knights', units: '—' },
    ],
  },
  {
    pointsCost: 20,
    label: 'Elite Infantry',
    factions: [
      { faction: 'CSM', units: 'Chosen (5), Cultist Mob (20), Chaos Terminator Lord' },
      { faction: 'Daemons', units: 'Bloodletters (10), Daemonettes (10), Blue Horrors (10)' },
      { faction: 'Knights', units: 'War Dog Huntsman, War Dog Karnivore' },
    ],
  },
  {
    pointsCost: 30,
    label: 'Heavy Infantry & Fast Attack',
    factions: [
      { faction: 'CSM', units: 'Chaos Terminators (5), Raptors (10), Possessed (10)' },
      { faction: 'Daemons', units: 'Bloodcrushers (6), Fiends (6), Flesh Hounds (10)' },
      { faction: 'Knights', units: 'War Dog Brigand, War Dog Executioner, War Dog Stalker' },
    ],
  },
  {
    pointsCost: 40,
    label: 'Vehicles & War Engines',
    factions: [
      { faction: 'CSM', units: 'Chaos Vindicator, Heldrake, Forgefiend' },
      { faction: 'Daemons', units: 'Soul Grinder, Hellflayer (2), Plague Drones (6)' },
      { faction: 'Knights', units: '—' },
    ],
  },
  {
    pointsCost: 50,
    label: 'Heavy Vehicles & Terminator Hosts',
    factions: [
      { faction: 'CSM', units: 'Chaos Terminators (10), Chaos Land Raider (Full)' },
      { faction: 'Daemons', units: 'Great Unclean One, Lord of Change' },
      { faction: 'Knights', units: 'Knight Rampager, Chaos Cerastus Knight Lancer' },
    ],
  },
  {
    pointsCost: 60,
    label: 'Superheavies & Titanic Knights',
    factions: [
      { faction: 'CSM', units: 'Khorne Lord of Skulls, Abaddon + 10 Terminators' },
      { faction: 'Daemons', units: 'Bloodthirster, Keeper of Secrets, Skarbrand' },
      { faction: 'Knights', units: 'Knight Abominant, Knight Tyrant, Chaos Acastus Knight Porphyrion' },
    ],
  },
]

/** Rolls random units from the Spawning Table (Chaos Wave Table) until the WP budget is spent. */
export function buildWave(table: SpawnTableEntry[], wavePoints: number): SpawnTableEntry[] {
  const wave: SpawnTableEntry[] = []
  let remaining = wavePoints
  let options = table.filter((e) => e.pointsCost > 0 && e.pointsCost <= remaining)
  while (options.length > 0) {
    const pick = options[Math.floor(Math.random() * options.length)]
    wave.push(pick)
    remaining -= pick.pointsCost
    options = table.filter((e) => e.pointsCost > 0 && e.pointsCost <= remaining)
  }
  return wave
}

/** Rolls one Spawning Zone's wave for the round: SpawnRoll -> Wave Points -> units. */
export function rollZone(table: SpawnTableEntry[], modifier: number): ZoneWaveResult {
  const roll = roll2d6()
  const spawnRoll = roll + modifier
  const wavePoints = calcWavePoints(spawnRoll)
  const units = buildWave(table, wavePoints)
  return { roll, spawnRoll, wavePoints, units }
}

/** Reinforcement Points (RP) earned after a mission from committed/casualty points and Threat Level. */
export function calcReinforcementPoints(committedPoints: number, casualtyPoints: number, threatLevel: number): number {
  return Math.max(0, Math.floor((committedPoints - casualtyPoints) / 10) - threatLevel)
}

// Despair Cards are original, non-copyrighted mechanical effects — no lore/flavour text.
export const DESPAIR_CARDS: DespairCard[] = [
  { id: 'penalty-to-hit', category: 'penalty', title: 'Creeping Dread', effect: 'All player units suffer -1 to Hit this round.' },
  { id: 'penalty-move', category: 'penalty', title: 'Leaden Limbs', effect: 'All player units reduce Move by 1" this round.' },
  { id: 'penalty-freeze', category: 'penalty', title: 'Frozen With Fear', effect: 'One random player unit cannot act this round.' },
  { id: 'penalty-mortal', category: 'penalty', title: 'Warp Lash', effect: 'One random player unit suffers D3 mortal wounds.' },
  { id: 'boost-wp', category: 'boost', title: 'Surge of Fury', effect: '+10 WP to all waves rolled this round.' },
  { id: 'boost-extra-wave', category: 'boost', title: 'Second Wave', effect: 'One random Spawning Zone spawns an extra wave this round.' },
  { id: 'env-gravity', category: 'environmental', title: 'Gravity Shift', effect: 'All terrain becomes difficult terrain this round.' },
  { id: 'env-fog', category: 'environmental', title: 'Warp Fog', effect: 'All ranged attacks suffer -1 to Hit this round.' },
  { id: 'env-tear', category: 'environmental', title: 'Reality Tear', effect: 'Spawn a Chaos Spawn at the centre of the battlefield.' },
  { id: 'boon-saves', category: 'boon', title: 'Steady Resolve', effect: '+1 to Saves for all player units this round.' },
  { id: 'boon-heal', category: 'boon', title: 'Field Medicae', effect: 'One player unit heals D3 wounds/models.' },
  { id: 'boon-supply', category: 'boon', title: 'Supply Cache', effect: '+1 Supply Point for all players.' },
]

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function shuffledDespairDeck(): string[] {
  return shuffle(DESPAIR_CARDS.map((c) => c.id))
}

/** Draws `count` Despair Cards, reshuffling the discard pile back in once the draw pile is empty. */
export function drawDespairCards(
  drawPile: string[],
  discardPile: string[],
  count: number,
): { drawn: DespairCard[]; drawPile: string[]; discardPile: string[] } {
  let draw = [...drawPile]
  let discard = [...discardPile]
  const drawnIds: string[] = []
  for (let i = 0; i < count; i++) {
    if (draw.length === 0) {
      if (discard.length === 0) break
      draw = shuffle(discard)
      discard = []
    }
    const id = draw.shift()
    if (!id) break
    drawnIds.push(id)
    discard.push(id)
  }
  const drawn = drawnIds.map((id) => DESPAIR_CARDS.find((c) => c.id === id)).filter((c): c is DespairCard => Boolean(c))
  return { drawn, drawPile: draw, discardPile: discard }
}
