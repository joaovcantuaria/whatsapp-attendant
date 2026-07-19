# Manual da VPS — BoraGerir WhatsApp Server

## Informações da VPS

| Item | Valor |
|------|-------|
| Provedor | Contabo |
| IP | 169.58.36.33 |
| Porta do servidor | 3001 |
| Sistema | Ubuntu Linux |
| Node.js | v22.23.1 |
| Processo | PM2 (boragerir-whatsapp) |
| Pasta do projeto | /opt/boragerir/whatsapp-server |
| API Key | boragerir-whatsapp-server-2026 |
| Company ID | 07887d89-9bf9-457a-b71b-07a6f116ea5f |
| Número conectado | 553899209694 |
| GitHub | github.com/joaovcantuaria/whatsapp-attendant |
| Frontend | chat.boragerir.com (Vercel) |
| Supabase | https://edrfxj1gpwdoxcybqnbt.supabase.co |

---

## Acesso à VPS

```bash
ssh root@169.58.36.33
```

---

## Comandos do Dia a Dia

### Ver status do servidor

```bash
pm2 list
```

### Ver logs (tempo real)

```bash
pm2 logs boragerir-whatsapp --lines 30
```
Pressione `Ctrl+C` para sair.

### Ver logs (snapshot, sem travar)

```bash
pm2 logs boragerir-whatsapp --lines 30 --nostream
```

### Ver apenas erros

```bash
pm2 logs boragerir-whatsapp --err --lines 30 --nostream
```

### Reiniciar o servidor

```bash
pm2 restart boragerir-whatsapp
```

### Parar o servidor

```bash
pm2 stop boragerir-whatsapp
```

### Iniciar o servidor (se deletado)

```bash
cd /opt/boragerir/whatsapp-server
pm2 start dist/index.js --name boragerir-whatsapp
pm2 save
```

---

## Deploy de Atualizações (após push no GitHub)

### Comando único (copiar e colar inteiro)

```bash
cd /opt/boragerir/whatsapp-server && git pull && npm run build && pm2 restart boragerir-whatsapp
```

### Passo a passo

```bash
cd /opt/boragerir/whatsapp-server
git pull
npm run build
pm2 restart boragerir-whatsapp
```

### Se adicionou dependências novas no package.json

```bash
cd /opt/boragerir/whatsapp-server
git pull
npm install
npm run build
pm2 restart boragerir-whatsapp
```

---

## Conexão WhatsApp

### Ver instâncias conectadas

```bash
curl -H "x-api-key: boragerir-whatsapp-server-2026" http://localhost:3001/api/instances
```

### Ver status de uma instância específica

```bash
curl -H "x-api-key: boragerir-whatsapp-server-2026" http://localhost:3001/api/instance/status/07887d89-9bf9-457a-b71b-07a6f116ea5f
```

### Health check do servidor

```bash
curl http://localhost:3001/health
```

### Forçar reconexão (via API)

```bash
curl -X POST http://localhost:3001/api/instance/restart \
  -H "x-api-key: boragerir-whatsapp-server-2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"07887d89-9bf9-457a-b71b-07a6f116ea5f"}'
```

### Desconectar instância (via API)

```bash
curl -X POST http://localhost:3001/api/instance/disconnect \
  -H "x-api-key: boragerir-whatsapp-server-2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"07887d89-9bf9-457a-b71b-07a6f116ea5f"}'
```

---

## Testar Envio de Mensagem

### Enviar texto

```bash
curl -X POST http://localhost:3001/api/message/send-text \
  -H "x-api-key: boragerir-whatsapp-server-2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"07887d89-9bf9-457a-b71b-07a6f116ea5f","phone":"5538XXXXXXXXX","message":"Teste da VPS"}'
```
> Substitua `5538XXXXXXXXX` pelo número de destino.

### Enviar imagem

```bash
curl -X POST http://localhost:3001/api/message/send-media \
  -H "x-api-key: boragerir-whatsapp-server-2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"07887d89-9bf9-457a-b71b-07a6f116ea5f","phone":"5538XXXXXXXXX","mediaUrl":"https://URL_DA_IMAGEM","caption":"Legenda","type":"image"}'
```

---

## Sessões do WhatsApp

### Ver sessões salvas

```bash
ls /opt/boragerir/whatsapp-server/sessions/
```

### Deletar todas as sessões (força novo QR Code)

```bash
pm2 stop boragerir-whatsapp
rm -rf /opt/boragerir/whatsapp-server/sessions/*
pm2 restart boragerir-whatsapp
```
> Depois vá no painel `/settings/qrcode` e conecte novamente.

### Deletar sessão específica

```bash
pm2 stop boragerir-whatsapp
rm -rf /opt/boragerir/whatsapp-server/sessions/07887d89-9bf9-457a-b71b-07a6f116ea5f
pm2 restart boragerir-whatsapp
```

---

## Monitoramento e Health Check

### Ver log do health check automático

