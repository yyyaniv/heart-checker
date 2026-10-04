(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  function formatArray(arr) {
    if (!arr || !arr.length) return '—';
    return (
      '[' +
      arr
        .map(function (v) {
          return typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
        })
        .join(', ') +
      ']'
    );
  }

  var LEVEL_STYLES = {
    info: 'text-emerald-200',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    error: 'text-rose-300',
    action: 'text-teal-200',
  };

  var LEVEL_LABELS = {
    info: 'інфо',
    success: 'успіх',
    warning: 'увага',
    error: 'помилка',
    action: 'дія',
  };

  function classLabel(label) {
    return label === 'normal' ? 'норма' : label === 'arrhythmia' ? 'аритмія' : label;
  }

  function DebugDetails(props) {
    var prediction = props.prediction;
    var log = props.log || [];

    var snapshotRows = [];
    if (prediction) {
      snapshotRows.push('Вхід (R-R, с): ' + formatArray(prediction.input));
      snapshotRows.push(
        'Вихід мережі: норма=' +
          (prediction.raw.normal || 0).toFixed(3) +
          ', аритмія=' +
          (prediction.raw.arrhythmia || 0).toFixed(3)
      );
      snapshotRows.push('Клас: ' + classLabel(prediction.label));
      if (prediction.windows) {
        snapshotRows.push(
          'Вікна: ' + prediction.windows.length + ' × ' + prediction.windowSize
        );
      }
    }

    var logView =
      log.length === 0
        ? h(
            'p',
            { className: 'text-xs text-slate-500 px-1' },
            'Журнал порожній. Дії (генерація, навчання, розпізнавання) зʼявляться тут.'
          )
        : h(
            'div',
            {
              className:
                'rounded-xl border border-slate-200 bg-slate-950 text-slate-100 p-2.5 overflow-auto min-h-48 flex-1 font-mono text-[11px] leading-relaxed',
            },
            log.map(function (entry) {
                return h(
                  'div',
                  {
                    key: entry.id,
                    className:
                      'flex gap-2 border-b border-slate-800/80 last:border-0 py-1',
                  },
                  h(
                    'span',
                    { className: 'shrink-0 text-slate-500' },
                    entry.time
                  ),
                  h(
                    'span',
                    {
                      className:
                        'shrink-0 uppercase text-[10px] font-semibold w-14 ' +
                        (LEVEL_STYLES[entry.level] || LEVEL_STYLES.info),
                    },
                    LEVEL_LABELS[entry.level] || entry.level
                  ),
                  h('span', { className: 'text-slate-100 break-words' }, entry.text)
                );
              })
          );

    return h(
      'div',
      { className: 'h-full min-h-0 flex flex-col gap-2' },
      h(
        'div',
        { className: 'flex items-center justify-between gap-2 shrink-0' },
        h(
          'h3',
          { className: 'text-sm font-semibold text-slate-900' },
          'Журнал'
        ),
        h(
          'span',
          { className: 'text-[11px] text-slate-500' },
          log.length ? log.length + ' записів' : ''
        )
      ),
      logView,
      snapshotRows.length
        ? h(
            'div',
            { className: 'shrink-0' },
            h(
              'h3',
              { className: 'text-sm font-semibold text-slate-900 mb-1.5' },
              'Поточний знімок'
            ),
            h(
              'div',
              {
                className:
                  'rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1 text-[11px] font-mono text-slate-700 max-h-28 overflow-auto',
              },
              snapshotRows.map(function (row, idx) {
                return h('div', { key: 'snap-' + idx }, row);
              })
            )
          )
        : null,
      props.onClearUI || props.onResetNetwork
        ? h(
            'div',
            {
              className:
                'shrink-0 flex flex-wrap gap-2 pt-1',
            },
            props.onClearUI
              ? h(
                  'button',
                  {
                    type: 'button',
                    className:
                      'min-h-11 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
                    onClick: props.onClearUI,
                  },
                  'Очистити серію'
                )
              : null,
            props.onResetNetwork
              ? h(
                  'button',
                  {
                    type: 'button',
                    className:
                      'min-h-11 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
                    onClick: function () {
                      if (
                        window.confirm(
                          'Скинути навчену мережу? Потрібно буде згенерувати дані і навчити знову.'
                        )
                      ) {
                        props.onResetNetwork();
                      }
                    },
                  },
                  'Скинути мережу'
                )
              : null
          )
        : null
    );
  }

  HeartApp.components.DebugDetails = DebugDetails;
})(typeof window !== 'undefined' ? window : this);
