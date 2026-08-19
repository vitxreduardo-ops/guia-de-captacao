#!/bin/bash
#
# Dump do Supabase com rotação de 7 dias.
#
# A connection string fica em .env.backup (fora do git). Ela contém a senha do
# banco, e é credencial diferente da service role key do .env.local — pega no
# painel do Supabase, em Database Settings > Connection string > URI.
#
# Roda sozinho pelo launchd (ver scripts/launchd/README.md), ou na mão:
#   ./scripts/backup-db.sh

set -euo pipefail

PROJETO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="${BACKUP_DIR:-$HOME/Backups/guia-de-captacao}"
MANTER_DIAS=7

# libpq é keg-only no Homebrew, então não está no PATH por padrão. Caminho
# absoluto evita depender do shell de quem chama — o launchd roda com um PATH
# mínimo, diferente do seu terminal.
PG_DUMP="/opt/homebrew/opt/libpq/bin/pg_dump"

if [ ! -x "$PG_DUMP" ]; then
  echo "pg_dump não encontrado em $PG_DUMP. Instale com: brew install libpq" >&2
  exit 1
fi

if [ ! -f "$PROJETO/.env.backup" ]; then
  echo "Falta $PROJETO/.env.backup. Copie de .env.backup.example e preencha." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. "$PROJETO/.env.backup"
set +a

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL vazia em .env.backup." >&2
  exit 1
fi

mkdir -p "$DESTINO"

DATA="$(date +%Y-%m-%d)"
ARQUIVO="$DESTINO/guia-de-captacao-$DATA.sql.gz"
PARCIAL="$ARQUIVO.parcial"

# Escreve num arquivo temporário e só renomeia no fim: dump interrompido no
# meio não vira um backup corrompido com nome de backup bom.
if ! "$PG_DUMP" "$SUPABASE_DB_URL" --no-owner --no-privileges | gzip > "$PARCIAL"; then
  rm -f "$PARCIAL"
  echo "pg_dump falhou. Backup de $DATA não foi gerado." >&2
  exit 1
fi

# Dump vazio ou quase indica falha silenciosa; melhor barrar que sobrescrever.
TAMANHO=$(wc -c < "$PARCIAL" | tr -d ' ')
if [ "$TAMANHO" -lt 1024 ]; then
  rm -f "$PARCIAL"
  echo "Dump saiu com $TAMANHO bytes, pequeno demais pra ser válido." >&2
  exit 1
fi

mv "$PARCIAL" "$ARQUIVO"
echo "$(date '+%Y-%m-%d %H:%M:%S')  backup ok: $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"

# Rotação: apaga o que passou de MANTER_DIAS. Um arquivo por dia, sobrescrito
# se rodar duas vezes no mesmo dia — o que sobra são os últimos 7 dias, não uma
# cópia única que a corrupção de ontem já teria comido.
find "$DESTINO" -name 'guia-de-captacao-*.sql.gz' -type f -mtime "+$MANTER_DIAS" -delete

RESTANTES=$(find "$DESTINO" -name 'guia-de-captacao-*.sql.gz' -type f | wc -l | tr -d ' ')
echo "  backups guardados: $RESTANTES"
