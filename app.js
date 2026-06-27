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
    sortDir = 1,
    editReturnTab = "list";
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
    let s = null;
    try {
      s = await o.json();
    } catch (t) {}
    if (401 === o.status)
      throw new Error((s && s.error) || "인증이 만료되었습니다.");
    if (!o.ok)
      throw new Error(
        (s && s.error) || "서버 오류가 발생했습니다. (" + o.status + ")",
      );
    return s;
  }

  let adminPasswordCache = "";
  function getAdminPassword() {
    const input = document.getElementById("admin-pw");
    const inputValue = input ? input.value.trim() : "";
    return inputValue || adminPasswordCache;
  }
  async function downloadWithAuth(path, fallbackName, extraHeaders) {
    const headers = Object.assign({}, extraHeaders || {});
    const token = E();
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(b + path, { headers });
    if (!response.ok) {
      let message = "다운로드 실패 (" + response.status + ")";
      try {
        const data = await response.json();
        message = data && data.error ? data.error : message;
      } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const cd = response.headers.get("Content-Disposition") || "";
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const filename = m ? decodeURIComponent(m[1] || m[2]) : fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download.bin";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  async function adminJson(path, options) {
    const adminPassword = getAdminPassword();
    if (!adminPassword) throw new Error("관리자 비밀번호를 입력해주세요.");
    return await w(path, Object.assign({}, options || {}, {
      headers: Object.assign({}, (options && options.headers) || {}, { "X-Admin-Password": adminPassword }),
    }));
  }

  function splitSqlValues(valueText) {
    const out = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < valueText.length; i++) {
      const ch = valueText[i];
      if (ch === "'") {
        if (inQuote && valueText[i + 1] === "'") {
          cur += "''";
          i++;
          continue;
        }
        inQuote = !inQuote;
        cur += ch;
        continue;
      }
      if (ch === "," && !inQuote) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.trim() || valueText.endsWith(",")) out.push(cur.trim());
    return out;
  }
  function parseSqlLiteral(token) {
    let v = String(token == null ? "" : token).trim();
    v = v.replace(/::jsonb\s*$/i, "").trim();
    if (/^null$/i.test(v)) return null;
    if (/^(true|false)$/i.test(v)) return /^true$/i.test(v);
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
    return v;
  }
  function parseNaepoSqlBackup(sqlText) {
    const tableMap = {
      naepo_records: "records",
      naepo_customers: "customers",
      naepo_part_groups: "groups",
      naepo_parts: "parts",
      naepo_inventory_log: "inventoryLog",
      naepo_print_log: "printLog",
      naepo_orders: "orderLog",
    };
    const parsed = { records: [], customers: [], groups: [], parts: [], inventoryLog: [], printLog: [], orderLog: [] };
    const lines = String(sqlText || "").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*INSERT\s+INTO\s+(naepo_[a-z_]+)\s*\(([^)]*)\)\s*VALUES\s*\((.*)\)\s*;\s*$/i);
      if (!m) continue;
      const key = tableMap[m[1]];
      if (!key) continue;
      const cols = m[2].split(",").map((x) => x.trim().replace(/"/g, ""));
      const values = splitSqlValues(m[3]);
      const dataIdx = cols.indexOf("data");
      if (dataIdx < 0 || dataIdx >= values.length) continue;
      try {
        const jsonText = parseSqlLiteral(values[dataIdx]);
        const row = JSON.parse(jsonText || "{}");
        if (row && typeof row === "object") parsed[key].push(row);
      } catch (_) {}
    }
    if (!parsed.records.length && !parsed.parts.length && !parsed.customers.length && !parsed.orderLog.length) {
      throw new Error("복원 가능한 내포농기계 SQL 백업 데이터를 찾지 못했습니다.");
    }
    return parsed;
  }
  function scrollToRequiredField(target) {
    if (!target) return;
    const el = target instanceof Element ? target : document.getElementById(String(target));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof el.focus === "function") {
      setTimeout(() => el.focus({ preventScroll: true }), 250);
    }
  }
  function showRequiredMissing(label, target) {
    I("저장 실패", `${label}을(를) 입력해주세요.`, () => scrollToRequiredField(target));
  }

  async function logClientAction(action, detail, extra) {
    try {
      await w("/api/action-log", {
        method: "POST",
        body: JSON.stringify({ action, detail, extra }),
      });
    } catch (_) {}
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
  function formatKstTimestamp(value) {
    if (!value) return "시간 없음";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).replace("T", " ").slice(0, 19);
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }
  function $() {
    const t = document.getElementById("items-builder-root"),
      e = t.querySelectorAll(".item-row-card").length + 1,
      n = document.createElement("div");
    ((n.className = "item-row-card"),
      (n.innerHTML = `\n        <div class="item-row-header">\n          <span class="item-row-title">품목 연동 슬롯 #${e}</span>\n          <button class="btn btn-danger btn-sm btn-remove-item-row" type="button" style="padding: 2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> 삭제</button>\n        </div>\n        <div class="g4">\n          <div class="field"><label>명세 품목명 <span class="req">*</span></label><input type="text" class="p-item" list="parts-datalist" placeholder="예: 트랙터 필터" maxlength="100"/></div>\n          <div class="field"><label>규격 사양</label><input type="text" class="p-spec" placeholder="예: 100*50 / 15W-40" maxlength="50"/></div>\n          <div class="field"><label>수량 <span class="req">*</span></label><input type="number" class="p-qty" value="1" min="0" step="any"/></div>\n          <div class="field"><label>단가 (원) <span class="req">*</span></label><input type="number" class="p-price" value="0" min="0"/></div>\n        </div>\n        <div class="g2" style="margin-top:8px;">\n          <div class="field">\n            <label>공급가액 & 세액</label>\n            <div style="display:flex; gap:4px; align-items:center;">\n              <input type="number" class="p-amount" placeholder="공급가액" style="flex:1; font-size:12px; padding:10px 6px;"/>\n              <input type="number" class="p-tax" placeholder="세액" style="max-width:70px; font-size:12px; padding:10px 4px;"/>\n              <label style="font-size:11px; font-weight:600; display:flex; align-items:center; gap:2px; white-space:nowrap; cursor:pointer;"><input type="checkbox" class="p-is-taxfree" style="accent-color:#047857; width:14px; height:14px;"/>과세</label>\n            </div>\n          </div>\n          <div class="field"><label>품목 비고</label><input type="text" class="p-item-note" placeholder="품목별 비고사항 (선택)" maxlength="80"/></div>\n        </div>\n      `),
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
              (t.remove(), renumberItemRows(), A());
            }));
      })(n),
      A());
  }
  function renumberItemRows() {
    document.querySelectorAll(".item-row-card").forEach((row, idx) => {
      const title = row.querySelector(".item-row-title");
      if (title) title.textContent = `품목 연동 슬롯 #${idx + 1}`;
    });
  }
  function A() {
    renumberItemRows();
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
    const supplierPills = document.getElementById("supplier-pills");
    supplierPills && supplierPills.classList.remove("bad");
    document.getElementById("e-supplier").textContent = "";
    document.getElementById("e-date").textContent = "";
    if (!u || !g[u]) {
      supplierPills && supplierPills.classList.add("bad");
      document.getElementById("e-supplier").textContent =
        "공급자 선택이 필요합니다.";
      return void showRequiredMissing("공급자", supplierPills || "supplier-pills");
    }
    const e = document.getElementById("f-date");
    let n = !0;
    const a = document.getElementById("f-isoil");
    a.checked && "일반" === o
      ? ((document.getElementById("e-isoil").textContent =
          "급유기 분할 옵션은 [계통출하] 또는 [자체조달] 분류에서만 결합 적용 가능합니다."),
        (n = !1))
      : (document.getElementById("e-isoil").textContent = "");
    const p = document.querySelectorAll(".item-row-card");
    if (0 === p.length) {
      $();
      const firstItem = document.querySelector(".item-row-card .p-item");
      return void showRequiredMissing("명세 품목명", firstItem);
    }
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
      return void showRequiredMissing("명세 품목명", document.querySelector(".item-row-card .p-item.bad"));
    if (!n) return void I("저장 실패", "급유기 분할 옵션을 확인해주세요.", () => scrollToRequiredField("f-isoil"));
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
            (q(), (y = 1), C(), J(editReturnTab || "list"));
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
    const supplierPills = document.getElementById("supplier-pills");
    supplierPills && supplierPills.classList.remove("bad");
  }

  async function getRecordForAction(id) {
    const key = String(id || "");
    let rec = t.find((row) => String(row.id) === key);
    if (rec) return rec;
    try {
      rec = await w("/api/records/" + encodeURIComponent(key));
      if (rec && rec.id) {
        if (!t.some((row) => String(row.id) === String(rec.id))) t.push(rec);
        return rec;
      }
    } catch (err) {
      throw err;
    }
    return null;
  }


  function resetSortHeaders() {
    try {
      document.querySelectorAll(".records-table thead th[data-sort]").forEach((th) => {
        th.textContent = th.textContent.replace(/ [▲▼]$/, "");
      });
    } catch (_) {}
  }

  function clearInlineRecordPreview() {
    document
      .querySelectorAll(".inline-record-preview-row")
      .forEach((row) => row.remove());
  }
  function showInlineRecordPreview(record, triggerEl) {
    if (!record) return;
    const anchorRow = triggerEl && triggerEl.closest ? triggerEl.closest("tr") : null;
    if (!anchorRow || !anchorRow.parentNode) {
      (e = record),
        (document.getElementById("premium-injected-frame").innerHTML = N(record)),
        document.getElementById("live-preview-space").classList.add("show");
      return;
    }
    const openedId = anchorRow.getAttribute("data-inline-preview-open");
    clearInlineRecordPreview();
    if (openedId === String(record.id || "")) {
      anchorRow.removeAttribute("data-inline-preview-open");
      return;
    }
    document
      .querySelectorAll("#list-body tr[data-inline-preview-open]")
      .forEach((row) => row.removeAttribute("data-inline-preview-open"));
    anchorRow.setAttribute("data-inline-preview-open", String(record.id || ""));
    e = record;
    const previewRow = document.createElement("tr");
    previewRow.className = "inline-record-preview-row";
    const inlineColspan = (document.querySelectorAll(".records-table thead th") || []).length || 13;
    previewRow.innerHTML = `
      <td colspan="${inlineColspan}">
        <div class="inline-record-preview-box">
          <div class="inline-record-preview-head inline-record-preview-head-simple">
            <button type="button" class="ibtn inline-record-preview-close"><i class="fa-solid fa-xmark"></i> 닫기</button>
          </div>
          <div class="inline-record-preview-frame">${N(record)}</div>
        </div>
      </td>`;
    anchorRow.insertAdjacentElement("afterend", previewRow);
    const closeBtn = previewRow.querySelector(".inline-record-preview-close");
    closeBtn && closeBtn.addEventListener("click", () => {
      anchorRow.removeAttribute("data-inline-preview-open");
      previewRow.remove();
    });
    previewRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function C() {
    const a = document.getElementById("fl-search").value.toLowerCase().trim(),
      o = document.getElementById("fl-region").value.trim(),
      l = document.getElementById("fl-sdate").value,
      p = document.getElementById("fl-edate").value,
      catFilter = document.getElementById("fl-cat") ? document.getElementById("fl-cat").value : "",
      statusFilter = document.getElementById("fl-status") ? document.getElementById("fl-status").value : "",
      paymentFilter = document.getElementById("fl-payment") ? document.getElementById("fl-payment").value : "",
      m = t.filter((t) => {
        if (o && t.region !== o) return !1;
        if (l && t.date < l) return !1;
        if (p && t.date > p) return !1;
        if (catFilter && t.cat !== catFilter) return !1;
        if (statusFilter && (t.status || "done") !== statusFilter) return !1;
        if (paymentFilter && (t.payMethod || "미기재") !== paymentFilter) return !1;
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
      status: "status",
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
        if (sortCol === "status") {
          const order = { done: 0, pending: 1 };
          return sortDir * ((order[av] ?? 0) - (order[bv] ?? 0));
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
          '<tr><td colspan="13" class="empty-td"><i class="fa-solid fa-folder-open" style="display:block; font-size:32px; margin-bottom:10px; color:#cbd5e1;"></i>조건에 부합하는 거래명세 내역 레코드가 존재하지 않습니다.</td></tr>'),
        void (document.getElementById("pagination-root").innerHTML = "")
      );
    const v = Math.ceil(g / h);
    y > v && (y = v || 1);
    const E = (y - 1) * h;
    (ms.slice(E, E + h).forEach((t) => {
      const e = document.createElement("tr");
      e.setAttribute("data-record-id", String(t.id || ""));
      ((e.innerHTML = `\n          <td><input type="checkbox" class="chk-row" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px;"/></td>\n          <td>${n(t.date)}</td>\n          <td>${n(t.author)}</td>\n          <td>${t.company && "-" !== t.company ? `<strong>${n(t.company)}</strong><span style="font-size:10.5px;color:#64748b"> / ${n(t.name)}</span>` : `<strong>${n(t.name)}</strong>`}</td>\n          <td><span class="badge bn">${n(t.region)}</span></td>\n          <td><span class="badge bo">${n(t.part)}</span></td>\n          <td style="font-weight:600; text-align:left;" title="${n(t.note)}">${n(t.note)}</td>\n          <td style="text-align:center;">\n            <button class="ibtn btn-status-toggle" data-id="${n(t.id)}" data-status="${n(t.status || "done")}" style="${"pending" === t.status ? "color:#dc2626;border-color:#fecaca;background:#fef2f2;" : "color:#047857;border-color:#a7f3d0;background:#f0fdf4;"}">\n              ${"pending" === t.status ? '<i class="fa-solid fa-clock"></i> 미완료' : '<i class="fa-solid fa-circle-check"></i> 완료'}\n            </button>\n          </td>\n          <td style="text-align:center;">${"외상" === t.payMethod ? (t.collected ? '<span class="credit-badge credit-paid"><i class="fa-solid fa-circle-check"></i> 외상 지급됨</span>' : '<span class="credit-badge credit-unpaid"><i class="fa-solid fa-triangle-exclamation"></i> 외상 미완료</span>') : '<span style="color:#cbd5e1;font-size:12px;">-</span>'}</td>\n          <td class="tr">${(t.amount || 0).toLocaleString()}</td>\n          <td class="tr">${(t.tax || 0).toLocaleString()}</td>
          <td class="records-output-cell">
            <div class="ibtns ibtns-output">
              <button class="ibtn btn-view-direct" data-id="${n(t.id)}"><i class="fa-solid fa-magnifying-glass"></i> 보기</button>
              <button class="ibtn btn-print-direct" data-id="${n(t.id)}" style="color:#0284c7;"><i class="fa-solid fa-print"></i> 인쇄</button>
              <button class="ibtn btn-print-supplier-direct" data-id="${n(t.id)}" title="공급자 보관용만 인쇄" style="color:#dc2626;"><i class="fa-solid fa-file-invoice"></i> 공급자</button>
              <button class="ibtn btn-print-receiver-direct" data-id="${n(t.id)}" title="공급받는자 보관용만 인쇄" style="color:#2563eb;"><i class="fa-solid fa-file-invoice"></i> 받는자</button>
              <button class="ibtn btn-excel-direct" data-id="${n(t.id)}" style="color:#047857;"><i class="fa-solid fa-file-excel"></i> 엑셀</button>
            </div>
          </td>
          <td class="records-manage-cell">
            <div class="ibtns ibtns-manage">
              <button class="ibtn btn-printlog-direct" data-id="${n(t.id)}" style="color:#7c3aed;" title="인쇄/엑셀 기록"><i class="fa-solid fa-clock-rotate-left"></i> 기록</button>
              <button class="ibtn btn-edit-direct" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-pen"></i> 수정</button>
              <button class="ibtn d btn-delete-direct" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
            </div>
          </td>\n        `),
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
            const usableLogs = logs.filter((l) => String(l.action || "인쇄") !== "PDF 저장");
            if (!usableLogs.length) {
              I("출력 기록 없음", "이 명세서의 인쇄/엑셀 다운로드 기록이 없습니다.");
              return;
            }
            const normalizedLogs = usableLogs
              .map((l) => ({ ...l, _stamp: formatKstTimestamp(l.printedAt), _action: l.action || "인쇄" }))
              .sort((a, b) => String(b.printedAt || "").localeCompare(String(a.printedAt || "")));
            const visibleLogs = normalizedLogs.slice(0, 5);
            const txt = visibleLogs
              .map((l, i) => `${i + 1}. ${l._stamp} · ${l._action}`)
              .join("\n");
            const hiddenCount = Math.max(0, normalizedLogs.length - visibleLogs.length);
            I(
              "출력 기록 — 총 " + normalizedLogs.length + "회",
              "최근 기록: " + normalizedLogs[0]._stamp + " · " + normalizedLogs[0]._action +
                "\n\n최근 5개 타임스탬프\n" + txt +
                (hiddenCount > 0 ? "\n\n외 " + hiddenCount + "건은 기록에는 저장되어 있고, 화면에는 최근 5개만 표시합니다." : ""),
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
      n.addEventListener("click", async (ev) => {
        ev && ev.preventDefault();
        ev && ev.stopPropagation();
        const a = n.getAttribute("data-id");
        try {
          const o = await getRecordForAction(a);
          o && await logClientAction("거래내역 보기", (o.date || "") + " " + (o.note || o.part || o.name || ""), { recordId: o.id });
          o && showInlineRecordPreview(o, n);
        } catch (err) {
          I("보기 실패", err.message || "거래내역을 불러오지 못했습니다.");
        }
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
                (editReturnTab = "list"),
                (editReturnTab = "list"),
                J("form"),
                window.scrollTo({ top: 0, behavior: "smooth" }));
            })(a);
        });
      }),
      document.querySelectorAll(".btn-print-direct").forEach((e) => {
        e.addEventListener("click", async (ev) => {
          ev && ev.preventDefault();
          ev && ev.stopPropagation();
          const n = e.getAttribute("data-id");
          try {
            const a = await getRecordForAction(n);
            a && X(a);
          } catch (err) {
            I("인쇄 실패", err.message || "거래내역을 불러오지 못했습니다.");
          }
        });
      }),
      document.querySelectorAll(".btn-print-supplier-direct").forEach((e) => {
        e.addEventListener("click", async (ev) => {
          ev && ev.preventDefault();
          ev && ev.stopPropagation();
          const n = e.getAttribute("data-id");
          try {
            const a = await getRecordForAction(n);
            a && X(a, "supplier");
          } catch (err) {
            I("공급자 인쇄 실패", err.message || "거래내역을 불러오지 못했습니다.");
          }
        });
      }),
      document.querySelectorAll(".btn-print-receiver-direct").forEach((e) => {
        e.addEventListener("click", async (ev) => {
          ev && ev.preventDefault();
          ev && ev.stopPropagation();
          const n = e.getAttribute("data-id");
          try {
            const a = await getRecordForAction(n);
            a && X(a, "receiver");
          } catch (err) {
            I("공급받는자 인쇄 실패", err.message || "거래내역을 불러오지 못했습니다.");
          }
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
        n.addEventListener("click", async () => {
          const a = n.getAttribute("data-id");
          let o = t.find((t) => t.id === a);
          if (!o) {
            try { o = await getRecordForAction(a); } catch (_) {}
          }
          o && ((e = o), await logExcelActions([o]), U([o]));
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
  async function loadAdminActionLog() {
    const body = document.getElementById("admin-action-log-body");
    if (!body) return;
    try {
      const rows = await adminJson("/api/admin/action-log?limit=300");
      body.innerHTML = (Array.isArray(rows) ? rows : []).map((row) => `
        <tr>
          <td>${n(formatKstTimestamp(row.time || ""))}</td>
          <td><strong>${n(row.action || "")}</strong></td>
          <td>${n(row.detail || row.path || "")}</td>
          <td>${n(row.status || "")}</td>
        </tr>`).join("") || '<tr><td colspan="4" class="empty-td">작업 로그가 없습니다.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="4" class="empty-td">${n(error.message || "로그를 불러오지 못했습니다.")}</td></tr>`;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    (B(), $());
    if (!E()) return;
    document.getElementById("auth-layer").classList.add("hidden");
    document.getElementById("main-content").classList.add("visible");
    history.replaceState({ tab: "dashboard" }, "", "#dashboard");
    (async function () {
      try {
        const e = await w("/api/records");
        ((t = Array.isArray(e) ? e : []), C(), await ut(), lt(), rt(), Q());
      } catch (e) {
        ((t = []), C(), Q(), I("데이터 불러오기 실패", e.message || "로그인 후 초기 데이터를 불러오지 못했습니다."));
      }
    })();
  });
  var N = function (t, copyMode) {
    copyMode = copyMode || "both";
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
        '</table><table class="tfs-pay-table" style="table-layout:fixed;"><colgroup><col style="width:18%"/><col style="width:10%"/><col style="width:11%"/><col style="width:11%"/><col style="width:14%"/><col style="width:12%"/><col style="width:24%"/></colgroup>' +
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
    if (copyMode === "supplier") {
      return '<div class="excel-frame single-copy">' + y("", "공급자 보관용") + "</div>";
    }
    if (copyMode === "receiver") {
      return '<div class="excel-frame single-copy">' + y("bl", "공급받는자 보관용") + "</div>";
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
  let currentPrintCopyMode = "both";
  function setPrintCopyMode(mode) {
    currentPrintCopyMode = mode || "both";
    if (e) {
      document.getElementById("print-target-area").innerHTML = N(e, currentPrintCopyMode);
      P();
    }
  }
  async function logPrintAction(record, action) {
    if (!record || !record.id) return;
    try {
      await w("/api/print-log", {
        method: "POST",
        body: JSON.stringify({
          recordId: record.id,
          recordNote: record.note,
          recordDate: record.date,
          action: action || "인쇄",
        }),
      });
    } catch (_) {}
  }
  async function logPrintActions(records, action) {
    const list = Array.isArray(records) ? records : [records];
    await Promise.all(list.filter(Boolean).map((rec) => logPrintAction(rec, action)));
  }
  async function logExcelActions(records) {
    const list = Array.isArray(records) ? records : [records];
    await Promise.all(list.filter(Boolean).map((rec) => logPrintAction(rec, "엑셀 다운로드")));
  }
  function X(t, copyMode) {
    currentPrintCopyMode = copyMode || "both";
    (document.body.classList.add("print-record-mode"),
      (document.getElementById("print-target-area").innerHTML = N(t, currentPrintCopyMode)),
      (e = t),
      document.getElementById("print-overlay").classList.add("show"),
      P(),
      setTimeout(async () => {
        await logPrintAction(t, "인쇄");
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
  function resetPageSettings(tabName) {
    try {
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      if (tabName === "list") {
        setVal("fl-search", "");
        setVal("fl-region", "");
        setVal("fl-sdate", "");
        setVal("fl-edate", "");
        setVal("fl-cat", "");
        setVal("fl-status", "");
        setVal("fl-payment", "");
        sortCol = null;
        sortDir = 1;
        resetSortHeaders();
        clearInlineRecordPreview && clearInlineRecordPreview();
      }
      if (tabName === "inventory") {
        setVal("invlog-filter-month", "");
        setVal("invlog-filter-part", "");
        setVal("invlog-filter-group", "");
        setVal("invlog-filter-type", "");
      }
      if (tabName === "order") {
        setVal("order-filter-search", "");
        setVal("order-filter-start", "");
        setVal("order-filter-end", "");
        setVal("order-filter-arrival", "");
      }
      if (tabName === "dashboard") {
        resetDashboardRangeOnLeave();
      }
    } catch (_) {}
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
    if (t !== "dashboard") resetDashboardRangeOnLeave();
    if (e !== false && t !== "form") resetPageSettings(t);
    const n = {
      dashboard: "page-dashboard",
      form: "page-form",
      list: "page-list",
      inventory: "page-inventory",
      customer: "page-customer",
      order: "page-order",
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
      !1 !== e && history.pushState({ tab: t }, "", "#" + t),
      window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }
  (window.addEventListener("beforeprint", D),
    window.addEventListener("afterprint", function () {
      const t = document.getElementById("print-target-area");
      document.body.classList.remove("print-record-mode");
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
        const t = document.getElementById("auth-pw").value.trim(),
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
          if (!o || !o.token) throw new Error("로그인 응답에 토큰이 없습니다.");
          ((s = o.token),
            sessionStorage.setItem(v, s),
            document.getElementById("auth-layer").classList.add("hidden"),
            document.getElementById("main-content").classList.add("visible"));
          try {
            await k();
            await ut();
            lt();
            rt();
            C();
            Q();
          } catch (initError) {
            C();
            Q();
            I("데이터 불러오기 실패", initError.message || "로그인 후 초기 데이터를 불러오지 못했습니다.");
          }
        } catch (t) {
          e.textContent =
            t && t.message && t.message !== "Failed to fetch"
              ? t.message
              : "서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태(Render)를 확인해주세요.";
        } finally {
          ((a.disabled = !1), (a.textContent = o));
        }
        var s;
      }),
    (function () {
      const link = document.getElementById("password-request-link"),
        modal = document.getElementById("password-request-modal"),
        closeBtn = document.getElementById("password-request-close"),
        nameInput = document.getElementById("password-request-name"),
        phoneInput = document.getElementById("password-request-phone"),
        submitBtn = document.getElementById("password-request-submit"),
        errBox = document.getElementById("password-request-err");
      if (!link || !modal || !nameInput || !phoneInput || !submitBtn) return;
      const openModal = () => {
        errBox && (errBox.textContent = "");
        nameInput.value = "";
        phoneInput.value = "";
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        setTimeout(() => nameInput.focus(), 40);
      };
      const closeModal = () => {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      };
      const submitRequest = async () => {
        const name = nameInput.value.trim(), phone = phoneInput.value.trim();
        if (!name) {
          errBox && (errBox.textContent = "이름을 입력해주세요.");
          nameInput.focus();
          return;
        }
        if (!phone) {
          errBox && (errBox.textContent = "전화번호를 입력해주세요.");
          phoneInput.focus();
          return;
        }
        const original = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "전송 중...";
        errBox && (errBox.textContent = "");
        try {
          const res = await fetch(b + "/api/password-issue-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error((data && data.error) || "요청 전송에 실패했습니다.");
          closeModal();
          I("비밀번호 발급 요청", "요청이 접수되었습니다. 관리자가 확인 후 안내합니다.");
        } catch (error) {
          errBox && (errBox.textContent = error && error.message ? error.message : "서버에 연결할 수 없습니다.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = original;
        }
      };
      link.addEventListener("click", (ev) => { ev.preventDefault(); openModal(); });
      closeBtn && closeBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });
      [nameInput, phoneInput].forEach((input) => {
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); submitRequest(); }
          if (ev.key === "Escape") { ev.preventDefault(); closeModal(); }
        });
      });
      submitBtn.addEventListener("click", submitRequest);
    })(),
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
      .addEventListener("click", () => { q(); J("form"); }),
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
          (dashCustomStart = ""),
          (dashCustomEnd = ""),
          document.getElementById("dash-period-week").classList.add("on"),
          document.getElementById("dash-period-month").classList.remove("on"),
          saveDashboardState(),
          Q());
      }),
    document
      .getElementById("dash-period-month")
      .addEventListener("click", () => {
        ((Y = "month"),
          (W = 0),
          (dashCustomStart = ""),
          (dashCustomEnd = ""),
          document.getElementById("dash-period-month").classList.add("on"),
          document.getElementById("dash-period-week").classList.remove("on"),
          saveDashboardState(),
          Q());
      }),
    document
      .getElementById("dash-period-prev")
      .addEventListener("click", () => {
        if (Y === "custom" && dashCustomStart && dashCustomEnd) {
          shiftDashboardCustomRange(-1);
        } else {
          W--;
        }
        saveDashboardState();
        Q();
      }),
    document
      .getElementById("dash-period-next")
      .addEventListener("click", () => {
        if (Y === "custom" && dashCustomStart && dashCustomEnd) {
          shiftDashboardCustomRange(1);
        } else {
          W++;
        }
        saveDashboardState();
        Q();
      }),

    document
      .getElementById("dash-custom-apply")
      .addEventListener("click", () => {
        const s = document.getElementById("dash-custom-start").value;
        const e = document.getElementById("dash-custom-end").value;
        if (!s || !e) return I("날짜 선택 필요", "대시보드에 적용할 시작일과 종료일을 모두 선택해주세요.");
        if (s > e) return I("날짜 확인", "시작일은 종료일보다 늦을 수 없습니다.");
        dashCustomStart = s;
        dashCustomEnd = e;
        Y = "custom";
        W = 0;
        document.getElementById("dash-period-week").classList.remove("on");
        document.getElementById("dash-period-month").classList.remove("on");
        saveDashboardState();
        Q();
      }),
    document
      .getElementById("dash-custom-clear")
      .addEventListener("click", () => {
        dashCustomStart = "";
        dashCustomEnd = "";
        Y = "week";
        W = 0;
        document.getElementById("dash-custom-start").value = "";
        document.getElementById("dash-custom-end").value = "";
        document.getElementById("dash-period-week").classList.add("on");
        document.getElementById("dash-period-month").classList.remove("on");
        saveDashboardState();
        Q();
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
    Z = "bar",
    dashCustomStart = "",
    dashCustomEnd = "";
  function saveDashboardState() {
    // 대시보드 임의 날짜는 현재 화면에서만 유지합니다.
    // 다른 페이지로 이동했다가 돌아오면 초기화되도록 sessionStorage에 저장하지 않습니다.
    try {
      sessionStorage.removeItem("dashMode");
      sessionStorage.removeItem("dashOffset");
      sessionStorage.removeItem("dashCustomStart");
      sessionStorage.removeItem("dashCustomEnd");
    } catch (_) {}
  }
  function resetDashboardRangeOnLeave() {
    Y = "week";
    W = 0;
    dashCustomStart = "";
    dashCustomEnd = "";
    const si = document.getElementById("dash-custom-start");
    const ei = document.getElementById("dash-custom-end");
    si && (si.value = "");
    ei && (ei.value = "");
    const ws = document.getElementById("dash-period-week");
    const mo = document.getElementById("dash-period-month");
    ws && ws.classList.add("on");
    mo && mo.classList.remove("on");
  }
  function applyDashboardControls() {
    const ws = document.getElementById("dash-period-week"), mo = document.getElementById("dash-period-month");
    ws && ws.classList.toggle("on", Y === "week");
    mo && mo.classList.toggle("on", Y === "month");
    const si = document.getElementById("dash-custom-start"), ei = document.getElementById("dash-custom-end");
    si && (si.value = dashCustomStart || "");
    ei && (ei.value = dashCustomEnd || "");
  }
  function G(t) {
    return (
      t.getFullYear() +
      "-" +
      String(t.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(t.getDate()).padStart(2, "0")
    );
  }

  function shiftDashboardCustomRange(direction) {
    const s = new Date(dashCustomStart + "T00:00:00");
    const e = new Date(dashCustomEnd + "T00:00:00");
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return;
    const days = Math.max(1, Math.round((e - s) / 86400000) + 1);
    s.setDate(s.getDate() + direction * days);
    e.setDate(e.getDate() + direction * days);
    dashCustomStart = G(s);
    dashCustomEnd = G(e);
    const si = document.getElementById("dash-custom-start");
    const ei = document.getElementById("dash-custom-end");
    si && (si.value = dashCustomStart);
    ei && (ei.value = dashCustomEnd);
    saveDashboardState();
  }

  let V = new Set();
  function Q() {
    applyDashboardControls();
    const e = (function (t, e) {
      const n = new Date();
      if ("custom" === t && dashCustomStart && dashCustomEnd) {
        return { start: dashCustomStart, end: dashCustomEnd, label: `${dashCustomStart} ~ ${dashCustomEnd}` };
      }
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
        ("custom" === Y ? "선택기간" : "week" === Y ? "이번주" : "이번달") +
        " 총 거래금액" +
        (p ? " (계통제외)" : "")),
      (document.getElementById("dash-count-label").textContent =
        ("custom" === Y ? "선택기간" : "week" === Y ? "이번주" : "이번달") +
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
      if (r) {
        S(
          "수정 취소 확인",
          "수정 작업을 취소하고 이전 페이지로 돌아가시겠습니까?",
          () => {
            q();
            J(editReturnTab || "list");
          },
          () => {},
        );
        return;
      }
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
    document.getElementById("fl-cat") &&
      document.getElementById("fl-cat").addEventListener("change", () => {
        ((y = 1), C());
      }),
    document.getElementById("fl-status") &&
      document.getElementById("fl-status").addEventListener("change", () => {
        ((y = 1), C());
      }),
    document.getElementById("fl-payment") &&
      document.getElementById("fl-payment").addEventListener("change", () => {
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
          if (col === "part") {
            const sel = document.getElementById("fl-cat");
            if (sel) {
              const values = ["", "일반", "계통", "자체"];
              sel.value = values[(values.indexOf(sel.value) + 1) % values.length];
              y = 1;
              C();
              return;
            }
          }
          if (col === "status") {
            const sel = document.getElementById("fl-status");
            if (sel) {
              const values = ["", "done", "pending"];
              sel.value = values[(values.indexOf(sel.value) + 1) % values.length];
              y = 1;
              C();
              return;
            }
          }
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
    document.getElementById("btn-sel-excel").addEventListener("click", async () => {
      const e = document.querySelectorAll(".chk-row:checked");
      if (0 === e.length)
        return void I(
          "선택 항목 없음",
          "엑셀 변환을 수행할 명세 내역 체크박스를 최소 1개 선택하세요.",
        );
      let n = [];
      e.forEach((e) => {
        const a = e.getAttribute("data-id"),
          o = t.find((t) => t.id === a);
        o && n.push(o);
      });
      await logExcelActions(n);
      U(n);
    }),
    document.getElementById("btn-list-print").addEventListener("click", () => {
      const e = [...new Set(Array.from(document.querySelectorAll(".chk-row:checked")).map(
        (t) => t.getAttribute("data-id"),
      ).filter(Boolean))];
      if (0 === e.length)
        return void I("선택 없음", "인쇄할 항목을 먼저 선택해주세요.");
      const n = e.map((id) => t.find((row) => String(row.id) === String(id))).filter(Boolean);
      if (0 === n.length) return;
      const pages = [];
      for (let i = 0; i < n.length; i += 2) {
        const pair = n.slice(i, i + 2);
        pages.push(
          `<div class="lp-page${i + 2 >= n.length ? " lp-last" : ""}">` +
            pair
              .map((record) => `<div class="lp-slot">${N(record, "supplier")}</div>`)
              .join('<div class="lp-sep"><span>✂ 절취선 ✂</span></div>') +
          `</div>`
        );
      }
      const o = pages.join("");
      ((document.getElementById("print-target-area").classList.remove("pf-active")),
        (document.getElementById("print-target-area").innerHTML = o),
        document.body.classList.add("print-record-mode"),
        document.getElementById("print-overlay").classList.add("show"),
        setTimeout(async () => {
          await logPrintActions(n, "인쇄");
          window.print();
        }, 200));
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
    document.getElementById("hdr-pwchg").addEventListener("click", () => {
      I(
        "비밀번호 변경 안내",
        "비밀번호는 이제 서버에서 관리됩니다. 변경이 필요하면 관리자에게 새 비밀번호를 알려주세요 — 서버 설정(PASSWORD_HASH)을 갱신해드립니다.",
      );
    }),
    document.getElementById("hdr-admin") && document.getElementById("hdr-admin").addEventListener("click", () => {
      const overlay = document.getElementById("admin-overlay");
      overlay && overlay.classList.add("show");
      const pw = document.getElementById("admin-pw");
      pw && setTimeout(() => pw.focus(), 40);
    }),
    document.getElementById("btn-admin-close") && document.getElementById("btn-admin-close").addEventListener("click", () => {
      document.getElementById("admin-overlay").classList.remove("show");
    }),
    document.getElementById("btn-admin-login") && document.getElementById("btn-admin-login").addEventListener("click", async () => {
      const err = document.getElementById("admin-err");
      const pwInput = document.getElementById("admin-pw");
      const candidate = pwInput ? pwInput.value.trim() : "";
      try {
        adminPasswordCache = "";
        if (!candidate) throw new Error("관리자 비밀번호를 입력해주세요.");
        await w("/api/admin/status", { headers: { "X-Admin-Password": candidate } });
        adminPasswordCache = candidate;
        err.textContent = "";
        document.getElementById("admin-login-box").style.display = "none";
        document.getElementById("admin-panel").style.display = "block";
        await loadAdminActionLog();
      } catch (error) {
        adminPasswordCache = "";
        err.textContent = error.message || "관리자 인증 실패";
        pwInput && pwInput.focus();
      }
    }),
    document.getElementById("admin-btn-csv-backup") && document.getElementById("admin-btn-csv-backup").addEventListener("click", async () => {
      try {
        await downloadWithAuth("/api/admin/backup/csv.zip", "naepo-csv-backup.zip", { "X-Admin-Password": getAdminPassword() });
        M("CSV 백업 ZIP을 다운로드했습니다.", "ok");
      } catch (error) { I("CSV 백업 실패", error.message); }
    }),
    document.getElementById("admin-btn-full-backup") && document.getElementById("admin-btn-full-backup").addEventListener("click", async () => {
      try {
        await downloadWithAuth("/api/admin/backup/full.zip", "naepo-full-backup.zip", { "X-Admin-Password": getAdminPassword() });
        M("전체 백업 ZIP을 다운로드했습니다.", "ok");
      } catch (error) { I("전체 백업 실패", error.message); }
    }),
    document.getElementById("admin-btn-restore") && document.getElementById("admin-btn-restore").addEventListener("click", () => {
      document.getElementById("admin-restore-file-input").click();
    }),
    document.getElementById("admin-restore-file-input") && document.getElementById("admin-restore-file-input").addEventListener("change", async (ev) => {
      const file = ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      let data;
      try {
        const text = await file.text();
        if (/\.sql$/i.test(file.name) || /^\s*--.*PostgreSQL|INSERT\s+INTO\s+naepo_/is.test(text)) {
          data = parseNaepoSqlBackup(text);
        } else {
          data = JSON.parse(text);
        }
      } catch (error) {
        return I("파일 오류", error.message || "JSON 또는 SQL 백업 파일만 복원할 수 있습니다.");
      }
      const records = data.records || data;
      if (!Array.isArray(records)) return I("파일 오류", "records 배열이 있는 JSON 백업 또는 내포농기계 SQL 백업 파일이 필요합니다.");
      const totalCount = records.length + (Array.isArray(data.parts) ? data.parts.length : 0) + (Array.isArray(data.customers) ? data.customers.length : 0) + (Array.isArray(data.orderLog) ? data.orderLog.length : 0);
      S("백업파일 복원", `${file.name}에서 ${totalCount}건의 데이터를 병합 복원합니다. 계속할까요?`, async () => {
        try {
          const result = await w("/api/restore", {
            method: "POST",
            headers: { "X-Admin-Password": getAdminPassword() },
            body: JSON.stringify({
              records,
              parts: data.parts,
              inventoryLog: data.inventoryLog,
              orderLog: data.orderLog,
              customers: data.customers,
              groups: data.groups,
              printLog: data.printLog,
              mode: "merge",
            }),
          });
          await k();
          C();
          I("복원 완료", `${result.restored}건의 거래내역을 포함해 백업 데이터를 병합했습니다. 전체 거래내역 ${result.total}건입니다.`);
        } catch (error) { I("복원 실패", error.message); }
      }, () => {});
    }),
    document.getElementById("admin-btn-email-backup") && document.getElementById("admin-btn-email-backup").addEventListener("click", async () => {
      try {
        const result = await adminJson("/api/admin/backup/email", { method: "POST", body: JSON.stringify({}) });
        I("수동 이메일 백업 전송", result && result.message ? result.message : "백업 메일 전송을 요청했습니다.");
      } catch (error) { I("이메일 백업 실패", error.message); }
    }),
    document.getElementById("admin-btn-log-refresh") && document.getElementById("admin-btn-log-refresh").addEventListener("click", loadAdminActionLog),
    document.getElementById("admin-btn-log-csv") && document.getElementById("admin-btn-log-csv").addEventListener("click", async () => {
      try { await downloadWithAuth("/api/admin/action-log/download.csv", "naepo-action-log.csv", { "X-Admin-Password": getAdminPassword() }); } catch (error) { I("로그 다운로드 실패", error.message); }
    }),
    document.getElementById("admin-btn-log-json") && document.getElementById("admin-btn-log-json").addEventListener("click", async () => {
      try { await downloadWithAuth("/api/admin/action-log/download.json", "naepo-action-log.json", { "X-Admin-Password": getAdminPassword() }); } catch (error) { I("로그 다운로드 실패", error.message); }
    }),
    document.addEventListener("keydown", (ev) => {
      const pretty = document.getElementById("pretty-modal-container");
      if (pretty && pretty.classList.contains("show")) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          const ok = pretty.querySelector(".pm-btn-ok");
          ok && ok.click();
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          const cancel = pretty.querySelector(".pm-btn-cancel");
          (cancel || pretty.querySelector(".pm-btn-ok"))?.click();
        }
        return;
      }
      const adminOverlay = document.getElementById("admin-overlay");
      if (adminOverlay && adminOverlay.classList.contains("show")) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          document.getElementById("btn-admin-close")?.click();
          return;
        }
        if (ev.key === "Enter" && document.getElementById("admin-login-box")?.style.display !== "none") {
          ev.preventDefault();
          document.getElementById("btn-admin-login")?.click();
          return;
        }
      }
    }),
    
    document
      .getElementById("btn-print-submit")
      .addEventListener("click", async () => {
        if (e) {
          document.body.classList.add("print-record-mode");
          document.getElementById("print-target-area").innerHTML = N(e, currentPrintCopyMode);
          D();
          await logPrintAction(e, "인쇄");
        }
        window.print();
      }),
    document.getElementById("btn-print-pdf") &&
      document.getElementById("btn-print-pdf").addEventListener("click", async () => {
        if (e) {
          document.body.classList.add("print-record-mode");
          document.getElementById("print-target-area").innerHTML = N(e, currentPrintCopyMode);
          D();
        }
        window.print();
      }),
    document.getElementById("btn-print-supplier") &&
      document.getElementById("btn-print-supplier").addEventListener("click", () => setPrintCopyMode("supplier")),
    document.getElementById("btn-print-receiver") &&
      document.getElementById("btn-print-receiver").addEventListener("click", () => setPrintCopyMode("receiver")),
    document.getElementById("btn-print-excel").addEventListener("click", async () => {
      if (e) {
        await logExcelActions([e]);
        U([e]);
      }
    }),
    document
      .getElementById("btn-download-live-excel")
      .addEventListener("click", async () => {
        if (e) {
          await logExcelActions([e]);
          U([e]);
        }
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
                group = ot.find((t) => t.id === e);
              if (!group) return;
              makeGroupEditModal(group, async (newName, partIds) => {
                try {
                  await w(`/api/groups/${encodeURIComponent(e)}`, {
                    method: "PUT",
                    body: JSON.stringify({ name: newName.trim() || group.name, partIds }),
                  });
                  M("그룹이 수정되었습니다.", "ok");
                  await lt();
                  await ut();
                } catch (err) {
                  I("수정 실패", err.message);
                }
              });
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

  function makePartPickModal(title, selectedIds, onConfirm) {
    if (!Array.isArray(nt) || nt.length === 0) {
      I("부품 없음", "먼저 재고현황에 부품을 등록해주세요.");
      return;
    }
    selectedIds = new Set(selectedIds || []);
    const overlay = document.createElement("div");
    overlay.className = "parts-pick-modal-overlay";
    overlay.innerHTML = `
      <div class="parts-pick-modal">
        <div class="ppm-head">
          <div>
            <h3><i class="fa-solid fa-list-check"></i> ${n(title || "품목 선택")}</h3>
            <p>재고현황에 등록된 품목을 체크박스로 선택하세요. 검색도 가능합니다.</p>
          </div>
          <button type="button" class="ppm-x" id="ppm-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ppm-tools">
          <input type="text" id="ppm-search" placeholder="품목명 / 규격 검색"/>
          <button type="button" class="btn btn-o btn-sm" id="ppm-all">전체선택</button>
          <button type="button" class="btn btn-o btn-sm" id="ppm-none">전체해제</button>
        </div>
        <div class="ppm-count" id="ppm-count"></div>
        <div class="ppm-list" id="ppm-list">
          ${nt.map((part) => `
            <label class="ppm-item" data-key="${n((part.name + ' ' + (part.spec || '')).toLowerCase())}">
              <input type="checkbox" class="ppm-chk" data-pid="${n(part.id)}" ${selectedIds.has(part.id) ? "checked" : ""}/>
              <span class="ppm-main">
                <strong>${n(part.name)}</strong>
                <small>${n(part.spec || "규격 없음")}</small>
              </span>
              <span class="ppm-stock">재고 ${Number(part.stock || 0).toLocaleString()}</span>
            </label>`).join("")}
        </div>
        <div class="ppm-foot">
          <button type="button" class="btn btn-o" id="ppm-cancel">취소</button>
          <button type="button" class="btn btn-p" id="ppm-ok"><i class="fa-solid fa-check"></i> 선택 완료</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => document.body.contains(overlay) && document.body.removeChild(overlay);
    const updateCount = () => {
      const checked = overlay.querySelectorAll(".ppm-chk:checked").length;
      overlay.querySelector("#ppm-count").textContent = `선택된 품목 ${checked}개 / 전체 ${nt.length}개`;
    };
    const applyFilter = () => {
      const q = overlay.querySelector("#ppm-search").value.trim().toLowerCase();
      overlay.querySelectorAll(".ppm-item").forEach((el) => {
        el.style.display = !q || (el.getAttribute("data-key") || "").includes(q) ? "flex" : "none";
      });
    };
    overlay.querySelector("#ppm-close").addEventListener("click", close);
    overlay.querySelector("#ppm-cancel").addEventListener("click", close);
    overlay.querySelector("#ppm-search").addEventListener("input", applyFilter);
    overlay.querySelector("#ppm-all").addEventListener("click", () => {
      overlay.querySelectorAll(".ppm-item").forEach((el) => {
        if (el.style.display !== "none") el.querySelector(".ppm-chk").checked = true;
      });
      updateCount();
    });
    overlay.querySelector("#ppm-none").addEventListener("click", () => {
      overlay.querySelectorAll(".ppm-item").forEach((el) => {
        if (el.style.display !== "none") el.querySelector(".ppm-chk").checked = false;
      });
      updateCount();
    });
    overlay.querySelectorAll(".ppm-chk").forEach((chk) => chk.addEventListener("change", updateCount));
    overlay.querySelector("#ppm-ok").addEventListener("click", () => {
      const ids = Array.from(overlay.querySelectorAll(".ppm-chk:checked")).map((el) => el.getAttribute("data-pid"));
      onConfirm && onConfirm(ids);
      close();
    });
    updateCount();
    setTimeout(() => overlay.querySelector("#ppm-search").focus(), 50);
  }

  function makeGroupEditModal(group, onConfirm) {
    if (!group) return;
    if (!Array.isArray(nt) || nt.length === 0) {
      I("부품 없음", "먼저 재고현황에 부품을 등록해주세요.");
      return;
    }
    const selectedIds = new Set(group.partIds || []);
    const overlay = document.createElement("div");
    overlay.className = "parts-pick-modal-overlay";
    overlay.innerHTML = `
      <div class="parts-pick-modal">
        <div class="ppm-head">
          <div>
            <h3><i class="fa-solid fa-layer-group"></i> 그룹 수정</h3>
            <p>그룹명과 포함 품목을 한 번에 수정합니다.</p>
          </div>
          <button type="button" class="ppm-x" id="gem-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ppm-tools ppm-name-tools">
          <input type="text" id="gem-name" value="${n(group.name || "")}" placeholder="그룹명" />
        </div>
        <div class="ppm-tools">
          <input type="text" id="gem-search" placeholder="품목명 / 규격 검색" />
          <button type="button" class="btn btn-o btn-sm" id="gem-all">전체선택</button>
          <button type="button" class="btn btn-o btn-sm" id="gem-none">전체해제</button>
        </div>
        <div class="ppm-count" id="gem-count"></div>
        <div class="ppm-list" id="gem-list">
          ${nt.map((part) => `
            <label class="ppm-item" data-key="${n((part.name + ' ' + (part.spec || '')).toLowerCase())}">
              <input type="checkbox" class="gem-chk" data-pid="${n(part.id)}" ${selectedIds.has(part.id) ? "checked" : ""}/>
              <span class="ppm-main"><strong>${n(part.name)}</strong><small>${n(part.spec || "규격 없음")}</small></span>
              <span class="ppm-stock">재고 ${Number(part.stock || 0).toLocaleString()}</span>
            </label>`).join("")}
        </div>
        <div class="ppm-foot">
          <button type="button" class="btn btn-o" id="gem-cancel">취소</button>
          <button type="button" class="btn btn-p" id="gem-ok"><i class="fa-solid fa-check"></i> 수정 저장</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => document.body.contains(overlay) && document.body.removeChild(overlay);
    const updateCount = () => {
      const checked = overlay.querySelectorAll(".gem-chk:checked").length;
      overlay.querySelector("#gem-count").textContent = `선택된 품목 ${checked}개 / 전체 ${nt.length}개`;
    };
    const applyFilter = () => {
      const q = overlay.querySelector("#gem-search").value.trim().toLowerCase();
      overlay.querySelectorAll(".ppm-item").forEach((el) => {
        el.style.display = !q || (el.getAttribute("data-key") || "").includes(q) ? "flex" : "none";
      });
    };
    overlay.querySelector("#gem-close").addEventListener("click", close);
    overlay.querySelector("#gem-cancel").addEventListener("click", close);
    overlay.querySelector("#gem-search").addEventListener("input", applyFilter);
    overlay.querySelector("#gem-all").addEventListener("click", () => {
      overlay.querySelectorAll(".ppm-item").forEach((el) => { if (el.style.display !== "none") el.querySelector(".gem-chk").checked = true; });
      updateCount();
    });
    overlay.querySelector("#gem-none").addEventListener("click", () => {
      overlay.querySelectorAll(".ppm-item").forEach((el) => { if (el.style.display !== "none") el.querySelector(".gem-chk").checked = false; });
      updateCount();
    });
    overlay.querySelectorAll(".gem-chk").forEach((chk) => chk.addEventListener("change", updateCount));
    overlay.querySelector("#gem-ok").addEventListener("click", () => {
      const name = overlay.querySelector("#gem-name").value.trim();
      if (!name) return I("입력 오류", "그룹명을 입력해주세요.");
      const ids = Array.from(overlay.querySelectorAll(".gem-chk:checked")).map((el) => el.getAttribute("data-pid"));
      onConfirm && onConfirm(name, ids);
      close();
    });
    updateCount();
    setTimeout(() => overlay.querySelector("#gem-name").focus(), 50);
  }

  function makeStockModal(part, mode, onConfirm) {
    if (!part) return;
    const isIn = mode === "in";
    const overlay = document.createElement("div");
    overlay.className = "parts-pick-modal-overlay";
    overlay.innerHTML = `
      <div class="parts-pick-modal small stock-modal-box">
        <div class="ppm-head">
          <div>
            <h3><i class="fa-solid ${isIn ? "fa-truck-ramp-box" : "fa-sliders"}"></i> ${isIn ? "재고 입고" : "재고 보정"}</h3>
            <p><b>${n(part.name)}</b> ${n(part.spec || "")} · 현재 재고 ${Number(part.stock || 0).toLocaleString()}개</p>
          </div>
          <button type="button" class="ppm-x" id="stm-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="stock-modal-fields">
          <div class="field"><label>${isIn ? "입고 수량" : "실제 재고 수량"}</label><input type="number" id="stm-qty" min="${isIn ? 1 : 0}" step="1" value="${isIn ? 1 : Number(part.stock || 0)}"></div>
          ${isIn ? `<div class="field"><label>입고 날짜</label><input type="date" id="stm-date" value="${new Date().toISOString().slice(0,10)}"></div>` : ""}
          <div class="field"><label>비고</label><input type="text" id="stm-note" placeholder="${isIn ? "거래처명, 입고사유 등" : "재고 실사 보정"}"></div>
        </div>
        <div class="ppm-foot">
          <button type="button" class="btn btn-o" id="stm-cancel">취소</button>
          <button type="button" class="btn btn-p" id="stm-ok"><i class="fa-solid fa-check"></i> ${isIn ? "입고 처리" : "보정 저장"}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => document.body.contains(overlay) && document.body.removeChild(overlay);
    overlay.querySelector("#stm-close").addEventListener("click", close);
    overlay.querySelector("#stm-cancel").addEventListener("click", close);
    overlay.querySelector("#stm-ok").addEventListener("click", () => {
      const qty = parseInt(overlay.querySelector("#stm-qty").value, 10);
      if (isIn && (!qty || qty <= 0)) return I("입력 오류", "1 이상의 숫자를 입력해주세요.");
      if (!isIn && (isNaN(qty) || qty < 0)) return I("입력 오류", "0 이상의 숫자를 입력해주세요.");
      const dateEl = overlay.querySelector("#stm-date");
      const date = dateEl ? dateEl.value : "";
      if (isIn && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return I("날짜 형식 오류", "입고 날짜를 선택해주세요.");
      const note = overlay.querySelector("#stm-note").value.trim();
      onConfirm && onConfirm({ qty, date, note });
      close();
    });
    setTimeout(() => overlay.querySelector("#stm-qty").focus(), 50);
  }

  function makePartEditModal(part, onConfirm) {
    if (!part) return;
    const overlay = document.createElement("div");
    overlay.className = "parts-pick-modal-overlay";
    overlay.innerHTML = `
      <div class="parts-pick-modal small stock-modal-box">
        <div class="ppm-head">
          <div>
            <h3><i class="fa-solid fa-pen"></i> 재고 수정</h3>
            <p><b>${n(part.name || "")}</b> 품목 정보를 수정합니다.</p>
          </div>
          <button type="button" class="ppm-x" id="pem-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="stock-modal-fields">
          <div class="field"><label>품목명</label><input type="text" id="pem-name" value="${n(part.name || "")}" /></div>
          <div class="field"><label>규격</label><input type="text" id="pem-spec" value="${n(part.spec || "")}" /></div>
          <div class="field"><label>기본 단가</label><input type="number" id="pem-price" min="0" step="1" value="${Number(part.unitPrice || 0)}" /></div>
          <div class="field"><label>최소 재고</label><input type="number" id="pem-min" min="0" step="1" value="${Number(part.minStock || 0)}" /></div>
        </div>
        <div class="ppm-foot">
          <button type="button" class="btn btn-o" id="pem-cancel">취소</button>
          <button type="button" class="btn btn-p" id="pem-ok"><i class="fa-solid fa-check"></i> 수정 저장</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => document.body.contains(overlay) && document.body.removeChild(overlay);
    overlay.querySelector("#pem-close").addEventListener("click", close);
    overlay.querySelector("#pem-cancel").addEventListener("click", close);
    overlay.querySelector("#pem-ok").addEventListener("click", () => {
      const name = overlay.querySelector("#pem-name").value.trim();
      if (!name) return I("입력 오류", "품목명을 입력해주세요.");
      const spec = overlay.querySelector("#pem-spec").value.trim();
      const unitPrice = parseFloat(overlay.querySelector("#pem-price").value) || 0;
      const minStock = parseInt(overlay.querySelector("#pem-min").value, 10) || 0;
      onConfirm && onConfirm({ name, spec, unitPrice, minStock });
      close();
    });
    setTimeout(() => overlay.querySelector("#pem-name").focus(), 50);
  }

  function makeGroupPickModal(title, selectedGroupIds, onConfirm) {
    if (!Array.isArray(ot) || ot.length === 0) {
      I("그룹 없음", "먼저 부품 그룹을 생성해주세요.");
      return;
    }
    selectedGroupIds = new Set(selectedGroupIds || []);
    const overlay = document.createElement("div");
    overlay.className = "parts-pick-modal-overlay";
    overlay.innerHTML = `
      <div class="parts-pick-modal small">
        <div class="ppm-head">
          <div>
            <h3><i class="fa-solid fa-layer-group"></i> ${n(title || "그룹 선택")}</h3>
            <p>선택한 재고 품목을 넣을 그룹을 체크하세요.</p>
          </div>
          <button type="button" class="ppm-x" id="gpm-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="ppm-list group-list-select">
          ${ot.map((g) => `
            <label class="ppm-item">
              <input type="checkbox" class="gpm-chk" data-gid="${n(g.id)}" ${selectedGroupIds.has(g.id) ? "checked" : ""}/>
              <span class="ppm-main">
                <strong>${n(g.name)}</strong>
                <small>${(g.partIds || []).length}개 품목 포함</small>
              </span>
            </label>`).join("")}
        </div>
        <div class="ppm-foot">
          <button type="button" class="btn btn-o" id="gpm-cancel">취소</button>
          <button type="button" class="btn btn-p" id="gpm-ok"><i class="fa-solid fa-check"></i> 적용</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => document.body.contains(overlay) && document.body.removeChild(overlay);
    overlay.querySelector("#gpm-close").addEventListener("click", close);
    overlay.querySelector("#gpm-cancel").addEventListener("click", close);
    overlay.querySelector("#gpm-ok").addEventListener("click", () => {
      const ids = Array.from(overlay.querySelectorAll(".gpm-chk:checked")).map((el) => el.getAttribute("data-gid"));
      onConfirm && onConfirm(ids);
      close();
    });
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
    const unpaidMap = new Map();
    const paidRecords = [];
    t.forEach((rec) => {
      if ("외상" !== rec.payMethod) return;
      if (rec.collected) {
        paidRecords.push(rec);
        return;
      }
      const key = dt(rec);
      unpaidMap.set(key, (unpaidMap.get(key) || 0) + (rec.amount || 0) + (rec.tax || 0));
    });
    const unpaidTotal = [...unpaidMap.values()].reduce((sum, value) => sum + value, 0),
      s = document.getElementById("ar-total-badge");
    s && (s.textContent = `합계 ${unpaidTotal.toLocaleString()}원 · ${unpaidMap.size}개 거래처`);
    const l = document.getElementById("dash-ar-total"),
      i = document.getElementById("dash-ar-count");
    (l && (l.textContent = unpaidTotal.toLocaleString() + "원"),
      i && (i.textContent = unpaidMap.size + "개 거래처 미수"));

    const renderRecordRow = (rec, paid) => `
      <div class="ar-record-row ${paid ? "ar-paid-row" : "ar-unpaid-row"}">
        <span class="ar-record-meta">${n(rec.date)} &nbsp;${n(rec.note || "")}</span>
        <div class="ar-record-actions">
          <span class="ar-record-amount">${((rec.amount || 0) + (rec.tax || 0)).toLocaleString()}원</span>
          <button class="ibtn btn-ar-view" data-id="${n(rec.id)}"><i class="fa-solid fa-file-lines"></i> 명세표</button>
          ${paid ? '<span class="credit-badge credit-paid"><i class="fa-solid fa-circle-check"></i> 수금완료</span>' : `<button class="ibtn btn-collect" data-id="${n(rec.id)}"><i class="fa-solid fa-check"></i> 수금완료</button>`}
        </div>
      </div>`;

    const unpaidCards = [...unpaidMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount]) => {
        const rows = t
          .filter((rec) => "외상" === rec.payMethod && !rec.collected && dt(rec) === key)
          .sort((a, b) => (a.date > b.date ? 1 : -1));
        return `<section class="ar-card ar-card-unpaid">
          <div class="ar-card-head">
            <div>
              <strong>${n(key)}</strong>
              <span>${rows.length}건</span>
            </div>
            <em>미수금 ${amount.toLocaleString()}원</em>
          </div>
          <div class="ar-card-body">${rows.map((rec) => renderRecordRow(rec, false)).join("")}</div>
        </section>`;
      })
      .join("");

    const paidCards = paidRecords
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""), "ko"))
      .map((rec) => renderRecordRow(rec, true))
      .join("");

    e.innerHTML = `
      <div class="ar-section">
        <div class="ar-section-title"><i class="fa-solid fa-triangle-exclamation"></i> 미수금</div>
        ${unpaidMap.size ? unpaidCards : '<div class="ar-empty">미수금이 없습니다. 🎉</div>'}
      </div>
      <div class="ar-section ar-section-paid">
        <div class="ar-section-title"><i class="fa-solid fa-clock-rotate-left"></i> 수금완료 이력 <span>${paidRecords.length}건</span></div>
        ${paidRecords.length ? `<div class="ar-paid-list">${paidCards}</div>` : '<div class="ar-empty">수금완료 이력이 없습니다.</div>'}
      </div>`;

    document.querySelectorAll(".btn-ar-view").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const rec = t.find((r) => r.id === id);
        if (!rec) return;
        document.getElementById("premium-injected-frame").innerHTML = N(rec);
        document.getElementById("live-preview-space").classList.add("show");
        J("list");
        document.getElementById("live-preview-space").scrollIntoView({ behavior: "smooth" });
      });
    });
    document.querySelectorAll(".btn-collect").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await w(`/api/records/${id}/collect`, { method: "PATCH" });
          const rec = t.find((record) => record.id === id);
          (rec && (rec.collected = !0),
            C(),
            mt(),
            pt(),
            Q(),
            M("수금 완료 처리되었습니다. 완료 이력에서 계속 조회할 수 있습니다.", "ok"));
        } catch (error) {
          I("처리 실패", error.message);
        }
      });
    });
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
        return `\n          <tr>\n            <td style="text-align:center;"><input type="checkbox" class="chk-part" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px; margin:0 6px;"/></td>\n            <td style="${s}"><strong>${e ? "∟ " : ""}${n(t.name)}</strong></td>\n            <td>${n(t.spec)}</td>\n            <td class="tr">${t.unitPrice.toLocaleString()}원</td>\n            <td class="tr" style="font-weight:700;${a ? "color:#dc2626;" : ""}">${t.stock.toLocaleString()}</td>\n            <td class="tr">${t.minStock.toLocaleString()}</td>\n            <td>${o}</td>\n            <td>\n              <div class="ibtns">\n                <button class="ibtn btn-stock-in" data-id="${n(t.id)}" style="color:#0284c7;"><i class="fa-solid fa-truck-ramp-box"></i> 입고</button>\n                <button class="ibtn btn-stock-adjust" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-sliders"></i> 보정</button>\n                <button class="ibtn btn-part-group" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-layer-group"></i> 그룹</button>\n                <button class="ibtn btn-part-edit" data-id="${n(t.id)}" style="color:#0ea5e9;"><i class="fa-solid fa-pen"></i> 수정</button>\n                <button class="ibtn d btn-part-delete" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n              </div>\n            </td>\n          </tr>`;
      }
      ot.forEach((t) => {
        const e = t.partIds
          .map((t) => nt.find((e) => e.id === t))
          .filter(Boolean);
        if (0 === e.length) return;
        const gid = "g_" + t.id.replace(/-/g, "");
        if (!window.__groupCollapsed) window.__groupCollapsed = {};
        if (typeof window.__groupCollapsed[gid] === "undefined") window.__groupCollapsed[gid] = true;
        const collapsed = window.__groupCollapsed[gid];
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
          t.addEventListener("click", () => {
            const e = t.getAttribute("data-id"),
              part = nt.find((p) => p.id === e);
            if (!part) return;
            makeStockModal(part, "in", async ({ qty, date, note }) => {
              try {
                await w(`/api/parts/${encodeURIComponent(e)}/stock-in`, {
                  method: "POST",
                  body: JSON.stringify({ qty, date, note: note || "수동 입고 등록" }),
                });
                M(`${part.name} 입고 ${qty}개 처리되었습니다.`, "ok");
                await ut();
                await gt();
              } catch (err) {
                I("입고 실패", err.message || "입고 처리 중 오류가 발생했습니다.");
              }
            });
          });
        }),
        document.querySelectorAll(".btn-stock-adjust").forEach((t) => {
          t.addEventListener("click", () => {
            const e = t.getAttribute("data-id"),
              part = nt.find((p) => p.id === e);
            if (!part) return;
            makeStockModal(part, "adjust", async ({ qty, note }) => {
              try {
                await w(`/api/parts/${encodeURIComponent(e)}/adjust`, {
                  method: "POST",
                  body: JSON.stringify({ newStock: qty, note: note || "재고 실사 보정" }),
                });
                M(`${part.name} 재고가 ${qty}개로 보정되었습니다.`, "ok");
                await ut();
                await gt();
              } catch (err) {
                I("보정 실패", err.message || "재고 보정 중 오류가 발생했습니다.");
              }
            });
          });
        }),
        document.querySelectorAll(".btn-part-group").forEach((btn) => {
          btn.addEventListener("click", () => {
            const partId = btn.getAttribute("data-id"),
              part = nt.find((p) => p.id === partId);
            if (!part) return;
            const selectedGroups = ot.filter((g) => (g.partIds || []).includes(partId)).map((g) => g.id);
            makeGroupPickModal(`그룹 지정 - ${part.name}`, selectedGroups, async (groupIds) => {
              try {
                for (const g of ot) {
                  const ids = new Set(g.partIds || []);
                  groupIds.includes(g.id) ? ids.add(partId) : ids.delete(partId);
                  await w(`/api/groups/${encodeURIComponent(g.id)}`, {
                    method: "PUT",
                    body: JSON.stringify({ name: g.name, partIds: Array.from(ids) }),
                  });
                }
                M(`"${part.name}" 그룹 지정이 저장되었습니다.`, "ok");
                await lt();
                await ut();
              } catch (err) {
                I("그룹 지정 실패", err.message || "그룹 저장 중 오류가 발생했습니다.");
              }
            });
          });
        }),
        document.querySelectorAll(".btn-part-edit").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const partId = btn.getAttribute("data-id"),
              part = nt.find((p) => p.id === partId);
            if (!part) return;
            makePartEditModal(part, async (payload) => {
              try {
                await w(`/api/parts/${encodeURIComponent(partId)}`, {
                  method: "PUT",
                  body: JSON.stringify(payload),
                });
                M("부품 정보가 수정되었습니다.", "ok");
                await ut();
              } catch (err) {
                I("수정 실패", err.message || "수정 중 오류가 발생했습니다.");
              }
            });
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
      groupFilter = document.getElementById("invlog-filter-group")
        ? document.getElementById("invlog-filter-group").value
        : "",
      o = document.getElementById("invlog-filter-type")
        ? document.getElementById("invlog-filter-type").value
        : "",
      s =
        !!document.getElementById("invlog-show-subtotal") &&
        document.getElementById("invlog-show-subtotal").checked;
    const groupPartNames = new Set();
    if (groupFilter) {
      const group = ot.find((g) => g.id === groupFilter);
      (group && Array.isArray(group.partIds) ? group.partIds : []).forEach((pid) => {
        const part = nt.find((p) => p.id === pid);
        if (part && part.name) groupPartNames.add(part.name);
      });
    }
    let l = at.filter(
      (t) =>
        !(e && !(t.date || "").startsWith(e)) &&
        (!a || t.partName === a) &&
        (!groupFilter || groupPartNames.has(t.partName)) &&
        (!o || t.type === o),
    );
    const i = [...new Set(at.map((t) => (t.date || "").slice(0, 7)))]
        .sort()
        .reverse(),
      c = [...new Set(at.map((t) => t.partName))].sort(),
      d = document.getElementById("invlog-filter-month"),
      r = document.getElementById("invlog-filter-part"),
      groupSelect = document.getElementById("invlog-filter-group");
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
    if (groupSelect) {
      const selected = groupSelect.value;
      groupSelect.innerHTML =
        '<option value="">전체 그룹</option>' +
        ot.map((g) => `<option value="${n(g.id)}"${g.id === selected ? " selected" : ""}>${n(g.name)}</option>`).join("");
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
    document.querySelectorAll(".btn-invlog-view-record").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const rid = btn.getAttribute("data-rid");
        try {
          const rec = await w(`/api/records/${encodeURIComponent(rid)}`);
          document.getElementById("premium-injected-frame").innerHTML = N(rec);
          document.getElementById("live-preview-space").classList.add("show");
          J("list");
          document.getElementById("live-preview-space").scrollIntoView({ behavior: "smooth" });
        } catch (err) {
          I("명세표 조회 실패", err.message || "해당 명세표를 찾을 수 없습니다.");
        }
      });
    });
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
          : t.balanceAfter.toLocaleString(),
      relatedLabel = t.relatedRecordId
        ? `거래명세서 자동출고${t.relatedRecordDate ? " - " + n(t.relatedRecordDate) : ""}${t.relatedRecordCustomer ? " / " + n(t.relatedRecordCustomer) : ""}`
        : "",
      noteText = t.relatedRecordId && (!t.note || t.note === "거래명세서 출고" || t.note === "자동출고") ? relatedLabel : n(t.note),
      viewBtn = t.relatedRecordId
        ? `<button class="ibtn btn-invlog-view-record" data-rid="${n(t.relatedRecordId)}" style="margin-left:8px;color:#0284c7;border-color:#bae6fd;background:#f0f9ff;"><i class="fa-solid fa-file-lines"></i> 해당 명세표 보기</button>`
        : "";
    return `<tr>
          <td style="text-align:center;"><input type="checkbox" class="chk-invlog" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px; margin:0 6px;"/></td>
          <td>${n(t.date)}</td>
          <td><strong>${n(t.partName)}</strong></td>
          <td>${e[t.type] || n(t.type)}</td>
          <td class="tr">${a}${t.qty.toLocaleString()}</td>
          <td class="tr">${(t.unitPrice || 0).toLocaleString()}원</td>
          <td class="tr">${o}</td>
          <td style="font-size:11.5px;color:#64748b;padding-left:20px;"><span class="invlog-note-main">${noteText}</span>${viewBtn}</td>
        </tr>`;
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
        const groupName = document.getElementById("group-name").value.trim();
        if (!groupName) return void I("입력 오류", "그룹명을 입력해주세요.");
        if (0 === nt.length)
          return void I("부품 없음", "먼저 부품을 등록해주세요.");
        makePartPickModal(`그룹 생성 - ${groupName}`, [], async (partIds) => {
          if (0 === partIds.length)
            return void I("선택 없음", "최소 1개 이상의 부품을 선택해주세요.");
          try {
            await w("/api/groups", {
              method: "POST",
              body: JSON.stringify({ name: groupName, partIds }),
            });
            document.getElementById("group-name").value = "";
            M(`"${groupName}" 그룹이 생성되었습니다.`, "ok");
            await lt();
            await ut();
          } catch (err) {
            I("생성 실패", err.message);
          }
        });
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
    ["invlog-filter-month", "invlog-filter-part", "invlog-filter-group", "invlog-filter-type"].forEach(
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
      .getElementById("btn-parts-add-to-group")
      .addEventListener("click", () => {
        const partIds = Array.from(document.querySelectorAll(".chk-part:checked")).map((el) => el.getAttribute("data-id"));
        if (partIds.length === 0) return void I("선택 없음", "그룹에 넣을 재고 품목을 먼저 체크해주세요.");
        makeGroupPickModal(`선택품목 ${partIds.length}개 그룹넣기`, [], async (groupIds) => {
          if (groupIds.length === 0) return void I("그룹 미선택", "적용할 그룹을 1개 이상 선택해주세요.");
          try {
            for (const g of ot) {
              if (!groupIds.includes(g.id)) continue;
              const ids = new Set(g.partIds || []);
              partIds.forEach((id) => ids.add(id));
              await w(`/api/groups/${encodeURIComponent(g.id)}`, {
                method: "PUT",
                body: JSON.stringify({ name: g.name, partIds: Array.from(ids) }),
              });
            }
            M(`선택품목 ${partIds.length}개를 ${groupIds.length}개 그룹에 넣었습니다.`, "ok");
            document.querySelectorAll(".chk-part:checked").forEach((el) => (el.checked = false));
            const all = document.getElementById("parts-chk-all");
            if (all) all.checked = false;
            await lt();
            await ut();
          } catch (err) {
            I("그룹 넣기 실패", err.message || "그룹 저장 중 오류가 발생했습니다.");
          }
        });
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
    // 거래내역 버튼 안전 보강: CSS/렌더 재생성 영향으로 직접 바인딩이 빠져도 보기/인쇄는 항상 동작하게 합니다.
    document.getElementById("list-body") &&
      document.getElementById("list-body").addEventListener("click", async (ev) => {
        const viewBtn = ev.target.closest && ev.target.closest(".btn-view-direct");
        const printBtn = ev.target.closest && ev.target.closest(".btn-print-direct");
        if (!viewBtn && !printBtn) return;
        ev.preventDefault();
        ev.stopPropagation();
        const btn = viewBtn || printBtn;
        const id = btn.getAttribute("data-id");
        try {
          const rec = await getRecordForAction(id);
          if (!rec) {
            I("조회 실패", "선택한 거래내역을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
            return;
          }
          if (viewBtn) {
            showInlineRecordPreview(rec, viewBtn);
          } else {
            X(rec);
          }
        } catch (err) {
          I(viewBtn ? "보기 실패" : "인쇄 실패", err.message || "거래내역을 불러오지 못했습니다.");
        }
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
  let orderParts = [];
  let orderGroups = [];
  let pickerTargetRow = null;

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


  async function loadOrderInventoryRefs() {
    try {
      const [parts, groups] = await Promise.all([api("/api/parts"), api("/api/groups")]);
      orderParts = Array.isArray(parts) ? parts : [];
      orderGroups = Array.isArray(groups) ? groups : [];
    } catch (error) {
      orderParts = [];
      orderGroups = [];
    }
  }

  function findPartByOrderItem(item) {
    if (item.partId) {
      const found = orderParts.find((p) => p.id === item.partId);
      if (found) return found;
    }
    const iname = String(item.item || "").trim();
    const ispec = String(item.spec || "").trim();
    return orderParts.find((p) => String(p.name || "").trim() === iname && String(p.spec || "").trim() === ispec)
      || orderParts.find((p) => String(p.name || "").trim() === iname)
      || null;
  }

  function ensurePartPickerModal() {
    let modal = $("order-part-picker-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "order-part-picker-modal";
    modal.className = "order-modal-overlay";
    modal.innerHTML = `
      <div class="order-modal-box order-part-picker-box">
        <div class="order-modal-head">
          <strong><i class="fa-solid fa-boxes-stacked"></i> 재고 품목 선택</strong>
          <button type="button" class="ibtn" id="order-part-picker-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <input type="text" id="order-part-picker-search" class="order-modal-search" placeholder="품목명 / 규격 / 그룹 검색" />
        <div id="order-part-picker-list" class="order-part-picker-list"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closePartPicker();
    });
    modal.querySelector("#order-part-picker-close").addEventListener("click", closePartPicker);
    modal.querySelector("#order-part-picker-search").addEventListener("input", renderPartPicker);
    return modal;
  }

  function closePartPicker() {
    const modal = $("order-part-picker-modal");
    if (modal) modal.classList.remove("show");
    pickerTargetRow = null;
  }

  function renderPartPicker() {
    const modal = ensurePartPickerModal();
    const q = String(modal.querySelector("#order-part-picker-search").value || "").toLowerCase().trim();
    const list = modal.querySelector("#order-part-picker-list");
    const used = new Set();
    const blocks = [];
    function partMatches(part, groupName) {
      if (!q) return true;
      return [part.name, part.spec, groupName].some((v) => String(v || "").toLowerCase().includes(q));
    }
    orderGroups.forEach((group) => {
      const parts = (group.partIds || [])
        .map((id) => orderParts.find((part) => part.id === id))
        .filter(Boolean)
        .filter((part) => partMatches(part, group.name));
      if (!parts.length) return;
      blocks.push(`<div class="order-part-group ${q ? "" : "is-collapsed"}"><button type="button" class="order-part-group-title"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(group.name)} <span>${parts.length}개</span></button><div class="order-part-group-body">${parts.map((part) => {
        used.add(part.id);
        return partPickCard(part);
      }).join("")}</div></div>`);
    });
    const ungrouped = orderParts.filter((part) => !used.has(part.id)).filter((part) => partMatches(part, "미분류"));
    if (ungrouped.length) {
      blocks.push(`<div class="order-part-group ${q ? "" : "is-collapsed"}"><button type="button" class="order-part-group-title"><i class="fa-solid fa-box"></i> 미분류 품목 <span>${ungrouped.length}개</span></button><div class="order-part-group-body">${ungrouped.map(partPickCard).join("")}</div></div>`);
    }
    list.innerHTML = blocks.join("") || '<div class="empty-td">검색 결과가 없습니다.</div>';
    list.querySelectorAll(".order-part-group-title").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.closest(".order-part-group");
        group && group.classList.toggle("is-collapsed");
      });
    });
    list.querySelectorAll(".order-part-pick").forEach((button) => {
      button.addEventListener("click", () => {
        const part = orderParts.find((p) => p.id === button.dataset.pid);
        if (part && pickerTargetRow) fillOrderRowFromPart(pickerTargetRow, part);
        closePartPicker();
      });
    });
  }

  function partPickCard(part) {
    return `
      <button type="button" class="order-part-pick" data-pid="${escapeHtml(part.id)}">
        <span><strong>${escapeHtml(part.name)}</strong><small>${escapeHtml(part.spec || "규격 없음")}</small></span>
        <em>재고 ${money(part.stock || 0)}</em>
      </button>`;
  }

  async function openPartPicker(row) {
    pickerTargetRow = row;
    await loadOrderInventoryRefs();
    const modal = ensurePartPickerModal();
    modal.classList.add("show");
    modal.querySelector("#order-part-picker-search").value = "";
    renderPartPicker();
  }

  function fillOrderRowFromPart(row, part) {
    row.dataset.partId = part.id || "";
    row.querySelector(".order-item-name").value = part.name || "";
    row.querySelector(".order-item-spec").value = part.spec || "";
    updatePreview();
  }

  function ensureNewPartModal() {
    let modal = $("order-new-part-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "order-new-part-modal";
    modal.className = "order-modal-overlay";
    modal.innerHTML = `
      <div class="order-modal-box order-new-part-box">
        <div class="order-modal-head">
          <strong><i class="fa-solid fa-circle-plus"></i> 새 재고 품목 등록</strong>
          <button type="button" class="ibtn" id="order-new-part-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p class="order-modal-desc">재고현황에 없는 발주 품목입니다. 등록 후 발주 수량을 자동 입고합니다.</p>
        <div class="g2">
          <div class="field"><label>품목명</label><input type="text" id="order-new-part-name"></div>
          <div class="field"><label>규격</label><input type="text" id="order-new-part-spec"></div>
          <div class="field"><label>기본단가</label><input type="number" id="order-new-part-price" min="0" step="1" value="0"></div>
          <div class="field"><label>초기 재고수량</label><input type="number" id="order-new-part-stock" min="0" step="any" value="0"></div>
          <div class="field"><label>최소 재고</label><input type="number" id="order-new-part-min" min="0" step="any" value="0"></div>
          <div class="field"><label>그룹 선택</label><select id="order-new-part-group"></select></div>
        </div>
        <div class="field" style="margin-top:10px"><label>새 그룹 생성</label><input type="text" id="order-new-part-newgroup" placeholder="새 그룹명 입력 시 이 그룹으로 등록"></div>
        <div class="order-modal-actions">
          <button type="button" class="btn btn-o" id="order-new-part-cancel">취소</button>
          <button type="button" class="btn btn-p" id="order-new-part-save"><i class="fa-solid fa-check"></i> 등록 후 입고</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector("#order-new-part-close").addEventListener("click", () => modal.classList.remove("show"));
    modal.querySelector("#order-new-part-cancel").addEventListener("click", () => modal.classList.remove("show"));
    return modal;
  }

  function promptNewPartFromOrderItem(item) {
    return new Promise(async (resolve, reject) => {
      await loadOrderInventoryRefs();
      const modal = ensureNewPartModal();
      modal.querySelector("#order-new-part-name").value = item.item || "";
      modal.querySelector("#order-new-part-spec").value = item.spec || "";
      modal.querySelector("#order-new-part-price").value = item.unitPrice || 0;
      modal.querySelector("#order-new-part-stock").value = 0;
      modal.querySelector("#order-new-part-min").value = 0;
      const select = modal.querySelector("#order-new-part-group");
      select.innerHTML = '<option value="">그룹 없음</option>' + orderGroups.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join("");
      modal.querySelector("#order-new-part-newgroup").value = "";
      const save = modal.querySelector("#order-new-part-save");
      const handler = async () => {
        try {
          const name = modal.querySelector("#order-new-part-name").value.trim();
          const spec = modal.querySelector("#order-new-part-spec").value.trim();
          const unitPrice = number(modal.querySelector("#order-new-part-price").value);
          const stock = number(modal.querySelector("#order-new-part-stock").value);
          const minStock = number(modal.querySelector("#order-new-part-min").value);
          const groupId = select.value;
          const newGroupName = modal.querySelector("#order-new-part-newgroup").value.trim();
          if (!name) throw new Error("품목명을 입력해주세요.");
          const part = await api("/api/parts", { method: "POST", body: JSON.stringify({ name, spec, unitPrice, stock, minStock, note: "발주 택배 도착 등록" }) });
          if (newGroupName) {
            await api("/api/groups", { method: "POST", body: JSON.stringify({ name: newGroupName, partIds: [part.id] }) });
          } else if (groupId) {
            const group = orderGroups.find((g) => g.id === groupId);
            if (group && !(group.partIds || []).includes(part.id)) {
              await api(`/api/groups/${encodeURIComponent(group.id)}`, { method: "PUT", body: JSON.stringify({ name: group.name, partIds: [...(group.partIds || []), part.id] }) });
            }
          }
          save.removeEventListener("click", handler);
          modal.classList.remove("show");
          resolve(part);
        } catch (error) {
          alert(error.message);
        }
      };
      save.replaceWith(save.cloneNode(true));
      modal.querySelector("#order-new-part-save").addEventListener("click", handler);
      modal.classList.add("show");
    });
  }

  async function receiveOrderItem(orderId, itemIndex) {
    const order = findOrder(orderId);
    if (!order || !Array.isArray(order.items) || !order.items[itemIndex]) return;
    const item = order.items[itemIndex];
    if (item.receivedAt || item.inventoryAddedAt) {
      alert("이미 도착 처리된 품목입니다.");
      return;
    }
    if (!confirm(`${order.orderDate} ${order.title}\n${item.item} ${item.qty || 0}개를 재고에 입고할까요?`)) return;
    try {
      await loadOrderInventoryRefs();
      let part = findPartByOrderItem(item);
      if (!part) part = await promptNewPartFromOrderItem(item);
      await api(`/api/parts/${encodeURIComponent(part.id)}/stock-in`, {
        method: "POST",
        body: JSON.stringify({
          qty: number(item.qty) || 1,
          unitPrice: number(item.unitPrice) || number(part.unitPrice) || 0,
          date: today(),
          note: "발주 택배 도착",
        }),
      });
      const updated = JSON.parse(JSON.stringify(order));
      updated.items[itemIndex].partId = part.id;
      updated.items[itemIndex].receivedAt = new Date().toISOString();
      updated.items[itemIndex].inventoryAddedAt = new Date().toISOString();
      await api(`/api/orders/${encodeURIComponent(order.id)}`, { method: "PUT", body: JSON.stringify(updated) });
      alert("재고 입고 처리되었습니다.");
      await loadOrders();
    } catch (error) {
      alert(error.message);
    }
  }


  async function receiveOrderAll(orderId) {
    const order = findOrder(orderId);
    if (!order || !Array.isArray(order.items)) return;
    const pending = order.items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !(item.receivedAt || item.inventoryAddedAt));
    if (!pending.length) {
      alert("이미 모든 품목이 도착 처리되었습니다.");
      return;
    }
    if (!confirm(`${order.orderDate} ${order.title}
미도착 품목 ${pending.length}개를 모두 재고에 입고할까요?`)) return;
    try {
      await loadOrderInventoryRefs();
      const updated = JSON.parse(JSON.stringify(order));
      for (const { item, idx } of pending) {
        let part = findPartByOrderItem(item);
        if (!part) part = await promptNewPartFromOrderItem(item);
        await api(`/api/parts/${encodeURIComponent(part.id)}/stock-in`, {
          method: "POST",
          body: JSON.stringify({
            qty: number(item.qty) || 1,
            unitPrice: number(item.unitPrice) || number(part.unitPrice) || 0,
            date: today(),
            note: "발주 택배 도착",
          }),
        });
        updated.items[idx].partId = part.id;
        updated.items[idx].receivedAt = new Date().toISOString();
        updated.items[idx].inventoryAddedAt = new Date().toISOString();
        const cached = orderParts.find((p) => p.id === part.id);
        if (cached) cached.stock = number(cached.stock) + (number(item.qty) || 1);
      }
      await api(`/api/orders/${encodeURIComponent(order.id)}`, { method: "PUT", body: JSON.stringify(updated) });
      alert(`미도착 품목 ${pending.length}개가 재고에 입고 처리되었습니다.`);
      await loadOrders();
      try { await ut(); await gt(); } catch (_) {}
    } catch (error) {
      alert(error.message || "전체 도착 처리 중 오류가 발생했습니다.");
    }
  }

  function blankRow() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="order-item-name" placeholder="품목" /></td>
      <td><input type="text" class="order-item-spec" placeholder="규격" /></td>
      <td><input type="number" class="order-item-qty" min="0" step="any" value="1" /></td>
      <td><input type="number" class="order-item-unit" min="0" step="1" value="0" /></td>
      <td><input type="number" class="order-item-amount" min="0" step="1" value="0" /></td>
      <td class="order-row-tools"><button type="button" class="ibtn order-row-pick" title="재고에서 선택"><i class="fa-solid fa-boxes-stacked"></i> 재고선택</button><button type="button" class="ibtn d order-row-remove" title="행 삭제"><i class="fa-solid fa-trash"></i> 삭제</button></td>
    `;
    tr.querySelectorAll("input").forEach((input) =>
      input.addEventListener("input", handleItemInput),
    );
    tr.querySelector(".order-row-pick").addEventListener("click", () => openPartPicker(tr));
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
      tr.dataset.partId = item.partId || "";
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
    if (event.target.classList.contains("order-item-name") || event.target.classList.contains("order-item-spec")) {
      tr.dataset.partId = "";
    }
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
        partId: tr.dataset.partId || "",
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
    while (rows.length < 9)
      rows.push({ item: "", spec: "", qty: "", unitPrice: "", amount: "" });
    const body = rows
      .map(
        (item) => `
      <tr>
        <td class="order-text-cell">${escapeHtml(item.item)}</td>
        <td class="order-text-cell">${escapeHtml(item.spec)}</td>
        <td class="order-center order-num-cell">${item.qty ? escapeHtml(item.qty) : ""}</td>
        <td class="order-right order-num-cell">${item.unitPrice ? money(item.unitPrice) : ""}</td>
        <td class="order-right order-num-cell">${item.amount ? money(item.amount) : ""}</td>
      </tr>
    `,
      )
      .join("");

    return `
      <div class="order-doc-title">발 주 및 구 매 품 의 서</div>
      <div class="order-approval-wrap">
        <table class="order-approval-table">
          <colgroup><col class="approval-label-col"><col><col><col></colgroup>
          <tr><th rowspan="2" class="approval-label">결<br>재</th><th>담당</th><th>이사</th><th>대표<br>이사</th></tr>
          <tr><td></td><td></td><td></td></tr>
        </table>
      </div>
      <table class="order-info-table">
        <colgroup><col class="order-info-label-col"><col><col class="order-info-label-col"><col class="order-info-value-short"></colgroup>
        <tr><th>제&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;목</th><td class="order-wrap-cell">${escapeHtml(order.title)}</td><th>시행일자</th><td class="order-center">${escapeHtml(order.orderDate)}</td></tr>
        <tr><th>구입목적</th><td class="order-wrap-cell">${escapeHtml(order.purpose)}</td><th>작 성 자</th><td class="order-center order-wrap-cell">${escapeHtml(order.author)}</td></tr>
        <tr><th>결제금액</th><td colspan="3" class="order-right order-total-cell">${money(order.total)} 원</td></tr>
      </table>
      <table class="order-item-preview-table">
        <colgroup><col><col style="width:20%"><col style="width:12%"><col style="width:20%"><col style="width:20%"></colgroup>
        <thead><tr><th>품 목</th><th>규 격</th><th>수 량</th><th>단 가</th><th>금 액<br><span>부가세포함</span></th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th colspan="4">합 계</th><td class="order-right">${money(order.total)} 원</td></tr></tfoot>
      </table>
      <div class="order-special"><strong>특이사항:</strong> <span>${escapeHtml(order.memo)}</span></div>
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

  function orderPrintCss() {
    return `
      @page { size: A4 portrait; margin: 4mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #111827; }
      .order-print-page { width: 202mm; min-height: 289mm; overflow: hidden; margin: 0 auto; background:#fff; }
      .order-sheet {
        width: 202mm;
        min-height: auto;
        margin: 0;
        padding: 6mm 7mm 5mm;
        transform-origin: top left;
        background: #fff;
        color: #111827;
        border: 0;
        box-shadow: none;
        font-size: 11pt;
        line-height: 1.3;
      }
      .order-doc-title { text-align: center; font-size: 21pt; font-weight: 900; letter-spacing: 0.38em; margin: 0 0 5mm; padding-left: 0.38em; }
      .order-approval-wrap { display: flex; justify-content: flex-end; margin-bottom: 3mm; }
      .order-approval-table { width: 68mm; border-collapse: collapse; table-layout: fixed; font-size: 10.2pt; }
      .order-approval-table th, .order-approval-table td, .order-info-table th, .order-info-table td, .order-item-preview-table th, .order-item-preview-table td { border: 1.15px solid #111827; padding: 2.2mm 2mm; overflow: visible; text-overflow: clip; white-space: normal; word-break: break-all; }
      .order-approval-table .approval-label-col { width: 12mm; }
      .order-approval-table th { text-align: center; font-weight: 900; line-height: 1.1; }
      .order-approval-table td { height: 17mm; }
      .order-info-table, .order-item-preview-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 3.4mm; }
      .order-info-label-col { width: 22mm; }
      .order-info-value-short { width: 32mm; }
      .order-info-table th { background: #f8fafc; text-align: center; font-weight: 900; letter-spacing: 0.04em; }
      .order-info-table td { min-height: 9mm; }
      .order-wrap-cell { white-space: normal; word-break: break-all; line-height: 1.26; }
      .order-total-cell { font-weight: 900; font-size: 11.5pt; }
      .order-item-preview-table th { background: #f8fafc; text-align: center; font-weight: 900; }
      .order-item-preview-table thead span { font-size: 8.2pt; font-weight: 700; }
      .order-item-preview-table td { height: 8.2mm; }
      .order-center { text-align: center; }
      .order-right { text-align: right; }
      .order-text-cell { word-break: break-all; white-space: normal; }
      .order-num-cell { white-space: nowrap; word-break: keep-all; }
      .order-special { min-height: 12mm; border: 1.15px solid #111827; padding: 2.2mm; margin-bottom: 4mm; word-break: break-all; white-space: normal; }
      .order-closing { text-align: center; margin: 4.5mm 0 4mm; font-weight: 700; }
      .order-date-line { text-align: center; margin-bottom: 4mm; font-weight: 800; }
      .order-company-line { text-align: center; font-size: 14pt; font-weight: 900; letter-spacing: 0.2em; line-height: 1.35; padding-left: 0.2em; }
      @media print { .order-print-page { margin:0 auto; } .order-sheet { margin: 0; } }
    `;
  }

  async function logOrderAction(order, action) {
    if (!order || !order.id) return;
    try {
      await api(`/api/orders/${encodeURIComponent(order.id)}/activity`, {
        method: "POST",
        body: JSON.stringify({ action: action || "인쇄" }),
      });
    } catch (_) {}
  }

  function printOrder(order) {
    logOrderAction(order, "인쇄");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeHtml(order.title || "발주서")}</title><style>${orderPrintCss()}</style></head><body><div class="order-print-page"><div class="order-sheet">${renderSheet(order)}</div></div><script>function fitOrder(){var page=document.querySelector('.order-print-page');var sheet=document.querySelector('.order-sheet');if(!page||!sheet)return;sheet.style.transform='scale(1)';sheet.style.width='202mm';var sx=page.clientWidth/sheet.scrollWidth;var sy=page.clientHeight/sheet.scrollHeight;var sc=Math.min(1,sx,sy)*0.996;sheet.style.transform='scale('+sc+')';sheet.style.width=(202/sc)+'mm';}window.onload=function(){setTimeout(function(){fitOrder();window.focus();window.print();},220);};window.onbeforeprint=fitOrder;<\/script></body></html>`;
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
    logOrderAction(order, "다운로드");
    if (typeof XLSX === "undefined") {
      alert("엑셀 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    const filenameDate = (order.orderDate || today()).replace(/-/g, "");
    const safeTitle = (order.title || "발주서").replace(/[\/:*?"<>|]/g, "_");
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = [];
    rows.push(["발 주 및 구 매 품 의 서", "", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "결재", "담당", "이사", "대표이사"]);
    rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["제목", order.title || "", "", "", "시행일자", order.orderDate || "", "", ""]);
    rows.push(["구입목적", order.purpose || "", "", "", "작성자", order.author || "", "", ""]);
    rows.push(["결제금액", order.total || 0, "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["품목", "", "규격", "", "수량", "단가", "금액(부가세포함)", ""]);
    const itemStart = rows.length;
    const printableItems = items.length ? items : [{ qty: 1, unitPrice: 0, amount: 0 }];
    printableItems.forEach((item) => rows.push([
      item.item || "", "", item.spec || "", "", item.qty || "", item.unitPrice || 0, item.amount || 0, ""
    ]));
    while (rows.length < itemStart + 7) rows.push(["", "", "", "", "", "", "", ""]);
    const totalRow = rows.length;
    rows.push(["합계", "", "", "", "", "", order.total || 0, ""]);
    rows.push(["", "", "", "", "", "", "", ""]);
    const memoRow = rows.length;
    rows.push(["특이사항", order.memo || "", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "", "", ""]);
    const closingRow = rows.length;
    rows.push(["상기 금액을 지출하고자 하오니 검토 후 재가하여 주시기 바랍니다.", "", "", "", "", "", "", ""]);
    const dateRow = rows.length;
    rows.push([koreanDate(order.orderDate), "", "", "", "", "", "", ""]);
    const companyRow = rows.length;
    rows.push(["내 포 농 기 계", "", "", "", "", "", "", ""]);
    rows.push(["동아아세아농기계", "", "", "", "", "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 11 }, { wch: 17 }, { wch: 14 }, { wch: 13 },
      { wch: 9 }, { wch: 13 }, { wch: 15 }, { wch: 13 },
    ];
    ws["!rows"] = rows.map((_, i) => ({ hpt: i === 0 ? 26 : i === memoRow ? 34 : i >= closingRow ? 24 : 21 }));
    const merges = [
      [0,0,0,7], [1,4,2,4],
      [3,1,3,3], [3,5,3,7], [4,1,4,3], [4,5,4,7], [5,1,5,7],
      [7,0,7,1], [7,2,7,3], [7,6,7,7],
      [totalRow,0,totalRow,5], [totalRow,6,totalRow,7],
      [memoRow,1,memoRow,7], [closingRow,0,closingRow,7], [dateRow,0,dateRow,7], [companyRow,0,companyRow,7], [companyRow+1,0,companyRow+1,7]
    ];
    for (let r = itemStart; r < totalRow; r++) {
      merges.push([r,0,r,1], [r,2,r,3], [r,6,r,7]);
    }
    ws["!merges"] = merges.map(([r1,c1,r2,c2]) => ({ s: { r:r1, c:c1 }, e: { r:r2, c:c2 } }));

    const border = {
      top: { style: "thin", color: { rgb: "111827" } },
      bottom: { style: "thin", color: { rgb: "111827" } },
      left: { style: "thin", color: { rgb: "111827" } },
      right: { style: "thin", color: { rgb: "111827" } },
    };
    const center = { vertical: "center", horizontal: "center", wrapText: true };
    const left = { vertical: "center", horizontal: "left", wrapText: true };
    const right = { vertical: "center", horizontal: "right", wrapText: true };
    function setCell(r, c, style = {}) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].s = Object.assign({
        font: { name: "맑은 고딕", sz: 10 },
        alignment: center,
      }, style);
    }
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        const isTable = (R >= 1 && R <= 5) || (R >= 7 && R <= totalRow) || R === memoRow;
        ws[ref].s = {
          font: { name: "맑은 고딕", sz: R === 0 ? 18 : 10, bold: R === 0 || C === 0 || R === 7 || R === totalRow },
          alignment: C === 1 || C === 2 || C === 3 ? left : (C >= 5 || R === totalRow ? right : center),
          border: isTable ? border : undefined,
          fill: (R === 7 || C === 0 || R === totalRow) && isTable ? { patternType: "solid", fgColor: { rgb: "F8FAFC" } } : undefined,
        };
      }
    }
    setCell(0, 0, { font: { name: "맑은 고딕", sz: 18, bold: true }, alignment: { vertical: "center", horizontal: "center", wrapText: true } });
    for (let r = itemStart; r < totalRow; r++) {
      [5,6].forEach((c) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) ws[ref].z = "#,##0";
      });
    }
    [1,6].forEach((c) => {
      const ref = XLSX.utils.encode_cell({ r: totalRow, c });
      if (ws[ref]) ws[ref].z = "#,##0";
    });
    ws["!printHeaderRows"] = 0;
    ws["!margins"] = { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 };
    ws["!pageSetup"] = { paperSize: 9, orientation: "portrait", fitToWidth: 1, fitToHeight: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "발주서");
    XLSX.writeFile(wb, `${filenameDate}_${safeTitle}.xlsx`);
  }

  function setOrderPreviewVisible(visible) {
    const card = $("order-preview-card");
    const layout = document.querySelector("#page-order .order-layout");
    const openBtn = $("order-preview-open");
    if (!card || !layout) return;
    card.style.display = visible ? "block" : "none";
    layout.classList.toggle("preview-closed", !visible);
    if (openBtn) openBtn.style.display = visible ? "none" : "inline-flex";
  }

  function getFilteredOrders() {
    const q = String($("order-filter-search") ? $("order-filter-search").value : "").toLowerCase().trim();
    const start = $("order-filter-start") ? $("order-filter-start").value : "";
    const end = $("order-filter-end") ? $("order-filter-end").value : "";
    const arrival = $("order-filter-arrival") ? $("order-filter-arrival").value : "";
    return orders.filter((order) => {
      const date = order.orderDate || "";
      if (start && date < start) return false;
      if (end && date > end) return false;
      const items = Array.isArray(order.items) ? order.items : [];
      if (arrival === "pending" && !items.some((item) => !(item.receivedAt || item.inventoryAddedAt))) return false;
      if (arrival === "done" && items.some((item) => !(item.receivedAt || item.inventoryAddedAt))) return false;
      if (q) {
        const text = [
          order.title,
          order.purpose,
          order.author,
          order.memo,
          ...items.flatMap((item) => [item.item, item.spec]),
        ].join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  function renderOrderHistory() {
    const body = $("order-history-body");
    if (!body) return;
    const filtered = getFilteredOrders();
    $("order-history-summary").textContent =
      `저장된 발주서 ${orders.length}건 · 표시 ${filtered.length}건`;
    if (!orders.length) {
      body.innerHTML =
        '<tr><td colspan="5" class="empty-td">저장된 발주서 기록이 없습니다.</td></tr>';
      return;
    }
    if (!filtered.length) {
      body.innerHTML =
        '<tr><td colspan="5" class="empty-td">필터 조건에 맞는 발주서가 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = filtered
      .map(
        (order) => `
        <tr>
          <td class="order-history-date">${escapeHtml(order.orderDate)}</td>
          <td><strong class="order-history-title">${escapeHtml(order.title)}</strong><br><small class="order-history-purpose">${escapeHtml(order.purpose || "-")}</small>${Array.isArray(order.activities) && order.activities.length ? `<div class="order-history-activity"><i class="fa-solid fa-clock-rotate-left"></i> 최근 기록: ${escapeHtml(order.activities[order.activities.length - 1].action || "인쇄")} · ${escapeHtml(String(order.activities[order.activities.length - 1].createdAt || "").replace("T", " ").slice(0, 16))}</div>` : ""}<div class="order-history-items compact all-items">${(order.items || []).map((item, idx) => `<span class="order-history-item"><span class="ohi-main"><b>${escapeHtml(item.item || "품목")}</b><small>${escapeHtml(item.spec || "")}</small></span><em>${money(item.qty || 0)}개</em>${item.receivedAt || item.inventoryAddedAt ? '<em class="arrived">도착완료</em>' : `<button type="button" class="order-arrival-btn" data-id="${escapeHtml(order.id)}" data-idx="${idx}">택배 도착</button>`}</span>`).join("")}</div></td>
          <td>${escapeHtml(order.author || "-")}</td>
          <td class="tr">${money(order.total || order.paymentAmount)} 원</td>
          <td>
            <div class="ibtns">
              <button type="button" class="ibtn order-history-view" data-id="${escapeHtml(order.id)}"><i class="fa-solid fa-eye"></i> 보기</button>
              <button type="button" class="ibtn order-history-print" data-id="${escapeHtml(order.id)}" style="color:#0284c7"><i class="fa-solid fa-print"></i> 인쇄</button>
              ${(order.items || []).some((item) => !(item.receivedAt || item.inventoryAddedAt)) ? `<button type="button" class="ibtn order-arrival-all-btn" data-id="${escapeHtml(order.id)}" style="color:#0f766e"><i class="fa-solid fa-boxes-packing"></i> 전체 도착</button>` : ""}
              <button type="button" class="ibtn order-history-download" data-id="${escapeHtml(order.id)}" style="color:#047857"><i class="fa-solid fa-download"></i> 다운로드</button>
              <button type="button" class="ibtn d order-history-delete" data-id="${escapeHtml(order.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
            </div>
          </td>
        </tr>
      `,
      )
      .join("");
    bindHistoryButtons();
  }

  async function loadOrders() {
    const body = $("order-history-body");
    if (!body) return;
    body.innerHTML =
      '<tr><td colspan="5" class="empty-td">발주서 기록을 불러오는 중입니다.</td></tr>';
    try {
      orders = await api("/api/orders");
      renderOrderHistory();
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
        setOrderPreviewVisible(true);
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
    document.querySelectorAll(".order-arrival-btn").forEach((button) =>
      button.addEventListener("click", () => receiveOrderItem(button.dataset.id, Number(button.dataset.idx))),
    );
    document.querySelectorAll(".order-arrival-all-btn").forEach((button) =>
      button.addEventListener("click", () => receiveOrderAll(button.dataset.id)),
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
    $("order-preview-close").addEventListener("click", () => setOrderPreviewVisible(false));
    $("order-preview-open").addEventListener("click", () => setOrderPreviewVisible(true));
    $("order-refresh").addEventListener("click", loadOrders);
    ["order-filter-search", "order-filter-start", "order-filter-end", "order-filter-arrival"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener(id === "order-filter-search" ? "input" : "change", renderOrderHistory);
      if (id === "order-filter-start" || id === "order-filter-end") {
        el.addEventListener("click", () => { if (el.showPicker) el.showPicker(); else el.focus(); });
        el.addEventListener("focus", () => { if (el.showPicker) { try { el.showPicker(); } catch (_) {} } });
      }
    });
    $("order-filter-reset") && $("order-filter-reset").addEventListener("click", () => {
      ["order-filter-search", "order-filter-start", "order-filter-end", "order-filter-arrival"].forEach((id) => {
        const el = $(id);
        if (el) el.value = "";
      });
      renderOrderHistory();
    });
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
    setOrderPreviewVisible(true);
    loadOrderInventoryRefs();
    if (location.hash === "#order") setTimeout(showOrderPage, 0);
  }

  document.addEventListener("DOMContentLoaded", initOrderPage);
})();

/* 2026-06-27 UI only: 모바일 사이드바 토글 보조 로직
   - 저장/수정/삭제/조회/인쇄/엑셀/API 로직은 변경하지 않음
   - 기존 탭 버튼 ID와 이벤트는 유지하고, 모바일에서 메뉴 열기/닫기 class만 토글 */
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const main = document.getElementById("main-content");
    const toggle = document.getElementById("mobile-menu-toggle");
    const backdrop = document.getElementById("mobile-menu-backdrop");
    if (!main || !toggle) return;

    const closeMenu = () => main.classList.remove("mobile-nav-open");
    const toggleMenu = () => main.classList.toggle("mobile-nav-open");

    toggle.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleMenu();
    });

    backdrop && backdrop.addEventListener("click", closeMenu);

    document.querySelectorAll("#main-content nav .tab").forEach((btn) => {
      btn.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeMenu();
    });
  });


  // ===== easy text/backup preview import =====
  let easyImportMode = "";
  let easyImportPreviewData = null;

  function importNotify(title, message) {
    if (typeof window !== "undefined") {
      window.alert(`${title || "알림"}\n\n${message || ""}`);
    }
  }

  function importGetToken() {
    try {
      return sessionStorage.getItem("npo_session_token") || "";
    } catch (_) {
      return "";
    }
  }

  async function importApi(path, options) {
    options = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const token = importGetToken();
    if (token) headers.Authorization = "Bearer " + token;
    let response;
    try {
      response = await fetch("https://naepo-back.onrender.com" + path, Object.assign({}, options, { headers }));
    } catch (_) {
      throw new Error("서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태를 확인해주세요.");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error((data && data.error) || `서버 오류 (${response.status})`);
    return data;
  }

  function importAdminPassword() {
    const input = document.getElementById("admin-pw");
    const v = input && input.value ? input.value.trim() : "";
    if (v) return v;
    try {
      return sessionStorage.getItem("naepo_admin_password") || "";
    } catch (_) {
      return "";
    }
  }

  function importMoney(value) {
    const n = Number(String(value == null ? 0 : value).replace(/[,원\s]/g, ""));
    return (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR");
  }


  function importNotify(title, message) {
    const text = `${title || "알림"}\n\n${message || ""}`;
    if (typeof window !== "undefined" && window.alert) window.alert(text);
  }

  function importMoney(value) {
    const n = Number(String(value == null ? 0 : value).replace(/[,원\s]/g, ""));
    return (Number.isFinite(n) ? n : 0).toLocaleString("ko-KR");
  }


  function parseEasyKeyValueLine(line) {
    const obj = {};
    String(line || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const idx = part.indexOf(":");
        if (idx < 0) return;
        const key = part.slice(0, idx).trim().replace(/^\d+\./, "");
        let value = part.slice(idx + 1).trim();
        if (/^(공란|빈칸|없음|skip|넘어감)$/i.test(value)) value = "";
        obj[key] = value;
      });
    return obj;
  }

  function toNumberLoose(value) {
    if (value === null || value === undefined) return 0;
    const n = Number(String(value).replace(/[,원\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeEasyBlank(value) {
    const v = String(value == null ? "" : value).trim();
    if (!v || /^(공란|빈칸|없음|skip|넘어감|x)$/i.test(v)) return "";
    return v;
  }

  function parseEasySupplier(value) {
    const v = normalizeEasyBlank(value).replace(/\s/g, "");
    if (!v || v === "1" || /내포/.test(v)) return "naepo";
    if (v === "2" || /동아|아세아/.test(v)) return "donga";
    return "naepo";
  }

  function formatDateForInput(value) {
    const raw = normalizeEasyBlank(value);
    const today = new Date();
    const fallback = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!raw) return fallback;
    const nums = raw.match(/\d+/g);
    if (!nums || nums.length < 3) return fallback;
    const y = nums[0].length === 2 ? "20" + nums[0] : nums[0];
    const m = String(nums[1]).padStart(2, "0");
    const d = String(nums[2]).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseEasyCategory(value) {
    const raw = normalizeEasyBlank(value) || "일반-판매";
    const parts = raw.split(/[:\-\/>]+/).map((x) => x.trim()).filter(Boolean);
    let oil = false;
    let major = "일반";
    let sub = "판매";
    if (parts[0] && /급유기/.test(parts[0])) {
      oil = true;
      major = parts[1] || "계통";
      sub = parts[2] || "중앙회";
    } else {
      major = parts[0] || "일반";
      sub = parts[1] || (major === "일반" ? "판매" : "중앙회");
    }
    if (/일반/.test(major)) major = "일반";
    else if (/계통/.test(major)) major = "계통";
    else if (/자체/.test(major)) major = "자체";
    const label = `${oil ? "급유기 " : ""}${major} [${sub}]`;
    return { major, sub, oil, label };
  }

  function parseEasyRecordText(text) {
    const groups = [];
    let current = null;
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const match = line.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          current = {
            no: match[1],
            meta: {
              supplier: "naepo",
              date: formatDateForInput(""),
              author: "",
              company: "-",
              name: "-",
              region: "미지정",
              category: parseEasyCategory("일반-판매"),
              payMethod: "미기재",
            },
            items: [],
          };
          groups.push(current);
          line = match[2].trim();
        }
        if (!current) {
          current = {
            no: String(groups.length + 1),
            meta: {
              supplier: "naepo",
              date: formatDateForInput(""),
              author: "",
              company: "-",
              name: "-",
              region: "미지정",
              category: parseEasyCategory("일반-판매"),
              payMethod: "미기재",
            },
            items: [],
          };
          groups.push(current);
        }

        const data = parseEasyKeyValueLine(line);
        if ("공급자" in data) current.meta.supplier = parseEasySupplier(data["공급자"]);
        if ("작성일자" in data || "날짜" in data) current.meta.date = formatDateForInput(data["작성일자"] || data["날짜"]);
        if ("작성자" in data || "담당자" in data) current.meta.author = normalizeEasyBlank(data["작성자"] || data["담당자"]);
        if ("거래대분류" in data || "분류" in data || "거래분류" in data || "카테고리" in data) {
          current.meta.category = parseEasyCategory(data["거래대분류"] || data["분류"] || data["거래분류"] || data["카테고리"]);
        }
        if ("상호" in data || "거래처" in data || "업체명" in data) {
          current.meta.company = normalizeEasyBlank(data["상호"] || data["거래처"] || data["업체명"]) || "-";
        }
        if ("고객명" in data || "성명" in data || "이름" in data) {
          current.meta.name = normalizeEasyBlank(data["고객명"] || data["성명"] || data["이름"]) || "-";
        }
        if ("지역" in data) current.meta.region = normalizeEasyBlank(data["지역"]) || "미지정";
        if ("결제수단" in data || "결제" in data) current.meta.payMethod = normalizeEasyBlank(data["결제수단"] || data["결제"]) || "미기재";

        const itemName = data["품목"] || data["품목명"] || data["item"] || "";
        if (!itemName) return;
        const qty = toNumberLoose(data["수량"] || data["qty"] || 1) || 1;
        const amount = toNumberLoose(data["공급가액"] || data["금액"] || data["amount"]);
        const price = toNumberLoose(data["단가"] || data["price"]) || (qty ? Math.round(amount / qty) : 0);
        const tax = toNumberLoose(data["세액"] || data["tax"]);
        current.items.push({
          item: normalizeEasyBlank(itemName),
          spec: normalizeEasyBlank(data["규격"] || data["규격사항"] || data["spec"]) || "-",
          qty,
          price,
          amount: amount || price * qty,
          tax,
          note: normalizeEasyBlank(data["품목비고"] || data["비고"] || data["note"]) || "",
        });
      });
    return groups.filter((g) => g.items.length);
  }

  function parseEasyInventoryText(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        line = line.replace(/^\d+\.\s*/, "");
        const data = parseEasyKeyValueLine(line);
        const name = data["품목"] || data["품목명"] || data["재고명"] || data["name"] || "";
        if (!name) return null;
        return {
          name,
          spec: data["규격"] || data["규격사항"] || data["spec"] || "",
          unitPrice: toNumberLoose(data["단가"] || data["가격"] || data["unitPrice"]),
          stock: toNumberLoose(data["재고"] || data["수량"] || data["stock"]),
          minStock: toNumberLoose(data["최소재고"] || data["최소"] || data["minStock"]),
          note: data["비고"] || data["메모"] || data["note"] || "",
        };
      })
      .filter(Boolean);
  }

  function safeText(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openEasyImport(mode, payload) {
    easyImportMode = mode;
    easyImportPreviewData = null;
    const modal = document.getElementById("easy-import-modal");
    const title = document.getElementById("easy-import-title");
    const desc = document.getElementById("easy-import-desc");
    const text = document.getElementById("easy-import-text");
    const result = document.getElementById("easy-import-result");
    const apply = document.getElementById("easy-import-apply");
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    if (result) result.innerHTML = "";
    if (apply) apply.disabled = true;
    if (mode === "records") {
      title.innerHTML = '<i class="fa-solid fa-file-import"></i> 텍스트 명세서 가져오기';
      desc.innerHTML = "명세서 첫 줄에 공급자/날짜/작성자/분류/고객명/결제수단/품목을 함께 적고, 다음 줄부터 품목을 추가할 수 있습니다. <br><b>공급자 1=내포농기계, 2=동아아세아농기계</b>";
      text.style.display = "";
      text.value = payload || "";
      setTimeout(() => text.focus(), 50);
    } else if (mode === "inventory") {
      title.innerHTML = '<i class="fa-solid fa-boxes-stacked"></i> 텍스트 재고 가져오기';
      desc.innerHTML = "한 줄에 한 품목씩 입력합니다. <br><b>양식: 품목명:부품명/규격:규격/재고:현재고/단가:금액/최소재고:숫자/비고:메모</b>";
      text.style.display = "";
      text.value = payload || "";
      setTimeout(() => text.focus(), 50);
    } else if (mode === "backup") {
      title.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 백업파일 미리보기';
      desc.textContent = "JSON/SQL 백업 파일 내용을 바로 복원하지 않고 먼저 미리보기합니다.";
      text.value = "";
      text.style.display = "none";
      easyImportPreviewData = payload;
      renderBackupPreview(payload);
      if (apply) apply.disabled = false;
    }
  }

  function closeEasyImport() {
    const modal = document.getElementById("easy-import-modal");
    if (!modal) return;
    if (document.activeElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    const text = document.getElementById("easy-import-text");
    if (text) text.style.display = "";
    easyImportMode = "";
    easyImportPreviewData = null;
  }

  function renderRecordImportPreview(groups) {
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
    const supplierLabel = (key) => key === "donga" ? "2 · 동아아세아농기계" : "1 · 내포농기계";
    document.getElementById("easy-import-result").innerHTML = `
      <div class="import-summary">명세서 ${groups.length}건 · 품목 ${totalItems}줄을 미리보기했습니다. 적용하면 거래내역에 저장됩니다.</div>
      <div class="import-preview-list">
        ${groups.map((g, idx) => `
          <div class="import-preview-card">
            <strong>명세서 #${idx + 1}</strong>
            <div class="import-meta-line">
              <span>공급자: ${supplierLabel(g.meta.supplier)}</span>
              <span>작성일자: ${safeText(g.meta.date)}</span>
              <span>작성자: ${safeText(g.meta.author || "공란")}</span>
              <span>고객명: ${safeText(g.meta.name)}</span>
              <span>분류: ${safeText(g.meta.category.label)}</span>
              <span>결제: ${safeText(g.meta.payMethod)}</span>
            </div>
            <table><thead><tr><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>비고</th></tr></thead>
            <tbody>${g.items.map((it) => `<tr><td>${safeText(it.item)}</td><td>${safeText(it.spec)}</td><td>${it.qty}</td><td>${importMoney(it.price)}</td><td>${importMoney(it.amount)}</td><td>${importMoney(it.tax)}</td><td>${safeText(it.note)}</td></tr>`).join("")}</tbody></table>
          </div>`).join("")}
      </div>`;
  }

  function renderInventoryImportPreview(parts) {
    document.getElementById("easy-import-result").innerHTML = `
      <div class="import-summary">재고 ${parts.length}건을 미리보기했습니다. 적용하면 재고현황에 등록됩니다.</div>
      <div class="import-preview-card">
        <table><thead><tr><th>품목명</th><th>규격</th><th>단가</th><th>재고</th><th>최소재고</th><th>비고</th></tr></thead>
        <tbody>${parts.map((p) => `<tr><td>${safeText(p.name)}</td><td>${safeText(p.spec)}</td><td>${importMoney(p.unitPrice)}</td><td>${importMoney(p.stock)}</td><td>${importMoney(p.minStock)}</td><td>${safeText(p.note)}</td></tr>`).join("")}</tbody></table>
      </div>`;
  }

  function renderBackupPreview(data) {
    const records = Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : [];
    const parts = Array.isArray(data.parts) ? data.parts : [];
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const groups = Array.isArray(data.groups) ? data.groups : [];
    const orderLog = Array.isArray(data.orderLog) ? data.orderLog : [];
    const inventoryLog = Array.isArray(data.inventoryLog) ? data.inventoryLog : [];
    const printLog = Array.isArray(data.printLog) ? data.printLog : [];
    document.getElementById("easy-import-result").innerHTML = `
      <div class="import-summary">백업파일 미리보기: 거래내역 ${records.length}건 · 재고 ${parts.length}건 · 거래처 ${customers.length}건 · 부품그룹 ${groups.length}건 · 입출고 ${inventoryLog.length}건 · 발주서 ${orderLog.length}건 · 인쇄기록 ${printLog.length}건</div>
      <div class="import-preview-grid">
        <div class="import-preview-card"><strong>거래내역 샘플</strong><table><tbody>${records.slice(0,5).map((r) => `<tr><td>${safeText(r.date)}</td><td>${safeText(r.company || r.name)}</td><td>${safeText(r.note || r.part)}</td><td class="tr">${importMoney(r.amount || 0)}</td></tr>`).join("") || '<tr><td>없음</td></tr>'}</tbody></table></div>
        <div class="import-preview-card"><strong>재고 샘플</strong><table><tbody>${parts.slice(0,5).map((p) => `<tr><td>${safeText(p.name)}</td><td>${safeText(p.spec)}</td><td class="tr">${importMoney(p.stock || 0)}</td></tr>`).join("") || '<tr><td>없음</td></tr>'}</tbody></table></div>
        <div class="import-preview-card"><strong>거래처 샘플</strong><table><tbody>${customers.slice(0,5).map((c) => `<tr><td>${safeText(c.company || c.name)}</td><td>${safeText(c.name)}</td><td>${safeText(c.region)}</td></tr>`).join("") || '<tr><td>없음</td></tr>'}</tbody></table></div>
        <div class="import-preview-card"><strong>발주서 샘플</strong><table><tbody>${orderLog.slice(0,5).map((o) => `<tr><td>${safeText(o.orderDate)}</td><td>${safeText(o.title)}</td><td class="tr">${importMoney(o.total || 0)}</td></tr>`).join("") || '<tr><td>없음</td></tr>'}</tbody></table></div>
      </div>`;
  }

  async function applyRecordImport(groups) {
    let saved = 0;
    for (const group of groups) {
      const amount = group.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
      const tax = group.items.reduce((sum, it) => sum + (Number(it.tax) || 0), 0);
      const meta = group.meta || {};
      const catInfo = meta.category || parseEasyCategory("일반-판매");
      const rec = {
        id: "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9),
        date: meta.date || formatDateForInput(""),
        author: meta.author || "",
        supplier: meta.supplier || "naepo",
        company: meta.company || "-",
        name: meta.name || "-",
        region: meta.region || "미지정",
        cat: catInfo.major || "일반",
        part: catInfo.label || "일반 [판매]",
        payMethod: meta.payMethod || "미기재",
        status: "done",
        note: group.items[0].item + (group.items.length > 1 ? ` 외 ${group.items.length - 1}건` : ""),
        amount,
        tax,
        items: group.items,
      };
      await importApi("/api/records", { method: "POST", body: JSON.stringify(rec) });
      saved++;
    }
    closeEasyImport();
    importNotify("텍스트 명세서 적용 완료", `${saved}건의 명세서를 거래내역에 저장했습니다. 화면을 새로고침합니다.`);
    setTimeout(() => location.reload(), 200);
  }

  async function applyInventoryImport(parts) {
    let created = 0;
    let updated = 0;
    let failed = 0;
    let existingParts = [];
    try {
      const loaded = await importApi("/api/parts?limit=500");
      existingParts = Array.isArray(loaded) ? loaded : Array.isArray(loaded.items) ? loaded.items : [];
    } catch (_) {
      existingParts = [];
    }
    const findExisting = (name) =>
      existingParts.find((p) => String(p.name || "").trim() === String(name || "").trim());

    for (const part of parts) {
      try {
        const existing = findExisting(part.name);
        if (existing && existing.id) {
          await importApi("/api/parts/" + encodeURIComponent(existing.id), {
            method: "PUT",
            body: JSON.stringify({
              name: part.name,
              spec: part.spec,
              unitPrice: part.unitPrice,
              minStock: part.minStock,
              note: part.note,
            }),
          });
          if (Number.isFinite(Number(part.stock))) {
            await importApi("/api/parts/" + encodeURIComponent(existing.id) + "/adjust", {
              method: "POST",
              body: JSON.stringify({
                newStock: Number(part.stock) || 0,
                note: "텍스트 재고 가져오기 재고 보정",
              }),
            });
          }
          Object.assign(existing, part, { id: existing.id });
          updated++;
        } else {
          const saved = await importApi("/api/parts", { method: "POST", body: JSON.stringify(part) });
          existingParts.push(saved || part);
          created++;
        }
      } catch (error) {
        failed++;
      }
    }
    closeEasyImport();
    importNotify(
      "텍스트 재고 적용 완료",
      `신규 ${created}건, 기존수정 ${updated}건${failed ? `, 실패 ${failed}건` : ""} 처리했습니다. 화면을 새로고침합니다.`
    );
    setTimeout(() => location.reload(), 200);
  }

  async function applyBackupPreview(data) {
    const records = Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : [];
    if (!Array.isArray(records)) return importNotify("복원 실패", "records 배열이 있는 JSON/SQL 백업만 복원할 수 있습니다.");
    try {
      const result = await importApi("/api/restore", {
        method: "POST",
        headers: { "X-Admin-Password": importAdminPassword() },
        body: JSON.stringify({
          records,
          parts: data.parts,
          inventoryLog: data.inventoryLog,
          orderLog: data.orderLog,
          customers: data.customers,
          groups: data.groups,
          printLog: data.printLog,
          mode: "merge",
        }),
      });
      closeEasyImport();
      importNotify("복원 완료", `${result.restored || records.length}건의 거래내역을 포함해 백업 데이터를 병합했습니다. 화면을 새로고침합니다.`);
      setTimeout(() => location.reload(), 200);
    } catch (error) {
      importNotify("복원 실패", error.message);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const byId = (id) => document.getElementById(id);
    byId("btn-easy-record-import") && byId("btn-easy-record-import").addEventListener("click", () => openEasyImport("records"));
    byId("btn-easy-inventory-import") && byId("btn-easy-inventory-import").addEventListener("click", () => openEasyImport("inventory"));
    byId("easy-import-close") && byId("easy-import-close").addEventListener("click", closeEasyImport);
    byId("easy-import-sample") && byId("easy-import-sample").addEventListener("click", () => {
      const text = byId("easy-import-text");
      if (!text) return;
      if (easyImportMode === "inventory") {
        text.value = "품목명:DMC-800F 액제탱크 세트/규격:800F/재고:3/단가:60000/최소재고:1/비고:\n품목명:OT-20L 오성 분무기/규격:20L/재고:5/단가:100000/최소재고:1/비고:\n품목명:패킹/규격:/재고:10/단가:18000/최소재고:2/비고:";
      } else {
        text.value = "1.공급자:2/작성일자:2026.06월.26일/작성자:현장기사/거래대분류:일반-판매/고객명:안광주/지역:미지정/결제수단:계좌이체/품목:DMC-800F 액제탱크 세트/규격:/수량:1/단가:60000/공급가액:60000/세액:0/품목비고:\n품목:OT-20L 오성 분무기/규격:/수량:1/단가:100000/공급가액:100000/세액:0/품목비고:\n2.공급자:1/작성일자:/작성자:/거래대분류:일반-수리/고객명:이회봉/결제수단:외상/품목:패킹/규격:/수량:1/단가:18000/공급가액:18000/세액:0/품목비고:";
      }
    });
    byId("easy-import-preview") && byId("easy-import-preview").addEventListener("click", () => {
      const text = byId("easy-import-text").value;
      try {
        if (easyImportMode === "records") {
          const groups = parseEasyRecordText(text);
          if (!groups.length) return importNotify("미리보기 실패", "인식된 명세서 품목이 없습니다.");
          easyImportPreviewData = groups;
          renderRecordImportPreview(groups);
          byId("easy-import-apply").disabled = false;
        } else if (easyImportMode === "inventory") {
          const parts = parseEasyInventoryText(text);
          if (!parts.length) return importNotify("미리보기 실패", "인식된 재고 품목이 없습니다.");
          easyImportPreviewData = parts;
          renderInventoryImportPreview(parts);
          byId("easy-import-apply").disabled = false;
        }
      } catch (error) {
        importNotify("미리보기 실패", error.message || "텍스트를 해석하지 못했습니다.");
      }
    });
    byId("easy-import-apply") && byId("easy-import-apply").addEventListener("click", async () => {
      if (!easyImportPreviewData) return;
      if (easyImportMode === "records") return applyRecordImport(easyImportPreviewData);
      if (easyImportMode === "inventory") return applyInventoryImport(easyImportPreviewData);
      if (easyImportMode === "backup") return applyBackupPreview(easyImportPreviewData);
    });
    byId("list-body") && byId("list-body").addEventListener("click", (ev) => {
      if (ev.target.closest("button,a,input,label,.inline-record-preview-row")) return;
      const row = ev.target.closest("tr[data-record-id]");
      if (!row) return;
      const chk = row.querySelector(".chk-row");
      if (!chk) return;
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });


  // ===== inventory/log row blank-area checkbox toggle v13 =====
  window.addEventListener("DOMContentLoaded", () => {
    const bindRowToggle = (containerSelector, checkboxSelector, skipSelector) => {
      document.querySelectorAll(containerSelector).forEach((container) => {
        if (container.dataset.rowToggleBound === "1") return;
        container.dataset.rowToggleBound = "1";
        container.addEventListener("click", (ev) => {
          if (ev.target.closest(skipSelector)) return;
          const row = ev.target.closest("tr");
          if (!row || !container.contains(row)) return;
          const chk = row.querySelector(checkboxSelector);
          if (!chk) return;
          chk.checked = !chk.checked;
          chk.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    };

    bindRowToggle(
      "#parts-body, #inventory-body, #part-list-body, #stock-body",
      'input[type="checkbox"], .chk-part, .chk-parts, .chk-stock, .part-check',
      "button,a,input,label,select,textarea"
    );

    bindRowToggle(
      "#invlog-body, #inventory-log-body, #inout-body, #stock-log-body",
      'input[type="checkbox"], .chk-invlog, .chk-log, .invlog-check',
      "button,a,input,label,select,textarea"
    );
  });

})();
