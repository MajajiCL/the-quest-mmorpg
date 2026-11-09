import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { buildDetailedWorldArchitectures, updateWorldArchitectureAnimations } from './worldArchitecture.js';
import { BossTelegraphSystem, BOSS_TELEGRAPH_CONFIGS } from './combat/BossTelegraphSystem.js';
import { CombatFeedbackSystem } from './combat/CombatFeedbackSystem.js';
import { ProCameraController } from './camera/ProCameraController.js';
import { OrbitalFlightFX } from './effects/OrbitalFlightFX.js';

// ============================================================================
// BASE URL & ASSET RESOLVER (SUPPORTS GITHUB PAGES SUBPATH HOSTING)
// ============================================================================
const BASE_URL = import.meta.env.BASE_URL || './';
function toAsset(p) {
  if (!p) return p;
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:') || p.startsWith('blob:')) return p;
  const clean = p.replace(/^\/+/, '');
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}${clean}`;
}

const SAVE_KEY = 'the_quest_mmorpg_save_v1';
function saveLocalState() {
  try {
    const data = {
      playerName: state.playerName,
      avatarType: state.avatarType,
      level: state.level,
      xp: state.xp,
      xpNext: state.xpNext,
      skillPoints: state.skillPoints,
      statPoints: state.statPoints,
      stats: state.stats,
      skills: state.skills,
      gearLevel: state.gearLevel,
      durability: state.durability,
      wingsTier: state.wingsTier,
      bountyIndex: state.bountyIndex,
      bountyProgress: state.bountyProgress,
      soulshotsActive: state.soulshotsActive,
      inventory: state.inventory,
      unlockedMounts: state.unlockedMounts,
      mountType: state.mountType,
      coins: state.coins,
      relics: state.relics,
      ascension: state.ascension,
      society: state.society
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // LocalStorage quota or disabled
  }
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      if (data.playerName) state.playerName = data.playerName;
      if (data.avatarType) state.avatarType = data.avatarType;
      if (typeof data.level === 'number') state.level = data.level;
      if (typeof data.xp === 'number') state.xp = data.xp;
      if (typeof data.xpNext === 'number') state.xpNext = data.xpNext;
      if (typeof data.skillPoints === 'number') state.skillPoints = data.skillPoints;
      if (typeof data.statPoints === 'number') state.statPoints = data.statPoints;
      if (data.stats) Object.assign(state.stats, data.stats);
      if (data.skills) Object.assign(state.skills, data.skills);
      if (typeof data.gearLevel === 'number') state.gearLevel = data.gearLevel;
      if (typeof data.durability === 'number') state.durability = data.durability;
      if (typeof data.wingsTier === 'number') state.wingsTier = data.wingsTier;
      if (typeof data.bountyIndex === 'number') state.bountyIndex = data.bountyIndex;
      if (typeof data.bountyProgress === 'number') state.bountyProgress = data.bountyProgress;
      if (typeof data.coins === 'number') state.coins = data.coins;
      if (typeof data.soulshotsActive === 'boolean') state.soulshotsActive = data.soulshotsActive;
      if (data.inventory) Object.assign(state.inventory, data.inventory);
      if (Array.isArray(data.unlockedMounts)) state.unlockedMounts = data.unlockedMounts;
      if (data.mountType) state.mountType = data.mountType;
      if (Array.isArray(data.relics)) state.relics = data.relics;
      if (typeof data.ascension === 'boolean') state.ascension = data.ascension;
      if (data.society) Object.assign(state.society, data.society);
      return true;
    }
  } catch {
    // Ignore invalid JSON
  }
  return false;
}

// ============================================================================
// THE QUEST // AAA INTERPLANETARY MMORPG ENGINE (RO + MU + LINEAGE II EDITION)
// Features:
// 1. Unified Seamless Planetary Terrains (No disconnected sphere-with-hat bug!)
// 2. Real Visible Seated Pilot/Rider Postures inside Horse, Ferrari, Bird, Jet & Starship
// 3. Ragnarok Online 6-Stat Allocation (STR, AGI, VIT, INT, DEX, LUK)
// 4. MU Online +15 Glowing Armor/Weapon Aura & 3D Evolved Wings (Tiers 1-3)
// 5. Lineage II Open-World Monster Spots, Raid Bosses, Soulshots & Floating Damage
// ============================================================================

const state = {
  joined: false,
  playerId: null,
  playerName: 'Vanguard_01',
  avatarType: 'Vanguard',
  level: 1,
  xp: 0,
  xpNext: 100,
  skillPoints: 1,
  statPoints: 10,
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
  durability: 100,
  wingsTier: 0,
  bountyIndex: 0,
  bountyProgress: 0,
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
  mountType: 'none', // 'none' | 'horse' | 'supercar' | 'mythic_bird' | 'jet' | 'starship' | 'ship'
  weatherIndex: 0,
  hp: 260,
  maxHp: 260,
  atk: 45,
  matk: 45,
  critRate: 12,
  coins: 600,
  society: {
    level: 3,
    totalContribution: 6400,
    nextGoal: 10000,
    activeBuff: '+15% XP Global & +10% Drop de Joyas'
  },
  relics: [false, false, false],
  ascension: false,
  onlineCount: 1,
  nearbyCount: 0,
  crowdSimulated: false,
  leaderboard: [],
  trialIndex: 0,
  raceActive: false,
  raceRingIndex: 0,
  raceStartTime: 0
};

const PLANETARY_DESTINATIONS = {
  earth_sanctuary: {
    name: 'SANTUARIO SOLAR',
    pos: new THREE.Vector3(0, 0, 18),
    surfaceY: 0
  },
  ocean_dragon_island: {
    name: 'ISLA DEL DRAGÓN',
    pos: new THREE.Vector3(0, 0, 175),
    surfaceY: 0
  },
  moon_base: {
    name: 'LUNA SELENE',
    pos: new THREE.Vector3(0, 260, -680),
    surfaceY: 260
  },
  mars_colony: {
    name: 'MARTE ARES PRIME',
    pos: new THREE.Vector3(-620, 340, -1100),
    surfaceY: 340
  },
  aurelia_ring: {
    name: 'ANILLO AURELIA',
    pos: new THREE.Vector3(680, 440, -1350),
    surfaceY: 440
  }
};

const WEATHER_PRESETS = [
  { name: 'Atardecer Imperial', elevation: 5.5, azimuth: 165, fogColor: 0xd4a688, exposure: 0.86, lightIntensity: 3.2 },
  { name: 'Sol Cenital', elevation: 42, azimuth: 140, fogColor: 0xbfd8eb, exposure: 0.92, lightIntensity: 3.8 },
  { name: 'Noche Astral', elevation: -5, azimuth: 200, fogColor: 0x060b16, exposure: 0.76, lightIntensity: 1.2 }
];

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER & REAL-TIME AMBIANCE ENGINE
// ============================================================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.limiter = null;
    this.ambianceStarted = false;

    // Ocean Waves Procedural Channel
    this.oceanGain = null;
    this.oceanFilter = null;
    this.oceanLfo = null;
    this.curOceanVol = 0;

    // Stellar Cosmic Wind & Drone Procedural Channel
    this.spaceGain = null;
    this.spaceFilter = null;
    this.spaceDrone1 = null;
    this.spaceDrone2 = null;
    this.curSpaceVol = 0;

    // Ship Propulsion / Thruster Procedural Channel
    this.propulsionGain = null;
    this.propulsionFilter = null;
    this.propulsionOsc = null;
    this.propulsionSub = null;
    this.curPropVol = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Dynamics Compressor Limiter to prevent clipping
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-4, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(8, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.master.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  createNoiseBuffer(seconds = 3, type = 'pink') {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
      // Paul Kellet's filtered pink noise algorithm for warm, organic acoustic spectrum
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.18;
      }
    }
    return buffer;
  }

  initAmbiance() {
    this.init();
    if (!this.ctx || this.ambianceStarted) return;
    try {
      this.ambianceStarted = true;
      const now = this.ctx.currentTime;

      // 1. Procedural Ocean Waves (Filtered pink noise with slow rhythmic swell LFO)
      const oceanBuffer = this.createNoiseBuffer(4, 'pink');
      if (oceanBuffer) {
        const oceanSrc = this.ctx.createBufferSource();
        oceanSrc.buffer = oceanBuffer;
        oceanSrc.loop = true;

        this.oceanFilter = this.ctx.createBiquadFilter();
        this.oceanFilter.type = 'lowpass';
        this.oceanFilter.frequency.setValueAtTime(300, now);
        this.oceanFilter.Q.setValueAtTime(1.8, now);

        // Slow swell LFO (~0.13Hz cycle = ~7.7s natural wave period)
        this.oceanLfo = this.ctx.createOscillator();
        this.oceanLfo.type = 'sine';
        this.oceanLfo.frequency.setValueAtTime(0.13, now);

        const oceanLfoGain = this.ctx.createGain();
        oceanLfoGain.gain.setValueAtTime(220, now);
        this.oceanLfo.connect(oceanLfoGain);
        oceanLfoGain.connect(this.oceanFilter.frequency);

        this.oceanGain = this.ctx.createGain();
        this.oceanGain.gain.setValueAtTime(0, now);

        oceanSrc.connect(this.oceanFilter);
        this.oceanFilter.connect(this.oceanGain);
        this.oceanGain.connect(this.master);

        oceanSrc.start(now);
        this.oceanLfo.start(now);
      }

      // 2. Procedural Stellar Cosmic Wind & Deep Space Drone
      const spaceBuffer = this.createNoiseBuffer(4, 'pink');
      if (spaceBuffer) {
        const spaceSrc = this.ctx.createBufferSource();
        spaceSrc.buffer = spaceBuffer;
        spaceSrc.loop = true;

        this.spaceFilter = this.ctx.createBiquadFilter();
        this.spaceFilter.type = 'bandpass';
        this.spaceFilter.frequency.setValueAtTime(750, now);
        this.spaceFilter.Q.setValueAtTime(3.2, now);

        // Twin detuned sine oscillators for binaural cosmic void vibration
        this.spaceDrone1 = this.ctx.createOscillator();
        this.spaceDrone1.type = 'sine';
        this.spaceDrone1.frequency.setValueAtTime(55.0, now);

        this.spaceDrone2 = this.ctx.createOscillator();
        this.spaceDrone2.type = 'sine';
        this.spaceDrone2.frequency.setValueAtTime(55.45, now);

        const droneGain = this.ctx.createGain();
        droneGain.gain.setValueAtTime(0.045, now);
        this.spaceDrone1.connect(droneGain);
        this.spaceDrone2.connect(droneGain);

        this.spaceGain = this.ctx.createGain();
        this.spaceGain.gain.setValueAtTime(0, now);

        spaceSrc.connect(this.spaceFilter);
        this.spaceFilter.connect(this.spaceGain);
        droneGain.connect(this.spaceGain);
        this.spaceGain.connect(this.master);

        spaceSrc.start(now);
        this.spaceDrone1.start(now);
        this.spaceDrone2.start(now);
      }

      // 3. Procedural Ship Propulsion & Thruster Engine
      const propNoise = this.createNoiseBuffer(3, 'pink');
      if (propNoise) {
        const propNoiseSrc = this.ctx.createBufferSource();
        propNoiseSrc.buffer = propNoise;
        propNoiseSrc.loop = true;

        this.propulsionOsc = this.ctx.createOscillator();
        this.propulsionOsc.type = 'triangle';
        this.propulsionOsc.frequency.setValueAtTime(220, now);

        this.propulsionSub = this.ctx.createOscillator();
        this.propulsionSub.type = 'sawtooth';
        this.propulsionSub.frequency.setValueAtTime(56, now);

        this.propulsionFilter = this.ctx.createBiquadFilter();
        this.propulsionFilter.type = 'lowpass';
        this.propulsionFilter.frequency.setValueAtTime(550, now);
        this.propulsionFilter.Q.setValueAtTime(2.2, now);

        this.propulsionGain = this.ctx.createGain();
        this.propulsionGain.gain.setValueAtTime(0, now);

        this.propulsionOsc.connect(this.propulsionFilter);
        this.propulsionSub.connect(this.propulsionFilter);
        propNoiseSrc.connect(this.propulsionFilter);
        this.propulsionFilter.connect(this.propulsionGain);
        this.propulsionGain.connect(this.master);

        propNoiseSrc.start(now);
        this.propulsionOsc.start(now);
        this.propulsionSub.start(now);
      }
    } catch {}
  }

  updateAmbiance({ playerPos, mountType, isMoving, speed = 10, isFlyingMount = false, dt = 0.016 }) {
    if (!this.ctx || !this.ambianceStarted) return;
    try {
      const now = this.ctx.currentTime;
      const py = playerPos.y;
      const pz = playerPos.z;
      const px = playerPos.x;

      // --- OCEAN PROXIMITY CALCULATION ---
      let targetOceanVol = 0;
      if (mountType === 'ship') {
        targetOceanVol = 0.22;
      } else if (py <= 12) {
        if (pz > 70) {
          targetOceanVol = Math.min(0.20, 0.08 + (pz - 70) * 0.001);
        } else if (px * px + pz * pz > 4200) {
          targetOceanVol = 0.12;
        }
      }
      if (py > 25) targetOceanVol = 0;

      // --- STELLAR / DEEP SPACE PROXIMITY ---
      let targetSpaceVol = 0;
      if (py > 65) {
        targetSpaceVol = Math.min(0.22, (py - 65) / 220 * 0.22);
      }
      if (this.spaceFilter && targetSpaceVol > 0) {
        const centerFreq = Math.min(1800, 700 + py * 1.8);
        this.spaceFilter.frequency.setTargetAtTime(centerFreq, now, 0.3);
      }

      // --- SHIP THRUSTER / JET PROPULSION ENGINE ---
      let targetPropVol = 0;
      if (mountType === 'jet' || mountType === 'starship') {
        const isShipAccelerating = isMoving;
        if (mountType === 'jet') {
          targetPropVol = isShipAccelerating ? 0.20 : 0.035;
          const jetFreq = isShipAccelerating ? Math.min(1100, 480 + speed * 9.5) : 320;
          if (this.propulsionOsc) this.propulsionOsc.frequency.setTargetAtTime(jetFreq, now, 0.15);
          if (this.propulsionSub) this.propulsionSub.frequency.setTargetAtTime(isShipAccelerating ? 72 : 46, now, 0.15);
          if (this.propulsionFilter) this.propulsionFilter.frequency.setTargetAtTime(isShipAccelerating ? 2400 : 750, now, 0.15);
        } else {
          targetPropVol = isShipAccelerating ? 0.24 : 0.04;
          const warpFreq = isShipAccelerating ? Math.min(320, 120 + speed * 1.8) : 85;
          if (this.propulsionOsc) this.propulsionOsc.frequency.setTargetAtTime(warpFreq, now, 0.2);
          if (this.propulsionSub) this.propulsionSub.frequency.setTargetAtTime(isShipAccelerating ? 54 : 38, now, 0.2);
          if (this.propulsionFilter) this.propulsionFilter.frequency.setTargetAtTime(isShipAccelerating ? 1600 : 600, now, 0.2);
        }
      }

      // Smooth gain transitions
      if (this.oceanGain) this.oceanGain.gain.setTargetAtTime(targetOceanVol, now, 0.4);
      if (this.spaceGain) this.spaceGain.gain.setTargetAtTime(targetSpaceVol, now, 0.5);
      if (this.propulsionGain) this.propulsionGain.gain.setTargetAtTime(targetPropVol, now, 0.25);
    } catch {}
  }

  playTone(freq = 440, duration = 0.16, type = 'sine', gainVal = 0.08) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.master || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  shard() {
    this.playTone(784, 0.09, 'sine', 0.11);
    setTimeout(() => this.playTone(1174.6, 0.18, 'sine', 0.10), 65);
    setTimeout(() => this.playTone(1568, 0.22, 'triangle', 0.08), 120);
  }

  portal() {
    this.playTone(293.6, 0.22, 'triangle', 0.12);
    setTimeout(() => this.playTone(587.3, 0.32, 'sine', 0.11), 80);
    setTimeout(() => this.playTone(880, 0.40, 'sine', 0.08), 160);
  }

  // Crisp, dynamic blade woosh + crystalline resonant pulse
  strike({ isCrit = false, usingSoulshot = false } = {}) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Blade swoosh noise burst (high-speed air slicing)
      const noiseBuffer = this.createNoiseBuffer(0.14, 'pink');
      if (noiseBuffer) {
        const swooshSrc = this.ctx.createBufferSource();
        swooshSrc.buffer = noiseBuffer;

        const swooshFilter = this.ctx.createBiquadFilter();
        swooshFilter.type = 'bandpass';
        swooshFilter.frequency.setValueAtTime(1800, now);
        swooshFilter.frequency.exponentialRampToValueAtTime(320, now + 0.11);
        swooshFilter.Q.setValueAtTime(3.2, now);

        const swooshGain = this.ctx.createGain();
        swooshGain.gain.setValueAtTime(0.18, now);
        swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        swooshSrc.connect(swooshFilter);
        swooshFilter.connect(swooshGain);
        swooshGain.connect(this.master || this.ctx.destination);
        swooshSrc.start(now);
        swooshSrc.stop(now + 0.12);
      }

      // 2. Harmonic blade chime (steel/crystal cutting edge)
      const bladeOsc = this.ctx.createOscillator();
      bladeOsc.type = 'sawtooth';
      bladeOsc.frequency.setValueAtTime(680, now);
      bladeOsc.frequency.exponentialRampToValueAtTime(180, now + 0.14);

      const bladeFilter = this.ctx.createBiquadFilter();
      bladeFilter.type = 'lowpass';
      bladeFilter.frequency.setValueAtTime(1600, now);
      bladeFilter.frequency.exponentialRampToValueAtTime(240, now + 0.14);

      const bladeGain = this.ctx.createGain();
      bladeGain.gain.setValueAtTime(0.12, now);
      bladeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      bladeOsc.connect(bladeFilter);
      bladeFilter.connect(bladeGain);
      bladeGain.connect(this.master || this.ctx.destination);
      bladeOsc.start(now);
      bladeOsc.stop(now + 0.15);

      // 3. Soulshot Overdrive Plasma burst
      if (usingSoulshot) {
        const etherOsc = this.ctx.createOscillator();
        etherOsc.type = 'sine';
        etherOsc.frequency.setValueAtTime(1400, now);
        etherOsc.frequency.exponentialRampToValueAtTime(420, now + 0.18);

        const etherGain = this.ctx.createGain();
        etherGain.gain.setValueAtTime(0.20, now);
        etherGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        etherOsc.connect(etherGain);
        etherGain.connect(this.master || this.ctx.destination);
        etherOsc.start(now);
        etherOsc.stop(now + 0.19);
      }

      // 4. Critical strike impact
      if (isCrit) {
        const critBell = this.ctx.createOscillator();
        critBell.type = 'sine';
        critBell.frequency.setValueAtTime(1760, now);
        critBell.frequency.exponentialRampToValueAtTime(880, now + 0.28);

        const critGain = this.ctx.createGain();
        critGain.gain.setValueAtTime(0.16, now);
        critGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        critBell.connect(critGain);
        critGain.connect(this.master || this.ctx.destination);
        critBell.start(now);
        critBell.stop(now + 0.29);
      }
    } catch {}
  }

  // Synthesized primal roar for Leviathan Dragon and Bosses
  bossRoar({ isDragon = true } = {}) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const duration = isDragon ? 1.6 : 1.3;

      // 1. Low Guttural Throat Rumble (Sawtooth + 26Hz Tremolo LFO for visceral snarling vocal cords)
      const throatOsc = this.ctx.createOscillator();
      throatOsc.type = 'sawtooth';
      throatOsc.frequency.setValueAtTime(isDragon ? 110 : 85, now);
      throatOsc.frequency.exponentialRampToValueAtTime(isDragon ? 42 : 36, now + duration);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(26, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.4, now);

      const throatGain = this.ctx.createGain();
      throatGain.gain.setValueAtTime(0.22, now);
      throatGain.gain.linearRampToValueAtTime(0.32, now + 0.2);
      throatGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      lfo.connect(lfoGain);
      lfoGain.connect(throatGain.gain);

      // Formant Acoustic Filter (Simulates open maw cavernous acoustics)
      const throatFilter = this.ctx.createBiquadFilter();
      throatFilter.type = 'peaking';
      throatFilter.frequency.setValueAtTime(isDragon ? 480 : 380, now);
      throatFilter.frequency.linearRampToValueAtTime(isDragon ? 1200 : 850, now + 0.45);
      throatFilter.frequency.exponentialRampToValueAtTime(220, now + duration);
      throatFilter.Q.setValueAtTime(5.2, now);
      throatFilter.gain.setValueAtTime(14, now);

      throatOsc.connect(throatFilter);
      throatFilter.connect(throatGain);
      throatGain.connect(this.master || this.ctx.destination);

      throatOsc.start(now);
      lfo.start(now);
      throatOsc.stop(now + duration);
      lfo.stop(now + duration);

      // 2. Abyssal Breath / Dragon Fire Hiss (Filtered noise blast)
      const noiseBuf = this.createNoiseBuffer(duration, 'pink');
      if (noiseBuf) {
        const breathSrc = this.ctx.createBufferSource();
        breathSrc.buffer = noiseBuf;

        const breathFilter = this.ctx.createBiquadFilter();
        breathFilter.type = 'bandpass';
        breathFilter.frequency.setValueAtTime(isDragon ? 750 : 550, now);
        breathFilter.frequency.linearRampToValueAtTime(isDragon ? 1400 : 900, now + 0.4);
        breathFilter.frequency.exponentialRampToValueAtTime(350, now + duration);
        breathFilter.Q.setValueAtTime(2.2, now);

        const breathGain = this.ctx.createGain();
        breathGain.gain.setValueAtTime(0.01, now);
        breathGain.gain.linearRampToValueAtTime(0.18, now + 0.25);
        breathGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        breathSrc.connect(breathFilter);
        breathFilter.connect(breathGain);
        breathGain.connect(this.master || this.ctx.destination);

        breathSrc.start(now);
        breathSrc.stop(now + duration);
      }

      // 3. Sub-bass seismic boom
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(65, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + duration * 0.85);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.24, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);

      subOsc.connect(subGain);
      subGain.connect(this.master || this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + duration * 0.86);
    } catch {}
  }

  // Triumphant Victory Fanfare for Level Ups and Quest Completions
  victoryFanfare() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0.00, d: 0.18 }, // C5
        { f: 659.25, t: 0.14, d: 0.18 }, // E5
        { f: 783.99, t: 0.28, d: 0.22 }, // G5
        { f: 1046.50, t: 0.44, d: 0.32 }, // C6
        { f: 783.99, t: 0.72, d: 0.16 }, // G5
        { f: 1046.50, t: 0.86, d: 0.75 } // C6 sustained
      ];

      notes.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(0.14, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(this.master || this.ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);

        // Shimmer bell overtone
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(n.f * 2, now + n.t);
        chimeGain.gain.setValueAtTime(0.05, now + n.t);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d * 0.7);
        chime.connect(chimeGain);
        chimeGain.connect(this.master || this.ctx.destination);
        chime.start(now + n.t);
        chime.stop(now + n.t + n.d * 0.72);
      });

      // Sustained brass harmony chord on the triumphant climax
      [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sawtooth';
        chordOsc.frequency.setValueAtTime(freq, now + 0.86);

        const chordFilter = this.ctx.createBiquadFilter();
        chordFilter.type = 'lowpass';
        chordFilter.frequency.setValueAtTime(1200, now + 0.86);

        chordGain.gain.setValueAtTime(0.065, now + 0.86);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

        chordOsc.connect(chordFilter);
        chordFilter.connect(chordGain);
        chordGain.connect(this.master || this.ctx.destination);
        chordOsc.start(now + 0.86);
        chordOsc.stop(now + 1.62);
      });
    } catch {}
  }

  critStrike() {
    this.strike({ isCrit: true });
  }

  bossTelegraphCharge() {
    this.playTone(120, 0.45, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(180, 0.45, 'triangle', 0.09), 300);
    setTimeout(() => this.playTone(280, 0.50, 'sine', 0.10), 700);
  }

  bossImpact() {
    this.bossRoar({ isDragon: false });
  }

  hitDamage() {
    this.playTone(110, 0.20, 'square', 0.12);
    setTimeout(() => this.playTone(85, 0.28, 'sawtooth', 0.10), 40);
  }

  reentryRumble() {
    this.playTone(75, 0.40, 'triangle', 0.09);
  }

  sonicBoom() {
    this.playTone(80, 0.45, 'sawtooth', 0.18);
    setTimeout(() => this.playTone(360, 0.15, 'sine', 0.14), 40);
  }

  levelUp() {
    this.victoryFanfare();
  }
}
const sfx = new SoundFX();

// ============================================================================
// THREE.JS PHOTOREALISTIC RENDERER, POST-PROCESSING & SOLAR SYSTEM
// ============================================================================
const container = document.getElementById('canvas-container');
const isMobile = window.innerWidth < 768;

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03060e);
scene.fog = new THREE.FogExp2(0xd4a688, 0.0018);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 5500);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.28,
  0.55,
  0.85
);
composer.addPass(bloomPass);

// Atmospheric Sky
const sky = new Sky();
sky.scale.setScalar(3800);
scene.add(sky);

const sunPosition = new THREE.Vector3();
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 8;
skyUniforms['rayleigh'].value = 2.4;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.82;

// Deep Space Starfield
const starCount = 4200;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 4000;
  starPos[i + 1] = 80 + Math.random() * 2000;
  starPos[i + 2] = (Math.random() - 0.5) * 4000;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const spaceStars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xfff4e0, size: 2.2, transparent: true, opacity: 0.92 })
);
scene.add(spaceStars);

const sunLight = new THREE.DirectionalLight(0xfff1dc, 3.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 220;
const shadowBound = 75;
sunLight.shadow.camera.left = -shadowBound;
sunLight.shadow.camera.right = shadowBound;
sunLight.shadow.camera.top = shadowBound;
sunLight.shadow.camera.bottom = -shadowBound;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x3b4859, 0.95);
scene.add(hemiLight);

const showcaseSpot = new THREE.SpotLight(0xffe4b5, 4.5, 25, Math.PI / 4, 0.5);
showcaseSpot.position.set(0, 7.5, 23);
showcaseSpot.target.position.set(0, 1.2, 18);
scene.add(showcaseSpot);
scene.add(showcaseSpot.target);

const rgbeLoader = new RGBELoader();
rgbeLoader.load(toAsset('textures/venice_sunset_1k.hdr'), (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdrTexture;
  scene.environmentIntensity = 0.95;
});

const texLoader = new THREE.TextureLoader();
const waterNormals = texLoader.load(toAsset('textures/waternormals.jpg'), (tex) => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});

const oceanWater = new Water(new THREE.PlaneGeometry(3400, 3400), {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffd29c,
  waterColor: 0x0a2e36,
  distortionScale: 2.8,
  fog: true
});
oceanWater.rotation.x = -Math.PI / 2;
oceanWater.position.y = -0.38;
scene.add(oceanWater);

function applySunAndAtmosphere(elevation, azimuth, fogColorHex) {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  sunPosition.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms['sunPosition'].value.copy(sunPosition);
  oceanWater.material.uniforms['sunDirection'].value.copy(sunPosition).normalize();
  sunLight.position.copy(sunPosition).multiplyScalar(90);
  scene.fog.color.setHex(fogColorHex);
}
applySunAndAtmosphere(5.5, 165, 0xd4a688);

// ============================================================================
// COLLISION ENGINE (2-PASS SLIDING CYLINDER & AABB OBSTACLE SOLVER)
// ============================================================================
const worldColliders = [];

// ============================================================================
// AAA COMBAT FEEDBACK, PRO CAMERA, BOSS TELEGRAPHS & ORBITAL FLIGHT SYSTEMS
// ============================================================================
const combatFeedback = new CombatFeedbackSystem(scene, (x, z) => getLocalGroundHeight(x, z));
const proCamera = new ProCameraController(camera, (x, z) => getLocalGroundHeight(x, z), worldColliders);
const bossTelegraphs = new BossTelegraphSystem(scene, (x, z) => getLocalGroundHeight(x, z), sfx, combatFeedback);
const orbitalFX = new OrbitalFlightFX(scene, camera, sfx, combatFeedback);
window.combatFeedback = combatFeedback;
window.proCamera = proCamera;
window.bossTelegraphs = bossTelegraphs;
window.orbitalFX = orbitalFX;


function addCylinderCollider(x, z, radius, minY = -5, maxY = 35) {
  worldColliders.push({ type: 'cylinder', x, z, radius, minY, maxY });
}

function addBoxCollider(minX, maxX, minZ, maxZ, minY = -5, maxY = 35) {
  worldColliders.push({ type: 'box', minX, maxX, minZ, maxZ, minY, maxY });
}

function resolveHorizontalCollisions(pos, entityRadius = 0.85) {
  for (let pass = 0; pass < 2; pass++) {
    for (const col of worldColliders) {
      if (pos.y + 1.8 < col.minY || pos.y > col.maxY) continue;

      if (col.type === 'cylinder') {
        const dx = pos.x - col.x;
        const dz = pos.z - col.z;
        const dist = Math.hypot(dx, dz);
        const minDist = col.radius + entityRadius;
        if (dist < minDist) {
          if (dist < 0.0001) {
            pos.z += minDist;
          } else {
            const push = minDist - dist;
            pos.x += (dx / dist) * push;
            pos.z += (dz / dist) * push;
          }
        }
      } else if (col.type === 'box') {
        const expMinX = col.minX - entityRadius;
        const expMaxX = col.maxX + entityRadius;
        const expMinZ = col.minZ - entityRadius;
        const expMaxZ = col.maxZ + entityRadius;

        if (pos.x > expMinX && pos.x < expMaxX && pos.z > expMinZ && pos.z < expMaxZ) {
          const dLeft = pos.x - expMinX;
          const dRight = expMaxX - pos.x;
          const dTop = pos.z - expMinZ;
          const dBottom = expMaxZ - pos.z;
          const minOverlap = Math.min(dLeft, dRight, dTop, dBottom);

          if (minOverlap === dLeft) pos.x = expMinX;
          else if (minOverlap === dRight) pos.x = expMaxX;
          else if (minOverlap === dTop) pos.z = expMinZ;
          else pos.z = expMaxZ;
        }
      }
    }
  }
}

// ============================================================================
// REAL PBR MATERIALS & SEAMLESS UNIFIED PLANETARY ARCHITECTURES
// ============================================================================
const brickDiffuse = texLoader.load(toAsset('textures/brick_diffuse.jpg'));
const brickRoughness = texLoader.load(toAsset('textures/brick_roughness.jpg'));
const brickBump = texLoader.load(toAsset('textures/brick_bump.jpg'));
[brickDiffuse, brickRoughness, brickBump].forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 36);
});
brickDiffuse.colorSpace = THREE.SRGBColorSpace;

const moonTex = texLoader.load(toAsset('textures/planets/moon_1024.jpg'));
moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping;
moonTex.colorSpace = THREE.SRGBColorSpace;

const earthTex = texLoader.load(toAsset('textures/planets/earth_atmos_2048.jpg'));
earthTex.colorSpace = THREE.SRGBColorSpace;

const earthNormalTex = texLoader.load(toAsset('textures/planets/earth_normal_2048.jpg'));
const earthCloudsTex = texLoader.load(toAsset('textures/planets/earth_clouds_1024.png'));

const stoneCourtyardMat = new THREE.MeshStandardMaterial({
  map: brickDiffuse,
  roughnessMap: brickRoughness,
  bumpMap: brickBump,
  bumpScale: 0.06,
  roughness: 0.68,
  metalness: 0.08
});

const polishedMarbleMat = new THREE.MeshStandardMaterial({
  color: 0xede7da,
  roughness: 0.16,
  metalness: 0.22,
  bumpMap: brickBump,
  bumpScale: 0.012
});

const obsidianMat = new THREE.MeshStandardMaterial({
  color: 0x141820,
  roughness: 0.14,
  metalness: 0.88,
  bumpMap: brickBump,
  bumpScale: 0.02
});

const asphaltTrackMat = new THREE.MeshStandardMaterial({
  color: 0x1c2028,
  roughness: 0.42,
  metalness: 0.25,
  bumpMap: brickBump,
  bumpScale: 0.03
});

const ancientGoldMat = new THREE.MeshStandardMaterial({
  color: 0xffd278,
  roughness: 0.12,
  metalness: 0.96,
  emissive: 0x553800,
  emissiveIntensity: 0.35
});

const canopyGlassMat = new THREE.MeshStandardMaterial({
  color: 0x8ad8ff,
  transparent: true,
  opacity: 0.32,
  roughness: 0.05,
  metalness: 0.9,
  envMapIntensity: 1.8
});

const lunarSurfaceMat = new THREE.MeshStandardMaterial({
  map: moonTex,
  bumpMap: moonTex,
  bumpScale: 0.15,
  roughness: 0.88,
  metalness: 0.06
});

const martianSurfaceMat = new THREE.MeshStandardMaterial({
  map: moonTex,
  color: 0xd96b43,
  bumpMap: brickBump,
  bumpScale: 0.12,
  roughness: 0.82,
  metalness: 0.14
});

const aureliaSurfaceMat = new THREE.MeshStandardMaterial({
  map: earthTex,
  normalMap: earthNormalTex,
  color: 0x8cd3ff,
  roughness: 0.35,
  metalness: 0.28
});

const woodDiffuse = texLoader.load(toAsset('textures/hardwood2_diffuse.jpg'));
const woodRoughness = texLoader.load(toAsset('textures/hardwood2_roughness.jpg'));
const woodBump = texLoader.load(toAsset('textures/hardwood2_bump.jpg'));
[woodDiffuse, woodRoughness, woodBump].forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
});
woodDiffuse.colorSpace = THREE.SRGBColorSpace;

const hardwoodMat = new THREE.MeshStandardMaterial({
  map: woodDiffuse,
  roughnessMap: woodRoughness,
  bumpMap: woodBump,
  bumpScale: 0.04,
  roughness: 0.62,
  metalness: 0.08
});

const sandBeachMat = new THREE.MeshStandardMaterial({
  color: 0xe6cda5,
  roughness: 0.88,
  metalness: 0.02,
  bumpMap: brickBump,
  bumpScale: 0.02
});

const lushGrassMat = new THREE.MeshStandardMaterial({
  color: 0x295939,
  roughness: 0.78,
  metalness: 0.04,
  bumpMap: brickBump,
  bumpScale: 0.03
});

const sailCanvasMat = new THREE.MeshStandardMaterial({
  color: 0xfff6e5,
  roughness: 0.65,
  metalness: 0.05,
  side: THREE.DoubleSide
});

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const animatedRelics = [];
const interactiveAttractions = [];
const raceRingPositions = [];
const raceRingMeshes = [];
const animatedFlock = [];
const animatedNavalFleet = [];
const lighthouseBeams = [];
const celestialBodies = [];
const wayfinderPlaques = [];
const animatedWorldProps = [];
let aetherEmbers = null;

function createDiegeticWayfinder(title, subtitle, pos, maxVisibleDist = 52) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 148;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(7, 10, 18, 0.84)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 616, 124, 18);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(229, 189, 115, 0.72)';
  ctx.stroke();

  ctx.fillStyle = '#ffe2a6';
  ctx.font = '700 26px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 320, 64);

  ctx.fillStyle = '#c5bfb4';
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 320, 104);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.6, 1.06, 1);
  sprite.position.copy(pos);
  worldGroup.add(sprite);
  wayfinderPlaques.push({ sprite, mat, pos: pos.clone(), maxDist: maxVisibleDist });
  return sprite;
}

// ============================================================================
// SEAMLESS PLANETARY TERRAIN BUILDER (FIXES "BROKEN PLANETS" GEOMETRY!)
// ============================================================================
// Instead of placing a floating flat disc on top of a sphere, we sculpt a
// single continuous sphere whose northern cap smoothly flattens at the exact
// landing plateau height, surrounded by natural crater rims and atmospheric glow.
function createUnifiedPlanetBody(radius, plateauRadius, material, atmoColorHex) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const posAttr = geo.attributes.position;

  // Compute the exact Y height where the plateauRadius intersects the sphere
  const plateauRawY = Math.sqrt(Math.max(1, radius * radius - plateauRadius * plateauRadius));

  for (let i = 0; i < posAttr.count; i++) {
    let vx = posAttr.getX(i);
    let vy = posAttr.getY(i);
    let vz = posAttr.getZ(i);
    const horizR = Math.hypot(vx, vz);

    if (vy > 0 && horizR <= plateauRadius * 1.18) {
      if (horizR <= plateauRadius) {
        // Smooth flat walkable crater floor at the exact top of the planet
        vy = plateauRawY;
      } else {
        // Raised natural crater rim around the landing zone
        const rimT = (horizR - plateauRadius) / (plateauRadius * 0.18);
        const rimBump = Math.sin(rimT * Math.PI) * 3.2;
        vy = plateauRawY + rimBump;
      }
      posAttr.setXYZ(i, vx, vy, vz);
    }
  }
  geo.computeVertexNormals();

  const planetMesh = new THREE.Mesh(geo, material);
  // Shift the mesh down by plateauRawY so the top surface of thegroup is at local Y = 0!
  planetMesh.position.y = -plateauRawY;
  planetMesh.receiveShadow = true;
  group.add(planetMesh);

  // Subtle Atmospheric Fresnel Halo around the planet
  if (atmoColorHex) {
    const atmoGeo = new THREE.SphereGeometry(radius * 1.045, 48, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: atmoColorHex,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.position.y = -plateauRawY;
    group.add(atmoMesh);
  }

  // Ornamental Landing Ring embedded flush on the planetary surface (local Y = 0.05)
  const landingRing = new THREE.Mesh(
    new THREE.RingGeometry(plateauRadius * 0.65, plateauRadius * 0.68, 64),
    ancientGoldMat
  );
  landingRing.rotation.x = -Math.PI / 2;
  landingRing.position.y = 0.06;
  group.add(landingRing);

  return group;
}

function buildMasterPlannedUniverse() {
  // ==========================================================================
  // 1. PLANET EARTH: MASTER-PLANNED ISLAND CITADEL OF AETHELGARD & OCEAN HARBOR
  // ==========================================================================
  // Sloping Golden Sand Beach Skirt (r = 76m to 94m) meeting the turquoise Ocean Water
  const goldenBeach = new THREE.Mesh(new THREE.CylinderGeometry(76, 95, 1.4, 72), sandBeachMat);
  goldenBeach.position.y = -0.72;
  goldenBeach.receiveShadow = true;
  worldGroup.add(goldenBeach);

  // Main Stone Citadel Courtyard (r = 76m) so the ocean is visible from the entire city!
  const earthContinent = new THREE.Mesh(new THREE.CylinderGeometry(76, 80, 2.2, 72), stoneCourtyardMat);
  earthContinent.position.y = -1.1;
  earthContinent.receiveShadow = true;
  worldGroup.add(earthContinent);

  // Northern Spaceport Peninsula & Causeway (0, 0, -88) extending into the northern sea
  const northPeninsula = new THREE.Mesh(new THREE.CylinderGeometry(24, 29, 2.2, 48), stoneCourtyardMat);
  northPeninsula.position.set(0, -1.1, -88);
  northPeninsula.receiveShadow = true;
  worldGroup.add(northPeninsula);

  // 4 Lush Emerald Garden Terraces & Turquoise Reflecting Pools in the inner quadrants
  [
    [-22, -22],
    [22, -22],
    [-26, 26],
    [26, 26]
  ].forEach(([gx, gz]) => {
    const gardenBorder = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 9.2, 0.28, 32), polishedMarbleMat);
    gardenBorder.position.set(gx, 0.14, gz);
    gardenBorder.receiveShadow = true;
    worldGroup.add(gardenBorder);

    const grassLawn = new THREE.Mesh(new THREE.CylinderGeometry(8.1, 8.2, 0.32, 32), lushGrassMat);
    grassLawn.position.set(gx, 0.16, gz);
    grassLawn.receiveShadow = true;
    worldGroup.add(grassLawn);

    const poolBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.36, 24),
      new THREE.MeshStandardMaterial({ color: 0x1098ad, roughness: 0.08, metalness: 0.35 })
    );
    poolBasin.position.set(gx, 0.18, gz);
    worldGroup.add(poolBasin);
  });

  // 16 Warm-Lit Imperial Streetlamp Braziers along the Cardinal Boulevards
  const lampCoords = [
    [-5.4, 12], [5.4, 12], [-5.4, 30], [5.4, 30], [-5.4, 54], [5.4, 54],
    [-5.4, -15], [5.4, -15], [-5.4, -32], [5.4, -32], [-5.4, -64], [5.4, -64],
    [-25, -5.4], [-25, 5.4], [25, -5.4], [25, 5.4]
  ];
  lampCoords.forEach(([lx, lz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.6, 12), obsidianMat);
    post.position.set(lx, 2.3, lz);
    post.castShadow = true;
    worldGroup.add(post);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd278 })
    );
    lantern.position.set(lx, 4.75, lz);
    worldGroup.add(lantern);
  });

  // Floating Golden Aether Embers across the Citadel
  const emberCount = 360;
  const emberGeo = new THREE.BufferGeometry();
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount * 3; i += 3) {
    emberPos[i] = (Math.random() - 0.5) * 220;
    emberPos[i + 1] = 0.8 + Math.random() * 18;
    emberPos[i + 2] = (Math.random() - 0.5) * 260;
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  aetherEmbers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({ color: 0xffd278, size: 0.42, transparent: true, opacity: 0.78 })
  );
  worldGroup.add(aetherEmbers);

  // Outer Marble Perimeter Balustrade & 24 Colonnade Pillars (r = 56m) with SOLID COLLIDERS
  const pillarGeo = new THREE.CylinderGeometry(1.05, 1.25, 11.5, 24);
  const capGeo = new THREE.BoxGeometry(2.9, 0.8, 2.9);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const deg = Math.round(THREE.MathUtils.radToDeg(angle)) % 90;
    if (deg < 8 || deg > 82) continue;

    const r = 56;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const pillar = new THREE.Mesh(pillarGeo, polishedMarbleMat);
    pillar.position.set(px, 5.75, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    worldGroup.add(pillar);

    const cap = new THREE.Mesh(capGeo, polishedMarbleMat);
    cap.position.set(px, 11.7, pz);
    cap.castShadow = true;
    worldGroup.add(cap);

    addCylinderCollider(px, pz, 1.35, -2, 14);
  }

  // Dedicated Circular Asphalt & Gold GT Racing Circuit at r = 44m
  const raceTrackMesh = new THREE.Mesh(new THREE.RingGeometry(40.2, 47.8, 64), asphaltTrackMat);
  raceTrackMesh.rotation.x = -Math.PI / 2;
  raceTrackMesh.position.y = 0.03;
  raceTrackMesh.receiveShadow = true;
  worldGroup.add(raceTrackMesh);

  const innerCurb = new THREE.Mesh(new THREE.RingGeometry(39.8, 40.2, 64), ancientGoldMat);
  innerCurb.rotation.x = -Math.PI / 2;
  innerCurb.position.y = 0.05;
  worldGroup.add(innerCurb);

  const outerCurb = new THREE.Mesh(new THREE.RingGeometry(47.8, 48.2, 64), ancientGoldMat);
  outerCurb.rotation.x = -Math.PI / 2;
  outerCurb.position.y = 0.05;
  worldGroup.add(outerCurb);

  // 4 Cardinal Paved Obsidian & Gold Boulevards
  const nsBoulevard = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 130), obsidianMat);
  nsBoulevard.position.set(0, 0.04, -30);
  nsBoulevard.receiveShadow = true;
  worldGroup.add(nsBoulevard);

  const ewBoulevard = new THREE.Mesh(new THREE.BoxGeometry(160, 0.08, 9.5), obsidianMat);
  ewBoulevard.position.set(0, 0.04, 0);
  ewBoulevard.receiveShadow = true;
  worldGroup.add(ewBoulevard);

  // Central Plaza Octagon & Altar of Ascension (0, 0, 0)
  const centralOctagon = new THREE.Mesh(new THREE.CylinderGeometry(12, 12.8, 0.18, 8), polishedMarbleMat);
  centralOctagon.position.set(0, 0.09, 0);
  centralOctagon.receiveShadow = true;
  worldGroup.add(centralOctagon);

  const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.8, 1.8, 32), obsidianMat);
  altarBase.position.set(0, 0.9, 0);
  altarBase.castShadow = true;
  altarBase.receiveShadow = true;
  worldGroup.add(altarBase);
  addCylinderCollider(0, 0, 4.6, -2, 8);

  const ascensionSphere = new THREE.Mesh(new THREE.TorusKnotGeometry(1.35, 0.32, 128, 32), ancientGoldMat);
  ascensionSphere.position.set(0, 4.5, 0);
  ascensionSphere.castShadow = true;
  worldGroup.add(ascensionSphere);
  animatedRelics.push({ mesh: ascensionSphere, baseY: 4.5 });

  createDiegeticWayfinder(
    'ALTAR DE LA ASCENSIÓN & FORJA [F]',
    'Centro de Aethelgard • Carta Estelar [M] o Forja (+15 & Alas)',
    new THREE.Vector3(0, 7.6, 0),
    48
  );

  // South Arrival Plaza & Showcase Pedestal (0, 0, 18)
  const spawnPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 0.16, 32), obsidianMat);
  spawnPedestal.position.set(0, 0.08, 18);
  spawnPedestal.receiveShadow = true;
  worldGroup.add(spawnPedestal);

  const spawnRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.05, 16, 48), ancientGoldMat);
  spawnRing.rotation.x = Math.PI / 2;
  spawnRing.position.set(0, 0.17, 18);
  worldGroup.add(spawnRing);

  // --------------------------------------------------------------------------
  // NORTH AXIS (0, 0, -45): TEMPLE OF THE AI ARCHON & SPACEPORT (0, 0, -88)
  // --------------------------------------------------------------------------
  const oraclePlatform = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 14), polishedMarbleMat);
  oraclePlatform.position.set(0, 0.4, -45);
  oraclePlatform.receiveShadow = true;
  worldGroup.add(oraclePlatform);

  const oraclePedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 2.2, 24), obsidianMat);
  oraclePedestal.position.set(0, 1.5, -45);
  oraclePedestal.castShadow = true;
  worldGroup.add(oraclePedestal);
  addCylinderCollider(0, -45, 3.1, -2, 9);

  [-6.5, 6.5].forEach((ox) => {
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.9, 9.5, 4), obsidianMat);
    obelisk.position.set(ox, 4.75, -45);
    obelisk.castShadow = true;
    worldGroup.add(obelisk);
    addCylinderCollider(ox, -45, 1.0, -2, 12);
  });

  const archonCore = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 2), ancientGoldMat);
  archonCore.position.set(0, 4.4, -45);
  worldGroup.add(archonCore);
  animatedRelics.push({ mesh: archonCore, baseY: 4.4 });

  createDiegeticWayfinder(
    'SANTUARIO DEL ARCONTE IA (NORTE)',
    'Reliquia II de la Mente • Presiona [E] para iniciar juicio',
    new THREE.Vector3(0, 7.6, -45),
    55
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 0, -45),
    radius: 7.5,
    label: 'Hablar con el Arconte IA (Reliquia de la Mente + Joyas)',
    action: () => openArchonModal()
  });

  // Far North: Orbital Spaceport Launch Complex (0, 0, -88)
  const launchpad = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 0.9, 32), obsidianMat);
  launchpad.position.set(0, 0.45, -88);
  launchpad.receiveShadow = true;
  worldGroup.add(launchpad);

  const padRing = new THREE.Mesh(new THREE.TorusGeometry(12.2, 0.2, 16, 48), ancientGoldMat);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.set(0, 0.95, -88);
  worldGroup.add(padRing);

  [[-11, -78], [11, -78], [-11, -98], [11, -98]].forEach(([gx, gz]) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 14, 1.8), polishedMarbleMat);
    tower.position.set(gx, 7, gz);
    tower.castShadow = true;
    worldGroup.add(tower);
    addBoxCollider(gx - 1.0, gx + 1.0, gz - 1.0, gz + 1.0, -2, 16);
  });

  createDiegeticWayfinder(
    'PUERTO ESPACIAL INTERPLANETARIO',
    'Despegue a la Luna, Marte y Aurelia • Carta Estelar [M]',
    new THREE.Vector3(0, 7.8, -88),
    65
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 0, -88),
    radius: 11.5,
    label: 'Abrir Carta Estelar / Despegue Interplanetario',
    action: () => document.getElementById('starmap-modal').classList.remove('hidden')
  });

  // --------------------------------------------------------------------------
  // WEST AXIS (-75, 0, 0): SANCTUARY OF THE HORIZON RELIC
  // --------------------------------------------------------------------------
  const westTempleBase = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 1.2, 8), polishedMarbleMat);
  westTempleBase.position.set(-75, 0.6, 0);
  westTempleBase.receiveShadow = true;
  worldGroup.add(westTempleBase);

  const westAltar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 2.2, 16), obsidianMat);
  westAltar.position.set(-75, 1.7, 0);
  worldGroup.add(westAltar);
  addCylinderCollider(-75, 0, 2.8, -2, 8);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = -75 + Math.cos(a) * 8.5;
    const pz = Math.sin(a) * 8.5;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 8.5, 16), polishedMarbleMat);
    col.position.set(px, 4.25, pz);
    col.castShadow = true;
    worldGroup.add(col);
    addCylinderCollider(px, pz, 0.9, -2, 10);
  }

  const horizonRelicMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 2), ancientGoldMat);
  horizonRelicMesh.position.set(-75, 4.4, 0);
  worldGroup.add(horizonRelicMesh);
  animatedRelics.push({ mesh: horizonRelicMesh, baseY: 4.4 });

  createDiegeticWayfinder(
    'TEMPLO DEL HORIZONTE (OESTE)',
    'Reliquia I • Presiona [E] para despertar (+1,200 ✦ / +800 XP)',
    new THREE.Vector3(-75, 7.6, 0),
    60
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(-75, 0, 0),
    radius: 7.5,
    label: 'Despertar Reliquia del Horizonte (+1,200 ✦ / +2 Joyas / +800 XP)',
    action: () => claimRelic(0)
  });

  // --------------------------------------------------------------------------
  // EAST AXIS (75, 0, 0): OBSIDIAN COLOSSEUM OF VALOR RELIC & MVP BOSS ARENA
  // --------------------------------------------------------------------------
  const eastArenaBase = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 1.0, 24), obsidianMat);
  eastArenaBase.position.set(75, 0.5, 0);
  eastArenaBase.receiveShadow = true;
  worldGroup.add(eastArenaBase);

  const eastAltar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 2.2, 16), polishedMarbleMat);
  eastAltar.position.set(75, 1.7, 0);
  worldGroup.add(eastAltar);
  addCylinderCollider(75, 0, 2.8, -2, 8);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = 75 + Math.cos(a) * 9.5;
    const pz = Math.sin(a) * 9.5;
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.5, 1.4), obsidianMat);
    col.position.set(px, 4.25, pz);
    col.castShadow = true;
    worldGroup.add(col);
    addCylinderCollider(px, pz, 1.0, -2, 10);
  }

  const valorRelicMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), ancientGoldMat);
  valorRelicMesh.position.set(75, 4.4, 0);
  worldGroup.add(valorRelicMesh);
  animatedRelics.push({ mesh: valorRelicMesh, baseY: 4.4 });

  createDiegeticWayfinder(
    'COLISEO DEL VALOR & ARENA MVP (ESTE)',
    'Reliquia III & Boss Coloso • Ataca con [Q] (+1,200 ✦ / +800 XP)',
    new THREE.Vector3(75, 7.6, 0),
    60
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(75, 0, 0),
    radius: 7.5,
    label: 'Conquistar Reliquia del Valor (+1,200 ✦ / +2 Joyas / +800 XP)',
    action: () => {
      triggerAetherStrike();
      claimRelic(2);
    }
  });

  // 8 Golden Speed Trial Checkpoints aligned cleanly along the r = 44m Asphalt Racetrack
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 44;
    const pos = new THREE.Vector3(Math.cos(angle) * r, 2.6, Math.sin(angle) * r);
    raceRingPositions.push(pos);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.18, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0xffd278, emissive: 0xff9900, emissiveIntensity: 1.2 })
    );
    ringMesh.position.copy(pos);
    ringMesh.rotation.y = -angle;
    ringMesh.visible = false;
    worldGroup.add(ringMesh);
    raceRingMeshes.push(ringMesh);
  }

  // --------------------------------------------------------------------------
  // SOUTH AXIS (0, 0, +66 to +102): PUERTO NAVAL IMPERIAL, MUELLE & FARO MARÍTIMO
  // --------------------------------------------------------------------------
  const southHarborPromenade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 52), obsidianMat);
  southHarborPromenade.position.set(0, 0.04, 46);
  southHarborPromenade.receiveShadow = true;
  worldGroup.add(southHarborPromenade);

  const harborPierDeck = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 36), hardwoodMat);
  harborPierDeck.position.set(0, 0.12, 86);
  harborPierDeck.castShadow = true;
  harborPierDeck.receiveShadow = true;
  worldGroup.add(harborPierDeck);

  // Wooden Pier Pilings & Gold Mooring Bollards into the Ocean
  [72, 80, 88, 96, 102].forEach((pz) => {
    [-4.8, 4.8].forEach((px) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 3.6, 12), hardwoodMat);
      piling.position.set(px, -0.6, pz);
      worldGroup.add(piling);

      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.75, 12), ancientGoldMat);
      bollard.position.set(px, 0.65, pz);
      worldGroup.add(bollard);
    });
  });

  // 22m Imperial Maritime Lighthouse at (+15, 0, +86) with Rotating Searchlight Beam
  const lighthouseBase = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.8, 3.2, 24), obsidianMat);
  lighthouseBase.position.set(15, 1.6, 86);
  lighthouseBase.castShadow = true;
  worldGroup.add(lighthouseBase);

  const lighthouseTower = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.55, 16.5, 24), polishedMarbleMat);
  lighthouseTower.position.set(15, 11.2, 86);
  lighthouseTower.castShadow = true;
  worldGroup.add(lighthouseTower);
  addCylinderCollider(15, 86, 3.4, -2, 24);

  const lighthouseLantern = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 16), canopyGlassMat);
  lighthouseLantern.position.set(15, 20.4, 86);
  worldGroup.add(lighthouseLantern);

  const lighthouseRoof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.2, 24), ancientGoldMat);
  lighthouseRoof.position.set(15, 22.8, 86);
  worldGroup.add(lighthouseRoof);

  const beamPivot = new THREE.Group();
  beamPivot.position.set(15, 20.4, 86);
  const beamCone = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe2a6, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
  );
  beamCone.rotation.x = Math.PI / 2;
  beamCone.position.z = 17;
  beamPivot.add(beamCone);
  worldGroup.add(beamPivot);
  lighthouseBeams.push(beamPivot);

  createDiegeticWayfinder(
    'PUERTO NAVAL IMPERIAL (SUR)',
    'Galeón de 3 Mástiles Gratuito • Presiona [E] o [6] para zarpar al Océano',
    new THREE.Vector3(0, 6.2, 78),
    65
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 0, 84),
    radius: 10.5,
    label: 'Zarpar en el Galeón Naval Imperial de 3 Mástiles [6]',
    action: () => requestMountEquipOrBuy('ship')
  });

  // --------------------------------------------------------------------------
  // OCEAN ARCHIPELAGO ISLAND 1: ISLA DEL DRAGÓN ABISAL (0, 0, +185)
  // --------------------------------------------------------------------------
  const dragonIslandBeach = new THREE.Mesh(new THREE.CylinderGeometry(31, 38, 1.5, 48), sandBeachMat);
  dragonIslandBeach.position.set(0, -0.68, 185);
  dragonIslandBeach.receiveShadow = true;
  worldGroup.add(dragonIslandBeach);

  const dragonIslandGrass = new THREE.Mesh(new THREE.CylinderGeometry(26, 30, 1.9, 48), lushGrassMat);
  dragonIslandGrass.position.set(0, -0.78, 185);
  dragonIslandGrass.receiveShadow = true;
  worldGroup.add(dragonIslandGrass);

  const dragonIslandDock = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.5, 16), hardwoodMat);
  dragonIslandDock.position.set(0, 0.15, 152);
  dragonIslandDock.receiveShadow = true;
  worldGroup.add(dragonIslandDock);

  const dragonAltar = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.8, 0.8, 24), obsidianMat);
  dragonAltar.position.set(0, 0.4, 192);
  dragonAltar.receiveShadow = true;
  worldGroup.add(dragonAltar);

  createDiegeticWayfinder(
    'ISLA DEL DRAGÓN ABISAL (ARCHIPIÉLAGO SUR)',
    'Raid Boss Marino Dragón Leviatán (Nv.38) y Perlas Abisales',
    new THREE.Vector3(0, 7.8, 185),
    85
  );

  // --------------------------------------------------------------------------
  // OCEAN ARCHIPELAGO ISLAND 2: ISLA DEL ARRECIFE DORADO (+165, 0, +110)
  // --------------------------------------------------------------------------
  const reefIslandBeach = new THREE.Mesh(new THREE.CylinderGeometry(24, 30, 1.5, 40), sandBeachMat);
  reefIslandBeach.position.set(165, -0.68, 110);
  reefIslandBeach.receiveShadow = true;
  worldGroup.add(reefIslandBeach);

  const reefIslandGrass = new THREE.Mesh(new THREE.CylinderGeometry(19, 23, 1.9, 40), lushGrassMat);
  reefIslandGrass.position.set(165, -0.78, 110);
  reefIslandGrass.receiveShadow = true;
  worldGroup.add(reefIslandGrass);

  const treasureChest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.5), ancientGoldMat);
  treasureChest.position.set(165, 0.9, 110);
  treasureChest.castShadow = true;
  worldGroup.add(treasureChest);

  createDiegeticWayfinder(
    'ISLA DEL ARRECIFE DORADO (ESTE MARÍTIMO)',
    'Tesoro Naval Hundido • Presiona [E] para reclamar (+600 ✦ / +700 XP)',
    new THREE.Vector3(165, 6.8, 110),
    80
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(165, 0, 110),
    radius: 9.0,
    label: 'Reclamar Tesoro del Arrecife Dorado (+600 ✦ / +700 XP)',
    action: () => rewardAttraction('Tesoro Naval del Arrecife Dorado', 600, 700)
  });

  // ==========================================================================
  // 2. THE MOON (SELENE) — SEAMLESS SCULPTED CRATER SPHERE (Surface at 0, 260, -680)
  // ==========================================================================
  const moonBody = createUnifiedPlanetBody(115, 58, lunarSurfaceMat, 0x88ccff);
  moonBody.position.set(0, 260, -680);
  worldGroup.add(moonBody);

  const moonDome = new THREE.Mesh(
    new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyGlassMat
  );
  moonDome.position.set(0, 260, -696);
  worldGroup.add(moonDome);
  addCylinderCollider(0, -696, 10.8, 255, 280);

  createDiegeticWayfinder(
    'BASE LUNAR TRANQUILIDAD (SELENE • NV. 30-50)',
    'Caza Espectros Lunares y al Raid Boss Arconte de Selene',
    new THREE.Vector3(0, 267, -680),
    85
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 260, -680),
    radius: 10.0,
    label: 'Extraer Núcleo de Helio-3 Lunar (+350 ✦ / +400 XP)',
    action: () => rewardAttraction('Extracción Lunar de Helio-3', 350, 400)
  });

  // ==========================================================================
  // 3. PLANET MARS (ARES PRIME) — SEAMLESS SCULPTED CALDERA (Surface at -620, 340, -1100)
  // ==========================================================================
  const marsBody = createUnifiedPlanetBody(145, 68, martianSurfaceMat, 0xff6b3d);
  marsBody.position.set(-620, 340, -1100);
  worldGroup.add(marsBody);

  createDiegeticWayfinder(
    'PLANETA MARTE // ARES PRIME (NV. 55-75)',
    'Reactor Iónico, Gólems Kyber y Raid Boss Ignis de Ares',
    new THREE.Vector3(-620, 348, -1100),
    95
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(-620, 340, -1100),
    radius: 12.0,
    label: 'Cosechar Reactor Marciano de Ares Prime (+500 ✦ / +600 XP)',
    action: () => rewardAttraction('Reactor de Marte Ares Prime', 500, 600)
  });

  // ==========================================================================
  // 4. RINGED PLANET AURELIA — SEAMLESS IMPERIAL WORLD (Surface at 680, 440, -1350)
  // ==========================================================================
  const aureliaBody = createUnifiedPlanetBody(165, 72, aureliaSurfaceMat, 0x7ce0ff);
  aureliaBody.position.set(680, 440, -1350);
  worldGroup.add(aureliaBody);

  // Multi-band Saturn-style Planetary Rings tilted around Aurelia's equator
  const ringGroup = new THREE.Group();
  ringGroup.position.set(680, 305, -1350);
  ringGroup.rotation.x = Math.PI / 2.25;
  ringGroup.rotation.y = 0.22;

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(195, 245, 96),
    new THREE.MeshStandardMaterial({ color: 0xffe2a6, side: THREE.DoubleSide, transparent: true, opacity: 0.65, roughness: 0.3 })
  );
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(255, 310, 96),
    new THREE.MeshStandardMaterial({ color: 0x8cd3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.42, roughness: 0.3 })
  );
  ringGroup.add(innerRing, outerRing);
  worldGroup.add(ringGroup);

  createDiegeticWayfinder(
    'SANTUARIO ORBITAL DE AURELIA (NV. 80-100)',
    'Caza Serafines del Vacío y al Emperador de Aurelia',
    new THREE.Vector3(680, 448, -1350),
    95
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(680, 440, -1350),
    radius: 12.0,
    label: 'Canalizar Matriz Orbital de Aurelia (+750 ✦ / +900 XP)',
    action: () => rewardAttraction('Matriz Orbital de Aurelia', 750, 900)
  });

  // Distant Earth Planetary Curvature & Cloud Layer visible when flying in high orbit (Alt > 140m)
  const earthOrbitalGroup = new THREE.Group();
  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(260, 64, 48),
    new THREE.MeshStandardMaterial({ map: earthTex, normalMap: earthNormalTex, roughness: 0.55, metalness: 0.1 })
  );
  const earthCloudLayer = new THREE.Mesh(
    new THREE.SphereGeometry(263.5, 48, 36),
    new THREE.MeshStandardMaterial({ map: earthCloudsTex, transparent: true, opacity: 0.45 })
  );
  earthOrbitalGroup.add(earthGlobe, earthCloudLayer);
  earthOrbitalGroup.position.set(0, -264, 0);
  worldGroup.add(earthOrbitalGroup);
  celestialBodies.push(earthCloudLayer);

  // High-Performance Procedural World Architectures across all 4 Celestial Worlds
  buildDetailedWorldArchitectures({
    scene,
    worldGroup,
    baseMaterials: {
      obsidianMat,
      polishedMarbleMat,
      ancientGoldMat,
      hardwoodMat,
      canopyGlassMat,
      lunarSurfaceMat,
      martianSurfaceMat,
      aureliaSurfaceMat,
      sandBeachMat,
      lushGrassMat,
      brickBump,
      moonTex
    },
    addCylinderCollider,
    addBoxCollider,
    animatedWorldProps
  });
}

buildMasterPlannedUniverse();

// ============================================================================
// DRACO + GLTF ASSET LOADER (PLAYERS, VEHICLES, MONSTERS & REACTORS)
// ============================================================================
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(toAsset('draco/'));
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();
const globalEnvMixers = [];

function normalizeAndGroundModel(model, targetMaxDim = 6.0, groundOffset = 0) {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetMaxDim / maxDim;
  model.scale.multiplyScalar(scale);
  model.position.set(
    -center.x * scale,
    -box.min.y * scale + groundOffset,
    -center.z * scale
  );
  return wrapper;
}

function createImperialGalleonMesh(targetLength = 12.5) {
  const g = new THREE.Group();
  if (modelCache.has('SailShip')) {
    const rawShip = modelCache.get('SailShip').scene.clone();
    rawShip.traverse((ch) => {
      if (ch.isMesh) {
        ch.castShadow = true;
        ch.receiveShadow = true;
        const n = (ch.name || '').toLowerCase();
        if (n.includes('sail')) {
          ch.material = sailCanvasMat;
        } else {
          ch.material = hardwoodMat;
        }
      }
    });
    const normShip = normalizeAndGroundModel(rawShip, targetLength, -0.45);
    g.add(normShip);
  } else if (modelCache.has('Sailboat')) {
    const rawBoat = modelCache.get('Sailboat').scene.clone();
    const normBoat = normalizeAndGroundModel(rawBoat, targetLength * 0.8, -0.35);
    g.add(normBoat);
  } else {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 10.5), hardwoodMat);
    hull.position.y = 0.6;
    g.add(hull);
  }

  // Captain's Helm Wheel on the Quarterdeck so the Captain avatar stands/sits right behind the wheel!
  const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 12), hardwoodMat);
  helmPost.position.set(0, 2.05, -1.55);
  g.add(helmPost);

  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 12, 24), ancientGoldMat);
  helmWheel.position.set(0, 2.45, -1.35);
  g.add(helmWheel);

  return g;
}

let coreModelsLoaded = false;
async function preloadCoreModels() {
  if (coreModelsLoaded) return;
  const coreFiles = [
    { key: 'Soldier', url: toAsset('models/Soldier.glb') },
    { key: 'Xbot', url: toAsset('models/Xbot.glb') },
    { key: 'Robot', url: toAsset('models/RobotExpressive.glb') },
    { key: 'Horse', url: toAsset('models/Horse.glb') },
    { key: 'Ferrari', url: toAsset('models/ferrari.glb') },
    { key: 'Stork', url: toAsset('models/Stork.glb') },
    { key: 'Flamingo', url: toAsset('models/Flamingo.glb') },
    { key: 'PrimaryIonDrive', url: toAsset('models/PrimaryIonDrive.glb') },
    { key: 'SailShip', url: toAsset('models/Sail_ship.glb') },
    { key: 'Sailboat', url: toAsset('models/sailboat.glb') },
    { key: 'JetFighter', url: toAsset('models/jet_fighter.glb') },
    { key: 'Tree', url: toAsset('models/tree.glb') },
    { key: 'Dragon', url: toAsset('models/DragonAttenuation.glb') }
  ];

  await Promise.all(
    coreFiles.map(
      (f) =>
        new Promise((resolve) => {
          gltfLoader.load(
            f.url,
            (gltf) => {
              modelCache.set(f.key, gltf);
              resolve();
            },
            undefined,
            () => resolve()
          );
        })
    )
  );
  coreModelsLoaded = true;
  populateWorldAttractionsFromCache();
}

const populatedLandmarks = new Set();
function populateWorldAttractionsFromCache() {
  // 1. Supercar GT Showroom Paddock (East Arrival Plaza: +22, 0, 18)
  if (modelCache.has('Ferrari') && !populatedLandmarks.has('FerrariPaddock')) {
    populatedLandmarks.add('FerrariPaddock');
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.2, 32), obsidianMat);
    pad.position.set(22, 0.1, 18);
    worldGroup.add(pad);

    const car = modelCache.get('Ferrari').scene.clone();
    car.scale.set(1.28, 1.28, 1.28);
    car.position.set(22, 0.2, 18);
    car.rotation.y = -0.55;
    worldGroup.add(car);
    addCylinderCollider(22, 18, 2.8, -2, 4);

    createDiegeticWayfinder(
      'PADDOCK IMPERIAL GT',
      'Presiona [E] o [2] para pilotar el Supercar en el Circuito',
      new THREE.Vector3(22, 3.8, 18),
      42
    );

    interactiveAttractions.push({
      position: new THREE.Vector3(22, 0, 18),
      radius: 6.0,
      label: 'Pilotar Supercar GT e Iniciar Circuito (+300 ✦ / +350 XP)',
      action: () => {
        requestMountEquipOrBuy('supercar');
        startRingRace();
      }
    });
  }

  // 2. Royal Stables Pavilion (West Arrival Plaza: -22, 0, 18)
  if (modelCache.has('Horse') && !populatedLandmarks.has('HorseStables')) {
    populatedLandmarks.add('HorseStables');
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.2, 32), polishedMarbleMat);
    pad.position.set(-22, 0.1, 18);
    worldGroup.add(pad);

    const horse = modelCache.get('Horse').scene.clone();
    horse.scale.set(0.015, 0.015, 0.015);
    horse.position.set(-22, 0.2, 18);
    horse.rotation.y = 0.55;
    worldGroup.add(horse);
    addCylinderCollider(-22, 18, 2.4, -2, 4);

    createDiegeticWayfinder(
      'ESTABLOS REALES',
      'Montura Gratuita • Presiona [E] o [1] para cabalgar',
      new THREE.Vector3(-22, 3.8, 18),
      42
    );

    interactiveAttractions.push({
      position: new THREE.Vector3(-22, 0, 18),
      radius: 6.0,
      label: 'Cabalgar en el Corcel Imperial',
      action: () => requestMountEquipOrBuy('horse')
    });
  }

  // 3. Primary Ion Drive Reactor on Mars Colony (-620, 344, -1115)
  if (modelCache.has('PrimaryIonDrive') && !populatedLandmarks.has('PrimaryIonDrive')) {
    populatedLandmarks.add('PrimaryIonDrive');
    const ionGltf = modelCache.get('PrimaryIonDrive');
    const drive = ionGltf.scene.clone();
    drive.scale.set(2.8, 2.8, 2.8);
    drive.position.set(-620, 344, -1115);
    worldGroup.add(drive);
    addCylinderCollider(-620, -1115, 5.5, 335, 360);

    if (ionGltf.animations?.[0]) {
      const m = new THREE.AnimationMixer(drive);
      m.clipAction(ionGltf.animations[0]).play();
      globalEnvMixers.push(m);
    }
  }

  // 4. High-Altitude Bird Flock over the Ocean
  if (modelCache.has('Flamingo') && !populatedLandmarks.has('BirdsFlock')) {
    populatedLandmarks.add('BirdsFlock');
    const birdGltf = modelCache.get('Flamingo');
    for (let i = 0; i < 6; i++) {
      const bird = SkeletonUtils.clone(birdGltf.scene);
      bird.scale.set(0.035, 0.035, 0.035);
      worldGroup.add(bird);
      let mixer = null;
      if (birdGltf.animations?.[0]) {
        mixer = new THREE.AnimationMixer(bird);
        mixer.clipAction(birdGltf.animations[0]).setDuration(1.1).play();
      }
      animatedFlock.push({
        mesh: bird,
        mixer,
        angle: (i / 6) * Math.PI * 2,
        radius: 64 + (i % 3) * 12,
        height: 22 + (i % 2) * 5,
        speed: 0.22 + (i % 3) * 0.04
      });
    }
  }

  // 5. Lush 3D Botanical Forests & Coastal Groves (56+ Real 3D Trees via tree.glb)
  if (modelCache.has('Tree') && !populatedLandmarks.has('BotanicalForests')) {
    populatedLandmarks.add('BotanicalForests');
    const treeScene = modelCache.get('Tree').scene;

    const plantTree = (tx, ty, tz, heightMeters = 6.8, rotY = 0) => {
      const rawTree = treeScene.clone();
      rawTree.traverse((ch) => {
        if (ch.isMesh) {
          ch.castShadow = true;
          ch.receiveShadow = true;
        }
      });
      const treeObj = normalizeAndGroundModel(rawTree, heightMeters, -0.15);
      treeObj.position.set(tx, ty, tz);
      treeObj.rotation.y = rotY;
      worldGroup.add(treeObj);
    };

    // Inner Quadrant Emerald Gardens (16 trees)
    [
      [-22, -22],
      [22, -22],
      [-26, 26],
      [26, 26]
    ].forEach(([gx, gz], qIdx) => {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        plantTree(
          gx + Math.cos(a) * 6.4,
          0.1,
          gz + Math.sin(a) * 6.4,
          6.2 + ((qIdx + k) % 3) * 0.8,
          a
        );
      }
    });

    // Golden Beach Coastline & Perimeter Groves (24 trees)
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const deg = Math.round(THREE.MathUtils.radToDeg(angle) + 360) % 90;
      if (deg < 10 || deg > 80) continue; // Keep cardinal avenues & harbor pier clear
      const r = 68 + (i % 3) * 3.5;
      plantTree(
        Math.cos(angle) * r,
        -0.1,
        Math.sin(angle) * r,
        6.5 + (i % 4) * 0.9,
        angle * 1.7
      );
    }

    // Archipelago Island 1: Isla del Dragón Abisal Groves (10 trees)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      if (Math.sin(a) < -0.75) continue; // Keep northern dock entrance clear
      plantTree(
        Math.cos(a) * 21,
        0,
        185 + Math.sin(a) * 21,
        7.5 + (i % 3) * 1.1,
        a
      );
    }

    // Archipelago Island 2: Isla del Arrecife Dorado Groves (8 trees)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      plantTree(
        165 + Math.cos(a) * 15,
        0,
        110 + Math.sin(a) * 15,
        6.8 + (i % 3) * 0.9,
        a
      );
    }
  }

  // 6. South Imperial Harbor Docked 3D Galleons & Autonomous Ocean Fleet
  if ((modelCache.has('SailShip') || modelCache.has('Sailboat')) && !populatedLandmarks.has('ImperialHarborFleet')) {
    populatedLandmarks.add('ImperialHarborFleet');

    // Flagship 3-Mast Galleon moored on the West side of the South Pier
    const dockedGalleon = createImperialGalleonMesh(14.0);
    dockedGalleon.position.set(-9.2, -0.25, 92);
    dockedGalleon.rotation.y = 0.08;
    worldGroup.add(dockedGalleon);

    // Royal Escort Sailboat moored on the East side of the South Pier
    if (modelCache.has('Sailboat')) {
      const escort = normalizeAndGroundModel(modelCache.get('Sailboat').scene.clone(), 8.5, -0.35);
      escort.position.set(8.2, -0.25, 88);
      escort.rotation.y = -0.15;
      worldGroup.add(escort);
    }

    // 4 Autonomous Sailing Ships cruising across the turquoise Ocean around Aethelgard
    for (let i = 0; i < 4; i++) {
      const fleetShip = createImperialGalleonMesh(13.2);
      worldGroup.add(fleetShip);
      animatedNavalFleet.push({
        mesh: fleetShip,
        angle: (i / 4) * Math.PI * 2 + 0.45,
        radius: 118 + (i % 2) * 22,
        speed: 0.055 + (i % 2) * 0.015
      });
    }
  }

  // 7. Golden Guardian Dragon Statues flanking the Central Altar (DragonAttenuation.glb)
  if (modelCache.has('Dragon') && !populatedLandmarks.has('DragonGuardians')) {
    populatedLandmarks.add('DragonGuardians');
    const rawDragon = modelCache.get('Dragon').scene;

    [-7.5, 7.5].forEach((dx) => {
      const statueClone = rawDragon.clone();
      statueClone.traverse((ch) => {
        if ((ch.name || '').toLowerCase().includes('cloth') || (ch.name || '').toLowerCase().includes('backdrop')) {
          ch.visible = false;
        } else if (ch.isMesh) {
          ch.castShadow = true;
          ch.receiveShadow = true;
          ch.material = ancientGoldMat;
        }
      });
      const dragonStatue = normalizeAndGroundModel(statueClone, 4.4, 0.2);
      dragonStatue.position.set(dx, 0, 5.5);
      dragonStatue.rotation.y = dx < 0 ? 0.35 : -0.35;
      worldGroup.add(dragonStatue);
    });
  }
}

// ============================================================================
// HIGH-DETAIL SPACECRAFT, JET & MU ONLINE 3D WINGS / GLOWING AURAS
// ============================================================================
function createAtmosphericJetMesh() {
  const g = new THREE.Group();

  if (modelCache.has('JetFighter')) {
    const rawJet = modelCache.get('JetFighter').scene.clone();
    rawJet.traverse((ch) => {
      if (ch.isMesh) {
        ch.castShadow = true;
        ch.receiveShadow = true;
        ch.material = obsidianMat;
      }
    });
    const normJet = normalizeAndGroundModel(rawJet, 8.2, 0.35);
    g.add(normJet);
  } else {
    // Sleek Swept-Delta Fighter Fuselage
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.68, 3.8, 24), polishedMarbleMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.15, 2.1);
    nose.castShadow = true;
    g.add(nose);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 4.2), obsidianMat);
    body.position.set(0, 1.1, -0.8);
    body.castShadow = true;
    g.add(body);

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 2.1), polishedMarbleMat);
    mainWing.position.set(0, 1.12, -0.75);
    mainWing.castShadow = true;
    g.add(mainWing);
  }

  // Pilot Cockpit Seat Recess + Transparent Glass Canopy (So seated pilot is clearly visible inside!)
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.15), obsidianMat);
  seatBack.position.set(0, 1.35, -0.2);
  g.add(seatBack);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 16), canopyGlassMat);
  canopy.scale.set(0.88, 0.68, 2.35);
  canopy.position.set(0, 1.56, 0.35);
  g.add(canopy);

  [-3.6, 3.6].forEach((wx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12), ancientGoldMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(wx, 1.12, -0.6);
    g.add(rail);
  });

  // Twin Afterburner Nacelles
  [-0.45, 0.45].forEach((nx) => {
    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.9, 16),
      new THREE.MeshBasicMaterial({ color: 0x6ce5ff })
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(nx, 1.1, -3.15);
    g.add(thruster);
  });

  return g;
}

function createInterplanetaryStarshipMesh() {
  const g = new THREE.Group();

  // Multi-deck Valkyrie-X Corvette Hull
  const forwardProw = new THREE.Mesh(new THREE.ConeGeometry(1.25, 4.8, 8), obsidianMat);
  forwardProw.rotation.x = Math.PI / 2;
  forwardProw.position.set(0, 1.5, 2.6);
  forwardProw.castShadow = true;
  g.add(forwardProw);

  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 5.4), obsidianMat);
  mainDeck.position.set(0, 1.45, -1.2);
  mainDeck.castShadow = true;
  g.add(mainDeck);

  // Panoramic Transparent Command Bridge (Seated Commander & Holographic Console visible inside!)
  const holoConsole = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.35, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x6ce5ff, transparent: true, opacity: 0.7 })
  );
  holoConsole.position.set(0, 1.95, 1.05);
  g.add(holoConsole);

  const bridgeCanopy = new THREE.Mesh(new THREE.SphereGeometry(0.92, 24, 16), canopyGlassMat);
  bridgeCanopy.scale.set(0.95, 0.65, 2.1);
  bridgeCanopy.position.set(0, 2.15, 0.55);
  g.add(bridgeCanopy);

  // Heavy Side Engine Nacelles & Gold Trim
  [-2.35, 2.35].forEach((sx) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 5.2, 16), polishedMarbleMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx, 1.4, -1.4);
    pod.castShadow = true;
    g.add(pod);

    const podGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 0.4, 16),
      new THREE.MeshBasicMaterial({ color: 0x6ce5ff })
    );
    podGlow.rotation.x = Math.PI / 2;
    podGlow.position.set(sx, 1.4, -4.05);
    g.add(podGlow);
  });

  const crossWing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.8), ancientGoldMat);
  crossWing.position.set(0, 1.4, -1.4);
  g.add(crossWing);

  // Alcubierre Gravitational Warp Ring
  const warpRing = new THREE.Mesh(new THREE.TorusGeometry(2.95, 0.2, 16, 48), ancientGoldMat);
  warpRing.position.set(0, 1.55, -1.8);
  g.add(warpRing);

  // Central Primary Ion Drive Core (Uses real PrimaryIonDrive.glb if loaded!)
  if (modelCache.has('PrimaryIonDrive')) {
    const ion = modelCache.get('PrimaryIonDrive').scene.clone();
    ion.scale.set(0.55, 0.55, 0.55);
    ion.position.set(0, 1.5, -3.9);
    g.add(ion);
  } else {
    const coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe2a6 })
    );
    coreGlow.position.set(0, 1.5, -4.1);
    g.add(coreGlow);
  }

  return g;
}

// MU Online-style 3D Evolved Wings attached to Character Back (Tiers 1, 2, 3)
function createMUWingsMesh(wingsTier = 1) {
  const wingGroup = new THREE.Group();
  const colors = {
    1: { main: 0xffd278, emissive: 0xaa6600, span: 1.0 }, // Nv.1 Alas Solares
    2: { main: 0x6ce5ff, emissive: 0x0066aa, span: 1.28 }, // Nv.2 Alas de Arcángel
    3: { main: 0xfff0c2, emissive: 0xffaa00, span: 1.55 }  // Nv.3 Alas de Serafín Imperial
  }[wingsTier] || { main: 0xffd278, emissive: 0xaa6600, span: 1.0 };

  const featherMat = new THREE.MeshStandardMaterial({
    color: colors.main,
    emissive: colors.emissive,
    emissiveIntensity: 0.65,
    metalness: 0.88,
    roughness: 0.15,
    side: THREE.DoubleSide
  });

  const featherCount = wingsTier === 3 ? 7 : (wingsTier === 2 ? 5 : 4);
  [-1, 1].forEach((side) => {
    const sidePivot = new THREE.Group();
    for (let i = 0; i < featherCount; i++) {
      const len = (0.95 - i * 0.09) * colors.span;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.11, len, 6), featherMat);
      blade.position.set(side * (0.28 + i * 0.14), 0.25 - i * 0.08, -0.05);
      blade.rotation.z = side * (-0.55 - i * 0.18);
      blade.rotation.x = -0.2;
      sidePivot.add(blade);
    }
    wingGroup.add(sidePivot);
  });

  wingGroup.position.set(0, 1.38, -0.22);
  return wingGroup;
}

// ============================================================================
// BIOMECHANICAL SEATED POSTURE SOLVER FOR HORSE, FERRARI, BIRD, JET & STARSHIP
// ============================================================================
// Instead of hiding the character or leaving them standing upright through the roof,
// we articulate the character's femurs (UpLeg), knees (Leg), and arms (Arm) into a
// natural seated riding/driving/piloting pose!
function applySeatedMountPose(clonedModel, mountType) {
  if (!mountType || mountType === 'none') return;

  clonedModel.traverse((bone) => {
    if (!bone.isBone) return;
    const n = bone.name;

    if (mountType === 'horse' || mountType === 'mythic_bird') {
      // Astride Saddle Riding Stance: thighs pitched forward & spread outward, knees bent back, hands holding reins
      if (n.includes('LeftUpLeg')) {
        bone.rotation.x -= 1.05;
        bone.rotation.z -= 0.42;
      } else if (n.includes('RightUpLeg')) {
        bone.rotation.x -= 1.05;
        bone.rotation.z += 0.42;
      } else if (n.includes('LeftLeg') || n.includes('RightLeg')) {
        bone.rotation.x += 1.15;
      } else if (n.includes('LeftArm')) {
        bone.rotation.x -= 0.65;
        bone.rotation.z += 0.25;
      } else if (n.includes('RightArm')) {
        bone.rotation.x -= 0.65;
        bone.rotation.z -= 0.25;
      }
    } else if (['supercar', 'jet', 'starship'].includes(mountType)) {
      // Bucket Cockpit Driver/Pilot Stance: thighs forward, knees bent, hands on steering wheel / flight stick
      if (n.includes('LeftUpLeg') || n.includes('RightUpLeg')) {
        bone.rotation.x -= 1.35;
      } else if (n.includes('LeftLeg') || n.includes('RightLeg')) {
        bone.rotation.x += 1.25;
      } else if (n.includes('LeftArm') || n.includes('RightArm')) {
        bone.rotation.x -= 0.85;
      }
    } else if (mountType === 'ship') {
      // Naval Captain at the Quarterdeck Helm Wheel: wide sea-legs stance, hands gripping the ship's wheel
      if (n.includes('LeftUpLeg')) {
        bone.rotation.z -= 0.14;
      } else if (n.includes('RightUpLeg')) {
        bone.rotation.z += 0.14;
      } else if (n.includes('LeftArm')) {
        bone.rotation.x -= 0.78;
        bone.rotation.z += 0.22;
      } else if (n.includes('RightArm')) {
        bone.rotation.x -= 0.78;
        bone.rotation.z -= 0.22;
      }
    }
  });
}

// ============================================================================
// 6 ZERO-DISTORTION REALISTIC LINEAGES & VEHICLE ENCAPSULATION
// ============================================================================
const LINEAGE_SPECS = {
  Vanguard: {
    baseRig: 'Soldier',
    scale: 1.68,
    rotOffset: Math.PI,
    tint: null,
    attachment: 'visor_amber'
  },
  Elena: {
    baseRig: 'Xbot',
    scale: 1.68,
    rotOffset: 0,
    tint: new THREE.Color(0xf5e6c8),
    metalness: 0.78,
    roughness: 0.18,
    attachment: 'valkyrie_crest'
  },
  ShadowOps: {
    baseRig: 'Soldier',
    scale: 1.68,
    rotOffset: Math.PI,
    tint: new THREE.Color(0x1b2230),
    metalness: 0.65,
    roughness: 0.28,
    attachment: 'crimson_core'
  },
  Kael: {
    baseRig: 'Xbot',
    scale: 1.70,
    rotOffset: 0,
    tint: new THREE.Color(0x283848),
    metalness: 0.85,
    roughness: 0.15,
    attachment: 'astral_halo'
  },
  DesertRanger: {
    baseRig: 'Soldier',
    scale: 1.70,
    rotOffset: Math.PI,
    tint: new THREE.Color(0xdba858),
    metalness: 0.72,
    roughness: 0.22,
    attachment: 'solar_pauldrons'
  },
  Aegis: {
    baseRig: 'Xbot',
    scale: 1.72,
    rotOffset: 0,
    tint: new THREE.Color(0x4a88c8),
    metalness: 0.90,
    roughness: 0.12,
    attachment: 'aegis_shield_pack'
  }
};

function createAvatarInstance(
  avatarKey = 'Vanguard',
  labelName = 'Explorer',
  mountType = 'none',
  level = 1,
  gearLevel = 0,
  wingsTier = 0
) {
  const root = new THREE.Group();
  const vehicleBankGroup = new THREE.Group();
  root.add(vehicleBankGroup);

  let mixer = null;
  const actions = {};

  const spec = LINEAGE_SPECS[avatarKey] || LINEAGE_SPECS.Vanguard;
  let chosenGltf = modelCache.get(spec.baseRig) || modelCache.get('Soldier');
  let scale = spec.scale;
  let rotOffset = spec.rotOffset;

  if (avatarKey === 'CustomUpload' && modelCache.has('CustomUpload')) {
    chosenGltf = modelCache.get('CustomUpload');
    scale = 1.55;
    rotOffset = 0;
  }

  const charHolder = new THREE.Group();
  vehicleBankGroup.add(charHolder);

  // MU Online-style Gear Glow Color (+4 Emerald, +7 Sapphire, +10 Violet, +13/+15 Radiant Solar Gold)
  let gearEmissiveHex = 0x000000;
  let gearEmissiveIntensity = 0;
  if (gearLevel >= 12) {
    gearEmissiveHex = 0xffaa00;
    gearEmissiveIntensity = 0.55;
  } else if (gearLevel >= 9) {
    gearEmissiveHex = 0x9944ff;
    gearEmissiveIntensity = 0.38;
  } else if (gearLevel >= 6) {
    gearEmissiveHex = 0x0088ff;
    gearEmissiveIntensity = 0.28;
  } else if (gearLevel >= 3) {
    gearEmissiveHex = 0x22cc88;
    gearEmissiveIntensity = 0.18;
  }

  let clonedScene = null;
  if (chosenGltf) {
    clonedScene = SkeletonUtils.clone(chosenGltf.scene);
    clonedScene.scale.set(scale, scale, scale);
    clonedScene.rotation.y = rotOffset;

    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        if (spec.tint && avatarKey !== 'CustomUpload') {
          child.material.color.copy(spec.tint);
          if (spec.metalness !== undefined) child.material.metalness = spec.metalness;
          if (spec.roughness !== undefined) child.material.roughness = spec.roughness;
        }
        if (gearEmissiveIntensity > 0 && child.material.emissive) {
          child.material.emissive.setHex(gearEmissiveHex);
          child.material.emissiveIntensity = gearEmissiveIntensity;
        }
      }
    });
    charHolder.add(clonedScene);

    // Lineage Bespoke Armor Attachments
    if (spec.attachment === 'valkyrie_crest' || spec.attachment === 'astral_halo') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 12, 36), ancientGoldMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 3.05, 0);
      charHolder.add(halo);
    } else if (spec.attachment === 'solar_pauldrons') {
      [-0.45, 0.45].forEach((px) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), ancientGoldMat);
        p.scale.set(1.2, 0.65, 1.1);
        p.position.set(px, 2.35, 0);
        charHolder.add(p);
      });
    } else if (spec.attachment === 'aegis_shield_pack') {
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 1),
        new THREE.MeshBasicMaterial({ color: 0x6ce5ff })
      );
      core.position.set(0, 2.15, -0.28);
      charHolder.add(core);
    }

    // MU Online 3D Evolved Wings on Character Back
    if (wingsTier > 0) {
      const wingsMesh = createMUWingsMesh(wingsTier);
      charHolder.add(wingsMesh);
    }

    // MU Online +7 to +15 Ground Halo Ring under feet
    if (gearLevel >= 7) {
      const auraRing = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.98, 32),
        new THREE.MeshBasicMaterial({
          color: gearLevel >= 12 ? 0xffd278 : (gearLevel >= 9 ? 0xc278ff : 0x6ce5ff),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        })
      );
      auraRing.rotation.x = -Math.PI / 2;
      auraRing.position.y = 0.05;
      charHolder.add(auraRing);
    }

    mixer = new THREE.AnimationMixer(clonedScene);
    for (const nativeClip of chosenGltf.animations || []) {
      actions[nativeClip.name.toLowerCase()] = mixer.clipAction(nativeClip);
    }
  }

  // ==========================================================================
  // VISIBLE SEATED PILOT / RIDER INTEGRATION IN EVERY VEHICLE & MOUNT
  // ==========================================================================
  let mountMixer = null;
  if (mountType === 'horse' && modelCache.has('Horse')) {
    const horseGltf = modelCache.get('Horse');
    const horseMesh = SkeletonUtils.clone(horseGltf.scene);
    horseMesh.scale.set(0.015, 0.015, 0.015);
    vehicleBankGroup.add(horseMesh);

    // Royal Saddle Pad under the rider
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.78), obsidianMat);
    saddle.position.set(0, 1.52, -0.05);
    vehicleBankGroup.add(saddle);

    // Rider seated naturally astride the horse's back!
    charHolder.scale.set(0.86, 0.86, 0.86);
    charHolder.position.set(0, 0.72, -0.06);
    if (horseGltf.animations?.[0]) {
      mountMixer = new THREE.AnimationMixer(horseMesh);
      mountMixer.clipAction(horseGltf.animations[0]).play();
    }
  } else if (mountType === 'supercar' && modelCache.has('Ferrari')) {
    const carGltf = modelCache.get('Ferrari');
    const carMesh = carGltf.scene.clone();
    carMesh.scale.set(1.32, 1.32, 1.32);
    carMesh.rotation.y = Math.PI;
    vehicleBankGroup.add(carMesh);

    // Driver seated inside the left-hand Ferrari cockpit bucket seat holding the wheel!
    charHolder.scale.set(0.54, 0.54, 0.54);
    charHolder.position.set(-0.36, 0.12, -0.15);
  } else if (mountType === 'mythic_bird') {
    const birdGltf = modelCache.get('Stork') || modelCache.get('Flamingo');
    if (birdGltf) {
      const birdMesh = SkeletonUtils.clone(birdGltf.scene);
      birdMesh.scale.set(0.048, 0.048, 0.048);
      birdMesh.position.y = 0.95;
      vehicleBankGroup.add(birdMesh);

      charHolder.scale.set(0.75, 0.75, 0.75);
      charHolder.position.set(0, 0.98, -0.12);
      if (birdGltf.animations?.[0]) {
        mountMixer = new THREE.AnimationMixer(birdMesh);
        mountMixer.clipAction(birdGltf.animations[0]).play();
      }
    }
  } else if (mountType === 'jet') {
    const jetMesh = createAtmosphericJetMesh();
    vehicleBankGroup.add(jetMesh);

    // Pilot seated inside the transparent fighter canopy!
    charHolder.scale.set(0.56, 0.56, 0.56);
    charHolder.position.set(0, 0.72, 0.25);
  } else if (mountType === 'starship') {
    const shipMesh = createInterplanetaryStarshipMesh();
    vehicleBankGroup.add(shipMesh);

    // Commander seated inside the panoramic transparent command bridge!
    charHolder.scale.set(0.60, 0.60, 0.60);
    charHolder.position.set(0, 1.22, 0.48);
  } else if (mountType === 'ship') {
    const galleonMesh = createImperialGalleonMesh(12.2);
    vehicleBankGroup.add(galleonMesh);

    // Naval Captain standing proudly on the quarterdeck gripping the golden helm wheel!
    charHolder.scale.set(0.66, 0.66, 0.66);
    charHolder.position.set(0, 1.25, -1.82);
  }

  if (labelName) {
    const plusTag = gearLevel > 0 ? ` [+${gearLevel}]` : '';
    const nameSprite = createPlayerNameplate(`NV.${level} ${labelName}${plusTag}`);
    const labelY =
      mountType === 'ship'
        ? 5.8
        : mountType === 'horse'
          ? 3.85
          : mountType === 'supercar'
            ? 2.45
            : mountType === 'starship'
              ? 3.6
              : 3.45;
    nameSprite.position.set(0, labelY, 0);
    root.add(nameSprite);
  }

  return {
    root,
    vehicleBankGroup,
    clonedScene,
    mixer,
    mountMixer,
    actions,
    currentAction: null,
    avatarKey,
    mountType,
    level,
    gearLevel,
    wingsTier
  };
}

let attackTimer = 0;

function updateAvatarAnimationAndPose(avatarObj, dt, desiredState = 'Idle') {
  if (!avatarObj) return;
  if (avatarObj.mountType && avatarObj.mountType !== 'none') {
    desiredState = 'Idle';
  } else if (avatarObj === localAvatar && attackTimer > 0) {
    attackTimer -= dt;
    desiredState = 'Attack';
  }
  playAvatarAnim(avatarObj, desiredState);
  if (avatarObj.mixer) avatarObj.mixer.update(dt);
  // Apply seated biomechanical leg/knee/arm articulation AFTER mixer update!
  if (avatarObj.mountType && avatarObj.mountType !== 'none' && avatarObj.clonedScene) {
    applySeatedMountPose(avatarObj.clonedScene, avatarObj.mountType);
  } else if (avatarObj === localAvatar && attackTimer > 0 && avatarObj.clonedScene) {
    // Dynamic martial energy slash / punch arm articulation
    const swingPhase = Math.sin(Math.max(0, attackTimer / 0.42) * Math.PI);
    avatarObj.clonedScene.traverse((b) => {
      if (!b.isBone) return;
      if (b.name.includes('RightArm')) {
        b.rotation.x -= swingPhase * 1.5;
        b.rotation.y += swingPhase * 0.7;
      } else if (b.name.includes('RightForeArm')) {
        b.rotation.x -= swingPhase * 1.1;
      } else if (b.name.includes('Spine')) {
        b.rotation.y += swingPhase * 0.3;
      }
    });
  }
}

function playAvatarAnim(avatarObj, desiredState = 'Idle') {
  if (!avatarObj || !avatarObj.mixer) return;
  const acts = avatarObj.actions;
  let clipKey = null;

  const candidates = {
    Idle: ['idle', 'standing'],
    Walk: ['walk', 'walking', 'run'],
    Run: ['run', 'running', 'walk'],
    Jump: ['jump', 'run', 'idle'],
    Dance: ['agree', 'sambadance', 'dance', 'wave', 'idle'],
    Attack: ['punch', 'strike', 'attack', 'agree', 'run', 'idle']
  }[desiredState] || ['idle'];

  for (const c of candidates) {
    if (acts[c]) {
      clipKey = c;
      break;
    }
  }
  if (!clipKey) clipKey = Object.keys(acts)[0];
  if (!clipKey || avatarObj.currentAction === clipKey) return;

  const nextAct = acts[clipKey];
  if (avatarObj.currentAction && acts[avatarObj.currentAction]) {
    acts[avatarObj.currentAction].fadeOut(0.18);
  }
  nextAct.reset().fadeIn(0.18).play();
  avatarObj.currentAction = clipKey;
}

function createPlayerNameplate(nameText, borderColor = 'rgba(229, 189, 115, 0.65)', textColor = '#fff8eb') {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 76;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(7, 10, 18, 0.80)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 420, 56, 14);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '700 21px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(nameText.slice(0, 26), 220, 46);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(2.55, 0.45, 1);
  return sprite;
}

// ============================================================================
// OPEN-WORLD MONSTER & RAID BOSS 3D ENTITIES + FLOATING DAMAGE NUMBERS
// ============================================================================
const monsterEntities = new Map();
const floatingCombatTexts = [];

function createMonsterMesh(mobData) {
  const root = new THREE.Group();
  const isBoss = mobData.rk === 'boss';
  const isElite = mobData.rk === 'elite';

  let gltf = modelCache.get('Robot') || modelCache.get('Xbot');
  if (mobData.md === 'XbotMob' && modelCache.has('Xbot')) {
    gltf = modelCache.get('Xbot');
  }

  let mixer = null;
  if (mobData.md === 'DragonBoss' && modelCache.has('Dragon')) {
    const rawDragon = modelCache.get('Dragon').scene.clone();
    rawDragon.traverse((ch) => {
      const nm = (ch.name || '').toLowerCase();
      if (nm.includes('cloth') || nm.includes('backdrop')) {
        ch.visible = false;
      } else if (ch.isMesh) {
        ch.castShadow = true;
        ch.receiveShadow = true;
        ch.material = new THREE.MeshStandardMaterial({
          color: 0xd9381e,
          emissive: 0x551100,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.72
        });
      }
    });
    const dragonObj = normalizeAndGroundModel(rawDragon, 6.8, 0.15);
    root.add(dragonObj);
  } else if (gltf) {
    const cloned = SkeletonUtils.clone(gltf.scene);
    const baseScale = gltf === modelCache.get('Robot') ? 0.52 : 1.72;
    const rankMult = isBoss ? 1.85 : (isElite ? 1.25 : 1.0);
    cloned.scale.setScalar(baseScale * rankMult);

    const tintHex = isBoss ? 0xff3b3b : (isElite ? 0xaa44ff : 0x384858);
    cloned.traverse((ch) => {
      if (ch.isMesh && ch.material) {
        ch.castShadow = true;
        ch.material = ch.material.clone();
        ch.material.color.setHex(tintHex);
        if (ch.material.emissive) {
          ch.material.emissive.setHex(isBoss ? 0x881100 : 0x220044);
          ch.material.emissiveIntensity = isBoss ? 0.6 : 0.25;
        }
      }
    });
    root.add(cloned);

    mixer = new THREE.AnimationMixer(cloned);
    const clip = gltf.animations?.find((a) => /walk|run|idle/i.test(a.name)) || gltf.animations?.[0];
    if (clip) mixer.clipAction(clip).play();
  }

  // Boss Crimson Aura Ring
  if (isBoss || isElite) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(isBoss ? 2.2 : 1.1, isBoss ? 2.6 : 1.35, 32),
      new THREE.MeshBasicMaterial({
        color: isBoss ? 0xff3b3b : 0xb86cff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    root.add(ring);
  }

  const labelY = isBoss ? 5.6 : (isElite ? 3.9 : 3.2);
  const nameSprite = createPlayerNameplate(
    `[NV.${mobData.lv}] ${mobData.n}`,
    isBoss ? 'rgba(255, 90, 90, 0.9)' : 'rgba(184, 108, 255, 0.75)',
    isBoss ? '#ffaaaa' : '#ebd6ff'
  );
  nameSprite.position.set(0, labelY, 0);
  root.add(nameSprite);

  // Dynamic 3D HP Bar Sprite above Monster
  const hpCanvas = document.createElement('canvas');
  hpCanvas.width = 256;
  hpCanvas.height = 36;
  const hpTex = new THREE.CanvasTexture(hpCanvas);
  const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, transparent: true }));
  hpSprite.scale.set(isBoss ? 2.8 : 1.9, 0.28, 1);
  hpSprite.position.set(0, labelY - 0.42, 0);
  root.add(hpSprite);

  const entity = {
    id: mobData.id,
    root,
    mixer,
    hpCanvas,
    hpTex,
    targetPos: new THREE.Vector3(mobData.x, mobData.y, mobData.z),
    targetRy: mobData.ry || 0,
    hp: mobData.hp,
    maxHp: mobData.mhp
  };
  drawMonsterHpBar(entity);
  return entity;
}

function drawMonsterHpBar(entity) {
  const ctx = entity.hpCanvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 36);
  ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
  ctx.fillRect(8, 8, 240, 20);
  const pct = Math.max(0, Math.min(1, entity.hp / Math.max(1, entity.maxHp)));
  ctx.fillStyle = pct > 0.35 ? '#ff4d4d' : '#ff9900';
  ctx.fillRect(10, 10, Math.round(236 * pct), 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(8, 8, 240, 20);
  entity.hpTex.needsUpdate = true;
}

function reconcileMonsters(mobsArray) {
  const seen = new Set();
  for (const m of mobsArray) {
    seen.add(m.id);
    let ent = monsterEntities.get(m.id);
    if (!ent) {
      ent = createMonsterMesh(m);
      ent.root.position.set(m.x, m.y, m.z);
      scene.add(ent.root);
      monsterEntities.set(m.id, ent);
    } else {
      ent.targetPos.set(m.x, m.y, m.z);
      ent.targetRy = m.ry || 0;
      if (ent.hp !== m.hp || ent.maxHp !== m.mhp) {
        ent.hp = m.hp;
        ent.maxHp = m.mhp;
        drawMonsterHpBar(ent);
      }
    }
  }
  for (const [id, ent] of monsterEntities.entries()) {
    if (!seen.has(id)) {
      scene.remove(ent.root);
      monsterEntities.delete(id);
    }
  }
}

function spawnFloatingCombatText(worldPos, text, isCrit = false, color = '#ffe2a6') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  ctx.font = isCrit ? '800 38px "JetBrains Mono", monospace' : '700 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 5;
  ctx.strokeText(text, 160, 55);
  ctx.fillStyle = isCrit ? '#ff5555' : color;
  ctx.fillText(text, 160, 55);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1.0 });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 2.6, (Math.random() - 0.5) * 1.2));
  sprite.scale.set(isCrit ? 2.6 : 1.9, isCrit ? 0.75 : 0.55, 1);
  scene.add(sprite);
  floatingCombatTexts.push({ sprite, mat, age: 0 });
}

// ============================================================================
// LOCAL PLAYER, MOUNTS & PLANETARY GRAVITY FLOOR CALCULATION
// ============================================================================
let localAvatar = null;
const playerPos = new THREE.Vector3(0, 0, 18);
const playerVel = new THREE.Vector3();
window.playerPos = playerPos;
window.playerVel = playerVel;
window.__teleportTo = (x, y, z) => { playerPos.set(x, y, z); playerVel.set(0, 0, 0); };
let playerYaw = 0;
let prevPlayerYaw = 0;
let cameraYaw = 0;
let cameraPitch = 0.24;
let isGrounded = true;
let emoteTimer = 0;

function rebuildLocalAvatar() {
  if (localAvatar) scene.remove(localAvatar.root);
  localAvatar = createAvatarInstance(
    state.avatarType,
    state.joined ? state.playerName : '',
    state.mountType,
    state.level,
    state.gearLevel,
    state.wingsTier
  );
  localAvatar.root.position.copy(playerPos);
  localAvatar.root.rotation.y = playerYaw;
  scene.add(localAvatar.root);
  updateAvatarAnimationAndPose(localAvatar, 0.016, 'Idle');
}

function requestMountEquipOrBuy(mType) {
  sfx.portal();
  const prices = { horse: 0, ship: 0, supercar: 400, mythic_bird: 650, jet: 1200, starship: 2500 };
  if (!state.unlockedMounts.includes(mType)) {
    const cost = prices[mType] || 0;
    if (state.coins < cost) {
      showToast('CRÉDITOS INSUFICIENTES', `Requiere ${cost} ✦. Caza monstruos, extrae nodos o corre el Circuito GT.`);
      return;
    }
    state.coins -= cost;
    state.unlockedMounts.push(mType);
    state.mountType = mType;
    showToast('FLOTA ACTUALIZADA', `Has desbloqueado y equipado tu nuevo transporte con piloto en cabina.`);
  } else {
    state.mountType = state.mountType === mType ? 'none' : mType;
  }

  if (state.mountType === 'ship') {
    // If equipping the Galleon inside the main island, launch directly from the South Imperial Harbor Pier!
    if (Math.hypot(playerPos.x, playerPos.z) < 76 && playerPos.y < 25) {
      playerPos.set(0, -0.25, 106);
      playerYaw = 0; // Face South towards Dragon Island & Open Ocean
    }
    showToast('GALEÓN NAVAL IMPERIAL', 'Has zarpado al Océano. Navega hacia la Isla del Dragón (Sur) o el Arrecife Dorado (Este).');
  }

  if (['mythic_bird', 'jet', 'starship'].includes(state.mountType)) {
    playerPos.y = Math.max(playerPos.y, getLocalGroundHeight(playerPos.x, playerPos.z) + 5);
  }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'buy_or_equip_mount', mount: mType }));
  }
  saveLocalState();
  rebuildLocalAvatar();
  updateHUD();
}

function isOnEarthLandmass(x, z) {
  if (Math.hypot(x, z) < 88) return true; // Main Citadel & Golden Beach
  if (Math.abs(x) < 6 && z >= 65 && z <= 104) return true; // South Harbor Pier
  if (Math.hypot(x, z - (-88)) < 26) return true; // North Spaceport Peninsula
  if (Math.hypot(x, z - 185) < 34) return true; // Archipelago Island 1: Dragon Island
  if (Math.hypot(x - 165, z - 110) < 27) return true; // Archipelago Island 2: Golden Reef
  return false;
}

function getLocalGroundHeight(x, z) {
  if (Math.hypot(x - 0, z - (-680)) < 60) return 260;
  if (Math.hypot(x - (-620), z - (-1100)) < 70) return 340;
  if (Math.hypot(x - 680, z - (-1350)) < 74) return 440;
  if (!isOnEarthLandmass(x, z)) return -0.25; // Ocean surface level
  return 0;
}

function getCurrentPlanetLabel(x, y, z) {
  if (Math.hypot(x - 0, z - (-680)) < 105 && y > 180) return 'LUNA SELENE';
  if (Math.hypot(x - (-620), z - (-1100)) < 125 && y > 220) return 'MARTE ARES PRIME';
  if (Math.hypot(x - 680, z - (-1350)) < 135 && y > 300) return 'ANILLO AURELIA';
  if (y > 135) return 'ESPACIO PROFUNDO';
  if (Math.hypot(x, z - 185) < 42) return 'ISLA DEL DRAGÓN';
  if (Math.hypot(x - 165, z - 110) < 35) return 'ARRECIFE DORADO';
  if (!isOnEarthLandmass(x, z)) return 'OCÉANO IMPERIAL';
  return 'SANTUARIO SOLAR';
}

// ============================================================================
// REAL-TIME 2D RADAR MINIMAP RENDERER (PLAYERS, BOSSES, SPOTS & RELICS)
// ============================================================================
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

function renderRadarMinimap() {
  if (!radarCtx) return;
  const ctx = radarCtx;
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = 0.52;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(5, 9, 17, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(229, 189, 115, 0.16)';
  ctx.lineWidth = 1;
  [18, 36, 52].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  function toRadar(wx, wz) {
    const dx = (wx - playerPos.x) * scale;
    const dz = (wz - playerPos.z) * scale;
    return [cx + dx, cy + dz];
  }

  if (playerPos.y < 140) {
    const [acx, acz] = toRadar(0, 0);
    ctx.strokeStyle = 'rgba(108, 229, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(acx, acz, 44 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Resource Orbs (Cyan)
  ctx.fillStyle = 'rgba(108, 229, 255, 0.7)';
  for (const [, item] of orbMeshes) {
    const [rx, rz] = toRadar(item.data.x, item.data.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 6) {
      ctx.fillRect(rx - 1.5, rz - 1.5, 3, 3);
    }
  }

  // Open-World Monsters & Raid Bosses (Red / Purple Dots)
  for (const [, mob] of monsterEntities) {
    const [rx, rz] = toRadar(mob.targetPos.x, mob.targetPos.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 5) {
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(rx, rz, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Major Landmarks, Harbor & Archipelago Sanctuaries
  const landmarks = [
    { x: 0, z: 0, color: '#ffe2a6' },
    { x: -75, z: 0, color: '#ffb85c' },
    { x: 0, z: -45, color: '#4fe0a3' },
    { x: 75, z: 0, color: '#ff6b6b' },
    { x: 0, z: -88, color: '#6ce5ff' },
    { x: 0, z: 86, color: '#38d9a9' },
    { x: 0, z: 185, color: '#ff4d4d' },
    { x: 165, z: 110, color: '#ffd43b' }
  ];
  for (const lm of landmarks) {
    const [rx, rz] = toRadar(lm.x, lm.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 5) {
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(rx, rz, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nearby Multiplayer Explorers (Emerald)
  ctx.fillStyle = '#4fe0a3';
  for (const [, rem] of remotePlayers) {
    const [rx, rz] = toRadar(rem.targetPos.x, rem.targetPos.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 5) {
      ctx.beginPath();
      ctx.arc(rx, rz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(playerYaw + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -5.5);
  ctx.lineTo(4, 4.5);
  ctx.lineTo(0, 2.5);
  ctx.lineTo(-4, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ============================================================================
// GOLDEN RING SPEED TRIAL MINI-GAME
// ============================================================================
function startRingRace() {
  sfx.levelUp();
  state.raceActive = true;
  state.raceRingIndex = 0;
  state.raceStartTime = performance.now();

  raceRingMeshes.forEach((m, idx) => {
    m.visible = true;
    m.scale.setScalar(idx === 0 ? 1.35 : 0.85);
  });

  const pos0 = raceRingPositions[0];
  playerPos.set(pos0.x - 4, 0, pos0.z + 6);
  document.getElementById('race-hud').classList.remove('hidden');
  showToast('GRAN CIRCUITO IMPERIAL GT', 'Recorre los 8 pórticos sobre la pista de asfalto (+300 ✦ / +350 XP).');
}

function updateRingRace() {
  if (!state.raceActive) return;
  const elapsedSec = ((performance.now() - state.raceStartTime) / 1000).toFixed(1);
  document.getElementById('race-progress').textContent = `${state.raceRingIndex} / ${raceRingPositions.length}`;
  document.getElementById('race-timer').textContent = `${elapsedSec}s`;

  const targetPos = raceRingPositions[state.raceRingIndex];
  if (!targetPos) return;

  const dx = playerPos.x - targetPos.x;
  const dz = playerPos.z - targetPos.z;
  if (dx * dx + dz * dz < 42) {
    sfx.shard();
    raceRingMeshes[state.raceRingIndex].visible = false;
    state.raceRingIndex++;

    if (state.raceRingIndex >= raceRingPositions.length) {
      state.raceActive = false;
      document.getElementById('race-hud').classList.add('hidden');
      rewardAttraction(`Circuito Imperial GT (${elapsedSec}s)`, 300, 350);
    } else {
      raceRingMeshes[state.raceRingIndex].scale.setScalar(1.35);
    }
  }
}

function rewardAttraction(attractionName, amount = 250, xp = 300) {
  sfx.levelUp();
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'reward_attraction', attractionName, amount, xp }));
  } else {
    state.coins += amount;
    state.xp += xp;
    checkOfflineLevelUp();
    saveLocalState();
    updateHUD();
  }
  showToast(attractionName.toUpperCase(), `Recompensa: +${amount} Créditos ✦ y +${xp} XP.`);
}

// ============================================================================
// REMOTE MULTIPLAYER ENTITIES & PLANETARY RESOURCE NODES
// ============================================================================
const remotePlayers = new Map();
const orbMeshes = new Map();
const orbGeo = new THREE.OctahedronGeometry(0.52, 1);

function syncWorldOrbs(orbsArray) {
  for (const o of orbsArray) spawnClientOrb(o);
}

function spawnClientOrb(o) {
  if (orbMeshes.has(o.id)) return;
  const mesh = new THREE.Mesh(orbGeo, ancientGoldMat);
  mesh.position.set(o.x, o.y, o.z);
  worldGroup.add(mesh);
  orbMeshes.set(o.id, { mesh, data: o });
}

function removeClientOrb(orbId) {
  const item = orbMeshes.get(orbId);
  if (!item) return;
  if (item.mesh.parent) item.mesh.parent.remove(item.mesh);
  orbMeshes.delete(orbId);
}

// ============================================================================
// UNIFIED PC + MOBILE TOUCH INPUT
// ============================================================================
const keysPressed = {};
const joyInput = { x: 0, y: 0, active: false };
let ascendHeld = false;
let descendHeld = false;

window.addEventListener('keydown', (e) => {
  if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  keysPressed[e.code] = true;

  if (!state.joined) return;
  if (e.code === 'Space') {
    ascendHeld = true;
    if (!['mythic_bird', 'jet', 'starship'].includes(state.mountType) && isGrounded) {
      playerVel.y = 12.0;
      isGrounded = false;
      sfx.playTone(380, 0.12, 'sine', 0.07);
    }
  }
  if (e.code === 'KeyC' || e.code === 'ControlLeft') descendHeld = true;
  if (e.code === 'KeyQ') triggerAetherStrike();
  if (e.code === 'KeyE') triggerContextInteract();
  if (e.code === 'KeyR') useVitalPotion();
  if (e.code === 'KeyX') toggleSoulshots();
  if (e.code === 'KeyM') {
    updateHUD();
    document.getElementById('starmap-modal').classList.toggle('hidden');
  }
  if (e.code === 'KeyK') {
    updateHUD();
    document.getElementById('skills-modal').classList.toggle('hidden');
  }
  if (e.code === 'KeyF') {
    updateHUD();
    document.getElementById('forge-modal').classList.toggle('hidden');
  }
  if (e.code === 'KeyO') openArchonModal();
  if (e.code === 'Digit1') requestMountEquipOrBuy('horse');
  if (e.code === 'Digit2') requestMountEquipOrBuy('supercar');
  if (e.code === 'Digit3') requestMountEquipOrBuy('mythic_bird');
  if (e.code === 'Digit4') requestMountEquipOrBuy('jet');
  if (e.code === 'Digit5') requestMountEquipOrBuy('starship');
  if (e.code === 'Digit6') requestMountEquipOrBuy('ship');
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.code] = false;
  if (e.code === 'Space') ascendHeld = false;
  if (e.code === 'KeyC' || e.code === 'ControlLeft') descendHeld = false;
});

let cameraPointerId = null;
let prevCamPt = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => {
  cameraPointerId = e.pointerId;
  prevCamPt = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerId !== cameraPointerId) return;
  const dx = e.clientX - prevCamPt.x;
  const dy = e.clientY - prevCamPt.y;
  prevCamPt = { x: e.clientX, y: e.clientY };
  cameraYaw -= dx * 0.0065;
  cameraPitch = Math.max(-0.35, Math.min(1.15, cameraPitch + dy * 0.005));
  if (proCamera) {
    proCamera.yaw = cameraYaw;
    proCamera.pitch = cameraPitch;
  }
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerId === cameraPointerId) cameraPointerId = null;
});

const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
const maxJoyR = 32;

function updateJoystickKnob(clientX, clientY) {
  const rect = joyBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxJoyR) {
    dx = (dx / dist) * maxJoyR;
    dy = (dy / dist) * maxJoyR;
  }
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  joyInput.x = dx / maxJoyR;
  joyInput.y = dy / maxJoyR;
}

joyBase.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  joyInput.active = true;
  joyBase.setPointerCapture(e.pointerId);
  updateJoystickKnob(e.clientX, e.clientY);
});
joyBase.addEventListener('pointermove', (e) => {
  if (!joyInput.active) return;
  e.stopPropagation();
  updateJoystickKnob(e.clientX, e.clientY);
});
const releaseJoy = () => {
  joyInput.active = false;
  joyInput.x = 0;
  joyInput.y = 0;
  joyStick.style.transform = 'translate(0px, 0px)';
};
joyBase.addEventListener('pointerup', releaseJoy);
joyBase.addEventListener('pointercancel', releaseJoy);

const btnJump = document.getElementById('btn-jump');
btnJump.addEventListener('pointerdown', () => {
  if (!state.joined) return;
  ascendHeld = true;
  if (!['mythic_bird', 'jet', 'starship'].includes(state.mountType) && isGrounded) {
    playerVel.y = 12.0;
    isGrounded = false;
    sfx.playTone(380, 0.12, 'sine', 0.07);
  }
});
btnJump.addEventListener('pointerup', () => { ascendHeld = false; });
btnJump.addEventListener('pointerleave', () => { ascendHeld = false; });

const btnDescend = document.getElementById('btn-descend');
btnDescend.addEventListener('pointerdown', () => { descendHeld = true; });
btnDescend.addEventListener('pointerup', () => { descendHeld = false; });
btnDescend.addEventListener('pointerleave', () => { descendHeld = false; });

document.getElementById('btn-strike').addEventListener('click', () => triggerAetherStrike());
document.getElementById('btn-use').addEventListener('click', () => {
  if (activeContextFn) triggerContextInteract();
  else useVitalPotion();
});
document.getElementById('context-action-btn').addEventListener('click', () => triggerContextInteract());

document.getElementById('btn-mount-horse').addEventListener('click', () => requestMountEquipOrBuy('horse'));
document.getElementById('btn-mount-car').addEventListener('click', () => requestMountEquipOrBuy('supercar'));
document.getElementById('btn-mount-bird').addEventListener('click', () => requestMountEquipOrBuy('mythic_bird'));
document.getElementById('btn-mount-jet').addEventListener('click', () => requestMountEquipOrBuy('jet'));
document.getElementById('btn-mount-starship').addEventListener('click', () => requestMountEquipOrBuy('starship'));
const btnMountShip = document.getElementById('btn-mount-ship');
if (btnMountShip) btnMountShip.addEventListener('click', () => requestMountEquipOrBuy('ship'));
document.getElementById('btn-soulshot').addEventListener('click', () => toggleSoulshots());

function toggleSoulshots() {
  state.soulshotsActive = !state.soulshotsActive;
  sfx.playTone(state.soulshotsActive ? 680 : 320, 0.1, 'sine', 0.08);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'toggle_soulshots' }));
  else saveLocalState();
  updateHUD();
}

function useVitalPotion() {
  if ((state.inventory?.potions || 0) <= 0) {
    showToast('SIN CARGAS VITALES', 'Adquiere Cargas de Reparación en la Forja [F].');
    return;
  }
  sfx.shard();
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'use_potion' }));
  } else {
    state.inventory.potions--;
    state.hp = state.maxHp || 260;
    saveLocalState();
    updateHUD();
  }
  spawnFloatingCombatText(playerPos, '+VIDA', false, '#4fe0a3');
}

// ============================================================================
// SOVEREIGN AUTONOMOUS WEB ENGINE (ZERO-CONFIG CLIENT-SIDE MMORPG SIMULATION)
// Enables full open-world exploration, combat, raid bosses, forge & progression
// on static hosts like GitHub Pages with localStorage persistence!
// ============================================================================
let isSovereignOffline = false;
const localMonsters = new Map();

function initLocalMonsters() {
  if (localMonsters.size > 0) return;
  const spotDefs = [
    // Earth Perimeter Hunting Spots (Level 4 - 15)
    { id: 'mob_e1', name: 'Centinela Corrupto', level: 4, rank: 'normal', model: 'Robot', homeX: -38, homeY: 0, homeZ: -38, patrolR: 6, maxHp: 260, atk: 12, xp: 140, coins: 95 },
    { id: 'mob_e2', name: 'Centinela Corrupto', level: 5, rank: 'normal', model: 'Robot', homeX: -44, homeY: 0, homeZ: -32, patrolR: 6, maxHp: 290, atk: 14, xp: 160, coins: 110 },
    { id: 'mob_e3', name: 'Merodeador de Obsidiana', level: 8, rank: 'normal', model: 'Robot', homeX: 40, homeY: 0, homeZ: -38, patrolR: 7, maxHp: 380, atk: 18, xp: 210, coins: 145 },
    { id: 'mob_e4', name: 'Merodeador de Obsidiana', level: 9, rank: 'normal', model: 'Robot', homeX: 46, homeY: 0, homeZ: -30, patrolR: 7, maxHp: 420, atk: 20, xp: 230, coins: 160 },
    { id: 'mob_e5', name: 'Acechador del Horizonte', level: 12, rank: 'elite', model: 'XbotMob', homeX: -58, homeY: 0, homeZ: 22, patrolR: 8, maxHp: 620, atk: 26, xp: 340, coins: 240 },
    { id: 'mob_e6', name: 'Gladiador Sombra', level: 15, rank: 'elite', model: 'XbotMob', homeX: 58, homeY: 0, homeZ: 22, patrolR: 8, maxHp: 750, atk: 30, xp: 410, coins: 290 },
    // Earth MVP Coloso
    { id: 'boss_earth', name: '👑 MVP: COLOSO DE AETHELGARD', level: 25, rank: 'boss', model: 'BossRobot', homeX: 62, homeY: 0, homeZ: -18, patrolR: 5, maxHp: 2400, atk: 45, xp: 1250, coins: 950 },
    // Ocean Archipelago & Dragon Boss
    { id: 'mob_sea1', name: 'Corsario del Abismo', level: 28, rank: 'elite', model: 'XbotMob', homeX: -12, homeY: 0, homeZ: 175, patrolR: 7, maxHp: 920, atk: 35, xp: 540, coins: 380 },
    { id: 'mob_sea2', name: 'Guardián del Arrecife Dorado', level: 30, rank: 'elite', model: 'Robot', homeX: 165, homeY: 0, homeZ: 110, patrolR: 7, maxHp: 980, atk: 38, xp: 590, coins: 420 },
    { id: 'boss_ocean', name: '👑 RAID BOSS: DRAGÓN LEVIATÁN', level: 38, rank: 'boss', model: 'DragonBoss', homeX: 0, homeY: 0, homeZ: 192, patrolR: 6, maxHp: 3400, atk: 56, xp: 1850, coins: 1450 },
    // Moon Selene
    { id: 'mob_m1', name: 'Espectro Lunar de Helio', level: 32, rank: 'elite', model: 'Robot', homeX: -18, homeY: 260, homeZ: -668, patrolR: 7, maxHp: 1100, atk: 42, xp: 680, coins: 460 },
    { id: 'boss_moon', name: '👑 RAID BOSS: ARCONTE DE SELENE', level: 48, rank: 'boss', model: 'BossRobot', homeX: 0, homeY: 260, homeZ: -708, patrolR: 5, maxHp: 4200, atk: 68, xp: 2400, coins: 1800 },
    // Mars Ares Prime
    { id: 'mob_ma1', name: 'Gólem Kyber de Ares', level: 58, rank: 'elite', model: 'XbotMob', homeX: -600, homeY: 340, homeZ: -1085, patrolR: 8, maxHp: 2100, atk: 65, xp: 1200, coins: 820 },
    { id: 'boss_mars', name: '👑 RAID BOSS: IGNIS DE ARES PRIME', level: 75, rank: 'boss', model: 'BossRobot', homeX: -620, homeY: 340, homeZ: -1128, patrolR: 6, maxHp: 6800, atk: 95, xp: 4200, coins: 3200 },
    // Aurelia Orbital Ring
    { id: 'mob_au1', name: 'Serafín del Vacío', level: 84, rank: 'elite', model: 'XbotMob', homeX: 660, homeY: 440, homeZ: -1335, patrolR: 8, maxHp: 3400, atk: 90, xp: 2100, coins: 1400 },
    { id: 'boss_aurelia', name: '👑 EMPERADOR DRAGÓN DE AURELIA', level: 99, rank: 'boss', model: 'DragonBoss', homeX: 680, homeY: 440, homeZ: -1375, patrolR: 6, maxHp: 11000, atk: 130, xp: 7500, coins: 6000 }
  ];

  for (const def of spotDefs) {
    localMonsters.set(def.id, {
      ...def,
      x: def.homeX,
      y: def.homeY,
      z: def.homeZ,
      ry: 0,
      hp: def.maxHp,
      mhp: def.maxHp,
      state: 'patrol',
      phase: Math.random() * Math.PI * 2,
      respawnAt: 0
    });
  }
}

function initLocalOrbs() {
  if (orbMeshes.size > 0) return;
  const orbs = [];
  let oid = 1;
  // Earth Orbs
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 65;
    orbs.push({ id: `orb_e_${oid++}`, x: Math.cos(angle) * r, y: 1.1, z: Math.sin(angle) * r, planet: 'earth' });
  }
  // Ocean Dragon Island Orbs
  for (let i = 0; i < 10; i++) {
    orbs.push({ id: `orb_o_${oid++}`, x: (Math.random() - 0.5) * 45, y: 1.2, z: 185 + (Math.random() - 0.5) * 45, planet: 'ocean' });
  }
  // Moon Orbs
  for (let i = 0; i < 14; i++) {
    orbs.push({ id: `orb_m_${oid++}`, x: (Math.random() - 0.5) * 70, y: 261.2, z: -680 + (Math.random() - 0.5) * 70, planet: 'moon' });
  }
  // Mars Orbs
  for (let i = 0; i < 16; i++) {
    orbs.push({ id: `orb_ma_${oid++}`, x: -620 + (Math.random() - 0.5) * 85, y: 341.2, z: -1100 + (Math.random() - 0.5) * 85, planet: 'mars' });
  }
  // Aurelia Orbs
  for (let i = 0; i < 10; i++) {
    orbs.push({ id: `orb_au_${oid++}`, x: 680 + (Math.random() - 0.5) * 80, y: 441.2, z: -1350 + (Math.random() - 0.5) * 80, planet: 'aurelia' });
  }
  syncWorldOrbs(orbs);
}

function updateLocalMonsters(dt) {
  const list = [];
  const now = performance.now();
  for (const m of localMonsters.values()) {
    if (m.state === 'dead') {
      if (now >= m.respawnAt) {
        m.state = 'patrol';
        m.hp = m.maxHp;
        m.x = m.homeX;
        m.y = m.homeY;
        m.z = m.homeZ;
      } else {
        continue;
      }
    }

    const dx = playerPos.x - m.x;
    const dy = playerPos.y - m.y;
    const dz = playerPos.z - m.z;
    const distToPlayer = Math.hypot(dx, dz);
    const distFromHome = Math.hypot(m.x - m.homeX, m.z - m.homeZ);
    const isBoss = m.rank === 'boss';
    const isElite = m.rank === 'elite';
    const aggroRadius = isBoss ? 26.0 : (isElite ? 18.0 : 14.0);

    // 1. Boss AoE Telegraph & Special Attack State Machine
    if (isBoss && distToPlayer <= 28.0 && Math.abs(dy) < 16.0) {
      if (!m.lastSpecialAt) m.lastSpecialAt = now - 4000;
      const bossCfg = BOSS_TELEGRAPH_CONFIGS[m.id];
      const cd = (bossCfg ? bossCfg.cooldown : 11.0) * 1000;

      if (now - m.lastSpecialAt > cd && (!m.chargingUntil || now > m.chargingUntil)) {
        m.lastSpecialAt = now;
        const dur = (bossCfg ? bossCfg.duration : 2.2);
        m.chargingUntil = now + dur * 1000;
        m.ry = Math.atan2(dx, dz);

        // Targeted center position
        const targetCenter = (m.id === 'boss_earth')
          ? new THREE.Vector3(m.x, m.y, m.z)
          : playerPos.clone();

        bossTelegraphs.startTelegraph(m.id, targetCenter);
      }
    }

    // 2. Boss Charging Stance
    if (m.chargingUntil && now < m.chargingUntil) {
      // Boss pauses movement, locks rotation towards player while charging special
      m.ry = Math.atan2(dx, dz);
    }
    // 3. Combat Aggro & Chase Behavior
    else if (state.joined && distToPlayer <= aggroRadius && Math.abs(dy) < 12.0 && distFromHome < m.patrolR + 25.0) {
      m.ry = Math.atan2(dx, dz);
      const minMelee = isBoss ? 3.6 : 2.2;
      if (distToPlayer > minMelee) {
        const speed = isBoss ? 7.2 : (isElite ? 6.2 : 5.0);
        m.x += (dx / distToPlayer) * speed * dt;
        m.z += (dz / distToPlayer) * speed * dt;
      } else {
        // Melee Attack against Player
        if (!m.lastMeleeAt || now - m.lastMeleeAt > 1600) {
          m.lastMeleeAt = now;
          const vit = state.stats?.vit || 5;
          const gear = state.gearLevel || 0;
          const def = Math.min(0.65, (vit * 0.008) + (gear * 0.025));
          const dmg = Math.max(4, Math.round(m.atk * (1 - def)));
          state.hp = Math.max(1, (state.hp || state.maxHp) - dmg);
          spawnFloatingCombatText(playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)), `-${dmg}`, false, '#ff4444');
          combatFeedback.addScreenShake(0.28);
          combatFeedback.triggerDamageVignette(0.55);
          sfx.hitDamage();
          updateHUD();
          saveLocalState();
        }
      }
    }
    // 4. Aggro Break & Retreat to Home Spot
    else if (distFromHome > m.patrolR + 1.2) {
      const hx = m.homeX - m.x;
      const hz = m.homeZ - m.z;
      const hDist = Math.hypot(hx, hz);
      m.ry = Math.atan2(hx, hz);
      const retreatSpd = 5.2;
      m.x += (hx / hDist) * retreatSpd * dt;
      m.z += (hz / hDist) * retreatSpd * dt;
    }
    // 5. Normal Circular Patrol
    else {
      m.phase = (m.phase || 0) + dt * 0.45;
      m.x = m.homeX + Math.cos(m.phase) * m.patrolR;
      m.z = m.homeZ + Math.sin(m.phase) * m.patrolR;
      m.ry = m.phase + Math.PI / 2;
    }

    const pDistSq = (m.x - playerPos.x) ** 2 + (m.y - playerPos.y) ** 2 + (m.z - playerPos.z) ** 2;
    if (pDistSq <= 240 * 240) {
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
  reconcileMonsters(list);
}

function handleOfflineAetherStrike() {
  let closestMob = null;
  let closestDist = 12.0;

  for (const m of localMonsters.values()) {
    if (m.state === 'dead') continue;
    const dx = m.x - playerPos.x;
    const dy = m.y - playerPos.y;
    const dz = m.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < closestDist) {
      closestDist = d;
      closestMob = m;
    }
  }

  if (!closestMob) return;

  const baseDmg = (state.stats.str || 5) * 4 + (state.gearLevel || 0) * 14 + (state.level || 1) * 3;
  const usingShot = state.soulshotsActive && (state.inventory?.soulshots || 0) > 0;
  if (usingShot) state.inventory.soulshots--;

  const critRate = (state.stats.luk || 5) * 0.02 + 0.08;
  const isCrit = Math.random() < critRate;
  const dmg = Math.round(baseDmg * (usingShot ? 1.95 : 1.0) * (isCrit ? 1.85 : (0.9 + Math.random() * 0.2)));

  closestMob.hp = Math.max(0, closestMob.hp - dmg);
  const hitPos = new THREE.Vector3(closestMob.x, closestMob.y + 1.8, closestMob.z);
  spawnFloatingCombatText(hitPos, isCrit ? `CRIT -${dmg}!` : `-${dmg}`, isCrit, usingShot ? '#6ce5ff' : '#ffe2a6');

  // AAA Juicy Combat Feedback Integration
  const hitDir = new THREE.Vector3(closestMob.x - playerPos.x, 0.4, closestMob.z - playerPos.z).normalize();
  combatFeedback.spawnDirectionalHitSparks(hitPos, hitDir, isCrit, usingShot, isCrit ? 36 : 24);

  const mobEnt = monsterEntities.get(closestMob.id);
  if (mobEnt) {
    combatFeedback.flashEnemyHit(mobEnt, isCrit);
  }

  combatFeedback.addScreenShake(isCrit ? 0.38 : (usingShot ? 0.24 : 0.14));
  combatFeedback.triggerHitStop(isCrit ? 0.055 : 0.035);

  if (isCrit) {
    sfx.critStrike();
    combatFeedback.triggerCritVignette(0.55);
  }

  // Weapon durability wear on strike
  state.durability = Math.max(1, Math.round(((state.durability ?? 100) - 0.2) * 10) / 10);
  updateEquipmentFrame();

  // Boss roars in rage when struck
  if (closestMob.rank === 'boss' && closestMob.hp > 0 && Math.random() < 0.45) {
    sfx.bossRoar({ isDragon: closestMob.model === 'DragonBoss' || closestMob.name.includes('DRAGÓN') });
  }

  if (closestMob.hp <= 0) {
    closestMob.state = 'dead';
    closestMob.respawnAt = performance.now() + 12000;
    sfx.levelUp();
    state.xp += closestMob.xp;
    state.coins += closestMob.coins;

    // Drops
    state.inventory.soulshots = (state.inventory.soulshots || 0) + 40;
    state.inventory.potions = (state.inventory.potions || 0) + 1;
    if (closestMob.rank === 'boss' || Math.random() < 0.35) state.inventory.bless = (state.inventory.bless || 0) + 1;
    if (closestMob.rank === 'boss' || Math.random() < 0.20) state.inventory.soul = (state.inventory.soul || 0) + 1;
    if (closestMob.rank === 'boss' || Math.random() < 0.10) state.inventory.chaos = (state.inventory.chaos || 0) + 1;

    showToast(closestMob.rank === 'boss' ? '¡JEFE SUPREMO DERROTADO!' : 'ENEMIGO VENCIDO', `+${closestMob.xp} XP | +${closestMob.coins} ✦`);
    checkBountyObjective('kill', { mobId: closestMob.id, mobRank: closestMob.rank });
    checkOfflineLevelUp();
    saveLocalState();
  }
  updateHUD();
}

function checkOfflineLevelUp() {
  while (state.xp >= state.xpNext && state.level < 100) {
    state.xp -= state.xpNext;
    state.level++;
    state.xpNext = Math.round(state.xpNext * 1.38 + 75);
    state.statPoints = (state.statPoints || 0) + 5;
    state.skillPoints = (state.skillPoints || 0) + 1;
    state.maxHp = 260 + state.level * 25 + (state.stats.vit || 5) * 15;
    state.hp = state.maxHp;
    state.durability = 100;
    rebuildLocalAvatar();
    showVictoryBanner(
      '✦ ASCENSIÓN SUPREMA DE PODER ✦',
      `¡NIVEL ${state.level} ALCANZADO!`,
      'Tu resonancia de éter ha ascendido en el Santuario Solar',
      [
        '⚔️ +5 Puntos de Atributo (STR/AGI/VIT/INT/DEX/LUK)',
        '⚡ +1 Punto de Códice de Habilidad [K]',
        '💚 Integridad y Durabilidad Restauradas al 100%'
      ]
    );
  }
  updateHUD();
  saveLocalState();
}

function handleOfflineForgeUpgrade(mode) {
  if (mode === 'gear') {
    if ((state.gearLevel || 0) >= 15) {
      showToast('NIVEL MÁXIMO', 'Tu armadura y armas ya poseen el fulgor legendario +15.');
      return;
    }
    const inv = state.inventory;
    if (state.gearLevel < 6) {
      if ((inv.bless || 0) < 1) {
        showToast('FORJA PRIMORDIAL', 'Necesitas Joya de la Bendición (Drop de monstruos).');
        return;
      }
      inv.bless--;
      state.gearLevel++;
      state.durability = 100;
      sfx.levelUp();
      checkBountyObjective('forge', { gearLevel: state.gearLevel });
      showToast('¡FORJA EXITOSA!', `Equipo ascendido a +${state.gearLevel}. Fulgor intensificado.`);
    } else if (state.gearLevel < 9) {
      if ((inv.soul || 0) < 1) {
        showToast('FORJA PRIMORDIAL', 'Necesitas Joya del Alma (Drop de monstruos élite).');
        return;
      }
      inv.soul--;
      if (Math.random() < 0.75) {
        state.gearLevel++;
        state.durability = 100;
        sfx.levelUp();
        checkBountyObjective('forge', { gearLevel: state.gearLevel });
        showToast('¡FORJA EXITOSA!', `Equipo ascendido a +${state.gearLevel}.`);
      } else {
        state.gearLevel = Math.max(6, state.gearLevel - 1);
        sfx.strike();
        showToast('FALLO EN LA FORJA', `Inestabilidad de éter: el equipo descendió a +${state.gearLevel}.`);
      }
    } else {
      if ((inv.soul || 0) < 1 || (inv.chaos || 0) < 1) {
        showToast('FORJA PRIMORDIAL', 'Para forja +10 a +15 necesitas Joya del Alma y Joya del Caos.');
        return;
      }
      inv.soul--;
      inv.chaos--;
      if (Math.random() < 0.50) {
        state.gearLevel++;
        state.durability = 100;
        sfx.levelUp();
        checkBountyObjective('forge', { gearLevel: state.gearLevel });
        showToast('¡ASCENSIÓN LEGENDARIA!', `¡Equipo forjado a +${state.gearLevel}! Aura resplandeciente.`);
      } else {
        state.gearLevel = Math.max(0, state.gearLevel - 2);
        sfx.strike();
        showToast('COLAPSO EN LA FORJA', `El reactor colapsó: el equipo descendió a +${state.gearLevel}.`);
      }
    }
    rebuildLocalAvatar();
    updateHUD();
    saveLocalState();
  } else if (mode === 'wings') {
    const currentTier = state.wingsTier || 0;
    if (currentTier >= 3) {
      showToast('ALAS SUPREMAS', 'Posees las Alas de Serafín Grado III (Máximo Nivel).');
      return;
    }
    const inv = state.inventory;
    if (currentTier === 0) {
      if (state.level < 15) {
        showToast('NIVEL INSUFICIENTE', 'Requieres Nivel 15 para despertar las Alas Solares.');
        return;
      }
      if ((inv.chaos || 0) < 1) {
        showToast('FORJA CAÓTICA', 'Necesitas 1 Joya del Caos para evolucionar tus alas.');
        return;
      }
      inv.chaos--;
      state.wingsTier = 1;
      sfx.levelUp();
      showToast('¡ALAS DESPERTADAS!', 'Has desbloqueado las Alas Solares Grado I.');
    } else if (currentTier === 1) {
      if (state.level < 40) {
        showToast('NIVEL INSUFICIENTE', 'Requieres Nivel 40 para Alas de Arcángel.');
        return;
      }
      if ((inv.chaos || 0) < 2 || (inv.soul || 0) < 2) {
        showToast('FORJA CAÓTICA', 'Necesitas 2 Joyas del Caos y 2 Joyas del Alma.');
        return;
      }
      inv.chaos -= 2;
      inv.soul -= 2;
      state.wingsTier = 2;
      sfx.levelUp();
      showToast('¡ALAS DE ARCÁNGEL!', 'Has evolucionado a Alas de Arcángel Grado II.');
    } else if (currentTier === 2) {
      if (state.level < 75) {
        showToast('NIVEL INSUFICIENTE', 'Requieres Nivel 75 para Alas de Serafín.');
        return;
      }
      if ((inv.chaos || 0) < 3 || (inv.soul || 0) < 3 || (inv.bless || 0) < 3) {
        showToast('FORJA CAÓTICA', 'Necesitas 3 Joyas del Caos, 3 del Alma y 3 de Bendición.');
        return;
      }
      inv.chaos -= 3;
      inv.soul -= 3;
      inv.bless -= 3;
      state.wingsTier = 3;
      sfx.levelUp();
      showToast('¡ALAS SUPREMAS DE SERAFÍN!', '¡Has alcanzado las majestuosas Alas Grado III!');
    }
    rebuildLocalAvatar();
    updateHUD();
    saveLocalState();
  }
}

function handleOfflineTransit(destination) {
  const FARES = {
    earth_sanctuary: 50,
    ocean_dragon_island: 150,
    moon_base: 350,
    mars_colony: 600,
    aurelia_ring: 950
  };
  const fare = FARES[destination] || 50;
  if (state.coins < fare) {
    showToast('PEAJE RECHAZADO', `Necesitas ${fare} ✦ para el salto cuántico.`);
    return;
  }
  state.coins -= fare;
  const dest = PLANETARY_DESTINATIONS[destination];
  if (dest) {
    sfx.portal();
    playerPos.copy(dest.pos);
    playerVel.set(0, 0, 0);
    showToast('TRÁNSITO CUÁNTICO COMPLETADO', `Destino: ${dest.name} (-${fare} ✦).`);
  }
  updateHUD();
  saveLocalState();
}

function handleOfflineBuySupplies(item) {
  const inv = state.inventory;
  if (item === 'soulshots') {
    if (state.coins < 150) {
      showToast('CRÉDITOS INSUFICIENTES', 'Necesitas 150 ✦ para adquirir 120 Cargas de Resonancia.');
      return;
    }
    state.coins -= 150;
    inv.soulshots = (inv.soulshots || 0) + 120;
    sfx.shard();
    showToast('SUMINISTRO ADQUIRIDO', '+120 Cargas de Resonancia (-150 ✦).');
  } else if (item === 'potions') {
    if (state.coins < 80) {
      showToast('CRÉDITOS INSUFICIENTES', 'Necesitas 80 ✦ para adquirir 10 Pociones Vitales.');
      return;
    }
    state.coins -= 80;
    inv.potions = (inv.potions || 0) + 10;
    sfx.shard();
    showToast('SUMINISTRO ADQUIRIDO', '+10 Pociones Vitales (-80 ✦).');
  }
  updateHUD();
  saveLocalState();
}

function handleOfflineDonateSociety() {
  if (state.coins < 300) {
    showToast('CRÉDITOS INSUFICIENTES', 'Necesitas 300 ✦ para donar al Santuario Colectivo.');
    return;
  }
  state.coins -= 300;
  state.society.totalContribution = (state.society.totalContribution || 0) + 300;
  sfx.levelUp();
  showToast('SANTUARIO COLECTIVO', '¡Donación registrada! +300 al Fondo de Alianza (-300 ✦).');
  updateHUD();
  saveLocalState();
}

function handleOfflineClaimRelic(relicIndex) {
  if (state.relics[relicIndex]) return;
  state.relics[relicIndex] = true;
  state.coins += 1200;
  state.xp += 800;
  state.inventory.bless = (state.inventory.bless || 0) + 2;
  sfx.levelUp();
  showToast('¡RELIQUIA CONQUISTADA!', '+1,200 ✦, +800 XP y +2 Joyas de la Bendición.');
  checkOfflineLevelUp();
  updateHUD();
  saveLocalState();
}

function handleOfflineAscension() {
  state.ascension = true;
  state.gearLevel = 15;
  state.wingsTier = 3;
  state.coins += 50000;
  state.statPoints = (state.statPoints || 0) + 30;
  sfx.levelUp();
  rebuildLocalAvatar();
  showToast('¡ASCENSIÓN PRIMORDIAL COMPLETADA!', '¡Has alcanzado el estado supremo! Equipo +15, Alas Grado III y +50,000 ✦.');
  updateHUD();
  saveLocalState();
}

function handleOfflineOrbPickups() {
  for (const [orbId, item] of orbMeshes.entries()) {
    const dx = item.data.x - playerPos.x;
    const dy = item.data.y - playerPos.y;
    const dz = item.data.z - playerPos.z;
    if (dx * dx + dy * dy + dz * dz < 81) {
      removeClientOrb(orbId);
      sfx.shard();
      state.xp += 65;
      state.coins += 50;
      checkOfflineLevelUp();
      saveLocalState();
    }
  }
}

function activateSovereignOfflineMode() {
  if (isSovereignOffline) return;
  isSovereignOffline = true;
  initLocalMonsters();
  initLocalOrbs();
  loadLocalState();
  updateHUD();
  console.log('[THE QUEST] Modo Soberano Autónomo Activo. Progreso guardado en almacenamiento local.');
}

// ============================================================================
// WEBSOCKET CONNECTION & MULTIPLAYER SYNC
// ============================================================================
let ws = null;

function connectWebSocket() {
  const params = new URLSearchParams(window.location.search);
  const serverParam = params.get('server');

  // If deployed to GitHub Pages and no explicit server is requested, activate Sovereign Web Mode directly
  if (!serverParam && (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:')) {
    activateSovereignOfflineMode();
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const targetUrl = serverParam || `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(targetUrl);

    ws.addEventListener('open', () => {
      isSovereignOffline = false;
      if (state.joined) {
        ws.send(JSON.stringify({
          t: 'join',
          name: state.playerName,
          avatar: state.avatarType
        }));
      }
    });

    ws.addEventListener('message', (event) => {
      let packet;
      try {
        packet = JSON.parse(event.data);
      } catch {
        return;
      }

      if (packet.t === 'welcome') {
        state.playerId = packet.id;
        if (packet.self) Object.assign(state, packet.self);
        if (packet.society) state.society = packet.society;
        state.leaderboard = packet.leaderboard || [];
        state.onlineCount = packet.totalOnline || 1;
        syncWorldOrbs(packet.orbs || []);
        updateHUD();
      } else if (packet.t === 'aoi') {
        if (packet.you) {
          const prevGear = state.gearLevel;
          const prevWings = state.wingsTier;
          const prevLvl = state.level;
          Object.assign(state, packet.you);
          if (state.gearLevel !== prevGear || state.wingsTier !== prevWings || state.level !== prevLvl) {
            rebuildLocalAvatar();
          }
        }
        if (packet.society) state.society = packet.society;
        state.onlineCount = packet.online || state.onlineCount;
        state.nearbyCount = (packet.nearby || []).length;
        reconcileNearbyPlayers(packet.nearby || []);
        reconcileMonsters(packet.mobs || []);
        updateHUD();
      } else if (packet.t === 'forge_result') {
        if (packet.ok) sfx.levelUp();
        else sfx.strike();
        showToast(packet.title, packet.desc);
        updateHUD();
      } else if (packet.t === 'transit_approved') {
        const dest = PLANETARY_DESTINATIONS[packet.destination];
        if (dest) {
          sfx.portal();
          playerPos.copy(dest.pos);
          playerVel.set(0, 0, 0);
          showToast('TRÁNSITO CUÁNTICO COMPLETADO', `Destino: ${dest.name} (-${packet.farePaid} ✦).`);
        }
        updateHUD();
      } else if (packet.t === 'transit_denied') {
        showToast('PEAJE RECHAZADO', packet.reason);
      } else if (packet.t === 'event') {
        handleServerEvent(packet);
      }
    });

    ws.addEventListener('error', () => {
      activateSovereignOfflineMode();
    });

    ws.addEventListener('close', () => {
      activateSovereignOfflineMode();
      setTimeout(connectWebSocket, 4000);
    });
  } catch {
    activateSovereignOfflineMode();
  }
}

