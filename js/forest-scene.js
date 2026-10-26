import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Float32BufferAttribute,
  FogExp2,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  WebGLRenderer
} from "../assets/vendor/three.module.min.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

function makeGlowTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255, 244, 211, 1)");
  gradient.addColorStop(0.18, "rgba(255, 222, 158, 0.86)");
  gradient.addColorStop(0.46, "rgba(244, 189, 106, 0.22)");
  gradient.addColorStop(1, "rgba(244, 189, 106, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#0a1d16");
  sky.addColorStop(0.46, "#102a1e");
  sky.addColorStop(0.74, "#2a4430");
  sky.addColorStop(1, "#5a6743");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 512);

  const glow = ctx.createRadialGradient(128, 252, 0, 128, 252, 250);
  glow.addColorStop(0, "rgba(255, 239, 195, 0.9)");
  glow.addColorStop(0.16, "rgba(255, 218, 150, 0.5)");
  glow.addColorStop(0.46, "rgba(239, 187, 111, 0.14)");
  glow.addColorStop(1, "rgba(239, 187, 111, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeMistTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 72, 0, 128, 72, 120);
  gradient.addColorStop(0, "rgba(205, 219, 196, 0.36)");
  gradient.addColorStop(0.45, "rgba(191, 209, 181, 0.16)");
  gradient.addColorStop(1, "rgba(191, 209, 181, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function makeParticleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 240, 196, 1)");
  gradient.addColorStop(0.38, "rgba(255, 224, 157, 0.7)");
  gradient.addColorStop(1, "rgba(255, 224, 157, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createForestScene(canvas, stage) {
  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio < 2 && window.innerWidth > 700,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch {
    stage.classList.add("no-webgl");
    return null;
  }

  if (!renderer || !renderer.getContext()) {
    stage.classList.add("no-webgl");
    return null;
  }

  const sticky = stage.querySelector(".stage__sticky");
  const scene = new Scene();
  scene.background = new Color(0x081811);
  scene.fog = new FogExp2(0x0d241b, 0.029);

  const camera = new PerspectiveCamera(52, 1, 0.1, 240);
  const lookTarget = new Object3D();

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(0x081811, 1);

  let width = Math.max(1, sticky.clientWidth);
  let height = Math.max(1, sticky.clientHeight);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.3 : 1.5);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  /* ------------------------------------------------------------------------
     Light
     ------------------------------------------------------------------------ */

  const sunLight = new DirectionalLight(0xffd39a, 3.2);
  sunLight.position.set(-34, 32, 18);
  scene.add(sunLight);

  const skyLight = new HemisphereLight(0xb8cdb0, 0x07130d, 1.55);
  scene.add(skyLight);

  const fillLight = new DirectionalLight(0x8eb9a1, 0.7);
  fillLight.position.set(24, 14, -28);
  scene.add(fillLight);

  scene.add(new AmbientLight(0x2d4939, 0.55));

  /* ------------------------------------------------------------------------
     Sky, sun and mist
     ------------------------------------------------------------------------ */

  const skyTexture = makeSkyTexture();
  const sky = new Mesh(
    new PlaneGeometry(420, 210),
    new MeshBasicMaterial({ map: skyTexture, depthWrite: false, fog: false })
  );
  sky.position.set(0, 56, -150);
  sky.renderOrder = -2;
  scene.add(sky);

  const sunTexture = makeGlowTexture();
  const sun = new Sprite(
    new SpriteMaterial({
      map: sunTexture,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
      opacity: 0.9
    })
  );
  sun.scale.set(48, 48, 1);
  sun.position.set(-36, 24, -100);
  sun.renderOrder = -1;
  scene.add(sun);

  // A soft, depth-independent bloom keeps the low sunlight present even when
  // a foreground canopy crosses the sun.
  const sunHalo = new Sprite(
    new SpriteMaterial({
      map: sunTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      opacity: 0.24
    })
  );
  sunHalo.scale.set(120, 120, 1);
  sunHalo.position.set(-36, 24, -100);
  sunHalo.renderOrder = 2;
  scene.add(sunHalo);

  const mistTexture = makeMistTexture();
  const mistPositions = [
    [-16, 2.4, -34, 70, 18, 0.2],
    [18, 3.2, -52, 86, 22, 0.16],
    [0, 2.8, -76, 110, 26, 0.14]
  ];

  for (const [x, y, z, sx, sy, opacity] of mistPositions) {
    const mist = new Sprite(
      new SpriteMaterial({
        map: mistTexture,
        transparent: true,
        opacity,
        depthWrite: false,
        fog: true
      })
    );
    mist.position.set(x, y, z);
    mist.scale.set(sx, sy, 1);
    scene.add(mist);
  }

  /* ------------------------------------------------------------------------
     Ground
     ------------------------------------------------------------------------ */

  const groundGeometry = new PlaneGeometry(260, 260, 52, 52);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const distance = Math.hypot(x, y);
    const rise = Math.max(0, distance - 18) * 0.028;
    const ripple = Math.sin(x * 0.12) * Math.cos(y * 0.1) * 0.32;
    positions.setZ(i, rise + ripple);
  }
  groundGeometry.computeVertexNormals();

  const ground = new Mesh(
    groundGeometry,
    new MeshStandardMaterial({
      color: 0x10291d,
      roughness: 1,
      metalness: 0,
      flatShading: true
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  /* ------------------------------------------------------------------------
     Forest
     ------------------------------------------------------------------------ */

  const isSmall = width < 720;
  const pineCount = isSmall ? 92 : 158;
  const broadCount = isSmall ? 16 : 34;
  const rockCount = isSmall ? 28 : 48;

  const trunkGeometry = new CylinderGeometry(0.11, 0.2, 1, 5, 1);
  const trunkMaterial = new MeshStandardMaterial({ color: 0x3a2c20, roughness: 1, flatShading: true });
  const pineTrunks = new InstancedMesh(trunkGeometry, trunkMaterial, pineCount);

  const branchGeometry = new ConeGeometry(1, 1, 7, 1);
  const branchMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true });
  const pineBranches = new InstancedMesh(branchGeometry, branchMaterial, pineCount * 3);

  const broadTrunks = new InstancedMesh(
    new CylinderGeometry(0.16, 0.27, 1, 5, 1),
    new MeshStandardMaterial({ color: 0x453426, roughness: 1, flatShading: true }),
    broadCount
  );

  const broadCanopies = new InstancedMesh(
    new IcosahedronGeometry(1, 1),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, flatShading: true }),
    broadCount
  );

  const dummy = new Object3D();
  const branchColor = new Color();
  const pinePalette = [0x1a3a28, 0x20452f, 0x275036, 0x2e5a3c, 0x356440, 0x416b45];
  const broadPalette = [0x355c39, 0x436c43, 0x51784b, 0x5f8654];

  const cameraPathX = (z) => Math.sin(((15 - z) / 30) * 3) * 1.8;

  function randomTreeX(z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = side * (3.4 + Math.random() * 34);
    const clearing = z > 2 ? 7 : z > -34 ? 5.6 : 4.1;
    const path = cameraPathX(z);
    if (Math.abs(x - path) < clearing) {
      x = path + side * (clearing + Math.random() * 4.5);
    }
    return x;
  }

  for (let i = 0; i < pineCount; i += 1) {
    const z = MathUtils.randFloat(-112, 22);
    const x = randomTreeX(z);
    const treeHeight = MathUtils.randFloat(5.4, z > 2 ? 12.5 : 15.5) * (z < -46 ? 1.15 : 1);
    const trunkHeight = treeHeight * 0.42;

    dummy.position.set(x, trunkHeight / 2, z);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.set(1, trunkHeight, 1);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(i, dummy.matrix);

    const baseColor = pinePalette[Math.floor(Math.random() * pinePalette.length)];
    const tierData = [
      [0.39, 0.22, 0.43],
      [0.61, 0.16, 0.36],
      [0.8, 0.11, 0.29]
    ];

    for (let tier = 0; tier < 3; tier += 1) {
      const [yFactor, radiusFactor, heightFactor] = tierData[tier];
      dummy.position.set(x, treeHeight * yFactor, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(treeHeight * radiusFactor, treeHeight * heightFactor, treeHeight * radiusFactor);
      dummy.updateMatrix();
      const index = i * 3 + tier;
      pineBranches.setMatrixAt(index, dummy.matrix);

      branchColor.setHex(baseColor);
      branchColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.045);
      const closeShade = MathUtils.clamp((z - 2) / 20, 0, 1);
      branchColor.offsetHSL(0, -0.03 * closeShade, -0.065 * closeShade);
      pineBranches.setColorAt(index, branchColor);
    }
  }

  for (let i = 0; i < broadCount; i += 1) {
    const z = MathUtils.randFloat(-108, 18);
    const x = randomTreeX(z);
    const treeHeight = MathUtils.randFloat(4.8, 9.8);
    const trunkHeight = treeHeight * 0.6;

    dummy.position.set(x, trunkHeight / 2, z);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.set(1, trunkHeight, 1);
    dummy.updateMatrix();
    broadTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, treeHeight * 0.78, z);
    dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
    dummy.scale.set(treeHeight * 0.27, treeHeight * 0.2, treeHeight * 0.27);
    dummy.updateMatrix();
    broadCanopies.setMatrixAt(i, dummy.matrix);

    branchColor.setHex(broadPalette[Math.floor(Math.random() * broadPalette.length)]);
    branchColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
    const broadShade = MathUtils.clamp((z - 2) / 20, 0, 1);
    branchColor.offsetHSL(0, -0.03 * broadShade, -0.07 * broadShade);
    broadCanopies.setColorAt(i, branchColor);
  }

  const rocks = new InstancedMesh(
    new DodecahedronGeometry(1, 0),
    new MeshStandardMaterial({ color: 0x233a2c, roughness: 1, flatShading: true }),
    rockCount
  );

  for (let i = 0; i < rockCount; i += 1) {
    const z = MathUtils.randFloat(-98, 20);
    const x = randomTreeX(z) + MathUtils.randFloatSpread(7);
    const size = MathUtils.randFloat(0.22, 1.15);
    dummy.position.set(x, size * 0.35, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(size * 1.3, size * 0.7, size);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }

  const shrubCount = isSmall ? 46 : 86;
  const shrubs = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
    shrubCount
  );

  for (let i = 0; i < shrubCount; i += 1) {
    const z = MathUtils.randFloat(-86, 20);
    const x = cameraPathX(z) + (Math.random() < 0.5 ? -1 : 1) * MathUtils.randFloat(3.2, 16);
    const size = MathUtils.randFloat(0.35, 1.1);
    dummy.position.set(x, size * 0.34, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.scale.set(size * 1.5, size * 0.6, size * 1.1);
    dummy.updateMatrix();
    shrubs.setMatrixAt(i, dummy.matrix);
    branchColor.setHex(broadPalette[Math.floor(Math.random() * broadPalette.length)]);
    branchColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
    const shrubShade = MathUtils.clamp((z - 2) / 20, 0, 1);
    branchColor.offsetHSL(0, -0.03 * shrubShade, -0.08 * shrubShade);
    shrubs.setColorAt(i, branchColor);
  }

  for (const mesh of [pineTrunks, pineBranches, broadTrunks, broadCanopies, rocks, shrubs]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* ------------------------------------------------------------------------
     Floating dust
     ------------------------------------------------------------------------ */

  const particleCount = isSmall ? 120 : 230;
  const particlePositions = new Float32Array(particleCount * 3);
  const particlePhases = new Float32Array(particleCount);
  const particleSpeeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const index = i * 3;
    particlePositions[index] = MathUtils.randFloatSpread(42);
    particlePositions[index + 1] = MathUtils.randFloat(0.4, 14);
    particlePositions[index + 2] = MathUtils.randFloat(-72, 18);
    particlePhases[i] = Math.random() * Math.PI * 2;
    particleSpeeds[i] = MathUtils.randFloat(0.018, 0.06);
  }

  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute("position", new Float32BufferAttribute(particlePositions, 3));

  const particles = new Points(
    particleGeometry,
    new PointsMaterial({
      map: makeParticleTexture(),
      color: 0xf6dfaa,
      size: isSmall ? 0.12 : 0.14,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true
    })
  );
  particles.frustumCulled = false;
  scene.add(particles);

  /* ------------------------------------------------------------------------
     Motion and rendering
     ------------------------------------------------------------------------ */

  let targetProgress = 0;
  let currentProgress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;
  let time = 0;
  let active = false;
  let running = false;
  let frameId = 0;
  let lastTime = 0;
  let hasRendered = false;
  let reducedMotion = prefersReducedMotion.matches;

  camera.position.set(0, 2.3, 15);
  camera.lookAt(0, 3.2, -12);

  function updateCamera(progress) {
    const z = 15 - progress * 30;
    const x = Math.sin(progress * 3) * 1.8 + smoothPointerX * 1.25;
    const y = 2.25 + progress * 1.6 + smoothPointerY * 0.45;
    camera.position.set(x, y, z);
    lookTarget.position.set(
      Math.sin(progress * 2.1) * 1.1 + smoothPointerX * 0.55,
      3.05 + progress * 1.05 - smoothPointerY * 0.35,
      z - 26
    );
    camera.lookAt(lookTarget.position);
    camera.rotation.z += smoothPointerX * 0.016;
  }

  function animateParticles(delta) {
    const array = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i += 1) {
      const index = i * 3;
      array[index + 1] += particleSpeeds[i] * delta;
      array[index] += Math.sin(time * 0.32 + particlePhases[i]) * 0.0025;
      if (array[index + 1] > 14.5) {
        array[index + 1] = 0.3;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particles.rotation.y = Math.sin(time * 0.04) * 0.025;
  }

  function renderOnce() {
    updateCamera(currentProgress);
    renderer.render(scene, camera);
    if (!hasRendered) {
      hasRendered = true;
      stage.classList.add("is-ready");
    }
  }

  function tick(now) {
    if (!running) return;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    time += delta;

    const ease = Math.min(1, delta * 6.5);
    currentProgress += (targetProgress - currentProgress) * ease;
    smoothPointerX += (pointerX - smoothPointerX) * Math.min(1, delta * 4);
    smoothPointerY += (pointerY - smoothPointerY) * Math.min(1, delta * 4);

    updateCamera(currentProgress);
    animateParticles(delta);
    renderer.render(scene, camera);

    if (!hasRendered) {
      hasRendered = true;
      stage.classList.add("is-ready");
    }

    frameId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    if (reducedMotion) {
      renderOnce();
      return;
    }
    running = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  }

  function setActive(nextActive) {
    active = nextActive;
    if (active && !document.hidden) {
      start();
    } else {
      stop();
    }
  }

  function setProgress(progress) {
    targetProgress = MathUtils.clamp(progress, 0, 1);
    stage.style.setProperty("--stage-p", targetProgress.toFixed(4));
    if (reducedMotion && active) {
      currentProgress = targetProgress;
      renderOnce();
    }
  }

  function handlePointer(event) {
    if (reducedMotion || !finePointer.matches) return;
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    stage.style.setProperty("--mx", pointerX.toFixed(3));
    stage.style.setProperty("--my", pointerY.toFixed(3));
  }

  function handlePointerLeave() {
    pointerX = 0;
    pointerY = 0;
    stage.style.setProperty("--mx", "0");
    stage.style.setProperty("--my", "0");
  }

  function resize() {
    const nextWidth = Math.max(1, sticky.clientWidth);
    const nextHeight = Math.max(1, sticky.clientHeight);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.3 : 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (reducedMotion && active) renderOnce();
  }

  function handleReducedMotionChange() {
    reducedMotion = prefersReducedMotion.matches;
    if (reducedMotion) {
      stop();
      currentProgress = targetProgress;
      if (active) renderOnce();
    } else if (active) {
      start();
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stop();
    } else if (active) {
      start();
    }
  }

  function handleContextLost(event) {
    event.preventDefault();
    stop();
    stage.classList.remove("is-ready");
    stage.classList.add("no-webgl");
  }

  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  canvas.addEventListener("webglcontextlost", handleContextLost, false);
  prefersReducedMotion.addEventListener?.("change", handleReducedMotionChange);

  renderOnce();

  return {
    setProgress,
    setActive,
    resize,
    destroy() {
      stop();
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      prefersReducedMotion.removeEventListener?.("change", handleReducedMotionChange);
      renderer.dispose();
    }
  };
}
