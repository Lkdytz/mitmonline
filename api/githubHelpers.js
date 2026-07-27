const TOKEN = process.env.GITHUB_TOKEN
const OWNER = process.env.REPO_OWNER
const REPO = process.env.REPO_NAME
const BRANCH = process.env.BRANCH || 'main'
const FILE_PATH = process.env.DATA_FILE_PATH || 'data.json'

if (!TOKEN || !OWNER || !REPO) {
  // handlers will check and return errors
}

async function getFile() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`
  const res = await fetch(url, { headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' } })
  if (!res.ok) return { json: { posts: [], nextId: 1 }, sha: null }
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf8')
  return { json: JSON.parse(content), sha: data.sha }
}

async function putFile(newJson, sha, message = 'Update forum data') {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`
  const content = Buffer.from(JSON.stringify(newJson, null, 2)).toString('base64')
  const body = { message, content, branch: BRANCH }
  if (sha) body.sha = sha
  const res = await fetch(url, { method: 'PUT', headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error('GitHub PUT failed: ' + txt)
  }
  return res.json()
}

module.exports = { getFile, putFile }
