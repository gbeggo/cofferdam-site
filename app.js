/* Атлас изоляции, дизайн «Под платком»: главная (index.html) и карточка ситуации (situation.html?id=…). Без сборки и библиотек. */
(function () {
  "use strict";
  var qs = new URLSearchParams(location.search);
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // запасной режим: на устройствах с малой памятью (≤ 2 ГБ) или по ?mode=video шаги — ролики, а не кадры по прокрутке
  var VIDEO_MODE = qs.get("mode") === "video" || (qs.get("mode") !== "scroll" && navigator.deviceMemory && navigator.deviceMemory <= 2);

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) { if (k === "text") e.textContent = attrs[k]; else if (k === "html") e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }

  fetch("situations.json").then(function (r) { return r.json(); }).then(function (D) {
    if (document.body.dataset.page === "home") home(D); else situation(D);
  });
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- курсор-пробойник: нажатие на свободное место оставляет в платке отверстие, оно затягивается ---------- */
  if (!calm) document.addEventListener("click", function (e) {
    if (e.target.closest("a,button,summary,canvas,video,input,.step,.sheet,.tear,.t")) return;
    var m = el("i", { "class": "punchmark", "aria-hidden": "true" }); m.style.left = e.clientX + "px"; m.style.top = e.clientY + "px";
    document.body.appendChild(m); setTimeout(function () { m.remove(); }, 2500);
  });

  /* ---------- вход в ситуацию: отверстие растягивается на весь экран, из него появляется сцена ---------- */
  function portal(href, hole, img) {
    if (calm || !hole) { location.href = href; return; }
    var r = hole.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var p = el("div", { "class": "portal" }); if (img) p.style.backgroundImage = "url(" + img + ")";
    p.style.clipPath = "circle(" + r.width / 2 + "px at " + cx + "px " + cy + "px)"; document.body.appendChild(p);
    p.getBoundingClientRect();
    p.style.clipPath = "circle(" + Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + "px at " + cx + "px " + cy + "px)";
    try { sessionStorage.setItem("atlas-arrive", "1"); } catch (e) {}
    setTimeout(function () { location.href = href; }, 640);
    addEventListener("pageshow", function (ev) { if (ev.persisted) p.remove(); });
  }

  /* ================= главная ================= */
  function home(D) {
    document.getElementById("check").textContent = D.check;
    var ids = []; D.groups.forEach(function (g) { g.items.forEach(function (id) { ids.push(id); }); });
    ids.sort(function (a, b) { return D.situations[a].n - D.situations[b].n; });
    // шесть отверстий по дуге (слева направо — номера ситуаций); в готовом виден зуб — кадр ситуации
    var POS = [[6, 66, 11], [21.5, 30, 10.5], [38.5, 6, 10], [53.5, 6, 10], [68.5, 30, 10.5], [83, 66, 11]];
    var arc = document.getElementById("arc"), list = document.getElementById("sitlist");
    ids.forEach(function (id, i) {
      var s = D.situations[id], ready = s.status === "ready", href = "situation.html?id=" + id, P = POS[i] || POS[5];
      var h = el(ready ? "a" : "span", { "class": "hole" + (ready ? " pic" : ""), "aria-label": "Ситуация " + s.n + ": " + s.title + (ready ? "" : " — скоро") });
      h.style.left = P[0] + "%"; h.style.top = P[1] + "%"; h.style.width = P[2] + "%";
      if (ready) { h.href = href; if (s.cover) h.style.backgroundImage = "url(" + s.cover + ")"; else h.className = "hole tooth"; }
      h.appendChild(el("span", { "class": "n", text: s.n, "aria-hidden": "true" }));
      arc.appendChild(h);
      var li = el("li", { "class": ready ? "ready" : "" });
      var inner = [el("b", { text: s.n }), document.createTextNode(s.title + (ready ? " →" : "")), el("small", { text: ready ? (s.field ? "поле " + s.field : "") : "скоро" })];
      if (ready) li.appendChild(el("a", { href: href }, inner)); else inner.forEach(function (x) { li.appendChild(x); });
      list.appendChild(li);
      function go(e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); portal(href, h, s.cover); }
      if (ready) { h.addEventListener("click", go); li.querySelector("a").addEventListener("click", go); }
    });
    frameNav();
    punchScheme(D.punch);
    feats(D, ids);
    // клампы: ряд стальных бирок, нажатие — когда он нужен (раньше был длинный список — Георгий: «чуть перегружен»)
    var cl = document.getElementById("clamplist"), tags = el("div", { "class": "tags" }), info = el("div", { "class": "cinfo", "aria-live": "polite" });
    (D.clamps || []).forEach(function (c, i) {
      var t = el("button", { "class": "tag", type: "button", text: c.id, "aria-pressed": "false" });
      t.addEventListener("click", function () {
        [].forEach.call(tags.children, function (x) { x.setAttribute("aria-pressed", String(x === t)); });
        info.innerHTML = ""; info.appendChild(el("div", { "class": "where", text: c.where })); info.appendChild(el("div", { "class": "note", text: c.note }));
        info.classList.remove("in"); info.getBoundingClientRect(); info.classList.add("in");
      });
      tags.appendChild(t); if (i === 0) setTimeout(function () { t.click(); });
    });
    cl.appendChild(tags); cl.appendChild(info);
    punchIn();
  }

  // «Что умеет атлас»: отверстия-возможности. Наведение — в отверстии зуб; нажатие — попробовать
  function feats(D, ids) {
    var box = document.getElementById("feats"); if (!box) return;
    var demo = ids.filter(function (id) { return D.situations[id].status === "ready"; })[0] || "class2-contact";
    var F = [
      { t: "Листайте — зубы идут", d: "Прокрутка ведёт анимацию шага: вниз — вперёд, вверх — назад.", go: "situation.html?id=" + demo + "#step-1" },
      { t: "У кресла", d: "Шаг на весь экран, ролик крутится сам, большие кнопки «Назад / Далее» — листать в перчатках.", go: "situation.html?id=" + demo + "&chair=1" },
      { t: "Список ассистенту", d: "Что разложить в лоток — одной кнопкой: распечатать или отправить.", go: "situation.html?id=" + demo + "&tray=1" },
      { t: "Пробойник", d: "Какое отверстие — на какой зуб: нажмите отверстие, проступят зубы.", go: "#punch" },
      { t: "Клампы", d: "Какой кламп — когда: номер выбит на стальной бирке.", go: "#clamps" },
      { t: "Пробейте платок", d: "Нажмите куда угодно на синем — останется отверстие. Оно затянется.", go: "punch" }
    ];
    F.forEach(function (f, i) {
      var hole = el("span", { "class": "hole", html: ICONS[i] });
      var a = el("a", { "class": "feat", href: f.go === "punch" ? "#can" : f.go }, [hole, el("b", { "class": "print", text: f.t }), el("small", { text: f.d })]);
      a.addEventListener("click", function (e) {
        if (f.go === "punch") { e.preventDefault(); burst(a.querySelector(".hole")); return; }
        if (f.go[0] === "#") { e.preventDefault(); var t = document.querySelector(f.go); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: calm ? "auto" : "smooth" }); return; }
        if (e.metaKey || e.ctrlKey) return; e.preventDefault(); portal(f.go, a.querySelector(".hole"), D.situations[demo].cover);
      });
      box.appendChild(a);
    });
  }
  // значки в отверстиях: линии цвета кости (при наведении отверстие становится зубом, значок — стальным)
  var SV = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICONS = [
    SV + '<path d="M24 9v26M15 27l9 9 9-9"/></svg>',                                                   // листать
    SV + '<rect x="6" y="15" width="15" height="18" rx="9"/><rect x="27" y="15" width="15" height="18" rx="9"/><path d="M15 24h-3m24 0h3"/></svg>',  // большие кнопки
    SV + '<path d="M17 14h20M17 24h20M17 34h20"/><circle cx="10" cy="14" r="1.5"/><circle cx="10" cy="24" r="1.5"/><circle cx="10" cy="34" r="1.5"/></svg>',  // список
    SV + '<circle cx="13" cy="24" r="7"/><circle cx="27" cy="24" r="5"/><circle cx="37" cy="24" r="3"/></svg>',   // пробойник
    SV + '<path d="M10 33c0-13 6-21 14-21s14 8 14 21"/><path d="M6 33h9M33 33h9"/></svg>',                       // кламп
    SV + '<circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="24" r="11" opacity=".6"/><circle cx="24" cy="24" r="18" opacity=".3"/></svg>'  // пробить
  ];

  // «пробить» очередь отверстий от большего к меньшему вокруг точки — как пять отверстий пробойника
  function burst(from) {
    var r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    [26, 22, 18, 14, 10].forEach(function (d, i) {
      setTimeout(function () {
        var a = -Math.PI / 2 + i * 2 * Math.PI / 5, m = el("i", { "class": "punchmark", "aria-hidden": "true" });
        m.style.left = cx + Math.cos(a) * (r.width * 0.9) + "px"; m.style.top = cy + Math.sin(a) * (r.width * 0.9) + "px";
        m.style.width = m.style.height = d + "px"; m.style.margin = (-d / 2) + "px 0 0 " + (-d / 2) + "px";
        document.body.appendChild(m); setTimeout(function () { m.remove(); }, 2500);
      }, i * 140);
    });
  }
  // отверстия «пробиваются», когда раздел появляется на экране (по очереди, с рябью)
  function punchIn() {
    if (calm) return;
    [].forEach.call(document.querySelectorAll(".arc, .punch5, .feats"), function (g) {
      var hs = g.querySelectorAll(".hole"); g.classList.add("pre");
      [].forEach.call(hs, function (h, i) { h.style.setProperty("--d", (i * 0.09) + "s"); });
    });
    function check() {                                    // раздел вошёл в нижние ~80% экрана — пробиваем
      [].forEach.call(document.querySelectorAll(".pre:not(.punched)"), function (g) { var r = g.getBoundingClientRect(); if (r.top < innerHeight * 0.82 && r.bottom > 0) g.classList.add("punched"); });
    }
    addEventListener("scroll", check, { passive: true }); addEventListener("resize", check); setTimeout(check, 60); setTimeout(check, 700);
  }

  // № 8 рамка как меню: появляется после первого экрана, пункт текущего раздела — цвета кости
  function frameNav() {
    var fr = document.getElementById("frame"); if (!fr) return;
    var links = [].slice.call(fr.querySelectorAll("a")), secs = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    links.forEach(function (a, i) { a.addEventListener("click", function (e) { e.preventDefault(); scrollTo({ top: i === links.length - 1 ? 0 : secs[i].getBoundingClientRect().top + scrollY - 20, behavior: calm ? "auto" : "smooth" }); }); });
    function tick() {
      fr.classList.toggle("shown", scrollY > innerHeight * 0.55);
      var on = -1; secs.forEach(function (sc, i) { if (i < links.length - 1 && sc && sc.getBoundingClientRect().top < innerHeight * 0.45) on = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === on); });
    }
    addEventListener("scroll", tick, { passive: true }); tick();
  }

  /* ================= пробойник ================= */
  // FDI: 1–2 резцы, 3 клык, 4–5 премоляры, 6–7 моляры. Какое отверстие на какой зуб — слова Георгия (interview.md).
  function holeFor(jaw, t) {
    if (t >= 6) return 2; if (t >= 4) return 3;
    if (jaw === "upper") return 4;                 // резцы и клыки верхней челюсти
    if (t <= 2) return 5;                          // резцы нижней челюсти
    return 4;                                      // нижний клык — 4-е (ответ Георгия 16.11)
  }
  function punchScheme(P) {
    var box = document.getElementById("punch5"), dam = document.getElementById("dam"); if (!box) return;
    var PX = { 1: 132, 2: 108, 3: 86, 4: 66, 5: 48 }, CELL = { 2: "78%", 3: "62%", 4: "48%", 5: "34%" }, cur = 0, btns = [];
    P.holes.forEach(function (h) {
      var b = el("button", { type: "button", "aria-pressed": "false" }, [el("span", { "class": "hole" }),
        el("div", { "class": "no", text: h.n }), el("div", { "class": "who" }, [h.label ? el("small", { text: h.label }) : null, h.who])]);
      b.firstChild.style.width = "min(" + PX[h.n] + "px, " + (PX[h.n] / 4.2).toFixed(1) + "vw)";
      b.addEventListener("click", function () { show(cur === h.n ? 0 : h.n); });
      box.appendChild(b); btns.push(b);
    });
    dam.appendChild(el("h3", { "class": "print", text: "Весь платок сразу" }));
    dam.appendChild(el("p", { text: "Верхний ряд — верхняя челюсть, нижний — нижняя. Размер кружка — номер отверстия. Якорный зуб под кламп получает отверстие 1." }));
    function row(nums, jaw) {
      var r = el("div", { "class": "row16 " + (jaw === "upper" ? "up" : "lo") });
      nums.forEach(function (q) {
        var t = q % 10, h = holeFor(jaw, t), d = el("div", { "class": "t", "data-hole": h, "data-post": t >= 4 ? "1" : "0", title: q + " — отверстие " + h }, [el("span", { "class": "hole" }), el("span", { text: q })]);
        d.firstChild.style.width = CELL[h]; d.addEventListener("click", function () { show(cur === h ? 0 : h); }); r.appendChild(d);
      });
      return r;
    }
    var up = row([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], "upper"), lo = row([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], "lower");
    dam.appendChild(up); dam.appendChild(el("div", { "class": "line" })); dam.appendChild(lo);
    dam.appendChild(el("p", { "class": "foot", text: "Клыки, верхние и нижние, — четвёртое отверстие. Отверстие 1 — под кламп на любом зубе жевательной группы." }));
    function show(n) {
      cur = n;
      btns.forEach(function (b, i) { b.classList.toggle("on", i + 1 === n); b.setAttribute("aria-pressed", String(i + 1 === n)); });
      [up, lo].forEach(function (r) {
        r.classList.toggle("dim", !!n);
        [].forEach.call(r.children, function (t) { t.classList.toggle("hl", !!n && (n === 1 ? t.dataset.post === "1" : +t.dataset.hole === n)); });
      });
    }
  }

  /* ================= карточка ситуации ================= */
  function situation(D) {
    var id = qs.get("id") || "class2-contact", S = D.situations[id];
    if (!S || (S.status !== "ready" && S.status !== "draft")) { location.replace("index.html#sits"); return; }   // черновик — только по прямой ссылке
    try { if (sessionStorage.getItem("atlas-arrive")) { document.body.classList.add("arrive"); sessionStorage.removeItem("atlas-arrive"); } } catch (e) {}
    document.title = S.title + " — " + D.brand.title;
    var main = document.getElementById("main");
    main.appendChild(el("section", { "class": "intro wrap" }, [el("div", { "class": "mega", text: pad2(S.n), "aria-hidden": "true" }),
      el("div", {}, [el("div", { "class": "label", text: (S.status === "draft" ? "Черновик · " : "Ситуация " + S.n + " · ") + "поле " + S.field }),
        el("h1", { "class": "print", text: S.title }), el("p", { text: S.lead })])]));
    if (S.cover) main.appendChild(el("div", { "class": "cover" }, [el("img", { src: S.cover, alt: "Исходная картина: " + S.short, loading: "eager" })]));
    var take = el("section", { "class": "take wrap" }, [el("h2", { text: "Что берём" })]);
    S.take.forEach(function (t) {
      var soft = /Платок|Нитка|Тефлон/.test(t.what);
      var note = el("div", { "class": "note" }, [t.note]);
      if (t.link) { note.appendChild(document.createTextNode(" ")); note.appendChild(el("a", { href: t.link, text: "схема" })); }
      take.appendChild(el("div", { "class": "row" }, [el("span", { "class": "tag" + (soft ? " soft" : ""), text: t.what }), t.note || t.link ? note : null]));
    });
    var tb = el("button", { "class": "traybtn", type: "button", text: "Список ассистенту" }); take.appendChild(tb);
    main.appendChild(take);
    tray(D, S, tb);
    var scrubbers = [];
    S.steps.forEach(function (st) {
      var cap = el("div", { "class": "cap" }, [el("div", { "class": "mega", text: pad2(st.n), "aria-hidden": "true" }),
        el("div", {}, [el("div", { "class": "label", text: "Шаг " + st.n + " из " + S.steps.length }), el("h3", { "class": "print", text: st.title }), el("p", { text: st.text })])]);
      if (!st.media) {
        if (!st.textOnly) cap.lastChild.appendChild(el("span", { "class": "soon", text: "Анимация готовится" }));
        main.appendChild(el("section", { "class": "step still", id: "step-" + st.n }, [el("div", { "class": "stage" }, [cap])]));
        return;
      }
      if (VIDEO_MODE) {                              // запасной режим: ролик шага играет сам (слабые телефоны, ?mode=video)
        var vd = el("video", { src: st.media.dir + "clip.mp4", muted: "", loop: "", playsinline: "", preload: "metadata", "aria-label": st.title });
        vd.muted = true;
        main.appendChild(el("section", { "class": "step clip", id: "step-" + st.n }, [el("div", { "class": "stage" }, [vd, cap])]));
        new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !calm) vd.play().catch(function () {}); else vd.pause(); }); }, { threshold: 0.35 }).observe(vd);
        return;
      }
      var cv = el("canvas"), bar = el("b"), load = el("div", { "class": "load", text: "Загрузка кадров…" });
      var sec = el("section", { "class": "step", id: "step-" + st.n }, [el("div", { "class": "stage" }, [cv, el("div", { "class": "shade" }), load, cap, el("div", { "class": "rail" }, [bar])])]);
      sec.style.height = Math.max(260, Math.round(st.media.count * 4)) + "vh";
      main.appendChild(sec); scrubbers.push(new Scrubber(sec, cv, bar, load, st.media));
    });
    // ошибка — разрыв платка, в нём видна десна; план Б — длинный разрез; проверка — крупной строкой
    var mk = S.mistakes[0], tear = el("button", { "class": "tear", type: "button" }, [el("div", { "class": "label", text: "Частая ошибка" }),
      el("div", { "class": "print", text: mk.title }), el("div", { "class": "more", text: "Как не ошибиться" })]);
    var side = el("div", { "class": "side" }, [el("p", { "class": "label", text: "Ошибка — это разрыв. В нём видна десна." })]);
    if (mk.fix && mk.fix !== "—") side.appendChild(el("p", { "class": "print", text: mk.fix }));
    main.appendChild(el("section", { "class": "after wrap" }, [tear, side]));
    var slit = el("div", { "class": "slit", "aria-hidden": "true" }); for (var k = 0; k < 4; k++) slit.appendChild(el("span"));
    main.appendChild(el("section", { "class": "planb wrap" }, [el("div", {}, [el("div", { "class": "label", text: "План Б" }),
      el("div", { "class": "print", text: S.planB.title }), el("p", { text: S.planB.text })]), slit]));
    main.appendChild(el("section", { "class": "check wrap" }, [el("div", { "class": "label", text: "Проверка" }), el("p", { "class": "print", text: D.check })]));
    var sheet = document.getElementById("sheet"), body = sheet.querySelector(".content");
    S.mistakes.forEach(function (m) { body.appendChild(el("h3", { "class": "print", text: m.title })); body.appendChild(el("p", { text: m.text }));
      if (m.fix && m.fix !== "—") body.appendChild(el("p", { "class": "fix", text: m.fix })); });
    function toggle(on) { document.body.classList.toggle("sheet-open", on); }
    tear.addEventListener("click", function () { toggle(true); });
    document.getElementById("sheet-bg").addEventListener("click", function () { toggle(false); });
    sheet.querySelector(".close").addEventListener("click", function () { toggle(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    // шаги в верхней панели — ряд отверстий: пройденный шаг — зуб в отверстии, текущий крупнее, впереди — пустые
    var nav = el("div", { "class": "holes", role: "navigation", "aria-label": "Шаги" }), secs = [], bar0 = document.querySelector(".topbar");
    S.steps.forEach(function (st) {
      var b = el("button", { type: "button", "aria-label": "Шаг " + st.n + ": " + st.title, title: st.n + ". " + st.title });
      b.addEventListener("click", function () { var t = document.getElementById("step-" + st.n); scrollTo({ top: t.getBoundingClientRect().top + scrollY, behavior: calm ? "auto" : "smooth" }); });
      nav.appendChild(b); secs.push(document.getElementById("step-" + st.n));
    });
    bar0.appendChild(nav);
    var CH = chairMode(S) || { isOn: function () { return false; } };
    var curNav = -2;
    function navTick() {
      var mid = innerHeight / 2, on = -1, past = 0;
      secs.forEach(function (sc, i) { var r = sc.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) on = i; if (r.bottom <= mid) past = i + 1; });
      var key = on + ":" + past;
      if (key !== curNav) { curNav = key; [].forEach.call(nav.children, function (b, i) { b.classList.toggle("on", i === on); b.classList.toggle("done", i < (on >= 0 ? on : past)); });
        nav.classList.toggle("shown", on >= 0 || past > 0); }
      bar0.classList.toggle("solid", scrollY > 60);
    }
    function loop() { if (!CH.isOn()) { scrubbers.forEach(function (s) { s.tick(); }); navTick(); } requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
  }

  // № 12 лоток ассистента: «что берём» одной кнопкой — распечатать или отправить (на телефоне — меню «Поделиться»)
  function tray(D, S, btn) {
    var T = document.getElementById("tray"); if (!T) return;
    var sub = "Ситуация " + S.n + " · " + S.title + " · поле " + S.field, list = document.getElementById("tray-list");
    document.getElementById("tray-sub").textContent = sub;
    // в лоток — только то, что ассистент готовит сам (у пункта может быть своя формулировка "tray"; tray: false — не класть)
    var items = S.take.filter(function (t) { return t.tray !== false; }).map(function (t) { return t.tray || t; });
    items.forEach(function (t) { list.appendChild(el("li", {}, [el("b", { text: t.what }), t.note ? el("span", { text: t.note }) : null])); });
    var txt = "Лоток ассистента — " + sub + "\n" + items.map(function (t, i) { return (i + 1) + ". " + t.what + (t.note ? " — " + t.note : ""); }).join("\n");
    function open(on) { document.body.classList.toggle("tray-open", on); }
    btn.addEventListener("click", function () { open(true); });
    if (qs.get("tray") === "1") setTimeout(function () { open(true); }, 400);
    document.getElementById("tray-close").addEventListener("click", function () { open(false); });
    document.getElementById("tray-bg").addEventListener("click", function () { open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });
    document.getElementById("tray-print").addEventListener("click", function () { print(); });
    var sh = document.getElementById("tray-share");
    sh.addEventListener("click", function () {
      if (navigator.share) { navigator.share({ title: "Лоток ассистента", text: txt }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { sh.textContent = "Скопировано"; },
        function () { sh.textContent = "Не вышло"; }).then(function () { setTimeout(function () { sh.textContent = "Отправить"; }, 1800); });
    });
    if (!navigator.share) sh.textContent = "Скопировать";
    sh.addEventListener("blur", function () { if (!navigator.share) sh.textContent = "Скопировать"; });
  }

  // № 14 режим «у кресла» (18.11 переделан по словам Георгия: «нужно какой-то свич… у кресла или полный формат»): переключатель
  // «Полный / У кресла» вверху. У кресла — отдельный экран: один шаг на весь экран, ролик шага крутится сам (не надо листать
  // в перчатках), огромный номер, только название, большие кнопки «Назад / Далее», касание слева/справа и свайп тоже листают.
  // Запоминается на этом устройстве; ?chair=1 — сразу у кресла.
  function chairMode(S) {
    var box = document.getElementById("mode"), P = document.getElementById("chair"); if (!box || !P) return;
    var steps = S.steps, k = 0, on = false, V = document.getElementById("ch-video"), soon = document.getElementById("ch-soon");
    var holes = document.querySelector(".topbar .holes");
    function show(i) {
      k = Math.max(0, Math.min(steps.length - 1, i)); var st = steps[k];
      document.getElementById("ch-n").textContent = pad2(st.n);
      document.getElementById("ch-of").textContent = "Шаг " + st.n + " из " + steps.length;
      document.getElementById("ch-title").textContent = st.title;
      document.getElementById("ch-prev").disabled = k === 0; document.getElementById("ch-next").textContent = k === steps.length - 1 ? "Сначала ↺" : "Далее →";
      soon.hidden = true; V.hidden = !st.media;
      if (st.media) { V.src = st.media.dir + "clip.mp4"; V.play().catch(function () {}); }
      else { V.removeAttribute("src"); V.load(); if (!st.textOnly) soon.hidden = false; }
      if (holes) [].forEach.call(holes.children, function (b, i) { b.classList.toggle("on", i === k); b.classList.toggle("done", i < k); });
    }
    V.addEventListener("error", function () { if (V.getAttribute("src")) { soon.hidden = false; V.hidden = true; } });
    function next() { show(k === steps.length - 1 ? 0 : k + 1); } function prev() { show(k - 1); }
    document.getElementById("ch-next").addEventListener("click", next); document.getElementById("ch-prev").addEventListener("click", prev);
    P.querySelector(".ch-zone.next").addEventListener("click", next); P.querySelector(".ch-zone.prev").addEventListener("click", prev);
    var x0 = null; P.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    P.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); });
    document.addEventListener("keydown", function (e) { if (!on) return; if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); } if (e.key === "ArrowLeft") prev(); });
    if (holes) [].forEach.call(holes.children, function (b, i) { b.addEventListener("click", function (e) { if (on) { e.stopImmediatePropagation(); show(i); } }, true); });
    function set(v, keepStep) {
      on = v; document.body.classList.toggle("chair-on", v); P.hidden = !v;
      [].forEach.call(box.children, function (b) { b.setAttribute("aria-pressed", String((b.dataset.m === "chair") === v)); });
      try { localStorage.setItem("atlas-chair", v ? "1" : "0"); } catch (e) {}
      if (v) {                                                   // начать с шага, который сейчас на экране
        if (!keepStep) { var mid = innerHeight / 2; steps.forEach(function (st, i) { var e = document.getElementById("step-" + st.n); if (e && e.getBoundingClientRect().top < mid) k = i; }); }
        show(k); if (holes) holes.classList.add("shown");
      } else { V.pause(); var t = document.getElementById("step-" + steps[k].n); if (t && k > 0) scrollTo(0, t.offsetTop); }
    }
    [].forEach.call(box.children, function (b) { b.addEventListener("click", function () { set(b.dataset.m === "chair"); }); });
    var start = qs.get("chair") === "1"; try { if (qs.get("chair") === null) start = localStorage.getItem("atlas-chair") === "1"; } catch (e) {}
    if (start) { k = 0; set(true, true); }
    return { isOn: function () { return on; } };
  }

  /* ---------- прокрутка ведёт кадры шага ----------
     Кадры хранятся сжатыми (Blob, ~50–150 КБ), раскодированы только ближайшие (кэш BITMAPS штук): на телефоне
     72 раскодированных кадра 1600×1200 заняли бы ~550 МБ памяти. */
  var BITMAPS = 14;
  function Scrubber(sec, cv, bar, load, media) {
    var self = this, N = media.count, blobs = new Array(N), cache = {}, order = [], pending = {}, got = 0, failed = 0, started = false;
    var ctx = cv.getContext("2d"), W = 0, H = 0, cur = 0, last = -1, visible = false;
    function url(i) { return media.dir + "f_" + ("00" + i).slice(-3) + ".webp"; }
    function start() {
      if (started) return; started = true;
      var seq = [];                                  // сначала каждый шестой кадр, потом остальные
      [6, 3, 1].forEach(function (s) { for (var i = 0; i < N; i += s) if (seq.indexOf(i) < 0) seq.push(i); });
      var k = 0;
      function next() {
        if (k >= seq.length) return; var i = seq[k++];
        fetch(url(i)).then(function (r) { if (!r.ok) throw r.status; return r.blob(); }).then(function (b) {
          blobs[i] = b; got++; load.textContent = "Загрузка кадров " + Math.round(got / N * 100) + "%";
          if (got === N) load.style.opacity = 0; if (i === 0) tint(b); last = -1; next();
        }).catch(function () {                       // кадров шага ещё нет на сервере
          if (++failed === 8 && !got) { load.textContent = "Анимация готовится"; k = seq.length; } else next();
        });
      }
      for (var p = 0; p < 4; p++) next();
    }
    function tint(b) {
      decode(b).then(function (im) {
        try { var c = document.createElement("canvas"); c.width = c.height = 2; var x = c.getContext("2d"); x.drawImage(im, 0, 0, 6, 6, 0, 0, 2, 2);
          var d = x.getImageData(0, 0, 1, 1).data; sec.style.setProperty("--c-stage", "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")"); } catch (e) {}
      });
    }
    function decode(b) {
      if (window.createImageBitmap) return createImageBitmap(b);
      return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.src = URL.createObjectURL(b); });
    }
    function bitmap(i) {
      if (cache[i]) return cache[i];
      if (!blobs[i] || pending[i]) return null;
      pending[i] = true;
      decode(blobs[i]).then(function (bm) {
        delete pending[i]; cache[i] = bm; order.push(i); last = -1;
        while (order.length > BITMAPS) { var j = order.shift(); if (cache[j] && cache[j].close) cache[j].close(); delete cache[j]; }
      });
      return null;
    }
    function nearest(i) {                            // ближайший уже раскодированный (сам i запрошен в draw)
      bitmap(i); for (var d = 1; d < N; d++) { var a = cache[i - d] || cache[i + d]; if (a) return a; } return null;
    }
    function resize() { var r = Math.min(devicePixelRatio || 1, 2), b = cv.getBoundingClientRect(); W = Math.round(b.width * r); H = Math.round(b.height * r); cv.width = W; cv.height = H; last = -1; }
    function place(im) {
      var s, dw, dh;
      if (H > W) {                                 // телефон: кадр выше середины, по ширине — центр на «точке внимания» шага
        s = W / (im.width * (media.portraitWidth || 0.72)); dw = im.width * s; dh = im.height * s;   // видно ~72% ширины кадра
        var fx = media.focus ? media.focus[0] : 0.5; return [Math.min(0, Math.max(W - dw, W / 2 - fx * dw)), Math.max(H * 0.06, (H * 0.62 - dh) / 2), dw, dh]; }
      s = Math.max(W / im.width, H / im.height); dw = im.width * s; dh = im.height * s; return [(W - dw) / 2, (H - dh) / 2, dw, dh];
    }
    function draw(x) {
      var i0 = Math.floor(x), fr = x - i0; bitmap(Math.min(N - 1, i0 + 2)); var a = cache[i0] || nearest(i0); if (!a) return false;
      var r = place(a); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(a, r[0], r[1], r[2], r[3]);
      var b = fr > 0.02 && bitmap(i0 + 1); if (b) { ctx.globalAlpha = fr; ctx.drawImage(b, r[0], r[1], r[2], r[3]); ctx.globalAlpha = 1; }
      return a === cache[i0];
    }
    new IntersectionObserver(function (es) { es.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); }); }, { rootMargin: "150% 0px" }).observe(sec);
    addEventListener("resize", resize); resize();
    this.tick = function () {
      if (!visible) return;
      var r = sec.getBoundingClientRect(), span = r.height - innerHeight, p = Math.min(1, Math.max(0, -r.top / span)), target = p * (N - 1);
      cur = calm ? target : cur + (target - cur) * 0.16; if (Math.abs(target - cur) < 0.01) cur = target;
      var q = Math.round(cur * 40) / 40; if (q !== last) { if (draw(q)) last = q; }
      bar.style.transform = "scaleY(" + p + ")";
    };
  }
})();
