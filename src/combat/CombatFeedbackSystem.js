import * as THREE from 'three';

// ============================================================================
// COMBAT FEEDBACK SYSTEM // THE QUEST (THREE.JS AAA COMBAT ENGINE)
// Features:
// - Decaying Trauma Camera Screen Shake (3D Translational & Rotational Noise)
// - Directional Velocity Hit Sparks with Gravity & Ground Bounce
// - Glowing Crescent Slash Arcs & Impact Point Flashes
// - Impact Freeze Frame (Hit-Stop / Micro-Stall)
// - Enemy Damage Flash & Harmonic Squash-and-Stretch Recoil
// - Fullscreen Dynamic Combat Vignette (Crimson Damage & Golden-Cyan Crits)
// ============================================================================

export class CombatFeedbackSystem {
  constructor(scene, getGroundHeightFn) {
    this.scene = scene;
    this.getGroundHeight = getGroundHeightFn || ((x, z) => 0);

    // Screen Shake (Trauma Physics)
    this.trauma = 0;
    this.shakeDecayRate = 1.65;
    this.shakeTranslation = new THREE.Vector3();
    this.shakeRotation = new THREE.Euler(0, 0, 0, 'YXZ');

    // Impact Freeze Frame (Hit-Stop)
    this.hitStopTimer = 0;

    // Directional Hit Sparks Particle Pool
    this.activeSparks = [];
    this.maxSparks = 250;
    this.sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(this.maxSparks * 3);
    const sparkColors = new Float32Array(this.maxSparks * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    this.sparkMaterial = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMaterial);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);

    // Active Slash Arcs & Shockwaves
    this.activeShockwaves = [];
    this.activeSlashArcs = [];
    this.activeHitFlashes = [];

    // Enemy Squash/Stretch Tracking
    this.flashingEnemies = new Map(); // entity -> { originalScale, recoilTimer, emissiveMaterials }

