import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static production build & public assets
const distPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(distPath));
app.use(express.static(publicPath));

// ============================================================================
// THE QUEST // INTERPLANETARY MMORPG SERVER (LEVEL 1-100, ECONOMY, 500+ CCU)
// ============================================================================

const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const CELL_SIZE = 60; // Larger spatial cells for planetary & orbital flight
const AOI_RADIUS_CELLS = 2;
const MAX_NEARBY_PLAYERS = 45;

const VALID_AVATARS = [
  'Vanguard',      // Tactical Spec-Ops
  'Elena',         // Relic Hunter
  'ShadowOps',     // Stealth Obsidian
  'Kael',          // Horizon Nomad
  'DesertRanger',  // Solar Guardian
  'Aegis'          // Cybernetic Sentinel
];

const VALID_MOUNTS = [
  'none',
  'horse',         // Imperial Steed (Ground)
  'supercar',      // Supercar GT (High-speed Ground)
  'mythic_bird',   // Ave Mítica (Atmospheric Flight)
  'jet',           // Caza Atmosférico (Supersonic Flight)
  'starship'       // Nave Interplanetaria (Deep Space & Planetary Landing)
];

// Catalog of Purchasable Vehicles & Transit Fares
const VEHICLE_PRICES = {
  horse: 0,           // Unlocked by default
  supercar: 400,      // 400 Aether Credits
  mythic_bird: 650,   // 650 Aether Credits
  jet: 1200,          // 1,200 Aether Credits
  starship: 2500      // 2,500 Aether Credits
};

const TRANSIT_FARES = {
  earth_sanctuary: 50,
  earth_canyon: 100,
  earth_citadel: 150,
  moon_base: 350,
  mars_colony: 600,
  aurelia_ring: 950
};

// Level 1 to 100 XP Progression Curve
function xpRequiredForNextLevel(lvl) {
  if (lvl >= 100) return Infinity;
  return Math.floor(100 * Math.pow(lvl, 1.35));
}

function grantPlayerXP(player, amount) {
  if (player.level >= 100) return false;
  player.xp += amount;
  let leveledUp = false;
  while (player.level < 100 && player.xp >= xpRequiredForNextLevel(player.level)) {
    player.xp -= xpRequiredForNextLevel(player.level);
    player.level++;
    player.skillPoints = (player.skillPoints || 0) + 1;
    player.maxHp = 100 + (player.level - 1) * 10 + (player.skills?.vitality || 0) * 25;
    player.hp = player.maxHp;
    leveledUp = true;
  }
  return leveledUp;
}

// Global State
const players = new Map();
const spatialGrid = new Map();
const resourceNodes = new Map();
const globalLeaderboard = new Map();

// Seed Elite Level 1-100 Commanders onto the Global Ranking
const seedExplorers = [
  { name: 'Kaelen_Voss', avatar: 'Vanguard', level: 84, coins: 18450, relics: [true, true, true], ascension: true, score: 156850 },
  { name: 'Elena_Verne', avatar: 'Elena', level: 67, coins: 12980, relics: [true, true, false], ascension: false, score: 46380 },
  { name: 'Soren_Black', avatar: 'ShadowOps', level: 52, coins: 8450, relics: [true, true, false], ascension: false, score: 38850 },
  { name: 'Lyra_Solis', avatar: 'Kael', level: 39, coins: 5190, relics: [true, false, false], ascension: false, score: 22990 },
  { name: 'Vance_Aegis', avatar: 'Aegis', level: 24, coins: 3140, relics: [true, false, false], ascension: false, score: 17940 }
];
for (const e of seedExplorers) {
  globalLeaderboard.set(e.name, { ...e, updatedAt: Date.now() });
}

