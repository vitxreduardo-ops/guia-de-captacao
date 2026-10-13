# Contrato v2: modelo para o sistema

Este arquivo é a v2 (a da Hamburgueria 14 Bis, para revisão jurídica) escrita no formato que o sistema lê. É para ler direto. Nada foi implementado ainda.

## Como entraria no sistema

**O que muda no código:** nada. O corpo do contrato é um texto Markdown simples em `contracts.body`. Quem lê é `lib/contractBody.ts`, que já trata `## títulos`, tabelas com colunas separadas por ` | ` e variáveis `{{...}}`.

**O que entra no banco:** uma migration nova, `0081_seed_contract_template_v2.sql`, no mesmo molde da `0072`:

- `insert into contracts (slug, title, kind, is_template, body)` com slug `modelo-v2`, título "Modelo v2 — mensal (14 Bis)", `kind = 'mensal'`, `is_template = true`.
- O corpo vai entre `$corpo$ ... $corpo$`, igual na 0072. O corpo é o texto da seção "Texto do contrato" abaixo.
- `where not exists (select 1 from contracts where slug = 'modelo-v2')`, para rodar de novo sem sobrescrever o que for editado pela tela.
- O `modelo-completo` (0072) não é tocado. Os dois modelos convivem e você escolhe um ao criar o contrato.

**Variáveis usadas** (todas já existem em `contractValues`): `{{cliente}}`, `{{documento}}`, `{{endereco}}`, `{{valor}}`, `{{inicio}}`, `{{meses}}`. Variável sem valor aparece como `{{valor}}` na tela, e a tela avisa antes de publicar.

**O que continua entre colchetes** (campo a preencher à mão no editor): CNPJ e razão social da contratada, CPFs, data da primeira mensalidade, valor da diária, endereço do portal, dia e mês da assinatura, testemunhas, valor por extenso.

**O que ficou fixo da 14 Bis** (troque ao reaproveitar para outro cliente): a representante e ponto focal (Laiane Vieira), as quantidades da cláusula 3.1 e do Anexo I, a tabela de avulsos da cláusula 7 com os preços.

## Decisões aplicadas na v2

- Pagamento antecipado: vence todo dia 10, referente ao próprio mês (6.1).
- Reajuste pelo IPCA a cada 6 meses (6.6).
- Bruto de vídeo e foto vai para o HD do cliente, só para guarda e sem custo. A titularidade e o direito de edição ficam com a contratada (3.3, 9.4, 12.1.1).
- Sem multa por rescisão antecipada, com aviso prévio de 30 dias (11.3).
- Removidos: modalidade "pacote de itens", devolução do sinal em dobro, zonas de viagem e a regra de projeto único como pagamento do mensal. A 6.2 trata só de avulsos.

## Para o advogado

- 8.3 (não contratação da equipe, multa de 3 mensalidades) e 4.6 (multa por atraso da contratada).
- Testemunhas: a Rebeca é parte interessada no Tatu. Prefira pessoa neutra ou assinatura eletrônica.
- Regime tributário do CNPJ (o MEI tem teto anual de faturamento).
- Redação do bruto (3.3 e 9.4).

## Em aberto

- 1 rodada de ajuste por entregável (5.1) é pouco para 13 peças por mês. Decida se mantém.

---

## Texto do contrato

Daqui para baixo é o `body` exato que iria na migration.

## Cláusula 1 — Das partes

**CONTRATADA:** Vitor Eduardo Silva dos Santos — [razão social], inscrita no CNPJ sob o nº [CNPJ completo], com sede na Rua Yitzak Rabin, 1370, Luís Eduardo Magalhães/BA.

**CONTRATANTE:** {{cliente}}, inscrita no CNPJ/CPF sob o nº {{documento}}, com sede em {{endereco}}, neste ato representada por Laiane Vieira, CPF [número].

**Ponto focal de aprovações:** Laiane Vieira, WhatsApp 77 99935-1682. Somente esta pessoa, ou quem ela indicar por escrito, pode aprovar entregas e pedir alterações em nome da CONTRATANTE.

As partes celebram este Contrato de Prestação de Serviços Criativos e Audiovisuais, regido pelas cláusulas a seguir.

## Cláusula 2 — Do objeto e da vigência

