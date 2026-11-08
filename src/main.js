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

// ============================================================================
// THE QUEST // INTERPLANETARY PHOTOREALISTIC MMORPG ENGINE (LEVEL 1-100)
// Seamless Earth -> Stratosphere -> Deep Space -> Moon -> Mars -> Aurelia
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
  skills: {
    velocity: 0,
    aetherPower: 0,
    vitality: 0,
    cosmicMastery: 0
  },
  unlockedMounts: ['none', 'horse'],
  mountType: 'none', // 'none' | 'horse' | 'supercar' | 'mythic_bird' | 'jet' | 'starship'
  weatherIndex: 0,
  hp: 100,
  maxHp: 100,
  coins: 500,
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

// Seamless Planetary & Lunar Coordinates in the Unified Solar System
const PLANETARY_DESTINATIONS = {
  earth_sanctuary: {
    name: 'PLANETA TIERRA • SANTUARIO',
    pos: new THREE.Vector3(0, 0, 18),
    surfaceY: 0
  },
  moon_base: {
    name: 'LA LUNA (SELENE) • BASE TRANQUILIDAD',
    pos: new THREE.Vector3(0, 260, -680),
    surfaceY: 260
  },
  mars_colony: {
    name: 'PLANETA MARTE • COLONIA ARES PRIME',
    pos: new THREE.Vector3(-620, 340, -1100),
    surfaceY: 340
  },
  aurelia_ring: {
    name: 'PLANETA AURELIA • ANILLO ORBITAL',
    pos: new THREE.Vector3(680, 440, -1350),
    surfaceY: 440
  }
};

const WEATHER_PRESETS = [
  { name: 'Atardecer Imperial', elevation: 5.5, azimuth: 165, fogColor: 0xd4a688, exposure: 0.86, lightIntensity: 3.2 },
  { name: 'Sol Cenital', elevation: 42, azimuth: 140, fogColor: 0xbfd8eb, exposure: 0.92, lightIntensity: 3.8 },
  { name: 'Noche Estrellada', elevation: -5, azimuth: 200, fogColor: 0x060b16, exposure: 0.76, lightIntensity: 1.2 }
];

// Subtle Luxury Web Audio Synthesizer
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }
  playTone(freq = 440, duration = 0.16, type = 'sine', gainVal = 0.09) {
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
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }
  shard() {
    this.playTone(784, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(1174.6, 0.2, 'sine', 0.1), 75);
  }
  portal() {
    this.playTone(293.6, 0.22, 'triangle', 0.11);
    setTimeout(() => this.playTone(587.3, 0.32, 'sine', 0.11), 90);
  }
  strike() {
    this.playTone(165, 0.25, 'sawtooth', 0.13);
    setTimeout(() => this.playTone(110, 0.28, 'triangle', 0.11), 60);
  }
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.35, 'triangle', 0.15), idx * 95);
    });
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
scene.fog = new THREE.FogExp2(0xd4a688, 0.0022);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 4500);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,
  0.55,
  0.84
);
composer.addPass(bloomPass);

// Atmospheric Sky (Fades out smoothly when ascending above y=120m into Deep Space!)
const sky = new Sky();
sky.scale.setScalar(3800);
scene.add(sky);

const sunPosition = new THREE.Vector3();
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 8;
skyUniforms['rayleigh'].value = 2.4;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.82;

// Deep Space Starfield & Nebula (Visible in high altitude, night & space)
const starCount = 3500;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 3600;
  starPos[i + 1] = 80 + Math.random() * 1800;
  starPos[i + 2] = (Math.random() - 0.5) * 3600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const spaceStars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0xfff4e0, size: 2.2, transparent: true, opacity: 0.9 })
);
scene.add(spaceStars);

const sunLight = new THREE.DirectionalLight(0xfff1dc, 3.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 220;
const shadowBound = 65;
sunLight.shadow.camera.left = -shadowBound;
sunLight.shadow.camera.right = shadowBound;
sunLight.shadow.camera.top = shadowBound;
sunLight.shadow.camera.bottom = -shadowBound;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x3b4859, 0.95);
scene.add(hemiLight);

// Spotlight for Live Character Showcase Pedestal
const showcaseSpot = new THREE.SpotLight(0xffe4b5, 4.5, 25, Math.PI / 4, 0.5);
showcaseSpot.position.set(0, 7.5, 23);
showcaseSpot.target.position.set(0, 1.2, 18);
scene.add(showcaseSpot);
scene.add(showcaseSpot.target);

// Load Real HDRI Environment Map
const rgbeLoader = new RGBELoader();
rgbeLoader.load('/textures/venice_sunset_1k.hdr', (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdrTexture;
  scene.environmentIntensity = 0.95;
});

// Animated Photorealistic Ocean Water on Planet Earth
const texLoader = new THREE.TextureLoader();
const waterNormals = texLoader.load('/textures/waternormals.jpg', (tex) => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});

const oceanWater = new Water(new THREE.PlaneGeometry(3400, 3400), {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffd29c,
  waterColor: 0x0a2e36,
  distortionScale: 3.0,
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
// REAL PBR MATERIALS & SEAMLESS SOLAR SYSTEM BUILDER (EARTH, MOON, MARS, AURELIA)
// ============================================================================
const brickDiffuse = texLoader.load('/textures/brick_diffuse.jpg');
const brickRoughness = texLoader.load('/textures/brick_roughness.jpg');
const brickBump = texLoader.load('/textures/brick_bump.jpg');
[brickDiffuse, brickRoughness, brickBump].forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(32, 32);
});
brickDiffuse.colorSpace = THREE.SRGBColorSpace;

const moonTex = texLoader.load('/textures/planets/moon_1024.jpg');
moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping;
moonTex.colorSpace = THREE.SRGBColorSpace;

const earthTex = texLoader.load('/textures/planets/earth_atmos_2048.jpg');
earthTex.colorSpace = THREE.SRGBColorSpace;
const earthCloudsTex = texLoader.load('/textures/planets/earth_clouds_1024.png');

const stoneCourtyardMat = new THREE.MeshStandardMaterial({
  map: brickDiffuse,
  roughnessMap: brickRoughness,
  bumpMap: brickBump,
  bumpScale: 0.08,
  roughness: 0.7,
  metalness: 0.08
});

const polishedMarbleMat = new THREE.MeshStandardMaterial({
  color: 0xeae4d7,
  roughness: 0.16,
  metalness: 0.25,
  bumpMap: brickBump,
  bumpScale: 0.015
});

const obsidianMat = new THREE.MeshStandardMaterial({
  color: 0x161920,
  roughness: 0.12,
  metalness: 0.88,
  bumpMap: brickBump,
  bumpScale: 0.025
});

const ancientGoldMat = new THREE.MeshStandardMaterial({
  color: 0xffd278,
  roughness: 0.12,
  metalness: 0.96,
  emissive: 0x553800,
  emissiveIntensity: 0.35
});

const lunarSurfaceMat = new THREE.MeshStandardMaterial({
  map: moonTex,
  bumpMap: moonTex,
  bumpScale: 0.12,
  roughness: 0.88,
  metalness: 0.05
});

