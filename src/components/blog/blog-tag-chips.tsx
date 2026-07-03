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
          className="rounded-full border border-outline-variant/30 bg-surface-container-lowest/60 px-2.5 py-1 font-label text-[9px] uppercase tracking-widest text-tertiary"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
