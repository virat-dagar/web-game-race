// Keyboard and Mobile Touch Input Handler for Road Rush

export class InputManager {
  public left = false;
  public right = false;
  public throttle = false;
  public brake = false;

  private onPauseCallback: (() => void) | null = null;
  private onAnyInputCallback: (() => void) | null = null;

  constructor() {
    this.setupKeyboard();
    this.setupTouch();
  }

  public setOnPause(callback: () => void): void {
    this.onPauseCallback = callback;
  }

  public setOnAnyInput(callback: () => void): void {
    this.onAnyInputCallback = callback;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.onAnyInputCallback?.();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.throttle = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.brake = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.right = true;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.onPauseCallback?.();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.throttle = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.brake = false;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.right = false;
      }
    });
  }

  private setupTouch(): void {
    const bindTouch = (id: string, onDown: () => void, onUp: () => void) => {
      const el = document.getElementById(id);
      if (!el) return;

      const down = (e: Event) => {
        e.preventDefault();
        this.onAnyInputCallback?.();
        onDown();
      };
      const up = (e: Event) => {
        e.preventDefault();
        onUp();
      };

      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };

    bindTouch('touch-left', () => { this.left = true; }, () => { this.left = false; });
    bindTouch('touch-right', () => { this.right = true; }, () => { this.right = false; });
    bindTouch('touch-gas', () => { this.throttle = true; }, () => { this.throttle = false; });
    bindTouch('touch-brake', () => { this.brake = true; }, () => { this.brake = false; });

    document.getElementById('btn-pause-hud')?.addEventListener('click', () => {
      this.onAnyInputCallback?.();
      this.onPauseCallback?.();
    });
  }

  public reset(): void {
    this.left = false;
    this.right = false;
    this.throttle = false;
    this.brake = false;
  }
}