const martianSurfaceMat = new THREE.MeshStandardMaterial({
  map: moonTex,
  color: 0xd96b43,
  bumpMap: brickBump,
  bumpScale: 0.1,
  roughness: 0.82,
  metalness: 0.12
});

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const animatedRelics = [];
const interactiveAttractions = [];
const raceRingPositions = [];
const raceRingMeshes = [];
const animatedFlock = [];
const celestialBodies = [];

function createElegantWorldLabel(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(8, 12, 20, 0.78)';
  ctx.beginPath();
  ctx.roundRect(16, 16, 736, 160, 28);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(229, 189, 115, 0.75)';
  ctx.stroke();

  ctx.fillStyle = '#ffe1a3';
  ctx.font = '700 32px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 384, 80);

  ctx.fillStyle = '#e5e0d5';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 384, 132);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(7.8, 1.95, 1);
  return sprite;
}

function buildUnifiedPlanetaryUniverse() {
  // ==========================================================================
  // 1. PLANET EARTH CONTINENT (Y = 0m): SANCTUARY, CANYON, ORACLE & CITADEL
  // ==========================================================================
  const earthContinent = new THREE.Mesh(new THREE.CylinderGeometry(165, 180, 2.8, 64), stoneCourtyardMat);
  earthContinent.position.y = -1.4;
  earthContinent.receiveShadow = true;
  worldGroup.add(earthContinent);

  // Showcase Pedestal at Spawn (0, 0, 18)
  const spawnPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.24, 32), obsidianMat);
  spawnPedestal.position.set(0, 0.12, 18);
  spawnPedestal.receiveShadow = true;
  worldGroup.add(spawnPedestal);

  const spawnRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.05, 16, 48), ancientGoldMat);
  spawnRing.rotation.x = Math.PI / 2;
  spawnRing.position.set(0, 0.24, 18);
  worldGroup.add(spawnRing);

  // Outer Marble Colonnade Ring
  const pillarGeo = new THREE.CylinderGeometry(1.05, 1.25, 11.5, 24);
  const capGeo = new THREE.BoxGeometry(2.9, 0.8, 2.9);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const r = 56;
    const pillar = new THREE.Mesh(pillarGeo, polishedMarbleMat);
    pillar.position.set(Math.cos(angle) * r, 5.75, Math.sin(angle) * r);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    worldGroup.add(pillar);

    const cap = new THREE.Mesh(capGeo, polishedMarbleMat);
    cap.position.set(Math.cos(angle) * r, 11.7, Math.sin(angle) * r);
    cap.castShadow = true;
    worldGroup.add(cap);
  }

  // Central Altar of Ascension (0, 0, 0)
  const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 1.6, 32), obsidianMat);
  altarBase.position.set(0, 0.8, 0);
  altarBase.receiveShadow = true;
  worldGroup.add(altarBase);

  const ascensionSphere = new THREE.Mesh(new THREE.TorusKnotGeometry(1.45, 0.35, 128, 32), ancientGoldMat);
  ascensionSphere.position.set(0, 4.6, 0);
  ascensionSphere.castShadow = true;
  worldGroup.add(ascensionSphere);
  animatedRelics.push({ mesh: ascensionSphere, baseY: 4.6 });

  const centerLabel = createElegantWorldLabel('ALTAR DE LA ASCENSIÓN (TIERRA)', 'Abre la Carta Estelar [🪐] o vuela hacia la Luna y Marte');
  centerLabel.position.set(0, 8.2, 0);
  worldGroup.add(centerLabel);

  // Northern District: Temple of the AI Archon (0, 0, -45)
  const oraclePedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.8, 2.2, 32), obsidianMat);
  oraclePedestal.position.set(0, 1.1, -45);
  worldGroup.add(oraclePedestal);

  const oracleLabel = createElegantWorldLabel('🔮 TEMPLO DEL ORÁCULO (ARCONTE IA)', 'Resuelve el enigma para despertar la Reliquia de la Mente (+500 XP)');
  oracleLabel.position.set(0, 8.8, -45);
  worldGroup.add(oracleLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 0, -45),
    radius: 8.5,
    label: '🔮 Hablar con el Arconte IA (Reliquia de la Mente)',
    action: () => openArchonModal()
  });

  // Western District: Canyon of the Horizon Relic (-75, 0, -25)
  const horizonRelicMesh = new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 2), ancientGoldMat);
  horizonRelicMesh.position.set(-75, 3.8, -25);
  worldGroup.add(horizonRelicMesh);
  animatedRelics.push({ mesh: horizonRelicMesh, baseY: 3.8 });

  const canyonLabel = createElegantWorldLabel('❖ RELIQUIA DEL HORIZONTE', 'Acércate y presiona [E] o 🖐️ para despertar la Reliquia (+800 XP)');
  canyonLabel.position.set(-75, 7.5, -25);
  worldGroup.add(canyonLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(-75, 0, -25),
    radius: 7.5,
    label: '❖ Reclamar Reliquia del Horizonte (+1,200 ✦ / +800 XP)',
    action: () => claimRelic(0)
  });

  // Eastern District: Obsidian Colosseum & Valor Relic (75, 0, -25)
  const valorRelicMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), ancientGoldMat);
  valorRelicMesh.position.set(75, 3.8, -25);
  worldGroup.add(valorRelicMesh);
  animatedRelics.push({ mesh: valorRelicMesh, baseY: 3.8 });

  const citadelLabel = createElegantWorldLabel('⚔️ COLISEO DE OBSIDIANA (RELIQUIA DEL VALOR)', 'Usa tu Pulso [⚡] o presiona [🖐️] para conquistar el Valor (+800 XP)');
  citadelLabel.position.set(75, 7.5, -25);
  worldGroup.add(citadelLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(75, 0, -25),
    radius: 7.5,
    label: '⚔️ Conquistar Reliquia del Valor (+1,200 ✦ / +800 XP)',
    action: () => {
      triggerAetherStrike();
      claimRelic(2);
    }
  });

  // Spaceport Launchpad (0, 0, -88) for Starship & Jet Takeoff
  const launchpad = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 1.2, 32), obsidianMat);
  launchpad.position.set(0, 0.6, -88);
  worldGroup.add(launchpad);

  const padRing = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.25, 16, 48), ancientGoldMat);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.set(0, 1.25, -88);
  worldGroup.add(padRing);

  const padLabel = createElegantWorldLabel('🚀 PUERTO ESPACIAL INTERPLANETARIO', 'Despega hacia la Luna (Alt: 260m) o usa la Carta Estelar [🪐]');
  padLabel.position.set(0, 7.5, -88);
  worldGroup.add(padLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 0, -88),
    radius: 12.0,
    label: '🪐 Abrir Carta Estelar / Despegue Interplanetario',
    action: () => document.getElementById('starmap-modal').classList.remove('hidden')
  });

  // 8 Golden Speed Trial Checkpoints
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 44;
    const pos = new THREE.Vector3(Math.cos(angle) * r, 2.8, Math.sin(angle) * r);
    raceRingPositions.push(pos);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.18, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0xffd278, emissive: 0xff9900, emissiveIntensity: 1.2 })
    );
    ringMesh.position.copy(pos);
    ringMesh.rotation.y = -angle;
    ringMesh.visible = false;
    worldGroup.add(ringMesh);
    raceRingMeshes.push(ringMesh);
  }

  // ==========================================================================
  // 2. THE MOON (SELENE) IN ORBIT (Center: 0, 260, -680)
  // ==========================================================================
  const moonSphere = new THREE.Mesh(new THREE.SphereGeometry(68, 48, 48), lunarSurfaceMat);
  moonSphere.position.set(0, 192, -680); // Top landing plateau sits right at y = 260!
  worldGroup.add(moonSphere);
  celestialBodies.push(moonSphere);

  const moonLandingPad = new THREE.Mesh(new THREE.CylinderGeometry(48, 52, 2.5, 48), lunarSurfaceMat);
  moonLandingPad.position.set(0, 259, -680);
  moonLandingPad.receiveShadow = true;
  worldGroup.add(moonLandingPad);

  const moonDome = new THREE.Mesh(
    new THREE.SphereGeometry(14, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35, metalness: 0.9, roughness: 0.1 })
  );
  moonDome.position.set(0, 260, -695);
  worldGroup.add(moonDome);

  const moonLabel = createElegantWorldLabel('🌕 BASE LUNAR TRANQUILIDAD (SELENE)', 'Gravedad Lunar • Extrae Helio-3 (+180 ✦ / +120 XP) o regresa a la Tierra [🪐]');
  moonLabel.position.set(0, 268, -680);
  worldGroup.add(moonLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 260, -680),
    radius: 10.0,
    label: '🌕 Extraer Núcleo de Helio-3 Lunar (+350 ✦ / +400 XP)',
    action: () => rewardAttraction('Extracción Lunar de Helio-3', 350, 400)
  });

  // ==========================================================================
  // 3. PLANET MARS (ARES PRIME) IN DEEP SPACE (Center: -620, 340, -1100)
  // ==========================================================================
  const marsSphere = new THREE.Mesh(new THREE.SphereGeometry(95, 48, 48), martianSurfaceMat);
  marsSphere.position.set(-620, 245, -1100); // Top plateau at y = 340
  worldGroup.add(marsSphere);
  celestialBodies.push(marsSphere);

  const marsPlateau = new THREE.Mesh(new THREE.CylinderGeometry(58, 64, 3.0, 48), martianSurfaceMat);
  marsPlateau.position.set(-620, 339, -1100);
  worldGroup.add(marsPlateau);

  const marsLabel = createElegantWorldLabel('🔴 PLANETA MARTE // COLONIA ARES PRIME', 'Cosecha Cristales Kyber (+320 ✦ / +220 XP) y activa el Reactor Marciano');
  marsLabel.position.set(-620, 349, -1100);
  worldGroup.add(marsLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(-620, 340, -1100),
    radius: 12.0,
    label: '🔴 Cosechar Reactor Marciano de Ares Prime (+500 ✦ / +600 XP)',
    action: () => rewardAttraction('Reactor de Marte Ares Prime', 500, 600)
  });

  // ==========================================================================
  // 4. RINGED PLANET AURELIA (Center: 680, 440, -1350)
  // ==========================================================================
  const aureliaSphere = new THREE.Mesh(
    new THREE.SphereGeometry(115, 48, 48),
    new THREE.MeshStandardMaterial({ map: earthTex, color: 0x99d8ff, roughness: 0.4, metalness: 0.3 })
  );
  aureliaSphere.position.set(680, 325, -1350); // Top orbital platform at y = 440
  worldGroup.add(aureliaSphere);
  celestialBodies.push(aureliaSphere);

  const planetaryRings = new THREE.Mesh(
    new THREE.RingGeometry(145, 230, 64),
    new THREE.MeshStandardMaterial({ color: 0xffe1a3, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
  );
  planetaryRings.rotation.x = Math.PI / 2.2;
  planetaryRings.position.set(680, 325, -1350);
  worldGroup.add(planetaryRings);

  const aureliaPlatform = new THREE.Mesh(new THREE.CylinderGeometry(62, 66, 2.5, 48), polishedMarbleMat);
  aureliaPlatform.position.set(680, 439, -1350);
  worldGroup.add(aureliaPlatform);

  const aureliaLabel = createElegantWorldLabel('🪐 SANTUARIO ORBITAL DE AURELIA', 'El confín del sistema • Nodos de Éter Puro (+500 ✦ / +380 XP)');
  aureliaLabel.position.set(680, 449, -1350);
  worldGroup.add(aureliaLabel);

  interactiveAttractions.push({
    position: new THREE.Vector3(680, 440, -1350),
    radius: 12.0,
    label: '🪐 Canalizar Matriz Orbital de Aurelia (+750 ✦ / +900 XP)',
    action: () => rewardAttraction('Matriz Orbital de Aurelia', 750, 900)
  });

  // Giant Globe of Planet Earth visible when looking back from the Moon/Space!
  const earthFromSpaceGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(140, 48, 48),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.5, metalness: 0.1 })
  );
  earthFromSpaceGlobe.position.set(0, -165, 0);
  worldGroup.add(earthFromSpaceGlobe);
}

