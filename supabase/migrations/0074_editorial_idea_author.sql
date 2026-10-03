-- Quem anotou a ideia (equipe ou o próprio cliente). Ideias antigas ficam sem
-- autor; se o usuário for apagado, a ideia permanece.

alter table editorial_ideas
  add column if not exists created_by uuid references users(id) on delete set null;
