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
      naepo_repair_log: "repairLog",
      naepo_subsidy_projects: "subsidyProjects",
      naepo_subsidy_project_registry: "subsidyProjectRegistry",
      naepo_daily_settlements: "dailySettlements",
      naepo_restore_history: "restoreHistory",
    };
    const parsed = { records: [], customers: [], groups: [], parts: [], inventoryLog: [], printLog: [], orderLog: [], repairLog: [], subsidyProjects: [], subsidyProjectRegistry: [], dailySettlements: [], restoreHistory: [] };
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
    if (!parsed.records.length && !parsed.parts.length && !parsed.customers.length && !parsed.orderLog.length && !parsed.repairLog.length && !parsed.subsidyProjects.length && !parsed.subsidyProjectRegistry.length && !parsed.dailySettlements.length && !parsed.restoreHistory.length) {
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
          },
          itemInput = t.querySelector(".p-item"),
          syncPartFromInput = () => {
            const raw = String(itemInput.value || "").trim();
            const base = stripInvoiceGroupPrefix(raw);
            const part = nt.find((p) => String(p.name || "").trim() === raw) || nt.find((p) => String(p.name || "").trim() === base);
            if (!part) {
              delete t.dataset.partId;
              return;
            }
            t.dataset.partId = part.id || "";
            const specInput = t.querySelector(".p-spec");
            const priceInput = t.querySelector(".p-price");
            if (specInput && !specInput.value) specInput.value = part.spec || "";
            if (priceInput && (!parseFloat(priceInput.value) || Number(priceInput.value) === 0)) {
              priceInput.value = Number(part.unitPrice || 0);
              priceInput.dispatchEvent(new Event("input"));
            }
          };
        (itemInput.addEventListener("change", syncPartFromInput),
          itemInput.addEventListener("blur", syncPartFromInput),
          e.addEventListener("input", l),
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
    (["f-author", "f-company", "f-name", "f-phone", "f-region"].forEach((t) => {
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
            partId: t.dataset.partId || "",
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
      phone: (document.getElementById("f-phone") ? document.getElementById("f-phone").value.trim() : "") || "",
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
            pnum = (t.phone || "").toLowerCase().includes(a),
            o = (t.note || "").toLowerCase().includes(a),
            s = (t.author || "").toLowerCase().includes(a),
            l = (t.part || "").toLowerCase().includes(a);
          if (!(e || n || pnum || o || s || l)) return !1;
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
      ((e.innerHTML = `\n          <td><input type="checkbox" class="chk-row" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px;"/></td>\n          <td>${n(t.date)}</td>\n          <td>${n(t.author)}</td>\n          <td>${t.company && "-" !== t.company ? `<strong>${n(t.company)}</strong><span style="font-size:10.5px;color:#64748b"> / ${n(t.name)}</span>` : `<strong>${n(t.name)}</strong>`}${t.phone ? `<div class="record-phone-mini"><i class="fa-solid fa-phone"></i> ${n(t.phone)}</div>` : ""}</td>\n          <td><span class="badge bn">${n(t.region)}</span></td>\n          <td><span class="badge bo">${n(t.part)}</span></td>\n          <td style="font-weight:600; text-align:left;" title="${n(t.note)}">${n(t.note)}</td>\n          <td style="text-align:center;">\n            <button class="ibtn btn-status-toggle" data-id="${n(t.id)}" data-status="${n(t.status || "done")}" style="${"pending" === t.status ? "color:#dc2626;border-color:#fecaca;background:#fef2f2;" : "color:#047857;border-color:#a7f3d0;background:#f0fdf4;"}">\n              ${"pending" === t.status ? '<i class="fa-solid fa-clock"></i> 미완료' : '<i class="fa-solid fa-circle-check"></i> 완료'}\n            </button>\n          </td>\n          <td style="text-align:center;">${"외상" === t.payMethod ? (t.collected ? '<span class="credit-badge credit-paid"><i class="fa-solid fa-circle-check"></i> 외상 지급됨</span>' : '<span class="credit-badge credit-unpaid"><i class="fa-solid fa-triangle-exclamation"></i> 외상 미완료</span>') : '<span style="color:#cbd5e1;font-size:12px;">-</span>'}</td>\n          <td class="tr">${(t.amount || 0).toLocaleString()}</td>\n          <td class="tr">${(t.tax || 0).toLocaleString()}</td>
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
                (document.getElementById("f-phone").value =
                  t.phone || ""),
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
  function getSettlementTargetRecords() {
    const checked = Array.from(document.querySelectorAll(".chk-row:checked"));
    if (checked.length > 0) {
      const ids = new Set(checked.map((el) => String(el.getAttribute("data-id") || "")));
      return { mode: "selected", rows: t.filter((row) => ids.has(String(row.id))) };
    }
    return { mode: "filtered", rows: Array.isArray(f) ? f : [] };
  }

  function showSettlementSummary() {
    const target = getSettlementTargetRecords();
    const rows = target.rows || [];
    if (!rows.length) {
      return I("정산할 내역 없음", "현재 선택되었거나 조회된 명세서가 없습니다.");
    }
    const sum = rows.reduce((acc, row) => {
      const supply = Number(row.amount) || 0;
      const tax = Number(row.tax) || 0;
      const total = supply + tax;
      const pay = row.payMethod || "미기재";
      acc.supply += supply;
      acc.tax += tax;
      acc.total += total;
      acc.byPay[pay] = (acc.byPay[pay] || 0) + total;
      if (pay === "외상") {
        acc.creditTotal += total;
        if (row.collected) acc.creditPaid += total;
        else acc.creditUnpaid += total;
      }
      return acc;
    }, { supply: 0, tax: 0, total: 0, byPay: {}, creditTotal: 0, creditPaid: 0, creditUnpaid: 0 });
    const payLines = ["현금", "카드", "계좌이체", "외상", "미기재"]
      .filter((key) => sum.byPay[key])
      .map((key) => `${key}: ${sum.byPay[key].toLocaleString()}원`)
      .join("\n");
    const title = target.mode === "selected" ? "선택 명세서 정산" : "조회 결과 정산";
    const message =
      `대상: ${rows.length}건\n` +
      `공급가액: ${sum.supply.toLocaleString()}원\n` +
      `세액: ${sum.tax.toLocaleString()}원\n` +
      `합계: ${sum.total.toLocaleString()}원\n\n` +
      `[결제수단별]\n${payLines || "결제수단 없음"}\n\n` +
      `[외상]\n` +
      `외상 총액: ${sum.creditTotal.toLocaleString()}원\n` +
      `수금완료: ${sum.creditPaid.toLocaleString()}원\n` +
      `미수금: ${sum.creditUnpaid.toLocaleString()}원`;
    I(title, message);
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
      phone = t.phone ? n(t.phone) : "",
      d = t.region && "미지정" !== t.region ? n(t.region) : "",
      r = n(t.part || ""),
      p = Math.max(5, t.items.length),
      itemCount = Array.isArray(t.items) ? t.items.length : 0,
      denseClass = itemCount >= 14 ? " tfs-ultra" : itemCount >= 10 ? " tfs-dense" : itemCount >= 7 ? " tfs-compact" : "",
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
        denseClass +
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
        '</td><td class="tfs-k">사업장<br/>주&nbsp;소</td><td class="tfs-v"></td><td class="tfs-k">전화<br/>번호</td><td class="tfs-vb" style="font-size:9px;letter-spacing:0;white-space:nowrap;">' +
        phone +
        '</td></tr><tr><td class="tfs-k">업&nbsp;태</td><td class="tfs-v">' +
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
        '일</td><td class="tfs-mid-k">요청사항</td><td class="tfs-mid-r">&nbsp;</td></tr></table><table class="tfs-item-table"><colgroup><col style="width:8%"/><col style="width:24%"/><col style="width:10%"/><col style="width:7%"/><col style="width:13%"/><col style="width:16%"/><col style="width:12%"/><col style="width:10%"/></colgroup><tr><td class="tfs-ih">월&nbsp;일</td><td class="tfs-ih">품&nbsp;&nbsp;목</td><td class="tfs-ih">규&nbsp;격</td><td class="tfs-ih">수&nbsp;량</td><td class="tfs-ih">단&nbsp;가</td><td class="tfs-ih">공급가액</td><td class="tfs-ih">세&nbsp;액</td><td class="tfs-ih">비&nbsp;고</td></tr>' +
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
    e.classList.add("pf-active");

    // 일반 거래명세서(공급자/받는자/단일)는 전체를 축소하지 않습니다.
    // 품목이 많을 때 전체가 작아져 읽기 어려워지는 문제가 있어,
    // 줄 높이와 품목 영역 CSS로 맞추고 scale은 항상 1로 고정합니다.
    if (!e.querySelector(".lp-page")) {
      e.style.setProperty("--pscale", "1");
      e.offsetHeight;
      return;
    }

    // 선택일괄인쇄는 1페이지 2장 구조를 유지해야 하므로 기존 자동 축소 유지
    e.style.setProperty("--pscale", "1");
    e.offsetHeight;
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
      repair: "page-repair",
      subsidy: "page-subsidy",
      daily: "page-daily-report",
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
    document.getElementById("tab-subsidy") &&
      document.getElementById("tab-subsidy").addEventListener("click", () => {
        J("subsidy");
        if (window.NaepoSubsidyV49 && window.NaepoSubsidyV49.load) window.NaepoSubsidyV49.load();
      }),
    document.getElementById("tab-daily") &&
      document.getElementById("tab-daily").addEventListener("click", () => {
        J("daily");
        if (window.NaepoDailyReport && window.NaepoDailyReport.render) window.NaepoDailyReport.render();
      }),
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
    document.getElementById("btn-settlement-summary") &&
      document.getElementById("btn-settlement-summary").addEventListener("click", showSettlementSummary),
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
      const totalCount = records.length + (Array.isArray(data.parts) ? data.parts.length : 0) + (Array.isArray(data.customers) ? data.customers.length : 0) + (Array.isArray(data.orderLog) ? data.orderLog.length : 0) + (Array.isArray(data.repairLog) ? data.repairLog.length : 0) + (Array.isArray(data.subsidyProjects) ? data.subsidyProjects.length : 0) + (Array.isArray(data.subsidyProjectRegistry) ? data.subsidyProjectRegistry.length : 0) + (Array.isArray(data.dailySettlements) ? data.dailySettlements.length : 0) + (Array.isArray(data.restoreHistory) ? data.restoreHistory.length : 0);
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
              repairLog: data.repairLog,
              subsidyProjects: data.subsidyProjects,
              subsidyProjectRegistry: data.subsidyProjectRegistry,
              dailySettlements: data.dailySettlements,
              restoreHistory: data.restoreHistory,
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
        if (result && result.skipped && result.reason === "running") {
          I("이메일 백업 진행 중", result.message || "이미 이전 이메일 백업 전송이 진행 중입니다. 잠시 후 다시 시도해주세요.");
        } else {
          I("수동 이메일 백업 전송", result && result.message ? result.message : "백업 메일 전송을 요청했습니다.");
        }
      } catch (error) { I("이메일 백업 실패", error.message); }
    }),
    document.getElementById("admin-btn-save-current") && document.getElementById("admin-btn-save-current").addEventListener("click", async () => {
      S("현재 데이터 전체저장", "현재 화면/서버에 남아있는 데이터를 JSON 미러와 PostgreSQL에 강제로 저장합니다.\n삭제한 데이터가 업데이트 후 다시 살아나는 문제를 줄이기 위한 기능입니다. 계속할까요?", async () => {
        try {
          const result = await adminJson("/api/admin/save-current-data", { method: "POST", body: JSON.stringify({}) });
          const c = result.counts || {};
          I("현재 데이터 전체저장 완료", `저장 완료\n거래 ${c.records || 0}건 · 거래처 ${c.customers || 0}건 · 재고 ${c.parts || 0}건 · 입출고 ${c.inventoryLog || 0}건 · 보조사업 ${c.subsidyProjects || 0}건\n스냅샷: ${result.snapshotFile || "-"}`);
          await loadAdminActionLog();
        } catch (error) { I("현재 데이터 전체저장 실패", error.message); }
      }, () => {});
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


  function formatInvoicePartNameWithGroup(groupName, partName) {
    const g = String(groupName || "").trim();
    const p = String(partName || "").trim();
    if (!g || !p) return p;
    if (p.startsWith(`[${g}]`)) return p;
    return `[${g}]${p}`;
  }

  function stripInvoiceGroupPrefix(name) {
    return String(name || "").replace(/^\[[^\]]+\]\s*/, "").trim();
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
          <div class="field"><label>보관 위치</label><input type="text" id="pem-location" value="${n(part.storageLocation || part.location || "")}" placeholder="예: A-1" /></div>
          <div class="field"><label>물품 구분</label><select id="pem-class">
            <option value="일반판매" ${(part.inventoryClass || part.itemClass || part.saleType || "일반판매") === "일반판매" ? "selected" : ""}>일반판매</option>
            <option value="계통물품" ${(part.inventoryClass || part.itemClass || part.saleType || "") === "계통물품" ? "selected" : ""}>계통물품</option>
            <option value="자체물품" ${(part.inventoryClass || part.itemClass || part.saleType || "") === "자체물품" ? "selected" : ""}>자체물품</option>
            <option value="수리부품" ${(part.inventoryClass || part.itemClass || part.saleType || "") === "수리부품" ? "selected" : ""}>수리부품</option>
            <option value="보조사업" ${(part.inventoryClass || part.itemClass || part.saleType || "") === "보조사업" ? "selected" : ""}>보조사업</option>
          </select></div>
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
      const storageLocation = overlay.querySelector("#pem-location").value.trim();
      const inventoryClass = overlay.querySelector("#pem-class").value || "일반판매";
      onConfirm && onConfirm({ name, spec, unitPrice, minStock, storageLocation, inventoryClass });
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
            return `<option value="${n(t.company || t.name)}" data-name="${n(t.name)}" data-company="${n(t.company)}" data-region="${n(t.region)}" data-phone="${n(t.phone || "")}">${n(e)}</option>`;
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
          '<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:20px;">등록된 부품이 없습니다.</td></tr>');
      const e = new Set(ot.flatMap((t) => t.partIds));
      let a = "";
      function o(t, e) {
        const a = t.stock <= t.minStock,
          o = a
            ? `<span class="badge-low">부족 (최소 ${t.minStock})</span>`
            : '<span class="badge-ok">정상</span>',
          s = e ? "padding-left:22px;" : "";
        return `\n          <tr>\n            <td style="text-align:center;"><input type="checkbox" class="chk-part" data-id="${n(t.id)}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px; margin:0 6px;"/></td>\n            <td style="${s}"><strong>${e ? "∟ " : ""}${n(t.name)}</strong><small class="part-row-timestamp">수정: ${n(String(t.updatedAt || t.createdAt || "").replace("T"," ").replace("Z","").slice(0,16) || "-")}</small></td>\n            <td>${n(t.spec || "-")}</td>\n            <td><span class="part-location-badge">${n(t.storageLocation || t.location || "-")}</span></td>\n            <td><span class="part-class-badge">${n(t.inventoryClass || t.itemClass || t.saleType || "일반판매")}</span></td>\n            <td class="tr">${t.unitPrice.toLocaleString()}원</td>\n            <td class="tr" style="font-weight:700;${a ? "color:#dc2626;" : ""}">${t.stock.toLocaleString()}</td>\n            <td class="tr">${t.minStock.toLocaleString()}</td>\n            <td>${o}</td>\n            <td>\n              <div class="ibtns">\n                <button class="ibtn btn-stock-in" data-id="${n(t.id)}" style="color:#0284c7;"><i class="fa-solid fa-truck-ramp-box"></i> 입고</button>\n                <button class="ibtn btn-stock-adjust" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-sliders"></i> 보정</button>\n                <button class="ibtn btn-part-group" data-id="${n(t.id)}" style="color:#7c3aed;"><i class="fa-solid fa-layer-group"></i> 그룹</button>\n                <button class="ibtn btn-part-edit" data-id="${n(t.id)}" style="color:#0ea5e9;"><i class="fa-solid fa-pen"></i> 수정</button>\n                <button class="ibtn d btn-part-delete" data-id="${n(t.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>\n              </div>\n            </td>\n          </tr>`;
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
        a += `<tr class="group-header-row" data-gid="${gid}" style="background:#f0fdf4;cursor:pointer;" title="클릭하여 접기/펼치기"><td colspan="10" style="padding:8px 14px;font-weight:700;font-size:12.5px;color:#065f46;border-top:2px solid #a7f3d0;"><i class="fa-solid fa-layer-group" style="margin-right:6px;"></i>${n(t.name)} <i class="fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-down"}" style="float:right;opacity:0.5;margin-top:2px;"></i></td></tr>`;
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
            '<tr style="background:#f8fafc;"><td colspan="10" style="padding:8px 14px;font-weight:700;font-size:12.5px;color:#64748b;border-top:2px solid #e2e8f0;"><i class="fa-solid fa-box" style="margin-right:6px;"></i>미분류 부품</td></tr>'),
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
          .map((t) => `<option value="${n(t.name)}" data-pid="${n(t.id || "")}" data-spec="${n(t.spec || "")}" data-price="${Number(t.unitPrice || 0)}"></option>`)
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
              storageLocation: (document.getElementById("part-location") && document.getElementById("part-location").value.trim()) || "",
              inventoryClass: (document.getElementById("part-class") && document.getElementById("part-class").value) || "일반판매",
            }),
          }),
            (document.getElementById("part-name").value = ""),
            (document.getElementById("part-spec").value = ""),
            (document.getElementById("part-price").value = ""),
            (document.getElementById("part-stock").value = ""),
            (document.getElementById("part-minstock").value = ""),
            document.getElementById("part-location") && (document.getElementById("part-location").value = ""),
            document.getElementById("part-class") && (document.getElementById("part-class").value = "일반판매"),
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
                  storageLocation: (n[5] || "").trim(),
                  inventoryClass: (n[6] || "일반판매").trim(),
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
          p = document.getElementById("f-phone"),
          a = document.getElementById("f-region");
        (n && e.dataset.name && !n.value && (n.value = e.dataset.name),
          p && e.dataset.phone && !p.value && (p.value = e.dataset.phone),
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
      if (String(e) === "__uncategorized_parts__") return;
      const a = ot.find((t) => t.id === e);
      if (!a || 0 === a.partIds.length)
        return void I("빈 그룹", "이 그룹에 등록된 부품이 없습니다.");
      const o = a.partIds
          .map((t) => nt.find((e) => e.id === t))
          .filter(Boolean),
        s = document.createElement("div");
      ((s.style.cssText =
        "position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;"),
        (s.innerHTML = `\n        <div class="group-apply-modal-box" style="background:#fff;border-radius:20px;padding:26px;min-width:720px;max-width:96vw;width:min(96vw,1040px);max-height:88vh;box-shadow:0 25px 50px -12px rgba(0,0,0,0.3);overflow:hidden;">\n          <h3 style="font-size:15px;font-weight:700;margin-bottom:4px;color:#065f46;"><i class="fa-solid fa-layer-group"></i> ${n(a.name)}</h3>\n          <p style="font-size:12px;color:#64748b;margin-bottom:14px;">추가할 품목을 선택하세요.</p>\n          <div id="group-modal-parts" class="group-apply-modal-list" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:68vh;overflow-y:auto;margin-bottom:18px;padding-right:4px;">\n            ${o.map((t) => `\n              <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f8fafc;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0;">\n                <input type="checkbox" class="group-modal-chk" data-pid="${n(t.id)}" style="accent-color:#047857;width:15px;height:15px;"/>\n                <span><strong>${n(t.name)}</strong> <span style="color:#64748b;font-size:11px;">${n(t.spec || "")}</span></span>\n                <span style="margin-left:auto;font-size:11.5px;color:#047857;">${(t.unitPrice || 0).toLocaleString()}원</span>\n              </label>`).join("")}\n          </div>\n          <div style="display:flex;gap:8px;justify-content:flex-end;">\n            <button id="group-modal-cancel" class="btn btn-o btn-sm">취소</button>\n            <button id="group-modal-ok" class="btn btn-p btn-sm"><i class="fa-solid fa-plus"></i> 선택 품목 추가</button>\n          </div>\n        </div>`),
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
                  row = n[n.length - 1];
                ((row.dataset.partId = e.id || ""),
                  (row.querySelector(".p-item").value = formatInvoicePartNameWithGroup(a.name, e.name)),
                  (row.querySelector(".p-spec").value = e.spec || ""),
                  (row.querySelector(".p-price").value = e.unitPrice || 0),
                  (row.querySelector(".p-qty").value = 1),
                  row
                    .querySelector(".p-price")
                    .dispatchEvent(new Event("input")));
              }),
              document.body.removeChild(s),
              (t.value = ""),
              M(`${e.length}개 품목이 추가되었습니다.`, "ok"))
            : I("선택 없음", "최소 1개 이상의 품목을 선택해주세요.");
        }));
    }),
    (function () {
      const groupSelect = document.getElementById("group-apply-select");
      const groupBtn = document.getElementById("btn-apply-group");
      if (!groupSelect || !groupBtn || groupSelect.dataset.autoOpenBound === "1") return;
      groupSelect.dataset.autoOpenBound = "1";
      const openSelectedGroup = () => {
        if (!groupSelect.value || window.__groupApplyOpening) return;
        window.__groupApplyOpening = true;
        setTimeout(() => {
          try { groupBtn.click(); }
          finally { setTimeout(() => { window.__groupApplyOpening = false; }, 250); }
        }, 0);
      };
      groupSelect.addEventListener("change", openSelectedGroup);
      groupSelect.addEventListener("input", openSelectedGroup);
      groupSelect.addEventListener("click", () => {
        if (groupSelect.value) openSelectedGroup();
        else {
          try { if (typeof groupSelect.showPicker === "function") groupSelect.showPicker(); } catch (_) {}
        }
      });
      groupSelect.addEventListener("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && groupSelect.value) {
          ev.preventDefault();
          openSelectedGroup();
        }
      });
    })(),
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


  async function deleteCurrentSubsidyProjectV65() {
    const projectName = activeProjectName();
    const projectYear = activeProjectYear();
    if (projectName === DEFAULT_PROJECT_NAME && rows.map(normalizeRow).filter((r) => rowProjectName(r) === projectName && rowProjectYear(r) === projectYear).length > 0) {
      if (!confirm(`${projectYear}년 ${projectName} 사업에는 명단이 있습니다.\n정말 이 사업 명단 전체를 삭제할까요?`)) return;
    } else if (!confirm(`${projectYear}년 ${projectName} 사업을 삭제할까요?`)) return;

    const password = prompt("삭제하려면 로그인 비밀번호를 입력해주세요.");
    if (!password) return;

    const result = await api("/api/subsidy-projects/delete-project", {
      method: "POST",
      body: JSON.stringify({ projectName, projectYear, password }),
    });

    removeProjectFromList(projectName, projectYear);
    if (projectName === activeProjectName()) {
      try { localStorage.setItem(PROJECT_KEY, DEFAULT_PROJECT_NAME); } catch (_) {}
    }
    alert(`${projectYear}년 ${projectName} 사업 삭제 완료\n삭제된 명단: ${result.deleted || 0}명`);
    await load();
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
    const title = escapeHtml(order.title || "발주서");
    const docHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${title}</title><style>${orderPrintCss()}</style></head><body><div class="order-print-page"><div class="order-sheet">${renderSheet(order)}</div></div><script>function fitOrder(){var page=document.querySelector('.order-print-page');var sheet=document.querySelector('.order-sheet');if(!page||!sheet)return;sheet.style.transform='scale(1)';sheet.style.width='202mm';var sx=page.clientWidth/sheet.scrollWidth;var sy=page.clientHeight/sheet.scrollHeight;var sc=Math.min(1,sx,sy)*0.996;sheet.style.transform='scale('+sc+')';sheet.style.width=(202/sc)+'mm';}window.onbeforeprint=fitOrder;<\/script></body></html>`;

    const oldFrame = document.getElementById("order-print-frame");
    if (oldFrame && oldFrame.parentNode) oldFrame.parentNode.removeChild(oldFrame);

    const frame = document.createElement("iframe");
    frame.id = "order-print-frame";
    frame.setAttribute("title", "발주서 인쇄");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const cleanup = () => {
      setTimeout(() => {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 1200);
    };

    try {
      const doc = frame.contentWindow.document;
      doc.open();
      doc.write(docHtml);
      doc.close();
      setTimeout(() => {
        try {
          const win = frame.contentWindow;
          if (!win) throw new Error("print frame unavailable");
          if (typeof win.fitOrder === "function") win.fitOrder();
          win.focus();
          win.print();
          cleanup();
        } catch (err) {
          cleanup();
          const popup = window.open("", "_blank", "width=900,height=900");
          if (!popup) {
            alert("인쇄창을 열 수 없습니다. 브라우저 팝업/인쇄 권한을 확인해주세요.");
            return;
          }
          popup.document.open();
          popup.document.write(docHtml.replace("window.onbeforeprint=fitOrder;", "window.onload=function(){setTimeout(function(){fitOrder();window.focus();window.print();},180);};window.onbeforeprint=fitOrder;"));
          popup.document.close();
        }
      }, 180);
    } catch (err) {
      cleanup();
      alert("발주서 인쇄 준비 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
    }
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
    const floatingToggle = document.getElementById("mobile-menu-floating");
    const backdrop = document.getElementById("mobile-menu-backdrop");
    if (!main || (!toggle && !floatingToggle)) return;

    const closeMenu = () => main.classList.remove("mobile-nav-open");
    const toggleMenu = () => main.classList.toggle("mobile-nav-open");

    [toggle, floatingToggle].filter(Boolean).forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        toggleMenu();
      });
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

  function parseEasyBoolean(value) {
    const v = normalizeEasyBlank(value).replace(/\s/g, "").toLowerCase();
    if (!v) return false;
    if (/^(false|n|no|0|아니오|미사용|해제|해당없음)$/i.test(v)) return false;
    if (/^(true|y|yes|1|예|사용|선택|급유기)$/i.test(v)) return true;
    return /농협|중앙회|중부|자재|유통|급유/.test(v);
  }

  function normalizeEasyMajor(value) {
    const v = normalizeEasyBlank(value);
    if (!v) return "";
    if (/급유기/.test(v)) return "급유기";
    if (/일반/.test(v)) return "일반";
    if (/계통/.test(v)) return "계통";
    if (/자체/.test(v)) return "자체";
    return v;
  }

  function normalizeEasyOilOption(value) {
    const v = normalizeEasyBlank(value).replace(/\s/g, "");
    if (!v) return "농협중앙회";
    if (/해당없음|없음|무/.test(v)) return "해당없음";
    if (/중부|자재|유통/.test(v)) return "중부자재유통";
    if (/농협|중앙회/.test(v)) return "농협중앙회";
    return v;
  }

  function parseEasyCategoryFromFields(majorValue, subValue, oilValue, oilOptionValue) {
    let major = normalizeEasyMajor(majorValue);
    let sub = normalizeEasyBlank(subValue);
    const oilOptionText = normalizeEasyBlank(oilOptionValue);
    let oil = parseEasyBoolean(oilValue) || major === "급유기" || !!oilOptionText;
    let oilOption = normalizeEasyOilOption(oilOptionText || (oil ? sub : ""));

    if (oil) {
      // 빠른입력에서 급유기는 일반/계통/자체 소분류가 아니라
      // 실제 화면의 급유기 옵션 3개(농협중앙회/중부자재유통/해당없음)를 따릅니다.
      // 기존 거래내역 필터 안정성을 위해 cat은 "계통"으로 저장하고,
      // 화면 표시용 part에는 급유기 옵션을 명확히 남깁니다.
      return {
        major: "계통",
        sub: oilOption,
        oil: true,
        oilOption,
        label: `급유기 [${oilOption}]`,
      };
    }

    if (!major || major === "급유기") major = "일반";
    if (!sub) {
      if (major === "일반") sub = "판매";
      else if (major === "계통") sub = "중앙회";
      else if (major === "자체") sub = "자체구매";
      else sub = "판매";
    }

    return {
      major,
      sub,
      oil: false,
      oilOption: "",
      label: `${major} [${sub}]`,
    };
  }

  function parseEasyCategory(value) {
    const raw = normalizeEasyBlank(value) || "일반-판매";
    const parts = raw.split(/[:\-\/>]+/).map((x) => x.trim()).filter(Boolean);
    if (parts[0] && /급유기/.test(parts[0])) {
      return parseEasyCategoryFromFields("급유기", "", "true", parts[1] || parts[2] || "농협중앙회");
    }
    return parseEasyCategoryFromFields(parts[0] || "일반", parts[1] || "", "", "");
  }

  function parseEasyPayMethod(value) {
    const v = normalizeEasyBlank(value).replace(/\s/g, "");
    if (/현금/.test(v)) return "현금";
    if (/카드/.test(v)) return "카드";
    if (/계좌|이체/.test(v)) return "계좌이체";
    if (/외상|미수/.test(v)) return "외상";
    return v || "미기재";
  }

  function splitEasyTableLine(line) {
    if (line.includes("\t")) return line.split("\t").map((x) => x.trim());
    if (line.includes("|")) return line.split("|").map((x) => x.trim());
    if (line.includes(",")) {
      const cells = [];
      let cur = "";
      let quote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (quote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            quote = !quote;
          }
        } else if (ch === "," && !quote) {
          cells.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      cells.push(cur.trim());
      return cells;
    }
    return [line.trim()];
  }

  function normalizeEasyHeaderName(name) {
    return String(name || "")
      .replace(/\s/g, "")
      .replace(/[()［］\[\]{}]/g, "")
      .replace(/ㆍ/g, "")
      .toLowerCase();
  }

  function easyHeaderKey(name) {
    const h = normalizeEasyHeaderName(name);
    if (/^(번호|no|num|명세서번호|순번)$/.test(h)) return "no";
    if (/공급자/.test(h)) return "supplier";
    if (/작성일자|작성날짜|거래일자|날짜|일자/.test(h)) return "date";
    if (/작성자|담당작성자|담당자/.test(h)) return "author";
    if (/거래대분류|대분류|분류대/.test(h)) return "major";
    if (/거래소분류|소분류|분류소/.test(h)) return "sub";
    if (/급유기옵션|급유기분류|급유기구분|급유기선택|급유기소분류/.test(h)) return "oilOption";
    if (/급유기/.test(h)) return "oil";
    if (/상호|법인명|거래처|업체명/.test(h)) return "company";
    if (/고객명|고객성명|성명|이름/.test(h)) return "name";
    if (/전화번호|연락처|휴대폰|전화|연락/.test(h)) return "phone";
    if (/관할지역|지역/.test(h)) return "region";
    if (/결제수단|결제방법|결제/.test(h)) return "payMethod";
    if (/품목비고|품목메모/.test(h)) return "note";
    if (/품목명|품명|품목|item/.test(h)) return "item";
    if (/규격사항|규격|spec/.test(h)) return "spec";
    if (/수량|qty/.test(h)) return "qty";
    if (/단가|price/.test(h)) return "price";
    if (/공급가액|공급액|금액|amount/.test(h)) return "amount";
    if (/세액|tax/.test(h)) return "tax";
    if (/비고|메모|note/.test(h)) return "note";
    return "";
  }

  function isEasyTableInput(text) {
    const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return false;
    if (lines.some((line) => line.includes("\t") || line.includes("|"))) return true;
    const first = splitEasyTableLine(lines[0]);
    return first.length >= 8 && first.map(easyHeaderKey).filter(Boolean).length >= 4;
  }

  function tableRowToObject(row, keys) {
    const obj = {};
    keys.forEach((key, idx) => {
      if (!key) return;
      obj[key] = row[idx] == null ? "" : row[idx];
    });
    return obj;
  }

  function createEasyRecordGroup(no) {
    return {
      no: String(no || ""),
      meta: {
        supplier: "naepo",
        date: formatDateForInput(""),
        author: "",
        company: "",
        name: "x",
        phone: "",
        region: "미지정",
        category: parseEasyCategoryFromFields("일반", "판매", "", ""),
        payMethod: "미기재",
      },
      items: [],
    };
  }

  function updateEasyRecordMeta(group, row) {
    if (!group || !row) return;
    const supplier = normalizeEasyBlank(row.supplier);
    const date = normalizeEasyBlank(row.date);
    const author = normalizeEasyBlank(row.author);
    const major = normalizeEasyBlank(row.major);
    const sub = normalizeEasyBlank(row.sub);
    const oil = normalizeEasyBlank(row.oil);
    const oilOption = normalizeEasyBlank(row.oilOption);
    const company = normalizeEasyBlank(row.company);
    const name = normalizeEasyBlank(row.name);
    const phone = normalizeEasyBlank(row.phone);
    const region = normalizeEasyBlank(row.region);
    const pay = normalizeEasyBlank(row.payMethod);

    if (supplier) group.meta.supplier = parseEasySupplier(supplier);
    if (date) group.meta.date = formatDateForInput(date);
    if ("author" in row) group.meta.author = author;
    if (major || sub || oil || oilOption) {
      group.meta.category = parseEasyCategoryFromFields(
        major || group.meta.category.major,
        sub || group.meta.category.sub,
        oil || (group.meta.category.oil ? "true" : ""),
        oilOption || group.meta.category.oilOption || ""
      );
    }
    if ("company" in row) group.meta.company = company;
    if ("name" in row) group.meta.name = name || "x";
    if ("phone" in row) group.meta.phone = phone;
    if (region) group.meta.region = region;
    if (pay) group.meta.payMethod = parseEasyPayMethod(pay);
  }

  function addEasyRecordItem(group, row) {
    const itemName = normalizeEasyBlank(row.item);
    if (!group || !itemName) return false;
    const qty = toNumberLoose(row.qty || 1) || 1;
    const amountRaw = normalizeEasyBlank(row.amount);
    const priceRaw = normalizeEasyBlank(row.price);
    const amount = amountRaw ? toNumberLoose(amountRaw) : 0;
    const price = priceRaw ? toNumberLoose(priceRaw) : (qty ? Math.round(amount / qty) : 0);
    const tax = normalizeEasyBlank(row.tax) ? toNumberLoose(row.tax) : 0;

    group.items.push({
      item: itemName,
      spec: normalizeEasyBlank(row.spec) || "-",
      qty,
      price,
      amount: amount || price * qty,
      tax,
      note: normalizeEasyBlank(row.note) || "",
    });
    return true;
  }

  function parseEasyRecordTable(text) {
    const rawLines = String(text || "").replace(/\r/g, "").split("\n").filter((line) => line.trim());
    const rows = rawLines.map(splitEasyTableLine);
    if (!rows.length) return [];

    const fixedKeys = ["no", "supplier", "date", "author", "major", "sub", "oil", "oilOption", "company", "name", "region", "payMethod", "phone", "item", "spec", "qty", "price", "amount", "tax", "note"];
    const headerKeys = rows[0].map(easyHeaderKey);
    const hasHeader = headerKeys.filter(Boolean).length >= 4 && headerKeys.includes("item");
    const keys = hasHeader ? headerKeys : fixedKeys;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const groups = [];
    const groupMap = new Map();
    let current = null;
    let autoNo = 1;

    dataRows.forEach((cells) => {
      if (!cells.some((cell) => normalizeEasyBlank(cell))) return;
      const row = tableRowToObject(cells, keys);
      let no = normalizeEasyBlank(row.no);

      if (!no && current) no = current.no;
      if (!no) no = String(autoNo++);

      let group = groupMap.get(no);
      if (!group) {
        group = createEasyRecordGroup(no);
        groupMap.set(no, group);
        groups.push(group);
        current = group;
      } else {
        current = group;
      }

      updateEasyRecordMeta(group, row);
      addEasyRecordItem(group, row);
    });

    return groups.filter((g) => g.items.length);
  }

  function parseEasyRecordKeyValue(text) {
    const groups = [];
    let current = null;
    String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const match = line.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          current = createEasyRecordGroup(match[1]);
          groups.push(current);
          line = match[2].trim();
        }
        if (!current) {
          current = createEasyRecordGroup(String(groups.length + 1));
          groups.push(current);
        }

        const data = parseEasyKeyValueLine(line);
        const row = {
          supplier: data["공급자"],
          date: data["작성일자"] || data["날짜"],
          author: data["작성자"] || data["담당자"],
          major: data["거래대분류"] || data["대분류"],
          sub: data["거래소분류"] || data["소분류"],
          oil: data["급유기"],
          oilOption: data["급유기옵션"] || data["급유기분류"] || data["급유기구분"] || data["급유기선택"],
          company: data["상호"] || data["거래처"] || data["업체명"] || data["법인명"],
          name: data["고객명"] || data["고객성명"] || data["성명"] || data["이름"],
          region: data["지역"] || data["관할지역"],
          payMethod: data["결제수단"] || data["결제"],
          phone: data["전화번호"] || data["연락처"] || data["전화"] || data["휴대폰"],
          item: data["품목"] || data["품목명"] || data["item"],
          spec: data["규격"] || data["규격사항"] || data["spec"],
          qty: data["수량"] || data["qty"],
          price: data["단가"] || data["price"],
          amount: data["공급가액"] || data["금액"] || data["amount"],
          tax: data["세액"] || data["tax"],
          note: data["품목비고"] || data["비고"] || data["note"],
        };

        updateEasyRecordMeta(current, row);
        addEasyRecordItem(current, row);
      });
    return groups.filter((g) => g.items.length);
  }

  function parseEasyRecordText(text) {
    return isEasyTableInput(text) ? parseEasyRecordTable(text) : parseEasyRecordKeyValue(text);
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
      title.innerHTML = '<i class="fa-solid fa-table-cells"></i> 명세서 빠른입력';
      desc.innerHTML = "엑셀에서 표를 작성한 뒤 그대로 복사해서 붙여넣으세요. <br><b>같은 번호는 같은 명세서</b>로 묶이고, 두 번째 품목부터는 기본정보를 비워도 위 명세서 정보를 따라갑니다. <br><b>공급자 1=내포농기계, 2=동아아세아농기계 / 전화번호 열 지원</b><br><b>급유기=Y인 경우 거래소분류가 아니라 급유기옵션(농협중앙회/중부자재유통/해당없음)을 사용합니다.</b>";
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
      <div class="import-summary">명세서 ${groups.length}건 · 품목 ${totalItems}줄을 미리보기했습니다. 같은 번호는 같은 명세서로 묶였습니다. 적용하면 거래내역에 저장됩니다.</div>
      <div class="import-preview-list">
        ${groups.map((g, idx) => `
          <div class="import-preview-card">
            <strong>명세서 #${idx + 1}</strong>
            <div class="import-meta-line">
              <span>공급자: ${supplierLabel(g.meta.supplier)}</span>
              <span>작성일자: ${safeText(g.meta.date)}</span>
              <span>작성자: ${safeText(g.meta.author || "공란")}</span>
              <span>고객명: ${safeText(g.meta.name)}</span>
              ${g.meta.phone ? `<span>전화번호: ${safeText(g.meta.phone)}</span>` : ""}
              <span>분류: ${safeText(g.meta.category.label)}</span>${g.meta.category.oil ? `<span>급유기옵션: ${safeText(g.meta.category.oilOption)}</span>` : ""}
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
    const repairLog = Array.isArray(data.repairLog) ? data.repairLog : [];
    const inventoryLog = Array.isArray(data.inventoryLog) ? data.inventoryLog : [];
    const printLog = Array.isArray(data.printLog) ? data.printLog : [];
    document.getElementById("easy-import-result").innerHTML = `
      <div class="import-summary">백업파일 미리보기: 거래내역 ${records.length}건 · 재고 ${parts.length}건 · 거래처 ${customers.length}건 · 부품그룹 ${groups.length}건 · 입출고 ${inventoryLog.length}건 · 발주서 ${orderLog.length}건 · 접수대장 ${repairLog.length}건 · 인쇄기록 ${printLog.length}건</div>
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
        phone: meta.phone || "",
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
          repairLog: data.repairLog,
          subsidyProjects: data.subsidyProjects,
          subsidyProjectRegistry: data.subsidyProjectRegistry,
          dailySettlements: data.dailySettlements,
          restoreHistory: data.restoreHistory,
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
        text.value = "번호\t공급자\t작성일자\t작성자\t거래대분류\t거래소분류\t급유기\t급유기옵션\t상호\t고객명\t전화번호\t지역\t결제수단\t품목\t규격\t수량\t단가\t공급가액\t세액\t품목비고\n1\t2\t2026-06-26\t현장기사\t일반\t판매\tN\t\t\t안광주\t010-1111-2222\t미지정\t계좌이체\tDMC-800F 액제탱크 세트\t\t1\t60000\t60000\t0\t\n1\t\t\t\t\t\t\t\t\t\t\t\t\tOT-20L 오성 분무기\t\t1\t100000\t100000\t0\t\n2\t1\t\t\t일반\t수리\tN\t\t\t이회봉\t010-3333-4444\t홍성읍\t외상\t패킹\t\t1\t18000\t18000\t0\t\n3\t1\t2026-06-26\t현장기사\t급유기\t\tY\t농협중앙회\t농협\t김철수\t010-5555-6666\t갈산\t외상\t급유기 부품\t\t1\t50000\t50000\t0\t\n4\t1\t2026-06-26\t현장기사\t급유기\t\tY\t중부자재유통\t\t박영수\t010-7777-8888\t홍성읍\t계좌이체\t급유기 호스\t\t1\t70000\t70000\t0\t";
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


/* 접수대장 페이지 v27 */
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  let rows = [];
  let editingId = null;
  let contactStatus = "미연락";
  let paidStatus = false;
  let repairDoneStatus = false;

  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  }
  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const tk = token();
    if (tk) headers.Authorization = "Bearer " + tk;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function setPillActive(rootId, value) {
    const root = $(rootId);
    if (!root) return;
    root.querySelectorAll(".pill").forEach((btn) => btn.classList.toggle("g", String(btn.dataset.value) === String(value)));
  }
  function resetForm() {
    editingId = null;
    if ($("repair-date")) $("repair-date").value = today();
    ["repair-model", "repair-name", "repair-phone", "repair-detail", "repair-cost"].forEach((id) => { if ($(id)) $(id).value = ""; });
    contactStatus = "미연락";
    paidStatus = false;
    repairDoneStatus = false;
    setPillActive("repair-contact-pills", contactStatus);
    setPillActive("repair-paid-pills", "false");
    setPillActive("repair-done-pills", "false");
    const save = $("repair-save");
    if (save) save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 접수 저장';
  }
  function readForm() {
    return {
      date: $("repair-date").value || today(),
      modelName: $("repair-model").value.trim(),
      name: $("repair-name").value.trim(),
      phone: $("repair-phone").value.trim(),
      repairDetail: $("repair-detail").value.trim(),
      repairCost: Number(String($("repair-cost").value || "0").replace(/[,원\s]/g, "")) || 0,
      contactStatus,
      repairDone: Boolean(repairDoneStatus),
      paid: Boolean(paidStatus),
    };
  }
  function validateForm(data) {
    if (!data.date) throw new Error("날짜를 입력해주세요.");
    if (!data.modelName) throw new Error("모델명을 입력해주세요.");
    if (!data.name) throw new Error("성함을 입력해주세요.");
  }
  function getFilteredRows() {
    const q = ($("repair-filter-search")?.value || "").trim().toLowerCase();
    const start = $("repair-filter-start")?.value || "";
    const end = $("repair-filter-end")?.value || "";
    const paid = $("repair-filter-paid")?.value || "";
    return [...rows].filter((r) => {
      if (start && String(r.date || "") < start) return false;
      if (end && String(r.date || "") > end) return false;
      if (paid === "paid" && !r.paid) return false;
      if (paid === "unpaid" && r.paid) return false;
      if (q) {
        const hay = [r.date, r.modelName, r.name, r.phone, r.repairDetail, r.contactStatus, r.repairDone ? "수리완료" : "수리미완료", r.paid ? "결제완료" : "미결제"].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }
  function weekKey(dateStr) {
    const d = new Date(`${dateStr || today()}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "날짜미정";
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
    return `${fmt(monday)} ~ ${fmt(sunday)}`;
  }
  function groupKey(row, mode) {
    const date = String(row.date || "");
    if (mode === "month") return date.slice(0, 7) || "날짜미정";
    if (mode === "week") return weekKey(date);
    return date || "날짜미정";
  }
  function groupedRows(list) {
    const mode = $("repair-group-by")?.value || "date";
    const map = new Map();
    list.forEach((row) => {
      const key = groupKey(row, mode);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return Array.from(map.entries());
  }
  function render() {
    const list = getFilteredRows();
    const total = list.reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
    const unpaid = list.filter((r) => !r.paid).length;
    const undone = list.filter((r) => !r.repairDone).length;
    if ($("repair-summary")) $("repair-summary").textContent = `접수 ${list.length}건 · 수리미완료 ${undone}건 · 미결제 ${unpaid}건 · 수리비 ${money(total)}원`;
    const root = $("repair-grouped-list");
    if (!root) return;
    const groups = groupedRows(list);
    root.innerHTML = groups.length ? groups.map(([key, items]) => {
      const sum = items.reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
      const unpaidCount = items.filter((r) => !r.paid).length;
      const undoneCount = items.filter((r) => !r.repairDone).length;
      return `<section class="repair-group-section">
        <div class="repair-group-title"><strong>${esc(key)}</strong><span>${items.length}건 · 수리미완료 ${undoneCount}건 · 미결제 ${unpaidCount}건 · ${money(sum)}원</span></div>
        <div class="tbl-wrap repair-table-wrap"><table class="repair-table">
          <thead><tr><th>날짜</th><th>모델명</th><th>성함</th><th>연락처</th><th>수리내역</th><th class="tr">수리비</th><th>연락</th><th>수리</th><th>결제</th><th>관리</th></tr></thead>
          <tbody>${items.map((r) => `<tr data-id="${esc(r.id)}">
            <td>${esc(r.date)}</td><td><strong>${esc(r.modelName)}</strong></td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td>
            <td class="repair-detail-cell">${esc(r.repairDetail)}</td><td class="tr">${money(r.repairCost)}원</td>
            <td><button type="button" class="repair-contact-toggle ${r.contactStatus === "연락완료" ? "ok" : r.contactStatus === "보류" ? "warn" : "muted"}" data-id="${esc(r.id)}">${esc(r.contactStatus || "미연락")}</button></td>
            <td><button type="button" class="repair-done-toggle ${r.repairDone ? "done" : "undone"}" data-id="${esc(r.id)}">${r.repairDone ? "수리완료" : "수리미완료"}</button></td>
            <td><button type="button" class="repair-paid-toggle ${r.paid ? "paid" : "unpaid"}" data-id="${esc(r.id)}">${r.paid ? "결제완료" : "미결제"}</button></td>
            <td><div class="repair-row-actions">
              <button type="button" class="btn btn-o btn-sm repair-to-invoice" data-id="${esc(r.id)}"><i class="fa-solid fa-file-invoice"></i> 명세서</button>
              <button type="button" class="btn btn-o btn-sm repair-receipt-print" data-id="${esc(r.id)}"><i class="fa-solid fa-print"></i> 접수증</button>
              <button type="button" class="btn btn-o btn-sm repair-edit" data-id="${esc(r.id)}"><i class="fa-solid fa-pen"></i> 수정</button>
              <button type="button" class="btn btn-o btn-sm repair-delete" data-id="${esc(r.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
            </div></td>
          </tr>`).join("")}</tbody>
        </table></div>
      </section>`;
    }).join("") : '<div class="empty-td">접수 기록이 없습니다.</div>';
    bindRowButtons();
  }
  function printRepairReceipt(row) {
    if (!row) return;
    const cost = money(row.repairCost);
    const paidText = row.paid ? "결제완료" : "미결제";
    const doneText = row.repairDone ? "수리완료" : "수리미완료";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>농기계 수리 접수증</title><style>
      *{box-sizing:border-box}body{font-family:'Malgun Gothic',Arial,sans-serif;margin:0;color:#0f172a;background:#fff}
      .receipt{width:190mm;margin:0 auto;padding:12mm 10mm}
      .head{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px}
      h1{font-size:22px;margin:0;letter-spacing:-.04em}.sub{font-size:12px;color:#64748b;margin-top:4px}
      .badge{display:inline-flex;align-items:center;border:1px solid #94a3b8;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900}
      table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #cbd5e1;padding:9px 10px;vertical-align:top}
      th{width:28mm;background:#f8fafc;text-align:left;color:#334155;font-weight:900}.detail{min-height:44mm;white-space:pre-wrap;line-height:1.55}.money{font-size:16px;font-weight:900;text-align:right}
      .foot{margin-top:14px;font-size:12px;color:#475569;display:flex;justify-content:space-between;gap:12px}.sign{min-width:45mm;border-top:1px solid #94a3b8;text-align:center;padding-top:6px;color:#334155}
      @media print{@page{size:A4 portrait;margin:8mm}body{margin:0}.receipt{width:auto;margin:0;padding:0}}
    </style></head><body><div class="receipt">
      <div class="head"><div><h1>농기계 수리 접수증</h1><div class="sub">내포농기계 접수대장 발행</div></div><div style="display:flex;gap:6px"><div class="badge">${esc(doneText)}</div><div class="badge">${esc(paidText)}</div></div></div>
      <table>
        <tr><th>접수일자</th><td>${esc(row.date || "")}</td><th>모델명</th><td>${esc(row.modelName || "")}</td></tr>
        <tr><th>성함</th><td>${esc(row.name || "")}</td><th>연락처</th><td>${esc(row.phone || "")}</td></tr>
        <tr><th>연락상태</th><td>${esc(row.contactStatus || "미연락")}</td><th>수리상태</th><td>${esc(doneText)}</td></tr>
        <tr><th>결제상태</th><td>${esc(paidText)}</td><th>수리비</th><td class="money">${cost}원</td></tr>
        <tr><th>수리내역</th><td colspan="3" class="detail">${esc(row.repairDetail || "")}</td></tr>
      </table>
      <div class="foot"><span>※ 접수 내용 확인용입니다.</span><span class="sign">확인</span></div>
    </div></body></html>`;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 180);
  }

  function repairToInvoice(row) {
    if (!row) return;
    const tab = document.getElementById("tab-form");
    tab && tab.click();
    setTimeout(() => {
      const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value == null ? "" : String(value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const clickSel = (selector) => {
        const el = document.querySelector(selector);
        if (el) el.click();
      };

      clickSel('#supplier-pills .pill[data-supplier="naepo"]');
      clickSel('#cat-pills .pill[data-cat="일반"]');
      clickSel('#gen-pills .pill[data-gen="수리"]');

      setVal("f-date", row.date || today());
      setVal("f-company", "");
      setVal("f-name", row.name || "");
      setVal("f-phone", row.phone || "");
      setVal("f-region", "미지정");

      const paySelector = row.paid ? '#payment-pills .pill[data-pay="현금"]' : '#payment-pills .pill[data-pay="외상"]';
      clickSel(paySelector);

      let itemRow = document.querySelector("#items-builder-root .item-row-card");
      if (!itemRow) {
        const addBtn = document.getElementById("btn-add-item-row");
        addBtn && addBtn.click();
        itemRow = document.querySelector("#items-builder-root .item-row-card");
      }
      if (itemRow) {
        const itemName = `${row.repairDetail || row.modelName || "수리"}`.trim();
        const amount = Number(row.repairCost) || 0;
        const fields = {
          ".p-item": itemName,
          ".p-spec": row.modelName || "",
          ".p-qty": "1",
          ".p-price": String(amount),
          ".p-amount": String(amount),
          ".p-tax": "0",
          ".p-item-note": "접수대장에서 작성",
        };
        Object.entries(fields).forEach(([selector, value]) => {
          const el = itemRow.querySelector(selector);
          if (!el) return;
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      const preview = document.getElementById("f-preview");
      preview && preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
      alert("접수대장 내용을 명세서 작성란에 불러왔습니다. 확인 후 저장해주세요.");
    }, 120);
  }

  function bindRowButtons() {
    document.querySelectorAll(".repair-contact-toggle").forEach((btn) => {
      btn.onclick = async () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (!row) return;
        const order = ["미연락", "연락완료", "보류"];
        const current = row.contactStatus || "미연락";
        const next = order[(order.indexOf(current) + 1) % order.length] || "미연락";
        try {
          const updated = await api(`/api/repair-log/${encodeURIComponent(row.id)}/contact`, { method: "PATCH", body: JSON.stringify({ contactStatus: next }) });
          Object.assign(row, updated);
          render();
        } catch (e) { alert(e.message); }
      };
    });
    document.querySelectorAll(".repair-done-toggle").forEach((btn) => {
      btn.onclick = async () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (!row) return;
        try {
          const updated = await api(`/api/repair-log/${encodeURIComponent(row.id)}/done`, { method: "PATCH", body: JSON.stringify({ repairDone: !row.repairDone }) });
          Object.assign(row, updated);
          render();
        } catch (e) { alert(e.message); }
      };
    });
    document.querySelectorAll(".repair-paid-toggle").forEach((btn) => {
      btn.onclick = async () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (!row) return;
        try {
          const updated = await api(`/api/repair-log/${encodeURIComponent(row.id)}/paid`, { method: "PATCH", body: JSON.stringify({ paid: !row.paid }) });
          Object.assign(row, updated);
          render();
        } catch (e) { alert(e.message); }
      };
    });
    document.querySelectorAll(".repair-receipt-print").forEach((btn) => {
      btn.onclick = () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (row) printRepairReceipt(row);
      };
    });
    document.querySelectorAll(".repair-to-invoice").forEach((btn) => {
      btn.onclick = () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (row) repairToInvoice(row);
      };
    });
    document.querySelectorAll(".repair-edit").forEach((btn) => {
      btn.onclick = () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (!row) return;
        editingId = row.id;
        $("repair-date").value = row.date || today();
        $("repair-model").value = row.modelName || "";
        $("repair-name").value = row.name || "";
        $("repair-phone").value = row.phone || "";
        $("repair-detail").value = row.repairDetail || "";
        $("repair-cost").value = row.repairCost || 0;
        contactStatus = row.contactStatus || "미연락";
        paidStatus = Boolean(row.paid);
        setPillActive("repair-contact-pills", contactStatus);
        setPillActive("repair-paid-pills", String(paidStatus));
        $("repair-save").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 수정 저장';
        $("page-repair").scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    document.querySelectorAll(".repair-delete").forEach((btn) => {
      btn.onclick = async () => {
        const row = rows.find((r) => String(r.id) === String(btn.dataset.id));
        if (!row || !confirm(`${row.date} ${row.name} 접수기록을 삭제할까요?`)) return;
        try {
          await api(`/api/repair-log/${encodeURIComponent(row.id)}`, { method: "DELETE" });
          rows = rows.filter((r) => String(r.id) !== String(row.id));
          render();
        } catch (e) { alert(e.message); }
      };
    });
  }
  async function load() {
    const data = await api("/api/repair-log?limit=1000");
    rows = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
    render();
  }
  async function save() {
    try {
      const data = readForm();
      validateForm(data);
      const saved = editingId
        ? await api(`/api/repair-log/${encodeURIComponent(editingId)}`, { method: "PUT", body: JSON.stringify(data) })
        : await api("/api/repair-log", { method: "POST", body: JSON.stringify(data) });
      const idx = rows.findIndex((r) => String(r.id) === String(saved.id));
      if (idx >= 0) rows[idx] = saved; else rows.unshift(saved);
      resetForm();
      render();
      alert("접수대장에 저장되었습니다.");
    } catch (e) { alert(e.message); }
  }
  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCsv() {
    const header = ["정리구분", "날짜", "모델명", "성함", "연락처", "수리내역", "수리비", "연락", "결제여부", "결제일시"];
    const lines = [header.join(",")];
    groupedRows(getFilteredRows()).forEach(([key, items]) => {
      items.forEach((r) => lines.push([key, r.date, r.modelName, r.name, r.phone, r.repairDetail, r.repairCost, r.contactStatus, r.paid ? "결제완료" : "미결제", r.paidAt || ""].map(csvEscape).join(",")));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `접수대장-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function printGrouped() {
    const list = getFilteredRows();
    const groups = groupedRows(list);
    const total = list.reduce((s, r) => s + (Number(r.repairCost) || 0), 0);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>접수대장 출력</title><style>
      body{font-family:'Malgun Gothic',Arial,sans-serif;margin:18px;color:#0f172a} h1{font-size:20px;margin:0 0 8px} .summary{font-size:12px;margin-bottom:14px;color:#475569}
      h2{font-size:15px;margin:18px 0 8px;border-left:4px solid #0f766e;padding-left:8px} table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top} th{background:#f1f5f9}.tr{text-align:right}.badge{font-weight:700}@media print{@page{size:A4 landscape;margin:10mm} body{margin:0}}
    </style></head><body><h1>농기계 고장 접수대장</h1><div class="summary">총 ${list.length}건 · 미결제 ${list.filter(r=>!r.paid).length}건 · 수리비 ${money(total)}원</div>
    ${groups.map(([key, items]) => `<h2>${esc(key)} · ${items.length}건</h2><table><thead><tr><th>날짜</th><th>모델명</th><th>성함</th><th>연락처</th><th>수리내역</th><th>수리비</th><th>연락</th><th>결제</th></tr></thead><tbody>${items.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.modelName)}</td><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(r.repairDetail)}</td><td class="tr">${money(r.repairCost)}원</td><td>${esc(r.contactStatus)}</td><td class="badge">${r.paid ? "결제완료" : "미결제"}</td></tr>`).join("")}</tbody></table>`).join("")}</body></html>`;
    const frame = document.createElement("iframe");
    frame.style.position="fixed"; frame.style.right="0"; frame.style.bottom="0"; frame.style.width="0"; frame.style.height="0"; frame.style.border="0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(()=>{ frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(()=>frame.remove(), 1000); }, 180);
  }
  function showRepairPage() {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("on", tab.id === "tab-repair"));
    document.querySelectorAll("main > div[id^='page-']").forEach((page) => { page.style.display = page.id === "page-repair" ? "block" : "none"; });
    history.pushState({ tab: "repair" }, "", "#repair");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    load().catch((e) => alert(e.message));
  }
  function init() {
    if (!$("page-repair") || !$("tab-repair")) return;
    resetForm();
    $("tab-repair").addEventListener("click", showRepairPage);
    $("repair-save").addEventListener("click", save);
    $("repair-reset").addEventListener("click", resetForm);
    $("repair-refresh").addEventListener("click", () => load().catch((e) => alert(e.message)));
    const importRepairRecords = async () => {
      if (!confirm("거래내역 중 분류파트가 수리인 명세서를 접수대장으로 불러올까요?\n이미 불러온 명세서는 중복 등록하지 않습니다.")) return;
      try {
        const result = await api("/api/repair-log/import-record-repairs", { method: "POST", body: JSON.stringify({}) });
        await load();
        alert(`수리 명세서 불러오기 완료\n추가 ${result.created || 0}건 · 갱신 ${result.updated || 0}건`);
      } catch (e) { alert(e.message); }
    };
    $("repair-import-records") && $("repair-import-records").addEventListener("click", importRepairRecords);
    $("repair-import-records-inline") && $("repair-import-records-inline").addEventListener("click", importRepairRecords);
    $("repair-export-csv").addEventListener("click", exportCsv);
    $("repair-print").addEventListener("click", printGrouped);
    ["repair-filter-search", "repair-filter-start", "repair-filter-end", "repair-filter-paid", "repair-group-by"].forEach((id) => {
      const el = $(id); if (!el) return;
      el.addEventListener(id === "repair-filter-search" ? "input" : "change", render);
    });
    $("repair-filter-reset").addEventListener("click", () => {
      ["repair-filter-search", "repair-filter-start", "repair-filter-end", "repair-filter-paid"].forEach((id) => { if ($(id)) $(id).value = ""; });
      if ($("repair-group-by")) $("repair-group-by").value = "date";
      render();
    });
    ["repair-date", "repair-filter-start", "repair-filter-end"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("click", () => {
        try {
          if (typeof el.showPicker === "function") el.showPicker();
          else el.focus();
        } catch (_) {
          el.focus();
        }
      });
    });
    $("repair-contact-pills").querySelectorAll(".pill").forEach((btn) => btn.addEventListener("click", () => { contactStatus = btn.dataset.value; setPillActive("repair-contact-pills", contactStatus); }));
    $("repair-paid-pills").querySelectorAll(".pill").forEach((btn) => btn.addEventListener("click", () => { paidStatus = btn.dataset.value === "true"; setPillActive("repair-paid-pills", String(paidStatus)); }));
    $("repair-done-pills") && $("repair-done-pills").querySelectorAll(".pill").forEach((btn) => btn.addEventListener("click", () => { repairDoneStatus = btn.dataset.value === "true"; setPillActive("repair-done-pills", String(repairDoneStatus)); }));
    if (location.hash === "#repair") setTimeout(showRepairPage, 0);
  }
  document.addEventListener("DOMContentLoaded", init);
})();


/* ===== daily-settlement-report-v35-20260703 ===== */
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";

  const $ = (id) => document.getElementById(id);
  const safe = (value) =>
    value == null
      ? ""
      : String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
  const money = (value) => (Number(value) || 0).toLocaleString();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const getToken = () => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  };
  async function api(path, options) {
    options = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  };
  function getCustomer(row) {
    const company = row.company && row.company !== "-" ? row.company : "";
    const name = row.name && row.name !== "-" ? row.name : "";
    return [company, name].filter(Boolean).join(" / ") || "-";
  }
  function getRecordTotal(row) {
    return (Number(row.amount) || 0) + (Number(row.tax) || 0);
  }
  function summarize(records, repairs) {
    const pay = { 현금: 0, 카드: 0, 계좌이체: 0, 외상: 0, 미기재: 0 };
    let supply = 0, tax = 0, total = 0, creditUnpaid = 0, creditPaid = 0;
    records.forEach((row) => {
      const rowSupply = Number(row.amount) || 0;
      const rowTax = Number(row.tax) || 0;
      const rowTotal = rowSupply + rowTax;
      supply += rowSupply;
      tax += rowTax;
      total += rowTotal;
      const key = pay.hasOwnProperty(row.payMethod) ? row.payMethod : "미기재";
      pay[key] += rowTotal;
      if (row.payMethod === "외상") {
        if (row.collected) creditPaid += rowTotal;
        else creditUnpaid += rowTotal;
      }
    });
    let repairTotal = 0, repairUnpaid = 0;
    repairs.forEach((row) => {
      const cost = Number(row.repairCost) || 0;
      repairTotal += cost;
      if (!row.paid) repairUnpaid += cost;
    });
    return { supply, tax, total, pay, creditUnpaid, creditPaid, repairTotal, repairUnpaid };
  }
  let dailyState = { date: today(), records: [], repairs: [], summary: null };

  function render() {
    const dateEl = $("daily-report-date");
    if (!dateEl) return;
    const date = dateEl.value || dailyState.date || today();
    dailyState.date = date;
    const records = dailyState.records.filter((row) => String(row.date || "") === date);
    const repairs = dailyState.repairs.filter((row) => String(row.date || "") === date);
    const sum = summarize(records, repairs);
    dailyState.summary = sum;

    $("daily-record-count").textContent = `${records.length}건`;
    $("daily-record-total").textContent = `${money(sum.total)}원`;
    $("daily-paid-total").textContent = `${money(sum.pay.현금 + sum.pay.카드 + sum.pay.계좌이체)}원`;
    $("daily-paid-breakdown").textContent = `현금 ${money(sum.pay.현금)} · 카드 ${money(sum.pay.카드)} · 계좌 ${money(sum.pay.계좌이체)}`;
    $("daily-credit-total").textContent = `${money(sum.pay.외상)}원`;
    $("daily-credit-breakdown").textContent = `수금완료 ${money(sum.creditPaid)} · 미수 ${money(sum.creditUnpaid)}`;
    $("daily-repair-count").textContent = `${repairs.length}건`;
    $("daily-repair-total").textContent = `수리비 ${money(sum.repairTotal)}원 · 미결제 ${money(sum.repairUnpaid)}원`;
    $("daily-record-subtitle").textContent = `${date} 거래명세서 ${records.length}건`;
    $("daily-repair-subtitle").textContent = `${date} 수리접수 ${repairs.length}건`;

    const recordBody = $("daily-record-body");
    recordBody.innerHTML = records.length
      ? records
          .map((row) => {
            const rowTotal = getRecordTotal(row);
            const creditStatus = row.payMethod === "외상" ? (row.collected ? "수금완료" : "미수") : "-";
            return `<tr>
              <td><strong>${safe(getCustomer(row))}</strong>${row.phone ? `<small>${safe(row.phone)}</small>` : ""}</td>
              <td>${safe(row.part || row.cat || "-")}</td>
              <td>${safe(row.note || (Array.isArray(row.items) && row.items[0] ? row.items[0].item : "-"))}</td>
              <td>${safe(row.payMethod || "미기재")}</td>
              <td class="tr">${money(row.amount)}원</td>
              <td class="tr">${money(row.tax)}원</td>
              <td class="tr"><strong>${money(rowTotal)}원</strong></td>
              <td>${safe(creditStatus)}</td>
            </tr>`;
          })
          .join("")
      : '<tr><td colspan="8" class="empty-td">해당 날짜의 명세서 내역이 없습니다.</td></tr>';

    const repairBody = $("daily-repair-body");
    repairBody.innerHTML = repairs.length
      ? repairs
          .map((row) => `<tr>
            <td><strong>${safe(row.modelName || "-")}</strong></td>
            <td>${safe(row.name || "-")}</td>
            <td>${safe(row.phone || "-")}</td>
            <td class="daily-detail-cell">${safe(row.repairDetail || "-")}</td>
            <td class="tr"><strong>${money(row.repairCost)}원</strong></td>
            <td>${safe(row.contactStatus || "미연락")} / ${row.repairDone ? "수리완료" : "수리미완료"}</td>
            <td>${row.paid ? "결제완료" : "미결제"}</td>
          </tr>`)
          .join("")
      : '<tr><td colspan="7" class="empty-td">해당 날짜의 접수 내역이 없습니다.</td></tr>';
  }

  async function load() {
    const dateEl = $("daily-report-date");
    if (!dateEl) return;
    if (!dateEl.value) dateEl.value = dailyState.date || today();
    const [recordsPayload, repairsPayload] = await Promise.all([
      api("/api/records"),
      api("/api/repair-log"),
    ]);
    dailyState.records = asArray(recordsPayload);
    dailyState.repairs = asArray(repairsPayload);
    render();
  }

  function buildPrintHtml() {
    const date = $("daily-report-date").value || dailyState.date || today();
    const records = dailyState.records.filter((row) => String(row.date || "") === date);
    const repairs = dailyState.repairs.filter((row) => String(row.date || "") === date);
    const sum = summarize(records, repairs);
    const memo = $("daily-report-memo") ? $("daily-report-memo").value.trim() : "";
    const rowsRecords = records.length
      ? records.map((row, idx) => `<tr><td>${idx + 1}</td><td>${safe(getCustomer(row))}</td><td>${safe(row.part || "-")}</td><td>${safe(row.note || "-")}</td><td>${safe(row.payMethod || "미기재")}</td><td class="num">${money(row.amount)}</td><td class="num">${money(row.tax)}</td><td class="num">${money(getRecordTotal(row))}</td></tr>`).join("")
      : '<tr><td colspan="8" class="empty">명세서 내역 없음</td></tr>';
    const rowsRepairs = repairs.length
      ? repairs.map((row, idx) => `<tr><td>${idx + 1}</td><td>${safe(row.modelName || "-")}</td><td>${safe(row.name || "-")}</td><td>${safe(row.phone || "-")}</td><td>${safe(row.repairDetail || "-")}</td><td class="num">${money(row.repairCost)}</td><td>${safe(row.contactStatus || "미연락")}</td><td>${row.paid ? "결제완료" : "미결제"}</td></tr>`).join("")
      : '<tr><td colspan="8" class="empty">수리접수 내역 없음</td></tr>';

    return `<!doctype html><html><head><meta charset="utf-8"><title>일일정산서 ${safe(date)}</title><style>
      *{box-sizing:border-box}body{font-family:'Malgun Gothic',Arial,sans-serif;margin:0;background:#fff;color:#111827}
      .sheet{width:190mm;margin:0 auto;padding:10mm 8mm}
      .head{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:2px solid #0f766e;padding-bottom:8px;margin-bottom:10px}
      h1{font-size:24px;margin:0;letter-spacing:-.04em}.date{font-size:15px;font-weight:900;color:#0f766e}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0 10px}
      .box{border:1px solid #cbd5e1;border-radius:8px;padding:7px 8px}.box span{display:block;font-size:10px;color:#64748b;font-weight:800}.box b{font-size:13px}
      h2{font-size:14px;margin:12px 0 6px;color:#0f172a}
      table{width:100%;border-collapse:collapse;font-size:10.5px;table-layout:fixed}
      th,td{border:1px solid #cbd5e1;padding:5px 5px;vertical-align:middle;word-break:keep-all}
      th{background:#f1f5f9;font-weight:900;color:#334155;text-align:center}.num{text-align:right;font-family:Consolas,'Courier New',monospace}.empty{text-align:center;color:#94a3b8;padding:12px}
      .memo{margin-top:12px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;min-height:24mm;white-space:pre-wrap;font-size:11px}
      .foot{margin-top:10px;text-align:right;font-size:10px;color:#64748b}
      @media print{@page{size:A4 portrait;margin:7mm}.sheet{width:auto;margin:0;padding:0}table{font-size:9.5px}th,td{padding:4px}}
    </style></head><body><div class="sheet">
      <div class="head"><div><h1>일일정산서</h1><div style="font-size:11px;color:#64748b;margin-top:2px">내포농기계 보고용 정산 자료</div></div><div class="date">${safe(date)}</div></div>
      <div class="summary">
        <div class="box"><span>명세서</span><b>${records.length}건 / ${money(sum.total)}원</b></div>
        <div class="box"><span>현금·카드·계좌</span><b>${money(sum.pay.현금 + sum.pay.카드 + sum.pay.계좌이체)}원</b></div>
        <div class="box"><span>외상/미수</span><b>${money(sum.pay.외상)}원 / 미수 ${money(sum.creditUnpaid)}원</b></div>
        <div class="box"><span>수리접수</span><b>${repairs.length}건 / ${money(sum.repairTotal)}원</b></div>
      </div>
      <h2>1. 명세서 내역</h2>
      <table><thead><tr><th style="width:7mm">No</th><th>거래처</th><th>분류</th><th>대표품목</th><th style="width:18mm">결제</th><th style="width:20mm">공급가액</th><th style="width:16mm">세액</th><th style="width:20mm">합계</th></tr></thead><tbody>${rowsRecords}</tbody></table>
      <h2>2. 수리접수내역</h2>
      <table><thead><tr><th style="width:7mm">No</th><th>모델명</th><th>성함</th><th>연락처</th><th>수리내역</th><th style="width:19mm">수리비</th><th style="width:18mm">연락</th><th style="width:18mm">결제</th></tr></thead><tbody>${rowsRepairs}</tbody></table>
      <h2>3. 보고 메모</h2>
      <div class="memo">${memo ? safe(memo) : "특이사항 없음"}</div>
      <div class="foot">보고완료 · 정산서 저장 · 출력일시: ${safe(new Date().toLocaleString("ko-KR"))}</div>
    </div></body></html>`;
  }

  function printReport() {
    const html = buildPrintHtml();
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 180);
  }

  function downloadCsv() {
    const date = $("daily-report-date").value || dailyState.date || today();
    const records = dailyState.records.filter((row) => String(row.date || "") === date);
    const repairs = dailyState.repairs.filter((row) => String(row.date || "") === date);
    const lines = [];
    const escCsv = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    lines.push("구분,날짜,거래처/성함,연락처,분류/모델명,내용,결제/연락,공급가액/수리비,세액,합계/결제여부");
    records.forEach((row) => lines.push([
      "명세서", row.date, getCustomer(row), row.phone || "", row.part || "", row.note || "", row.payMethod || "미기재", row.amount || 0, row.tax || 0, getRecordTotal(row)
    ].map(escCsv).join(",")));
    repairs.forEach((row) => lines.push([
      "수리접수", row.date, row.name || "", row.phone || "", row.modelName || "", row.repairDetail || "", row.contactStatus || "미연락", row.repairCost || 0, "", row.paid ? "결제완료" : "미결제"
    ].map(escCsv).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `일일정산서-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showDailyPage() {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("on", tab.id === "tab-daily"));
    document.querySelectorAll("main > div[id^='page-']").forEach((page) => {
      page.style.display = page.id === "page-daily-report" ? "block" : "none";
    });
    history.pushState({ tab: "daily" }, "", "#daily");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    load().catch((e) => alert(e.message));
  }

  function init() {
    if (!$("page-daily-report") || !$("tab-daily")) return;
    $("daily-report-date").value = today();
    $("tab-daily").addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      showDailyPage();
    });
    $("daily-report-date").addEventListener("change", render);
    $("daily-report-date").addEventListener("click", () => {
      const el = $("daily-report-date");
      try { if (el.showPicker) el.showPicker(); else el.focus(); } catch (_) { el.focus(); }
    });
    $("daily-report-today").addEventListener("click", () => {
      $("daily-report-date").value = today();
      render();
    });
    $("daily-report-refresh").addEventListener("click", () => load().catch((e) => alert(e.message)));
    $("daily-report-print").addEventListener("click", printReport);
    $("daily-report-csv").addEventListener("click", downloadCsv);
    if (location.hash === "#daily") setTimeout(showDailyPage, 0);
  }

  window.NaepoDailyReport = { render, load, show: showDailyPage };
  document.addEventListener("DOMContentLoaded", init);
})();


/* ===== v36-report-group-repair-fixes-20260703 =====
   - 그룹 드롭다운 선택 즉시 대형 모달 열기
   - 접수대장 일반[수리] 불러오기 버튼 다중 위치 연결
   - 거래내역 조회에서 일일정산서 이동 버튼
   - 보고용 일일정산서 상세 인쇄 강화
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const safe = (value) => value == null ? "" : String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const money = (value) => (Number(value) || 0).toLocaleString();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const token = () => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  };
  async function api(path, options) {
    options = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];
  function stripGroupPrefix(name) {
    return String(name || "").replace(/^\[[^\]]+\]\s*/, "").trim();
  }
  function formatGroupPartName(groupName, partName) {
    const g = String(groupName || "").trim();
    const p = String(partName || "").trim();
    if (!g || !p) return p;
    if (p.startsWith(`[${g}]`)) return p;
    return `[${g}]${p}`;
  }

  function removeBlankFirstItemRow() {
    const root = $("items-builder-root");
    if (!root) return;
    const rows = root.querySelectorAll(".item-row-card");
    if (rows.length === 1) {
      const row = rows[0];
      const item = row.querySelector(".p-item");
      if (item && !item.value.trim()) row.remove();
    }
  }
  function addPartToInvoiceRow(groupName, part) {
    const addBtn = $("btn-add-item-row");
    if (!addBtn) return;
    addBtn.click();
    const rows = document.querySelectorAll("#items-builder-root .item-row-card");
    const row = rows[rows.length - 1];
    if (!row) return;
    row.dataset.partId = part.id || "";
    const set = (selector, value) => {
      const el = row.querySelector(selector);
      if (!el) return;
      el.value = value == null ? "" : String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(".p-item", formatGroupPartName(groupName, part.name || ""));
    set(".p-spec", part.spec || "");
    set(".p-qty", "1");
    set(".p-price", Number(part.unitPrice || 0));
    set(".p-amount", Number(part.unitPrice || 0));
    set(".p-tax", "0");
  }

  async function openLargeGroupApplyModal(groupId) {
    if (!groupId || String(groupId) === "__uncategorized_parts__") return;
    const [groupsPayload, partsPayload] = await Promise.all([api("/api/groups"), api("/api/parts")]);
    const groups = asArray(groupsPayload);
    const parts = asArray(partsPayload);
    const group = groups.find((g) => String(g.id) === String(groupId));
    if (!group) return alert("그룹을 찾을 수 없습니다.");
    const selectedParts = (group.partIds || [])
      .map((pid) => parts.find((p) => String(p.id) === String(pid)))
      .filter(Boolean);
    if (!selectedParts.length) return alert("이 그룹에 등록된 품목이 없습니다.");

    document.querySelectorAll(".v36-group-modal-overlay").forEach((el) => el.remove());
    const overlay = document.createElement("div");
    overlay.className = "v36-group-modal-overlay";
    overlay.innerHTML = `
      <div class="v36-group-modal">
        <div class="v36-group-head">
          <div>
            <h3><i class="fa-solid fa-layer-group"></i> ${safe(group.name)} 그룹 품목 선택</h3>
            <p>선택한 품목은 명세서에 <b>[${safe(group.name)}]품목명</b>으로 들어가고, 재고는 원래 품목 기준으로 차감됩니다.</p>
          </div>
          <button type="button" class="v36-group-x" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="v36-group-tools">
          <input type="text" class="v36-group-search" placeholder="품목명 / 규격 / 재고 검색" />
          <button type="button" class="btn btn-o btn-sm v36-group-all">전체선택</button>
          <button type="button" class="btn btn-o btn-sm v36-group-none">전체해제</button>
          <span class="v36-group-count"></span>
        </div>
        <div class="v36-group-list">
          ${selectedParts.map((p) => `
            <label class="v36-group-item" data-key="${safe(`${p.name || ""} ${p.spec || ""} ${p.stock || ""}`.toLowerCase())}">
              <input type="checkbox" class="v36-group-check" data-pid="${safe(p.id)}" />
              <span class="v36-group-main">
                <strong>${safe(p.name || "")}</strong>
                <small>${safe(p.spec || "규격 없음")}</small>
              </span>
              <em>재고 ${money(p.stock)} · ${money(p.unitPrice)}원</em>
            </label>`).join("")}
        </div>
        <div class="v36-group-foot">
          <button type="button" class="btn btn-o v36-group-cancel">취소</button>
          <button type="button" class="btn btn-p v36-group-ok"><i class="fa-solid fa-plus"></i> 선택 품목 추가</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    const updateCount = () => {
      const checked = overlay.querySelectorAll(".v36-group-check:checked").length;
      overlay.querySelector(".v36-group-count").textContent = `선택 ${checked}개 / 전체 ${selectedParts.length}개`;
    };
    const filter = () => {
      const q = overlay.querySelector(".v36-group-search").value.trim().toLowerCase();
      overlay.querySelectorAll(".v36-group-item").forEach((item) => {
        item.style.display = !q || item.dataset.key.includes(q) ? "" : "none";
      });
    };
    overlay.querySelector(".v36-group-x").addEventListener("click", close);
    overlay.querySelector(".v36-group-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
    overlay.querySelector(".v36-group-search").addEventListener("input", filter);
    overlay.querySelector(".v36-group-all").addEventListener("click", () => {
      overlay.querySelectorAll(".v36-group-item").forEach((item) => {
        if (item.style.display !== "none") item.querySelector(".v36-group-check").checked = true;
      });
      updateCount();
    });
    overlay.querySelector(".v36-group-none").addEventListener("click", () => {
      overlay.querySelectorAll(".v36-group-check").forEach((chk) => chk.checked = false);
      updateCount();
    });
    overlay.querySelectorAll(".v36-group-check").forEach((chk) => chk.addEventListener("change", updateCount));
    overlay.querySelector(".v36-group-ok").addEventListener("click", () => {
      const ids = Array.from(overlay.querySelectorAll(".v36-group-check:checked")).map((chk) => chk.dataset.pid);
      if (!ids.length) return alert("추가할 품목을 선택해주세요.");
      removeBlankFirstItemRow();
      ids.forEach((pid) => {
        const part = selectedParts.find((p) => String(p.id) === String(pid));
        if (part) addPartToInvoiceRow(group.name, part);
      });
      const sel = $("group-apply-select");
      if (sel) sel.value = "";
      close();
    });
    updateCount();
    setTimeout(() => overlay.querySelector(".v36-group-search").focus(), 50);
  }

  function bindGroupSelectOverride() {
    const sel = $("group-apply-select");
    const btn = $("btn-apply-group");
    if (!sel || sel.dataset.v36Bound === "1") return;
    sel.dataset.v36Bound = "1";

    const open = async () => {
      const gid = sel.value;
      if (String(gid) === "__uncategorized_parts__") return;
      if (!gid || window.__v36GroupOpening) return;
      window.__v36GroupOpening = true;
      try { await openLargeGroupApplyModal(gid); }
      catch (e) { alert(e.message || "그룹 품목을 불러오지 못했습니다."); }
      finally { setTimeout(() => { window.__v36GroupOpening = false; }, 250); }
    };

    sel.addEventListener("change", open, true);
    sel.addEventListener("input", open, true);
    sel.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && sel.value) {
        ev.preventDefault();
        open();
      }
    }, true);

    if (btn && btn.dataset.v36Bound !== "1") {
      btn.dataset.v36Bound = "1";
      btn.addEventListener("click", (ev) => {
        if (!sel.value) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        open();
      }, true);
    }
  }

  async function importRepairRecords() {
    if (!confirm("거래내역에 일반[수리]로 저장된 명세서를 접수대장으로 불러올까요?\n이미 불러온 명세서는 중복 등록하지 않습니다.")) return;
    try {
      const result = await api("/api/repair-log/import-record-repairs", { method: "POST", body: JSON.stringify({}) });
      alert(`수리 명세서 불러오기 완료\n추가 ${result.created || 0}건 · 갱신 ${result.updated || 0}건`);
      if (location.hash === "#repair") location.reload();
    } catch (e) {
      alert(e.message || "수리 명세서를 불러오지 못했습니다.");
    }
  }

  function bindRepairImportButtons() {
    ["repair-import-records", "repair-import-records-inline", "repair-import-records-hero"].forEach((id) => {
      const btn = $(id);
      if (!btn || btn.dataset.v36Bound === "1") return;
      btn.dataset.v36Bound = "1";
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        importRepairRecords();
      }, true);
    });
  }

  function openDailyReportPage() {
    const tab = $("tab-daily");
    if (tab) tab.click();
    else location.hash = "#daily";
  }
  function bindDailyOpenButtons() {
    const btn = $("btn-open-daily-report");
    if (!btn || btn.dataset.v36Bound === "1") return;
    btn.dataset.v36Bound = "1";
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      openDailyReportPage();
    });
  }

  function getCustomer(row) {
    const company = row.company && row.company !== "-" ? row.company : "";
    const name = row.name && row.name !== "-" ? row.name : "";
    return [company, name].filter(Boolean).join(" / ") || "-";
  }
  function getRecordTotal(row) {
    return (Number(row.amount) || 0) + (Number(row.tax) || 0);
  }
  function groupSum(records) {
    const pay = { 현금: 0, 카드: 0, 계좌이체: 0, 외상: 0, 미기재: 0 };
    let supply = 0, tax = 0, total = 0, creditPaid = 0, creditUnpaid = 0;
    records.forEach((r) => {
      const s = Number(r.amount) || 0;
      const tx = Number(r.tax) || 0;
      const ttl = s + tx;
      supply += s; tax += tx; total += ttl;
      const key = Object.prototype.hasOwnProperty.call(pay, r.payMethod) ? r.payMethod : "미기재";
      pay[key] += ttl;
      if (r.payMethod === "외상") {
        if (r.collected) creditPaid += ttl;
        else creditUnpaid += ttl;
      }
    });
    return { pay, supply, tax, total, creditPaid, creditUnpaid };
  }
  function buildEnhancedDailyPrint(date, records, repairs, memo) {
    const sum = groupSum(records);
    const repairTotal = repairs.reduce((a, r) => a + (Number(r.repairCost) || 0), 0);
    const repairUnpaid = repairs.reduce((a, r) => a + (!r.paid ? Number(r.repairCost) || 0 : 0), 0);
    const itemRows = [];
    records.forEach((record) => {
      const items = Array.isArray(record.items) && record.items.length ? record.items : [{ item: record.note || "-", qty: "", price: "", amount: record.amount, tax: record.tax, note: "" }];
      items.forEach((item, idx) => {
        itemRows.push({ record, item, idx });
      });
    });
    const creditRows = records.filter((r) => r.payMethod === "외상");
    return `<!doctype html><html><head><meta charset="utf-8"><title>일일정산서 ${safe(date)}</title><style>
      *{box-sizing:border-box}body{font-family:'Malgun Gothic',Arial,sans-serif;margin:0;color:#0f172a;background:#fff}
      .sheet{width:190mm;margin:0 auto;padding:8mm 7mm}
      .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f766e;padding-bottom:7px;margin-bottom:9px}
      h1{font-size:23px;margin:0;letter-spacing:-.04em}.sub{font-size:10.5px;color:#64748b;margin-top:2px}.date{font-weight:900;color:#0f766e;font-size:15px}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:7px 0 9px}.box{border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#f8fafc}.box span{display:block;font-size:9.5px;color:#64748b;font-weight:900}.box b{font-size:12px}
      .paygrid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:9px}.pay{border:1px solid #e2e8f0;border-radius:6px;padding:5px;font-size:10px}.pay b{display:block;text-align:right;font-size:11px}
      h2{font-size:13px;margin:10px 0 5px;color:#0f172a}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.2px}th,td{border:1px solid #cbd5e1;padding:3.5px 4px;vertical-align:middle;word-break:keep-all}th{background:#f1f5f9;text-align:center;font-weight:900;color:#334155}.num{text-align:right;font-family:Consolas,'Courier New',monospace}.center{text-align:center}.muted{color:#64748b}.detail{white-space:pre-wrap;line-height:1.35}.empty{text-align:center;color:#94a3b8;padding:9px}
      .memo{border:1px solid #cbd5e1;border-radius:7px;min-height:18mm;padding:7px;font-size:10px;white-space:pre-wrap}.signs{display:grid;grid-template-columns:1fr 35mm 35mm;gap:8px;margin-top:10px;align-items:end}.sign{height:14mm;border-bottom:1px solid #64748b;text-align:center;font-size:10px;color:#475569;padding-top:8mm}
      @media print{@page{size:A4 portrait;margin:6mm}.sheet{width:auto;padding:0;margin:0}table{font-size:8.8px}th,td{padding:3px}.page-break{break-before:page}}
    </style></head><body><div class="sheet">
      <div class="head"><div><h1>일일정산서</h1><div class="sub">명세서 내역 + 수리접수내역 보고용</div></div><div class="date">${safe(date)}</div></div>
      <div class="summary">
        <div class="box"><span>명세서</span><b>${records.length}건 / ${money(sum.total)}원</b></div>
        <div class="box"><span>공급가액 / 세액</span><b>${money(sum.supply)} / ${money(sum.tax)}</b></div>
        <div class="box"><span>외상 미수</span><b>${money(sum.creditUnpaid)}원</b></div>
        <div class="box"><span>수리접수</span><b>${repairs.length}건 / ${money(repairTotal)}원</b></div>
      </div>
      <div class="paygrid">
        <div class="pay">현금<b>${money(sum.pay.현금)}원</b></div><div class="pay">카드<b>${money(sum.pay.카드)}원</b></div><div class="pay">계좌이체<b>${money(sum.pay.계좌이체)}원</b></div><div class="pay">외상<b>${money(sum.pay.외상)}원</b></div><div class="pay">수리 미결제<b>${money(repairUnpaid)}원</b></div>
      </div>
      <h2>1. 명세서 요약</h2>
      <table><thead><tr><th style="width:7mm">No</th><th>거래처</th><th style="width:24mm">분류</th><th>대표품목</th><th style="width:17mm">결제</th><th style="width:18mm">공급가액</th><th style="width:15mm">세액</th><th style="width:18mm">합계</th><th style="width:18mm">외상</th></tr></thead><tbody>
        ${records.length ? records.map((r, i) => `<tr><td class="center">${i + 1}</td><td>${safe(getCustomer(r))}</td><td>${safe(r.part || r.cat || "-")}</td><td>${safe(r.note || "-")}</td><td class="center">${safe(r.payMethod || "미기재")}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.tax)}</td><td class="num">${money(getRecordTotal(r))}</td><td class="center">${r.payMethod === "외상" ? (r.collected ? "수금완료" : "미수") : "-"}</td></tr>`).join("") : '<tr><td colspan="9" class="empty">명세서 내역 없음</td></tr>'}
      </tbody></table>
      <h2>2. 품목 상세</h2>
      <table><thead><tr><th style="width:7mm">No</th><th>거래처</th><th>품목</th><th style="width:20mm">규격</th><th style="width:12mm">수량</th><th style="width:18mm">단가</th><th style="width:20mm">공급가액</th><th style="width:20mm">비고</th></tr></thead><tbody>
        ${itemRows.length ? itemRows.map((row, i) => `<tr><td class="center">${i + 1}</td><td>${safe(row.idx === 0 ? getCustomer(row.record) : "")}</td><td>${safe(row.item.item || row.item.name || "-")}</td><td>${safe(row.item.spec || "")}</td><td class="num">${safe(row.item.qty || "")}</td><td class="num">${row.item.price === "" ? "" : money(row.item.price)}</td><td class="num">${money(row.item.amount)}</td><td>${safe(row.item.note || "")}</td></tr>`).join("") : '<tr><td colspan="8" class="empty">품목 상세 없음</td></tr>'}
      </tbody></table>
      <h2>3. 외상/미수 확인</h2>
      <table><thead><tr><th style="width:7mm">No</th><th>거래처</th><th>대표품목</th><th style="width:24mm">금액</th><th style="width:22mm">상태</th><th>연락처</th></tr></thead><tbody>
        ${creditRows.length ? creditRows.map((r, i) => `<tr><td class="center">${i + 1}</td><td>${safe(getCustomer(r))}</td><td>${safe(r.note || "-")}</td><td class="num">${money(getRecordTotal(r))}</td><td class="center">${r.collected ? "수금완료" : "미수"}</td><td>${safe(r.phone || "")}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">외상 내역 없음</td></tr>'}
      </tbody></table>
      <h2>4. 수리접수내역</h2>
      <table><thead><tr><th style="width:7mm">No</th><th style="width:22mm">모델명</th><th style="width:18mm">성함</th><th style="width:24mm">연락처</th><th>수리내역</th><th style="width:20mm">수리비</th><th style="width:18mm">연락</th><th style="width:18mm">결제</th></tr></thead><tbody>
        ${repairs.length ? repairs.map((r, i) => `<tr><td class="center">${i + 1}</td><td>${safe(r.modelName || "-")}</td><td>${safe(r.name || "-")}</td><td>${safe(r.phone || "-")}</td><td class="detail">${safe(r.repairDetail || "-")}</td><td class="num">${money(r.repairCost)}</td><td class="center">${safe(r.contactStatus || "미연락")}</td><td class="center">${r.paid ? "결제완료" : "미결제"}</td></tr>`).join("") : '<tr><td colspan="8" class="empty">수리접수 없음</td></tr>'}
      </tbody></table>
      <h2>5. 보고 메모</h2><div class="memo">${memo ? safe(memo) : "특이사항 없음"}</div>
      <div class="signs"><div class="muted">보고완료 · 정산서 저장 · 출력일시: ${safe(new Date().toLocaleString("ko-KR"))}</div><div class="sign">작성자</div><div class="sign">확인자</div></div>
    </div></body></html>`;
  }
  async function printEnhancedDailyReport() {
    const date = $("daily-report-date") && $("daily-report-date").value ? $("daily-report-date").value : today();
    const memo = $("daily-report-memo") ? $("daily-report-memo").value.trim() : "";
    const [recordsPayload, repairsPayload] = await Promise.all([api("/api/records"), api("/api/repair-log")]);
    const records = asArray(recordsPayload).filter((row) => String(row.date || "") === date);
    const repairs = asArray(repairsPayload).filter((row) => String(row.date || "") === date);
    const html = buildEnhancedDailyPrint(date, records, repairs, memo);
    const frame = document.createElement("iframe");
    frame.style.position = "fixed"; frame.style.right = "0"; frame.style.bottom = "0"; frame.style.width = "0"; frame.style.height = "0"; frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 1000);
    }, 180);
  }
  function bindEnhancedDailyPrint() {
    const btn = $("daily-report-print");
    if (!btn || btn.dataset.v36Bound === "1") return;
    btn.dataset.v36Bound = "1";
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      printEnhancedDailyReport().catch((e) => alert(e.message || "일일정산서를 출력하지 못했습니다."));
    }, true);
  }

  function bindAll() {
    bindGroupSelectOverride();
    bindRepairImportButtons();
    bindDailyOpenButtons();
    bindEnhancedDailyPrint();
  }
  document.addEventListener("DOMContentLoaded", bindAll);
  document.addEventListener("click", () => setTimeout(bindAll, 0), true);
  window.NaepoV36Fixes = { bindAll, openLargeGroupApplyModal, importRepairRecords, printEnhancedDailyReport };
})();


/* ===== v37-group-select-reset-fix-20260703 =====
   그룹 선택 후 select 값이 남아 있어 다음 클릭 때 이전 그룹 모달이 다시 뜨는 문제 수정.
   - 그룹 선택은 change 이벤트에서만 모달을 엽니다.
   - 모달을 연 직후 select 값을 공란으로 돌립니다.
   - 기존 click 이벤트가 이전 그룹을 다시 여는 것을 capture 단계에서 차단합니다.
*/
(() => {
  function bindFinalGroupSelectFix() {
    const sel = document.getElementById("group-apply-select");
    const btn = document.getElementById("btn-apply-group");
    if (!sel || sel.dataset.v37Bound === "1") return;
    sel.dataset.v37Bound = "1";

    const openGroup = async (gid) => {
      if (!gid || window.__v37GroupOpening) return;
      window.__v37GroupOpening = true;
      try {
        if (window.NaepoV36Fixes && typeof window.NaepoV36Fixes.openLargeGroupApplyModal === "function") {
          await window.NaepoV36Fixes.openLargeGroupApplyModal(gid);
        } else if (btn) {
          btn.click();
        }
      } finally {
        setTimeout(() => {
          sel.value = "";
          window.__v37GroupOpening = false;
        }, 120);
      }
    };

    // 이전 버전의 click 리스너가 현재 선택된 값을 다시 열지 못하게 막음.
    ["click", "mouseup"].forEach((type) => {
      sel.addEventListener(type, (ev) => {
        ev.stopImmediatePropagation();
      }, true);
    });

    sel.addEventListener("change", (ev) => {
      ev.stopImmediatePropagation();
      const gid = sel.value;
      openGroup(gid);
    }, true);

    sel.addEventListener("input", (ev) => {
      ev.stopImmediatePropagation();
      const gid = sel.value;
      openGroup(gid);
    }, true);

    if (btn && btn.dataset.v37Bound !== "1") {
      btn.dataset.v37Bound = "1";
      btn.addEventListener("click", (ev) => {
        const gid = sel.value;
        if (!gid) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        openGroup(gid);
      }, true);
    }

    // 혹시 이전 선택값이 남아 있는 상태로 페이지가 열리면 초기화
    setTimeout(() => { sel.value = ""; }, 0);
  }

  document.addEventListener("DOMContentLoaded", bindFinalGroupSelectFix);
  document.addEventListener("click", () => setTimeout(bindFinalGroupSelectFix, 0), true);
})();


/* ===== v43-invoice-normal-print-marker-20260706 =====
   :has() 선택자 의존을 제거하기 위해 인쇄 대상에 명시적인 class를 붙입니다.
   일반 공급자/받는자 출력: invoice-normal-print
   선택일괄인쇄: invoice-batch-print
*/
(() => {
  function markInvoicePrintModeV43() {
    const target = document.getElementById("print-target-area");
    if (!target) return;
    const hasInvoice = !!target.querySelector(".tfs");
    const isBatch = !!target.querySelector(".lp-page");
    target.classList.toggle("invoice-batch-print", hasInvoice && isBatch);
    target.classList.toggle("invoice-normal-print", hasInvoice && !isBatch);
  }

  window.addEventListener("beforeprint", markInvoicePrintModeV43, true);
  document.addEventListener("click", () => setTimeout(markInvoicePrintModeV43, 0), true);
  document.addEventListener("input", () => setTimeout(markInvoicePrintModeV43, 0), true);

  const target = document.getElementById("print-target-area");
  if (target && window.MutationObserver) {
    new MutationObserver(markInvoicePrintModeV43).observe(target, { childList: true, subtree: true });
  }
})();


/* ===== v46-dashboard-work-alerts-20260710 =====
   로그인 후 메인화면에서 미수금/거래미완료/수리미완료 알림을 보여줍니다.
   localStorage 기반으로 1/3/6/12/24시간 안 보기 지원.
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const SNOOZE_KEY = "naepo_dashboard_work_alert_snoozed_until_v46";
  let loading = false;

  const $ = (id) => document.getElementById(id);
  const money = (value) => (Number(value) || 0).toLocaleString("ko-KR");
  const safe = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  }

  async function api(path) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API_BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
  }

  function snoozedUntil() {
    const value = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function isSnoozed() {
    return Date.now() < snoozedUntil();
  }

  function formatSnoozeLeft() {
    const leftMs = Math.max(0, snoozedUntil() - Date.now());
    if (!leftMs) return "";
    const mins = Math.ceil(leftMs / 60000);
    if (mins < 60) return `${mins}분`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hours}시간 ${rem}분` : `${hours}시간`;
  }

  function setSnooze(hours) {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + Number(hours) * 60 * 60 * 1000));
    renderAlert(lastSummary);
  }

  function clearSnooze() {
    localStorage.removeItem(SNOOZE_KEY);
    renderAlert(lastSummary);
  }

  function recordTotal(row) {
    return (Number(row.amount) || 0) + (Number(row.tax) || 0);
  }

  function buildSummary(records, repairs) {
    const unpaidCredits = records.filter((r) => r && r.payMethod === "외상" && !r.collected);
    const pendingRecords = records.filter((r) => r && String(r.status || "done") === "pending");
    const undoneRepairs = repairs.filter((r) => r && !r.repairDone);

    const creditTotal = unpaidCredits.reduce((sum, r) => sum + recordTotal(r), 0);
    const pendingTotal = pendingRecords.reduce((sum, r) => sum + recordTotal(r), 0);
    const repairTotal = undoneRepairs.reduce((sum, r) => sum + (Number(r.repairCost) || 0), 0);

    return {
      unpaidCredits,
      pendingRecords,
      undoneRepairs,
      creditTotal,
      pendingTotal,
      repairTotal,
      totalCount: unpaidCredits.length + pendingRecords.length + undoneRepairs.length,
    };
  }

  function ensureAlertNode() {
    let node = $("dash-work-alert-v46");
    if (node) return node;

    node = document.createElement("section");
    node.id = "dash-work-alert-v46";
    node.className = "dash-work-alert-v46";

    const page = $("page-dashboard");
    const toolbar = page && page.querySelector(".dash-toolbar");
    if (toolbar && toolbar.parentNode) toolbar.insertAdjacentElement("afterend", node);
    else if (page) page.prepend(node);
    return node;
  }

  function goTab(tabId) {
    const tab = $(tabId);
    if (tab) tab.click();
  }

  let lastSummary = null;

  function renderAlert(summary) {
    lastSummary = summary;
    const node = ensureAlertNode();
    if (!node || !summary) return;

    const hidden = isSnoozed();
    const left = formatSnoozeLeft();

    if (hidden) {
      node.className = "dash-work-alert-v46 snoozed";
      node.innerHTML = `
        <div class="dash-alert-snoozed">
          <div>
            <strong><i class="fa-solid fa-bell-slash"></i> 업무 알림 숨김 중</strong>
            <span>${safe(left)} 후 다시 표시됩니다. 미수금 ${summary.unpaidCredits.length}건 · 거래미완료 ${summary.pendingRecords.length}건 · 수리미완료 ${summary.undoneRepairs.length}건</span>
          </div>
          <button type="button" class="dash-alert-btn primary" data-alert-action="show-now">지금 보기</button>
        </div>`;
      return;
    }

    const hasIssue = summary.totalCount > 0;
    node.className = "dash-work-alert-v46" + (hasIssue ? " has-issue" : " all-clear");
    node.innerHTML = `
      <div class="dash-alert-head">
        <div>
          <strong><i class="fa-solid ${hasIssue ? "fa-triangle-exclamation" : "fa-circle-check"}"></i> 오늘 확인할 업무 알림</strong>
          <span>${hasIssue ? "처리가 필요한 항목이 있습니다." : "현재 크게 확인할 미처리 항목이 없습니다."}</span>
        </div>
        <div class="dash-alert-snooze">
          <button type="button" data-alert-snooze="1">1시간 안보기</button>
          <button type="button" data-alert-snooze="3">3시간</button>
          <button type="button" data-alert-snooze="6">6시간</button>
          <button type="button" data-alert-snooze="12">12시간</button>
          <button type="button" data-alert-snooze="24">24시간</button>
        </div>
      </div>
      <div class="dash-alert-grid">
        <button type="button" class="dash-alert-card credit" data-alert-tab="tab-customer">
          <span>미수금 현황</span>
          <strong>${summary.unpaidCredits.length}건</strong>
          <em>${money(summary.creditTotal)}원</em>
        </button>
        <button type="button" class="dash-alert-card pending" data-alert-tab="tab-list">
          <span>거래 미완료건</span>
          <strong>${summary.pendingRecords.length}건</strong>
          <em>${money(summary.pendingTotal)}원</em>
        </button>
        <button type="button" class="dash-alert-card repair" data-alert-tab="tab-repair">
          <span>접수대장 수리미완료</span>
          <strong>${summary.undoneRepairs.length}건</strong>
          <em>수리비 ${money(summary.repairTotal)}원</em>
        </button>
      </div>
      ${hasIssue ? `
        <div class="dash-alert-preview">
          ${summary.unpaidCredits.slice(0, 3).map((r) => `<span class="credit">미수 ${safe(r.company && r.company !== "-" ? r.company : r.name || "고객")} · ${money(recordTotal(r))}원</span>`).join("")}
          ${summary.pendingRecords.slice(0, 3).map((r) => `<span class="pending">거래미완료 ${safe(r.note || r.part || "명세서")}</span>`).join("")}
          ${summary.undoneRepairs.slice(0, 3).map((r) => `<span class="repair">수리미완료 ${safe(r.modelName || r.name || "접수건")}</span>`).join("")}
        </div>` : ""}
    `;
  }

  async function loadAndRenderAlert() {
    if (loading || !getToken() || !$("page-dashboard")) return;
    loading = true;
    try {
      const [records, repairs] = await Promise.all([
        api("/api/records"),
        api("/api/repair-log"),
      ]);
      renderAlert(buildSummary(records, repairs));
    } catch (err) {
      const node = ensureAlertNode();
      if (node) {
        node.className = "dash-work-alert-v46 error";
        node.innerHTML = `
          <div class="dash-alert-snoozed">
            <div>
              <strong><i class="fa-solid fa-circle-exclamation"></i> 업무 알림을 불러오지 못했습니다</strong>
              <span>${safe(err.message || "서버 연결을 확인해주세요.")}</span>
            </div>
            <button type="button" class="dash-alert-btn primary" data-alert-action="reload">다시 불러오기</button>
          </div>`;
      }
    } finally {
      loading = false;
    }
  }

  function bindAlertEvents() {
    document.addEventListener("click", (ev) => {
      const snoozeBtn = ev.target.closest("[data-alert-snooze]");
      if (snoozeBtn) {
        ev.preventDefault();
        setSnooze(Number(snoozeBtn.getAttribute("data-alert-snooze") || 6));
        return;
      }
      const actionBtn = ev.target.closest("[data-alert-action]");
      if (actionBtn) {
        ev.preventDefault();
        const action = actionBtn.getAttribute("data-alert-action");
        if (action === "show-now") clearSnooze();
        if (action === "reload") loadAndRenderAlert();
        return;
      }
      const tabBtn = ev.target.closest("[data-alert-tab]");
      if (tabBtn) {
        ev.preventDefault();
        goTab(tabBtn.getAttribute("data-alert-tab"));
      }
    });
  }

  function initDashboardAlerts() {
    bindAlertEvents();
    const tryLoad = () => {
      if (getToken() && $("page-dashboard")) loadAndRenderAlert();
    };
    setTimeout(tryLoad, 600);
    setTimeout(tryLoad, 1600);
    window.addEventListener("focus", () => {
      if (document.visibilityState !== "hidden") loadAndRenderAlert();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadAndRenderAlert();
    });
  }

  document.addEventListener("DOMContentLoaded", initDashboardAlerts);
  window.NaepoDashboardAlertsV46 = { reload: loadAndRenderAlert, clearSnooze };
})();


