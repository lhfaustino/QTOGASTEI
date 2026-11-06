const totalNode = document.querySelector("#total");
const summaryNode = document.querySelector("#summary");
const statusNode = document.querySelector("#status");
const button = document.querySelector("#scan");
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
let scanActive = false;

chrome.runtime.onMessage.addListener(message => {
  if (!scanActive || message.type !== "SCAN_PROGRESS") return;
  totalNode.textContent = money(message.total);
  summaryNode.textContent = `${message.orders} pedidos finalizados encontrados até agora`;
  statusNode.textContent = `Percorrendo a lista automaticamente · etapa ${message.round}`;
});

chrome.storage.local.get(["total", "orders", "updatedAt"], data => {
  if (data.updatedAt) render(data);
});

function render(data) {
  totalNode.textContent = money(data.total || 0);
  summaryNode.textContent = `${data.orders || 0} pedidos finalizados nesta leitura`;
}

button.addEventListener("click", async () => {
  scanActive = true;
  statusNode.textContent = "";
  button.disabled = true;
  button.textContent = "Percorrendo os pedidos…";
  totalNode.textContent = money(0);
  summaryNode.textContent = "0 pedidos finalizados encontrados até agora";
  statusNode.textContent = "Iniciando a leitura automática…";
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
    scanActive = false;
    await chrome.storage.local.set(saved);
    render(saved);
    statusNode.textContent = result.reachedLimit
      ? "A Shopee continuou carregando pedidos; abra novamente e repita a leitura para completar."
      : result.orders ? "Leitura concluída: somente pedidos finalizados." : "Nenhum pedido finalizado foi identificado nesta lista.";
  } catch (error) {
    scanActive = false;
    statusNode.textContent = error.message || "Não foi possível ler esta página.";
    chrome.storage.local.get(["total", "orders", "updatedAt"], data => {
      if (data.updatedAt) render(data);
    });
  } finally {
    scanActive = false;
    button.disabled = false;
    button.textContent = "Somar pedidos finalizados";
  }
});