function reconcileNearbyPlayers(nearbyArray) {
  const seenIds = new Set();

  for (const np of nearbyArray) {
    seenIds.add(np.id);
    let remote = remotePlayers.get(np.id);
    const desiredAv = np.av || 'Vanguard';
    const desiredMt = np.mt || 'none';
    const desiredLv = np.lv || 1;
    const desiredGl = np.gl || 0;
    const desiredWt = np.wt || 0;

    if (
      !remote ||
      remote.avatarKey !== desiredAv ||
      remote.mountType !== desiredMt ||
      remote.level !== desiredLv ||
      remote.gearLevel !== desiredGl ||
      remote.wingsTier !== desiredWt
    ) {
      if (remote) scene.remove(remote.avatarObj.root);
      const avatarObj = createAvatarInstance(desiredAv, np.n || 'Explorer', desiredMt, desiredLv, desiredGl, desiredWt);
      avatarObj.root.position.set(np.x, np.y, np.z);
      scene.add(avatarObj.root);
      remote = {
        id: np.id,
        avatarKey: desiredAv,
        mountType: desiredMt,
        level: desiredLv,
        gearLevel: desiredGl,
        wingsTier: desiredWt,
        avatarObj,
        targetPos: new THREE.Vector3(np.x, np.y, np.z),
        targetRy: np.ry || 0,
        anim: np.an || 'Idle'
      };
      remotePlayers.set(np.id, remote);
    } else {
      remote.targetPos.set(np.x, np.y, np.z);
      remote.targetRy = np.ry || 0;
      remote.anim = np.an || 'Idle';
    }
  }

  for (const [id, remote] of remotePlayers.entries()) {
    if (!seenIds.has(id)) {
      scene.remove(remote.avatarObj.root);
      remotePlayers.delete(id);
    }
  }
}

