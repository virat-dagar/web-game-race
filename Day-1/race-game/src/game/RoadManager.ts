import * as THREE from 'three';
import { RoadSegment, SEGMENT_LENGTH } from '../world/RoadSegment.ts';

export class RoadManager {
  private scene: THREE.Scene;
  private segments: RoadSegment[] = [];
  private numSegments = 7; // 700 units of continuous road view

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSegments();
  }

  private initSegments(): void {
    for (let i = 0; i < this.numSegments; i++) {
      const segment = new RoadSegment();
      const zPos = (i - 1) * SEGMENT_LENGTH; // Start one segment behind the origin
      segment.setPosition(zPos);
      this.segments.push(segment);
      this.scene.add(segment.group);
    }
  }

  public update(playerZ: number): void {
    // Sort segments along the z-axis
    this.segments.sort((a, b) => a.getPositionZ() - b.getPositionZ());

    // Check if the rearmost segment is now far behind the player
    const rearmost = this.segments[0];
    if (rearmost.getPositionZ() < playerZ - SEGMENT_LENGTH * 1.5) {
      // Reposition it to the very front of the chain
      const foremost = this.segments[this.segments.length - 1];
      rearmost.setPosition(foremost.getPositionZ() + SEGMENT_LENGTH);
    }
  }

  public reset(): void {
    for (let i = 0; i < this.numSegments; i++) {
      const zPos = (i - 1) * SEGMENT_LENGTH;
      this.segments[i].setPosition(zPos);
    }
  }
}