// Spawn Planetary & Lunar Resource Nodes (Gold on Earth, Helium-3 on Moon, Kyber on Mars, Aether on Aurelia)
let nextNodeId = 1;
function spawnPlanetaryNodes() {
  // Earth Nodes (y around 0)
  for (let i = 0; i < 45; i++) {
    createNode((Math.random() - 0.5) * 220, 1.1, (Math.random() - 0.5) * 220, 60, 45, 'earth');
  }
  // Moon Nodes (Center: 0, 260, -680, Radius: 65)
  for (let i = 0; i < 20; i++) {
    createNode((Math.random() - 0.5) * 70, 262, -680 + (Math.random() - 0.5) * 70, 180, 120, 'moon');
  }
  // Mars Nodes (Center: -620, 340, -1100, Radius: 85)
  for (let i = 0; i < 25; i++) {
    createNode(-620 + (Math.random() - 0.5) * 90, 342, -1100 + (Math.random() - 0.5) * 90, 320, 220, 'mars');
  }
  // Aurelia Ring World Nodes (Center: 680, 440, -1350, Radius: 95)
  for (let i = 0; i < 25; i++) {
    createNode(680 + (Math.random() - 0.5) * 100, 442, -1350 + (Math.random() - 0.5) * 100, 500, 380, 'aurelia');
  }
}

function createNode(x, y, z, coinValue = 60, xpValue = 45, planet = 'earth') {
  const id = `node_${nextNodeId++}`;
  resourceNodes.set(id, {
    id,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    z: Math.round(z * 10) / 10,
    value: coinValue,
    xp: xpValue,
    planet
  });
  return id;
}
spawnPlanetaryNodes();

function getCellKey(x, z) {
  const cx = Math.floor(x / CELL_SIZE);
  const cz = Math.floor(z / CELL_SIZE);
  return `${cx}:${cz}`;
}

function updatePlayerSpatialCell(player) {
  const newKey = getCellKey(player.x, player.z);
  if (player.cellKey === newKey) return;
  if (player.cellKey) {
    const oldSet = spatialGrid.get(player.cellKey);
    if (oldSet) {
      oldSet.delete(player.id);
      if (oldSet.size === 0) spatialGrid.delete(player.cellKey);
    }
  }
  let set = spatialGrid.get(newKey);
  if (!set) {
    set = new Set();
    spatialGrid.set(newKey, set);
  }
  set.add(player.id);
  player.cellKey = newKey;
}

function removePlayerSpatialCell(player) {
  if (!player.cellKey) return;
  const set = spatialGrid.get(player.cellKey);
  if (set) {
    set.delete(player.id);
    if (set.size === 0) spatialGrid.delete(player.cellKey);
  }
  player.cellKey = null;
}

function getNearbyPlayers(player) {
  const cx = Math.floor(player.x / CELL_SIZE);
  const cz = Math.floor(player.z / CELL_SIZE);
  const result = [];

  for (let dx = -AOI_RADIUS_CELLS; dx <= AOI_RADIUS_CELLS; dx++) {
    for (let dz = -AOI_RADIUS_CELLS; dz <= AOI_RADIUS_CELLS; dz++) {
      const key = `${cx + dx}:${cz + dz}`;
      const cell = spatialGrid.get(key);
      if (!cell) continue;
      for (const otherId of cell) {
        if (otherId === player.id) continue;
        const other = players.get(otherId);
        if (!other) continue;
        result.push({
          id: other.id,
          n: other.name,
          av: other.avatar,
          lv: other.level || 1,
          mt: other.mount || 'none',
          x: Math.round(other.x * 10) / 10,
          y: Math.round(other.y * 10) / 10,
          z: Math.round(other.z * 10) / 10,
          ry: Math.round(other.ry * 100) / 100,
          an: other.anim
        });
        if (result.length >= MAX_NEARBY_PLAYERS) return result;
      }
    }
  }
  return result;
}

function computeScore(p) {
  const relicScore = (p.relics[0] ? 10000 : 0) + (p.relics[1] ? 10000 : 0) + (p.relics[2] ? 10000 : 0);
  const ascScore = p.ascension ? 100000 : 0;
  const lvlScore = (p.level || 1) * 500;
  return ascScore + relicScore + lvlScore + p.coins;
}

function updateLeaderboardForPlayer(p) {
  if (p.isStressBot || (p.name && p.name.startsWith('LoadTest_'))) return;
  const score = computeScore(p);
  globalLeaderboard.set(p.name, {
    name: p.name,
    avatar: p.avatar,
    level: p.level || 1,
    coins: p.coins,
    relics: [...p.relics],
    ascension: p.ascension,
    score,
    updatedAt: Date.now()
  });
}

