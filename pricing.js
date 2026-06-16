/* pricing.js — ЄДИНЕ ДЖЕРЕЛО ІСТИНИ для геометрії та площі кабінок BUDZIRKA.
   Підключайте класичним тегом <script src="pricing.js"></script> ДО основного скрипта
   (працює і в index.html, і в 3D-конфігураторі/переглядачі через ../pricing.js).
   Також експортується для Node — щоб ганяти pricing.test.mjs.
   Ставку €/м² застосунок бере зі своїх налаштувань (БД може перевизначити) — тут лише геометрія. */
(function(root){
  'use strict';
  var BZ = {
    RATE_EUR_M2: 170,        // Тип_кабінок: 170 €/м² (дефолт; БД може перевизначити в самому застосунку)
    EUR_UAH: 52.06,          // аркуш «Курс»
    CABIN_MIN_W: 1100,       // мін. ширина однієї кабінки, мм
    SIDE_PANEL: 200,         // панель ~200 мм з кожного боку дверей
    DEPTH_MIN: 1200, DEPTH_MAX: 1500,
    SIDES: { 'між':0, 'кут':1, 'окр':2 },   // вид → к-сть бічних панелей

    // мін. ширина однієї кабінки під вказані двері (мм)
    cabinMinW: function(doorW){ return Math.max(BZ.CABIN_MIN_W, (+doorW||0) + 2*BZ.SIDE_PANEL); },

    // перегородки автоматично за видом: між = двері−1, кут = двері, окрема = двері+1
    parts: function(doors, vid){
      var s = (BZ.SIDES[vid] != null) ? BZ.SIDES[vid] : 0;
      return Math.max(0, (+doors||0) - 1 + s);
    },

    // площа кабінок (м²): фасад×H + перегородки×(глибина×H). Усі розміри в мм, H — повна висота конструкції.
    cabinArea: function(facadeMm, depthMm, doors, vid, heightMm){
      var H = (+heightMm||0)/1000, F = (+facadeMm||0)/1000, D = (+depthMm||0)/1000;
      return F*H + BZ.parts(doors, vid) * D * H;
    },

    // площа панелей-перегородок (душові/пісуарні): n × ширина × власна висота (мм), НЕ висота кабіни
    panelArea: function(n, widthMm, heightMm){
      return (+n||1) * ((+widthMm||0)/1000) * ((+heightMm||0)/1000);
    },

    // вартість, €
    cost: function(areaM2, rate){ return (+areaM2||0) * (rate != null ? +rate : BZ.RATE_EUR_M2); }
  };
  root.BZ = BZ;
  if (typeof module !== 'undefined' && module.exports) module.exports = BZ;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
