const { readFileSync } = require('fs')
const { join } = require('path')

module.exports = (req, res) => {
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
}
