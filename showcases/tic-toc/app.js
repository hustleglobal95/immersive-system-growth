(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('#siteHeader');
  const meter = $('#scrollMeter');
  const watchStage = $('#watchStage');
  const watchImage = $('img', watchStage);
  const heroTic = $('#heroTitle span:first-child');
  const heroToc = $('#heroTitle span:last-child');
  const dialog = $('#checkoutDialog');
  const form = $('#checkoutForm');
  const steps = $$('.checkout-step');
  let activeStep = 1;
  let currentSpin = 0;
  let targetSpin = 0;
  let spinFrame = 0;
  let currentWordShift = 0;
  let targetWordShift = 0;

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

  const renderWatchSpin = () => {
    const delta = targetSpin - currentSpin;
    const wordDelta = targetWordShift - currentWordShift;
    currentSpin += delta * .105;
    currentWordShift += wordDelta * .065;
    if (Math.abs(delta) < .025) currentSpin = targetSpin;
    if (Math.abs(wordDelta) < .015) currentWordShift = targetWordShift;

    const radians = currentSpin * Math.PI / 180;
    const dimensionalTilt = Math.sin(radians) * 13;
    const breathingScale = 1 - Math.abs(Math.sin(radians)) * .025;
    const motionBlur = Math.min(Math.abs(delta) * .0025, .65);
    const highlight = 1 + Math.abs(Math.sin(radians)) * .09;

    watchImage.style.transform = `rotateZ(${currentSpin}deg) rotateY(${dimensionalTilt}deg) scale(${breathingScale})`;
    watchImage.style.filter = `brightness(${highlight}) blur(${motionBlur}px) drop-shadow(0 35px 35px rgba(0,0,0,.65))`;

    const wordOpacity = Math.max(0, Math.min(1, 1 - (currentWordShift - 34) / 18));
    heroTic.style.transform = `translate3d(${-2 - currentWordShift}vw, 0, 0)`;
    heroToc.style.transform = `translate3d(${2 + currentWordShift}vw, 0, 0)`;
    heroTic.style.opacity = wordOpacity;
    heroToc.style.opacity = wordOpacity;

    if (currentSpin !== targetSpin || currentWordShift !== targetWordShift) spinFrame = requestAnimationFrame(renderWatchSpin);
    else spinFrame = 0;
  };

  const queueWatchSpin = (progress) => {
    if (reducedMotion) return;
    const eased = progress * progress * (3 - 2 * progress);
    targetSpin = eased * 720;
    targetWordShift = eased * 58;
    if (!spinFrame) spinFrame = requestAnimationFrame(renderWatchSpin);
  };

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    meter.style.width = `${max ? (y / max) * 100 : 0}%`;
    header.classList.toggle('scrolled', y > 50);
    if (!reducedMotion && y < innerHeight * 1.25) {
      const p = Math.min(y / (innerHeight * .92), 1);
      watchStage.style.transform = `translate3d(0, ${p * 15}vh, 0) scale(${1 - p * .13})`;
      queueWatchSpin(p);
    }
  };

  let scrollTick = false;
  addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => { onScroll(); scrollTick = false; });
  }, { passive: true });

  if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
    $('#top').addEventListener('pointermove', (event) => {
      if (window.scrollY > innerHeight * .8) return;
      const x = (event.clientX / innerWidth - .5) * 16;
      const y = (event.clientY / innerHeight - .5) * 10;
      watchImage.style.translate = `${x}px ${y}px`;
    });
    $('#top').addEventListener('pointerleave', () => { watchImage.style.translate = '0 0'; });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'));
  }, { threshold: .15 });
  $$('.reveal').forEach((item) => observer.observe(item));

  $('#scrollCue').addEventListener('click', () => $('.statement').scrollIntoView({ behavior: 'smooth' }));

  $$('.material-card').forEach((card) => card.addEventListener('click', () => {
    $$('.material-card').forEach((item) => item.classList.toggle('active', item === card));
    $('#materialName').textContent = card.dataset.material;
    $('#materialDetail').textContent = card.dataset.detail;
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
