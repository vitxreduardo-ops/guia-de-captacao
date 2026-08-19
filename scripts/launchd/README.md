# Backup diário automático

Roda `scripts/backup-db.sh` todo dia ao meio-dia, com o Claude fechado e o
terminal fechado. Se a máquina estiver dormindo na hora, o `launchd` roda assim
que ela acordar em vez de pular o dia.

## Instalar

**1. Pegar as credenciais.**

No painel do Supabase: **Project Settings > Database**. É credencial diferente
da service role key do `.env.local` — esta é a senha do banco.

```bash
cp .env.backup.example .env.backup
```

Preencha os campos separados (`SUPABASE_DB_HOST`, `SUPABASE_DB_PASSWORD` e
companhia). A senha vai crua, sem codificar: numa URI, senha com `@` faz o
libpq ler o host errado.

**2. Testar na mão antes de agendar.**

```bash
./scripts/backup-db.sh
```

Deve imprimir o caminho e o tamanho. Se falhar, resolve aqui.

**3. Instalar.**

```bash
./scripts/instalar-backup.sh
```

O instalador copia o script pra `~/Library/Application Support/guia-captacao/`,
**move** a credencial pra `~/.config/guia-captacao/env` com permissão 600, e
carrega o agente.

Sair de `~/Documents` não é preferência: o TCC do macOS bloqueia agentes do
launchd dentro dessa pasta. Um agente apontando pra lá falha com `Operation not
permitted` e código 126, mesmo o script rodando normalmente quando você o chama
no terminal — o Terminal tem permissão, o launchd não.

Mover a credencial em vez de copiar também tira a senha de dentro do
repositório, que era o pior dos dois lugares pra ela morar.

**4. Confirmar.**

```bash
launchctl kickstart -p gui/$(id -u)/com.tatu.guia-captacao.backup
```

```bash
launchctl list | grep guia-captacao
```

Segunda coluna é o código de saída da última execução. `0` é sucesso.

## Verificar depois

```bash
ls -lh ~/Backups/guia-de-captacao/
```

Um arquivo por dia, no máximo sete. O log de cada execução fica em
`backup.log`, na mesma pasta.

## Forçar uma execução agora

```bash
launchctl start com.tatu.guia-captacao.backup
```

## Desativar

```bash
launchctl unload ~/Library/LaunchAgents/com.tatu.guia-captacao.backup.plist
```

## Restaurar a partir de um dump

O dump tem estrutura e dados. Restaurar num banco que já tem dados vai
conflitar — o destino normal é um projeto Supabase novo ou vazio.

```bash
gunzip -c ~/Backups/guia-de-captacao/guia-de-captacao-AAAA-MM-DD.sql.gz | /opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DB_URL"
```

## Limitações

**O agente aponta pra cópia instalada, não pro repositório.** Depois de mudar
`scripts/backup-db.sh`, rode `./scripts/instalar-backup.sh` de novo pra a cópia
acompanhar.

**Só cobre o banco.** Os arquivos do Storage (bucket `guide-references` e as
imagens de galeria) não entram no `pg_dump` — ficam sem backup.

**Sete dias.** Uma corrupção que passe mais de uma semana despercebida já terá
substituído todas as cópias. Pra guardar mais, mude `MANTER_DIAS` no script.

**A máquina precisa estar ligada em algum momento do dia.** Backup local não
protege contra a perda da própria máquina — pra isso o arquivo teria que sair
daqui.
