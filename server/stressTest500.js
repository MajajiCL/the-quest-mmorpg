import WebSocket from 'ws';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:3000/ws';
const TARGET_CLIENTS = Number(process.env.CLIENTS || 500);
const AVATARS = ['RobotExpressive', 'Soldier', 'Xbot'];
const ZONES = ['hub', 'hub', 'copper', 'jade', 'crystal'];

console.log(`====================================================================`);
console.log(`🧪 INICIANDO TEST DE CARGA REAL: ${TARGET_CLIENTS} JUGADORES WEBSOCKET`);
console.log(`🎯 Servidor Destino: ${SERVER_URL}`);
console.log(`====================================================================`);

const clients = [];
let connectedCount = 0;
let messagesReceived = 0;
let bytesReceived = 0;
const startTime = Date.now();

for (let i = 0; i < TARGET_CLIENTS; i++) {
  setTimeout(() => {
    const ws = new WebSocket(SERVER_URL);
    const botState = {
      name: `LoadTest_${i + 1}`,
      avatar: AVATARS[i % AVATARS.length],
      zone: ZONES[i % ZONES.length],
      angle: Math.random() * Math.PI * 2,
      radius: 10 + Math.random() * 110,
      speed: 0.03 + Math.random() * 0.04
    };

    ws.on('open', () => {
      connectedCount++;
      ws.send(JSON.stringify({
        t: 'join',
        name: botState.name,
        avatar: botState.avatar
      }));
    });

    ws.on('message', (data) => {
      messagesReceived++;
      bytesReceived += data.length || 0;
    });

    ws.on('error', () => {});
    clients.push({ ws, botState });
  }, i * 4); // Stagger connection over 2 seconds
}

// Simulate movement at 10Hz from all 500 connected clients
const moveInterval = setInterval(() => {
  for (const c of clients) {
    if (c.ws.readyState === 1) {
      c.botState.angle += c.botState.speed;
      const x = Math.cos(c.botState.angle) * c.botState.radius;
      const z = Math.sin(c.botState.angle) * c.botState.radius;
      c.ws.send(JSON.stringify({
        t: 'move',
        x,
        y: 0,
        z,
        ry: -c.botState.angle,
        anim: 'Run',
        zone: c.botState.zone
      }));
    }
  }
}, 100);

// Finish benchmark after 7 seconds and print report
setTimeout(() => {
  clearInterval(moveInterval);
  const elapsedSec = (Date.now() - startTime) / 1000;
  console.log(`\n✅ RESULTADO DEL BENCHMARK DE 500 JUGADORES CONCURRENTES:`);
  console.log(`   • Conexiones WebSocket Simultáneas Exitosas: ${connectedCount} / ${TARGET_CLIENTS}`);
  console.log(`   • Paquetes AoI Sincronizados Recibidos:      ${messagesReceived.toLocaleString()}`);
  console.log(`   • Tráfico Total Procesado:                   ${(bytesReceived / (1024 * 1024)).toFixed(2)} MB en ${elapsedSec.toFixed(1)}s`);
  console.log(`   • Rendimiento Promedio:                      ${Math.round(messagesReceived / elapsedSec).toLocaleString()} paquetes/seg`);
  console.log(`====================================================================\n`);

  for (const c of clients) {
    try { c.ws.close(); } catch {}
  }
  process.exit(0);
}, 7500);