function handleServerEvent(ev) {
  if (ev.leaderboard) state.leaderboard = ev.leaderboard;
  if (ev.society) state.society = ev.society;

  switch (ev.kind) {
    case 'ORB_COLLECTED':
      removeClientOrb(ev.orbId);
      if (ev.playerId === state.playerId) {
        sfx.shard();
        if (ev.leveledUp) {
          sfx.levelUp();
          rebuildLocalAvatar();
          showToast(`ASCENSO AL NIVEL ${ev.newLevel}`, `+5 Puntos de Atributo y +1 Punto de Códice [K].`);
        }
      }
      break;
    case 'ORB_SPAWNED':
      if (ev.orb) spawnClientOrb(ev.orb);
      break;
    case 'MOB_DAMAGED': {
      const pos = new THREE.Vector3(ev.x, ev.y, ev.z);
      const label = ev.isCrit ? `CRIT -${ev.dmg}!` : `-${ev.dmg}`;
      spawnFloatingCombatText(pos, label, ev.isCrit, ev.usedSoulshot ? '#6ce5ff' : '#ffe2a6');
      const mobEnt = monsterEntities.get(ev.mobId);
      if (mobEnt) {
        const hitDir = new THREE.Vector3().subVectors(pos, playerPos).normalize();
        combatFeedback.spawnDirectionalHitSparks(pos, hitDir, ev.isCrit, ev.usedSoulshot, ev.isCrit ? 34 : 22);
        combatFeedback.flashEnemyHit(mobEnt, ev.isCrit);
        combatFeedback.addScreenShake(ev.isCrit ? 0.36 : 0.18);
        combatFeedback.triggerHitStop(ev.isCrit ? 0.055 : 0.035);
        if (ev.isCrit) combatFeedback.triggerCritVignette(0.5);
      }
      break;
    }
    case 'BOSS_TELEGRAPH': {
      bossTelegraphs.startTelegraph(ev.bossId, new THREE.Vector3(ev.x, ev.y, ev.z));
      break;
    }
    case 'MOB_DEFEATED': {
      if (ev.attackerId === state.playerId) {
        sfx.levelUp();
        const dropTxt = ev.drops && ev.drops.length ? ` • Botín: ${ev.drops.join(', ')}` : '';
        showToast(`${ev.mobName.toUpperCase()} ABATIDO`, `+${ev.xpGained} XP • +${ev.coinsGained} ✦${dropTxt}`);
      } else if (ev.mobRank === 'boss') {
        showToast('RAID BOSS DERROTADO', `${ev.attackerName} ha abatido a ${ev.mobName}.`);
      }
      break;
    }
    case 'FORGE_LEGENDARY':
      sfx.levelUp();
      showToast('FORJA DEL CAOS LEGENDARIA', `${ev.playerName} ha elevado su armadura a +${ev.gearLevel}.`);
      break;
    case 'WINGS_CRAFTED':
      sfx.levelUp();
      showToast('EVOLUCIÓN DE ALAS', `${ev.playerName} ha forjado ${ev.wingName}.`);
      break;
    case 'SOCIETY_UPGRADED':
      sfx.shard();
      showToast('ALIANZA PLANETARIA', `${ev.playerName} aportó al Santuario Colectivo (${state.society.activeBuff}).`);
      break;
    case 'ATTRACTION_COMPLETED':
      if (ev.playerId === state.playerId && ev.leveledUp) {
        sfx.levelUp();
        rebuildLocalAvatar();
        showToast(`ASCENSO AL NIVEL ${ev.newLevel}`, `+5 Puntos de Atributo y +1 Punto de Códice [K].`);
      }
      break;
    case 'RELIC_FOUND':
      sfx.levelUp();
      showToast(ev.relicName, `${ev.playerName} ha despertado una Reliquia Ancestral.`);
      break;
    case 'ASCENSION_COMPLETE':
      sfx.levelUp();
      showToast('ASCENSIÓN SUPREMA', `${ev.playerName} ha activado el Altar Central con las 3 Reliquias.`);
      break;
    case 'STRIKE_FX':
      spawnShockwave(
        new THREE.Vector3(ev.x, ev.y + 0.5, ev.z),
        ev.usedSoulshot ? 0x6ce5ff : 0xffcf70
      );
      break;
    case 'RIVAL_DEFEATED':
      showToast('COMBATE EN EL COLISEO', `${ev.attackerName} venció a ${ev.victimName}.`);
      break;
    case 'SYSTEM_ANNOUNCEMENT':
      showToast('TELEMETRÍA DEL SISTEMA', ev.message);
      break;
    case 'CHAT':
      appendChat(`NV.${ev.level || 1} ${ev.playerName}`, ev.text);
      break;
  }
  updateHUD();
}

