import * as THREE from 'three';

export const ROAD_WIDTH = 16.0;
export const LANE_WIDTH = 3.8;
export const LANES_COUNT = 4;
export const SEGMENT_LENGTH = 100.0;

// Helper to generate a realistic procedural asphalt texture with lane wear & markings
function createRealisticRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark asphalt base with aggregate texture
  ctx.fillStyle = '#141720';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Aggregate noise grain
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain + 2)); // slight cool tone
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Realistic darker tire-wear tracks down the 4 lanes
  ctx.fillStyle = 'rgba(10, 12, 16, 0.4)';
  const lanePx = canvas.width / 4;
  for (let lane = 0; lane < 4; lane++) {
    const center = lane * lanePx + lanePx / 2;
    // Left wheel track
    ctx.fillRect(center - lanePx * 0.28, 0, lanePx * 0.2, canvas.height);
    // Right wheel track
    ctx.fillRect(center + lanePx * 0.08, 0, lanePx * 0.2, canvas.height);
  }

  // 3. Outer solid yellow shoulder lines
  ctx.fillStyle = '#fbbf24';
  const yellowW = 12;
  ctx.fillRect(18, 0, yellowW, canvas.height);
  ctx.fillRect(canvas.width - 18 - yellowW, 0, yellowW, canvas.height);

  // 4. White dashed lane dividers between the 4 lanes
  ctx.fillStyle = '#f8fafc';
  const dashW = 10;
  const dashLen = 100;
  const dashGap = 150;
  const totalDash = dashLen + dashGap;

  for (let divider = 1; divider < 4; divider++) {
    const divX = divider * lanePx - dashW / 2;
    for (let y = 0; y < canvas.height; y += totalDash) {
      ctx.fillRect(divX, y, dashW, dashLen);
    }
  }

  // 5. Red and white alternating rumble strips on outer shoulders
  const rumbleW = 16;
  const curbStep = 64;
  for (let y = 0; y < canvas.height; y += curbStep) {
    const isRed = Math.floor(y / curbStep) % 2 === 0;
    ctx.fillStyle = isRed ? '#dc2626' : '#ffffff';
    ctx.fillRect(0, y, rumbleW, curbStep);
    ctx.fillRect(canvas.width - rumbleW, y, rumbleW, curbStep);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

// Procedural grass texture
function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1b3b1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 35;
    data[i] = Math.max(0, Math.min(255, data[i] + n * 0.5));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.4));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

const roadTexture = createRealisticRoadTexture();
const grassTexture = createGrassTexture();

// Realistic PBR materials
const asphaltMat = new THREE.MeshStandardMaterial({
  map: roadTexture,
  roughness: 0.65,
  metalness: 0.12
});

const groundMat = new THREE.MeshStandardMaterial({
  map: grassTexture,
  roughness: 0.95,
  metalness: 0.05
});

const metalGuardrailMat = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.35,
  metalness: 0.85
});

const streetlightPoleMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.5,
  metalness: 0.7
});

const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });

export class RoadSegment {
  public group: THREE.Group;
  public length: number = SEGMENT_LENGTH;

  constructor() {
    this.group = new THREE.Group();
    this.buildSegment();
  }

  private buildSegment(): void {
    // 1. Asphalt Road Surface with textured markings
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.group.add(road);

    // 2. Roadside Grass Terrain (Left & Right)
    // Remember: looking forward down +Z, +X is screen left, -X is screen right
    const terrainWidth = 140.0;
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, SEGMENT_LENGTH);

    // Screen-Left Grass (+X)
    const leftTerrain = new THREE.Mesh(terrainGeo, groundMat);
    leftTerrain.rotation.x = -Math.PI / 2;
    leftTerrain.position.x = ROAD_WIDTH / 2 + terrainWidth / 2;
    leftTerrain.position.y = -0.05;
    leftTerrain.receiveShadow = true;
    this.group.add(leftTerrain);

    // Screen-Right Grass (-X)
    const rightTerrain = new THREE.Mesh(terrainGeo, groundMat);
    rightTerrain.rotation.x = -Math.PI / 2;
    rightTerrain.position.x = -(ROAD_WIDTH / 2 + terrainWidth / 2);
    rightTerrain.position.y = -0.05;
    rightTerrain.receiveShadow = true;
    this.group.add(rightTerrain);

