import * as THREE from 'three';

// ============================================================================
// ORBITAL FLIGHT FX // THE QUEST (THREE.JS AAA FLIGHT & RE-ENTRY ENGINE)
// Features:
// - Hypersonic Speed Streaks & Warp Tunnel (350 Dynamic Streaking Lines)
// - Atmospheric Re-entry Plasma Bow Shock Cone & Burning Embers
// - Supersonic Mach Expansion Vapor Rings with Sonic Boom Triggers
// - Aerodynamic Atmospheric Buffeting Rumble Feedback
// ============================================================================

export class OrbitalFlightFX {
  constructor(scene, camera, sfxEngine, feedbackEngine) {
    this.scene = scene;
    this.camera = camera;
    this.sfx = sfxEngine;
    this.feedback = feedbackEngine;

    this.prevPos = new THREE.Vector3();
    this.flightSpeed = 0;
    this.verticalSpeed = 0;
    this.reentryActive = false;
    this.lastSonicBoomAt = 0;

    // 1. Hypersonic Speed Streaks Tunnel
    this.initSpeedStreaks();

    // 2. Atmospheric Re-entry Plasma Bow Shock Cone
    this.initReentryPlasmaCone();

    // 3. Re-entry Sparks / Ember Particles
    this.initReentryEmbers();

    // 4. Supersonic Mach Rings Pool
    this.activeMachRings = [];
  }

  initSpeedStreaks() {
    this.streakCount = 350;
    const positions = new Float32Array(this.streakCount * 6); // 2 vertices per line (start & end)
    const colors = new Float32Array(this.streakCount * 6);

    this.streakRadii = new Float32Array(this.streakCount);
    this.streakAngles = new Float32Array(this.streakCount);
    this.streakZ = new Float32Array(this.streakCount);
    this.streakLengths = new Float32Array(this.streakCount);

    const baseColor = new THREE.Color(0xaae8ff);

    for (let i = 0; i < this.streakCount; i++) {
      this.streakRadii[i] = 2.5 + Math.random() * 14.0;
      this.streakAngles[i] = Math.random() * Math.PI * 2;
      this.streakZ[i] = -5.0 - Math.random() * 45.0;
      this.streakLengths[i] = 3.0 + Math.random() * 8.0;

      // Color gradient along streak
      const c1 = baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.2);
      colors[i * 6 + 0] = c1.r;
      colors[i * 6 + 1] = c1.g;
      colors[i * 6 + 2] = c1.b;
      colors[i * 6 + 3] = 1.0;
      colors[i * 6 + 4] = 1.0;
      colors[i * 6 + 5] = 1.0;
    }

