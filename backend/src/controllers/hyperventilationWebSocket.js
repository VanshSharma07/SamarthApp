// Simple WebSocket broadcaster for hyperventilation test streams
const wsClients = new Set();

export function addClient(ws) {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  try { ws.send(JSON.stringify({ success: true, message: 'connected to hyperventilation stream' })); } catch (e) { }
}

export function broadcast(payload) {
  const str = JSON.stringify(payload);
  for (const ws of wsClients) {
    try {
      ws.send(str);
    } catch (e) {
      try { ws.terminate(); } catch (e2) {}
      wsClients.delete(ws);
    }
  }
}

export function clientCount() { return wsClients.size; }
