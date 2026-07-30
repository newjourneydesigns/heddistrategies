(function () {
  function initCurrentYear() {
    var currentYear = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach(function (el) {
      el.textContent = currentYear;
    });
  }

  function initMobileMenu() {
    var button = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');

    if (!button || !menu) {
      return;
    }

    var spans = button.querySelectorAll('span');

    function setOpenState(open) {
      menu.classList.toggle('hidden', !open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (spans.length >= 3) {
        spans[0].style.transform = open ? 'translateY(6px) rotate(45deg)' : '';
        spans[1].style.opacity = open ? '0' : '1';
        spans[2].style.transform = open ? 'translateY(-6px) rotate(-45deg)' : '';
      }
    }

    setOpenState(false);

    button.addEventListener('click', function () {
      var currentlyOpen = button.getAttribute('aria-expanded') === 'true';
      setOpenState(!currentlyOpen);
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpenState(false);
      });
    });
  }

  function initAnimations() {
    if (!('IntersectionObserver' in window)) {
      return;
    }

    var animatedElements = document.querySelectorAll('[data-animate]');

    // Set initial hidden state via JS (not CSS), so content is visible if JS fails
    animatedElements.forEach(function (el) {
      var type = el.getAttribute('data-animate');
      el.style.opacity = '0';
      el.style.transition = 'none';
      if (type === 'slideUp') {
        el.style.transform = 'translateY(24px)';
      } else if (type === 'scaleIn') {
        el.style.transform = 'scale(0.95)';
      }
      el.querySelectorAll('[data-stagger]').forEach(function (child) {
        child.style.opacity = '0';
        var childType = child.getAttribute('data-stagger');
        if (childType === 'slideUp') {
          child.style.transform = 'translateY(24px)';
        } else if (childType === 'scaleIn') {
          child.style.transform = 'scale(0.95)';
        }
      });
    });

    function applyAnimation(element) {
      var animationType = element.getAttribute('data-animate');
      element.classList.add('animated', 'animate-' + animationType);
      element.style.opacity = '';
      element.style.transform = '';

      // Handle staggered children
      var staggerChildren = element.querySelectorAll('[data-stagger]');
      staggerChildren.forEach(function (child, index) {
        var staggerType = child.getAttribute('data-stagger');
        child.style.animationDelay = (index * 100) + 'ms';
        child.classList.add('animated', 'animate-' + staggerType);
        child.style.opacity = '';
        child.style.transform = '';
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          applyAnimation(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCurrentYear();
    initMobileMenu();
    initAnimations();
  });
})();
