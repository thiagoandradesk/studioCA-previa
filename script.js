(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');
  const setMenu = (open) => { menu.setAttribute('aria-expanded', String(open)); mobileNav.hidden = !open; };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!e.target.closest('.header')) setMenu(false); });
  const desktop = window.matchMedia('(min-width: 761px)');
  desktop.addEventListener('change', e => { if (e.matches) setMenu(false); });

  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-ready');
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
  }

  const ambient = [...document.querySelectorAll('.ambient-video')];
  let modalOpen = false;
  const updateMotion = video => {
    const button = video.parentElement.querySelector('.motion-toggle');
    const playing = !video.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? 'Pausar' : 'Reproduzir'} cenas da ${video.closest('.nexo') ? 'Casa Nexo' : 'Casa Aria'}`);
    button.querySelector('.motion-text').textContent = playing ? 'Pausar cenas' : 'Reproduzir cenas';
  };
  const loadAmbient = video => { if (!video.getAttribute('src')) { video.src = video.dataset.src; video.load(); } };
  const playAmbient = video => {
    if (modalOpen || document.hidden) return;
    loadAmbient(video);
    ambient.filter(v => v !== video).forEach(v => v.pause());
    video.play().catch(() => updateMotion(video));
  };
  ambient.forEach(video => {
    video.addEventListener('play', () => updateMotion(video));
    video.addEventListener('pause', () => updateMotion(video));
    video.addEventListener('error', () => { video.parentElement.querySelector('.motion-toggle').hidden = true; });
    video.parentElement.querySelector('.motion-toggle').addEventListener('click', () => {
      if (video.paused) { video.dataset.userPaused = 'false'; playAmbient(video); }
      else { video.dataset.userPaused = 'true'; video.pause(); }
    });
  });
  const resumeAmbient = () => {
    if (reduced.matches || modalOpen || document.hidden) return;
    const candidate = ambient.find(v => v.dataset.inView === 'true' && v.dataset.userPaused !== 'true');
    if (candidate) playAmbient(candidate);
  };
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        video.dataset.inView = String(entry.isIntersecting);
        if (!entry.isIntersecting) video.pause();
      });
      resumeAmbient();
    }, { threshold: 0.4 });
    ambient.forEach(v => videoObserver.observe(v));
  }
  reduced.addEventListener('change', () => { if (reduced.matches) ambient.forEach(v => v.pause()); else resumeAmbient(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ambient.forEach(v => v.pause()); else resumeAmbient(); });

  const films = {
    aria: { title: 'Casa Aria', poster: 'assets/aria-poster.jpg', clips: [
      ['Tour principal', '1:25', 'assets/aria-video-01-tour-principal-84s.mp4'],
      ['Água e paisagem', '0:23', 'assets/aria-video-02-apoio-22s.mp4'],
      ['Matéria e detalhe', '0:19', 'assets/aria-video-03-detalhe-17s.mp4'],
      ['Ambientes', '0:33', 'assets/aria-video-04-ambientes-32s.mp4']
    ]},
    nexo: { title: 'Casa Nexo', poster: 'assets/nexo-poster.jpg', clips: [
      ['Tour principal', '0:54', 'assets/nexo-video-01-tour-principal-54s.mp4'],
      ['Arquitetura e paisagem', '0:40', 'assets/nexo-video-02-apoio-40s.mp4']
    ]}
  };
  const filmDialog = document.querySelector('#film-dialog');
  const fullFilm = document.querySelector('#full-film');
  const filmOptions = document.querySelector('#film-options');
  const filmStatus = document.querySelector('#film-status');
  let selectedProject = 'aria';
  let previousFocus = null;
  const selectFilm = index => {
    const project = films[selectedProject];
    const clip = project.clips[index];
    fullFilm.pause();
    fullFilm.poster = project.poster;
    fullFilm.src = clip[2];
    fullFilm.setAttribute('aria-label', `${project.title} — ${clip[0]}`);
    fullFilm.muted = true;
    fullFilm.load();
    filmStatus.textContent = `${clip[0]} · Ative o som nos controles do vídeo, se desejar.`;
    filmOptions.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    fullFilm.play().catch(() => { filmStatus.textContent = `${clip[0]} · Toque em reproduzir nos controles do vídeo.`; });
  };
  const enterModal = () => { previousFocus = document.activeElement; modalOpen = true; document.body.classList.add('modal-open'); ambient.forEach(v => v.pause()); };
  const leaveModal = () => { modalOpen = false; document.body.classList.remove('modal-open'); if (previousFocus) previousFocus.focus({ preventScroll: true }); resumeAmbient(); };
  document.querySelectorAll('[data-film]').forEach(button => button.addEventListener('click', () => {
    selectedProject = button.dataset.film;
    const project = films[selectedProject];
    document.querySelector('#film-title').textContent = project.title;
    filmOptions.replaceChildren();
    project.clips.forEach((clip, index) => {
      const option = document.createElement('button'); option.type = 'button'; option.className = 'film-option';
      const name = document.createElement('span'); name.className = 'film-option-name'; name.textContent = clip[0];
      const duration = document.createElement('span'); duration.className = 'film-option-duration'; duration.textContent = clip[1];
      option.append(name, duration); option.addEventListener('click', () => selectFilm(index)); filmOptions.append(option);
    });
    enterModal(); filmDialog.showModal(); selectFilm(0);
  }));
  fullFilm.addEventListener('error', () => { filmStatus.textContent = 'Não foi possível carregar este filme. Selecione outro ou tente novamente.'; });
  filmDialog.addEventListener('close', () => { fullFilm.pause(); fullFilm.removeAttribute('src'); fullFilm.load(); leaveModal(); });

  const photos = [
    ['assets/aria-foto-01-piscina-frontal.jpg', 'Casa Aria · Água, madeira e transparência.'],
    ['assets/aria-foto-02-escala-humana-vidro.jpg', 'Casa Aria · O espaço na escala da vida.'],
    ['assets/aria-foto-03-detalhe-esquadria.jpg', 'Casa Aria · Precisão em cada encontro.'],
    ['assets/aria-foto-04-corredor-madeira-vidro.jpg', 'Casa Aria · Ritmo, matéria e continuidade.']
  ];
  const photoDialog = document.querySelector('#photo-dialog');
  let photoIndex = 0;
  const showPhoto = index => {
    photoIndex = (index + photos.length) % photos.length;
    document.querySelector('#full-photo').src = photos[photoIndex][0];
    document.querySelector('#full-photo').alt = photos[photoIndex][1];
    document.querySelector('#photo-title').textContent = photos[photoIndex][1];
    document.querySelector('#photo-count').textContent = `${photoIndex + 1} / ${photos.length}`;
  };
  document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => { enterModal(); showPhoto(Number(button.dataset.photo)); photoDialog.showModal(); }));
  document.querySelector('#prev-photo').addEventListener('click', () => showPhoto(photoIndex - 1));
  document.querySelector('#next-photo').addEventListener('click', () => showPhoto(photoIndex + 1));
  photoDialog.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(photoIndex + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(photoIndex - 1); } });
  photoDialog.addEventListener('close', leaveModal);
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
    });
  });
})();
