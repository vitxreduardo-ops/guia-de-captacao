#!/bin/bash
#
# Instala o backup diário fora de ~/Documents.
#
# Motivo: o TCC do macOS bloqueia agentes do launchd dentro de Documents. Um
# agente apontando pra lá falha com "Operation not permitted" e código 126,
# mesmo o script rodando normalmente quando você o chama no terminal.
#
#   ./scripts/instalar-backup.sh

set -euo pipefail

PROJETO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO_SCRIPT="$HOME/Library/Application Support/guia-captacao"
DESTINO_CONFIG="$HOME/.config/guia-captacao"
AGENTE="$HOME/Library/LaunchAgents/com.tatu.guia-captacao.backup.plist"
ROTULO="com.tatu.guia-captacao.backup"

mkdir -p "$DESTINO_SCRIPT" "$DESTINO_CONFIG" "$HOME/Backups/guia-de-captacao"

# 1. Script
cp "$PROJETO/scripts/backup-db.sh" "$DESTINO_SCRIPT/backup-db.sh"
chmod +x "$DESTINO_SCRIPT/backup-db.sh"
echo "script   -> $DESTINO_SCRIPT/backup-db.sh"

# 2. Credencial. Move em vez de copiar: duas cópias da senha é uma a mais do
# que o necessário, e a que fica dentro do repositório é a pior das duas.
if [ -f "$PROJETO/.env.backup" ] && [ ! -f "$DESTINO_CONFIG/env" ]; then
  mv "$PROJETO/.env.backup" "$DESTINO_CONFIG/env"
  chmod 600 "$DESTINO_CONFIG/env"
  echo "credencial movida de .env.backup -> $DESTINO_CONFIG/env"
elif [ -f "$DESTINO_CONFIG/env" ]; then
  chmod 600 "$DESTINO_CONFIG/env"
  echo "credencial já em $DESTINO_CONFIG/env"
else
  echo "Falta credencial. Crie $DESTINO_CONFIG/env a partir de .env.backup.example" >&2
  exit 1
fi

# 3. Agente, gerado aqui pra o caminho ficar sempre coerente com o destino.
launchctl bootout "gui/$(id -u)/$ROTULO" 2>/dev/null || true

cat > "$AGENTE" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$ROTULO</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DESTINO_SCRIPT/backup-db.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>12</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$HOME/Backups/guia-de-captacao/backup.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Backups/guia-de-captacao/backup.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

plutil -lint "$AGENTE" > /dev/null
launchctl bootstrap "gui/$(id -u)" "$AGENTE"
echo "agente   -> $AGENTE"
echo
echo "Instalado. Testar agora:"
echo "  launchctl kickstart -p gui/\$(id -u)/$ROTULO"
echo "  tail -3 ~/Backups/guia-de-captacao/backup.log"
