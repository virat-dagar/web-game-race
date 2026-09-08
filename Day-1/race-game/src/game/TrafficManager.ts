import * as THREE from 'three';
import { LANE_WIDTH, LANES_COUNT } from '../world/RoadSegment.ts';

export type VehicleType = 'sedan' | 'suv' | 'van' | 'truck';

export interface TrafficVehicle {
  mesh: THREE.Group;
  type: VehicleType;
  lane: number;
  targetLane: number;
  x: number;
  z: number;
  speedKmh: number;
  length: number;
  width: number;
  height: number;
  boundingBox: THREE.Box3;
  isChangingLane: boolean;
  laneChangeTimer: number;
  blinkerTimer: number;
  blinkerActive: boolean;
  leftBlinkerMesh: THREE.Mesh | null;
  rightBlinkerMesh: THREE.Mesh | null;
  nearMissTriggered: boolean;
  overtaken: boolean;
}

export class TrafficManager {
  private scene: THREE.Scene;
  public vehicles: TrafficVehicle[] = [];
  private readonly maxVehicles = 16;
  private readonly laneOffsets: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Driver perspective looking down +Z:
    // Lane 0 (leftmost): +5.7 (+X)
    // Lane 1: +1.9
    // Lane 2: -1.9
    // Lane 3 (rightmost): -5.7 (-X)
    for (let i = 0; i < LANES_COUNT; i++) {
      const x = ((LANES_COUNT - 1) * LANE_WIDTH) / 2 - i * LANE_WIDTH;
      this.laneOffsets.push(x);
    }

