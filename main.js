(function () {
  const doc = document.documentElement;
  const langToggle = document.getElementById('langToggle');
  const yearNode = document.getElementById('year');

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
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
})();


c88e7e37-c849-4793-a401-f58c8615e4c7
