-- Referência enviada como arquivo, em vez de link colado.
--
-- O webp ou webm sobe pra uma pasta fixa do Drive (DRIVE_REFERENCES_FOLDER_ID)
-- e só o id do arquivo fica guardado aqui: `url` e `thumb_url` passam a
-- apontar pros proxies que já servem o Drive (/api/drive-image e
-- /api/drive-thumbnail), os mesmos das galerias.
--
-- A coluna também é o que autoriza esses proxies a servir o arquivo — ver
-- loadKnownDriveFileByFileId em lib/galleries.ts.

alter table reference_pins
  add column if not exists drive_file_id text not null default '';

create index if not exists reference_pins_drive_file_id_idx
  on reference_pins (drive_file_id)
  where drive_file_id <> '';
