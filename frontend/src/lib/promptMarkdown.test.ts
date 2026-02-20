import { describe, expect, it } from 'vitest'
import { inferPromptCodeLanguage, isInlineCodeNode, isMermaidCodeFence } from './promptMarkdown'

describe('inferPromptCodeLanguage', () => {
  it('respects explicit language classes', () => {
    expect(inferPromptCodeLanguage('language-systemverilog', 'module demo; endmodule')).toBe('verilog')
    expect(inferPromptCodeLanguage('language-python', 'x = 1')).toBe('python')
  })

  it('infers verilog for text-fenced RTL snippets', () => {
    const content = 'module sync_muller_c_element;\n  logic a;\nendmodule'
    expect(inferPromptCodeLanguage('language-text', content)).toBe('verilog')
  })

  it('infers python for assignment-list text snippets', () => {
    const content = 'I = [Mapped 1, Interpolated 1, Mapped 2]'
    expect(inferPromptCodeLanguage('language-text', content)).toBe('python')
  })

  it('falls back to none when content does not look like code', () => {
    expect(inferPromptCodeLanguage('language-text', 'just prose line')).toBe('none')
  })
})

describe('isInlineCodeNode', () => {
  it('treats plain short code as inline and multiline as block', () => {
    expect(isInlineCodeNode(undefined, 'signal_name')).toBe(true)
    expect(isInlineCodeNode(undefined, 'line1\nline2')).toBe(false)
    expect(isInlineCodeNode('language-text', 'signal_name')).toBe(false)
  })
})

describe('isMermaidCodeFence', () => {
  it('detects explicit mermaid language fences', () => {
    expect(isMermaidCodeFence('language-mermaid', 'graph LR;\nA --> B')).toBe(true)
  })

  it('detects mermaid syntax in unlabeled or text fences', () => {
    expect(isMermaidCodeFence(undefined, 'graph LR;\nA --> B')).toBe(true)
    expect(isMermaidCodeFence('language-text', 'stateDiagram-v2\n[*] --> Idle')).toBe(true)
  })

  it('does not classify non-mermaid code as mermaid', () => {
    expect(isMermaidCodeFence('language-systemverilog', 'module demo; endmodule')).toBe(false)
    expect(isMermaidCodeFence('language-text', 'module demo; endmodule')).toBe(false)
  })
})
