// ── Types ─────────────────────────────────────────────────────────────────────

export interface CatFile {
  name: string
  path: string
  rawUrl: string
}

interface GitTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

interface GitTreeResponse {
  tree: GitTreeItem[]
  truncated: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRawUrl(owner: string, repo: string, filePath: string): string {
  const encoded = filePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')
  return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encoded}`
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchRepoFileList(
  repoOwner: string,
  repoSlug: string,
): Promise<{ gstFiles: CatFile[]; catFiles: CatFile[] }> {
  const url = `https://api.github.com/repos/${repoOwner}/${repoSlug}/git/trees/HEAD?recursive=1`

  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (response.status === 403 || response.status === 429) {
    throw new Error(
      'GitHub API rate limit reached. Wait a minute and try again, or add a GitHub token.',
    )
  }
  if (response.status === 404) {
    throw new Error(
      `Repository "${repoOwner}/${repoSlug}" not found. The BSData catalogue may be out of date.`,
    )
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch repository file list (HTTP ${response.status}).`)
  }

  const data: GitTreeResponse = await response.json()

  const gstFiles: CatFile[] = []
  const catFiles: CatFile[] = []

  for (const item of data.tree) {
    if (item.type !== 'blob') continue
    const lower = item.path.toLowerCase()
    const fileName = item.path.split('/').pop() ?? item.path

    if (lower.endsWith('.gst')) {
      gstFiles.push({ name: fileName, path: item.path, rawUrl: buildRawUrl(repoOwner, repoSlug, item.path) })
    } else if (lower.endsWith('.cat')) {
      // Strip extension for display name
      const displayName = fileName.replace(/\.cat$/i, '')
      catFiles.push({ name: displayName, path: item.path, rawUrl: buildRawUrl(repoOwner, repoSlug, item.path) })
    }
  }

  // Sort catalogues alphabetically
  catFiles.sort((a, b) => a.name.localeCompare(b.name))

  return { gstFiles, catFiles }
}

export async function fetchRawXml(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file (HTTP ${response.status}): ${url}`)
  }
  return response.text()
}