buildUnifiedPlanetaryUniverse();

// ============================================================================
// DRACO + GLTF ASSET LOADER: HUMANS, VEHICLES, MYTHIC BIRD, JET & STARSHIP
// ============================================================================
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();
const globalEnvMixers = [];

function buildRetargetedClipsForModel(targetRoot, sourceClips) {
  if (!sourceClips || sourceClips.length === 0) return [];
  const nodeNames = new Set();
  targetRoot.traverse((n) => {
    if (n.name) nodeNames.add(n.name);
  });
  const usesMixamoPrefix = Array.from(nodeNames).some((n) => n.startsWith('mixamorig'));

  return sourceClips.map((clip) => {
    const cloned = clip.clone();
    cloned.tracks.forEach((track) => {
      if (!usesMixamoPrefix && track.name.startsWith('mixamorig:')) {
        track.name = track.name.replace('mixamorig:', '');
      }
    });
    return cloned;
  });
}

let coreModelsLoaded = false;
async function preloadCoreModels() {
  if (coreModelsLoaded) return;
  const coreFiles = [
    { key: 'Soldier', url: '/models/Soldier.glb' },
    { key: 'Michelle', url: '/models/Michelle.glb' },
    { key: 'Xbot', url: '/models/Xbot.glb' },
    { key: 'ReadyPlayerMe', url: '/models/readyplayer.me.glb' },
    { key: 'Horse', url: '/models/Horse.glb' },
    { key: 'Ferrari', url: '/models/ferrari.glb' },
    { key: 'Stork', url: '/models/Stork.glb' },
    { key: 'Parrot', url: '/models/Parrot.glb' },
    { key: 'Flamingo', url: '/models/Flamingo.glb' },
    { key: 'DamagedHelmet', url: '/models/DamagedHelmet.glb' },
    { key: 'DungeonWarkarma', url: '/models/dungeon_warkarma.glb' },
    { key: 'VeniceMask', url: '/models/venice_mask.glb' },
    { key: 'PrimaryIonDrive', url: '/models/PrimaryIonDrive.glb' },
    { key: 'LittlestTokyo', url: '/models/LittlestTokyo.glb' }
  ];

  await Promise.all(
    coreFiles.slice(0, 9).map(
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

  coreFiles.slice(9).forEach((f) => {
    gltfLoader.load(
      f.url,
      (gltf) => {
        modelCache.set(f.key, gltf);
        populateWorldAttractionsFromCache();
      },
      undefined,
      () => {}
    );
  });
}

const populatedLandmarks = new Set();
function populateWorldAttractionsFromCache() {
  if (modelCache.has('DamagedHelmet') && !populatedLandmarks.has('DamagedHelmet')) {
    populatedLandmarks.add('DamagedHelmet');
    const statue = modelCache.get('DamagedHelmet').scene.clone();
    statue.scale.set(2.4, 2.4, 2.4);
    statue.position.set(0, 4.4, -45);
    worldGroup.add(statue);
    animatedRelics.push({ mesh: statue, baseY: 4.4 });
  }

  if (modelCache.has('Ferrari') && !populatedLandmarks.has('FerrariPaddock')) {
    populatedLandmarks.add('FerrariPaddock');
    const car = modelCache.get('Ferrari').scene.clone();
    car.scale.set(1.25, 1.25, 1.25);
    car.position.set(20, 0, 14);
    car.rotation.y = -0.6;
    worldGroup.add(car);

    const carLabel = createElegantWorldLabel('🏎️ PADDOCK IMPERIAL (SUPERCAR GT)', 'Acércate y presiona [E] para conducir o iniciar carrera');
    carLabel.position.set(20, 4.2, 14);
    worldGroup.add(carLabel);

    interactiveAttractions.push({
      position: new THREE.Vector3(20, 0, 14),
      radius: 5.5,
      label: '🏎️ Conducir Supercar GT e Iniciar Circuito (+300 ✦ / +350 XP)',
      action: () => {
        requestMountEquipOrBuy('supercar');
        startRingRace();
      }
    });
  }

  if (modelCache.has('Horse') && !populatedLandmarks.has('HorseStables')) {
    populatedLandmarks.add('HorseStables');
    const horse = modelCache.get('Horse').scene.clone();
    horse.scale.set(0.015, 0.015, 0.015);
    horse.position.set(-20, 0, 14);
    horse.rotation.y = 0.6;
    worldGroup.add(horse);

    const horseLabel = createElegantWorldLabel('🐎 ESTABLOS REALES (CORCEL)', 'Montura gratuita • Presiona [E] o el botón 🐎 para cabalgar');
    horseLabel.position.set(-20, 4.2, 14);
    worldGroup.add(horseLabel);

    interactiveAttractions.push({
      position: new THREE.Vector3(-20, 0, 14),
      radius: 5.5,
      label: '🐎 Cabalgar en el Corcel Imperial',
      action: () => requestMountEquipOrBuy('horse')
    });
  }

  if (modelCache.has('DungeonWarkarma') && !populatedLandmarks.has('DungeonWarkarma')) {
    populatedLandmarks.add('DungeonWarkarma');
    const dungeon = modelCache.get('DungeonWarkarma').scene.clone();
    dungeon.scale.set(2.2, 2.2, 2.2);
    dungeon.position.set(-36, 0.1, 32);
    worldGroup.add(dungeon);

    const dLabel = createElegantWorldLabel('🕯️ CATACUMBAS DE WARKARMA', 'Explora la cámara gótica (+250 ✦ / +300 XP)');
    dLabel.position.set(-36, 6.8, 32);
    worldGroup.add(dLabel);

    interactiveAttractions.push({
      position: new THREE.Vector3(-36, 0, 32),
      radius: 6.5,
      label: '🕯️ Reclamar Reliquia de las Catacumbas (+250 ✦ / +300 XP)',
      action: () => rewardAttraction('Catacumbas de Warkarma', 250, 300)
    });
  }

  if (modelCache.has('LittlestTokyo') && !populatedLandmarks.has('LittlestTokyo')) {
    populatedLandmarks.add('LittlestTokyo');
    const tokyoGltf = modelCache.get('LittlestTokyo');
    const city = tokyoGltf.scene.clone();
    city.scale.set(0.035, 0.035, 0.035);
    city.position.set(38, 10, 32);
    worldGroup.add(city);

    if (tokyoGltf.animations?.[0]) {
      const m = new THREE.AnimationMixer(city);
      m.clipAction(tokyoGltf.animations[0]).play();
      globalEnvMixers.push(m);
    }

    const skyLabel = createElegantWorldLabel('🏙️ CIUDADELA FLOTANTE DEL CIELO', 'Vuela con tu Ave Mítica [🦅] o Avión [✈️] hasta aquí (+300 XP)');
    skyLabel.position.set(38, 19, 32);
    worldGroup.add(skyLabel);

    interactiveAttractions.push({
      position: new THREE.Vector3(38, 8, 32),
      radius: 10.0,
      label: '🏙️ Explorar Mirador de la Ciudadela Flotante (+250 ✦ / +300 XP)',
      action: () => rewardAttraction('Ciudadela Flotante', 250, 300)
    });
  }

  if (modelCache.has('PrimaryIonDrive') && !populatedLandmarks.has('PrimaryIonDrive')) {
    populatedLandmarks.add('PrimaryIonDrive');
    const ionGltf = modelCache.get('PrimaryIonDrive');
    const drive = ionGltf.scene.clone();
    drive.scale.set(2.8, 2.8, 2.8);
    drive.position.set(-620, 344, -1115); // Placed on Mars Colony!
    worldGroup.add(drive);

    if (ionGltf.animations?.[0]) {
      const m = new THREE.AnimationMixer(drive);
      m.clipAction(ionGltf.animations[0]).play();
      globalEnvMixers.push(m);
    }
  }

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
        radius: 42 + (i % 3) * 12,
        height: 18 + (i % 2) * 5,
        speed: 0.24 + (i % 3) * 0.05
      });
    }
  }
}

