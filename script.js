(function () {
  'use strict';

  // Mobile navigation
  const toggle = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');

  if (toggle && navList) {
    toggle.addEventListener('click', () => {
      const open = navList.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });

    navList.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navList.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));

  // Gallery lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox?.querySelector('.lightbox__img');
  const galleryItems = document.querySelectorAll('.gallery__item');
  let currentIndex = 0;
  let galleryImages = [];

  if (lightbox && lightboxImg && galleryItems.length) {
    galleryImages = Array.from(galleryItems).map((item) =>
      item.querySelector('img').src
    );

    const openLightbox = (index) => {
      currentIndex = index;
      lightboxImg.src = galleryImages[currentIndex];
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
    };

    const showPrev = () => {
      currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
      lightboxImg.src = galleryImages[currentIndex];
    };

    const showNext = () => {
      currentIndex = (currentIndex + 1) % galleryImages.length;
      lightboxImg.src = galleryImages[currentIndex];
    };

    galleryItems.forEach((item, index) => {
      item.addEventListener('click', () => openLightbox(index));
    });

    lightbox.querySelector('.lightbox__close')?.addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox__prev')?.addEventListener('click', showPrev);
    lightbox.querySelector('.lightbox__next')?.addEventListener('click', showNext);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    });
  }

  // Contact modal
  const contactModal = document.getElementById('contact-modal');
  const contactOpenBtn = document.getElementById('contact-open-btn');
  const contactEmailLink = document.getElementById('contact-email-link');
  const contactPopupForm = document.getElementById('contact-popup-form');
  const FORM_CONFIG = window.FORM_CONFIG || {};
  const WEB3FORMS_KEY = FORM_CONFIG.web3formsKey || '';
  const CONTACT_EMAIL = FORM_CONFIG.recipientEmail || 'kirill.heikkinen@ya.ru';
  const SITE_NAME = FORM_CONFIG.siteName || 'Сайт «Две судьбы»';

  function buildFormPayload(form, subject) {
    const payload = {
      subject,
      from_name: SITE_NAME,
    };

    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      if (key === 'consent') continue;
      if (key === 'botcheck') {
        if (value) payload.botcheck = true;
        continue;
      }
      payload[key] = value;
    }

    if (payload.contact && !payload.email) {
      if (String(payload.contact).includes('@')) {
        payload.email = payload.contact;
        payload.replyto = payload.contact;
      } else {
        payload.phone = payload.contact;
      }
      delete payload.contact;
    }

    if (payload.phone && !payload.email) {
      payload.message = `Телефон: ${payload.phone}\n\n${payload.message || ''}`.trim();
    }

    if (payload.review && !payload.message) {
      payload.message = payload.review;
    }

    return payload;
  }

  async function submitViaWeb3Forms(form, subject) {
    if (!WEB3FORMS_KEY) return { ok: false };

    const payload = buildFormPayload(form, subject);

    const attempts = [
      {
        url: 'https://api.web3forms.com/submit',
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, ...payload }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
      {
        url: `https://api.web3forms.com/submit/${WEB3FORMS_KEY}`,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      },
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, {
          method: 'POST',
          headers: attempt.headers,
          body: attempt.body,
        });

        const result = await response.json().catch(() => ({}));
        if (result.success === true) return { ok: true };
      } catch {
        // try next method
      }
    }

    try {
      const formData = new FormData();
      formData.append('access_key', WEB3FORMS_KEY);
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value);
        }
      });

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      if (result.success === true) return { ok: true };
      return { ok: false, message: result.message || '' };
    } catch {
      return { ok: false };
    }
  }

  async function submitViaFormSubmit(form, subject) {
    try {
      const payload = buildFormPayload(form, subject);
      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (['subject', 'from_name', 'botcheck'].includes(key) || !value) return;
        formData.append(key, value);
      });

      formData.append('_subject', subject);
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');

      if (payload.email) {
        formData.append('_replyto', payload.email);
      }

      const response = await fetch(
        `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`,
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData,
        }
      );

      const result = await response.json().catch(() => ({}));
      const ok = result.success === 'true' || result.success === true;
      return {
        ok,
        needsActivation: /activate|activation|confirm/i.test(String(result.message || '')),
      };
    } catch {
      return { ok: false };
    }
  }

  async function submitFormToEmail(form, subject, submitLabel) {
    const successEl = form.querySelector('.form-success');
    const errorEl = form.querySelector('.form-error');
    const submitBtn = form.querySelector('[type="submit"]');
    const defaultLabel = submitBtn?.textContent || 'Отправить';

    if (successEl) successEl.hidden = true;
    if (errorEl) errorEl.hidden = true;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка…';
    }

    try {
      if (window.location.protocol === 'file:') {
        if (errorEl) {
          errorEl.textContent =
            'Форма не работает при открытии файла с компьютера. Откройте сайт по ссылке: https://svetlanalanalana.github.io/Kirill/';
        }
        throw new Error('file protocol');
      }

      const [web3Result, formSubmitResult] = await Promise.all([
        WEB3FORMS_KEY ? submitViaWeb3Forms(form, subject) : Promise.resolve({ ok: false }),
        submitViaFormSubmit(form, subject),
      ]);

      const sent = web3Result.ok || formSubmitResult.ok;

      if (!sent) {
        if (errorEl) {
          if (formSubmitResult.needsActivation) {
            errorEl.textContent =
              `Откройте ${CONTACT_EMAIL} и подтвердите FormSubmit по ссылке из письма, затем отправьте форму снова.`;
          } else {
            errorEl.textContent =
              `Не удалось отправить. Напишите на ${CONTACT_EMAIL} или обратитесь в support@web3forms.com — укажите домен newproductionfilm.ru для разрешения.`;
          }
        }
        throw new Error('Submit failed');
      }

      if (successEl) successEl.hidden = false;
      form.reset();
      setTimeout(() => {
        if (successEl) successEl.hidden = true;
      }, 5000);
      return true;
    } catch {
      if (errorEl) errorEl.hidden = false;
      return false;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel || defaultLabel;
      }
    }
  }

  const openContactModal = () => {
    if (!contactModal) return;
    contactModal.hidden = false;
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    contactModal.querySelector('#popup-name')?.focus();
  };

  const closeContactModal = () => {
    if (!contactModal) return;
    contactModal.hidden = true;
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (contactOpenBtn && contactModal) {
    contactOpenBtn.addEventListener('click', openContactModal);
  }

  if (contactEmailLink && contactModal) {
    contactEmailLink.addEventListener('click', openContactModal);
  }

  if (contactModal) {
    contactModal.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', closeContactModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !contactModal.hidden) closeContactModal();
    });
  }

  if (contactPopupForm) {
    contactPopupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const consent = contactPopupForm.querySelector('#popup-consent');
      const errorEl = contactPopupForm.querySelector('.form-error');
      const successEl = contactPopupForm.querySelector('.form-success');

      if (successEl) successEl.hidden = true;
      if (errorEl) errorEl.hidden = true;

      if (!consent?.checked) {
        consent?.focus();
        return;
      }

      const sent = await submitFormToEmail(
        contactPopupForm,
        'Заявка с сайта «Две судьбы»',
        'Отправить заявку'
      );

      if (sent) setTimeout(closeContactModal, 2500);
    });
  }

  const festivalForm = document.getElementById('festival-form');
  const reviewForm = document.getElementById('review-form');

  if (festivalForm) {
    festivalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitFormToEmail(
        festivalForm,
        'Заявка организатора с сайта «Две судьбы»',
        'Отправить заявку'
      );
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitFormToEmail(
        reviewForm,
        'Отзыв с сайта «Две судьбы»',
        'Отправить отзыв'
      );
    });
  }

  // Vimeo — загрузка по кнопке «Смотреть видео»
  const mainVideoPlayer = document.getElementById('main-video-player');
  const watchVideoBtn = document.getElementById('watch-video-btn');

  if (mainVideoPlayer && watchVideoBtn) {
    const vimeoId = mainVideoPlayer.dataset.vimeoId;

    watchVideoBtn.addEventListener('click', () => {
      if (!vimeoId || mainVideoPlayer.querySelector('iframe')) return;

      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;
      iframe.title = 'Две судьбы — прокатная версия';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      iframe.allowFullscreen = true;

      watchVideoBtn.remove();
      mainVideoPlayer.appendChild(iframe);
    });
  }

  // privacy.html на хостинге может отдавать index.html — прокрутка к разделу
  if (/privacy/i.test(window.location.pathname) && !window.location.hash) {
    const privacySection = document.getElementById('privacy');
    if (privacySection) {
      history.replaceState(null, '', '#privacy');
      privacySection.scrollIntoView();
    }
  }

  // Header shadow on scroll
  const header = document.querySelector('.header');
  window.addEventListener(
    'scroll',
    () => {
      if (!header) return;
      header.style.boxShadow =
        window.scrollY > 40 ? '0 4px 24px rgba(0,0,0,0.4)' : 'none';
    },
    { passive: true }
  );
})();
