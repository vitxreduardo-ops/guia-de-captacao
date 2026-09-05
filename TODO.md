# Pendências

Coisas conhecidas que ficaram para depois, com contexto suficiente para
retomar sem reconstruir a investigação. Última revisão: 26/08/2026.

## Minha Agenda

- [ ] **Testar o desfazer com dados reais.** Arrastar um compromisso grava
      direto no Google e o aviso do rodapé oferece "Desfazer"
      (`components/admin/WeekCalendar.tsx`). O caminho de erro e a montagem do
      aviso foram revisados no código, mas o fluxo nunca foi exercido de ponta
      a ponta, porque exige duas escritas reais na agenda conectada. Fazer com
      o usuário acompanhando.

- [ ] **Zerar `backlog_cards.google_event_id` nos dois cards antigos.** Os
      eventos órfãos do modelo de conta única já foram apagados do Google em
      25/08/2026, mas o `UPDATE` que limparia a coluna foi bloqueado pelo
      classificador do modo automático. A coluna é legado e nenhum código a
      lê; ao limpar, remover também do `SELECT` em `fetchCard`
      (`lib/googleCalendar.ts`).

- [ ] **Excluir compromisso não tem desfazer.** O arrasto grava no Google e
      oferece "Desfazer" no rodapé; o excluir só pergunta antes
      (`components/admin/EventDetails.tsx`). Recriar depois de apagado é
      possível — os campos estão todos na tela no momento do clique —, mas o
      evento volta com outro id, e nada que aponte pro id antigo sobrevive.

- [ ] **O excluir nunca foi exercido em evento repetido.** A escolha entre
      "só este dia" e "todos" está no código e segue o mesmo caminho da
      edição, mas o teste de ponta a ponta foi feito só com evento avulso, em
      26/08/2026. Apagar uma série é destrutivo o bastante pra querer o
      usuário junto.

- [ ] **Material do backlog não pode ser apagado pela agenda.** O botão é
      escondido de propósito quando `fromBacklog` — apagar só o evento
      deixaria o card apontando pro vazio. Falta decidir se vale apagar os
      dois de uma vez a partir dali, ou se o backlog continua sendo o único
      lugar.

- [ ] **Estados de carregando por agenda.** Hoje a grade inteira espera a
      agenda mais lenta e mostra um esqueleto só. As cinco chamadas já são
      paralelas, então o ganho seria de percepção, não de tempo: cada agenda
      poderia pintar assim que chega.

- [ ] Projeção de momentum no arrasto — **decidido contra** em 26/08/2026, mas
      registrado aqui para não ser "redescoberto" como falta. Numa grade com
      encaixe de 15 minutos, jogar o compromisso além do ponto solto vira
      surpresa, não fluidez. O assentamento (deslizar até o lugar) esse sim foi
      feito.

## Painel

- [ ] **O link "Minha Agenda" mora dentro do `<summary>`.** No celular, tocar
      nele navega e ao mesmo tempo alterna o `<details>`. Hoje não incomoda
      porque a navegação leva a pessoa embora, mas voltar pelo histórico pode
      trazer o bloco no estado oposto ao que ela deixou.

## Lettering

- [ ] **Compartilhamento nativo não foi testado no iPhone.** O botão só
      aparece onde `navigator.canShare` aceita arquivo, e o navegador embutido
      usado nos testes não aceita — quem confirma é o Safari de verdade.

- [ ] **O envio de fonte pela tela não foi testado ponta a ponta.** A camada
      de dados foi provada contra o banco real (guardar, listar, baixar,
      excluir), mas o formulário em si só dá pra confirmar no navegador de
      verdade — o embutido não monta o arquivo no `FormData`.

- [ ] **Sem modelos de partida.** A tabela já tem `is_template`, mas nada na
      tela cria ou lista modelo. Falta decidir o que entra: começar do vazio
      ainda é o único caminho.

- [ ] **A peça pode passar da borda enquanto o dedo arrasta.** Ao soltar ela
      volta pra dentro do palco, mas durante o gesto sai livre — falta a
      resistência progressiva da borda, que avisa que ali acabou.

- [ ] **O componente do estúdio passou de 2.300 linhas.** Estado, gestos,
      desenho, painéis e exportação no mesmo arquivo. A geometria e o estado já
      saíram pra `lib/`, o que provou que o corte funciona — falta separar
      palco, dock e inspetor.

- [ ] **Interface sem tema escuro.** Vale pro admin inteiro, não só pro
      lettering: hoje tudo é cinza claro fixo. Fazer só nesta tela deixaria o
      painel inconsistente.

- [ ] **A grade não aparece e o encaixe não encaixa.** Os dois interruptores
      existem no menu de ajustes do palco, mas nenhum dos dois muda o que se
      vê. O `Encaixe` claramente não é lido: `comImã`
      (`components/admin/LetteringStudio.tsx`) chama `snap` sempre, sem olhar
      `encaixeRef`, e sem passar o passo da grade — o parâmetro `grade` de
      `snap` (`lib/letteringSnap.ts`) fica no padrão zero, que desliga o
      encaixe na grade. A `Grade` desenha em `pintar` a partir de
      `gradeRef`; falta descobrir por que não sai na tela.

- [ ] **Escolher o peso da fonte.** A camada só guarda a família, e o desenho
      monta `${size}px ${family}` (`lib/letteringDraw.ts`) — sempre no peso
      normal. Falta um campo de peso na camada, o seletor no painel de Texto e
      registrar as variações da família (bold, light) tanto nas fontes do
      sistema quanto nas carregadas de arquivo, que hoje entram uma por
      arquivo.

## Orçamento

- [ ] **Seção de logos dos clientes atendidos.** Uma faixa com as marcas com
      quem já trabalhamos, dentro do orçamento que o cliente vê
      (`app/orcamento/[slug]/page.tsx`). Falta decidir de onde vêm os
      arquivos — lista fixa no projeto ou algo administrável — e se a faixa
      aparece em todo orçamento ou só quando ligada.

## Briefing

- [ ] **Página de briefing pra o cliente responder.** Um formulário aberto,
      fora do `/admin`, que o cliente preenche sozinho por link — e as
      respostas chegam pra gente. Falta decidir as perguntas, onde as
      respostas ficam (tabela nova no Supabase) e como o link é gerado por
      cliente.

## Qualidade geral

- [ ] **Erro de lint pré-existente:** `components/admin/DriveSyncForm.tsx:51`
      chama `setState` dentro de um efeito (`react-hooks/set-state-in-effect`).
      Vem do commit `3d03435`, fora do escopo dos trabalhos recentes.

- [ ] **Warnings de variável não usada:** `TOKEN_ROW_ID` em
      `lib/googleCalendar.ts` e `_password_hash` em `lib/users.ts`.

- [ ] **Tipografia em pixel fora da agenda.** `text-[10px]` e `text-[11px]`
      ainda aparecem em `components/GalleryThumb.tsx`,
      `components/GalleryFolderBrowser.tsx` e outros. Na agenda já viraram
      `rem`, que acompanha a preferência de tamanho de fonte do sistema.

- [ ] **Cobertura de testes.** O Vitest cobre as contas de data
      (`lib/agendaRange.ts`) e o layout da grade (`lib/dayLayout.ts`). Ficaram
      de fora as server actions e o restante do `lib/googleCalendar.ts`, que
      dependem de rede e de Supabase e pediriam dublês.

## Desempenho

- [ ] **Medir em produção.** Todos os números levantados até aqui são de
      `next dev`, que compila por rota e não faz prefetch de `<Link>`. Vale
      repetir a medição em `next build && next start` para saber o número real.
