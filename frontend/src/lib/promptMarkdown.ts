import Prism from 'prismjs'
import { mapPrismLanguage } from './explorer'

const LANGUAGE_CLASS_RE = /language-([A-Za-z0-9_+-]+)/i
const TEXT_LANGUAGE_ALIASES = new Set(['text', 'plain', 'plaintext', 'txt', 'none'])

function inferLanguageFromContent(content: string): string {
  const normalized = content.trim().toLowerCase()
  if (normalized === '') return 'none'

  if (/\bmodule\b[\s\S]*\bendmodule\b/.test(normalized) || /\balways_(ff|comb)\b/.test(normalized) || /\blogic\b/.test(normalized)) {
    return 'verilog'
  }

  if (/^\s*(def|class|import|from|for|while|if|elif|assert)\b/m.test(content)) {
    return 'python'
  }

  if (/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*\[[^\]]+\]/m.test(content)) {
    return 'python'
  }

  if (/^\s*[\w.-]+\s*:\s*.+$/m.test(content) && !/[{};]/.test(content)) {
    return 'yaml'
  }

  if (/^\s*(\$|#!\/bin\/|echo\b|export\b|set -)/m.test(content)) {
    return 'bash'
  }

  return 'none'
}

function normalizeLanguageToken(language: string): string {
  if (language === 'sv') return 'systemverilog'
  return language
}

export function escapeHtml(content: string): string {
  return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function inferPromptCodeLanguage(className: string | undefined, content: string): string {
  const languageToken = className?.match(LANGUAGE_CLASS_RE)?.[1]?.toLowerCase()
  const normalizedLanguage = languageToken ? normalizeLanguageToken(languageToken) : undefined

  if (normalizedLanguage && !TEXT_LANGUAGE_ALIASES.has(normalizedLanguage)) {
    return mapPrismLanguage(normalizedLanguage)
  }

  return inferLanguageFromContent(content)
}

export function highlightPromptCode(content: string, className?: string): { html: string; language: string } {
  const language = inferPromptCodeLanguage(className, content)
  const grammar = language !== 'none' ? Prism.languages[language] : undefined
  const html = grammar ? Prism.highlight(content, grammar, language) : escapeHtml(content)
  return { html, language }
}

export function isInlineCodeNode(className: string | undefined, content: string): boolean {
  return !className && !content.includes('\n')
}