function getTopLeaderboard(limit = 10) {
  return Array.from(globalLeaderboard.values())
    .sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

function broadcastGlobalEvent(eventPayload) {
  const raw = JSON.stringify({ t: 'event', ...eventPayload });
  for (const p of players.values()) {
    if (p.ws && p.ws.readyState === 1) {
      p.ws.send(raw);
    }
  }
}

// ============================================================================
// ANCIENT AI ARCHON ENGINE
// ============================================================================
const ARCHON_TRIALS = [
  {
    id: 'trial_time',
    question: '«Devoró las montañas antes de que nacieran los océanos; detiene a los reyes y convierte el hierro en polvo, pero un solo instante de coraje puede hacerlo eterno. ¿Qué fuerza cósmica soy?»',
    keywords: ['tiempo', 'el tiempo', 'time', 'cronos', 'eternidad'],
    hint: 'Fluye sin cesar hacia el futuro y se mide en segundos, siglos y eras.'
  },
  {
    id: 'trial_horizon',
    question: '«Camino delante de cada explorador. Cuanto más avanzas hacia mí por el océano o las estrellas, más me alejo, pero sin mí ningún viaje tendría destino. ¿Qué soy?»',
    keywords: ['horizonte', 'el horizonte', 'futuro', 'destino', 'horizon'],
    hint: 'Es la línea donde el cielo y el mar parecen unirse.'
  },
  {
    id: 'trial_echo',
    question: '«Hablo sin boca y escucho sin oídos. No tengo cuerpo, pero nazco en los cañones de piedra cuando gritas tu verdad al viento. ¿Qué soy?»',
    keywords: ['eco', 'el eco', 'echo', 'voz', 'sonido'],
    hint: 'Te responde con tus propias palabras desde las montañas.'
  }
];

app.post('/api/archon', async (req, res) => {
  const { playerId, message, trialIndex = 0 } = req.body || {};
  const player = players.get(playerId);
  const currentTrial = ARCHON_TRIALS[trialIndex % ARCHON_TRIALS.length];
  const cleanMsg = (message || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (!cleanMsg || cleanMsg === 'iniciar' || cleanMsg === 'hola' || cleanMsg === 'enigma') {
    return res.json({
      solved: false,
      speaker: 'ARCONTE AETHER // GUARDIÁN DE LA MENTE',
      reply: `Bienvenido al Santuario del Oráculo, Explorador ${player ? player.name : ''}. Para despertar la Reliquia de la Mente y recibir +500 XP, responde a mi juicio:\n\n${currentTrial.question}`,
      hint: currentTrial.hint
    });
  }

  const matched = currentTrial.keywords.some((kw) => cleanMsg.includes(kw));
  let aiSolved = matched;
  let aiReply = null;

  if (!aiSolved && process.env.GEMINI_API_KEY) {
    try {
      const apiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Eres el Arconte Aether en el MMORPG interplanetario "The Quest".
El enigma actual es: "${currentTrial.question}".
Respuestas válidas: ${currentTrial.keywords.join(', ')}.
El jugador "${player ? player.name : 'Explorador'}" respondió: "${message}".
Si es conceptualmente correcto, empieza EXACTAMENTE con "[CORRECTO]" y felicítalo. Si es incorrecto, empieza con "[INCORRECTO]" y dale una pista breve.`
              }]
            }]
          })
        }
      );
      const data = await apiResp.json();
      const text = data?.candidates?.[0]?.parts?.[0]?.text || '';
      if (text.includes('[CORRECTO]')) {
        aiSolved = true;
        aiReply = text.replace('[CORRECTO]', '').trim();
      } else if (text) {
        aiReply = text.replace('[INCORRECTO]', '').trim();
      }
    } catch {}
  }

  if (aiSolved) {
    if (player && !player.relics[1]) {
      player.relics[1] = true;
      player.coins += 1000;
      grantPlayerXP(player, 500);
      updateLeaderboardForPlayer(player);
      broadcastGlobalEvent({
        kind: 'RELIC_FOUND',
        relicName: 'RELIQUIA DE LA MENTE',
        relicIndex: 1,
        playerName: player.name,
        leaderboard: getTopLeaderboard(10)
      });
    }
    return res.json({
      solved: true,
      speaker: 'ARCONTE AETHER // GUARDIÁN DE LA MENTE',
      reply: aiReply || `¡Sabiduría digna de los Antiguos, ${player ? player.name : 'Explorador'}! La **RELIQUIA DE LA MENTE** (+1,000 Créditos y +500 XP) ha despertado.`
    });
  }

  return res.json({
    solved: false,
    speaker: 'ARCONTE AETHER // GUARDIÁN DE LA MENTE',
    reply: aiReply || `Tu respuesta aún no atraviesa el velo. Escucha esta pista: ${currentTrial.hint}`,
    hint: currentTrial.hint
  });
});

// ============================================================================
// AUTONOMOUS VANGUARD EXPLORERS & 500 CCU SIMULATOR
// ============================================================================
const BOT_NAMES = [
  'Kaelen_Voss', 'Elena_Verne', 'Soren_Black', 'Lyra_Solis', 'Vance_Aegis',
  'Marcus_Rift', 'Valeria_Dawn', 'Darius_Storm', 'Aria_Horizon', 'Caspian_Kerr',
  'Nadia_Vanguard', 'Thorne_Sol'
];

function spawnAutonomousExplorers(count = 12) {
  for (let i = 0; i < count; i++) {
    const id = `npc_exp_${i + 1}`;
    const angle = (i / count) * Math.PI * 2;
    const radius = 14 + (i % 4) * 8;
    const bot = {
      id,
      name: BOT_NAMES[i % BOT_NAMES.length],
      avatar: VALID_AVATARS[i % VALID_AVATARS.length],
      level: 5 + i * 7,
      mount: i === 2 ? 'horse' : (i === 5 ? 'supercar' : (i === 8 ? 'mythic_bird' : 'none')),
      x: Math.cos(angle) * radius,
      y: i === 8 ? 14 : 0,
      z: Math.sin(angle) * radius,
      ry: angle + Math.PI,
      anim: 'Walk',
      hp: 100,
      coins: 500 + i * 150,
      relics: [i < 3, i < 2, false],
      ascension: false,
      isBot: true,
      isStressBot: false,
      phase: Math.random() * Math.PI * 2,
      speed: i === 5 ? 8.5 : (i === 2 ? 6.0 : 3.4),
      centerR: radius
    };
    players.set(id, bot);
    updatePlayerSpatialCell(bot);
  }
}
spawnAutonomousExplorers(12);

app.post('/api/simulate-crowd', (req, res) => {
  const { targetCount = 500 } = req.body || {};
  for (const [id, p] of players.entries()) {
    if (p.isStressBot) {
      removePlayerSpatialCell(p);
      players.delete(id);
    }
  }

  const clamped = Math.max(0, Math.min(600, Number(targetCount) || 0));
  for (let i = 0; i < clamped; i++) {
    const id = `sim500_${i + 1}`;
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 110;
    const bot = {
      id,
      name: `Explorer_${1000 + i}`,
      avatar: VALID_AVATARS[i % VALID_AVATARS.length],
      level: 1 + (i % 99),
      mount: i % 18 === 0 ? 'horse' : (i % 25 === 0 ? 'mythic_bird' : 'none'),
      x: Math.cos(angle) * radius,
      y: i % 25 === 0 ? 18 : 0,
      z: Math.sin(angle) * radius,
      ry: angle,
      anim: 'Run',
      hp: 100,
      coins: 300,
      relics: [false, false, false],
      ascension: false,
      isBot: true,
      isStressBot: true,
      phase: Math.random() * Math.PI * 2,
      speed: 4 + Math.random() * 3.5,
      centerR: radius
    };
    players.set(id, bot);
    updatePlayerSpatialCell(bot);
  }

  broadcastGlobalEvent({
    kind: 'SYSTEM_ANNOUNCEMENT',
    message: clamped > 0
      ? `⚡ ${players.size} Exploradores Simultáneos activos en el sistema planetario.`
      : `⚡ Simulación masiva desactivada (${players.size} Exploradores en línea).`
  });

  res.json({
    ok: true,
    totalPlayersOnline: players.size,
    spatialCellsActive: spatialGrid.size
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    totalPlayers: players.size,
    spatialCells: spatialGrid.size,
    nodesActive: resourceNodes.size,
    tickRate: TICK_RATE,
    leaderboard: getTopLeaderboard(10)
  });
});

// ============================================================================
// WEBSOCKET REAL-TIME MULTIPLAYER SERVER
// ============================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let nextPlayerNum = 1;

wss.on('connection', (ws) => {
  const id = `p_${Date.now().toString(36)}_${nextPlayerNum++}`;
  const spawnAngle = Math.random() * Math.PI * 2;
  const player = {
    id,
    ws,
    name: `Vanguard_${nextPlayerNum + 100}`,
    avatar: 'Vanguard',
    level: 1,
    xp: 0,
    skillPoints: 1,
    skills: {
      velocity: 0,      // Speed & Propulsion
      aetherPower: 0,   // Combat Shockwave & Mining Yield
      vitality: 0,      // Max HP & Shield
      cosmicMastery: 0  // Reduced Transit Fares & Orbital Efficiency
    },
    unlockedMounts: ['none', 'horse'], // Horse is free starter mount; Supercar, Mythic Bird, Jet, Starship can be bought or tested
    mount: 'none',
    x: Math.cos(spawnAngle) * 6,
    y: 0,
    z: Math.sin(spawnAngle) * 6 + 18,
    ry: 0,
    anim: 'Idle',
    hp: 100,
    maxHp: 100,
    coins: 500, // Starter Aether Credits so player can test paid transit or save for vehicles
    relics: [false, false, false],
    ascension: false,
    cellKey: null,
    lastAttackAt: 0
  };

  players.set(id, player);
  updatePlayerSpatialCell(player);
  updateLeaderboardForPlayer(player);

  ws.send(JSON.stringify({
    t: 'welcome',
    id,
    self: {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      level: player.level,
      xp: player.xp,
      xpNext: xpRequiredForNextLevel(player.level),
      skillPoints: player.skillPoints,
      skills: player.skills,
      unlockedMounts: player.unlockedMounts,
      mount: player.mount,
      x: player.x,
      y: player.y,
      z: player.z,
      hp: player.hp,
      maxHp: player.maxHp,
      coins: player.coins,
      relics: player.relics,
      ascension: player.ascension
    },
    leaderboard: getTopLeaderboard(10),
    orbs: Array.from(resourceNodes.values()),
    totalOnline: players.size
  }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.t) {
      case 'join': {
        if (typeof msg.name === 'string' && msg.name.trim()) {
          player.name = msg.name.trim().slice(0, 22);
        }
        if (typeof msg.avatar === 'string' && VALID_AVATARS.includes(msg.avatar)) {
          player.avatar = msg.avatar;
        }
        updateLeaderboardForPlayer(player);
        broadcastGlobalEvent({
          kind: 'PLAYER_JOINED',
          playerName: player.name,
          avatar: player.avatar,
          totalOnline: players.size,
          leaderboard: getTopLeaderboard(10)
        });
        break;
      }

      case 'move': {
        if (typeof msg.x === 'number' && !Number.isNaN(msg.x)) {
          player.x = Math.max(-2500, Math.min(2500, msg.x));
        }
        if (typeof msg.y === 'number' && !Number.isNaN(msg.y)) {
          player.y = Math.max(-50, Math.min(2000, msg.y));
        }
        if (typeof msg.z === 'number' && !Number.isNaN(msg.z)) {
          player.z = Math.max(-2500, Math.min(2500, msg.z));
        }
        if (typeof msg.ry === 'number' && !Number.isNaN(msg.ry)) {
          player.ry = msg.ry;
        }
        if (typeof msg.anim === 'string') {
          player.anim = msg.anim.slice(0, 20);
        }
        if (typeof msg.mount === 'string' && VALID_MOUNTS.includes(msg.mount)) {
          player.mount = msg.mount;
        }
        updatePlayerSpatialCell(player);
        break;
      }

      case 'pickup_orb': {
        const orb = resourceNodes.get(msg.orbId);
        if (orb) {
          const distSq = (orb.x - player.x) ** 2 + (orb.y - player.y) ** 2 + (orb.z - player.z) ** 2;
          if (distSq <= 225) {
            resourceNodes.delete(msg.orbId);
            const bonusMultiplier = 1 + (player.skills?.aetherPower || 0) * 0.15;
            const gainedCoins = Math.round(orb.value * bonusMultiplier);
            const gainedXp = Math.round((orb.xp || 50) * bonusMultiplier);

            player.coins += gainedCoins;
            const leveledUp = grantPlayerXP(player, gainedXp);
            updateLeaderboardForPlayer(player);

            setTimeout(() => {
              const newOrbId = createNode(
                orb.x + (Math.random() - 0.5) * 20,
                orb.y,
                orb.z + (Math.random() - 0.5) * 20,
                orb.value,
                orb.xp,
                orb.planet
              );
              const newOrb = resourceNodes.get(newOrbId);
              if (newOrb) {
                broadcastGlobalEvent({ kind: 'ORB_SPAWNED', orb: newOrb });
              }
            }, 9000);

            broadcastGlobalEvent({
              kind: 'ORB_COLLECTED',
              orbId: msg.orbId,
              playerId: player.id,
              playerName: player.name,
              leveledUp,
              newLevel: player.level,
              leaderboard: getTopLeaderboard(10)
            });
          }
        }
        break;
      }

      case 'upgrade_skill': {
        const sk = msg.skill;
        if (player.skillPoints > 0 && player.skills && typeof player.skills[sk] === 'number' && player.skills[sk] < 25) {
          player.skills[sk]++;
          player.skillPoints--;
          player.maxHp = 100 + (player.level - 1) * 10 + player.skills.vitality * 25;
          player.hp = player.maxHp;
        }
        break;
      }

      case 'buy_or_equip_mount': {
        const mType = msg.mount;
        if (!VALID_MOUNTS.includes(mType)) break;
        if (!player.unlockedMounts.includes(mType)) {
          const price = VEHICLE_PRICES[mType] || 0;
          if (player.coins >= price) {
            player.coins -= price;
            player.unlockedMounts.push(mType);
            player.mount = mType;
            grantPlayerXP(player, 150);
            updateLeaderboardForPlayer(player);
          }
        } else {
          player.mount = player.mount === mType ? 'none' : mType;
        }
        break;
      }

      case 'pay_transit': {
        const dest = msg.destination;
        const baseFare = TRANSIT_FARES[dest] ?? 100;
        const discount = Math.min(0.5, (player.skills?.cosmicMastery || 0) * 0.05);
        const finalFare = Math.round(baseFare * (1 - discount));

        if (player.coins >= finalFare) {
          player.coins -= finalFare;
          grantPlayerXP(player, 80);
          updateLeaderboardForPlayer(player);
          ws.send(JSON.stringify({
            t: 'transit_approved',
            destination: dest,
            farePaid: finalFare,
            coins: player.coins
          }));
        } else {
          ws.send(JSON.stringify({
            t: 'transit_denied',
            reason: `Créditos insuficientes (${finalFare} ✦ requeridos). Viaja pilotando tu propia nave/montura o recolecta nodos minerales.`
          }));
        }
        break;
      }

      case 'reward_attraction': {
        const amount = Math.max(25, Math.min(800, Number(msg.amount) || 150));
        const xpGain = Math.max(50, Math.min(1000, Number(msg.xp) || 220));
        player.coins += amount;
        const leveledUp = grantPlayerXP(player, xpGain);
        updateLeaderboardForPlayer(player);
        broadcastGlobalEvent({
          kind: 'ATTRACTION_COMPLETED',
          playerId: player.id,
          playerName: player.name,
          attractionName: String(msg.attractionName || 'Misión Planetaria').slice(0, 45),
          leveledUp,
          newLevel: player.level,
          leaderboard: getTopLeaderboard(10)
        });
        break;
      }

      case 'claim_relic': {
        const relicIndex = Number(msg.relicIndex);
        const relicNames = ['RELIQUIA DEL HORIZONTE', 'RELIQUIA DE LA MENTE', 'RELIQUIA DEL VALOR'];
        if ([0, 1, 2].includes(relicIndex) && !player.relics[relicIndex]) {
          player.relics[relicIndex] = true;
          player.coins += 1200;
          grantPlayerXP(player, 800);
          updateLeaderboardForPlayer(player);
          broadcastGlobalEvent({
            kind: 'RELIC_FOUND',
            relicName: relicNames[relicIndex],
            relicIndex,
            playerId: player.id,
            playerName: player.name,
            leaderboard: getTopLeaderboard(10)
          });
        }
        break;
      }

      case 'claim_ascension': {
        if (player.relics[0] && player.relics[1] && player.relics[2] && !player.ascension) {
          player.ascension = true;
          player.coins += 50000;
          grantPlayerXP(player, 5000);
          updateLeaderboardForPlayer(player);
          broadcastGlobalEvent({
            kind: 'ASCENSION_COMPLETE',
            playerId: player.id,
            playerName: player.name,
            leaderboard: getTopLeaderboard(10)
          });
        }
        break;
      }

      case 'aether_strike': {
        const now = Date.now();
        if (now - player.lastAttackAt < 550) break;
        player.lastAttackAt = now;

        const nearby = getNearbyPlayers(player);
        const dmg = 35 + (player.skills?.aetherPower || 0) * 8 + Math.floor(player.level * 0.5);

        for (const n of nearby) {
          const target = players.get(n.id);
          if (!target) continue;
          const distSq = (target.x - player.x) ** 2 + (target.z - player.z) ** 2;
          if (distSq <= 120) {
            target.hp = Math.max(0, target.hp - dmg);
            if (target.hp === 0) {
              const lostCoins = Math.max(50, Math.floor(target.coins * 0.3));
              target.coins = Math.max(0, target.coins - lostCoins);
              target.hp = target.maxHp || 100;
              player.coins += lostCoins + 200;
              grantPlayerXP(player, 350);
              updateLeaderboardForPlayer(player);
              updateLeaderboardForPlayer(target);

              broadcastGlobalEvent({
                kind: 'RIVAL_DEFEATED',
                attackerId: player.id,
                attackerName: player.name,
                victimName: target.name,
                leaderboard: getTopLeaderboard(10)
              });
            }
          }
        }

        broadcastGlobalEvent({
          kind: 'STRIKE_FX',
          attackerId: player.id,
          x: player.x,
          y: player.y,
          z: player.z
        });
        break;
      }

      case 'chat': {
        if (typeof msg.text === 'string' && msg.text.trim()) {
          broadcastGlobalEvent({
            kind: 'CHAT',
            playerId: player.id,
            playerName: player.name,
            level: player.level,
            text: msg.text.trim().slice(0, 140)
          });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    removePlayerSpatialCell(player);
    players.delete(id);
  });
});

// ============================================================================
// 20 HZ AUTHORITATIVE WORLD SIMULATION & AOI NETWORK BROADCAST LOOP
// ============================================================================
let tickCounter = 0;
setInterval(() => {
  tickCounter++;
  const timeSec = tickCounter / TICK_RATE;

  for (const p of players.values()) {
    if (!p.isBot) continue;
    const angle = timeSec * 0.36 * (p.speed / 4) + p.phase;
    p.x = Math.cos(angle) * p.centerR;
    p.z = Math.sin(angle) * p.centerR;
    p.ry = -angle;
    updatePlayerSpatialCell(p);
  }

  for (const p of players.values()) {
    if (!p.ws || p.ws.readyState !== 1) continue;
    const nearby = getNearbyPlayers(p);
    p.ws.send(JSON.stringify({
      t: 'aoi',
      you: {
        level: p.level,
        xp: p.xp,
        xpNext: xpRequiredForNextLevel(p.level),
        skillPoints: p.skillPoints,
        skills: p.skills,
        unlockedMounts: p.unlockedMounts,
        mount: p.mount,
        hp: p.hp,
        maxHp: p.maxHp,
        coins: p.coins,
        relics: p.relics,
        ascension: p.ascension
      },
      nearby,
      online: players.size
    }));
  }
}, 1000 / TICK_RATE);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================================`);
  console.log(`🚀 THE QUEST: PLANETARY & ORBITAL MMORPG SERVER AT http://localhost:${PORT}`);
  console.log(`⚡ Level 1-100 Progression + Economy + 4 Seamless Worlds Active`);
  console.log(`==================================================================\n`);
});
