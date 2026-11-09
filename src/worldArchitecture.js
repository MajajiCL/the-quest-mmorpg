import * as THREE from 'three';

// ============================================================================
// THE QUEST — HIGH-PERFORMANCE PROCEDURAL WORLD ARCHITECTURE ENGINE
// ============================================================================
// Replaces primitive greybox discs and cylinders with rich, multi-tiered
// architectural complexes across all 4 celestial worlds (Earth, Moon, Mars, Aurelia).
// Guaranteed 60 FPS WebGL: Uses InstancedMesh for high-density props, shared
// PBR materials, efficient geometry reuse, and clean cylinder/box colliders.
// ============================================================================

export function buildDetailedWorldArchitectures({
  scene,
  worldGroup,
  baseMaterials,
  addCylinderCollider,
  addBoxCollider,
  animatedWorldProps
}) {
  const {
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
  } = baseMaterials;

  // --------------------------------------------------------------------------
  // DEDICATED HIGH-PERFORMANCE SHARED PBR MATERIALS
  // --------------------------------------------------------------------------
  const sciFiHullMat = new THREE.MeshStandardMaterial({
    color: 0xdfebf5,
    roughness: 0.28,
    metalness: 0.78,
    bumpMap: brickBump,
    bumpScale: 0.01
  });

  const sciFiDarkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1b2029,
    roughness: 0.35,
    metalness: 0.88
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    color: 0x0c2548,
    roughness: 0.12,
    metalness: 0.92,
    emissive: 0x061426,
    emissiveIntensity: 0.2
  });

  const hazardStripeMat = new THREE.MeshStandardMaterial({
    color: 0xffa726,
    roughness: 0.4,
    metalness: 0.5,
    emissive: 0xd87000,
    emissiveIntensity: 0.5
  });

  const kyberOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xff5511,
    roughness: 0.14,
    metalness: 0.1,
    emissive: 0xff3b00,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.92
  });

  const aureliaVoidMat = new THREE.MeshStandardMaterial({
    color: 0x33e5ff,
    roughness: 0.12,
    metalness: 0.2,
    emissive: 0x00bfff,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.9
  });

  const rockBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x3a302d,
    roughness: 0.92,
    metalness: 0.06,
    bumpMap: brickBump,
    bumpScale: 0.18
  });

  const lunarRockMat = new THREE.MeshStandardMaterial({
    color: 0x767a80,
    roughness: 0.9,
    metalness: 0.05,
    bumpMap: moonTex,
    bumpScale: 0.14
  });

  const crateWoodMat = new THREE.MeshStandardMaterial({
    color: 0x936f45,
    roughness: 0.78,
    metalness: 0.06
  });

  const corrosionSteelMat = new THREE.MeshStandardMaterial({
    color: 0x47515d,
    roughness: 0.52,
    metalness: 0.68
  });

  const dummy = new THREE.Object3D();

  // ==========================================================================
  // 1. EARTH & HARBOR: CITADEL REVETMENTS, SEAWALLS, HARBOR GANTRY & CARGO
  // ==========================================================================

  // --- Coastal Rock Formations (Eliminate Smooth Cone Cylinder Beach Edge) ---
  const coastalRockGeo = new THREE.DodecahedronGeometry(2.4, 1);
  const rockCount = 48;
  const coastalRocks = new THREE.InstancedMesh(coastalRockGeo, rockBasaltMat, rockCount);
  coastalRocks.receiveShadow = true;
  let rIdx = 0;

  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.08);
    const deg = Math.round(THREE.MathUtils.radToDeg(angle) + 360) % 360;
    // Keep spaceport causeway (north: 260-280 deg) and harbor pier (south: 80-100 deg) clear
    if ((deg >= 78 && deg <= 102) || (deg >= 258 && deg <= 282)) continue;

    const r = 84 + (Math.sin(i * 5.3) * 6.5);
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const py = -0.4 + (Math.sin(i * 2.1) * 0.35);
    const s = 0.8 + ((i % 5) * 0.42);

    dummy.position.set(px, py, pz);
    dummy.scale.set(s * 1.3, s * 0.9, s * 1.2);
    dummy.rotation.set(Math.sin(i), angle + 0.3, Math.cos(i));
    dummy.updateMatrix();
    coastalRocks.setMatrixAt(rIdx++, dummy.matrix);
  }
  coastalRocks.count = rIdx;
  coastalRocks.instanceMatrix.needsUpdate = true;
  worldGroup.add(coastalRocks);

  // --- Stone Breakwater Groynes (6 Natural Sea Barriers Jutting from Beach) ---
  const groyneAngles = [0.75, 1.4, 2.2, 3.8, 4.6, 5.4]; // Radians away from docks
  groyneAngles.forEach((ga, gIdx) => {
    const gLen = 18;
    const gWidth = 3.4;
    const gMesh = new THREE.Mesh(new THREE.BoxGeometry(gWidth, 1.2, gLen), rockBasaltMat);
    const centerDist = 88;
    gMesh.position.set(
      Math.cos(ga) * centerDist,
      -0.2,
      Math.sin(ga) * centerDist
    );
    gMesh.rotation.y = -ga + Math.PI / 2;
    gMesh.receiveShadow = true;
    worldGroup.add(gMesh);

    // Decorative beacon lantern on groyne tip
    const tipDist = centerDist + gLen * 0.45;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 8), corrosionSteelMat);
    post.position.set(Math.cos(ga) * tipDist, 0.8, Math.sin(ga) * tipDist);
    worldGroup.add(post);

    const tipBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshBasicMaterial({ color: gIdx % 2 === 0 ? 0x2bff77 : 0xff3b30 })
    );
    tipBeacon.position.set(Math.cos(ga) * tipDist, 2.1, Math.sin(ga) * tipDist);
    worldGroup.add(tipBeacon);
  });

  // --- Multi-Tier Citadel Seawall Coping & Stone Parapets ---
  const seawallRing = new THREE.Mesh(
    new THREE.RingGeometry(75.5, 76.5, 72),
    new THREE.MeshStandardMaterial({ color: 0x5a544d, roughness: 0.82, metalness: 0.12 })
  );
  seawallRing.rotation.x = -Math.PI / 2;
  seawallRing.position.y = 0.08;
  worldGroup.add(seawallRing);

  // --- South Imperial Harbor: Heavy Maritime Gantry Crane (+6.5, 0, +85) ---
  const craneGroup = new THREE.Group();
  craneGroup.position.set(7.2, 0, 85);

  // Crane concrete/iron structural plinth
  const cranePlinth = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 4.2), sciFiDarkMetalMat);
  cranePlinth.position.y = 0.5;
  cranePlinth.castShadow = true;
  cranePlinth.receiveShadow = true;
  craneGroup.add(cranePlinth);
  addCylinderCollider(7.2, 85, 2.4, -2, 18);

  // Crane 4-legged gantry frame
  [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([cx, cz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6.5, 8), corrosionSteelMat);
    leg.position.set(cx, 4.25, cz);
    leg.castShadow = true;
    craneGroup.add(leg);
  });

  // Slewing turntable deck
  const slewDeck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.6, 16), ancientGoldMat);
  slewDeck.position.y = 7.6;
  craneGroup.add(slewDeck);

  // Operator Cabin
  const craneCabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.6), sciFiHullMat);
  craneCabin.position.set(0.6, 9.3, 0);
  craneCabin.castShadow = true;
  craneGroup.add(craneCabin);

  const cabinWindow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.2), canopyGlassMat);
  cabinWindow.position.set(0.6, 9.6, 1.35);
  craneGroup.add(cabinWindow);

  // Counter-jib & ballast weight
  const counterJib = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 5.5), corrosionSteelMat);
  counterJib.position.set(0, 10.8, -2.6);
  craneGroup.add(counterJib);

  const ballastBlock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.8), sciFiDarkMetalMat);
  ballastBlock.position.set(0, 10.8, -4.8);
  ballastBlock.castShadow = true;
  craneGroup.add(ballastBlock);

  // Main lattice forward boom extending over the water
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 14.5, 8), corrosionSteelMat);
  boom.rotation.x = Math.PI / 2.75;
  boom.position.set(0, 13.8, 5.5);
  craneGroup.add(boom);

  // Winch cables & suspended heavy cargo hook
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7.5, 6), sciFiDarkMetalMat);
  cable.position.set(0, 8.2, 10.8);
  craneGroup.add(cable);

  const cargoHook = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.12, 8, 16, Math.PI * 1.5), ancientGoldMat);
  cargoHook.position.set(0, 4.4, 10.8);
  cargoHook.rotation.z = Math.PI;
  craneGroup.add(cargoHook);

  worldGroup.add(craneGroup);

  // --- Quayside Cargo Depot (Shipping Crates & Barrels) ---
  const crateGeo = new THREE.BoxGeometry(1.4, 1.3, 1.4);
  const crateCount = 20;
  const crateMesh = new THREE.InstancedMesh(crateGeo, crateWoodMat, crateCount);
  crateMesh.castShadow = true;
  crateMesh.receiveShadow = true;

  const cratePlacements = [
    // West pier stacking
    [-3.8, 0.65, 75, 0.2],
    [-3.8, 0.65, 76.6, -0.1],
    [-3.8, 1.95, 75.8, 0.05],
    [-3.6, 0.65, 82, 0.4],
    [-3.6, 0.65, 83.6, 0.1],
    [-3.8, 0.65, 94, 0.0],
    [-3.8, 0.65, 95.6, 0.3],
    [-3.8, 1.95, 94.8, -0.2],
    // East pier stacking
    [3.8, 0.65, 74, -0.15],
    [3.8, 0.65, 75.6, 0.25],
    [3.8, 1.95, 74.8, 0.1],
    [3.8, 0.65, 91, 0.0],
    [3.8, 0.65, 92.6, 0.35],
    [3.8, 1.95, 91.8, -0.1],
    // Warehouse apron
    [-7.2, 0.65, 73, 0.3],
    [-7.2, 0.65, 74.6, -0.2],
    [-8.8, 0.65, 73.8, 0.1],
    [-8.0, 1.95, 73.8, 0.0],
    [-6.8, 0.65, 66, 0.4],
    [-6.8, 1.95, 66, -0.1]
  ];
  cratePlacements.forEach(([cx, cy, cz, rotY], idx) => {
    dummy.position.set(cx, cy, cz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, rotY, 0);
    dummy.updateMatrix();
    crateMesh.setMatrixAt(idx, dummy.matrix);
  });
  crateMesh.instanceMatrix.needsUpdate = true;
  worldGroup.add(crateMesh);

  // Instanced Cargo Barrels
  const barrelGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.1, 12);
  const barrelCount = 18;
  const barrelMesh = new THREE.InstancedMesh(barrelGeo, hardwoodMat, barrelCount);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;

  const barrelPlacements = [
    [-4.2, 0.55, 78], [-3.4, 0.55, 78.4], [-3.8, 1.65, 78.2],
    [-4.2, 0.55, 89], [-3.4, 0.55, 89.4], [-3.8, 1.65, 89.2],
    [4.2, 0.55, 78], [3.4, 0.55, 78.4], [3.8, 1.65, 78.2],
    [4.2, 0.55, 95], [3.4, 0.55, 95.4], [3.8, 1.65, 95.2],
    [-7.8, 0.55, 68], [-7.2, 0.55, 68.6], [-8.4, 0.55, 68.4],
    [-7.5, 1.65, 68.3], [12.8, 0.55, 84], [13.6, 0.55, 84.6]
  ];
  barrelPlacements.forEach(([bx, by, bz], idx) => {
    dummy.position.set(bx, by, bz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, idx * 0.4, 0);
    dummy.updateMatrix();
    barrelMesh.setMatrixAt(idx, dummy.matrix);
  });
  barrelMesh.instanceMatrix.needsUpdate = true;
  worldGroup.add(barrelMesh);

  // --- Harbormaster Customs Shed (-8.5, 0, +68) ---
  const shedGroup = new THREE.Group();
  shedGroup.position.set(-8.5, 0, 68);

  const shedBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.4, 6.2), hardwoodMat);
  shedBase.position.y = 1.7;
  shedBase.castShadow = true;
  shedBase.receiveShadow = true;
  shedGroup.add(shedBase);

  const shedRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.0, 4), obsidianMat);
  shedRoof.position.y = 4.4;
  shedRoof.rotation.y = Math.PI / 4;
  shedRoof.scale.set(1.1, 1.0, 1.35);
  shedGroup.add(shedRoof);

  // Front porch canopy over door
  const porchBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 1.8), hardwoodMat);
  porchBeam.position.set(0, 2.8, 3.8);
  shedGroup.add(porchBeam);

  const porchLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd278 })
  );
  porchLantern.position.set(0, 2.5, 3.8);
  shedGroup.add(porchLantern);

  worldGroup.add(shedGroup);
  addBoxCollider(-11.2, -5.8, 64.5, 71.5, -2, 7);

  // --- Channel Maritime Navigation Buoys ---
  [[-18, 122], [18, 122]].forEach(([bx, bz], idx) => {
    const buoyGroup = new THREE.Group();
    buoyGroup.position.set(bx, -0.2, bz);

    const buoyHull = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.45, 1.8, 16), idx === 0 ? sciFiHullMat : hazardStripeMat);
    buoyHull.position.y = 0.6;
    buoyGroup.add(buoyHull);

    const buoyCage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 2.4, 8), corrosionSteelMat);
    buoyCage.position.y = 2.4;
    buoyGroup.add(buoyCage);

    const buoyLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x2bff77 : 0xff3333 })
    );
    buoyLight.position.y = 3.6;
    buoyGroup.add(buoyLight);

    worldGroup.add(buoyGroup);
    animatedWorldProps.push({
      type: 'buoy',
      group: buoyGroup,
      baseY: -0.2,
      freq: 1.4 + idx * 0.2,
      phase: idx * 1.5
    });
  });

  // --- North Spaceport Orbital Launch Complex: Launch Gantry & Umbilical Catwalks (-15, 0, -88) ---
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(-15, 0, -88);

  // Structural vertical truss mast
  const gantryMast = new THREE.Mesh(new THREE.BoxGeometry(3.6, 26, 3.6), sciFiDarkMetalMat);
  gantryMast.position.y = 13;
  gantryMast.castShadow = true;
  gantryGroup.add(gantryMast);
  addBoxCollider(-17.5, -12.5, -90.5, -85.5, -2, 28);

  // 3 Horizontal Umbilical Catwalk Arms reaching toward launchpad
  [9, 16, 22].forEach((armY) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.7, 1.4), sciFiHullMat);
    arm.position.set(5.5, armY, 0);
    arm.castShadow = true;
    gantryGroup.add(arm);

    const umbilicalPipes = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.2, 8), hazardStripeMat);
    umbilicalPipes.rotation.z = Math.PI / 2;
    umbilicalPipes.position.set(5.5, armY + 0.6, 0.4);
    gantryGroup.add(umbilicalPipes);
  });

  // Aviation Beacon on top of gantry
  const gantryBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff2b2b })
  );
  gantryBeacon.position.set(0, 26.5, 0);
  gantryGroup.add(gantryBeacon);

  worldGroup.add(gantryGroup);

  // --- Dual Deep-Space Radar Dish Arrays ---
  [[-13, -72], [13, -72]].forEach(([rx, rz], rIdx2) => {
    const radarTower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 7.5, 12), sciFiDarkMetalMat);
    radarTower.position.set(rx, 3.75, rz);
    radarTower.castShadow = true;
    worldGroup.add(radarTower);
    addCylinderCollider(rx, rz, 1.4, -2, 10);

    const dishPivot = new THREE.Group();
    dishPivot.position.set(rx, 7.8, rz);

    const dishMesh = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 1.2, 24, 1, true),
      sciFiHullMat
    );
    dishMesh.rotation.x = Math.PI / 2.3;
    dishPivot.add(dishMesh);

    const dishFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8), ancientGoldMat);
    dishFeed.rotation.x = Math.PI / 2.3;
    dishFeed.position.set(0, 0.5, 1.1);
    dishPivot.add(dishFeed);

    worldGroup.add(dishPivot);
    animatedWorldProps.push({
      type: 'radar',
      pivot: dishPivot,
      speed: 0.28 + rIdx2 * 0.08
    });
  });

  // --- Spaceport Approach Luminescent Runway Beacons ---
  const beaconGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.45, 8);
  const runwayEdgeBeacons = new THREE.InstancedMesh(
    beaconGeo,
    new THREE.MeshBasicMaterial({ color: 0x5ce6ff }),
    20
  );
  let bIdx = 0;
  for (let z = -60; z >= -84; z -= 2.5) {
    [-3.8, 3.8].forEach((bx) => {
      dummy.position.set(bx, 0.22, z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      runwayEdgeBeacons.setMatrixAt(bIdx++, dummy.matrix);
    });
  }
  runwayEdgeBeacons.instanceMatrix.needsUpdate = true;
  worldGroup.add(runwayEdgeBeacons);

  // --- Dragon Island (0, 0, 185): Basalt Sea Cliffs, Leviathan Fossil Ribs & Ruin Arch ---
  const dragonIslandGroup = new THREE.Group();

  // 14 Basalt sea cliff crags ringing the southern half of Dragon Island
  const cliffGeo = new THREE.ConeGeometry(3.8, 12, 5);
  const dragonCliffs = new THREE.InstancedMesh(cliffGeo, rockBasaltMat, 14);
  dragonCliffs.castShadow = true;
  dragonCliffs.receiveShadow = true;

  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 0.15 + (i / 13) * Math.PI * 0.7; // Southern arc
    const cr = 28 + (Math.sin(i * 3.1) * 3.5);
    dummy.position.set(Math.cos(a) * cr, 3.2 + (Math.sin(i * 2.4) * 1.5), 185 + Math.sin(a) * cr);
    dummy.scale.set(1.0 + (i % 3) * 0.25, 0.9 + (i % 4) * 0.3, 1.0 + (i % 2) * 0.3);
    dummy.rotation.set(0.1, a, 0.08);
    dummy.updateMatrix();
    dragonCliffs.setMatrixAt(i, dummy.matrix);
  }
  dragonCliffs.instanceMatrix.needsUpdate = true;
  dragonIslandGroup.add(dragonCliffs);

  // Ancient Dragon Ruin Trilithon Gate (0, 0, 172)
  [-3.8, 3.8].forEach((colX) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9.5, 1.6), obsidianMat);
    col.position.set(colX, 4.75, 172);
    col.castShadow = true;
    dragonIslandGroup.add(col);
    addBoxCollider(colX - 1.1, colX + 1.1, 170.8, 173.2, -2, 12);
  });
  const archLintel = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.4, 2.0), obsidianMat);
  archLintel.position.set(0, 10.0, 172);
  archLintel.castShadow = true;
  dragonIslandGroup.add(archLintel);

  // 6 Colossal Curved Leviathan Fossil Ribs
  for (let i = 0; i < 6; i++) {
    const zOffset = 180 + i * 4.2;
    [-7.5, 7.5].forEach((rx, side) => {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(5.8, 0.38, 10, 24, Math.PI * 0.65),
        new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.85, metalness: 0.08 })
      );
      rib.position.set(side === 0 ? rx + 2.5 : rx - 2.5, 2.2, zOffset);
      rib.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
      rib.rotation.z = side === 0 ? -0.3 : 0.3;
      rib.castShadow = true;
      dragonIslandGroup.add(rib);
    });
  }

  // 4 Black Iron Sacrificial Braziers
  [[-4.5, 188], [4.5, 188], [-4.5, 196], [4.5, 196]].forEach(([bx, bz]) => {
    const brBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.8, 12), obsidianMat);
    brBase.position.set(bx, 0.9, bz);
    dragonIslandGroup.add(brBase);

    const brBowl = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ancientGoldMat);
    brBowl.position.set(bx, 1.9, bz);
    dragonIslandGroup.add(brBowl);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff6600 })
    );
    flame.position.set(bx, 2.3, bz);
    dragonIslandGroup.add(flame);
  });

  worldGroup.add(dragonIslandGroup);

  // --- Golden Reef Island (+165, 0, +110): Shipwreck & Coral Pinnacle Rocks ---
  const reefGroup = new THREE.Group();

  // Shipwreck of the "Vanguard": Tilting timber hull ribs protruding from surf
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 0.5), hardwoodMat);
    rib.position.set(182 + i * 1.8, 1.4, 116 + i * 1.2);
    rib.rotation.set(0.35, 0.4, 0.25);
    rib.castShadow = true;
    reefGroup.add(rib);
  }
  // Broken fractured mainmast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 11.5, 8), hardwoodMat);
  mast.position.set(186, 4.2, 119);
  mast.rotation.set(0.42, 0.2, -0.35);
  mast.castShadow = true;
  reefGroup.add(mast);

  // Weathered wooden dock landing for adventurers
  const reefDock = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 12), hardwoodMat);
  reefDock.position.set(151, 0.12, 104);
  reefDock.rotation.y = 0.55;
  reefDock.receiveShadow = true;
  reefGroup.add(reefDock);

  worldGroup.add(reefGroup);


  // ==========================================================================
  // 2. THE MOON (SELENE BASE TRANQUILITY): GEODESIC HABITATS, DISH & SOLAR FARM
  // ==========================================================================
  const moonArchGroup = new THREE.Group();
  moonArchGroup.position.set(0, 260, -680);

  // Geodesic Structural Rib Framework for Central Habitat Dome (0, 0, -16 relative)
  const domeRibs = new THREE.Mesh(
    new THREE.TorusGeometry(11.1, 0.28, 12, 48, Math.PI),
    sciFiDarkMetalMat
  );
  domeRibs.position.set(0, 0, -16);
  domeRibs.rotation.x = Math.PI / 2;
  moonArchGroup.add(domeRibs);

  // Pressurized Airlock Vestibule at the entrance to the Main Dome
  const airlockTube = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5.2, 16), sciFiHullMat);
  airlockTube.rotation.x = Math.PI / 2;
  airlockTube.position.set(0, 1.8, -5.5);
  airlockTube.castShadow = true;
  moonArchGroup.add(airlockTube);

  const airlockRing = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.15, 12, 24), hazardStripeMat);
  airlockRing.position.set(0, 1.8, -3.0);
  moonArchGroup.add(airlockRing);

  // Secondary East Habitation Module (22, 0, -16 relative)
  const eastHabDome = new THREE.Mesh(
    new THREE.SphereGeometry(7.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyGlassMat
  );
  eastHabDome.position.set(22, 0, -16);
  moonArchGroup.add(eastHabDome);
  addCylinderCollider(22, -696, 7.4, 255, 275);

  // Secondary West Hydroponics Module (-22, 0, -16 relative)
  const westHydroDome = new THREE.Mesh(
    new THREE.SphereGeometry(7.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyGlassMat
  );
  westHydroDome.position.set(-22, 0, -16);
  moonArchGroup.add(westHydroDome);
  addCylinderCollider(-22, -696, 7.4, 255, 275);

  // Pressurized Connecting Corridors linking domes
  [-11, 11].forEach((cx) => {
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 11.5, 16), sciFiHullMat);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(cx, 1.6, -16);
    tunnel.castShadow = true;
    moonArchGroup.add(tunnel);

    const tunnelRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.12, 10, 20), sciFiDarkMetalMat);
    tunnelRing.rotation.y = Math.PI / 2;
    tunnelRing.position.set(cx, 1.6, -16);
    moonArchGroup.add(tunnelRing);
  });

  // Deep-Space Telemetry Lattice Mast & Parabolic Dish (26, 0, 12 relative)
  const moonComTower = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 15, 8), sciFiDarkMetalMat);
  moonComTower.position.set(26, 7.5, 12);
  moonComTower.castShadow = true;
  moonArchGroup.add(moonComTower);
  addCylinderCollider(26, -668, 1.8, 255, 280);

  const moonDishPivot = new THREE.Group();
  moonDishPivot.position.set(26, 15.2, 12);

  const moonDish = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 1.4, 24, 1, true),
    sciFiHullMat
  );
  moonDish.rotation.x = Math.PI / 3;
  moonDish.position.z = 0.6;
  moonDishPivot.add(moonDish);

  const dishSubReflector = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), ancientGoldMat);
  dishSubReflector.rotation.x = Math.PI / 3;
  dishSubReflector.position.set(0, 0.6, 1.4);
  moonDishPivot.add(dishSubReflector);

  moonArchGroup.add(moonDishPivot);
  animatedWorldProps.push({
    type: 'radar',
    pivot: moonDishPivot,
    speed: 0.15
  });

  // Photovoltaic Solar Farm (2 Dual-Axis Articulated Solar Banks) (-28, 0, 15) & (-38, 0, 4)
  [[-28, 15], [-38, 4]].forEach(([sx, sz], sIdx) => {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 5.2, 8), sciFiDarkMetalMat);
    pylon.position.set(sx, 2.6, sz);
    pylon.castShadow = true;
    moonArchGroup.add(pylon);

    const panelBank = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 5.5), solarCellMat);
    panelBank.position.set(sx, 5.4, sz);
    panelBank.rotation.set(0.48, -0.65, 0); // Angled to harvest solar rays
    panelBank.castShadow = true;
    moonArchGroup.add(panelBank);
    addBoxCollider(sx - 4.5, sx + 4.5, sz - 680 - 2.8, sz - 680 + 2.8, 255, 275);
  });

  // Helium-3 Cryogenic Spherical Tanks & Conduits (-16, 0, -38 relative)
  [-21, -15, -9].forEach((tx) => {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 20), sciFiHullMat);
    tank.position.set(tx, 3.2, -38);
    tank.castShadow = true;
    moonArchGroup.add(tank);

    // Quad support legs
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8), sciFiDarkMetalMat);
      leg.position.set(tx + lx, 1.7, -38 + lz);
      moonArchGroup.add(leg);
    });
    addCylinderCollider(tx, -718, 2.8, 255, 275);
  });

  // Cryo transfer pipe manifold
  const cryoPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 14.5, 8), hazardStripeMat);
  cryoPipe.rotation.z = Math.PI / 2;
  cryoPipe.position.set(-15, 3.2, -35.2);
  moonArchGroup.add(cryoPipe);

  // Instanced Lunar Regolith Boulders
  const lRockGeo = new THREE.DodecahedronGeometry(1.6, 1);
  const lRockCount = 32;
  const lRocks = new THREE.InstancedMesh(lRockGeo, lunarRockMat, lRockCount);
  lRocks.castShadow = true;
  lRocks.receiveShadow = true;

  for (let i = 0; i < lRockCount; i++) {
    const a = (i / lRockCount) * Math.PI * 2;
    const dist = 28 + (Math.sin(i * 3.3) * 16);
    dummy.position.set(Math.cos(a) * dist, 0.4 + (Math.sin(i * 2.1) * 0.4), Math.sin(a) * dist);
    const s = 0.6 + (i % 4) * 0.35;
    dummy.scale.set(s * 1.2, s * 0.8, s * 1.1);
    dummy.rotation.set(Math.sin(i), a, Math.cos(i));
    dummy.updateMatrix();
    lRocks.setMatrixAt(i, dummy.matrix);
  }
  lRocks.instanceMatrix.needsUpdate = true;
  moonArchGroup.add(lRocks);

  worldGroup.add(moonArchGroup);


  // ==========================================================================
  // 3. PLANET MARS (ARES PRIME): COLONY DOME, BLAST BUNKERS, JAGGED BASALT & KYBER
  // ==========================================================================
  const marsArchGroup = new THREE.Group();
  marsArchGroup.position.set(-620, 340, -1100);

  // Primary Ares Colonization Bio-Dome (-620, 340, -1072 -> relative 0, 0, 28)
  const marsDomeGroup = new THREE.Group();
  marsDomeGroup.position.set(0, 0, 28);

  const aresDome = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    canopyGlassMat
  );
  marsDomeGroup.add(aresDome);
  addCylinderCollider(-620, -1072, 11.6, 335, 365);

  // Heavy exterior structural buttresses anchoring against martian dust storms
  for (let i = 0; i < 6; i++) {
    const ba = (i / 6) * Math.PI * 2;
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 4.2), sciFiDarkMetalMat);
    buttress.position.set(Math.cos(ba) * 12.2, 3.8, Math.sin(ba) * 12.2);
    buttress.rotation.y = -ba;
    buttress.castShadow = true;
    marsDomeGroup.add(buttress);
  }
  marsArchGroup.add(marsDomeGroup);

  // Subterranean Blast Bunker Portal (28, 0, -5 relative -> -592, 340, -1105)
  const bunkerGroup = new THREE.Group();
  bunkerGroup.position.set(28, 0, -5);

  const bunkerFrame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4.2, 5.5), sciFiDarkMetalMat);
  bunkerFrame.position.y = 2.1;
  bunkerFrame.castShadow = true;
  bunkerGroup.add(bunkerFrame);

  // Heavy Twin Hydraulic Blast Doors
  [-1.3, 1.3].forEach((dx) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.2, 0.4), hazardStripeMat);
    door.position.set(dx, 1.8, 2.7);
    bunkerGroup.add(door);
  });

  const portalLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b00 })
  );
  portalLamp.position.set(0, 3.8, 2.9);
  bunkerGroup.add(portalLamp);

  marsArchGroup.add(bunkerGroup);
  addBoxCollider(-595, -589, -1108, -1102, 335, 355);

  // Heavy Kyber Industrial Extraction Drill Derrick (15, 0, -28 relative -> -605, 340, -1128)
  const derrickGroup = new THREE.Group();
  derrickGroup.position.set(15, 0, -28);

  const derrickTower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 18, 4), sciFiDarkMetalMat);
  derrickTower.position.y = 9;
  derrickTower.rotation.y = Math.PI / 4;
  derrickTower.castShadow = true;
  derrickGroup.add(derrickTower);

  const derrickHead = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 12), ancientGoldMat);
  derrickHead.position.y = 4.2;
  derrickGroup.add(derrickHead);

  marsArchGroup.add(derrickGroup);
  addBoxCollider(-608, -602, -1131, -1125, 335, 368);

  // Glowing Kyber Crystals (Hexagonal Prismatic Spires Jutting from Earth)
  const crystalSpireGeo = new THREE.CylinderGeometry(0.3, 1.2, 11, 6);
  [-22, 0, 22].forEach((cx, idx) => {
    const crys = new THREE.Mesh(crystalSpireGeo, kyberOrangeMat);
    crys.position.set(cx - 8, 4.8, -18 + idx * 4);
    crys.rotation.set(0.18, idx * 0.8, -0.22);
    crys.castShadow = true;
    marsArchGroup.add(crys);
  });

  // Instanced Kyber Shard Field (36 glowing crystal shards)
  const shardGeo = new THREE.CylinderGeometry(0.15, 0.55, 3.8, 6);
  const kyberShards = new THREE.InstancedMesh(shardGeo, kyberOrangeMat, 36);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + 0.1;
    const dist = 18 + (Math.sin(i * 4.2) * 12);
    dummy.position.set(Math.cos(a) * dist, 1.6, Math.sin(a) * dist);
    const s = 0.7 + (i % 3) * 0.4;
    dummy.scale.set(s, s * 1.3, s);
    dummy.rotation.set(Math.sin(i * 2) * 0.3, a, Math.cos(i) * 0.25);
    dummy.updateMatrix();
    kyberShards.setMatrixAt(i, dummy.matrix);
  }
  kyberShards.instanceMatrix.needsUpdate = true;
  marsArchGroup.add(kyberShards);

  // Instanced Jagged Martian Basalt Canyon Crags (Caldera Rim Wall)
  const mCragGeo = new THREE.ConeGeometry(4.2, 16, 5);
  const mCrags = new THREE.InstancedMesh(mCragGeo, rockBasaltMat, 32);
  mCrags.castShadow = true;
  mCrags.receiveShadow = true;

  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const dist = 54 + (Math.sin(i * 3.7) * 8);
    dummy.position.set(Math.cos(a) * dist, 6.5 + (Math.sin(i * 2.2) * 2), Math.sin(a) * dist);
    const s = 1.0 + (i % 3) * 0.4;
    dummy.scale.set(s * 1.1, s * 1.4, s * 1.1);
    dummy.rotation.set(0.08, a, -0.05);
    dummy.updateMatrix();
    mCrags.setMatrixAt(i, dummy.matrix);
  }
  mCrags.instanceMatrix.needsUpdate = true;
  marsArchGroup.add(mCrags);

  // Martian Atmospheric Dust Vortex Swirling over Caldera Floor
  const mDustCount = 280;
  const mDustGeo = new THREE.BufferGeometry();
  const mDustPos = new Float32Array(mDustCount * 3);
  for (let i = 0; i < mDustCount * 3; i += 3) {
    const da = Math.random() * Math.PI * 2;
    const dr = 10 + Math.random() * 45;
    mDustPos[i] = Math.cos(da) * dr;
    mDustPos[i + 1] = 0.6 + Math.random() * 12;
    mDustPos[i + 2] = Math.sin(da) * dr;
  }
  mDustGeo.setAttribute('position', new THREE.BufferAttribute(mDustPos, 3));
  const marsDustPoints = new THREE.Points(
    mDustGeo,
    new THREE.PointsMaterial({ color: 0xd96b43, size: 0.55, transparent: true, opacity: 0.62 })
  );
  marsArchGroup.add(marsDustPoints);
  animatedWorldProps.push({
    type: 'dust',
    points: marsDustPoints,
    rotSpeed: 0.04
  });

  worldGroup.add(marsArchGroup);


  // ==========================================================================
  // 4. AURELIA: GRAND CELESTIAL ARCH, LEVITATING MONOLITHS & 3D RING ASTEROIDS
  // ==========================================================================
  const aureliaArchGroup = new THREE.Group();
  aureliaArchGroup.position.set(680, 440, -1350);

  // Grand Celestial Triumphal Arch (0, 0, 30 relative -> 680, 440, -1320)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, 30);

  // Twin marble pylons
  [-8, 8].forEach((px) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.8, 14, 2.8), polishedMarbleMat);
    pylon.position.set(px, 7, 0);
    pylon.castShadow = true;
    archGroup.add(pylon);

    const goldPlinth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 3.6), ancientGoldMat);
    goldPlinth.position.set(px, 0.6, 0);
    archGroup.add(goldPlinth);

    const goldCornice = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 3.4), ancientGoldMat);
    goldCornice.position.set(px, 14.4, 0);
    archGroup.add(goldCornice);
    addBoxCollider(680 + px - 1.8, 680 + px + 1.8, -1320 - 1.8, -1320 + 1.8, 435, 460);
  });

  // Monumental Vault Arch
  const archSpan = new THREE.Mesh(new THREE.BoxGeometry(18.8, 2.2, 2.8), polishedMarbleMat);
  archSpan.position.set(0, 15.1, 0);
  archSpan.castShadow = true;
  archGroup.add(archSpan);

  const archFrieze = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 3.0), ancientGoldMat);
  archFrieze.position.set(0, 16.5, 0);
  archGroup.add(archFrieze);

  aureliaArchGroup.add(archGroup);

  // 4 Levitating Celestial Monoliths (Sharp obsidian obelisks floating weightlessly)
  const monolithPositions = [
    [-28, 26], [28, 26], [-28, -26], [28, -26]
  ];
  monolithPositions.forEach(([mx, mz], mIdx) => {
    const mono = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.4, 10, 4), obsidianMat);
    mono.position.set(mx, 7.5, mz);
    mono.rotation.y = Math.PI / 4;
    mono.castShadow = true;
    aureliaArchGroup.add(mono);

    const monoGoldTrim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 16), ancientGoldMat);
    monoGoldTrim.rotation.x = Math.PI / 2;
    monoGoldTrim.position.set(mx, 7.5, mz);
    aureliaArchGroup.add(monoGoldTrim);

    animatedWorldProps.push({
      type: 'hover',
      mesh: mono,
      trim: monoGoldTrim,
      baseY: 7.5,
      amp: 0.85,
      freq: 1.8 + mIdx * 0.3,
      phase: mIdx * 1.4,
      rotSpeed: 0.35
    });
  });

  // Twin Orbital Beacon Towers (-26, 0, 0) & (26, 0, 0)
  [-26, 26].forEach((tx) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 20, 16), polishedMarbleMat);
    tower.position.set(tx, 10, 0);
    tower.castShadow = true;
    aureliaArchGroup.add(tower);
    addCylinderCollider(680 + tx, -1350, 2.0, 435, 465);

    const energyRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 12, 24), aureliaVoidMat);
    energyRing.rotation.x = Math.PI / 2;
    energyRing.position.set(tx, 18, 0);
    aureliaArchGroup.add(energyRing);

    // Focused vertical celestial beacon beam
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 1.8, 38, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x5ce6ff, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    beaconBeam.position.set(tx, 38, 0);
    aureliaArchGroup.add(beaconBeam);
  });

  // Void Heart: Multifaceted Celestial Cyan Crystal (0, 0, 0 relative)
  const voidHeart = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 2), aureliaVoidMat);
  voidHeart.position.set(0, 5.2, 0);
  aureliaArchGroup.add(voidHeart);

  animatedWorldProps.push({
    type: 'crystal',
    mesh: voidHeart,
    baseY: 5.2,
    rotSpeed: 0.65
  });

  worldGroup.add(aureliaArchGroup);

  // --- 3D Planetary Ring Asteroid & Debris Field (Equatorial Plane) ---
  const ringDebrisGroup = new THREE.Group();
  ringDebrisGroup.position.set(680, 305, -1350);
  ringDebrisGroup.rotation.x = Math.PI / 2.25;
  ringDebrisGroup.rotation.y = 0.22;

  const astGeo = new THREE.DodecahedronGeometry(2.8, 1);
  const astCount = 80;
  const astMesh = new THREE.InstancedMesh(astGeo, sciFiHullMat, astCount);

  for (let i = 0; i < astCount; i++) {
    const a = (i / astCount) * Math.PI * 2;
    const r = 210 + (Math.sin(i * 4.7) * 45);
    const zOffset = (Math.sin(i * 3.3) * 6.5);
    dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, zOffset);
    const s = 0.6 + (i % 4) * 0.45;
    dummy.scale.set(s * 1.2, s * 0.9, s * 1.1);
    dummy.rotation.set(Math.sin(i), a, Math.cos(i));
    dummy.updateMatrix();
    astMesh.setMatrixAt(i, dummy.matrix);
  }
  astMesh.instanceMatrix.needsUpdate = true;
  ringDebrisGroup.add(astMesh);
  worldGroup.add(ringDebrisGroup);

  animatedWorldProps.push({
    type: 'ringOrbit',
    group: ringDebrisGroup,
    rotSpeed: 0.015
  });
}

