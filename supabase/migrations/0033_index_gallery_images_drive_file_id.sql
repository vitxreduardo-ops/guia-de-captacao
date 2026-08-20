-- O proxy de mídia (/api/drive-image, /api/drive-thumbnail) confirma cada
-- arquivo pelo drive_file_id sozinho, sem client_id. O único índice existente
-- é (client_id, drive_file_id), que não serve pra esse filtro — a consulta
-- varria a tabela a cada requisição, e assistir um vídeo dispara várias.
create index if not exists gallery_images_drive_file_id_lookup_idx
  on gallery_images(drive_file_id)
  where drive_file_id is not null;
