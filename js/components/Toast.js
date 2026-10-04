(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;
  var useEffect = React.useEffect;

  var STYLES = {
    info: {
      panel: 'bg-white border-emerald-200',
      accent: 'bg-emerald-800',
      title: 'Інформація',
      icon: 'ℹ',
    },
    success: {
      panel: 'bg-white border-emerald-200',
      accent: 'bg-emerald-800',
      title: 'Успіх',
      icon: '✓',
    },
    warning: {
      panel: 'bg-white border-[#ffc4a3]',
      accent: 'bg-[#9a5b2f]',
      title: 'Увага',
      icon: '!',
    },
    error: {
      panel: 'bg-white border-[#ffc4a3]',
      accent: 'bg-[#9a5b2f]',
      title: 'Помилка',
      icon: '✕',
    },
  };

  function Toast(props) {
    var toast = props.toast;
    var onClose = props.onClose;

    useEffect(
      function () {
        if (!toast || !toast.message) return undefined;
        var ms = toast.duration || (toast.kind === 'error' ? 5000 : 3500);
        var timer = setTimeout(function () {
          if (onClose) onClose();
        }, ms);
        return function () {
          clearTimeout(timer);
        };
      },
      [toast ? toast.id : 0, toast ? toast.message : '', toast ? toast.kind : '']
    );

    if (!toast || !toast.message) return null;
    var kind = toast.kind || 'info';
    var style = STYLES[kind] || STYLES.info;

    return h(
      'div',
      {
        className:
          'hc-toast pointer-events-auto rounded-2xl border shadow-xl overflow-hidden ' +
          style.panel,
        role: 'alert',
      },
      h('div', { className: 'h-1 ' + style.accent }),
      h(
        'div',
        { className: 'flex gap-3 p-3.5' },
        h(
          'div',
          {
            className:
              'shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold ' +
              style.accent,
          },
          style.icon
        ),
        h(
          'div',
          { className: 'min-w-0 flex-1' },
          h(
            'div',
            { className: 'text-xs font-semibold text-slate-600 mb-0.5' },
            style.title
          ),
          h('p', { className: 'text-sm text-slate-800 leading-snug' }, toast.message)
        ),
        h(
          'button',
          {
            type: 'button',
            className:
              'shrink-0 min-w-11 min-h-11 rounded-full text-slate-600 hover:bg-slate-50 hover:text-slate-800',
            onClick: onClose,
            'aria-label': 'Закрити',
          },
          '×'
        )
      )
    );
  }

  HeartApp.components.Toast = Toast;
})(typeof window !== 'undefined' ? window : this);