/* ===== v47-dashboard-work-alert-popup-20260710 =====
   업무 알림을 대시보드 카드형 + 로그인 후 팝업형으로 표시합니다.
   snooze key는 v46 카드 알림과 공유합니다.
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const SNOOZE_KEY = "naepo_dashboard_work_alert_snoozed_until_v46";
  const SESSION_CLOSE_KEY = "naepo_dashboard_work_alert_popup_closed_v47";
  let popupLoading = false;
  let popupShownOnce = false;

  const $ = (id) => document.getElementById(id);
  const money = (value) => (Number(value) || 0).toLocaleString("ko-KR");
  const safe = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  }

  function isSnoozed() {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  }

  function setSnooze(hours) {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + Number(hours) * 60 * 60 * 1000));
    hidePopup();
    if (window.NaepoDashboardAlertsV46 && window.NaepoDashboardAlertsV46.reload) {
      window.NaepoDashboardAlertsV46.reload();
    }
  }

  async function api(path) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API_BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
  }

  function recordTotal(row) {
    return (Number(row.amount) || 0) + (Number(row.tax) || 0);
  }

  function buildSummary(records, repairs) {
    const unpaidCredits = records.filter((r) => r && r.payMethod === "외상" && !r.collected);
    const pendingRecords = records.filter((r) => r && String(r.status || "done") === "pending");
    const undoneRepairs = repairs.filter((r) => r && !r.repairDone);
    return {
      unpaidCredits,
      pendingRecords,
      undoneRepairs,
      creditTotal: unpaidCredits.reduce((sum, r) => sum + recordTotal(r), 0),
      pendingTotal: pendingRecords.reduce((sum, r) => sum + recordTotal(r), 0),
      repairTotal: undoneRepairs.reduce((sum, r) => sum + (Number(r.repairCost) || 0), 0),
      totalCount: unpaidCredits.length + pendingRecords.length + undoneRepairs.length,
    };
  }

  function ensurePopup() {
    let overlay = $("dashboard-work-alert-popup-v47");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "dashboard-work-alert-popup-v47";
    overlay.className = "dash-alert-popup-v47";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="dash-alert-popup-backdrop" data-popup-close="1"></div>
      <div class="dash-alert-popup-box" role="dialog" aria-modal="true" aria-labelledby="dash-alert-popup-title">
        <div class="dash-alert-popup-inner" id="dash-alert-popup-content"></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function hidePopup() {
    const overlay = $("dashboard-work-alert-popup-v47");
    if (!overlay) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
  }

  function customerName(row) {
    return row.company && row.company !== "-" ? row.company : row.name || "고객";
  }

  function renderPopup(summary) {
    const overlay = ensurePopup();
    const content = $("dash-alert-popup-content");
    if (!content) return;

    content.innerHTML = `
      <div class="dash-popup-head">
        <div class="dash-popup-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div>
          <h2 id="dash-alert-popup-title">확인해야 할 업무가 있어</h2>
          <p>미수금, 거래 미완료, 수리 미완료 건을 확인해줘.</p>
        </div>
        <button type="button" class="dash-popup-x" data-popup-close="1" aria-label="닫기">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="dash-popup-summary">
        <button type="button" class="dash-popup-card credit" data-popup-tab="tab-customer">
          <span>미수금 현황</span>
          <strong>${summary.unpaidCredits.length}건</strong>
          <em>${money(summary.creditTotal)}원</em>
        </button>
        <button type="button" class="dash-popup-card pending" data-popup-tab="tab-list">
          <span>거래 미완료건</span>
          <strong>${summary.pendingRecords.length}건</strong>
          <em>${money(summary.pendingTotal)}원</em>
        </button>
        <button type="button" class="dash-popup-card repair" data-popup-tab="tab-repair">
          <span>접수대장 수리미완료</span>
          <strong>${summary.undoneRepairs.length}건</strong>
          <em>수리비 ${money(summary.repairTotal)}원</em>
        </button>
      </div>

      <div class="dash-popup-list">
        ${summary.unpaidCredits.slice(0, 5).map((r) => `<div class="credit"><b>미수금</b><span>${safe(customerName(r))} · ${safe(r.note || r.part || "명세서")} · ${money(recordTotal(r))}원</span></div>`).join("")}
        ${summary.pendingRecords.slice(0, 5).map((r) => `<div class="pending"><b>거래미완료</b><span>${safe(customerName(r))} · ${safe(r.note || r.part || "명세서")} · ${money(recordTotal(r))}원</span></div>`).join("")}
        ${summary.undoneRepairs.slice(0, 5).map((r) => `<div class="repair"><b>수리미완료</b><span>${safe(r.name || "고객")} · ${safe(r.modelName || "모델명 없음")} · ${safe(r.repairDetail || "수리내역")}</span></div>`).join("")}
      </div>

      <div class="dash-popup-actions">
        <button type="button" class="dash-popup-main" data-popup-close="1">
          확인했어
        </button>
        <div class="dash-popup-snooze">
          <span>다시 알림 숨기기</span>
          <button type="button" data-popup-snooze="1">1시간</button>
          <button type="button" data-popup-snooze="3">3시간</button>
          <button type="button" data-popup-snooze="6">6시간</button>
          <button type="button" data-popup-snooze="12">12시간</button>
          <button type="button" data-popup-snooze="24">24시간</button>
        </div>
      </div>`;

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      const first = content.querySelector(".dash-popup-main");
      if (first) first.focus();
    }, 80);
  }

  async function loadPopupAlert(force) {
    if (popupLoading || !getToken()) return;
    if (!force && (isSnoozed() || popupShownOnce || sessionStorage.getItem(SESSION_CLOSE_KEY) === "1")) return;

    popupLoading = true;
    try {
      const [records, repairs] = await Promise.all([
        api("/api/records"),
        api("/api/repair-log"),
      ]);
      const summary = buildSummary(records, repairs);
      if (summary.totalCount > 0 && (!isSnoozed() || force)) {
        popupShownOnce = true;
        renderPopup(summary);
      }
    } catch (_) {
      // 팝업은 필수 알림 용도지만, 조회 실패 시 기존 대시보드 카드 알림이 에러를 보여주므로 여기서는 조용히 처리
    } finally {
      popupLoading = false;
    }
  }

  function bindPopupEvents() {
    document.addEventListener("click", (ev) => {
      const snooze = ev.target.closest("[data-popup-snooze]");
      if (snooze) {
        ev.preventDefault();
        setSnooze(Number(snooze.getAttribute("data-popup-snooze") || 6));
        return;
      }

      const tabBtn = ev.target.closest("[data-popup-tab]");
      if (tabBtn) {
        ev.preventDefault();
        const tab = $(tabBtn.getAttribute("data-popup-tab"));
        hidePopup();
        if (tab) tab.click();
        return;
      }

      if (ev.target.closest("[data-popup-close]")) {
        ev.preventDefault();
        sessionStorage.setItem(SESSION_CLOSE_KEY, "1");
        hidePopup();
      }
    });

    document.addEventListener("keydown", (ev) => {
      const overlay = $("dashboard-work-alert-popup-v47");
      if (!overlay || !overlay.classList.contains("show")) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        sessionStorage.setItem(SESSION_CLOSE_KEY, "1");
        hidePopup();
      }
    });
  }

  function initPopupAlerts() {
    bindPopupEvents();
    setTimeout(() => loadPopupAlert(false), 900);
    setTimeout(() => loadPopupAlert(false), 1800);
  }

  // v48에서 확장 팝업으로 교체함
  window.NaepoDashboardPopupAlertsV47 = { showNow: () => loadPopupAlert(true), hide: hidePopup };
})();


/* ===== v48-priority-ops-admin-alerts-inventory-daily-20260710 =====
   1) 재고 차감 이력 확인
   2) 삭제/수정 복구 관리자 페이지
   3) 백업 성공/실패 상태 관리자 페이지
   4) 팝업 알림 확장: 재고부족, 미연락, 외상입금예정, 오래된미수금
   5) 오래된 미수금 7/30/60일 강조
   7) 일일정산서 인쇄 시 보고완료 저장
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const SNOOZE_KEY = "naepo_dashboard_work_alert_snoozed_until_v46";
  const SESSION_CLOSE_KEY = "naepo_dashboard_work_alert_popup_closed_v48";
  let alertLoading = false;
  let popupShownOnce = false;

  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const dateAge = (dateText) => {
    const d = new Date(`${String(dateText || todayStr()).slice(0,10)}T00:00:00`);
    const t = new Date(`${todayStr()}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((t - d) / 86400000));
  };
  const recordTotal = (r) => (Number(r && r.amount) || 0) + (Number(r && r.tax) || 0);
  const customerName = (r) => r && r.company && r.company !== "-" ? r.company : (r && r.name) || "고객";

  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];

  function isSnoozed() {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  }
  function snoozeLeftText() {
    const left = Math.max(0, Number(localStorage.getItem(SNOOZE_KEY) || 0) - Date.now());
    const min = Math.ceil(left / 60000);
    if (!min) return "";
    if (min < 60) return `${min}분`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}시간 ${m}분` : `${h}시간`;
  }
  function setSnooze(hours) {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + Number(hours) * 3600000));
    hidePopup();
    renderDashboardEnhanced(lastSummary);
  }

  function buildSummary(records, repairs, parts, subsidyProjects) {
    const unpaidCredits = records.filter((r) => r && r.payMethod === "외상" && !r.collected);
    const pendingRecords = records.filter((r) => r && String(r.status || "done") === "pending");
    const undoneRepairs = repairs.filter((r) => r && !r.repairDone);
    const noContactRepairs = repairs.filter((r) => r && String(r.contactStatus || "미연락") === "미연락");
    const lowStockParts = parts.filter((p) => p && Number(p.minStock) > 0 && Number(p.stock) <= Number(p.minStock));
    const paymentExpected = unpaidCredits.filter((r) => dateAge(r.date) < 7);
    const old7 = unpaidCredits.filter((r) => dateAge(r.date) >= 7);
    const old30 = unpaidCredits.filter((r) => dateAge(r.date) >= 30);
    const old60 = unpaidCredits.filter((r) => dateAge(r.date) >= 60);
    const subsidyQuotePending = (subsidyProjects || []).filter((r) => r && !r.done && String(r.quoteStatus || "") !== "견적서 발행완료");
    const subsidyContactPending = (subsidyProjects || []).filter((r) => r && !r.done && String(r.contactStatus || "") !== "연락완료");
    const subsidyDocPending = (subsidyProjects || []).filter((r) => r && !r.done && String(r.documentStatus || "") !== "서류완료");
    const subsidyPayPending = (subsidyProjects || []).filter((r) => r && !r.done && String(r.paymentStatus || "") !== "입금확인");
    const subsidyReceiptPending = (subsidyProjects || []).filter((r) => r && !r.done && String(r.receiptStatus || "") !== "영수증 첨부완료");
    return {
      unpaidCredits, pendingRecords, undoneRepairs, noContactRepairs, lowStockParts, paymentExpected, old7, old30, old60,
      subsidyQuotePending, subsidyContactPending, subsidyDocPending, subsidyPayPending, subsidyReceiptPending,
      creditTotal: unpaidCredits.reduce((s,r)=>s+recordTotal(r),0),
      pendingTotal: pendingRecords.reduce((s,r)=>s+recordTotal(r),0),
      repairTotal: undoneRepairs.reduce((s,r)=>s+(Number(r.repairCost)||0),0),
      noContactTotal: noContactRepairs.reduce((s,r)=>s+(Number(r.repairCost)||0),0),
      paymentExpectedTotal: paymentExpected.reduce((s,r)=>s+recordTotal(r),0),
      oldTotal: old7.reduce((s,r)=>s+recordTotal(r),0),
      old30Total: old30.reduce((s,r)=>s+recordTotal(r),0),
      old60Total: old60.reduce((s,r)=>s+recordTotal(r),0),
      subsidySelfPayTotal: subsidyPayPending.reduce((s,r)=>s+(Number(r.selfPay)||0),0),
    };
  }
  function totalIssueCount(s) {
    if (!s) return 0;
    return s.unpaidCredits.length + s.pendingRecords.length + s.undoneRepairs.length + s.noContactRepairs.length + s.lowStockParts.length + s.old7.length + ((s.subsidyPending && s.subsidyPending.length) || 0);
  }

  let lastSummary = null;

  function ensurePopup() {
    let el = $("dashboard-work-alert-popup-v48");
    if (el) return el;
    el = document.createElement("div");
    el.id = "dashboard-work-alert-popup-v48";
    el.className = "dash-alert-popup-v47 dash-alert-popup-v48";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<div class="dash-alert-popup-backdrop" data-v48-popup-close="1"></div><div class="dash-alert-popup-box" role="dialog" aria-modal="true"><div class="dash-alert-popup-inner" id="dash-alert-popup-v48-content"></div></div>`;
    document.body.appendChild(el);
    return el;
  }
  function hidePopup() {
    const el = $("dashboard-work-alert-popup-v48");
    if (el) { el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); }
  }
  function popupCard(kind, title, count, sub, tab) {
    return `<button type="button" class="dash-popup-card ${kind}" data-v48-tab="${safe(tab)}"><span>${safe(title)}</span><strong>${count}건</strong><em>${safe(sub)}</em></button>`;
  }
  function renderPopup(summary, force = false) {
    if (!summary || totalIssueCount(summary) <= 0) return;
    if (!force && (isSnoozed() || sessionStorage.getItem(SESSION_CLOSE_KEY) === "1")) return;
    const overlay = ensurePopup();
    const content = $("dash-alert-popup-v48-content");
    content.innerHTML = `
      <div class="dash-popup-head">
        <div class="dash-popup-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div><h2>꼭 확인해야 할 업무가 있어</h2><p>미수금, 미완료, 재고부족, 미연락, 보조사업 미처리 건을 확인해줘.</p></div>
        <button type="button" class="dash-popup-x" data-v48-popup-close="1"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="dash-popup-summary v48-popup-grid">
        ${popupCard("credit", "미수금 현황", summary.unpaidCredits.length, `${money(summary.creditTotal)}원`, "tab-customer")}
        ${popupCard("pending", "거래 미완료건", summary.pendingRecords.length, `${money(summary.pendingTotal)}원`, "tab-list")}
        ${popupCard("repair", "수리미완료", summary.undoneRepairs.length, `수리비 ${money(summary.repairTotal)}원`, "tab-repair")}
        ${popupCard("stock", "재고부족품목", summary.lowStockParts.length, `최소재고 이하`, "tab-inventory")}
        ${popupCard("contact", "수리접수 미연락", summary.noContactRepairs.length, `${money(summary.noContactTotal)}원`, "tab-repair")}
        ${popupCard("expected", "외상입금예정", summary.paymentExpected.length, `${money(summary.paymentExpectedTotal)}원`, "tab-customer")}
        ${popupCard("old", "오래된 미수금", summary.old7.length, `30일 ${summary.old30.length}건 · 60일 ${summary.old60.length}건`, "tab-customer")}
        ${popupCard("subsidy", "보조사업 미처리", (summary.subsidyPending || []).length, `견적 ${summary.subsidyNeedQuote?.length || 0} · 서류 ${summary.subsidyNeedDocument?.length || 0}`, "tab-subsidy")}
      </div>
      <div class="v48-aging-line">
        <b>오래된 미수금</b>
        <span>7일 이상 ${summary.old7.length}건 / ${money(summary.oldTotal)}원</span>
        <span>30일 이상 ${summary.old30.length}건 / ${money(summary.old30Total)}원</span>
        <span>60일 이상 ${summary.old60.length}건 / ${money(summary.old60Total)}원</span>
      </div>
      <div class="dash-popup-list">
        ${summary.lowStockParts.slice(0,4).map((p)=>`<div class="stock"><b>재고부족</b><span>${safe(p.name)} ${p.spec ? "· " + safe(p.spec) : ""} · 현재 ${money(p.stock)} / 최소 ${money(p.minStock)}</span></div>`).join("")}
        ${summary.old7.slice(0,4).map((r)=>`<div class="old"><b>오래된미수</b><span>${safe(customerName(r))} · ${dateAge(r.date)}일 경과 · ${money(recordTotal(r))}원</span></div>`).join("")}
        ${summary.noContactRepairs.slice(0,4).map((r)=>`<div class="contact"><b>미연락</b><span>${safe(r.name || "고객")} · ${safe(r.modelName || "-")} · ${safe(r.phone || "")}</span></div>`).join("")}
        ${summary.pendingRecords.slice(0,4).map((r)=>`<div class="pending"><b>거래미완료</b><span>${safe(customerName(r))} · ${safe(r.note || r.part || "-")} · ${money(recordTotal(r))}원</span></div>`).join("")}
        ${(summary.subsidyPending || []).slice(0,5).map((r)=>`<div class="subsidy"><b>보조사업</b><span>${safe(r.town || "")} · ${safe(r.name || "대상자")} · ${safe(r.itemName || r.model || "")}</span></div>`).join("")}
      </div>
      <div class="dash-popup-actions">
        <button type="button" class="dash-popup-main" data-v48-popup-close="1">확인했어</button>
        <div class="dash-popup-snooze"><span>다시 알림 숨기기</span><button type="button" data-v48-snooze="1">1시간</button><button type="button" data-v48-snooze="3">3시간</button><button type="button" data-v48-snooze="6">6시간</button><button type="button" data-v48-snooze="12">12시간</button><button type="button" data-v48-snooze="24">24시간</button></div>
      </div>`;
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
  }

  function renderDashboardEnhanced(summary) {
    lastSummary = summary;
    const old = $("dash-work-alert-v46");
    if (old) old.style.display = "none";
    let node = $("dash-work-alert-v48");
    const page = $("page-dashboard");
    if (!page) return;
    if (!node) {
      node = document.createElement("section");
      node.id = "dash-work-alert-v48";
      node.className = "dash-work-alert-v46 dash-work-alert-v48";
      const toolbar = page.querySelector(".dash-toolbar");
      if (toolbar) toolbar.insertAdjacentElement("afterend", node);
      else page.prepend(node);
    }
    if (isSnoozed()) {
      node.className = "dash-work-alert-v46 dash-work-alert-v48 snoozed";
      node.innerHTML = `<div class="dash-alert-snoozed"><div><strong><i class="fa-solid fa-bell-slash"></i> 업무 알림 숨김 중</strong><span>${safe(snoozeLeftText())} 후 다시 표시됩니다.</span></div><button class="dash-alert-btn primary" data-v48-show-now="1">지금 보기</button></div>`;
      return;
    }
    if (!summary) return;
    node.className = "dash-work-alert-v46 dash-work-alert-v48 has-issue";
    node.innerHTML = `
      <div class="dash-alert-head"><div><strong><i class="fa-solid fa-triangle-exclamation"></i> 오늘 확인할 업무 알림</strong><span>미수금/미완료/재고부족/미연락을 한 번에 확인해.</span></div>
      <div class="dash-alert-snooze"><button data-v48-snooze="1">1시간 안보기</button><button data-v48-snooze="3">3시간</button><button data-v48-snooze="6">6시간</button><button data-v48-snooze="12">12시간</button><button data-v48-snooze="24">24시간</button></div></div>
      <div class="dash-alert-grid v48-alert-grid">
        <button class="dash-alert-card credit" data-v48-tab="tab-customer"><span>미수금</span><strong>${summary.unpaidCredits.length}건</strong><em>${money(summary.creditTotal)}원</em></button>
        <button class="dash-alert-card pending" data-v48-tab="tab-list"><span>거래 미완료</span><strong>${summary.pendingRecords.length}건</strong><em>${money(summary.pendingTotal)}원</em></button>
        <button class="dash-alert-card repair" data-v48-tab="tab-repair"><span>수리미완료</span><strong>${summary.undoneRepairs.length}건</strong><em>${money(summary.repairTotal)}원</em></button>
        <button class="dash-alert-card stock" data-v48-tab="tab-inventory"><span>재고부족</span><strong>${summary.lowStockParts.length}건</strong><em>최소재고 이하</em></button>
        <button class="dash-alert-card contact" data-v48-tab="tab-repair"><span>미연락 접수</span><strong>${summary.noContactRepairs.length}건</strong><em>${money(summary.noContactTotal)}원</em></button>
        <button class="dash-alert-card old" data-v48-tab="tab-customer"><span>오래된 미수</span><strong>${summary.old7.length}건</strong><em>30일 ${summary.old30.length} · 60일 ${summary.old60.length}</em></button>
        <button class="dash-alert-card subsidy" data-v48-tab="tab-subsidy"><span>보조사업 미처리</span><strong>${summary.subsidyPending?.length || 0}건</strong><em>견적 ${summary.subsidyNeedQuote?.length || 0} · 입금 ${summary.subsidyNeedPayment?.length || 0}</em></button>
      </div>`;
  }

  async function loadAlertSummary(force = false) {
    if (alertLoading || !token()) return;
    alertLoading = true;
    try {
      const [records, repairs, parts, subsidy] = await Promise.all([api("/api/records"), api("/api/repair-log"), api("/api/parts"), api("/api/subsidy-projects")]);
      const summary = buildSummary(asArray(records), asArray(repairs), asArray(parts));
      summary.subsidy = asArray(subsidy);
      summary.subsidyPending = summary.subsidy.filter((r) => {
        const st = r.statuses || {};
        return !(st.complete && st.quote && st.contact === "연락완료" && st.document && st.payment && st.receipt);
      });
      summary.subsidyNeedQuote = summary.subsidy.filter((r) => !(r.statuses || {}).quote);
      summary.subsidyNeedContact = summary.subsidy.filter((r) => (r.statuses || {}).contact !== "연락완료");
      summary.subsidyNeedDocument = summary.subsidy.filter((r) => !(r.statuses || {}).document);
      summary.subsidyNeedPayment = summary.subsidy.filter((r) => !(r.statuses || {}).payment);
      summary.subsidyNeedReceipt = summary.subsidy.filter((r) => !(r.statuses || {}).receipt);
      renderDashboardEnhanced(summary);
      const dashboard = $("page-dashboard");
      const onDashboard = dashboard && getComputedStyle(dashboard).display !== "none";
      if (onDashboard && totalIssueCount(summary) > 0 && (force || (!popupShownOnce && !isSnoozed() && sessionStorage.getItem(SESSION_CLOSE_KEY) !== "1"))) {
        popupShownOnce = true;
        renderPopup(summary, force);
      }
    } catch (e) {
      console.warn("[업무알림 실패]", e.message);
    } finally {
      alertLoading = false;
    }
  }

  function bindGlobalAlertEvents() {
    document.addEventListener("click", (ev) => {
      const sn = ev.target.closest("[data-v48-snooze]");
      if (sn) { ev.preventDefault(); setSnooze(Number(sn.getAttribute("data-v48-snooze") || 6)); return; }
      const show = ev.target.closest("[data-v48-show-now]");
      if (show) { ev.preventDefault(); localStorage.removeItem(SNOOZE_KEY); sessionStorage.removeItem(SESSION_CLOSE_KEY); renderDashboardEnhanced(lastSummary); renderPopup(lastSummary, true); return; }
      const tab = ev.target.closest("[data-v48-tab]");
      if (tab) { ev.preventDefault(); hidePopup(); const el = $(tab.getAttribute("data-v48-tab")); if (el) el.click(); return; }
      if (ev.target.closest("[data-v48-popup-close]")) { ev.preventDefault(); sessionStorage.setItem(SESSION_CLOSE_KEY, "1"); hidePopup(); }
    });
    document.addEventListener("keydown", (ev) => {
      const pop = $("dashboard-work-alert-popup-v48");
      if (ev.key === "Escape" && pop && pop.classList.contains("show")) {
        sessionStorage.setItem(SESSION_CLOSE_KEY, "1");
        hidePopup();
      }
    });
  }

  // 재고 차감 이력 버튼
  function ensureInventoryHistoryModal() {
    let el = $("inventory-history-modal-v48");
    if (el) return el;
    el = document.createElement("div");
    el.id = "inventory-history-modal-v48";
    el.className = "v48-mini-modal";
    el.innerHTML = `<div class="v48-mini-backdrop" data-v48-inv-close="1"></div><div class="v48-mini-box"><div class="v48-mini-head"><strong><i class="fa-solid fa-boxes-stacked"></i> 재고 차감 이력</strong><button data-v48-inv-close="1"><i class="fa-solid fa-xmark"></i></button></div><div id="inventory-history-body-v48"></div></div>`;
    document.body.appendChild(el);
    return el;
  }
  async function showInventoryHistory(recordId) {
    const modal = ensureInventoryHistoryModal();
    const body = $("inventory-history-body-v48");
    modal.classList.add("show");
    body.innerHTML = `<div class="v48-loading">불러오는 중...</div>`;
    try {
      const data = await api(`/api/records/${encodeURIComponent(recordId)}/inventory-history`);
      body.innerHTML = `
        <div class="v48-inv-summary"><b>${safe(data.customer || "")}</b><span>${safe(data.recordDate || "")}</span></div>
        <table class="v48-inv-table"><thead><tr><th>품목</th><th>수량</th><th>매칭재고</th><th>상태</th><th>차감후재고</th></tr></thead><tbody>
        ${(data.items || []).map((it)=>`<tr><td>${safe(it.itemName)}${it.spec ? `<small>${safe(it.spec)}</small>` : ""}</td><td class="num">${money(it.qty)}</td><td>${safe(it.partName || "-")}</td><td><span class="v48-inv-badge ${it.status === "차감완료" ? "ok" : it.status === "재고매칭없음" ? "bad" : "warn"}">${safe(it.status)}</span></td><td class="num">${it.stockAfter == null ? "-" : money(it.stockAfter)}</td></tr>`).join("") || `<tr><td colspan="5">품목 없음</td></tr>`}
        </tbody></table>
        <div class="v48-inv-log-title">원본 입출고 로그</div>
        <div class="v48-inv-log">${(data.logs || []).map((l)=>`<div><b>${safe(l.type === "out" ? "출고" : "입고/복원")}</b> ${safe(l.partName || "")} / ${money(l.qty)}개 / ${safe(l.note || "")} / ${safe(l.createdAt || "")}</div>`).join("") || "로그 없음"}</div>`;
    } catch (e) {
      body.innerHTML = `<div class="v48-error">${safe(e.message)}</div>`;
    }
  }
  function addInventoryHistoryButtons() {
    document.querySelectorAll(".records-output-cell .ibtns-output").forEach((box) => {
      if (box.querySelector(".btn-inventory-history-v48")) return;
      const ref = box.querySelector("[data-id]");
      const id = ref && ref.getAttribute("data-id");
      if (!id) return;
      const btn = document.createElement("button");
      btn.className = "ibtn btn-inventory-history-v48";
      btn.setAttribute("data-id", id);
      btn.style.color = "#0f766e";
      btn.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> 재고이력`;
      box.appendChild(btn);
    });
  }

  // 관리자: 백업 상태 + 삭제/수정 복구
  function adminPassword() {
    const pw = $("admin-pw");
    return pw ? pw.value.trim() : "";
  }
  async function adminApi(path, options = {}) {
    options.headers = Object.assign({}, options.headers || {}, { "X-Admin-Password": adminPassword() });
    return api(path, options);
  }
  function ensureAdminV48() {
    const panel = $("admin-panel");
    if (!panel || $("admin-v48-section")) return;
    const wrap = document.createElement("div");
    wrap.id = "admin-v48-section";
    wrap.innerHTML = `
      <div class="admin-section admin-v48-backup">
        <div class="admin-log-head"><div><h3><i class="fa-solid fa-shield-heart"></i> 백업 정상 여부</h3><p>자동백업/이메일백업/DB 상태를 한눈에 확인합니다.</p></div><button class="btn btn-o btn-sm" id="admin-v48-backup-refresh"><i class="fa-solid fa-rotate"></i> 새로고침</button></div>
        <div id="admin-v48-backup-body" class="admin-v48-status-grid"></div>
      </div>
      <div class="admin-section admin-v48-restore">
        <div class="admin-log-head"><div><h3><i class="fa-solid fa-trash-can-arrow-up"></i> 삭제/수정 복구</h3><p>삭제하거나 수정하기 전 상태를 보관하고, 필요하면 복구합니다.</p></div><button class="btn btn-o btn-sm" id="admin-v48-trash-refresh"><i class="fa-solid fa-rotate"></i> 새로고침</button></div>
        <div class="admin-log-table-wrap"><table class="admin-log-table admin-v48-trash-table"><thead><tr><th>시간</th><th>구분</th><th>업무</th><th>내용</th><th>상태</th><th>복구</th></tr></thead><tbody id="admin-v48-trash-body"></tbody></table></div>
      </div>`;
    panel.appendChild(wrap);
  }
  function statusCard(title, ok, main, sub) {
    return `<div class="admin-v48-status-card ${ok ? "ok" : "bad"}"><span>${safe(title)}</span><strong>${safe(main || "-")}</strong><small>${safe(sub || "")}</small></div>`;
  }
  async function loadAdminBackupStatus() {
    ensureAdminV48();
    const body = $("admin-v48-backup-body");
    if (!body) return;
    body.innerHTML = `<div class="v48-loading">불러오는 중...</div>`;
    try {
      const data = await adminApi("/api/admin/status");
      const b = data.backupStatus || {};
      body.innerHTML = [
        statusCard("로컬 자동백업", !b.local?.lastError, b.local?.lastAt ? new Date(b.local.lastAt).toLocaleString("ko-KR") : "대기중", b.local?.lastError || `${b.local?.intervalMinutes || "-"}분 간격`),
        statusCard("이메일 백업", b.email?.enabled && !b.email?.lastError, b.email?.enabled ? (b.email?.lastAt ? new Date(b.email.lastAt).toLocaleString("ko-KR") : "대기중") : "비활성", b.email?.lastError || `${b.email?.intervalMinutes || "-"}분 간격`),
        statusCard("PostgreSQL", !!b.postgresReady, b.postgresReady ? "정상 연결" : "JSON 보조 저장", b.postgresLastError || b.storage || ""),
        statusCard("월별백업", !b.monthly?.lastError, b.monthly?.enabled ? (b.monthly?.lastAt ? new Date(b.monthly.lastAt).toLocaleString("ko-KR") : "대기중") : "비활성", b.monthly?.lastError || ""),
      ].join("");
    } catch (e) {
      body.innerHTML = `<div class="v48-error">${safe(e.message)}</div>`;
    }
  }
  async function loadAdminTrash() {
    ensureAdminV48();
    const body = $("admin-v48-trash-body");
    if (!body) return;
    body.innerHTML = `<tr><td colspan="6">불러오는 중...</td></tr>`;
    try {
      const rows = asArray(await adminApi("/api/admin/trash?limit=300"));
      body.innerHTML = rows.map((r)=>`<tr><td>${safe(r.at ? new Date(r.at).toLocaleString("ko-KR") : "")}</td><td>${r.type === "delete" ? "삭제" : "수정전"}</td><td>${safe(r.collectionLabel || r.collection || "")}</td><td>${safe(r.title || r.itemId || "")}</td><td>${r.restored ? "복구완료" : "보관중"}</td><td><button class="btn btn-o btn-sm" data-v48-restore="${safe(r.id)}" ${r.restored ? "disabled" : ""}>복구</button></td></tr>`).join("") || `<tr><td colspan="6">복구 이력이 없습니다.</td></tr>`;
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6">${safe(e.message)}</td></tr>`;
    }
  }

  // 일일정산서 인쇄 시 보고완료 저장
  async function saveDailySettlementBeforePrint() {
    const date = $("daily-report-date")?.value || todayStr();
    const memo = $("daily-report-memo")?.value || "";
    const [recordsPayload, repairsPayload] = await Promise.all([api("/api/records"), api("/api/repair-log")]);
    const records = asArray(recordsPayload).filter((r)=>String(r.date || "") === date);
    const repairs = asArray(repairsPayload).filter((r)=>String(r.date || "") === date);
    const total = records.reduce((s,r)=>s+recordTotal(r),0);
    const repairTotal = repairs.reduce((s,r)=>s+(Number(r.repairCost)||0),0);
    await api("/api/daily-settlements", {
      method: "POST",
      body: JSON.stringify({
        date, memo, records, repairs,
        summary: { recordCount: records.length, repairCount: repairs.length, total, repairTotal, savedBy: "print" },
        printedAt: new Date().toISOString(),
      }),
    });
  }
  function bindDailyPrintSave() {
    const btn = $("daily-report-print");
    if (!btn || btn.dataset.v48PrintSaveBound === "1") return;
    btn.dataset.v48PrintSaveBound = "1";
    btn.addEventListener("click", async (ev) => {
      if (btn.dataset.v48AllowPrint === "1") return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      btn.disabled = true;
      const old = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 저장 후 출력`;
      try {
        await saveDailySettlementBeforePrint();
      } catch (e) {
        alert("정산서 저장 실패: " + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = old;
        btn.dataset.v48AllowPrint = "1";
        btn.click();
        setTimeout(() => { delete btn.dataset.v48AllowPrint; }, 500);
      }
    }, true);
  }

  function init() {
    bindGlobalAlertEvents();
    setTimeout(() => loadAlertSummary(false), 1200);
    setTimeout(() => loadAlertSummary(false), 2400);
    setInterval(() => { if (document.visibilityState === "visible") loadAlertSummary(false); }, 10 * 60 * 1000);

    document.addEventListener("click", (ev) => {
      const inv = ev.target.closest(".btn-inventory-history-v48");
      if (inv) { ev.preventDefault(); showInventoryHistory(inv.getAttribute("data-id")); return; }
      if (ev.target.closest("[data-v48-inv-close]")) { ev.preventDefault(); $("inventory-history-modal-v48")?.classList.remove("show"); return; }
      const restore = ev.target.closest("[data-v48-restore]");
      if (restore) {
        ev.preventDefault();
        if (!confirm("이 항목을 복구할까? 현재 데이터가 이전 상태로 돌아갈 수 있어.")) return;
        adminApi(`/api/admin/trash/${encodeURIComponent(restore.getAttribute("data-v48-restore"))}/restore`, { method: "POST", body: JSON.stringify({}) })
          .then(()=>{ alert("복구 완료"); loadAdminTrash(); loadAdminBackupStatus(); })
          .catch((e)=>alert(e.message));
        return;
      }
    });

    const observer = new MutationObserver(addInventoryHistoryButtons);
    observer.observe(document.body, { childList:true, subtree:true });
    setInterval(addInventoryHistoryButtons, 1000);

    document.addEventListener("click", (ev) => {
      if (ev.target.closest("#btn-admin-login")) setTimeout(()=>{ ensureAdminV48(); loadAdminBackupStatus(); loadAdminTrash(); }, 600);
      if (ev.target.closest("#hdr-admin")) setTimeout(ensureAdminV48, 120);
      if (ev.target.closest("#admin-v48-backup-refresh")) loadAdminBackupStatus();
      if (ev.target.closest("#admin-v48-trash-refresh")) loadAdminTrash();
    });

    bindDailyPrintSave();
    setInterval(bindDailyPrintSave, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.NaepoV48Ops = { reloadAlerts: () => loadAlertSummary(true), loadAdminBackupStatus, loadAdminTrash };
})();


/* ===== v49-v50-subsidy-modules-disabled-by-v52-20260710 ===== */

