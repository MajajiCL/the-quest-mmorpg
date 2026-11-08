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
  unlockedMounts: ['none', 'horse'],
  mountType: 'none', // 'none' | 'horse' | 'supercar' | 'mythic_bird' | 'jet' | 'starship'
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
    this.playTone(165, 0.22, 'sawtooth', 0.11);
    setTimeout(() => this.playTone(240, 0.20, 'triangle', 0.10), 45);
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
// REAL PBR MATERIALS & SEAMLESS UNIFIED PLANETARY ARCHITECTURES
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

const earthNormalTex = texLoader.load('/textures/planets/earth_normal_2048.jpg');
const earthCloudsTex = texLoader.load('/textures/planets/earth_clouds_1024.png');

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

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const animatedRelics = [];
const interactiveAttractions = [];
const raceRingPositions = [];
const raceRingMeshes = [];
const animatedFlock = [];
const celestialBodies = [];
const wayfinderPlaques = [];

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
}

buildMasterPlannedUniverse();

// ============================================================================
// DRACO + GLTF ASSET LOADER (PLAYERS, VEHICLES, MONSTERS & REACTORS)
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
    { key: 'Robot', url: '/models/RobotExpressive.glb' },
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
// HIGH-DETAIL SPACECRAFT, JET & MU ONLINE 3D WINGS / GLOWING AURAS
// ============================================================================
function createAtmosphericJetMesh() {
  const g = new THREE.Group();

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

  // Pilot Cockpit Seat Recess + Transparent Glass Canopy (So seated pilot is clearly visible inside!)
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.15), obsidianMat);
  seatBack.position.set(0, 1.35, -0.2);
  g.add(seatBack);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 16), canopyGlassMat);
  canopy.scale.set(0.88, 0.68, 2.35);
  canopy.position.set(0, 1.56, 0.35);
  g.add(canopy);

  // Swept Delta Main Wings + Forward Canards + Gold Wingtip Rails
  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 2.1), polishedMarbleMat);
  mainWing.position.set(0, 1.12, -0.75);
  mainWing.castShadow = true;
  g.add(mainWing);

  [-3.6, 3.6].forEach((wx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12), ancientGoldMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(wx, 1.12, -0.6);
    g.add(rail);
  });

  // Twin Canted Vertical Stabilizers
  [-1.05, 1.05].forEach((tx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 1.4), ancientGoldMat);
    fin.position.set(tx, 1.75, -2.25);
    fin.rotation.z = tx > 0 ? -0.26 : 0.26;
    g.add(fin);
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
  }

  if (labelName) {
    const plusTag = gearLevel > 0 ? ` [+${gearLevel}]` : '';
    const nameSprite = createPlayerNameplate(`NV.${level} ${labelName}${plusTag}`);
    const labelY = mountType === 'horse' ? 3.85 : (mountType === 'supercar' ? 2.45 : (mountType === 'starship' ? 3.6 : 3.45));
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

function updateAvatarAnimationAndPose(avatarObj, dt, desiredState = 'Idle') {
  if (!avatarObj) return;
  if (avatarObj.mountType && avatarObj.mountType !== 'none') {
    desiredState = 'Idle';
  }
  playAvatarAnim(avatarObj, desiredState);
  if (avatarObj.mixer) avatarObj.mixer.update(dt);
  // Apply seated biomechanical leg/knee/arm articulation AFTER mixer update!
  if (avatarObj.mountType && avatarObj.mountType !== 'none' && avatarObj.clonedScene) {
    applySeatedMountPose(avatarObj.clonedScene, avatarObj.mountType);
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
  if (gltf) {
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
  const prices = { horse: 0, supercar: 400, mythic_bird: 650, jet: 1200, starship: 2500 };
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
  if (Math.hypot(x - 0, z - (-680)) < 60) return 260;
  if (Math.hypot(x - (-620), z - (-1100)) < 70) return 340;
  if (Math.hypot(x - 680, z - (-1350)) < 74) return 440;
  return 0;
}

function getCurrentPlanetLabel(x, y, z) {
  if (Math.hypot(x - 0, z - (-680)) < 105 && y > 180) return 'LUNA SELENE';
  if (Math.hypot(x - (-620), z - (-1100)) < 125 && y > 220) return 'MARTE ARES PRIME';
  if (Math.hypot(x - 680, z - (-1350)) < 135 && y > 300) return 'ANILLO AURELIA';
  if (y > 135) return 'ESPACIO PROFUNDO';
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

  // Major Landmarks & Relic Sanctuaries
  const landmarks = [
    { x: 0, z: 0, color: '#ffe2a6' },
    { x: -75, z: 0, color: '#ffb85c' },
    { x: 0, z: -45, color: '#4fe0a3' },
    { x: 75, z: 0, color: '#ff6b6b' },
    { x: 0, z: -88, color: '#6ce5ff' }
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
document.getElementById('btn-soulshot').addEventListener('click', () => toggleSoulshots());

function toggleSoulshots() {
  state.soulshotsActive = !state.soulshotsActive;
  sfx.playTone(state.soulshotsActive ? 680 : 320, 0.1, 'sine', 0.08);
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'toggle_soulshots' }));
  updateHUD();
}

function useVitalPotion() {
  if ((state.inventory?.potions || 0) <= 0) {
    showToast('SIN CARGAS VITALES', 'Adquiere Cargas de Reparación en la Forja [F].');
    return;
  }
  sfx.shard();
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'use_potion' }));
  spawnFloatingCombatText(playerPos, '+VIDA', false, '#4fe0a3');
}

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
  sfx.strike();
  const usingShot = state.soulshotsActive && (state.inventory?.soulshots || 0) > 0;
  spawnShockwave(playerPos.clone().add(new THREE.Vector3(0, 0.7, 0)), usingShot ? 0x6ce5ff : 0xffcf70);
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

  // Check if close to an alive Monster or Raid Boss to show Attack Hint
  for (const [, mob] of monsterEntities) {
    if (playerPos.distanceTo(mob.targetPos) < 11.5) {
      txt.textContent = `Atacar con Pulso de Éter [Q] (${state.soulshotsActive ? 'Soulshot x1.85 Activo' : 'Normal'})`;
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
      };
    } else {
      txt.textContent = 'Abrir Forja del Caos (+15, Alas & Alianza) [F]';
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
      const glTag = item.gearLevel ? ` +${item.gearLevel}` : '';
      row.innerHTML = `<span>#${idx + 1} [NV.${item.level || 1}${glTag}] ${item.name}</span><span>❖ ${relCount}/3 • ${(item.score || 0).toLocaleString()}</span>`;
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
    }
  });
});