2.1. O objeto deste contrato é a prestação de serviços de comunicação, produção audiovisual, fotografia e design pela CONTRATADA, conforme o escopo do **Anexo I (Escopo e Entregáveis)**, que faz parte deste contrato.

2.2. Modalidade recorrente mensal: os serviços serão prestados todo mês, nas quantidades do Anexo I, com vigência de {{meses}} meses a partir de {{inicio}}, renovável por igual período mediante termo aditivo ou aceite escrito pelo WhatsApp ou pelo portal do cliente.

2.3. Tudo o que não estiver listado no Anexo I está fora do escopo e será orçado à parte, conforme a Cláusula 7. Em caso de dúvida entre este contrato e o Anexo I, vale o Anexo I para quantidades e o contrato para regras.

2.4. A CONTRATADA não executa gestão de tráfego pago. Se a CONTRATANTE quiser esse serviço, a CONTRATADA pode indicar parceiro, que será contratado e pago diretamente pela CONTRATANTE.

2.5. A CONTRATADA se obriga a entregar o trabalho com qualidade técnica e no prazo (obrigação de meio). Não garante resultados comerciais, como vendas, seguidores, alcance ou engajamento, que dependem de fatores fora do seu controle.

## Cláusula 3 — Dos entregáveis

3.1. Os entregáveis, suas quantidades mensais e especificações estão no Anexo I. Salvo indicação diferente no Anexo I, valem os padrões abaixo.

Entregável | Formato padrão | Incluído | Não incluído (avulso)
4 vídeos curtos (Reels/Stories) | MP4 H.264, 1080×1920, até 90 s | Roteiro simples, captação, edição, legenda, trilha de biblioteca licenciada | Locução profissional, motion complexo, versões extras de formato
Fotografia | JPG tratado, alta resolução + versão web | Seleção pela CONTRATADA e tratamento de cor | Arquivos RAW, retoque de pele avançado, manipulação
9 peças gráficas (cards, carrosséis) | Material estático para orgânico/tráfego e Burger do mês | Criação, texto de apoio, 1 adaptação de formato | Arquivo aberto editável, novas adaptações

3.2. As entregas são feitas pelo Google Drive ou pelo portal do cliente (Cláusula 12.2). Considera-se entregue o material na data de envio do link ao ponto focal.

3.3. Arquivos RAW e projetos abertos (Premiere, DaVinci, Photoshop, Illustrator, Figma) não fazem parte da entrega e podem ser adquiridos à parte, conforme a Cláusula 7. O material bruto (vídeo e foto sem edição) é gravado no HD da CONTRATANTE, para guarda, nos termos da Cláusula 12.1.1, sem custo adicional. A titularidade autoral e o direito de edição do material bruto seguem com a CONTRATADA (Cláusula 9.4).

3.4. Quantidades mensais não utilizadas por iniciativa da CONTRATANTE (falta de agenda, atraso de briefing ou de aprovação) não acumulam para o mês seguinte e não geram desconto. Quando o não uso for causado pela CONTRATADA, o saldo será compensado no mês seguinte.

3.5. Uso de inteligência artificial: a CONTRATADA pode usar ferramentas de IA como apoio (tratamento, geração de elementos, locução sintética). Imagens de pessoas geradas por IA ou vozes sintéticas só serão usadas em peças da CONTRATANTE com aviso prévio e aprovação dela.

## Cláusula 4 — Dos prazos

4.1. Os prazos contam em **dias úteis** e só começam a correr quando a CONTRATADA recebe, juntos: briefing aprovado, materiais necessários (logo, textos, acessos, informações técnicas) e a mensalidade do mês em curso, paga até o vencimento.

Etapa | Prazo padrão da CONTRATADA
Proposta de roteiro / pauta | 2 dias úteis após o briefing
Primeira versão de vídeo curto | 5 dias úteis após a captação
Primeira versão de vídeo institucional | 15 dias úteis após a captação
Fotos tratadas | 5 dias úteis após a captação
Peças gráficas | 2 dias úteis após o briefing
Ajustes de cada rodada | 2 dias úteis após o feedback consolidado
Calendário editorial do mês seguinte | até o dia 25 do mês corrente

4.2. **Prazo da CONTRATANTE:** responder briefings, enviar materiais e dar feedback em até 3 dias úteis após cada solicitação ou entrega.

