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

- [ ] **O "agora" envelhece na tela.** O destaque do compromisso em curso é
      calculado no servidor, na hora do render
      (`components/admin/TodayAgenda.tsx`). Quem deixa o Painel aberto a manhã
      inteira continua vendo o selo na reunião das 9h depois do meio-dia. Nada
      revalida sozinho: precisa recarregar. Um `LiveRefresh` como o das outras
      telas resolveria, ou mover a decisão do "agora" para o cliente.

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

- [ ] **A alça é uma só, num canto fixo.** Resolve girar e redimensionar, mas
      não é o que se espera de um editor: faltam as quatro alças de canto, com
      a de giro separada da de tamanho.

## Login

- [ ] **Mostrar senha e lembrar usuário.** A tela de entrada
      (`app/admin/login/page.tsx`) tem só os dois campos: falta o botão de
      olho para revelar a senha e o "lembrar de mim" que traga o usuário
      preenchido na próxima visita.

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

- [ ] **Consulta de sessão em toda tela do admin.** `getCurrentUsername`
      agora tem cache curto, o que já tirou ~250ms do caminho crítico. O que
      sobra é estrutural: cada navegação do admin ainda resolve sessão e
      permissões por request. Mexer nisso toca a autenticação inteira, então
      só com aval.

- [ ] **Medir em produção.** Todos os números levantados até aqui são de
      `next dev`, que compila por rota e não faz prefetch de `<Link>`. Vale
      repetir a medição em `next build && next start` para saber o número real.
