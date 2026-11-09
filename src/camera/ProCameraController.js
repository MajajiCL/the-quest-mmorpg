import * as THREE from 'three';

// ============================================================================
// PRO CAMERA CONTROLLER // THE QUEST (THREE.JS AAA CAMERA SYSTEM)
// Features:
// - Third-Person Dual-Exponential Smoothing (Position & Look-At Damping)
// - Robust Real-Time Collision Prevention against Cylinders, Boxes & Terrains
// - Anti-Clip Instant Push-In & Cinematic Gentle Ease-Out
// - Ground & Ocean Terrain Elevation Clamping (No sub-surface clipping)
// - Mouse Wheel Adaptive Zoom Support (3.0m - 26.0m)
// - Integrated Decaying Trauma Screen Shake Integration
// ============================================================================

export class ProCameraController {
  constructor(camera, getGroundHeightFn, worldColliders = []) {
    this.camera = camera;
    this.getGroundHeight = getGroundHeightFn || ((x, z) => 0);
    this.worldColliders = worldColliders;

    // Camera angles
    this.yaw = 0;
    this.pitch = 0.24;

    // Zoom and distances
    this.userZoom = 1.0; // Multiplier controlled by wheel
    this.currentDistance = 9.0;
    this.targetDistance = 9.0;
    this.minDistance = 2.8;
    this.maxDistance = 26.0;

    // Damped states
    this.currentPosition = new THREE.Vector3(0, 3, 20);
    this.currentLookAt = new THREE.Vector3(0, 1.8, 0);

    // Collision clearances
    this.obstacleClearance = 0.48; // Margin away from pillars and walls
    this.groundClearance = 0.65;   // Min height above ground / water surface

    // Setup mouse wheel zoom
    this.setupWheelListener();
  }

  setupWheelListener() {
    window.addEventListener('wheel', (e) => {
      // Ignore if user is scrolling inside modal/chat
      if (e.target && e.target.closest && (e.target.closest('.drawer') || e.target.closest('.modal-content') || e.target.closest('#chat-messages'))) {
        return;
      }
      const zoomDelta = e.deltaY * 0.0012;
      this.userZoom = THREE.MathUtils.clamp(this.userZoom + zoomDelta, 0.45, 2.4);
    }, { passive: true });
  }

  getBaseDistanceForMount(mountType) {
    switch (mountType) {
      case 'horse': return 10.5;
      case 'supercar': return 11.2;
      case 'mythic_bird': return 12.0;
      case 'jet': return 13.5;
      case 'starship': return 16.0;
      case 'ship': return 17.5;
      default: return 8.8;
    }
  }

  getHeightOffsetForMount(mountType) {
    switch (mountType) {
      case 'horse': return 2.2;
      case 'supercar': return 1.95;
      case 'mythic_bird': return 2.5;
      case 'jet': return 2.8;
      case 'starship': return 3.2;
      case 'ship': return 3.8;
      default: return 1.85;
    }
  }

  solveCollisions(focusPoint, rayDir, desiredDist) {
    let allowedDist = desiredDist;
    const rayOrigin = focusPoint;

    // 1. Raycast against World Colliders (Cylinders and Boxes)
    for (const col of this.worldColliders) {
      if (rayOrigin.y + desiredDist < col.minY || rayOrigin.y - desiredDist > col.maxY) continue;

      if (col.type === 'cylinder') {
        const hitT = this.intersectRayCylinder2D(
          rayOrigin.x, rayOrigin.z,
          rayDir.x, rayDir.z,
          col.x, col.z,
          col.radius + this.obstacleClearance
        );
        if (hitT !== null && hitT > 0 && hitT < allowedDist) {
          const hitY = rayOrigin.y + rayDir.y * hitT;
          if (hitY >= col.minY - 0.5 && hitY <= col.maxY + 0.5) {
            allowedDist = Math.max(this.minDistance, hitT - 0.25);
          }
        }
      } else if (col.type === 'box') {
        const hitT = this.intersectRayAABB(
          rayOrigin,
          rayDir,
          col.minX - this.obstacleClearance,
          col.maxX + this.obstacleClearance,
          col.minY,
          col.maxY,
          col.minZ - this.obstacleClearance,
          col.maxZ + this.obstacleClearance
        );
        if (hitT !== null && hitT > 0 && hitT < allowedDist) {
          allowedDist = Math.max(this.minDistance, hitT - 0.25);
        }
      }
    }

    // 2. Sample ground elevation along the probe ray
    const sampleSteps = 5;
    for (let i = 1; i <= sampleSteps; i++) {
      const stepDist = (allowedDist / sampleSteps) * i;
      const sampleX = rayOrigin.x + rayDir.x * stepDist;
      const sampleZ = rayOrigin.z + rayDir.z * stepDist;
      const sampleY = rayOrigin.y + rayDir.y * stepDist;
      const groundH = this.getGroundHeight(sampleX, sampleZ) + this.groundClearance;

      if (sampleY < groundH) {
        // Ray penetrates terrain; pull distance back to before terrain penetration
        allowedDist = Math.max(this.minDistance, Math.min(allowedDist, stepDist * 0.9));
        break;
      }
    }

    return allowedDist;
  }

