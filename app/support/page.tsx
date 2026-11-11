
"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type View = "closed" | "form" | "chat" | "tickets";
type ChatSender = "ai" | "user" | "admin";

type ChatMessage = {
  id?: string | number;
  sender: ChatSender;
  message: string;
  created_at?: string;
};

type SupportTicket = {
  id: number;
  user_id: string | null;
  username: string | null;
  email: string | null;
  category: string | null;
  subject: string;
  message: string;
  conversation: ChatMessage[];
  status: string;
  created_at: string;
  updated_at: string;
};

const SUPPORT_CATEGORIES = [
  "Depósito/pago no acreditado",
  "Pedido atascado / tarda demasiado",
  "Artículo/código no recibido o incompleto",
  "El código/llave/tarjeta no funciona o está en uso",
  "Suscripción y planes",
  "API e integración",
  "Disponibilidad/solicitud del producto",
  "Otro/pregunta",
];

const SUPPORT_CSS = `
.support-page{position:relative;min-height:100dvh;overflow-x:hidden;background:#050505;color:#fff;font-family:Arial,Helvetica,sans-serif;isolation:isolate}
.support-page,.support-page *{box-sizing:border-box}
.support-page-background{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(229,9,20,.18),transparent 50%),radial-gradient(ellipse at 0% 70%,rgba(120,0,8,.12),transparent 40%),#050505}
.support-content{width:min(100% - 28px,760px);min-height:100dvh;margin:0 auto;padding:22px 0 35px}
.support-header{display:flex;align-items:center;gap:14px;margin-bottom:24px;flex:0 0 auto}
.support-back-button{display:flex;flex:0 0 42px;width:42px;height:42px;align-items:center;justify-content:center;border:1px solid #303030;border-radius:13px;background:#141414;color:#fff;font-size:25px;cursor:pointer}
.support-back-button:hover{border-color:#e50914}
.support-header-title{display:flex;min-width:0;align-items:center;gap:10px}
.support-header-title>span{font-size:25px}
.support-header-title h1{margin:0;color:#fff;font-size:clamp(20px,4vw,27px);font-weight:900}
.support-main-card{padding:28px 22px;border:1px solid rgba(255,255,255,.09);border-radius:22px;background:linear-gradient(145deg,#151515,#0b0b0b 70%);box-shadow:0 18px 45px rgba(0,0,0,.3);text-align:center}
.support-main-icon{display:flex;width:76px;height:76px;align-items:center;justify-content:center;margin:0 auto 18px;border:1px solid rgba(255,255,255,.14);border-radius:23px;background:linear-gradient(145deg,#e50914,#750008);font-size:34px}
.support-main-card h2{margin:0 0 12px;color:#fff;font-size:clamp(20px,4vw,25px);font-weight:900}
.support-main-card p{max-width:480px;margin:0 auto 22px;color:#a5a5a5;font-size:14px;line-height:1.7}
.support-main-button,.support-secondary-button,.support-submit-button{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:8px;padding:12px 17px;border:1px solid rgba(255,255,255,.12);border-radius:13px;color:#fff;font-size:12px;font-weight:900;cursor:pointer;transition:filter .2s,transform .2s}
.support-main-button,.support-submit-button{background:linear-gradient(135deg,#f01825,#970009)}
.support-secondary-button{margin-top:10px;background:#191919}
.support-main-button:hover,.support-secondary-button:hover,.support-submit-button:hover{filter:brightness(1.12)}
.support-form{display:flex;flex-direction:column;gap:19px;margin-top:20px;padding:24px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:#0d0d0d}
.support-field{display:flex;flex-direction:column;gap:9px}
.support-field label{color:#e6e6e6;font-size:11px;font-weight:900;letter-spacing:1px}
.support-field input,.support-field select,.support-field textarea{width:100%;padding:14px;border:1px solid #303030;border-radius:12px;outline:none;background:#151515;color:#fff;font:inherit;font-size:14px}
.support-field select{color-scheme:dark}
.support-field textarea{min-height:130px;resize:vertical;line-height:1.6}
.support-field input::placeholder,.support-field textarea::placeholder{color:#666}
.support-field input:focus,.support-field select:focus,.support-field textarea:focus{border-color:#e50914;box-shadow:0 0 0 3px rgba(229,9,20,.12)}
.support-form .support-submit-button{width:100%;min-height:52px}
.support-error{margin:14px 0;padding:13px 15px;border:1px solid rgba(229,9,20,.35);border-radius:12px;background:rgba(229,9,20,.09);color:#ff8b91;font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.support-tickets-list{display:flex;flex-direction:column;gap:13px}
.support-item{display:flex;width:100%;align-items:center;gap:14px;padding:17px;border:1px solid #282828;border-radius:16px;background:linear-gradient(135deg,#151515,#0c0c0c);color:#fff;text-align:left;cursor:pointer}
.support-item:hover{border-color:rgba(229,9,20,.7)}
.support-item-icon{display:flex;flex:0 0 44px;width:44px;height:44px;align-items:center;justify-content:center;border-radius:13px;background:rgba(229,9,20,.14);font-size:22px}
.support-item-content{flex:1;min-width:0}
.support-item-content strong{display:block;margin-bottom:7px;font-size:14px;overflow-wrap:anywhere}
.support-item-content p{margin:0 0 8px;color:#999;font-size:12px;line-height:1.5}
.support-item-content span{display:inline-block;padding:5px 8px;border:1px solid rgba(229,9,20,.25);border-radius:7px;background:rgba(229,9,20,.09);color:#ff777e;font-size:10px;font-weight:800}
.support-item>b{color:#e50914;font-size:23px}
.support-user-info{display:flex;align-items:center;gap:13px;margin-top:20px;padding:16px;border:1px solid #262626;border-radius:15px;background:#101010}
.support-user-info>span{display:flex;width:42px;height:42px;flex:0 0 42px;align-items:center;justify-content:center;border-radius:50%;background:#222;font-size:21px}
.support-user-info strong{color:#fff;font-size:13px}
.support-user-info p{margin:5px 0 0;color:#888;font-size:12px;overflow-wrap:anywhere}
.game-service-footer{display:flex;flex-direction:column;align-items:center;gap:7px;margin-top:30px;padding:20px 0;border-top:1px solid #202020;text-align:center}
.game-service-footer strong{color:#fff;font-size:15px;font-weight:950}
.game-service-footer span{color:#777;font-size:10px;letter-spacing:2px}
.support-floating-button{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:10;display:flex;width:56px;height:56px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:linear-gradient(135deg,#f01825,#8c0008);color:#fff;font-size:24px;box-shadow:0 8px 28px rgba(229,9,20,.3);cursor:pointer}
.support-chat-container{width:100%;max-width:620px;min-height:0;height:100%;margin:12px auto 0;display:flex;flex:1 1 0;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(7,7,7,.96);box-shadow:0 18px 45px rgba(0,0,0,.55)}
.support-chat-messages{display:flex;flex:1 1 0;min-height:0;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;padding:14px 11px;scrollbar-width:thin;scrollbar-color:#373737 #0b0b0b;-webkit-overflow-scrolling:touch}
.support-chat-input-row{display:flex;width:100%;align-items:center;gap:8px;margin:0}
.support-chat-input-row input:focus{border-color:#e50914!important;box-shadow:0 0 0 3px rgba(229,9,20,.1)}
.support-send-button{cursor:pointer}
.support-admin-button:disabled,.support-send-button:disabled,.support-submit-button:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:600px){.support-content{width:calc(100% - 22px);padding-top:14px;padding-bottom:24px}.support-header{gap:10px;margin-bottom:17px}.support-main-card{padding:24px 16px;border-radius:18px}.support-form{padding:17px;gap:16px}.support-item{gap:10px;padding:13px}.support-floating-button{width:50px;height:50px;right:14px;bottom:14px}}
`;

