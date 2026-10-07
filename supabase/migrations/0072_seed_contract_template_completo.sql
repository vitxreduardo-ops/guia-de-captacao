-- Modelo completo de contrato: 13 cláusulas e 4 anexos (0054 tem os modelos
-- curtos).
--
-- O texto vem do documento de estrutura do contrato, sem reescrita. Os campos
-- entre colchetes ficam para preencher a cada cliente; as tabelas viram linhas
-- com colunas separadas por ` | ` porque o corpo é Markdown simples.
--
-- `where not exists` pelo slug: o corpo é editável pela tela, e rodar de novo
-- não pode sobrescrever o que já foi reescrito.
-- Isto é um modelo de trabalho, não parecer jurídico: passar pelo advogado
-- antes de usar com cliente.

insert into contracts (slug, title, kind, is_template, body)
select 'modelo-completo', 'Modelo — contrato completo (13 cláusulas)', 'mensal', true,
$corpo$## Cláusula 1 — Das partes

**CONTRATADA:** TATU ESTÚDIO CRIATIVO — [razão social], inscrita no CNPJ sob o nº [CNPJ], com sede em [endereço], Luís Eduardo Magalhães/BA, neste ato representada por [nome do sócio], [CPF].

**CONTRATANTE:** [razão social ou nome completo], inscrita no CNPJ/CPF sob o nº [número], com sede em [endereço], neste ato representada por [nome], [cargo], [CPF].

**Responsável pelas aprovações (ponto focal):** [nome], [WhatsApp], [e-mail]. Somente esta pessoa, ou quem ela indicar por escrito, pode aprovar entregas e pedir alterações em nome da CONTRATANTE.

As partes celebram este Contrato de Prestação de Serviços Criativos e Audiovisuais, regido pelas cláusulas a seguir.

## Cláusula 2 — Do objeto e da vigência

2.1. O objeto deste contrato é a prestação de serviços de comunicação, produção audiovisual, fotografia e design pela CONTRATADA, conforme o escopo descrito no **Anexo I (Escopo e Entregáveis)**, que faz parte deste contrato.

2.2. Modalidade (o editor insere só o texto da opção escolhida):

- **Recorrente mensal:** os serviços serão prestados todo mês, nas quantidades do Anexo I, com vigência de [12] meses a partir de [data], renovável por igual período mediante termo aditivo ou aceite escrito pelo WhatsApp ou pelo portal do cliente.
- **Pacote de itens:** os serviços correspondem a um pacote fechado com as quantidades do Anexo I, a ser executado entre [data de início] e [data limite]. Itens não usados até a data limite por iniciativa da CONTRATANTE são considerados prestados.
- **Pontual:** os serviços correspondem a um projeto único, descrito no Anexo I, com início em [data] e encerramento na entrega final aprovada.

2.3. Tudo o que não estiver listado no Anexo I está fora do escopo e será orçado à parte, conforme a Cláusula 8. Em caso de dúvida entre este contrato e o Anexo I, vale o Anexo I para quantidades e o contrato para regras.

2.4. A CONTRATADA não executa gestão de tráfego pago. Se a CONTRATANTE quiser esse serviço, a CONTRATADA pode indicar parceiro, que será contratado e pago diretamente pela CONTRATANTE.

2.5. A CONTRATADA se obriga a entregar o trabalho com qualidade técnica e no prazo (obrigação de meio). Não garante resultados comerciais, como vendas, seguidores, alcance ou engajamento, que dependem de fatores fora do seu controle.

## Cláusula 3 — Dos entregáveis

3.1. Os entregáveis, suas quantidades mensais e especificações estão no Anexo I. Salvo indicação diferente no Anexo I, valem os padrões abaixo.

