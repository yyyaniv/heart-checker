(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  var styles = {
    info: 'bg-emerald-100 border-emerald-200 text-emerald-800',
    success: 'bg-emerald-100 border-emerald-200 text-emerald-800',
    warning: 'bg-[#ffd8c0] border-[#ffc4a3] text-[#9a5b2f]',
    error: 'bg-[#ffd8c0] border-[#ffc4a3] text-[#9a5b2f]',
  };

  function MessageBar(props) {
    if (!props.message) return null;
    var kind = props.kind || 'info';
    return h(
      'div',
      {
        className:
          'rounded-2xl border px-3 py-1.5 text-xs leading-snug shrink-0 ' +
          (styles[kind] || styles.info),
        role: 'status',
      },
      props.message
    );
  }

  HeartApp.components.MessageBar = MessageBar;
})(typeof window !== 'undefined' ? window : this);
