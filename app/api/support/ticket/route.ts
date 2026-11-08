
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sender = "user" | "ai" | "admin";

type IncomingMessage = {
  id?: string | number;
  sender?: string;
  role?: string;
  text?: string;
  message?: string;
  content?: string;
  created_at?: string;
  createdAt?: string;
};

type StoredMessage = {
  id: string | number;
  sender: Sender;
  text: string;
  created_at: string;
};

type SupportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 100;

const ADMIN_EMAILS = (
  process.env.SUPPORT_ADMIN_EMAIL ||
  "juliocesarblancomedina08@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_USER_IDS = (
  process.env.SUPPORT_ADMIN_USER_IDS || ""
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const VALID_STATUSES: SupportStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
];

function json(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function fail(error: string, status: number) {
  return json({ success: false, error }, status);
}

function getToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function isAdmin(user: {
  id: string;
  email?: string | null;
}): boolean {
  return (
    ADMIN_USER_IDS.includes(user.id) ||
    ADMIN_EMAILS.includes(
      (user.email || "").trim().toLowerCase()
    )
  );
}

function getText(message: IncomingMessage): string {
  const value =
    typeof message.text === "string"
      ? message.text
      : typeof message.message === "string"
        ? message.message
        : typeof message.content === "string"
          ? message.content
          : "";

  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function getDate(message: IncomingMessage): string {
  const value = message.created_at || message.createdAt;

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function makeId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function normalizeSender(value: unknown): Sender | null {
  if (value === "user") return "user";
  if (value === "admin") return "admin";
  if (value === "ai" || value === "assistant" || value === "bot") {
    return "ai";
  }

  return null;
}

function normalizeStored(value: unknown): StoredMessage[] {
  if (!Array.isArray(value)) return [];

  const result: StoredMessage[] = [];

  for (const raw of value.slice(-MAX_MESSAGES)) {
    if (!raw || typeof raw !== "object") continue;

    const item = raw as Record<string, unknown>;
    const text = getText({
      text: typeof item.text === "string" ? item.text : undefined,
      message:
        typeof item.message === "string" ? item.message : undefined,
      content:
        typeof item.content === "string" ? item.content : undefined,
    });

    const sender = normalizeSender(item.sender ?? item.role);

    if (!text || !sender) continue;

    const createdAt = getDate({
      created_at:
        typeof item.created_at === "string"
          ? item.created_at
          : undefined,
      createdAt:
        typeof item.createdAt === "string"
          ? item.createdAt
          : undefined,
    });

    const id =
      typeof item.id === "string" ||
      (typeof item.id === "number" &&
        Number.isSafeInteger(item.id))
        ? item.id
        : makeId();

    result.push({
      id,
      sender,
      text,
      created_at: createdAt,
    });
  }

  return result;
}

function normalizeIncoming(
  input: IncomingMessage[],
  admin: boolean
): StoredMessage[] {
  const result: StoredMessage[] = [];

  for (const item of input.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== "object") continue;

    const text = getText(item);
    if (!text) continue;

    const rawSender = item.sender ?? item.role;
    let sender: Sender;

    // El cliente solo puede agregar sus propios mensajes.
    // Solo un administrador autorizado puede agregar respuestas de admin.
    if (rawSender === "user") {
      sender = "user";
    } else if (admin && rawSender === "admin") {
      sender = "admin";
    } else {
      continue;
    }

    result.push({
      id:
        typeof item.id === "string" ||
        (typeof item.id === "number" &&
          Number.isSafeInteger(item.id))
          ? item.id
          : makeId(),
      sender,
      text,
      created_at: getDate(item),
    });
  }

  return result;
}

function messageKey(message: StoredMessage): string {
  return `${message.sender}:${String(message.id)}`;
}

function mergeMessages(
  existing: StoredMessage[],
  incoming: StoredMessage[]
): StoredMessage[] {
  const merged = [...existing];
  const seen = new Set(existing.map(messageKey));

  for (const message of incoming) {
    const key = messageKey(message);

    if (seen.has(key)) continue;

    merged.push(message);
    seen.add(key);
  }

  return merged.slice(-MAX_MESSAGES);
}

function getUsername(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const metadata = user.user_metadata || {};

  if (typeof metadata.username === "string") {
    return metadata.username.trim().slice(0, 100) || null;
  }

  if (typeof metadata.full_name === "string") {
    return metadata.full_name.trim().slice(0, 100) || null;
  }

  return null;
}

function parseStatus(value: unknown): SupportStatus | null {
  if (typeof value !== "string") return null;

  const status = value.trim().toUpperCase();

  return VALID_STATUSES.includes(status as SupportStatus)
    ? (status as SupportStatus)
    : null;
}

async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[support/ticket] Telegram no está configurado."
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.slice(0, 3900),
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.error(
        "[support/ticket] Error de Telegram:",
        response.status
      );
    }
  } catch (error) {
    console.error(
      "[support/ticket] No se pudo enviar la notificación:",
      error
    );
  }
}

