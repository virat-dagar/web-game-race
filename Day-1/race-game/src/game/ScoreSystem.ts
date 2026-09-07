export class ScoreSystem {
  public score = 0;
  public bestScore = 0;
  public distanceKm = 0;
  public nearMisses = 0;
  public vehiclesOvertaken = 0;
  public combo = 1;

  private comboTimer = 0;
  private readonly comboDuration = 4.0; // 4 seconds to chain combos
  private readonly storageKey = 'road_rush_best_score';

  constructor() {
    this.loadBestScore();
  }

  private loadBestScore(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.bestScore = parseInt(saved, 10) || 0;
      }
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
  }

  private saveBestScore(): void {
    try {
      localStorage.setItem(this.storageKey, this.bestScore.toString());
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  public update(dt: number, speedKmh: number, playerZ: number): void {
    // Distance in km (1 game unit ≈ 1 meter)
    this.distanceKm = Math.max(0, playerZ / 1000.0);

    // Continuous score from speed (higher speed yields faster accumulation)
    const baseSpeedScore = (speedKmh / 3.6) * 1.5; // pts per second
    this.score += Math.floor(baseSpeedScore * this.combo * dt);

    // Combo countdown
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }
  }

  public triggerNearMiss(): { points: number; combo: number } {
    this.nearMisses++;
    this.combo = Math.min(8, this.combo + 1);
    this.comboTimer = this.comboDuration;

    const points = 250 * this.combo;
    this.score += points;

    return { points, combo: this.combo };
  }

  public addOvertakes(count: number): void {
    this.vehiclesOvertaken += count;
    this.score += count * 50;
  }

  public finalize(): {
    isNewBest: boolean;
    finalScore: number;
    finalDistance: number;
    bestScore: number;
    nearMisses: number;
    overtaken: number;
  } {
    let isNewBest = false;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();
      isNewBest = true;
    }

    return {
      isNewBest,
      finalScore: this.score,
      finalDistance: this.distanceKm,
      bestScore: this.bestScore,
      nearMisses: this.nearMisses,
      overtaken: this.vehiclesOvertaken
    };
  }

  public reset(): void {
    this.score = 0;
    this.distanceKm = 0;
    this.nearMisses = 0;
    this.vehiclesOvertaken = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.loadBestScore();
  }
}
