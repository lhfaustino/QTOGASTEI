(() => {
  const WAIT_AFTER_SCROLL_MS = 500;
  const IDLE_ROUNDS_TO_FINISH = 4;
  const MAX_SCROLL_ROUNDS = 240;
  const ORDER_CARD_SELECTOR = '[data-sqe="order-item"], [class*="order-card"], [class*="OrderCard"], [class*="order-item"]';
  const TOTAL_LABEL = /(?:Total do Pedido|Total do pagamento|Order Total)/i;
  const FINALIZED_STATUS = /\bFINALIZADO\b/i;
  const EVALUATED_STATUS = /\b(?:AVALIADO|AVALIADA|AVALIAÇÃO ENVIADA|AVALIAÇÃO CONCLUÍDA|REVIEWED)\b/i;
  const WAITING_FOR_REVIEW = /\b(?:AVALIAR|AVALIE(?:\s+AGORA)?)\b/i;
  const EXCLUDED_STATUS = /\b(?:CANCELADO|CANCELADA|REEMBOLSADO|REEMBOLSADA|DEVOLVIDO|DEVOLVIDA|ESTORNADO|ESTORNADA)\b/i;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function findOrderCards() {
    const selectedCards = [...document.querySelectorAll(ORDER_CARD_SELECTOR)];
    if (selectedCards.length) {
      // Keep the outer matching node, which usually contains both status and total.
      return selectedCards.filter(card => !selectedCards.some(other => other !== card && other.contains(card)));
    }

    const candidates = new Set();

    // Fallback for Shopee layouts without stable order-card attributes. Start
    // from total-label text nodes and climb to the largest single-order wrapper.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const labelNode = walker.currentNode;
      if (!TOTAL_LABEL.test(labelNode.nodeValue || "")) continue;
      let card = labelNode.parentElement;
      let bestCard = null;
      while (card && card !== document.body) {
        const text = (card.innerText || "").replace(/\s+/g, " ").trim();
        const totalCount = [...text.matchAll(new RegExp(TOTAL_LABEL.source, "gi"))].length;
        if (text.length > 3000 || totalCount > 1) break;
        if (text.length >= 55 && /(?:R\$\s*)?\d[\d.]*,\d{2}/.test(text) && totalCount === 1) bestCard = card;
        card = card.parentElement;
      }
      if (bestCard) candidates.add(bestCard);
    }

    // Keep the deepest matching node so one order cannot be counted once as a
    // selector match and again as a fallback match.
    return [...candidates].filter(card => ![...candidates].some(other => other !== card && card.contains(other)));
  }

  function readVisibleOrders() {
    const orders = [];
    for (const card of findOrderCards()) {
      const text = (card.innerText || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 3000) continue;
      if (!FINALIZED_STATUS.test(text) || !EVALUATED_STATUS.test(text) || WAITING_FOR_REVIEW.test(text) || EXCLUDED_STATUS.test(text)) continue;

      const totals = [...text.matchAll(/(?:Total do Pedido|Total do pagamento|Order Total)\s*:?\s*(?:R\$\s*)?([\d.]+,\d{2})/gi)];
      let amount = totals.length ? Number(totals.at(-1)[1].replace(/\./g, "").replace(",", ".")) : null;
      if (amount === null) {
        const values = [...text.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g)].map(match => Number(match[1].replace(/\./g, "").replace(",", ".")));
        if (values.length) amount = Math.max(...values);
      }
      if (!Number.isFinite(amount) || amount <= 0) continue;

      // A normalized card signature lets the scanner merge results from
      // successive scroll positions without dropping separate same-price orders.
      const signature = text.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
      orders.push({ id: signature, amount });
    }
    return orders;
  }

  async function scanAllOrders() {
    const startingPosition = window.scrollY;
    const orders = new Map();
    const root = document.scrollingElement || document.documentElement;
    let idleRounds = 0;
    let previousHeight = -1;
    let previousCount = -1;
    let rounds = 0;

    try {
      while (rounds < MAX_SCROLL_ROUNDS && idleRounds < IDLE_ROUNDS_TO_FINISH) {
        rounds += 1;
        for (const order of readVisibleOrders()) orders.set(order.id, order.amount);

        const height = root.scrollHeight;
        const bottom = Math.max(0, height - window.innerHeight);
        const atBottom = window.scrollY >= bottom - 2;
        if (atBottom) {
          await wait(WAIT_AFTER_SCROLL_MS);
          for (const order of readVisibleOrders()) orders.set(order.id, order.amount);

          const latestHeight = root.scrollHeight;
          if (latestHeight === previousHeight && orders.size === previousCount) idleRounds += 1;
          else idleRounds = 0;
          previousHeight = latestHeight;
          previousCount = orders.size;
        } else {
          idleRounds = 0;
          previousHeight = height;
          previousCount = orders.size;
          window.scrollTo({ top: Math.min(window.scrollY + Math.max(400, Math.floor(window.innerHeight * 0.8)), bottom), behavior: "instant" });
          await wait(WAIT_AFTER_SCROLL_MS);
        }
      }
    } finally {
      window.scrollTo({ top: startingPosition, behavior: "instant" });
    }

    const entries = [...orders.values()];
    return {
      ok: true,
      orders: entries.length,
      total: entries.reduce((sum, amount) => sum + amount, 0),
      reachedLimit: rounds >= MAX_SCROLL_ROUNDS
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "SCAN_ORDERS") return;
    if (location.origin !== "https://shopee.com.br" || location.pathname !== "/user/purchase/") {
      sendResponse({ ok: false, error: "Esta extensão só funciona em shopee.com.br/user/purchase/." });
      return;
    }
    scanAllOrders()
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, error: "Não foi possível percorrer os pedidos desta página." }));
    return true;
  });
})();
