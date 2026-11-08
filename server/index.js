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
// THE QUEST // INTERPLANETARY MMORPG SERVER (RO + MU + LINEAGE II EDITION)
// Features:
// - Level 1-100 Progression + 6 Classical RPG Stats (STR, AGI, VIT, INT, DEX, LUK)
// - MU Online-style Gear Upgrade (+0 to +15) & Wings Tier (0 to 3) via Jewels
// - Lineage II-style Soulshots Toggle + Cooperative Society Sanctuaries
// - Authoritative Open-World Monster Hunting Spots & Raid Bosses across 4 Worlds
// - Spatial Hash Grid AoI supporting 500+ Concurrent Players
// ============================================================================

const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const CELL_SIZE = 60;
const AOI_RADIUS_CELLS = 2;
const MAX_NEARBY_PLAYERS = 45;

const VALID_AVATARS = [
  'Vanguard',      // Paladín Solar (STR/VIT Frontline)
  'Elena',         // Valkiria Astral (INT/DEX Archon/Support)
  'ShadowOps',     // Ejecutor Sombra (AGI/LUK Assassin)
  'Kael',          // Artillero Orbital (DEX/AGI Ranger)
  'DesertRanger',  // Forjador Pretoriano (STR/LUK Artisan)
  'Aegis'          // Centinela Cobalto (VIT/INT Guardian)
];

const VALID_MOUNTS = [
  'none',
  'horse',         // Corcel Imperial (Tierra)
  'supercar',      // Supercar GT (Circuito & Tierra)
  'mythic_bird',   // Ave Mítica Solar (Vuelo Atmosférico)
  'jet',           // Caza Interceptor (Vuelo Supersónico)
  'starship',      // Crucero Estelar (Vuelo Orbital e Interplanetario)
  'ship'           // Galeón Naval Imperial (Navegación Marítima Oceánica)
];

const VEHICLE_PRICES = {
  horse: 0,
  ship: 0,         // Unlocked by default at the Imperial Harbor!
  supercar: 400,
  mythic_bird: 650,
  jet: 1200,
  starship: 2500
};

const TRANSIT_FARES = {
  earth_sanctuary: 50,
  ocean_dragon_island: 150,
  moon_base: 350,
  mars_colony: 600,
  aurelia_ring: 950
};

// Level 1 to 100 XP Curve
function xpRequiredForNextLevel(lvl) {
  if (lvl >= 100) return Infinity;
  return Math.floor(100 * Math.pow(lvl, 1.32));
}

function recalculateDerivedStats(player) {
  const s = player.stats || { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 };
  const gearBonus = (player.gearLevel || 0) * 14;
  const wingBonus = (player.wingsTier || 0) * 35;
  player.maxHp = 120 + (player.level - 1) * 15 + s.vit * 28 + (player.skills?.vitality || 0) * 30 + gearBonus * 3;
  if (player.hp > player.maxHp) player.hp = player.maxHp;
  player.atk = 22 + s.str * 4 + s.dex * 2 + (player.skills?.aetherPower || 0) * 8 + gearBonus + wingBonus;
  player.matk = 20 + s.int * 5 + s.dex * 2 + (player.skills?.aetherPower || 0) * 8 + gearBonus + wingBonus;
  player.critRate = Math.min(65, 5 + Math.floor(s.luk * 1.4) + (player.wingsTier || 0) * 5);
}

function grantPlayerXP(player, amount) {
  if (player.level >= 100) return false;
  // Cooperative Society Bonus XP if Sanctuary of Wisdom is active
  const societyXpMult = 1 + Math.min(0.5, Math.floor(societyState.totalContribution / 2000) * 0.05);
  player.xp += Math.round(amount * societyXpMult);
  let leveledUp = false;
  while (player.level < 100 && player.xp >= xpRequiredForNextLevel(player.level)) {
    player.xp -= xpRequiredForNextLevel(player.level);
    player.level++;
    player.skillPoints = (player.skillPoints || 0) + 1;
    player.statPoints = (player.statPoints || 0) + 5; // Ragnarok-style: +5 Stat Points per level!
    recalculateDerivedStats(player);
    player.hp = player.maxHp;
    leveledUp = true;
  }
  return leveledUp;
}

// ============================================================================
// GLOBAL STATE: PLAYERS, MONSTER SPOTS, RAID BOSSES & SOCIETY
// ============================================================================
const players = new Map();
const spatialGrid = new Map();
const resourceNodes = new Map();
const monsters = new Map();
const globalLeaderboard = new Map();

const societyState = {
  level: 3,
  totalContribution: 6400,
  nextGoal: 10000,
  activeBuff: '+15% XP Global & +10% Drop de Joyas'
};

