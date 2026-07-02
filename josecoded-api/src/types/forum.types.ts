export type ForumSegment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language?: string };

export type ForumThematicDTO = {
  id: string;
  slug: string;
  /** Semilla i18n (temáticas precargadas). */
  titleKey?: string;
  /** Título libre (temática creada por usuario). */
  titleDisplay?: string;
  descriptionKey?: string;
  descriptionDisplay?: string;
};

export type ForumEntrySummaryDTO = {
  id: string;
  thematicSlug: string;
  slug: string;
  /** Clave i18n (semilla). */
  titleKey?: string;
  /** Título libre creado por usuario (tiene prioridad en UI). */
  titleDisplay?: string;
  authorId: string;
  /** Clave i18n (semilla). */
  authorDisplayKey?: string;
  /** Nombre mostrado (contenido generado por usuarios). */
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
  role: 'author' | 'participant';
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
  /** True si el usuario autenticado (JWT opcional) es moderador del foro. */
  canModerate: boolean;
};
