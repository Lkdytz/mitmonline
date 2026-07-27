const TOKEN = process.env.GITHUB_TOKEN
const OWNER = process.env.REPO_OWNER
const REPO = process.env.REPO_NAME
const BRANCH = process.env.BRANCH || 'main'
const FILE_PATH = process.env.DATA_FILE_PATH || 'data.json'

function ensureEnv() {
  if (!TOKEN || !OWNER || !REPO) {
    throw new Error('Missing GitHub environment variables: GITHUB_TOKEN, REPO_OWNER, REPO_NAME')
  }
}

async function getFile() {
  ensureEnv()
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  })
  if (res.status === 404) {
    return { json: { posts: [], nextId: 1 }, sha: null }
  }
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GitHub GET failed: ${res.status} ${txt}`)
  }
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf8')
  return { json: JSON.parse(content), sha: data.sha }
}

async function putFile(newJson, sha, message = 'Update forum data') {
  ensureEnv()
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`
  const content = Buffer.from(JSON.stringify(newJson, null, 2)).toString('base64')
  const body = { message, content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error('GitHub PUT failed: ' + txt)
  }
  return res.json()
}

module.exports = { getFile, putFile }