// Seed Elite Level 1-100 Commanders onto the Global Ranking
const seedExplorers = [
  { name: 'Kaelen_Voss', avatar: 'Vanguard', level: 88, gearLevel: 15, wingsTier: 3, coins: 24500, relics: [true, true, true], ascension: true, score: 178500 },
  { name: 'Elena_Verne', avatar: 'Elena', level: 72, gearLevel: 13, wingsTier: 2, coins: 14900, relics: [true, true, false], ascension: false, score: 62400 },
  { name: 'Soren_Black', avatar: 'ShadowOps', level: 58, gearLevel: 11, wingsTier: 2, coins: 9850, relics: [true, true, false], ascension: false, score: 48950 },
  { name: 'Lyra_Solis', avatar: 'Kael', level: 44, gearLevel: 9, wingsTier: 1, coins: 6190, relics: [true, false, false], ascension: false, score: 31200 },
  { name: 'Vance_Aegis', avatar: 'Aegis', level: 29, gearLevel: 7, wingsTier: 1, coins: 3840, relics: [true, false, false], ascension: false, score: 21400 }
];
for (const e of seedExplorers) {
  globalLeaderboard.set(e.name, { ...e, updatedAt: Date.now() });
}

// Spawn Planetary & Lunar Resource Nodes
let nextNodeId = 1;
function spawnPlanetaryNodes() {
  for (let i = 0; i < 36; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 20 + Math.random() * 68;
    createNode(Math.cos(angle) * rad, 1.1, Math.sin(angle) * rad, 65, 50, 'earth');
  }
  // Ocean Archipelago Pearl Nodes (Dragon Island & Golden Reef Island)
  for (let i = 0; i < 12; i++) {
    createNode((Math.random() - 0.5) * 45, 1.2, 185 + (Math.random() - 0.5) * 45, 150, 110, 'ocean');
    createNode(165 + (Math.random() - 0.5) * 40, 1.2, 110 + (Math.random() - 0.5) * 40, 160, 120, 'ocean');
  }
  for (let i = 0; i < 18; i++) {
    createNode((Math.random() - 0.5) * 75, 261.2, -680 + (Math.random() - 0.5) * 75, 190, 140, 'moon');
  }
  for (let i = 0; i < 22; i++) {
    createNode(-620 + (Math.random() - 0.5) * 95, 341.2, -1100 + (Math.random() - 0.5) * 95, 340, 250, 'mars');
  }
  for (let i = 0; i < 22; i++) {
    createNode(680 + (Math.random() - 0.5) * 105, 441.2, -1350 + (Math.random() - 0.5) * 105, 520, 420, 'aurelia');
  }
}

