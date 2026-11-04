const totalNode = document.querySelector("#total");
const summaryNode = document.querySelector("#summary");
const statusNode = document.querySelector("#status");
const button = document.querySelector("#scan");
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

chrome.storage.local.get(["total", "orders", "updatedAt"], data => {
  if (data.updatedAt) render(data);
});

function render(data) {
  totalNode.textContent = money(data.total || 0);
  summaryNode.textContent = `${data.orders || 0} pedidos finalizados e avaliados nesta leitura`;
}

button.addEventListener("click", async () => {
  statusNode.textContent = "";
  button.disabled = true;
  button.textContent = "Percorrendo os pedidos…";
  summaryNode.textContent = "Carregando a lista e identificando pedidos finalizados e avaliados.";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let pageUrl;
    try {
      pageUrl = new URL(tab?.url);
    } catch {
      throw new Error("Abra a página de pedidos da Shopee: shopee.com.br/user/purchase/");
    }
    if (!tab?.id || pageUrl.origin !== "https://shopee.com.br" || pageUrl.pathname !== "/user/purchase/") {
      throw new Error("Esta extensão só funciona em shopee.com.br/user/purchase/.");
    }
    let result;
    try {
      result = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_ORDERS" });
    } catch {
      throw new Error("Recarregue a página de pedidos da Shopee e tente novamente.");
    }
    if (!result?.ok) throw new Error(result?.error || "Não encontrei valores de pedidos nesta página.");
    const saved = { total: result.total, orders: result.orders, updatedAt: Date.now() };
    await chrome.storage.local.set(saved);
    render(saved);
    statusNode.textContent = result.reachedLimit
      ? "A Shopee continuou carregando pedidos; abra novamente e repita a leitura para completar."
      : result.orders ? "Leitura concluída: somente pedidos finalizados e avaliados." : "Nenhum pedido finalizado e avaliado foi identificado nesta lista.";
  } catch (error) {
    statusNode.textContent = error.message || "Não foi possível ler esta página.";
  } finally {
    button.disabled = false;
    button.textContent = "Somar pedidos finalizados e avaliados";
  }
});