```bash
cat /opt/boragerir/health-check.log
```

### Ver últimas linhas do health check

```bash
tail -20 /opt/boragerir/health-check.log
```

### Ver tarefas agendadas (cron)

```bash
crontab -l
```

### Editar tarefas agendadas

```bash
crontab -e
```

### Ver configuração do logrotate

```bash
pm2 conf pm2-logrotate
```

---

## Sistema Operacional

### Ver horário atual

```bash
date
```

### Ver timezone configurado

```bash
timedatectl
```

### Mudar timezone para Brasília

```bash
sudo timedatectl set-timezone America/Sao_Paulo
pm2 restart boragerir-whatsapp
```

### Ver versão do Node.js

```bash
node --version
```

### Ver espaço em disco

```bash
df -h
```

### Ver memória RAM

```bash
free -h
```

### Ver uso de CPU e processos

```bash
htop
```
Pressione `q` para sair.

### Reiniciar a VPS inteira

```bash
reboot
```
> O PM2 reinicia automaticamente após o boot (pm2 startup configurado).

---

## Rede e Diagnóstico

### Testar se internet funciona

```bash
ping -c 4 google.com
```

### Ver se a porta 3001 está aberta

```bash
netstat -tlnp | grep 3001
```

### Testar se o frontend está acessível

```bash
curl -I https://chat.boragerir.com
```

### Ver conexões ativas na porta 3001

```bash
ss -tlnp | grep 3001
```

### Ver IP público da VPS

```bash
curl ifconfig.me
```

---

## Resolução de Problemas

### Servidor não inicia (status "errored" ou "stopped")

```bash
pm2 logs boragerir-whatsapp --err --lines 30 --nostream
```
Olhe o erro e corrija. Erros comuns:
- "Cannot find module" → `npm run build` ou `npm install`
- "EADDRINUSE" → porta 3001 já em uso, mate o processo: `kill $(lsof -t -i:3001)`

### Mensagens não chegam no painel

1. Verificar se está conectado:
```bash
curl -H "x-api-key: boragerir-whatsapp-server-2026" http://localhost:3001/api/instances
```
2. Ver se há erros nos logs:
```bash
pm2 logs boragerir-whatsapp --lines 30 --nostream
```
3. Se "Bad MAC" aparece, limpar sessão e reconectar:
```bash
pm2 stop boragerir-whatsapp
rm -rf /opt/boragerir/whatsapp-server/sessions/*
pm2 restart boragerir-whatsapp
```
Depois conecte via QR Code no painel.

### Mensagens enviadas não chegam no celular

1. Testar envio direto:
```bash
curl -X POST http://localhost:3001/api/message/send-text \
  -H "x-api-key: boragerir-whatsapp-server-2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"07887d89-9bf9-457a-b71b-07a6f116ea5f","phone":"5538XXXXXXXXX","message":"Teste"}'
```
2. Se retorna `success: true` mas não chega → sessão corrompida, limpar e reconectar (veja acima).

### Servidor caiu e não volta

```bash
pm2 delete boragerir-whatsapp
cd /opt/boragerir/whatsapp-server
npm run build
pm2 start dist/index.js --name boragerir-whatsapp
pm2 save
```

### Disco cheio

```bash
df -h
pm2 flush
rm -f /root/.pm2/logs/*.log
```

### Atualizar Node.js (se necessário no futuro)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node --version
cd /opt/boragerir/whatsapp-server
rm -rf node_modules
npm install
npm run build
pm2 restart boragerir-whatsapp
```

---

## Proteções Automáticas Configuradas

| Proteção | Como funciona |
|----------|--------------|
| PM2 auto-restart | Se o processo crashar, reinicia sozinho |
| PM2 startup | Se a VPS reiniciar, sobe automaticamente |
| Health check (cron) | A cada 5 min verifica se responde, reinicia se não |
| pm2-logrotate | Logs rodam a cada 10MB, mantém 7 arquivos, comprime |
| Auto-reconnect | Ao iniciar, reconecta todas as sessões WhatsApp salvas |

---

## Comandos Git (na VPS)

### Ver status dos arquivos

```bash
cd /opt/boragerir/whatsapp-server
git status
```

### Forçar código do GitHub (descarta alterações locais)

```bash
cd /opt/boragerir/whatsapp-server
git checkout -- .
git pull
```

### Ver commits recentes

```bash
git log --oneline -10
```

---

## Notas Importantes

- **Nunca editar arquivos diretamente na VPS** — sempre editar no PC, push pro GitHub, e `git pull` na VPS.
- **Após qualquer mudança no código**: `npm run build && pm2 restart boragerir-whatsapp`
- **QR Code expira em 60 segundos** — se não escanear a tempo, gere outro no painel.
- **Máximo 10 tentativas de reconexão** — depois disso o status fica "disconnected" e precisa reconectar manualmente pelo painel.
- **Timezone**: A VPS deve estar em `America/Sao_Paulo` para os horários das mensagens ficarem corretos.
