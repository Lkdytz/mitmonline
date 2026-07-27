const { getFile, putFile } = require('../../githubHelpers')

module.exports = async (req, res) => {
  if (!process.env.GITHUB_TOKEN || !process.env.REPO_OWNER || !process.env.REPO_NAME) {
    return res.status(500).json({ error: 'Server not configured: set GITHUB_TOKEN, REPO_OWNER, REPO_NAME in Vercel env' })
  }
  try {
    const id = Number(req.query.id)
    if (req.method === 'POST') {
      const { content, author } = req.body
      if (!content) return res.status(400).json({ error: 'content required' })

      for (let attempt = 0; attempt < 4; attempt++) {
        const { json, sha } = await getFile()
        json.posts = json.posts || []
        const post = json.posts.find(p => p.id === id)
        if (!post) return res.status(404).json({ error: 'post not found' })
        const reply = { id: Date.now(), content, author: author || 'Anonymous', createdAt: Date.now() }
        post.replies = post.replies || []
        post.replies.push(reply)
        try {
          await putFile(json, sha, `Add reply to post ${id}`)
          return res.json(reply)
        } catch (e) {
          if (attempt === 3) throw e
        }
      }
    }
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method Not Allowed')
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