// ============================================================================
// BUILD 3D SLEEK JET & INTERPLANETARY STARSHIP MESHES
// ============================================================================
function createAtmosphericJetMesh() {
  const g = new THREE.Group();
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.95, 6.8, 16), polishedMarbleMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 1.1;
  g.add(fuselage);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.14, 1.8), obsidianMat);
  wings.position.set(0, 1.1, -0.4);
  g.add(wings);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 1.2), ancientGoldMat);
  tail.position.set(0, 1.8, -2.4);
  g.add(tail);

  const thruster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.6, 0.8, 16),
    new THREE.MeshBasicMaterial({ color: 0x00e1ff })
  );
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, 1.1, -3.4);
  g.add(thruster);
  return g;
}

function createInterplanetaryStarshipMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8.5, 8), obsidianMat);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 1.6;
  g.add(hull);

  const warpRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 16, 48), ancientGoldMat);
  warpRing.position.set(0, 1.6, -1.2);
  g.add(warpRing);

  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd278 })
  );
  coreGlow.position.set(0, 1.6, -4.2);
  g.add(coreGlow);
  return g;
}

// ============================================================================
// REALISTIC CHARACTER LINEAGES & 5-TIER MOUNT ATTACHMENT
// ============================================================================
function createAvatarInstance(avatarKey = 'Vanguard', labelName = 'Explorer', mountType = 'none', level = 1) {
  const root = new THREE.Group();
  let mixer = null;
  const actions = {};

  const soldierGltf = modelCache.get('Soldier');
  const michelleGltf = modelCache.get('Michelle');
  const rpmGltf = modelCache.get('ReadyPlayerMe');
  const xbotGltf = modelCache.get('Xbot');
  const customGltf = modelCache.get('CustomUpload');

  let chosenGltf = soldierGltf;
  let scale = 1.68;
  let rotOffset = Math.PI;
  let armorTint = null;

  if (avatarKey === 'Elena' && michelleGltf) {
    chosenGltf = michelleGltf;
    scale = 1.65;
    rotOffset = 0;
  } else if (avatarKey === 'Kael' && rpmGltf) {
    chosenGltf = rpmGltf;
    scale = 1.68;
    rotOffset = 0;
  } else if (avatarKey === 'Aegis' && xbotGltf) {
    chosenGltf = xbotGltf;
    scale = 1.68;
    rotOffset = 0;
  } else if (avatarKey === 'ShadowOps' && soldierGltf) {
    chosenGltf = soldierGltf;
    armorTint = new THREE.Color(0x1f2836);
  } else if (avatarKey === 'DesertRanger' && soldierGltf) {
    chosenGltf = soldierGltf;
    armorTint = new THREE.Color(0xd4a86a);
  } else if (avatarKey === 'CustomUpload' && customGltf) {
    chosenGltf = customGltf;
    scale = 1.5;
    rotOffset = 0;
  }

  const charHolder = new THREE.Group();
  root.add(charHolder);

  if (chosenGltf) {
    const clonedScene = SkeletonUtils.clone(chosenGltf.scene);
    clonedScene.scale.set(scale, scale, scale);
    clonedScene.rotation.y = rotOffset;

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (armorTint && child.material) {
          child.material = child.material.clone();
          child.material.color.multiply(armorTint);
          child.material.metalness = 0.45;
          child.material.roughness = 0.35;
        }
      }
    });
    charHolder.add(clonedScene);

    mixer = new THREE.AnimationMixer(clonedScene);
    const soldierClips = soldierGltf?.animations || [];
    const retargeted = buildRetargetedClipsForModel(clonedScene, soldierClips);
    for (const clip of retargeted) {
      actions[clip.name] = mixer.clipAction(clip);
    }
    for (const nativeClip of chosenGltf.animations || []) {
      actions[nativeClip.name] = mixer.clipAction(nativeClip);
    }
  }

  // Attach Mount / Vehicle ('horse', 'supercar', 'mythic_bird', 'jet', 'starship')
  let mountMixer = null;
  if (mountType === 'horse' && modelCache.has('Horse')) {
    const horseGltf = modelCache.get('Horse');
    const horseMesh = SkeletonUtils.clone(horseGltf.scene);
    horseMesh.scale.set(0.015, 0.015, 0.015);
    root.add(horseMesh);
    charHolder.position.y = 1.15;
    if (horseGltf.animations?.[0]) {
      mountMixer = new THREE.AnimationMixer(horseMesh);
      mountMixer.clipAction(horseGltf.animations[0]).play();
    }
  } else if (mountType === 'supercar' && modelCache.has('Ferrari')) {
    const carGltf = modelCache.get('Ferrari');
    const carMesh = carGltf.scene.clone();
    carMesh.scale.set(1.25, 1.25, 1.25);
    carMesh.rotation.y = Math.PI;
    root.add(carMesh);
    charHolder.scale.set(0.75, 0.75, 0.75);
    charHolder.position.set(0.35, 0.15, -0.1);
  } else if (mountType === 'mythic_bird') {
    const birdGltf = modelCache.get('Stork') || modelCache.get('Parrot') || modelCache.get('Flamingo');
    if (birdGltf) {
      const birdMesh = SkeletonUtils.clone(birdGltf.scene);
      birdMesh.scale.set(0.045, 0.045, 0.045);
      birdMesh.position.y = 0.9;
      root.add(birdMesh);
      charHolder.position.set(0, 1.45, -0.2);
      if (birdGltf.animations?.[0]) {
        mountMixer = new THREE.AnimationMixer(birdMesh);
        mountMixer.clipAction(birdGltf.animations[0]).play();
      }
    }
  } else if (mountType === 'jet') {
    const jetMesh = createAtmosphericJetMesh();
    root.add(jetMesh);
    charHolder.scale.set(0.65, 0.65, 0.65);
    charHolder.position.set(0, 1.1, 0.4);
  } else if (mountType === 'starship') {
    const shipMesh = createInterplanetaryStarshipMesh();
    root.add(shipMesh);
    charHolder.scale.set(0.6, 0.6, 0.6);
    charHolder.position.set(0, 1.5, 0.5);
  }

  if (labelName) {
    const nameSprite = createPlayerNameplate(`Nv.${level} ${labelName}`);
    nameSprite.position.set(0, mountType === 'horse' ? 4.4 : 3.5, 0);
    root.add(nameSprite);
  }

  return { root, mixer, mountMixer, actions, currentAction: null, avatarKey, mountType, level };
}

