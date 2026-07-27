const express = require('express')
const path = require('path')
const crypto = require('crypto')
const { getFile, putFile } = require('./api/githubHelpers')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname)))

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex')
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex')
}

function ensureForumData(json) {
  json.posts = json.posts || []
  json.users = json.users || []
  json.nextId = json.nextId || 1
  json.nextUserId = json.nextUserId || 1
}

function getUserByToken(json, token) {
  if (!token) return null
  return json.users.find(user => user.token === token)
}

function isUsernameTaken(json, username) {
  const normalized = String(username).trim().toLowerCase()
  if (!normalized) return false
  if (json.users.some(user => user.username.toLowerCase() === normalized)) return true
  return json.posts.some(post => (post.author || '').toLowerCase() === normalized || (post.replies || []).some(reply => (reply.author || '').toLowerCase() === normalized))
}

app.get('/Funkyfre.ttf', (req, res) => {
  res.sendFile(path.join(__dirname, 'Funkyfre.ttf'))
})

app.get('/forums', (req, res) => {
  res.sendFile(path.join(__dirname, 'forums', 'index.html'))
})

app.get('/forums/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'forums', 'index.html'))
})

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'index.html'))
})

app.get('/login/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'index.html'))
})

app.get('/login/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login', 'index.html'))
})

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup', 'index.html'))
})

app.get('/signup/', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup', 'index.html'))
})

app.get('/signup/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup', 'index.html'))
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

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { json } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' })
    }
    res.json({ username: user.username, id: user.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' })
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      if (isUsernameTaken(json, username)) {
        return res.status(400).json({ error: 'Username already in use' })
      }
      const token = generateToken()
      const user = {
        id: json.nextUserId++,
        username: String(username).trim(),
        password: hashPassword(password),
        token
      }
      json.users.push(user)
      try {
        await putFile(json, sha, `Create user ${user.username}`)
        return res.json({ username: user.username, token, id: user.id })
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' })
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      const user = json.users.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase())
      if (!user || user.password !== hashPassword(password)) {
        return res.status(401).json({ error: 'Invalid username or password' })
      }
      user.token = generateToken()
      try {
        await putFile(json, sha, `Log in user ${user.username}`)
        return res.json({ username: user.username, token: user.token, id: user.id })
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/posts', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { title, content, author } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' })
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      const user = getUserByToken(json, token)
      const postAuthor = user ? user.username : (author || 'Anonymous')
      const post = {
        id: json.nextId++,
        title,
        content,
        author: postAuthor,
        replies: [],
        reactions: { like: 0 },
        likedBy: [],
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
    const token = req.headers['x-user-token']
    const { content, author } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Reply content required' })
    }
    const id = Number(req.params.id)

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      const post = json.posts.find(p => p.id === id)
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      const user = getUserByToken(json, token)
      const replyAuthor = user ? user.username : (author || 'Guest')

      post.replies = post.replies || []
      const reply = {
        id: Date.now(),
        content,
        author: replyAuthor,
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
    const token = req.headers['x-user-token']
    const { type } = req.body
    if (!type || type !== 'like') {
      return res.status(400).json({ error: 'Reaction type invalid' })
    }
    if (!token) {
      return res.status(401).json({ error: 'Login required to like posts' })
    }
    const id = Number(req.params.id)

    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      const post = json.posts.find(p => p.id === id)
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      const user = getUserByToken(json, token)
      if (!user) {
        return res.status(401).json({ error: 'Invalid login token' })
      }
      post.likedBy = post.likedBy || []
      if (post.likedBy.includes(user.id)) {
        return res.status(400).json({ error: 'You already liked this post' })
      }
      post.reactions = post.reactions || { like: 0 }
      post.likedBy.push(user.id)
      post.reactions.like = post.likedBy.length
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
