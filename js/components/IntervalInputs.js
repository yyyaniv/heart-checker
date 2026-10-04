(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  var SERIES_EXAMPLES = [
    {
      key: 'normal',
      label: 'Норма',
      chip: 'bg-emerald-100 text-emerald-800 hover:border-emerald-200',
      text: '72, 68, 75, 71, 69, 73, 70, 68, 74',
    },
    {
      key: 'irregular',
      label: 'Аритмія',
      chip: 'bg-[#ffd8c0] text-[#9a5b2f] hover:border-[#ffc4a3]',
      text: '52, 118, 48, 132, 55, 126, 44, 140, 50, 124',
    },
  ];

  function IntervalInputs(props) {
    var B = HeartApp.components.Button;

    return h(
      HeartApp.components.Card,
      { className: 'flex flex-col lg:h-full' },
      h(
        'h2',
        { className: 'text-base font-semibold text-slate-800 mb-2' },
        'Аналіз ритму'
      ),
      h(
        'div',
        { className: 'mb-2.5' },
        h(HeartApp.components.RhythmVisual, {
          intervals: props.rhythmIntervals,
          embedded: true,
          compact: true,
        })
      ),
      h(
        'div',
        {
          className:
            'mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5',
        },
        h(
          'label',
          {
            className: 'text-sm font-medium text-slate-600',
            htmlFor: 'bpm-series',
          },
          'Серія ударів за хвилину'
        ),
        h(
          'div',
          { className: 'flex flex-wrap items-center gap-1.5' },
          h(
            'span',
            { className: 'text-xs text-slate-500 whitespace-nowrap' },
            'Тестові дані'
          ),
          SERIES_EXAMPLES.map(function (ex) {
            return h(
              'button',
              {
                key: ex.key,
                type: 'button',
                className:
                  'min-h-9 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ' +
                  ex.chip,
                onClick: function () {
                  props.onSeriesChange(ex.text);
                },
              },
              ex.label
            );
          })
        )
      ),
      h('textarea', {
        id: 'bpm-series',
        value: props.seriesText,
        onChange: function (e) {
          props.onSeriesChange(e.target.value);
        },
        rows: 3,
        placeholder: '72, 68, 75, 71, 69, 73, 70, 68, 74',
        'aria-invalid': props.seriesError ? 'true' : 'false',
        'aria-describedby': props.seriesError ? 'bpm-series-error' : undefined,
        className:
          'w-full min-h-11 max-h-28 overflow-y-auto rounded-2xl border px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition font-mono resize-none ' +
          (props.seriesError
            ? 'border-[#ffc4a3] bg-[#ffd8c0] focus:border-[#ffc4a3] focus:ring-2 focus:ring-[#ffd8c0]'
            : 'border-slate-200 bg-slate-50 focus:border-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-200'),
      }),
      props.seriesError
        ? h(
            'p',
            {
              id: 'bpm-series-error',
              className: 'mt-1 text-xs text-[#9a5b2f] leading-snug',
              role: 'alert',
            },
            props.seriesError
          )
        : null,
      h(
        'div',
        { className: 'mt-auto pt-3 space-y-2' },
        props.predicting && props.predictProgress
          ? h(HeartApp.components.ProgressBar, {
              phase: 'predict',
              percent: props.predictProgress.percent,
              iterations: props.predictProgress.iterations,
              totalIterations: props.predictProgress.totalIterations,
            })
          : null,
        h(
          B,
          {
            variant: 'primary',
            className: 'w-full min-h-11',
            onClick: props.onPredictSeries,
            disabled: props.predicting || props.seriesInvalid,
          },
          props.predicting ? 'Розпізнавання…' : 'Розпізнати серію'
        ),
        props.predictTimeMs != null && !props.predicting
          ? h(
              'p',
              { className: 'text-xs text-slate-600' },
              'Час розпізнавання: ' +
                (props.predictTimeMs < 1
                  ? 'менше 1 мс'
                  : props.predictTimeMs < 1000
                    ? Math.round(props.predictTimeMs) + ' мс'
                    : (props.predictTimeMs / 1000).toFixed(1) + ' с')
            )
          : null
      )
    );
  }

  HeartApp.components.IntervalInputs = IntervalInputs;
})(typeof window !== 'undefined' ? window : this);