4.3. Cada dia de atraso da CONTRATANTE prorroga automaticamente o prazo da CONTRATADA pelo mesmo número de dias, mais o tempo necessário para reencaixe na agenda, limitado a 5 dias úteis extras.

4.4. Se a CONTRATANTE ficar mais de 15 dias corridos sem responder sobre uma entrega, ela será considerada pausada. Retomar depois disso depende de nova janela de agenda. Após 30 dias parada, a entrega é encerrada e o valor da etapa já executada é devido.

4.5. Pedidos com prazo menor que o padrão (urgência) são aceitos se houver agenda e têm acréscimo de 50% sobre o valor do item. Pedidos para entrega em até 24 h, de 100%.

4.6. Atraso injustificado da CONTRATADA superior a 5 dias úteis dá à CONTRATANTE desconto de 5% sobre a mensalidade do mês para cada entregável atrasado, limitado a 20% da mensalidade.

## Cláusula 5 — Das alterações e aprovações

5.1. Cada entregável inclui **1 (uma) rodada de ajustes**. Uma rodada é **uma única lista consolidada** de pedidos, enviada de uma vez pelo ponto focal. Comentários soltos enviados depois que a CONTRATADA já começou a ajustar contam como nova rodada.

5.2. Diferença entre ajuste e refação:

É ajuste (dentro das rodadas) | É refação ou novo job (cobrado à parte)
Trocar texto, corte, trilha, cor, ordem de cenas | Mudar o conceito ou o roteiro já aprovado
Corrigir erro de informação | Pedir cenas que não foram captadas
Ajustar tamanho, posição, fonte | Mudar o briefing depois da primeira versão
Trocar foto por outra da mesma sessão | Nova captação ou nova sessão

5.3. Erros técnicos ou de informação causados pela CONTRATADA são corrigidos sem custo e não consomem rodada.

5.4. Rodadas além das incluídas custam 15% do valor por item, com novo prazo conforme a Cláusula 4.

5.5. **Aprovação:** ocorre por escrito, pelo WhatsApp do ponto focal ou pelo portal do cliente ("aprovado", "pode postar" ou equivalente).

5.6. **Aprovação tácita:** se a CONTRATANTE não se manifestar em 5 dias úteis após a entrega, a versão é considerada aprovada para fins de faturamento e fechamento de etapa. A CONTRATADA avisará por mensagem 2 dias úteis antes desse prazo vencer.

5.7. Após aprovado e publicado, qualquer mudança é nova solicitação, exceto correção de erro da CONTRATADA.

## Cláusula 6 — Dos valores e do pagamento

6.1. **Mensalidade:** a CONTRATANTE pagará {{valor}} ([valor por extenso]) por mês, com vencimento todo dia 10, referente ao próprio mês de trabalho em curso (pagamento antecipado). A primeira mensalidade vence em [data da 1ª mensalidade].

6.2. **Serviços avulsos (Cláusula 7):** 50% na aprovação do orçamento, como sinal e reserva de agenda, e 50% na entrega da versão final, antes do envio dos arquivos em alta resolução sem marca d'água. O sinal não é devolvido em caso de desistência da CONTRATANTE.

6.3. Forma de pagamento: PIX (a chave será enviada pela CONTRATADA), boleto ou transferência. A CONTRATADA emitirá nota fiscal de serviço a cada pagamento.

6.4. **Atraso:** sobre valores em atraso incidem multa de 2%, juros de 1% ao mês pro rata e correção monetária pelo IPCA.

6.5. Atraso superior a 10 dias corridos permite à CONTRATADA suspender produção, captações e publicações até a regularização, sem que isso gere multa ou responsabilidade por atraso. Atraso superior a 30 dias permite a rescisão por culpa da CONTRATANTE (Cláusula 11).

6.6. **Reajuste:** a cada 6 meses de vigência, a mensalidade será reajustada pelo IPCA acumulado no período (ou índice que o substitua), sem prejuízo de renegociação do escopo por acordo escrito entre as partes.

6.7. Despesas de terceiros aprovadas pela CONTRATANTE (gráfica, locação, modelos, licenças, viagem) não estão incluídas na mensalidade. São pagas diretamente pela CONTRATANTE ou reembolsadas à CONTRATADA em até 5 dias úteis após a apresentação dos comprovantes.

