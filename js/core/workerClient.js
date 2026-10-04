/**
 * Запускає генерацію і навчання у Web Worker.
 * Якщо Worker недоступний (наприклад, file:// у Safari), повертається
 * до порційної генерації і trainAsync на головному потоці.
 */
(function (global) {
  'use strict';

  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.core = HeartApp.core || {};

  var support = null;

  function workerUrl() {
    return new URL('js/workers/train.worker.js', window.location.href);
  }

  function supportsWorkers() {
    if (support !== null) return Promise.resolve(support);
    if (typeof Worker === 'undefined') {
      support = false;
      return Promise.resolve(false);
    }
    return new Promise(function (resolve) {
      var worker;
      try {
        worker = new Worker(workerUrl());
      } catch (err) {
        support = false;
        resolve(false);
        return;
      }
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        support = ok;
        try {
          worker.terminate();
        } catch (ignore) {
          /* already closed */
        }
        resolve(ok);
      }
      var timer = setTimeout(function () {
        finish(false);
      }, 2500);
      worker.onmessage = function (event) {
        if (event.data && event.data.type === 'ready') {
          clearTimeout(timer);
          finish(true);
        }
      };
      worker.onerror = function () {
        clearTimeout(timer);
        finish(false);
      };
    });
  }

  function runJob(payload, onProgress) {
    return new Promise(function (resolve, reject) {
      var worker;
      try {
        worker = new Worker(workerUrl());
      } catch (err) {
        support = false;
        reject(err);
        return;
      }
      function close() {
        try {
          worker.terminate();
        } catch (ignore) {
          /* already closed */
        }
      }
      worker.onmessage = function (event) {
        var data = event.data || {};
        if (data.type === 'ready') return;
        if (data.type === 'progress') {
          if (typeof onProgress === 'function') onProgress(data);
          return;
        }
        close();
        if (data.type === 'done') resolve(data);
        else reject(new Error(data.message || 'Помилка Web Worker'));
      };
      worker.onerror = function () {
        close();
        support = false;
        reject(new Error('Web Worker зупинився з помилкою'));
      };
      worker.postMessage(payload);
    });
  }

  function mergeDatasets(cleanSet, noisySet, elapsedMs) {
    var dg = HeartApp.core.dataGenerator;
    return {
      samples: dg.shuffle(cleanSet.samples.concat(noisySet.samples)),
      counts: {
        normal: cleanSet.counts.normal + noisySet.counts.normal,
        arrhythmia: cleanSet.counts.arrhythmia + noisySet.counts.arrhythmia,
      },
      groups: {
        clean: (cleanSet.groups && cleanSet.groups.clean) || 0,
        noisy: (noisySet.groups && noisySet.groups.noisy) || 0,
      },
      quality: 'all',
      total: cleanSet.total + noisySet.total,
      generationTimeMs: elapsedMs,
      engine: 'worker',
    };
  }

  function generateDataset(perClass, quality, onProgress) {
    var q = HeartApp.core.dataGenerator.normalizeQuality(quality);
    return supportsWorkers().then(function (ok) {
      if (!ok) {
        return HeartApp.core.dataGenerator.generateDatasetAsync(
          perClass,
          q,
          onProgress
        );
      }
      if (q === 'all') {
        var cleanN = Math.floor(perClass / 2);
        var noisyN = perClass - cleanN;
        var parts = {
          clean: { done: 0, total: cleanN * 2 },
          noisy: { done: 0, total: noisyN * 2 },
        };
        var started = performance.now();
        function report() {
          var done = parts.clean.done + parts.noisy.done;
          var total = parts.clean.total + parts.noisy.total;
          if (typeof onProgress === 'function') {
            onProgress({
              phase: 'generate',
              done: done,
              total: total,
              percent: total ? Math.round((done / total) * 100) : 100,
              elapsedMs: performance.now() - started,
            });
          }
        }
        return Promise.all([
          runJob(
            { cmd: 'generate', perClass: cleanN, quality: 'clean' },
            function (progress) {
              parts.clean.done = progress.done;
              parts.clean.total = progress.total;
              report();
            }
          ),
          runJob(
            { cmd: 'generate', perClass: noisyN, quality: 'noisy' },
            function (progress) {
              parts.noisy.done = progress.done;
              parts.noisy.total = progress.total;
              report();
            }
          ),
        ])
          .then(function (results) {
            return mergeDatasets(
              results[0].dataset,
              results[1].dataset,
              performance.now() - started
            );
          })
          .catch(function () {
            support = false;
            return HeartApp.core.dataGenerator.generateDatasetAsync(
              perClass,
              q,
              onProgress
            );
          });
      }

      var startedOne = performance.now();
      return runJob({ cmd: 'generate', perClass: perClass, quality: q }, onProgress)
        .then(function (msg) {
          msg.dataset.engine = 'worker';
          if (!msg.dataset.generationTimeMs) {
            msg.dataset.generationTimeMs = performance.now() - startedOne;
          }
          return msg.dataset;
        })
        .catch(function () {
          support = false;
          return HeartApp.core.dataGenerator.generateDatasetAsync(
            perClass,
            q,
            onProgress
          );
        });
    });
  }

  function trainNetwork(dataset, options) {
    options = options || {};
    return supportsWorkers().then(function (ok) {
      if (!ok) {
        options.engine = 'main';
        return HeartApp.core.neuralNetwork.trainNetwork(dataset, options);
      }
      return runJob(
        {
          cmd: 'train',
          dataset: dataset,
          iterations: options.iterations,
          learningRate: options.learningRate,
          errorThresh: options.errorThresh,
        },
        options.onProgress
      )
        .then(function (msg) {
          return HeartApp.core.neuralNetwork.installTrained(
            msg.networkJson,
            msg.stats
          );
        })
        .catch(function () {
          support = false;
          options.engine = 'main';
          return HeartApp.core.neuralNetwork.trainNetwork(dataset, options);
        });
    });
  }

  function engineName(engine) {
    return engine === 'worker' ? 'Web Worker' : 'головний потік';
  }

  HeartApp.core.workerClient = {
    supportsWorkers: supportsWorkers,
    generateDataset: generateDataset,
    trainNetwork: trainNetwork,
    engineName: engineName,
  };
})(typeof window !== 'undefined' ? window : this);
