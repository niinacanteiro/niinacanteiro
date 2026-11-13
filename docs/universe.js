// Sistema Solar 3D (Three.js r160): Sol com superfície animada e brilho (bloom),
// oito planetas com texturas reais (Solar System Scope, CC BY 4.0), Terra com nuvens,
// luzes noturnas e atmosfera, Lua, anéis de Saturno e Urano, céu da Via Láctea.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// tamanhos e distâncias em escala artística (proporções reais não caberiam na tela)
const SYSTEM = [
  { key: 'mercury', r: .55, orbit: 11, tilt: .03, spin: .6, tex: 'mercury.jpg' },
  { key: 'venus', r: .95, orbit: 15, tilt: 3.1, spin: -.25, tex: 'venus_atmosphere.jpg' },
  { key: 'earth', r: 1.0, orbit: 20, tilt: .41, spin: 1.2, tex: 'earth_daymap.jpg' },
  { key: 'mars', r: .72, orbit: 25, tilt: .44, spin: 1.15, tex: 'mars.jpg' },
  { key: 'jupiter', r: 2.7, orbit: 34, tilt: .05, spin: 2.4, tex: 'jupiter.jpg' },
  { key: 'saturn', r: 2.25, orbit: 45, tilt: .47, spin: 2.2, tex: 'saturn.jpg' },
  { key: 'uranus', r: 1.55, orbit: 54, tilt: 1.71, spin: -1.4, tex: 'uranus.jpg' },
  { key: 'neptune', r: 1.5, orbit: 62, tilt: .49, spin: 1.5, tex: 'neptune.jpg' }
];