Entregável | Formato de entrega padrão | Incluído | Não incluído (avulso)
Vídeo curto (Reels/Stories) | MP4 H.264, 1080×1920, até [60] s | Roteiro simples, captação, edição, legenda, trilha de biblioteca licenciada | Locução profissional, motion complexo, versões extras de formato
Vídeo institucional | MP4 H.264, 1920×1080, até [3] min | Roteiro, 1 diária de captação, edição, cor, trilha licenciada | Atores, drone em área restrita, trilha exclusiva
Fotografia | JPG tratado, alta resolução + versão web | Seleção pela CONTRATADA e tratamento de cor | Arquivos RAW, retoque de pele avançado, manipulação
Peças gráficas (cards, carrosséis) | PNG/JPG nos formatos da rede | Criação, texto de apoio, 1 adaptação de formato | Arquivo aberto editável, novas adaptações
Impressos | PDF fechado para gráfica | Arte-final conforme especificações da gráfica | Custo de impressão e frete
Site / landing page | Publicado no domínio da CONTRATANTE | Conforme Anexo I | Domínio, hospedagem, plugins pagos, manutenção mensal

3.2. Entregas são feitas pelo Google Drive ou pela área do cliente em tatuestudio.com.br. Considera-se entregue o material na data de envio do link ao ponto focal.

3.3. Arquivos brutos (vídeo e foto sem edição), arquivos RAW e projetos abertos (Premiere, DaVinci, Photoshop, Illustrator, Figma) **não fazem parte da entrega**. Podem ser adquiridos à parte, conforme a Cláusula 8.

3.4. Quantidades mensais não utilizadas por iniciativa da CONTRATANTE (falta de agenda, atraso de briefing ou de aprovação) não acumulam para o mês seguinte e não geram desconto. Quando o não uso for causado pela CONTRATADA, o saldo será compensado no mês seguinte.

3.5. Uso de inteligência artificial: a CONTRATADA pode usar ferramentas de IA como apoio (tratamento, geração de elementos, locução sintética). Imagens de pessoas geradas por IA ou vozes sintéticas só serão usadas em peças da CONTRATANTE com aviso prévio e aprovação dela.

## Cláusula 4 — Dos prazos

4.1. Os prazos contam em **dias úteis** e só começam a correr quando a CONTRATADA recebe, juntos: briefing aprovado, materiais necessários (logo, textos, acessos, informações técnicas) e o pagamento previsto para a etapa.

Etapa | Prazo padrão da CONTRATADA
Proposta de roteiro / pauta | [3] dias úteis após o briefing
Primeira versão de vídeo curto | [5] dias úteis após a captação
Primeira versão de vídeo institucional | [10] dias úteis após a captação
Fotos tratadas | [7] dias úteis após a captação
Peças gráficas | [3] dias úteis após o briefing
Ajustes de cada rodada | [3] dias úteis após o feedback consolidado
Calendário editorial do mês seguinte | até o dia [20] do mês corrente

4.2. **Prazo da CONTRATANTE:** responder briefings, enviar materiais e dar feedback em até [3] dias úteis após cada solicitação ou entrega.

4.3. Cada dia de atraso da CONTRATANTE prorroga automaticamente o prazo da CONTRATADA pelo mesmo número de dias, mais o tempo necessário para reencaixe na agenda, limitado a [5] dias úteis extras.

4.4. Se a CONTRATANTE ficar mais de [15] dias corridos sem responder sobre uma entrega, ela será considerada pausada. Retomar depois disso depende de nova janela de agenda. Após [60] dias parada, a entrega é encerrada e o valor da etapa já executada é devido.

4.5. Pedidos com prazo menor que o padrão (urgência) só são aceitos se houver agenda e têm acréscimo de [50]% sobre o valor do item. Pedidos para entrega em até 24 h, de [100]%.

4.6. Atraso injustificado da CONTRATADA superior a [5] dias úteis dá à CONTRATANTE desconto de [2]% sobre a mensalidade do mês para cada entregável atrasado, limitado a [10]% da mensalidade.

## Cláusula 5 — Das alterações e aprovações

5.1. Cada entregável inclui **[2] rodadas de ajustes**. Uma rodada é **uma única lista consolidada** de pedidos, enviada de uma vez pelo ponto focal. Comentários soltos enviados depois que a CONTRATADA já começou a ajustar contam como nova rodada.

5.2. Diferença entre ajuste e refação:

É ajuste (dentro das rodadas) | É refação ou novo job (cobrado à parte)
Trocar texto, corte, trilha, cor, ordem de cenas | Mudar o conceito ou o roteiro já aprovado
Corrigir erro de informação | Pedir cenas que não foram captadas
Ajustar tamanho, posição, fonte | Mudar o briefing depois da primeira versão
Trocar foto por outra da mesma sessão | Nova captação ou nova sessão