/* ===== v52-subsidy-list-bulk-edit-fix-20260710 REPLACED_BY_V53 ===== */


/* ===== v53-subsidy-report-pagination-fit-20260710 =====
   보조사업: 가로스크롤 제거형 압축표, 지역+기종 복합필터, 페이지, 비고 표시, 보고서 기능
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  let rows = [];
  let projectRegistryRows = [];
  let projectRegistryAvailable = true;
  let selected = new Set();
  let bound = false;
  let page = 1;
  let pageSize = 20;

  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const num = (v) => Number(String(v == null ? "" : v).replace(/[,원\s]/g, "")) || 0;
  const today = () => new Date().toISOString().slice(0, 10);
  const PROJECT_KEY = "naepo_subsidy_active_project_v63";
  const PROJECT_LIST_KEY = "naepo_subsidy_project_list_v63";
  const PROJECT_LIST_BY_YEAR_KEY = "naepo_subsidy_project_list_by_year_v70";
  const PROJECT_SERVER_MIGRATION_KEY = "naepo_subsidy_project_registry_migrated_v72";
  const DEFAULT_PROJECT_NAME = "여성농업";
  const PROJECT_YEAR_KEY = "naepo_subsidy_active_year_v65";
  function currentProjectYear() {
    return String(new Date().getFullYear());
  }
  function normalizeProjectYear(year) {
    const y = String(year || "").replace(/[^\d]/g, "").slice(0, 4);
    return y || currentProjectYear();
  }
  function activeProjectYear() {
    try { return normalizeProjectYear(localStorage.getItem(PROJECT_YEAR_KEY) || currentProjectYear()); } catch (_) { return currentProjectYear(); }
  }
  function setActiveProjectYear(year) {
    try { localStorage.setItem(PROJECT_YEAR_KEY, normalizeProjectYear(year)); } catch (_) {}
    page = 1;
    selected.clear();
    render();
  }
  function normalizeProjectName(name) {
    const raw = String(name || "").trim();
    if (!raw) return DEFAULT_PROJECT_NAME;
    if (/여성\s*농업|여성농업인|편의장비/.test(raw)) return DEFAULT_PROJECT_NAME;
    return raw;
  }
  function getProjectRegistry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROJECT_LIST_BY_YEAR_KEY) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return {};
  }
  function saveProjectRegistry(registry) {
    try { localStorage.setItem(PROJECT_LIST_BY_YEAR_KEY, JSON.stringify(registry || {})); } catch (_) {}
  }
  function getSavedProjectList(year) {
    const y = normalizeProjectYear(year || activeProjectYear());
    const registry = getProjectRegistry();
    const list = Array.isArray(registry[y]) ? registry[y] : [];
    return [...new Set([DEFAULT_PROJECT_NAME].concat(list.map(normalizeProjectName).filter(Boolean)))];
  }
  function saveProjectList(list, year) {
    const y = normalizeProjectYear(year || activeProjectYear());
    const registry = getProjectRegistry();
    const existing = Array.isArray(registry[y]) ? registry[y] : [];
    const uniq = [...new Set([DEFAULT_PROJECT_NAME].concat(existing.map(normalizeProjectName).filter(Boolean)).concat((list || []).map(normalizeProjectName).filter(Boolean)))];
    registry[y] = uniq;
    saveProjectRegistry(registry);

    // 현재연도는 예전 키도 같이 맞춰둬서 구버전 캐시와 충돌하지 않게 합니다.
    if (y === currentProjectYear()) {
      try { localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(uniq)); } catch (_) {}
    }
    return uniq;
  }
  function removeProjectFromList(projectName, year) {
    const y = normalizeProjectYear(year || activeProjectYear());
    const name = normalizeProjectName(projectName);
    const registry = getProjectRegistry();
    const list = getSavedProjectList(y).filter((p) => p !== name);
    registry[y] = [...new Set([DEFAULT_PROJECT_NAME].concat(list))];
    saveProjectRegistry(registry);
    if (y === currentProjectYear()) {
      try { localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(registry[y])); } catch (_) {}
    }
    return registry[y];
  }
  function activeProjectName() {
    try { return normalizeProjectName(localStorage.getItem(PROJECT_KEY) || DEFAULT_PROJECT_NAME); } catch (_) { return DEFAULT_PROJECT_NAME; }
  }
  function setActiveProjectName(name) {
    const next = normalizeProjectName(name);
    try {
      const yy = activeProjectYear();
      const k = `naepo_subsidy_removed_projects_${yy}_v71`;
      const arr = JSON.parse(localStorage.getItem(k) || "[]").filter((x) => normalizeProjectName(x) !== next);
      localStorage.setItem(k, JSON.stringify(arr));
      localStorage.setItem(PROJECT_KEY, next);
    } catch (_) {
      try { localStorage.setItem(PROJECT_KEY, next); } catch (_) {}
    }
    saveProjectList(getProjectNames().concat(next), activeProjectYear());
    page = 1;
    selected.clear();
    render();
  }
  function rowProjectName(row) {
    return normalizeProjectName(row.projectDisplayName || row.projectTitle || row.projectName || row.businessName || row.subsidyName || DEFAULT_PROJECT_NAME);
  }
  function rowProjectYear(row) {
    return normalizeProjectYear(row.projectYear || row.year || currentProjectYear());
  }
  function getProjectNames() {
    const activeYear = activeProjectYear();
    const fromRegistry = projectRegistryRows
      .filter((r) => normalizeProjectYear(r.projectYear || r.year) === activeYear)
      .map((r) => normalizeProjectName(r.projectName || r.projectDisplayName || r.businessName || r.subsidyName))
      .filter(Boolean);
    const fromRows = rows.map(normalizeRow)
      .filter((r) => rowProjectYear(r) === activeYear)
      .map(rowProjectName)
      .filter(Boolean);
    const localFallback = projectRegistryAvailable ? [] : getSavedProjectList(activeYear);
    const serverNames = [...new Set([DEFAULT_PROJECT_NAME].concat(fromRegistry, fromRows, localFallback))];
    saveProjectList(serverNames, activeYear);
    return serverNames;
  }
  function renderProjectSwitcher() {
    const box = $("subsidy-project-switcher-v63");
    if (!box) return;
    let active = activeProjectName();
    const activeYear = activeProjectYear();
    let names = getProjectNames();
    if (!names.includes(active)) {
      active = DEFAULT_PROJECT_NAME;
      try { localStorage.setItem(PROJECT_KEY, active); } catch (_) {}
    }
    const counts = new Map();
    rows.map(normalizeRow).filter((r) => rowProjectYear(r) === activeYear).forEach((r) => counts.set(rowProjectName(r), (counts.get(rowProjectName(r)) || 0) + 1));
    const yearSet = new Set([currentProjectYear(), String(Number(currentProjectYear()) + 1), activeYear]);
    rows.map(normalizeRow).forEach((r) => yearSet.add(rowProjectYear(r)));
    projectRegistryRows.forEach((r) => yearSet.add(normalizeProjectYear(r.projectYear || r.year)));
    const years = [...yearSet].filter(Boolean).sort();
    box.innerHTML = `
      <div class="subsidy-project-switcher-head">
        <strong><i class="fa-solid fa-folder-tree"></i> 보조사업 선택</strong>
        <span>사업별·연도별로 명단과 상태를 따로 관리합니다.</span>
      </div>
      <div class="subsidy-project-year-row">
        <label>사업연도
          <select id="subsidy-project-year-v65">
            ${years.map((y) => `<option value="${safe(y)}" ${y === activeYear ? "selected" : ""}>${safe(y)}년</option>`).join("")}
          </select>
        </label>
        <button type="button" class="subsidy-project-delete" id="subsidy-project-delete-v65"><i class="fa-solid fa-trash"></i> 현재 사업 삭제</button>
      </div>
      <div class="subsidy-project-buttons">
        ${names.map((name) => `<button type="button" class="subsidy-project-btn ${name === active ? "on" : ""}" data-subsidy-project="${safe(name)}">${safe(name)}<em>${money(counts.get(name) || 0)}명</em></button>`).join("")}
        <button type="button" class="subsidy-project-add" id="subsidy-project-add-v63"><i class="fa-solid fa-plus"></i> 사업추가</button>
      </div>`;
    const title = $("subsidy-current-title");
    if (title) title.textContent = `${activeYear}년 ${active} 보조사업 관리`;
    const desc = $("subsidy-current-desc");
    if (desc) desc.textContent = `${activeYear}년 ${active} 명단 엑셀을 가져오고, 견적서/연락/기대번호/사진/서류/입금/영수증 상태를 관리합니다.`;
  }

  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];

  function phone(v) {
    const s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "";
    return s.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
  }
  function canonicalHeader(h) {
    return String(h || "").replace(/\s+/g, "").replace(/[()（）]/g, "").toLowerCase();
  }
  function get(row, names) {
    const keys = Object.keys(row || {});
    for (const name of names) {
      const n = canonicalHeader(name);
      const exact = keys.find((k) => canonicalHeader(k) === n);
      if (exact && row[exact] != null && String(row[exact]).trim() !== "") return row[exact];
    }
    for (const name of names) {
      const n = canonicalHeader(name);
      const found = keys.find((k) => canonicalHeader(k).includes(n) || n.includes(canonicalHeader(k)));
      if (found && row[found] != null && String(row[found]).trim() !== "") return row[found];
    }
    return "";
  }

  function normalizeImportedRow(raw, idx) {
    const provincialAid = num(get(raw, ["도비", "신청사업비도비", "사업비도비"]));
    const countyAid = num(get(raw, ["군비", "신청사업비군비", "사업비군비"]));
    let supportTotal = num(get(raw, ["지원금액합계", "지원금액 합계", "보조금", "지원금"]));
    if (!supportTotal) supportTotal = provincialAid + countyAid;
    const totalCost = num(get(raw, ["신청사업비원계", "신청사업비계", "신청 사업비 계", "총사업비", "사업비", "계"]));
    let selfPay = num(get(raw, ["자부담", "자부담20%", "자부담금"]));
    if (!selfPay && totalCost) selfPay = Math.max(0, totalCost - supportTotal);
    const yearRaw = get(raw, ["사업연도", "연도", "년도"]) || activeProjectYear();
    const equipment = String(get(raw, ["신청기종", "기종", "품목", "장비"]) || "").trim();
    const model = String(get(raw, ["형식명", "형식명농업기계모", "모델명", "모델", "형식"]) || "").trim();
    return {
      seq: String(get(raw, ["연번", "번호", "순번"]) || idx + 1),
      year: String(yearRaw).replace(/[^\d]/g, "").slice(0,4) || String(new Date().getFullYear()),
      projectYear: String(yearRaw).replace(/[^\d]/g, "").slice(0,4) || String(new Date().getFullYear()),
      projectName: activeProjectName(),
      projectDisplayName: activeProjectName(),
      town: String(get(raw, ["읍면동", "읍면", "지역"]) || "").trim(),
      name: String(get(raw, ["성명", "신청자성명", "이름", "대상자"]) || "").trim(),
      phone: phone(get(raw, ["연락처", "신청자연락처", "전화번호", "휴대폰"])),
      birthDate: String(get(raw, ["생년월일", "생년", "생일", "생년월일성별"]) || "").trim(),
      address: String(get(raw, ["주소", "거주지", "농가주소", "소재지"]) || "").trim(),
      itemName: equipment,
      equipment,
      maker: String(get(raw, ["제조회사", "제조사", "회사", "브랜드"]) || "").trim(),
      model,
      modelName: model,
      totalCost,
      provincialAid,
      provincialSupport: provincialAid,
      countyAid,
      countySupport: countyAid,
      supportTotal,
      selfPay,
      note: String(get(raw, ["비고", "메모", "특이사항"]) || "").trim(),
      statuses: { quote:false, contact:"미연락", machineNo:false, photo:false, document:false, payment:false, receipt:false, officeSubmit:false, complete:false },
    };
  }

  function buildRowsFromSheet(ws) {
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
    const headerIdx = raw.findIndex((row, i) => {
      const line = (row || []).map((c) => String(c || "").trim()).join(" ");
      const next = raw[i + 1] ? raw[i + 1].map((c) => String(c || "").trim()).join(" ") : "";
      return line.includes("연번") && (line + " " + next).includes("성명") && (line + " " + next).includes("연락");
    });
    if (headerIdx < 0) return [];
    const h1 = raw[headerIdx] || [];
    const h2 = raw[headerIdx + 1] || [];
    const max = Math.max(h1.length, h2.length);
    const headers = [];
    for (let i = 0; i < max; i++) {
      const a = String(h1[i] || "").trim();
      const b = String(h2[i] || "").trim();
      let h = b || a || `빈칸${i}`;
      if (a && b && a !== "신청자" && a !== b) h = `${a} ${b}`;
      if (a === "신청자" && b) h = b;
      headers.push(h);
    }
    return raw.slice(headerIdx + 2)
      .filter((row) => row && row.some((c) => String(c || "").trim() !== ""))
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
        return obj;
      });
  }

  function normalizeRow(row) {
    // v73: statuses에 명시된 false도 최종값으로 인정한다.
    // 이전에는 photoStatus 같은 구형 문자열 필드가 false를 다시 true로 덮어써서
    // 완료 상태를 되돌려도 화면에서 계속 완료로 보이는 문제가 있었다.
    const rawStatuses = row && row.statuses && typeof row.statuses === "object" ? row.statuses : {};
    const hasStatus = (key) => Object.prototype.hasOwnProperty.call(rawStatuses, key);
    const st = Object.assign({
      quote:false, contact:"미연락", machineNo:false, photo:false, document:false, payment:false, receipt:false, officeSubmit:false, complete:false,
    }, rawStatuses);
    if (!hasStatus("quote") && row.quoteStatus === "견적서 발행완료") st.quote = true;
    if (!hasStatus("contact") && row.contactStatus) st.contact = row.contactStatus;
    if (!hasStatus("machineNo") && row.machineNo) st.machineNo = true;
    if (!hasStatus("photo") && row.photoStatus === "사진촬영 완료") st.photo = true;
    if (!hasStatus("document") && row.documentStatus === "서류완료") st.document = true;
    if (!hasStatus("officeSubmit") && row.officeSubmitStatus === "서류제출 완료") st.officeSubmit = true;
    if (!hasStatus("payment") && row.paymentStatus === "입금확인") st.payment = true;
    if (!hasStatus("receipt") && row.receiptStatus === "영수증 첨부완료") st.receipt = true;
    if (!hasStatus("complete") && (row.done || String(row.currentStatus || "") === "완료")) st.complete = true;
    return Object.assign({}, row, {
      year: row.year || row.projectYear || "",
      projectYear: row.projectYear || row.year || "",
      projectName: rowProjectName(row),
      projectDisplayName: rowProjectName(row),
      itemName: row.itemName || row.equipment || "",
      equipment: row.equipment || row.itemName || "",
      model: row.model || row.modelName || "",
      modelName: row.modelName || row.model || "",
      birthDate: row.birthDate || row.birth || row.birthday || "",
      address: row.address || row.addr || "",
      note: row.note || row.memo || "",
      statuses: st,
    });
  }

  function filteredRows() {
    const q = ($("subsidy-search")?.value || "").trim().toLowerCase();
    const status = $("subsidy-status-filter")?.value || "";
    const town = $("subsidy-town-filter")?.value || "";
    const equipment = $("subsidy-equipment-filter")?.value || "";
    return rows.map(normalizeRow).filter((r) => {
      const st = r.statuses || {};
      const item = r.itemName || r.equipment || "";
      if (rowProjectName(r) !== activeProjectName() || rowProjectYear(r) !== activeProjectYear()) return false;
      if (town && r.town !== town) return false;
      if (equipment && item !== equipment) return false;
      if ((status === "pending" || status === "active") && st.complete) return false;
      if ((status === "complete" || status === "done") && !st.complete) return false;
      if (status === "quote" && st.quote) return false;
      if (status === "contact" && st.contact === "연락완료") return false;
      if (status === "document" && st.document) return false;
      if (status === "payment" && st.payment) return false;
      if (status === "receipt" && st.receipt) return false;
      if (q) {
        const hay = [r.year,r.town,r.name,r.phone,r.birthDate,r.address,r.itemName,r.equipment,r.maker,r.model,r.modelName,r.note,r.memo,r.machineNo].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a,b) => Number(a.seq || 999999) - Number(b.seq || 999999) || String(a.town || "").localeCompare(String(b.town || "")));
  }

  function pageRows(all) {
    pageSize = Number($("subsidy-page-size")?.value || pageSize || 20);
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    page = Math.min(Math.max(1, page), totalPages);
    return all.slice((page - 1) * pageSize, page * pageSize);
  }

  function statusBtn(row, key, off, on) {
    const st = row.statuses || {};
    if (key === "contact") {
      const v = st.contact || "미연락";
      const cls = v === "연락완료" ? "ok" : v === "연락안됨" ? "bad" : "warn";
      return `<button type="button" class="subsidy-status-btn ${cls}" data-v53-status="${safe(key)}" data-id="${safe(row.id)}">${safe(v)}</button>`;
    }
    const done = Boolean(st[key]);
    return `<button type="button" class="subsidy-status-btn ${done ? "ok" : "warn"}" data-v53-status="${safe(key)}" data-id="${safe(row.id)}">${done ? safe(on) : safe(off)}</button>`;
  }

  function updateFilters() {
    const townSel = $("subsidy-town-filter");
    const equipSel = $("subsidy-equipment-filter");
    if (townSel) {
      const cur = townSel.value;
      const projectRows = rows.map(normalizeRow).filter((r) => rowProjectName(r) === activeProjectName() && rowProjectYear(r) === activeProjectYear());
      const towns = [...new Set(projectRows.map((r) => r.town).filter(Boolean))].sort();
      townSel.innerHTML = `<option value="">전체지역</option>` + towns.map((t) => `<option value="${safe(t)}">${safe(t)}</option>`).join("");
      townSel.value = towns.includes(cur) ? cur : "";
    }
    if (equipSel) {
      const cur = equipSel.value;
      const projectRows = rows.map(normalizeRow).filter((r) => rowProjectName(r) === activeProjectName() && rowProjectYear(r) === activeProjectYear());
      const items = [...new Set(projectRows.map((r) => r.itemName || r.equipment).filter(Boolean))].sort();
      equipSel.innerHTML = `<option value="">전체기종</option>` + items.map((t) => `<option value="${safe(t)}">${safe(t)}</option>`).join("");
      equipSel.value = items.includes(cur) ? cur : "";
    }
  }

  function updateSummary(allFiltered) {
    const normalized = rows.map(normalizeRow).filter((r) => rowProjectName(r) === activeProjectName() && rowProjectYear(r) === activeProjectYear());
    const total = normalized.length;
    const pending = normalized.filter((r) => !r.statuses.complete).length;
    const quote = normalized.filter((r) => !r.statuses.quote).length;
    const contact = normalized.filter((r) => r.statuses.contact !== "연락완료").length;
    const selfPay = normalized.reduce((s,r)=>s+(Number(r.selfPay)||0),0);
    [["subsidy-sum-total", total], ["subsidy-sum-pending", pending], ["subsidy-sum-quote", quote], ["subsidy-sum-contact", contact], ["subsidy-sum-selfpay", selfPay]].forEach(([id, v]) => {
      const el = $(id);
      if (el) el.textContent = money(v);
    });
    const btn = $("subsidy-selected-delete");
    if (btn) btn.innerHTML = `<i class="fa-solid fa-trash-check"></i> 선택삭제 ${selected.size ? `(${selected.size})` : ""}`;
  }

  function renderPagination(all) {
    const box = $("subsidy-pagination-v53");
    if (!box) return;
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    const start = all.length ? ((page - 1) * pageSize + 1) : 0;
    const end = Math.min(all.length, page * pageSize);
    box.innerHTML = `
      <div class="subsidy-page-info">총 ${money(all.length)}명 · ${start}-${end} 표시 · ${page}/${totalPages}페이지</div>
      <div class="subsidy-page-actions">
        <button type="button" class="btn btn-o btn-sm" data-v53-page="first" ${page <= 1 ? "disabled" : ""}>처음</button>
        <button type="button" class="btn btn-o btn-sm" data-v53-page="prev" ${page <= 1 ? "disabled" : ""}>이전</button>
        <button type="button" class="btn btn-o btn-sm" data-v53-page="next" ${page >= totalPages ? "disabled" : ""}>다음</button>
        <button type="button" class="btn btn-o btn-sm" data-v53-page="last" ${page >= totalPages ? "disabled" : ""}>마지막</button>
      </div>`;
  }

  function render() {
    renderProjectSwitcher();
    updateFilters();
    const all = filteredRows();
    updateSummary(all);
    const list = pageRows(all);
    selected = new Set([...selected].filter((id) => rows.some((r) => String(r.id) === String(id))));
    const body = $("subsidy-body");
    if (!body) return;
    body.innerHTML = list.length ? list.map((r, idx) => {
      const displaySeq = (page - 1) * pageSize + idx + 1;
      return `
      <tr data-id="${safe(r.id)}" data-updated-at="${safe(r.updatedAt || r.createdAt || "")}" class="${selected.has(String(r.id)) ? "subsidy-selected-row" : ""}">
        <td class="subsidy-check-cell"><input type="checkbox" class="subsidy-row-check" data-v53-check="${safe(r.id)}" ${selected.has(String(r.id)) ? "checked" : ""} /></td>
        <td class="subsidy-col-no">${displaySeq}</td>
        <td><span class="subsidy-town">${safe(r.town || "")}</span></td>
        <td class="subsidy-person-cell">
          <strong>${safe(r.name || "")}</strong>
          <small>${safe(r.phone || "-")}</small>
          <small>생년: ${safe(r.birthDate || "-")}</small>
          <small class="addr">주소: ${safe(r.address || "-")}</small>
        </td>
        <td class="subsidy-item-cell">${safe(r.itemName || r.equipment || "")}</td>
        <td><strong>${safe(r.maker || "")}</strong><small>${safe(r.model || r.modelName || "")}</small></td>
        <td class="tr">${money(r.totalCost)}</td>
        <td class="tr">${money(r.supportTotal)}</td>
        <td class="tr subsidy-selfpay">${money(r.selfPay)}</td>
        <td class="subsidy-note-cell" title="${safe(r.note || "")}">${safe(r.note || "-")}</td>
        <td><div class="subsidy-status-grid">
          ${statusBtn(r,"quote","견적 미발행","견적 완료")}
          ${statusBtn(r,"contact","미연락","연락완료")}
          ${statusBtn(r,"machineNo","기대번호 미입력","기대번호 완료")}
          ${statusBtn(r,"photo","사진 미촬영","사진 완료")}
          ${statusBtn(r,"document","서류 미완료","서류 완료")}
          ${statusBtn(r,"officeSubmit","서류제출 전","서류제출 완료")}
          ${statusBtn(r,"payment","입금대기","입금확인")}
          ${statusBtn(r,"receipt","영수증 미첨부","영수증 완료")}
          ${statusBtn(r,"complete","완료처리 전","완료")}
        </div>${r.machineNo ? `<div class="subsidy-machine">기대번호: ${safe(r.machineNo)}</div>` : ""}${(r.officeSubmittedAt || (r.statuses && r.statuses.officeSubmit && r.updatedAt)) ? `<div class="subsidy-machine">서류제출: ${safe((window.NaepoSubsidyFormatDateV57 && window.NaepoSubsidyFormatDateV57.fmtDateTime ? window.NaepoSubsidyFormatDateV57.fmtDateTime(r.officeSubmittedAt || r.updatedAt) : String(r.officeSubmittedAt || r.updatedAt).replace("T"," ").replace("Z","").slice(0,16)))}</div>` : ""}</td>
        <td class="subsidy-manage-cell"><div class="subsidy-row-actions">
          <button type="button" class="btn btn-o btn-sm subsidy-invoice" data-v53-invoice="${safe(r.id)}"><i class="fa-solid fa-file-invoice"></i> 명세서</button>
          <button type="button" class="btn btn-o btn-sm subsidy-detail" data-v56-detail="${safe(r.id)}"><i class="fa-solid fa-circle-info"></i> 상세</button>
          <button type="button" class="btn btn-o btn-sm subsidy-machine-btn" data-v53-machine="${safe(r.id)}"><i class="fa-solid fa-hashtag"></i> 기대번호</button>
          <button type="button" class="btn btn-o btn-sm subsidy-edit" data-v53-edit="${safe(r.id)}"><i class="fa-solid fa-pen"></i> 수정</button>
          <button type="button" class="btn btn-o btn-sm d subsidy-delete" data-v53-delete="${safe(r.id)}"><i class="fa-solid fa-trash"></i> 삭제</button>
        </div></td>
      </tr>`; }).join("") : `<tr><td colspan="12" class="empty-td">조건에 맞는 대상자가 없습니다.</td></tr>`;
    const allCheck = $("subsidy-check-all");
    if (allCheck) {
      const ids = list.map((r) => String(r.id));
      allCheck.checked = ids.length > 0 && ids.every((id) => selected.has(id));
      allCheck.indeterminate = ids.some((id) => selected.has(id)) && !allCheck.checked;
    }
    renderPagination(all);
  }

  async function migrateLocalProjectRegistryToServer() {
    try { if (localStorage.getItem(PROJECT_SERVER_MIGRATION_KEY) === "1") return 0; } catch (_) {}
    const localRegistry = getProjectRegistry();
    const existing = new Set(projectRegistryRows.map((r) => `${normalizeProjectYear(r.projectYear || r.year)}|${normalizeProjectName(r.projectName || r.projectDisplayName || r.businessName || r.subsidyName).replace(/\s+/g, "").toLowerCase()}`));
    let created = 0;
    let failed = 0;
    for (const [year, names] of Object.entries(localRegistry || {})) {
      if (!Array.isArray(names)) continue;
      for (const rawName of names) {
        const projectName = normalizeProjectName(rawName);
        const projectYear = normalizeProjectYear(year);
        if (!projectName || projectName === DEFAULT_PROJECT_NAME) continue;
        const key = `${projectYear}|${projectName.replace(/\s+/g, "").toLowerCase()}`;
        if (existing.has(key)) continue;
        try {
          const result = await api("/api/subsidy-project-registry", { method: "POST", body: JSON.stringify({ projectName, projectYear }) });
          if (result && result.project) projectRegistryRows.push(result.project);
          existing.add(key);
          created += result && result.created ? 1 : 0;
        } catch (_) { failed += 1; }
      }
    }
    if (!failed) { try { localStorage.setItem(PROJECT_SERVER_MIGRATION_KEY, "1"); } catch (_) {} }
    return created;
  }

  async function createProjectOnServer(projectName, projectYear) {
    const name = normalizeProjectName(projectName);
    const year = normalizeProjectYear(projectYear || activeProjectYear());
    const result = await api("/api/subsidy-project-registry", { method: "POST", body: JSON.stringify({ projectName: name, projectYear: year }) });
    if (result && result.project) {
      const key = `${year}|${name.replace(/\s+/g, "").toLowerCase()}`;
      projectRegistryRows = projectRegistryRows.filter((r) => `${normalizeProjectYear(r.projectYear || r.year)}|${normalizeProjectName(r.projectName).replace(/\s+/g, "").toLowerCase()}` !== key);
      projectRegistryRows.push(result.project);
    }
    saveProjectList([name], year);
    setActiveProjectName(name);
    await load();
    return result;
  }

  async function load() {
    if (!$("page-subsidy") || !token()) return;
    const [payload, registryPayload] = await Promise.all([
      api("/api/subsidy-projects"),
      api("/api/subsidy-project-registry")
        .then((value) => { projectRegistryAvailable = true; return value; })
        .catch(() => { projectRegistryAvailable = false; return []; }),
    ]);
    rows = asArray(payload).map(normalizeRow);
    projectRegistryRows = asArray(registryPayload);
    const migrated = projectRegistryAvailable ? await migrateLocalProjectRegistryToServer() : 0;
    if (migrated) {
      projectRegistryRows = asArray(await api("/api/subsidy-project-registry").catch(() => projectRegistryRows));
    }
    render();
  }

  async function importFile(file) {
    if (!file) return;
    if (typeof XLSX === "undefined") return alert("엑셀 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도해줘.");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    let data = buildRowsFromSheet(ws);
    if (!data.length) data = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
    const sendRows = data.map(normalizeImportedRow).filter((r) => r.name || r.phone || r.itemName || r.model);
    if (!sendRows.length) return alert("가져올 대상자를 찾지 못했습니다. 엑셀 제목/헤더를 확인해줘.");
    if (!confirm(`[${activeProjectYear()}년 ${activeProjectName()}] 사업에 ${sendRows.length}명을 가져올까?\n같은 대상자는 중복등록하지 않고 업데이트돼.`)) return;
    const result = await api("/api/subsidy-projects/import", { method: "POST", body: JSON.stringify({ rows: sendRows }) });
    alert(`가져오기 완료\n신규 ${result.created || 0}명 / 업데이트 ${result.updated || 0}명 / 제외 ${result.skipped || 0}명`);
    selected.clear();
    page = 1;
    await load();
  }

  async function patchStatus(row, key) {
    let body = { key };
    if (key === "machineNo") {
      const value = prompt("기대번호를 입력해줘.", row.machineNo || "");
      if (value == null) return;
      body = { key, machineNo: value, value: Boolean(value.trim()) };
    }
    const updated = await api(`/api/subsidy-projects/${encodeURIComponent(row.id)}/status`, { method: "PATCH", body: JSON.stringify(body) });
    const idx = rows.findIndex((r) => String(r.id) === String(row.id));
    if (idx >= 0) rows[idx] = normalizeRow(updated);
    render();
  }

  function toInvoice(row) {
    const tab = $("tab-form");
    if (tab) tab.click();
    setTimeout(() => {
      const set = (id, value) => {
        const el = $(id);
        if (!el) return;
        el.value = value || "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set("f-company", "-");
      set("f-name", row.name || "");
      set("f-phone", row.phone || "");
      set("f-region", row.town || "");
      const root = $("items-builder-root");
      const first = root && (root.querySelector(".item-row-card") || (() => { $("btn-add-item-row")?.click(); return root.querySelector(".item-row-card"); })());
      if (first) {
        const item = first.querySelector(".p-item");
        const spec = first.querySelector(".p-spec");
        const qty = first.querySelector(".p-qty");
        const price = first.querySelector(".p-price");
        const amount = first.querySelector(".p-amount");
        const tax = first.querySelector(".p-tax");
        const note = first.querySelector(".p-item-note");
        if (item) item.value = row.itemName || row.equipment || "";
        if (spec) spec.value = [row.maker, row.model || row.modelName].filter(Boolean).join(" / ");
        if (qty) qty.value = "1";
        if (price) price.value = row.totalCost || row.selfPay || 0;
        if (amount) amount.value = row.totalCost || row.selfPay || 0;
        if (tax) tax.value = 0;
        if (note) note.value = `여성농업인 보조사업 / 지원금 ${money(row.supportTotal)}원 / 자부담 ${money(row.selfPay)}원`;
        [item,spec,qty,price,amount,tax,note].filter(Boolean).forEach((el) => el.dispatchEvent(new Event("input", { bubbles: true })));
      }
      alert("거래명세서 작성란에 불러왔어. 품목/금액 확인 후 저장하면 돼.");
    }, 160);
  }

  function ensureEditModal() {
    let modal = $("subsidy-edit-modal-v53");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "subsidy-edit-modal-v53";
    modal.className = "subsidy-edit-modal-v52";
    modal.innerHTML = `
      <div class="subsidy-edit-backdrop" data-v53-edit-close="1"></div>
      <div class="subsidy-edit-box">
        <div class="subsidy-edit-head">
          <strong><i class="fa-solid fa-pen-to-square"></i> 보조사업 대상자 수정</strong>
          <button type="button" data-v53-edit-close="1"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="subsidy-edit-grid">
          <label>연번<input id="se-seq" /></label>
          <label>읍면동<input id="se-town" /></label>
          <label>성명<input id="se-name" /></label>
          <label>연락처<input id="se-phone" /></label>
          <label>생년월일<input id="se-birth" /></label>
          <label>주소<input id="se-address" /></label>
          <label>신청기종<input id="se-item" /></label>
          <label>제조회사<input id="se-maker" /></label>
          <label>형식명<input id="se-model" /></label>
          <label>총사업비<input id="se-total" type="number" /></label>
          <label>보조금<input id="se-support" type="number" /></label>
          <label>자부담<input id="se-self" type="number" /></label>
          <label class="wide">비고/메모<input id="se-note" /></label>
        </div>
        <div class="subsidy-edit-actions">
          <button type="button" class="btn btn-o" data-v53-edit-close="1">취소</button>
          <button type="button" class="btn btn-p" id="subsidy-edit-save-v53">저장</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function openEdit(row) {
    const modal = ensureEditModal();
    modal.dataset.id = row.id;
    const set = (id, v) => { const el = $(id); if (el) el.value = v || ""; };
    set("se-seq", row.seq);
    set("se-town", row.town);
    set("se-name", row.name);
    set("se-phone", row.phone);
    set("se-birth", row.birthDate);
    set("se-address", row.address);
    set("se-item", row.itemName || row.equipment);
    set("se-maker", row.maker);
    set("se-model", row.model || row.modelName);
    set("se-total", row.totalCost);
    set("se-support", row.supportTotal);
    set("se-self", row.selfPay);
    set("se-note", row.note || row.memo);
    modal.classList.add("show");
  }

  async function saveEdit() {
    const modal = $("subsidy-edit-modal-v53");
    if (!modal || !modal.dataset.id) return;
    const old = rows.map(normalizeRow).find((r) => String(r.id) === String(modal.dataset.id));
    if (!old) return;
    const val = (id) => ($(id)?.value || "").trim();
    const payload = Object.assign({}, old, {
      seq: val("se-seq"),
      town: val("se-town"),
      name: val("se-name"),
      phone: val("se-phone"),
      birthDate: val("se-birth"),
      address: val("se-address"),
      itemName: val("se-item"),
      equipment: val("se-item"),
      maker: val("se-maker"),
      model: val("se-model"),
      modelName: val("se-model"),
      totalCost: num(val("se-total")),
      supportTotal: num(val("se-support")),
      selfPay: num(val("se-self")),
      note: val("se-note"),
      memo: val("se-note"),
    });
    const updated = await api(`/api/subsidy-projects/${encodeURIComponent(old.id)}`, { method: "PUT", body: JSON.stringify(payload) });
    const idx = rows.findIndex((r) => String(r.id) === String(old.id));
    if (idx >= 0) rows[idx] = normalizeRow(updated);
    modal.classList.remove("show");
    render();
  }

  async function bulkDeleteSelected() {
    const ids = [...selected];
    if (!ids.length) return alert("삭제할 대상자를 체크해줘.");
    if (!confirm(`선택한 ${ids.length}명을 삭제할까?\n관리자 복구함에서 복구할 수 있어.`)) return;
    const result = await api("/api/subsidy-projects/bulk-delete", { method: "POST", body: JSON.stringify({ ids }) });
    selected.clear();
    alert(`${result.deleted || 0}명 삭제 완료`);
    await load();
  }

  function makeGroup(list, keyFn, sorter) {
    const map = new Map();
    list.forEach((r) => {
      const rawKey = keyFn(r) || "미지정";
      const key = typeof rawKey === "string" ? rawKey : rawKey.key;
      const cur = map.get(key) || { key, town: rawKey.town || "", item: rawKey.item || "", count: 0, totalCost: 0, supportTotal: 0, selfPay: 0 };
      cur.count += 1;
      cur.totalCost += Number(r.totalCost) || 0;
      cur.supportTotal += Number(r.supportTotal) || 0;
      cur.selfPay += Number(r.selfPay) || 0;
      map.set(key, cur);
    });
    const arr = [...map.values()];
    if (sorter) return arr.sort(sorter);
    return arr.sort((a,b) => String(a.key).localeCompare(String(b.key), "ko-KR"));
  }

  function sortTownItem(a, b) {
    return String(a.town || "").localeCompare(String(b.town || ""), "ko-KR") ||
      String(a.item || "").localeCompare(String(b.item || ""), "ko-KR") ||
      String(a.key || "").localeCompare(String(b.key || ""), "ko-KR");
  }

  function reportHtml(list) {
    const project = activeProjectName();
    const projectYear = activeProjectYear();
    const town = $("subsidy-town-filter")?.value || "전체지역";
    const equipment = $("subsidy-equipment-filter")?.value || "전체기종";
    const status = $("subsidy-status-filter")?.selectedOptions?.[0]?.textContent || "전체상태";
    const total = list.reduce((s,r)=>s+(Number(r.totalCost)||0),0);
    const support = list.reduce((s,r)=>s+(Number(r.supportTotal)||0),0);
    const self = list.reduce((s,r)=>s+(Number(r.selfPay)||0),0);
    const byItem = makeGroup(list, (r)=>r.itemName || r.equipment);
    const byTown = makeGroup(list, (r)=>r.town);
    const byCombo = makeGroup(list, (r)=>{
      const town = r.town || "미지정";
      const item = r.itemName || r.equipment || "미지정";
      return { key: `${town} / ${item}`, town, item };
    }, sortTownItem);
    const row = (g) => `<tr><td>${safe(g.key)}</td><td class="tr">${money(g.count)}대</td><td class="tr">${money(g.totalCost)}</td><td class="tr">${money(g.supportTotal)}</td><td class="tr">${money(g.selfPay)}</td></tr>`;
    return `
      <div class="subsidy-report-doc">
        <h2>${safe(projectYear)}년 ${safe(project)} 보조사업 보고서</h2>
        <div class="subsidy-report-meta">기준: ${safe(projectYear)}년 ${safe(project)} · ${safe(town)} · ${safe(equipment)} · ${safe(status)} · 출력일 ${today()}</div>
        <div class="subsidy-report-cards">
          <div><span>대상자</span><b>${money(list.length)}명</b></div>
          <div><span>총사업비</span><b>${money(total)}원</b></div>
          <div><span>보조금</span><b>${money(support)}원</b></div>
          <div><span>자부담</span><b>${money(self)}원</b></div>
        </div>
        <h3>신청기종 / 제품명별 대수</h3>
        <table><thead><tr><th>신청기종/제품명</th><th>대수</th><th>총사업비</th><th>보조금</th><th>자부담</th></tr></thead><tbody>${byItem.map(row).join("") || `<tr><td colspan="5">없음</td></tr>`}</tbody></table>
        <h3>지역별 현황</h3>
        <table><thead><tr><th>지역</th><th>대수</th><th>총사업비</th><th>보조금</th><th>자부담</th></tr></thead><tbody>${byTown.map(row).join("") || `<tr><td colspan="5">없음</td></tr>`}</tbody></table>
        <h3>지역 + 신청기종별 현황</h3>
        <table><thead><tr><th>지역 / 신청기종</th><th>대수</th><th>총사업비</th><th>보조금</th><th>자부담</th></tr></thead><tbody>${byCombo.map(row).join("") || `<tr><td colspan="5">없음</td></tr>`}</tbody></table>
      </div>`;
  }

  function ensureReportModal() {
    let modal = $("subsidy-report-modal-v53");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "subsidy-report-modal-v53";
    modal.className = "subsidy-report-modal-v53";
    modal.innerHTML = `
      <div class="subsidy-report-backdrop" data-v53-report-close="1"></div>
      <div class="subsidy-report-box">
        <div class="subsidy-report-head">
          <strong><i class="fa-solid fa-chart-pie"></i> 보조사업 보고</strong>
          <div>
            <button type="button" class="btn btn-o btn-sm" id="subsidy-report-print-v53"><i class="fa-solid fa-print"></i> 인쇄</button>
            <button type="button" class="btn btn-o btn-sm" data-v53-report-close="1"><i class="fa-solid fa-xmark"></i> 닫기</button>
          </div>
        </div>
        <div id="subsidy-report-body-v53"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function openReport() {
    const list = filteredRows();
    const modal = ensureReportModal();
    $("subsidy-report-body-v53").innerHTML = reportHtml(list);
    modal.classList.add("show");
  }

  function printReport() {
    const html = $("subsidy-report-body-v53")?.innerHTML || reportHtml(filteredRows());
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) return alert("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해줘.");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>보조사업 보고서</title><style>
      body{font-family:'Noto Sans KR',Arial,sans-serif;margin:22px;color:#0f172a}
      h2{text-align:center;margin:0 0 8px;font-size:22px}
      h3{margin:22px 0 8px;font-size:15px}
      .subsidy-report-meta{text-align:center;color:#64748b;font-size:12px;margin-bottom:12px}
      .subsidy-report-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}
      .subsidy-report-cards div{border:1px solid #cbd5e1;border-radius:10px;padding:10px}
      .subsidy-report-cards span{display:block;color:#64748b;font-size:11px;font-weight:800}.subsidy-report-cards b{font-size:17px}
      table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 7px}th{background:#f1f5f9}.tr{text-align:right}
      @page{size:A4 portrait;margin:10mm}
    </style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 250);
  }

  function exportCsv() {
    const list = filteredRows();
    const headers = ["연번","읍면동","성명","연락처","생년월일","주소","신청기종","제조회사","형식명","총사업비","보조금","자부담","비고","견적서","연락","기대번호","사진","서류","서류제출","입금","영수증","완료"];
    const lines = [headers.join(",")].concat(list.map((r) => {
      const st = r.statuses || {};
      const vals = [r.seq,r.town,r.name,r.phone,r.birthDate,r.address,r.itemName,r.maker,r.model,r.totalCost,r.supportTotal,r.selfPay,r.note,st.quote?"완료":"미발행",st.contact,r.machineNo,st.photo?"완료":"미촬영",st.document?"완료":"미완료",st.officeSubmit?"제출완료":"제출전",st.payment?"확인":"대기",st.receipt?"첨부":"미첨부",st.complete?"완료":"진행중"];
      return vals.map((v) => `"${String(v == null ? "" : v).replace(/"/g,'""')}"`).join(",");
    }));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `보조사업관리_${today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function clearFilters() {
    if ($("subsidy-search")) $("subsidy-search").value = "";
    if ($("subsidy-status-filter")) $("subsidy-status-filter").value = "";
    if ($("subsidy-town-filter")) $("subsidy-town-filter").value = "";
    if ($("subsidy-equipment-filter")) $("subsidy-equipment-filter").value = "";
    page = 1;
    render();
  }

  function bind() {
    if (bound) return;
    bound = true;
    $("subsidy-import-file")?.addEventListener("change", (ev) => {
      importFile(ev.target.files && ev.target.files[0]).catch((e) => alert(e.message)).finally(() => { ev.target.value = ""; });
    });
    $("subsidy-refresh")?.addEventListener("click", () => load().catch((e) => alert(e.message)));
    $("subsidy-csv")?.addEventListener("click", exportCsv);
    $("subsidy-filter-clear")?.addEventListener("click", clearFilters);
    $("subsidy-selected-delete")?.addEventListener("click", bulkDeleteSelected);
    $("subsidy-report-btn")?.addEventListener("click", openReport);

    document.addEventListener("click", async (ev) => {
      const projectBtn = ev.target.closest("[data-subsidy-project]");
      if (projectBtn) {
        ev.preventDefault();
        setActiveProjectName(projectBtn.getAttribute("data-subsidy-project"));
        return;
      }
      const addBtn = ev.target.closest("#subsidy-project-add-v63");
      if (addBtn) {
        ev.preventDefault();
        const name = prompt("추가할 보조사업 이름을 입력해줘.\\n예: 청년농업, 고령농업, 자체지원사업");
        if (!name || !name.trim()) return;
        try {
          const year = activeProjectYear();
          const result = await createProjectOnServer(name.trim(), year);
          alert(result && result.created ? `${year}년 ${normalizeProjectName(name)} 사업을 서버에 추가했어.` : "이미 등록된 사업이야.");
        } catch (e) {
          alert(e.message || "사업 추가 저장에 실패했어.");
        }
      }
    });

    const search = $("subsidy-search");
    if (search) ["input", "keyup", "change", "search"].forEach((ev) => search.addEventListener(ev, () => { page = 1; render(); }));
    ["subsidy-status-filter","subsidy-town-filter","subsidy-equipment-filter","subsidy-page-size"].forEach((id) => {
      $(id)?.addEventListener("change", () => { page = 1; render(); });
      $(id)?.addEventListener("input", () => { page = 1; render(); });
    });
    $("subsidy-check-all")?.addEventListener("change", (ev) => {
      const ids = pageRows(filteredRows()).map((r) => String(r.id));
      if (ev.target.checked) ids.forEach((id) => selected.add(id));
      else ids.forEach((id) => selected.delete(id));
      render();
    });

    document.addEventListener("click", async (ev) => {
      const pbtn = ev.target.closest("[data-v53-page]");
      if (pbtn) {
        ev.preventDefault();
        const all = filteredRows();
        const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
        const act = pbtn.getAttribute("data-v53-page");
        if (act === "first") page = 1;
        if (act === "prev") page = Math.max(1, page - 1);
        if (act === "next") page = Math.min(totalPages, page + 1);
        if (act === "last") page = totalPages;
        render();
        return;
      }
      if (ev.target.closest("#subsidy-report-print-v53")) { ev.preventDefault(); printReport(); return; }
      if (ev.target.closest("[data-v53-report-close]")) { ev.preventDefault(); $("subsidy-report-modal-v53")?.classList.remove("show"); return; }
      if (ev.target.closest("#subsidy-edit-save-v53")) {
        ev.preventDefault();
        try { await saveEdit(); } catch (e) { alert(e.message); }
        return;
      }
      if (ev.target.closest("[data-v53-edit-close]")) {
        ev.preventDefault();
        $("subsidy-edit-modal-v53")?.classList.remove("show");
        return;
      }
      const check = ev.target.closest("[data-v53-check]");
      if (check) {
        ev.stopPropagation();
        const id = String(check.getAttribute("data-v53-check"));
        check.checked ? selected.add(id) : selected.delete(id);
        render();
        return;
      }
      const rowEl = ev.target.closest("#subsidy-body tr[data-id]");
      const buttonLike = ev.target.closest("button,a,input,select,textarea,label");
      if (rowEl && !buttonLike) {
        const id = String(rowEl.dataset.id);
        selected.has(id) ? selected.delete(id) : selected.add(id);
        render();
        return;
      }
      const status = ev.target.closest("[data-v53-status]");
      if (status) {
        ev.preventDefault();
        ev.stopPropagation();
        sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v48", "1");
        sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v47", "1");
        document.getElementById("dashboard-work-alert-popup-v48")?.classList.remove("show");
        document.getElementById("dashboard-work-alert-popup-v47")?.classList.remove("show");
        const row = rows.map(normalizeRow).find((r) => String(r.id) === String(status.getAttribute("data-id")));
        if (!row) return;
        try { await patchStatus(row, status.getAttribute("data-v53-status")); } catch (e) { alert(e.message); }
        return;
      }
      const invoice = ev.target.closest("[data-v53-invoice]");
      if (invoice) {
        ev.preventDefault();
        const row = rows.map(normalizeRow).find((r) => String(r.id) === String(invoice.getAttribute("data-v53-invoice")));
        if (row) toInvoice(row);
        return;
      }
      const machine = ev.target.closest("[data-v53-machine]");
      if (machine) {
        ev.preventDefault();
        const row = rows.map(normalizeRow).find((r) => String(r.id) === String(machine.getAttribute("data-v53-machine")));
        if (row) { try { await patchStatus(row, "machineNo"); } catch (e) { alert(e.message); } }
        return;
      }
      const edit = ev.target.closest("[data-v53-edit]");
      if (edit) {
        ev.preventDefault();
        const row = rows.map(normalizeRow).find((r) => String(r.id) === String(edit.getAttribute("data-v53-edit")));
        if (row) openEdit(row);
        return;
      }
      const del = ev.target.closest("[data-v53-delete]");
      if (del) {
        ev.preventDefault();
        const row = rows.map(normalizeRow).find((r) => String(r.id) === String(del.getAttribute("data-v53-delete")));
        if (!row) return;
        if (!confirm(`${row.name || "대상자"} 항목을 삭제할까?\n관리자 복구함에서 복구할 수 있어.`)) return;
        try {
          await api(`/api/subsidy-projects/${encodeURIComponent(row.id)}`, { method: "DELETE" });
          selected.delete(String(row.id));
          rows = rows.filter((r) => String(r.id) !== String(row.id));
          render();
        } catch (e) { alert(e.message); }
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    setTimeout(() => load().catch(() => {}), 1200);
  });

  window.NaepoSubsidyV49 = { load, render, clearFilters };
  window.NaepoSubsidyV52 = { load, render, clearFilters };
  window.NaepoSubsidyV53 = { load, render, clearFilters, openReport, createProjectOnServer };
})();


/* ===== v56-subsidy-status-confirm-detail-20260714 =====
   보조사업 상태버튼 직접 처리 + 되돌리기 확인 + 상세보기 + 서류제출일 표시
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };

  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }

  function closeWorkPopups() {
    sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v48", "1");
    sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v47", "1");
    $("dashboard-work-alert-popup-v48")?.classList.remove("show");
    $("dashboard-work-alert-popup-v47")?.classList.remove("show");
  }

  function currentRowFromButton(btn) {
    const tr = btn.closest("tr[data-id]");
    const id = btn.getAttribute("data-id") || (tr && tr.dataset.id) || "";
    return { id, tr };
  }

  function shouldConfirmRevert(btn, key) {
    if (key === "contact") {
      const text = (btn.textContent || "").trim();
      if (text === "연락완료") {
        return confirm("연락완료 상태를 미연락으로 되돌릴까?");
      }
      if (text === "연락안됨") {
        return confirm("연락안됨 상태를 미연락으로 되돌릴까?");
      }
      return true;
    }
    if (btn.classList.contains("ok")) {
      const label = (btn.textContent || "완료").trim();
      return confirm(`${label} 상태를 이전 상태로 되돌릴까?`);
    }
    return true;
  }

  function buildStatusPayload(btn, key) {
    if (key === "contact") {
      const text = (btn.textContent || "").trim();
      if (text === "연락완료" || text === "연락안됨") return { key, value: "미연락" };
      return { key, value: "연락완료" };
    }

    if (key === "machineNo") {
      const rowText = btn.closest("td")?.textContent || "";
      const matched = rowText.match(/기대번호:\s*([^\s]+)/);
      const cur = matched ? matched[1] : "";
      const value = prompt("기대번호를 입력해줘.", cur);
      if (value == null) return null;
      return { key, machineNo: value, value: Boolean(value.trim()) };
    }

    const next = !btn.classList.contains("ok");
    return { key, value: next };
  }

  async function patchStatus(btn) {
    const key = btn.getAttribute("data-v53-status") || btn.getAttribute("data-v56-status");
    const { id } = currentRowFromButton(btn);
    if (!id || !key) return;
    closeWorkPopups();

    if (!shouldConfirmRevert(btn, key)) return;

    const body = buildStatusPayload(btn, key);
    if (!body) return;

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "처리중";
    try {
      const updated = await api(`/api/subsidy-projects/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (window.NaepoSubsidyV53 && window.NaepoSubsidyV53.load) {
        await window.NaepoSubsidyV53.load();
      } else {
        location.reload();
      }

      if (key === "officeSubmit" && updated.officeSubmittedAt) {
        alert(`서류 제출일이 저장됐어.\n제출일: ${String(updated.officeSubmittedAt).slice(0, 10)}`);
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = oldText;
      alert(e.message || "상태 변경 실패");
    }
  }

  function statusLabel(v) {
    return v ? "완료" : "미완료";
  }

  function ensureDetailModal() {
    let modal = $("subsidy-detail-modal-v56");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "subsidy-detail-modal-v56";
    modal.className = "subsidy-detail-modal-v56";
    modal.innerHTML = `
      <div class="subsidy-detail-backdrop" data-v56-detail-close="1"></div>
      <div class="subsidy-detail-box">
        <div class="subsidy-detail-head">
          <strong><i class="fa-solid fa-circle-info"></i> 보조사업 상세보기</strong>
          <button type="button" data-v56-detail-close="1"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="subsidy-detail-body-v56"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  async function openDetail(id) {
    const modal = ensureDetailModal();
    const body = $("subsidy-detail-body-v56");
    modal.classList.add("show");
    body.innerHTML = `<div class="v56-loading">상세 정보를 불러오는 중...</div>`;
    try {
      const payload = await api("/api/subsidy-projects");
      const list = Array.isArray(payload) ? payload : payload.items || [];
      const r = list.find((x) => String(x.id) === String(id));
      if (!r) throw new Error("대상자를 찾지 못했어.");

      const st = Object.assign({ quote:false, contact:"미연락", machineNo:false, photo:false, document:false, officeSubmit:false, payment:false, receipt:false, complete:false }, r.statuses || {});
      body.innerHTML = `
        <div class="subsidy-detail-title">
          <div>
            <h3>${safe(r.name || "-")}</h3>
            <p>${safe(r.town || "-")} · ${safe(r.phone || "-")}</p>
          </div>
          <span>${st.complete ? "완료" : "진행중"}</span>
        </div>

        <div class="subsidy-detail-grid">
          <div><b>연번</b><span>${safe(r.seq || "-")}</span></div>
          <div><b>지역</b><span>${safe(r.town || "-")}</span></div>
          <div><b>성명</b><span>${safe(r.name || "-")}</span></div>
          <div><b>연락처</b><span>${safe(r.phone || "-")}</span></div>
          <div><b>생년월일</b><span>${safe(r.birthDate || "-")}</span></div>
          <div class="wide"><b>주소</b><span>${safe(r.address || "-")}</span></div>
          <div><b>신청기종</b><span>${safe(r.itemName || r.equipment || "-")}</span></div>
          <div><b>제조회사</b><span>${safe(r.maker || "-")}</span></div>
          <div><b>형식명</b><span>${safe(r.model || r.modelName || "-")}</span></div>
          <div><b>총사업비</b><span>${money(r.totalCost)}원</span></div>
          <div><b>보조금</b><span>${money(r.supportTotal)}원</span></div>
          <div><b>자부담</b><span>${money(r.selfPay)}원</span></div>
          <div class="wide"><b>비고/메모</b><span>${safe(r.note || r.memo || "-")}</span></div>
        </div>

        <h4>업무 상태</h4>
        <div class="subsidy-detail-status">
          <div><b>견적서</b><span>${st.quote ? "견적 완료" : "견적 미발행"}</span><small>${safe(r.quoteIssuedAt || "-")}</small></div>
          <div><b>연락</b><span>${safe(st.contact || "미연락")}</span><small>${safe(r.contactedAt || "-")}</small></div>
          <div><b>기대번호</b><span>${safe(r.machineNo || (st.machineNo ? "입력완료" : "미입력"))}</span><small>${safe(r.machineNoAt || "-")}</small></div>
          <div><b>사진</b><span>${statusLabel(st.photo)}</span><small>${safe(r.photoAt || "-")}</small></div>
          <div><b>서류</b><span>${statusLabel(st.document)}</span><small>${safe(r.documentAt || "-")}</small></div>
          <div><b>서류제출</b><span>${st.officeSubmit ? "제출완료" : "제출 전"}</span><small>${safe(r.officeSubmittedAt || "-")}</small></div>
          <div><b>입금</b><span>${st.payment ? "입금확인" : "입금대기"}</span><small>${safe(r.paymentAt || "-")}</small></div>
          <div><b>영수증</b><span>${st.receipt ? "첨부완료" : "미첨부"}</span><small>${safe(r.receiptAt || "-")}</small></div>
          <div><b>완료</b><span>${st.complete ? "완료" : "완료처리 전"}</span><small>${safe(r.completedAt || "-")}</small></div>
        </div>

        <div class="subsidy-detail-foot">
          <span>등록일: ${safe(r.createdAt || "-")}</span>
          <span>수정일: ${safe(r.updatedAt || "-")}</span>
        </div>`;
    } catch (e) {
      body.innerHTML = `<div class="v56-error">${safe(e.message || "상세 정보 불러오기 실패")}</div>`;
    }
  }

  document.addEventListener("click", (ev) => {
    const status = ev.target.closest("[data-v53-status],[data-v56-status]");
    if (status && status.closest("#page-subsidy")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      patchStatus(status);
      return;
    }

    const detail = ev.target.closest("[data-v56-detail]");
    if (detail) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openDetail(detail.getAttribute("data-v56-detail"));
      return;
    }

    if (ev.target.closest("[data-v56-detail-close]")) {
      ev.preventDefault();
      $("subsidy-detail-modal-v56")?.classList.remove("show");
    }
  }, true);
})();


/* ===== v57-subsidy-contact-date-direct-handler-20260714 =====
   미연락 버튼 직접 처리, 완료 되돌리기 확인, 날짜 표기 정리, 기대번호 옆 서류제출일 표시
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };

  function fmtDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 10) || "-";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function fmtDateTime(v) {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).replace("T", " ").replace("Z", "").slice(0, 16) || "-";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  function closeWorkPopups() {
    sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v48", "1");
    sessionStorage.setItem("naepo_dashboard_work_alert_popup_closed_v47", "1");
    $("dashboard-work-alert-popup-v48")?.classList.remove("show");
    $("dashboard-work-alert-popup-v47")?.classList.remove("show");
  }

  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }

  function shouldConfirmRevert(btn, key) {
    const text = (btn.textContent || "").trim();
    if (key === "contact") {
      if (text === "연락완료") return confirm("연락완료 상태를 미연락으로 되돌릴까?");
      if (text === "연락안됨") return confirm("연락안됨 상태를 미연락으로 되돌릴까?");
      return true;
    }
    if (btn.classList.contains("ok")) return confirm(`${text || "완료"} 상태를 이전 상태로 되돌릴까?`);
    return true;
  }

  function payloadFor(btn, key) {
    const text = (btn.textContent || "").trim();
    if (key === "contact") {
      if (text === "연락완료" || text === "연락안됨") return { key, value: "미연락" };
      return { key, value: "연락완료" };
    }
    if (key === "machineNo") {
      const td = btn.closest("td");
      const cur = (td?.textContent || "").match(/기대번호:\s*([^·\s]+)/)?.[1] || "";
      const value = prompt("기대번호를 입력해줘.", cur);
      if (value == null) return null;
      return { key, machineNo: value, value: Boolean(value.trim()) };
    }
    return { key, value: !btn.classList.contains("ok") };
  }

  async function handleStatusClick(btn, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    const id = btn.getAttribute("data-id") || btn.closest("tr[data-id]")?.dataset.id;
    const key = btn.getAttribute("data-v53-status") || btn.getAttribute("data-v56-status") || btn.getAttribute("data-v57-status");
    if (!id || !key) return;

    closeWorkPopups();

    if (!shouldConfirmRevert(btn, key)) return;
    const body = payloadFor(btn, key);
    if (!body) return;

    const before = btn.textContent;
    btn.disabled = true;
    btn.textContent = "처리중";
    try {
      const updated = await api(`/api/subsidy-projects/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (window.NaepoSubsidyV53 && window.NaepoSubsidyV53.load) {
        await window.NaepoSubsidyV53.load();
      } else if (window.NaepoSubsidyV52 && window.NaepoSubsidyV52.load) {
        await window.NaepoSubsidyV52.load();
      } else {
        location.reload();
      }

      if (key === "officeSubmit" && updated.officeSubmittedAt) {
        alert(`서류제출 완료 처리됐어.\n제출일: ${fmtDate(updated.officeSubmittedAt)}`);
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = before;
      alert(e.message || "상태 변경 실패");
    }
  }

  // window capture 단계에서 먼저 잡아야 기존 document capture 핸들러가 미연락 클릭을 가로채지 못함.
  window.addEventListener("click", (ev) => {
    const btn = ev.target.closest && ev.target.closest("[data-v53-status],[data-v56-status],[data-v57-status]");
    if (btn && btn.closest("#page-subsidy")) {
      handleStatusClick(btn, ev);
    }
  }, true);

  // 기존 상세보기의 ISO 시간을 사람이 읽기 쉬운 형태로 바꿔주는 보정
  window.NaepoSubsidyFormatDateV57 = { fmtDate, fmtDateTime };
})();


/* ===== v57-subsidy-detail-readable-dates-20260714 ===== */
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const fmt = (v) => window.NaepoSubsidyFormatDateV57 ? window.NaepoSubsidyFormatDateV57.fmtDateTime(v) : (v || "-");
  async function api(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  function ensureModal() {
    let modal = $("subsidy-detail-modal-v57");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "subsidy-detail-modal-v57";
    modal.className = "subsidy-detail-modal-v56";
    modal.innerHTML = `
      <div class="subsidy-detail-backdrop" data-v57-detail-close="1"></div>
      <div class="subsidy-detail-box">
        <div class="subsidy-detail-head">
          <strong><i class="fa-solid fa-circle-info"></i> 보조사업 상세보기</strong>
          <button type="button" data-v57-detail-close="1"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="subsidy-detail-body-v57"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function statusLabel(v) { return v ? "완료" : "미완료"; }
  async function openDetail(id) {
    const modal = ensureModal();
    const body = $("subsidy-detail-body-v57");
    modal.classList.add("show");
    body.innerHTML = `<div class="v56-loading">상세 정보를 불러오는 중...</div>`;
    try {
      const payload = await api("/api/subsidy-projects");
      const list = Array.isArray(payload) ? payload : payload.items || [];
      const r = list.find((x) => String(x.id) === String(id));
      if (!r) throw new Error("대상자를 찾지 못했어.");
      const st = Object.assign({ quote:false, contact:"미연락", machineNo:false, photo:false, document:false, officeSubmit:false, payment:false, receipt:false, complete:false }, r.statuses || {});
      body.innerHTML = `
        <div class="subsidy-detail-title"><div><h3>${safe(r.name || "-")}</h3><p>${safe(r.town || "-")} · ${safe(r.phone || "-")}</p></div><span>${st.complete ? "완료" : "진행중"}</span></div>
        <div class="subsidy-detail-grid">
          <div><b>연번</b><span>${safe(r.seq || "-")}</span></div>
          <div><b>지역</b><span>${safe(r.town || "-")}</span></div>
          <div><b>성명</b><span>${safe(r.name || "-")}</span></div>
          <div><b>연락처</b><span>${safe(r.phone || "-")}</span></div>
          <div><b>생년월일</b><span>${safe(r.birthDate || "-")}</span></div>
          <div class="wide"><b>주소</b><span>${safe(r.address || "-")}</span></div>
          <div><b>신청기종</b><span>${safe(r.itemName || r.equipment || "-")}</span></div>
          <div><b>제조회사</b><span>${safe(r.maker || "-")}</span></div>
          <div><b>형식명</b><span>${safe(r.model || r.modelName || "-")}</span></div>
          <div><b>총사업비</b><span>${money(r.totalCost)}원</span></div>
          <div><b>보조금</b><span>${money(r.supportTotal)}원</span></div>
          <div><b>자부담</b><span>${money(r.selfPay)}원</span></div>
          <div class="wide"><b>비고/메모</b><span>${safe(r.note || r.memo || "-")}</span></div>
        </div>
        <h4>업무 상태</h4>
        <div class="subsidy-detail-status">
          <div><b>견적서</b><span>${st.quote ? "견적 완료" : "견적 미발행"}</span><small>${fmt(r.quoteIssuedAt)}</small></div>
          <div><b>연락</b><span>${safe(st.contact || "미연락")}</span><small>${fmt(r.contactedAt)}</small></div>
          <div><b>기대번호</b><span>${safe(r.machineNo || (st.machineNo ? "입력완료" : "미입력"))}</span><small>${fmt(r.machineNoAt)}</small></div>
          <div><b>사진</b><span>${statusLabel(st.photo)}</span><small>${fmt(r.photoAt)}</small></div>
          <div><b>서류</b><span>${statusLabel(st.document)}</span><small>${fmt(r.documentAt)}</small></div>
          <div><b>서류제출</b><span>${st.officeSubmit ? "제출완료" : "제출 전"}</span><small>${fmt(r.officeSubmittedAt)}</small></div>
          <div><b>입금</b><span>${st.payment ? "입금확인" : "입금대기"}</span><small>${fmt(r.paymentAt)}</small></div>
          <div><b>영수증</b><span>${st.receipt ? "첨부완료" : "미첨부"}</span><small>${fmt(r.receiptAt)}</small></div>
          <div><b>완료</b><span>${st.complete ? "완료" : "완료처리 전"}</span><small>${fmt(r.completedAt)}</small></div>
        </div>
        <div class="subsidy-detail-foot"><span>등록일: ${fmt(r.createdAt)}</span><span>수정일: ${fmt(r.updatedAt)}</span></div>`;
    } catch (e) {
      body.innerHTML = `<div class="v56-error">${safe(e.message || "상세 정보 불러오기 실패")}</div>`;
    }
  }
  window.addEventListener("click", (ev) => {
    const detail = ev.target.closest && ev.target.closest("[data-v56-detail]");
    if (detail) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openDetail(detail.getAttribute("data-v56-detail"));
      return;
    }
    if (ev.target.closest && ev.target.closest("[data-v57-detail-close]")) {
      ev.preventDefault();
      $("subsidy-detail-modal-v57")?.classList.remove("show");
    }
  }, true);
})();


/* ===== v57-subsidy-machine-office-line-decorator-20260714 ===== */
(() => {
  function fmtDate(v) {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  async function decorate() {
    // 서버에서 받은 최신 값으로 재렌더까지는 v53.load가 처리하고,
    // 여기서는 혹시 따로 떨어져 보이는 줄들을 한 줄 스타일로 정리한다.
    document.querySelectorAll("#subsidy-body tr[data-id]").forEach((tr) => {
      const statusCell = tr.children && tr.children[10];
      if (!statusCell) return;
      const lines = [...statusCell.querySelectorAll(".subsidy-machine")];
      if (lines.length >= 2) {
        lines[0].textContent = lines.map((el) => el.textContent.trim()).filter(Boolean).join(" · ");
        lines.slice(1).forEach((el) => el.remove());
      }
    });
  }
  const mo = new MutationObserver(() => decorate());
  document.addEventListener("DOMContentLoaded", () => {
    const body = document.getElementById("subsidy-body");
    if (body) mo.observe(body, { childList:true, subtree:true });
    setInterval(decorate, 1000);
  });
})();


/* ===== v58-inventory-location-class-report-20260714 =====
   재고 보관위치/물품구분 + 출고/재고 보고서
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];

  async function api(path) {
    const headers = {};
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  }

  function ensureModal() {
    let modal = $("inventory-report-modal-v58");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "inventory-report-modal-v58";
    modal.className = "inventory-report-modal-v58";
    modal.innerHTML = `
      <div class="inventory-report-backdrop" data-inv-report-close="1"></div>
      <div class="inventory-report-box">
        <div class="inventory-report-head">
          <strong><i class="fa-solid fa-chart-column"></i> 출고/재고 보고</strong>
          <div>
            <button type="button" class="btn btn-o btn-sm" id="inventory-report-print-v58"><i class="fa-solid fa-print"></i> 인쇄</button>
            <button type="button" class="btn btn-o btn-sm" data-inv-report-close="1"><i class="fa-solid fa-xmark"></i> 닫기</button>
          </div>
        </div>
        <div class="inventory-report-filter">
          <label>시작일<input type="date" id="inv-report-from"></label>
          <label>종료일<input type="date" id="inv-report-to"></label>
          <label>물품구분<select id="inv-report-class"><option value="">전체</option><option>계통물품</option><option>자체물품</option><option>일반판매</option><option>수리부품</option><option>보조사업</option></select></label>
          <label>보관위치<input type="text" id="inv-report-location" placeholder="A-1"></label>
          <button type="button" class="btn btn-p btn-sm" id="inv-report-run"><i class="fa-solid fa-rotate"></i> 조회</button>
        </div>
        <div id="inventory-report-body-v58"></div>
      </div>`;
    document.body.appendChild(modal);
    $("inv-report-from").value = monthStart();
    $("inv-report-to").value = today();
    return modal;
  }

  function groupBy(list, keyFn) {
    const map = new Map();
    list.forEach((r) => {
      const key = keyFn(r) || "미지정";
      const cur = map.get(key) || { key, count: 0, qty: 0, amount: 0, rows: [] };
      cur.count += 1;
      cur.qty += Number(r.qty) || 0;
      cur.amount += (Number(r.qty) || 0) * (Number(r.unitPrice) || 0);
      cur.rows.push(r);
      map.set(key, cur);
    });
    return [...map.values()].sort((a,b) => b.qty - a.qty || String(a.key).localeCompare(String(b.key), "ko-KR"));
  }

  function renderReport(parts, logs) {
    const cls = $("inv-report-class")?.value || "";
    const loc = ($("inv-report-location")?.value || "").trim().toLowerCase();
    const from = $("inv-report-from")?.value || "";
    const to = $("inv-report-to")?.value || "";
    const partMap = new Map(parts.map((p) => [String(p.id), p]));

    const filteredParts = parts.filter((p) => {
      if (cls && (p.inventoryClass || p.itemClass || p.saleType || "일반판매") !== cls) return false;
      if (loc && !String(p.storageLocation || p.location || "").toLowerCase().includes(loc)) return false;
      return true;
    });
    const allowedIds = new Set(filteredParts.map((p) => String(p.id)));
    const outLogs = logs.filter((l) => {
      if (l.type !== "out") return false;
      const d = String(l.date || "").slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (allowedIds.size && l.partId && !allowedIds.has(String(l.partId))) return false;
      if ((cls || loc) && l.partId && !allowedIds.has(String(l.partId))) return false;
      return true;
    }).map((l) => {
      const p = partMap.get(String(l.partId)) || parts.find((x) => x.name === l.partName) || {};
      return Object.assign({}, l, {
        partClass: p.inventoryClass || p.itemClass || p.saleType || "일반판매",
        storageLocation: p.storageLocation || p.location || "",
        stockNow: p.stock,
      });
    });

    const byPart = groupBy(outLogs, (r) => r.partName);
    const byDate = groupBy(outLogs, (r) => String(r.date || "").slice(0,10));
    const byClass = groupBy(outLogs, (r) => r.partClass);
    const low = filteredParts.filter((p) => Number(p.minStock) > 0 && Number(p.stock) <= Number(p.minStock));
    const valueByClass = groupBy(filteredParts.map((p) => ({ qty:Number(p.stock)||0, unitPrice:Number(p.unitPrice)||0, partName:p.name, partClass:p.inventoryClass || p.itemClass || p.saleType || "일반판매", storageLocation:p.storageLocation || "" })), (r) => r.partClass);

    const table = (title, rows, firstLabel) => `
      <h4>${safe(title)}</h4>
      <table class="inv-report-table"><thead><tr><th>${safe(firstLabel)}</th><th>건수</th><th>수량</th><th>금액</th></tr></thead><tbody>
        ${rows.map((r)=>`<tr><td>${safe(r.key)}</td><td class="tr">${money(r.count)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`).join("") || `<tr><td colspan="4">내역 없음</td></tr>`}
      </tbody></table>`;

    const body = $("inventory-report-body-v58");
    body.innerHTML = `
      <div class="inv-report-cards">
        <div><span>기간 출고수량</span><b>${money(outLogs.reduce((s,r)=>s+(Number(r.qty)||0),0))}</b></div>
        <div><span>출고품목 수</span><b>${money(byPart.length)}</b></div>
        <div><span>부족품목</span><b>${money(low.length)}</b></div>
        <div><span>현재 재고가치</span><b>${money(filteredParts.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.unitPrice)||0),0))}원</b></div>
      </div>
      ${table("품목별 출고 현황", byPart, "품목명")}
      ${table("날짜별 출고 현황", byDate, "날짜")}
      ${table("물품구분별 출고 현황", byClass, "물품구분")}
      ${table("물품구분별 현재 재고가치", valueByClass, "물품구분")}
      <h4>부족/최소재고 이하 품목</h4>
      <table class="inv-report-table"><thead><tr><th>품목명</th><th>보관위치</th><th>구분</th><th>현재</th><th>최소</th></tr></thead><tbody>
        ${low.map((p)=>`<tr><td>${safe(p.name)}</td><td>${safe(p.storageLocation || "-")}</td><td>${safe(p.inventoryClass || "일반판매")}</td><td class="tr">${money(p.stock)}</td><td class="tr">${money(p.minStock)}</td></tr>`).join("") || `<tr><td colspan="5">부족 품목 없음</td></tr>`}
      </tbody></table>
      <h4>최근 출고 상세</h4>
      <table class="inv-report-table"><thead><tr><th>날짜</th><th>품목명</th><th>위치</th><th>구분</th><th>수량</th><th>비고</th></tr></thead><tbody>
        ${outLogs.slice(0, 80).map((r)=>`<tr><td>${safe(String(r.date||"").slice(0,10))}</td><td>${safe(r.partName)}</td><td>${safe(r.storageLocation || "-")}</td><td>${safe(r.partClass)}</td><td class="tr">${money(r.qty)}</td><td>${safe(r.note || "")}</td></tr>`).join("") || `<tr><td colspan="6">출고 상세 없음</td></tr>`}
      </tbody></table>`;
  }

  async function loadReport() {
    const body = $("inventory-report-body-v58");
    body.innerHTML = `<div class="inv-report-loading">불러오는 중...</div>`;
    try {
      const [partsPayload, logsPayload] = await Promise.all([api("/api/parts"), api("/api/inventory-log")]);
      renderReport(asArray(partsPayload), asArray(logsPayload));
    } catch (e) {
      body.innerHTML = `<div class="inv-report-error">${safe(e.message)}</div>`;
    }
  }

  function openReport() {
    ensureModal().classList.add("show");
    loadReport();
  }

  function printReport() {
    const body = $("inventory-report-body-v58")?.innerHTML || "";
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) return alert("팝업이 차단되었습니다.");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>출고/재고 보고</title><style>
      body{font-family:'Noto Sans KR',Arial,sans-serif;margin:18px;color:#0f172a} h3{text-align:center} h4{margin:18px 0 8px}
      .inv-report-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.inv-report-cards div{border:1px solid #cbd5e1;border-radius:10px;padding:10px}.inv-report-cards span{display:block;color:#64748b;font-size:11px;font-weight:800}.inv-report-cards b{font-size:16px}
      table{width:100%;border-collapse:collapse;font-size:11.5px}th,td{border:1px solid #cbd5e1;padding:6px 7px}th{background:#f1f5f9}.tr{text-align:right}@page{size:A4 portrait;margin:10mm}
    </style></head><body><h3>출고/재고 보고</h3>${body}</body></html>`);
    win.document.close();
    setTimeout(()=>{ win.focus(); win.print(); }, 250);
  }

  document.addEventListener("click", (ev) => {
    if (ev.target.closest("#btn-inventory-out-report")) {
      ev.preventDefault();
      openReport();
    }
    if (ev.target.closest("#inv-report-run")) {
      ev.preventDefault();
      loadReport();
    }
    if (ev.target.closest("#inventory-report-print-v58")) {
      ev.preventDefault();
      printReport();
    }
    if (ev.target.closest("[data-inv-report-close]")) {
      ev.preventDefault();
      $("inventory-report-modal-v58")?.classList.remove("show");
    }
  });
})();


