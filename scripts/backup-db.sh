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
DESTINO="$HOME/Backups/guia-de-captacao"
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

# Lê sem executar. Usar `.` aqui interpretaria o arquivo como shell, e senha
# com & ; $ ou espaço quebraria a linha — ou pior, rodaria como comando.
ler_config() {
  local chave="$1" valor
  valor="$(grep -m1 "^${chave}=" "$PROJETO/.env.backup" | cut -d= -f2-)"
  # Tira aspas se a pessoa envolveu o valor.
  valor="${valor%\"}"; valor="${valor#\"}"
  valor="${valor%\'}"; valor="${valor#\'}"
  printf '%s' "$valor"
}

BACKUP_DIR_CONFIG="$(ler_config BACKUP_DIR)"
[ -n "$BACKUP_DIR_CONFIG" ] && DESTINO="$BACKUP_DIR_CONFIG"

# Dois jeitos de configurar. Campos separados são o preferido: a senha vai por
# PGPASSWORD e não precisa de percent-encoding. Numa URI, senha com @ faz o
# libpq cortar no lugar errado e ler o host errado; com & , ; ou espaço, idem.
SENHA="$(ler_config SUPABASE_DB_PASSWORD)"
URL="$(ler_config SUPABASE_DB_URL)"

if [ -n "$SENHA" ]; then
  HOST="$(ler_config SUPABASE_DB_HOST)"
  PORTA="$(ler_config SUPABASE_DB_PORT)"
  USUARIO="$(ler_config SUPABASE_DB_USER)"
  BANCO="$(ler_config SUPABASE_DB_NAME)"

  if [ -z "$HOST" ]; then
    echo "SUPABASE_DB_PASSWORD definida, mas falta SUPABASE_DB_HOST." >&2
    exit 1
  fi

  export PGPASSWORD="$SENHA"
  CONEXAO=(-h "$HOST" -p "${PORTA:-5432}" -U "${USUARIO:-postgres}" -d "${BANCO:-postgres}")
elif [ -n "$URL" ]; then
  CONEXAO=("$URL")
else
  echo "Falta configuração em .env.backup: defina SUPABASE_DB_PASSWORD (com HOST) ou SUPABASE_DB_URL." >&2
  exit 1
fi

mkdir -p "$DESTINO"

DATA="$(date +%Y-%m-%d)"
ARQUIVO="$DESTINO/guia-de-captacao-$DATA.sql.gz"
PARCIAL="$ARQUIVO.parcial"

# Escreve num arquivo temporário e só renomeia no fim: dump interrompido no
# meio não vira um backup corrompido com nome de backup bom.
if ! "$PG_DUMP" "${CONEXAO[@]}" --no-owner --no-privileges | gzip > "$PARCIAL"; then
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
