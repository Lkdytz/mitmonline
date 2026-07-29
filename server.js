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
  json.chatMessages = json.chatMessages || []
  json.polls = json.polls || []
  json.media = json.media || []
  json.events = json.events || []
  json.news = json.news || []
  json.nextId = json.nextId || 1
  json.nextUserId = json.nextUserId || 1
  json.nextMessageId = json.nextMessageId || 1
  json.nextPollId = json.nextPollId || 1
  json.nextMediaId = json.nextMediaId || 1
  json.nextEventId = json.nextEventId || 1
  json.nextNewsId = json.nextNewsId || 1
}

function getUserByToken(json, token) {
  if (!token) return null
  return json.users.find(user => user.token === token)
}

function awardBadge(json, userId, badge) {
  const user = json.users.find(u => u.id === userId)
  if (!user) return
  user.badges = user.badges || []
  if (!user.badges.includes(badge)) {
    user.badges.push(badge)
  }
}

function ensureReactionState(post) {
  post.reactions = post.reactions || { like: 0, heart: 0, laugh: 0 }
  post.reactedBy = post.reactedBy || { like: [], heart: [], laugh: [] }
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
    res.json({ username: user.username, id: user.id, bio: user.bio || '', badges: user.badges || [], joinedAt: user.joinedAt || Date.now() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    res.json(json.users.map(user => ({ id: user.id, username: user.username, bio: user.bio || '', badges: user.badges || [], joinedAt: user.joinedAt || Date.now() })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users/me', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { bio } = req.body
    const { json, sha } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' })
    }
    user.bio = String(bio || '').trim()
    await putFile(json, sha, `Update bio for ${user.username}`)
    res.json({ bio: user.bio })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/chat/messages', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    const items = [...json.chatMessages].sort((a, b) => a.createdAt - b.createdAt).slice(-100)
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/chat/messages', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Message content required' })
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const { json, sha } = await getFile()
      ensureForumData(json)
      const user = getUserByToken(json, token)
      const author = user ? user.username : `Guest #${json.chatMessages.length + 1}`
      const message = {
        id: json.nextMessageId++,
        author,
        content: String(content).trim(),
        createdAt: Date.now()
      }
      json.chatMessages.push(message)
      if (user) {
        awardBadge(json, user.id, 'Chatter')
      }
      try {
        await putFile(json, sha, `Add chat message ${message.id}`)
        return res.json(message)
      } catch (err) {
        if (attempt === 3) throw err
      }
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/polls', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    res.json(json.polls || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/polls', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { title, options } = req.body
    if (!title || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Poll title and at least two options required' })
    }
    const { json, sha } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    const poll = {
      id: json.nextPollId++,
      title: String(title).trim(),
      options: options.map(option => ({ text: String(option).trim(), count: 0 })),
      votes: {},
      author: user ? user.username : 'Guest',
      createdAt: Date.now()
    }
    json.polls.unshift(poll)
    if (user) {
      awardBadge(json, user.id, 'Poll starter')
    }
    await putFile(json, sha, `Create poll ${poll.id}`)
    res.json(poll)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/polls/:id/vote', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { option } = req.body
    const id = Number(req.params.id)
    const { json, sha } = await getFile()
    ensureForumData(json)
    const poll = json.polls.find(p => p.id === id)
    if (!poll) return res.status(404).json({ error: 'Poll not found' })
    const user = getUserByToken(json, token)
    if (!user) return res.status(401).json({ error: 'Login required to vote' })
    if (poll.votes[user.id] !== undefined) {
      return res.status(400).json({ error: 'You already voted' })
    }
    const idx = Number(option)
    if (Number.isNaN(idx) || idx < 0 || idx >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid poll option' })
    }
    poll.options[idx].count++
    poll.votes[user.id] = idx
    await putFile(json, sha, `Vote on poll ${id}`)
    res.json(poll)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/media', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    res.json(json.media || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/media', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { url, caption } = req.body
    if (!url) {
      return res.status(400).json({ error: 'Media URL required' })
    }
    const { json, sha } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    const item = {
      id: json.nextMediaId++,
      author: user ? user.username : 'Guest',
      url: String(url).trim(),
      caption: String(caption || '').trim(),
      createdAt: Date.now()
    }
    json.media.unshift(item)
    if (user) {
      awardBadge(json, user.id, 'Media sharer')
    }
    await putFile(json, sha, `Share media ${item.id}`)
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/events', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    res.json(json.events || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/events', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { title, date, description } = req.body
    if (!title || !date) {
      return res.status(400).json({ error: 'Event title and date required' })
    }
    const { json, sha } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    const item = {
      id: json.nextEventId++,
      title: String(title).trim(),
      date: String(date).trim(),
      description: String(description || '').trim(),
      author: user ? user.username : 'Guest',
      createdAt: Date.now()
    }
    json.events.unshift(item)
    if (user) {
      awardBadge(json, user.id, 'Event host')
    }
    await putFile(json, sha, `Create event ${item.id}`)
    res.json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/news', async (req, res) => {
  try {
    const { json } = await getFile()
    ensureForumData(json)
    res.json(json.news || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/news', async (req, res) => {
  try {
    const token = req.headers['x-user-token']
    const { headline, body } = req.body
    if (!headline || !body) {
      return res.status(400).json({ error: 'Headline and body required' })
    }
    const { json, sha } = await getFile()
    ensureForumData(json)
    const user = getUserByToken(json, token)
    const item = {
      id: json.nextNewsId++,
      headline: String(headline).trim(),
      body: String(body).trim(),
      author: user ? user.username : 'Guest',
      createdAt: Date.now()
    }
    json.news.unshift(item)
    if (user) {
      awardBadge(json, user.id, 'Reporter')
    }
    await putFile(json, sha, `Publish news ${item.id}`)
    res.json(item)
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
        token,
        bio: '',
        badges: [],
        joinedAt: Date.now()
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
        reactions: { like: 0, heart: 0, laugh: 0 },
        reactedBy: { like: [], heart: [], laugh: [] },
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
      if (user) {
        awardBadge(json, user.id, 'First reply')
      }
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
      ensureReactionState(post)
      const validTypes = ['like', 'heart', 'laugh']
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Reaction type invalid' })
      }
      if (post.reactedBy[type].includes(user.id)) {
        return res.status(400).json({ error: `You already reacted with ${type}` })
      }
      post.reactedBy[type].push(user.id)
      post.reactions[type] = post.reactedBy[type].length
      if (type === 'like' && !post.likedBy.includes(user.id)) {
        post.likedBy.push(user.id)
      }
      try {
        await putFile(json, sha, `Add reaction ${type} to post ${id}`)
        return res.json({ type, count: post.reactions[type] })
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
