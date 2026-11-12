// Universo 3D com Three.js: núcleo luminoso, planetas em órbita (áreas de estudo) e campo de estrelas.
// Arrastar gira, roda/pinça aproxima, clique/toque seleciona um planeta.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function initUniverse(stage, planetsData, { reduced = false, onSelect = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0A0806, 0.0035);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);
  const HOME = new THREE.Vector3(0, 15, 38);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.enablePan = false; controls.minDistance = 8; controls.maxDistance = 90;
  controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.35;
  controls.rotateSpeed = 0.7; controls.zoomSpeed = 0.8;

  // textura de brilho radial (usada no núcleo e nas estrelas)
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,246,234,1)'); gr.addColorStop(.2, 'rgba(255,197,49,.85)');
    gr.addColorStop(.5, 'rgba(255,122,26,.25)'); gr.addColorStop(1, 'rgba(255,122,26,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  // estrelas em três camadas de intensidade
  const starLayers = [];
  [[1800, 1.1, .55], [600, 2.0, .8], [120, 3.4, 1]].forEach(([n, size, op]) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = [new THREE.Color('#FFF6EA'), new THREE.Color('#FFE08A'), new THREE.Color('#FFC531'), new THREE.Color('#FF9F4A')];
    for (let i = 0; i < n; i++) {
      const r = 140 + Math.random() * 360, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
      const c = palette[Math.random() < .6 ? 0 : 1 + Math.floor(Math.random() * 3)]; col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, map: glowTex, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false });
    const pts = new THREE.Points(geo, mat); scene.add(pts); starLayers.push({ mat, base: op });
  });

  // núcleo
  const core = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 48), new THREE.MeshBasicMaterial({ color: 0xFFB13B }));
  scene.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xFF8A2A, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(22, 22, 1); scene.add(halo);
  const halo2 = halo.clone(); halo2.material = halo.material.clone(); halo2.material.opacity = .35; halo2.scale.set(48, 48, 1); scene.add(halo2);
  scene.add(new THREE.PointLight(0xFFC080, 900, 0, 1.6));
  scene.add(new THREE.AmbientLight(0x3a2614, 1.2));

  // disco de acreção sutil em volta do núcleo
  const disk = new THREE.Mesh(new THREE.RingGeometry(4.2, 6.4, 96), new THREE.MeshBasicMaterial({ color: 0xFF7A1A, transparent: true, opacity: .22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  disk.rotation.x = Math.PI / 2.15; scene.add(disk);

  // planetas
  const ORB = [9, 13.5, 18, 23, 28.5];
  const planets = planetsData.map((p, i) => {
    const r = [1.25, 1.0, .9, 1.1, 1.5][i] || 1;
    const color = new THREE.Color(p.color);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 40),
      new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .1, emissive: color, emissiveIntensity: .18 }));
    const pivot = new THREE.Object3D(); pivot.rotation.x = (i - 2) * 0.06; pivot.rotation.z = (i % 2 ? 1 : -1) * 0.05 * i;
    scene.add(pivot); pivot.add(mesh);
    const curve = new THREE.EllipseCurve(0, 0, ORB[i], ORB[i]);
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(curve.getPoints(160)),
      new THREE.LineBasicMaterial({ color: 0xFFC531, transparent: true, opacity: .16 }));
    ring.rotation.x = Math.PI / 2; pivot.add(ring);
    const sel = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sel.scale.set(r * 6, r * 6, 1); mesh.add(sel);
    if (i === 2) { // anel no planeta de robótica
      const pr = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.1, 64), new THREE.MeshBasicMaterial({ color: 0xFFE08A, transparent: true, opacity: .45, side: THREE.DoubleSide }));
      pr.rotation.x = Math.PI / 2.6; mesh.add(pr);
    }
    if (i === 4) { // uma lua para física & astronomia
      const moon = new THREE.Mesh(new THREE.SphereGeometry(.35, 20, 20), new THREE.MeshStandardMaterial({ color: 0xFFF6EA, roughness: .8 }));
      moon.position.set(2.6, .4, 0); mesh.add(moon); mesh.userData.moon = moon;
    }
    mesh.userData.index = i;
    return { mesh, ring, sel, pivot, radius: ORB[i], angle: i * 1.3 + .4, speed: .32 / Math.sqrt(ORB[i] / 6) };
  });

  // interação
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, selected = -1, paused = false, hover = -1;
  const meshes = planets.map(p => p.mesh);
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.index : -1;
  }
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved < 6) { const i = pick(e); if (i >= 0) { focus(i); onSelect(i); } }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    hover = pick(e); renderer.domElement.style.cursor = hover >= 0 ? 'pointer' : '';
  });

  const tmp = new THREE.Vector3();
  let wantDist = null;
  function focus(i) { selected = i; wantDist = 11; controls.autoRotate = false; }
  function reset() {
    selected = -1; wantDist = null;
    controls.target.set(0, 0, 0); camera.position.copy(HOME); controls.autoRotate = !reduced; controls.update();
  }
  function zoom(f) {
    const off = camera.position.clone().sub(controls.target);
    const d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setLength(d)); wantDist = null;
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < 640 ? 64 : 52; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }).observe(stage);
  const clock = new THREE.Clock();
  let rafOn = false;
  function loop() {
    if (rafOn) return; rafOn = true;
    requestAnimationFrame(function frame() {
      if (!visible || document.hidden) { rafOn = false; return; }
      const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
      const k = reduced ? .25 : 1;
      planets.forEach((p, i) => {
        if (!paused) p.angle += p.speed * dt * k;
        p.mesh.position.set(Math.cos(p.angle) * p.radius, 0, Math.sin(p.angle) * p.radius);
        p.mesh.rotation.y += dt * .4 * k;
        if (p.mesh.userData.moon) { const a = t * 1.2 * k; p.mesh.userData.moon.position.set(Math.cos(a) * 2.6, .3, Math.sin(a) * 2.6); }
        const on = i === selected || i === hover;
        p.sel.material.opacity += ((on ? .55 : 0) - p.sel.material.opacity) * .1;
        p.ring.material.opacity += ((i === selected ? .5 : .16) - p.ring.material.opacity) * .1;
      });
      if (!reduced) {
        halo.material.opacity = .85 + Math.sin(t * 1.6) * .12;
        disk.rotation.z += dt * .15;
        starLayers.forEach((l, i) => l.mat.opacity = l.base * (.85 + .15 * Math.sin(t * (1 + i * .7) + i)));
      }
      if (selected >= 0) {
        planets[selected].mesh.getWorldPosition(tmp);
        controls.target.lerp(tmp, .08);
        if (wantDist) {
          const off = camera.position.clone().sub(controls.target);
          const d = off.length() + (wantDist - off.length()) * .06;
          camera.position.copy(controls.target).add(off.setLength(d));
          if (Math.abs(d - wantDist) < .05) wantDist = null;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { clock.getDelta(); loop(); } });
  loop();

  return { focus, reset, zoom, setPaused(v) { paused = v; } };
}