// ============================================================================
// INTERACTIONS, RELICS & SHOCKWAVES
// ============================================================================
let activeContextFn = null;
const activeShockwaves = [];

function spawnShockwave(centerPos, colorHex = 0xffcf70) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.4, 36),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(centerPos);
  scene.add(mesh);
  activeShockwaves.push({ mesh, scale: 1, opacity: 0.85 });
}

function triggerAetherStrike() {
  attackTimer = 0.42;
  const usingShot = state.soulshotsActive && (state.inventory?.soulshots || 0) > 0;
  sfx.strike({ isCrit: false, usingSoulshot: usingShot });

  state.durability = Math.max(1, Math.round(((state.durability ?? 100) - 0.2) * 10) / 10);
  updateEquipmentFrame();

  combatFeedback.spawnShockwave(playerPos.clone().add(new THREE.Vector3(0, 0.7, 0)), usingShot ? 0x6ce5ff : 0xffcf70, 7.5);
  combatFeedback.addScreenShake(usingShot ? 0.16 : 0.08);

  // Directional forward wind/spark burst
  const strikeDir = new THREE.Vector3(-Math.sin(playerYaw), 0.2, -Math.cos(playerYaw));
  const strikePos = playerPos.clone().addScaledVector(strikeDir, 1.8).add(new THREE.Vector3(0, 1.1, 0));
  combatFeedback.spawnDirectionalHitSparks(strikePos, strikeDir, false, usingShot, 14);

  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'aether_strike' }));
  } else {
    handleOfflineAetherStrike();
  }
}