/* ===== v59-subsidy-office-date-inventory-fit-20260714 =====
   서류제출일 한 줄 표시 보강 + 재고관리 표 잘림 방지 보정
*/
(() => {
  function mergeOfficeSubmitLines() {
    document.querySelectorAll("#subsidy-body tr[data-id]").forEach((tr) => {
      const statusCell = [...tr.children].find((td) => td.querySelector && td.querySelector(".subsidy-status-grid"));
      if (!statusCell) return;
      const lines = [...statusCell.querySelectorAll(".subsidy-machine")];
      if (lines.length >= 2) {
        const merged = lines.map((el) => el.textContent.trim()).filter(Boolean).join(" · ");
        lines[0].textContent = merged;
        lines.slice(1).forEach((el) => el.remove());
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const body = document.getElementById("subsidy-body");
    if (body && window.MutationObserver) {
      new MutationObserver(mergeOfficeSubmitLines).observe(body, { childList: true, subtree: true });
    }
    setInterval(mergeOfficeSubmitLines, 800);
  });
})();


/* ===== v60-subsidy-inventory-timestamps-20260714 ===== */
(() => {
  function fmt(v){
    if(!v) return "";
    const d = new Date(v);
    if(Number.isNaN(d.getTime())) return String(v).replace("T"," ").replace("Z","").slice(0,16);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }
  async function decorateSubsidyTimestamp(){
    document.querySelectorAll("#subsidy-body tr[data-id]").forEach((tr)=>{
      const statusCell = [...tr.children].find((td)=>td.querySelector && td.querySelector(".subsidy-status-grid"));
      if(!statusCell || statusCell.querySelector(".subsidy-row-updated-at")) return;
      const text = tr.dataset.updatedAt || "";
      if (!text) return;
      const div = document.createElement("div");
      div.className = "subsidy-row-updated-at";
      div.textContent = "수정: " + fmt(text);
      statusCell.appendChild(div);
    });
  }
  document.addEventListener("DOMContentLoaded", ()=>{
    const body = document.getElementById("subsidy-body");
    if(body && window.MutationObserver) new MutationObserver(decorateSubsidyTimestamp).observe(body,{childList:true,subtree:true});
    setInterval(decorateSubsidyTimestamp, 1500);
  });
})();



/* ===== v64-disable-auto-api-polling-20260715 =====
   v61 자동 API 폴링 제거: 목록 보정은 DOM 기준으로만 처리해서 429 방지
*/
(() => {
  function mergeSubsidyLinesDomOnly() {
    document.querySelectorAll("#subsidy-body tr[data-id]").forEach((tr) => {
      const statusCell = [...tr.children].find((td) => td.querySelector && td.querySelector(".subsidy-status-grid"));
      if (!statusCell) return;
      const lines = [...statusCell.querySelectorAll(".subsidy-machine")];
      if (lines.length >= 2) {
        lines[0].textContent = lines.map((el) => el.textContent.trim()).filter(Boolean).join(" · ");
        lines.slice(1).forEach((el) => el.remove());
      }
    });
  }

  function fitInventoryButtonsDomOnly() {
    document.querySelectorAll("#page-inventory .parts-table .ibtns").forEach((box) => {
      box.classList.add("v64-inv-buttons-fit");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const subsidyBody = document.getElementById("subsidy-body");
    if (subsidyBody && window.MutationObserver) {
      new MutationObserver(mergeSubsidyLinesDomOnly).observe(subsidyBody, { childList: true, subtree: true });
    }
    const partsBody = document.getElementById("parts-body");
    if (partsBody && window.MutationObserver) {
      new MutationObserver(fitInventoryButtonsDomOnly).observe(partsBody, { childList: true, subtree: true });
    }
    mergeSubsidyLinesDomOnly();
    fitInventoryButtonsDomOnly();
  });
})();


/* ===== v62-nonghyup-class-outbound-report-20260715 =====
   계통/자체 판매 출고를 농협·거래처/날짜/품목 기준으로 정리
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];

  async function api(path) {
    const headers = {};
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  }
  function getCustomerFromRecord(record, fallback) {
    if (!record) return String(fallback || "미지정").replace(/님$/, "");
    const company = String(record.company || "").trim();
    const name = String(record.name || "").trim();
    const region = String(record.region || "").trim();
    if (company && company !== "-") return company;
    if (name) return name;
    if (region) return region;
    return String(fallback || "미지정").replace(/님$/, "");
  }
  function getRecordTotal(record) {
    if (!record) return 0;
    if (Number(record.total) > 0) return Number(record.total);
    if (Array.isArray(record.items)) {
      return record.items.reduce((s, it) => s + (Number(it.amount) || 0) + (Number(it.tax) || 0), 0);
    }
    return (Number(record.amount) || 0) + (Number(record.tax) || 0);
  }
  function group(list, keyFn, seed = {}) {
    const map = new Map();
    list.forEach((row) => {
      const keyObj = keyFn(row);
      const key = typeof keyObj === "string" ? keyObj : keyObj.key;
      const cur = map.get(key) || Object.assign({ key, qty: 0, amount: 0, count: 0, latest: "", itemSet: new Set() }, typeof keyObj === "string" ? {} : keyObj, seed);
      const qty = Number(row.qty) || 0;
      cur.qty += qty;
      cur.amount += qty * (Number(row.unitPrice) || 0);
      cur.count += 1;
      cur.latest = !cur.latest || String(row.date || "") > String(cur.latest) ? String(row.date || "") : cur.latest;
      if (row.partName) cur.itemSet.add(row.partName);
      map.set(key, cur);
    });
    return [...map.values()].map((r) => Object.assign({}, r, { itemCount: r.itemSet ? r.itemSet.size : 0 }));
  }

  function ensureModal() {
    let modal = $("class-out-report-modal-v62");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "class-out-report-modal-v62";
    modal.className = "class-out-report-modal-v62";
    modal.innerHTML = `
      <div class="class-out-report-backdrop" data-class-report-close="1"></div>
      <div class="class-out-report-box">
        <div class="class-out-report-head">
          <strong><i class="fa-solid fa-warehouse"></i> 계통/자체 출고 보고</strong>
          <div>
            <button type="button" class="btn btn-o btn-sm" id="class-out-report-print-v62"><i class="fa-solid fa-print"></i> 인쇄</button>
            <button type="button" class="btn btn-o btn-sm" data-class-report-close="1"><i class="fa-solid fa-xmark"></i> 닫기</button>
          </div>
        </div>
        <div class="class-out-report-filter">
          <label>시작일<input type="date" id="class-report-from"></label>
          <label>종료일<input type="date" id="class-report-to"></label>
          <label>물품구분
            <select id="class-report-class">
              <option value="계통자체">계통+자체</option>
              <option value="계통물품">계통물품</option>
              <option value="자체물품">자체물품</option>
              <option value="">전체</option>
            </select>
          </label>
          <label>농협/거래처<input id="class-report-customer" placeholder="예: 홍성농협, 구항농협"></label>
          <label>품목명<input id="class-report-part" placeholder="예: 분무기"></label>
          <button type="button" class="btn btn-p btn-sm" id="class-report-run"><i class="fa-solid fa-rotate"></i> 조회</button>
        </div>
        <div id="class-out-report-body-v62"></div>
      </div>`;
    document.body.appendChild(modal);
    $("class-report-from").value = monthStart();
    $("class-report-to").value = today();
    return modal;
  }

  function tableHtml(title, headers, rows, rowFn, emptyColspan) {
    return `
      <h4>${safe(title)}</h4>
      <table class="class-out-table">
        <thead><tr>${headers.map((h) => `<th>${safe(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.length ? rows.map(rowFn).join("") : `<tr><td colspan="${emptyColspan}" class="empty">내역 없음</td></tr>`}</tbody>
      </table>`;
  }

  function renderReport(parts, logs, records) {
    const partMap = new Map(parts.map((p) => [String(p.id), p]));
    const recordMap = new Map(records.map((r) => [String(r.id), r]));
    const clsFilter = $("class-report-class")?.value || "계통자체";
    const customerFilter = String($("class-report-customer")?.value || "").trim().toLowerCase();
    const partFilter = String($("class-report-part")?.value || "").trim().toLowerCase();
    const from = $("class-report-from")?.value || "";
    const to = $("class-report-to")?.value || "";

    const enriched = logs.filter((log) => {
      if (log.type !== "out") return false;
      const d = String(log.date || "").slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }).map((log) => {
      const part = partMap.get(String(log.partId)) || parts.find((p) => String(p.name || "") === String(log.partName || "")) || {};
      const record = recordMap.get(String(log.relatedRecordId || ""));
      const inventoryClass = part.inventoryClass || part.itemClass || part.saleType || "일반판매";
      const customer = getCustomerFromRecord(record, log.relatedRecordCustomer);
      return Object.assign({}, log, {
        date: String(log.date || "").slice(0, 10),
        customer,
        record,
        recordTotal: getRecordTotal(record),
        inventoryClass,
        storageLocation: part.storageLocation || part.location || "",
        maker: part.maker || "",
      });
    }).filter((row) => {
      if (clsFilter === "계통자체" && row.inventoryClass !== "계통물품" && row.inventoryClass !== "자체물품") return false;
      if (clsFilter && clsFilter !== "계통자체" && row.inventoryClass !== clsFilter) return false;
      if (customerFilter && !String(row.customer || "").toLowerCase().includes(customerFilter)) return false;
      if (partFilter && !String(row.partName || "").toLowerCase().includes(partFilter)) return false;
      return true;
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.customer).localeCompare(String(b.customer), "ko-KR") || String(a.partName).localeCompare(String(b.partName), "ko-KR"));

    const totalQty = enriched.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const totalAmount = enriched.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
    const customerSummary = group(enriched, (r) => r.customer).sort((a,b) => String(a.key).localeCompare(String(b.key), "ko-KR"));
    const dateCustomerItem = group(enriched, (r) => ({ key: `${r.date}|${r.customer}|${r.partName}|${r.inventoryClass}`, date: r.date, customer: r.customer, partName: r.partName, inventoryClass: r.inventoryClass }))
      .sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.customer).localeCompare(String(b.customer), "ko-KR") || String(a.partName).localeCompare(String(b.partName), "ko-KR"));
    const monthCustomer = group(enriched, (r) => ({ key: `${String(r.date).slice(0,7)}|${r.customer}`, month: String(r.date).slice(0,7), customer: r.customer }))
      .sort((a,b) => String(a.month).localeCompare(String(b.month)) || String(a.customer).localeCompare(String(b.customer), "ko-KR"));
    const classSummary = group(enriched, (r) => r.inventoryClass).sort((a,b) => String(a.key).localeCompare(String(b.key), "ko-KR"));

    const body = $("class-out-report-body-v62");
    body.innerHTML = `
      <div class="class-out-hint">
        거래명세서 출고 이력을 기준으로, 재고 품목의 <b>물품구분</b>이 계통물품/자체물품인 출고를 농협·거래처별로 모아서 보여줘.
      </div>
      <div class="class-out-cards">
        <div><span>출고 건수</span><b>${money(enriched.length)}건</b></div>
        <div><span>출고 수량</span><b>${money(totalQty)}개</b></div>
        <div><span>출고 금액</span><b>${money(totalAmount)}원</b></div>
        <div><span>거래처 수</span><b>${money(customerSummary.length)}곳</b></div>
      </div>
      ${tableHtml("농협/거래처별 출고 합계", ["농협/거래처", "품목수", "출고수량", "출고금액", "최근출고일"], customerSummary, (r) => `
        <tr><td>${safe(r.key)}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td><td>${safe(r.latest || "-")}</td></tr>`, 5)}
      ${tableHtml("날짜 + 농협/거래처 + 품목별 출고", ["날짜", "농협/거래처", "품목명", "구분", "수량", "금액"], dateCustomerItem, (r) => `
        <tr><td>${safe(r.date)}</td><td>${safe(r.customer)}</td><td>${safe(r.partName)}</td><td>${safe(r.inventoryClass)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`, 6)}
      ${tableHtml("월별 농협/거래처 출고", ["월", "농협/거래처", "품목수", "수량", "금액"], monthCustomer, (r) => `
        <tr><td>${safe(r.month)}</td><td>${safe(r.customer)}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`, 5)}
      ${tableHtml("물품구분별 출고", ["물품구분", "품목수", "수량", "금액"], classSummary, (r) => `
        <tr><td>${safe(r.key)}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`, 4)}
      <h4>출고 상세</h4>
      <table class="class-out-table">
        <thead><tr><th>날짜</th><th>농협/거래처</th><th>품목명</th><th>구분</th><th>보관위치</th><th>수량</th><th>단가</th><th>비고</th></tr></thead>
        <tbody>${enriched.slice(0, 300).map((r) => `
          <tr><td>${safe(r.date)}</td><td>${safe(r.customer)}</td><td>${safe(r.partName)}</td><td>${safe(r.inventoryClass)}</td><td>${safe(r.storageLocation || "-")}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.unitPrice)}원</td><td>${safe(r.note || "")}</td></tr>`).join("") || `<tr><td colspan="8" class="empty">출고 상세 없음</td></tr>`}</tbody>
      </table>`;
  }

  async function loadReport() {
    const body = $("class-out-report-body-v62");
    body.innerHTML = `<div class="class-out-loading">불러오는 중...</div>`;
    try {
      const [partsPayload, logsPayload, recordsPayload] = await Promise.all([
        api("/api/parts"),
        api("/api/inventory-log"),
        api("/api/records"),
      ]);
      renderReport(asArray(partsPayload), asArray(logsPayload), asArray(recordsPayload));
    } catch (e) {
      body.innerHTML = `<div class="class-out-error">${safe(e.message || "보고서 조회 실패")}</div>`;
    }
  }

  function openReport() {
    const modal = ensureModal();
    modal.classList.add("show");
    loadReport();
  }

  function printReport() {
    const body = $("class-out-report-body-v62")?.innerHTML || "";
    const filter = `기간 ${$("class-report-from")?.value || ""} ~ ${$("class-report-to")?.value || ""} / 구분 ${$("class-report-class")?.value || ""}`;
    const win = window.open("", "_blank", "width=1000,height=900");
    if (!win) return alert("팝업이 차단되었습니다.");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>계통/자체 출고 보고</title><style>
      body{font-family:'Noto Sans KR',Arial,sans-serif;margin:18px;color:#0f172a}h2{text-align:center;margin:0 0 6px}.meta{text-align:center;color:#64748b;font-size:12px;margin-bottom:14px}
      h4{margin:18px 0 8px}.class-out-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.class-out-cards div{border:1px solid #cbd5e1;border-radius:10px;padding:10px}.class-out-cards span{display:block;color:#64748b;font-size:11px;font-weight:800}.class-out-cards b{font-size:16px}
      .class-out-hint{display:none}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:5px 6px}th{background:#f1f5f9}.tr{text-align:right}.empty{text-align:center;color:#94a3b8}@page{size:A4 landscape;margin:8mm}
    </style></head><body><h2>계통/자체 출고 보고</h2><div class="meta">${safe(filter)}</div>${body}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 250);
  }

  document.addEventListener("click", (ev) => {
    const reportBtn = ev.target.closest && ev.target.closest("#btn-inventory-out-report");
    if (reportBtn) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openReport();
      return;
    }
    if (ev.target.closest && ev.target.closest("#class-report-run")) {
      ev.preventDefault();
      loadReport();
      return;
    }
    if (ev.target.closest && ev.target.closest("#class-out-report-print-v62")) {
      ev.preventDefault();
      printReport();
      return;
    }
    if (ev.target.closest && ev.target.closest("[data-class-report-close]")) {
      ev.preventDefault();
      $("class-out-report-modal-v62")?.classList.remove("show");
      return;
    }
  }, true);
})();


/* ===== v65-inventory-monthly-settlement-report-20260715 =====
   재고관리 전체 품목 + 계통/자체 출고까지 월말정산 보고서로 표시
*/
(() => {
  const API_BASE = "https://naepo-back.onrender.com";
  const TOKEN_KEY = "npo_session_token";
  const $ = (id) => document.getElementById(id);
  const token = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; } };
  const safe = (v) => String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (v) => (Number(v) || 0).toLocaleString("ko-KR");
  const asArray = (payload) => Array.isArray(payload) ? payload : payload && Array.isArray(payload.items) ? payload.items : [];

  async function api(path) {
    const headers = {};
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(API_BASE + path, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `서버 오류 (${res.status})`);
    return data;
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  }
  function customerFromRecord(record, fallback) {
    if (!record) return String(fallback || "미지정").replace(/님$/, "");
    const company = String(record.company || "").trim();
    const name = String(record.name || "").trim();
    const region = String(record.region || "").trim();
    if (company && company !== "-") return company;
    if (name) return name;
    return region || String(fallback || "미지정").replace(/님$/, "");
  }
  function groupRows(list, keyFn) {
    const map = new Map();
    list.forEach((r) => {
      const keyObj = keyFn(r);
      const key = typeof keyObj === "string" ? keyObj : keyObj.key;
      const cur = map.get(key) || Object.assign({ key, count: 0, qty: 0, amount: 0, latest: "", itemSet: new Set(), itemQtyMap: new Map() }, typeof keyObj === "string" ? {} : keyObj);
      const qty = Number(r.qty) || 0;
      cur.count += 1;
      cur.qty += qty;
      cur.amount += qty * (Number(r.unitPrice) || 0);
      if (r.partName) {
        cur.itemSet.add(r.partName);
        cur.itemQtyMap.set(r.partName, (cur.itemQtyMap.get(r.partName) || 0) + qty);
      }
      if (!cur.latest || String(r.date || "") > cur.latest) cur.latest = String(r.date || "");
      map.set(key, cur);
    });
    return [...map.values()].map((x) => Object.assign(x, {
      itemCount: x.itemSet ? x.itemSet.size : 0,
      itemSummary: x.itemQtyMap ? [...x.itemQtyMap.entries()].map(([name, qty]) => `${name} ${money(qty)}개`).join(" / ") : "",
    }));
  }
  function ensureModal() {
    let modal = $("inventory-monthly-report-modal-v65");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "inventory-monthly-report-modal-v65";
    modal.className = "inventory-monthly-report-modal-v65";
    modal.innerHTML = `
      <div class="inventory-monthly-backdrop" data-monthly-close="1"></div>
      <div class="inventory-monthly-box">
        <div class="inventory-monthly-head">
          <strong><i class="fa-solid fa-chart-column"></i> 월말정산 / 재고 보고</strong>
          <div>
            <button type="button" class="btn btn-o btn-sm" id="inventory-monthly-print-v65"><i class="fa-solid fa-print"></i> 인쇄</button>
            <button type="button" class="btn btn-o btn-sm" data-monthly-close="1"><i class="fa-solid fa-xmark"></i> 닫기</button>
          </div>
        </div>
        <div class="inventory-monthly-filter">
          <label>시작일<input type="date" id="monthly-from-v65"></label>
          <label>종료일<input type="date" id="monthly-to-v65"></label>
          <label>물품구분<select id="monthly-class-v65"><option value="">전체</option><option>계통물품</option><option>자체물품</option><option>일반판매</option><option>수리부품</option><option>보조사업</option></select></label>
          <label>농협/거래처<input id="monthly-customer-v65" placeholder="예: 홍성농협"></label>
          <label>품목명<input id="monthly-part-v65" placeholder="예: 분무기"></label>
          <button type="button" class="btn btn-p btn-sm" id="monthly-run-v65"><i class="fa-solid fa-rotate"></i> 조회</button>
        </div>
        <div id="inventory-monthly-body-v65"></div>
      </div>`;
    document.body.appendChild(modal);
    $("monthly-from-v65").value = monthStart();
    $("monthly-to-v65").value = today();
    return modal;
  }
  function table(title, headers, rows, rowFn) {
    return `<h4>${safe(title)}</h4><table class="monthly-table"><thead><tr>${headers.map((h)=>`<th>${safe(h)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(rowFn).join("") : `<tr><td colspan="${headers.length}" class="empty">내역 없음</td></tr>`}</tbody></table>`;
  }
  function render(parts, logs, records) {
    const recordMap = new Map(records.map((r) => [String(r.id), r]));
    const partMap = new Map(parts.map((p) => [String(p.id), p]));
    const cls = $("monthly-class-v65")?.value || "";
    const customerQ = String($("monthly-customer-v65")?.value || "").trim().toLowerCase();
    const partQ = String($("monthly-part-v65")?.value || "").trim().toLowerCase();
    const from = $("monthly-from-v65")?.value || "";
    const to = $("monthly-to-v65")?.value || "";

    const filteredParts = parts.filter((p) => {
      const pcls = p.inventoryClass || p.itemClass || p.saleType || "일반판매";
      if (cls && pcls !== cls) return false;
      if (partQ && !String(p.name || "").toLowerCase().includes(partQ)) return false;
      return true;
    });

    const outLogs = logs.filter((l) => {
      if (l.type !== "out") return false;
      const d = String(l.date || "").slice(0,10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }).map((l) => {
      const part = partMap.get(String(l.partId)) || parts.find((p) => String(p.name || "") === String(l.partName || "")) || {};
      const record = recordMap.get(String(l.relatedRecordId || ""));
      const pcls = part.inventoryClass || part.itemClass || part.saleType || "일반판매";
      const customer = customerFromRecord(record, l.relatedRecordCustomer);
      return Object.assign({}, l, {
        date: String(l.date || "").slice(0,10),
        partName: l.partName || part.name || "-",
        customer,
        inventoryClass: pcls,
        storageLocation: part.storageLocation || part.location || "",
      });
    }).filter((l) => {
      if (cls && l.inventoryClass !== cls) return false;
      if (customerQ && !String(l.customer || "").toLowerCase().includes(customerQ)) return false;
      if (partQ && !String(l.partName || "").toLowerCase().includes(partQ)) return false;
      return true;
    });

    const inventoryValue = filteredParts.reduce((s,p)=>s+(Number(p.stock)||0)*(Number(p.unitPrice)||0),0);
    const outQty = outLogs.reduce((s,l)=>s+(Number(l.qty)||0),0);
    const outAmount = outLogs.reduce((s,l)=>s+(Number(l.qty)||0)*(Number(l.unitPrice)||0),0);
    const shortage = filteredParts.filter((p)=>Number(p.minStock)>0 && Number(p.stock)<=Number(p.minStock));

    const byCustomer = groupRows(outLogs, (r)=>r.customer).sort((a,b)=>String(a.key).localeCompare(String(b.key),"ko-KR"));
    const byDateCustomerPart = groupRows(outLogs, (r)=>({key:`${r.date}|${r.customer}|${r.partName}`, date:r.date, customer:r.customer, partName:r.partName, inventoryClass:r.inventoryClass}))
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)) || String(a.customer).localeCompare(String(b.customer),"ko-KR") || String(a.partName).localeCompare(String(b.partName),"ko-KR"));
    const byClass = groupRows(filteredParts.map((p)=>({partName:p.name, qty:Number(p.stock)||0, unitPrice:Number(p.unitPrice)||0, inventoryClass:p.inventoryClass||"일반판매"})), (r)=>r.inventoryClass)
      .sort((a,b)=>String(a.key).localeCompare(String(b.key),"ko-KR"));
    const byLocation = groupRows(filteredParts.map((p)=>({partName:p.name, qty:Number(p.stock)||0, unitPrice:Number(p.unitPrice)||0, storageLocation:p.storageLocation||p.location||"미지정"})), (r)=>r.storageLocation)
      .sort((a,b)=>String(a.key).localeCompare(String(b.key),"ko-KR"));

    $("inventory-monthly-body-v65").innerHTML = `
      <div class="monthly-cards">
        <div><span>전체 품목</span><b>${money(filteredParts.length)}개</b></div>
        <div><span>현재 재고가치</span><b>${money(inventoryValue)}원</b></div>
        <div><span>기간 출고수량</span><b>${money(outQty)}개</b></div>
        <div><span>기간 출고금액</span><b>${money(outAmount)}원</b></div>
        <div><span>부족품목</span><b>${money(shortage.length)}개</b></div>
      </div>
      ${table("농협/거래처별 출고 합계", ["농협/거래처","판매품목","품목수","수량","금액","최근출고일"], byCustomer, (r)=>`<tr><td>${safe(r.key)}</td><td>${safe(r.itemSummary || "-")}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td><td>${safe(r.latest || "-")}</td></tr>`)}
      ${table("날짜 + 농협/거래처 + 품목별 출고", ["날짜","농협/거래처","품목명","구분","수량","금액"], byDateCustomerPart, (r)=>`<tr><td>${safe(r.date)}</td><td>${safe(r.customer)}</td><td>${safe(r.partName)}</td><td>${safe(r.inventoryClass)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`)}
      ${table("물품구분별 현재 재고", ["물품구분","품목수","현재수량","재고가치"], byClass, (r)=>`<tr><td>${safe(r.key)}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`)}
      ${table("보관위치별 현재 재고", ["보관위치","품목수","현재수량","재고가치"], byLocation, (r)=>`<tr><td>${safe(r.key)}</td><td class="tr">${money(r.itemCount)}</td><td class="tr">${money(r.qty)}</td><td class="tr">${money(r.amount)}원</td></tr>`)}
      ${table("부족/최소재고 이하 품목", ["품목명","보관위치","구분","현재","최소","단가"], shortage, (p)=>`<tr><td>${safe(p.name)}</td><td>${safe(p.storageLocation||"-")}</td><td>${safe(p.inventoryClass||"일반판매")}</td><td class="tr">${money(p.stock)}</td><td class="tr">${money(p.minStock)}</td><td class="tr">${money(p.unitPrice)}원</td></tr>`)}
      ${table("재고 전체 목록", ["품목명","규격","보관위치","구분","단가","현재","최소","재고가치"], filteredParts, (p)=>`<tr><td>${safe(p.name)}</td><td>${safe(p.spec||"-")}</td><td>${safe(p.storageLocation||"-")}</td><td>${safe(p.inventoryClass||"일반판매")}</td><td class="tr">${money(p.unitPrice)}원</td><td class="tr">${money(p.stock)}</td><td class="tr">${money(p.minStock)}</td><td class="tr">${money((Number(p.stock)||0)*(Number(p.unitPrice)||0))}원</td></tr>`)}
    `;
  }
  async function load() {
    const body = $("inventory-monthly-body-v65");
    body.innerHTML = `<div class="monthly-loading">불러오는 중...</div>`;
    try {
      const [partsPayload, logsPayload, recordsPayload] = await Promise.all([api("/api/parts"), api("/api/inventory-log"), api("/api/records")]);
      render(asArray(partsPayload), asArray(logsPayload), asArray(recordsPayload));
    } catch (e) {
      body.innerHTML = `<div class="monthly-error">${safe(e.message || "조회 실패")}</div>`;
    }
  }
  function open() {
    ensureModal().classList.add("show");
    load();
  }
  function print() {
    const body = $("inventory-monthly-body-v65")?.innerHTML || "";
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) return alert("팝업이 차단되었습니다.");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>월말정산 재고보고</title><style>
      body{font-family:'Noto Sans KR',Arial,sans-serif;margin:18px;color:#0f172a}h2{text-align:center;margin:0 0 12px}.monthly-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.monthly-cards div{border:1px solid #cbd5e1;border-radius:10px;padding:9px}.monthly-cards span{display:block;color:#64748b;font-size:11px;font-weight:800}.monthly-cards b{font-size:15px}h4{margin:16px 0 8px}table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{border:1px solid #cbd5e1;padding:5px 6px}th{background:#f1f5f9}.tr{text-align:right}.empty{text-align:center;color:#94a3b8}@page{size:A4 landscape;margin:8mm}
    </style></head><body><h2>월말정산 / 재고 보고</h2>${body}</body></html>`);
    win.document.close();
    setTimeout(()=>{ win.focus(); win.print(); }, 250);
  }
  window.addEventListener("click", (ev) => {
    if (ev.target.closest && ev.target.closest("#btn-inventory-out-report")) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      open();
      return;
    }
    if (ev.target.closest && ev.target.closest("#monthly-run-v65")) {
      ev.preventDefault();
      load();
      return;
    }
    if (ev.target.closest && ev.target.closest("#inventory-monthly-print-v65")) {
      ev.preventDefault();
      print();
      return;
    }
    if (ev.target.closest && ev.target.closest("[data-monthly-close]")) {
      ev.preventDefault();
      $("inventory-monthly-report-modal-v65")?.classList.remove("show");
      return;
    }
  }, true);
})();



