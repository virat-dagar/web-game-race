export class ControlsMenu {
  private container: HTMLElement | null;
  private onCloseCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('controls-modal');

    document.getElementById('btn-close-controls')?.addEventListener('click', () => {
      this.onCloseCallback?.();
    });
  }

  public setOnClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public show(): void {
    this.container?.classList.remove('hidden');
  }

  public hide(): void {
    this.container?.classList.add('hidden');
  }
}
