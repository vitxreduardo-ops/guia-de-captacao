# Separar Entregas e Financeiro

Auditoria do bloco Clientes (`/admin/clientes`) e plano para virar duas seções no menu: **Entregas** (quadro + calendário) e **Financeiro** (painel, cobranças, contas, entradas, saídas, clientes, buscar OS).

Feito em 20/11/2026, olhando o código e o ambiente de teste local (`guia-teste`, porta 3001).

---

## 1. Como está hoje

Um item no menu ("Clientes") abre uma barra com 9 abas que misturam três assuntos:

```
Entregas | Calendário | Painel | Cobranças | Contas | Entradas | Saídas | Clientes | Buscar OS
└ produção ┘           └────────────── dinheiro ──────────────┘          └ cadastro ┘ └ busca ┘
```

- Abas definidas em `components/admin/ClientTabs.tsx:7-17`.
- As 5 abas de dinheiro são uma página só, trocada por `?aba=`: `app/admin/clientes/dinheiro/page.tsx` (627 linhas).
- O dinheiro nasce no quadro de entregas: as colunas com `billable = true` ("Aguardando pagamento" e "Entregue") viram as cobranças (`lib/dinheiro.ts:58-68`). Ou seja, os dados já são os mesmos; separar é navegação e tela, não banco.
- Permissão por seção usa o primeiro pedaço do endereço (`proxy.ts:145-150`): hoje quem tem `clientes` vê entregas **e** dinheiro juntos. Não dá para liberar só as entregas para um editor.

---

## 2. Achados da auditoria

### A. Estrutura e navegação

1. **9 abas numa barra só, três assuntos misturados.** Lei de Hick e Miller: a pessoa lê tudo para achar a aba. No celular a barra rola de lado e esconde metade. (`ClientTabs.tsx:7-17`)
2. **A barra de abas pula de lugar ao trocar de aba.** Cada página tem uma largura diferente (`max-w-[100rem]`, `max-w-4xl`, `max-w-5xl`, `max-w-2xl`). Medido a 1280 px: a barra começa em x=253 em Clientes, x=298 em Painel e x=410 em Buscar OS; a largura vai de 672 a 986 px. Quebra a regra de layout estável.
3. **Nomes trocados entre si.** Título da página é "Clientes" mesmo no dinheiro; o caminho diz "Dinheiro", que não é nome de nenhuma aba; os ids não batem com os rótulos (`hoje` = Cobranças, `resultado` = Entradas). (`dinheiro/page.tsx:31-38, 157-162`)
4. **Abrir a seção sem aba cai em Cobranças, mas a primeira aba da barra é Painel.** (`dinheiro/page.tsx:146`) Quem chega pelo menu cai em Entregas (`clientes/page.tsx`), então o "começo" do dinheiro varia.
5. **Trocar de aba perde o mês.** Os links das abas não levam `?mes=`: quem está olhando outubro em Contas e clica em Entradas volta para novembro.

### B. Por que o financeiro confunde

6. **O Painel soma coisas de relógios diferentes no mesmo cartão.** "Entrou" é contado pelo mês do *trabalho* (`getMoneyYear` sem `basis`, `dinheiro/page.tsx:449`), "Saiu" pela data da despesa, e "Sobrou" é a conta de um menos o outro. Ou seja, "Sobrou em nov." não é o que sobrou de dinheiro em novembro. No teste: Painel mostra "Entrou R$ 0,00" em novembro.
7. **A mesma palavra dá números diferentes em cada aba.** "Falta receber" no Painel e em Contas é só do trabalho do mês; "Atrasado" ao lado soma todos os meses; em Cobranças a janela é de 7 dias. Sem dizer o período junto do número, parece erro.
8. **Abas repetem umas às outras.** "Quem pagou e quem deve" (Painel) é quase a lista de Contas; "Por cliente" (Entradas) é quase a mesma coisa; o gráfico de 9 meses do Painel e o gráfico do ano em Entradas contam a mesma história.
9. **Configuração escondida no fim de Contas.** "Preços dos serviços" fica num acordeão depois da lista de clientes (`dinheiro/page.tsx:299-307`); é cadastro, não conta do mês.
10. **Saídas aparece para quem não pode ver.** A aba é mostrada a todos e, para quem tem acesso só a alguns clientes, abre uma mensagem de "sem acesso" (`dinheiro/page.tsx:579-585`).

### C. Entregas