// ============================================================================
// RUNTIME ANIMATION LOOP DRIVER FOR DETAILED ARCHITECTURAL PROPS
// ============================================================================
export function updateWorldArchitectureAnimations(animatedProps, dt, elapsed) {
  for (let i = 0; i < animatedProps.length; i++) {
    const p = animatedProps[i];
    if (p.type === 'radar') {
      p.pivot.rotation.y += dt * p.speed;
    } else if (p.type === 'buoy') {
      p.group.position.y = p.baseY + Math.sin(elapsed * p.freq + p.phase) * 0.16;
      p.group.rotation.z = Math.sin(elapsed * (p.freq * 0.8) + p.phase) * 0.08;
      p.group.rotation.x = Math.cos(elapsed * (p.freq * 0.7) + p.phase) * 0.06;
    } else if (p.type === 'hover') {
      const curY = p.baseY + Math.sin(elapsed * p.freq + p.phase) * p.amp;
      p.mesh.position.y = curY;
      if (p.trim) p.trim.position.y = curY;
      p.mesh.rotation.y += dt * p.rotSpeed;
    } else if (p.type === 'crystal') {
      p.mesh.position.y = p.baseY + Math.sin(elapsed * 1.8) * 0.35;
      p.mesh.rotation.y += dt * p.rotSpeed;
      p.mesh.rotation.z = Math.sin(elapsed * 1.2) * 0.12;
    } else if (p.type === 'dust') {
      p.points.rotation.y += dt * p.rotSpeed;
    } else if (p.type === 'ringOrbit') {
      p.group.rotation.z += dt * p.rotSpeed;
    } else if (p.type === 'windmill') {
      p.hub.rotation.z += dt * p.speed;
    }
  }
}
