const express = require('express')
const path = require('path')
const { getFile, putFile } = require('./api/githubHelpers')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname)))

app.get('/Funkyfre.ttf', (req, res) => {
  res.sendFile(path.join(__dirname, 'Funkyfre.ttf'))
})

app.get('/forums', (req, res) => {
  res.sendFile(path.join(__dirname, 'forums', 'index.html'))
})

app.get('/forums/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'forums', 'index.html'))
})

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/api/posts', async (req, res) => {
  try {
    const { json } = await getFile()
    res.json(json.posts || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, author } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' })
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      json.posts = json.posts || []
      json.nextId = json.nextId || 1
      const post = {
        id: json.nextId++,
        title,
        content,
        author: author || 'Anonymous',
        replies: [],
        reactions: { like: 0 },
        createdAt: Date.now()
      }
      json.posts.unshift(post)
      try {
        await putFile(json, sha, `Add post ${post.id}`)
        return res.json(post)
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/posts/:id/replies', async (req, res) => {
  try {
    const { content, author } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Reply content required' })
    }
    const id = Number(req.params.id)

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      json.posts = json.posts || []
      const post = json.posts.find(p => p.id === id)
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      post.replies = post.replies || []
      const reply = {
        id: Date.now(),
        content,
        author: author || 'Anonymous',
        createdAt: Date.now()
      }
      post.replies.push(reply)
      try {
        await putFile(json, sha, `Add reply to post ${id}`)
        return res.json(reply)
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/posts/:id/reactions', async (req, res) => {
  try {
    const { type } = req.body
    if (!type || type !== 'like') {
      return res.status(400).json({ error: 'Reaction type invalid' })
    }
    const id = Number(req.params.id)

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      json.posts = json.posts || []
      const post = json.posts.find(p => p.id === id)
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      post.reactions = post.reactions || { like: 0 }
      post.reactions.like = (post.reactions.like || 0) + 1
      try {
        await putFile(json, sha, `Add like to post ${id}`)
        return res.json({ type, count: post.reactions.like })
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' })
  }
  if (req.path.startsWith('/forums')) {
    return res.sendFile(path.join(__dirname, 'forums', 'index.html'))
  }
  res.sendFile(path.join(__dirname, 'index.html'))
})

module.exports = app
