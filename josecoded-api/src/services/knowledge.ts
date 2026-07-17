import knowledgeData from '../knowledge/knowledge.json';

const KNOWLEDGE = knowledgeData as Record<string, string>;
const DEFAULT_FILES = [
  'terminal-chat.md',
  'about.md',
  'services.md',
  'faq.md',
  'tone.md',
];
const DEFAULT_MAX = 14_000;

export function getKnowledgeContext(
  files: string[] = DEFAULT_FILES,
  maxLen: number = DEFAULT_MAX
): string {
  return files
    .map((name) => {
      const text = (KNOWLEDGE[name] ?? '').trim();
      return text ? `--- ${name} ---\n${text}` : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, maxLen);
}