## Cláusula 7 — Dos serviços avulsos

7.1. Serviços fora do Anexo I podem ser contratados a qualquer momento, pelos valores da tabela abaixo, vigente na data do pedido. A contratação é feita por aceite escrito (WhatsApp ou portal do cliente) do orçamento, que passa a integrar este contrato.

7.2. Clientes com contrato recorrente ativo têm 10% de desconto sobre a tabela.

Serviço avulso | Valor (R$)
Vídeo extra (Reels curto) | 300
Card / peça gráfica | 75
Locução profissional humana | Custo do serviço
Locução sintética (IA) | Custo da plataforma
Vinheta / motion graphics | A combinar entre as partes
Arquivos RAW de foto | A combinar entre as partes
Projeto aberto editável | Valor da entrega + 50% do valor
Cobertura de evento | 500
Vídeo de apresentação / institucional | 2.000
Diagnóstico de comunicação | 600
Motion para TV Indoor ou OOH | 200
Licença ampliada (Cláusula 9.2) | A combinar, por orçamento
Armazenamento estendido | Custo da plataforma ou disco de armazenamento do cliente

## Cláusula 8 — Das obrigações das partes

8.1. **Obrigações da CONTRATADA:**

- Executar os serviços com qualidade técnica e dentro dos prazos da Cláusula 4.
- Manter a CONTRATANTE informada sobre o andamento, com calendário ou cronograma atualizado.
- Avisar com antecedência qualquer risco de atraso, com a causa e o novo prazo proposto.
- Usar apenas trilhas, fontes e bancos de imagem devidamente licenciados.
- Manter sigilo sobre informações da CONTRATANTE (Cláusula 10).
- Substituir membro da equipe ou equipamento, sem custo, em caso de imprevisto, mantendo o padrão de qualidade.
- Refazer sem custo o que apresentar falha técnica de sua responsabilidade.

8.2. **Obrigações da CONTRATANTE:**

- Fornecer briefing, materiais, acessos e informações corretas e completas.
- Manter um ponto focal com poder de decisão e respeitar o prazo de feedback.
- Garantir que pessoas, produtos, marcas e locais que aparecem no material estão autorizados (Cláusula 10).
- Responder pela veracidade das informações técnicas, comerciais e regulatórias que pedir para divulgar (ex.: preços, promoções, regras da ANVISA ou do conselho profissional do setor).
- Pagar nos prazos e reembolsar despesas aprovadas.
- Comunicar à CONTRATADA, pelo grupo de comunicação e não a membros da equipe individualmente, pedidos de alteração de escopo.

8.3. A CONTRATANTE não contratará diretamente, durante a vigência e por 6 meses após, membros da equipe ou freelancers apresentados pela CONTRATADA para os mesmos serviços, sem acordo prévio. O descumprimento gera multa de 3 mensalidades.

## Cláusula 9 — Dos direitos autorais e do uso do material

9.1. Após o **pagamento integral** de cada entrega, a CONTRATADA concede à CONTRATANTE **licença de uso exclusiva, por prazo indeterminado e sem limite territorial**, das peças finais aprovadas, para divulgação da própria marca nos seguintes meios:

- redes sociais, site, aplicativos de mensagem e e-mail da CONTRATANTE;
- anúncios pagos em plataformas digitais (Meta, Google, TikTok e similares);
- apresentações comerciais, eventos e materiais impressos próprios.

9.2. Uso em TV, rádio, cinema, mídia exterior (OOH/DOOH), embalagens ou por terceiros (parceiros, franqueados, revenda) depende de **licença ampliada**, orçada à parte conforme a Cláusula 7.

9.3. Logotipos e identidades visuais criados especificamente para a CONTRATANTE têm seus direitos patrimoniais **cedidos integralmente** a ela após o pagamento integral, para que possa registrá-los no INPI.

9.4. Material bruto, arquivos RAW, projetos abertos e cenas não usadas continuam de titularidade da CONTRATADA, salvo compra pela CONTRATANTE. O material bruto entregue no HD da CONTRATANTE (Cláusulas 3.3 e 12.1.1) é para guarda; seu uso ou edição depende de autorização escrita da CONTRATADA.

