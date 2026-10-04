(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;

  var STATUS_LABELS = {
    'no-data': 'Дані не згенеровані',
    generating: 'Генерація…',
    'data-ready': 'Дані готові',
    training: 'Навчання…',
    trained: 'Мережу навчено',
    error: 'Помилка навчання',
  };

  var INPUT_CLASS =
    'w-full min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-800 focus:border-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-200 outline-none disabled:opacity-60';

  function formatDuration(ms) {
    if (ms == null || !isFinite(Number(ms))) return null;
    var value = Number(ms);
    if (value < 1000) return Math.round(value) + ' мс';
    return (value / 1000).toFixed(1) + ' с';
  }

  function Field(id, label, control) {
    return h(
      'label',
      { className: 'block text-sm text-slate-600', htmlFor: id },
      h('span', { className: 'block mb-1 text-xs' }, label),
      control
    );
  }

  function TrainingSection(props) {
    var B = HeartApp.components.Button;
    var P = HeartApp.components.ProgressBar;
    var status = props.trainingState || 'no-data';
    var isBusy = status === 'training' || status === 'generating';
    var isTraining = status === 'training';
    var isTrained = status === 'trained';
    var showProgress =
      isBusy || (props.progress && props.progress.phase !== 'predict' && props.progress.percent > 0);
    var trainLabel = isTraining
      ? 'Навчання…'
      : isTrained
        ? 'Перенавчити'
        : 'Навчити мережу';
    var progress = props.progress || {};
    var live =
      isBusy && props.liveElapsedMs != null
        ? formatDuration(props.liveElapsedMs)
        : null;
    var generated = formatDuration(props.generationTimeMs);
    var trainedTime = formatDuration(props.trainingTimeMs);
    var timeBits = [];
    if (live) timeBits.push('Минуло: ' + live);
    if (!isBusy && generated) timeBits.push('Генерація: ' + generated);
    if (!isBusy && trainedTime) timeBits.push('Навчання: ' + trainedTime);
    if (props.engineLabel) timeBits.push(props.engineLabel);

    return h(
      HeartApp.components.Card,
      { title: 'Навчання мережі', className: 'lg:h-full' },
      h(
        'div',
        { className: 'grid grid-cols-2 gap-2 mb-2' },
        Field(
          'example-count',
          'Кількість прикладів',
          h('input', {
            id: 'example-count',
            type: 'number',
            min: 250,
            max: 10000,
            step: 50,
            value: props.exampleCount,
            onChange: props.onExampleCountChange,
            onBlur: props.onExampleCountBlur,
            disabled: isBusy,
            className: INPUT_CLASS,
          })
        ),
        Field(
          'epoch-count',
          'Епохи',
          h('input', {
            id: 'epoch-count',
            type: 'number',
            min: 100,
            max: 5000,
            step: 100,
            value: props.epochs,
            onChange: props.onEpochsChange,
            onBlur: props.onEpochsBlur,
            disabled: isBusy,
            className: INPUT_CLASS,
          })
        ),
        Field(
          'learning-rate',
          'Швидкість навчання',
          h('input', {
            id: 'learning-rate',
            type: 'number',
            min: 0.01,
            max: 0.99,
            step: 0.01,
            value: props.learningRate,
            onChange: props.onLearningRateChange,
            onBlur: props.onLearningRateBlur,
            disabled: isBusy,
            className: INPUT_CLASS,
          })
        ),
        Field(
          'dataset-quality',
          'Набір',
          h(
            'select',
            {
              id: 'dataset-quality',
              value: props.datasetQuality,
              onChange: props.onQualityChange,
              disabled: isBusy,
              className: INPUT_CLASS,
            },
            h('option', { value: 'all' }, 'Усі набори'),
            h('option', { value: 'clean' }, 'Чисті приклади'),
            h('option', { value: 'noisy' }, 'Зашумлені приклади')
          )
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-2 mb-2' },
        h(
          'span',
          {
            className:
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ' +
              (status === 'trained' || status === 'data-ready'
                ? 'bg-emerald-100 text-emerald-800'
                : status === 'training' || status === 'generating'
                  ? 'bg-[#ffd8c0] text-[#9a5b2f]'
                  : status === 'error'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-50 text-slate-600'),
          },
          STATUS_LABELS[status] || status
        )
      ),
      h(
        'div',
        { className: 'flex flex-wrap gap-1.5 mb-2' },
        h(
          B,
          {
            size: 'sm',
            variant: status === 'no-data' ? 'primary' : 'secondary',
            onClick: props.onGenerate,
            disabled: isBusy,
          },
          status === 'generating' ? 'Генерація…' : 'Згенерувати дані'
        ),
        h(
          B,
          {
            size: 'sm',
            variant: status === 'no-data' ? 'secondary' : 'primary',
            onClick: props.onTrain,
            disabled: isBusy || status === 'no-data' || status === 'generating',
          },
          trainLabel
        )
      ),
      showProgress
        ? h(P, {
            phase: progress.phase === 'generate' ? 'generate' : 'train',
            percent: progress.percent,
            iterations: progress.iterations,
            totalIterations: progress.totalIterations,
            error: progress.phase === 'generate' ? null : progress.error,
          })
        : null,
      timeBits.length
        ? h(
            'p',
            { className: 'mt-1 text-xs text-slate-600' },
            timeBits.join(' · ')
          )
        : null
    );
  }

  HeartApp.components.TrainingSection = TrainingSection;
})(typeof window !== 'undefined' ? window : this);
