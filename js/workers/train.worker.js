/**
 * Фонове навчання і генерація набору.
 * importScripts відносно цього файлу: js/workers/ → vendor/ і js/core/.
 * Brain.js виставляє self.brain, тож працює і в Worker.
 */
'use strict';

importScripts('../../vendor/brain.min.js');
importScripts('../core/dataGenerator.js');
importScripts('../core/neuralNetwork.js');

function reply(id, payload) {
  payload.id = id;
  self.postMessage(payload);
}

self.postMessage({ type: 'ready' });

self.onmessage = function (event) {
  var msg = event.data || {};

  if (msg.cmd === 'ping') {
    reply(msg.id, { type: 'ready' });
    return;
  }

  if (msg.cmd === 'generate') {
    try {
      var started = performance.now();
      var dataset = HeartApp.core.dataGenerator.generateDataset(
        msg.perClass,
        msg.quality,
        function (done, total) {
          reply(msg.id, {
            type: 'progress',
            phase: 'generate',
            done: done,
            total: total,
            percent: total ? Math.round((done / total) * 100) : 100,
            elapsedMs: performance.now() - started,
          });
        }
      );
      dataset.generationTimeMs = performance.now() - started;
      dataset.engine = 'worker';
      reply(msg.id, { type: 'done', dataset: dataset });
    } catch (err) {
      reply(msg.id, {
        type: 'error',
        message: err && err.message ? err.message : String(err),
      });
    }
    return;
  }

  if (msg.cmd === 'train') {
    var trainStarted = performance.now();
    HeartApp.core.neuralNetwork
      .trainNetwork(msg.dataset, {
        iterations: msg.iterations,
        learningRate: msg.learningRate,
        errorThresh: msg.errorThresh,
        engine: 'worker',
        onProgress: function (progress) {
          reply(msg.id, {
            type: 'progress',
            phase: 'train',
            iterations: progress.iterations,
            totalIterations: progress.totalIterations,
            error: progress.error,
            percent: progress.percent,
            elapsedMs: performance.now() - trainStarted,
          });
        },
      })
      .then(function (stats) {
        stats.engine = 'worker';
        reply(msg.id, {
          type: 'done',
          stats: stats,
          networkJson: HeartApp.core.neuralNetwork.getNetwork().toJSON(),
        });
      })
      .catch(function (err) {
        reply(msg.id, {
          type: 'error',
          message: err && err.message ? err.message : String(err),
        });
      });
  }
};
