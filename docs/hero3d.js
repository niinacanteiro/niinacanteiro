// Buraco negro em tempo real (WebGL puro): raios de luz curvados pela gravidade,
// disco de acreção em laranja, amarelo e marrom girando, com efeito Doppler e estrelas lenteadas.
export function initHero(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const fs = `precision highp float;
  uniform vec2 res; uniform float t; uniform vec2 m; uniform vec2 ctr; uniform float zoomK;
  float hash(vec3 p){ p = fract(p*.3183099 + .1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5), b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),
          c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5), d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n2(p); p*=2.03; a*=.5; } return s; }
  vec3 stars(vec3 d){
    vec3 c = vec3(0.);
    for(int i=0;i<2;i++){
      float sc = i==0 ? 140. : 320.;
      vec3 q = d*sc; vec3 id = floor(q); vec3 f = fract(q)-.5;
      float h = hash(id);
      if(h > .985){ float b = smoothstep(.2,.0,length(f)) * (h-.985)*60.; c += b * mix(vec3(1.,.85,.6), vec3(.75,.85,1.), hash(id+3.)); }
    }
    return c;
  }
  void main(){
    vec2 uv = (gl_FragCoord.xy - ctr*res) / res.y;
    // câmera levemente inclinada, acompanha o cursor
    float pitch = .16 + m.y*.06, yaw = m.x*.18;
    vec3 ro = vec3(0., 0., -22.*zoomK);
    vec3 rd = normalize(vec3(uv, 1.55));
    float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
    mat3 rx = mat3(1.,0.,0., 0.,cp,-sp, 0.,sp,cp);
    mat3 ry = mat3(cy,0.,sy, 0.,1.,0., -sy,0.,cy);
    ro = ry*rx*ro; rd = ry*rx*rd;
    vec3 p = ro, v = rd;
    vec3 col = vec3(0.); float alpha = 1.;
    const float RS = 1.;           // raio de Schwarzschild
    bool hole = false;
    for(int i=0;i<150;i++){
      float r = length(p);
      if(r < RS){ hole = true; break; }
      float dt = clamp(r*.06, .03, .6);
      vec3 acc = -1.5*RS * p / (r*r*r) * dot(cross(p,v),cross(p,v)) / (r*r);
      vec3 pn = p + v*dt; v = normalize(v + acc*dt); 
      // cruzou o plano do disco?
      if(p.y*pn.y < 0.){
        vec3 hit = mix(p, pn, p.y/(p.y-pn.y));
        float hr = length(hit.xz);
        if(hr > 2.6 && hr < 11.){
          float ang = atan(hit.z, hit.x);
          float w = 1.2 / pow(hr, 1.5);                // rotação kepleriana
          float a2 = ang + t*w*3.;
          float bands = fbm(vec2(a2*3.5, hr*1.6)) * .8 + fbm(vec2(a2*9., hr*5.))*.5;
          float x = (hr-2.6)/(11.-2.6);
          float temp = pow(1.-x, 1.6);
          vec3 hot = vec3(1., .93, .78), mid = vec3(1., .62, .16), cool = vec3(.45, .2, .06);
          vec3 dc = mix(cool, mid, smoothstep(0.,.55,temp)); dc = mix(dc, hot, smoothstep(.55,1.,temp));
          // Doppler: lado que vem em nossa direção fica mais claro
          vec3 vel = normalize(vec3(-hit.z, 0., hit.x));
          float dop = 1. + .55*dot(vel, -rd);
          float edge = smoothstep(0.,.06,x) * smoothstep(1.,.7,x);
          float dens = edge * (.35 + bands) ;
          vec3 e = dc * dens * dop*dop * (1.6 + 2.2*temp);
          col += e * alpha;
          alpha *= 1. - clamp(dens*.85, 0., .92);
          if(alpha < .02) break;
        }
      }
      p = pn;
      if(r > 60.) break;
    }
    if(!hole) col += stars(v) * alpha * .9;
    // halo de fótons
    float glow = exp(-pow(length(uv)*2.2,2.))*.0;
    col += vec3(1.,.5,.15)*glow;
    col = col / (1. + col);                        // tonemap
    col = pow(col, vec3(.85));
    // vinheta
    vec2 q = gl_FragCoord.xy/res; col *= .55 + .45*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y), .18);
    gl_FragColor = vec4(col, 1.);
  }`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const uRes = U('res'), uT = U('t'), uM = U('m'), uC = U('ctr'), uZ = U('zoomK');

  let scale = .6, w = 0, h = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = Math.max(2, Math.round(r.width * dpr * scale)); h = Math.max(2, Math.round(r.height * dpr * scale));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  }
  new ResizeObserver(resize).observe(canvas); resize();
  addEventListener('pointermove', e => { mouse.tx = (e.clientX / innerWidth - .5) * 2; mouse.ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

  let visible = true, raf = 0, t0 = performance.now(), frames = 0, tAcc = 0, last = t0;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }).observe(canvas);
  function draw(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = now - last; last = now;
    // ajuste automático de resolução para manter a fluidez
    frames++; tAcc += dt;
    if (frames === 40) { const avg = tAcc / frames; if (avg > 24 && scale > .34) { scale *= .8; resize(); } else if (avg < 13 && scale < .85) { scale *= 1.12; resize(); } frames = 0; tAcc = 0; }
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    const wide = canvas.clientWidth > 900;
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uT, reduced ? 0 : (now - t0) / 1000);
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.uniform2f(uC, wide ? .7 : .5, wide ? .5 : .66);
    gl.uniform1f(uZ, wide ? 1. : 1.25);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) raf = requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(draw); } });
  raf = requestAnimationFrame(draw);
  return true;
}
