# Quanto Gastei na Shopee?

Extensão para Chrome que percorre automaticamente a área de pedidos da Shopee e soma todos os pedidos finalizados, mesmo os pendentes de avaliação. O processamento é feito localmente no navegador.

## Instalação para desenvolvimento

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` no Chrome e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta do projeto.
4. Entre na Shopee e abra `https://shopee.com.br/user/purchase/`.
5. Clique em **Somar pedidos finalizados**. A extensão rola a lista para carregar pedidos antigos e retorna à posição inicial.

## Como funciona

- Rola a lista de pedidos automaticamente e lê o conteúdo carregado na página aberta.
- Só funciona em `shopee.com.br/user/purchase/`.
- Inclui todos os cartões com status **FINALIZADO**, avaliados ou pendentes de avaliação; ignora pedidos cancelados, devolvidos ou reembolsados.
- Mostra a soma e a quantidade identificada na leitura.
- Guarda o último resultado no armazenamento local da extensão.
- Não envia pedidos ou dados pessoais a servidores externos.

## Limitações

A Shopee pode alterar o HTML e os rótulos dos pedidos, o que pode afetar a detecção. A extensão encerra a leitura após várias paradas sem novos pedidos e tem um limite de segurança para páginas muito longas. Confira o resultado com o histórico da Shopee, principalmente após alterações no layout.

## Estrutura

- `manifest.json`: configuração da extensão Manifest V3.
- `popup.html`, `popup.css`, `popup.js`: interface do popup.
- `content.js`: leitura e soma dos valores presentes na página.

## Privacidade

A extensão não solicita senha, não faz chamadas de rede e não transmite informações da conta. O total e a contagem ficam no `chrome.storage.local` do navegador.

## Licença

MIT. Consulte [LICENSE](LICENSE).
