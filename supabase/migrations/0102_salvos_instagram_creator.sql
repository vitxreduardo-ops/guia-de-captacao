-- @ do perfil que publicou o post salvo, sem o "@". Vazio = ainda não descoberto.
alter table instagram_saved_posts add column if not exists creator text not null default '';