document.querySelectorAll('.attr-card[data-supply]').forEach((card) => {
  card.addEventListener('click', () => {
    const item = card.dataset.supply;
    sfx.shard();
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ t: 'buy_supplies', item }));
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
// MAIN RENDER, COLLISION, MONSTER AI & INTERPLANETARY SIMULATION LOOP
// ============================================================================
const clock = new THREE.Clock();
let lastNetSend = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
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

      const targetRoll = isFlyingMount ? THREE.MathUtils.clamp(-yawDelta * 4.5, -0.45, 0.45) : 0;
      const targetPitch = isFlyingMount
        ? (ascendHeld ? -0.26 : (descendHeld ? 0.26 : 0))
        : 0;

      localAvatar.vehicleBankGroup.rotation.z = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.z, targetRoll, 0.15);
      localAvatar.vehicleBankGroup.rotation.x = THREE.MathUtils.lerp(localAvatar.vehicleBankGroup.rotation.x, targetPitch, 0.15);
    }

    sky.visible = playerPos.y < 135;
    scene.fog.density = playerPos.y < 135 ? 0.0018 : 0.00012;

    localAvatar.root.position.copy(playerPos);
    localAvatar.root.rotation.y = playerYaw;
    updateAvatarAnimationAndPose(localAvatar, dt, currentAnim);
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

preloadCoreModels().then(() => {
  rebuildLocalAvatar();
});
connectWebSocket();
animate();