function createNode(x, y, z, coinValue = 65, xpValue = 50, planet = 'earth') {
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

// ============================================================================
// MU ONLINE / LINEAGE II / RAGNAROK OPEN-WORLD MONSTER HUNTING SPOTS & RAID BOSSES
// ============================================================================
function spawnWorldMonsters() {
  const spotDefs = [
    // Earth Perimeter Hunting Spots (Level 3 - 18)
    { id: 'mob_e1', name: 'Centinela Corrupto', level: 4, rank: 'normal', model: 'Robot', planet: 'earth', homeX: -38, homeY: 0, homeZ: -38, patrolR: 6, maxHp: 260, atk: 12, xp: 140, coins: 95 },
    { id: 'mob_e2', name: 'Centinela Corrupto', level: 5, rank: 'normal', model: 'Robot', planet: 'earth', homeX: -44, homeY: 0, homeZ: -32, patrolR: 6, maxHp: 290, atk: 14, xp: 160, coins: 110 },
    { id: 'mob_e3', name: 'Merodeador de Obsidiana', level: 8, rank: 'normal', model: 'Robot', planet: 'earth', homeX: 40, homeY: 0, homeZ: -38, patrolR: 7, maxHp: 380, atk: 18, xp: 210, coins: 145 },
    { id: 'mob_e4', name: 'Merodeador de Obsidiana', level: 9, rank: 'normal', model: 'Robot', planet: 'earth', homeX: 46, homeY: 0, homeZ: -30, patrolR: 7, maxHp: 420, atk: 20, xp: 230, coins: 160 },
    { id: 'mob_e5', name: 'Acechador del Horizonte', level: 12, rank: 'elite', model: 'XbotMob', planet: 'earth', homeX: -58, homeY: 0, homeZ: 22, patrolR: 8, maxHp: 620, atk: 26, xp: 340, coins: 240 },
    { id: 'mob_e6', name: 'Gladiador Sombra', level: 15, rank: 'elite', model: 'XbotMob', planet: 'earth', homeX: 58, homeY: 0, homeZ: 22, patrolR: 8, maxHp: 750, atk: 30, xp: 410, coins: 290 },
    // Earth MVP / Raid Boss (East Coliseum Outer Ring)
    { id: 'boss_earth', name: '★ MVP: COLOSO DE AETHELGARD', level: 25, rank: 'boss', model: 'BossRobot', planet: 'earth', homeX: 62, homeY: 0, homeZ: -18, patrolR: 5, maxHp: 2400, atk: 45, xp: 1250, coins: 950 },

    // Ocean Archipelago Hunting Spots & Sea Dragon Raid Boss (Level 28 - 40)
    { id: 'mob_sea1', name: 'Corsario del Abismo', level: 28, rank: 'elite', model: 'XbotMob', planet: 'ocean', homeX: -12, homeY: 0, homeZ: 175, patrolR: 7, maxHp: 920, atk: 35, xp: 540, coins: 380 },
    { id: 'mob_sea2', name: 'Guardián del Arrecife Dorado', level: 30, rank: 'elite', model: 'Robot', planet: 'ocean', homeX: 165, homeY: 0, homeZ: 110, patrolR: 7, maxHp: 980, atk: 38, xp: 590, coins: 420 },
    { id: 'boss_ocean', name: '★ RAID BOSS MARINO: DRAGÓN LEVIATÁN', level: 38, rank: 'boss', model: 'DragonBoss', planet: 'ocean', homeX: 0, homeY: 0, homeZ: 192, patrolR: 6, maxHp: 3400, atk: 56, xp: 1850, coins: 1450 },

    // Moon Selene Hunting Spot (Level 30 - 45)
    { id: 'mob_m1', name: 'Espectro Lunar de Helio', level: 32, rank: 'elite', model: 'Robot', planet: 'moon', homeX: -18, homeY: 260, homeZ: -668, patrolR: 7, maxHp: 1100, atk: 42, xp: 680, coins: 460 },
    { id: 'mob_m2', name: 'Espectro Lunar de Helio', level: 35, rank: 'elite', model: 'Robot', planet: 'moon', homeX: 18, homeY: 260, homeZ: -668, patrolR: 7, maxHp: 1250, atk: 46, xp: 740, coins: 510 },
    { id: 'boss_moon', name: '★ RAID BOSS: ARCONTE DE SELENE', level: 48, rank: 'boss', model: 'BossRobot', planet: 'moon', homeX: 0, homeY: 260, homeZ: -708, patrolR: 5, maxHp: 4200, atk: 68, xp: 2400, coins: 1800 },

    // Mars Ares Prime Hunting Spot (Level 55 - 75)
    { id: 'mob_ma1', name: 'Gólem Kyber de Ares', level: 58, rank: 'elite', model: 'XbotMob', planet: 'mars', homeX: -600, homeY: 340, homeZ: -1085, patrolR: 8, maxHp: 2100, atk: 65, xp: 1200, coins: 820 },
    { id: 'mob_ma2', name: 'Gólem Kyber de Ares', level: 62, rank: 'elite', model: 'XbotMob', planet: 'mars', homeX: -640, homeY: 340, homeZ: -1085, patrolR: 8, maxHp: 2350, atk: 72, xp: 1350, coins: 900 },
    { id: 'boss_mars', name: '★ RAID BOSS: IGNIS DE ARES PRIME', level: 75, rank: 'boss', model: 'BossRobot', planet: 'mars', homeX: -620, homeY: 340, homeZ: -1128, patrolR: 6, maxHp: 6800, atk: 95, xp: 4200, coins: 3200 },

    // Ringed Planet Aurelia Hunting Spot (Level 80 - 100 Endgame)
    { id: 'mob_au1', name: 'Serafín del Vacío', level: 84, rank: 'elite', model: 'XbotMob', planet: 'aurelia', homeX: 660, homeY: 440, homeZ: -1335, patrolR: 8, maxHp: 3400, atk: 90, xp: 2100, coins: 1400 },
    { id: 'boss_aurelia', name: '★ EMPERADOR DRAGÓN DE AURELIA', level: 99, rank: 'boss', model: 'DragonBoss', planet: 'aurelia', homeX: 680, homeY: 440, homeZ: -1375, patrolR: 6, maxHp: 11000, atk: 130, xp: 7500, coins: 6000 }
  ];

  for (const def of spotDefs) {
    monsters.set(def.id, {
      ...def,
      x: def.homeX,
      y: def.homeY,
      z: def.homeZ,
      ry: 0,
      hp: def.maxHp,
      state: 'patrol', // 'patrol' | 'chase' | 'dead'
      phase: Math.random() * Math.PI * 2,
      respawnAt: 0,
      lastHitAt: 0
    });
  }
}
spawnWorldMonsters();

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
          gl: other.gearLevel || 0,
          wt: other.wingsTier || 0,
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

function getNearbyMonsters(player) {
  const list = [];
  for (const m of monsters.values()) {
    if (m.state === 'dead') continue;
    const dx = m.x - player.x;
    const dz = m.z - player.z;
    if (dx * dx + dz * dz <= 190 * 190) {
      list.push({
        id: m.id,
        n: m.name,
        lv: m.level,
        rk: m.rank,
        md: m.model,
        x: Math.round(m.x * 10) / 10,
        y: Math.round(m.y * 10) / 10,
        z: Math.round(m.z * 10) / 10,
        ry: Math.round(m.ry * 100) / 100,
        hp: m.hp,
        mhp: m.maxHp
      });
    }
  }
  return list;
}

function computeScore(p) {
  const relicScore = (p.relics[0] ? 10000 : 0) + (p.relics[1] ? 10000 : 0) + (p.relics[2] ? 10000 : 0);
  const ascScore = p.ascension ? 100000 : 0;
  const lvlScore = (p.level || 1) * 500;
  const gearScore = (p.gearLevel || 0) * 1800 + (p.wingsTier || 0) * 6500;
  return ascScore + relicScore + lvlScore + gearScore + p.coins;
}

function updateLeaderboardForPlayer(p) {
  if (p.isStressBot || (p.name && p.name.startsWith('LoadTest_'))) return;
  const score = computeScore(p);
  globalLeaderboard.set(p.name, {
    name: p.name,
    avatar: p.avatar,
    level: p.level || 1,
    gearLevel: p.gearLevel || 0,
    wingsTier: p.wingsTier || 0,
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
      reply: `Bienvenido al Santuario del Oráculo, Explorador ${player ? player.name : ''}. Para despertar la Reliquia de la Mente y recibir +500 XP y +2 Joyas de Bendición, responde a mi juicio:\n\n${currentTrial.question}`,
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
      player.inventory.bless += 2;
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
      reply: aiReply || `¡Sabiduría digna de los Antiguos, ${player ? player.name : 'Explorador'}! La **RELIQUIA DE LA MENTE** (+1,000 Créditos, +2 Joyas de Bendición y +500 XP) ha despertado.`
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
    const isRacer = i === 5 || i === 10;
    const isFlier = i === 8;
    const isSailor = i === 3 || i === 9;
    const radius = isSailor ? 124 : (isRacer ? 44 : (20 + (i % 4) * 5.5));
    const bot = {
      id,
      name: BOT_NAMES[i % BOT_NAMES.length],
      avatar: VALID_AVATARS[i % VALID_AVATARS.length],
      level: 8 + i * 7,
      gearLevel: Math.min(15, 3 + i),
      wingsTier: i >= 8 ? 2 : (i >= 4 ? 1 : 0),
      mount: isSailor ? 'ship' : (i === 2 ? 'horse' : (isRacer ? 'supercar' : (isFlier ? 'mythic_bird' : 'none'))),
      x: Math.cos(angle) * radius,
      y: isFlier ? 15 : 0,
      z: Math.sin(angle) * radius,
      ry: angle + Math.PI,
      anim: 'Walk',
      hp: 250,
      maxHp: 250,
      coins: 500 + i * 150,
      relics: [i < 3, i < 2, false],
      ascension: false,
      isBot: true,
      isStressBot: false,
      phase: Math.random() * Math.PI * 2,
      speed: isSailor ? 9.5 : (isRacer ? 11.5 : (i === 2 ? 6.0 : 3.4)),
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
    const radius = 14 + Math.random() * 105;
    const bot = {
      id,
      name: `Explorer_${1000 + i}`,
      avatar: VALID_AVATARS[i % VALID_AVATARS.length],
      level: 1 + (i % 99),
      gearLevel: i % 16,
      wingsTier: i % 4,
      mount: i % 18 === 0 ? 'horse' : (i % 25 === 0 ? 'mythic_bird' : 'none'),
      x: Math.cos(angle) * radius,
      y: i % 25 === 0 ? 18 : 0,
      z: Math.sin(angle) * radius,
      ry: angle,
      anim: 'Run',
      hp: 100,
      maxHp: 100,
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
    monstersActive: monsters.size,
    spatialCells: spatialGrid.size,
    nodesActive: resourceNodes.size,
    society: societyState,
    tickRate: TICK_RATE,
    leaderboard: getTopLeaderboard(10)
  });
});

// ============================================================================
// WEBSOCKET REAL-TIME MULTIPLAYER & RPG ACTION SERVER
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
    statPoints: 10, // Initial Ragnarok-style stat points to customize build right away!
    stats: {
      str: 5, // Fuerza Física & Peso
      agi: 5, // Velocidad de Ataque & Evasión
      vit: 5, // Vida Máxima & Defensa
      int: 5, // Poder Astral & Oráculo
      dex: 5, // Precisión & Enfriamiento
      luk: 5  // Golpe Crítico & Botín de Joyas
    },
    skills: {
      velocity: 0,
      aetherPower: 0,
      vitality: 0,
      cosmicMastery: 0
    },
    gearLevel: 0,      // MU Online +0 to +15 Glowing Armor/Weapon
    wingsTier: 0,      // MU Online Wings Evolution: 0=None, 1=Solar, 2=Archangel, 3=Seraphim
    soulshotsActive: true, // Lineage II Soulshots Toggle
    inventory: {
      bless: 3,        // Jewel of Bless (Starter gift so player can test +1 to +3 right away!)
      soul: 1,         // Jewel of Soul
      chaos: 1,        // Jewel of Chaos
      feather: 0,      // Pluma de Fénix (Loch's Feather for Wings)
      soulshots: 180,  // Cargas de Éter (Soulshots)
      potions: 5       // Cargas de Reparación Vital
    },
    unlockedMounts: ['none', 'horse', 'ship'],
    mount: 'none',
    x: Math.cos(spawnAngle) * 5,
    y: 0,
    z: Math.sin(spawnAngle) * 5 + 18,
    ry: 0,
    anim: 'Idle',
    hp: 260,
    maxHp: 260,
    atk: 45,
    matk: 45,
    critRate: 12,
    coins: 600,
    societyContribution: 0,
    relics: [false, false, false],
    ascension: false,
    cellKey: null,
    lastAttackAt: 0
  };

  recalculateDerivedStats(player);
  player.hp = player.maxHp;

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
      statPoints: player.statPoints,
      stats: player.stats,
      skills: player.skills,
      gearLevel: player.gearLevel,
      wingsTier: player.wingsTier,
      soulshotsActive: player.soulshotsActive,
      inventory: player.inventory,
      unlockedMounts: player.unlockedMounts,
      mount: player.mount,
      x: player.x,
      y: player.y,
      z: player.z,
      hp: player.hp,
      maxHp: player.maxHp,
      atk: player.atk,
      matk: player.matk,
      critRate: player.critRate,
      coins: player.coins,
      relics: player.relics,
      ascension: player.ascension
    },
    society: societyState,
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

      case 'allocate_stat': {
        const st = msg.stat;
        if (player.statPoints > 0 && player.stats && typeof player.stats[st] === 'number' && player.stats[st] < 99) {
          player.stats[st]++;
          player.statPoints--;
          recalculateDerivedStats(player);
        }
        break;
      }

      case 'upgrade_skill': {
        const sk = msg.skill;
        if (player.skillPoints > 0 && player.skills && typeof player.skills[sk] === 'number' && player.skills[sk] < 25) {
          player.skills[sk]++;
          player.skillPoints--;
          recalculateDerivedStats(player);
          player.hp = player.maxHp;
        }
        break;
      }

      case 'toggle_soulshots': {
        player.soulshotsActive = !player.soulshotsActive;
        break;
      }

      case 'use_potion': {
        if (player.inventory.potions > 0 && player.hp < player.maxHp) {
          player.inventory.potions--;
          player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.6));
        }
        break;
      }

      case 'buy_supplies': {
        const item = msg.item;
        if (item === 'soulshots' && player.coins >= 120) {
          player.coins -= 120;
          player.inventory.soulshots += 200;
        } else if (item === 'potions' && player.coins >= 90) {
          player.coins -= 90;
          player.inventory.potions += 5;
        } else if (item === 'bless' && player.coins >= 450) {
          player.coins -= 450;
          player.inventory.bless += 1;
        } else if (item === 'soul' && player.coins >= 650) {
          player.coins -= 650;
          player.inventory.soul += 1;
        } else if (item === 'chaos' && player.coins >= 800) {
          player.coins -= 800;
          player.inventory.chaos += 1;
        }
        break;
      }

      // MU ONLINE + LINEAGE II FORGE: Upgrade Gear (+0 -> +15) & Craft Wings (Tier 1 -> 3)
      case 'forge_upgrade': {
        const mode = msg.mode; // 'bless' | 'soul' | 'chaos_gear' | 'wings'
        if (mode === 'bless') {
          if (player.inventory.bless > 0 && player.gearLevel < 6) {
            player.inventory.bless--;
            player.gearLevel++;
            recalculateDerivedStats(player);
            updateLeaderboardForPlayer(player);
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: true,
              title: `¡FORJA EXITOSA (+${player.gearLevel})!`,
              desc: `Tu Armadura y Arma brillan ahora en Nivel +${player.gearLevel} con Joya de Bendición.`
            }));
          } else {
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: false,
              title: 'NO DISPONIBLE',
              desc: 'La Joya de Bendición mejora de +0 a +6 (100% éxito). Usa Joya de Alma para +7 a +9.'
            }));
          }
        } else if (mode === 'soul') {
          if (player.inventory.soul > 0 && player.gearLevel >= 6 && player.gearLevel < 9) {
            player.inventory.soul--;
            const luckBonus = Math.min(0.25, (player.stats.luk || 5) * 0.005);
            const success = Math.random() < (0.72 + luckBonus);
            if (success) {
              player.gearLevel++;
              recalculateDerivedStats(player);
              updateLeaderboardForPlayer(player);
              ws.send(JSON.stringify({
                t: 'forge_result',
                ok: true,
                title: `¡ASCENSO RADIANTE (+${player.gearLevel})!`,
                desc: `¡El aura de tu armadura se intensifica a +${player.gearLevel}!`
              }));
            } else {
              player.gearLevel = Math.max(6, player.gearLevel - 1);
              recalculateDerivedStats(player);
              ws.send(JSON.stringify({
                t: 'forge_result',
                ok: false,
                title: 'RESONANCIA INESTABLE',
                desc: `La Joya de Alma falló. Tu equipo quedó en +${player.gearLevel}.`
              }));
            }
          } else {
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: false,
              title: 'REQUISITO DE FORJA',
              desc: 'Requiere equipo entre +6 y +8 y 1 Joya de Alma.'
            }));
          }
        } else if (mode === 'chaos_gear') {
          if (player.inventory.chaos > 0 && player.inventory.bless > 0 && player.inventory.soul > 0 && player.gearLevel >= 9 && player.gearLevel < 15) {
            player.inventory.chaos--;
            player.inventory.bless--;
            player.inventory.soul--;
            const luckBonus = Math.min(0.25, (player.stats.luk || 5) * 0.006);
            const success = Math.random() < (0.65 + luckBonus);
            if (success) {
              player.gearLevel++;
              recalculateDerivedStats(player);
              updateLeaderboardForPlayer(player);
              if (player.gearLevel >= 12) {
                broadcastGlobalEvent({
                  kind: 'FORGE_LEGENDARY',
                  playerName: player.name,
                  gearLevel: player.gearLevel,
                  leaderboard: getTopLeaderboard(10)
                });
              }
              ws.send(JSON.stringify({
                t: 'forge_result',
                ok: true,
                title: `¡MÁQUINA DEL CAOS: +${player.gearLevel}!`,
                desc: `¡Fusión perfecta! Has alcanzado el mítico brillo +${player.gearLevel}.`
              }));
            } else {
              ws.send(JSON.stringify({
                t: 'forge_result',
                ok: false,
                title: 'FUSIÓN DEL CAOS FALLIDA',
                desc: `Las joyas se consumieron pero el escudo protector mantuvo tu equipo en +${player.gearLevel}.`
              }));
            }
          } else {
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: false,
              title: 'MATERIALES INSUFICIENTES',
              desc: 'Para subir de +9 a +15 necesitas 1 Caos + 1 Bendición + 1 Alma y equipo +9 o superior.'
            }));
          }
        } else if (mode === 'wings') {
          if (player.wingsTier >= 3) {
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: false,
              title: 'ALAS SUPREMAS ALCANZADAS',
              desc: 'Ya posees las Alas de Serafín Astral Nivel 3.'
            }));
          } else if (player.inventory.chaos > 0 && (player.inventory.feather > 0 || player.coins >= 900)) {
            player.inventory.chaos--;
            if (player.inventory.feather > 0) {
              player.inventory.feather--;
            } else {
              player.coins -= 900;
            }
            player.wingsTier++;
            recalculateDerivedStats(player);
            updateLeaderboardForPlayer(player);
            const wingNames = ['Ninguna', 'Alas Solares (Nv.1)', 'Alas de Arcángel (Nv.2)', 'Alas de Serafín Imperial (Nv.3)'];
            broadcastGlobalEvent({
              kind: 'WINGS_CRAFTED',
              playerName: player.name,
              wingName: wingNames[player.wingsTier],
              leaderboard: getTopLeaderboard(10)
            });
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: true,
              title: `¡${wingNames[player.wingsTier].toUpperCase()}!`,
              desc: 'Tus nuevas Alas están equipadas en tu espalda y aumentan tu daño y velocidad.'
            }));
          } else {
            ws.send(JSON.stringify({
              t: 'forge_result',
              ok: false,
              title: 'FALTAN COMPONENTES DE ALAS',
              desc: 'Requiere 1 Joya del Caos + 1 Pluma de Fénix (o 900 Créditos ✦).'
            }));
          }
        }
        break;
      }

      case 'donate_society': {
        const amt = 300;
        if (player.coins >= amt) {
          player.coins -= amt;
          player.societyContribution = (player.societyContribution || 0) + amt;
          societyState.totalContribution += amt;
          const newSocLvl = 1 + Math.floor(societyState.totalContribution / 2500);
          if (newSocLvl > societyState.level) {
            societyState.level = newSocLvl;
          }
          societyState.nextGoal = societyState.level * 2500;
          const xpBonusPct = 10 + societyState.level * 5;
          societyState.activeBuff = `+${xpBonusPct}% XP Global & +${societyState.level * 5}% Botín de Joyas`;
          grantPlayerXP(player, 250);
          updateLeaderboardForPlayer(player);
          broadcastGlobalEvent({
            kind: 'SOCIETY_UPGRADED',
            playerName: player.name,
            society: societyState,
            leaderboard: getTopLeaderboard(10)
          });
        }
        break;
      }

      case 'pickup_orb': {
        const orb = resourceNodes.get(msg.orbId);
        if (orb) {
          const distSq = (orb.x - player.x) ** 2 + (orb.y - player.y) ** 2 + (orb.z - player.z) ** 2;
          if (distSq <= 225) {
            resourceNodes.delete(msg.orbId);
            const bonusMultiplier = 1 + (player.skills?.aetherPower || 0) * 0.15 + (player.stats?.luk || 5) * 0.01;
            const gainedCoins = Math.round(orb.value * bonusMultiplier);
            const gainedXp = Math.round((orb.xp || 50) * bonusMultiplier);

            player.coins += gainedCoins;
            // Chance to find a Jewel when mining planetary nodes!
            if (Math.random() < 0.22) {
              player.inventory.bless++;
            }
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
            reason: `Créditos insuficientes (${finalFare} ✦ requeridos). Viaja pilotando tu propia nave/montura o caza monstruos.`
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
          player.inventory.bless += 2;
          player.inventory.chaos += 1;
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
          player.gearLevel = 15;
          player.wingsTier = 3;
          recalculateDerivedStats(player);
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

      // COMBAT SYSTEM: Lineage II Soulshots + Ragnarok Criticals + MU Jewel Drops on Monsters & Bosses!
      case 'aether_strike': {
        const now = Date.now();
        const agiCooldownReduction = Math.min(250, (player.stats?.agi || 5) * 4);
        if (now - player.lastAttackAt < (500 - agiCooldownReduction)) break;
        player.lastAttackAt = now;

        recalculateDerivedStats(player);
        let usedSoulshot = false;
        if (player.soulshotsActive && player.inventory.soulshots > 0) {
          player.inventory.soulshots--;
          usedSoulshot = true;
        }

        const isCrit = Math.random() * 100 < player.critRate;
        const basePower = Math.max(player.atk, player.matk);
        const shotMult = usedSoulshot ? 1.85 : 1.0;
        const critMult = isCrit ? 1.75 : 1.0;
        const totalDmg = Math.round(basePower * shotMult * critMult);

        // 1. Hit Nearby Open-World Monsters & Raid Bosses
        for (const mob of monsters.values()) {
          if (mob.state === 'dead') continue;
          const distSq = (mob.x - player.x) ** 2 + (mob.y - player.y) ** 2 + (mob.z - player.z) ** 2;
          if (distSq <= 165) {
            mob.hp = Math.max(0, mob.hp - totalDmg);
            mob.lastHitAt = now;

            broadcastGlobalEvent({
              kind: 'MOB_DAMAGED',
              mobId: mob.id,
              dmg: totalDmg,
              isCrit,
              usedSoulshot,
              hp: mob.hp,
              maxHp: mob.maxHp,
              x: mob.x,
              y: mob.y,
              z: mob.z
            });

            if (mob.hp === 0) {
              mob.state = 'dead';
              mob.respawnAt = now + (mob.rank === 'boss' ? 18000 : 8000);

              // Party / Cooperative Sharing: Nearby human players also get 40% Party XP!
              const leveledUp = grantPlayerXP(player, mob.xp);
              player.coins += mob.coins;

              // Roll MU Online Jewel & Feather Drops!
              const drops = [];
              const dropChanceMult = 1 + (player.stats?.luk || 5) * 0.015;
              if (mob.rank === 'boss' || Math.random() < 0.42 * dropChanceMult) {
                player.inventory.bless++;
                drops.push('Joya de Bendición');
              }
              if (mob.rank === 'boss' || Math.random() < 0.28 * dropChanceMult) {
                player.inventory.soul++;
                drops.push('Joya de Alma');
              }
              if (mob.rank === 'boss' || Math.random() < 0.22 * dropChanceMult) {
                player.inventory.chaos++;
                drops.push('Joya del Caos');
              }
              if (mob.rank === 'boss' || Math.random() < 0.15 * dropChanceMult) {
                player.inventory.feather++;
                drops.push('Pluma de Fénix');
              }

              // Share Cooperative XP with nearby allies within 45m
              for (const other of players.values()) {
                if (other.id !== player.id && !other.isBot) {
                  const dAlly = (other.x - mob.x) ** 2 + (other.z - mob.z) ** 2;
                  if (dAlly <= 45 * 45) {
                    grantPlayerXP(other, Math.round(mob.xp * 0.45));
                    other.coins += Math.round(mob.coins * 0.35);
                  }
                }
              }

              updateLeaderboardForPlayer(player);
              broadcastGlobalEvent({
                kind: 'MOB_DEFEATED',
                mobId: mob.id,
                mobName: mob.name,
                mobRank: mob.rank,
                attackerId: player.id,
                attackerName: player.name,
                xpGained: mob.xp,
                coinsGained: mob.coins,
                drops,
                leveledUp,
                newLevel: player.level,
                leaderboard: getTopLeaderboard(10)
              });
            }
          }
        }

        // 2. PvP Duels inside the Coliseum (East Sector x > 45)
        const nearby = getNearbyPlayers(player);
        for (const n of nearby) {
          const target = players.get(n.id);
          if (!target || target.isBot) continue;
          const distSq = (target.x - player.x) ** 2 + (target.z - player.z) ** 2;
          if (distSq <= 110 && player.x > 35) {
            target.hp = Math.max(0, target.hp - Math.round(totalDmg * 0.6));
            if (target.hp === 0) {
              const lostCoins = Math.max(50, Math.floor(target.coins * 0.2));
              target.coins = Math.max(0, target.coins - lostCoins);
              target.hp = target.maxHp || 200;
              player.coins += lostCoins + 200;
              grantPlayerXP(player, 400);
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
          usedSoulshot,
          isCrit,
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
// 20 HZ AUTHORITATIVE WORLD, MONSTER AI & AOI NETWORK BROADCAST LOOP
// ============================================================================
let tickCounter = 0;
setInterval(() => {
  tickCounter++;
  const timeSec = tickCounter / TICK_RATE;
  const now = Date.now();

  // 1. Update Autonomous Explorer Bots
  for (const p of players.values()) {
    if (!p.isBot) continue;
    const angle = timeSec * 0.36 * (p.speed / 4) + p.phase;
    p.x = Math.cos(angle) * p.centerR;
    p.z = Math.sin(angle) * p.centerR;
    p.ry = -angle;
    updatePlayerSpatialCell(p);
  }

  // 2. Update Open-World Monster Spots & Raid Bosses (Patrol, Chase & Respawn)
  for (const m of monsters.values()) {
    if (m.state === 'dead') {
      if (now >= m.respawnAt) {
        m.state = 'patrol';
        m.hp = m.maxHp;
        m.x = m.homeX;
        m.y = m.homeY;
        m.z = m.homeZ;
      }
      continue;
    }

    // Check if a live human player is within aggro range (18m)
    let closestPlayer = null;
    let closestDistSq = 18 * 18;
    for (const p of players.values()) {
      if (p.isBot) continue;
      const dy = Math.abs(p.y - m.homeY);
      if (dy > 18) continue;
      const dSq = (p.x - m.x) ** 2 + (p.z - m.z) ** 2;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestPlayer = p;
      }
    }

    if (closestPlayer && Math.hypot(closestPlayer.x - m.homeX, closestPlayer.z - m.homeZ) < m.patrolR + 22) {
      const dx = closestPlayer.x - m.x;
      const dz = closestPlayer.z - m.z;
      const dist = Math.hypot(dx, dz);
      m.ry = Math.atan2(dx, dz);
      if (dist > 2.4) {
        const spd = m.rank === 'boss' ? 0.22 : 0.18;
        m.x += (dx / dist) * spd;
        m.z += (dz / dist) * spd;
      } else if (tickCounter % 30 === 0) {
        // Monster counter-attacks player in melee range!
        const defReduction = Math.min(0.65, ((closestPlayer.stats?.vit || 5) * 0.008) + ((closestPlayer.gearLevel || 0) * 0.025));
        const dmgToPlayer = Math.max(4, Math.round(m.atk * (1 - defReduction)));
        closestPlayer.hp = Math.max(10, closestPlayer.hp - dmgToPlayer);
      }
    } else {
      // Smooth circular patrol around Monster Spot home coordinates
      const ang = timeSec * 0.45 + m.phase;
      const tx = m.homeX + Math.cos(ang) * m.patrolR;
      const tz = m.homeZ + Math.sin(ang) * m.patrolR;
      m.ry = Math.atan2(tx - m.x, tz - m.z);
      m.x += (tx - m.x) * 0.08;
      m.z += (tz - m.z) * 0.08;
    }
  }

  // 3. Broadcast Authoritative State to Connected Clients
  for (const p of players.values()) {
    if (!p.ws || p.ws.readyState !== 1) continue;
    const nearby = getNearbyPlayers(p);
    const mobs = getNearbyMonsters(p);
    p.ws.send(JSON.stringify({
      t: 'aoi',
      you: {
        level: p.level,
        xp: p.xp,
        xpNext: xpRequiredForNextLevel(p.level),
        skillPoints: p.skillPoints,
        statPoints: p.statPoints,
        stats: p.stats,
        skills: p.skills,
        gearLevel: p.gearLevel,
        wingsTier: p.wingsTier,
        soulshotsActive: p.soulshotsActive,
        inventory: p.inventory,
        unlockedMounts: p.unlockedMounts,
        mount: p.mount,
        hp: p.hp,
        maxHp: p.maxHp,
        atk: p.atk,
        matk: p.matk,
        critRate: p.critRate,
        coins: p.coins,
        societyContribution: p.societyContribution,
        relics: p.relics,
        ascension: p.ascension
      },
      society: societyState,
      nearby,
      mobs,
      online: players.size
    }));
  }
}, 1000 / TICK_RATE);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================================`);
  console.log(`🚀 THE QUEST: INTERPLANETARY MMORPG SERVER AT http://localhost:${PORT}`);
  console.log(`⚡ Ragnarok Stats + MU Forge (+15 & Wings) + Lineage Bosses Active`);
  console.log(`==================================================================\n`);
});