function playAvatarAnim(avatarObj, desiredState = 'Idle') {
  if (!avatarObj || !avatarObj.mixer) return;
  const acts = avatarObj.actions;
  let clipName = null;

  const candidates = {
    Idle: ['Idle', 'idle', 'Standing', 'SambaDance'],
    Walk: ['Walk', 'walk', 'Walking', 'Run', 'run'],
    Run: ['Run', 'run', 'Running', 'Walk', 'walk'],
    Jump: ['Jump', 'Run', 'run', 'Idle'],
    Dance: ['SambaDance', 'Dance', 'agree', 'Wave', 'Run']
  }[desiredState] || ['Idle', 'idle'];

  for (const c of candidates) {
    if (acts[c]) {
      clipName = c;
      break;
    }
  }
  if (!clipName) clipName = Object.keys(acts)[0];
  if (!clipName || avatarObj.currentAction === clipName) return;

  const nextAct = acts[clipName];
  if (avatarObj.currentAction && acts[avatarObj.currentAction]) {
    acts[avatarObj.currentAction].fadeOut(0.2);
  }
  nextAct.reset().fadeIn(0.2).play();
  avatarObj.currentAction = clipName;
}

function createPlayerNameplate(nameText) {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 84;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(8, 12, 20, 0.76)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 396, 60, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(229, 189, 115, 0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fff8eb';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nameText.slice(0, 20), 210, 51);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(2.6, 0.52, 1);
  return sprite;
}

// ============================================================================
// LOCAL PLAYER, MOUNTS & PLANETARY GRAVITY FLOOR CALCULATION
// ============================================================================
let localAvatar = null;
const playerPos = new THREE.Vector3(0, 0, 18);
const playerVel = new THREE.Vector3();
let playerYaw = 0;
let cameraYaw = 0;
let cameraPitch = 0.25;
let isGrounded = true;
let emoteTimer = 0;

function rebuildLocalAvatar() {
  if (localAvatar) scene.remove(localAvatar.root);
  localAvatar = createAvatarInstance(
    state.avatarType,
    state.joined ? state.playerName : '',
    state.mountType,
    state.level
  );
  localAvatar.root.position.copy(playerPos);
  localAvatar.root.rotation.y = playerYaw;
  scene.add(localAvatar.root);
  playAvatarAnim(localAvatar, 'Idle');
}

function requestMountEquipOrBuy(mType) {
  sfx.portal();
  const prices = { horse: 0, supercar: 400, mythic_bird: 650, jet: 1200, starship: 2500 };
  if (!state.unlockedMounts.includes(mType)) {
    const cost = prices[mType] || 0;
    if (state.coins < cost) {
      showToast('🔒 CRÉDITOS INSUFICIENTES', `Necesitas ${cost} ✦ para desbloquear este transporte. Recolecta nodos o completa misiones.`);
      return;
    }
    state.coins -= cost;
    state.unlockedMounts.push(mType);
    state.mountType = mType;
    showToast('🚀 TRANSPORTE DESBLOQUEADO', `Has adquirido y equipado tu nuevo transporte.`);
  } else {
    state.mountType = state.mountType === mType ? 'none' : mType;
  }

  if (['mythic_bird', 'jet', 'starship'].includes(state.mountType)) {
    playerPos.y = Math.max(playerPos.y, getLocalGroundHeight(playerPos.x, playerPos.z) + 5);
  }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'buy_or_equip_mount', mount: mType }));
  }
  rebuildLocalAvatar();
  updateHUD();
}

