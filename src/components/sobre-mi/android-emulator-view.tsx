type Props = {
  title: string;
  viewerUrl: string;
};

export function AndroidEmulatorView({ title, viewerUrl }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        src={viewerUrl}
        title={title}
        className="h-full w-full border-0 bg-black"
        allow="fullscreen"
        loading="lazy"
        referrerPolicy="no-referrer"
        scrolling="no"
      />
    </div>
  );
}
