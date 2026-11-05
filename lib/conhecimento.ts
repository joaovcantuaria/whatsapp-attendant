/**
 * Busca na base de conhecimento da IA (sem dependências: roda no servidor e nos testes).
 * Divide os documentos em trechos e pontua cada trecho pelas palavras da pergunta,
 * devolvendo os mais relevantes até um limite de caracteres para o prompt.
 */

export interface DocumentoConhecimento {
  title: string
  content: string
}

const STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'para', 'pra', 'por', 'com', 'sem', 'que', 'se', 'ao', 'aos', 'as', 'os', 'ou', 'mais', 'menos', 'muito',
  'como', 'qual', 'quais', 'quando', 'onde', 'tem', 'ter', 'voce', 'voces', 'vcs', 'vc', 'eu', 'me', 'meu',
  'minha', 'seu', 'sua', 'isso', 'esse', 'essa', 'este', 'esta', 'ola', 'oi', 'bom', 'dia', 'tarde', 'noite',
  'obrigado', 'obrigada', 'favor', 'gostaria', 'queria', 'quero', 'saber', 'pode', 'poderia', 'sim', 'nao',
])

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function palavrasChave(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !STOPWORDS.has(p))
}

// Trechos de até ~700 caracteres, quebrando em parágrafos/frases
// Radical simples para português: "agendamento" casa com "agendar"/"agendada", "horário" com "horários"
export function radicalDe(termo: string): string {
  if (termo.length > 6) return termo.slice(0, 5)
  if (termo.length > 4) return termo.slice(0, termo.length - 1)
  return termo
}

export function dividirEmTrechos(texto: string, tamanho = 700): string[] {
  const paragrafos = texto.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean)
  const trechos: string[] = []
  let atual = ''
  for (const p of paragrafos) {
    const partes = p.length > tamanho ? p.match(new RegExp(`[^.!?]{1,${tamanho}}[.!?]?`, 'g')) || [p] : [p]
    for (const parte of partes) {
      if ((atual + '\n' + parte).length > tamanho && atual) {
        trechos.push(atual.trim())
        atual = parte
      } else {
        atual = atual ? `${atual}\n${parte}` : parte
      }
    }
  }
  if (atual.trim()) trechos.push(atual.trim())
  return trechos
}

/** Trechos mais relevantes para a pergunta, cabendo em `limite` caracteres. */
export function selecionarTrechos(docs: DocumentoConhecimento[], pergunta: string, limite = 3500): string[] {
  const termos = palavrasChave(pergunta)
  if (termos.length === 0 || docs.length === 0) return []

  const candidatos: { texto: string; pontos: number }[] = []
  for (const doc of docs) {
    const tituloNorm = normalizar(doc.title)
    for (const trecho of dividirEmTrechos(doc.content)) {
      const norm = normalizar(trecho)
      let pontos = 0
      for (const termo of Array.from(new Set(termos))) {
        const radical = radicalDe(termo)
        const ocorrencias = norm.split(radical).length - 1
        if (ocorrencias > 0) pontos += 1 + Math.min(ocorrencias, 3) * 0.2
        if (tituloNorm.includes(radical)) pontos += 0.5
      }
      if (pontos > 0) candidatos.push({ texto: `[${doc.title}]\n${trecho}`, pontos })
    }
  }

  candidatos.sort((a, b) => b.pontos - a.pontos)
  const escolhidos: string[] = []
  let usados = 0
  for (const c of candidatos) {
    if (usados + c.texto.length > limite) continue
    escolhidos.push(c.texto)
    usados += c.texto.length
  }
  return escolhidos
}

export function blocoConhecimento(trechos: string[]): string {
  if (trechos.length === 0) return ''
  return [
    '',
    '## Base de conhecimento da empresa',
    'Use as informações abaixo para responder. Se a resposta não estiver aqui nem no seu contexto, diga que vai verificar com a equipe — não invente preços, horários ou políticas.',
    '',
    trechos.join('\n\n---\n\n'),
  ].join('\n')
}