async function authenticate(request: Request) {
  const token = getToken(request);

  if (!token) {
    return {
      user: null,
      response: fail(
        "Debes iniciar sesión para utilizar el soporte.",
        401
      ),
    };
  }

  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      response: fail(
        "La sesión no es válida o ha expirado.",
        401
      ),
    };
  }

  return {
    user: data.user,
    response: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);

    if (!auth.user) {
      return auth.response!;
    }

    const user = auth.user;
    const admin = isAdmin({
      id: user.id,
      email: user.email,
    });

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return fail("El JSON enviado no es válido.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fail("La solicitud no es válida.", 400);
    }

    let ticketId: string | null = null;

    if (
      body.ticketId !== undefined &&
      body.ticketId !== null &&
      body.ticketId !== ""
    ) {
      const value = String(body.ticketId).trim();

      if (!/^[1-9]\d*$/.test(value) ||
          !Number.isSafeInteger(Number(value))) {
        return fail("El identificador del ticket no es válido.", 400);
      }

      ticketId = value;
    }

    const rawConversation = Array.isArray(body.conversation)
      ? (body.conversation as IncomingMessage[])
      : Array.isArray(body.messages)
        ? (body.messages as IncomingMessage[])
        : [];

    const singleMessage =
      typeof body.message === "string"
        ? body.message
        : typeof body.initialMessage === "string"
          ? body.initialMessage
          : typeof body.text === "string"
            ? body.text
            : "";

    const incoming = normalizeIncoming(
      rawConversation.length > 0
        ? rawConversation
        : singleMessage.trim()
          ? [{
              sender: admin ? "admin" : "user",
              text: singleMessage,
              id: makeId(),
              created_at: new Date().toISOString(),
            }]
          : [],
      admin
    );

    const requestedStatus =
      body.status === undefined ||
      body.status === null ||
      body.status === ""
        ? null
        : parseStatus(body.status);

    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !requestedStatus
    ) {
      return fail("El estado solicitado no es válido.", 400);
    }

    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, MAX_CATEGORY_LENGTH)
        : "Otro/pregunta";

    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
        : "Solicitud de soporte";

    const username = getUsername(user);
    const email = user.email || null;

    if (ticketId === null) {
      if (requestedStatus) {
        return fail(
          "No puedes establecer el estado de un ticket nuevo.",
          403
        );
      }

      const firstUserMessage = incoming.find(
        (message) => message.sender === "user"
      );

      if (!firstUserMessage) {
        return fail(
          "Escribe un mensaje antes de crear el ticket.",
          400
        );
      }

      const conversation = mergeMessages([], incoming);

      const { data: ticket, error } = await supabaseAdmin
        .from("support_tickets")
        .insert({
          user_id: user.id,
          username,
          email,
          category,
          subject,
          message: firstUserMessage.text,
          conversation,
          status: "PENDING",
        })
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .single();

      if (error || !ticket) {
        console.error(
          "[support/ticket] Error creando ticket:",
          error?.message
        );

        return fail(
          "No se pudo crear el ticket de soporte.",
          500
        );
      }

      await notifyTelegram([
        "🆘 NUEVO TICKET DE STORE GAMING",
        `🎫 Ticket: #${ticket.id}`,
        `📂 Categoría: ${category}`,
        `📝 Asunto: ${subject}`,
        `👤 Usuario: ${username || "No identificado"}`,
        `📧 Email: ${email || "No disponible"}`,
        "",
        "💬 Mensaje:",
        firstUserMessage.text,
      ].join("\n"));

      return json({
        success: true,
        ticketId: ticket.id,
        status: ticket.status,
        message: "Tu solicitud fue enviada correctamente.",
        ticket,
      });
    }

    const { data: existing, error: findError } =
      await supabaseAdmin
        .from("support_tickets")
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .eq("id", ticketId)
        .maybeSingle();

    if (findError) {
      console.error(
        "[support/ticket] Error consultando ticket:",
        findError.message
      );

      return fail("No se pudo consultar el ticket.", 500);
    }

    if (!existing) {
      return fail("El ticket no existe.", 404);
    }

    if (!admin && existing.user_id !== user.id) {
      return fail(
        "No tienes permiso para acceder a este ticket.",
        403
      );
    }

    const currentStatus =
      parseStatus(existing.status) || "PENDING";

    let nextStatus = currentStatus;

    if (admin && requestedStatus) {
      nextStatus = requestedStatus;
    } else if (!admin && requestedStatus) {
      if (
        requestedStatus === "PENDING" &&
        currentStatus === "COMPLETED"
      ) {
        nextStatus = "PENDING";
      } else {
        return fail(
          "Solo puedes reabrir un ticket completado. Los demás cambios corresponden al administrador.",
          403
        );
      }
    }

    const previous = normalizeStored(existing.conversation);
    const merged = mergeMessages(previous, incoming);

    const previousKeys = new Set(previous.map(messageKey));
    const newlyAdded = merged.filter(
      (message) => !previousKeys.has(messageKey(message))
    );

    const latestNewUser = [...newlyAdded]
      .reverse()
      .find((message) => message.sender === "user");

    const latestNewAdmin = [...newlyAdded]
      .reverse()
      .find((message) => message.sender === "admin");

    const statusChanged = nextStatus !== currentStatus;
    const notifyAdmin =
      !admin &&
      body.notifyAdmin === true &&
      Boolean(latestNewUser);

    if (
      newlyAdded.length === 0 &&
      !statusChanged &&
      !(admin && typeof body.category === "string") &&
      !(admin && typeof body.subject === "string")
    ) {
      return json({
        success: true,
        ticketId: existing.id,
        status: currentStatus,
        ticket: {
          ...existing,
          conversation: previous,
        },
      });
    }

    const updatePayload: Record<string, unknown> = {
      conversation: merged,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (admin && typeof body.category === "string") {
      updatePayload.category = category;
    }

    if (admin && typeof body.subject === "string") {
      updatePayload.subject = subject;
    }

    if (latestNewUser && !existing.message) {
      updatePayload.message = latestNewUser.text;
    }

    if (
      admin &&
      latestNewAdmin &&
      !requestedStatus &&
      nextStatus !== "COMPLETED"
    ) {
      updatePayload.status = "IN_PROGRESS";
    }

    // Actualizamos solo los mensajes nuevos, combinándolos con
    // la conversación leída para no aceptar el historial del cliente
    // como sustituto de los mensajes guardados.
    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("support_tickets")
        .update(updatePayload)
        .eq("id", ticketId)
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .single();

    if (updateError || !updated) {
      console.error(
        "[support/ticket] Error actualizando ticket:",
        updateError?.message
      );

      return fail(
        "No se pudo actualizar el ticket de soporte.",
        500
      );
    }

    if (latestNewAdmin) {
      await notifyTelegram([
        "💬 RESPUESTA DEL ADMINISTRADOR",
        `🎫 Ticket: #${updated.id}`,
        `📌 Estado: ${updated.status}`,
        "",
        latestNewAdmin.text,
      ].join("\n"));
    }

    if (notifyAdmin && latestNewUser) {
      await notifyTelegram([
        "🆘 EL CLIENTE SOLICITA ATENCIÓN DEL ADMINISTRADOR",
        `🎫 Ticket: #${updated.id}`,
        `👤 Usuario: ${username || "No identificado"}`,
        `📧 Email: ${email || "No disponible"}`,
        "",
        latestNewUser.text,
      ].join("\n"));
    }

    return json({
      success: true,
      ticketId: updated.id,
      status: updated.status,
      updated_at: updated.updated_at,
      ticket: {
        ...updated,
        conversation: normalizeStored(updated.conversation),
      },
    });
  } catch (error) {
    console.error(
      "[support/ticket] Error inesperado:",
      error
    );

    return fail(
      "Ocurrió un error al procesar el ticket de soporte.",
      500
    );
  }
}
