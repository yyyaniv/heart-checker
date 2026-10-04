(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function Card(props) {
    return h(
      'section',
      {
        className:
          'rounded-2xl bg-white border border-slate-200 shadow-sm p-4 md:p-5 ' +
          (props.className || ''),
      },
      props.title
        ? h(
            'h2',
            { className: 'text-base font-semibold text-slate-800 mb-2.5' },
            props.title
          )
        : null,
      props.children
    );
  }

  HeartApp.components.Card = Card;
})(typeof window !== 'undefined' ? window : this);
