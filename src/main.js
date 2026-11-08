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
// THE QUEST // AAA AUDITED INTERPLANETARY MMORPG ENGINE (LEVEL 1-100)
// Includes:
// 1. 100% Native Zero-Distortion Skeletal Animation Rigs (6 Distinct Lineages)
// 2. Closed-Cockpit Vehicle Encapsulation + Banking/Pitching Physics
// 3. Full 2-Pass Sliding Cylinder & AABB Obstacle Collision Solver
// 4. Master-Planned Radial & Axial Imperial Architecture (Zero Asset Dump)
// 5. Real-Time 2D Canvas Radar/Minimap + Distance-Culled Diegetic Plaques
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

const PLANETARY_DESTINATIONS = {
  earth_sanctuary: {
    name: 'SANTUARIO SOLAR',
    pos: new THREE.Vector3(0, 0, 18),
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

// Subtle Web Audio Synthesizer
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
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }
  shard() {
    this.playTone(784, 0.09, 'sine', 0.09);
    setTimeout(() => this.playTone(1174.6, 0.18, 'sine', 0.09), 70);
  }
  portal() {
    this.playTone(293.6, 0.2, 'triangle', 0.1);
    setTimeout(() => this.playTone(587.3, 0.3, 'sine', 0.1), 85);
  }
  strike() {
    this.playTone(165, 0.24, 'sawtooth', 0.12);
    setTimeout(() => this.playTone(110, 0.26, 'triangle', 0.1), 55);
  }
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.32, 'triangle', 0.13), idx * 90);
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
scene.fog = new THREE.FogExp2(0xd4a688, 0.0020);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 4500);

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
rgbeLoader.load('/textures/venice_sunset_1k.hdr', (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdrTexture;
  scene.environmentIntensity = 0.95;
});

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
// REAL PBR MATERIALS & MASTER-PLANNED ARCHITECTURAL SOLAR SYSTEM
// ============================================================================
const brickDiffuse = texLoader.load('/textures/brick_diffuse.jpg');
const brickRoughness = texLoader.load('/textures/brick_roughness.jpg');
const brickBump = texLoader.load('/textures/brick_bump.jpg');
[brickDiffuse, brickRoughness, brickBump].forEach((t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 36);
});
brickDiffuse.colorSpace = THREE.SRGBColorSpace;

const moonTex = texLoader.load('/textures/planets/moon_1024.jpg');
moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping;
moonTex.colorSpace = THREE.SRGBColorSpace;

const earthTex = texLoader.load('/textures/planets/earth_atmos_2048.jpg');
earthTex.colorSpace = THREE.SRGBColorSpace;

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
  color: 0x081526,
  roughness: 0.05,
  metalness: 0.98,
  envMapIntensity: 1.6
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
const wayfinderPlaques = []; // Distance-culled diegetic 3D labels

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