5.3. Erros técnicos ou de informação causados pela CONTRATADA são corrigidos sem custo e não consomem rodada.

5.4. Rodadas além das incluídas custam [R$ preencher] por rodada (ou [X]% do valor do item), com novo prazo conforme a Cláusula 4.

5.5. **Aprovação:** ocorre por escrito, pelo WhatsApp do ponto focal ou pelo portal do cliente em tatuestudio.com.br ("aprovado", "pode postar" ou equivalente).

5.6. **Aprovação tácita:** se a CONTRATANTE não se manifestar em [5] dias úteis após a entrega, a versão é considerada aprovada para fins de faturamento e fechamento de etapa. A CONTRATADA avisará por mensagem [2] dias úteis antes desse prazo vencer.

5.7. Após aprovado e publicado, qualquer mudança é nova solicitação, exceto correção de erro da CONTRATADA.

## Cláusula 6 — Dos valores e do pagamento

6.1. **Recorrente:** a CONTRATANTE pagará mensalidade de [R$ preencher] ([valor por extenso]), com vencimento todo dia [5], referente ao mês de trabalho em curso (pagamento antecipado).

6.2. **Projeto único:** [50]% na assinatura, como sinal e reserva de agenda, e [50]% na entrega da versão final, antes do envio dos arquivos em alta resolução sem marca d'água. O sinal não é devolvido em caso de desistência da CONTRATANTE, exceto na hipótese da Cláusula 12.2.

6.3. Forma de pagamento: PIX [chave], boleto ou transferência. A CONTRATADA emitirá nota fiscal de serviço a cada pagamento.

6.4. **Atraso:** sobre valores em atraso incidem multa de 2%, juros de 1% ao mês pro rata e correção monetária pelo IPCA.

6.5. Atraso superior a [10] dias corridos permite à CONTRATADA suspender produção, captações e publicações até a regularização, sem que isso gere multa ou responsabilidade por atraso. Atraso superior a [30] dias permite a rescisão por culpa da CONTRATANTE (Cláusula 12).

6.6. **Reajuste:** a mensalidade poderá ser reajustada a cada [12] meses, por valor ajustado entre as partes.

6.7. Despesas de terceiros aprovadas pela CONTRATANTE (gráfica, locação, modelos, licenças, viagem) não estão incluídas na mensalidade. São pagas diretamente pela CONTRATANTE ou reembolsadas à CONTRATADA em até [5] dias úteis após a apresentação dos comprovantes.

## Cláusula 7 — Das captações fora de Luís Eduardo Magalhães

7.1. A mensalidade cobre captações dentro do perímetro urbano de Luís Eduardo Magalhães/BA. Fora dele, aplicam-se as zonas abaixo, contadas a partir da sede da CONTRATADA.

Zona | Exemplo | Deslocamento | Alimentação | Hospedagem | Tempo de viagem
1 — Urbana | LEM | Incluído | Incluída | — | —
2 — Regional (até [120] km, bate-volta) | Barreiras, fazendas da região | [R$ preencher]/km rodado (ida e volta) | Refeição por pessoa se a diária passar de [6] h | Não se aplica | Incluído
3 — Viagem (acima de [120] km ou com pernoite) | Outras cidades/estados | Veículo: km rodado + pedágios; aéreo/ônibus pagos pela CONTRATANTE | Diária de alimentação de [R$ preencher] por pessoa por dia | Paga pela CONTRATANTE | Dia só de viagem = [50]% de uma diária de captação por pessoa

7.2. **Hospedagem mínima:** quarto com ar-condicionado, banheiro privativo, Wi-Fi e local seguro para equipamentos, a até [15] min do set. Quartos individuais ou, com concordância da equipe, compartilhados.

7.3. **Antecipação:** as despesas da Zona 3 devem ser pagas ou adiantadas à CONTRATADA até [5] dias úteis antes da viagem. Sem isso, a CONTRATADA pode remarcar sem multa.

7.4. **Equipe:** o número de pessoas que viajam é definido no orçamento de cada captação. Todas as despesas desta cláusula valem por pessoa.

7.5. **Diária de captação:** [8] h de trabalho em set, com [1] h de intervalo para refeição. Meia diária: até [4] h. Hora extra: [R$ preencher] por pessoa ou [1/8 da diária + 50%].

