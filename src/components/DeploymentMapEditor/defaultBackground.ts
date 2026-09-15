// Generates a gothic-vibe default board background (void gradient + faint grid + gold
// border) so a new deployment map isn't a blank white rectangle before anything is uploaded.
export function getDefaultMapBackground(widthIn: number, heightIn: number): string {
  const gridStep = 6
  let gridLines = ''
  for (let x = gridStep; x < widthIn; x += gridStep) {
    gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${heightIn}" stroke="#1a1a24" stroke-width="0.06" />`
  }
  for (let y = gridStep; y < heightIn; y += gridStep) {
    gridLines += `<line x1="0" y1="${y}" x2="${widthIn}" y2="${y}" stroke="#1a1a24" stroke-width="0.06" />`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthIn}" height="${heightIn}" viewBox="0 0 ${widthIn} ${heightIn}">
    <defs>
      <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#14141c" />
        <stop offset="100%" stop-color="#05050a" />
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="${widthIn}" height="${heightIn}" fill="url(#vignette)" />
    ${gridLines}
    <rect x="0.4" y="0.4" width="${widthIn - 0.8}" height="${heightIn - 0.8}" fill="none" stroke="#6b5530" stroke-width="0.3" />
  </svg>`

  return `data:image/svg+xml;base64,${btoa(svg)}`
}
