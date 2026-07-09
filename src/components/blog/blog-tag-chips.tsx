type Props = {
  tags: string[];
};

export function BlogTagChips({ tags }: Props) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-dash-border bg-dash-bg px-2.5 py-1 font-dash-sans text-[9px] uppercase tracking-widest text-dash-muted"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
