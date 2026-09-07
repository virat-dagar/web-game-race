import * as THREE from 'three';
import { GameState } from './GameState.ts';
import { AudioManager } from './AudioManager.ts';
import { InputManager } from './InputManager.ts';
import { Environment } from '../world/Environment.ts';
import { RoadManager } from './RoadManager.ts';
import { Player } from './Player.ts';
import { TrafficManager } from './TrafficManager.ts';
import { CollisionSystem } from './CollisionSystem.ts';
import { ScoreSystem } from './ScoreSystem.ts';
import { HUD } from '../ui/HUD.ts';
import { MainMenu } from '../ui/MainMenu.ts';
import { PauseMenu } from '../ui/PauseMenu.ts';
import { GameOver } from '../ui/GameOver.ts';
import { ControlsMenu } from '../ui/ControlsMenu.ts';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Subsystems
  private state: GameState = GameState.MENU;
  private audio: AudioManager;
  private input: InputManager;
  private environment: Environment;
  private road: RoadManager;
  private player: Player;
  private traffic: TrafficManager;
  private collision: CollisionSystem;
  private score: ScoreSystem;

  // UI Layers
  private hud: HUD;
  private mainMenu: MainMenu;
  private pauseMenu: PauseMenu;
  private gameOverMenu: GameOver;
  private controlsMenu: ControlsMenu;

  // Human Eye First-Person Camera
  private baseFov = 64;
  private targetFov = 64;
  private cameraShake = 0;

  // Timing
  private lastTime = 0;
  private countdownTimer = 0;
  private countdownStep = 3;

  constructor() {
    this.canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;

    // WebGL Renderer with soft shadows and filmic tone mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Scene & Human POV Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.baseFov,
      window.innerWidth / window.innerHeight,
      0.1,
      650
    );

    // Initialize systems
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.environment = new Environment(this.scene);
    this.road = new RoadManager(this.scene);
    this.player = new Player(this.scene);
    this.traffic = new TrafficManager(this.scene);
    this.collision = new CollisionSystem(this.player, this.traffic);
    this.score = new ScoreSystem();

    // UI Systems
    this.hud = new HUD();
    this.mainMenu = new MainMenu();
    this.pauseMenu = new PauseMenu();
    this.gameOverMenu = new GameOver();
    this.controlsMenu = new ControlsMenu();

    this.bindEvents();
    this.setupUI();

    // Resize handling
    window.addEventListener('resize', () => this.onResize());

    // Show initial main menu
    this.setGameState(GameState.MENU);

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private bindEvents(): void {
    this.input.setOnAnyInput(() => {
      this.audio.init();
    });

    this.input.setOnPause(() => {
      if (this.state === GameState.PLAYING) {
        this.setGameState(GameState.PAUSED);
      } else if (this.state === GameState.PAUSED) {
        this.setGameState(GameState.PLAYING);
      }
    });
  }

  private setupUI(): void {
    this.mainMenu.setOnStart(() => {
      this.audio.playClick();
      this.startCountdown();
    });

    this.mainMenu.setOnControls(() => {
      this.audio.playClick();
      this.setGameState(GameState.CONTROLS);
    });

    this.controlsMenu.setOnClose(() => {
      this.audio.playClick();
      this.setGameState(GameState.MENU);
    });

    this.pauseMenu.setOnResume(() => {
      this.audio.playClick();
      this.setGameState(GameState.PLAYING);
    });

    this.pauseMenu.setOnRestart(() => {
      this.audio.playClick();
      this.startCountdown();
    });

    this.pauseMenu.setOnMenu(() => {
      this.audio.playClick();
      this.setGameState(GameState.MENU);
    });

    this.gameOverMenu.setOnRideAgain(() => {
      this.audio.playClick();
      this.startCountdown();
    });

    this.gameOverMenu.setOnMenu(() => {
      this.audio.playClick();
      this.setGameState(GameState.MENU);
    });
  }

  private setGameState(newState: GameState): void {
    this.state = newState;

    this.hud.hide();
    this.mainMenu.hide();
    this.controlsMenu.hide();
    this.pauseMenu.hide();
    this.gameOverMenu.hide();
    document.getElementById('countdown-overlay')?.classList.add('hidden');

    switch (this.state) {
      case GameState.MENU:
        this.mainMenu.show(this.score.bestScore);
        this.audio.stopEngine();
        this.resetWorld();
        break;

      case GameState.CONTROLS:
        this.controlsMenu.show();
        break;

      case GameState.COUNTDOWN:
        this.hud.show();
        document.getElementById('countdown-overlay')?.classList.remove('hidden');
        break;

      case GameState.PLAYING:
        this.hud.show();
        break;

      case GameState.PAUSED:
        this.hud.show();
        this.pauseMenu.show();
        this.audio.stopEngine();
        break;

      case GameState.GAMEOVER:
        this.audio.stopEngine();
        const results = this.score.finalize();
        this.gameOverMenu.show(results);
        break;
    }
  }

  private startCountdown(): void {
    this.resetWorld();
    this.setGameState(GameState.COUNTDOWN);

    this.countdownStep = 3;
    this.countdownTimer = 0;
    this.updateCountdownDisplay();
    this.audio.playCountdownBeep(false);
  }

  private updateCountdownDisplay(): void {
    const el = document.getElementById('countdown-text');
    if (!el) return;

    if (this.countdownStep > 0) {
      el.textContent = this.countdownStep.toString();
    } else {
      el.textContent = 'GO!';
    }

    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  private resetWorld(): void {
    this.player.reset();
    this.traffic.reset();
    this.road.reset();
    this.score.reset();
    this.input.reset();
    this.cameraShake = 0;
  }

  private loop(timestamp: number): void {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state === GameState.COUNTDOWN) {
      this.updateCountdown(dt);
      this.updateHumanPovCamera(dt);
    } else if (this.state === GameState.PLAYING) {
      this.updateGame(dt);
      this.updateHumanPovCamera(dt);
    } else if (this.state === GameState.MENU) {
      this.updateHumanPovCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop.bind(this));
  }

  private updateCountdown(dt: number): void {
    this.countdownTimer += dt;
    if (this.countdownTimer >= 0.85) {
      this.countdownTimer = 0;
      this.countdownStep--;

      if (this.countdownStep >= 0) {
        this.updateCountdownDisplay();
        this.audio.playCountdownBeep(this.countdownStep === 0);
      } else {
        this.setGameState(GameState.PLAYING);
      }
    }

    this.environment.update(this.player.z);
    this.hud.update(
      this.score.score,
      this.score.distanceKm,
      this.player.speedKmh,
      this.score.bestScore,
      this.score.combo
    );
  }

  private updateGame(dt: number): void {
    // 1. Update Player Controls & Cockpit
    this.player.update(
      dt,
      this.input.throttle,
      this.input.brake,
      this.input.left,
      this.input.right
    );

    // 2. Update Traffic & Road recycling
    this.traffic.update(dt, this.player.z);
    this.road.update(this.player.z);
    this.environment.update(this.player.z);

    // 3. Collision and Near-Miss Check
    const collisionResult = this.collision.check();

    if (collisionResult.hasCollided) {
      this.handleCrash();
      return;
    }

    if (collisionResult.nearMissVehicle) {
      const nearMiss = this.score.triggerNearMiss();
      this.audio.playNearMiss();
      this.hud.triggerNearMiss(nearMiss.points, nearMiss.combo);
      this.cameraShake = 0.35;
    }

    if (collisionResult.overtakenCount > 0) {
      this.score.addOvertakes(collisionResult.overtakenCount);
    }

    // 4. Update Score & HUD
    this.score.update(dt, this.player.speedKmh, this.player.z);
    this.hud.update(
      this.score.score,
      this.score.distanceKm,
      this.player.speedKmh,
      this.score.bestScore,
      this.score.combo
    );

    // 5. Audio Synth Update
    const speedRatio = (this.player.speedKmh - this.player.minSpeedKmh) / (this.player.maxSpeedKmh - this.player.minSpeedKmh);
    this.audio.updateEngine(speedRatio, this.input.throttle, this.input.brake);
  }

  private handleCrash(): void {
    this.player.crash();
    this.audio.playCrash();
    this.cameraShake = 1.2;

    setTimeout(() => {
      this.setGameState(GameState.GAMEOVER);
    }, 850);
  }

  private updateHumanPovCamera(dt: number): void {
    // Normal Human Eye Position when sitting on the motorcycle
    // Height: ~1.48m above asphalt, slightly back from the handlebars
    const eyeX = this.player.x;
    const eyeY = 1.48 + this.player.bobbing;
    const eyeZ = this.player.z - 0.15;

    // LookAt Target down the road horizon
    // Slightly lower than eye height so handlebars & dash naturally frame the bottom 25% of the screen
    const lookX = this.player.x + this.player.currentLean * 0.8;
    const lookY = 1.36 + this.player.pitch * 1.5;
    const lookZ = this.player.z + 50.0;

    // High-speed micro-vibration
    let shakeX = 0;
    let shakeY = 0;
    if (this.player.speedKmh > 140 && !this.player.isCrashed) {
      const speedVibe = ((this.player.speedKmh - 140) / 80) * 0.025;
      shakeX += (Math.random() - 0.5) * speedVibe;
      shakeY += (Math.random() - 0.5) * speedVibe;
    }
    if (this.cameraShake > 0) {
      shakeX += (Math.random() - 0.5) * this.cameraShake;
      shakeY += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - 2.8 * dt);
    }

    // Dynamic FOV widening with speed
    const speedRatio = Math.max(0, (this.player.speedKmh - 60) / 160);
    this.targetFov = this.baseFov + speedRatio * 14.0; // 64° to 78°
    this.camera.fov += (this.targetFov - this.camera.fov) * 7.0 * dt;
    this.camera.updateProjectionMatrix();

    // Position camera
    this.camera.position.set(eyeX + shakeX, eyeY + shakeY, eyeZ);

    // Robust lean banking without Euler gimbal inversion:
    // Looking along +Z, rolling to screen-left corresponds to banking camera:
    const rollAngle = -this.player.currentLean * 0.45;
    this.camera.up.set(Math.sin(rollAngle), Math.cos(rollAngle), 0);
    this.camera.lookAt(lookX, lookY, lookZ);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
