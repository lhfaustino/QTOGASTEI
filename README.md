# Quanto Gastei na Shopee?

Extensão para Chrome que lê os pedidos visíveis na área de pedidos da Shopee e soma os valores encontrados. O processamento é feito localmente no navegador.

## Instalação para desenvolvimento

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` no Chrome e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta do projeto.
4. Entre na Shopee, abra **Meus pedidos** e clique no ícone da extensão.
5. Role a lista para carregar pedidos antigos e clique em **Somar pedidos desta página** novamente.

## Como funciona

- Lê somente o conteúdo já renderizado na página da Shopee aberta.
- Mostra a soma e a quantidade identificada na leitura.
- Guarda o último resultado no armazenamento local da extensão.
- Não envia pedidos ou dados pessoais a servidores externos.

## Limitações

A Shopee pode alterar o HTML e os rótulos dos pedidos, o que pode afetar a detecção. A contagem considera pedidos encontrados na página carregada; páginas ou abas diferentes precisam ser lidas separadamente. Confira o resultado com o histórico da Shopee, principalmente após alterações no layout.

## Estrutura

- `manifest.json`: configuração da extensão Manifest V3.
- `popup.html`, `popup.css`, `popup.js`: interface do popup.
- `content.js`: leitura e soma dos valores presentes na página.

## Privacidade

A extensão não solicita senha, não faz chamadas de rede e não transmite informações da conta. O total e a contagem ficam no `chrome.storage.local` do navegador.

## Licença

MIT. Consulte [LICENSE](LICENSE).
