import * as THREE from 'three';
import { ROAD_WIDTH } from '../world/RoadSegment.ts';

export class Player {
  public mesh: THREE.Group;
  public boundingBox: THREE.Box3;

  // First-Person Cockpit components
  public cockpitGroup: THREE.Group;
  private throttleGrip: THREE.Mesh | null = null;
  private brakeLever: THREE.Group | null = null;
  private dashCanvas: HTMLCanvasElement;
  private dashCtx: CanvasRenderingContext2D;
  private dashTexture: THREE.CanvasTexture;

  // Transmission & RPM
  public currentGear = 1;
  public currentRpm = 0.2;
  private gearThresholds = [0, 65, 105, 145, 180, 205, 230];

  // Speed physics
  public speedKmh = 0;
  public readonly minSpeedKmh = 60.0;
  public readonly normalSpeedKmh = 120.0;
  public readonly maxSpeedKmh = 220.0;

  private speedUnits = 0;
  private readonly unitsToKmh = 4.0;

  // Position & Dynamics
  // Driver looking forward along +Z:
  // Screen-Left = +X, Screen-Right = -X
  public x = 0;
  public z = 0;
  public currentLean = 0;
  private targetLean = 0;
  public pitch = 0;
  public bobbing = 0;
  private bobbingTimer = 0;

  // State
  public isCrashed = false;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.cockpitGroup = new THREE.Group();
    this.boundingBox = new THREE.Box3();

    // High-resolution digital dashboard LCD texture (512x256)
    this.dashCanvas = document.createElement('canvas');
    this.dashCanvas.width = 512;
    this.dashCanvas.height = 256;
    this.dashCtx = this.dashCanvas.getContext('2d')!;
    this.dashTexture = new THREE.CanvasTexture(this.dashCanvas);
    this.dashTexture.anisotropy = 4;

    this.buildHumanCockpit();
    this.mesh.add(this.cockpitGroup);
    scene.add(this.mesh);

