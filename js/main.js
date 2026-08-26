/* ==========================================================================
   돌코롬 탑동 — main.js
   1) 스크롤 리빌       2) 네비 스크롤 상태     3) 스티키 스테이트먼트
   4) 숫자 카운트업     5) 메뉴 카테고리 필터   6) 오시는 길 Leaflet 지도
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 1. 리빌 */
  var revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------ 2. 네비게이션 */
  var nav = document.getElementById('nav');
  function onScrollNav() {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ------------------------------------------- 3. 스티키 스테이트먼트 문장 강조 */
  var track = document.querySelector('.statement__track');
  var lines = document.querySelectorAll('.statement__line');

  function onScrollStatement() {
    if (!track || !lines.length) return;

    var rect = track.getBoundingClientRect();
    var scrollable = track.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;

    // 0 ~ 1 사이의 섹션 진행률
    var progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    // 문장 수 + 여유분으로 나눠 순차 점등
    var activeCount = Math.floor(progress * (lines.length + 0.6)) + (progress > 0.02 ? 1 : 0);

    lines.forEach(function (line, i) {
      line.classList.toggle('is-on', i < activeCount);
    });
  }
  window.addEventListener('scroll', onScrollStatement, { passive: true });
  window.addEventListener('resize', onScrollStatement);
  onScrollStatement();

  /* ------------------------------------------------------------ 4. 숫자 카운트업 */
  var nums = document.querySelectorAll('.stat__num');
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }

    var duration = 1100;
    var start = null;
    el.textContent = '0' + suffix; // HTML에는 최종값이 들어 있으므로 0부터 다시 시작

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var numObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          numObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { numObserver.observe(el); });
  } else {
    nums.forEach(countUp);
  }

  /* --------------------------------------------------------- 5. 메뉴 필터 탭 */
  var tabs = document.querySelectorAll('.tab');
  var cards = document.querySelectorAll('#menuGrid .card');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var filter = tab.getAttribute('data-filter');

      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });

      cards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-cat') === filter;
        card.classList.toggle('is-hidden', !show);
        card.classList.remove('is-enter');
        if (show) {
          // 리플로우를 강제해 애니메이션을 다시 재생
          void card.offsetWidth;
          card.classList.add('is-enter');
        }
      });
    });
  });

  /* ------------------------------------------------------------ 6. 오시는 길 */
  var routeTabs = document.querySelectorAll('.route-tab');
  var routePanes = document.querySelectorAll('.route-pane');

  routeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var mode = tab.getAttribute('data-mode');

      routeTabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      routePanes.forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-pane') === mode);
      });
    });
  });

  /* ------------------------------------------------------- 6-1. Leaflet 지도 */
  // NOTE: 좌표는 대략치입니다. 실제 개업 전에 정확한 지번/좌표로 교체하세요.
  var AIRPORT = [33.5066, 126.4930];  // 제주국제공항
  var CAFE    = [33.5152, 126.5190];  // 제주더큰내일센터 (제주시 탑동로 55)

  // 공항 → 해안도로 → 서부두 → 탑동 을 따라가는 대략적인 경로
  var ROUTE = [
    AIRPORT,
    [33.5085, 126.4938],
    [33.5106, 126.4952],
    [33.5124, 126.4988],
    [33.5138, 126.5042],
    [33.5145, 126.5098],
    [33.5149, 126.5146],
    CAFE
  ];

  function makePin(cls, icon, label) {
    return L.divIcon({
      className: '',
      html: '<div class="pin ' + cls + '"><i>' + icon + '</i>' + label + '</div>',
      iconSize: null,
      iconAnchor: [22, 20]
    });
  }

  var mapEl = document.getElementById('map');
  if (mapEl && typeof L !== 'undefined') {
    var map = L.map(mapEl, {
      scrollWheelZoom: false,   // 페이지 스크롤을 방해하지 않도록
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
        '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // 경로 — 흰 테두리 + 파란 본선 + 흰 점선(진행 방향) 3겹으로 또렷하게
    L.polyline(ROUTE, {
      color: '#ffffff', weight: 11, opacity: 0.95, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);

    L.polyline(ROUTE, {
      color: '#3182f6', weight: 6, opacity: 1, lineJoin: 'round', lineCap: 'round'
    }).addTo(map);

    L.polyline(ROUTE, {
      color: '#ffffff', weight: 2.5, opacity: 0.85, lineCap: 'butt',
      dashArray: '2 10'
    }).addTo(map);

    L.marker(AIRPORT, { icon: makePin('pin--air', '✈️', '제주국제공항') })
      .addTo(map)
      .bindPopup('<b>제주국제공항</b>여기서 출발합니다. 차로 약 15분.');

    var cafeMarker = L.marker(CAFE, { icon: makePin('pin--cafe', '☕', '돌코롬 탑동'), zIndexOffset: 500 })
      .addTo(map)
      .bindPopup('<b>돌코롬 탑동</b>제주시 탑동로 55<br />제주더큰내일센터 1층<br />매일 08:00 – 21:00');

    var bounds = L.latLngBounds(ROUTE).pad(0.18);

    function fitRoute() {
      map.fitBounds(bounds, { paddingTopLeft: [20, 20], paddingBottomRight: [20, 60] });
    }
    fitRoute();

    // 지도 클릭 시에만 휠 줌 활성화 (스크롤 가로채기 방지)
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    document.getElementById('mapReset').addEventListener('click', fitRoute);

    // 지도가 화면에 들어올 때 크기를 다시 계산 + 카페 팝업 열기
    if ('IntersectionObserver' in window) {
      var mapObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            map.invalidateSize();
            fitRoute();
            cafeMarker.openPopup();
            mapObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      mapObserver.observe(mapEl);
    }

    window.addEventListener('resize', function () { map.invalidateSize(); });
  }
})();
