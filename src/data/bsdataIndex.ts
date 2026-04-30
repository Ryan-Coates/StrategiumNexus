export interface BsDataSystemManifest {
  slug: string
  name: string
  description: string
  repoOwner: string
  repoSlug: string
  tags: string[]
  inProgress?: boolean
  wipNote?: string
}

export const BSDATA_SYSTEMS: BsDataSystemManifest[] = [
  {
    slug: 'wh40k',
    name: 'Warhammer 40,000',
    description:
      '10th edition datasheets, matched play points, and faction rules for the far future.',
    repoOwner: 'BSData',
    repoSlug: 'wh40k-10e',
    tags: ['Sci-Fi', 'Games Workshop'],
  },
  {
    slug: 'necromunda',
    name: 'Necromunda',
    description:
      'Gang warfare in the underhive. Campaigns, hired guns, and treacherous terrain rules.',
    repoOwner: 'BSData',
    repoSlug: 'necromunda',
    tags: ['Sci-Fi', 'Games Workshop', 'Campaign'],
    inProgress: true,
    wipNote: 'We are working on the format here — feel free to download and have a look.',
  },
  {
    slug: 'killteam',
    name: 'Kill Team',
    description: 'Elite skirmish warfare in the 41st millennium — fast and lethal.',
    repoOwner: 'BSData',
    repoSlug: 'wh40k-killteam',
    tags: ['Sci-Fi', 'Games Workshop', 'Skirmish'],
    inProgress: true,
    wipNote: 'We are working on the format here — feel free to download and have a look.',
  },
  {
    slug: 'horus-heresy',
    name: 'The Horus Heresy',
    description:
      'The Age of Darkness — Space Marine legions clash in the greatest civil war the galaxy has known.',
    repoOwner: 'BSData',
    repoSlug: 'horus-heresy',
    tags: ['Sci-Fi', 'Games Workshop'],
    inProgress: true,
    wipNote: 'We are working on the format here — feel free to download and have a look.',
  },
  {
    slug: 'aos',
    name: 'Age of Sigmar',
    description: 'Epic fantasy battles across the Mortal Realms.',
    repoOwner: 'BSData',
    repoSlug: 'age-of-sigmar',
    tags: ['Fantasy', 'Games Workshop'],
    inProgress: true,
    wipNote: 'We are working on the format here — feel free to download and have a look.',
  },
  {
    slug: 'old-world',
    name: 'Warhammer: The Old World',
    description: 'Mass battle fantasy in the world-that-was. Return to the Old World.',
    repoOwner: 'BSData',
    repoSlug: 'warhammer-the-old-world',
    tags: ['Fantasy', 'Games Workshop'],
    inProgress: true,
    wipNote: 'We are working on the format here — feel free to download and have a look.',
  },
]
