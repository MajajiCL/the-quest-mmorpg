import * as THREE from 'three';

// ============================================================================
// BOSS TELEGRAPH SYSTEM // THE QUEST (THREE.JS AAA COMBAT ENGINE)
// Features:
// - Dynamic Ground-Projected AoE Warning Rings with real-time radial fill
// - Concentric Hazard Chevrons & Pulsing Emissive Warning Borders
// - Floating 3D Billboard Warning Beacons with dynamic countdown
// - Vertical Orbital Beam / Target Pillars
// - Signature Boss Special Attacks:
//     * Coloso de Aethelgard: "Golpe Sísmico de Obsidiana"
//     * Dragón Leviatán: "Tsunami & Vórtice Abisal"
//     * Arconte de Selene: "Rayo Orbital de Gravedad Lunar"
//     * Ignis de Ares Prime: "Caldera & Erupción Kyber"
//     * Emperador Dragón de Aurelia: "Singularidad Cósmica del Vacío"
// ============================================================================

export const BOSS_TELEGRAPH_CONFIGS = {
  boss_earth: {
    bossId: 'boss_earth',
    title: 'COLOSO DE AETHELGARD',
    attackName: 'GOLPE SÍSMICO DE OBSIDIANA',
    warningBanner: '¡ALERTA SÍSMICA: IMPACTO COLOSAL!',
    radius: 9.0,
    duration: 2.2,
    color: 0xff2b2b,
    accentColor: 0xffaa00,
    damage: 48,
    knockback: 14.0,
    shakeTrauma: 0.70,
    cooldown: 10.5,
    pillarHeight: 18.0
  },
  boss_ocean: {
    bossId: 'boss_ocean',
    title: 'DRAGÓN LEVIATÁN',
    attackName: 'TSUNAMI & VÓRTICE ABISAL',
    warningBanner: '¡PELIGRO: VÓRTICE DEL LEVIATÁN!',
    radius: 10.5,
    duration: 2.4,
    color: 0x00d4ff,
    accentColor: 0xff2255,
    damage: 58,
    knockback: 16.0,
    shakeTrauma: 0.65,
    cooldown: 11.5,
    pillarHeight: 22.0
  },
  boss_moon: {
    bossId: 'boss_moon',
    title: 'ARCONTE DE SELENE',
    attackName: 'RAYO ORBITAL DE GRAVEDAD LUNAR',
    warningBanner: '¡ADVERTENCIA: RAYO ORBITAL LUNAR!',
    radius: 8.5,
    duration: 1.9,
    color: 0xb336ff,
    accentColor: 0xff0066,
    damage: 68,
    knockback: 12.0,
    shakeTrauma: 0.60,
    cooldown: 9.5,
    pillarHeight: 35.0
  },
  boss_mars: {
    bossId: 'boss_mars',
    title: 'IGNIS DE ARES PRIME',
    attackName: 'CALDERA & ERUPCIÓN KYBER',
    warningBanner: '¡PELIGRO CRÍTICO: ERUPCIÓN KYBER!',
    radius: 10.0,
    duration: 2.3,
    color: 0xff3b00,
    accentColor: 0xffbb00,
    damage: 88,
    knockback: 18.0,
    shakeTrauma: 0.75,
    cooldown: 11.0,
    pillarHeight: 25.0
  },
  boss_aurelia: {
    bossId: 'boss_aurelia',
    title: 'EMPERADOR DRAGÓN DE AURELIA',
    attackName: 'SINGULARIDAD CÓSMICA DEL VACÍO',
    warningBanner: '¡EXTINCIÓN: SINGULARIDAD DE AURELIA!',
    radius: 12.0,
    duration: 2.6,
    color: 0xffd700,
    accentColor: 0x8800ff,
    damage: 115,
    knockback: 22.0,
    shakeTrauma: 0.85,
    cooldown: 12.5,
    pillarHeight: 40.0
  }
};

export class BossTelegraphSystem {
  constructor(scene, getGroundHeightFn, sfxEngine, feedbackEngine) {
    this.scene = scene;
    this.getGroundHeight = getGroundHeightFn || ((x, z) => 0);
    this.sfx = sfxEngine;
    this.feedback = feedbackEngine;

    this.activeTelegraphs = [];
    this.bossStates = new Map(); // bossId -> { lastAttackAt, isCharging, currentTelegraphId }

    // Reusable geometries to prevent GC allocations
    this.unitCircleGeo = new THREE.CircleGeometry(1, 48);
    this.unitRingGeo = new THREE.RingGeometry(0.96, 1.0, 48);
    this.unitInnerRingGeo = new THREE.RingGeometry(0.5, 0.54, 32);
    this.unitCylinderGeo = new THREE.CylinderGeometry(0.95, 0.95, 1, 32, 1, true);
  }

