/**
 * Генерація синтетичних навчальних послідовностей інтервалів R-R.
 * Мережа має вчитися нерівномірності, тому normal і arrhythmia
 * мають перекривні абсолютні діапазони значень.
 *
 * Якість набору — числовий аналог «папок» з різною якістю даних:
 * clean — чіткий зазор між класами, noisy — більший шум і слабший зазор,
 * all — обидві групи в одному наборі.
 */
(function (global) {
  'use strict';

  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.core = HeartApp.core || {};

  var PROFILES = {
    clean: {
      normalJitter: 0.025,
      normalCvMax: 0.035,
      arrhythmiaLo: 0.62,
      arrhythmiaHi: 1.42,
      arrhythmiaCvMin: 0.12,
    },
    noisy: {
      normalJitter: 0.07,
      normalCvMax: 0.09,
      arrhythmiaLo: 0.8,
      arrhythmiaHi: 1.22,
      arrhythmiaCvMin: 0.095,
    },
  };

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function mean(values) {
    var sum = 0;
    for (var i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
  }

  function stdDev(values) {
    var m = mean(values);
    var acc = 0;
    for (var i = 0; i < values.length; i++) {
      var d = values[i] - m;
      acc += d * d;
    }
    return Math.sqrt(acc / values.length);
  }

  /** Коефіцієнт варіації — міра нерівномірності інтервалів. */
  function coefficientOfVariation(values) {
    var m = mean(values);
    if (m === 0) return 0;
    return stdDev(values) / m;
  }

  function profileFor(quality) {
    return PROFILES[quality] || PROFILES.clean;
  }

  function normalizeQuality(quality) {
    if (quality === 'noisy' || quality === 'all') return quality;
    return 'clean';
  }

  /**
   * Нормальний ритм: сусідні інтервали майже однакові.
   * База береться з того самого діапазону, що й для аритмії.
   */
  function generateNormalSequence(quality) {
    var profile = profileFor(quality);
    var attempts = 0;
    while (attempts < 50) {
      attempts += 1;
      var base = randomRange(0.55, 1.1);
      var seq = [];
      for (var i = 0; i < 4; i++) {
        var jitter = randomRange(-profile.normalJitter, profile.normalJitter);
        seq.push(round2(base * (1 + jitter)));
      }
      if (coefficientOfVariation(seq) <= profile.normalCvMax) {
        return seq;
      }
    }
    var fallbackBase = round2(randomRange(0.55, 1.1));
    return [fallbackBase, fallbackBase, fallbackBase, fallbackBase];
  }

  /**
   * Аритмія: інтервали суттєво відрізняються.
   * Абсолютні значення перекриваються з нормальним класом.
   */
  function generateArrhythmiaSequence(quality) {
    var profile = profileFor(quality);
    var attempts = 0;
    while (attempts < 50) {
      attempts += 1;
      var base = randomRange(0.55, 1.1);
      var seq = [];
      for (var i = 0; i < 4; i++) {
        var factor = randomRange(profile.arrhythmiaLo, profile.arrhythmiaHi);
        seq.push(round2(base * factor));
      }
      if (coefficientOfVariation(seq) >= profile.arrhythmiaCvMin) {
        return seq;
      }
    }
    var b = randomRange(0.55, 1.1);
    return [
      round2(b * 0.65),
      round2(b * 1.35),
      round2(b * 0.7),
      round2(b * 1.3),
    ];
  }

  function makeSample(label, quality) {
    var q = quality === 'noisy' ? 'noisy' : 'clean';
    return {
      input:
        label === 'normal'
          ? generateNormalSequence(q)
          : generateArrhythmiaSequence(q),
      label: label,
      quality: q,
      output:
        label === 'normal'
          ? { normal: 1, arrhythmia: 0 }
          : { normal: 0, arrhythmia: 1 },
    };
  }

  /**
   * Скільки прикладів кожної якості згенерувати для одного класу.
   * all — половина clean і половина noisy (батьківський набір).
   */
  function qualitySlices(count, quality) {
    var q = normalizeQuality(quality);
    if (q === 'all') {
      var cleanN = Math.floor(count / 2);
      return [
        { quality: 'clean', n: cleanN },
        { quality: 'noisy', n: count - cleanN },
      ];
    }
    return [{ quality: q, n: count }];
  }

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function emptyGroups() {
    return { clean: 0, noisy: 0 };
  }

  /**
   * План генерації: спочатку всі normal, потім усі arrhythmia.
   * onItem(done, total) викликається кожні 20 прикладів і на останньому.
   *
   * @param {number} perClass кількість прикладів на кожен клас
   * @param {string} quality clean | noisy | all
   */
  function generateDataset(perClass, quality, onItem) {
    var count = Math.max(1, Math.floor(Number(perClass) || 100));
    var q = normalizeQuality(quality);
    var slices = qualitySlices(count, q);
    var samples = [];
    var groups = emptyGroups();
    var total = count * 2;
    var done = 0;

    function pushSample(label, sampleQuality) {
      samples.push(makeSample(label, sampleQuality));
      groups[sampleQuality] += 1;
      done += 1;
      if (typeof onItem === 'function' && (done % 20 === 0 || done === total)) {
        onItem(done, total);
      }
    }

    var s;
    var n;
    for (s = 0; s < slices.length; s++) {
      for (n = 0; n < slices[s].n; n++) {
        pushSample('normal', slices[s].quality);
      }
    }
    for (s = 0; s < slices.length; s++) {
      for (n = 0; n < slices[s].n; n++) {
        pushSample('arrhythmia', slices[s].quality);
      }
    }

    return {
      samples: shuffle(samples),
      counts: { normal: count, arrhythmia: count },
      groups: groups,
      quality: q,
      total: total,
    };
  }

  /**
   * Генерація порціями на головному потоці, щоб progress bar оновлювався
   * навіть без Web Worker.
   */
  function generateDatasetAsync(perClass, quality, onProgress) {
    var count = Math.max(1, Math.floor(Number(perClass) || 100));
    var q = normalizeQuality(quality);
    var slices = qualitySlices(count, q);
    var queue = [];
    var s;
    var n;
    for (s = 0; s < slices.length; s++) {
      for (n = 0; n < slices[s].n; n++) {
        queue.push({ label: 'normal', quality: slices[s].quality });
      }
    }
    for (s = 0; s < slices.length; s++) {
      for (n = 0; n < slices[s].n; n++) {
        queue.push({ label: 'arrhythmia', quality: slices[s].quality });
      }
    }

    var samples = [];
    var groups = emptyGroups();
    var index = 0;
    var total = queue.length;
    var start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return new Promise(function (resolve) {
      function step() {
        var end = Math.min(index + 40, total);
        while (index < end) {
          var job = queue[index];
          samples.push(makeSample(job.label, job.quality));
          groups[job.quality] += 1;
          index += 1;
        }
        var elapsed =
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
        if (typeof onProgress === 'function') {
          onProgress({
            phase: 'generate',
            done: index,
            total: total,
            percent: total ? Math.round((index / total) * 100) : 100,
            elapsedMs: elapsed,
          });
        }
        if (index >= total) {
          resolve({
            samples: shuffle(samples),
            counts: { normal: count, arrhythmia: count },
            groups: groups,
            quality: q,
            total: total,
            generationTimeMs: elapsed,
            engine: 'main',
          });
          return;
        }
        setTimeout(step, 0);
      }
      step();
    });
  }

  HeartApp.core.dataGenerator = {
    PROFILES: PROFILES,
    randomRange: randomRange,
    generateNormalSequence: generateNormalSequence,
    generateArrhythmiaSequence: generateArrhythmiaSequence,
    generateDataset: generateDataset,
    generateDatasetAsync: generateDatasetAsync,
    shuffle: shuffle,
    coefficientOfVariation: coefficientOfVariation,
    normalizeQuality: normalizeQuality,
  };
})(typeof window !== 'undefined' ? window : this);
