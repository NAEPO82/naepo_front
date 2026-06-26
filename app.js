(() => {
  let t = [],
    e = null;
  function n(t) {
    return null == t
      ? ""
      : String(t)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
  }
  function a(t) {
    const e = String(null == t ? "" : t);
    return /^[=+\-@\t\r]/.test(e) ? "'" + e : e;
  }
  let o = "일반",
    s = "판매",
    l = "중앙회",
    i = "중앙회",
    c = "자체구매",
    d = "",
    r = null,
    p = !1,
    m = "detail",
    u = null;
  const g = {
    naepo: {
      name: "내포농기계",
      regNo: "305-01-51599",
      ceo: "이 상 재",
      addr: "충남 홍성군 구항면 구항길 264번길 22",
      bizType: "도,소매",
      bizItem: "농기계",
    },
    donga: {
      name: "동아아세아농기계",
      regNo: "816-86-03410",
      ceo: "이 상 재",
      addr: "충남 홍성군 구항면 구항길 264번길 22",
      bizType: "도,소매",
      bizItem: "농기계",
    },
  };
  let y = 1,
    f = [],
    h = 10,
    sortCol = null,
    sortDir = 1;
  const b = "https://naepo-back.onrender.com",
    v = "npo_session_token";
  function E() {
    return sessionStorage.getItem(v);
  }
  function x() {
    sessionStorage.removeItem(v);
  }
  async function w(t, e) {
    e = e || {};
    const n = Object.assign(
        { "Content-Type": "application/json" },
        e.headers || {},
      ),
      a = E();
    let o;
    a && (n.Authorization = "Bearer " + a);
    try {
      o = await fetch(b + t, Object.assign({}, e, { headers: n }));
    } catch (t) {
      throw new Error(
        "서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태를 확인해주세요.",
      );
    }
    if (401 === o.status)
      throw (
        x(),
        document.getElementById("main-content").classList.remove("visible"),
        document.getElementById("auth-layer").classList.remove("hidden"),
        I(
          "세션 만료",
          "로그인이 만료되었습니다. 비밀번호를 다시 입력해주세요.",
        ),
        new Error("인증이 만료되었습니다.")
      );
    let s = null;
    try {
      s = await o.json();
    } catch (t) {}
    if (!o.ok)
      throw new Error(
        (s && s.error) || "서버 오류가 발생했습니다. (" + o.status + ")",
      );
    return s;
  }
  async function k() {
    try {
      const e = await w("/api/records");
      t = Array.isArray(e) ? e : [];
    } catch (e) {
      ((t = []),
        I(
          "불러오기 실패",
          e.message || "거래내역을 불러오는 중 오류가 발생했습니다.",
        ));
    }
  }
  function L(t, e, n, a, o) {
    const s = document.getElementById("pretty-modal-container"),
      l = document.getElementById("pm-icon-slot"),
      i = document.getElementById("pm-title-slot"),
      c = document.getElementById("pm-text-slot"),
      d = document.getElementById("pm-btns-slot");
    if (
      ((i.textContent = t),
      (c.textContent = e),
      (l.innerHTML =
        "warn" === n
          ? '<i class="fa-solid fa-triangle-exclamation pm-icon warn"></i>'
          : '<i class="fa-solid fa-circle-check pm-icon info"></i>'),
      (d.innerHTML = ""),
      o)
    ) {
      const t = document.createElement("button");
      ((t.className = "pm-btn pm-btn-cancel"),
        (t.textContent = "취소"),
        t.addEventListener("click", () => {
          (s.classList.remove("show"), o());
        }),
        d.appendChild(t));
    }
    const r = document.createElement("button");
    ((r.className = "pm-btn pm-btn-ok"),
      (r.textContent = "확인"),
      r.addEventListener("click", () => {
        (s.classList.remove("show"), a && a());
      }),
      d.appendChild(r),
      s.classList.add("show"),
      setTimeout(() => r.focus(), 50));
  }
  function I(t, e, n) {
    L(t, e, "info", n, null);
  }
  function S(t, e, n, a) {
    L(t, e, "warn", n, a);
  }
  function B() {
    const t = new Date(),
      e = t.getFullYear(),
      n = String(t.getMonth() + 1).padStart(2, "0"),
      a = String(t.getDate()).padStart(2, "0");
    document.getElementById("f-date").value = `${e}-${n}-${a}`;
  }
  function $() {
    const t = document.getElementById("items-builder-root"),
      e = t.querySelectorAll(".item-row-card").length + 1,
      n = document.createElement("div");
    ((n.className = "item-row-card"),
      (n.innerHTML = `\n        <div class="item-row-header">\n          <span class="item-row-title"><i class="fa-solid fa-list-ol"></i> 품목 연동 슬롯 #${e}</span>\n          <button class="btn btn-danger btn-sm btn-remove-item-row" type="button" style="padding: 2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> 삭제</button>\n        </div>\n        <div class="g4">\n          <div class="field"><label>명세 품목명 <span class="req">*</span></label><input type="text" class="p-item" list="parts-datalist" placeholder="예: 트랙터 필터" maxlength="100"/></div>\n          <div class="field"><label>규격 사양</label><input type="text" class="p-spec" placeholder="예: 100*50 / 15W-40" maxlength="50"/></div>\n          <div class="field"><label>수량 <span class="req">*</span></label><input type="number" class="p-qty" value="1" min="0" step="any"/></div>\n          <div class="field"><label>단가 (원) <span class="req">*</span></label><input type="number" class="p-price" value="0" min="0"/></div>\n        </div>\n        <div class="g2" style="margin-top:8px;">\n          <div class="field">\n            <label>공급가액 & 세액</label>\n            <div style="display:flex; gap:4px; align-items:center;">\n              <input type="number" class="p-amount" placeholder="공급가액" style="flex:1; font-size:12px; padding:10px 6px;"/>\n              <input type="number" class="p-tax" placeholder="세액" style="max-width:70px; font-size:12px; padding:10px 4px;"/>\n              <label style="font-size:11px; font-weight:600; display:flex; align-items:center; gap:2px; white-space:nowrap; cursor:pointer;"><input type="checkbox" class="p-is-taxfree" style="accent-color:#047857; width:14px; height:14px;"/>과세</label>\n            </div>\n          </div>\n          <div class="field"><label>품목 비고</label><input type="text" class="p-item-note" placeholder="품목별 비고사항 (선택)" maxlength="80"/></div>\n        </div>\n      `),
      t.appendChild(n),
      (function (t) {
        const e = t.querySelector(".p-qty"),
          n = t.querySelector(".p-price"),
          a = t.querySelector(".p-amount"),
          o = t.querySelector(".p-tax"),
          s = t.querySelector(".p-is-taxfree"),
          l = () => {
            const t = (parseFloat(e.value) || 0) * (parseFloat(n.value) || 0);
            ((a.value = Math.round(t)),
              (o.value = s.checked ? Math.round(0.1 * t) : 0),
              A());
          };
        (e.addEventListener("input", l),
          n.addEventListener("input", l),
          s.addEventListener("change", l),
          a.addEventListener("input", () => {
            A();
          }),
          o.addEventListener("input", () => {
            A();
          }),
          t
            .querySelector(".btn-remove-item-row")
            .addEventListener("click", () => {
              (t.remove(), A());
            }));
      })(n),
      A());
  }
  function A() {
    const t = document.querySelectorAll(".item-row-card");
    let e = 0;
    t.forEach((t) => {
      const n = parseFloat(t.querySelector(".p-amount").value) || 0,
        a = parseFloat(t.querySelector(".p-tax").value) || 0;
      e += n + a;
    });
    const n = document.getElementById("f-preview");
    t.length > 0
      ? ((n.style.display = "block"),
        (document.getElementById("f-total").textContent = e.toLocaleString()))
      : (n.style.display = "none");
  }
  function q() {
    (["f-author", "f-company", "f-name", "f-region"].forEach((t) => {
      document.getElementById(t).value = "";
    }),
      ["e-date", "e-name", "e-region", "e-isoil"].forEach((t) => {
        document.getElementById(t).textContent = "";
      }),
      B(),
      (document.getElementById("f-isoil").checked = !1),
      (document.getElementById("oil-subs").style.display = "none"),
      (d = ""),
      document
        .querySelectorAll("#payment-pills .pill")
        .forEach((t) => t.classList.remove("g")),
      (i = "중앙회"),
      (c = "자체구매"));
    const t = document.getElementById("kyetong-subs"),
      n = document.getElementById("jache-subs");
    (t && (t.style.display = "none"),
      n && (n.style.display = "none"),
      document
        .querySelectorAll("#kyetong-pills .pill")
        .forEach((t, e) => t.classList.toggle("g", 0 === e)),
      document
        .querySelectorAll("#jache-pills .pill")
        .forEach((t, e) => t.classList.toggle("g", 0 === e)),
      (r = null));
    const a = document.getElementById("save-btn");
    ((a.innerHTML = '<i class="fa-solid fa-download"></i> 내역 데이터 저장'),
      (a.style.background = ""));
    const o = document.getElementById("edit-mode-banner");
    o && (o.style.display = "none");
    ((document.getElementById("items-builder-root").innerHTML = ""),
      (e = null),
      document.getElementById("live-preview-space").classList.remove("show"),
      (document.getElementById("premium-injected-frame").innerHTML = ""),
      $());
  }
  async function T() {
    if (!u || !g[u])
      return (
        (document.getElementById("e-supplier").textContent =
          "공급자를 선택해주세요."),
        void I(
          "공급자 미선택",
          "거래명세서를 저장하려면 먼저 공급자(내포농기계 / 동아아세아농기계)를 선택해야 합니다.",
        )
      );
    const e = document.getElementById("f-date");
    let n = !0;
    e.value
      ? (document.getElementById("e-date").textContent = "")
      : ((document.getElementById("e-date").textContent =
          "작성일자는 필수 항목입니다."),
        (n = !1));
    const a = document.getElementById("f-isoil");
    a.checked && "일반" === o
      ? ((document.getElementById("e-isoil").textContent =
          "급유기 분할 옵션은 [계통출하] 또는 [자체조달] 분류에서만 결합 적용 가능합니다."),
        (n = !1))
      : (document.getElementById("e-isoil").textContent = "");
    const p = document.querySelectorAll(".item-row-card");
    if (0 === p.length)
      return void I("저장 실패", "명세서에 등록된 품목 내역이 비어 있습니다.");
    let m = [],
      f = 0,
      h = 0,
      b = !0;
    if (
      (p.forEach((t) => {
        const e = t.querySelector(".p-item").value.trim(),
          n = t.querySelector(".p-spec").value.trim(),
          a = parseFloat(t.querySelector(".p-qty").value) || 0,
          o = parseFloat(t.querySelector(".p-price").value) || 0,
          s = parseFloat(t.querySelector(".p-amount").value) || 0,
          l = parseFloat(t.querySelector(".p-tax").value) || 0;
        (e
          ? t.querySelector(".p-item").classList.remove("bad")
          : (t.querySelector(".p-item").classList.add("bad"), (b = !1)),
          m.push({
            item: e,
            spec: n || "-",
            qty: a,
            price: o,
            amount: s,
            tax: l,
            note: t.querySelector(".p-item-note")
              ? t.querySelector(".p-item-note").value.trim()
              : "",
          }),
          (f += s),
          (h += l));
      }),
      !b)
    )
      return void M("필수 품목명 사양 항목이 누락되었습니다.", "err");
    if (!n) return;
    let v = o;
    "일반" === o
      ? (v = `일반 [${s}]`)
      : "계통" === o
        ? (v = `계통 [${i}]`)
        : "자체" === o && (v = `자체 [${c}]`);
    const E = {
      id:
        r ||
        "rec_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 9),
      date: e.value,
      author: document.getElementById("f-author").value.trim() || "현장기사",
      supplier: u,
      company: document.getElementById("f-company").value.trim() || "-",
      name: document.getElementById("f-name").value.trim() || "-",
      region: document.getElementById("f-region").value.trim() || "미지정",
      cat: o,
      part: v,
      payMethod: d || "미기재",
      status: r ? (t.find((x) => x.id === r) || {}).status || "done" : "done",
      note: m[0].item + (m.length > 1 ? ` 외 ${m.length - 1}건` : ""),
      amount: f,
      tax: h,
      items: m,
    };
    try {
      if (r) {
        await w("/api/records/" + encodeURIComponent(r), {
          method: "PUT",
          body: JSON.stringify(E),
        });
        const e = t.findIndex((t) => t.id === r);
        (-1 !== e && (t[e] = E),
          I("수정 완료", "거래 명세 내역이 수정되었습니다.", () => {
            (q(), (y = 1), C(), J("list"));
          }));
      } else
        (await w("/api/records", { method: "POST", body: JSON.stringify(E) }),
          t.unshift(E),
          I(
            "저장 완료",
            "거래 명세 내역이 서버에 저장되고, 작성 화면이 초기화되었습니다.",
            () => {
              (q(), (y = 1), C());
            },
          ));
    } catch (t) {
      return void I(
        "저장 실패",
        t.message || "서버에 저장하는 중 오류가 발생했습니다.",
      );
    }
  }
  function M(t, e) {
    const n = document.getElementById("msg");
    ((n.className = "msg show " + ("ok" === e ? "ok" : "err")),
      (n.innerHTML =
        ("ok" === e
          ? '<i class="fa-solid fa-circle-check"></i> '
          : '<i class="fa-solid fa-circle-exclamation"></i> ') + t),
      setTimeout(() => {
        n.classList.remove("show");
      }, 4e3));
  }
  function z(t) {
    ((o = t),
      document.querySelectorAll("#cat-pills .pill").forEach((e) => {
        e.getAttribute("data-cat") === t
          ? e.classList.add("g")
          : e.classList.remove("g");
      }));
    const e = document.getElementById("gen-subs"),
      n = document.getElementById("kyetong-subs"),
      a = document.getElementById("jache-subs");
    if (
      ((e.style.display = "일반" === t ? "block" : "none"),
      (n.style.display = "계통" === t ? "block" : "none"),
      (a.style.display = "자체" === t ? "block" : "none"),
      "일반" === t)
    ) {
      const t = document.getElementById("f-isoil");
      t.checked &&
        ((t.checked = !1),
        (document.getElementById("oil-subs").style.display = "none"));
    }
  }
  function j(t) {
    ((u = t),
      document.querySelectorAll("#supplier-pills .pill").forEach((e) => {
        e.getAttribute("data-supplier") === t
          ? e.classList.add("g")
          : e.classList.remove("g");
      }));
    const e = g[t];
    ((document.getElementById("supplier-bar-text").textContent =
      `공급자 정보: ${e.name} (${e.regNo}) · 대표 ${e.ceo} · ${e.addr}`),
      (document.getElementById("e-supplier").textContent = ""));
  }
  function C() {
    const a = document.getElementById("fl-search").value.toLowerCase().trim(),
      o = document.getElementById("fl-region").value.trim(),
      l = document.getElementById("fl-sdate").value,
      p = document.getElementById("fl-edate").value,
      m = t.filter((t) => {
        if (o && t.region !== o) return !1;
        if (l && t.date < l) return !1;
        if (p && t.date > p) return !1;
        if (a) {
          const e = (t.company || "").toLowerCase().includes(a),
            n = (t.name || "").toLowerCase().includes(a),
            o = (t.note || "").toLowerCase().includes(a),
            s = (t.author || "").toLowerCase().includes(a),
            l = (t.part || "").toLowerCase().includes(a);
          if (!(e || n || o || s || l)) return !1;
        }
        return !0;
      }),
      u = document.getElementById("list-body");
    u.innerHTML = "";
    const colKeys = {
      date: "date",
      author: "author",
      company: "company",
      name: "name",
      region: "region",
      part: "part",
      note: "note",
      amount: "amount",
    };
    let ms = m;
    if (sortCol) {
      ms = [...m].sort((a, b) => {
        let av = a[sortCol] ?? "",
          bv = b[sortCol] ?? "";
        if (sortCol === "amount") {
          av = Number(av) || 0;
          bv = Number(bv) || 0;
          return sortDir * (av - bv);
        }
        return sortDir * String(av).localeCompare(String(bv), "ko");
      });
    } else {
      ms = m;
    }
    const g = ms.length;
    f = ms;
    const b = document.getElementById("chk-all");
    if ((b && (b.checked = !1), O(), 0 === g))
      return (
        (u.innerHTML =
          '<tr><td colspan="10" class="empty-td"><i class="fa-solid fa-folder-open" style="display:block; font-size:32px; margin-bottom:10px; color:#cbd5e1;"></i>조건에 부합하는 거래명세 내역 레코드가 존재하지 않습니다.</td></tr>'),
        void (document.getElementById("pagination-root").innerHTML = "")
      );
    const v = Math.ceil(g / h);
    y > v && (y = v || 1);
    const E = (y - 1) * h;
    (ms.slice(E, E + h).forEach((t) => {
      const e = document.createElement("tr");
      ((e.innerHTML = `\n          <td><input type="checkbox" class="chk-row" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px;"/></td>\n          <td>${n(t.date)}</td>\n          <td>${n(t.author)}</td>\n          <td>${t.company && "-" !== t.company ? `<strong>${n(t.company)}</strong><span style="font-size:10.5px;color:#64748b"> / ${n(t.name)}</span>` : `<strong>${n(t.name)}</strong>`}</td>\n          <td><span class="badge bn">${n(t.region)}</span></td>\n          <td><span class="badge bo">${n(t.part)}</span></td>\n          <td style="font-weight:600; text-align:left;" title="${n(t.note)}">${n(t.note)}</td>\n          <td style="text-align:center;">\n            <button class="ibtn btn-status-toggle" data-id="${n(t.id)}" data-status="${n(t.status || "done")}" style="${"pending" === t.status ? "color:#b45309;border-color:#fde68a;background:#fffbeb;" : "color:#047857;border-color:#a7f3d0;background:#f0fdf4;"}">\n              ${"pending" === t.status ? '<i class="fa-solid fa-clock"></i> 미완료' : '<i class="fa-solid fa-circle-check"></i> 완료'}\n            </button>\n          </td>\n          <td class="tr">${(t.amount || 0).toLocaleString()}</td>\n          <td class="tr">${(t.tax || 0).toLocaleString()}</td>\n          <td>\n            <div class="ibtns">\n              <button class="ibtn btn-view-direct" data-id="${n(t.id)}"><i class="fa-solid fa-magnifying-glass"></i> 보기</button>\n              <button class="ibtn btn-print-direct" data-id="${n(t.id)}" style="color:#0284c7;"><i class="fa-solid fa-print"></i> 인쇄</button>\n              <button class="ibtn btn-printlog-direct" data-id="${n(t.id)}" style="color:#7c3aed;font-size:10px;" title="인쇄기록"><i class="fa-solid fa-clock-rotate-left"></i></button>\n              <button class="ibtn btn-edit-direct" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-pen"></i> 수정</button>\n              <button class="ibtn btn-excel-direct" data-id="${n(t.id)}" style="color:#047857;"><i class="fa-solid fa-file-excel"></i> 엑셀</button>\n              <button class="ibtn d btn-delete-direct" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n            </div>\n          </td>\n        `),
        u.appendChild(e));
    }),
      (function (t) {
        const e = document.getElementById("pagination-root");
        if (((e.innerHTML = ""), t <= 1)) return;
        const n = document.createElement("button");
        ((n.className = "page-num-btn"),
          (n.innerHTML = '<i class="fa-solid fa-chevron-left"></i>'),
          (n.disabled = 1 === y),
          n.addEventListener("click", () => {
            y > 1 && (y--, C());
          }),
          e.appendChild(n));
        for (let n = 1; n <= t; n++) {
          const t = document.createElement("button");
          ((t.className = "page-num-btn" + (n === y ? " active" : "")),
            (t.textContent = n),
            t.addEventListener("click", () => {
              ((y = n), C());
            }),
            e.appendChild(t));
        }
        const a = document.createElement("button");
        ((a.className = "page-num-btn"),
          (a.innerHTML = '<i class="fa-solid fa-chevron-right"></i>'),
          (a.disabled = y === t),
          a.addEventListener("click", () => {
            y < t && (y++, C());
          }),
          e.appendChild(a));
      })(v),
      document.querySelectorAll(".btn-printlog-direct").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const rec = t.find((r) => r.id === id);
          try {
            const logs = await w(
              "/api/print-log?recordId=" + encodeURIComponent(id),
            );
            if (!logs || !logs.length) {
              I("인쇄 기록 없음", "이 명세서의 인쇄 기록이 없습니다.");
              return;
            }
            const txt = logs
              .map(
                (l, i) =>
                  `${i + 1}. ${l.printedAt.replace("T", " ").slice(0, 19)}`,
              )
              .join("\n");
            I(
              "인쇄 기록 (" + logs.length + "회)",
              "마지막 인쇄: " +
                logs[0].printedAt.replace("T", " ").slice(0, 19) +
                "\n\n" +
                txt,
            );
          } catch (e) {
            I("조회 실패", e.message);
          }
        });
      }));
    document.querySelectorAll(".btn-status-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const cur = btn.getAttribute("data-status");
        const ns = cur === "done" ? "pending" : "done";
        try {
          await w("/api/records/" + encodeURIComponent(id) + "/status", {
            method: "PATCH",
            body: JSON.stringify({ status: ns }),
          });
          const rec = t.find((r) => r.id === id);
          if (rec) rec.status = ns;
          C();
        } catch (e) {
          I("상태 변경 실패", e.message);
        }
      });
    });
    (document.querySelectorAll(".btn-view-direct").forEach((n) => {
      n.addEventListener("click", () => {
        const a = n.getAttribute("data-id"),
          o = t.find((t) => t.id === a);
        o &&
          ((e = o),
          (document.getElementById("premium-injected-frame").innerHTML = N(o)),
          document.getElementById("live-preview-space").classList.add("show"),
          document
            .getElementById("live-preview-space")
            .scrollIntoView({ behavior: "smooth" }));
      });
    }),
      document.querySelectorAll(".btn-edit-direct").forEach((e) => {
        e.addEventListener("click", () => {
          const n = e.getAttribute("data-id"),
            a = t.find((t) => t.id === n);
          a &&
            (function (t) {
              if ((q(), (r = t.id), t.supplier && j(t.supplier), t.cat)) {
                z(t.cat);
                const e = (t.part || "").match(/\[([^\]]+)\]/),
                  n = e ? e[1] : "";
                "일반" === t.cat && n
                  ? ((s = n),
                    document
                      .querySelectorAll("#gen-pills .pill")
                      .forEach((t) =>
                        t.classList.toggle(
                          "g",
                          t.getAttribute("data-gen") === n,
                        ),
                      ))
                  : "계통" === t.cat && n
                    ? ((i = n),
                      document
                        .querySelectorAll("#kyetong-pills .pill")
                        .forEach((t) =>
                          t.classList.toggle(
                            "g",
                            t.getAttribute("data-kt") === n,
                          ),
                        ))
                    : "자체" === t.cat &&
                      n &&
                      ((c = n),
                      document
                        .querySelectorAll("#jache-pills .pill")
                        .forEach((t) =>
                          t.classList.toggle(
                            "g",
                            t.getAttribute("data-jc") === n,
                          ),
                        ));
              }
              ((document.getElementById("f-date").value = t.date || ""),
                (document.getElementById("f-author").value = t.author || ""),
                (document.getElementById("f-company").value =
                  t.company && "-" !== t.company ? t.company : ""),
                (document.getElementById("f-name").value =
                  t.name && "-" !== t.name ? t.name : ""),
                (document.getElementById("f-region").value =
                  t.region && "미지정" !== t.region ? t.region : ""),
                t.payMethod &&
                  "미기재" !== t.payMethod &&
                  ((d = t.payMethod),
                  document
                    .querySelectorAll("#payment-pills .pill")
                    .forEach((e) => {
                      e.classList.toggle(
                        "g",
                        e.getAttribute("data-pay") === t.payMethod,
                      );
                    })));
              const e = document.getElementById("items-builder-root");
              ((e.innerHTML = ""),
                (Array.isArray(t.items) && t.items.length > 0
                  ? t.items
                  : [{}]
                ).forEach((t) => {
                  $();
                  const n = e.querySelectorAll(".item-row-card"),
                    a = n[n.length - 1];
                  if (!t.item) return;
                  ((a.querySelector(".p-item").value = t.item || ""),
                    (a.querySelector(".p-spec").value =
                      t.spec && "-" !== t.spec ? t.spec : ""),
                    (a.querySelector(".p-qty").value =
                      void 0 !== t.qty ? t.qty : 1),
                    (a.querySelector(".p-price").value = t.price || 0),
                    (a.querySelector(".p-amount").value = t.amount || 0),
                    (a.querySelector(".p-tax").value = t.tax || 0),
                    t.tax > 0 &&
                      (a.querySelector(".p-is-taxfree").checked = !0));
                  const o = a.querySelector(".p-item-note");
                  (o && (o.value = t.note || ""), A());
                }));
              const n = document.getElementById("save-btn");
              ((n.innerHTML =
                '<i class="fa-solid fa-pen-to-square"></i> 수정 내용 저장'),
                (n.style.background =
                  "linear-gradient(135deg,#7c3aed,#4c1d95)"));
              const a = document.getElementById("edit-mode-banner");
              (a &&
                ((a.style.display = "block"),
                (a.textContent =
                  '✏️ 수정 모드 — 수정 후 "수정 내용 저장"을 누르세요. 취소하려면 "양식 초기화" 클릭.')),
                J("form"),
                window.scrollTo({ top: 0, behavior: "smooth" }));
            })(a);
        });
      }),
      document.querySelectorAll(".btn-print-direct").forEach((e) => {
        e.addEventListener("click", () => {
          const n = e.getAttribute("data-id"),
            a = t.find((t) => t.id === n);
          a && X(a);
        });
      }),
      document.querySelectorAll(".btn-delete-direct").forEach((n) => {
        n.addEventListener("click", () => {
          const a = n.getAttribute("data-id");
          S(
            "데이터 삭제 경고",
            "선택한 명세서 내역을 서버에서 영구 삭제하시겠습니까?",
            async () => {
              try {
                await w("/api/records/" + encodeURIComponent(a), {
                  method: "DELETE",
                });
              } catch (t) {
                return void I(
                  "삭제 실패",
                  t.message || "서버에서 삭제하는 중 오류가 발생했습니다.",
                );
              }
              ((t = t.filter((t) => t.id !== a)),
                M("해당 명세 레코드가 서버에서 삭제되었습니다.", "ok"),
                C(),
                e &&
                  e.id === a &&
                  ((e = null),
                  document
                    .getElementById("live-preview-space")
                    .classList.remove("show"),
                  (document.getElementById("premium-injected-frame").innerHTML =
                    "")));
            },
            () => {},
          );
        });
      }),
      document.querySelectorAll(".btn-excel-direct").forEach((n) => {
        n.addEventListener("click", () => {
          const a = n.getAttribute("data-id"),
            o = t.find((t) => t.id === a);
          o && ((e = o), U([o]));
        });
      }));
  }
  function O() {
    const e = document.querySelectorAll(".chk-row:checked"),
      n = document.getElementById("sum-text");
    if (e.length > 0) {
      let a = 0,
        o = 0;
      (e.forEach((e) => {
        const n = e.getAttribute("data-id"),
          s = t.find((t) => t.id === n);
        s && ((a += s.amount), (o += s.tax));
      }),
        (n.innerHTML = `선택된 항목: <strong class="gn">${e.length}</strong>건 (공급가액: <strong>${a.toLocaleString()}</strong>원 · 세액: <strong>${o.toLocaleString()}</strong>원)`));
    } else {
      const t = f;
      n.innerHTML = `조회 필터 데이터: <strong class="gn">${t.length}</strong>건 (공급가액: <strong>${t.reduce((t, e) => t + e.amount, 0).toLocaleString()}</strong>원 · 세액: <strong>${t.reduce((t, e) => t + e.tax, 0).toLocaleString()}</strong>원)`;
    }
  }
  function H(t) {
    if (!t || 0 === t) return "영";
    for (
      var e = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"],
        n = ["", "십", "백", "천"],
        a = ["", "만", "억", "조"],
        o = "",
        s = 0,
        l = Math.abs(Math.floor(t));
      l > 0;
    ) {
      var i = l % 1e4;
      if (i > 0) {
        for (var c = "", d = 0; d < 4; d++) {
          var r = Math.floor(i / Math.pow(10, d)) % 10;
          r > 0 && (c = 0 === d ? e[r] + c : (1 === r ? "" : e[r]) + n[d] + c);
        }
        o = c + a[s] + o;
      }
      ((l = Math.floor(l / 1e4)), s++);
    }
    return o;
  }
  window.addEventListener("DOMContentLoaded", () => {
    (B(),
      $(),
      history.replaceState({ tab: "dashboard" }, "", "#dashboard"),
      (async function () {
        if (!E()) return;
        try {
          const e = await w("/api/records");
          ((t = Array.isArray(e) ? e : []),
            document.getElementById("auth-layer").classList.add("hidden"),
            document.getElementById("main-content").classList.add("visible"),
            C(),
            await ut(),
            lt(),
            rt(),
            Q());
        } catch (t) {
          x();
        }
      })());
  });
  var N = function (t) {
    var e = t.amount + t.tax,
      a = t.date.split("-"),
      o = a[0],
      s = parseInt(a[1], 10),
      l = parseInt(a[2], 10),
      i = t.name && "-" !== t.name ? n(t.name) : "",
      c = t.company && "-" !== t.company ? n(t.company) : "",
      d = t.region && "미지정" !== t.region ? n(t.region) : "",
      r = n(t.part || ""),
      p = Math.max(5, t.items.length),
      m = "금 " + H(e) + "원정",
      u = g[t.supplier] || g.naepo;
    function y(a, g) {
      for (var y, f = "", h = 0; h < p; h++) {
        var b = t.items[h],
          v = 0 === h ? s + "/" + l : "";
        if (b) {
          var E = b.spec && "-" !== b.spec ? n(b.spec) : "";
          f +=
            '<tr><td class="tfs-ic">' +
            v +
            '</td><td class="tfs-il">' +
            n(b.item) +
            '</td><td class="tfs-ic">' +
            E +
            '</td><td class="tfs-ic">' +
            b.qty +
            '</td><td class="tfs-ir">' +
            b.price.toLocaleString() +
            '</td><td class="tfs-ir">' +
            b.amount.toLocaleString() +
            '</td><td class="tfs-ir">' +
            b.tax.toLocaleString() +
            '</td><td class="tfs-ic" style="font-size:9px;">' +
            (b ? n(b.note || "") : "") +
            "</td></tr>";
        } else
          f +=
            '<tr><td class="tfs-ic">' +
            v +
            "</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
      }
      return (
        '<div class="tfs ' +
        a +
        '"><div class="tfs-title"><span class="tfs-name">' +
        u.name +
        ' 거 래 명 세 서</span><span class="tfs-sub">(' +
        g +
        ')</span></div><table><colgroup><col style="width:22px"/><col style="width:64px"/><col/><col style="width:46px"/><col/><col style="width:22px"/><col style="width:64px"/><col/><col style="width:46px"/><col/></colgroup><tr><td class="tfs-sl" rowspan="4">공<br/>급<br/>자</td><td class="tfs-k">등록번호</td><td class="tfs-vb" colspan="3" style="letter-spacing:2px;">' +
        u.regNo +
        '</td><td class="tfs-sl" rowspan="4">공<br/>급<br/>받<br/>는<br/>자</td><td class="tfs-k">등록번호</td><td colspan="3"></td></tr><tr><td class="tfs-k">상&nbsp;호<small>(법인명)</small></td><td class="tfs-vb">' +
        u.name +
        '</td><td class="tfs-k">성명</td><td class="tfs-vb">' +
        u.ceo +
        '</td><td class="tfs-k">상&nbsp;호<small>(법인명)</small></td><td class="tfs-v">' +
        c +
        '</td><td class="tfs-k">성명</td><td class="tfs-vb">' +
        i +
        '</td></tr><tr><td class="tfs-k">사업장<br/>주&nbsp;소</td><td class="tfs-v" colspan="3" style="font-size:9px;">' +
        u.addr +
        '</td><td class="tfs-k">사업장<br/>주&nbsp;소</td><td class="tfs-v" colspan="3"></td></tr><tr><td class="tfs-k">업&nbsp;태</td><td class="tfs-v">' +
        u.bizType +
        '</td><td class="tfs-k">종목</td><td class="tfs-v">' +
        u.bizItem +
        '</td><td class="tfs-k">업&nbsp;태</td><td class="tfs-v"></td><td class="tfs-k">지&nbsp;역</td><td class="tfs-v">' +
        d +
        '</td></tr></table><table><colgroup><col style="width:48px"/><col style="width:96px"/><col style="width:48px"/><col/></colgroup><tr><td class="tfs-mid-k">작성<br/>년월일</td><td class="tfs-mid-v">' +
        o +
        "년 " +
        s +
        "월 " +
        l +
        '일</td><td class="tfs-mid-k">요청사항</td><td class="tfs-mid-r">&nbsp;</td></tr></table><table><colgroup><col style="width:8%"/><col style="width:24%"/><col style="width:10%"/><col style="width:7%"/><col style="width:13%"/><col style="width:16%"/><col style="width:12%"/><col style="width:10%"/></colgroup><tr><td class="tfs-ih">월&nbsp;일</td><td class="tfs-ih">품&nbsp;&nbsp;목</td><td class="tfs-ih">규&nbsp;격</td><td class="tfs-ih">수&nbsp;량</td><td class="tfs-ih">단&nbsp;가</td><td class="tfs-ih">공급가액</td><td class="tfs-ih">세&nbsp;액</td><td class="tfs-ih">비&nbsp;고</td></tr>' +
        f +
        '</table><table style="table-layout:fixed;"><colgroup><col style="width:18%"/><col style="width:10%"/><col style="width:10%"/><col style="width:10%"/><col style="width:13%"/><col style="width:10%"/><col style="width:29%"/></colgroup>' +
        ((y = t.payMethod || ""),
        '<tr><td class="tfs-fl">합계금액</td><td class="tfs-fl">분&nbsp;&nbsp;류</td><td class="tfs-fl">현금</td><td class="tfs-fl">카드</td><td class="tfs-fl">계좌이체</td><td class="tfs-fl">외상</td><td class="tfs-rc" rowspan="2">위 금액을&nbsp;&nbsp;<b>영수</b>&nbsp;&nbsp;함</td></tr><tr><td class="tfs-fv">' +
          e.toLocaleString() +
          '원</td><td class="tfs-ic" style="font-size:9px;">' +
          r +
          '</td><td class="tfs-ic" style="font-weight:700;color:#065f46;">' +
          ("현금" === y ? "✓" : "") +
          '</td><td class="tfs-ic" style="font-weight:700;color:#065f46;">' +
          ("카드" === y ? "✓" : "") +
          '</td><td class="tfs-ic" style="font-weight:700;color:#065f46;">' +
          ("계좌이체" === y ? "✓" : "") +
          '</td><td class="tfs-ic" style="font-weight:700;color:#065f46;">' +
          ("외상" === y ? "✓" : "") +
          '</td></tr></table><div class="tfs-bottom"><span class="tfs-amt">') +
        m +
        '</span><span class="tfs-paper">182mm × 128mm 인쇄용지</span></div></div>'
      );
    }
    return (
      '<div class="excel-frame">' +
      y("", "공급자 보관용") +
      '<div class="excel-divider"><span>✂ 절취선 ✂</span></div>' +
      y("bl", "공급받는자 보관용") +
      "</div>"
    );
  };
  function _(t) {
    const e = document.getElementById("print-target-area");
    if (!e || !e.querySelector(".excel-frame")) return;
    (e.classList.add("pf-active"),
      e.style.setProperty("--pscale", "1"),
      e.offsetHeight);
    let n = 1;
    for (let a = 0; a < 3; a++) {
      const a = e.scrollHeight;
      if (a <= t) break;
      const o = t / a;
      ((n = Math.max(0.3, n * o * 0.985)),
        e.style.setProperty("--pscale", String(n)),
        e.offsetHeight);
    }
  }
  function D() {
    _((96 / 25.4) * 281);
  }
  function P() {
    document.getElementById("print-overlay");
    _(Math.max(300, window.innerHeight - 80 - 24));
  }
  function X(t) {
    ((document.getElementById("print-target-area").innerHTML = N(t)),
      (e = t),
      document.getElementById("print-overlay").classList.add("show"),
      P(),
      setTimeout(() => {
        (D(), window.print());
      }, 150));
  }
  function R(t) {
    var e,
      n = g[t.supplier] || g.naepo,
      a = t.company && "-" !== t.company ? t.company : t.name,
      o = t.region && "미지정" !== t.region ? t.region : "지역미지정",
      s = (t.part || "").replace(/[\[\]]/g, "").replace(/\s+/g, "");
    t.items && t.items.length > 0
      ? ((e = t.items[0].item),
        t.items.length > 1 && (e += "외" + (t.items.length - 1) + "건"))
      : (e = "품목없음");
    var l = n.name + "_" + a + "_" + o + "_" + s + "_" + e;
    return (l = l.replace(/[:\\/?*\[\]"]/g, "").replace(/\s+/g, ""));
  }
  function U(t) {
    var n = t || [e];
    if (n && 0 !== n.length && n[0])
      if (1 !== n.length) {
        var o = new JSZip(),
          s = {};
        (n.forEach(function (t, e) {
          var n = c(t, R(t).substring(0, 31)),
            a = XLSX.write(n, { type: "array", bookType: "xlsx" }),
            l = R(t),
            i = l + ".xlsx";
          (s[i] ? (s[i]++, (i = l + "_" + s[i] + ".xlsx")) : (s[i] = 1),
            o.file(i, a));
        }),
          o
            .generateAsync({ type: "blob" })
            .then(function (t) {
              var e = URL.createObjectURL(t),
                n = document.createElement("a");
              n.href = e;
              var a = new Date().toISOString().slice(0, 10).replace(/-/g, "");
              ((n.download = a + "_거래명세서.zip"),
                n.click(),
                URL.revokeObjectURL(e));
            })
            .catch(function (t) {
              I(
                "압축 실패",
                "ZIP 파일을 만들는 중 오류가 발생했습니다: " + t.message,
              );
            }));
      } else {
        var l = R(n[0]).substring(0, 31),
          i = c(n[0], l);
        XLSX.writeFile(i, R(n[0]) + ".xlsx");
      }
    else
      I(
        "작업 불가",
        "선택되거나 활성화된 거래명세 레코드가 존재하지 않습니다.",
      );
    function c(t, e) {
      var n = XLSX.utils.book_new();
      n.Workbook = { Names: [] };
      var o,
        s,
        l,
        i =
          ((o = []),
          (s = []),
          (l = 0),
          [t].forEach(function (t) {
            var e = t.date.split("-"),
              n = e[0],
              i = parseInt(e[1], 10),
              c = parseInt(e[2], 10),
              d = t.name && "-" !== t.name ? t.name : "",
              r = a(t.company && "-" !== t.company ? t.company : ""),
              p = t.region && "미지정" !== t.region ? t.region : "",
              m = a(t.part || ""),
              u = t.amount + t.tax,
              y = Math.max(5, t.items.length),
              f = "금 " + H(u) + "원정",
              h = g[t.supplier] || g.naepo;
            ["공급자 보관용", "공급받는자 보관용"].forEach(function (e) {
              (o.push([
                h.name + " 거래명세서",
                "",
                "",
                "",
                "(" + e + ")",
                "",
                "",
                "",
              ]),
                s.push({ s: { r: l, c: 0 }, e: { r: l, c: 3 } }),
                s.push({ s: { r: l, c: 4 }, e: { r: l, c: 7 } }));
              var g = ++l;
              (o.push([
                "공급자",
                "등록번호",
                h.regNo,
                "",
                "공급받는자",
                "등록번호",
                "",
                "",
              ]),
                s.push({ s: { r: l, c: 0 }, e: { r: g + 3, c: 0 } }),
                s.push({ s: { r: l, c: 2 }, e: { r: l, c: 3 } }),
                s.push({ s: { r: l, c: 4 }, e: { r: g + 3, c: 4 } }),
                s.push({ s: { r: l, c: 6 }, e: { r: l, c: 7 } }),
                l++,
                o.push([
                  "",
                  "상호(법인명)",
                  h.name,
                  "성명: " + h.ceo,
                  "",
                  "상호(법인명)",
                  r,
                  "성명: " + d,
                ]),
                l++,
                o.push([
                  "",
                  "사업장주소",
                  h.addr,
                  "",
                  "",
                  "사업장주소",
                  "",
                  "",
                ]),
                s.push({ s: { r: l, c: 2 }, e: { r: l, c: 3 } }),
                s.push({ s: { r: l, c: 6 }, e: { r: l, c: 7 } }),
                l++,
                o.push([
                  "",
                  "업태",
                  h.bizType,
                  "종목: " + h.bizItem,
                  "",
                  "업태",
                  "",
                  "지역: " + p,
                ]),
                l++,
                o.push([
                  "작성년월일",
                  n + "년 " + i + "월 " + c + "일",
                  "요청사항",
                  "",
                  "",
                  "",
                  "",
                  "",
                ]),
                s.push({ s: { r: l, c: 3 }, e: { r: l, c: 7 } }),
                l++,
                o.push([
                  "월/일",
                  "품목",
                  "규격",
                  "수량",
                  "단가",
                  "공급가액",
                  "세액",
                  "비고",
                ]),
                l++);
              for (var b = 0; b < y; b++) {
                var v = t.items[b],
                  E = 0 === b ? i + "/" + c : "";
                if (v) {
                  var x = v.spec && "-" !== v.spec ? a(v.spec) : "";
                  o.push([
                    E,
                    a(v.item),
                    x,
                    v.qty,
                    v.price,
                    v.amount,
                    v.tax,
                    "",
                  ]);
                } else o.push([E, "", "", "", "", "", "", ""]);
                l++;
              }
              var w = t.payMethod || "미기재";
              (o.push([
                "합계금액",
                "분류",
                "현금",
                "카드",
                "계좌이체",
                "외상",
                "위 금액을 영수 함",
                "",
              ]),
                s.push({ s: { r: l, c: 6 }, e: { r: l + 1, c: 6 } }),
                l++,
                o.push([
                  u,
                  m,
                  "현금" === w ? "✓" : "",
                  "카드" === w ? "✓" : "",
                  "계좌이체" === w ? "✓" : "",
                  "외상" === w ? "✓" : "",
                  "",
                  "",
                ]),
                l++,
                o.push([f, "", "", "", "", "", "182mm×128mm", ""]),
                s.push({ s: { r: l, c: 0 }, e: { r: l, c: 4 } }),
                s.push({ s: { r: l, c: 6 }, e: { r: l, c: 7 } }),
                l++,
                o.push(["", "", "", "", "", "", "", ""]),
                l++,
                "공급자 보관용" === e &&
                  (o.push([
                    "✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ]),
                  s.push({ s: { r: l, c: 0 }, e: { r: l, c: 7 } }),
                  l++,
                  o.push(["", "", "", "", "", "", "", ""]),
                  l++));
            });
          }),
          { rows: o, merges: s }),
        c = (function (t, e) {
          if (!t || "object" != typeof t) return t;
          var n = e.rows;
          t["!merges"] = e.merges;
          for (var a = [], o = 0, s = "red", l = 0; l < n.length; l++)
            String(n[l][0] || "").indexOf("✂") >= 0 &&
              (a.push({ s: o, e: l - 1, c: s }), (o = l + 2), (s = "blue"));
          function i(t) {
            for (var e = 0; e < a.length; e++)
              if (t >= a[e].s && t <= a[e].e) return a[e].c;
            return "red";
          }
          a.push({ s: o, e: n.length - 1, c: s });
          var c = "B33A3A",
            d = "2C5F8A";
          function r(t) {
            return {
              top: { style: "thin", color: { rgb: t } },
              bottom: { style: "thin", color: { rgb: t } },
              left: { style: "thin", color: { rgb: t } },
              right: { style: "thin", color: { rgb: t } },
            };
          }
          for (
            var p = [
                "등록번호",
                "상호(법인명)",
                "사업장주소",
                "업태",
                "작성년월일",
                "요청사항",
                "분류",
                "현금",
                "카드",
                "계좌이체",
                "외상",
              ],
              m = [
                "월/일",
                "품목",
                "규격",
                "수량",
                "단가",
                "공급가액",
                "세액",
                "비고",
              ],
              u = 0;
            u < n.length;
            u++
          )
            for (var g = "red" === i(u) ? c : d, y = (i(u), 0); y < 8; y++) {
              var f = XLSX.utils.encode_cell({ r: u, c: y });
              t[f] || (t[f] = { v: "", t: "s" });
              var h = t[f],
                b = String(h.v || "");
              ((h.s = {
                font: { name: "맑은 고딕", sz: 8.5, color: { rgb: "222222" } },
                alignment: {
                  vertical: "center",
                  horizontal: "center",
                  wrapText: !0,
                },
                border: r(g),
              }),
                b.indexOf("거래명세서") >= 0
                  ? (h.s.font = {
                      name: "맑은 고딕",
                      sz: 13,
                      bold: !0,
                      color: { rgb: g },
                    })
                  : b.indexOf("보관용") >= 0
                    ? (h.s.font = {
                        name: "맑은 고딕",
                        sz: 9.5,
                        bold: !0,
                        color: { rgb: g },
                      })
                    : "공급자" === b || "공급받는자" === b || "합계금액" === b
                      ? (h.s.font = {
                          name: "맑은 고딕",
                          sz: 8.5,
                          bold: !0,
                          color: { rgb: g },
                        })
                      : b.indexOf("위 금액") >= 0
                        ? (h.s.font = {
                            name: "맑은 고딕",
                            sz: 9.5,
                            bold: !0,
                            color: { rgb: "444444" },
                          })
                        : 0 === b.indexOf("금 ") && b.indexOf("원정") > 0
                          ? ((h.s.font = {
                              name: "맑은 고딕",
                              sz: 8.5,
                              bold: !0,
                              color: { rgb: g },
                            }),
                            (h.s.alignment.horizontal = "left"))
                          : p.indexOf(b) >= 0
                            ? (h.s.font = {
                                name: "맑은 고딕",
                                sz: 8.5,
                                bold: !0,
                                color: { rgb: "444444" },
                              })
                            : m.indexOf(b) >= 0
                              ? (h.s.font = {
                                  name: "맑은 고딕",
                                  sz: 8.5,
                                  bold: !0,
                                  color: { rgb: g },
                                })
                              : b.indexOf("✂") >= 0
                                ? ((h.s.font = {
                                    name: "맑은 고딕",
                                    sz: 8,
                                    color: { rgb: "AAAAAA" },
                                  }),
                                  (h.s.border = {}))
                                : b.indexOf("성명:") >= 0 ||
                                    b.indexOf("종목:") >= 0 ||
                                    b.indexOf("지역:") >= 0
                                  ? ((h.s.font = {
                                      name: "맑은 고딕",
                                      sz: 8.5,
                                      bold: !0,
                                      color: { rgb: "222222" },
                                    }),
                                    (h.s.alignment.horizontal = "left"))
                                  : b.indexOf("년 ") >= 0 &&
                                    b.indexOf("월 ") >= 0 &&
                                    b.indexOf("일") >= 0 &&
                                    b.length < 16 &&
                                    ((h.s.font = {
                                      name: "맑은 고딕",
                                      sz: 8,
                                      bold: !0,
                                      color: { rgb: "222222" },
                                    }),
                                    (h.s.alignment.horizontal = "center")),
                "number" == typeof h.v &&
                  ((h.z = "#,##0"), (h.s.alignment.horizontal = "right")));
            }
          for (var v = 0; v < n.length; v++)
            if (
              "합계금액" === String(n[v][0]) &&
              v + 1 < n.length &&
              "number" == typeof n[v + 1][0]
            ) {
              var E = "red" === i(v) ? c : d,
                x = XLSX.utils.encode_cell({ r: v + 1, c: 0 });
              t[x] &&
                ((t[x].s.font = {
                  name: "맑은 고딕",
                  sz: 12,
                  bold: !0,
                  color: { rgb: E },
                }),
                (t[x].z = '#,##0"원"'));
            }
          for (var w = 0; w < n.length; w++)
            if ("요청사항" === String(n[w][2])) {
              var k = XLSX.utils.encode_cell({ r: w, c: 3 });
              t[k] &&
                ((t[k].s.alignment.horizontal = "left"),
                (t[k].s.font = {
                  name: "맑은 고딕",
                  sz: 9,
                  color: { rgb: "444444" },
                }));
            }
          return (
            (t["!cols"] = [
              { wch: 10 },
              { wch: 13 },
              { wch: 16 },
              { wch: 14 },
              { wch: 9 },
              { wch: 13 },
              { wch: 9 },
              { wch: 14 },
            ]),
            (t["!rows"] = n.map(function (t) {
              var e = String(t[0] || "");
              return e.indexOf("거래") >= 0
                ? { hpt: 28, hpx: 37, customHeight: !0 }
                : e.indexOf("✂") >= 0
                  ? { hpt: 12, hpx: 16, customHeight: !0 }
                  : { hpt: 24, hpx: 32, customHeight: !0 };
            })),
            t["!pageSetup"] || (t["!pageSetup"] = {}),
            (t["!pageSetup"].orientation = "portrait"),
            (t["!pageSetup"].fitToWidth = 1),
            (t["!pageSetup"].fitToHeight = 1),
            (t["!pageSetup"].fitToPage = !0),
            (t["!pageSetup"].paperSize = 9),
            (t["!margins"] = {
              left: 0.15,
              right: 0.15,
              top: 0.2,
              bottom: 0.2,
              header: 0.1,
              footer: 0.1,
            }),
            t
          );
        })(XLSX.utils.aoa_to_sheet(i.rows), i),
        d = i.rows.length;
      return (
        (c["!ref"] = "A1:H" + d),
        c["!pageSetup"] || (c["!pageSetup"] = {}),
        (c["!pageSetup"].orientation = "portrait"),
        (c["!pageSetup"].fitToWidth = 1),
        (c["!pageSetup"].fitToHeight = 1),
        (c["!pageSetup"].fitToPage = !0),
        (c["!pageSetup"].paperSize = 9),
        (c["!margins"] = {
          left: 0.15,
          right: 0.15,
          top: 0.2,
          bottom: 0.2,
          header: 0.1,
          footer: 0.1,
        }),
        n.Workbook.Names.push({
          Sheet: 0,
          Name: "_xlnm.Print_Area",
          Ref: "'" + e + "'!$A$1:$H$" + d,
        }),
        XLSX.utils.book_append_sheet(n, c, e),
        n
      );
    }
  }
  function F() {
    (document.getElementById("print-overlay").classList.remove("show"),
      document.getElementById("pwd-overlay").classList.remove("show"),
      (document.getElementById("print-target-area").innerHTML = ""),
      (document.getElementById("pwd-err").textContent = ""),
      (document.getElementById("pw-old").value = ""),
      (document.getElementById("pw-new").value = ""));
  }
  function J(t, e) {
    if ("form" !== t) {
      if (r) {
        r = null;
        const tb = document.getElementById("save-btn");
        tb &&
          ((tb.innerHTML =
            '<i class="fa-solid fa-download"></i> 내역 데이터 저장'),
          (tb.style.background = ""));
        const eb = document.getElementById("edit-mode-banner");
        eb && (eb.style.display = "none");
      }
    }
    const n = {
      dashboard: "page-dashboard",
      form: "page-form",
      list: "page-list",
      inventory: "page-inventory",
      customer: "page-customer",
    };
    (Object.keys(n).forEach((e) => {
      (document.getElementById("tab-" + e).classList.toggle("on", e === t),
        (document.getElementById(n[e]).style.display =
          e === t ? "block" : "none"));
    }),
      "list" === t &&
        ((y = 1),
        (h = 10),
        document.querySelectorAll(".perpage-btn").forEach(function (b) {
          b.classList.toggle("on", "10" === b.getAttribute("data-n"));
        }),
        C()),
      "inventory" === t && (ut(), gt(), lt()),
      "dashboard" === t && Q(),
      "customer" === t && rt(),
      !1 !== e && history.pushState({ tab: t }, "", "#" + t));
  }
  (window.addEventListener("beforeprint", D),
    window.addEventListener("afterprint", function () {
      const t = document.getElementById("print-target-area");
      t &&
        (t.style.setProperty("--pscale", "1"), t.classList.remove("pf-active"));
    }),
    window.addEventListener("resize", () => {
      document.getElementById("print-overlay").classList.contains("show") &&
        P();
    }),
    document.getElementById("auth-pw").addEventListener("keydown", (t) => {
      "Enter" === t.key &&
        (t.preventDefault(), document.getElementById("auth-submit").click());
    }),
    document
      .getElementById("auth-submit")
      .addEventListener("click", async () => {
        const t = document.getElementById("auth-pw").value,
          e = document.getElementById("auth-err"),
          n = document.getElementById("auth-lock"),
          a = document.getElementById("auth-submit");
        if (!t) return void (e.textContent = "비밀번호를 입력해주세요.");
        ((n.style.display = "none"), (e.textContent = ""), (a.disabled = !0));
        const o = a.textContent;
        a.textContent = "확인 중...";
        try {
          const a = await fetch(b + "/api/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: t }),
            }),
            o = await a.json().catch(() => null);
          if (!a.ok)
            return void (429 === a.status
              ? ((n.style.display = "block"),
                (n.textContent =
                  (o && o.error) ||
                  "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."))
              : (e.textContent =
                  (o && o.error) || "비밀번호가 일치하지 않습니다."));
          ((s = o.token),
            sessionStorage.setItem(v, s),
            document.getElementById("auth-layer").classList.add("hidden"),
            document.getElementById("main-content").classList.add("visible"),
            await k(),
            await ut(),
            lt(),
            rt(),
            C(),
            Q());
        } catch (t) {
          e.textContent =
            "서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태(Render)를 확인해주세요.";
        } finally {
          ((a.disabled = !1), (a.textContent = o));
        }
        var s;
      }),
    window.addEventListener("popstate", (t) => {
      J((t.state && t.state.tab) || "dashboard", !1);
    }),
    document
      .getElementById("tab-dashboard")
      .addEventListener("click", () => J("dashboard")),
    document.querySelectorAll(".perpage-btn").forEach((t) => {
      t.addEventListener("click", () => {
        ((h = parseInt(t.getAttribute("data-n"), 10)),
          document
            .querySelectorAll(".perpage-btn")
            .forEach((e) => e.classList.toggle("on", e === t)),
          (y = 1),
          C());
      });
    }),
    document
      .getElementById("tab-form")
      .addEventListener("click", () => J("form")),
    document
      .getElementById("tab-list")
      .addEventListener("click", () => J("list")),
    document
      .getElementById("tab-inventory")
      .addEventListener("click", () => J("inventory")),
    document
      .getElementById("tab-customer")
      .addEventListener("click", () => J("customer")),
    document
      .getElementById("dash-period-week")
      .addEventListener("click", () => {
        ((Y = "week"),
          (W = 0),
          document.getElementById("dash-period-week").classList.add("on"),
          document.getElementById("dash-period-month").classList.remove("on"),
          Q());
      }),
    document
      .getElementById("dash-period-month")
      .addEventListener("click", () => {
        ((Y = "month"),
          (W = 0),
          document.getElementById("dash-period-month").classList.add("on"),
          document.getElementById("dash-period-week").classList.remove("on"),
          Q());
      }),
    document
      .getElementById("dash-period-prev")
      .addEventListener("click", () => {
        (W--, Q());
      }),
    document
      .getElementById("dash-period-next")
      .addEventListener("click", () => {
        (W++, Q());
      }),
    document
      .getElementById("dash-exclude-channel")
      .addEventListener("change", (t) => {
        ((p = t.target.checked), Q());
      }),
    document.getElementById("cat-view-detail").addEventListener("click", () => {
      ((m = "detail"), V.clear(), Q());
    }),
    document.getElementById("cat-view-main").addEventListener("click", () => {
      ((m = "main"), V.clear(), Q());
    }),
    document.getElementById("chart-type-bar").addEventListener("click", () => {
      ((Z = "bar"),
        document.getElementById("chart-type-bar").classList.add("on"),
        document.getElementById("chart-type-doughnut").classList.remove("on"),
        tt());
    }),
    document
      .getElementById("chart-type-doughnut")
      .addEventListener("click", () => {
        ((Z = "doughnut"),
          document.getElementById("chart-type-doughnut").classList.add("on"),
          document.getElementById("chart-type-bar").classList.remove("on"),
          tt());
      }));
  let Y = "week",
    W = 0,
    K = null,
    Z = "bar";
  function G(t) {
    return (
      t.getFullYear() +
      "-" +
      String(t.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(t.getDate()).padStart(2, "0")
    );
  }
  let V = new Set();
  function Q() {
    const e = (function (t, e) {
      const n = new Date();
      if ("week" === t) {
        const t = n.getDay(),
          a = 0 === t ? -6 : 1 - t,
          o = new Date(n);
        o.setDate(n.getDate() + a + 7 * e);
        const s = new Date(o);
        return (
          s.setDate(o.getDate() + 6),
          { start: G(o), end: G(s), label: `${G(o)} ~ ${G(s)}` }
        );
      }
      {
        const t = new Date(n.getFullYear(), n.getMonth() + e, 1),
          a = t.getFullYear(),
          o = t.getMonth(),
          s = a + "-" + String(o + 1).padStart(2, "0") + "-01",
          l = new Date(a, o + 1, 0).getDate();
        return {
          start: s,
          end:
            a +
            "-" +
            String(o + 1).padStart(2, "0") +
            "-" +
            String(l).padStart(2, "0"),
          label: `${a}년 ${o + 1}월`,
        };
      }
    })(Y, W);
    ((document.getElementById("dash-period-label").textContent = e.label),
      (document.getElementById("dash-amount-label").textContent =
        ("week" === Y ? "이번주" : "이번달") +
        " 총 거래금액" +
        (p ? " (계통제외)" : "")),
      (document.getElementById("dash-count-label").textContent =
        ("week" === Y ? "이번주" : "이번달") +
        " 거래건수" +
        (p ? " (계통제외)" : "")));
    const a = p ? t.filter((t) => "계통" !== t.cat) : t,
      o = a.filter((t) => t.date >= e.start && t.date <= e.end),
      s = o.reduce((t, e) => t + (e.amount || 0) + (e.tax || 0), 0),
      l = nt.filter((t) => t.stock <= t.minStock).length,
      i = new Set(
        a
          .map((t) => (t.company && "-" !== t.company ? t.company : t.name))
          .filter(Boolean),
      );
    ((document.getElementById("dash-month-amount").textContent =
      s.toLocaleString() + "원"),
      (document.getElementById("dash-month-count").textContent =
        o.length.toLocaleString() + "건"),
      (document.getElementById("dash-low-stock").textContent =
        l.toLocaleString() + "개"),
      (document.getElementById("dash-company-count").textContent =
        i.size.toLocaleString() + "곳"));
    const c = new Map();
    o.forEach((t) => {
      const e =
          "detail" === m ? t.part || t.cat || "미분류" : t.cat || "미분류",
        n = c.get(e) || { count: 0, amount: 0 };
      c.set(e, {
        count: n.count + 1,
        amount: n.amount + (t.amount || 0) + (t.tax || 0),
      });
    });
    const d = [...c.keys()].sort(),
      r = document.getElementById("cat-view-detail"),
      u = document.getElementById("cat-view-main");
    (r && r.classList.toggle("on", "detail" === m),
      u && u.classList.toggle("on", "main" === m));
    const g = document.getElementById("dash-cat-filter"),
      y = {
        일반: "#0369a1",
        계통: "#047857",
        자체: "#7c3aed",
        미분류: "#94a3b8",
      },
      f = ["#b45309", "#0e7490", "#be185d", "#b91c1c"];
    function h(t) {
      for (const e of Object.keys(y)) if (t.startsWith(e)) return y[e];
      return f[d.indexOf(t) % f.length];
    }
    ((g.innerHTML =
      d
        .map((t) => {
          const e = V.has(t),
            a = h(t);
          return `<button class="dash-cat-btn" data-cat="${n(t)}"\n          style="padding:5px 14px;border-radius:20px;border:2px solid ${a};background:${e ? a : "#fff"};color:${e ? "#fff" : a};font-size:12px;font-weight:700;cursor:pointer;">\n          ${n(t)}\n        </button>`;
        })
        .join("") +
      (d.length > 1
        ? '<button id="dash-cat-all-btn" style="padding:5px 14px;border-radius:20px;border:2px solid #e2e8f0;background:#f8fafc;color:#94a3b8;font-size:12px;cursor:pointer;">전체 초기화</button>'
        : "")),
      g.querySelectorAll(".dash-cat-btn").forEach((t) => {
        t.addEventListener("click", () => {
          const e = t.getAttribute("data-cat");
          (V.has(e) ? V.delete(e) : V.add(e), Q());
        });
      }));
    const b = g.querySelector("#dash-cat-all-btn");
    b &&
      b.addEventListener("click", () => {
        (V.clear(), Q());
      });
    const v = V.size > 0 ? d.filter((t) => V.has(t)) : d,
      E = document.getElementById("dash-cat-body");
    0 === d.length
      ? (E.innerHTML =
          '<span style="color:#94a3b8;font-size:12px;">해당 기간 거래내역이 없습니다.</span>')
      : (E.innerHTML = v
          .map((t) => {
            const e = c.get(t);
            return `<div style="background:${h(t)};color:#fff;border-radius:12px;padding:14px 18px;min-width:150px;flex:1;">\n            <div style="font-size:11.5px;font-weight:600;opacity:0.85;margin-bottom:6px;">${n(t)}</div>\n            <div style="font-size:20px;font-weight:800;">${e.amount.toLocaleString()}원</div>\n            <div style="font-size:11px;opacity:0.75;margin-top:4px;">${e.count}건</div>\n          </div>`;
          })
          .join(""));
    const x = [...t]
        .sort((t, e) => (e.date || "").localeCompare(t.date || ""))
        .slice(0, 5),
      w = document.getElementById("dash-recent-body");
    (0 === x.length
      ? (w.innerHTML =
          '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">거래내역이 없습니다.</td></tr>')
      : (w.innerHTML = x
          .map(
            (t) =>
              `\n          <tr>\n            <td>${n(t.date)}</td>\n            <td>${n(t.company && "-" !== t.company ? t.company : t.name)}</td>\n            <td>${n(t.region)}</td>\n            <td class="tr">${((t.amount || 0) + (t.tax || 0)).toLocaleString()}원</td>\n          </tr>`,
          )
          .join("")),
      tt(),
      (function () {
        const e = document.getElementById("dash-customer-top");
        if (!e) return;
        const a = new Map();
        t.forEach((t) => {
          const e = dt(t);
          a.set(e, (a.get(e) || 0) + (t.amount || 0) + (t.tax || 0));
        });
        const o = [...a.entries()].sort((t, e) => e[1] - t[1]).slice(0, 5);
        if (0 === o.length)
          return void (e.innerHTML =
            '<div style="color:#94a3b8;font-size:12px;padding:8px;">거래 데이터가 없습니다.</div>');
        const s = o[0][1],
          l = ["#065f46", "#0369a1", "#7c3aed", "#b45309", "#be185d"];
        e.innerHTML = o
          .map(([t, e], a) => {
            const o = Math.round((e / s) * 100);
            return `<div style="display:flex;align-items:center;gap:10px;">\n          <div style="width:80px;font-size:12px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n(t)}</div>\n          <div style="flex:1;background:#f1f5f9;border-radius:6px;height:20px;overflow:hidden;">\n            <div style="width:${o}%;height:100%;background:${l[a]};border-radius:6px;transition:width 0.4s;"></div>\n          </div>\n          <div style="width:80px;text-align:right;font-size:12px;font-weight:700;color:${l[a]};">${e.toLocaleString()}원</div>\n        </div>`;
          })
          .join("");
      })(),
      mt());
  }
  function tt() {
    const t = document.getElementById("dash-turnover-chart");
    if (!t || "undefined" == typeof Chart) return;
    const e = new Map();
    at.forEach((t) => {
      "out" === t.type && e.set(t.partName, (e.get(t.partName) || 0) + t.qty);
    });
    const n = [...e.entries()].sort((t, e) => e[1] - t[1]).slice(0, 5);
    if (0 === n.length) return void (t.style.display = "none");
    t.style.display = "block";
    const a = n.map(([t]) => t),
      o = n.map(([, t]) => t),
      s = ["#065f46", "#0369a1", "#7c3aed", "#b45309", "#be185d"];
    (K && (K.destroy(), (K = null)),
      (K = new Chart(t, {
        type: Z,
        data: {
          labels: a,
          datasets: [
            {
              label: "출고량",
              data: o,
              backgroundColor: "bar" === Z ? s.map((t) => t + "22") : s,
              borderColor: s,
              borderWidth: "bar" === Z ? 2 : 0,
              borderRadius: "bar" === Z ? 8 : 0,
            },
          ],
        },
        options: {
          responsive: !0,
          maintainAspectRatio: !1,
          plugins: {
            legend: {
              display: "doughnut" === Z,
              position: "right",
              labels: { font: { size: 12 }, padding: 14 },
            },
            tooltip: {
              callbacks: {
                label: (t) => `${t.label}: ${t.parsed.y ?? t.parsed}개`,
              },
            },
          },
          scales:
            "bar" === Z
              ? {
                  y: {
                    beginAtZero: !0,
                    ticks: { precision: 0, font: { size: 11 } },
                    grid: { color: "#f1f5f9" },
                  },
                  x: { ticks: { font: { size: 11 } }, grid: { display: !1 } },
                }
              : {},
        },
      })));
  }
  function et(t, e) {
    try {
      let n = "",
        a = "",
        o = "",
        s = "";
      const l = [];
      let i = 0,
        c = 0,
        d = -1;
      const r = Math.min(e + 50, t.length);
      for (let p = e; p < r; p++) {
        const r = t[p].map((t) => String(t || "").trim()),
          m = r.join("").replace(/\s/g, "");
        if (m.includes("##")) break;
        if (p > e + 5 && m.includes("공급받는자보관용")) break;
        const u = r.length,
          g = Math.ceil(u / 2);
        if (!n)
          for (let t = 0; t < u - 1; t++) {
            const e = parseInt(r[t].replace(/[^0-9]/g, "").slice(0, 4), 10);
            if (
              e >= 2020 &&
              e <= 2030 &&
              r[t].replace(/[^0-9]/g, "").length >= 4
            ) {
              const a = parseInt(r[t + 1].replace(/[^0-9]/g, ""), 10);
              if (a >= 1 && a <= 12) {
                const o = parseInt((r[t + 2] || "").replace(/[^0-9]/g, ""), 10);
                if (o >= 1 && o <= 31) {
                  n =
                    e +
                    "-" +
                    String(a).padStart(2, "0") +
                    "-" +
                    String(o).padStart(2, "0");
                  break;
                }
                const s = r[t + 1]
                  .replace(/[^0-9\/]/g, " ")
                  .trim()
                  .split(/[\s\/]+/);
                if (s.length >= 2) {
                  const t = parseInt(s[0], 10),
                    a = parseInt(s[1], 10);
                  if (t >= 1 && t <= 12 && a >= 1 && a <= 31) {
                    n =
                      e +
                      "-" +
                      String(t).padStart(2, "0") +
                      "-" +
                      String(a).padStart(2, "0");
                    break;
                  }
                }
              }
            }
          }
        const y = [];
        if (
          (r.forEach((t, e) => {
            const n = t.replace(/\s/g, "");
            ("성명" !== n && "姓名" !== n) || y.push(e);
          }),
          y.length > 0)
        ) {
          for (let t = y[y.length - 1] + 1; t < u; t++) {
            const e = r[t].replace(/\s/g, "");
            if (e && "성명" !== e && !e.includes("등록번호")) {
              a || (a = r[t].trim());
              break;
            }
          }
        }
        const f = [];
        if (
          (r.forEach((t, e) => {
            (t.replace(/\s/g, "").includes("상호") ||
              t.replace(/\s/g, "").includes("법인명")) &&
              f.push(e);
          }),
          f.length >= 2 && !o)
        ) {
          for (let t = f[f.length - 1] + 1; t < u; t++) {
            const e = r[t].trim();
            if (
              e &&
              !e.replace(/\s/g, "").includes("상호") &&
              !e.includes("법인") &&
              !e.replace(/\s/g, "").includes("성명")
            ) {
              o = e;
              break;
            }
          }
        }
        if (!s)
          for (let t = g - 2; t < u; t++)
            if (
              "지역" === r[t].replace(/\s/g, "") ||
              "지 역" === r[t].replace(/\s/g, "")
            )
              for (let e = t + 1; e < u; e++)
                if (r[e] && !r[e].includes("지역")) {
                  s = r[e].trim();
                  break;
                }
        if (m.includes("품목") && (m.includes("수량") || m.includes("단가")))
          d = p;
        else {
          if (d >= 0) {
            let t = -1,
              e = -1,
              n = 0;
            for (let a = 0; a < Math.min(4, u); a++) {
              const o = parseInt(r[a].replace(/[^0-9]/g, ""), 10);
              if (o >= 1 && o <= 12 && t < 0) ((t = o), (n = a + 1));
              else if (o >= 1 && o <= 31 && t >= 0 && e < 0) {
                ((e = o), (n = a + 1));
                break;
              }
            }
            if (t >= 1 && t <= 12 && e >= 1 && e <= 31) {
              let t = "",
                e = n;
              for (let a = n; a < u; a++) {
                if (!r[a]) continue;
                const n = parseFloat(r[a].replace(/,/g, ""));
                if (isNaN(n)) {
                  ((t = r[a].trim()), (e = a));
                  break;
                }
              }
              if (!t) continue;
              const a = [];
              for (let t = e + 1; t < u; t++) {
                const e = parseFloat(String(r[t]).replace(/,/g, ""));
                !isNaN(e) && e > 0 && a.push({ col: t, val: e });
              }
              let o = 0,
                s = 0,
                d = 0,
                p = 0;
              (a.length >= 1 && (o = a[0].val),
                a.length >= 2 && (s = a[1].val),
                a.length >= 3 && (d = a[2].val),
                a.length >= 4 && (p = a[3].val),
                o > 1e3 && s < o && ([o, s] = [s, o]),
                o || (o = 1),
                !d && s && o && (d = s * o),
                l.push({
                  item: t,
                  spec: "-",
                  qty: o,
                  price: s,
                  amount: d,
                  tax: p,
                  note: "",
                }),
                (i += d),
                (c += p));
            }
          }
          if (m.includes("합계금액")) {
            const e = t[p + 1];
            if (e)
              for (let t = 0; t < e.length; t++) {
                const n = parseFloat(String(e[t] || "").replace(/,/g, ""));
                if (!isNaN(n) && n > 0) {
                  i = n;
                  break;
                }
              }
          }
        }
      }
      return n
        ? 0 === l.length
          ? null
          : (a || o || (a = "미확인"),
            {
              id:
                "imp_" +
                Date.now().toString(36) +
                "_" +
                Math.random().toString(36).slice(2, 7),
              date: n,
              author: "가져오기",
              supplier: "naepo",
              company: o || "-",
              name: a || "-",
              region: s || "미지정",
              cat: "일반",
              part: "일반 [판매]",
              payMethod: "미기재",
              note: l[0].item + (l.length > 1 ? ` 외 ${l.length - 1}건` : ""),
              amount: i,
              tax: c,
              items: l,
              createdAt: new Date().toISOString(),
            })
        : null;
    } catch (t) {
      return null;
    }
  }
  (document.getElementById("btn-add-item-row").addEventListener("click", $),
    document.getElementById("save-btn").addEventListener("click", T),
    document.getElementById("page-form").addEventListener("keydown", (t) => {
      "Enter" === t.key &&
        "TEXTAREA" !== t.target.tagName &&
        "BUTTON" !== t.target.tagName &&
        (document
          .getElementById("pretty-modal-container")
          .classList.contains("show") ||
          (t.preventDefault(), T()));
    }),
    document.getElementById("btn-reset").addEventListener("click", () => {
      S(
        "양식 초기화 확인",
        "현재 작성 중인 거래명세서 폼 데이터 전체가 리셋됩니다. 진행하시겠습니까?",
        () => {
          q();
        },
        () => {},
      );
    }),
    document.getElementById("fl-search").addEventListener("input", () => {
      ((y = 1), C());
    }),
    document.getElementById("fl-region").addEventListener("input", () => {
      ((y = 1), C());
    }),
    document.getElementById("fl-sdate").addEventListener("change", () => {
      ((y = 1), C());
    }),
    document.getElementById("fl-edate").addEventListener("change", () => {
      ((y = 1), C());
    }),
    document.getElementById("chk-all").addEventListener("change", (t) => {
      (document
        .querySelectorAll(".chk-row")
        .forEach((e) => (e.checked = t.target.checked)),
        O());
    }));
  ((function () {
    document
      .querySelectorAll(".records-table thead th[data-sort]")
      .forEach((th) => {
        const col = th.getAttribute("data-sort");
        if (!col) return;
        th.title = "클릭하여 정렬";
        th.addEventListener("click", () => {
          const prevText = th.textContent.replace(/ [▲▼]$/, "");
          if (sortCol === col) {
            sortDir *= -1;
          } else {
            sortCol = col;
            sortDir = 1;
          }
          document
            .querySelectorAll(".records-table thead th[data-sort]")
            .forEach((h) => {
              h.textContent = h.textContent.replace(/ [▲▼]$/, "");
            });
          th.textContent = prevText + (sortDir === 1 ? " ▲" : " ▼");
          y = 1;
          C();
        });
      });
  })(),
    document.getElementById("list-body").addEventListener("change", (t) => {
      t.target && t.target.classList.contains("chk-row") && O();
    }),
    document.getElementById("btn-sel-excel").addEventListener("click", () => {
      const e = document.querySelectorAll(".chk-row:checked");
      if (0 === e.length)
        return void I(
          "선택 항목 없음",
          "엑셀 변환을 수행할 명세 내역 체크박스를 최소 1개 선택하세요.",
        );
      let n = [];
      (e.forEach((e) => {
        const a = e.getAttribute("data-id"),
          o = t.find((t) => t.id === a);
        o && n.push(o);
      }),
        U(n));
    }),
    document.getElementById("btn-excel").addEventListener("click", () => {
      if (0 !== t.length) {
        var e = [
          "날짜,작성자,거래처,성명,지역,분류,총공급가액,총세액,합계금액,품목상세,비고",
        ];
        t.forEach(function (t) {
          var n = t.items
              .map(function (t) {
                return t.item + "(" + t.qty + "x" + t.price + ")";
              })
              .join(" / "),
            o = [
              a(t.date),
              a(t.author),
              '"' + a(t.company || "").replace(/"/g, '""') + '"',
              '"' + a(t.name || "").replace(/"/g, '""') + '"',
              a(t.region),
              '"' + a(t.part || "").replace(/"/g, '""') + '"',
              t.amount,
              t.tax,
              t.amount + t.tax,
              '"' + a(n).replace(/"/g, '""') + '"',
              '"' + a(t.note || "").replace(/"/g, '""') + '"',
            ].join(",");
          e.push(o);
        });
        var n = new Blob(["\ufeff" + e.join("\n")], {
            type: "text/csv;charset=utf-8;",
          }),
          o = URL.createObjectURL(n),
          s = document.createElement("a");
        ((s.href = o),
          (s.download =
            "내포농기계_전체백업_" +
            new Date().toISOString().slice(0, 10) +
            ".csv"),
          s.click(),
          URL.revokeObjectURL(o));
      } else
        I(
          "백업 데이터 없음",
          "스토리지에 저장된 전체 거래내역 데이터가 존재하지 않습니다.",
        );
    }),
    document.getElementById("btn-list-print").addEventListener("click", () => {
      const e = Array.from(document.querySelectorAll(".chk-row:checked")).map(
        (t) => t.getAttribute("data-id"),
      );
      if (0 === e.length)
        return void I("선택 없음", "인쇄할 항목을 먼저 선택해주세요.");
      const n = e.map((e) => t.find((t) => t.id === e)).filter(Boolean);
      if (0 === n.length) return;
      function a(t) {
        const e = document.createElement("div");
        e.innerHTML = N(t);
        const n = e.querySelector(".tfs");
        return n
          ? `<div class="excel-frame" style="padding:0;background:#fff;">${n.outerHTML}</div>`
          : "";
      }
      let o = "";
      for (let t = 0; t < n.length; t += 2) {
        o +=
          `<div class="lp-page${t + 2 >= n.length ? " lp-last" : ""}"><div class="lp-slot">${a(n[t])}</div>` +
          (n[t + 1]
            ? `<div class="lp-sep"></div><div class="lp-slot">${a(n[t + 1])}</div>`
            : "") +
          "</div>";
      }
      ((document.getElementById("print-target-area").innerHTML = o),
        document.getElementById("print-overlay").classList.add("show"),
        setTimeout(() => window.print(), 200));
    }),
    document
      .getElementById("btn-tools-toggle")
      .addEventListener("click", (t) => {
        t.stopPropagation();
        const e = document.getElementById("tools-dropdown");
        e.style.display = "none" === e.style.display ? "block" : "none";
      }),
    document.addEventListener("click", () => {
      const t = document.getElementById("tools-dropdown");
      t && (t.style.display = "none");
    }),
    document
      .getElementById("btn-cloud-backup")
      .addEventListener("click", async () => {
        try {
          const t = await w("/api/backup"),
            e = new Blob([JSON.stringify(t, null, 2)], {
              type: "application/json;charset=utf-8;",
            }),
            n = URL.createObjectURL(e),
            a = document.createElement("a");
          ((a.href = n),
            (a.download =
              "내포농기계_서버백업_" +
              new Date().toISOString().slice(0, 10) +
              ".json"),
            a.click(),
            URL.revokeObjectURL(n),
            M(`백업 파일(${t.count}건)이 다운로드되었습니다.`, "ok"));
        } catch (t) {
          I(
            "백업 실패",
            t.message || "백업 파일을 가져오는 중 오류가 발생했습니다.",
          );
        }
      }),
    document
      .getElementById("btn-cloud-restore")
      .addEventListener("click", () => {
        document.getElementById("restore-file-input").click();
      }),
    document
      .getElementById("restore-file-input")
      .addEventListener("change", async (t) => {
        const e = t.target.files[0];
        if (((t.target.value = ""), !e)) return;
        let n;
        try {
          const t = await e.text();
          n = JSON.parse(t);
        } catch (t) {
          return void I(
            "파일 오류",
            "선택하신 파일이 올바른 백업 JSON 파일이 아닙니다.",
          );
        }
        const a = n.records || n;
        Array.isArray(a)
          ? S(
              "복원 방식 선택",
              `이 파일에는 ${a.length}건의 거래내역이 있습니다.\n\n확인을 누르면 기존 서버 데이터와 병합(merge)됩니다 (같은 ID는 덞어쓰기).\n서버 데이터를 전부 지우고 이 파일로만 교체하려면 관리자에게 문의하세요.`,
              async () => {
                try {
                  const t = await w("/api/restore", {
                    method: "POST",
                    body: JSON.stringify({ records: a, mode: "merge" }),
                  });
                  (await k(),
                    C(),
                    I(
                      "복원 완료",
                      `${t.restored}건을 병합했습니다. (전체 ${t.total}건)`,
                    ));
                } catch (t) {
                  I("복원 실패", t.message || "복원 중 오류가 발생했습니다.");
                }
              },
              () => {},
            )
          : I(
              "파일 오류",
              "백업 파일 형식이 올바르지 않습니다 (records 배열이 없습니다).",
            );
      }),
    document.getElementById("hdr-logout").addEventListener("click", () => {
      S(
        "로그아웃 확인",
        "보안 세션을 종료하고 안전하게 로그아웃 하시겠습니까?",
        () => {
          (sessionStorage.clear(), location.reload());
        },
        () => {},
      );
    }),
    document
      .getElementById("btn-excel-import")
      .addEventListener("click", () => {
        document.getElementById("excel-import-input").click();
      }),
    document
      .getElementById("excel-import-input")
      .addEventListener("change", async (t) => {
        const e = t.target.files[0];
        if (((t.target.value = ""), !e)) return;
        const n = new FileReader();
        ((n.onload = async (t) => {
          try {
            const e = new Uint8Array(t.target.result),
              n = XLSX.read(e, { type: "array" }),
              a = n.Sheets[n.SheetNames[0]],
              o = XLSX.utils.sheet_to_json(a, { header: 1, defval: "" }),
              s = o.length,
              l = o
                .slice(0, 5)
                .map(
                  (t, e) =>
                    `[${e}] ` + t.filter((t) => String(t).trim()).join(" | "),
                )
                .join("\n"),
              i = (function (t) {
                const e = [];
                let n = 0;
                for (; n < t.length; ) {
                  const a = t[n].map((t) => String(t || "")).join("");
                  if (a.includes("거래명세서") || a.includes("별지")) {
                    const a = et(t, n);
                    (a && e.push(a), (n += 15));
                  } else n++;
                }
                return e;
              })(o);
            if (0 === i.length)
              return void I(
                "파싱 실패",
                `거래명세서 양식을 인식하지 못했습니다.\n\n파일 정보: ${s}행, 시트: ${n.SheetNames[0]}\n\n첫 5행 내용:\n${l}\n\n별지 제11호 서식 엑셀 파일인지 확인해주세요. "거래명세서" 또는 "별지" 텍스트가 포함되어야 합니다.`,
              );
            const c = i
              .map(
                (t, e) =>
                  `${e + 1}. ${t.date} | ${"-" !== t.company ? t.company : ""} ${t.name} | ${t.items.length}품목 | ${(t.amount || 0).toLocaleString()}원`,
              )
              .join("\n");
            S(
              `${i.length}건 인식됨 — 가져오기`,
              `다음 거래내역을 서버에 병합 저장합니다.\n기존 데이터는 유지됩니다.\n\n${c}`,
              async () => {
                try {
                  const t = await w("/api/restore", {
                    method: "POST",
                    body: JSON.stringify({ records: i, mode: "merge" }),
                  });
                  (await k(),
                    C(),
                    I(
                      "가져오기 완료",
                      `${t.restored}건이 저장되었습니다. (전체 ${t.total}건)`,
                    ));
                } catch (t) {
                  I(
                    "저장 실패",
                    t.message || "서버 저장 중 오류가 발생했습니다.",
                  );
                }
              },
              () => {},
            );
          } catch (t) {
            I(
              "파일 오류",
              "엑셀 파일을 읽는 중 오류가 발생했습니다: " + t.message,
            );
          }
        }),
          n.readAsArrayBuffer(e));
      }),
    document.getElementById("hdr-pwchg").addEventListener("click", () => {
      I(
        "비밀번호 변경 안내",
        "비밀번호는 이제 서버에서 관리됩니다. 변경이 필요하면 관리자에게 새 비밀번호를 알려주세요 — 서버 설정(PASSWORD_HASH)을 갱신해드립니다.",
      );
    }),
    document
      .getElementById("btn-print-submit")
      .addEventListener("click", () => {
        if (e) {
          try {
            w("/api/print-log", {
              method: "POST",
              body: JSON.stringify({
                recordId: e.id,
                recordNote: e.note,
                recordDate: e.date,
              }),
            });
          } catch (_) {}
        }
        window.print();
      }),
    document.getElementById("btn-print-excel").addEventListener("click", () => {
      e && U([e]);
    }),
    document
      .getElementById("btn-download-live-excel")
      .addEventListener("click", () => {
        e && U([e]);
      }),
    document
      .getElementById("btn-print-live-excel")
      .addEventListener("click", () => {
        e && X(e);
      }),
    document.getElementById("btn-print-close").addEventListener("click", F),
    document.getElementById("btn-pwd-cancel").addEventListener("click", F),
    document
      .getElementById("btn-pwd-submit")
      .addEventListener("click", async function () {
        (F(),
          I(
            "안내",
            "비밀번호는 이제 서버에서 관리됩니다. 변경이 필요하면 관리자에게 새 비밀번호를 알려주세요 — 서버 설정(PASSWORD_HASH)을 갱신해드립니다.",
          ));
      }),
    document.getElementById("f-isoil").addEventListener("change", function (t) {
      if (t.target.checked && "일반" === o)
        return (
          (t.target.checked = !1),
          void I(
            "선택 불가",
            "급유기 분할 옵션은 [계통출하] 또는 [자체조달] 분류에서만 결합 적용 가능합니다.\n먼저 거래 대분류를 변경해주세요.",
          )
        );
      var e = document.getElementById("oil-subs");
      t.target.checked
        ? (e.style.display = "block")
        : (e.style.display = "none");
    }),
    document.querySelectorAll("#cat-pills .pill").forEach((t) => {
      t.addEventListener("click", () => z(t.getAttribute("data-cat")));
    }),
    document.querySelectorAll("#supplier-pills .pill").forEach((t) => {
      t.addEventListener("click", () => j(t.getAttribute("data-supplier")));
    }),
    document.querySelectorAll("#oil-pills .pill").forEach((t) => {
      t.addEventListener("click", () => {
        return (
          (e = t.getAttribute("data-oil")),
          (l = e),
          void document.querySelectorAll("#oil-pills .pill").forEach((t) => {
            t.getAttribute("data-oil") === e
              ? t.classList.add("g")
              : t.classList.remove("g");
          })
        );
        var e;
      });
    }),
    document.querySelectorAll("#gen-pills .pill").forEach((t) => {
      t.addEventListener("click", () => {
        ((s = t.getAttribute("data-gen")),
          document.querySelectorAll("#gen-pills .pill").forEach((t) => {
            t.getAttribute("data-gen") === s
              ? t.classList.add("g")
              : t.classList.remove("g");
          }));
      });
    }),
    document.querySelectorAll("#kyetong-pills .pill").forEach((t) => {
      t.addEventListener("click", () => {
        ((i = t.getAttribute("data-kt")),
          document
            .querySelectorAll("#kyetong-pills .pill")
            .forEach((t) =>
              t.classList.toggle("g", t.getAttribute("data-kt") === i),
            ));
      });
    }),
    document.querySelectorAll("#jache-pills .pill").forEach((t) => {
      t.addEventListener("click", () => {
        ((c = t.getAttribute("data-jc")),
          document
            .querySelectorAll("#jache-pills .pill")
            .forEach((t) =>
              t.classList.toggle("g", t.getAttribute("data-jc") === c),
            ));
      });
    }),
    document.querySelectorAll("#payment-pills .pill").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.getAttribute("data-pay");
        d === e
          ? ((d = ""), t.classList.remove("g"))
          : ((d = e),
            document
              .querySelectorAll("#payment-pills .pill")
              .forEach((t) =>
                t.classList.toggle("g", t.getAttribute("data-pay") === e),
              ));
      });
    }));
  let nt = [],
    at = [],
    ot = [],
    st = [];
  async function lt() {
    try {
      ot = await w("/api/groups");
    } catch (t) {
      ot = [];
    }
    (it(), ct());
  }
  function it() {
    const t = document.getElementById("group-list");
    t &&
      (0 !== ot.length
        ? ((t.innerHTML = ot
            .map((t) => {
              const e = t.partIds
                .map((t) => {
                  const e = nt.find((e) => e.id === t);
                  return e ? n(e.name) : "";
                })
                .filter(Boolean)
                .join(", ");
              return `\n          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;min-width:200px;max-width:320px;">\n            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${n(t.name)}</div>\n            <div style="font-size:11px;color:#64748b;margin-bottom:8px;">${e || "품목 미지정"}</div>\n            <div style="display:flex;gap:6px;">\n              <button class="ibtn btn-group-edit" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-pen"></i> 수정</button>\n              <button class="ibtn d btn-group-delete" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n            </div>\n          </div>`;
            })
            .join("")),
          document.querySelectorAll(".btn-group-edit").forEach((t) => {
            t.addEventListener("click", async () => {
              const e = t.getAttribute("data-id"),
                n = ot.find((t) => t.id === e);
              if (!n) return;
              const a = prompt("그룹명:", n.name);
              if (null === a) return;
              nt.map(
                (t) => `${n.partIds.includes(t.id) ? "✓" : "○"} ${t.name}`,
              ).join("\n");
              const o = prompt(
                `포함할 부품 번호를 쉼표로 입력 (현재 포함:\n${n.partIds
                  .map((t) => {
                    const e = nt.find((e) => e.id === t);
                    return e ? e.name : "";
                  })
                  .filter(Boolean)
                  .join(
                    ", ",
                  )})\n\n부품 목록:\n${nt.map((t, e) => `${e + 1}. ${t.name}`).join("\n")}\n\n번호 입력:`,
                nt
                  .filter((t, e) => n.partIds.includes(t.id))
                  .map(
                    (t, e) =>
                      nt.findIndex((e) => e.id === n.partIds[nt.indexOf(t)]) +
                      1,
                  )
                  .join(","),
              );
              if (null === o) return;
              const s = o
                .split(",")
                .map((t) => parseInt(t.trim(), 10) - 1)
                .filter((t) => t >= 0 && t < nt.length)
                .map((t) => nt[t].id);
              try {
                (await w(`/api/groups/${encodeURIComponent(e)}`, {
                  method: "PUT",
                  body: JSON.stringify({ name: a.trim(), partIds: s }),
                }),
                  M("그룹이 수정되었습니다.", "ok"),
                  await lt());
              } catch (t) {
                I("수정 실패", t.message);
              }
            });
          }),
          document.querySelectorAll(".btn-group-delete").forEach((t) => {
            t.addEventListener("click", () => {
              const e = t.getAttribute("data-id");
              S(
                "그룹 삭제",
                `"${ot.find((t) => t.id === e).name}" 그룹을 삭제하시겠습니까?`,
                async () => {
                  try {
                    (await w(`/api/groups/${encodeURIComponent(e)}`, {
                      method: "DELETE",
                    }),
                      M("그룹이 삭제되었습니다.", "ok"),
                      await lt());
                  } catch (t) {
                    I("삭제 실패", t.message);
                  }
                },
                () => {},
              );
            });
          }))
        : (t.innerHTML =
            '<span style="color:#94a3b8;font-size:12px;">아직 생성된 그룹이 없습니다.</span>'));
  }
  function ct() {
    const t = document.getElementById("group-apply-select");
    if (!t) return;
    const e = t.value;
    ((t.innerHTML =
      '<option value="">그룹 선택하여 품목 일괄추가...</option>' +
      ot
        .map((t) => `<option value="${n(t.id)}">${n(t.name)}</option>`)
        .join("")),
      e && (t.value = e));
  }
  function dt(t) {
    return t.company && "-" !== t.company ? t.company : t.name || "-";
  }
  async function rt() {
    try {
      st = await w("/api/customers");
    } catch (t) {
      st = [];
    }
    (pt(),
      mt(),
      (function () {
        const t = document.getElementById("customer-datalist");
        if (!t) return;
        t.innerHTML = st
          .map((t) => {
            const e = [t.company, t.name].filter(Boolean).join(" / ");
            return `<option value="${n(t.company || t.name)}" data-name="${n(t.name)}" data-company="${n(t.company)}" data-region="${n(t.region)}">${n(e)}</option>`;
          })
          .join("");
      })());
  }
  function pt() {
    const e = document.getElementById("customer-body");
    if (!e) return;
    const a = new Map();
    (t.forEach((t) => {
      const e = dt(t);
      a.has(e) || a.set(e, { total: 0, ar: 0 });
      const n = a.get(e);
      ((n.total += (t.amount || 0) + (t.tax || 0)),
        "외상" !== t.payMethod ||
          t.collected ||
          (n.ar += (t.amount || 0) + (t.tax || 0)));
    }),
      0 !== st.length
        ? ((e.innerHTML = st
            .map((t) => {
              const e = t.company || t.name,
                o = a.get(e) || { total: 0, ar: 0 },
                s = o.ar > 0;
              return `<tr>\n          <td><strong>${n(t.company || "-")}</strong></td>\n          <td>${n(t.name || "-")}</td>\n          <td>${n(t.region || "-")}</td>\n          <td class="tr">${o.total.toLocaleString()}원</td>\n          <td class="tr" style="${s ? "color:#dc2626;font-weight:700;" : ""}">${s ? o.ar.toLocaleString() + "원" : "-"}</td>\n          <td>${n(t.phone || "-")}</td>\n          <td>\n            <div class="ibtns">\n              <button class="ibtn btn-cust-edit" data-id="${n(t.id)}" style="color:#0ea5e9;"><i class="fa-solid fa-pen"></i> 수정</button>\n              <button class="ibtn d btn-cust-delete" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n            </div>\n          </td>\n        </tr>`;
            })
            .join("")),
          document.querySelectorAll(".btn-cust-edit").forEach((t) => {
            t.addEventListener("click", () => {
              const e = st.find((e) => e.id === t.getAttribute("data-id"));
              if (!e) return;
              ((document.getElementById("cust-company").value = e.company),
                (document.getElementById("cust-name").value = e.name),
                (document.getElementById("cust-region").value = e.region),
                (document.getElementById("cust-phone").value = e.phone),
                (document.getElementById("cust-memo").value = e.memo));
              const n = document.getElementById("btn-add-customer");
              (n.setAttribute("data-edit-id", e.id),
                (n.innerHTML =
                  '<i class="fa-solid fa-pen-to-square"></i> 거래처 수정 저장'),
                (n.style.background =
                  "linear-gradient(135deg,#0369a1,#075985)"));
            });
          }),
          document.querySelectorAll(".btn-cust-delete").forEach((t) => {
            t.addEventListener("click", () => {
              const e = st.find((e) => e.id === t.getAttribute("data-id"));
              S(
                "거래처 삭제",
                `"${e.company || e.name}" 거래처를 삭제하시겠습니까?\n거래 기록은 유지됩니다.`,
                async () => {
                  (await w(`/api/customers/${e.id}`, { method: "DELETE" }),
                    await rt(),
                    M("거래처가 삭제되었습니다.", "ok"));
                },
                () => {},
              );
            });
          }))
        : (e.innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">등록된 거래처가 없습니다.</td></tr>'));
  }
  function mt() {
    const e = document.getElementById("ar-list");
    if (!e) return;
    const a = new Map();
    t.forEach((t) => {
      if ("외상" !== t.payMethod || t.collected) return;
      const e = dt(t);
      a.set(e, (a.get(e) || 0) + (t.amount || 0) + (t.tax || 0));
    });
    const o = [...a.values()].reduce((t, e) => t + e, 0),
      s = document.getElementById("ar-total-badge");
    s && (s.textContent = `합계 ${o.toLocaleString()}원 · ${a.size}개 거래처`);
    const l = document.getElementById("dash-ar-total"),
      i = document.getElementById("dash-ar-count");
    if (
      (l && (l.textContent = o.toLocaleString() + "원"),
      i && (i.textContent = a.size + "개 거래처 미수"),
      0 === a.size)
    )
      return void (e.innerHTML =
        '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px;">미수금이 없습니다. 🎉</div>');
    const c = [...a.entries()].sort((t, e) => e[1] - t[1]);
    ((e.innerHTML = c
      .map(([e, a]) => {
        const o = t
          .filter((t) => "외상" === t.payMethod && !t.collected && dt(t) === e)
          .sort((t, e) => (t.date > e.date ? 1 : -1));
        return `<div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:12px;padding:14px 16px;">\n          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">\n            <div>\n              <span style="font-size:14px;font-weight:700;color:#991b1b;">${n(e)}</span>\n              <span style="font-size:11px;color:#64748b;margin-left:8px;">${o.length}건</span>\n            </div>\n            <span style="font-size:16px;font-weight:800;color:#dc2626;">미수금 ${a.toLocaleString()}원</span>\n          </div>\n          <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;">\n            ${o.map((t) => `\n              <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px dashed #fca5a5;border-radius:8px;padding:6px 10px;font-size:12px;">\n                <span style="color:#64748b;">${n(t.date)} &nbsp;${n(t.note || "")}</span>\n                <div style="display:flex;align-items:center;gap:8px;">\n                  <span style="font-weight:600;color:#991b1b;">${((t.amount || 0) + (t.tax || 0)).toLocaleString()}원</span>\n                  <button class="ibtn btn-collect" data-id="${n(t.id)}" style="color:#047857;background:#f0fdf4;border:1px solid #a7f3d0;"><i class="fa-solid fa-check"></i> 수금완료</button>\n                </div>\n              </div>`).join("")}\n          </div>\n        </div>`;
      })
      .join("")),
      document.querySelectorAll(".btn-collect").forEach((e) => {
        e.addEventListener("click", async () => {
          const n = e.getAttribute("data-id");
          try {
            await w(`/api/records/${n}/collect`, { method: "PATCH" });
            const e = t.find((t) => t.id === n);
            (e && (e.collected = !0),
              mt(),
              pt(),
              Q(),
              M("수금 완료 처리되었습니다.", "ok"));
          } catch (t) {
            I("처리 실패", t.message);
          }
        });
      }));
  }
  async function ut() {
    try {
      nt = await w("/api/parts");
    } catch (t) {
      ((nt = []),
        I(
          "불러오기 실패",
          t.message || "부품 목록을 불러오는 중 오류가 발생했습니다.",
        ));
    }
    (!(function () {
      const t = document.getElementById("parts-body");
      if (0 === nt.length)
        return void (t.innerHTML =
          '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px;">등록된 부품이 없습니다.</td></tr>');
      const e = new Set(ot.flatMap((t) => t.partIds));
      let a = "";
      function o(t, e) {
        const a = t.stock <= t.minStock,
          o = a
            ? `<span class="badge-low">부족 (최소 ${t.minStock})</span>`
            : '<span class="badge-ok">정상</span>',
          s = e ? "padding-left:22px;" : "";
        return `\n          <tr>\n            <td style="text-align:center;"><input type="checkbox" class="chk-part" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px; margin:0 6px;"/></td>\n            <td style="${s}"><strong>${e ? "∟ " : ""}${n(t.name)}</strong></td>\n            <td>${n(t.spec)}</td>\n            <td class="tr">${t.unitPrice.toLocaleString()}원</td>\n            <td class="tr" style="font-weight:700;${a ? "color:#dc2626;" : ""}">${t.stock.toLocaleString()}</td>\n            <td class="tr">${t.minStock.toLocaleString()}</td>\n            <td>${o}</td>\n            <td>\n              <div class="ibtns">\n                <button class="ibtn btn-stock-in" data-id="${n(t.id)}" style="color:#0284c7;"><i class="fa-solid fa-truck-ramp-box"></i> 입고</button>\n                <button class="ibtn btn-stock-adjust" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-sliders"></i> 보정</button>\n                <button class="ibtn btn-part-edit" data-id="${n(t.id)}" style="color:#0ea5e9;"><i class="fa-solid fa-pen"></i> 수정</button>\n                <button class="ibtn d btn-part-delete" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n              </div>\n            </td>\n          </tr>`;
      }
      ot.forEach((t) => {
        const e = t.partIds
          .map((t) => nt.find((e) => e.id === t))
          .filter(Boolean);
        if (0 === e.length) return;
        const gid = "g_" + t.id.replace(/-/g, "");
        const collapsed =
          window.__groupCollapsed && window.__groupCollapsed[gid];
        a += `<tr class="group-header-row" data-gid="${gid}" style="background:#f0fdf4;cursor:pointer;" title="클릭하여 접기/펼치기"><td colspan="8" style="padding:8px 14px;font-weight:700;font-size:12.5px;color:#065f46;border-top:2px solid #a7f3d0;"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>${n(t.name)} <i class="fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-down"}" style="float:right;opacity:0.5;margin-top:2px;"></i></td></tr>`;
        if (!collapsed) {
          e.forEach((t) => {
            a += o(t, !0);
          });
        }
      });
      const s = nt.filter((t) => !e.has(t.id));
      s.length > 0 &&
        (ot.length > 0 &&
          (a +=
            '<tr style="background:#f8fafc;"><td colspan="8" style="padding:8px 14px;font-weight:700;font-size:12.5px;color:#64748b;border-top:2px solid #e2e8f0;"><i class="fa-solid fa-box" style="margin-right:6px;"></i>미분류 부품</td></tr>'),
        s.forEach((t) => {
          a += o(t, !1);
        }));
      ((t.innerHTML = a),
        document.querySelectorAll(".btn-stock-in").forEach((t) => {
          t.addEventListener("click", async () => {
            const e = t.getAttribute("data-id"),
              n = nt.find((t) => t.id === e),
              a = prompt(`[${n.name}] 입고할 수량을 입력하세요:`, "1");
            if (null === a) return;
            const o = parseInt(a, 10);
            if (!o || o <= 0)
              return void I("입력 오류", "1 이상의 숫자를 입력해주세요.");
            const s = new Date().toISOString().slice(0, 10),
              l = prompt("입고 날짜 (YYYY-MM-DD):", s);
            if (null === l) return;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(l))
              return void I(
                "날짜 형식 오류",
                "YYYY-MM-DD 형식으로 입력해주세요 (예: 2026-06-21).",
              );
            const i =
              prompt("비고 (선택, 예: 거래처명, 입고사유 등):", "") || "";
            try {
              (await w(`/api/parts/${encodeURIComponent(e)}/stock-in`, {
                method: "POST",
                body: JSON.stringify({
                  qty: o,
                  date: l,
                  note: i || "수동 입고 등록",
                }),
              }),
                M(`${n.name} 입고 ${o}개 처리되었습니다.`, "ok"),
                await ut(),
                await gt());
            } catch (t) {
              I("입고 실패", t.message || "입고 처리 중 오류가 발생했습니다.");
            }
          });
        }),
        document.querySelectorAll(".btn-stock-adjust").forEach((t) => {
          t.addEventListener("click", async () => {
            const e = t.getAttribute("data-id"),
              n = nt.find((t) => t.id === e),
              a = prompt(
                `[${n.name}] 실제 재고 수량을 입력하세요 (현재: ${n.stock}):`,
                String(n.stock),
              );
            if (null === a) return;
            const o = parseInt(a, 10);
            if (isNaN(o) || o < 0)
              I("입력 오류", "0 이상의 숫자를 입력해주세요.");
            else
              try {
                (await w(`/api/parts/${encodeURIComponent(e)}/adjust`, {
                  method: "POST",
                  body: JSON.stringify({ newStock: o, note: "재고 실사 보정" }),
                }),
                  M(`${n.name} 재고가 ${o}개로 보정되었습니다.`, "ok"),
                  await ut(),
                  await gt());
              } catch (t) {
                I(
                  "보정 실패",
                  t.message || "재고 보정 중 오류가 발생했습니다.",
                );
              }
          });
        }),
        document.querySelectorAll(".btn-part-edit").forEach((t) => {
          t.addEventListener("click", async () => {
            const e = t.getAttribute("data-id"),
              n = nt.find((t) => t.id === e),
              a = prompt("품목명:", n.name);
            if (null === a) return;
            const o = prompt("규격:", n.spec || "");
            if (null === o) return;
            const s = prompt("기본 단가:", String(n.unitPrice));
            if (null === s) return;
            const l = prompt("최소 재고:", String(n.minStock));
            if (null !== l)
              try {
                (await w(`/api/parts/${encodeURIComponent(e)}`, {
                  method: "PUT",
                  body: JSON.stringify({
                    name: a.trim(),
                    spec: o.trim(),
                    unitPrice: parseFloat(s) || 0,
                    minStock: parseInt(l, 10) || 0,
                  }),
                }),
                  M("부품 정보가 수정되었습니다.", "ok"),
                  await ut());
              } catch (t) {
                I("수정 실패", t.message || "수정 중 오류가 발생했습니다.");
              }
          });
        }),
        document.querySelectorAll(".btn-part-delete").forEach((t) => {
          t.addEventListener("click", () => {
            const e = t.getAttribute("data-id");
            S(
              "부품 삭제",
              `[${nt.find((t) => t.id === e).name}] 품목을 삭제하시겠습니까? (입출고 기록은 유지되지만 향후 거래명세서와의 자동 연동은 끝나요)`,
              async () => {
                try {
                  (await w(`/api/parts/${encodeURIComponent(e)}`, {
                    method: "DELETE",
                  }),
                    M("부품이 삭제되었습니다.", "ok"),
                    await ut());
                } catch (t) {
                  I("삭제 실패", t.message || "삭제 중 오류가 발생했습니다.");
                }
              },
              () => {},
            );
          });
        }));
    })(),
      (function () {
        const t = document.getElementById("parts-datalist");
        if (!t) return;
        t.innerHTML = nt
          .map((t) => `<option value="${n(t.name)}"></option>`)
          .join("");
      })());
    (function () {
      if (!window.__groupCollapsed) window.__groupCollapsed = {};
      document.querySelectorAll(".group-header-row").forEach((row) => {
        row.addEventListener("click", () => {
          const gid = row.getAttribute("data-gid");
          window.__groupCollapsed[gid] = !window.__groupCollapsed[gid];
          ut();
        });
      });
    })();
  }
  let invLogPage = 1,
    invLogPerPage = 30;
  async function gt() {
    try {
      at = await w("/api/inventory-log");
    } catch (t) {
      at = [];
    }
    yt();
  }
  function yt() {
    const t = document.getElementById("inv-log-body"),
      e = document.getElementById("invlog-filter-month")
        ? document.getElementById("invlog-filter-month").value
        : "",
      a = document.getElementById("invlog-filter-part")
        ? document.getElementById("invlog-filter-part").value
        : "",
      o = document.getElementById("invlog-filter-type")
        ? document.getElementById("invlog-filter-type").value
        : "",
      s =
        !!document.getElementById("invlog-show-subtotal") &&
        document.getElementById("invlog-show-subtotal").checked;
    let l = at.filter(
      (t) =>
        !(e && !(t.date || "").startsWith(e)) &&
        (!a || t.partName === a) &&
        (!o || t.type === o),
    );
    const i = [...new Set(at.map((t) => (t.date || "").slice(0, 7)))]
        .sort()
        .reverse(),
      c = [...new Set(at.map((t) => t.partName))].sort(),
      d = document.getElementById("invlog-filter-month"),
      r = document.getElementById("invlog-filter-part");
    if (d) {
      const t = d.value;
      d.innerHTML =
        '<option value="">전체 기간</option>' +
        i
          .map(
            (e) =>
              `<option value="${e}"${e === t ? " selected" : ""}>${e}</option>`,
          )
          .join("");
    }
    if (r) {
      const t = r.value;
      r.innerHTML =
        '<option value="">전체 품목</option>' +
        c
          .map(
            (e) =>
              `<option value="${n(e)}"${e === t ? " selected" : ""}>${n(e)}</option>`,
          )
          .join("");
    }
    const p = document.getElementById("invlog-summary-bar");
    if (l.length > 0) {
      const t = l.filter((t) => "in" === t.type).reduce((t, e) => t + e.qty, 0),
        e = l.filter((t) => "out" === t.type).reduce((t, e) => t + e.qty, 0),
        n = l.filter((t) => "adjust" === t.type).reduce((t, e) => t + e.qty, 0);
      p &&
        ((p.style.display = "block"),
        (p.innerHTML = `📦 조회 결과 ${l.length}건 &nbsp;|&nbsp; 입고 합계: <strong>+${t}</strong> &nbsp;|&nbsp; 출고 합계: <strong>-${e}</strong>${0 !== n ? " &nbsp;|&nbsp; 보정: " + n : ""}`));
    } else p && (p.style.display = "none");
    if (0 === l.length)
      return void (t.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px;">조건에 맞는 기록이 없습니다.</td></tr>');
    const m = {
      in: '<span class="badge-io-in">입고</span>',
      out: '<span class="badge-io-out">출고</span>',
      adjust: '<span class="badge-io-adjust">보정</span>',
    };
    let u = "";
    if (s) {
      const t = new Map();
      (l.forEach((e) => {
        (t.has(e.partName) || t.set(e.partName, []), t.get(e.partName).push(e));
      }),
        t.forEach((t, e) => {
          const a = t
              .filter((t) => "in" === t.type)
              .reduce((t, e) => t + e.qty, 0),
            o = t
              .filter((t) => "out" === t.type)
              .reduce((t, e) => t + e.qty, 0);
          ((u += `<tr style="background:#f0fdf4;"><td colspan="8" style="padding:6px 14px;font-weight:700;font-size:12px;color:#065f46;border-bottom:2px solid #a7f3d0;">\n            <i class="fa-solid fa-box"></i> ${n(e)} &nbsp; <span style="font-weight:500;font-size:11px;">입고 +${a} / 출고 -${o}</span>\n          </td></tr>`),
            t.forEach((t) => {
              u += ft(t, m);
            }));
        }));
    } else {
      const startIdx = (invLogPage - 1) * invLogPerPage;
      l.slice(startIdx, startIdx + invLogPerPage).forEach((t) => {
        u += ft(t, m);
      });
    }
    t.innerHTML = u;
    (function () {
      const totalPages = Math.ceil(l.length / invLogPerPage);
      const wrap = document.getElementById("invlog-pagination");
      if (!wrap) return;
      if (totalPages <= 1) {
        wrap.innerHTML = "";
        return;
      }
      let pg = "";
      if (invLogPage > 1)
        pg += `<button class="page-num-btn" id="ilp-prev">◀</button>`;
      for (
        let i = Math.max(1, invLogPage - 2);
        i <= Math.min(totalPages, invLogPage + 2);
        i++
      ) {
        pg += `<button class="page-num-btn${i === invLogPage ? " active" : ""}" data-p="${i}">${i}</button>`;
      }
      if (invLogPage < totalPages)
        pg += `<button class="page-num-btn" id="ilp-next">▶</button>`;
      pg += `<span style="font-size:11px;color:#64748b;margin-left:6px;">${l.length}건 / ${totalPages}페이지</span>`;
      wrap.innerHTML = pg;
      wrap.querySelectorAll("[data-p]").forEach((b) => {
        b.addEventListener("click", () => {
          invLogPage = parseInt(b.getAttribute("data-p"));
          yt();
        });
      });
      const prev = wrap.querySelector("#ilp-prev");
      if (prev)
        prev.addEventListener("click", () => {
          invLogPage--;
          yt();
        });
      const next = wrap.querySelector("#ilp-next");
      if (next)
        next.addEventListener("click", () => {
          invLogPage++;
          yt();
        });
    })();
  }
  function ft(t, e) {
    const a = "out" === t.type ? "-" : t.qty > 0 ? "+" : "",
      o =
        void 0 === t.balanceAfter || null === t.balanceAfter
          ? "-"
          : t.balanceAfter.toLocaleString();
    return `<tr>\n          <td style="text-align:center;"><input type="checkbox" class="chk-invlog" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px; margin:0 6px;"/></td>\n          <td>${n(t.date)}</td>\n          <td><strong>${n(t.partName)}</strong></td>\n          <td>${e[t.type] || n(t.type)}</td>\n          <td class="tr">${a}${t.qty.toLocaleString()}</td>\n          <td class="tr">${(t.unitPrice || 0).toLocaleString()}원</td>\n          <td class="tr">${o}</td>\n          <td style="font-size:11.5px;color:#64748b;padding-left:20px;">${n(t.note)}</td>\n        </tr>`;
  }
  (document
    .getElementById("btn-add-part")
    .addEventListener("click", async () => {
      const t = document.getElementById("part-name").value.trim(),
        e = document.getElementById("part-spec").value.trim(),
        n = parseFloat(document.getElementById("part-price").value) || 0,
        a = parseInt(document.getElementById("part-stock").value, 10) || 0,
        o = parseInt(document.getElementById("part-minstock").value, 10) || 0,
        s = document.getElementById("e-part");
      if (((s.textContent = ""), t))
        try {
          (await w("/api/parts", {
            method: "POST",
            body: JSON.stringify({
              name: t,
              spec: e,
              unitPrice: n,
              stock: a,
              minStock: o,
            }),
          }),
            (document.getElementById("part-name").value = ""),
            (document.getElementById("part-spec").value = ""),
            (document.getElementById("part-price").value = ""),
            (document.getElementById("part-stock").value = ""),
            (document.getElementById("part-minstock").value = ""),
            M(`[${t}] 부품이 등록되었습니다.`, "ok"),
            await ut(),
            await gt(),
            it());
        } catch (t) {
          s.textContent = t.message || "등록 중 오류가 발생했습니다.";
        }
      else s.textContent = "품목명을 입력해주세요.";
    }),
    document
      .getElementById("btn-parts-txt-import")
      .addEventListener("click", () => {
        document.getElementById("parts-txt-input").click();
      }),
    document
      .getElementById("parts-txt-input")
      .addEventListener("change", async (t) => {
        const e = t.target.files[0];
        if (((t.target.value = ""), !e)) return;
        const n = (await e.text())
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter((t) => t && !t.startsWith("#"));
        if (0 === n.length) return void I("빈 파일", "내용이 없습니다.");
        const a = [],
          o = [];
        if (
          (n.forEach((t, e) => {
            const n = t.split("/");
            n.length < 1 || !n[0].trim()
              ? o.push(`${e + 1}번 줄: 품목명이 비어있음`)
              : a.push({
                  name: n[0].trim(),
                  spec: (n[1] || "").trim(),
                  unitPrice: parseInt(n[2], 10) || 0,
                  stock: parseInt(n[3], 10) || 0,
                  minStock: parseInt(n[4], 10) || 0,
                });
          }),
          0 === a.length)
        )
          return void I("파싱 실패", o.join("\n"));
        const s =
          a
            .slice(0, 5)
            .map(
              (t) =>
                `• ${t.name} / ${t.spec || "-"} / ${t.unitPrice.toLocaleString()}원 / 재고:${t.stock}`,
            )
            .join("\n") + (a.length > 5 ? `\n  ... 외 ${a.length - 5}개` : "");
        S(
          `${a.length}개 부품 일괄 등록`,
          `다음 항목들을 등록하시겠습니까?\n\n${s}${o.length > 0 ? "\n\n⚠️ 건너뜀: " + o.join(", ") : ""}`,
          async () => {
            let t = 0,
              e = 0;
            for (const n of a)
              try {
                (await w("/api/parts", {
                  method: "POST",
                  body: JSON.stringify(n),
                }),
                  t++);
              } catch (t) {
                e++;
              }
            (M(
              `${t}개 등록 완료${e > 0 ? `, ${e}개 실패` : ""}`,
              t > 0 ? "ok" : "err",
            ),
              await ut(),
              await gt(),
              it(),
              ct());
          },
          () => {},
        );
      }),
    document
      .getElementById("btn-add-customer")
      .addEventListener("click", async () => {
        const t = document.getElementById("cust-company").value.trim(),
          e = document.getElementById("cust-name").value.trim(),
          n = document.getElementById("cust-region").value.trim(),
          a = document.getElementById("cust-phone").value.trim(),
          o = document.getElementById("cust-memo").value.trim(),
          s = document.getElementById("e-customer"),
          l = document.getElementById("btn-add-customer"),
          i = l.getAttribute("data-edit-id");
        if (t || e) {
          s.textContent = "";
          try {
            (i
              ? (await w(`/api/customers/${i}`, {
                  method: "PUT",
                  body: JSON.stringify({
                    name: e,
                    company: t,
                    region: n,
                    phone: a,
                    memo: o,
                  }),
                }),
                l.removeAttribute("data-edit-id"),
                (l.innerHTML = '<i class="fa-solid fa-plus"></i> 거래처 등록'),
                (l.style.background = ""),
                M("거래처가 수정되었습니다.", "ok"))
              : (await w("/api/customers", {
                  method: "POST",
                  body: JSON.stringify({
                    name: e,
                    company: t,
                    region: n,
                    phone: a,
                    memo: o,
                  }),
                }),
                M("거래처가 등록되었습니다.", "ok")),
              [
                "cust-company",
                "cust-name",
                "cust-region",
                "cust-phone",
                "cust-memo",
              ].forEach((t) => {
                document.getElementById(t).value = "";
              }),
              await rt());
          } catch (t) {
            s.textContent = t.message || "처리 중 오류가 발생했습니다.";
          }
        } else s.textContent = "상호명 또는 성명을 입력해주세요.";
      }),
    document
      .getElementById("f-company")
      .addEventListener("change", function () {
        const t = document.getElementById("customer-datalist"),
          e = t
            ? [...t.querySelectorAll("option")].find(
                (t) => t.value === this.value,
              )
            : null;
        if (!e) return;
        const n = document.getElementById("f-name"),
          a = document.getElementById("f-region");
        (n && e.dataset.name && !n.value && (n.value = e.dataset.name),
          a && e.dataset.region && !a.value && (a.value = e.dataset.region));
      }),
    document
      .getElementById("btn-add-group")
      .addEventListener("click", async () => {
        const t = document.getElementById("group-name").value.trim();
        if (!t) return void I("입력 오류", "그룹명을 입력해주세요.");
        if (0 === nt.length)
          return void I("부품 없음", "먼저 부품을 등록해주세요.");
        const e = nt
            .map((t, e) => `${e + 1}. ${t.name} (${t.spec || "-"})`)
            .join("\n"),
          n = prompt(
            `"${t}" 그룹에 포함할 부품 번호를 쉼표로 입력하세요:\n\n${e}`,
            "",
          );
        if (null === n) return;
        const a = n
          .split(",")
          .map((t) => parseInt(t.trim(), 10) - 1)
          .filter((t) => t >= 0 && t < nt.length);
        if (0 === a.length)
          return void I("선택 없음", "최소 1개 이상의 부품을 선택해주세요.");
        const o = a.map((t) => nt[t].id);
        try {
          (await w("/api/groups", {
            method: "POST",
            body: JSON.stringify({ name: t, partIds: o }),
          }),
            (document.getElementById("group-name").value = ""),
            M(`"${t}" 그룹이 생성되었습니다.`, "ok"),
            await lt());
        } catch (t) {
          I("생성 실패", t.message);
        }
      }),
    document.getElementById("btn-apply-group").addEventListener("click", () => {
      const t = document.getElementById("group-apply-select"),
        e = t.value;
      if (!e) return void I("그룹 미선택", "적용할 그룹을 선택해주세요.");
      const a = ot.find((t) => t.id === e);
      if (!a || 0 === a.partIds.length)
        return void I("빈 그룹", "이 그룹에 등록된 부품이 없습니다.");
      const o = a.partIds
          .map((t) => nt.find((e) => e.id === t))
          .filter(Boolean),
        s = document.createElement("div");
      ((s.style.cssText =
        "position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;"),
        (s.innerHTML = `\n        <div style="background:#fff;border-radius:16px;padding:24px;min-width:320px;max-width:480px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);">\n          <h3 style="font-size:15px;font-weight:700;margin-bottom:4px;color:#065f46;"><i class="fa-solid fa-layer-group"></i> ${n(a.name)}</h3>\n          <p style="font-size:12px;color:#64748b;margin-bottom:14px;">추가할 품목을 선택하세요.</p>\n          <div id="group-modal-parts" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;margin-bottom:16px;">\n            ${o.map((t) => `\n              <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8fafc;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0;">\n                <input type="checkbox" class="group-modal-chk" data-pid="${n(t.id)}" style="accent-color:#047857;width:15px;height:15px;"/>\n                <span><strong>${n(t.name)}</strong> <span style="color:#64748b;font-size:11px;">${n(t.spec || "")}</span></span>\n                <span style="margin-left:auto;font-size:11.5px;color:#047857;">${(t.unitPrice || 0).toLocaleString()}원</span>\n              </label>`).join("")}\n          </div>\n          <div style="display:flex;gap:8px;justify-content:flex-end;">\n            <button id="group-modal-cancel" class="btn btn-o btn-sm">취소</button>\n            <button id="group-modal-ok" class="btn btn-p btn-sm"><i class="fa-solid fa-plus"></i> 선택 품목 추가</button>\n          </div>\n        </div>`),
        document.body.appendChild(s),
        s.querySelector("#group-modal-cancel").addEventListener("click", () => {
          (document.body.removeChild(s), (t.value = ""));
        }),
        s.querySelector("#group-modal-ok").addEventListener("click", () => {
          const e = Array.from(
            s.querySelectorAll(".group-modal-chk:checked"),
          ).map((t) => t.getAttribute("data-pid"));
          0 !== e.length
            ? ((function () {
                const r = document.getElementById("items-builder-root");
                const rows = r.querySelectorAll(".item-row-card");
                if (rows.length === 1) {
                  const row = rows[0];
                  const itemVal = row.querySelector(".p-item").value.trim();
                  if (!itemVal) row.remove();
                }
              })(),
              e.forEach((t) => {
                const e = nt.find((e) => e.id === t);
                if (!e) return;
                $();
                const n = document
                    .getElementById("items-builder-root")
                    .querySelectorAll(".item-row-card"),
                  a = n[n.length - 1];
                ((a.querySelector(".p-item").value = e.name),
                  (a.querySelector(".p-spec").value = e.spec || ""),
                  (a.querySelector(".p-price").value = e.unitPrice || 0),
                  (a.querySelector(".p-qty").value = 1),
                  a
                    .querySelector(".p-price")
                    .dispatchEvent(new Event("input")));
              }),
              document.body.removeChild(s),
              (t.value = ""),
              M(`${e.length}개 품목이 추가되었습니다.`, "ok"))
            : I("선택 없음", "최소 1개 이상의 품목을 선택해주세요.");
        }));
    }),
    document.getElementById("parts-chk-all").addEventListener("change", (t) => {
      document
        .querySelectorAll(".chk-part")
        .forEach((e) => (e.checked = t.target.checked));
    }),
    document
      .getElementById("invlog-chk-all")
      .addEventListener("change", (t) => {
        document
          .querySelectorAll(".chk-invlog")
          .forEach((e) => (e.checked = t.target.checked));
      }),
    ["invlog-filter-month", "invlog-filter-part", "invlog-filter-type"].forEach(
      (t) => {
        document.getElementById(t).addEventListener("change", () => {
          invLogPage = 1;
          yt();
        });
      },
    ),
    document
      .getElementById("invlog-show-subtotal")
      .addEventListener("change", () => yt()),
    document
      .getElementById("btn-records-del-sel")
      .addEventListener("click", () => {
        const e = Array.from(document.querySelectorAll(".chk-row:checked")).map(
          (t) => t.getAttribute("data-id"),
        );
        0 !== e.length
          ? S(
              "선택삭제 확인",
              `선택한 ${e.length}건을 영구 삭제하시겠습니까?`,
              async () => {
                try {
                  (await w("/api/records/bulk-delete", {
                    method: "POST",
                    body: JSON.stringify({ ids: e }),
                  }),
                    (t = t.filter((t) => !e.includes(t.id))),
                    M(`${e.length}건 삭제되었습니다.`, "ok"),
                    C());
                } catch (t) {
                  I("삭제 실패", t.message || "삭제 중 오류가 발생했습니다.");
                }
              },
              () => {},
            )
          : I("선택 없음", "삭제할 항목을 먼저 선택해주세요.");
      }),
    document
      .getElementById("btn-parts-del-sel")
      .addEventListener("click", () => {
        const t = Array.from(
          document.querySelectorAll(".chk-part:checked"),
        ).map((t) => t.getAttribute("data-id"));
        0 !== t.length
          ? S(
              "선택삭제 확인",
              `선택한 부품 ${t.length}건을 영구 삭제하시겠습니까?`,
              async () => {
                try {
                  (await w("/api/parts/bulk-delete", {
                    method: "POST",
                    body: JSON.stringify({ ids: t }),
                  }),
                    M(`${t.length}건 삭제되었습니다.`, "ok"),
                    await ut());
                } catch (t) {
                  I("삭제 실패", t.message || "삭제 중 오류가 발생했습니다.");
                }
              },
              () => {},
            )
          : I("선택 없음", "삭제할 부품을 먼저 선택해주세요.");
      }),
    document
      .getElementById("btn-invlog-del-sel")
      .addEventListener("click", () => {
        const t = Array.from(
          document.querySelectorAll(".chk-invlog:checked"),
        ).map((t) => t.getAttribute("data-id"));
        0 !== t.length
          ? S(
              "선택삭제 확인",
              `선택한 기록 ${t.length}건을 영구 삭제하시겠습니까? (해당 기록으로 변동되었단 재고 수량도 함께 되돌려집니다)`,
              async () => {
                try {
                  (await w("/api/inventory-log/bulk-delete", {
                    method: "POST",
                    body: JSON.stringify({ ids: t }),
                  }),
                    M(`${t.length}건 삭제되고 재고가 복원되었습니다.`, "ok"),
                    await gt(),
                    await ut());
                } catch (t) {
                  I("삭제 실패", t.message || "삭제 중 오류가 발생했습니다.");
                }
              },
              () => {},
            )
          : I("선택 없음", "삭제할 기록을 먼저 선택해주세요.");
      }),
    document.getElementById("btn-parts-excel").addEventListener("click", () => {
      if (0 === nt.length)
        return void I("데이터 없음", "등록된 부품이 없습니다.");
      const t = [["품목명", "규격", "단가", "현재재고", "최소재고", "상태"]];
      nt.forEach((e) => {
        t.push([
          e.name,
          e.spec || "",
          e.unitPrice,
          e.stock,
          e.minStock,
          e.stock <= e.minStock ? "부족" : "정상",
        ]);
      });
      const e = XLSX.utils.aoa_to_sheet(t);
      e["!cols"] = [
        { wch: 16 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 8 },
      ];
      const n = XLSX.utils.book_new();
      (XLSX.utils.book_append_sheet(n, e, "재고현황"),
        XLSX.writeFile(
          n,
          "내포농기계_재고현황_" +
            new Date().toISOString().slice(0, 10) +
            ".xlsx",
        ));
    }),
    document
      .getElementById("btn-invlog-excel")
      .addEventListener("click", () => {
        if (0 === at.length)
          return void I("데이터 없음", "입출고 기록이 없습니다.");
        const t = { in: "입고", out: "출고", adjust: "보정" },
          e = [
            ["날짜", "품목명", "구분", "수량", "단가", "처리후재고", "비고"],
          ];
        at.forEach((n) => {
          const a = "out" === n.type ? -n.qty : n.qty;
          e.push([
            n.date,
            n.partName,
            t[n.type] || n.type,
            a,
            n.unitPrice || 0,
            void 0 !== n.balanceAfter && null !== n.balanceAfter
              ? n.balanceAfter
              : "",
            n.note || "",
          ]);
        });
        const n = XLSX.utils.aoa_to_sheet(e);
        n["!cols"] = [
          { wch: 12 },
          { wch: 16 },
          { wch: 8 },
          { wch: 8 },
          { wch: 10 },
          { wch: 12 },
          { wch: 20 },
        ];
        const a = XLSX.utils.book_new();
        (XLSX.utils.book_append_sheet(a, n, "입출고대장"),
          XLSX.writeFile(
            a,
            "내포농기계_입출고대장_" +
              new Date().toISOString().slice(0, 10) +
              ".xlsx",
          ));
      }),
    document.getElementById("btn-monthly-pdf").addEventListener("click", () => {
      let e = document.getElementById("invlog-filter-month").value;
      if (!e) {
        const t = new Date();
        e = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
      }
      const a = at.filter((t) => (t.date || "").startsWith(e));
      if (0 === a.length)
        return void I(
          "데이터 없음",
          `${e} 의 입출고 기록이 없습니다.\n위 기간 필터로 원하는 월을 선택 후 다시 시도해주세요.`,
        );
      const o = new Map();
      a.forEach((t) => {
        o.has(t.partName) ||
          o.set(t.partName, { in: 0, out: 0, adjust: 0, finalStock: null });
        const e = o.get(t.partName);
        ("in" === t.type
          ? (e.in += t.qty)
          : "out" === t.type
            ? (e.out += t.qty)
            : "adjust" === t.type && (e.adjust += t.qty),
          void 0 !== t.balanceAfter &&
            null !== t.balanceAfter &&
            (e.finalStock = t.balanceAfter));
      });
      const [s, l] = e.split("-"),
        i = t.filter((t) => t.date.startsWith(e)),
        c = i.reduce((t, e) => t + (e.amount || 0) + (e.tax || 0), 0),
        d = window.open("", "_blank", "width=800,height=900");
      (d.document.write(
        `<!DOCTYPE html>\n<html lang="ko"><head>\n<meta charset="UTF-8"/>\n<title>월말정산_${e}</title>\n<style>\n  * { box-sizing: border-box; margin: 0; padding: 0; }\n  body { font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 11px; color: #222; padding: 24px; }\n  h1 { font-size: 18px; font-weight: 900; text-align: center; letter-spacing: 2px; margin-bottom: 4px; }\n  .sub { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 20px; }\n  .section { margin-bottom: 18px; }\n  .section-title { font-size: 13px; font-weight: 700; border-bottom: 2px solid #065f46; padding-bottom: 4px; margin-bottom: 8px; color: #065f46; }\n  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }\n  th { background: #f0fdf4; border: 1px dashed #a7f3d0; padding: 5px 7px; font-weight: 700; text-align: center; }\n  td { border: 1px dashed #e2e8f0; padding: 5px 7px; }\n  .tr { text-align: right; }\n  .tc { text-align: center; }\n  .summary-box { display: flex; gap: 12px; margin-bottom: 16px; }\n  .scard { flex: 1; border: 1.5px dashed #e2e8f0; border-radius: 8px; padding: 10px 14px; }\n  .scard .sv { font-size: 18px; font-weight: 800; color: #065f46; }\n  .scard .sk { font-size: 10px; color: #64748b; margin-bottom: 2px; }\n  .in-qty { color: #0369a1; font-weight: 700; }\n  .out-qty { color: #dc2626; font-weight: 700; }\n  @media print {\n    body { padding: 10mm; }\n    @page { size: A4 portrait; margin: 10mm; }\n  }\n</style>\n</head><body>\n<h1>내포농기계 월말정산</h1>\n<div class="sub">${s}년 ${parseInt(l, 10)}월 &nbsp;·&nbsp; 출력일: ${new Date().toLocaleDateString("ko-KR")}</div>\n\n<div class="summary-box">\n  <div class="scard"><div class="sk">이달 총 거래금액</div><div class="sv">${c.toLocaleString()}원</div></div>\n  <div class="scard"><div class="sk">이달 거래건수</div><div class="sv">${i.length}건</div></div>\n  <div class="scard"><div class="sk">이달 입출고 건수</div><div class="sv">${a.length}건</div></div>\n</div>\n\n<div class="section">\n  <div class="section-title">품목별 입출고 요약</div>\n  <table>\n    <thead><tr><th>품목명</th><th>입고</th><th>출고</th><th>보정</th><th>월말 재고</th></tr></thead>\n    <tbody>\n      ${[...o.entries()].map(([t, e]) => `\n        <tr>\n          <td>${n(t)}</td>\n          <td class="tc in-qty">${e.in > 0 ? "+" + e.in : "-"}</td>\n          <td class="tc out-qty">${e.out > 0 ? "-" + e.out : "-"}</td>\n          <td class="tc">${0 !== e.adjust ? e.adjust : "-"}</td>\n          <td class="tr">${null !== e.finalStock ? e.finalStock.toLocaleString() : "-"}</td>\n        </tr>`).join("")}\n    </tbody>\n  </table>\n</div>\n\n<div class="section">\n  <div class="section-title">상세 입출고 내역</div>\n  <table>\n    <thead><tr><th>날짜</th><th>품목명</th><th>구분</th><th>수량</th><th>단가</th><th>처리후 재고</th><th>비고</th></tr></thead>\n    <tbody>\n      ${a.map((t) => `\n        <tr>\n          <td class="tc">${n(t.date)}</td>\n          <td>${n(t.partName)}</td>\n          <td class="tc">${"in" === t.type ? "입고" : "out" === t.type ? "출고" : "보정"}</td>\n          <td class="tc ${"in" === t.type ? "in-qty" : "out-qty"}">${"out" === t.type ? "-" : "+"} ${t.qty}</td>\n          <td class="tr">${(t.unitPrice || 0).toLocaleString()}원</td>\n          <td class="tr">${void 0 !== t.balanceAfter && null !== t.balanceAfter ? t.balanceAfter.toLocaleString() : "-"}</td>\n          <td>${n(t.note || "")}</td>\n        </tr>`).join("")}\n    </tbody>\n  </table>\n</div>\n\n<script>window.onload = function(){ window.print(); };<\/script>\n</body></html>`,
      ),
        d.document.close());
    }),
    document
      .getElementById("btn-close-live-preview")
      .addEventListener("click", () => {
        (document.getElementById("live-preview-space").classList.remove("show"),
          (document.getElementById("premium-injected-frame").innerHTML = ""),
          (e = null));
      }),
    document
      .getElementById("items-builder-root")
      .addEventListener("change", (t) => {
        if (!t.target.classList.contains("p-item")) return;
        const e = t.target.closest(".item-row-card");
        if (!e) return;
        const n = nt.find((e) => e.name === t.target.value.trim());
        if (!n) return;
        const a = e.querySelector(".p-spec"),
          o = e.querySelector(".p-price");
        (a && !a.value && (a.value = n.spec || ""),
          o &&
            ((o.value = n.unitPrice || 0),
            o.dispatchEvent(new Event("input"))));
      }),
    window.addEventListener("keydown", (t) => {
      t.ctrlKey &&
        t.shiftKey &&
        ("L" === t.key || "l" === t.key) &&
        (t.preventDefault(),
        (async function () {
          if (!E()) return;
          const t = document.getElementById("alog-overlay"),
            e = document.getElementById("alog-body");
          ((e.innerHTML =
            '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">불러오는 중...</td></tr>'),
            t.classList.add("show"));
          try {
            const t = await w("/api/__sys/access-log?limit=500");
            if (!t.length)
              return void (e.innerHTML =
                '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">기록이 없습니다.</td></tr>');
            e.innerHTML = t
              .map(
                (t) =>
                  `\n          <tr>\n            <td>${n((t.time || "").replace("T", " ").slice(0, 19))}</td>\n            <td>${n(t.ip)}</td>\n            <td>${n(t.method)}</td>\n            <td>${n(t.path)}</td>\n            <td style="color:${t.status >= 400 ? "#f87171" : "#4ade80"};">${t.status}</td>\n            <td style="font-size:9.5px;color:#64748b;">${n(t.ua)}</td>\n          </tr>`,
              )
              .join("");
          } catch (t) {
            e.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f87171;padding:16px;">${n(t.message || "불러오기 실패")}</td></tr>`;
          }
        })());
    }),
    document.getElementById("btn-alog-close").addEventListener("click", () => {
      document.getElementById("alog-overlay").classList.remove("show");
    }));
})();

// ============================================================
// 발주서 페이지 모듈 — 평문 추가 코드
// ============================================================
(function () {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  let currentOrder = null;
  let orders = [];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function number(value) {
    return Number(value) || 0;
  }

  function money(value) {
    return number(value).toLocaleString("ko-KR");
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function koreanDate(dateText) {
    const d = String(dateText || today()).split("-");
    return `${d[0] || ""}년 ${Number(d[1] || 0) || ""}월 ${Number(d[2] || 0) || ""}일`;
  }

  async function api(path, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {},
    );
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(
      API_BASE + path,
      Object.assign({}, options, { headers }),
    );
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error((data && data.error) || `서버 오류 (${response.status})`);
    return data;
  }

  function blankRow() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="order-item-name" placeholder="품목" /></td>
      <td><input type="text" class="order-item-spec" placeholder="규격" /></td>
      <td><input type="number" class="order-item-qty" min="0" step="any" value="1" /></td>
      <td><input type="number" class="order-item-unit" min="0" step="1" value="0" /></td>
      <td><input type="number" class="order-item-amount" min="0" step="1" value="0" /></td>
      <td><button type="button" class="ibtn d order-row-remove" title="행 삭제"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tr.querySelectorAll("input").forEach((input) =>
      input.addEventListener("input", handleItemInput),
    );
    tr.querySelector(".order-row-remove").addEventListener("click", () => {
      tr.remove();
      if (!$("order-item-body").children.length) addRow();
      updatePreview();
    });
    return tr;
  }

  function addRow(item) {
    const body = $("order-item-body");
    if (!body) return;
    const tr = blankRow();
    body.appendChild(tr);
    if (item) {
      tr.querySelector(".order-item-name").value = item.item || "";
      tr.querySelector(".order-item-spec").value = item.spec || "";
      tr.querySelector(".order-item-qty").value = item.qty || 0;
      tr.querySelector(".order-item-unit").value = item.unitPrice || 0;
      tr.querySelector(".order-item-amount").value = item.amount || 0;
    }
    updatePreview();
  }

  function handleItemInput(event) {
    const tr = event.target.closest("tr");
    if (!tr) return;
    if (
      event.target.classList.contains("order-item-qty") ||
      event.target.classList.contains("order-item-unit")
    ) {
      const qty = number(tr.querySelector(".order-item-qty").value);
      const unit = number(tr.querySelector(".order-item-unit").value);
      tr.querySelector(".order-item-amount").value = Math.round(qty * unit);
    }
    updatePreview();
  }

  function readItems() {
    return Array.from(document.querySelectorAll("#order-item-body tr"))
      .map((tr) => ({
        item: tr.querySelector(".order-item-name").value.trim(),
        spec: tr.querySelector(".order-item-spec").value.trim(),
        qty: number(tr.querySelector(".order-item-qty").value),
        unitPrice: number(tr.querySelector(".order-item-unit").value),
        amount: number(tr.querySelector(".order-item-amount").value),
      }))
      .filter(
        (item) =>
          item.item || item.spec || item.qty || item.unitPrice || item.amount,
      );
  }

  function readOrder() {
    const items = readItems();
    const total = items.reduce((sum, item) => sum + number(item.amount), 0);
    return {
      title: $("order-title").value.trim(),
      orderDate: $("order-date").value || today(),
      purpose: $("order-purpose").value.trim(),
      author: $("order-author").value.trim(),
      memo: $("order-memo").value.trim(),
      companyLine: "내포농기계 / 동아아세아농기계",
      items,
      total,
      paymentAmount: total,
    };
  }

  function renderSheet(order) {
    const rows = [...(order.items || [])];
    while (rows.length < 8)
      rows.push({ item: "", spec: "", qty: "", unitPrice: "", amount: "" });
    const body = rows
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.item)}</td>
        <td>${escapeHtml(item.spec)}</td>
        <td class="order-center">${item.qty ? escapeHtml(item.qty) : ""}</td>
        <td class="order-right">${item.unitPrice ? money(item.unitPrice) : ""}</td>
        <td class="order-right">${item.amount ? money(item.amount) : ""}</td>
      </tr>
    `,
      )
      .join("");

    return `
      <div class="order-doc-title">발 주 및 구 매 품 의 서</div>
      <div class="order-approval-wrap">
        <table class="order-approval-table">
          <tr><th rowspan="2">결<br>재</th><th>담 당</th><th>이 사</th><th>대표이사</th></tr>
          <tr><td></td><td></td><td></td></tr>
        </table>
      </div>
      <table class="order-info-table">
        <tr><th>제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</th><td>${escapeHtml(order.title)}</td><th>시 행 일 자</th><td>${escapeHtml(order.orderDate)}</td></tr>
        <tr><th>구 입 목 적</th><td>${escapeHtml(order.purpose)}</td><th>작 성 자</th><td>${escapeHtml(order.author)}</td></tr>
        <tr><th>결 제 금 액</th><td colspan="3" class="order-right order-total-cell">${money(order.total)} 원</td></tr>
      </table>
      <table class="order-item-preview-table">
        <thead><tr><th>품 목</th><th>규 격</th><th>수 량</th><th>단 가</th><th>금 액<br><span>부가세포함</span></th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th colspan="4">합 계</th><td class="order-right">${money(order.total)} 원</td></tr></tfoot>
      </table>
      <div class="order-special"><strong>특이사항:</strong> ${escapeHtml(order.memo)}</div>
      <p class="order-closing">상기 금액을 지출하고자 하오니 검토 후 재가하여 주시기 바랍니다.</p>
      <div class="order-date-line">${koreanDate(order.orderDate)}</div>
      <div class="order-company-line">내 포 농 기 계<br>동아아세아농기계</div>
    `;
  }

  function updatePreview() {
    const order = readOrder();
    $("order-total").textContent = money(order.total);
    $("order-preview").innerHTML = renderSheet(order);
  }

  function resetForm(order) {
    currentOrder = order || null;
    $("order-title").value = order ? order.title || "" : "";
    $("order-date").value = order ? order.orderDate || today() : today();
    $("order-purpose").value = order ? order.purpose || "" : "";
    $("order-author").value = order ? order.author || "" : "";
    $("order-memo").value = order ? order.memo || "" : "";
    $("order-item-body").innerHTML = "";
    const items =
      order && Array.isArray(order.items) && order.items.length
        ? order.items
        : [{ qty: 1, unitPrice: 0, amount: 0 }];
    items.forEach(addRow);
    updatePreview();
  }

  function validateOrder(order) {
    if (!order.title) throw new Error("제목을 입력해주세요.");
    if (!order.orderDate) throw new Error("시행일자를 입력해주세요.");
    if (!order.items.length) throw new Error("품목을 1개 이상 입력해주세요.");
  }

  function printOrder(order) {
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(order.title || "발주서")}</title><link rel="stylesheet" href="styles.css"><style>body{background:#fff;padding:20px}.order-sheet{box-shadow:none;margin:0 auto}.no-print{display:none!important}</style></head><body><div class="order-sheet">${renderSheet(order)}</div><script>window.onload=function(){window.print();};<\/script></body></html>`;
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
      alert("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 인쇄해주세요.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function downloadOrder(order) {
    const filenameDate = (order.orderDate || today()).replace(/-/g, "");
    const safeTitle = (order.title || "발주서").replace(/[\\/:*?"<>|]/g, "_");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(order.title || "발주서")}</title><link rel="stylesheet" href="styles.css"></head><body><div class="order-sheet">${renderSheet(order)}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameDate}_${safeTitle}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  async function loadOrders() {
    const body = $("order-history-body");
    if (!body) return;
    body.innerHTML =
      '<tr><td colspan="5" class="empty-td">발주서 기록을 불러오는 중입니다.</td></tr>';
    try {
      orders = await api("/api/orders");
      $("order-history-summary").textContent =
        `저장된 발주서 ${orders.length}건`;
      if (!orders.length) {
        body.innerHTML =
          '<tr><td colspan="5" class="empty-td">저장된 발주서 기록이 없습니다.</td></tr>';
        return;
      }
      body.innerHTML = orders
        .map(
          (order) => `
        <tr>
          <td>${escapeHtml(order.orderDate)}</td>
          <td><strong>${escapeHtml(order.title)}</strong><br><small>${escapeHtml(order.purpose || "-")}</small></td>
          <td>${escapeHtml(order.author || "-")}</td>
          <td class="tr">${money(order.total || order.paymentAmount)} 원</td>
          <td>
            <div class="ibtns">
              <button type="button" class="ibtn order-history-view" data-id="${escapeHtml(order.id)}"><i class="fa-solid fa-eye"></i> 보기</button>
              <button type="button" class="ibtn order-history-print" data-id="${escapeHtml(order.id)}" style="color:#0284c7"><i class="fa-solid fa-print"></i> 인쇄</button>
              <button type="button" class="ibtn order-history-download" data-id="${escapeHtml(order.id)}" style="color:#047857"><i class="fa-solid fa-download"></i> 다운로드</button>
              <button type="button" class="ibtn d order-history-delete" data-id="${escapeHtml(order.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
            </div>
          </td>
        </tr>
      `,
        )
        .join("");
      bindHistoryButtons();
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5" class="empty-td">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function findOrder(id) {
    return orders.find((order) => order.id === id);
  }

  function bindHistoryButtons() {
    document.querySelectorAll(".order-history-view").forEach((button) =>
      button.addEventListener("click", () => {
        const order = findOrder(button.dataset.id);
        if (!order) return;
        resetForm(order);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
    );
    document.querySelectorAll(".order-history-print").forEach((button) =>
      button.addEventListener("click", () => {
        const order = findOrder(button.dataset.id);
        if (order) printOrder(order);
      }),
    );
    document.querySelectorAll(".order-history-download").forEach((button) =>
      button.addEventListener("click", () => {
        const order = findOrder(button.dataset.id);
        if (order) downloadOrder(order);
      }),
    );
    document.querySelectorAll(".order-history-delete").forEach((button) =>
      button.addEventListener("click", async () => {
        const order = findOrder(button.dataset.id);
        if (
          !order ||
          !confirm(
            `발주서 기록을 삭제할까요?\n\n${order.orderDate} ${order.title}`,
          )
        )
          return;
        try {
          await api(`/api/orders/${encodeURIComponent(order.id)}`, {
            method: "DELETE",
          });
          await loadOrders();
        } catch (error) {
          alert(error.message);
        }
      }),
    );
  }

  function showOrderPage() {
    document
      .querySelectorAll(".tab")
      .forEach((tab) => tab.classList.remove("on"));
    $("tab-order").classList.add("on");
    document.querySelectorAll("main > div[id^='page-']").forEach((page) => {
      page.style.display = page.id === "page-order" ? "block" : "none";
    });
    history.pushState({ tab: "order" }, "", "#order");
    loadOrders();
    updatePreview();
  }

  function initOrderPage() {
    if (!$("page-order")) return;
    $("tab-order").addEventListener("click", showOrderPage);
    $("order-add-row").addEventListener("click", () => addRow());
    [
      "order-title",
      "order-date",
      "order-purpose",
      "order-author",
      "order-memo",
    ].forEach((id) => {
      $(id).addEventListener("input", updatePreview);
      $(id).addEventListener("change", updatePreview);
    });
    $("order-reset").addEventListener("click", () => resetForm());
    $("order-print").addEventListener("click", () => printOrder(readOrder()));
    $("order-refresh").addEventListener("click", loadOrders);
    $("order-save").addEventListener("click", async () => {
      try {
        const order = readOrder();
        validateOrder(order);
        const saved = await api("/api/orders", {
          method: "POST",
          body: JSON.stringify(order),
        });
        alert(`${saved.orderDate} 발주서 기록이 저장되었습니다.`);
        resetForm();
        await loadOrders();
      } catch (error) {
        alert(error.message);
      }
    });
    resetForm();
    if (location.hash === "#order") setTimeout(showOrderPage, 0);
  }

  document.addEventListener("DOMContentLoaded", initOrderPage);
})();