function SupportStyles() {
  return <style jsx global>{SUPPORT_CSS}</style>;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "El servidor tardó demasiado en responder. Comprueba tu conexión e inténtalo de nuevo."
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readJsonSafely(response: Response): Promise<any> {
  const text = await response.text();

  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? "El servidor devolvió una respuesta no válida."
        : `El servidor respondió con un error HTTP ${response.status}.`
    );
  }
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .filter(
      (item: unknown) => item !== null && typeof item === "object"
    )
    .map((item: any): ChatMessage | null => {
      const rawText =
        typeof item.message === "string"
          ? item.message
          : typeof item.text === "string"
            ? item.text
            : typeof item.content === "string"
              ? item.content
              : "";

      if (!rawText.trim()) return null;

      let sender: ChatSender = "user";

      if (item.sender === "admin" || item.role === "admin") {
        sender = "admin";
      } else if (
        item.sender === "ai" ||
        item.sender === "assistant" ||
        item.role === "assistant"
      ) {
        sender = "ai";
      } else if (item.sender === "user" || item.role === "user") {
        sender = "user";
      }

      const rawId = item.id;
      const id =
        typeof rawId === "string" || typeof rawId === "number"
          ? rawId
          : createMessageId();

      const createdAt =
        typeof item.created_at === "string"
          ? item.created_at
          : typeof item.createdAt === "string"
            ? item.createdAt
            : undefined;

      if (seen.has(String(id))) return null;
      seen.add(String(id));

      return {
        id,
        sender,
        message: rawText,
        created_at: createdAt,
      };
    })
    .filter((item): item is ChatMessage => item !== null);
}

