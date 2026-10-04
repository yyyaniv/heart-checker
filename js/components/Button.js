(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  var variants = {
    primary:
      'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus-visible:ring-emerald-300 shadow-sm',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 focus-visible:ring-emerald-300',
    danger:
      'bg-[#ffd8c0] text-[#9a5b2f] hover:bg-[#ffc4a3] focus-visible:ring-[#ffc4a3]',
    ghost:
      'bg-transparent text-slate-600 hover:bg-emerald-100 hover:text-slate-800 focus-visible:ring-emerald-300',
  };

  function Button(props) {
    var variant = variants[props.variant || 'primary'] || variants.primary;
    var disabled = props.disabled || props.loading;
    var size =
      props.size === 'sm' ? 'px-3 py-2 text-sm min-h-11' : 'px-4 py-2.5 text-sm min-h-11';
    var className =
      'inline-flex items-center justify-center gap-1.5 rounded-2xl font-semibold transition ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed ' +
      size +
      ' ' +
      variant +
      ' ' +
      (props.className || '');

    return h(
      'button',
      {
        type: props.type || 'button',
        className: className,
        disabled: disabled,
        onClick: props.onClick,
        'aria-busy': props.loading ? 'true' : 'false',
        title: props.title,
      },
      props.loading
        ? h('span', {
            className:
              'inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin',
            'aria-hidden': 'true',
          })
        : null,
      props.children
    );
  }

  HeartApp.components.Button = Button;
})(typeof window !== 'undefined' ? window : this);
