"use client";

type EmbedProps = { instruction: string; title: string };

export function WokwiEmbed({
  instruction,
  title,
  src,
}: EmbedProps & { src: string }) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        {instruction}
      </div>
      <iframe
        title={title}
        src={src}
        className="h-140 w-full rounded-xl border border-border bg-card"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
      <p className="text-xs text-muted-foreground">
        Circuit simulation is provided by Wokwi in this embedded window.
      </p>
    </section>
  );
}

export function YouTubeEmbed({
  instruction,
  title,
  videoId,
}: EmbedProps & { videoId: string }) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        {instruction}
      </div>
      <div className="aspect-video overflow-hidden rounded-xl border border-border bg-card">
        <iframe
          title={title}
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This video is embedded from YouTube and is not stored by PawaTech.
      </p>
    </section>
  );
}
