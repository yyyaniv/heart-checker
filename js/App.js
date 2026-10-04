(function (global) {
  'use strict';

  var HeartApp = (global.HeartApp = global.HeartApp || {});
  var h = HeartApp.h;
  var useState = React.useState;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useEffect = React.useEffect;

  var MIN_EXAMPLES = 250;
  var MAX_EXAMPLES = 10000;
  var DEFAULT_EPOCHS = 2000;

  var HIDE_INTRO_KEY = 'heartApp.hideIntro';
  var BPM_MIN = 20;
  var BPM_MAX = 250;
  var BPM_MIN_COUNT = 4;
  var BPM_MAX_COUNT = 50;

  /** Дозволені символи: цифри, пробіли, коми, крапки з комою, крапка (дробові bpm). */
  function sanitizeBpmSeriesInput(text) {
    return String(text || '').replace(/[^\d\s,;.]/g, '');
  }

  /**
   * Парсинг bpm-серії довільної довжини:
   * "72, 68, 75, 71, 69, 73, 70, 68, 74".
   */
  function parseBpmSeries(text) {
    if (!text || !text.trim()) {
      return { ok: false, empty: true, reason: 'Введіть серію bpm.' };
    }
    var raw = text.split(/[,;\s]+/).filter(function (t) {
      return t !== '';
    });
    if (raw.length > BPM_MAX_COUNT) {
      return {
        ok: false,
        reason:
          'Не більше ' + BPM_MAX_COUNT + ' значень (зараз ' + raw.length + ').',
      };
    }
    var bpms = [];
    for (var i = 0; i < raw.length; i++) {
      var token = raw[i];
      var n = Number(token);
      if (token === '.' || !isFinite(n) || isNaN(n)) {
        return { ok: false, reason: '«' + token + '» не є числом.' };
      }
      if (n < BPM_MIN || n > BPM_MAX) {
        return {
          ok: false,
          reason:
            'bpm #' + (i + 1) + ' (' + n + ') має бути від 20 до 250.',
        };
      }
      bpms.push(n);
    }
    if (bpms.length < BPM_MIN_COUNT) {
      return {
        ok: false,
        reason:
          'Потрібно щонайменше 4 значення (зараз ' + bpms.length + ').',
      };
    }
    return { ok: true, bpms: bpms };
  }

  function readHideIntro() {
    try {
      return window.localStorage.getItem(HIDE_INTRO_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function writeHideIntro(hide) {
    try {
      if (hide) {
        window.localStorage.setItem(HIDE_INTRO_KEY, '1');
      } else {
        window.localStorage.removeItem(HIDE_INTRO_KEY);
      }
    } catch (err) {
      /* file:// або вимкнений storage — показуємо вікно знову */
    }
  }

  function App() {
    var c = HeartApp.components;
    var nn = HeartApp.core.neuralNetwork;
    var dg = HeartApp.core.dataGenerator;

    var datasetRef = useRef(null);
    var netReadyRef = useRef(false);

    var exampleCountState = useState(400);
    var exampleCount = exampleCountState[0];
    var setExampleCount = exampleCountState[1];

    var epochsState = useState(DEFAULT_EPOCHS);
    var epochs = epochsState[0];
    var setEpochs = epochsState[1];

    var learningRateState = useState(0.3);
    var learningRate = learningRateState[0];
    var setLearningRate = learningRateState[1];

    var qualityState = useState('all');
    var datasetQuality = qualityState[0];
    var setDatasetQuality = qualityState[1];

    var generationTimeState = useState(null);
    var generationTimeMs = generationTimeState[0];
    var setGenerationTimeMs = generationTimeState[1];

    var predictTimeState = useState(null);
    var predictTimeMs = predictTimeState[0];
    var setPredictTimeMs = predictTimeState[1];

    var engineState = useState(null);
    var engine = engineState[0];
    var setEngine = engineState[1];

    var liveElapsedState = useState(0);
    var liveElapsedMs = liveElapsedState[0];
    var setLiveElapsedMs = liveElapsedState[1];
    var busySinceRef = useRef(null);

    var trainingStatePair = useState('no-data');
    var trainingState = trainingStatePair[0];
    var setTrainingState = trainingStatePair[1];

    var predictProgressPair = useState(null);
    var predictProgress = predictProgressPair[0];
    var setPredictProgress = predictProgressPair[1];

    var progressPair = useState({
      phase: 'idle',
      percent: 0,
      iterations: 0,
      totalIterations: DEFAULT_EPOCHS,
      error: null,
      elapsedMs: 0,
    });
    var progress = progressPair[0];
    var setProgress = progressPair[1];

    /** Єдиний спосіб вводу: bpm-серія довільної довжини (N ≥ 4). */
    var seriesTextPair = useState('');
    var seriesText = seriesTextPair[0];
    var setSeriesText = seriesTextPair[1];

    var seriesErrorPair = useState(null);
    var seriesError = seriesErrorPair[0];
    var setSeriesError = seriesErrorPair[1];

    var predictionPair = useState(null);
    var prediction = predictionPair[0];
    var setPrediction = predictionPair[1];

    var statsPair = useState(null);
    var stats = statsPair[0];
    var setStats = statsPair[1];

    var messagePair = useState(null);
    var message = messagePair[0];
    var setMessage = messagePair[1];

    var messageKindPair = useState('info');
    var messageKind = messageKindPair[0];
    var setMessageKind = messageKindPair[1];

    var toastIdPair = useState(0);
    var toastId = toastIdPair[0];
    var setToastId = toastIdPair[1];

    var hideIntroPair = useState(readHideIntro);
    var hideIntro = hideIntroPair[0];
    var setHideIntro = hideIntroPair[1];

    var infoOpenPair = useState(function () {
      return !readHideIntro();
    });
    var infoOpen = infoOpenPair[0];
    var setInfoOpen = infoOpenPair[1];

    var predictingPair = useState(false);
    var predicting = predictingPair[0];
    var setPredicting = predictingPair[1];

    var activeTabPair = useState('work');
    var activeTab = activeTabPair[0];
    var setActiveTab = activeTabPair[1];

    var logPair = useState([
      {
        id: 'boot',
        time: new Date().toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        level: 'info',
        text: 'Застосунок запущено. Готовий до генерації даних.',
      },
    ]);
    var logEntries = logPair[0];
    var setLogEntries = logPair[1];

    function addLog(level, text) {
      var entry = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        time: new Date().toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        level: level || 'info',
        text: text,
      };
      setLogEntries(function (prev) {
        var next = prev.concat(entry);
        return next.length > 120 ? next.slice(next.length - 120) : next;
      });
    }

    function showMessage(text, kind) {
      setMessage(text);
      setMessageKind(kind || 'info');
      setToastId(function (n) {
        return n + 1;
      });
    }

    function clearToast() {
      setMessage(null);
    }

    function formatDuration(ms) {
      if (ms == null || !isFinite(Number(ms))) return '—';
      var value = Number(ms);
      if (value < 1) return 'менше 1 мс';
      if (value < 1000) return Math.round(value) + ' мс';
      return (value / 1000).toFixed(1) + ' с';
    }

    function qualityLabel(quality) {
      if (quality === 'noisy') return 'зашумлені приклади';
      if (quality === 'all') return 'усі набори';
      return 'чисті приклади';
    }

    /** Під час набору не даємо перевищити максимум. Порожнє поле лишається, доки його не залишать. */
    function capIntegerInput(raw, max) {
      var text = String(raw == null ? '' : raw).replace(/\D/g, '');
      if (text === '') return '';
      var n = Number(text);
      if (!isFinite(n) || n > max) return String(max);
      return String(n);
    }

    function finishIntegerInput(raw, min, max) {
      var n = Number(String(raw == null ? '' : raw).replace(/\D/g, ''));
      if (!isFinite(n) || n < min) n = min;
      if (n > max) n = max;
      return String(n);
    }

    /** Генерація ділить кількість порівну між класами, тож у полі має лишитися парне число. */
    function finishExampleCount(raw) {
      var n = Number(finishIntegerInput(raw, MIN_EXAMPLES, MAX_EXAMPLES));
      n = Math.floor(n / 2) * 2;
      if (n < MIN_EXAMPLES) n = MIN_EXAMPLES;
      return String(n);
    }

    function capRateInput(raw) {
      var text = String(raw == null ? '' : raw).replace(/[^\d.]/g, '');
      var dot = text.indexOf('.');
      if (dot !== -1) {
        text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '');
      }
      if (text === '' || text === '.') return text;
      var n = Number(text);
      if (!isFinite(n) || n >= 1) return '0.99';
      return text;
    }

    function finishRateInput(raw) {
      var n = Number(raw);
      if (!isFinite(n)) n = 0.3;
      n = Math.round(n * 100) / 100;
      if (n < 0.01) n = 0.01;
      if (n >= 1) n = 0.99;
      return String(n);
    }

    function clampEpochs(value) {
      var n = Math.round(Number(value));
      if (!isFinite(n)) return DEFAULT_EPOCHS;
      return Math.min(5000, Math.max(100, n));
    }

    function clampLearningRate(value) {
      var n = Number(value);
      if (!isFinite(n)) return 0.3;
      n = Math.round(n * 100) / 100;
      if (n >= 1) n = 0.99;
      return Math.max(0.01, n);
    }

    function idleProgress(total) {
      return {
        phase: 'idle',
        percent: 0,
        iterations: 0,
        totalIterations: total || DEFAULT_EPOCHS,
        error: null,
        elapsedMs: 0,
      };
    }

    useEffect(
      function () {
        var busy =
          trainingState === 'generating' ||
          trainingState === 'training' ||
          predicting;
        if (!busy) return undefined;
        if (!busySinceRef.current) busySinceRef.current = performance.now();
        var id = setInterval(function () {
          setLiveElapsedMs(performance.now() - busySinceRef.current);
        }, 200);
        return function () {
          clearInterval(id);
        };
      },
      [trainingState, predicting]
    );

    var handleGenerate = useCallback(
      function () {
        var total = Number(exampleCount);
        if (!isFinite(total) || total < MIN_EXAMPLES) {
          showMessage(
            'Вкажіть щонайменше 250 прикладів (разом для обох класів).',
            'error'
          );
          addLog('error', 'Генерація відхилена: кількість прикладів < 250.');
          return;
        }
        if (total > MAX_EXAMPLES) {
          showMessage('Не більше 10000 прикладів.', 'error');
          addLog('error', 'Генерація відхилена: кількість прикладів > 10000.');
          return;
        }
        var perClass = Math.floor(total / 2);
        var planned = perClass * 2;
        netReadyRef.current = false;
        datasetRef.current = null;
        setTrainingState('generating');
        setStats(null);
        setPrediction(null);
        setGenerationTimeMs(null);
        busySinceRef.current = performance.now();
        setLiveElapsedMs(0);
        setProgress({
          phase: 'generate',
          percent: 0,
          iterations: 0,
          totalIterations: planned,
          error: null,
          elapsedMs: 0,
        });
        addLog(
          'action',
          'Старт генерації: ' +
            planned +
            ' прикладів, набір «' +
            qualityLabel(datasetQuality) +
            '».'
        );
        showMessage('Генерація даних…', 'info');
        HeartApp.core.workerClient
          .generateDataset(perClass, datasetQuality, function (p) {
            setProgress({
              phase: 'generate',
              percent: p.percent,
              iterations: p.done,
              totalIterations: p.total,
              error: null,
              elapsedMs: p.elapsedMs || 0,
            });
          })
          .then(function (dataset) {
            datasetRef.current = dataset;
            setTrainingState('data-ready');
            setGenerationTimeMs(dataset.generationTimeMs || 0);
            setEngine(dataset.engine || 'main');
            busySinceRef.current = null;
            var groups = dataset.groups || {};
            addLog(
              'success',
              'Згенеровано dataset: ' +
                dataset.total +
                ' прикладів (' +
                dataset.counts.normal +
                ' норма + ' +
                dataset.counts.arrhythmia +
                ' аритмія), набір «' +
                qualityLabel(dataset.quality) +
                '», clean=' +
                (groups.clean || 0) +
                ', noisy=' +
                (groups.noisy || 0) +
                ', час=' +
                Math.round(dataset.generationTimeMs || 0) +
                ' мс, рушій=' +
                HeartApp.core.workerClient.engineName(dataset.engine) +
                '.'
            );
            showMessage(
              'Дані готові: ' +
                dataset.total +
                ' прикладів за ' +
                formatDuration(dataset.generationTimeMs) +
                '.',
              'success'
            );
          })
          .catch(function (err) {
            setTrainingState('error');
            busySinceRef.current = null;
            var msg = err && err.message ? err.message : String(err);
            addLog('error', 'Помилка генерації: ' + msg);
            showMessage('Помилка генерації: ' + msg, 'error');
          });
      },
      [exampleCount, datasetQuality]
    );

    var runTraining = useCallback(function () {
      var dataset = datasetRef.current;
      if (!dataset) {
        showMessage('Спочатку згенеруйте навчальні дані.', 'error');
        addLog('error', 'Спроба навчання без dataset.');
        return;
      }
      var epochCount = clampEpochs(epochs);
      var rate = clampLearningRate(learningRate);
      setEpochs(String(epochCount));
      setLearningRate(String(rate));
      setTrainingState('training');
      setPrediction(null);
      busySinceRef.current = performance.now();
      setLiveElapsedMs(0);
      addLog(
        'action',
        'Старт навчання: ' +
          dataset.total +
          ' прикладів, епох ≤ ' +
          epochCount +
          ', швидкість ' +
          rate +
          ', поріг похибки 0.005, набір «' +
          qualityLabel(dataset.quality) +
          '».'
      );
      showMessage('Навчання мережі…', 'info');
      setProgress({
        phase: 'train',
        percent: 0,
        iterations: 0,
        totalIterations: epochCount,
        error: null,
        elapsedMs: 0,
      });

      HeartApp.core.workerClient
        .trainNetwork(dataset, {
          iterations: epochCount,
          learningRate: rate,
          errorThresh: 0.005,
          onProgress: function (p) {
            setProgress({
              phase: 'train',
              percent: p.percent,
              iterations: p.iterations,
              totalIterations: p.totalIterations,
              error: p.error,
              elapsedMs: p.elapsedMs || 0,
            });
          },
        })
        .then(function (resultStats) {
          netReadyRef.current = true;
          setStats(resultStats);
          setTrainingState('trained');
          var acc =
            typeof resultStats.accuracy === 'number'
              ? (resultStats.accuracy * 100).toFixed(1) + '%'
              : '—';
          setEngine(resultStats.engine || 'main');
          busySinceRef.current = null;
          addLog(
            'success',
            'Мережу навчено: епох=' +
              resultStats.iterations +
              ', швидкість=' +
              resultStats.learningRate +
              ', похибка=' +
              (typeof resultStats.finalError === 'number'
                ? resultStats.finalError.toFixed(6)
                : '—') +
              ', час=' +
              Math.round(resultStats.trainingTimeMs) +
              ' мс, точність перевірки=' +
              acc +
              ', рушій=' +
              HeartApp.core.workerClient.engineName(resultStats.engine) +
              '.'
          );
          showMessage(
            'Мережу навчено. Точність перевірки: ' + acc + '.',
            'success'
          );
        })
        .catch(function (err) {
          setTrainingState('error');
          busySinceRef.current = null;
          var msg = err && err.message ? err.message : String(err);
          addLog('error', 'Помилка навчання: ' + msg);
          showMessage('Помилка навчання: ' + msg, 'error');
        });
    }, [epochs, learningRate]);

    function bpmToRrSec(bpm) {
      return Math.round((60 / bpm) * 100) / 100;
    }

    var handlePredictSeries = useCallback(
      function () {
        var parsed = parseBpmSeries(seriesText);
        if (!parsed.ok) {
          setSeriesError(parsed.reason);
          showMessage(parsed.reason, 'error');
          addLog('error', 'Розпізнавання серії відхилено: ' + parsed.reason);
          return;
        }
        if (!nn.isTrained() && !netReadyRef.current) {
          showMessage('Спочатку навчіть нейронну мережу.', 'error');
          addLog('error', 'Розпізнавання серії відхилено: мережа ще не навчена.');
          return;
        }
        setSeriesError(null);
        var rr = parsed.bpms.map(bpmToRrSec);
        var windowCount = Math.max(1, rr.length - 3);
        setPredicting(true);
        setPredictTimeMs(null);
        busySinceRef.current = performance.now();
        setLiveElapsedMs(0);
        setPredictProgress({
          phase: 'predict',
          percent: 0,
          iterations: 0,
          totalIterations: windowCount,
          error: null,
          elapsedMs: 0,
        });
        nn.predictSeriesAsync(rr, function (p) {
          setPredictProgress({
            phase: 'predict',
            percent: p.percent,
            iterations: p.done,
            totalIterations: p.total,
            error: null,
            elapsedMs: p.elapsedMs || 0,
          });
        })
          .then(function (result) {
            result.seriesText = parsed.bpms.join(', ');
            setPrediction(result);
            setPredictTimeMs(result.predictTimeMs || 0);
            busySinceRef.current = null;
            var normalPct = Math.round((result.raw.normal || 0) * 100);
            var arrPct = Math.round((result.raw.arrhythmia || 0) * 100);
            addLog(
              'success',
              'Серія bpm [' +
                parsed.bpms.join(', ') +
                '] → R-R=[' +
                rr.join(', ') +
                '] с, ' +
                result.windows.length +
                ' вікон по 4 → ' +
                (result.label === 'normal' ? 'норма' : 'аритмія') +
                ' (норма=' +
                normalPct +
                '%, аритмія=' +
                arrPct +
                '%), час=' +
                Math.round(result.predictTimeMs || 0) +
                ' мс.'
            );
            result.windows.forEach(function (w, idx) {
              addLog(
                'info',
                '  вікно ' +
                  (idx + 1) +
                  ' [' +
                  w.window.join(', ') +
                  '] → ' +
                  (w.label === 'normal' ? 'норма' : 'аритмія') +
                  ' (норма=' +
                  Math.round(w.raw.normal * 100) +
                  '%, аритмія=' +
                  Math.round(w.raw.arrhythmia * 100) +
                  '%)'
              );
            });
            showMessage(
              (result.label === 'normal'
                ? 'Класифікація серії: нормальний ритм'
                : 'Класифікація серії: аритмія') +
                ' за ' +
                formatDuration(result.predictTimeMs) +
                '.',
              'success'
            );
          })
          .catch(function (err) {
            busySinceRef.current = null;
            var msg = err && err.message ? err.message : 'Помилка розпізнавання серії';
            addLog('error', msg);
            showMessage(msg, 'error');
          })
          .then(function () {
            setPredicting(false);
            setPredictProgress(null);
          });
      },
      [seriesText]
    );

    var handleSeriesChange = useCallback(function (value) {
      var cleaned = sanitizeBpmSeriesInput(value);
      setSeriesText(cleaned);
      if (!cleaned.trim()) {
        setSeriesError(null);
        return;
      }
      var parsed = parseBpmSeries(cleaned);
      setSeriesError(parsed.ok ? null : parsed.reason);
    }, []);

    /** Живий прев'ю для RhythmVisual (bpm → секунди, без валідації помилок). */
    var rhythmPreviewIntervals = null;
    if (seriesText.trim()) {
      var previewRaw = seriesText
        .split(/[,;\s]+/)
        .filter(function (t) {
          return t !== '';
        })
        .map(Number)
        .filter(function (n) {
          return isFinite(n) && n >= 20 && n <= 250;
        });
      if (previewRaw.length >= 2) {
        rhythmPreviewIntervals = previewRaw.map(function (bpm) {
          return String(bpmToRrSec(bpm));
        });
      }
    }

    var handleClear = useCallback(function () {
      setSeriesText('');
      setSeriesError(null);
      setPrediction(null);
      setMessage(null);
      addLog('action', 'Інтерфейс очищено (bpm-серія, результат). Мережа збережена.');
      showMessage('Інтерфейс очищено. Навчена мережа збережена.', 'info');
    }, []);

    var handleResetNetwork = useCallback(function () {
      nn.resetNetwork();
      netReadyRef.current = false;
      var hasData = !!datasetRef.current;
      setTrainingState(hasData ? 'data-ready' : 'no-data');
      setStats(null);
      setPrediction(null);
      setProgress(idleProgress(clampEpochs(epochs)));
      addLog('warning', 'Мережу скинуто. Потрібне повторне навчання.');
      showMessage(
        hasData
          ? 'Мережу скинуто. Навчіть її знову на вже згенерованих даних.'
          : 'Мережу скинуто. Згенеруйте дані та навчіть знову.',
        'info'
      );
    }, []);

    var tabItems = [
      { id: 'work', label: 'Аналіз' },
      { id: 'stats', label: 'Статистика' },
    ];

    var workPanel = h(
      'div',
      {
        className:
          'grid grid-cols-1 lg:grid-cols-2 gap-4 content-start lg:h-full lg:min-h-0 lg:overflow-auto',
      },
      h(
        'div',
        { className: 'flex flex-col gap-2.5 min-h-0' },
        h(c.TrainingSection, {
          exampleCount: exampleCount,
          epochs: epochs,
          learningRate: learningRate,
          datasetQuality: datasetQuality,
          onExampleCountChange: function (e) {
            var next = capIntegerInput(e.target.value, MAX_EXAMPLES);
            e.target.value = next;
            setExampleCount(next);
          },
          onExampleCountBlur: function () {
            setExampleCount(function (current) {
              return finishExampleCount(current);
            });
          },
          onEpochsChange: function (e) {
            var next = capIntegerInput(e.target.value, 5000);
            e.target.value = next;
            setEpochs(next);
          },
          onEpochsBlur: function () {
            setEpochs(function (current) {
              return finishIntegerInput(current, 100, 5000);
            });
          },
          onLearningRateChange: function (e) {
            var next = capRateInput(e.target.value);
            e.target.value = next;
            setLearningRate(next);
          },
          onLearningRateBlur: function () {
            setLearningRate(function (current) {
              return finishRateInput(current);
            });
          },
          onQualityChange: function (e) {
            setDatasetQuality(e.target.value);
          },
          trainingState: trainingState,
          progress: progress,
          generationTimeMs: generationTimeMs,
          trainingTimeMs: stats ? stats.trainingTimeMs : null,
          liveElapsedMs: liveElapsedMs,
          engineLabel: engine
            ? HeartApp.core.workerClient.engineName(engine)
            : null,
          onGenerate: handleGenerate,
          onTrain: runTraining,
        }),
        h(c.IntervalInputs, {
          seriesText: seriesText,
          onSeriesChange: handleSeriesChange,
          seriesError: seriesError,
          seriesInvalid: !!(seriesText.trim() && !parseBpmSeries(seriesText).ok),
          onPredictSeries: handlePredictSeries,
          predicting: predicting,
          predictProgress: predictProgress,
          predictTimeMs: predictTimeMs,
          rhythmIntervals: rhythmPreviewIntervals,
        })
      ),
      h(
        'div',
        { className: 'flex flex-col gap-2.5 min-h-0' },
        h(c.ResultCard, { prediction: prediction, stats: stats })
      )
    );

    var statsPanel =
      activeTab === 'stats'
        ? h(
            'div',
            { className: 'flex flex-col gap-3 min-h-0 h-full' },
            h(c.StatsPanel, { stats: stats }),
            h(c.DebugDetails, {
              prediction: prediction,
              log: logEntries,
              onClearUI: handleClear,
              onResetNetwork: handleResetNetwork,
            })
          )
        : workPanel;

    return h(
      'div',
      { className: 'app-shell app-screen min-h-full lg:h-full' },
      h(
        'div',
        {
          className:
            'max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex flex-col min-h-full lg:h-full lg:min-h-0',
        },
        h(c.Header, {
          onInfo: function () {
            setInfoOpen(true);
          },
        }),
        h(
          c.Tabs,
          {
            items: tabItems,
            active: activeTab,
            onChange: setActiveTab,
            className: 'min-h-0',
          },
          statsPanel
        ),
        h(
          'p',
          {
            className:
              'shrink-0 text-center text-xs text-slate-500 pt-2 pb-1',
          },
          'Навчальний застосунок. Не для медичної діагностики.'
        )
      ),
      h(c.Toast, {
        toast: message
          ? { id: toastId, message: message, kind: messageKind }
          : null,
        onClose: clearToast,
      }),
      h(c.InfoModal, {
        open: infoOpen,
        hideIntro: hideIntro,
        onHideIntroChange: function (next) {
          setHideIntro(next);
          writeHideIntro(next);
        },
        onClose: function () {
          setInfoOpen(false);
        },
      })
    );
  }

  HeartApp.App = App;
})(typeof window !== 'undefined' ? window : this);