11. **O quadro de entregas mostra dinheiro.** Colunas "Aguardando pagamento" (R$, vencimento) e o bloco "Cobrança" no cartão (`BacklogCardDrawer.tsx:348`). Depois da separação, um editor com acesso só a Entregas ainda veria valores.
12. **"Entregue" quer dizer "pago".** A última coluna diz "na nota · pago". Numa tela chamada Entregas, "Entregue" lido ao pé da letra é outra coisa. É só renomear a coluna pelo próprio quadro (botão Editar), sem código.
13. **Conectar o Instagram do cliente mora na aba Clientes** (`ClientRegistry.tsx:476`, volta do OAuth em `app/api/instagram/oauth/callback/route.ts:48`). Pela regra do projeto, Instagram de cliente é assunto de entregas. Se Clientes for para o Financeiro, quem agenda post precisa ir lá e voltar.

---

## 3. Proposta

### Menu lateral (grupo "Clientes")

```
CLIENTES
  Entregas      ← novo, abre o quadro
  Financeiro    ← substitui "Clientes", abre o Painel
  Orçamento
  Planejamento
  ...
```

### Entregas — `/admin/entregas`

```
[ Quadro | Calendário ]                      [ Buscar OS ____ ] [ Filtro ]
```

| Aba | Endereço | Responde |
|---|---|---|
| Quadro | `/admin/entregas` | O que está em produção? |
| Calendário | `/admin/entregas/calendario` | O que vence em cada dia? |

### Financeiro — `/admin/financeiro`

Cada aba responde uma pergunta só. O que repete sai.

| Aba | Endereço | Responde | Muda |
|---|---|---|---|
| Painel | `/admin/financeiro` | Como está o mês? | Vira a aba de abertura. Entrou/Saiu/Sobrou pelo **dia do pagamento** (caixa). Sai "Quem pagou e quem deve" (é Contas). |
| Cobranças | `/cobrancas` | Quem eu cobro agora? | Fica como está. |
| Contas | `/contas` | O que cada cliente pagou, mês a mês? | Sai o acordeão de preços. |
| Entradas | `/entradas` | Como o ano está indo? | Fica o gráfico do ano + por cliente; o chaveador trabalho/pagamento fica só aqui. |
| Saídas | `/saidas` | O que saiu do estúdio? | Some da barra para quem não tem acesso a todos os clientes. |
| Clientes | `/clientes` | Dados e combinados de cada cliente | Ganha "Serviços e preços" (vindo de Contas). |
| Buscar OS | `/os` | Onde está esta OS? | Ver decisão 2. |

### Vocabulário único (vale para todas as abas)

- **Entrou**: dinheiro recebido, contado no dia em que entrou.
- **A receber**: trabalho feito, ainda não pago, ainda no prazo.
- **Atrasado**: passou do vencimento. Sempre somando todos os meses, e o texto diz isso.

Todo número mostra o período junto ("de trabalhos de nov.", "em todos os meses").

### Moldura fixa

Cada seção ganha um `layout.tsx` com título, abas e largura fixa. As abas ficam no layout e não remontam ao trocar de página; o indicador escuro desliza de verdade e a barra não muda de lugar. O mês vai junto na troca de aba (`?mes=`).

---

## 4. Decisões que são suas

1. **Nome da seção de dinheiro.** Recomendo **Financeiro** (é o que a pessoa procura no menu). "Administrativo" cabe se mais coisas fora de dinheiro forem morar ali.
2. **Onde fica Buscar OS.** Recomendo um campo de busca no topo do quadro de Entregas, que abre o cartão direto (OS é um cartão do quadro; um passo a menos). Alternativa: aba no Financeiro, como você descreveu.
3. **Valores no quadro de Entregas.** Recomendo esconder valores e o bloco Cobrança para quem não tem acesso ao Financeiro. Quem tem os dois vê tudo como hoje.
4. **Instagram do cliente.** Recomendo deixar conectar direto pela aba "Publicar no Instagram" do cartão quando o cliente ainda não tem conta, e manter também em Clientes.

---

## 5. Fases

Cada fase fica utilizável sozinha. Estimativas para execução por mim, com verificação nos três tamanhos.

### Fase 1 — Duas seções no menu (cerca de 2 h)

Mudar o lugar das telas sem mexer no conteúdo.

