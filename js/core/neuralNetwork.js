/**
 * Brain.js feed-forward мережа для класифікації 4 інтервалів.
 * Нормалізація спільна для training і prediction.
 */
(function (global) {
  'use strict';

  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.core = HeartApp.core || {};

  var network = null;
  var trained = false;
  var lastStats = null;
  /** Мережа завжди приймає рівно 4 числа (як у первісному завданні). */
  var WINDOW_SIZE = 4;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Мережа має вчитися НЕРІВНОМІРНОСТІ, а не абсолютній тривалості інтервалів.
   * Тому кожен інтервал ділимо на середнє по послідовності (відносна форма ритму),
   * а потім стискаємо в [0, 1], бо sigmoid-мережа очікує саме такий діапазон.
   * ratio 1.0 → 0.5 (центр діапазону).
   */
  function normalizeSequence(seq) {
    if (!seq || seq.length === 0) return [];
    var sum = 0;
    var i;
    for (i = 0; i < seq.length; i++) sum += Number(seq[i]);
    var mean = sum / seq.length;
    if (!isFinite(mean) || mean === 0) {
      return seq.map(function () {
        return 0.5;
      });
    }
    return seq.map(function (v) {
      return clamp(Number(v) / mean / 2, 0, 1);
    });
  }

  function createNetwork() {
    if (typeof brain === 'undefined' || !brain.NeuralNetwork) {
      throw new Error('Brain.js не завантажено. Перевірте файл vendor/brain.min.js');
    }
    network = new brain.NeuralNetwork({
      hiddenLayers: [8],
      activation: 'sigmoid',
    });
    trained = false;
    lastStats = null;
    return network;
  }

  function getNetwork() {
    if (!network) createNetwork();
    return network;
  }

  function resetNetwork() {
    network = null;
    trained = false;
    lastStats = null;
    return createNetwork();
  }

  function isTrained() {
    return trained && network !== null;
  }

  function toTrainingRows(samples) {
    return samples.map(function (s) {
      return {
        input: normalizeSequence(s.input),
        output: s.output,
      };
    });
  }

  function splitTrainTest(samples, trainRatio) {
    var ratio = typeof trainRatio === 'number' ? trainRatio : 0.8;
    var shuffled = HeartApp.core.dataGenerator.shuffle(samples);
    var cut = Math.max(1, Math.floor(shuffled.length * ratio));
    if (cut >= shuffled.length) cut = shuffled.length - 1;
    if (cut < 1) cut = 1;
    return {
      train: shuffled.slice(0, cut),
      test: shuffled.slice(cut),
    };
  }

  function evaluateAccuracy(net, testSamples) {
    if (!testSamples || testSamples.length === 0) return null;
    var correct = 0;
    for (var i = 0; i < testSamples.length; i++) {
      var sample = testSamples[i];
      var out = net.run(normalizeSequence(sample.input));
      var predicted =
        (out.normal || 0) >= (out.arrhythmia || 0) ? 'normal' : 'arrhythmia';
      if (predicted === sample.label) correct += 1;
    }
    return correct / testSamples.length;
  }

  function trainChunked(net, rows, options, onProgress) {
    var iterations = options.iterations;
    var errorThresh = options.errorThresh;
    var learningRate = options.learningRate || 0.3;
    var chunk = 50;
    var done = 0;
    var lastError = 1;
    var start = performance.now();

    return new Promise(function (resolve) {
      function step() {
        var remaining = iterations - done;
        var n = Math.min(chunk, remaining);
        var result = net.train(rows, {
          iterations: n,
          errorThresh: errorThresh,
          learningRate: learningRate,
          log: false,
        });
        done += result.iterations || n;
        lastError = result.error;
        if (typeof onProgress === 'function') {
          onProgress({
            phase: 'train',
            iterations: Math.min(done, iterations),
            totalIterations: iterations,
            error: lastError,
            percent: Math.min(100, Math.round((done / iterations) * 100)),
            elapsedMs: performance.now() - start,
          });
        }
        if (done >= iterations || lastError <= errorThresh) {
          resolve({
            iterations: Math.min(done, iterations),
            error: lastError,
            trainingTimeMs: performance.now() - start,
          });
          return;
        }
        setTimeout(step, 0);
      }
      step();
    });
  }

  /**
   * Навчання з прогресом. Використовує trainAsync, якщо доступний.
   */
  function trainNetwork(dataset, options) {
    options = options || {};
    var iterations = options.iterations || 2000;
    var errorThresh =
      options.errorThresh == null ? 0.005 : options.errorThresh;
    var learningRate = options.learningRate || 0.3;
    var onProgress = options.onProgress;
    var net = createNetwork();

    var split = splitTrainTest(dataset.samples, 0.8);
    var trainRows = toTrainingRows(split.train);
    var start = performance.now();

    function finish(trainResult) {
      var accuracy = evaluateAccuracy(net, split.test);
      trained = true;
      lastStats = {
        trainingExamples: dataset.total,
        normalExamples: dataset.counts.normal,
        arrhythmiaExamples: dataset.counts.arrhythmia,
        trainSize: split.train.length,
        testSize: split.test.length,
        iterations: trainResult.iterations,
        epochs: trainResult.iterations,
        learningRate: learningRate,
        quality: dataset.quality || 'clean',
        groups: dataset.groups || null,
        engine: options.engine || 'main',
        finalError: trainResult.error,
        trainingTimeMs: trainResult.trainingTimeMs || performance.now() - start,
        accuracy: accuracy,
      };
      if (typeof onProgress === 'function') {
        onProgress({
          phase: 'train',
          iterations: trainResult.iterations,
          totalIterations: iterations,
          error: trainResult.error,
          percent: 100,
          elapsedMs: lastStats.trainingTimeMs,
        });
      }
      return lastStats;
    }

    if (typeof net.trainAsync === 'function') {
      return net
        .trainAsync(trainRows, {
          iterations: iterations,
          errorThresh: errorThresh,
          learningRate: learningRate,
          log: false,
          callbackPeriod: 1,
          callback: function (status) {
            if (typeof onProgress === 'function') {
              onProgress({
                phase: 'train',
                iterations: status.iterations,
                totalIterations: iterations,
                error: status.error,
                percent: Math.min(
                  100,
                  Math.round((status.iterations / iterations) * 100)
                ),
                elapsedMs: performance.now() - start,
              });
            }
          },
        })
        .then(function (result) {
          return finish({
            iterations: result.iterations,
            error: result.error,
            trainingTimeMs: performance.now() - start,
          });
        });
    }

    return trainChunked(
      net,
      trainRows,
      {
        iterations: iterations,
        errorThresh: errorThresh,
        learningRate: learningRate,
      },
      onProgress
    ).then(finish);
  }

  function predict(sequence) {
    if (!isTrained()) {
      throw new Error('Мережа ще не навчена');
    }
    var normalized = normalizeSequence(sequence);
    var raw = network.run(normalized);
    var normal = Number(raw.normal) || 0;
    var arrhythmia = Number(raw.arrhythmia) || 0;
    var label = normal >= arrhythmia ? 'normal' : 'arrhythmia';
    return {
      label: label,
      raw: { normal: normal, arrhythmia: arrhythmia },
      normalized: normalized,
      input: sequence.slice(),
    };
  }

  function getStats() {
    return lastStats ? Object.assign({}, lastStats) : null;
  }

  /** Відновити навчену мережу з JSON, який повернув Web Worker. */
  function installTrained(networkJson, stats) {
    var net = createNetwork();
    net.fromJSON(networkJson);
    trained = true;
    lastStats = Object.assign({}, stats || {}, { engine: (stats && stats.engine) || 'worker' });
    return getStats();
  }

  /**
   * Розпізнавання з прогресом по вікнах. Короткі серії рахуються одразу,
   * довгі — порціями, щоб індикатор показував частку оброблених вікон.
   */
  function predictSeriesAsync(sequence, onProgress) {
    return new Promise(function (resolve, reject) {
      var start = performance.now();
      try {
        if (!isTrained()) {
          throw new Error('Мережа ще не навчена');
        }
        if (!sequence || sequence.length < WINDOW_SIZE) {
          throw new Error('Потрібно щонайменше ' + WINDOW_SIZE + ' інтервали.');
        }
      } catch (err) {
        reject(err);
        return;
      }

      var windows = [];
      var i;
      for (i = 0; i + WINDOW_SIZE <= sequence.length; i++) {
        windows.push(sequence.slice(i, i + WINDOW_SIZE));
      }
      var perWindow = [];
      var sumNormal = 0;
      var sumArrhythmia = 0;
      var index = 0;
      var chunk = windows.length > 8 ? 4 : windows.length;

      function finish() {
        var count = perWindow.length;
        var avgNormal = sumNormal / count;
        var avgArrhythmia = sumArrhythmia / count;
        var elapsed = performance.now() - start;
        if (typeof onProgress === 'function') {
          onProgress({
            phase: 'predict',
            done: count,
            total: count,
            percent: 100,
            elapsedMs: elapsed,
          });
        }
        resolve({
          label: avgNormal >= avgArrhythmia ? 'normal' : 'arrhythmia',
          raw: { normal: avgNormal, arrhythmia: avgArrhythmia },
          input: sequence.slice(),
          windows: perWindow,
          windowSize: WINDOW_SIZE,
          predictTimeMs: elapsed,
        });
      }

      function step() {
        var end = Math.min(index + chunk, windows.length);
        while (index < end) {
          var p = predict(windows[index]);
          sumNormal += p.raw.normal;
          sumArrhythmia += p.raw.arrhythmia;
          perWindow.push({ window: windows[index], label: p.label, raw: p.raw });
          index += 1;
        }
        if (typeof onProgress === 'function') {
          onProgress({
            phase: 'predict',
            done: index,
            total: windows.length,
            percent: Math.round((index / windows.length) * 100),
            elapsedMs: performance.now() - start,
          });
        }
        if (index >= windows.length) {
          finish();
          return;
        }
        setTimeout(step, 0);
      }

      step();
    });
  }

  /**
   * Розпізнавання серії довільної довжини (N ≥ 4).
   * Мережа сама приймає лише 4 числа, тому
   * серія розбивається на послідовні вікна по 4 (sliding window, stride 1),
   * кожне класифікується окремо, а фінальний вердикт — усереднення
   * confidence по всіх вікнах.
   */
  function predictSeries(sequence) {
    if (!isTrained()) {
      throw new Error('Мережа ще не навчена');
    }
    if (!sequence || sequence.length < WINDOW_SIZE) {
      throw new Error('Потрібно щонайменше ' + WINDOW_SIZE + ' інтервали.');
    }
    var windows = [];
    for (var i = 0; i + WINDOW_SIZE <= sequence.length; i++) {
      windows.push(sequence.slice(i, i + WINDOW_SIZE));
    }
    var sumNormal = 0;
    var sumArrhythmia = 0;
    var perWindow = windows.map(function (w) {
      var p = predict(w);
      sumNormal += p.raw.normal;
      sumArrhythmia += p.raw.arrhythmia;
      return { window: w, label: p.label, raw: p.raw };
    });
    var count = perWindow.length;
    var avgNormal = sumNormal / count;
    var avgArrhythmia = sumArrhythmia / count;
    var label = avgNormal >= avgArrhythmia ? 'normal' : 'arrhythmia';
    return {
      label: label,
      raw: { normal: avgNormal, arrhythmia: avgArrhythmia },
      input: sequence.slice(),
      windows: perWindow,
      windowSize: WINDOW_SIZE,
    };
  }

  /**
   * Benchmark для наступних лабораторних.
   * Приклад: HeartApp.core.neuralNetwork.benchmarkNetwork([100, 500, 1000])
   */
  function benchmarkNetwork(sizes) {
    var list = sizes || [100, 500, 1000, 5000];
    var results = [];
    var chain = Promise.resolve();

    list.forEach(function (perClass) {
      chain = chain.then(function () {
        var dataset = HeartApp.core.dataGenerator.generateDataset(perClass);
        var t0 = performance.now();
        return trainNetwork(dataset, {
          iterations: 1000,
          errorThresh: 0.01,
        }).then(function (stats) {
          results.push({
            perClass: perClass,
            total: dataset.total,
            trainingTimeMs: performance.now() - t0,
            iterations: stats.iterations,
            finalError: stats.finalError,
            accuracy: stats.accuracy,
          });
        });
      });
    });

    return chain.then(function () {
      return results;
    });
  }

  HeartApp.core.neuralNetwork = {
    WINDOW_SIZE: WINDOW_SIZE,
    createNetwork: createNetwork,
    normalizeSequence: normalizeSequence,
    trainNetwork: trainNetwork,
    predict: predict,
    predictSeries: predictSeries,
    predictSeriesAsync: predictSeriesAsync,
    installTrained: installTrained,
    resetNetwork: resetNetwork,
    isTrained: isTrained,
    getStats: getStats,
    getNetwork: getNetwork,
    benchmarkNetwork: benchmarkNetwork,
  };
})(typeof window !== 'undefined' ? window : this);
