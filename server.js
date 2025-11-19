// Simple SSE server with JSON persistence for SAES board
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const STATE_PATH = '/data/state.json';

// serve static files in repo (so saes_board_v1.html can be opened at /saes_board_v1.html)
app.use(express.static(__dirname));
// send root to the board
app.get('/', (req, res) => {
  res.redirect('/saes_portal_locations_v1.html');
});

// helpers
function loadState(){
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch { return { state: null }; }
}
function saveState(obj){
  fs.writeFileSync(STATE_PATH, JSON.stringify(obj, null, 2));
}

// SSE connections
let clients = [];
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  clients.push(res);

  // send current state immediately
  const curr = loadState();
  res.write(`data: ${JSON.stringify({ type: 'hello', state: curr.state })}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// persist and broadcast patches
app.post('/patch', (req, res) => {
  const { state } = req.body || {};
  if (typeof state === 'undefined') return res.status(400).json({ ok: false, error: 'missing state' });

  saveState({ state });
  const msg = `data: ${JSON.stringify({ type: 'patch', state })}\n\n`;
  clients.forEach(c => c.write(msg));

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SAES board server running at http://localhost:${PORT}`));
