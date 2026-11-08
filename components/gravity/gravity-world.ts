import * as THREE from "three";
interface Ball {
  id: number;
  radius: number;
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  meshGroup: THREE.Group;
  sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
  material: THREE.MeshPhysicalMaterial;
  role: string;
  isGlass: boolean;
  visualScale: number;
}
// Stage 1 is the supplied Gravity solver at progress=0, without later-stage branches.
export function createGravityWorld(
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
) {
  const mousePos = { x: 99, y: 99, isDown: false, active: false };
  const entranceStart = 0;
  const ballColor = "#2F69FF";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    38,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 11);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemiLight = new THREE.HemisphereLight(
    0xffffff,
    new THREE.Color(ballColor),
    1.6,
  );
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(-6, 10, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.radius = 12.0;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.25);
  rimLight.position.set(8, 7, -8);
  scene.add(rimLight);

  const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
  frontLight.position.set(0, 0, 11);
  scene.add(frontLight);

  const sideBounceLight = new THREE.DirectionalLight(0xffffff, 0.3);
  sideBounceLight.position.set(-9, -2, 4);
  scene.add(sideBounceLight);
  let viewportWidth = 10;
  let viewportHeight = 6;
  const updateFrustumBounds = () => {
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    viewportHeight = 2 * Math.tan(fovRad / 2) * camera.position.z;
    viewportWidth =
      viewportHeight * (container.clientWidth / container.clientHeight);
  };
  updateFrustumBounds();

  const isMobile = window.innerWidth < 768;
  const ballCount = isMobile ? 54 : 96;
  const palette = {
    pastel: new THREE.Color("#ECEFFF"),
    light: new THREE.Color("#A8C1FF"),
    medium: new THREE.Color("#2F69FF"),
    deep: new THREE.Color("#0A33BF"),
    glass: new THREE.Color("#4D80FF"),
  };
  const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);
  const balls: Ball[] = [];
  for (let i = 0; i < ballCount; i++) {
    let radius = 0.33;
    const rand = Math.random();
    if (rand < 0.3) radius = 0.27 + Math.random() * 0.12;
    else if (rand < 0.8) radius = 0.42 + Math.random() * 0.18;
    else radius = 0.66 + Math.random() * 0.21;

    const mass = Math.pow(radius, 3);

    let chosenColor = palette.medium;

    let sphereMat: THREE.MeshPhysicalMaterial;
    let role: keyof typeof palette = "medium";

    const isGlass = Math.random() < 0.22;

    if (isGlass) {
      sphereMat = new THREE.MeshPhysicalMaterial({
        color: palette.glass,
        roughness: 0.08,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        transmission: 0.95,
        ior: 1.485,
        thickness: 2.2,
        specularColor: new THREE.Color("#ffffff"),
        specularIntensity: 1.0,
        attenuationColor: palette.pastel,
        attenuationDistance: 1.0,
        emissive: palette.glass,
        emissiveIntensity: 0.12,
        transparent: true,
      });

      role = "glass";
    } else {
      const colorRand = Math.random();
      if (colorRand < 0.25) {
        chosenColor = palette.pastel;
        role = "pastel";
      } else if (colorRand < 0.55) {
        chosenColor = palette.light;
        role = "light";
      } else if (colorRand < 0.85) {
        chosenColor = palette.medium;
        role = "medium";
      } else {
        chosenColor = palette.deep;
        role = "deep";
      }

      sphereMat = new THREE.MeshPhysicalMaterial({
        color: chosenColor,
        roughness: 0.44,
        metalness: 0.0,
        clearcoat: 0.24,
        clearcoatRoughness: 0.35,
        emissive: chosenColor,
        emissiveIntensity: 0.08,
        transparent: true,
      });
    }

    const group = new THREE.Group();
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMat);
    sphereMesh.scale.setScalar(radius);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    group.add(sphereMesh);
    scene.add(group);

    balls.push({
      id: i,
      radius,
      mass,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(),
      meshGroup: group,
      sphere: sphereMesh,
      material: sphereMat,
      role,
      isGlass,
      visualScale: radius,
    });
  }

  const scatterFar = (withInwardVelocity: boolean) => {
    const R = Math.max(viewportWidth, viewportHeight) * 1.5;
    for (const b of balls) {
      const a = Math.random() * Math.PI * 2;
      const px = Math.cos(a) * R * 1.25;
      const py = Math.sin(a) * R * 0.85;
      const pz = (Math.random() - 0.5) * 4;
      b.position.set(px, py, pz);
      b.meshGroup.position.copy(b.position);
      if (withInwardVelocity) {
        b.velocity
          .set(-px, -py, -pz)
          .normalize()
          .multiplyScalar(0.08 + Math.random() * 0.05);
      } else {
        b.velocity.set(0, 0, 0);
      }
    }
  };

  const params = {
    gravity: 0,
    rebound: -0.3,
    mouseRepelForce: 0.05,
    mouseRepelRadius: 4.4,
    damping: 0.91,
    centerAttractForce: 0.0035,
    bounciness: 0.02,
  };

  const mouseProjVec = new THREE.Vector3();
  const mouseWorld3D = new THREE.Vector3();
  const updateMouse3D = () => {
    if (!mousePos) return;
    mouseProjVec.set(mousePos.x, mousePos.y, 0.5);
    mouseProjVec.unproject(camera);
    const dir = mouseProjVec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    mouseWorld3D.copy(camera.position).add(dir.multiplyScalar(distance));
  };
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const diffVec = new THREE.Vector3();
  const collideDiff = new THREE.Vector3();
  const relVel = new THREE.Vector3();
  const deltaPos = new THREE.Vector3();
  const rotAxis = new THREE.Vector3();
  const prevMouseWorld = new THREE.Vector3();
  let mouseSpeed = 0;

  const simulate = (time: number, interact = true) => {
    if (interact) updateMouse3D();

    const heroF = 1;
    const entranceT = easeOutCubic(clamp01((time - entranceStart) / 2.2));
    const attractionBoost = lerp(7.5, 1, entranceT);

    const isMouseInteracting =
      interact &&
      mousePos.active &&
      (Math.abs(mousePos.x) < 0.99 || Math.abs(mousePos.y) < 0.99);

    mouseSpeed = isMouseInteracting
      ? mouseWorld3D.distanceTo(prevMouseWorld)
      : 0;
    if (mouseSpeed > 3) mouseSpeed = 3;
    prevMouseWorld.copy(mouseWorld3D);

    const damping = params.damping;
    const clusterActive = Math.max(heroF, entranceT < 1 ? 1 : 0);

    // 1. ACCELERATIONS
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];

      if (heroF > 0.01) {
        b.velocity.x +=
          Math.sin(time * 0.4 + b.id * 1.5) * 0.0004 * b.radius * heroF;
        b.velocity.y +=
          Math.cos(time * 0.5 + b.id * 1.2) * 0.0004 * b.radius * heroF;
        b.velocity.z += Math.sin(time * 0.35 + b.id) * 0.0001 * heroF;
      }

      const clusterStrength =
        params.centerAttractForce * attractionBoost * clusterActive;
      if (clusterStrength > 0.00001) {
        b.velocity.x += (0 - b.position.x) * clusterStrength * 0.38;
        b.velocity.y += (0 - b.position.y) * clusterStrength * 1.85;
        b.velocity.z += (0 - b.position.z) * clusterStrength * 1.8;
      }

      if (mousePos && isMouseInteracting) {
        diffVec.subVectors(b.position, mouseWorld3D);
        const rawDist = diffVec.length();
        const down = mousePos.isDown;
        const activeRepelRadius = down
          ? params.mouseRepelRadius * 1.4
          : params.mouseRepelRadius;
        const activeRepelForce = down
          ? params.mouseRepelForce * 1.7
          : params.mouseRepelForce;
        if (rawDist < activeRepelRadius && rawDist > 0.0001) {
          const ratio = rawDist / activeRepelRadius;
          const smoothFactor = 1.0 - ratio * ratio * (3.0 - 2.0 * ratio);
          const speedBoost = 1 + mouseSpeed * 3.2;
          const push = smoothFactor * activeRepelForce * speedBoost;
          diffVec.normalize();
          diffVec.z *= 0.12;
          diffVec.normalize();
          b.velocity.addScaledVector(diffVec, push);
        }
      }

      b.velocity.multiplyScalar(damping);
      b.position.addScaledVector(b.velocity, 1);
    }

    // 2. Hero pairwise collisions: four mass-weighted relaxation passes.
    const collideScale = 0.28;
    const subSteps = 4;
    for (let step = 0; step < subSteps; step++) {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          collideDiff.subVectors(b2.position, b1.position);
          const dist = collideDiff.length();
          const minDist = b1.visualScale + b2.visualScale;
          if (dist < minDist && dist > 0.001) {
            const overlap = minDist - dist;
            collideDiff.multiplyScalar(1 / dist);
            const totalMass = b1.mass + b2.mass;
            const ratio1 = b2.mass / totalMass;
            const ratio2 = b1.mass / totalMass;
            b1.position.addScaledVector(
              collideDiff,
              -overlap * ratio1 * collideScale,
            );
            b2.position.addScaledVector(
              collideDiff,
              overlap * ratio2 * collideScale,
            );

            relVel.subVectors(b2.velocity, b1.velocity);
            const velAlongNormal = relVel.dot(collideDiff);
            if (velAlongNormal < -0.0001) {
              const impulse =
                (-(1 + params.bounciness) * velAlongNormal) /
                (1 / b1.mass + 1 / b2.mass);
              b1.velocity.addScaledVector(collideDiff, -impulse / b1.mass);
              b2.velocity.addScaledVector(collideDiff, impulse / b2.mass);
            }
          }
        }
      }
    }

    // 3. VIEWPORT WALLS + BOUNCY FLOOR
    const borderPad = 0.2;
    const xBound = viewportWidth / 2 - borderPad;
    const topY = viewportHeight / 2 - 0.05;
    const floorY = -viewportHeight / 2 + 0.05;
    const zBound = 2.0;
    const restitution = 0.3;

    const contain = time >= 2.2; // Let offscreen scatter actually fly in before applying walls.
    const zContain = time >= 2.2;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const r = b.visualScale;

      if (contain) {
        if (b.position.x < -xBound - r) {
          b.position.x = -xBound - r;
          b.velocity.x *= params.rebound;
        } else if (b.position.x > xBound + r) {
          b.position.x = xBound + r;
          b.velocity.x *= params.rebound;
        }

        if (b.position.y - r < floorY) {
          b.position.y = floorY + r;
          if (b.velocity.y < 0) b.velocity.y = -b.velocity.y * restitution;
        }
        if (b.position.y + r > topY) {
          b.position.y = topY - r;
          if (b.velocity.y > 0) b.velocity.y *= params.rebound;
        }
      }

      if (zContain) {
        if (b.position.z < -zBound) {
          b.position.z = -zBound;
          b.velocity.z *= params.rebound;
        } else if (b.position.z > zBound) {
          b.position.z = zBound;
          b.velocity.z *= params.rebound;
        }
      }

      deltaPos.copy(b.position).sub(b.meshGroup.position);
      if (deltaPos.lengthSq() > 0.000001) {
        rotAxis.set(deltaPos.y, -deltaPos.x, 0).normalize();
        const rotAngle = (deltaPos.length() / b.radius) * 0.95;
        b.meshGroup.rotateOnWorldAxis(rotAxis, rotAngle);
      }
      b.meshGroup.position.copy(b.position);
    }
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    updateFrustumBounds();
  };
  resize();
  scatterFar(false);
  const render = () => renderer.render(scene, camera);
  const dispose = () => {
    sphereGeometry.dispose();
    for (const ball of balls) ball.material.dispose();
    keyLight.shadow.map?.dispose();
    scene.clear();
  };
  return {
    balls,
    mousePos,
    scatterFar,
    simulate,
    render,
    resize,
    dispose,
    camera,
  };
}
