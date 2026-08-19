# Restauro e backup

O que está protegido hoje, o que não está, e como voltar atrás sem quebrar
nada.

## O que já está protegido

| | Onde | Cobertura |
| --- | --- | --- |
| Código | Git + GitHub | Completa. Todo commit é um ponto de restauro. |
| Estrutura do banco | `supabase/schema.sql` e `supabase/migrations/` | Completa. As 24 tabelas se recriam do zero. |
| Dados | Só no Supabase | **Nenhuma.** Ver "O que não está protegido". |

Se o projeto do Supabase sumisse, dava pra criar um novo, rodar o
`schema.sql` e ter o sistema de pé — vazio, mas inteiro.

## O que não está protegido

**Os dados.** Tarefas, cards do backlog, orçamentos, galerias, usuários e
notificações existem só dentro do Supabase. O plano free não tem backup
automático nem endpoint de backup — point-in-time é feature do Pro.

**Os arquivos do Storage.** O bucket `guide-references` e as imagens de
galeria.

**As chaves do `.env.local`.** Ficam fora do git de propósito. Se a máquina
morrer, recupera no painel do Supabase, não no repositório.

## A regra que não pode ser esquecida

**Código e schema andam juntos.** Voltar o código sem voltar o banco quebra o
app quando existe migration destrutiva no meio do caminho.

Migration que só adiciona (`0029`, `0031`) é inofensiva: código antigo ignora
coluna nova. Migration que **derruba** coluna, não. A `0032` derruba
`daily_todos.assignee_id` — qualquer código anterior a ela que leia essa coluna
falha com `42703: undefined_column`.

Foi o que aconteceu em 19/08/2026: a `0032` rodou no banco antes de o código
correspondente entrar na `main`, e o Painel quebrou até o merge.

**Ao subir migration destrutiva: mergeia o código primeiro, roda a migration
depois.** Com um banco só, a janela entre as duas coisas é o tempo em que o app
fica fora do ar.

## Pontos de restauro

Cada tag registra em que nível de migration o código daquele ponto espera o
banco.

```
git tag -n1
```

| Tag | Estado | Migrations |
| --- | --- | --- |
| `estavel-2026-08-17` | Antes da lista de tarefas | até `0028` |
| `estavel-2026-08-18-tarefas` | Lista de tarefas, responsável único | até `0030` |
| `estavel-2026-08-19` | Vários responsáveis, próximas postagens | até `0032` |

### Criar uma tag nova

Depois de verificar que um estado está bom:

```bash
git tag -a estavel-AAAA-MM-DD -m "O que mudou. Schema esperado: migrations até NNNN." && git push origin --tags
```

### Voltar pra uma tag

```bash
git checkout -b volta-para-estavel estavel-2026-08-18-tarefas
```

Antes de usar, confira a coluna "Migrations" da tabela acima contra o que já
rodou no banco. Se o banco estiver **à frente** e houver migration destrutiva
no intervalo, o código vai quebrar — não é o restauro que falhou, é a
desincronia.

## Recriar o sistema do zero

1. Criar projeto novo no Supabase.
2. Rodar `supabase/schema.sql` inteiro no SQL Editor. Isso monta as 24 tabelas
   já no estado final — não precisa rodar as migrations uma a uma.
3. Criar o bucket público `guide-references` em Storage.
4. Preencher `.env.local` a partir de `.env.local.example` com as chaves do
   projeto novo.
5. Criar o primeiro usuário admin.

O sistema sobe funcional e vazio.

## Backup dos dados

Existe: `scripts/backup-db.sh` roda `pg_dump` e guarda em
`~/Backups/guia-de-captacao/`, um arquivo por dia, mantendo sete.

Agendamento diário pelo `launchd` — instalação em
[scripts/launchd/README.md](../scripts/launchd/README.md).

A connection string fica em `.env.backup`, fora do git. É credencial diferente
da service role key do `.env.local`: esta tem a senha do banco.

### O que ainda fica de fora

**Os arquivos do Storage.** O bucket `guide-references` e as imagens de galeria
não entram no `pg_dump`.

**A própria máquina.** O backup é local. Se o Mac se perder, os dumps vão
junto. Proteger contra isso exige o arquivo sair daqui.

**Mais de sete dias.** Corrupção que passe uma semana despercebida já terá
substituído todas as cópias.
