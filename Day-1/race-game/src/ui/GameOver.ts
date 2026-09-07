export interface GameOverStats {
  finalScore: number;
  finalDistance: number;
  bestScore: number;
  nearMisses: number;
  overtaken: number;
  isNewBest: boolean;
}

export class GameOver {
  private container: HTMLElement | null;
  private newBestBadge: HTMLElement | null;
  private finalScoreEl: HTMLElement | null;
  private finalDistEl: HTMLElement | null;
  private finalBestEl: HTMLElement | null;
  private finalNearMissEl: HTMLElement | null;
  private finalOvertakenEl: HTMLElement | null;

  private onRideAgainCallback: (() => void) | null = null;
  private onMenuCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('game-over-modal');
    this.newBestBadge = document.getElementById('new-best-badge');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalDistEl = document.getElementById('final-distance');
    this.finalBestEl = document.getElementById('final-best');
    this.finalNearMissEl = document.getElementById('final-near-misses');
    this.finalOvertakenEl = document.getElementById('final-overtaken');

    document.getElementById('btn-ride-again')?.addEventListener('click', () => {
      this.onRideAgainCallback?.();
    });

    document.getElementById('btn-menu-gameover')?.addEventListener('click', () => {
      this.onMenuCallback?.();
    });
  }

  public setOnRideAgain(callback: () => void): void {
    this.onRideAgainCallback = callback;
  }

  public setOnMenu(callback: () => void): void {
    this.onMenuCallback = callback;
  }

  public show(stats: GameOverStats): void {
    if (this.finalScoreEl) this.finalScoreEl.textContent = Math.floor(stats.finalScore).toLocaleString();
    if (this.finalDistEl) this.finalDistEl.textContent = `${stats.finalDistance.toFixed(1)} KM`;
    if (this.finalBestEl) this.finalBestEl.textContent = Math.floor(stats.bestScore).toLocaleString();
    if (this.finalNearMissEl) this.finalNearMissEl.textContent = stats.nearMisses.toString();
    if (this.finalOvertakenEl) this.finalOvertakenEl.textContent = stats.overtaken.toString();

    if (this.newBestBadge) {
      if (stats.isNewBest) {
        this.newBestBadge.classList.remove('hidden');
      } else {
        this.newBestBadge.classList.add('hidden');
      }
    }

    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.container?.classList.add('hidden');
  }
}