7.6. **Clima e condições externas:** se chuva, poeira, fumaça ou outro fator impedir a captação externa, as partes podem remarcar sem multa se a decisão for tomada até as [18] h do dia anterior. Se a equipe já tiver se deslocado, são devidos o deslocamento, as despesas já feitas e [50]% da diária.

7.7. **Acesso e segurança:** a CONTRATANTE garante autorizações de acesso a propriedades e locais, EPIs exigidos pelo local (ex.: fazendas, indústrias) e um responsável no local para acompanhar a equipe.

7.8. Drone só é operado em condições legais e seguras (regras da ANAC e DECEA). A decisão final de voar ou não é do piloto da CONTRATADA.

## Cláusula 8 — Dos serviços avulsos

8.1. Serviços fora do Anexo I podem ser contratados a qualquer momento, pelos valores da tabela abaixo, vigente na data do pedido. A contratação é feita por aceite escrito (WhatsApp ou portal do cliente) do orçamento, que passa a integrar este contrato.

8.2. Clientes com contrato recorrente ativo têm [10]% de desconto sobre a tabela.

Serviço avulso | Unidade | Valor (R$) | Lógica de preço sugerida
Rodada extra de ajustes | por rodada | [preencher] | Horas de ajuste × custo-hora
Urgência (prazo menor que o padrão) | por item | +[50]% | Sobre o valor do item
Urgência 24 h | por item | +[100]% | Sobre o valor do item
Diária extra de captação (8 h) | por diária | [preencher] | Equipe × custo-hora × 8 + equipamento
Meia diária (até 4 h) | por meia diária | [preencher] | 60% da diária (custo de mobilização não cai pela metade)
Hora extra em set | por hora/pessoa | [preencher] | 1/8 da diária + 50%
Drone (captação aérea) | por diária | [preencher] | Adicional fixo + risco do equipamento
Vídeo curto extra (Reels) | por vídeo | [preencher] | Horas de captação + edição × custo-hora
Versão extra de formato (ex.: 16:9 → 9:16) | por versão | [preencher] | 15–30% do vídeo original
Legenda em outro idioma | por vídeo | [preencher] | Tradução + aplicação
Locução profissional humana | por peça | custo + [20]% | Cachê do locutor + gestão
Locução sintética (IA) | por peça | [preencher] | Horas de direção e ajuste
Trilha exclusiva ou licença premium | por peça | custo + [20]% | Licença + gestão
Vinheta / motion graphics | por peça | [preencher] | Horas de animação × custo-hora
Fotos tratadas extras | por foto | [preencher] | Tempo de tratamento × custo-hora
Retoque avançado / manipulação | por foto | [preencher] | Horas × custo-hora
Arquivos brutos de vídeo | por captação | [preencher] | Valor que compense entregar o material sem o seu acabamento
Arquivos RAW de foto | por sessão | [preencher] | Idem
Projeto aberto editável | por peça | [preencher] | 50–100% do valor da peça
Peça gráfica extra | por peça | [preencher] | Horas × custo-hora
Arte para impresso (banner, folder, fachada) | por peça | [preencher] | Horas × custo-hora
Cobertura de evento | por evento | [preencher] | Diária(s) + edição
Ensaio fotográfico | por sessão | [preencher] | Meia diária + tratamento
Vídeo de apresentação / institucional | por vídeo | [preencher] | Roteiro + diária + edição
Landing page | por página | [preencher] | Horas de design + desenvolvimento
Manutenção de site | mensal | [preencher] | Horas reservadas por mês
Diagnóstico de comunicação | por diagnóstico | [preencher] | Abatido do 1º mês se o cliente fechar contrato
Licença ampliada (mídia paga, TV, OOH) | por peça | +[30]% | Sobre o valor da peça (Cláusula 10)
Armazenamento estendido | por ano | [preencher] | Custo de nuvem + gestão

**Como achar o custo-hora (nota interna, remover antes de enviar):** some custos fixos mensais do estúdio + pró-labore desejado + reserva de equipamento; divida pelas horas fatúveis reais do mês (em geral 60–70% das horas trabalhadas). Esse é o piso. Preço = horas estimadas × custo-hora × (1 + margem).

