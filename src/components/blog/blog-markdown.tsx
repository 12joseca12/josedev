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
    <div className="blog-markdown max-w-none font-body text-base leading-relaxed text-dash-text [&_a]:text-dash-accent-text [&_a]:underline-offset-2 hover:[&_a]:underline [&_code]:rounded-sm [&_code]:bg-dash-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-dash-mono [&_code]:text-[0.9em] [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:font-headline [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-dash-text [&_h3]:mt-6 [&_h3]:font-headline [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-dash-text [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:leading-relaxed [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-dash-border [&_pre]:bg-dash-bg [&_pre]:p-4 [&_pre]:font-dash-mono [&_pre]:text-sm [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-dash-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-dash-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
