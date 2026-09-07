import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private mountainsGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Atmospheric Depth Fog (Twilight Navy)
    const fogColor = new THREE.Color(0x0a101d);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0032);

    // Natural Sky & Asphalt Ambient Bounce
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 1.1);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    // Warm Low-Angle Sunlight (Afternoon Highway Specular Sheen)
    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    this.dirLight.position.set(-50, 65, -30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 280;
    this.dirLight.shadow.camera.left = -35;
    this.dirLight.shadow.camera.right = 35;
    this.dirLight.shadow.camera.top = 35;
    this.dirLight.shadow.camera.bottom = -35;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Dynamic Gradient Sky Dome
    this.createSkyDome();

    // Distant Mountain Silhouettes along the horizon
    this.mountainsGroup = new THREE.Group();
    this.createMountainRidges();
    this.scene.add(this.mountainsGroup);
  }

  private createSkyDome(): void {
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x0369a1) }, // Rich Pacific Blue
      bottomColor: { value: new THREE.Color(0x0a101d) }, // Deep Twilight Horizon
      offset: { value: 25 },
      exponent: { value: 0.55 }
    };

    const skyGeo = new THREE.SphereGeometry(650, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private createMountainRidges(): void {
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x070c16,
      roughness: 0.95,
      metalness: 0.05
    });

    // Create varied low-poly mountain peaks flanking the horizon
    for (let i = 0; i < 28; i++) {
      const radius = 35 + Math.random() * 45;
      const height = 45 + Math.random() * 65;
      const coneGeo = new THREE.ConeGeometry(radius, height, 5);
      const mountain = new THREE.Mesh(coneGeo, mountainMat);

      const side = Math.random() > 0.5 ? 1 : -1;
      const xDist = (110 + Math.random() * 120) * side;
      const zDist = Math.random() * 700 - 100;

      mountain.position.set(xDist, height / 2 - 10, zDist);
      mountain.rotation.y = Math.random() * Math.PI;
      this.mountainsGroup.add(mountain);
    }
  }

  public update(playerZ: number): void {
    // Keep sun shadows centered on active motorcycle area
    this.dirLight.position.z = playerZ - 30;
    this.dirLight.target.position.set(0, 0, playerZ + 25);
    this.dirLight.target.updateMatrixWorld();

    // Recycle mountain ridges along with the player
    for (const mountain of this.mountainsGroup.children) {
      if (mountain.position.z < playerZ - 200) {
        mountain.position.z += 700;
      }
    }
  }
}
