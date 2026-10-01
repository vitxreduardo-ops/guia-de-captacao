-- Descrição do cliente pro chat de roteiros: quem é, público, tom, o que
-- evitar. Separada de `notes` (combinados de pagamento), que não vai pra IA.
alter table gallery_clients
  add column if not exists descricao_roteiro text not null default '';
