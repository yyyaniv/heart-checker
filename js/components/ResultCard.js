(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function ConfidenceBar(label, value, color) {
    var pct = Math.round((Number(value) || 0) * 100);
    return h(
      'div',
      { className: 'space-y-0.5' },
      h(
        'div',
        { className: 'flex justify-between text-xs' },
        h('span', { className: 'text-slate-600' }, label),
        h('span', { className: 'font-semibold text-slate-800' }, pct + '%')
      ),
      h(
        'div',
        { className: 'h-2 rounded-full bg-slate-200 overflow-hidden' },
        h('div', {
          className: 'h-full rounded-full transition-all',
          style: { width: pct + '%', background: color },
        })
      )
    );
  }

  function ResultCard(props) {
    var prediction = props.prediction;
    var C = HeartApp.components.Card;

    if (!prediction) {
      return h(
        C,
        { title: 'Результат', className: 'lg:h-full' },
        h(
          'div',
          { className: 'rounded-2xl bg-slate-50 border border-slate-200 px-3 py-4' },
          h(
            'p',
            { className: 'text-sm text-slate-600' },
            'Тут зʼявиться результат після розпізнавання серії.'
          )
        )
      );
    }

    var isNormal = prediction.label === 'normal';

    return h(
      C,
      { title: 'Результат', className: 'lg:h-full' },
      h(
        'div',
        {
          className:
            'rounded-2xl px-3 py-3 mb-3 ' +
            (isNormal ? 'bg-emerald-100' : 'bg-[#ffd8c0]'),
        },
        h(
          'div',
          {
            className:
              'text-xl font-bold ' +
              (isNormal ? 'text-emerald-800' : 'text-[#9a5b2f]'),
          },
          isNormal ? 'Нормальний ритм' : 'Аритмія'
        )
      ),
      h(
        'div',
        { className: 'space-y-2' },
        h('p', { className: 'text-sm font-semibold text-slate-700' }, 'Оцінки мережі'),
        ConfidenceBar('Норма', prediction.raw.normal, '#065f46'),
        ConfidenceBar('Аритмія', prediction.raw.arrhythmia, '#ffc4a3'),
        h('p', { className: 'text-xs text-slate-500' }, 'Оцінки не є ймовірністю захворювання та не обов’язково сумуються до 100%.')
      )
    );
  }

  HeartApp.components.ResultCard = ResultCard;
})(typeof window !== 'undefined' ? window : this);