  intersectRayCylinder2D(ox, oz, dx, dz, cx, cz, r) {
    const fx = ox - cx;
    const fz = oz - cz;

    const a = dx * dx + dz * dz;
    if (a < 1e-7) return null; // Parallel to Y axis

    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - r * r;

    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    if (t1 > 0) return t1;
    if (t2 > 0) return t2;
    return null;
  }

  intersectRayAABB(origin, dir, minX, maxX, minY, maxY, minZ, maxZ) {
    let tmin = -Infinity;
    let tmax = Infinity;

    // X slab
    if (Math.abs(dir.x) > 1e-6) {
      let t1 = (minX - origin.x) / dir.x;
      let t2 = (maxX - origin.x) / dir.x;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    } else if (origin.x < minX || origin.x > maxX) {
      return null;
    }

    // Y slab
    if (Math.abs(dir.y) > 1e-6) {
      let t1 = (minY - origin.y) / dir.y;
      let t2 = (maxY - origin.y) / dir.y;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    } else if (origin.y < minY || origin.y > maxY) {
      return null;
    }

    // Z slab
    if (Math.abs(dir.z) > 1e-6) {
      let t1 = (minZ - origin.z) / dir.z;
      let t2 = (maxZ - origin.z) / dir.z;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    } else if (origin.z < minZ || origin.z > maxZ) {
      return null;
    }

    return tmin > 0 ? tmin : (tmax > 0 ? tmax : null);
  }

  update(dt, playerPos, mountType, shakeOffsets = null) {
    const baseDist = this.getBaseDistanceForMount(mountType);
    const heightOffset = this.getHeightOffsetForMount(mountType);
    const desiredDist = THREE.MathUtils.clamp(baseDist * this.userZoom, this.minDistance, this.maxDistance);

    // Focus point at player head level
    const focusPoint = new THREE.Vector3(playerPos.x, playerPos.y + heightOffset, playerPos.z);

    // Direction vector from player focus point towards camera
    const rayDir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    // Solve for occlusion and terrain collision
    const safeDist = this.solveCollisions(focusPoint, rayDir, desiredDist);

    // Asymmetric lerp:
    // When pushing in (hit obstacle), move fast (anti-clip)
    // When easing out (clear obstacle), return gently (cinematic smoothing)
    if (safeDist < this.currentDistance) {
      const pushFactor = 1.0 - Math.exp(-24.0 * dt);
      this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDist, pushFactor);
    } else {
      const easeFactor = 1.0 - Math.exp(-6.5 * dt);
      this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDist, easeFactor);
    }

    // Calculate ideal collision-free camera position
    const targetCamPos = focusPoint.clone().addScaledVector(rayDir, this.currentDistance);

    // Final safety check: clamp targetCamPos.y above ground terrain
    const groundHeightAtCam = this.getGroundHeight(targetCamPos.x, targetCamPos.z);
    if (targetCamPos.y < groundHeightAtCam + this.groundClearance) {
      targetCamPos.y = groundHeightAtCam + this.groundClearance;
    }

    // Dual-exponential damping for camera position and look-at target
    const posLerp = 1.0 - Math.exp(-15.0 * dt);
    const lookLerp = 1.0 - Math.exp(-18.0 * dt);

    this.currentPosition.lerp(targetCamPos, posLerp);
    this.currentLookAt.lerp(focusPoint, lookLerp);

    // Apply collision-free smoothed position to camera
    this.camera.position.copy(this.currentPosition);

    // Add trauma screen shake translation if present
    if (shakeOffsets && shakeOffsets.translation) {
      this.camera.position.add(shakeOffsets.translation);
    }

    // Look at player target
    this.camera.lookAt(this.currentLookAt);

    // Apply trauma screen shake rotational noise (roll, pitch, yaw) on top of lookAt
    if (shakeOffsets && shakeOffsets.rotation) {
      this.camera.rotation.x += shakeOffsets.rotation.x;
      this.camera.rotation.y += shakeOffsets.rotation.y;
      this.camera.rotation.z += shakeOffsets.rotation.z;
    }
  }
}
