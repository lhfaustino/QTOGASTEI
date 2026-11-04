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
  summaryNode.textContent = `${data.orders || 0} pedidos identificados nesta leitura`;
}

button.addEventListener("click", async () => {
  statusNode.textContent = "";
  button.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes("shopee.com.br")) {
      throw new Error("Abra sua conta Shopee e acesse a área de pedidos.");
    }
    const result = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_ORDERS" });
    if (!result?.ok) throw new Error(result?.error || "Não encontrei valores de pedidos nesta página.");
    const saved = { total: result.total, orders: result.orders, updatedAt: Date.now() };
    await chrome.storage.local.set(saved);
    render(saved);
    statusNode.textContent = result.orders ? "Leitura atualizada." : "Nenhum pedido detectado. Role para carregar os pedidos e tente novamente.";
  } catch (error) {
    statusNode.textContent = error.message || "Não foi possível ler esta página.";
  } finally {
    button.disabled = false;
  }
});
