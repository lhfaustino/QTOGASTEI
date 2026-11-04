(() => {
  const parseBRL = text => {
    const match = text.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
    if (!match) return null;
    const amount = Number(match[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(amount) ? amount : null;
  };

  function extractOrders() {
    const candidates = new Set();
    document.querySelectorAll('[data-sqe="order-item"], [class*="order-card"], [class*="OrderCard"], [class*="order-item"]').forEach(node => candidates.add(node));
    // Fallback for Shopee UI versions where order cards have no stable public selector.
    document.querySelectorAll("button, a, span, div").forEach(node => {
      const text = (node.innerText || "").trim();
      if (text.length > 30 && text.length < 1800 && /(?:R\$\s*\d|Total do pedido|Pedido concluído|Pedido cancelado)/i.test(text)) {
        const parent = node.closest('[data-sqe="order-item"], [class*="order-card"], [class*="OrderCard"], [class*="order-item"]') || node.parentElement?.parentElement?.parentElement;
        if (parent) candidates.add(parent);
      }
    });

    // Prefer the most specific card when the fallback and a Shopee selector both
    // point at nested elements from the same order.
    const cards = [...candidates].filter(card => ![...candidates].some(other => other !== card && card.contains(other)));
    const amounts = [];
    for (const card of cards) {
      const text = (card.innerText || "").replace(/\s+/g, " ");
      if (!text || text.length > 3000) continue;
      const totalLabels = [...text.matchAll(/(?:Total do pedido|Total do pagamento|Order Total)\s*:?\s*(?:R\$\s*)?([\d.]+,\d{2})/gi)];
      let amount = totalLabels.length ? Number(totalLabels.at(-1)[1].replace(/\./g, "").replace(",", ".")) : null;
      if (amount === null) {
        const values = [...text.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g)].map(m => Number(m[1].replace(/\./g, "").replace(",", ".")));
        if (values.length) amount = Math.max(...values);
      }
      if (amount !== null && amount > 0) amounts.push(amount);
    }
    return amounts;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCAN_ORDERS") return;
    try {
      const amounts = extractOrders();
      sendResponse({ ok: true, orders: amounts.length, total: amounts.reduce((sum, amount) => sum + amount, 0) });
    } catch {
      sendResponse({ ok: false, error: "O layout desta página da Shopee não foi reconhecido." });
    }
    return true;
  });
})();
