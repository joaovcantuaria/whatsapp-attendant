/**
 * Utilitário para montar os components de envio de template da Meta API.
 * Suporta todos os tipos: header (texto/imagem/vídeo/documento), body, buttons (url/quick_reply/flow)
 */

export interface TemplateData {
  name: string
  language: string
  header_type?: string | null
  header_content?: string | null
  body?: string
  footer?: string | null
  buttons?: any[] | null
}

export interface TemplateVars {
  [key: string]: string // ex: { '{{1}}': 'João', '{{2}}': 'Corte' }
}

/**
 * Extrai variáveis do body de um template.
 * Ex: "Olá {{1}}, seu serviço {{2}}" → ['{{1}}', '{{2}}']
 */
export function extractTemplateVariables(body: string): string[] {
  const matches = body?.match(/\{\{(\d+)\}\}/g) || []
  return Array.from(new Set(matches))
}

/**
 * Monta os components para envio via Meta API.
 * Cobre todos os cenários: header, body, buttons.
 */
export function buildTemplateComponents(
  template: TemplateData,
  variables: TemplateVars,
  headerMediaUrl?: string // URL da mídia do header (se dinâmico)
): any[] {
  const components: any[] = []

  // ═══════════════════════════════════════
  // 1. HEADER
  // ═══════════════════════════════════════
  if (template.header_type) {
    const headerType = template.header_type.toLowerCase()

    // Verifica se o header_content é uma URL válida (e não um header_handle da Meta)
    const isValidUrl = (url?: string | null): boolean => {
      if (!url) return false
      return url.startsWith('http://') || url.startsWith('https://')
    }

    switch (headerType) {
      case 'image':
        // Header com imagem - usar URL fornecida ou, como fallback, a URL salva (se válida)
        const imageUrl = headerMediaUrl || (isValidUrl(template.header_content) ? template.header_content : null)
        if (imageUrl) {
          components.push({
            type: 'header',
            parameters: [{ type: 'image', image: { link: imageUrl } }],
          })
        }
        break

      case 'video':
        const videoUrl = headerMediaUrl || (isValidUrl(template.header_content) ? template.header_content : null)
        if (videoUrl) {
          components.push({
            type: 'header',
            parameters: [{ type: 'video', video: { link: videoUrl } }],
          })
        }
        break

      case 'document':
        const docUrl = headerMediaUrl || (isValidUrl(template.header_content) ? template.header_content : null)
        if (docUrl) {
          components.push({
            type: 'header',
            parameters: [{ type: 'document', document: { link: docUrl, filename: 'document.pdf' } }],
          })
        }
        break

      case 'text':
        // Header de texto com variável (ex: "Pedido {{1}}")
        const headerVars = template.header_content?.match(/\{\{(\d+)\}\}/g)
        if (headerVars && headerVars.length > 0) {
          components.push({
            type: 'header',
            parameters: headerVars.map((v: string) => ({
              type: 'text',
              text: variables[v] || v,
            })),
          })
        }
        break
    }
  }

  // ═══════════════════════════════════════
  // 2. BODY
  // ═══════════════════════════════════════
  const bodyVars = extractTemplateVariables(template.body || '')
  if (bodyVars.length > 0) {
    const parameters = bodyVars.map((v) => ({
      type: 'text',
      text: variables[v] || '',
    }))

    // Só enviar se tem pelo menos um valor preenchido
    if (parameters.some(p => p.text)) {
      components.push({
        type: 'body',
        parameters,
      })
    }
  }

  // ═══════════════════════════════════════
  // 3. BUTTONS
  // ═══════════════════════════════════════
  if (template.buttons && Array.isArray(template.buttons)) {
    template.buttons.forEach((btn: any, index: number) => {
      const btnType = (btn.type || '').toUpperCase()

      switch (btnType) {
        case 'URL':
          // URL com variável dinâmica (ex: https://site.com/{{1}})
          if (btn.url?.includes('{{')) {
            const urlVar = btn.url.match(/\{\{(\d+)\}\}/)?.[0]
            components.push({
              type: 'button',
              sub_type: 'url',
              index: index.toString(),
              parameters: [{
                type: 'text',
                text: variables[`btn_${index}`] || variables[urlVar || ''] || '',
              }],
            })
          }
          // URL fixa não precisa de parâmetro
          break

        case 'QUICK_REPLY':
          // Quick reply não precisa de parâmetros no envio de template
          break

        case 'FLOW':
          // Flow button
          components.push({
            type: 'button',
            sub_type: 'flow',
            index: index.toString(),
            parameters: [{ type: 'action', action: {} }],
          })
          break

        case 'PHONE_NUMBER':
          // Telefone - não precisa de parâmetro
          break

        case 'COPY_CODE':
          // Copiar código
          if (btn.example) {
            components.push({
              type: 'button',
              sub_type: 'copy_code',
              index: index.toString(),
              parameters: [{ type: 'coupon_code', coupon_code: variables[`btn_${index}`] || btn.example }],
            })
          }
          break
      }
    })
  }

  return components
}

/**
 * Verifica se um template precisa de input do usuário (variáveis no body, header dinâmico, etc.)
 */
export function templateNeedsInput(template: TemplateData): boolean {
  // Body tem variáveis?
  const bodyVars = extractTemplateVariables(template.body || '')
  if (bodyVars.length > 0) return true

  // Header de texto com variável?
  if (template.header_type === 'text' && template.header_content?.includes('{{')) return true

  // Botão URL com variável?
  if (template.buttons?.some((btn: any) => btn.type === 'URL' && btn.url?.includes('{{'))) return true

  return false
}