function buildMasterPlannedUniverse() {
  // ==========================================================================
  // 1. PLANET EARTH: MASTER-PLANNED CITADEL OF AETHELGARD (Y = 0m)
  // ==========================================================================
  const earthContinent = new THREE.Mesh(new THREE.CylinderGeometry(155, 168, 2.8, 64), stoneCourtyardMat);
  earthContinent.position.y = -1.4;
  earthContinent.receiveShadow = true;
  worldGroup.add(earthContinent);

  // Outer Marble Perimeter Balustrade & 24 Colonnade Pillars (r = 56m) with SOLID COLLIDERS
  const pillarGeo = new THREE.CylinderGeometry(1.05, 1.25, 11.5, 24);
  const capGeo = new THREE.BoxGeometry(2.9, 0.8, 2.9);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    // Leave cardinal avenue openings at North, South, East, West
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

  // 4 Cardinal Paved Obsidian & Gold Boulevards connecting the Central Plaza to N/S/E/W Districts
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
    'ALTAR DE LA ASCENSIÓN',
    'Centro de Aethelgard • Carta Estelar [M] o 3 Reliquias',
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

  // Twin Obelisks framing the Archon Temple
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
    label: 'Hablar con el Arconte IA (Reliquia de la Mente)',
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

  // 4 Spaceport Launch Gantry Towers with solid colliders
  [[-11, -78], [11, -78], [-11, -98], [11, -98]].forEach(([gx, gz]) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 14, 1.8), polishedMarbleMat);
    tower.position.set(gx, 7, gz);
    tower.castShadow = true;
    worldGroup.add(tower);
    addBoxCollider(gx - 1.0, gx + 1.0, gz - 1.0, gz + 1.0, -2, 16);
  });

  createDiegeticWayfinder(
    'PUERTO ESPACIAL INTERPLANETARIO',
    'Despegue a la Luna y Marte • Carta Estelar [M]',
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
    label: 'Despertar Reliquia del Horizonte (+1,200 ✦ / +800 XP)',
    action: () => claimRelic(0)
  });

  // --------------------------------------------------------------------------
  // EAST AXIS (75, 0, 0): OBSIDIAN COLOSSEUM OF VALOR RELIC
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
    'COLISEO DEL VALOR (ESTE)',
    'Reliquia III • Pulso [Q] o [E] para reclamar (+1,200 ✦ / +800 XP)',
    new THREE.Vector3(75, 7.6, 0),
    60
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(75, 0, 0),
    radius: 7.5,
    label: 'Conquistar Reliquia del Valor (+1,200 ✦ / +800 XP)',
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

  // ==========================================================================
  // 2. THE MOON (SELENE) IN ORBIT (Center: 0, 260, -680)
  // ==========================================================================
  const moonSphere = new THREE.Mesh(new THREE.SphereGeometry(68, 48, 48), lunarSurfaceMat);
  moonSphere.position.set(0, 192, -680);
  worldGroup.add(moonSphere);
  celestialBodies.push(moonSphere);

  const moonLandingPad = new THREE.Mesh(new THREE.CylinderGeometry(48, 52, 2.5, 48), lunarSurfaceMat);
  moonLandingPad.position.set(0, 259, -680);
  moonLandingPad.receiveShadow = true;
  worldGroup.add(moonLandingPad);

  const moonDome = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35, metalness: 0.9, roughness: 0.1 })
  );
  moonDome.position.set(0, 260, -696);
  worldGroup.add(moonDome);
  addCylinderCollider(0, -696, 11.8, 255, 280);

  createDiegeticWayfinder(
    'BASE LUNAR TRANQUILIDAD (SELENE)',
    'Gravedad Lunar • Extrae Helio-3 (+350 ✦ / +400 XP)',
    new THREE.Vector3(0, 267, -680),
    80
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(0, 260, -680),
    radius: 10.0,
    label: 'Extraer Núcleo de Helio-3 Lunar (+350 ✦ / +400 XP)',
    action: () => rewardAttraction('Extracción Lunar de Helio-3', 350, 400)
  });

  // ==========================================================================
  // 3. PLANET MARS (ARES PRIME) IN DEEP SPACE (Center: -620, 340, -1100)
  // ==========================================================================
  const marsSphere = new THREE.Mesh(new THREE.SphereGeometry(95, 48, 48), martianSurfaceMat);
  marsSphere.position.set(-620, 245, -1100);
  worldGroup.add(marsSphere);
  celestialBodies.push(marsSphere);

  const marsPlateau = new THREE.Mesh(new THREE.CylinderGeometry(58, 64, 3.0, 48), martianSurfaceMat);
  marsPlateau.position.set(-620, 339, -1100);
  worldGroup.add(marsPlateau);

  createDiegeticWayfinder(
    'PLANETA MARTE // ARES PRIME',
    'Reactor Iónico y Cristales Kyber (+500 ✦ / +600 XP)',
    new THREE.Vector3(-620, 348, -1100),
    90
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(-620, 340, -1100),
    radius: 12.0,
    label: 'Cosechar Reactor Marciano de Ares Prime (+500 ✦ / +600 XP)',
    action: () => rewardAttraction('Reactor de Marte Ares Prime', 500, 600)
  });

  // ==========================================================================
  // 4. RINGED PLANET AURELIA (Center: 680, 440, -1350)
  // ==========================================================================
  const aureliaSphere = new THREE.Mesh(
    new THREE.SphereGeometry(115, 48, 48),
    new THREE.MeshStandardMaterial({ map: earthTex, color: 0x99d8ff, roughness: 0.4, metalness: 0.3 })
  );
  aureliaSphere.position.set(680, 325, -1350);
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

  createDiegeticWayfinder(
    'SANTUARIO ORBITAL DE AURELIA',
    'Confín del Sistema • Matriz de Éter (+750 ✦ / +900 XP)',
    new THREE.Vector3(680, 448, -1350),
    95
  );

  interactiveAttractions.push({
    position: new THREE.Vector3(680, 440, -1350),
    radius: 12.0,
    label: 'Canalizar Matriz Orbital de Aurelia (+750 ✦ / +900 XP)',
    action: () => rewardAttraction('Matriz Orbital de Aurelia', 750, 900)
  });

  const earthFromSpaceGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(140, 48, 48),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.5, metalness: 0.1 })
  );
  earthFromSpaceGlobe.position.set(0, -165, 0);
  worldGroup.add(earthFromSpaceGlobe);
}

