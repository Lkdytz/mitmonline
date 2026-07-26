const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const DATA_FILE = path.join(__dirname, 'data.json')
function loadData(){ try { return JSON.parse(fs.readFileSync(DATA_FILE)) } catch(e) { return { posts: [], nextId: 1 } } }
function saveData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)) }
let data = loadData()
app.use(express.json())
app.use(express.static(path.join(__dirname)))
app.get('/api/posts', (req,res)=> res.json(data.posts))
app.post('/api/posts', (req,res)=>{
  const { title, content, author } = req.body
  if(!title || !content) return res.status(400).json({ error: 'title and content required' })
  const post = { id: data.nextId++, title, content, author: author||'Anonymous', replies: [], createdAt: Date.now() }
  data.posts.unshift(post)
  saveData(data)
  io.emit('newPost', post)
  res.json(post)
})
app.get('/api/posts/:id', (req,res)=>{
  const id = Number(req.params.id)
  const post = data.posts.find(p=>p.id===id)
  if(!post) return res.status(404).json({ error: 'not found' })
  res.json(post)
})
app.post('/api/posts/:id/replies', (req,res)=>{
  const id = Number(req.params.id)
  const { content, author } = req.body
  if(!content) return res.status(400).json({ error: 'content required' })
  const post = data.posts.find(p=>p.id===id)
  if(!post) return res.status(404).json({ error: 'not found' })
  const reply = { id: Date.now(), content, author: author||'Anonymous', createdAt: Date.now() }
  post.replies.push(reply)
  saveData(data)
  io.emit('newReply', { postId: id, reply })
  res.json(reply)
})
io.on('connection', socket=>{})
const PORT = process.env.PORT || 3000
server.listen(PORT, ()=> console.log('Forum server running on port', PORT))
