(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function StatItem(label, value, tone) {
    var box =
      tone === 'normal'
        ? 'bg-emerald-100 border-emerald-200'
        : tone === 'arrhythmia'
          ? 'bg-[#ffd8c0] border-[#ffc4a3]'
          : 'bg-slate-50 border-slate-200';
    return h(
      'div',
      { className: 'rounded-2xl border px-3 py-2.5 ' + box },
      h(
        'div',
        { className: 'text-xs text-slate-600 tracking-wide mt-0.5' },
        label
      ),
      h('div', { className: 'text-lg font-bold text-slate-800 leading-tight' }, value)
    );
  }

  function StatsPanel(props) {
    var stats = props.stats;
    if (!stats) {
      return h(
        'p',
        {
          className:
            'text-sm text-slate-600 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4',
        },
        'Статистика зʼявиться після навчання мережі.'
      );
    }

    var acc =
      typeof stats.accuracy === 'number'
        ? (stats.accuracy * 100).toFixed(1) + '%'
        : '—';

    return h(
      'div',
      { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
      StatItem('Навчальних прикладів', String(stats.trainingExamples)),
      StatItem('Норма', String(stats.normalExamples), 'normal'),
      StatItem('Аритмія', String(stats.arrhythmiaExamples), 'arrhythmia'),
      StatItem('Епохи', String(stats.epochs || stats.iterations)),
      StatItem(
        'Швидкість навчання',
        typeof stats.learningRate === 'number' ? String(stats.learningRate) : '—'
      ),
      StatItem(
        'Набір',
        stats.quality === 'noisy'
          ? 'Зашумлені'
          : stats.quality === 'all'
            ? 'Усі'
            : stats.quality === 'clean'
              ? 'Чисті'
              : '—'
      ),
      StatItem(
        'Похибка навчання',
        typeof stats.finalError === 'number'
          ? stats.finalError.toFixed(6)
          : '—'
      ),
      StatItem('Час навчання', Math.round(stats.trainingTimeMs) + ' мс'),
      StatItem('Точність перевірки', acc)
    );
  }

  HeartApp.components.StatsPanel = StatsPanel;
})(typeof window !== 'undefined' ? window : this);
