(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;
  var useRef = React.useRef;
  var useEffect = React.useEffect;

  var LINE = '#065f46';
  var TRACK = 'rgba(6, 95, 70, 0.16)';

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** Кількість сердець на запуск; удари рахуються під ширину в layoutStrip. */
  function generateStrip() {
    return { hearts: randInt(2, 3) };
  }

  /**
   * QRS-лінія йде рівно через слоти сердець.
   * Серця малюються окремим контуром, зсунутим трохи нижче середини лінії.
   */
  function layoutStrip(w, h, strip) {
    var baseline = Math.round(h * 0.7);
    var amp = Math.max(12, baseline - 8);
    var hs = Math.max(11, Math.round(h * 0.28));
    var heartPad = Math.max(16, Math.round(hs * 1.1));
    var heartW = hs * 2.05 + heartPad * 2;
    var pad = 4;
    var usable = Math.max(1, w - pad * 2);
    var heartsN = strip.hearts;
    if (w < 420) heartsN = Math.min(heartsN, 2);

    var targetBeat = w < 420 ? 38 : w < 768 ? 44 : 48;
    var beatCount = Math.floor((usable - heartsN * heartW) / targetBeat);
    var groupN = heartsN + 1;
    if (beatCount < groupN) beatCount = groupN;

    var beatW = (usable - heartsN * heartW) / beatCount;
    if (beatW < 32) {
      var scale = usable / (beatCount * 32 + heartsN * heartW);
      beatW = 32 * scale;
      heartW *= scale;
      hs *= scale;
    }

    var groups = [];
    var i;
    var base = Math.floor(beatCount / groupN);
    var extra = beatCount % groupN;
    for (i = 0; i < groupN; i++) {
      groups.push(base + (i < extra ? 1 : 0));
    }
    if (groups[0] < 1) groups[0] = 1;

    var x = pad;
    var hearts = [];
    var beats = [];
    var b;
    for (i = 0; i < groups.length; i++) {
      for (b = 0; b < groups[i]; b++) {
        beats.push({ x: x, width: beatW });
        x += beatW;
      }
      if (i < heartsN) {
        hearts.push({ cx: x + heartW * 0.5, size: hs });
        x += heartW;
      }
    }
    return { baseline: baseline, amp: amp, beats: beats, hearts: hearts };
  }

  function strokeEcgLine(ctx, w, layout) {
    var i;
    ctx.beginPath();
    ctx.moveTo(0, layout.baseline);
    ctx.lineTo(layout.beats.length ? layout.beats[0].x : 0, layout.baseline);
    for (i = 0; i < layout.beats.length; i++) {
      beat(ctx, layout.beats[i].x, layout.baseline, layout.amp, layout.beats[i].width);
    }
    ctx.lineTo(w, layout.baseline);
    ctx.stroke();
  }

  function strokeHearts(ctx, layout) {
    var i;
    for (i = 0; i < layout.hearts.length; i++) {
      heartOutline(ctx, layout.hearts[i].cx, layout.baseline, layout.hearts[i].size);
    }
  }

  /**
   * Той самий QRS, що в RhythmVisual: Q, високий R, S, мала T.
   */
  function beat(ctx, x, baseline, roomUp, width) {
    var glyphScale = Math.min(1, Math.max(0.4, (width - 6) / 34));
    var beatL = Math.max(5, Math.round(12 * glyphScale));
    var beatR = Math.max(8, Math.round(22 * glyphScale));
    var qDepth = Math.max(3, Math.round(6 * glyphScale));
    var amp = Math.min(48, roomUp) * Math.min(1, 0.55 + glyphScale * 0.45);
    var px = Math.round(x + width * 0.5);
    var end = x + width;

    ctx.lineTo(px - beatL, baseline);
    ctx.lineTo(px - Math.round(beatL * 0.5), baseline + qDepth);
    ctx.lineTo(px - Math.round(beatL * 0.25), baseline - amp * 0.2);
    ctx.lineTo(px, baseline - amp);
    ctx.lineTo(px + Math.round(beatR * 0.18), baseline + amp * 0.28);
    ctx.lineTo(px + Math.round(beatR * 0.45), baseline);
    ctx.lineTo(px + Math.round(beatR * 0.72), baseline - amp * 0.16);
    ctx.lineTo(px + beatR, baseline);
    if (end > px + beatR + 1) {
      ctx.lineTo(end, baseline);
    }
  }

  /**
   * Симетричне серце: геометричний центр трохи нижче базової лінії,
   * тож лінія проходить майже посередині, гармонійно.
   */
  function heartOutline(ctx, cx, baseline, size) {
    var scale = size / 16;
    var steps = 80;
    var raw = [];
    var minY = Infinity;
    var maxY = -Infinity;
    var i;
    for (i = 0; i <= steps; i++) {
      var t = Math.PI + (i / steps) * Math.PI * 2;
      var st = Math.sin(t);
      var hx = 16 * st * st * st;
      var hy =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      raw.push({ x: hx, y: hy });
      if (hy < minY) minY = hy;
      if (hy > maxY) maxY = hy;
    }
    var mid = (minY + maxY) / 2;
    var down = -2;
    ctx.beginPath();
    for (i = 0; i < raw.length; i++) {
      var px = cx + raw[i].x * scale;
      var py = baseline + down - (raw[i].y - mid) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
  }

  function drawEcgProgress(ctx, w, h, percent, strip) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    var layout = layoutStrip(w, h, strip);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;

    ctx.strokeStyle = TRACK;
    strokeEcgLine(ctx, w, layout);
    strokeHearts(ctx, layout);

    var fillW = Math.max(0, Math.min(w, (percent / 100) * w));
    if (fillW <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, fillW, h);
    ctx.clip();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2.5;
    strokeEcgLine(ctx, w, layout);
    strokeHearts(ctx, layout);
    ctx.restore();
  }

  function ProgressBar(props) {
    var canvasRef = useRef(null);
    var stripRef = useRef(null);
    var lastPercentRef = useRef(null);
    var percent = Math.max(0, Math.min(100, Number(props.percent) || 0));
    var iterations = props.iterations || 0;
    var total = props.totalIterations || 0;
    var error = props.error;
    var phase = props.phase || 'train';
    var rounded = Math.round(percent);
    var countLabel =
      phase === 'generate'
        ? 'Прикладів: ' + iterations + ' / ' + total
        : phase === 'predict'
          ? 'Вікон: ' + iterations + ' / ' + total
          : 'Епоха: ' + iterations + ' / ' + total;
    var aria =
      phase === 'generate'
        ? 'Прогрес генерації даних'
        : phase === 'predict'
          ? 'Прогрес розпізнавання'
          : 'Прогрес навчання';

    useEffect(
      function () {
        var canvas = canvasRef.current;
        if (!canvas) return;

        if (
          !stripRef.current ||
          percent === 0 ||
          (lastPercentRef.current != null &&
            percent + 0.5 < lastPercentRef.current)
        ) {
          stripRef.current = generateStrip();
        }
        lastPercentRef.current = percent;

        function paint() {
          var dpr = window.devicePixelRatio || 1;
          var cssH = 56;
          canvas.style.width = '100%';
          canvas.style.height = cssH + 'px';
          var host = canvas.parentElement || canvas;
          var cssW = Math.max(1, Math.floor(host.getBoundingClientRect().width));
          canvas.width = Math.round(cssW * dpr);
          canvas.height = Math.round(cssH * dpr);
          var ctx = canvas.getContext('2d');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.imageSmoothingEnabled = true;
          drawEcgProgress(ctx, cssW, cssH, percent, stripRef.current);
        }

        paint();
        var ro =
          typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(paint)
            : null;
        if (ro) ro.observe(canvas.parentElement || canvas);
        return function () {
          if (ro) ro.disconnect();
        };
      },
      [percent]
    );

    return h(
      'div',
      { className: 'space-y-1' },
      h(
        'div',
        {
          className:
            'overflow-hidden rounded-xl border border-slate-200 bg-white',
        },
        h('canvas', {
          ref: canvasRef,
          className: 'block w-full bg-white',
          style: { height: '56px' },
          role: 'progressbar',
          'aria-label': aria,
          'aria-valuenow': rounded,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuetext': rounded + '%',
        })
      ),
      h(
        'div',
        {
          className:
            'flex items-baseline gap-x-3 text-xs text-slate-600 whitespace-nowrap overflow-x-auto',
        },
        total ? h('span', null, countLabel) : null,
        typeof error === 'number'
          ? h('span', null, 'Похибка: ' + error.toFixed(4))
          : null,
        h('span', { className: 'ml-auto font-semibold text-slate-800' }, rounded + '%')
      )
    );
  }

  HeartApp.components.ProgressBar = ProgressBar;
})(typeof window !== 'undefined' ? window : this);