    this.streakGeo = new THREE.BufferGeometry();
    this.streakGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.streakGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.streakMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.streakLines = new THREE.LineSegments(this.streakGeo, this.streakMat);
    this.streakLines.frustumCulled = false;
    this.scene.add(this.streakLines);
  }

  initReentryPlasmaCone() {
    // Sculpted parabolic compression cone that sits at the nose of the vehicle
    const coneGeo = new THREE.ConeGeometry(2.4, 4.8, 32, 1, true);
    coneGeo.rotateX(Math.PI / 2); // Point forward along +Z

    this.plasmaMat = new THREE.MeshBasicMaterial({
      color: 0xff4800,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.plasmaCone = new THREE.Mesh(coneGeo, this.plasmaMat);
    this.plasmaCone.visible = false;
    this.scene.add(this.plasmaCone);

    // Inner fiery white-hot core
    const coreGeo = new THREE.ConeGeometry(1.4, 3.2, 24, 1, true);
    coreGeo.rotateX(Math.PI / 2);
    this.plasmaCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffea88,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.plasmaCore = new THREE.Mesh(coreGeo, this.plasmaCoreMat);
    this.plasmaCone.add(this.plasmaCore);
  }

  initReentryEmbers() {
    this.emberCount = 60;
    this.emberPositions = new Float32Array(this.emberCount * 3);
    this.emberColors = new Float32Array(this.emberCount * 3);
    this.emberData = [];

    for (let i = 0; i < this.emberCount; i++) {
      this.emberData.push({
        relPos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.3 + Math.random() * 0.3
      });
    }

    this.emberGeo = new THREE.BufferGeometry();
    this.emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    this.emberGeo.setAttribute('color', new THREE.BufferAttribute(this.emberColors, 3));

    this.emberMat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.emberPoints = new THREE.Points(this.emberGeo, this.emberMat);
    this.emberPoints.frustumCulled = false;
    this.scene.add(this.emberPoints);
  }

  spawnSonicBoomRing(pos, forwardDir) {
    const ringGeo = new THREE.TorusGeometry(1.6, 0.18, 16, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x99e5ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    ringMesh.lookAt(pos.clone().add(forwardDir));

    this.scene.add(ringMesh);
    this.activeMachRings.push({
      mesh: ringMesh,
      mat: ringMat,
      scale: 1.0,
      opacity: 0.9,
      forward: forwardDir.clone()
    });

    if (this.sfx && this.sfx.sonicBoom) {
      this.sfx.sonicBoom();
    }
    if (this.feedback && this.feedback.addScreenShake) {
      this.feedback.addScreenShake(0.32);
    }
  }

  update(dt, playerPos, playerYaw, mountType, isJoined) {
    if (!isJoined) {
      this.streakMat.opacity = 0;
      this.plasmaCone.visible = false;
      return;
    }

    // 1. Calculate actual flight velocities
    if (this.prevPos.lengthSq() > 0.001) {
      const dx = playerPos.x - this.prevPos.x;
      const dy = playerPos.y - this.prevPos.y;
      const dz = playerPos.z - this.prevPos.z;
      this.flightSpeed = Math.hypot(dx, dy, dz) / Math.max(0.001, dt);
      this.verticalSpeed = dy / Math.max(0.001, dt);
    }
    this.prevPos.copy(playerPos);

    const isSupersonicCraft = ['jet', 'starship'].includes(mountType);
    const isFlyingMount = ['mythic_bird', 'jet', 'starship'].includes(mountType);

    // 2. Speed Streaks Update
    const speedThreshold = 22.0;
    const targetStreakOpacity = this.flightSpeed > speedThreshold
      ? Math.min(0.85, (this.flightSpeed - speedThreshold) / 55.0)
      : 0.0;

    this.streakMat.opacity = THREE.MathUtils.lerp(this.streakMat.opacity, targetStreakOpacity, 0.15);

    if (this.streakMat.opacity > 0.02) {
      const streakPositions = this.streakGeo.getAttribute('position');
      const camPos = this.camera.position;
      const forwardDir = new THREE.Vector3();
      this.camera.getWorldDirection(forwardDir);

      const rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
      const upDir = new THREE.Vector3().crossVectors(rightDir, forwardDir).normalize();

      const speedFactor = Math.min(2.5, this.flightSpeed / 35.0);

      for (let i = 0; i < this.streakCount; i++) {
        // Advance streak towards and past camera
        this.streakZ[i] += dt * (this.flightSpeed * 1.8 + 25.0);
        if (this.streakZ[i] > 2.0) {
          this.streakZ[i] = -42.0 - Math.random() * 20.0;
          this.streakRadii[i] = 2.2 + Math.random() * 12.0;
          this.streakAngles[i] = Math.random() * Math.PI * 2;
        }

        const r = this.streakRadii[i];
        const theta = this.streakAngles[i];
        const z = this.streakZ[i];
        const len = this.streakLengths[i] * speedFactor;

        // Compute local cylinder coordinate around camera look axis
        const xOffset = Math.cos(theta) * r;
        const yOffset = Math.sin(theta) * r;

        const startPt = camPos.clone()
          .addScaledVector(rightDir, xOffset)
          .addScaledVector(upDir, yOffset)
          .addScaledVector(forwardDir, z);

        const endPt = startPt.clone().addScaledVector(forwardDir, len);

        streakPositions.setXYZ(i * 2 + 0, startPt.x, startPt.y, startPt.z);
        streakPositions.setXYZ(i * 2 + 1, endPt.x, endPt.y, endPt.z);
      }
      streakPositions.needsUpdate = true;
    }

    // 3. Atmospheric Re-entry Plasma Cone
    // Triggered when entering atmosphere from high orbit (y crossing 140 -> 60) while descending,
    // or when diving steeply at high speed
    const isEnteringAtmosphere = (playerPos.y > 35 && playerPos.y < 165 && this.verticalSpeed < -12.0);
    const isHypersonicDive = isSupersonicCraft && this.flightSpeed > 55.0 && this.verticalSpeed < -8.0;

    const shouldShowPlasma = isFlyingMount && (isEnteringAtmosphere || isHypersonicDive);

    if (shouldShowPlasma) {
      if (!this.reentryActive) {
        this.reentryActive = true;
        if (this.sfx && this.sfx.reentryRumble) {
          this.sfx.reentryRumble();
        }
      }

      this.plasmaCone.visible = true;

      // Position plasma cone at the nose of the player craft
      const noseOffset = new THREE.Vector3(
        -Math.sin(playerYaw) * 3.5,
        mountType === 'starship' ? 1.2 : 0.6,
        -Math.cos(playerYaw) * 3.5
      );
      this.plasmaCone.position.copy(playerPos).add(noseOffset);

      // Orient cone towards forward flight direction
      const noseLook = this.plasmaCone.position.clone().add(noseOffset);
      this.plasmaCone.lookAt(noseLook);

      // Dynamic burning flame pulse
      const entryIntensity = Math.min(1.0, Math.abs(this.verticalSpeed) / 35.0 + (this.flightSpeed / 95.0) * 0.5);
      const pulse = 0.55 + Math.sin(performance.now() * 0.02) * 0.2;
      this.plasmaMat.opacity = THREE.MathUtils.lerp(this.plasmaMat.opacity, 0.75 * entryIntensity * pulse, 0.2);
      this.plasmaCoreMat.opacity = THREE.MathUtils.lerp(this.plasmaCoreMat.opacity, 0.9 * entryIntensity, 0.2);

      // Continuous subtle atmospheric buffeting rumble
      if (this.feedback && this.feedback.addScreenShake) {
        this.feedback.addScreenShake(0.025 * entryIntensity);
      }

      // Spawn re-entry sparks/embers
      this.updateReentryEmbers(dt, this.plasmaCone.position, playerYaw, entryIntensity);
    } else {
      if (this.reentryActive) {
        this.reentryActive = false;
      }
      this.plasmaMat.opacity = THREE.MathUtils.lerp(this.plasmaMat.opacity, 0, 0.2);
      this.plasmaCoreMat.opacity = THREE.MathUtils.lerp(this.plasmaCoreMat.opacity, 0, 0.2);
      if (this.plasmaMat.opacity < 0.02) {
        this.plasmaCone.visible = false;
      }
    }

    // 4. Supersonic Sonic Boom Trigger
    const now = performance.now();
    if (isSupersonicCraft && this.flightSpeed > 65.0 && now - this.lastSonicBoomAt > 5500) {
      this.lastSonicBoomAt = now;
      const forwardDir = new THREE.Vector3(-Math.sin(playerYaw), 0, -Math.cos(playerYaw));
      this.spawnSonicBoomRing(playerPos, forwardDir);
    }

    // 5. Update Mach Rings
    for (let i = this.activeMachRings.length - 1; i >= 0; i--) {
      const ring = this.activeMachRings[i];
      ring.scale += dt * 18.0;
      ring.opacity -= dt * 2.2;
      ring.mesh.scale.set(ring.scale, ring.scale, ring.scale);
      ring.mat.opacity = Math.max(0, ring.opacity);
      // Move backwards past craft
      ring.mesh.position.addScaledVector(ring.forward, -dt * 15.0);

      if (ring.opacity <= 0) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        ring.mat.dispose();
        this.activeMachRings.splice(i, 1);
      }
    }
  }

  updateReentryEmbers(dt, nosePos, playerYaw, intensity) {
    const emberPositions = this.emberGeo.getAttribute('position');
    const emberColors = this.emberGeo.getAttribute('color');
    const backwardDir = new THREE.Vector3(Math.sin(playerYaw), 0.2, Math.cos(playerYaw)).normalize();

    let writeIdx = 0;
    for (let i = 0; i < this.emberCount; i++) {
      const emb = this.emberData[i];
      emb.life += dt;
      if (emb.life >= emb.maxLife) {
        // Respawn at nose
        emb.life = 0;
        emb.maxLife = 0.25 + Math.random() * 0.25;
        emb.relPos.copy(nosePos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.8
        ));
        emb.vel.copy(backwardDir).multiplyScalar(30.0 + Math.random() * 25.0).add(new THREE.Vector3(
          (Math.random() - 0.5) * 8.0,
          (Math.random() - 0.5) * 6.0,
          (Math.random() - 0.5) * 8.0
        ));
      }

      emb.relPos.addScaledVector(emb.vel, dt);
      const lifeRatio = 1.0 - emb.life / emb.maxLife;

      emberPositions.setXYZ(writeIdx, emb.relPos.x, emb.relPos.y, emb.relPos.z);
      // Fiery orange to gold decay
      emberColors.setXYZ(writeIdx, 1.0, 0.45 * lifeRatio, 0.1 * lifeRatio);
      writeIdx++;
    }

    emberPositions.needsUpdate = true;
    emberColors.needsUpdate = true;
    this.emberGeo.setDrawRange(0, writeIdx);
  }
}
