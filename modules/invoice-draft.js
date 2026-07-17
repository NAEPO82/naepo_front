(function (global) {
  "use strict";

  const KEY = "naepo.invoiceDraft.v77.3";
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  function fieldState(form) {
    return Array.from(form.querySelectorAll("input[id], select[id], textarea[id]"))
      .filter((el) => el.type !== "file" && !el.id.startsWith("admin-"))
      .map((el) => ({ id: el.id, type: el.type || el.tagName, value: el.value, checked: Boolean(el.checked) }));
  }

  function activePills(form) {
    return Array.from(form.querySelectorAll(".pills .pill.g")).map((el) => {
      const attr = Array.from(el.attributes).find((a) => a.name.startsWith("data-"));
      return attr ? { parentId: el.parentElement && el.parentElement.id, attr: attr.name, value: attr.value } : null;
    }).filter(Boolean);
  }

  function itemRows(form) {
    return Array.from(form.querySelectorAll(".item-row-card")).map((row) => ({
      partId: row.dataset.partId || "",
      linkedPartId: row.dataset.linkedPartId || "",
      linkedItemValue: row.dataset.linkedItemValue || "",
      item: row.querySelector(".p-item")?.value || "",
      spec: row.querySelector(".p-spec")?.value || "",
      qty: row.querySelector(".p-qty")?.value || "1",
      price: row.querySelector(".p-price")?.value || "0",
      amount: row.querySelector(".p-amount")?.value || "0",
      tax: row.querySelector(".p-tax")?.value || "0",
      isTaxfree: Boolean(row.querySelector(".p-is-taxfree")?.checked),
      note: row.querySelector(".p-item-note")?.value || "",
    }));
  }

  function save() {
    const form = document.getElementById("page-form");
    if (!form) return false;
    const payload = { savedAt: Date.now(), fields: fieldState(form), pills: activePills(form), items: itemRows(form) };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      localStorage.removeItem(KEY);
      return null;
    }
  }

  function has() { return Boolean(load()); }
  function clear() { localStorage.removeItem(KEY); }

  function setValue(el, state) {
    if (!el) return;
    if (el.type === "checkbox" || el.type === "radio") el.checked = Boolean(state.checked);
    else el.value = state.value == null ? "" : state.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function restore() {
    const payload = load();
    const form = document.getElementById("page-form");
    if (!payload || !form) return false;

    for (const pill of payload.pills || []) {
      const parent = pill.parentId ? document.getElementById(pill.parentId) : null;
      const button = parent && Array.from(parent.querySelectorAll(".pill")).find((el) => el.getAttribute(pill.attr) === pill.value);
      if (button && !button.classList.contains("g")) button.click();
    }
    for (const state of payload.fields || []) setValue(document.getElementById(state.id), state);

    const root = document.getElementById("items-builder-root");
    const add = document.getElementById("btn-add-item-row");
    if (root && add) {
      while (root.querySelectorAll(".item-row-card").length < (payload.items || []).length) add.click();
      while (root.querySelectorAll(".item-row-card").length > Math.max(1, (payload.items || []).length)) {
        root.querySelector(".item-row-card:last-child .btn-remove-item-row")?.click();
      }
      Array.from(root.querySelectorAll(".item-row-card")).forEach((row, index) => {
        const item = (payload.items || [])[index];
        if (!item) return;
        row.dataset.partId = item.partId || "";
        row.dataset.linkedPartId = item.linkedPartId || "";
        row.dataset.linkedItemValue = item.linkedItemValue || item.item || "";
        setValue(row.querySelector(".p-item"), { value: item.item });
        setValue(row.querySelector(".p-spec"), { value: item.spec });
        setValue(row.querySelector(".p-qty"), { value: item.qty });
        setValue(row.querySelector(".p-price"), { value: item.price });
        setValue(row.querySelector(".p-amount"), { value: item.amount });
        setValue(row.querySelector(".p-tax"), { value: item.tax });
        setValue(row.querySelector(".p-is-taxfree"), { checked: item.isTaxfree });
        setValue(row.querySelector(".p-item-note"), { value: item.note });
      });
    }
    return true;
  }

  global.NaepoInvoiceDraft = { save, load, has, clear, restore };
})(window);
