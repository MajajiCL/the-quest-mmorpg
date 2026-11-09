import * as THREE from 'three';

// ============================================================================
// THE QUEST — THE VALLEY OF AETHELGARD (AAA EXPANDED VERTICAL SLICE)
// ============================================================================
// Combines:
// - Style A (Zelda BotW / Valheim / Genshin): Rolling green hills, dirt paths,
//   organic tree groves, stone-and-timber palisades, warm glowing lanterns.
// - Style B (Ragnarok / MU Online): Medieval village square with central fountain,
//   market stalls, guildhall, training dummies, and safe sanctuary perimeter.
// - Style C (No Man's Sky / Starfield): Northern orbital stargate gantry overlooking
//   the valley, connecting ancient fantasy with celestial space exploration.
// ============================================================================

export function getEarthTerrainElevation(x, z) {
  const r = Math.hypot(x, z);

  // Village Central Plaza (r < 32): Level protected stone & grass sanctuary
  if (r < 32) {
    return 1.1 + Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.15;
  }

  // Arrival Overlook & Winding Entrance Path (-45 < x < -15 and 20 < z < 55)
  const isArrivalOverlook = x >= -45 && x <= -15 && z >= 20 && z <= 55;
  if (isArrivalOverlook) {
    const t = (z - 20) / 35;
    return 1.2 + t * 1.6 + Math.sin(x * 0.1) * 0.2;
  }

  // North Spaceport Corridor (|x| < 12 and -105 < z < -30)
  if (Math.abs(x) < 12 && z <= -30 && z >= -105) {
    return 1.05 + Math.sin(z * 0.06) * 0.15;
  }

  // South Harbor Quay & Pier Corridor (|x| < 9 and 30 < z < 85)
  if (Math.abs(x) < 9 && z >= 30 && z <= 85) {
    const t = (z - 30) / 55;
    return 1.1 * (1 - t) + 0.15 * t;
  }

  // Harbor Bay meeting the sea (z > 85 and |x| < 35)
  if (z > 85 && Math.abs(x) < 35) {
    const seaDist = Math.max(0, z - 85);
    return Math.max(-0.25, 0.15 - seaDist * 0.025);
  }

  // Surrounding Rolling Green Hills (32 < r < 175)
  // Multi-frequency smooth harmonics for organic BotW / Genshin style topography
  const h1 = Math.sin(x * 0.022 + 1.2) * Math.cos(z * 0.020 - 0.7) * 5.2;
  const h2 = Math.cos(x * 0.045 - 0.4) * Math.sin(z * 0.042 + 1.0) * 2.6;
  const h3 = Math.sin((x + z) * 0.065) * 1.3;
  const rawHills = Math.max(0, h1 + h2 + h3);

  // Smooth blending factor from flat village center (r=32) out into the hills (r=70)
  const blend = THREE.MathUtils.smoothstep(r, 30, 72);
  let elevation = 1.1 + rawHills * blend;

  // Western Scenic Windmill Knoll (x around -80, z around -15)
  const distWindmill = Math.hypot(x - (-80), z - (-15));
  if (distWindmill < 35) {
    const wKnoll = (1 - distWindmill / 35) * 5.8;
    elevation += wKnoll;
  }

  // Eastern Colosseum & Arena Rise (x around 75, z around 0)
  const distArena = Math.hypot(x - 75, z);
  if (distArena < 40) {
    const aKnoll = (1 - distArena / 40) * 3.4;
    elevation += aKnoll;
  }

  // Northern & Western Mountain Escarpment (175 < r < 240)
  if (r > 165 && r <= 245) {
    const mFactor = THREE.MathUtils.smoothstep(r, 165, 230);
    const mRidge = Math.sin(x * 0.035 + 2.0) * Math.cos(z * 0.030) * 12.0 + 16.0;
    elevation += mRidge * mFactor;
  }

  // Natural coastal slope down into the ocean (r > 235)
  if (r > 235) {
    const drop = (r - 235) * 0.45;
    elevation -= drop;
    if (elevation < -0.25) elevation = -0.25;
  }

  return Math.max(-0.25, elevation);
}