// Computes the ground height at (x,z) across Earth (y=0), Moon (y=260), Mars (y=340), and Aurelia (y=440)
function getLocalGroundHeight(x, z) {
  // Check Moon Plateau (0, 260, -680, r=52)
  if (Math.hypot(x - 0, z - (-680)) < 52) return 260;
  // Check Mars Plateau (-620, 340, -1100, r=62)
  if (Math.hypot(x - (-620), z - (-1100)) < 62) return 340;
  // Check Aurelia Platform (680, 440, -1350, r=65)
  if (Math.hypot(x - 680, z - (-1350)) < 65) return 440;
  // Default Planet Earth surface
  return 0;
}

function getCurrentPlanetLabel(x, y, z) {
  if (Math.hypot(x - 0, z - (-680)) < 95 && y > 180) return 'LA LUNA (SELENE)';
  if (Math.hypot(x - (-620), z - (-1100)) < 120 && y > 240) return 'PLANETA MARTE';
  if (Math.hypot(x - 680, z - (-1350)) < 130 && y > 320) return 'PLANETA AURELIA';
  if (y > 140) return 'ESPACIO PROFUNDO';
  if (y > 35) return 'ESTRATOSFERA TERRESTRE';
  return 'PLANETA TIERRA';
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
  playerPos.set(pos0.x - 6, 0, pos0.z + 8);
  document.getElementById('race-hud').classList.remove('hidden');
  showToast('🏁 GRAN CIRCUITO IMPERIAL', '¡Atraviesa los 8 Anillos Solares para ganar +300 ✦ y +350 XP!');
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
      rewardAttraction(`Circuito Imperial (${elapsedSec}s)`, 300, 350);
    } else {
      raceRingMeshes[state.raceRingIndex].scale.setScalar(1.35);
    }
  }
}

function rewardAttraction(attractionName, amount = 250, xp = 300) {
  sfx.levelUp();
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'reward_attraction', attractionName, amount, xp }));
  }
  showToast(`✦ ${attractionName.toUpperCase()}`, `Recompensa: +${amount} Créditos ✦ y +${xp} XP.`);
}

// ============================================================================
// REMOTE MULTIPLAYER ENTITIES & PLANETARY RESOURCE NODES
// ============================================================================
const remotePlayers = new Map();
const orbMeshes = new Map();
const orbGeo = new THREE.OctahedronGeometry(0.55, 1);

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
// UNIFIED PC + MOBILE TOUCH INPUT (INCLUDING 3D SPACE FLIGHT ASCEND/DESCEND)
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
  if (e.code === 'Digit1') requestMountEquipOrBuy('horse');
  if (e.code === 'Digit2') requestMountEquipOrBuy('supercar');
  if (e.code === 'Digit3') requestMountEquipOrBuy('mythic_bird');
  if (e.code === 'Digit4') requestMountEquipOrBuy('jet');
  if (e.code === 'Digit5') requestMountEquipOrBuy('starship');
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.code] = false;
  if (e.code === 'Space') ascendHeld = false;
  if (e.code === 'KeyC' || e.code === 'ControlLeft') descendHeld = false;
});

// Smooth Camera Drag on Canvas
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
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerId === cameraPointerId) cameraPointerId = null;
});

// Touch Joystick
const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
const maxJoyR = 35;

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

// Action Wheel & Mount Dock Buttons
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
document.getElementById('btn-use').addEventListener('click', () => triggerContextInteract());
document.getElementById('context-action-btn').addEventListener('click', () => triggerContextInteract());

document.getElementById('btn-mount-horse').addEventListener('click', () => requestMountEquipOrBuy('horse'));
document.getElementById('btn-mount-car').addEventListener('click', () => requestMountEquipOrBuy('supercar'));
document.getElementById('btn-mount-bird').addEventListener('click', () => requestMountEquipOrBuy('mythic_bird'));
document.getElementById('btn-mount-jet').addEventListener('click', () => requestMountEquipOrBuy('jet'));
document.getElementById('btn-mount-starship').addEventListener('click', () => requestMountEquipOrBuy('starship'));

// ============================================================================
// WEBSOCKET CONNECTION & MULTIPLAYER SYNC
// ============================================================================
let ws = null;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.addEventListener('open', () => {
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
      state.leaderboard = packet.leaderboard || [];
      state.onlineCount = packet.totalOnline || 1;
      syncWorldOrbs(packet.orbs || []);
      updateHUD();
    } else if (packet.t === 'aoi') {
      if (packet.you) {
        state.level = packet.you.level;
        state.xp = packet.you.xp;
        state.xpNext = packet.you.xpNext;
        state.skillPoints = packet.you.skillPoints;
        state.skills = packet.you.skills || state.skills;
        state.unlockedMounts = packet.you.unlockedMounts || state.unlockedMounts;
        state.hp = packet.you.hp;
        state.maxHp = packet.you.maxHp || 100;
        state.coins = packet.you.coins;
        state.relics = packet.you.relics;
        state.ascension = packet.you.ascension;
      }
      state.onlineCount = packet.online || state.onlineCount;
      state.nearbyCount = (packet.nearby || []).length;
      reconcileNearbyPlayers(packet.nearby || []);
      updateHUD();
    } else if (packet.t === 'transit_approved') {
      const dest = PLANETARY_DESTINATIONS[packet.destination];
      if (dest) {
        sfx.portal();
        playerPos.copy(dest.pos);
        playerVel.set(0, 0, 0);
        showToast(`🪐 VIAJE INTERPLANETARIO COMPLETADO`, `Llegaste a ${dest.name} (-${packet.farePaid} ✦).`);
      }
      updateHUD();
    } else if (packet.t === 'transit_denied') {
      showToast('🔒 PEAJE RECHAZADO', packet.reason);
    } else if (packet.t === 'event') {
      handleServerEvent(packet);
    }
  });

  ws.addEventListener('close', () => setTimeout(connectWebSocket, 2500));
}