export function initUniverse(stage, planetsData, { reduced = false, onSelect = () => {}, onReady = () => {} } = {}) {
  const small = stage.clientWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
  const HOME = new THREE.Vector3(0, 24, 66);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .05, enablePan: false, minDistance: 4, maxDistance: 190, rotateSpeed: .6, zoomSpeed: .8, autoRotate: !reduced, autoRotateSpeed: .25 });
  controls.maxPolarAngle = Math.PI * .92;

  // carregamento
  const manager = new THREE.LoadingManager();
  let readyDone = false; const ready = () => { if (!readyDone) { readyDone = true; onReady(); } };
  manager.onLoad = ready; manager.onError = u => console.warn('textura não carregou:', u);
  setTimeout(ready, 9000);
  const loader = new THREE.TextureLoader(manager);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (f, color = true) => { const t = loader.load(f); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

  // céu: Via Láctea
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), new THREE.MeshBasicMaterial({ map: tex('stars_milky_way.jpg'), side: THREE.BackSide, color: 0x8a8a8a, depthWrite: false }));
  scene.add(sky);

  // Sol: textura animada com escurecimento de borda; brilho real vem do bloom
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex('sun.jpg') }, t: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; uniform float t; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vec2 w = vec2(sin(vUv.y*40.+t*.6)*.0025, cos(vUv.x*60.+t*.5)*.0025);
        vec3 a = texture2D(map, vUv + w + vec2(t*.004,0.)).rgb;
        vec3 b = texture2D(map, vUv*1.7 - w + vec2(-t*.003,0.)).rgb;
        vec3 c = mix(a, b, .35);
        float mu = clamp(dot(vN, vV), 0., 1.);
        float limb = pow(mu, .45);
        vec3 col = c * vec3(1.9, 1.35, .75) * (.55 + .75*limb);
        col += vec3(1., .55, .15) * pow(1.-mu, 3.) * .9;
        gl_FragColor = vec4(col * 1.12, 1.);
      }`
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5.2, 96, 96), sunMat);
  scene.add(sun);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(.18, 'rgba(255,190,90,.55)');
    gr.addColorStop(.45, 'rgba(255,120,30,.14)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.set(22, 22, 1); scene.add(corona);

  const sunLight = new THREE.PointLight(0xfff1dc, 4.2, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x6070a0, .06));

  // atmosfera (brilho de borda)
  const atmosphere = (r, color, power = 3, k = 1) => new THREE.Mesh(new THREE.SphereGeometry(r, 64, 64), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, k: { value: k } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 c; uniform float p; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(vN,vV)),p); gl_FragColor=vec4(c*f*k,f); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
  }));

  // anéis com UV radial (a textura é uma faixa: centro → borda)
  function ringMesh(inner, outer, map, alphaMap, opacity = 1) {
    const geo = new THREE.RingGeometry(inner, outer, 256, 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), .5); }
    const mat = new THREE.MeshStandardMaterial({ map, alphaMap, transparent: true, opacity, side: THREE.DoubleSide, roughness: 1, metalness: 0, depthWrite: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; return m;
  }

  const ORBIT_MAT = new THREE.LineBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: .13, depthWrite: false });
  const planets = SYSTEM.map((s, i) => {
    const pivot = new THREE.Object3D(); scene.add(pivot);
    const body = new THREE.Object3D(); pivot.add(body);           // posição na órbita
    const axis = new THREE.Object3D(); axis.rotation.z = s.tilt; body.add(axis); // inclinação do eixo
    const seg = s.r > 2 ? 128 : 96;
    const mat = new THREE.MeshStandardMaterial({ map: tex(s.tex), roughness: 1, metalness: 0 });
    s.r *= 1.35;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(s.r, seg, seg), mat);
    axis.add(mesh);

    if (s.key === 'earth') {
      mat.emissiveMap = tex('earth_nightmap.jpg'); mat.emissive = new THREE.Color(0xffc68a);
      // o brilho do lado diurno esconde as luzes; no lado escuro, elas aparecem
      mat.emissiveIntensity = .55;
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(s.r * 1.012, 96, 96), new THREE.MeshStandardMaterial({ alphaMap: tex('earth_clouds.jpg', false), color: 0xffffff, transparent: true, depthWrite: false, roughness: 1 }));
      axis.add(clouds); mesh.userData.clouds = clouds;
      axis.add(atmosphere(s.r * 1.06, 0x4aa8ff, 2.6, 1.25));
      const moonPivot = new THREE.Object3D(); body.add(moonPivot);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(.27, 64, 64), new THREE.MeshStandardMaterial({ map: tex('moon.jpg'), roughness: 1 }));
      moon.position.set(2.4, 0, 0); moonPivot.rotation.z = .09; moonPivot.add(moon); mesh.userData.moonPivot = moonPivot;
    }
    if (s.key === 'venus') axis.add(atmosphere(s.r * 1.05, 0xffd29a, 3, .8));
    if (s.key === 'mars') axis.add(atmosphere(s.r * 1.04, 0xff8a5a, 3.5, .45));
    if (s.key === 'uranus') axis.add(atmosphere(s.r * 1.05, 0x9ff2ff, 3, .7));
    if (s.key === 'neptune') axis.add(atmosphere(s.r * 1.05, 0x5c86ff, 3, .8));
    if (s.key === 'saturn') {
      const ringTex = tex('saturn_ring_alpha.png');
      const ring = ringMesh(s.r * 1.24, s.r * 2.3, ringTex, ringTex, 1);
      ring.material.color = new THREE.Color(0xf3dfc0);
      axis.add(ring);
    }
    if (s.key === 'uranus') {
      const ring = ringMesh(s.r * 1.6, s.r * 2.0, null, null, .12); ring.material.color = new THREE.Color(0xbfefff); axis.add(ring);
    }

    const orbitLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, s.orbit, s.orbit).getPoints(256)), ORBIT_MAT.clone());
    orbitLine.rotation.x = Math.PI / 2; scene.add(orbitLine);

    const sel = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sel.scale.set(s.r * 5, s.r * 5, 1); body.add(sel);
    mesh.userData.index = i;
    return { ...s, pivot, body, axis, mesh, orbitLine, sel, angle: i * 2.1 + .6, speed: .9 / Math.pow(s.orbit / 6, 1.5) };
  });

  // pós-processamento: bloom só no que é muito brilhante (o Sol)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .6, .45, .92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // interação
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, selected = -1, paused = false, hover = -1;
  const meshes = planets.map(p => p.mesh);
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (hit) return hit.object.userData.index;
    // toque generoso: planeta mais próximo do dedo na tela
    let best = -1, bd = 1e9; const v = new THREE.Vector3();
    planets.forEach((p, i) => { p.body.getWorldPosition(v); v.project(camera); const d = Math.hypot(v.x - ndc.x, v.y - ndc.y); if (v.z < 1 && d < bd) { bd = d; best = i; } });
    return bd < .07 ? best : -1;
  }
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; });
  el.addEventListener('pointerup', e => {
    if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved < 6) { const i = pick(e); if (i >= 0) { focus(i); onSelect(i); } }
  });
  el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; hover = pick(e); el.style.cursor = hover >= 0 ? 'pointer' : ''; });

  const tmp = new THREE.Vector3();
  let wantDist = null;
  function focus(i) { selected = i; wantDist = planets[i].r * 5.5 + 3; controls.autoRotate = false; }
  function reset() { selected = -1; wantDist = null; controls.target.set(0, 0, 0); camera.position.copy(HOME); controls.autoRotate = !reduced; controls.update(); }
  function zoom(f) {
    const off = camera.position.clone().sub(controls.target);
    const d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setLength(d)); wantDist = null;
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.fov = w < 640 ? 60 : 45; camera.updateProjectionMatrix();
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
      const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime, k = reduced ? .2 : 1;
      sunMat.uniforms.t.value = t * k;
      sun.rotation.y += dt * .03 * k;
      corona.material.opacity = .55 + Math.sin(t * 1.3) * .05;
      planets.forEach((p, i) => {
        if (!paused) p.angle += p.speed * dt * k * .35;
        p.body.position.set(Math.cos(p.angle) * p.orbit, 0, -Math.sin(p.angle) * p.orbit);
        p.mesh.rotation.y += dt * .25 * p.spin * k;
        if (p.mesh.userData.clouds) p.mesh.userData.clouds.rotation.y += dt * .035 * k;
        if (p.mesh.userData.moonPivot) p.mesh.userData.moonPivot.rotation.y += dt * .5 * k;
        const on = i === selected || i === hover;
        p.sel.material.opacity += ((on ? .35 : 0) - p.sel.material.opacity) * .1;
        p.orbitLine.material.opacity += ((i === selected ? .45 : .13) - p.orbitLine.material.opacity) * .1;
      });
      if (selected >= 0) {
        planets[selected].body.getWorldPosition(tmp);
        controls.target.lerp(tmp, .09);
        if (wantDist) {
          const off = camera.position.clone().sub(controls.target);
          const d = off.length() + (wantDist - off.length()) * .05;
          camera.position.copy(controls.target).add(off.setLength(d));
          if (Math.abs(d - wantDist) < .05) wantDist = null;
        }
      }
      controls.update();
      composer.render();
      requestAnimationFrame(frame);
    });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { clock.getDelta(); loop(); } });
  loop();

  return { focus, reset, zoom, setPaused(v) { paused = v; } };
}