  getBossState(bossId) {
    if (!this.bossStates.has(bossId)) {
      this.bossStates.set(bossId, {
        lastAttackAt: performance.now() - 4000,
        isCharging: false,
        currentTelegraphId: null
      });
    }
    return this.bossStates.get(bossId);
  }

  createWarningBannerSprite(text, accentHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 110;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 12, 22, 0.88)';
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 86, 16);
    ctx.fill();

    const colorStr = `#${accentHex.toString(16).padStart(6, '0')}`;
    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Cinzel", "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 48);

    ctx.fillStyle = colorStr;
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText('⚡ ¡EVADE CON SPRINT O SALTO! ⚡', 256, 80);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(6.5, 1.4, 1);
    return { sprite, texture, canvas, ctx, colorStr, text };
  }

  updateWarningBannerCountdown(bannerData, remainingSec) {
    if (!bannerData || !bannerData.ctx) return;
    const { ctx, canvas, texture, colorStr, text } = bannerData;
    ctx.clearRect(0, 0, 512, 110);

    ctx.fillStyle = 'rgba(10, 12, 22, 0.88)';
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 86, 16);
    ctx.fill();

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Cinzel", "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 48);

    ctx.fillStyle = '#ff4d4d';
    ctx.font = '800 21px "JetBrains Mono", monospace';
    ctx.fillText(`⚠ DETONACIÓN EN ${Math.max(0, remainingSec).toFixed(1)}s ⚠`, 256, 80);

    texture.needsUpdate = true;
  }

  startTelegraph(configKey, centerPos, onDetonate = null) {
    const config = BOSS_TELEGRAPH_CONFIGS[configKey] || BOSS_TELEGRAPH_CONFIGS.boss_earth;
    const groundY = this.getGroundHeight(centerPos.x, centerPos.z);
    const origin = new THREE.Vector3(centerPos.x, groundY + 0.05, centerPos.z);

    const rootGroup = new THREE.Group();
    rootGroup.position.copy(origin);

    // 1. Outer Warning Ring (Fixed at max radius)
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(this.unitRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.scale.set(config.radius, config.radius, 1);
    rootGroup.add(outerRing);

    // 2. Inner Filling Danger Disc (Expands from scale 0 to config.radius over duration)
    const innerFillMat = new THREE.MeshBasicMaterial({
      color: config.accentColor,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const innerFill = new THREE.Mesh(this.unitCircleGeo, innerFillMat);
    innerFill.rotation.x = -Math.PI / 2;
    innerFill.scale.set(0.01, 0.01, 1);
    innerFill.position.y = 0.005;
    rootGroup.add(innerFill);

    // 3. Concentric Pulsing Accent Ring
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const pulseRing = new THREE.Mesh(this.unitInnerRingGeo, pulseRingMat);
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.scale.set(config.radius * 0.5, config.radius * 0.5, 1);
    pulseRing.position.y = 0.01;
    rootGroup.add(pulseRing);

    // 4. Vertical Atmospheric / Orbital Cylinder Beam
    const beamHeight = config.pillarHeight || 20.0;
    const beamMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide
    });
    const beamMesh = new THREE.Mesh(this.unitCylinderGeo, beamMat);
    beamMesh.position.y = beamHeight / 2;
    beamMesh.scale.set(config.radius, beamHeight, config.radius);
    rootGroup.add(beamMesh);

    // 5. Overhead 3D Holographic Warning Banner
    const banner = this.createWarningBannerSprite(config.warningBanner, config.accentColor);
    banner.sprite.position.set(0, 3.2, 0);
    rootGroup.add(banner.sprite);

    this.scene.add(rootGroup);

    // Sound effect: Boss telegraph charge hum
    if (this.sfx && this.sfx.bossTelegraphCharge) {
      this.sfx.bossTelegraphCharge();
    }

    const telegraphId = `tel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bossState = this.getBossState(config.bossId);
    bossState.isCharging = true;
    bossState.currentTelegraphId = telegraphId;

    const telegraphObj = {
      id: telegraphId,
      config,
      center: origin.clone(),
      rootGroup,
      outerRing,
      outerRingMat,
      innerFill,
      innerFillMat,
      pulseRing,
      pulseRingMat,
      beamMesh,
      beamMat,
      banner,
      startTime: performance.now(),
      duration: config.duration,
      onDetonate
    };

    this.activeTelegraphs.push(telegraphObj);
    return telegraphObj;
  }

  update(dt, playerPos, onDamagePlayer) {
    const now = performance.now();

    for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
      const tel = this.activeTelegraphs[i];
      const elapsedSec = (now - tel.startTime) / 1000;
      const progress = Math.min(1.0, elapsedSec / tel.duration);
      const remaining = tel.duration - elapsedSec;

      // Rotate outer danger ring for dynamic motion
      tel.outerRing.rotation.z += dt * 1.8;

      // Expand inner charge disc to full radius
      const currentFillRadius = Math.max(0.1, tel.config.radius * progress);
      tel.innerFill.scale.set(currentFillRadius, currentFillRadius, 1);

      // Pulse opacity faster as detonation nears
      const pulseFreq = 4.0 + progress * 14.0;
      const pulseAlpha = 0.35 + Math.sin(now * 0.001 * pulseFreq * Math.PI) * 0.25;
      tel.innerFillMat.opacity = pulseAlpha;
      tel.pulseRingMat.opacity = 0.4 + Math.cos(now * 0.001 * pulseFreq * Math.PI) * 0.4;

      // Pulse beam intensity
      tel.beamMat.opacity = 0.12 + progress * 0.25 + Math.sin(now * 0.008) * 0.05;

      // Update overhead countdown banner
      if (Math.floor(elapsedSec * 10) % 2 === 0) {
        this.updateWarningBannerCountdown(tel.banner, remaining);
      }

      // Detonation check
      if (progress >= 1.0) {
        this.detonateTelegraph(tel, playerPos, onDamagePlayer);
        this.cleanupTelegraph(tel);
        this.activeTelegraphs.splice(i, 1);
      }
    }
  }

  detonateTelegraph(tel, playerPos, onDamagePlayer) {
    const { config, center } = tel;

    // Reset boss charging state
    const bossState = this.getBossState(config.bossId);
    bossState.isCharging = false;
    bossState.lastAttackAt = performance.now();
    bossState.currentTelegraphId = null;

    // 1. Sound FX
    if (this.sfx && this.sfx.bossImpact) {
      this.sfx.bossImpact();
    }

    // 2. Camera Screen Shake
    if (this.feedback && this.feedback.addScreenShake) {
      this.feedback.addScreenShake(config.shakeTrauma);
    }

    // 3. Visual Detonation: Expanding Ground Rupture Shockwave
    if (this.feedback && this.feedback.spawnShockwave) {
      this.feedback.spawnShockwave(center.clone().add(new THREE.Vector3(0, 0.15, 0)), config.color, config.radius * 1.5);
    }

    // 4. Directional Sparks / Explosive Pillar
    if (this.feedback && this.feedback.spawnExplosiveBurst) {
      this.feedback.spawnExplosiveBurst(center.clone().add(new THREE.Vector3(0, 0.4, 0)), config.accentColor, 40);
    }

    // 5. Hit Detection against Player
    if (playerPos) {
      const horizontalDist = Math.hypot(playerPos.x - center.x, playerPos.z - center.z);
      const verticalDist = Math.abs(playerPos.y - center.y);

      if (horizontalDist <= config.radius && verticalDist <= 5.0) {
        // Player caught in the blast!
        const knockDir = new THREE.Vector3(playerPos.x - center.x, 0, playerPos.z - center.z);
        if (knockDir.lengthSq() < 0.001) knockDir.set(0, 0, 1);
        knockDir.normalize();

        const knockImpulse = knockDir.multiplyScalar(config.knockback);

        if (typeof onDamagePlayer === 'function') {
          onDamagePlayer({
            bossId: config.bossId,
            attackName: config.attackName,
            damage: config.damage,
            knockImpulse,
            center
          });
        }

        // Trigger player damage feedback
        if (this.feedback) {
          if (this.feedback.triggerDamageVignette) this.feedback.triggerDamageVignette(0.75);
          if (this.feedback.triggerHitStop) this.feedback.triggerHitStop(50);
        }
      }
    }

    // Optional custom callback
    if (typeof tel.onDetonate === 'function') {
      tel.onDetonate(tel);
    }
  }

  cleanupTelegraph(tel) {
    if (tel.rootGroup) {
      this.scene.remove(tel.rootGroup);
      tel.rootGroup.traverse((child) => {
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
        if (child.material?.map) child.material.map.dispose();
      });
    }
  }

  clearAll() {
    for (const tel of this.activeTelegraphs) {
      this.cleanupTelegraph(tel);
    }
    this.activeTelegraphs = [];
  }
}
