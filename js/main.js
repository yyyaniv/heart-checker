(function () {
  'use strict';

  function showFatal(message) {
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML =
      '<div style="max-width:40rem;margin:3rem auto;padding:1.5rem;font-family:system-ui,sans-serif;border:1px solid #fecaca;background:#fef2f2;border-radius:1rem;color:#7f1d1d;">' +
      '<h1 style="margin:0 0 0.5rem;font-size:1.25rem;">Не вдалося запустити застосунок</h1>' +
      '<p style="margin:0;line-height:1.5;">' +
      message +
      '</p></div>';
  }

  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    showFatal(
      'React не завантажено. Переконайтеся, що папка <code>vendor/</code> скопійована разом із проєктом (файли react.production.min.js та react-dom.production.min.js).'
    );
    return;
  }
  if (typeof brain === 'undefined') {
    showFatal(
      'Brain.js не завантажено. Переконайтеся, що є файл <code>vendor/brain.min.js</code>.'
    );
    return;
  }
  if (!window.HeartApp || !window.HeartApp.App) {
    showFatal('Модулі застосунку не завантажилися. Перевірте підключення скриптів у index.html.');
    return;
  }

  var rootEl = document.getElementById('root');
  var root = ReactDOM.createRoot(rootEl);
  root.render(HeartApp.h(HeartApp.App));
})();
