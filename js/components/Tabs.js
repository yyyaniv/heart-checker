(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function Tabs(props) {
    var items = props.items || [];
    var active = props.active;
    var onChange = props.onChange;

    return h(
      'div',
      { className: 'flex flex-col min-h-0 flex-1 ' + (props.className || '') },
      h(
        'div',
        {
          className:
            'flex items-center gap-1 border-b border-slate-200 shrink-0 overflow-x-auto',
          role: 'tablist',
          'aria-label': 'Розділи застосунку',
        },
        items.map(function (item) {
          var isActive = item.id === active;
          return h(
            'button',
            {
              key: item.id,
              type: 'button',
              role: 'tab',
              'aria-selected': isActive ? 'true' : 'false',
              className:
                'min-h-11 px-3.5 py-2.5 text-sm font-semibold rounded-t-2xl transition border-b-2 -mb-px whitespace-nowrap ' +
                (isActive
                  ? 'border-emerald-800 text-emerald-800 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-emerald-100/60'),
              onClick: function () {
                onChange(item.id);
              },
            },
            item.label,
            item.badge
              ? h(
                  'span',
                  {
                    className:
                      'ml-1.5 inline-flex items-center justify-center min-w-[1.15rem] h-4 px-1 rounded-full text-[10px] font-semibold ' +
                      (isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-50 text-slate-600'),
                  },
                  item.badge
                )
              : null
          );
        })
      ),
      h(
        'div',
        {
          className: 'min-h-0 flex-1 overflow-auto lg:overflow-hidden pt-3',
          role: 'tabpanel',
        },
        props.children
      )
    );
  }

  HeartApp.components.Tabs = Tabs;
})(typeof window !== 'undefined' ? window : this);
