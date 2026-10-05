(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.components = HeartApp.components || {};
  var h = HeartApp.h;
  var useRef = React.useRef;
  var useEffect = React.useEffect;

  function parseValues(intervals) {
    if (!intervals || intervals.length < 2) return null;
    var vals = [];
    for (var i = 0; i < intervals.length; i++) {
      var n = Number(intervals[i]);
      if (!isFinite(n) || n <= 0) return null;
      vals.push(n);
    }
    return vals;
  }

  function mean(arr) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function cv(arr) {
    var m = mean(arr);
    if (m === 0) return 0;
    var acc = 0;
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i] - m;
      acc += d * d;
    }
    return Math.sqrt(acc / arr.length) / m;
  }

  function setupCanvas(canvas, cssH) {
    var dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    // завжди 100% батька — не фіксувати style.width у px (інакше лишається ~300)
    canvas.style.width = '100%';
    canvas.style.height = cssH + 'px';
    var host = canvas.parentElement || canvas;
    var cssW = Math.max(1, Math.floor(host.getBoundingClientRect().width));
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return { ctx: ctx, w: cssW, h: cssH };
  }

  function RhythmVisual(props) {
    var canvasRef = useRef(null);
    var values = parseValues(props.intervals || []);
    var variation = values ? cv(values) : null;
    var isRegular = variation !== null && variation <= 0.08;
    var hint =
      variation === null
        ? 'Графік інтервалів'
        : isRegular
          ? 'На вигляд рівномірний'
          : 'На вигляд нерівномірний';

    useEffect(
      function () {
        var canvas = canvasRef.current;
        if (!canvas) return;

        function paint() {
          var cssH = props.compact ? 140 : 150;
          var setup = setupCanvas(canvas, cssH);
          var ctx = setup.ctx;
          var cssW = setup.w;

          ctx.clearRect(0, 0, cssW, cssH);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cssW, cssH);

          // легка сітка
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.lineWidth = 1;
          for (var gx = 0; gx < cssW; gx += 24) {
            ctx.beginPath();
            ctx.moveTo(gx + 0.5, 0);
            ctx.lineTo(gx + 0.5, cssH);
            ctx.stroke();
          }
          for (var gy = 0; gy < cssH; gy += 24) {
            ctx.beginPath();
            ctx.moveTo(0, gy + 0.5);
            ctx.lineTo(cssW, gy + 0.5);
            ctx.stroke();
          }

          var baseline = Math.round(cssH * 0.7);
          var flat = 16;
          var leftPad = flat + 14;
          var rightPad = flat + 14;
          var usable = Math.max(40, cssW - leftPad - rightPad);

          if (!values) {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(flat, baseline);
            ctx.lineTo(cssW - flat, baseline);
            ctx.stroke();
            ctx.fillStyle = '#64748b';
            ctx.font = '600 13px Segoe UI, sans-serif';
            ctx.fillText('Графік ритму зʼявиться після введення серії', flat, 24);
            return;
          }

          var sum = 0;
          var i;
          for (i = 0; i < values.length; i++) sum += values[i];

          // пропорційні щілини + підлога, щоб QRS не наїжджали одне на одне
          var nGaps = values.length;
          var propGaps = [];
          var minProp = Infinity;
          for (i = 0; i < nGaps; i++) {
            propGaps.push((values[i] / sum) * usable);
            if (propGaps[i] < minProp) minProp = propGaps[i];
          }
          var glyphScale = Math.min(1, Math.max(0.4, (minProp - 6) / 34));
          var beatL = Math.max(5, Math.round(12 * glyphScale));
          var beatR = Math.max(8, Math.round(22 * glyphScale));
          var minGap = beatL + beatR + 6;
          var minTotal = minGap * nGaps;
          var gaps = [];
          if (minTotal >= usable) {
            var even = usable / nGaps;
            for (i = 0; i < nGaps; i++) gaps.push(even);
            beatL = Math.max(3, Math.floor(even * 0.28));
            beatR = Math.max(5, Math.floor(even * 0.42));
            glyphScale = Math.min(glyphScale, even / 34);
          } else {
            var free = usable - minTotal;
            for (i = 0; i < nGaps; i++) {
              gaps.push(minGap + free * (values[i] / sum));
            }
          }

          var positions = [Math.round(leftPad)];
          var x = leftPad;
          for (i = 0; i < nGaps; i++) {
            x += gaps[i];
            positions.push(Math.round(x));
          }
          positions[positions.length - 1] = Math.round(leftPad + usable);

          var roomUp = baseline - 16;
          var amp = Math.min(48, roomUp) * Math.min(1, 0.55 + glyphScale * 0.45);
          var qDepth = Math.max(3, Math.round(6 * glyphScale));

          // один шлях: плоский край → QRS (без відкату назад)
          var pts = [];
          pts.push({ x: 4, y: baseline });
          pts.push({ x: positions[0] - beatL, y: baseline });
          for (i = 0; i < positions.length; i++) {
            var px = positions[i];
            pts.push({ x: px - beatL, y: baseline });
            pts.push({ x: px - Math.round(beatL * 0.5), y: baseline + qDepth });
            pts.push({ x: px - Math.round(beatL * 0.25), y: baseline - amp * 0.2 });
            pts.push({ x: px, y: baseline - amp });
            pts.push({ x: px + Math.round(beatR * 0.18), y: baseline + amp * 0.28 });
            pts.push({ x: px + Math.round(beatR * 0.45), y: baseline });
            pts.push({ x: px + Math.round(beatR * 0.72), y: baseline - amp * 0.16 });
            pts.push({ x: px + beatR, y: baseline });
            if (i < positions.length - 1) {
              var nextStart = positions[i + 1] - beatL;
              if (nextStart > px + beatR + 1) {
                pts.push({ x: nextStart, y: baseline });
              }
            }
          }
          pts.push({ x: cssW - 4, y: baseline });

          ctx.strokeStyle = '#065f46';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, cssW, cssH);
          ctx.clip();

          ctx.fillStyle = '#0f172a';
          ctx.font = '700 13px Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          var labelRight = -Infinity;
          for (i = 0; i < positions.length; i++) {
            var rLabel = 'R' + (i + 1);
            var rWidth = ctx.measureText(rLabel).width;
            var rCenter = positions[i];
            if (rCenter - rWidth / 2 < labelRight + 8) continue;
            if (rCenter + rWidth / 2 > cssW - 4) continue;
            ctx.fillText(rLabel, rCenter, 16);
            labelRight = rCenter + rWidth / 2;
          }

          ctx.font = '600 12px Segoe UI, sans-serif';
          ctx.fillStyle = '#334155';
          labelRight = -Infinity;
          for (i = 0; i < values.length; i++) {
            var intervalLabel = values[i].toFixed(2);
            var intervalWidth = ctx.measureText(intervalLabel).width;
            var mid = (positions[i] + positions[i + 1]) / 2;
            if (mid - intervalWidth / 2 < labelRight + 6) continue;
            if (mid + intervalWidth / 2 > cssW - 4) continue;
            if (positions[i + 1] - positions[i] < intervalWidth + 8) continue;
            ctx.fillText(intervalLabel, mid, baseline + 18);
            labelRight = mid + intervalWidth / 2;
          }
          ctx.restore();
        }

        paint();
        var ro =
          typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(function () {
                paint();
              })
            : null;
        if (ro) ro.observe(canvas.parentElement || canvas);
        return function () {
          if (ro) ro.disconnect();
        };
      },
      [props.intervals, props.compact, isRegular]
    );

    var body = h(
      'div',
      { className: 'space-y-2 w-full min-w-0' },
      h('p', { className: 'text-xs text-slate-500' }, 'Схематична візуалізація · не запис ЕКГ'),
      h(
        'div',
        { className: 'flex flex-wrap items-center gap-2' },
        h(
          'span',
          {
            className:
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ' +
              (variation === null
                ? 'bg-slate-100 text-slate-600'
                : isRegular
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'),
          },
          hint
        ),
        variation !== null
          ? h(
              'span',
              { className: 'text-xs text-slate-500' },
              'мінливість ' +
                (variation * 100).toFixed(1) +
                '% · середній інтервал ' +
                mean(values).toFixed(2) +
                (props.unitMode === 'relative' ? ' (відн.)' : ' с')
            )
          : null
      ),
      h(
        'div',
        {
          className:
            'overflow-hidden rounded-xl border border-slate-200 bg-white',
        },
        h('canvas', {
          ref: canvasRef,
          className: 'block w-full max-w-full',
          style: { width: '100%', height: props.compact ? '140px' : '150px' },
          'aria-label': hint,
        })
      )
    );

    if (props.embedded) {
      return body;
    }

    return h(
      HeartApp.components.Card,
      { title: 'Візуалізація ритму', className: 'min-h-0' },
      body
    );
  }

  HeartApp.components.RhythmVisual = RhythmVisual;
})(typeof window !== 'undefined' ? window : this);
