-- Assinaturas do modelo completo como num contrato redigido: uma linha para
-- cada parte e para cada testemunha, no lugar da tabela CONTRATADA | CONTRATANTE.
-- Só o modelo muda; contratos já criados ficam como estão.
update contracts
set body = replace(
  body,
  E'CONTRATADA | CONTRATANTE\nVitor Eduardo Silva dos Santos | [nome do representante] — {{cliente}}\nCPF: [número] | CPF: [número]\n\nTestemunhas: 1) [nome, CPF]; 2) [nome, CPF].',
  E'________________________________________\n**CONTRATADA:** Vitor Eduardo Silva dos Santos\nCPF: [número]\n\n________________________________________\n**CONTRATANTE:** {{cliente}}\nCPF: [número]\n\n**Testemunhas:**\n\n________________________________________\nNome: [nome]\nCPF: [número]\n\n________________________________________\nNome: [nome]\nCPF: [número]'
)
where is_template and slug = 'modelo-completo';
