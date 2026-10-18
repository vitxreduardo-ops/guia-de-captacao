-- Subpastas de cada material, por disco: { "<id do espaço>": [{ "name": "...", "sizeGb": 1.2 }] }.
-- O app do Mac lê o primeiro nível dentro da pasta; arquivos não entram.
alter table storage_items add column if not exists subfolders jsonb not null default '{}'::jsonb;