function claimRelic(relicIndex) {
  if (state.relics[relicIndex]) return;
  state.relics[relicIndex] = true;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'claim_relic', relicIndex }));
  } else {
    handleOfflineClaimRelic(relicIndex);
  }
  updateHUD();
}

function triggerContextInteract() {
  if (activeContextFn) activeContextFn();
}

function checkInteractions() {
  const btn = document.getElementById('context-action-btn');
  const txt = document.getElementById('context-action-text');
  activeContextFn = null;

  // Check if close to an alive Monster or Raid Boss to show Attack Hint
  for (const [, mob] of monsterEntities) {
    if (playerPos.distanceTo(mob.targetPos) < 11.5) {
      txt.textContent = `Atacar con Pulso de Éter [Q] (${state.soulshotsActive ? 'Resonancia x1.85 Activa' : 'Normal'})`;
      btn.classList.remove('hidden');
      activeContextFn = () => triggerAetherStrike();
      return;
    }
  }

  for (const attr of interactiveAttractions) {
    if (playerPos.distanceTo(attr.position) < attr.radius) {
      txt.textContent = attr.label;
      btn.classList.remove('hidden');
      activeContextFn = attr.action;
      return;
    }
  }

  if (playerPos.distanceTo(new THREE.Vector3(0, 0, 0)) < 8.5) {
    if (state.relics[0] && state.relics[1] && state.relics[2] && !state.ascension) {
      txt.textContent = 'Activar Altar de la Ascensión (+50,000 ✦ / Equipo +15 & Alas Nv.3)';
      btn.classList.remove('hidden');
      activeContextFn = () => {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'claim_ascension' }));
        else handleOfflineAscension();
      };
    } else {
      txt.textContent = 'Abrir Forja Primordial (+15, Alas & Alianza) [F]';
      btn.classList.remove('hidden');
      activeContextFn = () => {
        updateHUD();
        document.getElementById('forge-modal').classList.remove('hidden');
      };
    }
    return;
  }

  btn.classList.add('hidden');
}

