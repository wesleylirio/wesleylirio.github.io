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
      'uniform vec3 u_from_a;',
      'uniform vec3 u_from_b;',
      'uniform vec3 u_from_c;',
      'uniform vec3 u_to_a;',
      'uniform vec3 u_to_b;',
      'uniform vec3 u_to_c;',
      'uniform float u_wave_progress;',
      'uniform float u_wave_direction;',
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
      '  float t = clamp(u_wave_progress, 0.0, 1.0);',
      '  float radius = u_wave_direction > 0.0 ? mix(0.0, 1.85, t) : mix(1.85, 0.0, t);',
      '  float edge = 0.16;',
      '  float morphOut = 1.0 - smoothstep(radius - edge, radius + edge, d);',
      '  float morphIn = smoothstep(radius - edge, radius + edge, d);',
      '  float morph = u_wave_direction > 0.0 ? morphOut : morphIn;',
      '  float waveFront = 1.0 - abs(d - radius) / (edge * 1.4);',
      '  waveFront = clamp(waveFront, 0.0, 1.0);',
      '',
      '  vec3 plasmaBase = mix(u_from_a, u_to_a, morph);',
      '  vec3 plasmaHot = mix(u_from_b, u_to_b, morph);',
      '  vec3 plasmaCore = mix(u_from_c, u_to_c, morph);',
      '  plasmaHot = mix(plasmaHot, u_to_b, waveFront * 0.24);',
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
    const uFromA = gl.getUniformLocation(program, 'u_from_a');
    const uFromB = gl.getUniformLocation(program, 'u_from_b');
    const uFromC = gl.getUniformLocation(program, 'u_from_c');
    const uToA = gl.getUniformLocation(program, 'u_to_a');
    const uToB = gl.getUniformLocation(program, 'u_to_b');
    const uToC = gl.getUniformLocation(program, 'u_to_c');
    const uWaveProgress = gl.getUniformLocation(program, 'u_wave_progress');
    const uWaveDirection = gl.getUniformLocation(program, 'u_wave_direction');

    let centerX = 0.5;
    let centerY = 0.36;
    let rafId = 0;
    const navEntry = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    const isRestoreNavigation = !!(navEntry && (navEntry.type === 'reload' || navEntry.type === 'back_forward'));
    const storageKeyScrollY = 'plasma-last-scroll-y';

    function hexToRgb01(hex) {
      const clean = hex.replace('#', '');
      const full = clean.length === 3
        ? clean.split('').map(function (ch) { return ch + ch; }).join('')
        : clean;
      const num = parseInt(full, 16);
      return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      ];
    }

    function lerp(from, to, t) {
      return from + (to - from) * t;
    }

    function blendColor(c1, c2, t) {
      return [
        lerp(c1[0], c2[0], t),
        lerp(c1[1], c2[1], t),
        lerp(c1[2], c2[2], t)
      ];
    }

    const colorPhases = [
      {
        a: hexToRgb01('#A83A10'),
        b: hexToRgb01('#FF7E1E'),
        c: hexToRgb01('#C94D14')
      },
      {
        a: hexToRgb01('#09163E'),
        b: hexToRgb01('#1E4D8B'),
        c: hexToRgb01('#123565')
      },
      {
        a: hexToRgb01('#26086D'),
        b: hexToRgb01('#8A36FF'),
        c: hexToRgb01('#5A1FD4')
      }
    ];
    const phaseOrange = 0;
    const phaseBlue = 1;
    const phasePurple = 2;

    let cycleActivated = false;
    let transitionActive = false;
    let currentPhase = 0;
    let fromPhase = 0;
    let targetPhase = 0;
    let transitionProgress = 1;
    const scrollPixelsForFullTransition = 980;
    let scrollIntentDirection = 1;
    let transitionDirection = 1;
    let touchLastY = null;

    function readStoredScrollY() {
      try {
        const raw = sessionStorage.getItem(storageKeyScrollY);
        const value = raw ? Number(raw) : 0;
        return Number.isFinite(value) ? value : 0;
      } catch (err) {
        return 0;
      }
    }

    function writeStoredScrollY(value) {
      try {
        sessionStorage.setItem(storageKeyScrollY, String(Math.max(0, Math.round(value))));
      } catch (err) {
        // Ignore storage failures.
      }
    }

    function setScrollIntentFromDelta(delta) {
      if (delta > 0.2) {
        scrollIntentDirection = 1;
      } else if (delta < -0.2) {
        scrollIntentDirection = -1;
      }
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getPhaseColorSet(phaseIndex, time) {
      const phase = colorPhases[phaseIndex];
      const breatheA = (Math.sin(time * 0.66 + phaseIndex) + 1) * 0.5;
      const breatheB = (Math.sin(time * 1.08 + phaseIndex * 1.7) + 1) * 0.5;
      const breatheC = (Math.sin(time * 0.84 + phaseIndex * 2.1) + 1) * 0.5;
      const lift = 0.06;
      return {
        a: blendColor(phase.a, [1, 1, 1], breatheA * lift),
        b: blendColor(phase.b, [1, 1, 1], breatheB * (lift + 0.04)),
        c: blendColor(phase.c, [1, 1, 1], breatheC * (lift + 0.02))
      };
    }

    function targetPhaseForDirection(direction) {
      return direction > 0 ? phaseBlue : phasePurple;
    }

    function scheduleTransition(next, direction) {
      transitionActive = true;
      fromPhase = currentPhase;
      targetPhase = next;
      transitionDirection = direction > 0 ? 1 : -1;
      transitionProgress = 0;
    }

    function finalizeTransition() {
      currentPhase = targetPhase;
      transitionActive = false;
      transitionProgress = 1;
    }

    function beginTransitionFromDirection(direction) {
      const dir = direction > 0 ? 1 : -1;
      const next = targetPhaseForDirection(dir);
      if (currentPhase === next) {
        return;
      }
      scheduleTransition(next, dir);
    }

    function advanceByScrollDelta(delta) {
      if (Math.abs(delta) < 0.2) {
        return;
      }

      setScrollIntentFromDelta(delta);
      const direction = delta > 0 ? 1 : -1;

      if (!cycleActivated) {
        if (direction < 0) {
          return;
        }
        cycleActivated = true;
        beginTransitionFromDirection(1);
      }

      if (!transitionActive) {
        beginTransitionFromDirection(direction);
        if (!transitionActive) {
          return;
        }
      } else if (direction !== transitionDirection) {
        currentPhase = transitionProgress >= 0.5 ? targetPhase : fromPhase;
        beginTransitionFromDirection(direction);
        if (!transitionActive) {
          return;
        }
      }

      transitionProgress = clamp(
        transitionProgress + Math.abs(delta) / scrollPixelsForFullTransition,
        0,
        1
      );

      if (transitionProgress >= 1) {
        finalizeTransition();
      }
    }

    function activateCycle() {
      if (cycleActivated) {
        return;
      }
      cycleActivated = true;
      beginTransitionFromDirection(1);
    }

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
      const rawX = (rect.left + rect.width * 0.5) / window.innerWidth;
      const rawY = (rect.top + rect.height * 0.44) / window.innerHeight;
      // Keep original dynamic center behavior tied to hero; only ignore extreme off-screen values.
      if (rawX > -0.6 && rawX < 1.6) {
        centerX = rawX;
      }
      if (rawY > -0.6 && rawY < 1.6) {
        centerY = rawY;
      }
    }

    let lastScrollY = window.scrollY;

    function applyRestoredScrollState() {
      const currentY = window.scrollY;
      const storedY = readStoredScrollY();
      const assumedY = (isRestoreNavigation && currentY <= 1 && storedY > 1) ? storedY : currentY;
      const atTop = assumedY <= 1;

      if (atTop) {
        cycleActivated = false;
        transitionActive = false;
        currentPhase = phaseOrange;
        fromPhase = phaseOrange;
        targetPhase = phaseOrange;
        transitionProgress = 1;
        transitionDirection = 1;
      } else {
        // If page opens/restores below top, start from scrolled state instead of hero orange.
        cycleActivated = true;
        transitionActive = false;
        currentPhase = phaseBlue;
        fromPhase = phaseBlue;
        targetPhase = phaseBlue;
        transitionProgress = 1;
        transitionDirection = 1;
      }

      lastScrollY = assumedY;
      writeStoredScrollY(assumedY);
      updateUniformAnchors();
    }

    function syncShaderToScroll() {
      const currentY = window.scrollY;
      writeStoredScrollY(currentY);
      if (!cycleActivated && currentY > 1) {
        applyRestoredScrollState();
      }
      if (Math.abs(currentY - lastScrollY) < 0.5) {
        updateUniformAnchors();
        return;
      }

      updateUniformAnchors();
      const delta = currentY - lastScrollY;
      advanceByScrollDelta(delta);

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // Avoid half-open transition fronts when browser restores at boundaries.
      if (transitionActive && currentY <= 0.5 && transitionDirection < 0) {
        finalizeTransition();
      } else if (transitionActive && currentY >= maxScroll - 0.5 && transitionDirection > 0) {
        finalizeTransition();
      }

      lastScrollY = currentY;
    }

    function render(now) {
      const time = now * 0.001;
      // Captures restored/programmatic scroll positions even without user wheel/touch input.
      syncShaderToScroll();
      const waveProgress = transitionActive ? transitionProgress : 1;

      const fromColors = getPhaseColorSet(transitionActive ? fromPhase : currentPhase, time);
      const toColors = getPhaseColorSet(transitionActive ? targetPhase : currentPhase, time);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uCenter, centerX, centerY);
      gl.uniform3f(uFromA, fromColors.a[0], fromColors.a[1], fromColors.a[2]);
      gl.uniform3f(uFromB, fromColors.b[0], fromColors.b[1], fromColors.b[2]);
      gl.uniform3f(uFromC, fromColors.c[0], fromColors.c[1], fromColors.c[2]);
      gl.uniform3f(uToA, toColors.a[0], toColors.a[1], toColors.a[2]);
      gl.uniform3f(uToB, toColors.b[0], toColors.b[1], toColors.b[2]);
      gl.uniform3f(uToC, toColors.c[0], toColors.c[1], toColors.c[2]);
      gl.uniform1f(uWaveProgress, waveProgress);
      gl.uniform1f(uWaveDirection, transitionDirection);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = window.requestAnimationFrame(render);
    }

    function onViewportChange() {
      resizeCanvas();
      updateUniformAnchors();
    }

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', function () {
      syncShaderToScroll();
    }, { passive: true });
    window.addEventListener('wheel', function (event) {
      setScrollIntentFromDelta(event.deltaY);
      if (!cycleActivated && event.deltaY > 0.2) {
        activateCycle();
      }
    }, { passive: true });

    window.addEventListener('touchstart', function (event) {
      const touch = event.touches && event.touches[0];
      touchLastY = touch ? touch.clientY : null;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      const touch = event.touches && event.touches[0];
      if (!touch || touchLastY === null) {
        return;
      }
      const deltaY = touchLastY - touch.clientY;
      advanceByScrollDelta(deltaY);
      touchLastY = touch.clientY;
    }, { passive: true });

    window.addEventListener('touchend', function () {
      touchLastY = null;
    }, { passive: true });

    // Browser scroll-restoration can happen after script init; re-sync a few times.
    window.addEventListener('pageshow', function () {
      applyRestoredScrollState();
      syncShaderToScroll();
      window.setTimeout(applyRestoredScrollState, 80);
      window.setTimeout(syncShaderToScroll, 100);
      window.setTimeout(syncShaderToScroll, 260);
    });
    window.addEventListener('load', function () {
      applyRestoredScrollState();
      syncShaderToScroll();
      window.setTimeout(applyRestoredScrollState, 120);
      window.setTimeout(syncShaderToScroll, 140);
      window.setTimeout(applyRestoredScrollState, 420);
      window.setTimeout(syncShaderToScroll, 460);
    });
    onViewportChange();
    applyRestoredScrollState();
    rafId = window.requestAnimationFrame(render);

    window.addEventListener('beforeunload', function () {
      writeStoredScrollY(window.scrollY);
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
      nav_contact: 'Contact',
      hero_eyebrow: 'Creative Technologist',
      hero_title: 'I build interactive systems.',
      hero_sub_line_1: 'AI • WebGL • Computer Vision • WebXR • Avatars',
      hero_sub_line_2: '',
      hero_cta: 'View Selected Work',
      work_title: 'Selected Work',
      work_preview: 'Preview',
      work_open: 'Open',
      work_case_link: 'View case study',
      work_1_title: 'Interactive Computer Vision Activation',
      work_1_b1: 'Head-tracking interaction',
      work_1_b2: 'Ranking + QR redirection',
      work_1_b3: 'Offline-ready executable build',
      work_2_title: '3D AI Conversational Avatar',
      work_2_b1: 'Prompt selection system',
      work_2_b2: 'LLM + TTS + lip-sync',
      work_2_b3: 'Embeddable widget + WebXR',
      work_3_title: 'Compliance Automation for Bids',
      work_3_b1: 'Technical requirement extraction',
      work_3_b2: 'Compliance analysis and rule matching',
      work_3_b3: 'Structured .xlsx export',
      work_tag_events: 'Events',
      work_tag_game: 'Game',
      work_tag_full_stack: 'Full-stack',
      work_tag_automation: 'Automation',
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
      contact_text: 'Open to opportunities in product development, innovation teams, and interactive systems.',
      activation_back: '← Back to selected work',
      activation_title: 'Interactive Computer Vision Activation',
      activation_summary_title: 'Summary',
      activation_summary_text: 'Interactive installation concept built for high-throughput event environments where visitors engage through body/head movement and receive measurable outcomes.',
      activation_context_title: 'Context',
      activation_context_text: 'The project targeted live activations that require low setup friction, visual impact, and robust performance even when internet connectivity is unstable.',
      activation_problem_title: 'Problem',
      activation_problem_text: 'Most event demos are passive or hard to scale. The challenge was creating a quick interaction loop with leaderboard mechanics and post-experience redirection.',
      activation_solution_title: 'Solution',
      activation_solution_text: 'Developed a computer vision game with head-tracking interaction, ranking feedback, and QR handoff to continue the user journey on mobile.',
      activation_approach_title: 'Technical Approach',
      activation_approach_text: 'Optimized CV pipelines for real-time response and packaged the experience as an executable workflow for reliable offline operation in event venues.',
      activation_outcome_title: 'Outcome',
      activation_outcome_text: 'Functional prototype validated for high-throughput live activation, with repeatable interaction loops and measurable tracking points.',
      activation_stack_title: 'Tech Stack',
      avatar_back: '← Back to selected work',
      avatar_title: '3D AI Conversational Avatar',
      avatar_summary_title: 'Summary',
      avatar_summary_text: 'Prototype focused on natural interactions through an expressive 3D avatar that responds in real time and can be embedded across channels.',
      avatar_context_title: 'Context',
      avatar_context_text: 'The objective was to bridge conversational AI and visual identity by creating an avatar interface suitable for customer engagement and demos.',
      avatar_problem_title: 'Problem',
      avatar_problem_text: 'Text-only assistants lack emotional presence and can feel detached in experience-driven products. Real-time rendering and lip-sync are often fragile.',
      avatar_solution_title: 'Solution',
      avatar_solution_text: 'Implemented a full interaction pipeline combining LLM responses, TTS output, and lip-sync animation in a performant WebGL scene.',
      avatar_approach_title: 'Technical Approach',
      avatar_approach_text: 'Built modular architecture to support widget embedding, avatar state control, and future WebXR extension without changing core logic.',
      avatar_outcome_title: 'Outcome',
      avatar_outcome_text: 'Delivered a demonstrable AI avatar prototype with smooth response flow and reusable architecture for future productization.',
      avatar_stack_title: 'Tech Stack',
      tender_back: '← Back to selected work',
      tender_title: 'Compliance Automation for Bids',
      tender_summary_title: 'Summary',
      tender_summary_text: 'Functional prototype focused on automating technical requirement compliance analysis in bid documents.',
      tender_context_title: 'Context',
      tender_context_text: 'Bid evaluation workflows demand extensive manual review of technical criteria, compliance rules, and supporting evidence.',
      tender_problem_title: 'Problem',
      tender_problem_text: 'Manual requirement analysis is repetitive, time-consuming, and prone to inconsistency when volume increases.',
      tender_solution_title: 'Solution',
      tender_solution_text: 'Implemented an AI-assisted workflow to extract requirements, run compliance checks, and prepare structured outputs for decision support.',
      tender_approach_title: 'Technical Approach',
      tender_approach_text: 'Combined document parsing, LLM-driven extraction, validation rules, and spreadsheet generation for auditable analysis flows.',
      tender_outcome_title: 'Outcome',
      tender_outcome_text: 'Delivered a functional prototype that reduced manual effort and increased consistency in requirement compliance analysis.',
      tender_stack_title: 'Tech Stack',
      tender_slide_1: 'Dashboard for bid uploads and access to analysis history.',
      tender_slide_2: 'Interface for selecting the items to extract for analysis.',
      tender_slide_3: 'Extracted item components.',
      tender_slide_4: 'Example of evidence-based analysis for the extracted item.',
      tender_slide_5: 'Chat-with-catalog system UI (AI trained on the company catalog to answer questions).'
    },
    pt: {
      brand_sub: 'Tecnologista Criativo',
      nav_work: 'Trabalhos',
      nav_about: 'Sobre',
      nav_contact: 'Contato',
      hero_eyebrow: 'Creative Technologist',
      hero_title: 'Eu construo sistemas interativos.',
      hero_sub_line_1: 'IA • WebGL • Visao computacional • WebXR • Avatares',
      hero_sub_line_2: '',
      hero_cta: 'Ver trabalhos selecionados',
      work_title: 'Trabalhos Selecionados',
      work_preview: 'Preview',
      work_open: 'Abrir',
      work_case_link: 'Ver case study',
      work_1_title: 'Ativacao Interativa com Visao Computacional',
      work_1_b1: 'Interacao com rastreamento de cabeca',
      work_1_b2: 'Ranking + redirecionamento por QR',
      work_1_b3: 'Build executavel pronto para offline',
      work_2_title: 'Avatar Conversacional 3D com IA',
      work_2_b1: 'Sistema de selecao de prompt',
      work_2_b2: 'LLM + TTS + lip-sync',
      work_2_b3: 'Widget incorporavel + WebXR',
      work_3_title: 'Automacao para Licitacoes',
      work_3_b1: 'Extracao de requisitos tecnicos',
      work_3_b2: 'Analise de conformidade e regras',
      work_3_b3: 'Exportacao estruturada em .xlsx',
      work_tag_events: 'Eventos',
      work_tag_game: 'Jogo',
      work_tag_full_stack: 'Full-stack',
      work_tag_automation: 'Automacao',
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
      contact_text: 'Aberto a oportunidades em desenvolvimento de produtos, times de inovacao e sistemas interativos.',
      activation_back: '← Voltar para trabalhos selecionados',
      activation_title: 'Ativacao Interativa com Visao Computacional',
      activation_summary_title: 'Resumo',
      activation_summary_text: 'Conceito de instalacao interativa para ambientes de eventos com alto fluxo, em que visitantes interagem com movimentos de cabeca/corpo e geram resultados mensuraveis.',
      activation_context_title: 'Contexto',
      activation_context_text: 'O projeto foi pensado para ativacoes ao vivo com baixo atrito de setup, impacto visual e performance robusta mesmo com internet instavel.',
      activation_problem_title: 'Problema',
      activation_problem_text: 'Muitas experiencias em eventos sao passivas ou dificeis de escalar. O desafio foi criar um loop rapido de interacao com ranking e redirecionamento pos-experiencia.',
      activation_solution_title: 'Solucao',
      activation_solution_text: 'Foi desenvolvido um jogo com visao computacional, interacao por rastreamento de cabeca, feedback de ranking e handoff via QR para continuar a jornada no mobile.',
      activation_approach_title: 'Abordagem Tecnica',
      activation_approach_text: 'Pipelines de CV foram otimizados para resposta em tempo real e a experiencia foi empacotada em fluxo executavel para operacao offline confiavel em eventos.',
      activation_outcome_title: 'Resultado',
      activation_outcome_text: 'Prototipo funcional validado para ativacao ao vivo de alto fluxo, com loops repetiveis de interacao e pontos de medicao.',
      activation_stack_title: 'Stack Tecnica',
      avatar_back: '← Voltar para trabalhos selecionados',
      avatar_title: 'Avatar Conversacional 3D com IA',
      avatar_summary_title: 'Resumo',
      avatar_summary_text: 'Prototipo focado em interacoes naturais com um avatar 3D expressivo que responde em tempo real e pode ser incorporado em diferentes canais.',
      avatar_context_title: 'Contexto',
      avatar_context_text: 'O objetivo foi conectar IA conversacional e identidade visual criando uma interface com avatar adequada para engajamento e demonstracoes.',
      avatar_problem_title: 'Problema',
      avatar_problem_text: 'Assistentes apenas em texto perdem presenca emocional e podem parecer frios em produtos guiados por experiencia. Renderizacao em tempo real e lip-sync costumam ser frageis.',
      avatar_solution_title: 'Solucao',
      avatar_solution_text: 'Foi implementado um pipeline completo combinando respostas de LLM, saida em TTS e animacao de lip-sync em uma cena WebGL performatica.',
      avatar_approach_title: 'Abordagem Tecnica',
      avatar_approach_text: 'Arquitetura modular para suportar incorporacao via widget, controle de estado do avatar e extensao futura para WebXR sem alterar a logica central.',
      avatar_outcome_title: 'Resultado',
      avatar_outcome_text: 'Foi entregue um prototipo demonstravel de avatar com IA, com fluxo de resposta fluido e arquitetura reutilizavel para evolucao de produto.',
      avatar_stack_title: 'Stack Tecnica',
      tender_back: '← Voltar para trabalhos selecionados',
      tender_title: 'Automacao de Conformidade para Licitacoes',
      tender_summary_title: 'Resumo',
      tender_summary_text: 'Prototipo funcional focado em automatizar a analise de conformidade de requisitos tecnicos em editais.',
      tender_context_title: 'Contexto',
      tender_context_text: 'Fluxos de avaliacao de licitacoes exigem revisao manual extensa de criterios tecnicos, regras de conformidade e evidencias.',
      tender_problem_title: 'Problema',
      tender_problem_text: 'A analise manual de requisitos e repetitiva, demorada e sujeita a inconsistencias quando o volume aumenta.',
      tender_solution_title: 'Solucao',
      tender_solution_text: 'Foi implementado um fluxo com IA para extrair requisitos, executar checagens de conformidade e preparar saidas estruturadas para apoio a decisao.',
      tender_approach_title: 'Abordagem Tecnica',
      tender_approach_text: 'Combinacao de parsing de documentos, extracao via LLM, regras de validacao e geracao de planilhas para fluxos auditaveis.',
      tender_outcome_title: 'Resultado',
      tender_outcome_text: 'Foi entregue um prototipo funcional que reduziu esforco manual e aumentou a consistencia na analise de conformidade.',
      tender_stack_title: 'Stack Tecnica',
      tender_slide_1: 'Dashboard para upload de editais e acesso ao historico de analises.',
      tender_slide_2: 'Interface de selecao de itens a serem extraidos para a analise.',
      tender_slide_3: 'Componentes do item extraidos.',
      tender_slide_4: 'Exemplo de analise comprobatoria do item extraido.',
      tender_slide_5: 'UI do sistema de Chat-Com-Catalogo (IA treinada no catalogo da empresa para responder qualquer duvida).'
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

    document.dispatchEvent(new CustomEvent('portfolio:languagechange', {
      detail: { lang: current }
    }));

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

    function detectBrowserLang() {
      const preferred = (navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language || navigator.userLanguage || 'en']
      ).map(function (item) {
        return String(item || '').toLowerCase();
      });

      const hasPortuguese = preferred.some(function (code) {
        return code.indexOf('pt') === 0;
      });

      return hasPortuguese ? 'pt' : 'en';
    }

    setLanguage(savedLang || detectBrowserLang());
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
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (targetId === '#top') {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        const rect = target.getBoundingClientRect();
        const header = document.querySelector('.site-header');
        const headerOffset = header ? header.getBoundingClientRect().height : 0;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const viewportAvailable = Math.max(1, window.innerHeight - headerOffset);
        const centerOffset = Math.max(0, (viewportAvailable - rect.height) / 2);
        const centeredY = window.scrollY + rect.top - headerOffset - centerOffset;
        const targetY = Math.max(0, Math.min(maxScroll, centeredY));
        window.scrollTo({ top: targetY, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
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

  function initSyncedReels() {
    document.querySelectorAll('[data-sync-reels]').forEach(function (container) {
      const videos = Array.from(container.querySelectorAll('video'));
      if (!videos.length) {
        return;
      }

      const placeholder = container.querySelector('.video-placeholder');
      const loopSeconds = Number(container.getAttribute('data-sync-reels')) || 12;
      const loopMs = Math.max(1, loopSeconds) * 1000;
      let errorCount = 0;

      function playAll() {
        videos.forEach(function (video) {
          video.muted = true;
          video.loop = false;
          video.play().catch(function () {
            // Ignore autoplay policy failures.
          });
        });
      }

      videos.forEach(function (video) {
        video.addEventListener('loadeddata', function () {
          if (placeholder) {
            placeholder.classList.remove('is-visible');
          }
          playAll();
        });

        video.addEventListener('error', function () {
          video.style.display = 'none';
          errorCount += 1;
          if (placeholder && errorCount >= videos.length) {
            placeholder.classList.add('is-visible');
          }
        });
      });

      playAll();

      window.setInterval(function () {
        videos.forEach(function (video) {
          if (video.style.display === 'none') {
            return;
          }
          try {
            video.currentTime = 0;
          } catch (err) {
            // no-op
          }
        });
        playAll();
      }, loopMs);
    });
  }

  function initImageGalleryLightbox() {
    const galleryButtons = Array.from(document.querySelectorAll('[data-image-gallery] .gallery-item'));
    if (!galleryButtons.length) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'gallery-lightbox';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class=\"gallery-lightbox__content\"><img alt=\"Expanded preview\"></div>';
    document.body.appendChild(overlay);

    const imageNode = overlay.querySelector('img');

    function closeOverlay() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      if (imageNode) {
        imageNode.removeAttribute('src');
      }
    }

    function openOverlay(src, altText) {
      if (!imageNode || !src) {
        return;
      }
      imageNode.src = src;
      imageNode.alt = altText || 'Expanded preview';
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
    }

    galleryButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        openOverlay(button.getAttribute('data-gallery-src'), button.getAttribute('data-gallery-alt'));
      });
    });

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeOverlay();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeOverlay();
      }
    });
  }

  function initProjectCarousel() {
    document.querySelectorAll('[data-project-carousel]').forEach(function (carousel) {
      const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
      const imageNode = carousel.querySelector('.project-carousel-image');
      const captionNode = carousel.querySelector('[data-carousel-caption]');
      const indexNode = carousel.querySelector('[data-carousel-index]');
      const prevBtn = carousel.querySelector('[data-carousel-prev]');
      const nextBtn = carousel.querySelector('[data-carousel-next]');
      const placeholder = carousel.querySelector('.video-placeholder');

      if (!slides.length || !imageNode || !captionNode || !indexNode || !prevBtn || !nextBtn) {
        return;
      }

      let currentIndex = 0;

      function getLang() {
        return document.documentElement.getAttribute('data-lang') === 'pt' ? 'pt' : 'en';
      }

      function render() {
        const slide = slides[currentIndex];
        const src = slide.getAttribute('data-src');
        const lang = getLang();
        const altText = slide.getAttribute(lang === 'pt' ? 'data-alt-pt' : 'data-alt-en') || '';
        const captionKey = slide.getAttribute('data-caption-key');
        const captionText = (translations[lang] && captionKey) ? translations[lang][captionKey] : '';

        imageNode.src = src || '';
        imageNode.alt = altText;
        captionNode.textContent = captionText || altText;
        indexNode.textContent = (currentIndex + 1) + ' / ' + slides.length;
      }

      imageNode.addEventListener('error', function () {
        imageNode.style.display = 'none';
        if (placeholder) {
          placeholder.classList.add('is-visible');
        }
      });

      imageNode.addEventListener('load', function () {
        imageNode.style.display = '';
        if (placeholder) {
          placeholder.classList.remove('is-visible');
        }
      });

      prevBtn.addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        render();
      });

      nextBtn.addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % slides.length;
        render();
      });

      document.addEventListener('portfolio:languagechange', render);
      render();
    });
  }

  initSyncedReels();
  initImageGalleryLightbox();
  initProjectCarousel();
  initHeroWebGLShader();
})();

