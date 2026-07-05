/**
 * Central shared types for the whole repository.
 *
 * Rules:
 * - Export ONLY types (no runtime exports).
 * - Consumers must use `import type { ... } from "@/lib/types"`.
 */

// -----------------------------------------------------------------------------
// Core utilities
// -----------------------------------------------------------------------------

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

export type Id<TName extends string = string> = string & { readonly __brand: TName };

export type ISODateString = string & { readonly __brand: "ISODateString" };

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export type DeepPartial<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepPartial<U>[]
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

// -----------------------------------------------------------------------------
// API / Services
// -----------------------------------------------------------------------------

export type ApiErrorCode =
  | "unknown"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server_error";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: JsonValue;
};

export type Result<T, E = ApiError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

// -----------------------------------------------------------------------------
// UI
// -----------------------------------------------------------------------------

export type LoadingState = "idle" | "loading" | "success" | "error";

// -----------------------------------------------------------------------------
// App-level placeholders (extend as the domain grows)
// -----------------------------------------------------------------------------

export type Locale = "es" | "en";

// -----------------------------------------------------------------------------
// Forum (DTO alineados con GET/POST de josecoded-api /api/v1/forum)
// -----------------------------------------------------------------------------

export type ForumSegment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string };

export type ForumThematicDTO = {
  id: string;
  slug: string;
  titleKey?: string;
  titleDisplay?: string;
  descriptionKey?: string;
  descriptionDisplay?: string;
};

export type ForumEntrySummaryDTO = {
  id: string;
  thematicSlug: string;
  slug: string;
  titleKey?: string;
  titleDisplay?: string;
  authorId: string;
  /** Clave i18n (semillas / demo). */
  authorDisplayKey?: string;
  /** Nombre mostrado (usuario o BD). */
  authorDisplay?: string;
  commentCount: number;
  likeCount: number;
  usefulCount: number;
  createdAt: string;
  parentEntryId: string | null;
  branchFromCommentId: string | null;
};

export type ForumCommentDTO = {
  id: string;
  entryId: string;
  authorId: string;
  authorDisplayKey?: string;
  authorDisplay?: string;
  parentCommentId: string | null;
  segments: ForumSegment[];
  isEntrySeed: boolean;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  usefulCount: number;
  likedByMe: boolean;
  usefulByMe: boolean;
};

export type ForumParticipantDTO = {
  userId: string;
  displayKey?: string;
  displayName?: string;
  role: "author" | "participant";
};

export type ForumBranchLinkDTO = {
  entryId: string;
  slug: string;
  thematicSlug: string;
  fromCommentId: string;
  labelKey: string;
};

export type ForumEntryDetailDTO = {
  entry: ForumEntrySummaryDTO & { bodyPreviewKey?: string };
  comments: ForumCommentDTO[];
  usefulHighlights: ForumCommentDTO[];
  branches: ForumBranchLinkDTO[];
  participants: ForumParticipantDTO[];
  canModerate: boolean;
};

// -----------------------------------------------------------------------------
// Blog (Supabase `blog_posts`, RLS: público solo `published`)
// -----------------------------------------------------------------------------

export type BlogPostStatus = "draft" | "published";

/** Listado / tarjetas (sin cuerpo Markdown). */
export type BlogPostListItemDTO = {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  tags: string[];
};

/** Detalle para la página de artículo. */
export type BlogPostDetailDTO = BlogPostListItemDTO & {
  bodyMd: string;
  status: BlogPostStatus;
  updatedAt: string;
};

// -----------------------------------------------------------------------------
// Admin chat (terminal ↔ superusuario vía n8n)
// -----------------------------------------------------------------------------

export type AdminChatSenderRole = "user" | "assistant" | "system";

export type AdminChatMessageType = "text" | "meeting_picker";

export type AdminChatMeetingMetadata = {
  status: "pending" | "scheduled";
  selectedDate?: string;
  selectedTime?: string;
};

export type AdminChatMessageDTO = {
  id: string;
  conversationId: string;
  senderRole: AdminChatSenderRole;
  senderId: string | null;
  content: string;
  messageType: AdminChatMessageType;
  metadata: AdminChatMeetingMetadata | Record<string, unknown>;
  createdAt: string;
};

export type AdminChatThreadDTO = {
  conversationId: string;
  messages: AdminChatMessageDTO[];
};

// -----------------------------------------------------------------------------
// Leads / CRM (Supabase `leads`, `staff_members` — Capa 2, RLS por rol)
// -----------------------------------------------------------------------------

export type StaffRole = "admin" | "closer";

export type StaffMemberDTO = {
  userId: string;
  email: string;
  role: StaffRole;
  comision: number | null;
  totalGanado: number;
};

export type LeadEstado = "nuevo" | "contactado" | "negociando" | "cerrado" | "perdido";

export type LeadDTO = {
  id: string;
  conversationId: string | null;
  assignedStaffId: string | null;
  estado: LeadEstado;
  fuente: string | null;
  monto: number | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
};

// -----------------------------------------------------------------------------
// Sobre mí — stack portfolio
// -----------------------------------------------------------------------------

export type SobreMiCategoryKey = "mobile" | "web" | "backend" | "quality";

export type SobreMiTechKey =
  | "reactNative"
  | "expo"
  | "androidStudio"
  | "xcode"
  | "deepLinking"
  | "pushNotifications"
  | "appDeployment"
  | "react"
  | "nextjs"
  | "vercel"
  | "typescript"
  | "tailwind"
  | "html5"
  | "css3"
  | "accessibility"
  | "nodejs"
  | "nestjs"
  | "apis"
  | "supabase"
  | "firebase"
  | "postgresql"
  | "mongodb"
  | "redis"
  | "jest"
  | "redux"
  | "git"
  | "github"
  | "agile"
  | "jira"
  | "itil";

export type SobreMiCategoryConfig = {
  primary: SobreMiTechKey;
  items: readonly SobreMiTechKey[];
  primaryBadges: readonly SobreMiTechKey[];
};

// -----------------------------------------------------------------------------
// Android emulator (Live Demo)
// -----------------------------------------------------------------------------

export type EmulatorSessionDTO = {
  status: string;
  containerName: string;
  packageName: string;
  packageInstalled: boolean;
  viewerUrl: string;
  screenViewerUrl: string | null;
};

export type EmulatorRuntimeStatus = "starting" | "ready" | "stopped" | "unavailable" | "failed";

export type EmulatorStatusDTO = {
  status: EmulatorRuntimeStatus;
  containerName: string;
  packageName: string;
  packageInstalled: boolean;
  bootCompleted: boolean;
  containerRunning: boolean;
  viewerUrl: string | null;
  screenViewerUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type EmulatorDemoView = "preview" | "preparing" | "emulator";
