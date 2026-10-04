(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  function InfoModal(props) {
    var dialogRef = useRef(null);

    useEffect(
      function () {
        var dialog = dialogRef.current;
        if (!dialog) return;
        if (props.open) {
          if (!dialog.open) dialog.showModal();
        } else if (dialog.open) {
          dialog.close();
        }
      },
      [props.open]
    );

    return h(
      'dialog',
      {
        ref: dialogRef,
        className:
          'fixed inset-0 m-auto rounded-2xl border border-slate-200 p-0 shadow-xl max-w-lg w-[calc(100%-2rem)] h-fit max-h-[calc(100vh-2rem)] overflow-auto backdrop:bg-slate-800/40',
        'aria-labelledby': 'info-modal-title',
        onClose: props.onClose,
        onClick: function (e) {
          if (e.target === dialogRef.current) props.onClose();
        },
      },
      h(
        'div',
        { className: 'p-5 sm:p-6' },
        h(
          'h2',
          {
            id: 'info-modal-title',
            className: 'text-xl font-bold text-slate-800 mb-3',
          },
          'Як працює програма?'
        ),
        h(
          'ol',
          { className: 'list-decimal pl-5 space-y-2 text-sm text-slate-600 mb-4' },
          h(
            'li',
            null,
            'Задайте кількість прикладів (від 250 до 10000, спочатку 400), епохи (від 100 до 5000, спочатку 2000) і швидкість навчання (від 0.01 до 0.99, спочатку 0.3). Оберіть набір: усі, чисті або зашумлені. Потім натисніть «Згенерувати дані» і «Навчити мережу».'
          ),
          h('li', null, 'Проста мережа вчиться відрізняти ці два класи.'),
          h(
            'li',
            null,
            'На вхід подається серія в ударах за хвилину через кому (щонайменше 4 числа).'
          ),
          h(
            'li',
            null,
            'Серія переводиться в секунди між ударами і розбивається на вікна по 4.'
          ),
          h(
            'li',
            null,
            'Результат — середня впевненість по вікнах: норма або аритмія.'
          )
        ),
        h(
          'label',
          {
            className:
              'flex items-center gap-3 min-h-11 text-sm text-slate-600 mb-4 cursor-pointer',
            htmlFor: 'hide-intro',
          },
          h('input', {
            id: 'hide-intro',
            type: 'checkbox',
            checked: !!props.hideIntro,
            onChange: function (e) {
              if (props.onHideIntroChange) {
                props.onHideIntroChange(e.target.checked);
              }
            },
            className:
              'w-5 h-5 rounded border-slate-200 text-emerald-800 accent-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
          }),
          'Більше не показувати'
        ),
        h(
          'button',
          {
            type: 'button',
            className:
              'min-h-11 rounded-2xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1',
            onClick: props.onClose,
          },
          'Зрозуміло'
        )
      )
    );
  }

  HeartApp.components.InfoModal = InfoModal;
})(typeof window !== 'undefined' ? window : this);