## Cláusula 9 — Das obrigações das partes

9.1. **Obrigações da CONTRATADA:**

- Executar os serviços com qualidade técnica e dentro dos prazos da Cláusula 4.
- Manter a CONTRATANTE informada sobre o andamento, com calendário ou cronograma atualizado.
- Avisar com antecedência qualquer risco de atraso, com a causa e o novo prazo proposto.
- Usar apenas trilhas, fontes e bancos de imagem devidamente licenciados.
- Manter sigilo sobre informações da CONTRATANTE (Cláusula 11).
- Substituir membro da equipe ou equipamento, sem custo, em caso de imprevisto, mantendo o padrão de qualidade.
- Refazer sem custo o que apresentar falha técnica de sua responsabilidade.

9.2. **Obrigações da CONTRATANTE:**

- Fornecer briefing, materiais, acessos e informações corretas e completas.
- Manter um ponto focal com poder de decisão e respeitar o prazo de feedback.
- Garantir que pessoas, produtos, marcas e locais que aparecem no material estão autorizados (Cláusula 11).
- Responder pela veracidade das informações técnicas, comerciais e regulatórias que pedir para divulgar (ex.: preços, promoções, alegações de saúde, regras da ANVISA ou do conselho profissional do setor).
- Pagar nos prazos e reembolsar despesas aprovadas.
- Comunicar diretamente à CONTRATADA, e não a membros da equipe individualmente, pedidos de alteração de escopo.

9.3. A CONTRATANTE não contratará diretamente, durante a vigência e por [12] meses após, membros da equipe ou freelancers apresentados pela CONTRATADA para os mesmos serviços, sem acordo prévio. Descumprimento gera multa de [3] mensalidades.

## Cláusula 10 — Dos direitos autorais e do uso do material

10.1. Após o **pagamento integral** de cada entrega, a CONTRATADA concede à CONTRATANTE **licença de uso exclusiva, por prazo indeterminado e sem limite territorial**, das peças finais aprovadas, para divulgação da própria marca nos seguintes meios:

- redes sociais, site, aplicativos de mensagem e e-mail da CONTRATANTE;
- anúncios pagos em plataformas digitais (Meta, Google, TikTok e similares);
- apresentações comerciais, eventos e materiais impressos próprios.

10.2. Uso em TV, rádio, cinema, mídia exterior (OOH/DOOH), embalagens ou por terceiros (parceiros, franqueados, revenda) depende de **licença ampliada** (Cláusula 8).

10.3. Logotipos e identidades visuais criados especificamente para a CONTRATANTE têm seus direitos patrimoniais **cedidos integralmente** a ela após o pagamento integral, para que possa registrá-los no INPI.

10.4. Material bruto, arquivos RAW, projetos abertos e cenas não usadas continuam de propriedade da CONTRATADA, salvo compra pela CONTRATANTE.

10.5. Trilhas, fontes, imagens de banco e outros elementos de terceiros seguem as licenças de seus titulares. Se uma licença tiver prazo ou limite de uso, a CONTRATADA avisará antes da entrega.

10.6. A CONTRATANTE não pode alterar, recortar ou reeditar as peças de forma que prejudique a qualidade ou o sentido original sem consultar a CONTRATADA. Os direitos morais de autoria são inalienáveis (Lei 9.610/1998, art. 27).

10.7. **Portfólio:** a CONTRATADA pode usar as peças publicadas, e bastidores da produção, em seu portfólio, site, redes sociais e propostas comerciais, após a publicação pela CONTRATANTE. Se a CONTRATANTE não quiser esse uso, deve marcar aqui: [ ] Não autorizo uso em portfólio.

10.8. Enquanto houver valores em aberto, a licença fica suspensa e a CONTRATADA pode pedir a retirada do material.

## Cláusula 11 — Do direito de imagem, dados pessoais e sigilo

11.1. **Imagem de pessoas:** a CONTRATANTE é responsável por obter autorização de uso de imagem e voz, por escrito, de funcionários, clientes e convidados que apareçam no material (Código Civil, art. 20). A CONTRATADA fornece modelo de termo de autorização, se solicitado. Para menores de idade, a autorização deve ser assinada pelo responsável legal.

