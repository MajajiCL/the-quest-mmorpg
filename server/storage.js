import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const SOCIETY_FILE = path.join(DATA_DIR, 'society.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWriteJson(filePath, data) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[STORAGE ERROR] Failed writing ${filePath}:`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
}

function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`[STORAGE WARN] Failed reading ${filePath}, using default:`, err.message);
  }
  return defaultValue;
}

// In-memory cache backed by atomic file writes
class GameStorage {
  constructor() {
    this.players = new Map();
    this.society = {
      level: 3,
      totalContribution: 6400,
      nextGoal: 10000,
      activeBuff: '+15% XP Global & +10% Drop de Gemas'
    };
    this.init();
  }

  init() {
    const savedPlayers = loadJson(PLAYERS_FILE, {});
    for (const [key, pData] of Object.entries(savedPlayers)) {
      this.players.set(key.toLowerCase(), pData);
    }

    const savedSociety = loadJson(SOCIETY_FILE, null);
    if (savedSociety) {
      this.society = savedSociety;
    }
    console.log(`[STORAGE] Loaded ${this.players.size} persistent player profiles and society state.`);
  }

  getOrCreatePlayer(playerName, avatarType = 'Vanguard') {
    const key = (playerName || 'Explorer').trim().toLowerCase();
    let player = this.players.get(key);

    if (!player) {
      player = {
        name: playerName.trim().slice(0, 22),
        avatar: avatarType,
        level: 1,
        xp: 0,
        xpNext: 100,
        statPoints: 10,
        skillPoints: 1,
        stats: {
          str: 5,
          agi: 5,
          vit: 5,
          int: 5,
          dex: 5,
          luk: 5
        },
        skills: {
          velocity: 0,
          aetherPower: 0,
          vitality: 0,
          cosmicMastery: 0
        },
        gearLevel: 0,
        wingsTier: 0,
        soulshotsActive: true,
        inventory: {
          bless: 3,
          soul: 1,
          chaos: 1,
          feather: 0,
          soulshots: 180,
          potions: 5
        },
        unlockedMounts: ['none', 'horse', 'ship'],
        mountType: 'none',
        coins: 600,
        relics: [false, false, false],
        ascension: false,
        score: 0,
        createdAt: Date.now(),
        lastSeen: Date.now()
      };
      this.players.set(key, player);
      this.savePlayers();
    } else {
      player.lastSeen = Date.now();
    }

    return player;
  }

  savePlayer(player) {
    if (!player || !player.name) return;
    const key = player.name.trim().toLowerCase();
    
    // Save relevant progress fields
    const record = {
      name: player.name,
      avatar: player.avatar,
      level: player.level || 1,
      xp: player.xp || 0,
      xpNext: player.xpNext || 100,
      statPoints: player.statPoints ?? 0,
      skillPoints: player.skillPoints ?? 0,
      stats: player.stats || { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 },
      skills: player.skills || { velocity: 0, aetherPower: 0, vitality: 0, cosmicMastery: 0 },
      gearLevel: player.gearLevel || 0,
      wingsTier: player.wingsTier || 0,
      soulshotsActive: player.soulshotsActive ?? true,
      inventory: player.inventory || { bless: 0, soul: 0, chaos: 0, feather: 0, soulshots: 0, potions: 0 },
      unlockedMounts: player.unlockedMounts || ['none', 'horse', 'ship'],
      mountType: player.mountType || 'none',
      coins: player.coins || 0,
      relics: player.relics || [false, false, false],
      ascension: Boolean(player.ascension),
      score: (player.level * 1000) + (player.coins) + ((player.gearLevel || 0) * 2500) + ((player.wingsTier || 0) * 8000),
      lastSeen: Date.now()
    };

    this.players.set(key, record);
    this.scheduleSave();
  }

  scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.savePlayers();
      this.saveSociety();
    }, 2000);
  }

  savePlayers() {
    const obj = {};
    for (const [key, pData] of this.players.entries()) {
      obj[key] = pData;
    }
    atomicWriteJson(PLAYERS_FILE, obj);
  }

  saveSociety() {
    atomicWriteJson(SOCIETY_FILE, this.society);
  }

  getTopLeaderboard(limit = 10) {
    const all = Array.from(this.players.values());
    all.sort((a, b) => (b.score || 0) - (a.score || 0));
    return all.slice(0, limit).map((p) => ({
      name: p.name,
      avatar: p.avatar,
      level: p.level,
      gearLevel: p.gearLevel,
      wingsTier: p.wingsTier,
      coins: p.coins,
      relics: p.relics,
      ascension: p.ascension,
      score: p.score
    }));
  }
}

export const storage = new GameStorage();
