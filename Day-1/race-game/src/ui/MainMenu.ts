export class MainMenu {
  private container: HTMLElement | null;
  private bestScoreEl: HTMLElement | null;
  private onStartCallback: (() => void) | null = null;
  private onControlsCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('main-menu');
    this.bestScoreEl = document.getElementById('menu-best-score');

    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.onStartCallback?.();
    });

    document.getElementById('btn-controls')?.addEventListener('click', () => {
      this.onControlsCallback?.();
    });
  }

  public setOnStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  public setOnControls(callback: () => void): void {
    this.onControlsCallback = callback;
  }

  public show(bestScore: number): void {
    if (this.bestScoreEl) {
      this.bestScoreEl.textContent = Math.floor(bestScore).toString().padStart(6, '0');
    }
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.container?.classList.add('hidden');
  }
}
