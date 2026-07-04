import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
};

/**
 * Markdown del cuerpo del post. Sin HTML crudo; `remark-gfm` para tablas/listas GitHub.
 */
export function BlogMarkdown({ markdown }: Props) {
  return (
    <div className="blog-markdown max-w-none text-on-surface [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_code]:rounded-md [&_code]:bg-surface-container-high [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:font-headline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-on-surface [&_h3]:mt-6 [&_h3]:font-headline [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:leading-relaxed [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-outline-variant/30 [&_pre]:bg-surface-container-lowest [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-outline-variant/25 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-outline-variant/25 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