function checkOrbPickups() {
  if (ws && ws.readyState === 1) {
    for (const [orbId, item] of orbMeshes.entries()) {
      const dx = item.data.x - playerPos.x;
      const dy = item.data.y - playerPos.y;
      const dz = item.data.z - playerPos.z;
      if (dx * dx + dy * dy + dz * dz < 81) {
        removeClientOrb(orbId);
        sfx.shard();
        ws.send(JSON.stringify({ t: 'pickup_orb', orbId }));
      }
    }
  } else {
    handleOfflineOrbPickups();
  }
}

// ============================================================================
// HUD, RAGNAROK STATS, MU FORGE (+15 & WINGS), STAR MAP & HANGAR UI
// ============================================================================
function updateHUD() {
  document.getElementById('hud-level').textContent = state.level;
  document.getElementById('hud-gear-badge').textContent = `+${state.gearLevel || 0}`;
  document.getElementById('hud-zone-name').textContent = getCurrentPlanetLabel(playerPos.x, playerPos.y, playerPos.z);

  const maxHp = state.maxHp || 260;
  const hpPct = Math.max(0, Math.min(100, Math.round((state.hp / maxHp) * 100)));
  document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
  document.getElementById('hud-hp').textContent = `${state.hp}/${maxHp}`;

  document.getElementById('hud-coins').textContent = state.coins.toLocaleString();
  const inv = state.inventory || { bless: 0, soul: 0, chaos: 0, feather: 0, soulshots: 0, potions: 0 };
  document.getElementById('hud-jewels').textContent = `${inv.bless}/${inv.soul}/${inv.chaos}`;
  document.getElementById('hud-online').textContent = state.onlineCount;

  const pct = state.level >= 100 ? 100 : Math.min(100, Math.round((state.xp / Math.max(1, state.xpNext)) * 100));
  document.getElementById('hud-xp-fill').style.width = `${pct}%`;
  document.getElementById('hud-xp-text').textContent =
    state.level >= 100 ? 'NIVEL 100 MÁXIMO' : `XP ${state.xp} / ${state.xpNext}`;

  const altMeters = Math.max(0, Math.round(playerPos.y));
  document.getElementById('hud-altitude').textContent = `ALT ${altMeters}m`;

  const totalPendingPts = (state.skillPoints || 0) + (state.statPoints || 0);
  const ptBadge = document.getElementById('skill-pt-badge');
  if (totalPendingPts > 0) {
    ptBadge.textContent = totalPendingPts;
    ptBadge.classList.remove('hidden');
  } else {
    ptBadge.classList.add('hidden');
  }

  // Ragnarok Stats & Codex Modal
  document.getElementById('sk-lvl').textContent = state.level;
  document.getElementById('st-atk').textContent = state.atk || 45;
  document.getElementById('st-matk').textContent = state.matk || 45;
  document.getElementById('st-crit').textContent = `${state.critRate || 12}%`;
  document.getElementById('st-pts').textContent = state.statPoints || 0;
  document.getElementById('sk-pts').textContent = state.skillPoints || 0;

  if (state.stats) {
    ['str', 'agi', 'vit', 'int', 'dex', 'luk'].forEach((k) => {
      const el = document.getElementById(`val-${k}`);
      if (el) el.textContent = state.stats[k] || 5;
    });
  }

  if (state.skills) {
    document.getElementById('sk-val-velocity').textContent = state.skills.velocity || 0;
    document.getElementById('sk-val-aetherPower').textContent = state.skills.aetherPower || 0;
    document.getElementById('sk-val-vitality').textContent = state.skills.vitality || 0;
    document.getElementById('sk-val-cosmicMastery').textContent = state.skills.cosmicMastery || 0;
  }

  // MU Online Chaos Forge & Lineage Society Modal
  const wingLabels = ['Ninguna', 'Alas Solares (Nv.1)', 'Alas de Arcángel (Nv.2)', 'Alas de Serafín (Nv.3)'];
  document.getElementById('fg-gear').textContent = `+${state.gearLevel || 0}`;
  document.getElementById('fg-wings').textContent = wingLabels[state.wingsTier || 0] || 'Ninguna';
  document.getElementById('inv-bless').textContent = inv.bless || 0;
  document.getElementById('inv-soul').textContent = inv.soul || 0;
  document.getElementById('inv-chaos').textContent = inv.chaos || 0;
  document.getElementById('inv-feather').textContent = inv.feather || 0;

  if (state.society) {
    document.getElementById('soc-lvl').textContent = state.society.level || 3;
    document.getElementById('soc-prog').textContent = `${state.society.totalContribution || 0}/${state.society.nextGoal || 10000}`;
    document.getElementById('soc-buff-txt').textContent = `Bono Activo para todos: ${state.society.activeBuff}`;
  }

  // Soulshot Dock Button
  const shotBtn = document.getElementById('btn-soulshot');
  if (shotBtn) {
    shotBtn.classList.toggle('active', Boolean(state.soulshotsActive && inv.soulshots > 0));
    document.getElementById('hud-shots-count').textContent = `${inv.soulshots || 0}⚡`;
  }

  ['horse', 'ship', 'supercar', 'mythic_bird', 'jet', 'starship'].forEach((m) => {
    const el = document.getElementById(`price-${m}`);
    if (el && state.unlockedMounts.includes(m)) {
      el.textContent = state.mountType === m ? 'Equipado ✓' : 'Equipar ⟶';
    }
  });

  [0, 1, 2].forEach((i) => {
    const el = document.getElementById(`relic-${i}`);
    if (el) el.className = `relic-node ${state.relics[i] ? 'unlocked' : ''}`;
  });

  const mountLabels = {
    none: 'INFANTERÍA',
    horse: 'CORCEL',
    ship: 'GALEÓN NAVAL',
    supercar: 'SUPERCAR GT',
    mythic_bird: 'AVE SOLAR',
    jet: 'CAZA SUPERSÓNICO',
    starship: 'CRUCERO WARP'
  };
  document.getElementById('mount-indicator').textContent = mountLabels[state.mountType] || 'INFANTERÍA';

  document.getElementById('btn-mount-horse').classList.toggle('active', state.mountType === 'horse');
  document.getElementById('btn-mount-car').classList.toggle('active', state.mountType === 'supercar');
  document.getElementById('btn-mount-bird').classList.toggle('active', state.mountType === 'mythic_bird');
  document.getElementById('btn-mount-jet').classList.toggle('active', state.mountType === 'jet');
  document.getElementById('btn-mount-starship').classList.toggle('active', state.mountType === 'starship');
  if (document.getElementById('btn-mount-ship')) {
    document.getElementById('btn-mount-ship').classList.toggle('active', state.mountType === 'ship');
  }

  const lbBox = document.getElementById('leaderboard-box');
  if (lbBox) {
    lbBox.innerHTML = '';
    state.leaderboard.slice(0, 8).forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `lb-item ${idx === 0 ? 'first' : ''}`;
      const relCount = (item.relics || []).filter(Boolean).length;
      const glTag = item.gearLevel ? ` +${item.gearLevel}` : '';
      const left = document.createElement('span');
      left.textContent = `#${idx + 1} [NV.${item.level || 1}${glTag}] ${item.name}`;
      const right = document.createElement('span');
      right.textContent = `❖ ${relCount}/3 • ${(item.score || 0).toLocaleString()}`;
      row.append(left, right);
      lbBox.appendChild(row);
    });
  }

  updateEquipmentFrame();
  updateBountyHUD();
}