11.2. Modelos, atores ou influenciadores contratados pela CONTRATADA a pedido da CONTRATANTE terão autorização de imagem com prazo e meios definidos no orçamento. Uso além disso exige renovação.

11.3. Em eventos e locais públicos, a CONTRATADA evitará destacar pessoas que manifestem não querer ser filmadas e removerá das peças, sem custo, quem pedir.

11.4. **LGPD:** cada parte trata os dados pessoais recebidos apenas para executar este contrato, conforme a Lei 13.709/2018. A CONTRATADA não compartilha dados de clientes da CONTRATANTE com terceiros e os apaga quando não forem mais necessários.

11.5. **Sigilo:** as partes manterão sigilo sobre informações estratégicas, comerciais e financeiras a que tiverem acesso, durante a vigência e por [2] anos após o fim do contrato. Campanhas e lançamentos não serão divulgados pela CONTRATADA antes da publicação oficial pela CONTRATANTE.

11.6. **Acessos:** senhas e acessos fornecidos à CONTRATADA (redes, site, contas) serão usados só para o serviço. A CONTRATANTE deve trocar as senhas ao fim do contrato. A CONTRATADA não responde por uso indevido após esse prazo.

## Cláusula 12 — Do cancelamento, da remarcação e da rescisão

12.1. **Cancelamento ou remarcação de captação pela CONTRATANTE:**

Aviso antes da data | Remarcação | Cancelamento
Mais de [7] dias | Sem custo (1 vez por captação) | Sem custo, exceto despesas já pagas
Entre [72] h e [7] dias | Sem custo, se houver nova data em até [30] dias | [30]% da diária + despesas já pagas
Menos de [72] h | [30]% da diária | [50]% da diária + despesas já pagas
No dia, com equipe já mobilizada | [50]% da diária + deslocamento | 100% da diária + despesas

12.2. **Cancelamento pela CONTRATADA:** se a CONTRATADA cancelar sem motivo de força maior, devolve integralmente o que recebeu pela captação e propõe nova data sem custo. Em contrato pontual, se a CONTRATANTE não aceitar nenhuma das novas datas, a CONTRATADA devolve o sinal em dobro. **Ressalvas:** a devolução em dobro não se aplica (i) em caso de força maior (Cláusula 12.6); (ii) quando o cancelamento for avisado com mais de [7] dias de antecedência; (iii) quando a CONTRATANTE recusar [2] novas datas propostas dentro de [30] dias. Nesses casos, a devolução é simples e integral.

12.3. **Rescisão do contrato recorrente sem motivo:** qualquer parte pode encerrar com aviso prévio por escrito de [30] dias, durante os quais os serviços e pagamentos seguem normalmente. Se a rescisão pela CONTRATANTE ocorrer antes de [3] meses de vigência (período mínimo de implantação), é devida multa de [50]% das mensalidades que faltariam para completar esse período.

12.4. **Rescisão por descumprimento:** a parte prejudicada pode rescindir de imediato se a outra não corrigir o descumprimento em [10] dias úteis após notificação por escrito, sem aviso prévio ou multa da Cláusula 12.3.

12.5. **Acerto final:** na rescisão, a CONTRATANTE paga o trabalho já executado ou em andamento, proporcional à etapa, e a CONTRATADA entrega o que já foi pago. A licença de uso do material pago continua válida.

12.6. **Força maior:** eventos fora do controle das partes (doença grave da equipe, acidente, desastre, bloqueio de estrada, falta de energia prolongada) suspendem os prazos sem multa. As partes remarcam em comum acordo. Se a suspensão passar de [30] dias, qualquer parte pode rescindir sem multa, com acerto proporcional.

12.7. **Limite de responsabilidade:** a responsabilidade da CONTRATADA por danos ligados a este contrato fica limitada ao valor pago pela CONTRATANTE nos [3] meses anteriores ao fato, exceto em caso de dolo ou culpa grave. Se houver perda de material antes da entrega por falha de equipamento, a CONTRATADA refaz a captação sem custo ou devolve o valor da etapa, à escolha da CONTRATANTE.

## Cláusula 13 — Do armazenamento e das disposições gerais

