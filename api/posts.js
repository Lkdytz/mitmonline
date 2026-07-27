const { getFile, putFile } = require('./githubHelpers')

module.exports = async (req, res) => {
  if (!process.env.GITHUB_TOKEN || !process.env.REPO_OWNER || !process.env.REPO_NAME) {
    return res.status(500).json({ error: 'Server not configured: set GITHUB_TOKEN, REPO_OWNER, REPO_NAME in Vercel env' })
  }

  try {
    if (req.method === 'GET') {
      const { json } = await getFile()
      return res.json(json.posts || [])
    }

    if (req.method === 'POST') {
      const { title, content, author } = req.body
      if (!title || !content) return res.status(400).json({ error: 'title and content required' })

      // retry loop to handle SHA conflicts
      for (let attempt = 0; attempt < 4; attempt++) {
        const { json, sha } = await getFile()
        json.posts = json.posts || []
        json.nextId = json.nextId || 1
        const post = { id: json.nextId++, title, content, author: author || 'Anonymous', replies: [], createdAt: Date.now() }
        json.posts.unshift(post)
        try {
          await putFile(json, sha, `Add post ${post.id}`)
          return res.json(post)
        } catch (e) {
          // conflict: retry
          if (attempt === 3) throw e
        }
      }
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).end('Method Not Allowed')
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