let toastTimer = null;
function showToast(title, desc) {
  const t = document.getElementById('world-toast');
  document.getElementById('world-toast-title').textContent = title;
  document.getElementById('world-toast-desc').textContent = desc;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4200);
}

// ============================================================================
// CYBER-FANTASY LUXURY EQUIPMENT FRAME & RARITY TIERS (+0 to +15)
// ============================================================================
function getWeaponTitleForAvatar(avatar) {
  const titles = {
    Valen: 'Hoja de Éter Solar',
    Elena: 'Báculo Astral de la Valquiria',
    ShadowOps: 'Dagas de Sombras y Obsidiana',
    Kael: 'Rifle de Plasma Orbital',
    DesertRanger: 'Martillo Pretoriano Solar',
    Aegis: 'Baluarte de Cobalto Ancestral'
  };
  return titles[avatar] || 'Hoja de Éter Solar';
}

function updateEquipmentFrame() {
  const frame = document.getElementById('equipment-frame');
  if (!frame) return;

  const lvl = state.gearLevel || 0;
  const durability = typeof state.durability === 'number' ? state.durability : 100;

  // Determine rarity tier:
  // +0 to +3: Común (Slate/Silver)
  // +4 to +6: Mágico (Jade/Emerald)
  // +7 to +10: Raro (Sapphire Azure)
  // +11 to +14: Épico (Amethyst Violet)
  // +15: Legendario (Gold Incandescent)
  let rarityClass = 'rarity-common';
  let rarityText = 'COMÚN';
  if (lvl >= 15) {
    rarityClass = 'rarity-legendary';
    rarityText = 'LEGENDARIO +15';
  } else if (lvl >= 11) {
    rarityClass = 'rarity-epic';
    rarityText = 'ÉPICO';
  } else if (lvl >= 7) {
    rarityClass = 'rarity-rare';
    rarityText = 'RARO';
  } else if (lvl >= 4) {
    rarityClass = 'rarity-uncommon';
    rarityText = 'MÁGICO';
  }

  frame.className = `equipment-frame ${rarityClass}`;

  const weaponTitleEl = document.getElementById('hud-weapon-title');
  if (weaponTitleEl) weaponTitleEl.textContent = `${getWeaponTitleForAvatar(state.avatarType)} +${lvl}`;

  const tierBadgeEl = document.getElementById('hud-gear-tier-badge');
  if (tierBadgeEl) tierBadgeEl.textContent = `+${lvl}`;

  const rarityPillEl = document.getElementById('hud-rarity-pill');
  if (rarityPillEl) rarityPillEl.textContent = rarityText;

  const durBarEl = document.getElementById('hud-durability-bar');
  if (durBarEl) {
    durBarEl.style.width = `${Math.max(0, Math.min(100, durability))}%`;
    if (durability < 25) {
      durBarEl.style.background = 'linear-gradient(90deg, #e85555, #ff7b7b)';
    } else if (durability < 60) {
      durBarEl.style.background = 'linear-gradient(90deg, #d4a857, #ffe2a6)';
    } else {
      durBarEl.style.background = 'linear-gradient(90deg, #22c55e, #4fe0a3)';
    }
  }

  const durNumEl = document.getElementById('hud-durability-num');
  if (durNumEl) durNumEl.textContent = Math.round(durability);

  const gearBadge = document.getElementById('hud-gear-badge');
  if (gearBadge) {
    gearBadge.textContent = `+${lvl} ${rarityText}`;
  }
}

// ============================================================================
// CYBER-FANTASY STELLAR BOUNTY & QUEST TRACKER
// ============================================================================
const bountyQuests = [
  {
    id: 'bounty_sentinels',
    category: 'TIER I • SANTUARIO SOLAR',
    title: 'Purga de Centinelas Corruptos',
    desc: 'Derrota 3 Centinelas en los jardines de la Tierra.',
    type: 'kill',
    targetMobIds: ['mob_e1', 'mob_e2', 'mob_e3', 'mob_e4', 'mob_e5'],
    targetName: 'Centinelas',
    required: 3,
    targetCoords: { x: -40, y: 0, z: -35 },
    rewardCoins: 450,
    rewardXp: 600,
    rewardItem: 'bless',
    rewardText: '+450 ✦ • +600 XP • 💎 Gema Solar'
  },
  {
    id: 'bounty_colossus',
    category: 'TIER II • COLISEO DEL VALOR',
    title: 'Desafío del Coloso de Aethelgard',
    desc: 'Marcha al Coliseo del Este y abate al MVP Coloso (Nv. 25).',
    type: 'kill',
    targetMobIds: ['boss_earth'],
    targetName: 'Coloso MVP',
    required: 1,
    targetCoords: { x: 62, y: 0, z: -18 },
    rewardCoins: 1200,
    rewardXp: 1800,
    rewardItem: 'soul',
    rewardText: '+1,200 ✦ • +1,800 XP • 💎 Gema Astral'
  },
  {
    id: 'bounty_dragon',
    category: 'TIER III • OCÉANO ABISAL',
    title: 'Caza del Dragón Leviatán',
    desc: 'Navega en Galeón [6] o Caza al Sur y caza al Dragón Leviatán (Nv. 38).',
    type: 'kill',
    targetMobIds: ['boss_ocean'],
    targetName: 'Dragón Leviatán',
    required: 1,
    targetCoords: { x: 0, y: 0, z: 192 },
    rewardCoins: 2500,
    rewardXp: 3500,
    rewardItem: 'chaos',
    rewardText: '+2,500 ✦ • +3,500 XP • 💎 Gema Primordial'
  },
  {
    id: 'bounty_moon',
    category: 'TIER IV • FRONTERA LUNAR',
    title: 'Salto Orbital a la Luna Selene',
    desc: 'Vuela a la Base Tranquilidad en la Luna (Altitud 260m).',
    type: 'altitude_location',
    minY: 240,
    targetZ: -680,
    targetCoords: { x: 0, y: 260, z: -680 },
    required: 1,
    rewardCoins: 3000,
    rewardXp: 4000,
    rewardItem: 'feather',
    rewardText: '+3,000 ✦ • +4,000 XP • 🪶 Pluma de Serafín'
  },
  {
    id: 'bounty_forge',
    category: 'TIER V • FORJA PRIMORDIAL',
    title: 'Forja Resplandeciente (+7 o más)',
    desc: 'Imbuye Gemas en la Forja Central [F] hasta alcanzar +7 o superior.',
    type: 'gear_level',
    requiredLevel: 7,
    required: 1,
    targetCoords: { x: 0, y: 0, z: 0 },
    rewardCoins: 5000,
    rewardXp: 6000,
    rewardItem: 'chaos',
    rewardText: '+5,000 ✦ • +6,000 XP • 💎 Joyas Primordiales'
  }
];

function updateBountyHUD() {
  const bountyTracker = document.getElementById('bounty-tracker');
  if (!bountyTracker) return;

  const idx = state.bountyIndex || 0;
  if (idx >= bountyQuests.length) {
    document.getElementById('bounty-category').textContent = 'ASCENSIÓN COMPLETA';
    document.getElementById('bounty-title').textContent = 'Gran Campeón del Sistema';
    document.getElementById('bounty-desc').textContent = 'Todas las cacerías estelares han sido completadas con gloria eterna.';
    document.getElementById('bounty-progress-bar').style.width = '100%';
    document.getElementById('bounty-counter').textContent = '5 / 5 ✓';
    document.getElementById('bounty-distance').textContent = 'COMPLETO';
    document.getElementById('bounty-reward-val').textContent = '👑 Rango Cósmico Máximo';
    return;
  }

  const q = bountyQuests[idx];
  const prog = Math.min(q.required, state.bountyProgress || 0);

  document.getElementById('bounty-category').textContent = q.category;
  document.getElementById('bounty-title').textContent = q.title;
  document.getElementById('bounty-desc').textContent = q.desc;
  document.getElementById('bounty-reward-val').textContent = q.rewardText;
  document.getElementById('bounty-counter').textContent = `${prog} / ${q.required}`;
  const pct = Math.round((prog / q.required) * 100);
  document.getElementById('bounty-progress-bar').style.width = `${pct}%`;

  updateBountyDistance();
}

function updateBountyDistance() {
  const distEl = document.getElementById('bounty-distance');
  if (!distEl) return;
  const idx = state.bountyIndex || 0;
  if (idx >= bountyQuests.length) return;
  const q = bountyQuests[idx];
  if (!q.targetCoords) return;

  const dx = q.targetCoords.x - playerPos.x;
  const dy = q.targetCoords.y - playerPos.y;
  const dz = q.targetCoords.z - playerPos.z;
  const distM = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
  distEl.textContent = `${distM}m`;
}

function checkBountyObjective(type, data = {}) {
  const idx = state.bountyIndex || 0;
  if (idx >= bountyQuests.length) return;
  const q = bountyQuests[idx];

  let completedStep = false;
  if (q.type === 'kill' && type === 'kill') {
    if (q.targetMobIds.includes(data.mobId) || (data.mobRank === 'boss' && q.targetMobIds.some(id => id.includes('boss')))) {
      state.bountyProgress = (state.bountyProgress || 0) + 1;
      completedStep = true;
    }
  } else if (q.type === 'altitude_location' && type === 'move') {
    if (playerPos.y >= q.minY && Math.abs(playerPos.z - q.targetZ) < 180) {
      state.bountyProgress = 1;
      completedStep = true;
    }
  } else if (q.type === 'gear_level' && type === 'forge') {
    if ((state.gearLevel || 0) >= q.requiredLevel) {
      state.bountyProgress = 1;
      completedStep = true;
    }
  }

  if (completedStep) {
    if ((state.bountyProgress || 0) >= q.required) {
      state.coins += q.rewardCoins;
      state.xp += q.rewardXp;
      if (q.rewardItem && state.inventory) {
        state.inventory[q.rewardItem] = (state.inventory[q.rewardItem] || 0) + 1;
      }
      showVictoryBanner(
        '¡MISIÓN DE CACERÍA COMPLETADA!',
        q.title,
        'Has reclamado tu honor en el Santuario Solar',
        [
          `✦ +${q.rewardCoins} Créditos de Éter`,
          `⚡ +${q.rewardXp} XP de Ascensión`,
          `🎁 Recompensa: ${q.rewardText}`
        ]
      );
      state.bountyIndex = idx + 1;
      state.bountyProgress = 0;
      saveLocalState();
      checkOfflineLevelUp();
    }
    updateBountyHUD();
    updateHUD();
  }
}

// ============================================================================
// AAA VICTORY BANNER (LEVEL-UP & BOUNTY COMPLETIONS)
// ============================================================================
let victoryBannerTimer = null;
function showVictoryBanner(kicker, title, subline, rewardsList = []) {
  const banner = document.getElementById('victory-banner');
  if (!banner) return;

  const kickerEl = document.getElementById('victory-banner-kicker');
  if (kickerEl) kickerEl.textContent = kicker || '✦ ASCENSIÓN SUPREMA DE PODER ✦';

  const titleEl = document.getElementById('victory-banner-title');
  if (titleEl) titleEl.textContent = title || '¡NUEVO NIVEL ALCANZADO!';

  const subEl = document.getElementById('victory-banner-sub');
  if (subEl) subEl.textContent = subline || 'Has desbloqueado nuevo potencial astral';

  const rewardsWrap = document.getElementById('victory-banner-rewards');
  if (rewardsWrap && rewardsList.length > 0) {
    rewardsWrap.innerHTML = '';
    rewardsList.forEach(text => {
      const badge = document.createElement('div');
      badge.className = 'victory-reward-badge';
      badge.textContent = text;
      rewardsWrap.appendChild(badge);
    });
  }

  banner.classList.remove('hidden');
  sfx.victoryFanfare();

  clearTimeout(victoryBannerTimer);
  victoryBannerTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 4800);
}