buildMasterPlannedUniverse();

// ============================================================================
// DRACO + GLTF ASSET LOADER (100% NATIVE ANIMATION RIGS & VEHICLES)
// ============================================================================
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();
const globalEnvMixers = [];

let coreModelsLoaded = false;
async function preloadCoreModels() {
  if (coreModelsLoaded) return;
  const coreFiles = [
    { key: 'Soldier', url: '/models/Soldier.glb' },
    { key: 'Xbot', url: '/models/Xbot.glb' },
    { key: 'Horse', url: '/models/Horse.glb' },
    { key: 'Ferrari', url: '/models/ferrari.glb' },
    { key: 'Stork', url: '/models/Stork.glb' },
    { key: 'Flamingo', url: '/models/Flamingo.glb' },
    { key: 'PrimaryIonDrive', url: '/models/PrimaryIonDrive.glb' }
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
}

// ============================================================================
// CLOSED-COCKPIT SUPERSONIC JET & INTERPLANETARY STARSHIP MESHES
// ============================================================================
function createAtmosphericJetMesh() {
  const g = new THREE.Group();
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.92, 7.2, 24), polishedMarbleMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 1.25;
  fuselage.castShadow = true;
  g.add(fuselage);

  // Tinted Glass Cockpit Canopy (Encapsulates the pilot cleanly!)
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), canopyGlassMat);
  canopy.scale.set(0.85, 0.65, 2.4);
  canopy.position.set(0, 1.62, 0.45);
  g.add(canopy);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 1.9), obsidianMat);
  wings.position.set(0, 1.2, -0.4);
  wings.castShadow = true;
  g.add(wings);

  const twinTails = [-1.1, 1.1].map((tx) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 1.3), ancientGoldMat);
    t.position.set(tx, 1.8, -2.5);
    t.rotation.z = tx > 0 ? -0.22 : 0.22;
    return t;
  });
  g.add(...twinTails);

  const thruster = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.58, 0.9, 16),
    new THREE.MeshBasicMaterial({ color: 0x6ce5ff })
  );
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, 1.25, -3.65);
  g.add(thruster);
  return g;
}

function createInterplanetaryStarshipMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(1.55, 8.8, 12), obsidianMat);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 1.7;
  hull.castShadow = true;
  g.add(hull);

  // Armored Command Bridge Canopy
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), canopyGlassMat);
  bridge.scale.set(0.9, 0.55, 2.2);
  bridge.position.set(0, 2.25, 0.6);
  g.add(bridge);

  const warpRing = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.22, 16, 48), ancientGoldMat);
  warpRing.position.set(0, 1.7, -1.3);
  g.add(warpRing);

  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.82, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2a6 })
  );
  coreGlow.position.set(0, 1.7, -4.4);
  g.add(coreGlow);
  return g;
}

