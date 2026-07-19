# Mercado Pago - Configuração de Variáveis de Ambiente

## Variáveis necessárias no Vercel

### NEXT_PUBLIC_MP_PUBLIC_KEY

- **Onde configurar:** Vercel → Settings → Environment Variables
- **Environments:** Production + Preview
- **Valor:** Public Key do aplicativo Mercado Pago (ex: `APP_USR-xxxxxxxx`)
- **Como obter:** Mercado Pago → Suas integrações → Credenciais de produção → Public Key
- **Sensitive:** Não (é exposta ao cliente)

### MP_ACCESS_TOKEN

- **Onde configurar:** Vercel → Settings → Environment Variables
- **Environments:** Production + Preview
- **Valor:** Access Token do aplicativo Mercado Pago (ex: `APP_USR-xxxxxxxx`)
- **Como obter:** Mercado Pago → Suas integrações → Credenciais de produção → Access Token
- **Sensitive:** ✅ Sim (marcar como Sensitive no Vercel)

### MP_WEBHOOK_SECRET

- **Onde configurar:** Vercel → Settings → Environment Variables
- **Environments:** Production + Preview
- **Valor:** Secret Key configurado no webhook do Mercado Pago
- **Como obter:** Gerado automaticamente ao configurar o webhook no painel do MP
- **Sensitive:** ✅ Sim (marcar como Sensitive no Vercel)

## Configuração de Webhook no Mercado Pago

1. Acesse: Mercado Pago → Suas integrações → Webhooks
2. Clique em "Configurar notificações"
3. Configure a URL do webhook:

```
https://chat.boragerir.com/api/webhooks/mercadopago
```

4. Selecione os eventos:
   - ✅ Pagamentos (`payment`)
   - ✅ Assinaturas (`subscription_preapproval`)

5. Salve a configuração
6. Copie o secret gerado e adicione como `MP_WEBHOOK_SECRET` no Vercel

## Checklist de Deploy

- [ ] `NEXT_PUBLIC_MP_PUBLIC_KEY` adicionada no Vercel (Production + Preview)
- [ ] `MP_ACCESS_TOKEN` adicionada no Vercel (Production + Preview, Sensitive)
- [ ] `MP_WEBHOOK_SECRET` adicionada no Vercel (Production + Preview, Sensitive)
- [ ] Webhook URL configurada no painel do Mercado Pago
- [ ] Testada a recepção de webhooks em ambiente de homologação
