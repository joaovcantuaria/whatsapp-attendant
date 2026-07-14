/**
 * Template Builder - Monta o payload completo para envio de templates via Meta API
 * Suporta todos os tipos de componentes: header, body, footer, buttons
 * Suporta todos os tipos de parâmetros: text, image, video, document, location, currency, date_time
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

export interface TemplateParams {
  bodyVars?: Record<string, string>       // {{1}}: "valor", {{2}}: "valor"
  headerImageUrl?: string                  // URL da imagem do header
  headerVideoUrl?: string                  // URL do vídeo do header
  headerDocumentUrl?: string               // URL do documento do header
  headerDocumentFilename?: string          // Nome do arquivo
  headerText?: string                      // Texto do header (se tiver variável)
  headerLocation?: {                       // Localização
    latitude: string
    longitude: string
    name?: string
    address?: string
  }
  buttonUrlSuffix?: Record<number, string> // index: "sufixo-url"
  buttonCouponCode?: Record<number, string> // index: "CODIGO"
  buttonFlowData?: Record<number, any>     // index: { flow_token, flow_action_data }
  currency?: Record<string, {              // variável: dados de moeda
    fallback_value: string
    code: string
    amount_1000: number
  }>
  dateTime?: Record<string, {              // variável: dados de data/hora
    fallback_value: string
  }>
}

export function buildTemplatePayload(template: TemplateData, params: TemplateParams = {}) {
  const payload: any = {
    name: template.name,
    language: { code: template.language },
  }

  const components: any[] = []

  // === HEADER ===
  const headerComponent = buildHeaderComponent(template, params)
  if (headerComponent) components.push(headerComponent)

  // === BODY ===
  const bodyComponent = buildBodyComponent(template, params)
  if (bodyComponent) components.push(bodyComponent)

  // === BUTTONS ===
  const buttonComponents = buildButtonComponents(template, params)
  components.push(...buttonComponents)

  if (components.length > 0) {
    payload.components = components
  }

  return payload
}

function buildHeaderComponent(template: TemplateData, params: TemplateParams): any | null {
  const headerType = template.header_type?.toLowerCase()

  if (!headerType) return null

  switch (headerType) {
    case 'image':
      const imageUrl = params.headerImageUrl || template.header_content
      if (!imageUrl) return null
      return {
        type: 'header',
        parameters: [{ type: 'image', image: { link: imageUrl } }],
      }

    case 'video':
      const videoUrl = params.headerVideoUrl || template.header_content
      if (!videoUrl) return null
      return {
        type: 'header',
        parameters: [{ type: 'video', video: { link: videoUrl } }],
      }

    case 'document':
      const docUrl = params.headerDocumentUrl || template.header_content
      if (!docUrl) return null
      return {
        type: 'header',
        parameters: [{
          type: 'document',
          document: {
            link: docUrl,
            filename: params.headerDocumentFilename || 'document.pdf',
          },
        }],
      }

    case 'location':
      if (!params.headerLocation) return null
      return {
        type: 'header',
        parameters: [{
          type: 'location',
          location: {
            latitude: params.headerLocation.latitude,
            longitude: params.headerLocation.longitude,
            name: params.headerLocation.name || '',
            address: params.headerLocation.address || '',
          },
        }],
      }

    case 'text':
      // Header de texto com variável {{1}}
      if (params.headerText) {
        return {
          type: 'header',
          parameters: [{ type: 'text', text: params.headerText }],
        }
      }
      return null

    default:
      return null
  }
}

function buildBodyComponent(template: TemplateData, params: TemplateParams): any | null {
  if (!params.bodyVars || Object.keys(params.bodyVars).length === 0) return null

  const parameters: any[] = []

  // Ordenar variáveis numericamente ({{1}}, {{2}}, {{3}}...)
  const sortedKeys = Object.keys(params.bodyVars).sort((a, b) => {
    const numA = parseInt(a.replace(/[{}]/g, ''))
    const numB = parseInt(b.replace(/[{}]/g, ''))
    return numA - numB
  })

  for (const key of sortedKeys) {
    const value = params.bodyVars[key]
    if (!value) continue

    // Verificar se é currency
    if (params.currency && params.currency[key]) {
      parameters.push({
        type: 'currency',
        currency: params.currency[key],
      })
    }
    // Verificar se é date_time
    else if (params.dateTime && params.dateTime[key]) {
      parameters.push({
        type: 'date_time',
        date_time: params.dateTime[key],
      })
    }
    // Texto padrão
    else {
      parameters.push({ type: 'text', text: value })
    }
  }

  if (parameters.length === 0) return null

  return { type: 'body', parameters }
}

function buildButtonComponents(template: TemplateData, params: TemplateParams): any[] {
  const components: any[] = []

  if (!template.buttons || !Array.isArray(template.buttons)) return components

  template.buttons.forEach((button: any, index: number) => {
    const buttonType = button.type?.toUpperCase()

    switch (buttonType) {
      case 'URL':
        // Botão URL dinâmica (tem {{1}} na URL)
        if (button.url?.includes('{{') && params.buttonUrlSuffix?.[index]) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: index.toString(),
            parameters: [{ type: 'text', text: params.buttonUrlSuffix[index] }],
          })
        }
        break

      case 'COPY_CODE':
        // Botão de copiar código (cupom)
        if (params.buttonCouponCode?.[index]) {
          components.push({
            type: 'button',
            sub_type: 'copy_code',
            index: index.toString(),
            parameters: [{ type: 'coupon_code', coupon_code: params.buttonCouponCode[index] }],
          })
        }
        break

      case 'FLOW':
        // Botão de Flow
        if (params.buttonFlowData?.[index]) {
          components.push({
            type: 'button',
            sub_type: 'flow',
            index: index.toString(),
            parameters: [{ type: 'action', action: params.buttonFlowData[index] }],
          })
        } else {
          // Flow sem dados customizados - enviar vazio
          components.push({
            type: 'button',
            sub_type: 'flow',
            index: index.toString(),
            parameters: [{ type: 'action', action: {} }],
          })
        }
        break

      // QUICK_REPLY e PHONE_NUMBER não precisam de parâmetros
      case 'QUICK_REPLY':
      case 'PHONE_NUMBER':
        break
    }
  })

  return components
}

/**
 * Extrai variáveis de um body de template
 */
export function extractBodyVariables(body: string): string[] {
  const matches = body.match(/\{\{\d+\}\}/g)
  if (!matches) return []
  return Array.from(new Set(matches)).sort((a, b) => {
    return parseInt(a.replace(/[{}]/g, '')) - parseInt(b.replace(/[{}]/g, ''))
  })
}

/**
 * Verifica se o template precisa de parâmetros obrigatórios
 */
export function getRequiredParams(template: TemplateData): {
  needsHeaderParam: boolean
  needsBodyParams: boolean
  needsButtonParams: boolean
  bodyVarCount: number
  headerType: string | null
  buttonTypes: string[]
} {
  const bodyVars = template.body ? extractBodyVariables(template.body) : []
  const headerType = template.header_type?.toLowerCase() || null
  const needsHeaderParam = ['image', 'video', 'document', 'location'].includes(headerType || '')
  const buttonTypes = (template.buttons || []).map((b: any) => b.type?.toUpperCase()).filter(Boolean)
  const needsButtonParams = buttonTypes.some((t: string) => ['URL', 'COPY_CODE', 'FLOW'].includes(t))

  return {
    needsHeaderParam,
    needsBodyParams: bodyVars.length > 0,
    needsButtonParams,
    bodyVarCount: bodyVars.length,
    headerType,
    buttonTypes,
  }
}