function mergeConversations(
  ...conversations: ChatMessage[][]
): ChatMessage[] {
  const merged: ChatMessage[] = [];
  const ids = new Set<string>();

  for (const conversation of conversations) {
    for (const message of conversation) {
      const id =
        message.id !== undefined && message.id !== null
          ? String(message.id)
          : "";

      if (id && ids.has(id)) continue;

      const duplicate = merged.some((existing) => {
        if (
          existing.sender !== message.sender ||
          existing.message !== message.message
        ) {
          return false;
        }

        if (existing.created_at && message.created_at) {
          return existing.created_at === message.created_at;
        }

        return false;
      });

      if (duplicate) continue;

      merged.push(message);
      if (id) ids.add(id);
    }
  }

  return merged
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const aTime = a.message.created_at
        ? new Date(a.message.created_at).getTime()
        : Number.NaN;
      const bTime = b.message.created_at
        ? new Date(b.message.created_at).getTime()
        : Number.NaN;

      if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
        return aTime - bTime || a.index - b.index;
      }

      if (Number.isFinite(aTime)) return -1;
      if (Number.isFinite(bTime)) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.message);
}

function getTicketStatus(result: any, fallback = "PENDING"): string {
  const status = result?.ticket?.status ?? result?.status;

  return typeof status === "string" && status
    ? status
    : fallback;
}

function isTicketClosed(status: string): boolean {
  return [
    "COMPLETED",
    "COMPLETE",
    "CLOSED",
    "RESOLVED",
    "CERRADO",
    "COMPLETADO",
    "RESUELTO",
  ].includes(status.trim().toUpperCase());
}