9.5. Trilhas, fontes, imagens de banco e outros elementos de terceiros seguem as licenças de seus titulares. Se uma licença tiver prazo ou limite de uso, a CONTRATADA avisará antes da entrega.

9.6. A CONTRATANTE não pode alterar, recortar ou reeditar as peças de forma que prejudique a qualidade ou o sentido original sem consultar a CONTRATADA. Os direitos morais de autoria são inalienáveis (Lei 9.610/1998, art. 27).

9.7. **Portfólio:** a CONTRATADA pode usar as peças publicadas, e bastidores da produção, em seu portfólio, site, redes sociais e propostas comerciais, após a publicação pela CONTRATANTE. Se a CONTRATANTE não quiser esse uso, deve informar à CONTRATADA por escrito.

9.8. Enquanto houver valores em aberto, a licença fica suspensa e a CONTRATADA pode pedir a retirada do material.

## Cláusula 10 — Do direito de imagem, dados pessoais e sigilo

10.1. **Imagem de pessoas:** a CONTRATANTE é responsável por obter autorização de uso de imagem e voz, por escrito, de funcionários, clientes e convidados que apareçam no material (Código Civil, art. 20). A CONTRATADA fornece modelo de termo de autorização, se solicitado (Anexo III). Para menores de idade, a autorização deve ser assinada pelo responsável legal.

10.2. Modelos, atores ou influenciadores contratados pela CONTRATADA a pedido da CONTRATANTE terão autorização de imagem com prazo e meios definidos no orçamento. Uso além disso exige renovação.

10.3. Em eventos e locais públicos, a CONTRATADA evitará destacar pessoas que manifestem não querer ser filmadas e removerá das peças, sem custo, quem pedir.

10.4. **LGPD:** cada parte trata os dados pessoais recebidos apenas para executar este contrato, conforme a Lei 13.709/2018. A CONTRATADA não compartilha dados de clientes da CONTRATANTE com terceiros e os apaga quando não forem mais necessários.

10.5. **Sigilo:** as partes manterão sigilo sobre informações estratégicas, comerciais e financeiras a que tiverem acesso, durante a vigência e por 2 anos após o fim do contrato. Campanhas e lançamentos não serão divulgados pela CONTRATADA antes da publicação oficial pela CONTRATANTE.

10.6. **Acessos:** senhas e acessos fornecidos à CONTRATADA (redes, site, contas) serão usados só para o serviço. A CONTRATANTE deve trocar as senhas ao fim do contrato. A CONTRATADA não responde por uso indevido após esse prazo.

## Cláusula 11 — Do cancelamento, da remarcação e da rescisão

11.1. Cancelamento ou remarcação de captação pela CONTRATANTE:

Aviso antes da data | Remarcação | Cancelamento
Mais de 2 dias | Sem custo (1 vez por captação) | Sem custo, exceto despesas já pagas
No dia, com equipe já mobilizada | 50% da diária (R$ [valor da diária]) | 100% da diária + despesas

11.2. **Cancelamento de captação pela CONTRATADA:** se a CONTRATADA cancelar sem motivo de força maior, propõe nova data sem custo, e a quantidade não realizada é compensada no mês seguinte, conforme a Cláusula 3.4.

11.3. **Rescisão sem motivo:** qualquer parte pode encerrar o contrato com aviso prévio por escrito de 30 dias, durante os quais os serviços e pagamentos seguem normalmente, sem multa.

11.4. **Rescisão por descumprimento:** a parte prejudicada pode rescindir de imediato se a outra não corrigir o descumprimento em 10 dias úteis após notificação por escrito, sem aviso prévio da Cláusula 11.3.

11.5. **Acerto final:** na rescisão, a CONTRATANTE paga o trabalho já executado ou em andamento, proporcional à etapa, e a CONTRATADA entrega o que já foi pago. A licença de uso do material pago continua válida.

11.6. **Força maior:** eventos fora do controle das partes (doença grave da equipe, acidente, desastre, bloqueio de estrada, falta de energia prolongada) suspendem os prazos sem multa. As partes remarcam em comum acordo. Se a suspensão passar de 30 dias, qualquer parte pode rescindir sem multa, com acerto proporcional.

