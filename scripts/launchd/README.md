# Backup diário automático

Roda `scripts/backup-db.sh` todo dia ao meio-dia, com o Claude fechado e o
terminal fechado. Se a máquina estiver dormindo na hora, o `launchd` roda assim
que ela acordar em vez de pular o dia.

## Instalar

**1. Pegar a connection string.**

No painel do Supabase: **Project Settings > Database > Connection string >
URI**. É credencial diferente da service role key do `.env.local` — esta tem a
senha do banco.

```bash
cp .env.backup.example .env.backup
```

Abra `.env.backup` e cole a URI em `SUPABASE_DB_URL`. O arquivo é ignorado pelo
git.

**2. Testar na mão antes de agendar.**

```bash
./scripts/backup-db.sh
```

Deve imprimir o caminho do arquivo e o tamanho. Se falhar, resolve aqui — não
adianta agendar algo que não roda.

**3. Agendar.**

```bash
cp scripts/launchd/com.tatu.guia-captacao.backup.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/com.tatu.guia-captacao.backup.plist
```

**4. Conferir que entrou.**

```bash
launchctl list | grep guia-captacao
```

A primeira coluna é o PID (vazio quando não está rodando agora), a segunda é o
código de saída da última execução. Segunda coluna `0` é sucesso.

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

**O plist tem o caminho do projeto escrito dentro.** Se a pasta mudar de lugar,
edite o plist e recarregue.

**Só cobre o banco.** Os arquivos do Storage (bucket `guide-references` e as
imagens de galeria) não entram no `pg_dump` — ficam sem backup.

**Sete dias.** Uma corrupção que passe mais de uma semana despercebida já terá
substituído todas as cópias. Pra guardar mais, mude `MANTER_DIAS` no script.

**A máquina precisa estar ligada em algum momento do dia.** Backup local não
protege contra a perda da própria máquina — pra isso o arquivo teria que sair
daqui.