    this.initPool();
  }

  private initPool(): void {
    const types: VehicleType[] = ['sedan', 'suv', 'van', 'truck', 'sedan', 'suv'];

    for (let i = 0; i < this.maxVehicles; i++) {
      const type = types[i % types.length];
      const vehicle = this.createRealisticVehicle(type);
      this.vehicles.push(vehicle);
      this.scene.add(vehicle.mesh);
    }

    this.reset();
  }

  private createRealisticVehicle(type: VehicleType): TrafficVehicle {
    const group = new THREE.Group();

    let width = 2.0;
    let height = 1.45;
    let length = 4.4;
    let baseSpeedKmh = 92;

    // Automotive color palette (Metallic deep hues)
    const realisticColors = [
      0x1e293b, // Deep Charcoal Metallic
      0x0284c7, // Sapphire Blue Metallic
      0xb91c1c, // Crimson Pearl
      0x475569, // Slate Grey
      0x0f172a, // Obsidian Black
      0xf1f5f9, // Pearl White
      0x854d0e  // Bronze Metallic
    ];
    const carColor = realisticColors[Math.floor(Math.random() * realisticColors.length)];

    const paintMat = new THREE.MeshStandardMaterial({
      color: carColor,
      roughness: 0.28,
      metalness: 0.65
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x090b10,
      roughness: 0.85,
      metalness: 0.1
    });

    const darkTintGlassMat = new THREE.MeshStandardMaterial({
      color: 0x050914,
      roughness: 0.08,
      metalness: 0.92
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95
    });

    const redLedMat = new THREE.MeshBasicMaterial({ color: 0xff002b });
    const amberBlinkerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });

    let leftBlinkerMesh: THREE.Mesh | null = null;
    let rightBlinkerMesh: THREE.Mesh | null = null;

    if (type === 'truck') {
      width = 2.5;
      height = 3.4;
      length = 10.2;
      baseSpeedKmh = 66;

      // 1. Semi-Tractor Unit
      const cabH = 2.4;
      const cabL = 2.8;
      const cabGeo = new THREE.BoxGeometry(width * 0.95, cabH, cabL);
      const cab = new THREE.Mesh(cabGeo, paintMat);
      cab.position.set(0, cabH / 2 + 0.35, 3.4);
      cab.castShadow = true;
      group.add(cab);

      // Cab Windshield & Windows
      const cabGlassGeo = new THREE.BoxGeometry(width * 0.96, 0.9, 1.4);
      const cabGlass = new THREE.Mesh(cabGlassGeo, darkTintGlassMat);
      cabGlass.position.set(0, cabH * 0.75 + 0.35, 3.8);
      group.add(cabGlass);

      // Dual Chrome Vertical Exhaust Stacks
      const stackGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
      const leftStack = new THREE.Mesh(stackGeo, chromeMat);
      leftStack.position.set(width * 0.44, 2.2, 2.2);
      group.add(leftStack);

      const rightStack = new THREE.Mesh(stackGeo, chromeMat);
      rightStack.position.set(-width * 0.44, 2.2, 2.2);
      group.add(rightStack);

      // 2. Corrugated Cargo Container Trailer
      const trailerL = 7.4;
      const trailerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.4 });
      const trailerGeo = new THREE.BoxGeometry(width, height - 0.4, trailerL);
      const trailer = new THREE.Mesh(trailerGeo, trailerMat);
      trailer.position.set(0, height / 2 + 0.3, -1.3);
      trailer.castShadow = true;
      group.add(trailer);

      // Corrugation Rib Lines on Container
      const ribGeo = new THREE.BoxGeometry(width + 0.04, height - 0.45, 0.06);
      for (let z = -trailerL / 2 + 0.6; z < trailerL / 2; z += 0.8) {
        const rib = new THREE.Mesh(ribGeo, trimMat);
        rib.position.set(0, height / 2 + 0.3, -1.3 + z);
        group.add(rib);
      }

      // Rear Underride Bar & Mud Flaps
      const barGeo = new THREE.BoxGeometry(width * 0.9, 0.12, 0.1);
      const bar = new THREE.Mesh(barGeo, chromeMat);
      bar.position.set(0, 0.4, -length / 2 - 0.05);
      group.add(bar);

      // Rear Lights
      const tailW = 0.45;
      const tailGeo = new THREE.BoxGeometry(tailW, 0.16, 0.08);

      // Screen-Left Tail (+X)
      const lTail = new THREE.Mesh(tailGeo, redLedMat);
      lTail.position.set(width * 0.35, 0.5, -length / 2 - 0.06);
      group.add(lTail);

      // Screen-Right Tail (-X)
      const rTail = new THREE.Mesh(tailGeo, redLedMat);
      rTail.position.set(-width * 0.35, 0.5, -length / 2 - 0.06);
      group.add(rTail);

      // Blinkers
      const blinkGeo = new THREE.BoxGeometry(0.24, 0.14, 0.08);
      leftBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      leftBlinkerMesh.position.set(width * 0.35, 0.68, -length / 2 - 0.06);
      leftBlinkerMesh.visible = false;
      group.add(leftBlinkerMesh);

      rightBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      rightBlinkerMesh.position.set(-width * 0.35, 0.68, -length / 2 - 0.06);
      rightBlinkerMesh.visible = false;
      group.add(rightBlinkerMesh);

    } else if (type === 'suv') {
      width = 2.1;
      height = 1.75;
      length = 4.8;
      baseSpeedKmh = 86;

      // Lower Chassis with Plastic Trim
      const lowerGeo = new THREE.BoxGeometry(width, 0.3, length);
      const lower = new THREE.Mesh(lowerGeo, trimMat);
      lower.position.set(0, 0.4, 0);
      group.add(lower);

      // Main Sculpted Body
      const bodyGeo = new THREE.BoxGeometry(width * 0.98, 0.75, length * 0.96);
      const body = new THREE.Mesh(bodyGeo, paintMat);
      body.position.set(0, 0.85, 0);
      body.castShadow = true;
      group.add(body);

      // Tapered Greenhouse Cabin
      const cabinGeo = new THREE.BoxGeometry(width * 0.86, 0.75, length * 0.62);
      const cabin = new THREE.Mesh(cabinGeo, darkTintGlassMat);
      cabin.position.set(0, 1.48, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Silver Roof Rails
      const railGeo = new THREE.CylinderGeometry(0.02, 0.02, length * 0.55, 6);
      const leftRail = new THREE.Mesh(railGeo, chromeMat);
      leftRail.rotation.x = Math.PI / 2;
      leftRail.position.set(width * 0.38, 1.88, -0.2);
      group.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, chromeMat);
      rightRail.rotation.x = Math.PI / 2;
      rightRail.position.set(-width * 0.38, 1.88, -0.2);
      group.add(rightRail);

      // Rear Taillight Clusters
      const tailW = width * 0.22;
      const tailGeo = new THREE.BoxGeometry(tailW, 0.16, 0.08);

      const lTail = new THREE.Mesh(tailGeo, redLedMat);
      lTail.position.set(width * 0.36, 0.95, -length / 2 - 0.02);
      group.add(lTail);

      const rTail = new THREE.Mesh(tailGeo, redLedMat);
      rTail.position.set(-width * 0.36, 0.95, -length / 2 - 0.02);
      group.add(rTail);

      // Blinkers
      const blinkGeo = new THREE.BoxGeometry(tailW * 0.6, 0.12, 0.08);
      leftBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      leftBlinkerMesh.position.set(width * 0.36, 1.12, -length / 2 - 0.02);
      leftBlinkerMesh.visible = false;
      group.add(leftBlinkerMesh);

      rightBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      rightBlinkerMesh.position.set(-width * 0.36, 1.12, -length / 2 - 0.02);
      rightBlinkerMesh.visible = false;
      group.add(rightBlinkerMesh);

    } else if (type === 'van') {
      width = 2.15;
      height = 2.25;
      length = 5.4;
      baseSpeedKmh = 80;

      const bodyGeo = new THREE.BoxGeometry(width, height - 0.5, length);
      const body = new THREE.Mesh(bodyGeo, paintMat);
      body.position.set(0, height / 2 + 0.15, 0);
      body.castShadow = true;
      group.add(body);

      // Front Windshield & Side Windows
      const cabinGeo = new THREE.BoxGeometry(width * 0.98, 0.8, 1.8);
      const cabin = new THREE.Mesh(cabinGeo, darkTintGlassMat);
      cabin.position.set(0, 1.55, 1.5);
      group.add(cabin);

      // Rear Door Split Line
      const splitGeo = new THREE.BoxGeometry(0.04, height - 0.6, 0.04);
      const split = new THREE.Mesh(splitGeo, trimMat);
      split.position.set(0, height / 2 + 0.15, -length / 2 - 0.02);
      group.add(split);

      // Vertical Rear Tail Lights
      const tailGeo = new THREE.BoxGeometry(0.18, 0.6, 0.08);
      const lTail = new THREE.Mesh(tailGeo, redLedMat);
      lTail.position.set(width * 0.42, 1.2, -length / 2 - 0.02);
      group.add(lTail);

      const rTail = new THREE.Mesh(tailGeo, redLedMat);
      rTail.position.set(-width * 0.42, 1.2, -length / 2 - 0.02);
      group.add(rTail);

      // Blinkers
      const blinkGeo = new THREE.BoxGeometry(0.18, 0.2, 0.09);
      leftBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      leftBlinkerMesh.position.set(width * 0.42, 1.62, -length / 2 - 0.02);
      leftBlinkerMesh.visible = false;
      group.add(leftBlinkerMesh);

      rightBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      rightBlinkerMesh.position.set(-width * 0.42, 1.62, -length / 2 - 0.02);
      rightBlinkerMesh.visible = false;
      group.add(rightBlinkerMesh);

    } else {
      // Sleek Executive Sedan
      width = 2.0;
      height = 1.4;
      length = 4.6;
      baseSpeedKmh = 96;

      // Lower Chassis & Bumpers
      const bodyGeo = new THREE.BoxGeometry(width, 0.6, length);
      const body = new THREE.Mesh(bodyGeo, paintMat);
      body.position.set(0, 0.58, 0);
      body.castShadow = true;
      group.add(body);

      // Aerodynamic Curved Greenhouse (Cabin)
      const cabinGeo = new THREE.BoxGeometry(width * 0.85, 0.62, length * 0.54);
      const cabin = new THREE.Mesh(cabinGeo, darkTintGlassMat);
      cabin.position.set(0, 1.15, -0.15);
      cabin.castShadow = true;
      group.add(cabin);

      // Front Hood Scoop & Chrome Grille
      const grilleGeo = new THREE.BoxGeometry(width * 0.6, 0.2, 0.1);
      const grille = new THREE.Mesh(grilleGeo, chromeMat);
      grille.position.set(0, 0.55, length / 2 + 0.02);
      group.add(grille);

      // Dual Headlights
      const headGeo = new THREE.BoxGeometry(0.35, 0.14, 0.08);
      const lHead = new THREE.Mesh(headGeo, headlightMat);
      lHead.position.set(width * 0.35, 0.62, length / 2 + 0.02);
      group.add(lHead);

      const rHead = new THREE.Mesh(headGeo, headlightMat);
      rHead.position.set(-width * 0.35, 0.62, length / 2 + 0.02);
      group.add(rHead);

      // Rear Full-Width LED Taillight Bar
      const tailW = width * 0.28;
      const tailGeo = new THREE.BoxGeometry(tailW, 0.12, 0.08);

      const lTail = new THREE.Mesh(tailGeo, redLedMat);
      lTail.position.set(width * 0.32, 0.72, -length / 2 - 0.02);
      group.add(lTail);

      const rTail = new THREE.Mesh(tailGeo, redLedMat);
      rTail.position.set(-width * 0.32, 0.72, -length / 2 - 0.02);
      group.add(rTail);

      // Blinkers
      const blinkGeo = new THREE.BoxGeometry(tailW * 0.6, 0.1, 0.09);
      leftBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      leftBlinkerMesh.position.set(width * 0.32, 0.85, -length / 2 - 0.02);
      leftBlinkerMesh.visible = false;
      group.add(leftBlinkerMesh);

      rightBlinkerMesh = new THREE.Mesh(blinkGeo, amberBlinkerMat);
      rightBlinkerMesh.position.set(-width * 0.32, 0.85, -length / 2 - 0.02);
      rightBlinkerMesh.visible = false;
      group.add(rightBlinkerMesh);

      // Dual Chrome Exhaust Tips
      const exhGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.15, 8);
      const lExh = new THREE.Mesh(exhGeo, chromeMat);
      lExh.rotation.x = Math.PI / 2;
      lExh.position.set(width * 0.3, 0.32, -length / 2 - 0.06);
      group.add(lExh);

      const rExh = new THREE.Mesh(exhGeo, chromeMat);
      rExh.rotation.x = Math.PI / 2;
      rExh.position.set(-width * 0.3, 0.32, -length / 2 - 0.06);
      group.add(rExh);
    }

    // Realistic Alloy Wheels with Rubber Tires
    const wheelRadius = 0.38;
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.9 });
    const alloyRimMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.2 });

    const createAlloyWheel = () => {
      const wGroup = new THREE.Group();
      // Rubber Tire
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.26, 14);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      // Alloy Rim Hub
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, 0.27, 10);
      const rim = new THREE.Mesh(rimGeo, alloyRimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      return wGroup;
    };

    const wheelPositions = [
      [width / 2 + 0.02, wheelRadius, length / 2 - 0.9],
      [-width / 2 - 0.02, wheelRadius, length / 2 - 0.9],
      [width / 2 + 0.02, wheelRadius, -length / 2 + 0.9],
      [-width / 2 - 0.02, wheelRadius, -length / 2 + 0.9]
    ];

    for (const pos of wheelPositions) {
      const wheel = createAlloyWheel();
      wheel.position.set(pos[0], pos[1], pos[2]);
      group.add(wheel);
    }

    return {
      mesh: group,
      type,
      lane: 1,
      targetLane: 1,
      x: 0,
      z: 0,
      speedKmh: baseSpeedKmh,
      length,
      width,
      height,
      boundingBox: new THREE.Box3(),
      isChangingLane: false,
      laneChangeTimer: 4 + Math.random() * 8,
      blinkerTimer: 0,
      blinkerActive: false,
      leftBlinkerMesh,
      rightBlinkerMesh,
      nearMissTriggered: false,
      overtaken: false
    };
  }

  public update(dt: number, playerZ: number): void {
    const unitsToKmh = 4.0;

    for (const v of this.vehicles) {
      const speedUnits = v.speedKmh / unitsToKmh;
      v.z += speedUnits * dt;

      v.laneChangeTimer -= dt;
      if (v.laneChangeTimer <= 0 && !v.isChangingLane) {
        this.attemptLaneChange(v);
      }

      if (v.isChangingLane) {
        const targetX = this.laneOffsets[v.targetLane];
        const moveSpeed = 4.2 * dt;

        if (Math.abs(v.x - targetX) > moveSpeed) {
          v.x += Math.sign(targetX - v.x) * moveSpeed;
          v.blinkerTimer += dt;
          v.blinkerActive = Math.floor(v.blinkerTimer * 5) % 2 === 0;

          // Note: Looking down +Z, targetLane < v.lane moves to more positive X (screen-left)
          // targetLane > v.lane moves to more negative X (screen-right)
          if (v.targetLane < v.lane && v.leftBlinkerMesh) {
            v.leftBlinkerMesh.visible = v.blinkerActive;
          } else if (v.targetLane > v.lane && v.rightBlinkerMesh) {
            v.rightBlinkerMesh.visible = v.blinkerActive;
          }
        } else {
          v.x = targetX;
          v.lane = v.targetLane;
          v.isChangingLane = false;
          v.laneChangeTimer = 5 + Math.random() * 10;
          if (v.leftBlinkerMesh) v.leftBlinkerMesh.visible = false;
          if (v.rightBlinkerMesh) v.rightBlinkerMesh.visible = false;
        }
      }

      v.mesh.position.set(v.x, 0, v.z);

      const halfW = v.width / 2;
      const halfL = v.length / 2;
      v.boundingBox.min.set(v.x - halfW, 0, v.z - halfL);
      v.boundingBox.max.set(v.x + halfW, v.height, v.z + halfL);

      if (v.z < playerZ - 35) {
        this.respawnAhead(v, playerZ);
      }
    }
  }

  private attemptLaneChange(v: TrafficVehicle): void {
    const choices: number[] = [];
    if (v.lane > 0) choices.push(v.lane - 1);
    if (v.lane < LANES_COUNT - 1) choices.push(v.lane + 1);

    if (choices.length === 0) return;
    const target = choices[Math.floor(Math.random() * choices.length)];

    const isOccupied = this.vehicles.some(
      other => other !== v && other.lane === target && Math.abs(other.z - v.z) < 18
    );

    if (!isOccupied) {
      v.targetLane = target;
      v.isChangingLane = true;
      v.blinkerTimer = 0;
    } else {
      v.laneChangeTimer = 3.0;
    }
  }

  private respawnAhead(v: TrafficVehicle, playerZ: number): void {
    let furthestZ = playerZ + 120;
    for (const other of this.vehicles) {
      if (other !== v && other.z > furthestZ) {
        furthestZ = other.z;
      }
    }

    const availableLanes = [0, 1, 2, 3];
    const newLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

    v.lane = newLane;
    v.targetLane = newLane;
    v.x = this.laneOffsets[newLane];
    v.z = furthestZ + 25 + Math.random() * 35;
    v.isChangingLane = false;
    v.nearMissTriggered = false;
    v.overtaken = false;
    if (v.leftBlinkerMesh) v.leftBlinkerMesh.visible = false;
    if (v.rightBlinkerMesh) v.rightBlinkerMesh.visible = false;

    const variance = (Math.random() - 0.5) * 14;
    if (v.type === 'truck') v.speedKmh = 66 + variance;
    else if (v.type === 'van') v.speedKmh = 80 + variance;
    else if (v.type === 'suv') v.speedKmh = 86 + variance;
    else v.speedKmh = 96 + variance;
  }

  public reset(): void {
    let currentZ = 65;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const lane = i % LANES_COUNT;
      v.lane = lane;
      v.targetLane = lane;
      v.x = this.laneOffsets[lane];
      v.z = currentZ;
      v.isChangingLane = false;
      v.nearMissTriggered = false;
      v.overtaken = false;
      if (v.leftBlinkerMesh) v.leftBlinkerMesh.visible = false;
      if (v.rightBlinkerMesh) v.rightBlinkerMesh.visible = false;

      currentZ += 28 + Math.random() * 20;
    }
  }
}
