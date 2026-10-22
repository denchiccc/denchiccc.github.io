/**
 * Интерактивный функционал сайта-визитки
 * Динамическая загрузка данных из базы данных /api/data
 */

document.addEventListener('DOMContentLoaded', () => {
  let siteData = {
    profile: {},
    projects: []
  };

  // 1. Мобильное меню навигации
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');
  const navLinks = document.querySelectorAll('.nav-links a');

  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      mobileToggle.classList.toggle('active');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('active');
        mobileToggle.classList.remove('active');
      });
    });
  }

  // 2. Загрузка данных с сервера или локального хранилища
  async function initSite() {
    let localData = null;

    // 1. Мгновенно (0 мс) проверяем кэш LocalStorage до любых сетевых запросов
    try {
      const localSaved = localStorage.getItem('mebel_portfolio_data');
      if (localSaved) {
        localData = JSON.parse(localSaved);
        siteData = localData;
        // Немедленно отрисовываем профиль и проекты — без малейшего мигания!
        renderProfileData(siteData.profile);
        renderProjectsGrid(siteData.projects);
        setupFilters();
      }
    } catch (err) {
      console.warn('Ошибка чтения кэша LocalStorage:', err);
    }

    // 2. Если запущен локальный Python-сервер (только на localhost) — проверяем /api/data
    const isLocalServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.protocol.startsWith('http');

    if (isLocalServer) {
      try {
        const response = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
        if (response.ok) {
          siteData = await response.json();
          renderProfileData(siteData.profile);
          renderProjectsGrid(siteData.projects);
          setupFilters();
          return;
        }
      } catch (e) {
        // Локальный API недоступен, продолжаем с локальными данными
      }
    }

    // 3. Автоматическая синхронизация с data.json на GitHub (защита от устаревшего мобильного кэша)
    try {
      // Запрашиваем data.json с уникальной временной меткой, чтобы браузер (особенно мобильный Safari/Chrome) никогда не отдавал старый кэш
      const fallbackRes = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
      if (fallbackRes.ok) {
        const serverData = await fallbackRes.json();
        
        // Определяем, нужно ли обновить данные на экране:
        const localTime = (localData && localData.updatedAt) || 0;
        const serverTime = (serverData && serverData.updatedAt) || 0;
        
        let shouldUpdate = false;
        if (!localData || !localData.projects || localData.projects.length === 0) {
          shouldUpdate = true;
        } else if (serverTime > 0 && serverTime >= localTime) {
          shouldUpdate = true;
        } else if (serverTime === 0 && JSON.stringify(serverData) !== JSON.stringify(localData)) {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          siteData = serverData;
          try {
            localStorage.setItem('mebel_portfolio_data', JSON.stringify(serverData));
          } catch (e) {}
          renderProfileData(siteData.profile);
          renderProjectsGrid(siteData.projects);
          setupFilters();
        }
      } else {
        throw new Error('data.json unavailable');
      }
    } catch (err) {
      if (!siteData.projects || siteData.projects.length === 0) {
        console.warn('Работаем в статическом режиме, загружаем встроенные данные', err);
        siteData = getFallbackData();
        renderProfileData(siteData.profile);
        renderProjectsGrid(siteData.projects);
        setupFilters();
      }
    }
  }

  // 3. Заполнение информации о профиле
  function renderProfileData(p) {
    if (!p) return;

    if (p.badge) document.getElementById('profileBadgeText').textContent = p.badge;
    if (p.title) {
      document.getElementById('profileMainTitle').innerHTML = `${p.title} <br><span class="italic-serif text-accent">высокой точности</span>`;
    }
    if (p.subtitle) document.getElementById('profileSubtitleText').textContent = p.subtitle;
    if (p.experience) document.getElementById('statExperience').textContent = p.experience;
    if (p.projectsCount) document.getElementById('statProjects').textContent = p.projectsCount;
    if (p.accuracy) document.getElementById('statAccuracy').textContent = p.accuracy;
    
    if (p.photo) {
      const photoEl = document.getElementById('profilePhoto');
      if (photoEl && photoEl.src !== p.photo) {
        photoEl.src = p.photo;
      }
    }

    if (p.status) document.getElementById('profileBadgeStatus').textContent = p.status;
    if (p.statusSub) document.getElementById('profileBadgeSub').textContent = p.statusSub;

    // Контакты
    if (p.telegram) {
      const tgHero = document.getElementById('heroTelegramLink');
      const tgContact = document.getElementById('contactTelegramLink');
      if (tgHero) tgHero.href = p.telegram;
      if (tgContact) tgContact.href = p.telegram;
    }
    if (p.telegramHandle) {
      const tgH = document.getElementById('contactTelegramHandle');
      if (tgH) tgH.textContent = p.telegramHandle;
    }

    const vkUrl = p.vk || p.max || p.whatsapp;
    if (vkUrl) {
      const vkHero = document.getElementById('heroVkLink') || document.getElementById('heroMaxLink') || document.getElementById('heroWhatsappLink');
      const vkContact = document.getElementById('contactVkLink') || document.getElementById('contactMaxLink') || document.getElementById('contactWhatsappLink');
      if (vkHero) vkHero.href = vkUrl;
      if (vkContact) vkContact.href = vkUrl;
    }
    const vkDisplay = p.vkHandle || p.maxPhone || p.whatsappPhone;
    if (vkDisplay) {
      const vkP = document.getElementById('contactVkHandle') || document.getElementById('contactMaxPhone') || document.getElementById('contactWhatsappPhone');
      if (vkP) vkP.textContent = vkDisplay;
    }

    if (p.phone) {
      const phLink = document.getElementById('contactPhoneLink');
      const phText = document.getElementById('contactPhoneNumber');
      if (phLink) phLink.href = 'tel:' + p.phone.replace(/[^0-9+]/g, '');
      if (phText) phText.textContent = p.phone;
    }

    if (p.email) {
      const emLink = document.getElementById('contactEmailLink');
      const emText = document.getElementById('contactEmailAddress');
      if (emLink) emLink.href = 'mailto:' + p.email;
      if (emText) emText.textContent = p.email;
    }
  }

  // 4. Отрисовка арочных «окошечек» с проектами
  function renderProjectsGrid(projects) {
    const grid = document.getElementById('archesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!projects || projects.length === 0) {
      grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">Проекты пока не добавлены.</p>';
      return;
    }

    projects.forEach(item => {
      const card = document.createElement('article');
      card.className = 'arch-card';
      card.setAttribute('data-category', item.category || 'all');

      card.innerHTML = `
        <div class="arch-window">
          <div class="arch-inner-glow"></div>
          
          <div class="arch-image-wrapper">
            <img 
              src="${item.image || ''}" 
              alt="${item.title}" 
              class="arch-project-img"
              loading="lazy"
            >
          </div>

          <div class="arch-pedestal"></div>
        </div>

        <div class="arch-info">
          <div class="arch-meta">
            <span class="arch-tag">${item.categoryName || 'Проект'}</span>
            <span class="arch-format">${item.format || 'Базис'}</span>
          </div>
          <h3 class="arch-title">${item.title}</h3>
          <p class="arch-description">${item.description || ''}</p>
          
          <div class="arch-actions">
            <a href="${item.link || '#'}" target="_blank" rel="noopener" class="arch-link-btn" title="Перейти к проекту">
              <span>Смотреть проект</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
            </a>
            
            <button class="arch-quickview-btn" data-project-id="${item.id}" title="Быстрый просмотр деталей">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // Навешиваем клик на кнопки быстрого просмотра
    document.querySelectorAll('.arch-quickview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-project-id');
        openProjectModal(id);
      });
    });
  }

  // 5. Фильтрация проектов по категориям
  function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');
        const archCards = document.querySelectorAll('.arch-card');

        archCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filterValue === 'all' || category === filterValue) {
            card.style.display = 'flex';
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 10);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(15px)';
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        });
      });
    });
  }

  // 6. Модальное окно быстрого просмотра
  const modal = document.getElementById('projectModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const modalTag = document.getElementById('modalTag');
  const modalDesc = document.getElementById('modalDesc');
  const modalSpecs = document.getElementById('modalSpecs');
  const modalActionLink = document.getElementById('modalActionLink');

  function openProjectModal(id) {
    const item = (siteData.projects || []).find(p => String(p.id) === String(id));
    if (!item) return;

    modalImg.src = item.image;
    modalImg.alt = item.title;
    modalTitle.textContent = item.title;
    modalTag.textContent = item.categoryName || item.category;
    modalDesc.textContent = item.description;
    modalActionLink.href = item.link;

    modalSpecs.innerHTML = '';
    if (item.specs && Array.isArray(item.specs)) {
      item.specs.forEach(spec => {
        const row = document.createElement('div');
        row.className = 'modal-spec-row';
        row.innerHTML = `
          <span class="modal-spec-label">${spec.label}</span>
          <span class="modal-spec-val">${spec.val}</span>
        `;
        modalSpecs.appendChild(row);
      });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeProjectModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeProjectModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeProjectModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeProjectModal();
    }
  });

  // 7. Подсветка шапки при скролле
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.style.background = 'rgba(17, 32, 23, 0.95)';
      header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
    } else {
      header.style.background = 'rgba(21, 39, 29, 0.85)';
      header.style.boxShadow = 'none';
    }
  });

  // Вспомогательные данные на случай оффлайн-просмотра без сервера
  function getFallbackData() {
    return {
      profile: {
        badge: "Проектирование мебели • Базис-Мебельщик",
        title: "Конструктор мебели высокой точности",
        subtitle: "Приветствую! Я разрабатываю полные комплекты конструкторской документации в программе Базис-Мебельщик.",
        experience: "8+",
        projectsCount: "450+",
        accuracy: "100%",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
        status: "Прием заказов открыт",
        statusSub: "Кухни, шкафы, гардеробные",
        telegram: "https://t.me/your_telegram",
        telegramHandle: "@your_telegram",
        vk: "https://vk.com/your_id",
        vkHandle: "vk.com/your_id",
        phone: "+7 (999) 000-00-00",
        email: "designer@example.com"
      },
      projects: []
    };
  }

  // Скрытый вход для владельца: 5 быстрых кликов по логотипу «БМ Конструктор» в подвале сайта
  const secretTrigger = document.getElementById('secretAdminTrigger');
  if (secretTrigger) {
    let clickCount = 0;
    let clickTimer = null;
    secretTrigger.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 5) {
        clickCount = 0;
        window.location.href = 'admin.html';
      } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 1200);
      }
    });
  }

  // Запуск
  initSite();
});