// ============================================================================
// 6 ZERO-DISTORTION REALISTIC LINEAGES & VEHICLE ENCAPSULATION
// ============================================================================
// Audit Fix #1: Every lineage uses 100% NATIVE animations from Soldier.glb or Xbot.glb
// plus bespoke PBR armor shaders & 3D procedural attachments (halos, shoulder pauldrons, wings).
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
    tint: new THREE.Color(0xf5e6c8), // Valkyrie Ivory & Gold Exosuit
    metalness: 0.78,
    roughness: 0.18,
    attachment: 'valkyrie_crest'
  },
  ShadowOps: {
    baseRig: 'Soldier',
    scale: 1.68,
    rotOffset: Math.PI,
    tint: new THREE.Color(0x1b2230), // Stealth Obsidian Spec-Ops
    metalness: 0.65,
    roughness: 0.28,
    attachment: 'crimson_core'
  },
  Kael: {
    baseRig: 'Xbot',
    scale: 1.70,
    rotOffset: 0,
    tint: new THREE.Color(0x283848), // Astral Pilot Dark Titanium & Gold
    metalness: 0.85,
    roughness: 0.15,
    attachment: 'astral_halo'
  },
  DesertRanger: {
    baseRig: 'Soldier',
    scale: 1.70,
    rotOffset: Math.PI,
    tint: new THREE.Color(0xdba858), // Praetorian Solar Gold Armor
    metalness: 0.72,
    roughness: 0.22,
    attachment: 'solar_pauldrons'
  },
  Aegis: {
    baseRig: 'Xbot',
    scale: 1.72,
    rotOffset: 0,
    tint: new THREE.Color(0x4a88c8), // Deep-Space Cobalt Sentinel
    metalness: 0.90,
    roughness: 0.12,
    attachment: 'aegis_shield_pack'
  }
};

function createAvatarInstance(avatarKey = 'Vanguard', labelName = 'Explorer', mountType = 'none', level = 1) {
  const root = new THREE.Group();
  const vehicleBankGroup = new THREE.Group(); // Allows dynamic roll/pitch when turning or climbing
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

  if (chosenGltf) {
    const clonedScene = SkeletonUtils.clone(chosenGltf.scene);
    clonedScene.scale.set(scale, scale, scale);
    clonedScene.rotation.y = rotOffset;

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (spec.tint && child.material && avatarKey !== 'CustomUpload') {
          child.material = child.material.clone();
          child.material.color.copy(spec.tint);
          if (spec.metalness !== undefined) child.material.metalness = spec.metalness;
          if (spec.roughness !== undefined) child.material.roughness = spec.roughness;
        }
      }
    });
    charHolder.add(clonedScene);

    // Add bespoke 3D armor/crest distinction per lineage
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

    // Use 100% NATIVE animations from the model itself (Zero cross-rig bone distortion!)
    mixer = new THREE.AnimationMixer(clonedScene);
    for (const nativeClip of chosenGltf.animations || []) {
      actions[nativeClip.name.toLowerCase()] = mixer.clipAction(nativeClip);
    }
  }

  // Audit Fix #2: Vehicle & Mount Encapsulation
  // Closed-cockpit vehicles ('supercar', 'jet', 'starship') hide the standing human body inside the cabin!
  let mountMixer = null;
  if (mountType === 'horse' && modelCache.has('Horse')) {
    const horseGltf = modelCache.get('Horse');
    const horseMesh = SkeletonUtils.clone(horseGltf.scene);
    horseMesh.scale.set(0.015, 0.015, 0.015);
    vehicleBankGroup.add(horseMesh);
    charHolder.position.set(0, 1.08, -0.08);
    if (horseGltf.animations?.[0]) {
      mountMixer = new THREE.AnimationMixer(horseMesh);
      mountMixer.clipAction(horseGltf.animations[0]).play();
    }
  } else if (mountType === 'supercar' && modelCache.has('Ferrari')) {
    const carGltf = modelCache.get('Ferrari');
    const carMesh = carGltf.scene.clone();
    carMesh.scale.set(1.3, 1.3, 1.3);
    carMesh.rotation.y = Math.PI;
    vehicleBankGroup.add(carMesh);
    charHolder.visible = false; // Driver is seated inside the Ferrari cockpit, never standing through the roof!
  } else if (mountType === 'mythic_bird') {
    const birdGltf = modelCache.get('Stork') || modelCache.get('Flamingo');
    if (birdGltf) {
      const birdMesh = SkeletonUtils.clone(birdGltf.scene);
      birdMesh.scale.set(0.046, 0.046, 0.046);
      birdMesh.position.y = 0.9;
      vehicleBankGroup.add(birdMesh);
      charHolder.position.set(0, 1.32, -0.15);
      if (birdGltf.animations?.[0]) {
        mountMixer = new THREE.AnimationMixer(birdMesh);
        mountMixer.clipAction(birdGltf.animations[0]).play();
      }
    }
  } else if (mountType === 'jet') {
    const jetMesh = createAtmosphericJetMesh();
    vehicleBankGroup.add(jetMesh);
    charHolder.visible = false; // Pilot encapsulated inside tinted glass cockpit canopy!
  } else if (mountType === 'starship') {
    const shipMesh = createInterplanetaryStarshipMesh();
    vehicleBankGroup.add(shipMesh);
    charHolder.visible = false; // Commander encapsulated inside armored bridge!
  }

  if (labelName) {
    const nameSprite = createPlayerNameplate(`NV.${level} ${labelName}`);
    const labelY = mountType === 'horse' ? 4.3 : (mountType === 'supercar' ? 2.4 : 3.45);
    nameSprite.position.set(0, labelY, 0);
    root.add(nameSprite);
  }

  return { root, vehicleBankGroup, mixer, mountMixer, actions, currentAction: null, avatarKey, mountType, level };
}

