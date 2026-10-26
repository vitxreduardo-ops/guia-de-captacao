-- Multa por cancelamento antecipado do contrato mensal: 20% das mensalidades
-- que faltariam até o fim da vigência. A v2 do modelo completo dizia "sem
-- multa" na rescisão sem motivo, e o modelo mensal curto não falava em multa.
-- Rescisão por descumprimento continua sem multa.
-- Contratos de cliente já criados foram ajustados à parte, direto no banco.

update contracts
set body = replace(
  replace(
    body,
    E'durante os quais os serviços e pagamentos seguem normalmente, sem multa.',
    E'durante os quais os serviços e pagamentos seguem normalmente. Se a rescisão partir da CONTRATANTE antes do fim da vigência, é devida multa de 20% sobre a soma das mensalidades que faltariam até o fim da vigência, contadas após o aviso prévio, paga junto com a última mensalidade.'
  ),
  E'sem aviso prévio da Cláusula 11.3.',
  E'sem aviso prévio ou multa da Cláusula 11.3.'
)
where is_template and slug = 'modelo-completo';

update contracts
set body = replace(
  body,
  E'dias. As entregas em andamento são concluídas e faturadas normalmente.',
  E'dias. As entregas em andamento são concluídas e faturadas normalmente.\n\nSe o encerramento partir da CONTRATANTE antes do fim da vigência do item 2,\né devida multa de 20% (vinte por cento) sobre a soma das mensalidades que\nfaltariam até o fim da vigência, contadas após o aviso prévio. A multa não se\naplica quando o encerramento decorre de descumprimento da CONTRATADA.'
)
where is_template and slug = 'modelo-mensal';