// ============================================================================
// PROXIMITY BOSS ROARS & MONSTER AUDIO REACTIONS
// ============================================================================
let lastBossRoarCheck = 0;
function checkBossProximityRoar() {
  const now = performance.now();
  if (now - lastBossRoarCheck < 16000) return;
  for (const m of localMonsters.values()) {
    if (m.state === 'dead' || m.rank !== 'boss') continue;
    const dx = m.x - playerPos.x;
    const dy = m.y - playerPos.y;
    const dz = m.z - playerPos.z;
    if (dx * dx + dy * dy + dz * dz < 26 * 26) {
      lastBossRoarCheck = now;
      const isDragon = m.model === 'DragonBoss' || m.name.includes('DRAGÓN') || m.id.includes('ocean') || m.id.includes('aurelia');
      sfx.bossRoar({ isDragon });
      showToast('¡RUGIDO DE JEFE SUPREMO!', `${m.name} ruge estremeciendo el entorno.`);
      break;
    }
  }
}

// ============================================================================
// MOBILE TOUCH HAPTIC FEEDBACK & TACTILE RIPPLES
// ============================================================================
function spawnTouchRipple(clientX, clientY, targetEl) {
  try {
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    const rect = targetEl.getBoundingClientRect();
    ripple.style.left = `${clientX - rect.left}px`;
    ripple.style.top = `${clientY - rect.top}px`;
    targetEl.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  } catch {}
}

function initMobileHaptics() {
  const joyBase = document.getElementById('joystick-base');
  const joyStick = document.getElementById('joystick-stick');
  if (joyBase && joyStick) {
    joyBase.addEventListener('pointerdown', (e) => {
      joyBase.classList.add('touch-active');
      joyStick.classList.add('touch-active');
      if (navigator.vibrate) navigator.vibrate(15);
      spawnTouchRipple(e.clientX, e.clientY, joyBase);
      sfx.initAmbiance();
    });
    const removeJoyActive = () => {
      joyBase.classList.remove('touch-active');
      joyStick.classList.remove('touch-active');
    };
    joyBase.addEventListener('pointerup', removeJoyActive);
    joyBase.addEventListener('pointercancel', removeJoyActive);
    joyBase.addEventListener('pointerleave', removeJoyActive);
  }

  const touchBtns = document.querySelectorAll('.wheel-btn, .mount-btn, #context-action-btn, #equipment-frame, #bounty-tracker');
  touchBtns.forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      btn.classList.add('btn-pressed');
      if (navigator.vibrate) navigator.vibrate(12);
      spawnTouchRipple(e.clientX, e.clientY, btn);
      sfx.initAmbiance();
    });
    const endPress = () => btn.classList.remove('btn-pressed');
    btn.addEventListener('pointerup', endPress);
    btn.addEventListener('pointerleave', endPress);
    btn.addEventListener('pointercancel', endPress);
  });

  const vicBanner = document.getElementById('victory-banner');
  if (vicBanner) {
    vicBanner.addEventListener('click', () => {
      vicBanner.classList.add('hidden');
      clearTimeout(victoryBannerTimer);
    });
  }

  const eqFrame = document.getElementById('equipment-frame');
  if (eqFrame) {
    eqFrame.addEventListener('click', () => {
      sfx.portal();
      updateHUD();
      document.getElementById('forge-modal').classList.remove('hidden');
    });
  }

  const bountyEl = document.getElementById('bounty-tracker');
  if (bountyEl) {
    bountyEl.addEventListener('click', () => {
      sfx.shard();
      const idx = state.bountyIndex || 0;
      if (idx < bountyQuests.length) {
        const q = bountyQuests[idx];
        showToast('OBJETIVO DE CACERÍA', `${q.title}: Dirígete a (${q.targetCoords.x}, ${q.targetCoords.z}) • ${document.getElementById('bounty-distance')?.textContent || ''}`);
      }
    });
  }
}

function appendChat(author, text) {
  const box = document.getElementById('chat-messages');
  // textContent (never innerHTML) so chat messages from other players cannot inject HTML/JS (XSS).
  const d = document.createElement('div');
  const b = document.createElement('b');
  b.style.color = '#ffe2a6';
  b.textContent = `${author}:`;
  d.appendChild(b);
  d.appendChild(document.createTextNode(` ${text}`));
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

// Star Map & Hangar Modal
const starmapModal = document.getElementById('starmap-modal');
document.getElementById('btn-starmap').addEventListener('click', () => {
  updateHUD();
  starmapModal.classList.remove('hidden');
});
document.getElementById('btn-close-starmap').addEventListener('click', () => {
  starmapModal.classList.add('hidden');
});

document.querySelectorAll('.attr-card[data-transit]').forEach((card) => {
  card.addEventListener('click', () => {
    starmapModal.classList.add('hidden');
    const dest = card.dataset.transit;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'pay_transit', destination: dest }));
    } else {
      handleOfflineTransit(dest);
    }
  });
});

document.querySelectorAll('.attr-card[data-buy-mount]').forEach((card) => {
  card.addEventListener('click', () => {
    starmapModal.classList.add('hidden');
    requestMountEquipOrBuy(card.dataset.buyMount);
  });
});

document.querySelectorAll('.attr-card[data-action]').forEach((card) => {
  card.addEventListener('click', () => {
    starmapModal.classList.add('hidden');
    const act = card.dataset.action;
    if (act === 'race') {
      requestMountEquipOrBuy('supercar');
      startRingRace();
    } else if (act === 'change_character') {
      state.joined = false;
      state.mountType = 'none';
      playerPos.set(0, 0, 18);
      playerYaw = 0;
      rebuildLocalAvatar();
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('entry-screen').classList.remove('hidden');
    }
  });
});

// Ragnarok Stats & Level 1-100 Skills Modal
const skillsModal = document.getElementById('skills-modal');
document.getElementById('btn-skills').addEventListener('click', () => {
  updateHUD();
  skillsModal.classList.remove('hidden');
});
document.getElementById('btn-close-skills').addEventListener('click', () => {
  skillsModal.classList.add('hidden');
});

document.querySelectorAll('.attr-card[data-stat]').forEach((card) => {
  card.addEventListener('click', () => {
    const stat = card.dataset.stat;
    if ((state.statPoints || 0) <= 0) {
      showToast('SIN PUNTOS DE ATRIBUTO', 'Sube de nivel cazando monstruos o extrayendo nodos (+5 puntos por nivel).');
      return;
    }
    sfx.shard();
    state.statPoints--;
    state.stats[stat] = (state.stats[stat] || 5) + 1;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'allocate_stat', stat }));
    }
    saveLocalState();
    updateHUD();
  });
});

document.querySelectorAll('.attr-card[data-upgrade]').forEach((card) => {
  card.addEventListener('click', () => {
    const skill = card.dataset.upgrade;
    if (state.skillPoints <= 0) {
      showToast('CÓDICE COMPLETO POR AHORA', 'Sube de nivel cazando monstruos o completando misiones.');
      return;
    }
    sfx.levelUp();
    state.skillPoints--;
    state.skills[skill] = (state.skills[skill] || 0) + 1;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'upgrade_skill', skill }));
    }
    saveLocalState();
    updateHUD();
  });
});

// MU Online Chaos Forge & Lineage Society Modal
const forgeModal = document.getElementById('forge-modal');
document.getElementById('btn-forge').addEventListener('click', () => {
  updateHUD();
  forgeModal.classList.remove('hidden');
});
document.getElementById('btn-close-forge').addEventListener('click', () => {
  forgeModal.classList.add('hidden');
});

document.querySelectorAll('.attr-card[data-forge]').forEach((card) => {
  card.addEventListener('click', () => {
    const mode = card.dataset.forge;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'forge_upgrade', mode }));
    } else {
      handleOfflineForgeUpgrade(mode);
    }
  });
});

document.querySelectorAll('.attr-card[data-supply]').forEach((card) => {
  card.addEventListener('click', () => {
    const item = card.dataset.supply;
    sfx.shard();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'buy_supplies', item }));
    } else {
      handleOfflineBuySupplies(item);
    }
  });
});

document.getElementById('btn-donate-society').addEventListener('click', () => {
  if (state.coins < 300) {
    showToast('CRÉDITOS INSUFICIENTES', 'Necesitas 300 ✦ para donar al Santuario Colectivo.');
    return;
  }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'donate_society' }));
  } else {
    handleOfflineDonateSociety();
  }
});

// Weather / Time of Day Cyclers
document.getElementById('btn-time').addEventListener('click', () => {
  state.weatherIndex = (state.weatherIndex + 1) % WEATHER_PRESETS.length;
  const preset = WEATHER_PRESETS[state.weatherIndex];
  applySunAndAtmosphere(preset.elevation, preset.azimuth, preset.fogColor);
  renderer.toneMappingExposure = preset.exposure;
  sunLight.intensity = preset.lightIntensity;
  showToast('CICLO SOLAR', `Atmósfera: ${preset.name}`);
});

// Ranking & Chat Drawer
document.getElementById('btn-ranking').addEventListener('click', () => {
  document.getElementById('social-drawer').classList.remove('hidden');
});
document.getElementById('btn-close-drawer').addEventListener('click', () => {
  document.getElementById('social-drawer').classList.add('hidden');
});

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = document.getElementById('chat-input');
  const val = inp.value.trim();
  if (!val) return;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'chat', text: val }));
  inp.value = '';
});

// Archon AI Modal
const archonModal = document.getElementById('archon-modal');
const archonReplyBox = document.getElementById('archon-reply-box');

async function openArchonModal() {
  archonModal.classList.remove('hidden');
  await askArchon('iniciar');
}

async function askArchon(msgText) {
  archonReplyBox.textContent = 'Consultando al Arconte Aether...';
  try {
    const r = await fetch('/api/archon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: state.playerId,
        message: msgText,
        trialIndex: state.trialIndex
      })
    });
    const data = await r.json();
    archonReplyBox.textContent = data.reply;
    if (data.solved) {
      state.relics[1] = true;
      sfx.levelUp();
      updateHUD();
    }
  } catch {
    archonReplyBox.textContent = 'Interferencia en el santuario.';
  }
}

document.getElementById('btn-archon').addEventListener('click', () => openArchonModal());
document.getElementById('btn-close-archon').addEventListener('click', () => archonModal.classList.add('hidden'));
document.getElementById('archon-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inp = document.getElementById('archon-input');
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';
  await askArchon(val);
});
document.querySelectorAll('.ans-chip').forEach((c) => {
  c.addEventListener('click', () => askArchon(c.dataset.ans));
});

// 500 CCU Live Simulation Toggle
document.getElementById('btn-crowd').addEventListener('click', async () => {
  state.crowdSimulated = !state.crowdSimulated;
  await fetch('/api/simulate-crowd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCount: state.crowdSimulated ? 500 : 0 })
  });
});

// Photo & Invite Modal
const photoModal = document.getElementById('photo-modal');
document.getElementById('btn-photo').addEventListener('click', () => {
  composer.render();
  const url = renderer.domElement.toDataURL('image/png');
  document.getElementById('photo-preview').src = url;
  document.getElementById('btn-download-photo').href = url;
  const relCount = state.relics.filter(Boolean).length;
  document.getElementById('photo-caption').textContent =
    `NV.${state.level} [+${state.gearLevel || 0}] ${state.playerName} • Reliquias: ${relCount}/3 • ${state.onlineCount} Exploradores Online`;
  photoModal.classList.remove('hidden');
});
document.getElementById('btn-close-photo').addEventListener('click', () => photoModal.classList.add('hidden'));
document.getElementById('btn-copy-link').addEventListener('click', () => {
  navigator.clipboard?.writeText(window.location.origin);
  document.getElementById('btn-copy-link').textContent = 'Copiado ✓';
  setTimeout(() => {
    document.getElementById('btn-copy-link').textContent = 'Copiar Enlace';
  }, 2000);
});

// Live 3D Character Showcase Selector Cards
document.querySelectorAll('#avatar-selector .class-card[data-avatar]').forEach((card) => {
  card.addEventListener('click', () => {
    sfx.playTone(520, 0.08, 'sine', 0.08);
    document.querySelectorAll('#avatar-selector .class-card').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    state.avatarType = card.dataset.avatar;
    document.getElementById('char-display-name').textContent = card.dataset.title || state.avatarType;
    document.getElementById('char-role-tag').textContent = card.dataset.role || 'EXPLORADOR PLANETARIO';
    rebuildLocalAvatar();
  });
});

document.getElementById('custom-glb-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const blobUrl = URL.createObjectURL(file);
  gltfLoader.load(blobUrl, (gltf) => {
    modelCache.set('CustomUpload', gltf);
    state.avatarType = 'CustomUpload';
    document.getElementById('char-display-name').textContent = file.name.replace(/\.(glb|gltf)$/i, '').toUpperCase();
    document.getElementById('char-role-tag').textContent = 'MODELO PERSONALIZADO (.GLB)';
    rebuildLocalAvatar();
  });
});

document.getElementById('btn-start-world').addEventListener('click', async () => {
  sfx.init();
  sfx.initAmbiance();
  sfx.portal();
  initMobileHaptics();
  const inp = document.getElementById('explorer-name-input').value.trim();
  if (inp) state.playerName = inp;

  document.getElementById('entry-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');

  await preloadCoreModels();
  state.joined = true;
  playerYaw = Math.PI;
  rebuildLocalAvatar();

  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      t: 'join',
      name: state.playerName,
      avatar: state.avatarType === 'CustomUpload' ? 'Vanguard' : state.avatarType
    }));
  } else {
    activateSovereignOfflineMode();
  }
  saveLocalState();
  updateHUD();
});

// ============================================================================
// MAIN RENDER, COLLISION, MONSTER AI & INTERPLANETARY SIMULATION LOOP
// ============================================================================
const clock = new THREE.Clock();
let lastNetSend = 0;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.1);
  const isHitStop = combatFeedback.isHitStopped();
  const dt = isHitStop ? rawDt * 0.12 : rawDt;
  const elapsed = clock.getElapsedTime();

  oceanWater.material.uniforms['time'].value += dt * 0.6;

  for (const body of celestialBodies) {
    body.rotation.y += dt * 0.025;
  }

  for (const m of globalEnvMixers) m.update(dt);
  for (const b of animatedFlock) {
    b.angle += dt * b.speed;
    b.mesh.position.set(
      Math.cos(b.angle) * b.radius,
      b.height + Math.sin(elapsed * 1.5 + b.angle) * 1.2,
      Math.sin(b.angle) * b.radius
    );
    b.mesh.rotation.y = -b.angle;
    if (b.mixer) b.mixer.update(dt);
  }

  for (const s of animatedNavalFleet) {
    s.angle += dt * s.speed;
    s.mesh.position.set(
      Math.cos(s.angle) * s.radius,
      -0.25 + Math.sin(elapsed * 2.1 + s.angle * 3.0) * 0.16,
      Math.sin(s.angle) * s.radius
    );
    s.mesh.rotation.y = -s.angle;
    s.mesh.rotation.z = Math.sin(elapsed * 1.8 + s.angle) * 0.045;
    s.mesh.rotation.x = Math.cos(elapsed * 1.6 + s.angle) * 0.035;
  }

  for (const beam of lighthouseBeams) {
    beam.rotation.y += dt * 0.85;
  }

  updateWorldArchitectureAnimations(animatedWorldProps, dt, elapsed);

  if (aetherEmbers) {
    aetherEmbers.rotation.y += dt * 0.02;
    aetherEmbers.position.y = Math.sin(elapsed * 0.8) * 0.35;
  }

  for (const r of animatedRelics) {
    if (r.mesh) {
      r.mesh.rotation.y += dt * 0.85;
      r.mesh.position.y = r.baseY + Math.sin(elapsed * 2.0) * 0.3;
    }
  }

  for (const [, o] of orbMeshes) {
    o.mesh.rotation.y += dt * 1.4;
  }

  // Update Floating Combat Numbers
  for (let i = floatingCombatTexts.length - 1; i >= 0; i--) {
    const ft = floatingCombatTexts[i];
    ft.age += dt;
    ft.sprite.position.y += dt * 2.2;
    ft.mat.opacity = Math.max(0, 1.0 - ft.age * 0.9);
    if (ft.age >= 1.1) {
      scene.remove(ft.sprite);
      floatingCombatTexts.splice(i, 1);
    }
  }

  // Distance-cull 3D wayfinder plaques
  for (const wp of wayfinderPlaques) {
    const dist = playerPos.distanceTo(wp.pos);
    if (dist > wp.maxDist) {
      wp.sprite.visible = false;
    } else {
      wp.sprite.visible = true;
      wp.mat.opacity = Math.min(0.95, Math.max(0.0, (wp.maxDist - dist) / 14));
    }
  }

  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const sw = activeShockwaves[i];
    sw.scale += dt * 16;
    sw.opacity -= dt * 1.6;
    sw.mesh.scale.set(sw.scale, sw.scale, 1);
    sw.mesh.material.opacity = Math.max(0, sw.opacity);
    if (sw.opacity <= 0) {
      scene.remove(sw.mesh);
      activeShockwaves.splice(i, 1);
    }
  }

  if (state.joined && localAvatar) {
    let moveF = 0;
    let moveR = 0;

    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) moveF += 1;
    if (keysPressed['KeyS'] || keysPressed['ArrowDown']) moveF -= 1;
    if (keysPressed['KeyD'] || keysPressed['ArrowRight']) moveR += 1;
    if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) moveR -= 1;

    if (joyInput.active) {
      moveF -= joyInput.y;
      moveR += joyInput.x;
    }

    const len = Math.hypot(moveF, moveR);
    const agiSpeedBonus = (state.stats?.agi || 5) * 0.008;
    const wingsSpeedBonus = (state.wingsTier || 0) * 0.08;
    const velocityMultiplier = 1 + (state.skills?.velocity || 0) * 0.06 + agiSpeedBonus + wingsSpeedBonus;

    let baseSpeed = (keysPressed['ShiftLeft'] ? 15 : 10.5) * velocityMultiplier;
    if (state.mountType === 'horse') baseSpeed = 20.0 * velocityMultiplier;
    if (state.mountType === 'ship') baseSpeed = 24.5 * velocityMultiplier;
    if (state.mountType === 'supercar') baseSpeed = 29.0 * velocityMultiplier;
    if (state.mountType === 'mythic_bird') baseSpeed = 26.0 * velocityMultiplier;
    if (state.mountType === 'jet') baseSpeed = 52.0 * velocityMultiplier;
    if (state.mountType === 'starship') baseSpeed = 95.0 * velocityMultiplier;

    let currentAnim = 'Idle';
    const isFlyingMount = ['mythic_bird', 'jet', 'starship'].includes(state.mountType);

    prevPlayerYaw = playerYaw;

    if (len > 0.08) {
      emoteTimer = 0;
      const nf = moveF / Math.max(1, len);
      const nr = moveR / Math.max(1, len);

      const forwardDir = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
      const rightDir = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

      const moveVec = new THREE.Vector3()
        .addScaledVector(forwardDir, nf)
        .addScaledVector(rightDir, nr);

      playerPos.addScaledVector(moveVec, baseSpeed * dt);
      playerYaw = Math.atan2(moveVec.x, moveVec.z);
      currentAnim = len > 0.6 ? 'Run' : 'Walk';
    } else if (emoteTimer > 0) {
      emoteTimer -= dt;
      currentAnim = 'Dance';
    }

    const colRadius = state.mountType === 'supercar' ? 1.4 : 0.85;
    resolveHorizontalCollisions(playerPos, colRadius);

    const groundY = getLocalGroundHeight(playerPos.x, playerPos.z);

    if (isFlyingMount) {
      const climbSpeed = state.mountType === 'starship' ? 68 : (state.mountType === 'jet' ? 38 : 18);
      if (ascendHeld) {
        playerPos.y += climbSpeed * dt;
      } else if (descendHeld) {
        playerPos.y -= climbSpeed * dt;
      }
      if (playerPos.y <= groundY) {
        playerPos.y = groundY;
        isGrounded = true;
      } else {
        isGrounded = false;
      }
    } else {
      const gravity = playerPos.y >= 250 ? 9.5 : 26.0;
      if (!isGrounded || playerVel.y > 0 || playerPos.y > groundY) {
        playerPos.y += playerVel.y * dt;
        playerVel.y -= gravity * dt;
        if (playerPos.y <= groundY) {
          playerPos.y = groundY;
          playerVel.y = 0;
          isGrounded = true;
        } else {
          currentAnim = 'Jump';
        }
      }
    }

    if (localAvatar.vehicleBankGroup) {
      let yawDelta = playerYaw - prevPlayerYaw;
      if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;

      const isSailing = state.mountType === 'ship' || (!isFlyingMount && playerPos.y <= -0.15);
      const targetRoll = isFlyingMount
        ? THREE.MathUtils.clamp(-yawDelta * 4.5, -0.45, 0.45)
        : isSailing
          ? Math.sin(elapsed * 2.2) * 0.055 + THREE.MathUtils.clamp(-yawDelta * 1.8, -0.15, 0.15)
          : 0;
      const targetPitch = isFlyingMount
        ? (ascendHeld ? -0.26 : (descendHeld ? 0.26 : 0))
        : isSailing
          ? Math.cos(elapsed * 1.9) * 0.042
          : 0;

      localAvatar.vehicleBankGroup.rotation.z = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.z, targetRoll, 0.15);
      localAvatar.vehicleBankGroup.rotation.x = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.x, targetPitch, 0.15);
    }

    sky.visible = playerPos.y < 135;
    scene.fog.density = playerPos.y < 135 ? 0.0018 : 0.00012;

    const waveBobY = state.mountType === 'ship' ? Math.sin(elapsed * 2.3) * 0.16 : 0;
    localAvatar.root.position.set(playerPos.x, playerPos.y + waveBobY, playerPos.z);
    localAvatar.root.rotation.y = playerYaw;
    updateAvatarAnimationAndPose(localAvatar, dt, currentAnim);
    if (localAvatar.mountMixer && len > 0.08) localAvatar.mountMixer.update(dt * 1.3);

    proCamera.yaw = cameraYaw;
    proCamera.pitch = cameraPitch;
    proCamera.update(dt, playerPos, state.mountType, combatFeedback.getShakeOffsets());

    checkInteractions();
    checkOrbPickups();
    updateRingRace();
    renderRadarMinimap();

    // Procedural Web Audio Ambiance, Boss Roar & Bounty Navigation
    const isMoving = len > 0.08 || ascendHeld || descendHeld;
    sfx.updateAmbiance({
      playerPos,
      mountType: state.mountType,
      isMoving,
      speed: baseSpeed,
      isFlyingMount,
      dt
    });
    checkBossProximityRoar();
    updateBountyDistance();
    checkBountyObjective('move');

    // AAA Combat Feedback, Boss Telegraphs & Orbital Flight Systems Update
    combatFeedback.update(dt, elapsed);
    bossTelegraphs.update(dt, playerPos, (dmgEvent) => {
      const vit = state.stats?.vit || 5;
      const gear = state.gearLevel || 0;
      const def = Math.min(0.70, (vit * 0.008) + (gear * 0.025));
      const finalDmg = Math.max(8, Math.round(dmgEvent.damage * (1 - def)));
      state.hp = Math.max(1, (state.hp || state.maxHp) - finalDmg);
      if (dmgEvent.knockImpulse) {
        playerPos.add(dmgEvent.knockImpulse.clone().multiplyScalar(0.4));
      }
      spawnFloatingCombatText(playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)), `¡${dmgEvent.attackName}! -${finalDmg}`, true, '#ff3344');
      const isDragonAtk = Boolean(dmgEvent.attackName?.includes('LEVIATÁN') || dmgEvent.attackName?.includes('DRAGÓN') || dmgEvent.attackName?.includes('FUEGO'));
      sfx.bossRoar({ isDragon: isDragonAtk });
      sfx.hitDamage();
      updateHUD();
      saveLocalState();
    });
    orbitalFX.update(dt, playerPos, playerYaw, state.mountType, state.joined);

    const now = performance.now();
    if (ws && ws.readyState === 1 && now - lastNetSend > 66) {
      lastNetSend = now;
      ws.send(JSON.stringify({
        t: 'move',
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z,
        ry: playerYaw,
        anim: currentAnim,
        mount: state.mountType
      }));
    }
  } else {
    if (localAvatar) {
      localAvatar.root.position.set(0, 0.18, 18);
      localAvatar.root.rotation.y = Math.sin(elapsed * 0.5) * 0.32;
      updateAvatarAnimationAndPose(localAvatar, dt, 'Idle');
    }
    const camX = Math.sin(elapsed * 0.22) * 1.1;
    camera.position.set(camX, 2.25, 22.6);
    camera.lookAt(0, 1.75, 18);
  }

  for (const [, rem] of remotePlayers) {
    rem.avatarObj.root.position.lerp(rem.targetPos, 0.18);
    rem.avatarObj.root.rotation.y = rem.targetRy;
    updateAvatarAnimationAndPose(rem.avatarObj, dt, rem.anim);
    if (rem.avatarObj.mountMixer) rem.avatarObj.mountMixer.update(dt);
  }

  if (!ws || ws.readyState !== 1) {
    updateLocalMonsters(dt);
  }

  for (const [, mob] of monsterEntities) {
    mob.root.position.lerp(mob.targetPos, 0.15);
    mob.root.rotation.y = mob.targetRy;
    if (mob.mixer) mob.mixer.update(dt);
  }

  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

loadLocalState();
const inpExpl = document.getElementById('explorer-name-input');
if (inpExpl && state.playerName) {
  inpExpl.value = state.playerName;
}

initMobileHaptics();
updateHUD();

preloadCoreModels().then(() => {
  rebuildLocalAvatar();
});
connectWebSocket();
animate();