export function buildAethelgardValley({
  scene,
  worldGroup,
  baseMaterials,
  addCylinderCollider,
  addBoxCollider,
  animatedWorldProps
}) {
  const valleyGroup = new THREE.Group();
  valleyGroup.name = 'AethelgardValley';
  worldGroup.add(valleyGroup);

  const {
    obsidianMat,
    polishedMarbleMat,
    ancientGoldMat,
    hardwoodMat,
    canopyGlassMat
  } = baseMaterials;

  // --------------------------------------------------------------------------
  // 1. PROCEDURAL 3D NATURAL TERRAIN MESH WITH VERTEX COLORS
  // --------------------------------------------------------------------------
  const terrainSize = 520;
  const terrainSegments = 140;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  // Color palette: Lush Meadow Green, Sunny Grass, Dirt Path Brown, Rock Slate, Moss
  const colorGrassLush = new THREE.Color(0x387340);
  const colorGrassSunny = new THREE.Color(0x4c8f50);
  const colorPathDirt = new THREE.Color(0x7a6b58);
  const colorPathCobble = new THREE.Color(0x5e574d);
  const colorRockBasalt = new THREE.Color(0x4a4742);
  const colorRockMoss = new THREE.Color(0x565e4d);
  const tmpColor = new THREE.Color();

  function distToSegment(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - x0, pz - z0);
    let t = ((px - x0) * dx + (pz - z0) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), pz - (z0 + t * dz));
  }

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getEarthTerrainElevation(vx, vz);
    posAttr.setY(i, vy);

    const r = Math.hypot(vx, vz);

    // Is on central village plaza or roads?
    const isPlaza = r < 24;
    const isNorthRoad = Math.abs(vx) < 4.2 && vz < 0 && vz > -95;
    const isSouthRoad = Math.abs(vx) < 3.8 && vz > 0 && vz < 85;
    const distToOverlookPath = distToSegment(vx, vz, -28, 42, -18, 24);
    const isOverlookRoad = distToOverlookPath < 3.6;
    const isOverlookEdge = distToOverlookPath >= 3.6 && distToOverlookPath < 5.2;

    if (isPlaza) {
      tmpColor.copy(colorPathCobble).offsetHSL(0, 0, (Math.sin(vx * 1.5 + vz * 1.5) * 0.04));
    } else if (isNorthRoad || isSouthRoad || isOverlookRoad) {
      tmpColor.copy(colorPathDirt).offsetHSL(0, 0, (Math.sin(vx * 2 + vz * 2) * 0.05));
    } else if (isOverlookEdge) {
      const blend = (distToOverlookPath - 3.6) / 1.6;
      tmpColor.copy(colorPathDirt).lerp(colorGrassLush, blend);
    } else if (vy > 18.0) {
      // High mountain rock
      tmpColor.copy(colorRockBasalt).lerp(colorRockMoss, Math.sin(vx * 0.5) * 0.3 + 0.3);
    } else {
      // Natural rolling hills & meadows (BotW / Genshin style)
      const hillTint = Math.min(1.0, vy / 12.0);
      tmpColor.copy(colorGrassLush).lerp(colorGrassSunny, hillTint);
      tmpColor.offsetHSL(0, 0, (Math.sin(vx * 0.2 + vz * 0.3) * 0.04));
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.04,
    flatShading: false
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  valleyGroup.add(terrainMesh);

  // --------------------------------------------------------------------------
  // 2. AETHELGARD VILLAGE FORTIFIED PALISADE & GATE ARCHWAY
  // --------------------------------------------------------------------------
  // Weathered Medieval Stone & Timber Gate Archway at (-18, y, 24)
  const gateY = getEarthTerrainElevation(-18, 24);
  const gateGroup = new THREE.Group();
  gateGroup.position.set(-18, gateY, 24);
  gateGroup.rotation.y = -Math.PI * 0.28;

  const stonePierMat = new THREE.MeshStandardMaterial({ color: 0x424652, roughness: 0.82, metalness: 0.1 });
  const darkSlateRoofMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.75, metalness: 0.15 });
  const oakBeamMat = new THREE.MeshStandardMaterial({ color: 0x4e3620, roughness: 0.72, metalness: 0.08 });

  // Left & Right Weathered Stone Piers
  [-3.8, 3.8].forEach((gx) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.5, 2.4), stonePierMat);
    pier.position.set(gx, 3.75, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    gateGroup.add(pier);
    addBoxCollider(-18 + gx - 1.2, -18 + gx + 1.2, 24 - 1.2, 24 + 1.2, gateY, gateY + 9);

    // Warm Lantern hanging from pier
    const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.2), obsidianMat);
    lanternArm.position.set(gx, 5.8, 0.8);
    gateGroup.add(lanternArm);

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.32, 0.65, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd278 })
    );
    lantern.position.set(gx, 5.3, 1.4);
    gateGroup.add(lantern);
  });

  // Heavy Oak Timber Arch Crossbeam
  const archLintel = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.4, 2.0), oakBeamMat);
  archLintel.position.set(0, 7.6, 0);
  archLintel.castShadow = true;
  gateGroup.add(archLintel);

  // Pitched Slate Gate Roof
  const gateRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.2, 4), darkSlateRoofMat);
  gateRoof.position.set(0, 9.4, 0);
  gateRoof.rotation.y = Math.PI / 4;
  gateRoof.scale.set(1.15, 1.0, 0.65);
  gateRoof.castShadow = true;
  gateGroup.add(gateRoof);

  // Heraldic Village Shield in Embossed Gold
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.3), ancientGoldMat);
  shield.position.set(0, 7.6, 1.15);
  gateGroup.add(shield);

  valleyGroup.add(gateGroup);

  // Wooden Post-and-Rail Fences lining the arrival road
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5a422a, roughness: 0.85, metalness: 0.05 });
  const fencePoints = [
    [-34, 38], [-30, 34], [-26, 30], [-22, 26],
    [-40, 34], [-36, 30], [-32, 26], [-28, 22]
  ];
  fencePoints.forEach(([fx, fz]) => {
    const fy = getEarthTerrainElevation(fx, fz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 8), fenceMat);
    post.position.set(fx, fy + 0.8, fz);
    post.castShadow = true;
    valleyGroup.add(post);

    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), fenceMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(fx + 1.8, fy + 0.9, fz - 1.2);
    valleyGroup.add(rail);
  });

  // --------------------------------------------------------------------------
  // 3. AETHELGARD VILLAGE SQUARE: CENTRAL FOUNTAIN & AMENITIES
  // --------------------------------------------------------------------------
  const fountainY = getEarthTerrainElevation(0, 0);
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, fountainY, 0);

  // Outer Basin Rim (r = 5.2m)
  const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.9, 24), polishedMarbleMat);
  fountainBasin.position.y = 0.45;
  fountainBasin.castShadow = true;
  fountainBasin.receiveShadow = true;
  fountainGroup.add(fountainBasin);
  addCylinderCollider(0, 0, 5.4, fountainY - 1, fountainY + 5);

  // Fountain Water Surface
  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 24),
    new THREE.MeshStandardMaterial({ color: 0x1db3c8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.88 })
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.85;
  fountainGroup.add(waterSurface);

  // Central Tiered Pedestal & Water Jet Spire
  const fountainCore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 3.2, 16), polishedMarbleMat);
  fountainCore.position.y = 1.9;
  fountainCore.castShadow = true;
  fountainGroup.add(fountainCore);

  const fountainBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.2, 0.6, 16), polishedMarbleMat);
  fountainBowl.position.y = 3.6;
  fountainGroup.add(fountainBowl);

  const waterSpout = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.8, 12),
    new THREE.MeshBasicMaterial({ color: 0x9beeff, transparent: true, opacity: 0.75 })
  );
  waterSpout.position.y = 4.7;
  fountainGroup.add(waterSpout);

  valleyGroup.add(fountainGroup);

  // Market Stalls in Village Square (Weaponsmith, Alchemist, Cartographer)
  const stallAwnings = [
    { pos: [-12, -10], rot: Math.PI * 0.25, color: 0xbf360c, title: 'FORJA & ARMAS' },
    { pos: [14, -8], rot: -Math.PI * 0.25, color: 0x1565c0, title: 'ALQUIMIA & ELIXIRES' },
    { pos: [12, 12], rot: -Math.PI * 0.75, color: 0x2e7d32, title: 'PROVISIONES NAVALES' }
  ];

  stallAwnings.forEach((st) => {
    const sy = getEarthTerrainElevation(st.pos[0], st.pos[1]);
    const sGroup = new THREE.Group();
    sGroup.position.set(st.pos[0], sy, st.pos[1]);
    sGroup.rotation.y = st.rot;

    // Wooden Counter Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.8), hardwoodMat);
    table.position.set(0, 0.55, 0);
    table.castShadow = true;
    table.receiveShadow = true;
    sGroup.add(table);
    addBoxCollider(st.pos[0] - 2.2, st.pos[0] + 2.2, st.pos[1] - 1.2, st.pos[1] + 1.2, sy - 1, sy + 4);

    // 4 Canopy Posts
    [[-1.9, -0.75], [1.9, -0.75], [-1.9, 0.75], [1.9, 0.75]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), hardwoodMat);
      p.position.set(px, 1.6, pz);
      sGroup.add(p);
    });

    // Fabric Awning Canopy
    const awningMat = new THREE.MeshStandardMaterial({ color: st.color, roughness: 0.7, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), awningMat);
    awning.rotation.y = Math.PI / 4;
    awning.position.set(0, 3.3, 0);
    awning.castShadow = true;
    sGroup.add(awning);

    valleyGroup.add(sGroup);
  });

  // --------------------------------------------------------------------------
  // 4. COMBAT TRAINING GROUNDS & INTERACTIVE DUMMIES (MMO STYLE B)
  // --------------------------------------------------------------------------
  const trainingDummies = [];
  const dummyPositions = [
    [10, 18],
    [14, 16],
    [18, 14],
    [14, 22]
  ];

  const dummyWoodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.75 });
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xdce775, roughness: 0.88 });

  dummyPositions.forEach(([dx, dz], dIdx) => {
    const dy = getEarthTerrainElevation(dx, dz);
    const dGroup = new THREE.Group();
    dGroup.position.set(dx, dy, dz);
    dGroup.rotation.y = Math.PI * 0.4 + dIdx * 0.3;

    // Base Stand Post
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.4, 8), dummyWoodMat);
    stand.position.y = 0.7;
    stand.castShadow = true;
    dGroup.add(stand);

    // Torso Target (Straw Sack)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 1.35, 12), strawMat);
    torso.position.y = 1.95;
    torso.castShadow = true;
    dGroup.add(torso);

    // Crossbar Arms
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8), dummyWoodMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.y = 2.2;
    dGroup.add(crossbar);

    // Head Helmet Dummy
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), obsidianMat);
    head.position.y = 2.85;
    dGroup.add(head);

    valleyGroup.add(dGroup);
    addCylinderCollider(dx, dz, 0.9, dy - 1, dy + 5);

    trainingDummies.push({
      id: `dummy_${dIdx}`,
      group: dGroup,
      baseRotY: dGroup.rotation.y,
      x: dx,
      y: dy,
      z: dz,
      hitsRemaining: 3,
      wobbleTime: 0
    });
  });

  // --------------------------------------------------------------------------
  // 5. ORGANIC GROVES OF TREES & FOLIAGE ACROSS THE ROLLING HILLS (STYLE A)
  // --------------------------------------------------------------------------
  const treeCount = 65;
  const treeFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.72, flatShading: true });
  const treeFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.68, flatShading: true });
  const treePineMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.75, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });

  // Disperse trees on hillside slopes, outside of village square (r > 38)
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + Math.sin(i * 4.7) * 0.4;
    const rDist = 42 + (Math.sin(i * 3.3) * 0.5 + 0.5) * 115;
    const tx = Math.cos(angle) * rDist;
    const tz = Math.sin(angle) * rDist;

    // Keep roads and arrival vista completely clear
    if (Math.abs(tx) < 14 && tz < 0 && tz > -105) continue; // North Spaceport corridor
    if (Math.abs(tx) < 12 && tz > 0 && tz < 90) continue; // South Harbor corridor
    if (tx >= -55 && tx <= -8 && tz >= 12 && tz <= 65) continue; // Arrival overlook & village approach path

    const ty = getEarthTerrainElevation(tx, tz);
    if (ty < 0.2) continue; // Skip in water

    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, ty, tz);
    const scale = 0.85 + (i % 5) * 0.22;
    treeGroup.scale.setScalar(scale);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.4, 3.2, 8), trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Leafy Deciduous & Alpine Canopy (Genshin / BotW Stylized Poly)
    const mat = (i % 3 === 0) ? treeFoliageMat1 : ((i % 3 === 1) ? treeFoliageMat2 : treePineMat);
    const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), mat);
    canopy1.position.set(0, 3.8, 0);
    canopy1.castShadow = true;
    canopy1.receiveShadow = true;
    treeGroup.add(canopy1);

    const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65, 1), mat);
    canopy2.position.set(0.6, 5.2, 0.4);
    canopy2.castShadow = true;
    canopy2.receiveShadow = true;
    treeGroup.add(canopy2);

    const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), mat);
    canopy3.position.set(-0.5, 4.8, -0.4);
    canopy3.castShadow = true;
    canopy3.receiveShadow = true;
    treeGroup.add(canopy3);

    valleyGroup.add(treeGroup);
    addCylinderCollider(tx, tz, 0.8 * scale, ty - 1, ty + 12);
  }

  // --------------------------------------------------------------------------
  // 6. SCENIC WOODEN WINDMILL ON WESTERN RIDGE (STYLE A)
  // --------------------------------------------------------------------------
  const wmX = -82;
  const wmZ = -15;
  const wmY = getEarthTerrainElevation(wmX, wmZ);

  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(wmX, wmY, wmZ);

  // Tower Base (Stone & Timber)
  const wmTower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.6, 11.5, 12), polishedMarbleMat);
  wmTower.position.y = 5.75;
  wmTower.castShadow = true;
  windmillGroup.add(wmTower);
  addCylinderCollider(wmX, wmZ, 4.8, wmY - 1, wmY + 16);

  // Conical Roof
  const wmRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 3.4, 12), hardwoodMat);
  wmRoof.position.y = 13.2;
  windmillGroup.add(wmRoof);

  // Rotating Sails Hub
  const sailHub = new THREE.Group();
  sailHub.position.set(0, 11.2, 3.6);

  for (let s = 0; s < 4; s++) {
    const sArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 9.5, 0.18), hardwoodMat);
    sArm.rotation.z = (s / 4) * Math.PI * 2;
    sailHub.add(sArm);

    const sVane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xfff3db, side: THREE.DoubleSide })
    );
    sVane.position.set(0, 2.6, 0.05);
    sVane.rotation.z = (s / 4) * Math.PI * 2;
    sailHub.add(sVane);
  }
  windmillGroup.add(sailHub);
  valleyGroup.add(windmillGroup);

  animatedWorldProps.push({
    type: 'windmill',
    hub: sailHub,
    speed: 0.45
  });

  // --------------------------------------------------------------------------
  // 7. COMANDANTE ALISTAIR (ONBOARDING NPC TUTORIAL GUIDE)
  // --------------------------------------------------------------------------
  const alistairX = -21;
  const alistairZ = 25;
  const alistairY = getEarthTerrainElevation(alistairX, alistairZ);

  const alistairGroup = new THREE.Group();
  alistairGroup.position.set(alistairX, alistairY, alistairZ);
  alistairGroup.rotation.y = Math.PI * 0.75; // Face the arriving player

  // Heraldic Banner
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8), hardwoodMat);
  pole.position.set(-0.8, 2.6, 0);
  alistairGroup.add(pole);

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xbf360c, side: THREE.DoubleSide })
  );
  banner.position.set(-0.2, 3.8, 0);
  alistairGroup.add(banner);

  // NPC Wayfinder Marker Billboard
  const markerCanvas = document.createElement('canvas');
  markerCanvas.width = 384;
  markerCanvas.height = 128;
  const mCtx = markerCanvas.getContext('2d');
  mCtx.fillStyle = 'rgba(6, 12, 22, 0.88)';
  mCtx.roundRect(8, 8, 368, 112, 18);
  mCtx.fill();
  mCtx.strokeStyle = '#ffd278';
  mCtx.lineWidth = 4;
  mCtx.stroke();
  mCtx.fillStyle = '#ffd278';
  mCtx.font = 'bold 26px "Cinzel", Georgia, serif';
  mCtx.textAlign = 'center';
  mCtx.fillText('⚔ COMANDANTE ALISTAIR', 192, 48);
  mCtx.fillStyle = '#6ce5ff';
  mCtx.font = 'bold 20px "JetBrains Mono", monospace';
  mCtx.fillText('[E] RECIBIR ARMA & MISIÓN', 192, 92);

  const markerTex = new THREE.CanvasTexture(markerCanvas);
  const markerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex, depthTest: false }));
  markerSprite.position.set(0, 3.8, 0);
  markerSprite.scale.set(4.2, 1.4, 1);
  alistairGroup.add(markerSprite);

  valleyGroup.add(alistairGroup);
  addCylinderCollider(alistairX, alistairZ, 1.4, alistairY - 1, alistairY + 5);

  return {
    valleyGroup,
    terrainMesh,
    trainingDummies,
    alistairPos: new THREE.Vector3(alistairX, alistairY, alistairZ)
  };
}
