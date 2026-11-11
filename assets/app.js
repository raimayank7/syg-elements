/* elements: table search and family filter, recently viewed, sortable list, molar mass calculator, symbol quiz */
(function () {
  'use strict';
  var d = document, S = window.SYG, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var KEY = 'syg-elements-recent';

  /* element page: remember it */
  var art = $('[data-el]');
  if (art) S.recent(KEY, { u: '/' + art.getAttribute('data-el') + '/', t: art.getAttribute('data-name') });

  /* home: search + family filter + recent */
  var pt = $('.pt'), q = $('#q');
  if (pt && q) {
    var els = $$('.el', pt), sug = $('#sug'), fam = -1;
    var paint = function () {
      var v = q.value.trim().toLowerCase(), hits = [];
      els.forEach(function (a) {
        var ok = true;
        if (fam > -1 && +a.getAttribute('data-f') !== fam) ok = false;
        if (ok && v) {
          var n = a.getAttribute('data-n'), s = a.getAttribute('data-s'), z = a.getAttribute('data-z');
          ok = /^\d+$/.test(v) ? z === v : (s === v || s.indexOf(v) === 0 && v.length < 3 || n.indexOf(v) > -1);
          if (ok) hits.push({ a: a, exact: s === v || z === v || n === v });
        }
        a.classList.toggle('hit', ok && (v !== '' || fam > -1));
      });
      pt.classList.toggle('filter', v !== '' || fam > -1);
      if (!v) { sug.hidden = true; return; }
      hits.sort(function (x, y) { return (y.exact ? 1 : 0) - (x.exact ? 1 : 0); });
      sug.innerHTML = hits.length ? hits.slice(0, 8).map(function (h) {
        return '<li><button type="button" data-go="' + h.a.getAttribute('href') + '"><b>' + S.esc($('b', h.a).textContent) + '</b> ' + S.esc($('span', h.a).textContent) + ' <small>number ' + h.a.getAttribute('data-z') + '</small></button></li>';
      }).join('') : '<li class="none">No element matches. Try a name, a symbol such as Fe, or a number from 1 to 118.</li>';
      sug.hidden = false;
    };
    q.addEventListener('input', paint);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var b = $('[data-go]', sug); if (b && !sug.hidden) location.href = b.getAttribute('data-go'); } if (e.key === 'Escape') sug.hidden = true; });
    sug.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) location.href = b.getAttribute('data-go'); });
    $('#fams').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var on = b.getAttribute('aria-pressed') === 'true';
      $$('#fams button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      fam = on ? -1 : +b.getAttribute('data-fam');
      if (!on) b.setAttribute('aria-pressed', 'true');
      paint();
    });
    var rec = S.recent(KEY);
    if (rec.length) { $('#recent-list').innerHTML = rec.map(function (r) { return '<a href="' + S.esc(r.u) + '">' + S.esc(r.t) + '</a>'; }).join(''); $('#recent').hidden = false; }
  }

  /* list: sort and filter */
  var tb = $('table.sortable');
  if (tb) {
    var body = $('tbody', tb), rows = $$('tr', body), ths = $$('th', tb), cnt = $('#lcount');
    var sortBy = function (i) {
      var th = ths[i], asc = th.getAttribute('aria-sort') !== 'ascending';
      ths.forEach(function (t) { t.removeAttribute('aria-sort'); });
      th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
      rows.sort(function (a, b) {
        var x = a.children[i].getAttribute('data-v'), y = b.children[i].getAttribute('data-v');
        if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1;   /* no value: always last */
        var nx = parseFloat(x), ny = parseFloat(y), r = isNaN(nx) || isNaN(ny) ? x.localeCompare(y) : nx - ny;
        return asc ? r : -r;
      });
      rows.forEach(function (r) { body.appendChild(r); });
    };
    ths.forEach(function (th, i) {
      th.addEventListener('click', function () { sortBy(i); });
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy(i); } });
    });
    var lq = $('#lq');
    lq.addEventListener('input', function () {
      var v = lq.value.trim().toLowerCase(), n = 0;
      rows.forEach(function (r) { var ok = !v || r.getAttribute('data-q').indexOf(v) > -1; r.hidden = !ok; if (ok) n++; });
      cnt.textContent = v ? n + ' of 118 elements shown' : '';
    });
  }

  /* molar mass */
  var f = $('#f'), out = $('#mm');
  if (f && out) {
    var M = null;
    var parse = function (s) {
      /* returns {symbol: count}; throws a message for the reader on a bad formula */
      s = s.replace(/\s+/g, '').replace(/[·•*]/g, '.').replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); });
      if (!s) throw '';
      var total = {};
      s.split('.').forEach(function (part) {
        if (!part) throw 'A dot must have a formula on both sides, as in CuSO4.5H2O.';
        var m = /^(\d+)/.exec(part), mult = 1, i = 0;
        if (m) { mult = +m[1]; i = m[1].length; }
        var stack = [{}];
        while (i < part.length) {
          var c = part[i];
          if (c === '(' || c === '[') { stack.push({}); i++; }
          else if (c === ')' || c === ']') {
            if (stack.length < 2) throw 'There is a closing bracket without an opening one.';
            i++; var n = /^\d+/.exec(part.slice(i)), k = n ? +n[0] : 1; if (n) i += n[0].length;
            var top = stack.pop(), under = stack[stack.length - 1];
            for (var e in top) under[e] = (under[e] || 0) + top[e] * k;
          } else if (/[A-Z]/.test(c)) {
            var sym = c; i++;
            if (i < part.length && /[a-z]/.test(part[i]) && M[sym + part[i]]) { sym += part[i]; i++; }
            else if (i < part.length && /[a-z]/.test(part[i])) throw '"' + sym + part[i] + '" is not an element symbol. Check the capital letters.';
            if (!M[sym]) throw '"' + sym + '" is not an element symbol.';
            var n2 = /^\d+/.exec(part.slice(i)), k2 = n2 ? +n2[0] : 1; if (n2) i += n2[0].length;
            var cur = stack[stack.length - 1]; cur[sym] = (cur[sym] || 0) + k2;
          } else if (/[a-z]/.test(c)) throw 'Element symbols start with a capital letter. Did you mean "' + c.toUpperCase() + '"?';
          else throw 'The character "' + c + '" cannot be used in a formula.';
        }
        if (stack.length !== 1) throw 'A bracket is not closed.';
        for (var e2 in stack[0]) total[e2] = (total[e2] || 0) + stack[0][e2] * mult;
      });
      return total;
    };
    var show = function () {
      if (!M) return;
      var t;
      try { t = parse(f.value); } catch (msg) { out.hidden = !msg; out.innerHTML = msg ? '<p>' + S.esc(msg) + '</p>' : ''; return; }
      var sum = 0, rowsH = '', k;
      for (k in t) sum += t[k] * M[k].m;
      for (k in t) {
        var part = t[k] * M[k].m, pc = part / sum * 100;
        rowsH += '<tr><td><a href="/' + M[k].s + '/">' + S.esc(M[k].n) + '</a> (' + k + ')</td><td data-l="Atoms">' + t[k] + '</td><td data-l="Atomic mass">' + M[k].m + '</td><td data-l="Share by mass">' + pc.toFixed(2) + '%<span class="bar" style="width:' + pc.toFixed(1) + '%"></span></td></tr>';
      }
      var txt = 'Molar mass of ' + f.value.trim() + ' = ' + sum.toFixed(3) + ' g/mol';
      out.innerHTML = '<h2>Molar mass of ' + S.esc(f.value.trim()) + '</h2><p class="big">' + sum.toFixed(3) + ' g/mol</p>' +
        '<div class="tbl"><table class="stack mmt"><thead><tr><th>Element</th><th>Atoms</th><th>Atomic mass</th><th>Share by mass</th></tr></thead><tbody>' + rowsH + '</tbody></table></div>' +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(txt) + '">Copy result</button><button class="btn sm ghost" type="button" data-wa="' + S.esc(txt + ' (elements.shareyourgroup.com/molar-mass/)') + '">WhatsApp</button></div>';
      out.hidden = false;
    };
    S.json('/data/elements.json').then(function (j) { M = {}; j.forEach(function (r) { M[r[1]] = { n: r[2], s: r[3], m: r[4] }; }); show(); })
      .catch(function () { out.hidden = false; out.innerHTML = '<p>The element data could not be loaded. Check your connection and reload the page.</p>'; });
    f.addEventListener('input', show);
    $('#ex').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { f.value = b.getAttribute('data-f'); show(); f.focus(); } });
  }

  /* quiz */
  var qz = $('#quiz');
  if (qz) {
    var box = $('#qbox'), best = $('#qbest'), N = 20, data = null, round, score, idx;
    var bestKey = function () { return 'syg-elements-quiz-' + N; };
    var showBest = function () { var b = 0; try { b = +localStorage.getItem(bestKey()) || 0; } catch (e) {} best.textContent = b ? 'Your best score for this set: ' + b + ' out of 10.' : ''; };
    var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    var ask = function () {
      if (idx >= round.length) {
        var b = 0; try { b = +localStorage.getItem(bestKey()) || 0; if (score > b) localStorage.setItem(bestKey(), score); } catch (e) {}
        var txt = 'I scored ' + score + ' out of 10 on the element symbol quiz (' + (N === 118 ? 'all 118 elements' : 'first ' + N + ' elements') + '). Try it: https://elements.shareyourgroup.com/quiz/';
        box.innerHTML = '<p class="qask">You scored ' + score + ' out of 10</p><p>' + (score === 10 ? 'Perfect. Try a larger set.' : score >= 7 ? 'Well done. One more round to make it stick?' : 'Keep practising. After each answer, the link opens that element so you can read about it.') + '</p>' +
          '<div class="acts"><button class="btn" type="button" id="qstart">Play again</button><button class="btn ghost" type="button" data-wa="' + S.esc(txt) + '">Challenge a friend</button></div>';
        showBest(); return;
      }
      var e = round[idx], bySym = Math.random() < 0.5, pool = shuffle(data.slice(0, N).filter(function (x) { return x !== e; })).slice(0, 3).concat([e]);
      shuffle(pool);
      box.innerHTML = '<p class="hint">Question ' + (idx + 1) + ' of 10 · Score ' + score + '</p><p class="qask">' + (bySym ? 'Which element has the symbol <b>' + e[1] + '</b>' : 'What is the symbol of <b>' + S.esc(e[2]) + '</b>') + '</p>' +
        '<div class="qopts">' + pool.map(function (p) { return '<button type="button" data-ok="' + (p === e ? 1 : 0) + '">' + S.esc(bySym ? p[2] : p[1]) + '</button>'; }).join('') + '</div><p id="qfb" role="status"></p>';
    };
    var start = function () { round = shuffle(data.slice(0, N)).slice(0, 10); score = 0; idx = 0; ask(); };
    qz.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'qstart') { if (data) start(); else S.json('/data/elements.json').then(function (j) { data = j; start(); }).catch(function () { S.toast('Could not load the questions. Check your connection.'); }); return; }
      if (b.hasAttribute('data-n')) { $$('#qset button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); N = +b.getAttribute('data-n'); showBest(); if (data && round) start(); return; }
      if (b.hasAttribute('data-ok') && !b.disabled) {
        var ok = b.getAttribute('data-ok') === '1', e = round[idx];
        $$('.qopts button').forEach(function (x) { x.disabled = true; if (x.getAttribute('data-ok') === '1') x.classList.add('right'); });
        if (ok) score++; else b.classList.add('wrong');
        $('#qfb').innerHTML = (ok ? 'Correct. ' : 'Not quite. ') + '<a href="/' + e[3] + '/">' + S.esc(e[2]) + '</a> is ' + e[1] + ', element ' + e[0] + '. <button class="btn sm" type="button" id="qnext">Next</button>';
        $('#qnext').focus();
        return;
      }
      if (b.id === 'qnext') { idx++; ask(); }
    });
    showBest();
  }
})();