function reconcileNearbyPlayers(nearbyArray) {
  const seenIds = new Set();

  for (const np of nearbyArray) {
    seenIds.add(np.id);
    let remote = remotePlayers.get(np.id);
    const desiredAv = np.av || 'Vanguard';
    const desiredMt = np.mt || 'none';
    const desiredLv = np.lv || 1;

    if (!remote || remote.avatarKey !== desiredAv || remote.mountType !== desiredMt || remote.level !== desiredLv) {
      if (remote) scene.remove(remote.avatarObj.root);
      const avatarObj = createAvatarInstance(desiredAv, np.n || 'Explorer', desiredMt, desiredLv);
      avatarObj.root.position.set(np.x, np.y, np.z);
      scene.add(avatarObj.root);
      remote = {
        id: np.id,
        avatarKey: desiredAv,
        mountType: desiredMt,
        level: desiredLv,
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
    playAvatarAnim(remote.avatarObj, remote.anim);
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

  switch (ev.kind) {
    case 'ORB_COLLECTED':
      removeClientOrb(ev.orbId);
      if (ev.playerId === state.playerId) {
        sfx.shard();
        if (ev.leveledUp) {
          sfx.levelUp();
          rebuildLocalAvatar();
          showToast(`🆙 ¡SUBISTE AL NIVEL ${ev.newLevel}!`, `Has recibido +1 Punto de Habilidad en tu Códice [🧬].`);
        }
      }
      break;
    case 'ORB_SPAWNED':
      if (ev.orb) spawnClientOrb(ev.orb);
      break;
    case 'ATTRACTION_COMPLETED':
      if (ev.playerId === state.playerId && ev.leveledUp) {
        sfx.levelUp();
        rebuildLocalAvatar();
        showToast(`🆙 ¡SUBISTE AL NIVEL ${ev.newLevel}!`, `Tu poder planetario crece (+1 Punto de Habilidad).`);
      }
      break;
    case 'RELIC_FOUND':
      sfx.levelUp();
      showToast(`❖ ${ev.relicName}`, `${ev.playerName} ha despertado una Reliquia Ancestral.`);
      break;
    case 'ASCENSION_COMPLETE':
      sfx.levelUp();
      showToast(`👑 ASCENSIÓN SUPREMA`, `¡${ev.playerName} ha activado el Altar de la Tierra con las 3 Reliquias!`);
      break;
    case 'STRIKE_FX':
      spawnShockwave(new THREE.Vector3(ev.x, ev.y + 0.5, ev.z), 0xffcf70);
      break;
    case 'RIVAL_DEFEATED':
      showToast(`⚔️ COMBATE PLANETARIO`, `${ev.attackerName} venció a ${ev.victimName}.`);
      break;
    case 'SYSTEM_ANNOUNCEMENT':
      showToast('⚡ SISTEMA SOLAR EN TIEMPO REAL', ev.message);
      break;
    case 'CHAT':
      appendChat(`Nv.${ev.level || 1} ${ev.playerName}`, ev.text);
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
  sfx.strike();
  spawnShockwave(playerPos.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xffcf70);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'aether_strike' }));
  }
}

function claimRelic(relicIndex) {
  if (state.relics[relicIndex]) return;
  state.relics[relicIndex] = true;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ t: 'claim_relic', relicIndex }));
  }
  updateHUD();
}

function triggerContextInteract() {
  if (activeContextFn) activeContextFn();
}

function checkInteractions() {
  const btn = document.getElementById('context-action-btn');
  activeContextFn = null;

  for (const attr of interactiveAttractions) {
    if (playerPos.distanceTo(attr.position) < attr.radius) {
      btn.textContent = attr.label;
      btn.classList.remove('hidden');
      activeContextFn = attr.action;
      return;
    }
  }

  if (playerPos.distanceTo(new THREE.Vector3(0, 0, 0)) < 7.5) {
    if (state.relics[0] && state.relics[1] && state.relics[2]) {
      btn.textContent = `👑 Activar Altar de la Ascensión (+50,000 ✦ / +5,000 XP)`;
      btn.classList.remove('hidden');
      activeContextFn = () => {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'claim_ascension' }));
      };
    } else {
      btn.textContent = `🪐 Abrir Carta Estelar, Peajes & Hangar de Naves`;
      btn.classList.remove('hidden');
      activeContextFn = () => document.getElementById('starmap-modal').classList.remove('hidden');
    }
    return;
  }

  btn.classList.add('hidden');
}

function checkOrbPickups() {
  if (!ws || ws.readyState !== 1) return;
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
}

// ============================================================================
// HUD, SKILL TREE (1-100), STAR MAP & HANGAR UI
// ============================================================================
function updateHUD() {
  document.getElementById('hud-level').textContent = state.level;
  document.getElementById('hud-zone-name').textContent = getCurrentPlanetLabel(playerPos.x, playerPos.y, playerPos.z);
  document.getElementById('hud-hp').textContent = `${state.hp}/${state.maxHp || 100}`;
  document.getElementById('hud-coins').textContent = state.coins.toLocaleString();
  document.getElementById('hud-online').textContent = state.onlineCount;

  const pct = state.level >= 100 ? 100 : Math.min(100, Math.round((state.xp / Math.max(1, state.xpNext)) * 100));
  document.getElementById('hud-xp-fill').style.width = `${pct}%`;
  document.getElementById('hud-xp-text').textContent =
    state.level >= 100 ? 'NIVEL 100 MÁXIMO' : `XP ${state.xp} / ${state.xpNext}`;

  const altMeters = Math.max(0, Math.round(playerPos.y));
  const envLabel = altMeters > 140 ? 'ÓRBITA / ESPACIO' : (altMeters > 30 ? 'VUELO ATMOSFÉRICO' : 'SUPERFICIE');
  document.getElementById('hud-altitude').textContent = `ALT: ${altMeters}m (${envLabel})`;

  // Skill points notification badge
  const ptBadge = document.getElementById('skill-pt-badge');
  if (state.skillPoints > 0) {
    ptBadge.textContent = state.skillPoints;
    ptBadge.classList.remove('hidden');
  } else {
    ptBadge.classList.add('hidden');
  }

  // Update Skill Modal values
  document.getElementById('sk-lvl').textContent = state.level;
  document.getElementById('sk-pts').textContent = state.skillPoints;
  if (state.skills) {
    document.getElementById('sk-val-velocity').textContent = state.skills.velocity || 0;
    document.getElementById('sk-val-aetherPower').textContent = state.skills.aetherPower || 0;
    document.getElementById('sk-val-vitality').textContent = state.skills.vitality || 0;
    document.getElementById('sk-val-cosmicMastery').textContent = state.skills.cosmicMastery || 0;
  }

  // Update Hangar ownership labels
  ['horse', 'supercar', 'mythic_bird', 'jet', 'starship'].forEach((m) => {
    const el = document.getElementById(`price-${m}`);
    if (el && state.unlockedMounts.includes(m)) {
      el.textContent = state.mountType === m ? 'Equipado ✓' : 'Equipar ⟶';
    }
  });

  [0, 1, 2].forEach((i) => {
    const el = document.getElementById(`relic-${i}`);
    if (el) el.className = `relic-chip ${state.relics[i] ? 'unlocked' : ''}`;
  });

  const mountLabels = {
    none: '🚶 A Pie',
    horse: '🐎 Corcel',
    supercar: '🏎️ Supercar GT',
    mythic_bird: '🦅 Ave Mítica',
    jet: '✈️ Avión Caza',
    starship: '🚀 Nave Espacial'
  };
  document.getElementById('mount-indicator').textContent = mountLabels[state.mountType] || '🚶 A Pie';

  document.getElementById('btn-mount-horse').classList.toggle('active', state.mountType === 'horse');
  document.getElementById('btn-mount-car').classList.toggle('active', state.mountType === 'supercar');
  document.getElementById('btn-mount-bird').classList.toggle('active', state.mountType === 'mythic_bird');
  document.getElementById('btn-mount-jet').classList.toggle('active', state.mountType === 'jet');
  document.getElementById('btn-mount-starship').classList.toggle('active', state.mountType === 'starship');

  const lbBox = document.getElementById('leaderboard-box');
  if (lbBox) {
    lbBox.innerHTML = '';
    state.leaderboard.slice(0, 8).forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `lb-item ${idx === 0 ? 'first' : ''}`;
      const relCount = (item.relics || []).filter(Boolean).length;
      row.innerHTML = `<span>#${idx + 1} [Nv.${item.level || 1}] ${item.name}</span><span>❖ ${relCount}/3 • ${(item.score || 0).toLocaleString()}</span>`;
      lbBox.appendChild(row);
    });
  }
}

