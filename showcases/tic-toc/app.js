(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('#siteHeader');
  const meter = $('#scrollMeter');
  const watchStage = $('#watchStage');
  const heroSequence = $('.hero-sequence');
  const watchImage = $('img', watchStage);
  const watchXray = $('#watchXray');
  const heroTic = $('#heroTitle span:first-child');
  const heroToc = $('#heroTitle span:last-child');
  const calibreScene = $('#calibre');
  const calibreImage = $('.calibre-image', calibreScene);
  const cinematicTransitions = $$('.cinematic-transition');
  const diameterTransition = $('.transition-domino');
  const diameterStrips = diameterTransition ? $$('.domino-field i', diameterTransition) : [];
  const editorialProjects = $$('.atelier-feature');
  const cinematicTitles = $$('.cinematic-title');
  const wristScene = $('.wrist');
  const explodedScene = $('.exploded');
  const atelierStudio = $('.atelier-studio');
  const atelierPrompter = $('.atelier-prompter', atelierStudio);
  const atelierLines = $$('#atelierStudioTitle > span');
  const lightHeaderSections = $$('[data-header-theme="light"]');
  const dialog = $('#checkoutDialog');
  const checkoutShowcase = $('#checkoutShowcase');
  const checkoutWatch = $('#checkoutWatch');
  const checkoutAngle = $('#checkoutAngle');
  const form = $('#checkoutForm');
  const steps = $$('.checkout-step');
  let activeStep = 1;
  let checkoutRotation = 0;
  let checkoutTilt = 0;
  let showcaseDragging = false;
  let showcasePointerX = 0;
  let showcasePointerY = 0;

  const renderCheckoutWatch = () => {
    const normalized = ((checkoutRotation % 360) + 360) % 360;
    checkoutWatch.style.transform = `rotateZ(${checkoutRotation}deg) rotateX(${checkoutTilt}deg) scale(${1 + Math.abs(checkoutTilt) * .0015})`;
    checkoutAngle.textContent = `${String(Math.round(normalized)).padStart(3, '0')}°`;
  };

  const resetCheckoutWatch = () => {
    checkoutRotation = 0;
    checkoutTilt = 0;
    checkoutWatch.style.transition = 'transform .9s cubic-bezier(.2,.75,.2,1)';
    renderCheckoutWatch();
    setTimeout(() => { checkoutWatch.style.transition = ''; }, 920);
  };

  checkoutShowcase.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    showcaseDragging = true;
    showcasePointerX = event.clientX;
    showcasePointerY = event.clientY;
    checkoutShowcase.setPointerCapture(event.pointerId);
    checkoutShowcase.classList.add('dragging');
  });

  checkoutShowcase.addEventListener('pointermove', (event) => {
    if (!showcaseDragging) return;
    const deltaX = event.clientX - showcasePointerX;
    const deltaY = event.clientY - showcasePointerY;
    showcasePointerX = event.clientX;
    showcasePointerY = event.clientY;
    checkoutRotation += deltaX * .72;
    checkoutTilt = Math.max(-14, Math.min(14, checkoutTilt - deltaY * .13));
    renderCheckoutWatch();
  });

  const releaseCheckoutWatch = () => {
    showcaseDragging = false;
    checkoutShowcase.classList.remove('dragging');
  };

  checkoutShowcase.addEventListener('pointerup', releaseCheckoutWatch);
  checkoutShowcase.addEventListener('pointercancel', releaseCheckoutWatch);
  checkoutShowcase.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { resetCheckoutWatch(); return; }
    if (event.key === 'ArrowLeft') checkoutRotation -= 10;
    if (event.key === 'ArrowRight') checkoutRotation += 10;
    if (event.key === 'ArrowUp') checkoutTilt = Math.min(14, checkoutTilt + 2);
    if (event.key === 'ArrowDown') checkoutTilt = Math.max(-14, checkoutTilt - 2);
    renderCheckoutWatch();
  });
  $('#checkoutResetView').addEventListener('click', resetCheckoutWatch);

  const getConfig = () => {
    const data = new FormData(form);
    return {
      accent: data.get('accent') || 'Champagne',
      strap: data.get('strap') || 'Black alligator',
      engraving: String(data.get('engraving') || '').trim(),
      presentation: data.get('presentation') === 'on',
      payment: data.get('payment') || 'Secure card'
    };
  };

  const saveConfig = () => {
    try { localStorage.setItem('tic-toc-config', JSON.stringify(getConfig())); } catch (_) {}
  };

  const restoreConfig = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('tic-toc-config') || 'null');
      if (!saved) return;
      ['accent', 'strap', 'payment'].forEach((key) => {
        const input = $(`input[name="${key}"][value="${CSS.escape(saved[key] || '')}"]`, form);
        if (input) input.checked = true;
      });
      $('#engraving').value = saved.engraving || '';
      $('input[name="presentation"]', form).checked = Boolean(saved.presentation);
    } catch (_) {}
  };

  const updateAccent = () => {
    const accent = getConfig().accent.toLowerCase();
    dialog.classList.toggle('accent-rhodium', accent === 'rhodium');
    dialog.classList.toggle('accent-cobalt', accent === 'cobalt');
  };

  const renderHeroProgress = (progress) => {
    const spin = progress * 180;
    const wordShift = progress * 58;
    const radians = spin * Math.PI / 180;
    const dimensionalTilt = Math.sin(radians) * 13;
    const breathingScale = 1 - Math.abs(Math.sin(radians)) * .025;
    const highlight = 1 + Math.abs(Math.sin(radians)) * .09;

    watchImage.style.transform = `rotateZ(${spin}deg) rotateY(${dimensionalTilt}deg) scale(${breathingScale})`;
    watchImage.style.filter = `brightness(${highlight}) drop-shadow(0 35px 35px rgba(0,0,0,.65))`;
    watchXray.style.transform = `rotateZ(${spin}deg) rotateY(${dimensionalTilt}deg) scale(${breathingScale})`;

    const wordOpacity = Math.max(0, Math.min(1, 1 - (wordShift - 34) / 18));
    heroTic.style.transform = `translate3d(${-2 - wordShift}vw, 0, 0)`;
    heroToc.style.transform = `translate3d(${2 + wordShift}vw, 0, 0)`;
    heroTic.style.opacity = wordOpacity;
    heroToc.style.opacity = wordOpacity;
  };

  const renderCalibreMotion = (p) => {
    const scale = 1.12 + p * .075;
    const x = (p - .5) * -4.5;
    const y = (p - .5) * -3;
    const rotation = (p - .5) * 2.2;

    calibreImage.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale}) rotate(${rotation}deg)`;

  };

  const renderCinematicTransitions = () => {
    cinematicTransitions.forEach((transition) => {
      const progress = stagedProgress(transition, .04, .88);
      transition.style.setProperty('--p', progress.toFixed(5));
      if (transition === diameterTransition) renderDiameterTransition(progress);
    });
  };

  const range = (value, start, end) => smoothStep(Math.max(0, Math.min(1, (value - start) / (end - start))));

  const renderDiameterTransition = (progress) => {
    const set = (property, value) => diameterTransition.style.setProperty(property, value);
    const reveal = range(progress, .02, .47);
    const imageReveal = range(progress, .08, .28);
    const settle = range(progress, .38, .78);
    const typeExit = range(progress, .78, .94);
    const guide = Math.min(range(progress, .08, .34), 1 - range(progress, .57, .78));
    const scan = Math.min(range(progress, .1, .28), 1 - range(progress, .48, .68));

    set('--diameter-image-opacity', imageReveal.toFixed(5));
    set('--diameter-image-scale', (1.14 - settle * .14).toFixed(5));
    set('--diameter-image-x', `${(-2 + settle * 2).toFixed(4)}vw`);
    set('--diameter-image-blur', `${((1 - settle) * 12).toFixed(3)}px`);
    set('--diameter-shade-opacity', '1');
    set('--diameter-copy-opacity', (reveal * (1 - typeExit)).toFixed(5));
    set('--diameter-copy-y', `${((1 - reveal) * 8 - typeExit * 5).toFixed(4)}vh`);
    set('--diameter-copy-blur', `${((1 - reveal + typeExit) * 12).toFixed(3)}px`);
    set('--diameter-number-x', `${((1 - reveal) * -7 - typeExit * 9).toFixed(4)}vw`);
    set('--diameter-unit-x', `${((1 - reveal) * 7 + typeExit * 9).toFixed(4)}vw`);
    set('--diameter-guide-opacity', guide.toFixed(5));
    set('--diameter-guide-scale', (.72 + reveal * .28 + typeExit * .12).toFixed(5));
    set('--diameter-scan-opacity', scan.toFixed(5));
    set('--diameter-scan-y', `${(30 + progress * 44).toFixed(4)}%`);
    set('--diameter-meta-opacity', Math.max(0, .5 - typeExit * .5).toFixed(5));

    diameterStrips.forEach((strip, index) => {
      const stagger = index * .018;
      const open = range(progress, .14 + stagger, .5 + stagger);
      const direction = index % 2 === 0 ? -1 : 1;
      strip.style.setProperty('--strip-y', `${(open * direction * 104).toFixed(4)}%`);
      strip.style.setProperty('--strip-opacity', (1 - open * .92).toFixed(5));
    });
  };

  const renderEditorialProjects = () => {
    editorialProjects.forEach((project) => {
      const rect = project.getBoundingClientRect();
      const travel = innerHeight + rect.height;
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / travel));
      const offset = (progress - .5) * -52;
      const scale = 1.065 - Math.sin(progress * Math.PI) * .025;
      project.style.setProperty('--project-y', `${offset.toFixed(2)}px`);
      project.style.setProperty('--project-scale', scale.toFixed(4));
    });
  };

  const renderCinematicType = () => {
    cinematicTitles.forEach((title) => {
      const rect = title.getBoundingClientRect();
      const scene = title.closest('.calibre, .exploded, .wrist, .atelier-studio');
      const raw = scene
        ? Math.max(0, Math.min(1, sectionProgress(scene) / .34))
        : Math.max(0, Math.min(1, (innerHeight * .92 - rect.top) / (innerHeight * .48)));
      $$(':scope > span > b', title).forEach((line, index) => {
        const lineRaw = Math.max(0, Math.min(1, (raw - index * .12) / .82));
        const progress = smoothStep(lineRaw);
        line.style.setProperty('--line-opacity', progress.toFixed(5));
        line.style.setProperty('--line-blur', `${((1 - progress) * 12).toFixed(3)}px`);
        line.style.setProperty('--line-y', `${((1 - progress) * 1.05).toFixed(4)}em`);
        line.style.setProperty('--line-x', `${((1 - progress) * (index % 2 ? 2.4 : -2.4)).toFixed(4)}vw`);
        line.style.setProperty('--line-tilt', `${((1 - progress) * 8).toFixed(3)}deg`);
      });
    });
  };

  const sectionProgress = (section) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight);
    return Math.max(0, Math.min(1, -rect.top / distance));
  };

  const smoothStep = (value) => value * value * (3 - 2 * value);

  const stagedProgress = (section, start = .06, end = .8) => {
    const raw = sectionProgress(section);
    const normalized = Math.max(0, Math.min(1, (raw - start) / (end - start)));
    return smoothStep(normalized);
  };

  const renderExpeditionMotion = () => {
    const calibreProgress = stagedProgress(calibreScene, .05, .78);
    const explodedProgress = stagedProgress(explodedScene, .06, .74);
    const wristProgress = stagedProgress(wristScene, .06, .79);
    const montageProgress = stagedProgress(atelierStudio, .05, .82);
    const atelierProgress = sectionProgress(atelierStudio);
    const atelierTravel = Math.max(1, atelierStudio.offsetHeight - innerHeight);
    // Advance each phrase through the same reading window, with scroll-distance holds.
    const windowHeight = atelierPrompter.clientHeight;
    const stops = atelierLines.map((line) => windowHeight / 2 - line.offsetTop - line.offsetHeight / 2);
    let prompterY = windowHeight + (stops[0] - windowHeight) * range(atelierProgress, .02, .16);
    prompterY += (stops[1] - stops[0]) * range(atelierProgress, .30, .42);
    prompterY += (stops[2] - stops[1]) * range(atelierProgress, .58, .70);
    prompterY -= windowHeight * range(atelierProgress, .86, .99);

    const set = (element, property, value) => element.style.setProperty(property, value);

    set(calibreScene, '--scene-progress', calibreProgress.toFixed(5));
    set(calibreScene, '--scene-shade', (.48 + calibreProgress * .52).toFixed(5));
    set(calibreScene, '--scene-copy-y', `${((1 - calibreProgress) * 18).toFixed(4)}vh`);
    set(calibreScene, '--scene-copy-opacity', Math.min(1, calibreProgress * 2.4).toFixed(5));
    set(calibreScene, '--scene-callout-opacity', (1 - calibreProgress).toFixed(5));
    set(calibreScene, '--scene-light-x', `${(-38 + calibreProgress * 76).toFixed(4)}%`);

    set(explodedScene, '--scene-progress', explodedProgress.toFixed(5));
    set(explodedScene, '--explode-shell-x', `${(explodedProgress * -25).toFixed(4)}vw`);
    set(explodedScene, '--explode-shell-y', `${(explodedProgress * 4).toFixed(4)}vh`);
    set(explodedScene, '--explode-shell-rotate', `${(explodedProgress * -18).toFixed(4)}deg`);
    set(explodedScene, '--explode-shell-scale', (1 - explodedProgress * .12).toFixed(5));
    set(explodedScene, '--explode-dial-x', `${(explodedProgress * 2).toFixed(4)}vw`);
    set(explodedScene, '--explode-dial-rotate', `${(explodedProgress * 9).toFixed(4)}deg`);
    set(explodedScene, '--explode-calibre-x', `${(explodedProgress * 25).toFixed(4)}vw`);
    set(explodedScene, '--explode-calibre-rotate', `${(explodedProgress * 22).toFixed(4)}deg`);
    set(explodedScene, '--explode-crystal-x', `${(explodedProgress * 43).toFixed(4)}vw`);
    set(explodedScene, '--explode-crystal-rotate', `${(explodedProgress * 52).toFixed(4)}deg`);
    set(explodedScene, '--explode-inner-opacity', Math.min(1, explodedProgress * 3.2).toFixed(5));
    set(explodedScene, '--explode-copy-opacity', Math.max(0, 1 - explodedProgress * 2.1).toFixed(5));
    set(explodedScene, '--explode-heading-y', `${(Math.min(1, explodedProgress * 2.1) * -4).toFixed(4)}vh`);
    set(explodedScene, '--explode-label-opacity', Math.max(0, Math.min(1, (explodedProgress - .45) * 3.4)).toFixed(5));
    set(explodedScene, '--explode-mobile-shell-y', `${(explodedProgress * -25).toFixed(4)}vh`);
    set(explodedScene, '--explode-mobile-dial-y', `${(explodedProgress * -3).toFixed(4)}vh`);
    set(explodedScene, '--explode-mobile-calibre-y', `${(explodedProgress * 19).toFixed(4)}vh`);
    set(explodedScene, '--explode-mobile-crystal-y', `${(explodedProgress * 38).toFixed(4)}vh`);

    set(wristScene, '--wrist-progress', wristProgress.toFixed(5));
    set(wristScene, '--scene-progress', wristProgress.toFixed(5));
    set(wristScene, '--wrist-x', `${(wristProgress * 7).toFixed(4)}vw`);
    set(wristScene, '--wrist-scale', (1 + wristProgress * .12).toFixed(5));
    set(wristScene, '--wrist-inset-y', `${(wristProgress * 8).toFixed(4)}vh`);
    set(wristScene, '--wrist-inset-r', `${(wristProgress * 5).toFixed(4)}vw`);
    set(wristScene, '--wrist-inset-l', `${(wristProgress * 42).toFixed(4)}vw`);
    set(wristScene, '--wrist-overlay-opacity', (1 - wristProgress * .55).toFixed(5));
    set(wristScene, '--wrist-copy-x', `${(wristProgress * -2).toFixed(4)}vw`);
    set(wristScene, '--wrist-copy-y', `${((.45 - wristProgress) * 12).toFixed(4)}vh`);
    set(wristScene, '--wrist-mobile-inset-y', `${(wristProgress * 7).toFixed(4)}vh`);
    set(wristScene, '--wrist-mobile-inset-x', `${(wristProgress * 4).toFixed(4)}vw`);
    set(wristScene, '--wrist-mobile-inset-b', `${(wristProgress * 42).toFixed(4)}vh`);

    set(atelierStudio, '--montage-progress', montageProgress.toFixed(5));
    set(atelierStudio, '--montage-x', `${(montageProgress * -145).toFixed(4)}vw`);
    set(atelierStudio, '--montage-mobile-x', `${(montageProgress * -264).toFixed(4)}vw`);
    set(atelierStudio, '--montage-scale', (1.07 - montageProgress * .03).toFixed(5));
    set(atelierStudio, '--atelier-title-y', `${(atelierProgress * atelierTravel).toFixed(2)}px`);
    set(atelierStudio, '--prompter-track-y', `${prompterY.toFixed(2)}px`);
    set(atelierStudio, '--atelier-title-opacity', (1 - range(atelierProgress, .88, .99)).toFixed(5));
    renderCalibreMotion(calibreProgress);
  };

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    meter.style.width = `${max ? (y / max) * 100 : 0}%`;
    header.classList.toggle('scrolled', y > 50);
    header.classList.toggle('light-mode', lightHeaderSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 68 && rect.bottom >= 68;
    }));
    if (!reducedMotion) renderHeroProgress(stagedProgress(heroSequence, .03, .78));
    if (!reducedMotion) renderCinematicTransitions();
    if (!reducedMotion) renderEditorialProjects();
    if (!reducedMotion) renderCinematicType();
    if (!reducedMotion) renderExpeditionMotion();
  };

  let scrollTick = false;
  addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => { onScroll(); scrollTick = false; });
  }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  watchStage.addEventListener('pointermove', (event) => {
    const bounds = watchStage.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    watchXray.style.setProperty('--xray-x', `${x}%`);
    watchXray.style.setProperty('--xray-y', `${y}%`);
  });
  watchStage.addEventListener('pointerenter', () => watchStage.classList.add('xray-active'));
  watchStage.addEventListener('pointerleave', () => watchStage.classList.remove('xray-active'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
  }, { threshold: .15 });
  $$('.reveal').forEach((item) => observer.observe(item));

  $('#scrollCue').addEventListener('click', () => $('.statement').scrollIntoView({ behavior: 'smooth' }));

  $$('.material-card').forEach((card) => card.addEventListener('click', () => {
    $$('.material-card').forEach((item) => item.classList.toggle('active', item === card));
    $('.material-vault').dataset.active = card.dataset.key;
    $('#materialName').textContent = card.dataset.material;
    $('#materialDetail').textContent = card.dataset.detail;
    const specifications = {
      obsidian: ['Satin black', 'Structural lightness'],
      gold: ['Hand polished', 'Controlled brilliance'],
      leather: ['Matte hand-cut', 'Tactile restraint']
    }[card.dataset.key];
    $('#materialFinish').textContent = specifications[0];
    $('#materialPurpose').textContent = specifications[1];
    $('.material-object-index b').textContent = card.dataset.key.toUpperCase();
  }));

  const updateTime = () => {
    $('#liveTime').textContent = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date());
  };
  updateTime();
  setInterval(updateTime, 1000);

  const setStep = (step) => {
    activeStep = Math.max(1, Math.min(4, step));
    steps.forEach((section) => section.classList.toggle('active', Number(section.dataset.step) === activeStep));
    $('#checkoutProgress').style.width = `${activeStep * 25}%`;
    $('#backStep').disabled = activeStep === 1;
    $('#nextStep').innerHTML = activeStep === 4 ? 'Confirm reservation <span>→</span>' : 'Continue <span>→</span>';
    if (activeStep === 4) populateReview();
    const heading = $('.checkout-step.active h2');
    if (heading) heading.setAttribute('tabindex', '-1');
    if (heading) heading.focus({ preventScroll: true });
  };

  const openCheckout = (step = 1) => {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('checkout-open');
    resetCheckoutWatch();
    $('#checkoutSuccess').classList.remove('active');
    steps.forEach((section) => section.hidden = false);
    $('#checkoutActions').hidden = false;
    setStep(step);
  };

  const closeCheckout = () => {
    if (dialog.open) dialog.close();
    document.body.classList.remove('checkout-open');
  };

  $('#acquireButton').addEventListener('click', () => openCheckout(1));
  $('#bagButton').addEventListener('click', () => openCheckout(1));
  $('#footerReserve').addEventListener('click', () => openCheckout(1));
  $('#closeCheckout').addEventListener('click', closeCheckout);
  $('#finishCheckout').addEventListener('click', closeCheckout);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeCheckout(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeCheckout(); });

  const validateDelivery = () => {
    let valid = true;
    $$('[required]', steps[2]).forEach((input) => {
      const passes = input.checkValidity();
      input.classList.toggle('invalid', !passes);
      if (!passes) valid = false;
    });
    if (!valid) $('.invalid', steps[2])?.focus();
    return valid;
  };

  const populateReview = () => {
    const data = new FormData(form);
    const config = getConfig();
    const lines = [
      ['Edition', 'No. 01 / Obsidian'],
      ['Accent', config.accent],
      ['Strap', config.strap],
      ['Engraving', config.engraving || 'None'],
      ['Delivery', `${data.get('city') || 'Private'}, ${data.get('country') || 'to confirm'}`],
      ['Total', '$18,800 USD']
    ];
    $('#reviewLines').innerHTML = lines.map(([label, value]) => `<div class="review-line"><span>${label}</span><strong>${escapeHTML(value)}</strong></div>`).join('');
  };

  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const completeReservation = () => {
    const code = `TT-01-${String(Math.floor(1000 + Math.random() * 9000))}`;
    steps.forEach((section) => section.classList.remove('active'));
    $('#checkoutActions').hidden = true;
    $('#reservationCode').textContent = code;
    $('#checkoutSuccess').classList.add('active');
    $('#checkoutProgress').style.width = '100%';
    try { localStorage.setItem('tic-toc-reservation', JSON.stringify({ code, createdAt: new Date().toISOString(), config: getConfig() })); } catch (_) {}
    return code;
  };

  $('#nextStep').addEventListener('click', () => {
    if (activeStep === 3 && !validateDelivery()) return;
    if (activeStep === 4) { completeReservation(); return; }
    saveConfig();
    setStep(activeStep + 1);
  });
  $('#backStep').addEventListener('click', () => setStep(activeStep - 1));

  $('#engraving').addEventListener('input', (event) => {
    $('#engravingCount').textContent = `${event.target.value.length} / 18`;
    saveConfig();
  });
  form.addEventListener('change', () => { saveConfig(); updateAccent(); });

  const registerWebMCP = () => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const register = (tool) => {
      try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_) {}
    };
    register({
      name: 'read_watch_configuration',
      title: 'Read watch configuration',
      description: 'Return the current Tic Toc No. 01 configuration without changing it.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({ product: 'No. 01 Obsidian Tourbillon', price_usd: 18800, ...getConfig() })
    });
    register({
      name: 'configure_watch',
      title: 'Configure watch',
      description: 'Select the movement accent, strap, and optional engraving, then update the visible private checkout.',
      inputSchema: {
        type: 'object',
        properties: {
          accent: { type: 'string', enum: ['Champagne', 'Rhodium', 'Cobalt'] },
          strap: { type: 'string', enum: ['Black alligator', 'Graphite calfskin'] },
          engraving: { type: 'string', maxLength: 18 }
        },
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input = {}) => {
        if (input.engraving && input.engraving.length > 18) throw new Error('Engraving must be 18 characters or fewer.');
        ['accent', 'strap'].forEach((key) => {
          if (!input[key]) return;
          const radio = $(`input[name="${key}"][value="${CSS.escape(input[key])}"]`, form);
          if (!radio) throw new Error(`Unsupported ${key}.`);
          radio.checked = true;
        });
        if (typeof input.engraving === 'string') $('#engraving').value = input.engraving;
        updateAccent(); saveConfig(); openCheckout(1);
        return { status: 'configured', ...getConfig() };
      }
    });
    register({
      name: 'start_private_checkout',
      title: 'Start private checkout',
      description: 'Open the visible private checkout for the configured Tic Toc watch.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => { openCheckout(1); return { status: 'checkout_started', step: 1 }; }
    });
  };

  restoreConfig();
  updateAccent();
  $('#engravingCount').textContent = `${$('#engraving').value.length} / 18`;
  onScroll();
  registerWebMCP();
})();
