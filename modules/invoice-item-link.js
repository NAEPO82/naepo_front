(() => {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function resolveExactPart(parts, rawValue, stripPrefix) {
    const raw = text(rawValue);
    const base = typeof stripPrefix === "function" ? text(stripPrefix(raw)) : raw;
    const list = Array.isArray(parts) ? parts : [];
    return list.find((part) => text(part && part.name) === raw)
      || list.find((part) => text(part && part.name) === base)
      || null;
  }

  function dispatchInput(element) {
    if (element) element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function clearLinkedFields(row) {
    if (!row) return;
    delete row.dataset.partId;
    delete row.dataset.linkedPartId;
    delete row.dataset.linkedItemValue;

    const spec = row.querySelector(".p-spec");
    const price = row.querySelector(".p-price");
    const amount = row.querySelector(".p-amount");
    const tax = row.querySelector(".p-tax");
    if (spec) spec.value = "";
    if (price) price.value = "0";
    if (amount) amount.value = "0";
    if (tax) tax.value = "0";
    dispatchInput(price);
  }

  function applyPart(row, part, rawValue) {
    if (!row || !part) return;
    const partId = text(part.id);
    const itemValue = text(rawValue);
    const partChanged = text(row.dataset.partId) !== partId
      || text(row.dataset.linkedItemValue) !== itemValue;

    row.dataset.partId = partId;
    row.dataset.linkedPartId = partId;
    row.dataset.linkedItemValue = itemValue;
    if (!partChanged) return;

    const spec = row.querySelector(".p-spec");
    const price = row.querySelector(".p-price");
    if (spec) spec.value = text(part.spec);
    if (price) {
      price.value = String(Number(part.unitPrice || 0));
      dispatchInput(price);
    }
  }

  function markExistingLink(row, partId, itemValue) {
    if (!row) return;
    const id = text(partId);
    if (!id) return;
    row.dataset.partId = id;
    row.dataset.linkedPartId = id;
    row.dataset.linkedItemValue = text(itemValue);
  }

  function syncRow(row, parts, stripPrefix) {
    if (!row) return null;
    const input = row.querySelector(".p-item");
    if (!input) return null;
    const raw = text(input.value);
    const matched = resolveExactPart(parts, raw, stripPrefix);
    if (matched) {
      applyPart(row, matched, raw);
      return matched;
    }

    const hadInventoryLink = Boolean(text(row.dataset.partId) || text(row.dataset.linkedPartId));
    if (hadInventoryLink) clearLinkedFields(row);
    return null;
  }

  window.NaepoInvoiceItemLink = {
    resolveExactPart,
    clearLinkedFields,
    applyPart,
    markExistingLink,
    syncRow,
  };
})();
