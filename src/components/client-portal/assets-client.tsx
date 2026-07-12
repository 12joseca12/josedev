"use client";

import { useId, useState } from "react";

import { DashToastViewport, useDashToasts } from "@/components/staff-dash/dash-toast";
import { isAllowedMime, isWithinSize } from "@/lib/assets-config";
import type { ClientAssetDTO, ClientAssetSource, Locale } from "@/lib/types";
import { createAssetSignedUrl, deleteAsset, uploadAsset } from "@/services/assets-api";
import { t } from "@/services/literals";

import { useMyAssets } from "./use-my-assets";

type Props = { locale: Locale };

const SOURCE_LITERAL_KEY: Record<ClientAssetSource, string> = {
  client: "clientPortal.assetSourceClient",
  admin: "clientPortal.assetSourceAdmin",
};

/** Formato legible simple (B/KB/MB) — no hay helper compartido para esto en `src/lib`. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadFormProps = {
  locale: Locale;
  clientId: string;
  onUploaded: () => void;
  onError: (message: string) => void;
};

function UploadForm({ locale, clientId, onUploaded, onError }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileId = useId();
  const tituloId = useId();
  const descripcionId = useId();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || uploading) return;

    // Validación temprana (feedback inmediato) — el bucket + un CHECK en DB son el gate real.
    if (!isAllowedMime(file.type)) {
      onError(t(locale, "clientPortal.uploadErrorMime"));
      return;
    }
    if (!isWithinSize(file.size)) {
      onError(t(locale, "clientPortal.uploadErrorSize"));
      return;
    }

    setUploading(true);
    const result = await uploadAsset({
      clientId,
      source: "client",
      file,
      titulo: titulo.trim() || null,
      descripcion: descripcion.trim() || null,
    });
    setUploading(false);

    if (result.ok) {
      setFile(null);
      setTitulo("");
      setDescripcion("");
      onUploaded();
    } else {
      onError(t(locale, "clientPortal.actionError"));
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="mb-6 flex flex-col gap-3 rounded-xl border border-dash-border bg-dash-surface p-4"
    >
      <h2 className="font-dash-mono text-[11px] font-medium uppercase tracking-widest text-dash-muted">
        {t(locale, "clientPortal.uploadSectionTitle")}
      </h2>

      <div>
        <label htmlFor={fileId} className="mb-1 block text-[13px] text-dash-text">
          {t(locale, "clientPortal.assetFileLabel")}
        </label>
        <input
          id={fileId}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-[13px] text-dash-text file:mr-3 file:rounded-lg file:border file:border-dash-border file:bg-dash-bg file:px-3 file:py-1.5 file:text-[13px] file:text-dash-text"
        />
      </div>

      <div>
        <label htmlFor={tituloId} className="mb-1 block text-[13px] text-dash-text">
          {t(locale, "clientPortal.assetTituloLabel")}
        </label>
        <input
          id={tituloId}
          type="text"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          className="w-full rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        />
      </div>

      <div>
        <label htmlFor={descripcionId} className="mb-1 block text-[13px] text-dash-text">
          {t(locale, "clientPortal.assetDescripcionLabel")}
        </label>
        <textarea
          id={descripcionId}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-dash-border bg-dash-bg px-3 py-2 text-[13px] text-dash-text transition-colors focus:border-dash-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        />
      </div>

      <button
        type="submit"
        disabled={!file || uploading}
        className="min-h-11 self-start rounded-lg border border-dash-border px-4 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
      >
        {uploading ? t(locale, "clientPortal.uploading") : t(locale, "clientPortal.uploadSubmit")}
      </button>
    </form>
  );
}

type AssetRowProps = {
  asset: ClientAssetDTO;
  locale: Locale;
  isDeleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
};

function AssetRow({ asset, locale, isDeleting, onDownload, onDelete }: AssetRowProps) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-dash-border bg-dash-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-dash-text">{asset.titulo || asset.fileName}</p>
        {asset.titulo ? <p className="truncate text-[12px] text-dash-muted">{asset.fileName}</p> : null}
        {asset.descripcion ? (
          <p className="mt-1 text-[13px] leading-snug text-dash-muted">{asset.descripcion}</p>
        ) : null}
        <p className="mt-1 font-dash-data text-[11px] tabular-nums text-dash-muted">
          {formatFileSize(asset.sizeBytes)} · {t(locale, SOURCE_LITERAL_KEY[asset.source])}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="min-h-11 rounded-lg border border-dash-border px-3 text-[13px] font-medium text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "clientPortal.downloadLabel")}
        </button>
        {asset.source === "client" ? (
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            aria-label={`${t(locale, "clientPortal.deleteLabel")}: ${asset.fileName}`}
            className="min-h-11 rounded-lg border border-dash-border px-3 text-[13px] font-medium text-dash-error transition-colors hover:border-dash-error disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
          >
            {isDeleting ? t(locale, "clientPortal.deleting") : t(locale, "clientPortal.deleteLabel")}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function AssetsClient({ locale }: Props) {
  const { state, reload } = useMyAssets();
  const { toasts, pushToast, dismissToast } = useDashToasts();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDownload(asset: ClientAssetDTO) {
    const result = await createAssetSignedUrl(asset.storagePath);
    if (result.ok) {
      window.open(result.data, "_blank", "noopener,noreferrer");
    } else {
      pushToast("error", t(locale, "clientPortal.actionError"));
    }
  }

  async function onDelete(asset: ClientAssetDTO) {
    setDeletingId(asset.id);
    const result = await deleteAsset(asset);
    setDeletingId(null);
    if (result.ok) {
      pushToast("success", t(locale, "clientPortal.toastAssetDeleted"));
    } else {
      pushToast("error", t(locale, "clientPortal.actionError"));
    }
    // Se recarga siempre, incluso si falló, para que la lista quede reconciliada
    // con el estado real del bucket/DB.
    reload();
  }

  if (state.status === "loading") {
    return <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.loading")}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="border-l-4 border-dash-error bg-dash-surface px-4 py-3">
        <p className="text-[13px] text-dash-text">{t(locale, "clientPortal.loadError")}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-lg border border-dash-border px-3 py-1.5 text-[13px] text-dash-text transition-colors hover:border-dash-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dash-accent"
        >
          {t(locale, "clientPortal.retry")}
        </button>
      </div>
    );
  }

  if (state.status === "no-client") {
    return (
      <div className="rounded-xl border border-dash-border bg-dash-surface p-5">
        <p className="text-[13px] font-medium text-dash-text">{t(locale, "clientPortal.noProjectTitle")}</p>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.noProjectBody")}</p>
      </div>
    );
  }

  const { clientId, assets } = state;

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <h1 className="font-dash-mono text-xl font-bold text-dash-text">{t(locale, "clientPortal.assetsH1")}</h1>
        <p className="mt-1 text-[13px] text-dash-muted">{t(locale, "clientPortal.assetsSubtitle")}</p>
      </header>

      <UploadForm
        locale={locale}
        clientId={clientId}
        onUploaded={() => {
          pushToast("success", t(locale, "clientPortal.toastAssetUploaded"));
          reload();
        }}
        onError={(message) => pushToast("error", message)}
      />

      {/* `listAssets` ya ordena `created_at desc` server-side — no hace falta re-ordenar acá. */}
      {assets.length === 0 ? (
        <p className="text-[13px] text-dash-muted">{t(locale, "clientPortal.emptyAssets")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              locale={locale}
              isDeleting={deletingId === asset.id}
              onDownload={() => void onDownload(asset)}
              onDelete={() => void onDelete(asset)}
            />
          ))}
        </ul>
      )}

      <DashToastViewport toasts={toasts} closeLabel={t(locale, "clientPortal.closeDialog")} onDismiss={dismissToast} />
    </div>
  );
}