    // 3. Metal Corrugated Guardrails
    this.buildGuardrails();

    // 4. Streetlights and Roadside Foliage
    this.buildRoadsideProps();
  }

  private buildGuardrails(): void {
    const railGeo = new THREE.BoxGeometry(0.22, 0.45, SEGMENT_LENGTH);

    // Screen-Left Guardrail (+X)
    const leftRail = new THREE.Mesh(railGeo, metalGuardrailMat);
    leftRail.position.set(ROAD_WIDTH / 2 + 0.25, 0.55, 0);
    leftRail.castShadow = true;
    this.group.add(leftRail);

    // Screen-Right Guardrail (-X)
    const rightRail = new THREE.Mesh(railGeo, metalGuardrailMat);
    rightRail.position.set(-(ROAD_WIDTH / 2 + 0.25), 0.55, 0);
    rightRail.castShadow = true;
    this.group.add(rightRail);

    // Vertical Support Posts
    const postGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    for (let z = -SEGMENT_LENGTH / 2; z <= SEGMENT_LENGTH / 2; z += 12) {
      const leftPost = new THREE.Mesh(postGeo, metalGuardrailMat);
      leftPost.position.set(ROAD_WIDTH / 2 + 0.25, 0.32, z);
      this.group.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, metalGuardrailMat);
      rightPost.position.set(-(ROAD_WIDTH / 2 + 0.25), 0.32, z);
      this.group.add(rightPost);
    }
  }

  private buildRoadsideProps(): void {
    // Streetlights on Screen-Right side (-X)
    for (let z = -SEGMENT_LENGTH / 4; z <= SEGMENT_LENGTH / 4; z += 50) {
      this.addStreetlight(-(ROAD_WIDTH / 2 + 2.5), z);
    }

    // Roadside trees / foliage on both flanks
    for (let z = -SEGMENT_LENGTH / 2 + 10; z < SEGMENT_LENGTH / 2; z += 25) {
      // Screen-Left tree (+X)
      const leftX = ROAD_WIDTH / 2 + 6 + Math.random() * 8;
      this.addTree(leftX, z + (Math.random() - 0.5) * 6);

      // Screen-Right tree (-X)
      const rightX = -(ROAD_WIDTH / 2 + 8 + Math.random() * 8);
      this.addTree(rightX, z + 12 + (Math.random() - 0.5) * 6);
    }
  }

  private addStreetlight(x: number, z: number): void {
    const poleHeight = 7.5;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, poleHeight, 8);
    const pole = new THREE.Mesh(poleGeo, streetlightPoleMat);
    pole.position.set(x, poleHeight / 2, z);
    pole.castShadow = true;
    this.group.add(pole);

    // Arm extending over highway (towards road center)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8);
    const arm = new THREE.Mesh(armGeo, streetlightPoleMat);
    arm.rotation.z = -Math.PI / 3;
    arm.position.set(x + 1.2, poleHeight + 0.4, z);
    this.group.add(arm);

    const lampGeo = new THREE.BoxGeometry(0.8, 0.2, 0.4);
    const lamp = new THREE.Mesh(lampGeo, lampGlowMat);
    lamp.position.set(x + 2.4, poleHeight + 1.1, z);
    this.group.add(lamp);
  }

  private addTree(x: number, z: number): void {
    const treeGroup = new THREE.Group();

    // Trunk
    const trunkH = 2.2;
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    treeGroup.add(trunk);

    // Foliage Cones
    const foliageTiers = [
      { r: 2.2, h: 3.2, y: 3.0 },
      { r: 1.6, h: 2.6, y: 4.8 },
      { r: 1.0, h: 2.0, y: 6.2 }
    ];

    for (const tier of foliageTiers) {
      const coneGeo = new THREE.ConeGeometry(tier.r, tier.h, 6);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = tier.y;
      cone.castShadow = true;
      treeGroup.add(cone);
    }

    treeGroup.position.set(x, 0, z);
    this.group.add(treeGroup);
  }

  public setPosition(z: number): void {
    this.group.position.z = z;
  }

  public getPositionZ(): number {
    return this.group.position.z;
  }
}