    this.reset();
  }

  private buildHumanCockpit(): void {
    // Realistic PBR materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.85
    });

    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x0f141c,
      roughness: 0.5,
      metalness: 0.5
    });

    const rubberGripMat = new THREE.MeshStandardMaterial({
      color: 0x111418,
      roughness: 0.92,
      metalness: 0.08
    });

    const gloveLeatherMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.7,
      metalness: 0.2
    });

    const gloveAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.4,
      metalness: 0.4
    });

    const polishedAlloyMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.18,
      metalness: 0.95
    });

    const windshieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x030712,
      transparent: true,
      opacity: 0.35,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.75,
      ior: 1.5
    });

    // 1. Top of Fuel Tank (visible in lower foreground)
    const tankGeo = new THREE.BoxGeometry(0.48, 0.35, 0.65);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.25, metalness: 0.7 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.82, 0.22);
    tank.rotation.x = -0.32;
    this.cockpitGroup.add(tank);

    // Fuel Tank Cap
    const capGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16);
    const cap = new THREE.Mesh(capGeo, polishedAlloyMat);
    cap.position.set(0, 0.98, 0.28);
    cap.rotation.x = -0.32;
    this.cockpitGroup.add(cap);

    // 2. Triple-Tree Top Clamp (Fork Crown)
    const crownGeo = new THREE.BoxGeometry(0.72, 0.06, 0.16);
    const crown = new THREE.Mesh(crownGeo, titaniumMat);
    crown.position.set(0, 1.04, 0.58);
    crown.rotation.x = -0.15;
    this.cockpitGroup.add(crown);

    // Center Stem Nut (Cyan Accent)
    const stemNutGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12);
    const stemNutMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.2 });
    const stemNut = new THREE.Mesh(stemNutGeo, stemNutMat);
    stemNut.position.set(0, 1.08, 0.58);
    this.cockpitGroup.add(stemNut);

    // 3. Clip-On Handlebars
    const barRadius = 0.022;
    const barLen = 0.38;
    const barGeo = new THREE.CylinderGeometry(barRadius, barRadius, barLen, 12);

    // Screen-Left Bar (+X)
    const leftBar = new THREE.Mesh(barGeo, titaniumMat);
    leftBar.rotation.z = Math.PI / 2 + 0.16;
    leftBar.rotation.y = 0.12;
    leftBar.position.set(0.3, 1.02, 0.62);
    this.cockpitGroup.add(leftBar);

    // Screen-Right Bar (-X)
    const rightBar = new THREE.Mesh(barGeo, titaniumMat);
    rightBar.rotation.z = -Math.PI / 2 - 0.16;
    rightBar.rotation.y = -0.12;
    rightBar.position.set(-0.3, 1.02, 0.62);
    this.cockpitGroup.add(rightBar);

    // 4. Textured Rubber Grips & Rider Gloves
    const gripGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.18, 12);

    // Left Grip & Glove (+X)
    const leftGrip = new THREE.Mesh(gripGeo, rubberGripMat);
    leftGrip.rotation.z = Math.PI / 2 + 0.16;
    leftGrip.rotation.y = 0.12;
    leftGrip.position.set(0.38, 1.0, 0.64);
    this.cockpitGroup.add(leftGrip);
    this.addRiderGlove(0.38, 1.0, 0.64, 1, gloveLeatherMat, gloveAccentMat);

    // Right Throttle Grip & Glove (-X)
    const rightGripGroup = new THREE.Group();
    rightGripGroup.position.set(-0.38, 1.0, 0.64);
    rightGripGroup.rotation.z = -Math.PI / 2 - 0.16;
    rightGripGroup.rotation.y = -0.12;

    this.throttleGrip = new THREE.Mesh(gripGeo, rubberGripMat);
    rightGripGroup.add(this.throttleGrip);
    this.cockpitGroup.add(rightGripGroup);
    this.addRiderGlove(-0.38, 1.0, 0.64, -1, gloveLeatherMat, gloveAccentMat);

    // 5. Front Brake Lever on Right (-X)
    this.brakeLever = new THREE.Group();
    this.brakeLever.position.set(-0.32, 1.02, 0.68);

    const leverGeo = new THREE.CylinderGeometry(0.014, 0.012, 0.22, 8);
    const leverBlade = new THREE.Mesh(leverGeo, polishedAlloyMat);
    leverBlade.rotation.z = -Math.PI / 2 - 0.1;
    leverBlade.position.set(-0.1, 0, 0);
    this.brakeLever.add(leverBlade);

    const ballTip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), polishedAlloyMat);
    ballTip.position.set(-0.21, 0.01, 0);
    this.brakeLever.add(ballTip);
    this.cockpitGroup.add(this.brakeLever);

    // 6. Left Clutch Lever (+X)
    const leftLeverGroup = new THREE.Group();
    leftLeverGroup.position.set(0.32, 1.02, 0.68);
    const leftLeverBlade = new THREE.Mesh(leverGeo, polishedAlloyMat);
    leftLeverBlade.rotation.z = Math.PI / 2 + 0.1;
    leftLeverBlade.position.set(0.1, 0, 0);
    leftLeverGroup.add(leftLeverBlade);
    this.cockpitGroup.add(leftLeverGroup);

    // 7. Master Cylinder Reservoir (Golden DOT4 Fluid Cup)
    const resCupGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.06, 10);
    const resCupMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.2 });
    const resCup = new THREE.Mesh(resCupGeo, resCupMat);
    resCup.position.set(-0.24, 1.11, 0.66);
    this.cockpitGroup.add(resCup);

    const fluidGeo = new THREE.CylinderGeometry(0.034, 0.03, 0.035, 8);
    const fluidMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const fluid = new THREE.Mesh(fluidGeo, fluidMat);
    fluid.position.set(-0.24, 1.1, 0.66);
    this.cockpitGroup.add(fluid);

    // 8. Compact Digital LCD Dashboard (Occupies bottom center)
    const dashHousingGeo = new THREE.BoxGeometry(0.38, 0.2, 0.08);
    const dashHousing = new THREE.Mesh(dashHousingGeo, darkCarbonMat);
    dashHousing.position.set(0, 1.1, 0.78);
    dashHousing.rotation.x = -0.42;
    this.cockpitGroup.add(dashHousing);

    // LCD Screen Plane
    const screenGeo = new THREE.PlaneGeometry(0.34, 0.17);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.dashTexture });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.11, 0.82);
    screenMesh.rotation.x = -0.42;
    this.cockpitGroup.add(screenMesh);

    // 9. Aerodynamic Low Windscreen (Compact bubble, well below rider eye line)
    const windGeo = new THREE.CylinderGeometry(0.32, 0.46, 0.35, 16, 1, true, 0, Math.PI);
    const windscreen = new THREE.Mesh(windGeo, windshieldMat);
    windscreen.rotation.x = Math.PI / 2 + 0.45;
    windscreen.rotation.z = Math.PI;
    windscreen.position.set(0, 1.18, 0.92);
    this.cockpitGroup.add(windscreen);

    // 10. Aerodynamic Side Mirrors
    this.buildMirrors(titaniumMat, darkCarbonMat);
  }

  private addRiderGlove(x: number, y: number, z: number, side: number, leatherMat: THREE.Material, accentMat: THREE.Material): void {
    const gloveGroup = new THREE.Group();
    gloveGroup.position.set(x, y, z);

    // Glove Palm / Fist wrapped around grip
    const fistGeo = new THREE.BoxGeometry(0.09, 0.08, 0.12);
    const fist = new THREE.Mesh(fistGeo, leatherMat);
    fist.rotation.z = side * 0.2;
    gloveGroup.add(fist);

    // Forearm / Sleeve extending back towards camera
    const armGeo = new THREE.BoxGeometry(0.1, 0.09, 0.38);
    const arm = new THREE.Mesh(armGeo, leatherMat);
    arm.position.set(side * 0.08, -0.06, -0.22);
    arm.rotation.set(0.22, -side * 0.18, 0);
    gloveGroup.add(arm);

    // Knuckle Armor Protector (Cyan Racing Accent)
    const knuckleGeo = new THREE.BoxGeometry(0.085, 0.03, 0.06);
    const knuckle = new THREE.Mesh(knuckleGeo, accentMat);
    knuckle.position.set(0, 0.045, 0);
    gloveGroup.add(knuckle);

    this.cockpitGroup.add(gloveGroup);
  }

  private buildMirrors(stalkMat: THREE.Material, podMat: THREE.Material): void {
    const mirrorGlassMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    const createMirror = (xOffset: number, rotY: number) => {
      const podGroup = new THREE.Group();

      const stalkGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.26, 8);
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.rotation.z = (Math.PI / 3) * Math.sign(xOffset);
      stalk.position.set(xOffset * 0.6, 1.14, 0.85);
      podGroup.add(stalk);

      const podGeo = new THREE.BoxGeometry(0.18, 0.1, 0.05);
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(xOffset, 1.2, 0.94);
      pod.rotation.y = rotY;
      podGroup.add(pod);

      const glassGeo = new THREE.PlaneGeometry(0.16, 0.085);
      const glass = new THREE.Mesh(glassGeo, mirrorGlassMat);
      glass.position.set(xOffset, 1.2, 0.91);
      glass.rotation.y = rotY + Math.PI;
      podGroup.add(glass);

      return podGroup;
    };

    // Screen-Left Mirror (+X)
    this.cockpitGroup.add(createMirror(0.52, 0.28));
    // Screen-Right Mirror (-X)
    this.cockpitGroup.add(createMirror(-0.52, -0.28));
  }

  public update(dt: number, throttle: boolean, brake: boolean, left: boolean, right: boolean): void {
    if (this.isCrashed) {
      this.speedKmh = Math.max(0, this.speedKmh - 150 * dt);
      this.cockpitGroup.rotation.z += 4.0 * dt;
      this.cockpitGroup.position.y = Math.max(0.1, this.cockpitGroup.position.y - 1.2 * dt);
      return;
    }

    // 1. Acceleration & Braking
    const accelRate = 52.0;
    const brakeRate = 98.0;
    const naturalDrag = 22.0;

    if (throttle) {
      this.speedKmh = Math.min(this.maxSpeedKmh, this.speedKmh + accelRate * dt);
    } else if (brake) {
      this.speedKmh = Math.max(this.minSpeedKmh, this.speedKmh - brakeRate * dt);
    } else {
      if (this.speedKmh > this.normalSpeedKmh) {
        this.speedKmh = Math.max(this.normalSpeedKmh, this.speedKmh - naturalDrag * dt);
      } else if (this.speedKmh < this.normalSpeedKmh) {
        this.speedKmh = Math.min(this.normalSpeedKmh, this.speedKmh + (accelRate * 0.45) * dt);
      }
    }

    this.speedUnits = this.speedKmh / this.unitsToKmh;
    this.z += this.speedUnits * dt;

    // 2. STEERING CORRECTION (Driver perspective down +Z):
    // Left pressed (A / ←) -> steer towards Screen-Left (+X)
    // Right pressed (D / →) -> steer towards Screen-Right (-X)
    let steerDir = 0;
    if (left) steerDir += 1;
    if (right) steerDir -= 1;

    const steerSpeed = 13.5;
    this.x += steerDir * steerSpeed * dt;

    // Road boundary clamping
    const maxRoadX = ROAD_WIDTH / 2 - 1.0;
    if (this.x > maxRoadX) this.x = maxRoadX;
    if (this.x < -maxRoadX) this.x = -maxRoadX;

    // 3. Realistic Dynamic Lean (banking into turns)
    // When steering left (steerDir > 0), bank to screen-left (rotation.z > 0)
    const maxLean = 0.35; // ~20 degrees
    this.targetLean = steerDir * maxLean;
    this.currentLean += (this.targetLean - this.currentLean) * 11.0 * dt;

    // Pitch: dives forward under brake, squats on gas
    const targetPitch = (brake ? -0.05 : 0) + (throttle ? 0.025 : 0);
    this.pitch += (targetPitch - this.pitch) * 8.0 * dt;

    // 4. Suspension bobbing
    this.bobbingTimer += dt * (this.speedKmh / 14.0);
    this.bobbing = Math.sin(this.bobbingTimer) * 0.012;

    // Apply lean, pitch, and bobbing to cockpit group
    this.cockpitGroup.position.set(0, this.bobbing, 0);
    this.cockpitGroup.rotation.z = this.currentLean;
    this.cockpitGroup.rotation.x = this.pitch;
    this.cockpitGroup.rotation.y = this.currentLean * 0.15;

    // Position player group in world space
    this.mesh.position.set(this.x, 0, this.z);

    // 5. Interactive Handlebar Controls
    if (this.throttleGrip) {
      this.throttleGrip.rotation.x = throttle ? 0.35 : 0;
    }
    if (this.brakeLever) {
      this.brakeLever.rotation.y = brake ? -0.22 : 0;
    }

    // 6. Update Transmission & RPM
    this.updateGears();

    // 7. Render digital LCD dash
    this.renderDashboard();

    // 8. Bounding box
    this.updateBoundingBox();
  }

  private updateGears(): void {
    let gear = 1;
    for (let i = 1; i < this.gearThresholds.length; i++) {
      if (this.speedKmh >= this.gearThresholds[i - 1]) {
        gear = i;
      }
    }
    this.currentGear = gear;

    const low = this.gearThresholds[this.currentGear - 1] || 0;
    const high = this.gearThresholds[this.currentGear] || (low + 35);
    const fraction = (this.speedKmh - low) / (high - low);
    this.currentRpm = Math.min(1.0, Math.max(0.2, 0.2 + fraction * 0.78));
  }

  private renderDashboard(): void {
    const ctx = this.dashCtx;
    const w = this.dashCanvas.width;
    const h = this.dashCanvas.height;

    // LCD Screen Dark Glass Background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Cyan Neon Border
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // 1. Segmented RPM Bar across top
    const numBars = 26;
    const barW = (w - 40) / numBars - 3;
    const filledBars = Math.floor(this.currentRpm * numBars);

    for (let i = 0; i < numBars; i++) {
      const bx = 20 + i * (barW + 3);
      const isRedzone = i >= numBars - 5;
      const isYellowzone = i >= numBars - 10 && !isRedzone;

      if (i < filledBars) {
        ctx.fillStyle = isRedzone ? '#ef4444' : (isYellowzone ? '#f59e0b' : '#00e5ff');
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      }
      ctx.fillRect(bx, 20, barW, 22);
    }

    // 2. Large Digital Speedometer (Center)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 100px "Orbitron", sans-serif';
    ctx.fillText(Math.round(this.speedKmh).toString(), w / 2, h * 0.58);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 24px "Orbitron", sans-serif';
    ctx.fillText('KM / H', w / 2, h * 0.84);

    // 3. Gear Indicator Box (Left side)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(24, 75, 80, 100, 10);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('GEAR', 64, 98);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 54px "Orbitron", sans-serif';
    ctx.fillText(this.currentGear.toString(), 64, 145);

    // 4. Redline Shift Indicator (Right side)
    const isRedline = this.currentRpm > 0.88;
    ctx.fillStyle = isRedline ? (Date.now() % 200 < 100 ? '#ef4444' : '#550011') : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(w - 64, 125, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Orbitron", sans-serif';
    ctx.fillText('SHIFT', w - 64, 125);

    this.dashTexture.needsUpdate = true;
  }

  private updateBoundingBox(): void {
    const halfW = 0.5;
    const halfL = 1.2;
    this.boundingBox.min.set(this.x - halfW, 0, this.z - halfL);
    this.boundingBox.max.set(this.x + halfW, 1.8, this.z + halfL);
  }

  public crash(): void {
    this.isCrashed = true;
  }

  public reset(): void {
    this.x = 0;
    this.z = 0;
    this.speedKmh = this.minSpeedKmh;
    this.speedUnits = this.speedKmh / this.unitsToKmh;
    this.currentLean = 0;
    this.targetLean = 0;
    this.pitch = 0;
    this.isCrashed = false;
    this.mesh.position.set(0, 0, 0);
    this.cockpitGroup.position.set(0, 0, 0);
    this.cockpitGroup.rotation.set(0, 0, 0);
    this.updateBoundingBox();
  }
}