11.7. **Limite de responsabilidade:** a responsabilidade da CONTRATADA por danos ligados a este contrato fica limitada ao valor pago pela CONTRATANTE nos 3 meses anteriores ao fato, exceto em caso de dolo ou culpa grave. Se houver perda de material antes da entrega por falha de equipamento, a CONTRATADA refaz a captação sem custo ou devolve o valor da etapa, à escolha da CONTRATANTE.

## Cláusula 12 — Do armazenamento e das disposições gerais

12.1. **Armazenamento:** a CONTRATADA mantém os arquivos finais disponíveis para download por 90 dias após cada entrega, e o material bruto por 6 meses. Depois disso, pode apagá-los sem aviso. Guardar cópia é responsabilidade da CONTRATANTE. Armazenamento por mais tempo é serviço avulso.

12.1.1. **HD/SSD da CONTRATANTE:** a CONTRATADA recomenda que a CONTRATANTE adquira um HD ou SSD externo exclusivo, de no mínimo 1 TB. Todo o material bruto da CONTRATANTE será gravado nele até o disco encher. Enquanto houver espaço, o disco fica sob guarda da CONTRATADA; cheio, é devolvido à CONTRATANTE, que passa a ser responsável por ele. A CONTRATADA não responde por falha física ou desgaste natural do dispositivo.

12.2. **Comunicação:** o WhatsApp dos pontos focais e o portal do cliente ([endereço do portal]) são os meios oficiais para pedidos, aprovações e notificações, inclusive de rescisão.

12.3. **Horário de atendimento:** segunda a sexta, das 8 h às 18 h. Mensagens fora desse horário contam a partir do próximo dia útil. Captações em fins de semana e feriados podem ser agendadas com acréscimo de 30% mediante acordo entre as partes.

12.4. **Independência:** este contrato não cria vínculo empregatício, sociedade ou representação entre as partes. Cada uma responde por seus tributos e encargos.

12.5. **Tolerância:** deixar de cobrar um direito em algum momento não significa abrir mão dele.

12.6. **Alterações:** mudanças neste contrato só valem por termo aditivo ou aceite escrito das duas partes. Ajustes de quantidade dentro do Anexo I podem ser feitos pelo WhatsApp ou pelo portal do cliente.

12.7. **Assinatura:** este contrato pode ser assinado em via impressa, com assinatura física, ou eletronicamente (gov.br, DocuSign, ZapSign ou similar). As duas formas têm a mesma validade.

12.8. **Foro:** fica eleito o foro da Comarca de Luís Eduardo Magalhães/BA para resolver questões deste contrato. Antes de qualquer ação, as partes tentarão resolver por conversa direta em até 15 dias.

Luís Eduardo Magalhães/BA, [dia] de [mês] de 2026.

CONTRATADA | CONTRATANTE
Vitor Eduardo Silva dos Santos | Laiane Vieira — {{cliente}}
CPF: [número] | CPF: [número]

Testemunhas: 1) [nome, CPF]; 2) [nome, CPF].

## Anexo I — Escopo e entregáveis mensais

Objetivo do trabalho para este cliente: [preencher].

Entregável | Quantidade/mês | Especificação
Vídeos curtos (Reels) | 4 | até 90 s, legendado
Diárias de captação | 1 diária completa ou 2 meia-diárias | 1 diária corresponde a 8 h
Fotos tratadas | A partir de 20 | —
Peças gráficas (posts/carrosséis) | 9 | Tráfego/orgânico e cardápio do burger do mês
Reunião de planejamento | 1 | até 1 h, presencial ou online

## Anexo II — Cronograma mensal padrão

- Até o dia 25: a CONTRATADA envia calendário e pautas do mês seguinte.
- Até o dia 28: a CONTRATANTE aprova ou ajusta o calendário (1 rodada).
- Semana 1 do mês: reunião mensal e agendamento da primeira captação.
- Semanas 2 a 4: captações e entregas em lotes, com aprovação conforme a Cláusula 5.

## Anexo III — Modelo de autorização de uso de imagem

Eu, [nome], [CPF], autorizo {{cliente}} a usar minha imagem e voz, captadas em [data/local], em materiais de divulgação da marca nos meios [listar], por prazo [indeterminado / X anos], sem remuneração. [Local, data, assinatura.]
