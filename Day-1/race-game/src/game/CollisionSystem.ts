import { Player } from './Player.ts';
import { TrafficManager, TrafficVehicle } from './TrafficManager.ts';
import { ROAD_WIDTH } from '../world/RoadSegment.ts';

export interface CollisionResult {
  hasCollided: boolean;
  nearMissVehicle: TrafficVehicle | null;
  overtakenCount: number;
}

export class CollisionSystem {
  private player: Player;
  private traffic: TrafficManager;

  constructor(player: Player, traffic: TrafficManager) {
    this.player = player;
    this.traffic = traffic;
  }

  public check(): CollisionResult {
    const result: CollisionResult = {
      hasCollided: false,
      nearMissVehicle: null,
      overtakenCount: 0
    };

    if (this.player.isCrashed) return result;

    const playerBox = this.player.boundingBox;
    const playerZ = this.player.z;
    const playerX = this.player.x;
    const playerSpeed = this.player.speedKmh;

    // 1. Guardrail / Road Boundary Collision
    const maxRoadBoundary = ROAD_WIDTH / 2 - 0.5;
    if (Math.abs(playerX) >= maxRoadBoundary) {
      result.hasCollided = true;
      return result;
    }

    // 2. Traffic Vehicles Collision & Near-Miss Checks
    for (const v of this.traffic.vehicles) {
      // Check full bounding box intersection for crash
      if (playerBox.intersectsBox(v.boundingBox)) {
        result.hasCollided = true;
        return result;
      }

      // Check for vehicle overtake count
      if (!v.overtaken && playerZ > v.z + v.length / 2) {
        v.overtaken = true;
        result.overtakenCount++;
      }

      // Check for Close Overtake (Near-Miss)
      // Conditions:
      // - Player speed >= 100 km/h
      // - Overlap in longitudinal direction (adjacent to vehicle)
      // - Close lateral proximity (within 1.2 units of vehicle boundary)
      // - Not previously triggered for this vehicle pass
      if (!v.nearMissTriggered && playerSpeed >= 100) {
        const dz = Math.abs(playerZ - v.z);
        const halfL = v.length / 2 + 1.4;
        const halfW = v.width / 2;
        const dx = Math.abs(playerX - v.x);

        if (dz < halfL && dx < halfW + 1.25 && dx > halfW + 0.35) {
          v.nearMissTriggered = true;
          result.nearMissVehicle = v;
        }
      }
    }

    return result;
  }
}
