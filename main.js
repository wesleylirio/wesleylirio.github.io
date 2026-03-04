(function () {
  const doc = document.documentElement;
  const langToggle = document.getElementById('langToggle');
  const yearNode = document.getElementById('year');

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  function initHeroWebGLShader() {
    const hero = document.querySelector('.hero');
    if (!hero) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'shader-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });

    if (!gl) {
      canvas.remove();
      return;
    }

    const vertexSource = [
      'attribute vec2 a_position;',
      'void main() {',
      '  gl_Position = vec4(a_position, 0.0, 1.0);',
      '}'
    ].join('\n');

    const fragmentSource = [
      'precision mediump float;',
      'uniform vec2 u_resolution;',
      'uniform float u_time;',
      'uniform vec2 u_center;',
      '',
      'float hash(vec2 p) {',
      '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
      '}',
      '',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p);',
      '  vec2 f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  float a = hash(i);',
      '  float b = hash(i + vec2(1.0, 0.0));',
      '  float c = hash(i + vec2(0.0, 1.0));',
      '  float d = hash(i + vec2(1.0, 1.0));',
      '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
      '}',
      '',
      'void main() {',
      '  vec2 uv = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - (gl_FragCoord.y / u_resolution.y));',
      '  vec2 p = uv - u_center;',
      '  p.x *= u_resolution.x / u_resolution.y;',
      '',
      '  float d = length(p);',
      '  float ring = sin(d * 44.0 - u_time * 3.9);',
      '  float ripple = ring * exp(-d * 3.1);',
      '',
      '  float turbulence = noise(uv * 6.4 + vec2(u_time * 0.19, -u_time * 0.12));',
      '  float drift = noise(uv * 13.5 + vec2(-u_time * 0.16, u_time * 0.1));',
      '  float sheet = noise(uv * 3.6 + vec2(u_time * 0.09, u_time * 0.07));',
      '  float field = ripple + (turbulence - 0.5) * 0.35 + (drift - 0.5) * 0.2;',
      '  float filament = pow(abs(sin(field * 7.0 + u_time * 1.8)), 2.8);',
      '  float core = exp(-d * 5.4);',
      '',
      '  float ambient = (turbulence * 0.22 + drift * 0.18 + sheet * 0.28);',
      '  float intensity = 0.62 + ambient + (filament * 0.28 + core * 0.34);',
      '  float blanket = 0.92 + (sheet - 0.5) * 0.08;',
      '  float alpha = clamp(max(blanket, intensity * 0.62), 0.88, 0.98);',
      '',
      '  vec3 plasmaBase = vec3(0.42, 0.08, 0.92);',
      '  vec3 plasmaHot = vec3(0.96, 0.44, 1.0);',
      '  vec3 plasmaCore = vec3(0.72, 0.26, 1.0);',
      '  vec3 color = mix(plasmaBase, plasmaHot, filament);',
      '  color = mix(color, plasmaCore, core);',
      '',
      '  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.98));',
      '}'
    ].join('\n');

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertShader || !fragShader) {
      canvas.remove();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      canvas.remove();
      return;
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.remove();
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
      ]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uCenter = gl.getUniformLocation(program, 'u_center');

    let centerX = 0.5;
    let centerY = 0.36;
    let rafId = 0;

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      gl.viewport(0, 0, width, height);
    }

    function updateUniformAnchors() {
      const rect = hero.getBoundingClientRect();
      centerX = (rect.left + rect.width * 0.5) / window.innerWidth;
      centerY = (rect.top + rect.height * 0.44) / window.innerHeight;
    }

    function render(now) {
      const time = now * 0.001;
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uCenter, centerX, centerY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = window.requestAnimationFrame(render);
    }

    function onViewportChange() {
      resizeCanvas();
      updateUniformAnchors();
    }

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', updateUniformAnchors, { passive: true });
    onViewportChange();
    rafId = window.requestAnimationFrame(render);

    window.addEventListener('beforeunload', function () {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    });
  }

  // Basic i18n placeholder for quick EN/PT toggle.
  const translations = {
    en: {
      brand_sub: 'Creative Technologist',
      nav_work: 'Work',
      nav_about: 'About',
      nav_capabilities: 'Capabilities',
      nav_contact: 'Contact',
      hero_eyebrow: 'Creative Technologist / Interactive Systems Builder',
      hero_title: 'I build interactive systems.',
      hero_cred: 'Interactive systems for events, AI avatars, and automation tools.',
      hero_sub_line_1: 'AI • Real-time 3D • Computer Vision • WebXR',
      hero_sub_line_2: 'From concept to functional prototype.',
      hero_cta: 'View Selected Work',
      work_title: 'Selected Work',
      about_title: 'About',
      about_text_1: 'I am Wesley Lirio, and I build interactive systems using AI, real-time 3D, and computer vision.',
      about_text_2: 'My work focuses on transforming ideas into functional prototypes - systems that can be tested, demonstrated, and iterated quickly. I combine emerging technologies with practical execution, turning concepts into usable products.',
      about_text_3: "I've worked across event activations, AI-driven avatars, and automation tools, always focusing on practical implementation and rapid iteration.",
      about_text_4: "I'm driven by curiosity, execution, and the challenge of making complex technology feel simple and usable.",
      cap_title: 'Capabilities',
      cap_1: 'Interactive Systems Development',
      cap_2: 'AI Integration & Prototyping',
      cap_3: 'Real-Time 3D & WebXR',
      cap_4: 'Event & Activation Technology',
      cap_5: 'Technical Prototyping for Innovation',
      tools_line: 'Tools & Technologies: Three.js, WebGL, WebXR, Node.js, LLM APIs, MediaPipe, Electron, Git, REST APIs.',
      contact_title: 'Contact',
      contact_text: 'Open to opportunities in product development, innovation teams, and interactive systems.'
    },
    pt: {
      brand_sub: 'Tecnologista Criativo',
      nav_work: 'Trabalhos',
      nav_about: 'Sobre',
      nav_capabilities: 'Capacidades',
      nav_contact: 'Contato',
      hero_eyebrow: 'Creative Technologist / Interactive Systems Builder',
      hero_title: 'Eu construo sistemas interativos.',
      hero_cred: 'Sistemas interativos para eventos, avatares de IA e ferramentas de automacao.',
      hero_sub_line_1: 'IA • 3D em tempo real • Visao computacional • WebXR',
      hero_sub_line_2: 'Do conceito ao prototipo funcional.',
      hero_cta: 'Ver trabalhos selecionados',
      work_title: 'Trabalhos Selecionados',
      about_title: 'Sobre',
      about_text_1: 'Eu sou Wesley Lirio e construo sistemas interativos usando IA, 3D em tempo real e visao computacional.',
      about_text_2: 'Meu foco e transformar ideias em prototipos funcionais - sistemas que podem ser testados, demonstrados e iterados rapidamente.',
      about_text_3: 'Tenho atuado com ativacoes para eventos, avatares com IA e ferramentas de automacao, com foco em implementacao pratica e iteracao rapida.',
      about_text_4: 'Sou movido por curiosidade, execucao e pelo desafio de tornar tecnologia complexa simples e utilizavel.',
      cap_title: 'Capacidades',
      cap_1: 'Desenvolvimento de Sistemas Interativos',
      cap_2: 'Integracao e Prototipacao com IA',
      cap_3: '3D em Tempo Real e WebXR',
      cap_4: 'Tecnologia para Eventos e Ativacoes',
      cap_5: 'Prototipacao Tecnica para Inovacao',
      tools_line: 'Ferramentas e Tecnologias: Three.js, WebGL, WebXR, Node.js, APIs de LLM, MediaPipe, Electron, Git, REST APIs.',
      contact_title: 'Contato',
      contact_text: 'Aberto a oportunidades em desenvolvimento de produtos, times de inovacao e sistemas interativos.'
    }
  };

  function setLanguage(lang) {
    const current = translations[lang] ? lang : 'en';
    doc.setAttribute('data-lang', current);

    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      const key = node.getAttribute('data-i18n');
      const value = translations[current][key];
      if (value) {
        node.textContent = value;
      }
    });

    if (langToggle) {
      const isPt = current === 'pt';
      langToggle.setAttribute('aria-pressed', String(isPt));
      langToggle.textContent = isPt ? 'PT | EN' : 'EN | PT';
    }

    try {
      localStorage.setItem('portfolio-lang', current);
    } catch (err) {
      // Ignore localStorage failures.
    }
  }

  if (langToggle) {
    langToggle.addEventListener('click', function () {
      const nextLang = doc.getAttribute('data-lang') === 'pt' ? 'en' : 'pt';
      setLanguage(nextLang);
    });

    const savedLang = (function () {
      try {
        return localStorage.getItem('portfolio-lang');
      } catch (err) {
        return null;
      }
    })();

    setLanguage(savedLang || 'en');
  }

  // Enhanced anchor scrolling with sticky-header compensation.
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') {
        return;
      }

      const target = document.querySelector(targetId);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', targetId);
    });
  });

  function isMobileLikeViewport() {
    return window.matchMedia('(max-width: 720px)').matches || window.matchMedia('(hover: none)').matches;
  }

  document.querySelectorAll('.work-card').forEach(function (card) {
    const mediaWrap = card.querySelector('.media-wrap');
    const img = card.querySelector('img');
    const video = card.querySelector('video');
    if (!mediaWrap || !img || !video) {
      return;
    }

    function safePlayPreview() {
      if (isMobileLikeViewport()) {
        return;
      }
      video.play().then(function () {
        card.classList.add('is-previewing');
      }).catch(function () {
        card.classList.remove('is-previewing');
      });
    }

    function stopPreview() {
      card.classList.remove('is-previewing');
      try {
        video.pause();
        video.currentTime = 0;
      } catch (err) {
        // no-op
      }
    }

    card.addEventListener('mouseenter', safePlayPreview);
    card.addEventListener('mouseleave', stopPreview);
    card.addEventListener('focusin', safePlayPreview);
    card.addEventListener('focusout', stopPreview);

    // If media cannot load, keep fallback gradient and image state.
    img.addEventListener('error', function () {
      img.style.display = 'none';
    });

    video.addEventListener('error', function () {
      stopPreview();
      video.style.display = 'none';
    });
  });

  // Project page video fallback placeholder.
  document.querySelectorAll('.project-block video').forEach(function (video) {
    const placeholder = video.parentElement ? video.parentElement.querySelector('.video-placeholder') : null;
    if (!placeholder) {
      return;
    }

    video.addEventListener('loadeddata', function () {
      placeholder.classList.remove('is-visible');
    });

    video.addEventListener('error', function () {
      video.style.display = 'none';
      placeholder.classList.add('is-visible');
    });
  });

  initHeroWebGLShader();
})();
