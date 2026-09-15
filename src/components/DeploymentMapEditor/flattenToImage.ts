// Rasterizes the editor's live SVG board into a flat PNG data URL, reusing the existing
// deploymentMapImage field so NarrativeView / PDF export need no changes.
export async function flattenSvgToPng(svgEl: SVGSVGElement, widthIn: number, heightIn: number, pixelsPerInch = 16): Promise<string> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(widthIn))
  clone.setAttribute('height', String(heightIn))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to rasterize deployment map'))
    img.src = svgDataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(widthIn * pixelsPerInch)
  canvas.height = Math.round(heightIn * pixelsPerInch)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

// Caps uploaded background images at a reasonable width to keep Firestore documents
// (1 MiB limit) well within budget alongside the structured object list.
export async function downscaleImage(dataUrl: string, maxWidth = 1600): Promise<string> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
  if (img.width <= maxWidth) return dataUrl

  const scale = maxWidth / img.width
  const canvas = document.createElement('canvas')
  canvas.width = maxWidth
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}