    // Fullscreen Dynamic Vignette DOM Overlay
    this.initFullscreenVignette();
  }

  initFullscreenVignette() {
    this.vignetteEl = document.createElement('div');
    this.vignetteEl.id = 'combat-feedback-vignette';
    this.vignetteEl.style.position = 'fixed';
    this.vignetteEl.style.top = '0';
    this.vignetteEl.style.left = '0';
    this.vignetteEl.style.width = '100vw';
    this.vignetteEl.style.height = '100vh';
    this.vignetteEl.style.pointerEvents = 'none';
    this.vignetteEl.style.zIndex = '9999';
    this.vignetteEl.style.opacity = '0';
    this.vignetteEl.style.transition = 'opacity 0.05s ease-out';
    this.vignetteEl.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
    document.body.appendChild(this.vignetteEl);
    this.vignetteAlpha = 0;
  }

  triggerDamageVignette(intensity = 0.75) {
    if (!this.vignetteEl) return;
    this.vignetteEl.style.background = 'radial-gradient(ellipse at center, rgba(255, 0, 40, 0) 45%, rgba(220, 10, 30, 0.55) 100%)';
    this.vignetteEl.style.boxShadow = 'inset 0 0 120px rgba(255, 20, 20, 0.85)';
    this.vignetteEl.style.opacity = intensity.toString();
    this.vignetteAlpha = intensity;
  }

  triggerCritVignette(intensity = 0.5) {
    if (!this.vignetteEl) return;
    this.vignetteEl.style.background = 'radial-gradient(ellipse at center, rgba(108, 229, 255, 0.05) 50%, rgba(255, 215, 0, 0.42) 100%)';
    this.vignetteEl.style.boxShadow = 'inset 0 0 90px rgba(255, 215, 0, 0.65)';
    this.vignetteEl.style.opacity = intensity.toString();
    this.vignetteAlpha = intensity;
  }

  addScreenShake(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  triggerHitStop(durationSec = 0.045) {
    this.hitStopTimer = durationSec;
  }

  isHitStopped() {
    return this.hitStopTimer > 0;
  }

  spawnDirectionalHitSparks(hitPos, hitDir, isCrit = false, isSoulshot = false, count = 26) {
    const baseColor = isSoulshot
      ? new THREE.Color(0x38d9ff)
      : isCrit
        ? new THREE.Color(0xffdc40)
        : new THREE.Color(0xff6622);

    const normDir = hitDir.clone().normalize();

    for (let i = 0; i < count; i++) {
      if (this.activeSparks.length >= this.maxSparks) {
        this.activeSparks.shift(); // Evict oldest
      }

      // Spark velocity cone along hit direction
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.2) * 1.5,
        (Math.random() - 0.5) * 1.6
      );
      const speed = (isCrit ? 16 : 11) + Math.random() * 8;
      const velocity = normDir.clone().multiplyScalar(speed * 0.75).add(spread.multiplyScalar(speed * 0.5));

      const sparkColor = baseColor.clone();
      sparkColor.offsetHSL((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.15);

      this.activeSparks.push({
        pos: hitPos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        )),
        vel: velocity,
        color: sparkColor,
        life: 0,
        maxLife: 0.32 + Math.random() * 0.22,
        bounces: 0
      });
    }

    // Spawn sharp glowing crescent slash arc
    this.spawnHitSlashArc(hitPos, normDir, isCrit, isSoulshot);
  }

  spawnExplosiveBurst(pos, colorHex = 0xff4400, count = 35) {
    const color = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      if (this.activeSparks.length >= this.maxSparks) this.activeSparks.shift();
      const angle = Math.random() * Math.PI * 2;
      const elev = 0.3 + Math.random() * 1.4;
      const spd = 12 + Math.random() * 14;
      const vel = new THREE.Vector3(
        Math.cos(angle) * spd,
        elev * spd,
        Math.sin(angle) * spd
      );
      this.activeSparks.push({
        pos: pos.clone(),
        vel,
        color: color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3,
        bounces: 0
      });
    }
  }

  spawnImpactSparks(pos, colorHex = 0xffd278, count = 16) {
    this.spawnExplosiveBurst(pos, colorHex, count);
  }

  spawnHitSlashArc(centerPos, hitDir, isCrit, isSoulshot) {
    const arcGeo = new THREE.RingGeometry(0.8, 1.25, 16, 1, 0, Math.PI * 0.85);
    const colorHex = isSoulshot ? 0x6ce5ff : (isCrit ? 0xffdf55 : 0xff7722);
    const arcMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.copy(centerPos);

    // Orient crescent towards the strike direction
    const lookTarget = centerPos.clone().add(hitDir);
    arcMesh.lookAt(lookTarget);
    arcMesh.rotation.z = Math.random() * Math.PI;

    this.scene.add(arcMesh);
    this.activeSlashArcs.push({
      mesh: arcMesh,
      mat: arcMat,
      scale: 0.6,
      opacity: 0.95,
      age: 0
    });
  }

  spawnShockwave(centerPos, colorHex = 0xffcf70, maxScale = 12.0) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.4, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(centerPos);
    this.scene.add(mesh);
    this.activeShockwaves.push({
      mesh,
      scale: 1,
      maxScale,
      opacity: 0.9,
      speed: 18.0 + maxScale * 0.5
    });
  }

  flashEnemyHit(entity, isCrit = false) {
    if (!entity || !entity.root) return;

    // 1. Squash-and-stretch harmonic scale recoil
    let track = this.flashingEnemies.get(entity);
    if (!track) {
      track = {
        baseScale: entity.root.scale.clone(),
        timer: 0.16,
        isCrit,
        materials: []
      };
      // Gather mesh materials to flash emissive
      entity.root.traverse((ch) => {
        if (ch.isMesh && ch.material) {
          if (Array.isArray(ch.material)) {
            ch.material.forEach((m) => track.materials.push({ mat: m, origColor: m.color.clone() }));
          } else {
            track.materials.push({ mat: ch.material, origColor: ch.material.color.clone() });
          }
        }
      });
      this.flashingEnemies.set(entity, track);
    } else {
      track.timer = 0.16;
      track.isCrit = isCrit;
    }

    // Momentary squash-and-stretch deformation
    entity.root.scale.y = track.baseScale.y * 0.88;
    entity.root.scale.x = track.baseScale.x * 1.14;
    entity.root.scale.z = track.baseScale.z * 1.14;

    // Flash material emissive to pure white / bright crimson
    for (const item of track.materials) {
      item.mat.color.setHex(isCrit ? 0xffffff : 0xff8888);
    }
  }

  update(dt, timeSec) {
    // 1. Hit-stop timer
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
    }

    // 2. Screen Shake Decay & Calculation
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * this.shakeDecayRate);
      const shake = Math.pow(this.trauma, 1.8);

      // Translational shake (high frequency noise)
      this.shakeTranslation.set(
        Math.sin(timeSec * 38.0) * 0.42 * shake,
        Math.sin(timeSec * 46.0 + 1.2) * 0.38 * shake,
        Math.cos(timeSec * 34.0 + 2.4) * 0.32 * shake
      );

      // Rotational shake (roll, pitch, yaw)
      this.shakeRotation.set(
        Math.cos(timeSec * 32.0 + 0.8) * 0.038 * shake,
        Math.sin(timeSec * 26.0 + 1.9) * 0.028 * shake,
        Math.sin(timeSec * 30.0) * 0.048 * shake
      );
    } else {
      this.shakeTranslation.set(0, 0, 0);
      this.shakeRotation.set(0, 0, 0);
    }

    // 3. Screen Vignette Decay
    if (this.vignetteAlpha > 0) {
      this.vignetteAlpha = Math.max(0, this.vignetteAlpha - dt * 2.8);
      if (this.vignetteEl) {
        this.vignetteEl.style.opacity = this.vignetteAlpha.toFixed(3);
      }
    }

    // 4. Update Directional Sparks
    const posAttr = this.sparkGeo.getAttribute('position');
    const colAttr = this.sparkGeo.getAttribute('color');
    let sparkWriteIdx = 0;

    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const sp = this.activeSparks[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        this.activeSparks.splice(i, 1);
        continue;
      }

      // Physics: gravity + velocity integration
      sp.vel.y -= 22.0 * dt;
      sp.pos.addScaledVector(sp.vel, dt);

      // Ground bounce check
      const groundY = this.getGroundHeight(sp.pos.x, sp.pos.z);
      if (sp.pos.y <= groundY + 0.05 && sp.bounces < 1) {
        sp.pos.y = groundY + 0.05;
        sp.vel.y = -sp.vel.y * 0.42;
        sp.vel.x *= 0.7;
        sp.vel.z *= 0.7;
        sp.bounces++;
      }

      const lifeRatio = 1.0 - sp.life / sp.maxLife;

      posAttr.setXYZ(sparkWriteIdx, sp.pos.x, sp.pos.y, sp.pos.z);
      colAttr.setXYZ(sparkWriteIdx, sp.color.r * lifeRatio, sp.color.g * lifeRatio, sp.color.b * lifeRatio);
      sparkWriteIdx++;
    }

    // Zero out remaining buffer points
    for (let i = sparkWriteIdx; i < this.maxSparks; i++) {
      posAttr.setXYZ(i, 0, -9999, 0);
      colAttr.setXYZ(i, 0, 0, 0);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.sparkGeo.setDrawRange(0, sparkWriteIdx);

    // 5. Update Slash Arcs
    for (let i = this.activeSlashArcs.length - 1; i >= 0; i--) {
      const arc = this.activeSlashArcs[i];
      arc.age += dt;
      arc.scale += dt * 14.0;
      arc.opacity -= dt * 7.5;
      arc.mesh.scale.set(arc.scale, arc.scale, arc.scale);
      arc.mat.opacity = Math.max(0, arc.opacity);

      if (arc.opacity <= 0 || arc.age >= 0.14) {
        this.scene.remove(arc.mesh);
        arc.mesh.geometry.dispose();
        arc.mat.dispose();
        this.activeSlashArcs.splice(i, 1);
      }
    }

    // 6. Update Shockwaves
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeShockwaves[i];
      sw.scale += dt * sw.speed;
      sw.opacity -= dt * 1.8;
      sw.mesh.scale.set(sw.scale, sw.scale, 1);
      sw.mesh.material.opacity = Math.max(0, sw.opacity);

      if (sw.opacity <= 0 || sw.scale >= (sw.maxScale || 14)) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.activeShockwaves.splice(i, 1);
      }
    }

    // 7. Update Flashing & Squash/Stretch Enemies
    for (const [entity, track] of this.flashingEnemies.entries()) {
      track.timer -= dt;
      if (track.timer <= 0) {
        // Restore materials and scale
        if (entity.root) {
          entity.root.scale.copy(track.baseScale);
        }
        for (const item of track.materials) {
          item.mat.color.copy(item.origColor);
        }
        this.flashingEnemies.delete(entity);
      } else {
        // Elastic spring back to base scale
        const recoverFactor = 1.0 - (track.timer / 0.16);
        if (entity.root) {
          entity.root.scale.lerp(track.baseScale, Math.min(1.0, recoverFactor * 1.5));
        }
      }
    }
  }

  getShakeOffsets() {
    return {
      translation: this.shakeTranslation,
      rotation: this.shakeRotation,
      trauma: this.trauma
    };
  }
}
