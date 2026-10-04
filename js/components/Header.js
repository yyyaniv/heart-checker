(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function InfoIcon() {
    return h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 512 512',
        className: 'w-4 h-4 fill-current',
        'aria-hidden': 'true',
      },
      h('path', {
        d:
          'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z',
      })
    );
  }

  function Header(props) {
    return h(
      'header',
      {
        className: 'shrink-0 flex items-center justify-between gap-3 py-2 px-1',
      },
      h(
        'div',
        { className: 'min-w-0' },
        h(
          'h1',
          {
            className:
              'text-xl md:text-2xl font-bold tracking-tight text-slate-800 truncate',
          },
          'Аналіз серцевого ритму'
        )
      ),
      h(
        'div',
        { className: 'flex items-center gap-2 shrink-0' },
        props.extraActions || null,
        h(
          'button',
          {
            type: 'button',
            className:
              'inline-flex items-center justify-center min-w-11 min-h-11 rounded-full border border-slate-200 bg-white text-emerald-800 hover:bg-emerald-100 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1',
            onClick: props.onInfo,
            title: 'Як працює програма?',
            'aria-label': 'Інформація про програму',
          },
          h(InfoIcon)
        )
      )
    );
  }

  HeartApp.components.Header = Header;
})(typeof window !== 'undefined' ? window : this);
