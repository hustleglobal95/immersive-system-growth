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
  const calibreScene = $('#calibre');
  const calibreImage = $('.calibre-image', calibreScene);
  const wristScene = $('.wrist');
  const wristImage = $('img', wristScene);
  const wristProduct = $('.wrist-product', wristScene);
  const wristProductWhole = $('.wrist-product-whole', wristScene);
  const wristProductParts = $$('.wrist-product-part', wristScene);
  const wristSpecSize = $('.wrist-spec-size', wristScene);
  const wristSpecDepth = $('.wrist-spec-depth', wristScene);
  const wristSpecLine = $('.wrist-spec i', wristScene);
  const dialog = $('#checkoutDialog');
  const form = $('#checkoutForm');
  const steps = $$('.checkout-step');
  let activeStep = 1;
  let currentSpin = 0;
  let targetSpin = 0;
  let spinFrame = 0;
  let currentWordShift = 0;
  let targetWordShift = 0;
  let currentCalibreMotion = 0;
  let targetCalibreMotion = 0;
  let calibreFrame = 0;
  let currentWristMotion = 0;
  let targetWristMotion = 0;
  let wristFrame = 0;

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

  const renderCalibreMotion = () => {
    const delta = targetCalibreMotion - currentCalibreMotion;
    currentCalibreMotion += delta * .075;
    if (Math.abs(delta) < .0005) currentCalibreMotion = targetCalibreMotion;

    const p = currentCalibreMotion;
    const scale = 1.12 + p * .075;
    const x = (p - .5) * -4.5;
    const y = (p - .5) * -3;
    const rotation = (p - .5) * 2.2;
    const light = .92 + Math.sin(p * Math.PI) * .16;

    calibreImage.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale}) rotate(${rotation}deg)`;
    calibreImage.style.filter = `brightness(${light}) contrast(${1.04 + p * .05})`;

    if (currentCalibreMotion !== targetCalibreMotion) calibreFrame = requestAnimationFrame(renderCalibreMotion);
    else calibreFrame = 0;
  };

  const queueCalibreMotion = () => {
    if (reducedMotion) return;
    const rect = calibreScene.getBoundingClientRect();
    const travel = innerHeight + rect.height;
    targetCalibreMotion = Math.max(0, Math.min(1, (innerHeight - rect.top) / travel));
    if (!calibreFrame) calibreFrame = requestAnimationFrame(renderCalibreMotion);
  };

  const renderWristMotion = () => {
    const delta = targetWristMotion - currentWristMotion;
    currentWristMotion += delta * .072;
    if (Math.abs(delta) < .0005) currentWristMotion = targetWristMotion;

    const p = currentWristMotion;
    const revealRaw = Math.max(0, Math.min(1, (p - .08) / .28));
    const reveal = revealRaw * revealRaw * (3 - 2 * revealRaw);
    const emergeRaw = Math.max(0, Math.min(1, (p - .12) / .38));
    const emerge = emergeRaw * emergeRaw * (3 - 2 * emergeRaw);
    const explodeRaw = Math.max(0, Math.min(1, (p - .5) / .32));
    const explode = explodeRaw * explodeRaw * (3 - 2 * explodeRaw);
    const imageScale = 1.08 + p * .055;
    const imageX = (p - .5) * -4.2;
    const imageY = (p - .5) * -2.4;
    const mobile = innerWidth < 900;
    const productX = -19 + emerge * (mobile ? 25 : 31);
    const productY = -13 + emerge * 13;
    const productScale = .19 + emerge * (mobile ? .51 : .57);
    const productRotation = -52 + emerge * 52;
    const productDepth = emerge * 120;

    wristImage.style.transform = `translate3d(${imageX}%, ${imageY}%, 0) scale(${imageScale})`;
    wristImage.style.filter = `brightness(${.84 - emerge * .38}) contrast(${1.04 + p * .04}) blur(${emerge * 2.2}px)`;
    wristProduct.style.opacity = Math.min(1, emerge * 2.8);
    wristProduct.style.transform = `translate3d(calc(-50% + ${productX}vw), calc(-50% + ${productY}vh), ${productDepth}px) scale(${productScale}) rotateZ(${productRotation}deg) rotateY(${emerge * -8}deg)`;
    wristProductWhole.style.opacity = 1 - explode;

    const partDistance = mobile ? .72 : 1;
    const partTransforms = [
      `translate3d(${-34 * explode * partDistance}px, ${-112 * explode * partDistance}px, ${80 * explode}px) rotateX(${-14 * explode}deg) rotateZ(${-5 * explode}deg)`,
      `translate3d(${-24 * explode * partDistance}px, 0, ${155 * explode}px) rotateY(${12 * explode}deg) scale(${1 + explode * .05})`,
      `translate3d(${48 * explode * partDistance}px, ${8 * explode}px, ${290 * explode}px) rotateZ(${28 * explode}deg) scale(${1 + explode * .13})`,
      `translate3d(${38 * explode * partDistance}px, ${118 * explode * partDistance}px, ${30 * explode}px) rotateX(${13 * explode}deg) rotateZ(${6 * explode}deg)`
    ];
    wristProductParts.forEach((part, index) => {
      part.style.opacity = explode;
      part.style.transform = partTransforms[index];
    });
    wristSpecSize.style.transform = `translate3d(${(1 - reveal) * -52}px, 0, 0)`;
    wristSpecDepth.style.transform = `translate3d(${(1 - reveal) * 52}px, 0, 0)`;
    wristSpecSize.style.opacity = reveal;
    wristSpecDepth.style.opacity = reveal;
    wristSpecLine.style.transform = `scaleX(${reveal})`;
    wristSpecLine.style.opacity = reveal;

    if (currentWristMotion !== targetWristMotion) wristFrame = requestAnimationFrame(renderWristMotion);
    else wristFrame = 0;
  };

  const queueWristMotion = () => {
    if (reducedMotion) return;
    const rect = wristScene.getBoundingClientRect();
    const travel = innerHeight + rect.height;
    targetWristMotion = Math.max(0, Math.min(1, (innerHeight - rect.top) / travel));
    if (!wristFrame) wristFrame = requestAnimationFrame(renderWristMotion);
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
    queueCalibreMotion();
    queueWristMotion();
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
