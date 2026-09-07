export class HUD {
  private container: HTMLElement | null;
  private scoreEl: HTMLElement | null;
  private distEl: HTMLElement | null;
  private speedEl: HTMLElement | null;
  private bestEl: HTMLElement | null;
  private nearMissPopup: HTMLElement | null;
  private nearMissBonus: HTMLElement | null;
  private comboPill: HTMLElement | null;
  private popupTimeout: number | null = null;

  // Speed lines canvas
  private speedLinesCanvas: HTMLCanvasElement | null;
  private speedLinesCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.container = document.getElementById('hud');
    this.scoreEl = document.getElementById('hud-score');
    this.distEl = document.getElementById('hud-distance');
    this.speedEl = document.getElementById('hud-speed');
    this.bestEl = document.getElementById('hud-best');
    this.nearMissPopup = document.getElementById('near-miss-popup');
    this.nearMissBonus = document.getElementById('near-miss-bonus');
    this.comboPill = document.getElementById('combo-pill');

    this.speedLinesCanvas = document.getElementById('speed-lines-canvas') as HTMLCanvasElement;
    this.speedLinesCtx = this.speedLinesCanvas?.getContext('2d') || null;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    if (!this.speedLinesCanvas) return;
    this.speedLinesCanvas.width = window.innerWidth;
    this.speedLinesCanvas.height = window.innerHeight;
  }

  public show(): void {
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.container?.classList.add('hidden');
    this.clearSpeedLines();
  }

  public update(score: number, distanceKm: number, speedKmh: number, bestScore: number, combo: number): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = Math.floor(score).toString().padStart(6, '0');
    }
    if (this.distEl) {
      this.distEl.textContent = `${distanceKm.toFixed(1)} KM`;
    }
    if (this.speedEl) {
      this.speedEl.textContent = `${Math.round(speedKmh)} KM/H`;
    }
    if (this.bestEl) {
      this.bestEl.textContent = Math.floor(bestScore).toString().padStart(6, '0');
    }

    if (this.comboPill) {
      if (combo > 1) {
        this.comboPill.textContent = `COMBO x${combo}`;
        this.comboPill.classList.remove('hidden');
      } else {
        this.comboPill.classList.add('hidden');
      }
    }

    // Render speed lines at high speed
    this.renderSpeedLines(speedKmh);
  }

  public triggerNearMiss(points: number, combo: number): void {
    if (!this.nearMissPopup || !this.nearMissBonus) return;

    this.nearMissBonus.textContent = `+${points} PTS${combo > 1 ? ` (x${combo})` : ''}`;
    this.nearMissPopup.classList.remove('hidden');

    if (this.popupTimeout) clearTimeout(this.popupTimeout);
    this.popupTimeout = window.setTimeout(() => {
      this.nearMissPopup?.classList.add('hidden');
    }, 1200);
  }

  private renderSpeedLines(speedKmh: number): void {
    if (!this.speedLinesCanvas || !this.speedLinesCtx) return;

    if (speedKmh < 140) {
      this.speedLinesCanvas.style.opacity = '0';
      return;
    }

    const intensity = Math.min(1.0, (speedKmh - 140) / 75);
    this.speedLinesCanvas.style.opacity = (intensity * 0.75).toString();

    const ctx = this.speedLinesCtx;
    const w = this.speedLinesCanvas.width;
    const h = this.speedLinesCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.45;
    const numLines = Math.floor(intensity * 20);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2.0;

    for (let i = 0; i < numLines; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r1 = Math.min(w, h) * (0.35 + Math.random() * 0.2);
      const r2 = r1 + 80 + Math.random() * 120;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
  }

  private clearSpeedLines(): void {
    if (this.speedLinesCanvas && this.speedLinesCtx) {
      this.speedLinesCtx.clearRect(0, 0, this.speedLinesCanvas.width, this.speedLinesCanvas.height);
      this.speedLinesCanvas.style.opacity = '0';
    }
  }
}