1. Criar `app/admin/entregas/layout.tsx` com título "Entregas" e abas Quadro | Calendário; mover `clientes/entregas/page.tsx` e `clientes/entregas/calendario/page.tsx` para `app/admin/entregas/` (a página de hoje em `app/admin/entregas/page.tsx` é só um redirecionamento e sai).
2. Criar `app/admin/financeiro/layout.tsx` com título "Financeiro" e as abas do financeiro; cada aba vira uma rota (`cobrancas`, `contas`, `entradas`, `saidas`, `clientes`, `os`), quebrando `dinheiro/page.tsx` em uma página por aba. As funções `PainelAba`, `HojeAba` etc. já estão separadas; é mover.
3. `components/admin/adminActions.ts`: trocar o item "Clientes" por "Entregas" e "Financeiro".
4. `ClientTabs.tsx`: virar duas listas (`ENTREGAS_TABS`, `FINANCEIRO_TABS`), manter `?mes=` ao trocar.
5. Endereços antigos: `redirects()` no `next.config.ts` de `/admin/clientes/*` e `/admin/faturamento` para os novos. Precisa ser no `next.config`, que roda antes do `proxy.ts`; senão quem perdeu a seção `clientes` é barrado antes do redirecionamento. Notificações já gravadas no banco apontam para `/admin/clientes/entregas`.
6. Atualizar links e `revalidatePath`: `app/admin/kanbanActions.ts:50-53`, `app/admin/area-do-cliente/actions.ts` (4), `app/admin/roteiros/actions.ts:545`, `app/cliente/actions.ts:45,90`, `app/api/instagram/oauth/callback/route.ts:48-49`, `lib/backlog.ts:552`, `lib/agent/tools/tasks.ts:360,552` (links do bot do Telegram), `components/admin/Reminders.tsx:102,114`, `components/admin/ClientRegistry.tsx:336`, `components/admin/DinheiroClientes.tsx:308,343`, `components/admin/roteiros/PerfilCliente.tsx:99`. Os `actions.ts` de `dinheiro`, `cadastro` e `faturamento` mudam de pasta junto, e os imports em `DinheiroClientes`, `ServiceCatalog`, `SaidasForm` e `ClientRegistry` acompanham.
7. Permissões: migration que troca `clientes` por `entregas` e `financeiro` em `users.allowed_sections`, para ninguém perder acesso:
   ```sql
   update users
     set allowed_sections = array_remove(allowed_sections, 'clientes') || array['entregas', 'financeiro']
   where 'clientes' = any(allowed_sections);
   ```
   A tela de Usuários lê as seções de `adminActions.ts`, então passa a mostrar as duas caixas sozinha.

### Fase 2 — Financeiro sem confusão (cerca de 4 a 5 h)

1. Painel conta Entrou/Sobrou pelo dia do pagamento (passar `"pagamento"` para `getMoneyYear`), achado 6.
2. Aplicar o vocabulário único e o período em cada número (achados 3 e 7).
3. Tirar as repetições: "Quem pagou e quem deve" sai do Painel; "Preços dos serviços" sai de Contas e vai para Clientes (achados 8 e 9).
4. Esconder Saídas da barra para quem não vê todos os clientes (achado 10).
5. Medir a barra e os blocos nas abas em 390, 820 e 1280 px; tudo no mesmo lugar.

### Fase 3 — Entregas (cerca de 2 a 3 h)

1. Busca de OS no topo do quadro, abrindo o cartão (se decisão 2 for essa).
2. Esconder valores e o bloco Cobrança para quem não tem a seção `financeiro` (decisão 3): `KanbanBoard.tsx`, `BacklogCardView.tsx`, `BacklogCardDrawer.tsx`.
3. Conectar Instagram de dentro do cartão (decisão 4).
4. Renomear a coluna "Entregue" para "Pago" pelo próprio quadro (achado 12, sem código).

---

## 6. Cuidados

- **Os dois quadros não se misturam.** Nada disso encosta no Backlog (`/admin/backlog`, quadro `instagram`). Conferir no fim que o Backlog não mudou.
- **Permissão é do primeiro pedaço do endereço.** Por isso as novas seções precisam de endereço próprio (`/admin/entregas`, `/admin/financeiro`), não subpastas de `/admin/clientes`.
- **A migration roda em produção.** Rodar no teste local primeiro e conferir um usuário restrito entrando nas duas seções.
- **Next desta versão.** Ler `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` antes de escrever os layouts: layout não recebe `searchParams`, então as abas (cliente) leem o mês com `useSearchParams`.

## 7. Como saber que ficou pronto

- Menu mostra Entregas e Financeiro; nenhum link leva a `/admin/clientes` sem redirecionar.
- Um usuário com só `entregas` não abre `/admin/financeiro` e não vê R$ no quadro (se decisão 3).
- Trocar de aba não move a barra (medido) e mantém o mês.
- Os números do Painel batem com a soma das Contas do mesmo mês pelo mesmo critério.
- Backlog da Tatu igual ao de antes.
