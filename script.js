document.documentElement.classList.add('js');

const header = document.querySelector('[data-header]');
const nav = document.querySelector('#site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = [...document.querySelectorAll('main section[id]')];

function closeNavigation() {
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', '開啟導覽選單');
  document.body.classList.remove('nav-open');
}

navToggle.addEventListener('click', () => {
  const willOpen = !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', willOpen);
  navToggle.setAttribute('aria-expanded', String(willOpen));
  navToggle.setAttribute('aria-label', willOpen ? '關閉導覽選單' : '開啟導覽選單');
  document.body.classList.toggle('nav-open', willOpen);
});

navLinks.forEach((link) => link.addEventListener('click', closeNavigation));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNavigation();
});

const updatePageState = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 20);
  const marker = window.scrollY + window.innerHeight * 0.34;
  let currentId = 'home';
  sections.forEach((section) => {
    if (section.offsetTop <= marker) currentId = section.id;
  });
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${currentId}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updatePageState();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.querySelector('[data-year]').textContent = new Date().getFullYear();
updatePageState();
