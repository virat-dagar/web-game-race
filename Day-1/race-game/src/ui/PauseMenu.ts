export class PauseMenu {
  private container: HTMLElement | null;
  private onResumeCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;
  private onMenuCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('pause-menu');

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.onResumeCallback?.();
    });

    document.getElementById('btn-restart-pause')?.addEventListener('click', () => {
      this.onRestartCallback?.();
    });

    document.getElementById('btn-menu-pause')?.addEventListener('click', () => {
      this.onMenuCallback?.();
    });
  }

  public setOnResume(callback: () => void): void {
    this.onResumeCallback = callback;
  }

  public setOnRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  public setOnMenu(callback: () => void): void {
    this.onMenuCallback = callback;
  }

  public show(): void {
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.container?.classList.add('hidden');
  }
}