/* ===== v70-subsidy-delete-year-uncat-clean-20260716 ===== */
(() => {
  const API_BASE="https://naepo-back.onrender.com", TOKEN_KEY="npo_session_token";
  const PROJECT_KEY="naepo_subsidy_active_project_v63", YEAR_KEY="naepo_subsidy_active_year_v65";
  const REG_KEY="naepo_subsidy_project_list_by_year_v70", DEFAULT="여성농업", UNCAT="__uncategorized_parts__";
  const $=id=>document.getElementById(id);
  const token=()=>{try{return sessionStorage.getItem(TOKEN_KEY)||""}catch(_){return""}};
  const safe=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money=v=>(Number(v)||0).toLocaleString("ko-KR");
  const arr=p=>Array.isArray(p)?p:(p&&Array.isArray(p.items)?p.items:[]);
  const nowYear=()=>String(new Date().getFullYear());
  const y=v=>String(v||nowYear()).replace(/[^\d]/g,"").slice(0,4)||nowYear();
  const pname=v=>{const s=String(v||DEFAULT).trim()||DEFAULT;return /여성\s*농업|여성농업인|편의장비/.test(s)?DEFAULT:s};
  async function api(path,opt={}){
    const h=Object.assign({"Content-Type":"application/json"},opt.headers||{}), t=token();
    if(t) h.Authorization="Bearer "+t;
    const r=await fetch(API_BASE+path,Object.assign({},opt,{headers:h}));
    const d=await r.json().catch(()=>null);
    if(!r.ok) throw new Error((d&&d.error)||`서버 오류 (${r.status})`);
    return d;
  }
  function reg(){try{const o=JSON.parse(localStorage.getItem(REG_KEY)||"{}");return o&&typeof o==="object"&&!Array.isArray(o)?o:{}}catch(_){return{}}}
  function saveReg(o){try{localStorage.setItem(REG_KEY,JSON.stringify(o||{}))}catch(_){}}
  function removedKey(year){return `naepo_subsidy_removed_projects_${y(year)}_v71`}
  function removedSet(year){try{return new Set(JSON.parse(localStorage.getItem(removedKey(year))||"[]").map(pname))}catch(_){return new Set()}}
  function saveRemoved(year,set){try{localStorage.setItem(removedKey(year),JSON.stringify([...set]))}catch(_){}}
  function setList(year,names){const yy=y(year), o=reg(), removed=removedSet(yy);const existing=Array.isArray(o[yy])?o[yy]:[];o[yy]=[...new Set([DEFAULT].concat(existing.map(pname).filter(Boolean)).concat((names||[]).map(pname).filter(Boolean)))].filter(n=>n===DEFAULT||!removed.has(pname(n)));saveReg(o);return o[yy]}
  function removeName(year,name){const yy=y(year), o=reg(), n=pname(name);const rm=removedSet(yy);rm.add(n);saveRemoved(yy,rm);const list=Array.isArray(o[yy])?o[yy]:[DEFAULT];o[yy]=[DEFAULT].concat(list.filter(x=>pname(x)!==DEFAULT&&pname(x)!==n));saveReg(o)}
  function clearOldOnce(){const flag="naepo_subsidy_v70_old_keys_cleared";if(localStorage.getItem(flag)==="1")return;["naepo_subsidy_project_list_v63","naepo_subsidy_project_list_by_year_v68","naepo_subsidy_project_list_by_year_v69"].forEach(k=>localStorage.removeItem(k));localStorage.setItem(flag,"1")}
  function rowYear(r){return y(r.projectYear||r.year||nowYear())}
  function rowProj(r){return pname(r.projectName||r.projectDisplayName||r.businessName||r.subsidyName||DEFAULT)}
  async function rebuild(year){
    const yy=y(year);
    localStorage.setItem(YEAR_KEY,yy);
    if(window.NaepoSubsidyV53&&window.NaepoSubsidyV53.load){
      await window.NaepoSubsidyV53.load();
      return;
    }
    try{
      const [rows,registry]=await Promise.all([api("/api/subsidy-projects"),api("/api/subsidy-project-registry").catch(()=>[])]);
      setList(yy,arr(rows).filter(r=>rowYear(r)===yy).map(rowProj).concat(arr(registry).filter(r=>y(r.projectYear||r.year)===yy).map(r=>pname(r.projectName))));
    }catch(_){setList(yy,[DEFAULT])}
  }
  async function deleteProject(){
    const yy=y($("subsidy-project-year-v65")?.value||localStorage.getItem(YEAR_KEY));
    const proj=pname(document.querySelector(".subsidy-project-btn.on")?.getAttribute("data-subsidy-project")||localStorage.getItem(PROJECT_KEY));
    if(!confirm(`${yy}년 ${proj} 사업을 삭제할까요?\n해당 연도/사업의 명단과 버튼만 삭제됩니다.`))return;
    const password=prompt("삭제하려면 로그인 비밀번호를 입력해주세요.");
    if(!password)return;
    const res=await api("/api/subsidy-projects/delete-project",{method:"POST",body:JSON.stringify({projectName:proj,projectYear:yy,password})});
    removeName(yy,proj); localStorage.setItem(PROJECT_KEY,DEFAULT); localStorage.setItem(YEAR_KEY,yy);
    alert(`${yy}년 ${proj} 사업 삭제 완료\n삭제된 명단: ${res.deleted||0}명\n사업목록 삭제: ${res.registryDeleted||0}건`);
    await rebuild(yy);
  }
  function ensureUncat(){
    const sel=$("group-apply-select"); if(!sel)return;
    if(![...sel.options].some(o=>o.value===UNCAT)){const opt=document.createElement("option");opt.value=UNCAT;opt.textContent="미분류";sel.appendChild(opt)}
  }
  async function ungrouped(){
    const [pp,gg]=await Promise.all([api("/api/parts"),api("/api/groups")]);
    const parts=arr(pp), groups=arr(gg), used=new Set();
    groups.forEach(g=>(g.partIds||[]).forEach(id=>used.add(String(id))));
    return parts.filter(p=>!used.has(String(p.id)));
  }
  function addPart(p){
    const b=$("btn-add-item-row"); if(!b)return alert("품목 추가 버튼을 찾지 못했습니다.");
    b.click(); const rows=document.querySelectorAll("#items-builder-root .item-row-card"), row=rows[rows.length-1]; if(!row)return;
    row.dataset.partId=p.id||"";
    const set=(s,v)=>{const el=row.querySelector(s); if(!el)return; el.value=v??""; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true}))};
    set(".p-item",p.name||""); set(".p-spec",p.spec||""); set(".p-qty","1"); set(".p-price",Number(p.unitPrice||0)); set(".p-amount",Number(p.unitPrice||0)); set(".p-tax","0");
  }
  async function openUncat(){
    const parts=await ungrouped(); if(!parts.length)return alert("미분류 품목이 없습니다.");
    document.querySelectorAll(".v70-uncat").forEach(e=>e.remove());
    const ov=document.createElement("div"); ov.className="v70-uncat";
    ov.innerHTML=`<div class="v70-uncat-box"><div class="v70-head"><h3>미분류 품목 선택</h3><button class="v70-x">×</button></div><input class="v70-search" placeholder="품목명 / 규격 / 위치 검색"><div class="v70-list">${parts.map(p=>`<label class="v70-item" data-key="${safe(`${p.name||""} ${p.spec||""} ${p.storageLocation||""}`.toLowerCase())}"><input type="checkbox" data-pid="${safe(p.id)}"><span><b>${safe(p.name||"")}</b><small>${safe(p.spec||"-")} · ${safe(p.storageLocation||"-")}</small></span><em>재고 ${money(p.stock)} · ${money(p.unitPrice)}원</em></label>`).join("")}</div><div class="v70-foot"><button class="btn btn-o btn-sm v70-cancel">취소</button><button class="btn btn-p btn-sm v70-add">선택 품목 추가</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click",ev=>{if(ev.target.closest(".v70-x,.v70-cancel"))ov.remove(); if(ev.target.closest(".v70-add")){const ids=[...ov.querySelectorAll("input[type=checkbox]:checked")].map(c=>c.dataset.pid); if(!ids.length)return alert("추가할 품목을 선택해주세요."); ids.forEach(id=>{const p=parts.find(x=>String(x.id)===String(id)); if(p)addPart(p)}); const sel=$("group-apply-select"); if(sel)sel.value=""; ov.remove();}});
    ov.querySelector(".v70-search").addEventListener("input",ev=>{const q=ev.target.value.trim().toLowerCase();ov.querySelectorAll(".v70-item").forEach(i=>i.style.display=!q||String(i.dataset.key).includes(q)?"":"none")});
  }
  function interceptUncat(ev){
    const sel=ev.target.closest?.("#group-apply-select"), btn=ev.target.closest?.("#btn-apply-group"), gs=$("group-apply-select");
    if((sel&&sel.value===UNCAT)||(btn&&gs&&gs.value===UNCAT)){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      window.__v36GroupOpening=false; window.__v37GroupOpening=false;
      openUncat().catch(e=>alert(e.message||"미분류 품목 불러오기 실패"));
      setTimeout(()=>{const s=$("group-apply-select"); if(s){s.value=""; ensureUncat()}},100);
      return true;
    }
    return false;
  }
  ["change","input","click"].forEach(type=>window.addEventListener(type,ev=>{
    if(type==="change"){const ys=ev.target.closest?.("#subsidy-project-year-v65"); if(ys){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();rebuild(ys.value);return;}}
    if(type==="click"){const del=ev.target.closest?.("#subsidy-project-delete-v65"); if(del){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();deleteProject().catch(e=>alert(e.message||"사업 삭제 실패"));return;}}
    interceptUncat(ev);
  },true));
  document.addEventListener("DOMContentLoaded",()=>{clearOldOnce(); ensureUncat(); rebuild(localStorage.getItem(YEAR_KEY)||nowYear()).catch(()=>{}); setInterval(ensureUncat,1200)});
})();
