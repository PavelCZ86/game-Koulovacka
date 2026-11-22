// Vánoční koulovačka – multiplayer server (stačí Node.js, žádné balíčky)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, MAX = 8;
const COLS = ['#2e7d32', '#1565c0', '#f9a825', '#6a1b9a', '#00838f', '#d84315', '#5d4037', '#c2185b'];

function page() {
  return fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('/*SERVER_FLAG*/', 'window.KOUL_SERVER=true;');
}
const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }); res.end('ok'); return; }
  if (u === '/' || u === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(page());
  } else { res.writeHead(404); res.end('Nenalezeno'); }
});

// ---- minimální WebSocket ----
function sendFrame(sock, str, op = 1) {
  if (sock.destroyed) return;
  const data = Buffer.from(str), n = data.length;
  let head;
  if (n < 126) head = Buffer.from([0x80 | op, n]);
  else if (n < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  sock.write(Buffer.concat([head, data]));
}
function parseFrame(b) {
  if (b.length < 2) return null;
  const op = b[0] & 15, masked = b[1] & 128; let len = b[1] & 127, off = 2;
  if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
  const mo = masked ? 4 : 0; if (b.length < off + mo + len) return null;
  let data = Buffer.from(b.subarray(off + mo, off + mo + len));
  if (masked) { const m = b.subarray(off, off + 4); for (let i = 0; i < data.length; i++) data[i] ^= m[i & 3]; }
  return { op, data, size: off + mo + len };
}
let nextId = 1;
const clients = new Set(), rooms = new Map(); let roomNo = 0;

srv.on('upgrade', (req, sock) => {
  if (req.url.split('?')[0] !== '/ws' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  sock.setNoDelay(true);
  const c = { id: nextId++, sock, name: 'Santa', room: null, col: COLS[0], alive: true };
  clients.add(c);
  let buf = Buffer.alloc(0);
  sock.on('data', d => {
    buf = Buffer.concat([buf, d]); c.alive = true;
    for (;;) {
      const f = parseFrame(buf); if (!f) break; buf = buf.subarray(f.size);
      if (f.op === 8) { sock.end(); break; }
      if (f.op === 9) { sendFrame(sock, f.data.toString(), 10); continue; }
      if (f.op === 10) { c.alive = true; continue; }
      if (f.op === 1) { let m; try { m = JSON.parse(f.data.toString('utf8')); } catch (e) { continue; } onMsg(c, m); }
    }
  });
  const bye = () => drop(c); sock.on('close', bye); sock.on('error', bye);
});
const send = (c, o) => sendFrame(c.sock, JSON.stringify(o));
function toRoom(room, o, except) { const s = JSON.stringify(o); for (const p of room.players.values()) if (p !== except) sendFrame(p.sock, s); }
function lobbyInfo() { return [...rooms.values()].map(r => ({ id: r.id, name: r.name, n: r.players.size, max: MAX, names: [...r.players.values()].map(p => p.name) })); }
function lobbyBroadcast() { const s = JSON.stringify({ t: 'lobby', rooms: lobbyInfo() }); for (const c of clients) if (!c.room) sendFrame(c.sock, s); }
function newRoom() { const r = { id: ++roomNo, name: 'Aréna ' + roomNo, players: new Map(), scores: {} }; rooms.set(r.id, r); return r; }
function join(c, r) {
  if (c.room) leave(c, true);
  if (!r || r.players.size >= MAX) { send(c, { t: 'full' }); return; }
  const used = new Set([...r.players.values()].map(p => p.col));
  c.col = COLS.find(x => !used.has(x)) || COLS[c.id % COLS.length];
  c.room = r; r.players.set(c.id, c); r.scores[c.id] = 0;
  const list = [...r.players.values()].map(p => ({ id: p.id, name: p.name, col: p.col, score: r.scores[p.id] || 0 }));
  send(c, { t: 'joined', you: c.id, col: c.col, room: { id: r.id, name: r.name }, players: list });
  toRoom(r, { t: 'pj', id: c.id, name: c.name, col: c.col, score: 0 }, c);
  console.log(`${c.name} vstoupil do ${r.name} (${r.players.size}/${MAX})`);
  lobbyBroadcast();
}
function leave(c, silent) {
  const r = c.room; if (!r) return;
  r.players.delete(c.id); delete r.scores[c.id]; c.room = null;
  toRoom(r, { t: 'pl', id: c.id });
  if (!r.players.size) rooms.delete(r.id);
  if (!silent) lobbyBroadcast();
}
function drop(c) { if (!clients.has(c)) return; clients.delete(c); leave(c); try { c.sock.destroy(); } catch (e) {} }

function onMsg(c, m) {
  switch (m.t) {
    case 'hello':
      c.name = String(m.name || 'Santa').replace(/[<>]/g, '').trim().slice(0, 14) || 'Santa';
      send(c, { t: 'welcome', id: c.id, max: MAX }); send(c, { t: 'lobby', rooms: lobbyInfo() }); break;
    case 'name': c.name = String(m.name || 'Santa').replace(/[<>]/g, '').trim().slice(0, 14) || 'Santa'; break;
    case 'quick': { let best = null; for (const r of rooms.values()) if (r.players.size < MAX && (!best || r.players.size > best.players.size)) best = r; join(c, best || newRoom()); break; }
    case 'create': join(c, newRoom()); break;
    case 'join': join(c, rooms.get(m.room)); break;
    case 'leave': leave(c); send(c, { t: 'lobby', rooms: lobbyInfo() }); break;
    case 'st': case 'throw': case 'boom':
      if (c.room) { m.id = c.id; toRoom(c.room, m, c); } break;
    case 'ko': {
      const r = c.room; if (!r) break;
      const by = r.players.has(m.by) && m.by !== c.id ? m.by : 0;
      if (by) r.scores[by] = (r.scores[by] || 0) + 1;
      toRoom(r, { t: 'ko', by, v: c.id, scores: r.scores });
      break;
    }
  }
}
// odpojení mrtvých spojení
setInterval(() => { for (const c of clients) { if (!c.alive) { drop(c); continue; } c.alive = false; sendFrame(c.sock, '', 9); } }, 15000);

srv.listen(PORT, () => {
  console.log('Vánoční koulovačka – server běží na http://localhost:' + PORT + '  (ukončení: Ctrl+C)');
  const nets = require('os').networkInterfaces();
  for (const k in nets) for (const a of nets[k]) if (a.family === 'IPv4' && !a.internal) console.log('  v místní síti (telefon na stejné WiFi): http://' + a.address + ':' + PORT);
});