let toastTimer = null;
function showToast(title, desc) {
  const t = document.getElementById('world-toast');
  document.getElementById('world-toast-title').textContent = title;
  document.getElementById('world-toast-desc').textContent = desc;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4500);
}

function appendChat(author, text) {
  const box = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.innerHTML = `<b style="color:#ffe1a3">${author}:</b> ${text}`;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

// Star Map & Hangar Modal (🪐)
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

// Level 1-100 Skills Modal (🧬)
const skillsModal = document.getElementById('skills-modal');
document.getElementById('btn-skills').addEventListener('click', () => {
  updateHUD();
  skillsModal.classList.remove('hidden');
});
document.getElementById('btn-close-skills').addEventListener('click', () => {
  skillsModal.classList.add('hidden');
});

document.querySelectorAll('.attr-card[data-upgrade]').forEach((card) => {
  card.addEventListener('click', () => {
    const skill = card.dataset.upgrade;
    if (state.skillPoints <= 0) {
      showToast('🧬 SIN PUNTOS DE HABILIDAD', 'Sube de nivel recolectando nodos o completando misiones para ganar más puntos.');
      return;
    }
    sfx.levelUp();
    state.skillPoints--;
    state.skills[skill] = (state.skills[skill] || 0) + 1;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'upgrade_skill', skill }));
    }
    updateHUD();
  });
});

// Weather / Time of Day Cyclers
document.getElementById('btn-time').addEventListener('click', () => {
  state.weatherIndex = (state.weatherIndex + 1) % WEATHER_PRESETS.length;
  const preset = WEATHER_PRESETS[state.weatherIndex];
  applySunAndAtmosphere(preset.elevation, preset.azimuth, preset.fogColor);
  renderer.toneMappingExposure = preset.exposure;
  sunLight.intensity = preset.lightIntensity;
  showToast('☀️ CLIMA PLANETARIO', `Atmósfera cambiada a: ${preset.name}`);
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
    `Nv.${state.level} ${state.playerName} • Reliquias: ${relCount}/3 • ${state.onlineCount} Exploradores Online`;
  photoModal.classList.remove('hidden');
});
document.getElementById('btn-close-photo').addEventListener('click', () => photoModal.classList.add('hidden'));
document.getElementById('btn-copy-link').addEventListener('click', () => {
  navigator.clipboard?.writeText(window.location.origin);
  document.getElementById('btn-copy-link').textContent = '✅ Enlace Copiado';
  setTimeout(() => {
    document.getElementById('btn-copy-link').textContent = '🔗 Copiar Enlace Directo';
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
    document.getElementById('char-role-tag').textContent = 'AVATAR PERSONALIZADO (.GLB)';
    rebuildLocalAvatar();
  });
});

document.getElementById('btn-start-world').addEventListener('click', async () => {
  sfx.init();
  sfx.portal();
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
  }
  updateHUD();
});

// ============================================================================
// MAIN RENDER & INTERPLANETARY SIMULATION LOOP
// ============================================================================
const clock = new THREE.Clock();
let lastNetSend = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  oceanWater.material.uniforms['time'].value += dt * 0.65;

  // Slowly rotate celestial planets
  for (const body of celestialBodies) {
    body.rotation.y += dt * 0.04;
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

  for (const r of animatedRelics) {
    if (r.mesh) {
      r.mesh.rotation.y += dt * 0.85;
      r.mesh.position.y = r.baseY + Math.sin(elapsed * 2.0) * 0.35;
    }
  }

  for (const [, o] of orbMeshes) {
    o.mesh.rotation.y += dt * 1.5;
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
    const velocityMultiplier = 1 + (state.skills?.velocity || 0) * 0.06;
    let baseSpeed = (keysPressed['ShiftLeft'] ? 15 : 10.5) * velocityMultiplier;
    if (state.mountType === 'horse') baseSpeed = 20.0 * velocityMultiplier;
    if (state.mountType === 'supercar') baseSpeed = 29.0 * velocityMultiplier;
    if (state.mountType === 'mythic_bird') baseSpeed = 26.0 * velocityMultiplier;
    if (state.mountType === 'jet') baseSpeed = 52.0 * velocityMultiplier;
    if (state.mountType === 'starship') baseSpeed = 95.0 * velocityMultiplier;

    let currentAnim = 'Idle';
    const isFlyingMount = ['mythic_bird', 'jet', 'starship'].includes(state.mountType);

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

    // Vertical Physics: 3D Atmospheric & Deep Space Flight vs Planetary Gravity
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
      // Low gravity on the Moon (y >= 250)
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

    // Seamless Atmosphere-to-Space Transition: Hide bright blue sky dome above y = 135m to reveal Deep Space & Planets!
    sky.visible = playerPos.y < 135;
    scene.fog.density = playerPos.y < 135 ? 0.0022 : 0.00015;

    localAvatar.root.position.copy(playerPos);
    localAvatar.root.rotation.y = playerYaw;
    playAvatarAnim(localAvatar, currentAnim);
    if (localAvatar.mixer) localAvatar.mixer.update(dt);
    if (localAvatar.mountMixer) localAvatar.mountMixer.update(dt * 1.3);

    const camDist = state.mountType === 'starship' ? 14.5 : (state.mountType === 'jet' ? 12.5 : 9.0);
    const targetCam = new THREE.Vector3(
      playerPos.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * camDist,
      playerPos.y + Math.sin(cameraPitch) * camDist + 2.0,
      playerPos.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * camDist
    );
    camera.position.lerp(targetCam, 0.18);
    camera.lookAt(playerPos.x, playerPos.y + 1.8, playerPos.z);

    checkInteractions();
    checkOrbPickups();
    updateRingRace();

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
    // Live Character Showcase Camera
    if (localAvatar) {
      localAvatar.root.position.set(0, 0.24, 18);
      localAvatar.root.rotation.y = Math.sin(elapsed * 0.5) * 0.35;
      if (localAvatar.mixer) localAvatar.mixer.update(dt);
    }
    const camX = Math.sin(elapsed * 0.22) * 1.2;
    camera.position.set(camX, 2.35, 22.8);
    camera.lookAt(0, 1.85, 18);
  }

  for (const [, rem] of remotePlayers) {
    rem.avatarObj.root.position.lerp(rem.targetPos, 0.18);
    rem.avatarObj.root.rotation.y = rem.targetRy;
    if (rem.avatarObj.mixer) rem.avatarObj.mixer.update(dt);
    if (rem.avatarObj.mountMixer) rem.avatarObj.mountMixer.update(dt);
  }

  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

preloadCoreModels().then(() => {
  rebuildLocalAvatar();
});
connectWebSocket();
animate();