function playAvatarAnim(avatarObj, desiredState = 'Idle') {
  if (!avatarObj || !avatarObj.mixer) return;
  // Audit Fix #2: Riders on Horse or Mythic Bird hold a stable 'Idle' riding stance instead of jogging on the saddle!
  if (avatarObj.mountType === 'horse' || avatarObj.mountType === 'mythic_bird') {
    desiredState = 'Idle';
  }

  const acts = avatarObj.actions;
  let clipKey = null;

  const candidates = {
    Idle: ['idle', 'standing'],
    Walk: ['walk', 'walking', 'run'],
    Run: ['run', 'running', 'walk'],
    Jump: ['jump', 'run', 'idle'],
    Dance: ['agree', 'sambadance', 'dance', 'wave', 'idle']
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

function createPlayerNameplate(nameText) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 76;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(7, 10, 18, 0.78)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 380, 56, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(229, 189, 115, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fff8eb';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(nameText.slice(0, 20), 200, 46);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(2.35, 0.45, 1);
  return sprite;
}

// ============================================================================
// LOCAL PLAYER, MOUNTS & PLANETARY GRAVITY FLOOR CALCULATION
// ============================================================================
let localAvatar = null;
const playerPos = new THREE.Vector3(0, 0, 18);
const playerVel = new THREE.Vector3();
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
      showToast('CRÉDITOS INSUFICIENTES', `Requiere ${cost} ✦. Extrae nodos o completa el Circuito GT.`);
      return;
    }
    state.coins -= cost;
    state.unlockedMounts.push(mType);
    state.mountType = mType;
    showToast('FLOTA ACTUALIZADA', `Has desbloqueado y equipado tu nuevo transporte.`);
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

function getLocalGroundHeight(x, z) {
  if (Math.hypot(x - 0, z - (-680)) < 52) return 260;
  if (Math.hypot(x - (-620), z - (-1100)) < 62) return 340;
  if (Math.hypot(x - 680, z - (-1350)) < 65) return 440;
  return 0;
}

function getCurrentPlanetLabel(x, y, z) {
  if (Math.hypot(x - 0, z - (-680)) < 95 && y > 180) return 'LUNA SELENE';
  if (Math.hypot(x - (-620), z - (-1100)) < 120 && y > 240) return 'MARTE ARES PRIME';
  if (Math.hypot(x - 680, z - (-1350)) < 130 && y > 320) return 'ANILLO AURELIA';
  if (y > 140) return 'ESPACIO PROFUNDO';
  if (y > 35) return 'ESTRATOSFERA';
  return 'SANTUARIO SOLAR';
}

// ============================================================================
// 2D REAL-TIME RADAR / MINIMAP RENDERER (TOP-LEFT HUD)
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
  const scale = 0.48; // 1 meter in world = 0.48px on radar (~115m radius coverage)

  ctx.clearRect(0, 0, w, h);

  // Radar Grid Rings
  ctx.strokeStyle = 'rgba(229, 189, 115, 0.16)';
  ctx.lineWidth = 1;
  [22, 42].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Crosshair Axes
  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.lineTo(cx, h - 6);
  ctx.moveTo(6, cy);
  ctx.lineTo(w - 6, cy);
  ctx.stroke();

  const toRadar = (wx, wz) => {
    const dx = (wx - playerPos.x) * scale;
    const dz = (wz - playerPos.z) * scale;
    return [cx + dx, cy + dz];
  };

  // Draw Resource Nodes (Small Cyan Dots)
  ctx.fillStyle = 'rgba(108, 229, 255, 0.65)';
  for (const [, item] of orbMeshes) {
    const [rx, rz] = toRadar(item.data.x, item.data.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 6) {
      ctx.fillRect(rx - 1.5, rz - 1.5, 3, 3);
    }
  }

  // Draw Major Landmarks & Relic Sanctuaries (Gold Diamonds)
  const landmarks = [
    { x: 0, z: 0, color: '#ffe2a6' },     // Central Altar
    { x: -75, z: 0, color: '#ffb85c' },   // West Horizon Relic
    { x: 0, z: -45, color: '#4fe0a3' },   // North Archon IA
    { x: 75, z: 0, color: '#ff6b6b' },    // East Valor Relic
    { x: 0, z: -88, color: '#6ce5ff' }    // North Spaceport
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

  // Draw Nearby Multiplayer Explorers (Emerald Dots)
  ctx.fillStyle = '#4fe0a3';
  for (const [, rem] of remotePlayers) {
    const [rx, rz] = toRadar(rem.targetPos.x, rem.targetPos.z);
    if (Math.hypot(rx - cx, rz - cy) < cx - 5) {
      ctx.beginPath();
      ctx.arc(rx, rz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Local Player Heading Arrow at Center
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
  if (e.code === 'KeyM') {
    updateHUD();
    document.getElementById('starmap-modal').classList.toggle('hidden');
  }
  if (e.code === 'KeyK') {
    updateHUD();
    document.getElementById('skills-modal').classList.toggle('hidden');
  }
  if (e.code === 'KeyO') openArchonModal();
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
        showToast('TRÁNSITO CUÁNTICO COMPLETADO', `Destino: ${dest.name} (-${packet.farePaid} ✦).`);
      }
      updateHUD();
    } else if (packet.t === 'transit_denied') {
      showToast('PEAJE RECHAZADO', packet.reason);
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
          showToast(`ASCENSO AL NIVEL ${ev.newLevel}`, `+1 Punto de Códice disponible [K].`);
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
        showToast(`ASCENSO AL NIVEL ${ev.newLevel}`, `+1 Punto de Códice disponible [K].`);
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
      spawnShockwave(new THREE.Vector3(ev.x, ev.y + 0.5, ev.z), 0xffcf70);
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
  const txt = document.getElementById('context-action-text');
  activeContextFn = null;

  for (const attr of interactiveAttractions) {
    if (playerPos.distanceTo(attr.position) < attr.radius) {
      txt.textContent = attr.label;
      btn.classList.remove('hidden');
      activeContextFn = attr.action;
      return;
    }
  }

  if (playerPos.distanceTo(new THREE.Vector3(0, 0, 0)) < 8.0) {
    if (state.relics[0] && state.relics[1] && state.relics[2]) {
      txt.textContent = 'Activar Altar de la Ascensión (+50,000 ✦ / +5,000 XP)';
      btn.classList.remove('hidden');
      activeContextFn = () => {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'claim_ascension' }));
      };
    } else {
      txt.textContent = 'Abrir Carta Estelar, Peajes & Hangar de Flota';
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

  const maxHp = state.maxHp || 100;
  const hpPct = Math.max(0, Math.min(100, Math.round((state.hp / maxHp) * 100)));
  document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
  document.getElementById('hud-hp').textContent = `${state.hp}/${maxHp}`;

  document.getElementById('hud-coins').textContent = state.coins.toLocaleString();
  document.getElementById('hud-online').textContent = state.onlineCount;

  const pct = state.level >= 100 ? 100 : Math.min(100, Math.round((state.xp / Math.max(1, state.xpNext)) * 100));
  document.getElementById('hud-xp-fill').style.width = `${pct}%`;
  document.getElementById('hud-xp-text').textContent =
    state.level >= 100 ? 'NIVEL 100 MÁXIMO' : `XP ${state.xp} / ${state.xpNext}`;

  const altMeters = Math.max(0, Math.round(playerPos.y));
  document.getElementById('hud-altitude').textContent = `ALT ${altMeters}m`;

  const ptBadge = document.getElementById('skill-pt-badge');
  if (state.skillPoints > 0) {
    ptBadge.textContent = state.skillPoints;
    ptBadge.classList.remove('hidden');
  } else {
    ptBadge.classList.add('hidden');
  }

  document.getElementById('sk-lvl').textContent = state.level;
  document.getElementById('sk-pts').textContent = state.skillPoints;
  if (state.skills) {
    document.getElementById('sk-val-velocity').textContent = state.skills.velocity || 0;
    document.getElementById('sk-val-aetherPower').textContent = state.skills.aetherPower || 0;
    document.getElementById('sk-val-vitality').textContent = state.skills.vitality || 0;
    document.getElementById('sk-val-cosmicMastery').textContent = state.skills.cosmicMastery || 0;
  }

  ['horse', 'supercar', 'mythic_bird', 'jet', 'starship'].forEach((m) => {
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

  const lbBox = document.getElementById('leaderboard-box');
  if (lbBox) {
    lbBox.innerHTML = '';
    state.leaderboard.slice(0, 8).forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `lb-item ${idx === 0 ? 'first' : ''}`;
      const relCount = (item.relics || []).filter(Boolean).length;
      row.innerHTML = `<span>#${idx + 1} [NV.${item.level || 1}] ${item.name}</span><span>❖ ${relCount}/3 • ${(item.score || 0).toLocaleString()}</span>`;
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
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4200);
}

function appendChat(author, text) {
  const box = document.getElementById('chat-messages');
  const d = document.createElement('div');
  d.innerHTML = `<b style="color:#ffe2a6">${author}:</b> ${text}`;
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

// Level 1-100 Skills Modal
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
      showToast('CÓDICE COMPLETO POR AHORA', 'Sube de nivel extrayendo nodos o completando misiones.');
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
    `NV.${state.level} ${state.playerName} • Reliquias: ${relCount}/3 • ${state.onlineCount} Exploradores Online`;
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
// MAIN RENDER, COLLISION & INTERPLANETARY SIMULATION LOOP
// ============================================================================
const clock = new THREE.Clock();
let lastNetSend = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  oceanWater.material.uniforms['time'].value += dt * 0.6;

  for (const body of celestialBodies) {
    body.rotation.y += dt * 0.035;
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
      r.mesh.position.y = r.baseY + Math.sin(elapsed * 2.0) * 0.3;
    }
  }

  for (const [, o] of orbMeshes) {
    o.mesh.rotation.y += dt * 1.4;
  }

  // Distance-cull 3D wayfinder plaques so horizon is clean and uncluttered
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
    const velocityMultiplier = 1 + (state.skills?.velocity || 0) * 0.06;
    let baseSpeed = (keysPressed['ShiftLeft'] ? 15 : 10.5) * velocityMultiplier;
    if (state.mountType === 'horse') baseSpeed = 20.0 * velocityMultiplier;
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

    // Audit Fix #3: Enforce 2-pass sliding obstacle collision resolution!
    const colRadius = state.mountType === 'supercar' ? 1.4 : 0.85;
    resolveHorizontalCollisions(playerPos, colRadius);

    // Vertical Physics
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

    // Dynamic Vehicle Banking (Roll on turns, Pitch on climb/descent)
    if (localAvatar.vehicleBankGroup) {
      let yawDelta = playerYaw - prevPlayerYaw;
      if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;

      const targetRoll = isFlyingMount ? THREE.MathUtils.clamp(-yawDelta * 4.5, -0.45, 0.45) : 0;
      const targetPitch = isFlyingMount
        ? (ascendHeld ? -0.26 : (descendHeld ? 0.26 : 0))
        : 0;

      localAvatar.vehicleBankGroup.rotation.z = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.z, targetRoll, 0.15);
      localAvatar.vehicleBankGroup.rotation.x = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.x, targetPitch, 0.15);
    }

    sky.visible = playerPos.y < 135;
    scene.fog.density = playerPos.y < 135 ? 0.0020 : 0.00015;

    localAvatar.root.position.copy(playerPos);
    localAvatar.root.rotation.y = playerYaw;
    playAvatarAnim(localAvatar, currentAnim);
    if (localAvatar.mixer) localAvatar.mixer.update(dt);
    if (localAvatar.mountMixer && len > 0.08) localAvatar.mountMixer.update(dt * 1.3);

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
    renderRadarMinimap();

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
      localAvatar.root.position.set(0, 0.18, 18);
      localAvatar.root.rotation.y = Math.sin(elapsed * 0.5) * 0.32;
      if (localAvatar.mixer) localAvatar.mixer.update(dt);
    }
    const camX = Math.sin(elapsed * 0.22) * 1.1;
    camera.position.set(camX, 2.25, 22.6);
    camera.lookAt(0, 1.75, 18);
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
