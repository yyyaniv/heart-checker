/**
 * Короткий хелпер замість JSX: h('div', { className }, children...)
 */
(function (global) {
  'use strict';
  var HeartApp = (global.HeartApp = global.HeartApp || {});
  HeartApp.h = function h(type, props) {
    var args = [type, props || null];
    for (var i = 2; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return React.createElement.apply(React, args);
  };
})(typeof window !== 'undefined' ? window : this);
