import type { Env } from '../types/env.types';
import type {
  AdminChatMessageDTO,
  AdminChatMeetingMetadata,
  AdminChatThreadDTO,
} from '../types/admin-chat.types';
import {
  createSupabaseServiceClient,
  DEFAULT_ADMIN_SUPERUSER_EMAIL,
} from './supabase.service';

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_role: string;
  sender_id: string | null;
  content: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapMessage(row: MessageRow): AdminChatMessageDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role as AdminChatMessageDTO['senderRole'],
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as AdminChatMessageDTO['messageType'],
    metadata: (row.metadata ?? {}) as AdminChatMessageDTO['metadata'],
    createdAt: row.created_at,
  };
}

/** Variantes frecuentes del mismo correo (typo garcia/garica). */
function superuserEmailCandidates(primary: string): string[] {
  const base = primary.trim().toLowerCase();
  const variants = new Set<string>([base]);
  if (base.includes('garcia')) variants.add(base.replace('garcia', 'garica'));
  if (base.includes('garica')) variants.add(base.replace('garica', 'garcia'));
  return [...variants];
}

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
): Promise<string | null> {
  for (const candidate of superuserEmailCandidates(email)) {
    const id = await findAuthUserIdByEmailExact(supabase, candidate);
    if (id) return id;
  }
  return null;
}

async function findAuthUserIdByEmailExact(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .schema('auth')
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!error && data?.id) {
    return data.id as string;
  }

  let page = 1;
  const perPage = 200;
  while (page <= 25) {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) throw listError;
    const found = listData.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (listData.users.length < perPage) break;
    page += 1;
  }
  return null;
}

/** Resuelve el UUID del superusuario (chat admin) desde env, tabla `staff_members` (role=admin) o Auth. */
export async function resolveSuperuserId(env: Env): Promise<string> {
  const configuredId = env.ADMIN_SUPERUSER_ID?.trim();
  if (configuredId) return configuredId;

  const configuredEmail = (env.ADMIN_SUPERUSER_EMAIL ?? DEFAULT_ADMIN_SUPERUSER_EMAIL).trim().toLowerCase();
  const emailCandidates = superuserEmailCandidates(configuredEmail);
  const supabase = createSupabaseServiceClient(env);

  const { data: declaredRows, error: declaredError } = await supabase
    .from('staff_members')
    .select('user_id, email')
    .eq('role', 'admin');

  if (!declaredError && declaredRows?.length) {
    for (const row of declaredRows) {
      const rowEmail = row.email?.toLowerCase() ?? '';
      if (emailCandidates.includes(rowEmail)) {
        return row.user_id as string;
      }
    }
    if (declaredRows.length === 1) {
      return declaredRows[0].user_id as string;
    }
  }

  for (const email of emailCandidates) {
    const authUserId = await findAuthUserIdByEmailExact(supabase, email);
    if (authUserId) {
      await supabase.from('staff_members').upsert(
        { user_id: authUserId, email, role: 'admin', must_change_password: false },
        { onConflict: 'user_id' },
      );
      return authUserId;
    }
  }

  throw new Error(
    `Superuser not found for email: ${configuredEmail}. Use the Auth email (sanchezgaricajosecarlos12@gmail.com), set ADMIN_SUPERUSER_ID in wrangler.jsonc / .dev.vars, or add a row in staff_members with role='admin'.`,
  );
}

export async function ensureConversation(env: Env, userId: string): Promise<string> {
  const adminId = await resolveSuperuserId(env);
  const supabase = createSupabaseServiceClient(env);

  const { data: existing } = await supabase
    .from('admin_chat_conversations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from('admin_chat_conversations')
    .insert({ user_id: userId, admin_id: adminId })
    .select('id')
    .single();

  if (error || !created?.id) {
    throw error ?? new Error('Failed to create conversation');
  }
  return created.id as string;
}

export async function getRecentMessagesForPrompt(
  env: Env,
  conversationId: string,
  limit = 12,
): Promise<AdminChatMessageDTO[]> {
  const supabase = createSupabaseServiceClient(env);
  const { data, error } = await supabase
    .from('admin_chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MessageRow[]).map(mapMessage).reverse();
}

export async function getThread(env: Env, userId: string): Promise<AdminChatThreadDTO> {
  const conversationId = await ensureConversation(env, userId);
  const supabase = createSupabaseServiceClient(env);

  const { data, error } = await supabase
    .from('admin_chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;

  return {
    conversationId,
    messages: (data as MessageRow[]).map(mapMessage),
  };
}

export async function insertUserMessage(
  env: Env,
  input: { conversationId: string; userId: string; content: string },
): Promise<AdminChatMessageDTO> {
  const supabase = createSupabaseServiceClient(env);
  const { data, error } = await supabase
    .from('admin_chat_messages')
    .insert({
      conversation_id: input.conversationId,
      sender_role: 'user',
      sender_id: input.userId,
      content: input.content,
      message_type: 'text',
      metadata: {},
    })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Failed to insert message');
  return mapMessage(data as MessageRow);
}

export async function insertAssistantMessage(
  env: Env,
  input: {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'meeting_picker';
    metadata?: Record<string, unknown>;
  },
): Promise<AdminChatMessageDTO> {
  const supabase = createSupabaseServiceClient(env);
  const adminId = await resolveSuperuserId(env);
  const { data, error } = await supabase
    .from('admin_chat_messages')
    .insert({
      conversation_id: input.conversationId,
      sender_role: 'assistant',
      sender_id: adminId,
      content: input.content,
      message_type: input.messageType ?? 'text',
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Failed to insert assistant message');
  return mapMessage(data as MessageRow);
}

export async function scheduleMeetingOnMessage(
  env: Env,
  input: {
    conversationId: string;
    messageId: string;
    userId: string;
    date: string;
    time: string;
  },
): Promise<AdminChatMessageDTO | null> {
  const supabase = createSupabaseServiceClient(env);

  const { data: msg, error: fetchError } = await supabase
    .from('admin_chat_messages')
    .select('*')
    .eq('id', input.messageId)
    .eq('conversation_id', input.conversationId)
    .maybeSingle();

  if (fetchError || !msg) return null;

  const { data: conv } = await supabase
    .from('admin_chat_conversations')
    .select('user_id')
    .eq('id', input.conversationId)
    .maybeSingle();

  if (!conv || conv.user_id !== input.userId) return null;

  const metadata: AdminChatMeetingMetadata = {
    status: 'scheduled',
    selectedDate: input.date,
    selectedTime: input.time,
  };

  const { data: updated, error } = await supabase
    .from('admin_chat_messages')
    .update({ metadata })
    .eq('id', input.messageId)
    .select('*')
    .single();

  if (error || !updated) throw error ?? new Error('Failed to update meeting');
  return mapMessage(updated as MessageRow);
}
