#!/bin/bash
# Banco + API de TESTE na sua máquina (Postgres + PostgREST), sem Supabase.
# Uso: scripts/teste-local.sh   (sobe tudo; Ctrl+C derruba a API)
set -e
PG=/opt/homebrew/opt/postgresql@17/bin
D="$HOME/.guia-teste"; PGPORT=54329; API=54331
SECRET="guia-teste-segredo-local-com-mais-de-32-caracteres"
cd "$(dirname "$0")/.."
export LC_ALL=en_US.UTF-8
if [ ! -d "$D/pgdata" ]; then
  mkdir -p "$D"; $PG/initdb -D "$D/pgdata" -U postgres --auth=trust >/dev/null
  NOVO=1
fi
$PG/pg_ctl -D "$D/pgdata" -o "-p $PGPORT" -l "$D/pg.log" start >/dev/null 2>&1 || true
until $PG/pg_isready -p $PGPORT -q; do sleep 0.5; done
PSQL="$PG/psql -p $PGPORT -U postgres -q -v ON_ERROR_STOP=0"
if [ -n "$NOVO" ]; then
  $PSQL -d postgres -c "create database guia" >/dev/null
  $PSQL -d guia <<'SQL' >/dev/null
create role authenticator login noinherit;
create role anon nologin; create role service_role nologin bypassrls;
grant anon, service_role to authenticator;
SQL
  $PSQL -d guia -f supabase/schema.sql > "$D/schema.log" 2>&1
  for f in supabase/migrations/*.sql; do $PSQL -d guia -f "$f" >> "$D/schema.log" 2>&1; done
  $PSQL -d guia -c "grant usage on schema public to anon, service_role; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role; grant all on all functions in schema public to service_role; alter default privileges in schema public grant all on tables to service_role;" >/dev/null
fi
cat > "$D/postgrest.conf" <<C
db-uri = "postgres://authenticator@localhost:$PGPORT/guia"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = $API
C
KEY=$(node -e "const c=require('crypto'),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),h=b({alg:'HS256',typ:'JWT'})+'.'+b({role:'service_role',iss:'teste'});console.log(h+'.'+c.createHmac('sha256','$SECRET').update(h).digest('base64url'))")
cat > .env.teste <<C
ADMIN_PASSWORD=teste123
SUPABASE_URL=http://localhost:54330
SUPABASE_SERVICE_ROLE_KEY=$KEY
C
echo "Banco de teste pronto. Erros de schema (se houver): $D/schema.log"
node scripts/teste-proxy.mjs &
exec /opt/homebrew/bin/postgrest "$D/postgrest.conf"