export default function SupportPage() {
  const router = useRouter();

  const [view, setView] = useState<View>("closed");
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState("PENDING");
  const [adminRequested, setAdminRequested] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const sendLockRef = useRef(false);
  const activeTicketRef = useRef<number | null>(null);

  useEffect(() => {
    activeTicketRef.current = ticketId;
  }, [ticketId]);

  const loadTickets = useCallback(async (userId?: string) => {
    try {
      setTicketLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const finalUserId = userId || session.user.id;

      const response = await fetchWithTimeout(
        `/api/support/tickets?user_id=${encodeURIComponent(finalUserId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
        15000
      );

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar las consultas."
        );
      }

      const loadedTickets: SupportTicket[] = Array.isArray(result.tickets)
        ? result.tickets.map((ticket: any) => ({
            ...ticket,
            id: Number(ticket.id),
            conversation: normalizeConversation(ticket.conversation),
            status: ticket.status || "PENDING",
          }))
        : [];

      setTickets(loadedTickets);

      setSelectedTicket((current) => {
        if (!current) return null;

        return (
          loadedTickets.find(
            (ticket) => ticket.id === current.id
          ) || current
        );
      });
    } catch (err) {
      console.error("ERROR CARGANDO TICKETS:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las consultas."
      );
    } finally {
      setTicketLoading(false);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      const user = session.user;
      const metadata = user.user_metadata || {};

      setCurrentEmail(user.email || "");
      setCurrentUsername(
        metadata.username ||
          metadata.user_name ||
          metadata.name ||
          user.email?.split("@")[0] ||
          ""
      );

      await loadTickets(user.id);
    } catch (err) {
      console.error("ERROR CARGANDO USUARIO:", err);
      setError("No se pudo cargar tu información de usuario.");
    }
  }, [loadTickets, router]);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (view !== "chat") return;

    const frame = window.requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [conversation, view, loading]);

  /*
   * La sincronización solo incorpora mensajes nuevos del servidor.
   * Se pausa mientras se envía un mensaje para evitar carreras.
   */
  useEffect(() => {
    if (
      view !== "chat" ||
      ticketId === null ||
      loading ||
      ticketLoading
    ) {
      return;
    }

    let active = true;
    let requestInProgress = false;

    const refreshConversation = async () => {
      if (!active || requestInProgress || sendLockRef.current) return;

      requestInProgress = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active || !session?.access_token) return;

        const response = await fetchWithTimeout(
          `/api/support/tickets?user_id=${encodeURIComponent(session.user.id)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          },
          12000
        );

        if (!response.ok) return;

        const result = await readJsonSafely(response);

        if (!active || !Array.isArray(result.tickets)) return;

        const rawTicket = result.tickets.find(
          (item: any) => Number(item.id) === Number(ticketId)
        );

        if (!rawTicket) return;

        const freshConversation = normalizeConversation(
          rawTicket.conversation
        );

        const freshTicket: SupportTicket = {
          ...rawTicket,
          id: Number(rawTicket.id),
          conversation: freshConversation,
          status: rawTicket.status || "PENDING",
        };

        setTicketStatus(freshTicket.status);

        setSelectedTicket((current) =>
          current && current.id === ticketId
            ? { ...current, ...freshTicket }
            : current
        );

        setTickets((current) =>
          current.map((item) =>
            item.id === ticketId
              ? { ...item, ...freshTicket }
              : item
          )
        );

        setConversation((current) => {
          /*
           * El servidor es la fuente de verdad. Solo mantenemos mensajes
           * locales que aún no estén reflejados en la respuesta reciente.
           */
          const combined = mergeConversations(
            freshConversation,
            current.filter((item) => {
              if (item.id === undefined) return false;

              return !freshConversation.some(
                (fresh) =>
                  fresh.id !== undefined &&
                  String(fresh.id) === String(item.id)
              );
            })
          );

          return JSON.stringify(current) === JSON.stringify(combined)
            ? current
            : combined;
        });
      } catch (err) {
        if (active) {
          console.error("ERROR ACTUALIZANDO CONVERSACIÓN:", err);
        }
      } finally {
        requestInProgress = false;
      }
    };

    void refreshConversation();

    const intervalId = window.setInterval(() => {
      void refreshConversation();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [view, ticketId, loading, ticketLoading]);

  function openNewTicket() {
    setError("");
    setCategory(SUPPORT_CATEGORIES[0]);
    setSubject("");
    setMessage("");
    setChatInput("");
    setConversation([]);
    setTicketId(null);
    setSelectedTicket(null);
    setTicketStatus("PENDING");
    setAdminRequested(false);
    setView("form");
  }

  async function sendToSupportAI(
    messagesOverride?: ChatMessage[],
    ticketIdOverride?: number | null
  ) {
    if (sendLockRef.current) return null;

    sendLockRef.current = true;

    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const messagesToSend = normalizeConversation(
        messagesOverride ?? conversation
      );

      const targetTicketId = ticketIdOverride ?? ticketId;

      if (targetTicketId === null) {
        throw new Error("No se encontró el identificador de la consulta.");
      }

      const response = await fetchWithTimeout(
        "/api/support/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messagesToSend,
            ticketId: targetTicketId,
            category,
            subject,
          }),
        },
        45000
      );

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo obtener una respuesta del soporte."
        );
      }

      const answer = String(
        result.message || result.response || result.answer || ""
      ).trim();

      if (!answer) {
        throw new Error("El soporte no devolvió una respuesta.");
      }

      if (result.saved === false) {
        throw new Error(
          result.error ||
            "La respuesta no se pudo guardar. Actualiza la consulta."
        );
      }

      const responseMessage: ChatMessage = {
        id: result.messageId || createMessageId(),
        sender: result.sender === "admin" ? "admin" : "ai",
        message: answer,
        created_at: result.created_at || new Date().toISOString(),
      };

      const serverConversation = normalizeConversation(
        result.conversation
      );

      const finalConversation =
        serverConversation.length > 0
          ? mergeConversations(serverConversation, [responseMessage])
          : mergeConversations(messagesToSend, [responseMessage]);

      if (activeTicketRef.current === targetTicketId) {
        setConversation(finalConversation);
      }

      const lower = answer.toLowerCase();

      if (
        result.requiresAdmin === true ||
        result.escalate === true ||
        result.needsAdmin === true ||
        lower.includes("llamar al administrador") ||
        lower.includes("contactar al administrador") ||
        lower.includes("solicitar al administrador")
      ) {
        setAdminRequested(true);
      }

      return finalConversation;
    } catch (err) {
      console.error("ERROR CHAT SOPORTE:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo obtener la respuesta."
      );

      return null;
    } finally {
      sendLockRef.current = false;
      setLoading(false);
    }
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ticketLoading || loading) return;

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject) {
      setError("Escribe el asunto de la consulta.");
      return;
    }

    if (!cleanMessage) {
      setError("Escribe el mensaje.");
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !session.access_token) {
        throw new Error(
          "Tu sesión ha expirado. Vuelve a iniciar sesión."
        );
      }

      const firstMessage: ChatMessage = {
        id: createMessageId(),
        sender: "user",
        message: cleanMessage,
        created_at: new Date().toISOString(),
      };

      const response = await fetchWithTimeout(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject: cleanSubject,
            message: cleanMessage,
            category,
            conversation: [firstMessage],
          }),
        },
        20000
      );

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo crear la consulta."
        );
      }

      const createdTicket = result.ticket || result.data || null;
      const rawId =
        createdTicket?.id ?? result.ticketId ?? result.id;

      const createdId =
        rawId !== undefined &&
        rawId !== null &&
        Number.isSafeInteger(Number(rawId)) &&
        Number(rawId) > 0
          ? Number(rawId)
          : null;

      if (createdId === null) {
        throw new Error(
          "La consulta se creó, pero el servidor no devolvió un identificador válido. Actualiza tus consultas antes de volver a intentarlo."
        );
      }

      setTicketId(createdId);
      activeTicketRef.current = createdId;
      setTicketStatus(
        createdTicket?.status || result.status || "PENDING"
      );
      setConversation([firstMessage]);
      setChatInput("");
      setMessage("");
      setAdminRequested(false);
      setSelectedTicket(null);
      setSubject(cleanSubject);
      setView("chat");

      /*
       * La API del chat guarda el mensaje inicial y la respuesta.
       * No guardamos de nuevo el mismo mensaje desde la página.
       */
      await sendToSupportAI([firstMessage], createdId);
      await loadTickets(session.user.id);
    } catch (err) {
      console.error("ERROR CREANDO TICKET:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la consulta."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  async function handleSendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      sendLockRef.current ||
      loading ||
      ticketLoading ||
      isTicketClosed(ticketStatus)
    ) {
      return;
    }

    const cleanMessage = chatInput.trim();

    if (!cleanMessage) return;

    if (ticketId === null) {
      setError("No se encontró el identificador de esta consulta.");
      return;
    }

    const targetTicketId = ticketId;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      sender: "user",
      message: cleanMessage,
      created_at: new Date().toISOString(),
    };

    const nextConversation = mergeConversations(
      normalizeConversation(conversation),
      [userMessage]
    );

    setChatInput("");
    setError("");
    setConversation(nextConversation);

    /*
     * Una única petición gestiona el mensaje y la respuesta.
     * No llamar a persistConversation aquí evita el doble guardado.
     */
    await sendToSupportAI(nextConversation, targetTicketId);
  }

  async function requestAdmin() {
    if (
      ticketLoading ||
      loading ||
      ticketId === null
    ) {
      return;
    }

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Tu sesión ha expirado.");
      }

      const adminMessage: ChatMessage = {
        id: createMessageId(),
        sender: "user",
        message:
          "👨‍💻 Solicito llamar al administrador para continuar con mi consulta.",
        created_at: new Date().toISOString(),
      };

      const nextConversation = mergeConversations(
        normalizeConversation(conversation),
        [adminMessage]
      );

      const response = await fetchWithTimeout(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ticketId,
            message: adminMessage.message,
            conversation: nextConversation,
            category,
            subject,
            notifyAdmin: true,
          }),
        },
        20000
      );

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo llamar al administrador."
        );
      }

      setConversation(nextConversation);
      setAdminRequested(false);
      setTicketStatus(getTicketStatus(result, "PENDING"));

      await loadTickets(session.user.id);
    } catch (err) {
      console.error("ERROR SOLICITANDO ADMIN:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo contactar al administrador."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  function openTicket(ticket: SupportTicket) {
    const normalizedConversation = normalizeConversation(
      ticket.conversation
    );

    const finalConversation =
      normalizedConversation.length > 0
        ? normalizedConversation
        : ticket.message
          ? [
              {
                id: `legacy-${ticket.id}`,
                sender: "user" as const,
                message: ticket.message,
                created_at: ticket.created_at,
              },
            ]
          : [];

    const normalizedTicket = {
      ...ticket,
      id: Number(ticket.id),
      conversation: finalConversation,
    };

    setSelectedTicket(normalizedTicket);
    setTicketId(normalizedTicket.id);
    activeTicketRef.current = normalizedTicket.id;
    setCategory(ticket.category || "Otro/pregunta");
    setSubject(ticket.subject || "");
    setTicketStatus(ticket.status || "PENDING");
    setConversation(finalConversation);
    setChatInput("");
    setAdminRequested(false);
    setError("");
    setView("chat");
  }

  async function reopenTicket() {
    if (ticketId === null || ticketLoading) return;

    try {
      setTicketLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Tu sesión ha expirado.");
      }

      const response = await fetchWithTimeout(
        "/api/support/ticket",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ticketId,
            status: "PENDING",
            category,
            subject,
            conversation: normalizeConversation(conversation),
          }),
        },
        20000
      );

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo reabrir la consulta."
        );
      }

      setTicketStatus(getTicketStatus(result, "PENDING"));
      await loadTickets(session.user.id);
    } catch (err) {
      console.error("ERROR REABRIENDO TICKET:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo reabrir la consulta."
      );
    } finally {
      setTicketLoading(false);
    }
  }

  const isClosed = isTicketClosed(ticketStatus);

  return (
    <main
      className="support-page"
      style={
        view === "chat"
          ? {
              height: "100dvh",
              minHeight: "100dvh",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <SupportStyles />
      <div className="support-page-background" />

      <div
        className="support-content"
        style={
          view === "chat"
            ? {
                height: "100dvh",
                minHeight: "100dvh",
                paddingBottom: 16,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }
            : undefined
        }
      >
        <header className="support-header">
          <button
            type="button"
            className="support-back-button"
            onClick={() => {
              if (view === "chat") {
                setView(selectedTicket ? "tickets" : "closed");
              } else if (view === "form" || view === "tickets") {
                setView("closed");
              } else {
                router.push("/home");
              }
            }}
            aria-label="Volver"
          >
            ←
          </button>

          <div className="support-header-title">
            <span>
              {view === "tickets"
                ? "📋"
                : view === "chat"
                  ? "💬"
                  : "📩"}
            </span>
            <h1>
              {view === "form"
                ? "Crear nueva consulta"
                : view === "tickets"
                  ? "Mis consultas"
                  : "Soporte"}
            </h1>
          </div>
        </header>

        {view === "form" && (
          <>
            <section className="support-main-card">
              <div className="support-main-icon">📩</div>
              <h2>¿En qué podemos ayudarte?</h2>
              <p>
                Selecciona una categoría y explica tu problema. Primero te
                atenderá nuestro asistente.
              </p>
            </section>

            <form className="support-form" onSubmit={createTicket}>
              <div className="support-field">
                <label htmlFor="support-category">CATEGORÍA</label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={ticketLoading}
                >
                  {SUPPORT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="support-field">
                <label htmlFor="support-subject">ASUNTO</label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Ejemplo: No me llegó mi recarga"
                  maxLength={120}
                  autoComplete="off"
                  disabled={ticketLoading}
                  required
                />
              </div>

              <div className="support-field">
                <label htmlFor="support-message">MENSAJE</label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Explica detalladamente tu problema..."
                  rows={6}
                  maxLength={3000}
                  disabled={ticketLoading}
                  required
                />
              </div>

              {error && <div className="support-error">{error}</div>}

              <button
                type="submit"
                className="support-submit-button"
                disabled={
                  ticketLoading ||
                  !subject.trim() ||
                  !message.trim()
                }
              >
                {ticketLoading
                  ? "CREANDO CONSULTA..."
                  : "CREAR CONSULTA →"}
              </button>
            </form>
          </>
        )}

        {view === "chat" && (
          <section className="support-chat-container">
            <div
              style={{
                flex: "0 0 auto",
                minHeight: 58,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderBottom: "1px solid rgba(255,255,255,.08)",
                background: "#0b0b0b",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  flex: "0 0 38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#e50914,#760007)",
                  fontSize: 18,
                }}
              >
                🤖
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: "block", fontSize: 12 }}>
                  STORE GAMING
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    color: "#777",
                    fontSize: 10,
                  }}
                >
                  {isClosed
                    ? "Consulta cerrada"
                    : "Asistente de soporte"}
                </span>
              </div>

              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isClosed ? "#777" : "#20c55a",
                }}
              />
            </div>

            <div className="support-chat-messages">
              {conversation.length === 0 && (
                <div
                  style={{
                    margin: "auto",
                    maxWidth: 280,
                    padding: 20,
                    textAlign: "center",
                    color: "#777",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  💬
                  <br />
                  Escribe tu mensaje para comenzar la conversación.
                </div>
              )}

              {conversation.map((item, index) => {
                const isUser = item.sender === "user";
                const isAdmin = item.sender === "admin";

                return (
                  <div
                    key={item.id ?? `${index}-${item.created_at || ""}`}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: isUser
                        ? "flex-end"
                        : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: "fit-content",
                        maxWidth: "84%",
                        minWidth: 70,
                        padding: "9px 11px",
                        borderRadius: isUser
                          ? "15px 15px 4px 15px"
                          : "15px 15px 15px 4px",
                        background: isUser
                          ? "linear-gradient(135deg,#e50914,#a50008)"
                          : isAdmin
                            ? "linear-gradient(135deg,#242424,#151515)"
                            : "#151515",
                        border: "1px solid rgba(255,255,255,.08)",
                        color: "#fff",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          marginBottom: 4,
                          color: isUser
                            ? "#ffd6d8"
                            : isAdmin
                              ? "#ff6d74"
                              : "#888",
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {isUser
                          ? "Tú"
                          : isAdmin
                            ? "Administrador"
                            : "Soporte IA"}
                      </span>

                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          fontSize: 12,
                          lineHeight: 1.55,
                        }}
                      >
                        {item.message}
                      </div>

                      {item.created_at && (
                        <span
                          style={{
                            display: "block",
                            marginTop: 5,
                            textAlign: "right",
                            color: "rgba(255,255,255,.55)",
                            fontSize: 9,
                          }}
                        >
                          {new Date(item.created_at).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "10px 13px",
                    borderRadius: "15px 15px 15px 4px",
                    background: "#151515",
                    color: "#aaa",
                    fontSize: 11,
                  }}
                  role="status"
                  aria-live="polite"
                >
                  Escribiendo •••
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {adminRequested && !isClosed && (
              <div style={{ padding: "9px 10px 0", background: "#090909" }}>
                <button
                  type="button"
                  className="support-submit-button support-admin-button"
                  onClick={requestAdmin}
                  disabled={
                    ticketLoading || loading || ticketId === null
                  }
                  style={{ width: "100%" }}
                >
                  {ticketLoading
                    ? "CONTACTANDO..."
                    : "👨‍💻 LLAMAR AL ADMINISTRADOR"}
                </button>
              </div>
            )}

            {error && (
              <div
                className="support-error"
                style={{ margin: "8px 10px 0" }}
              >
                {error}
              </div>
            )}

            {!isClosed ? (
              <div
                style={{
                  flex: "0 0 auto",
                  padding: "9px 10px max(9px, env(safe-area-inset-bottom))",
                  borderTop: "1px solid rgba(255,255,255,.08)",
                  background: "#090909",
                }}
              >
                <form
                  className="support-chat-input-row"
                  onSubmit={handleSendChat}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) =>
                      setChatInput(event.target.value)
                    }
                    placeholder="Escribe tu mensaje..."
                    disabled={loading || ticketLoading}
                    autoComplete="off"
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      width: "100%",
                      height: 45,
                      padding: "0 13px",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 22,
                      outline: "none",
                      background: "#151515",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 12,
                    }}
                  />

                  <button
                    type="submit"
                    className="support-send-button"
                    disabled={
                      loading ||
                      ticketLoading ||
                      !chatInput.trim()
                    }
                    aria-label="Enviar mensaje"
                    style={{
                      width: 45,
                      height: 45,
                      flex: "0 0 45px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: 0,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#e50914,#a00008)",
                      color: "#fff",
                      fontSize: 19,
                      opacity:
                        loading || ticketLoading || !chatInput.trim()
                          ? 0.45
                          : 1,
                    }}
                  >
                    ➤
                  </button>
                </form>
              </div>
            ) : (
              <div
                style={{
                  flex: "0 0 auto",
                  padding: 12,
                  borderTop: "1px solid rgba(255,255,255,.08)",
                  background: "#090909",
                }}
              >
                <button
                  type="button"
                  className="support-submit-button"
                  onClick={reopenTicket}
                  disabled={ticketLoading}
                  style={{ width: "100%" }}
                >
                  {ticketLoading
                    ? "REABRIENDO..."
                    : "↻ REABRIR CONSULTA"}
                </button>
              </div>
            )}
          </section>
        )}

        {view === "tickets" && (
          <section className="support-tickets-list">
            {ticketLoading && tickets.length === 0 && (
              <div className="support-main-card">
                <p>Cargando tus consultas...</p>
              </div>
            )}

            {!ticketLoading && tickets.length === 0 && (
              <div className="support-main-card">
                <div className="support-main-icon">📭</div>
                <h2>No tienes consultas</h2>
                <p>
                  Cuando crees una consulta aparecerá aquí.
                </p>
                <button
                  type="button"
                  className="support-main-button"
                  onClick={openNewTicket}
                >
                  CREAR CONSULTA
                </button>
              </div>
            )}

            {tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                className="support-item"
                onClick={() => openTicket(ticket)}
              >
                <div className="support-item-icon">💬</div>
                <div className="support-item-content">
                  <strong>{ticket.subject}</strong>
                  <p>{ticket.category || "Otro/pregunta"}</p>
                  <span>{ticket.status}</span>
                </div>
                <b>→</b>
              </button>
            ))}

            <button
              type="button"
              className="support-main-button"
              onClick={openNewTicket}
            >
              + NUEVA CONSULTA
            </button>
          </section>
        )}

        {view === "closed" && (
          <>
            <section className="support-main-card">
              <div className="support-main-icon">🆘</div>
              <h2>¿Necesitas ayuda?</h2>
              <p>
                Crea una consulta y nuestro asistente de soporte intentará
                resolverla contigo.
              </p>

              <button
                type="button"
                className="support-main-button"
                onClick={openNewTicket}
              >
                📩 CREAR NUEVA CONSULTA
              </button>

              {tickets.length > 0 && (
                <button
                  type="button"
                  className="support-secondary-button"
                  onClick={() => {
                    setView("tickets");
                    void loadTickets();
                  }}
                >
                  📋 VER MIS CONSULTAS
                </button>
              )}
            </section>

            {error && <div className="support-error">{error}</div>}

            <div className="support-user-info">
              <span>👤</span>
              <div>
                <strong>{currentUsername || "Usuario"}</strong>
                <p>{currentEmail}</p>
              </div>
            </div>

            <footer className="game-service-footer">
              <strong>🛒STORE GAMING🎮</strong>
              <span>CENTRO DE SOPORTE</span>
            </footer>

            <button
              type="button"
              className="support-floating-button"
              onClick={openNewTicket}
              aria-label="Crear consulta"
            >
              📩
            </button>
          </>
        )}
      </div>
    </main>
  );
}