13.1. **Armazenamento:** a CONTRATADA mantém os arquivos finais disponíveis para download por [90] dias após cada entrega, e o material bruto por [6] meses. Depois disso, pode apagá-los sem aviso. Guardar cópia é responsabilidade da CONTRATANTE. Armazenamento por mais tempo é serviço avulso.

13.1.1. **HD/SSD do cliente (recomendado):** a CONTRATADA recomenda que a CONTRATANTE adquira um HD ou SSD externo exclusivo, de no mínimo [1 TB]. Todo o material bruto da CONTRATANTE será gravado nele até o disco encher. Enquanto houver espaço, o disco fica sob guarda da CONTRATADA, com cuidado razoável; cheio, é devolvido à CONTRATANTE, que passa a ser responsável por ele. A CONTRATADA não responde por falha física ou desgaste natural do dispositivo.

13.2. **Comunicação:** o WhatsApp dos pontos focais e o portal do cliente em tatuestudio.com.br são os meios oficiais para pedidos, aprovações e notificações, inclusive de rescisão.

13.3. **Horário de atendimento:** segunda a sexta, das [8] h às [18] h. Mensagens fora desse horário contam a partir do próximo dia útil. Captações em fins de semana e feriados podem ser agendadas com acréscimo de [30]%.

13.4. **Independência:** este contrato não cria vínculo empregatício, sociedade ou representação entre as partes. Cada uma responde por seus tributos e encargos.

13.5. **Tolerância:** deixar de cobrar um direito em algum momento não significa abrir mão dele.

13.6. **Alterações:** mudanças neste contrato só valem por termo aditivo ou aceite escrito das duas partes. Ajustes de quantidade dentro do Anexo I podem ser feitos pelo WhatsApp ou pelo portal do cliente.

13.7. **Assinatura:** este contrato pode ser assinado em via impressa, com assinatura física, ou eletronicamente (gov.br, DocuSign, ZapSign ou similar). As duas formas têm a mesma validade.

13.8. **Foro:** fica eleito o foro da Comarca de Luís Eduardo Magalhães/BA para resolver questões deste contrato. Antes de qualquer ação, as partes tentarão resolver por conversa direta em até [15] dias.

Luís Eduardo Magalhães/BA, [data].

CONTRATADA | CONTRATANTE
[nome] — Tatu Estúdio Criativo | [nome] — [empresa]
CPF: [número] | CPF: [número]

Testemunhas: 1) [nome, CPF] 2) [nome, CPF]

## Anexo I — Escopo e entregáveis mensais

Objetivo do trabalho para este cliente: [1–2 frases do diagnóstico feito no orçamento].

Entregável | Quantidade/mês | Especificação | Canal
Vídeos curtos (Reels) | [4] | até [60] s, legendado | Instagram/TikTok
Diárias de captação | [1] | [8] h, Zona 1 | —
Fotos tratadas | [30] | da diária do mês | Banco de imagens
Peças gráficas (posts/carrosséis) | [8] | 1 adaptação de formato cada | Instagram
Stories | [preencher] | [preencher] | Instagram
Impressos | [preencher] | arte-final | Ponto de venda
Site / atendimento / outros | [preencher] | [preencher] | [preencher]
Reunião de planejamento | [1] | até [1] h, presencial ou online | —

## Anexo II — Cronograma mensal padrão

- Até o dia [20]: CONTRATADA envia calendário e pautas do mês seguinte.
- Até o dia [23]: CONTRATANTE aprova ou ajusta o calendário (1 rodada).
- Semana 1 do mês: diária de captação.
- Semanas 2 a 4: entregas em lotes, com aprovação conforme a Cláusula 5.
- Última semana: reunião de resultado e planejamento.

## Anexo III — Termo de aprovação de entrega (opcional)

Eu, [nome do ponto focal], aprovo a versão final de [nome da peça], entregue em [data], liberando-a para publicação e faturamento.

Assinatura / aceite por WhatsApp: [ ]

## Anexo IV — Modelo de autorização de uso de imagem

Eu, [nome], [CPF], autorizo [CONTRATANTE] a usar minha imagem e voz, captadas em [data/local], em materiais de divulgação da marca nos meios [listar], por prazo [indeterminado / X anos], sem remuneração. [Local, data, assinatura.]
$corpo$
where not exists (select 1 from contracts where slug = 'modelo-completo');
