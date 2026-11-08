
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Order = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string;
  category_id: string;
  offer_id: string | null;
  card_id?: string | null;
  offer_name: string;
  player_id: string | null;
  retail_price: number | string;
  supplier_price: number | string;
  currency: string;
  status: string;
  supplier_order_id: string | null;
  supplier_fields: Record<string, unknown> | null;
  supplier_response: Record<string, unknown> | null;
  gift_codes?: unknown;
  quantity?: number;
  orderType?: "topup" | "gift_card";
  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

type ApiResponse = {
  ok?: boolean;
  order?: Partial<Order>;
  orders?: Order[];
  totalOrders?: number;
  totalAmount?: number;
  error?: string;
};

type EditableStatus =
  | "PENDING"
  | "COMPLETED"
  | "REFUNDED"
  | "CANCELLED";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const GAME_IMAGES: Record<string, string> = {
  free_fire_latam: "/images/free-fire-latam.jpg",
  mobile_legends_united_states: "/images/mobile-legends.jpg",
  delta_force: "/images/delta-force.jpg",
  eafc_mobile_id: "/images/fc-mobile.jpg",
  call_of_duty_mobile: "/images/call-of-duty.jpg",
  telegram_stars: "/images/telegram-stars.jpg",
  roblox_global: "/images/battle-royale-bg.jpg",
};

const DEFAULT_GAME_IMAGE = "/images/battle-royale-bg.jpg";

function getGameImage(categoryId: string, game: string) {
  if (GAME_IMAGES[categoryId]) return GAME_IMAGES[categoryId];

  const normalized = game.toLowerCase();

  if (normalized.includes("roblox")) return DEFAULT_GAME_IMAGE;
  if (normalized.includes("free") && normalized.includes("fire")) {
    return "/images/free-fire-latam.jpg";
  }
  if (normalized.includes("mobile legends")) {
    return "/images/mobile-legends.jpg";
  }
  if (normalized.includes("delta")) return "/images/delta-force.jpg";
  if (normalized.includes("ea") || normalized.includes("fc mobile")) {
    return "/images/fc-mobile.jpg";
  }
  if (normalized.includes("call") || normalized.includes("cod")) {
    return "/images/call-of-duty.jpg";
  }
  if (normalized.includes("telegram")) {
    return "/images/telegram-stars.jpg";
  }

  return DEFAULT_GAME_IMAGE;
}

function normalizeStatus(status: string): EditableStatus | string {
  const value = status.trim().toUpperCase();

  if (
    [
      "SUCCESS",
      "SUCCESSFUL",
      "CONFIRMADO",
      "CONFIRMADA",
      "COMPLETADA",
    ].includes(value)
  ) {
    return "COMPLETED";
  }

  if (["CANCELED", "CANCELADA", "FAILED"].includes(value)) {
    return "CANCELLED";
  }

  if (["REEMBOLSADA", "REFUND"].includes(value)) return "REFUNDED";
  if (value === "PENDIENTE") return "PENDING";

  return value;
}

function getGiftCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): string[] => {
    if (typeof item === "string") {
      const code = item.trim();
      return code ? [code] : [];
    }

    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;

      const candidate =
        record.code ??
        record.gift_code ??
        record.giftCode ??
        record.card_code ??
        record.cardCode ??
        record.key ??
        record.pin;

      if (typeof candidate === "string" && candidate.trim()) {
        return [candidate.trim()];
      }
    }

    return [];
  });
}

function AdminOrdersStyles() {
  return (
    <style jsx global>{`
      .admin-page {
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
        padding: 22px 16px 34px;
        color: #f5f5f5;
        background:
          radial-gradient(ellipse at 50% 0%, rgba(229, 9, 20, 0.13), transparent 42%),
          #090909;
        font-family: Arial, Helvetica, sans-serif;
      }
      .admin-page * { box-sizing: border-box; }
      .admin-header, .admin-intro, .admin-orders-search,
      .admin-orders-filters, .admin-orders-list, .admin-error-card,
      .admin-security-card, .admin-footer, .admin-order-detail,
      .admin-order-summary {
        width: 100%;
        max-width: 1050px;
        margin-right: auto;
        margin-left: auto;
      }
      .admin-header {
        min-height: 76px;
        margin-bottom: 24px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: #111;
        border: 1px solid #292929;
        border-bottom: 2px solid #e50914;
        border-radius: 16px;
      }
      .admin-header-title { min-width: 0; display: flex; align-items: center; gap: 12px; }
      .admin-header-icon { width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center; background: #e50914; border-radius: 13px; font-size: 23px; }
      .admin-header-title span { display: block; margin-bottom: 4px; color: #aaa; font-size: 10px; font-weight: 800; letter-spacing: 2px; }
      .admin-header-title h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 900; letter-spacing: 1px; }
      .admin-back-button, .admin-logout-button { width: 43px; height: 43px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid #363636; border-radius: 12px; color: #fff; background: #1b1b1b; font-size: 24px; cursor: pointer; }
      .admin-back-button:hover, .admin-logout-button:hover { border-color: #e50914; background: #251012; }
      .admin-logout-button:disabled { opacity: .5; cursor: wait; }
      .admin-order-summary { margin-bottom: 24px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
      .admin-order-summary > div { min-width: 0; padding: 17px 12px; display: flex; flex-direction: column; gap: 7px; background: linear-gradient(145deg, #171717, #101010); border: 1px solid #2b2b2b; border-radius: 14px; }
      .admin-order-summary > div > span { font-size: 21px; }
      .admin-order-summary strong { overflow-wrap: anywhere; color: #fff; font-size: 22px; font-weight: 900; }
      .admin-order-summary small { color: #999; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
      .admin-intro { margin-bottom: 20px; }
      .admin-intro > span { color: #ff333d; font-size: 10px; font-weight: 900; letter-spacing: 2px; }
      .admin-intro h2 { margin: 7px 0; color: #fff; font-size: 28px; font-weight: 900; }
      .admin-intro p { margin: 0; color: #999; font-size: 13px; line-height: 1.6; }
      .admin-orders-search { min-height: 54px; margin-bottom: 14px; padding: 0 15px; display: flex; align-items: center; gap: 11px; background: #141414; border: 1px solid #303030; border-radius: 13px; }
      .admin-orders-search input { width: 100%; min-width: 0; padding: 16px 0; outline: none; border: 0; color: #fff; background: transparent; font-size: 13px; }
      .admin-orders-search input::placeholder { color: #777; }
      .admin-orders-search:focus-within { border-color: #e50914; }
      .admin-orders-filters { margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 8px; }
      .admin-orders-filters button { min-height: 39px; padding: 10px 15px; border: 1px solid #303030; border-radius: 10px; color: #aaa; background: #151515; font-size: 10px; font-weight: 900; cursor: pointer; }
      .admin-orders-filters button.active { color: #fff; background: #e50914; border-color: #e50914; }
      .admin-orders-list { display: flex; flex-direction: column; gap: 12px; }
      .admin-order-card { width: 100%; min-width: 0; padding: 13px; display: flex; align-items: center; gap: 14px; text-align: left; color: #fff; background: linear-gradient(135deg, #171717, #101010); border: 1px solid #292929; border-radius: 15px; cursor: pointer; }
      .admin-order-card:hover { border-color: #e50914; background: linear-gradient(135deg, #211113, #111); }
      .admin-order-image { width: 83px; height: 83px; flex-shrink: 0; overflow: hidden; background: #222; border-radius: 11px; border: 1px solid #343434; }
      .admin-order-image img { width: 100%; height: 100%; display: block; object-fit: cover; }
      .admin-order-card-content { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
      .admin-order-card-content strong { max-width: 100%; overflow-wrap: anywhere; color: #fff; font-size: 14px; }
      .admin-order-card-content > span { color: #ff424b; font-size: 11px; font-weight: 800; }
      .admin-order-card-content small { max-width: 100%; overflow-wrap: anywhere; color: #999; font-size: 10px; }
      .admin-order-card-right { flex-shrink: 0; display: flex; align-items: flex-end; flex-direction: column; gap: 8px; }
      .admin-order-card-right > strong { color: #fff; font-size: 17px; font-weight: 900; }
      .admin-order-card-right > b { color: #e50914; font-size: 21px; }
      .status-completed, .status-cancelled, .status-pending, .status-refunded { display: inline-flex; max-width: 100%; padding: 6px 9px; align-items: center; justify-content: center; overflow-wrap: anywhere; border-radius: 7px; font-size: 9px; font-weight: 900; }
      .status-completed { color: #5ff0a0; background: rgba(20,150,80,.13); border: 1px solid rgba(60,220,130,.25); }
      .status-cancelled { color: #ff6b72; background: rgba(229,9,20,.12); border: 1px solid rgba(229,9,20,.25); }
      .status-refunded { color: #c9a7ff; background: rgba(130,70,220,.13); border: 1px solid rgba(160,100,255,.3); }
      .status-pending { color: #ffd36a; background: rgba(220,155,25,.12); border: 1px solid rgba(220,155,25,.25); }
      .admin-loading, .admin-loading-card, .admin-empty-card { padding: 35px 20px; display: flex; align-items: center; flex-direction: column; justify-content: center; gap: 12px; text-align: center; background: #121212; border: 1px solid #292929; border-radius: 16px; }
      .admin-loading { min-height: 65vh; border: 0; background: transparent; }
      .admin-loading-icon, .admin-loading-card > div, .admin-empty-card > div { font-size: 35px; }
      .admin-loading p, .admin-loading-card span { color: #aaa; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; }
      .admin-empty-card strong { color: #fff; font-size: 14px; }
      .admin-empty-card span { color: #999; font-size: 12px; line-height: 1.6; }
      .admin-error-card { margin-bottom: 16px; padding: 17px; background: #211012; border: 1px solid #7d1b22; border-radius: 13px; }
      .admin-error-card strong { color: #ff626a; }
      .admin-error-card p { color: #ddd; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
      .admin-error-card button { padding: 10px 15px; border: 0; border-radius: 9px; color: white; background: #e50914; font-size: 11px; font-weight: 900; cursor: pointer; }
      .admin-security-card { margin-top: 25px; padding: 18px; display: flex; align-items: flex-start; gap: 13px; background: #121212; border: 1px solid #292929; border-radius: 14px; }
      .admin-security-card strong { color: #fff; font-size: 11px; letter-spacing: .7px; }
      .admin-security-card p { margin: 7px 0 0; color: #999; font-size: 12px; line-height: 1.6; }
      .admin-footer { padding: 28px 0 0; display: flex; align-items: center; flex-direction: column; gap: 7px; text-align: center; }
      .admin-footer strong { color: #fff; font-size: 13px; font-weight: 900; letter-spacing: 2px; }
      .admin-footer span { color: #e50914; font-size: 9px; font-weight: 900; letter-spacing: 1.5px; }
      .admin-footer small { color: #666; font-size: 10px; }
      .admin-order-detail { padding: 18px; background: #111; border: 1px solid #292929; border-radius: 17px; }
      .admin-order-detail-game { display: flex; align-items: center; gap: 15px; margin-bottom: 17px; }
      .admin-order-detail-game img { width: 100px; height: 100px; flex-shrink: 0; object-fit: cover; background: #222; border: 1px solid #333; border-radius: 13px; }
      .admin-order-detail-game > div { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
      .admin-order-detail-game span { color: #e50914; font-size: 10px; font-weight: 900; overflow-wrap: anywhere; }
      .admin-order-detail-game strong { color: #fff; font-size: 19px; overflow-wrap: anywhere; }
      .admin-order-detail-game small { color: #aaa; font-size: 12px; overflow-wrap: anywhere; }
      .admin-order-status-box { margin-bottom: 18px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #191919; border: 1px solid #303030; border-radius: 11px; }
      .admin-order-status-box > span { color: #aaa; font-size: 10px; font-weight: 900; letter-spacing: 1px; }
      .admin-status-editor { margin-bottom: 18px; padding: 16px; background: #151515; border: 1px solid #393939; border-radius: 12px; }
      .admin-status-editor label { display: block; margin-bottom: 10px; color: #ff3a44; font-size: 11px; font-weight: 900; letter-spacing: 1.3px; }
      .admin-status-editor select { width: 100%; min-height: 47px; padding: 12px; color: #fff; background: #090909; border: 1px solid #383838; border-radius: 9px; outline: none; font-size: 13px; }
      .admin-status-save { width: 100%; min-height: 47px; margin-top: 12px; border: 0; border-radius: 10px; color: #fff; background: #e50914; font-size: 11px; font-weight: 900; cursor: pointer; }
      .admin-status-save:disabled { opacity: .5; cursor: wait; }
      .admin-status-message { margin: 10px 0 0; color: #aaa; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
      .admin-status-message.success { color: #5ff0a0; }
      .admin-status-message.error { color: #ff6b72; }
      .admin-order-detail-section, .admin-order-json-section { margin-top: 15px; padding: 16px; background: #151515; border: 1px solid #292929; border-radius: 12px; }
      .admin-order-detail-title { margin-bottom: 13px; padding-bottom: 10px; color: #ff3a44; border-bottom: 1px solid #303030; font-size: 11px; font-weight: 900; letter-spacing: 1.3px; }
      .admin-order-detail-row { min-width: 0; padding: 11px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; border-bottom: 1px solid #262626; }
      .admin-order-detail-row:last-child { border-bottom: 0; }
      .admin-order-detail-row > span { flex-shrink: 0; color: #999; font-size: 12px; }
      .admin-order-detail-row > strong { max-width: 65%; color: #f5f5f5; font-size: 12px; text-align: right; overflow-wrap: anywhere; word-break: break-word; }
      .admin-order-json-section pre { max-width: 100%; margin: 0; padding: 13px; overflow-x: auto; color: #e8e8e8; background: #090909; border: 1px solid #292929; border-radius: 9px; font-family: monospace; font-size: 11px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
      .admin-gift-code { margin-top: 10px; padding: 13px; background: #090909; border: 1px solid #333; border-radius: 10px; overflow-wrap: anywhere; word-break: break-word; }
      .admin-gift-code code { display: block; color: #8effb5; font-size: 14px; font-weight: 800; white-space: pre-wrap; }
      .admin-gift-code button { margin-top: 10px; padding: 9px 12px; color: #fff; background: #252525; border: 1px solid #444; border-radius: 8px; cursor: pointer; }
      .admin-gift-code button:hover { border-color: #e50914; }
      .admin-order-return { width: 100%; min-height: 48px; margin-top: 18px; border: 0; border-radius: 11px; color: #fff; background: #e50914; font-size: 11px; font-weight: 900; cursor: pointer; }
      @media (max-width: 700px) {
        .admin-page { padding: 12px 10px 25px; }
        .admin-header { min-height: 67px; margin-bottom: 17px; padding: 10px; gap: 8px; border-radius: 13px; }
        .admin-header-icon { width: 38px; height: 38px; font-size: 19px; }
        .admin-header-title { gap: 8px; }
        .admin-header-title span { font-size: 8px; letter-spacing: 1.3px; }
        .admin-header-title h1 { font-size: 18px; }
        .admin-back-button, .admin-logout-button { width: 37px; height: 37px; font-size: 21px; }
        .admin-order-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 21px; }
        .admin-order-summary > div { padding: 12px; gap: 6px; }
        .admin-order-summary > div:last-child { grid-column: 1 / -1; }
        .admin-order-summary strong { font-size: 20px; }
        .admin-intro h2 { font-size: 24px; }
        .admin-orders-filters { gap: 6px; }
        .admin-orders-filters button { flex: 1 1 auto; padding: 10px; font-size: 9px; }
        .admin-order-card { padding: 10px; gap: 9px; border-radius: 12px; }
        .admin-order-image { width: 62px; height: 68px; border-radius: 8px; }
        .admin-order-card-content { gap: 5px; }
        .admin-order-card-content strong { font-size: 12px; }
        .admin-order-card-content > span { font-size: 10px; }
        .admin-order-card-content small { font-size: 9px; }
        .admin-order-card-right { gap: 7px; }
        .admin-order-card-right > strong { font-size: 14px; }
        .admin-order-card-right > b { font-size: 17px; }
        .status-completed, .status-cancelled, .status-pending, .status-refunded { padding: 5px 6px; font-size: 8px; }
        .admin-order-detail { padding: 11px; }
        .admin-order-detail-game img { width: 76px; height: 82px; }
        .admin-order-detail-game strong { font-size: 16px; }
        .admin-order-detail-section, .admin-order-json-section { padding: 12px; }
        .admin-order-detail-row { gap: 10px; }
        .admin-order-detail-row > span, .admin-order-detail-row > strong { font-size: 11px; }
      }
      @media (max-width: 370px) {
        .admin-order-image { width: 50px; height: 58px; }
        .admin-order-card { gap: 7px; padding: 8px; }
        .admin-order-card-content small { font-size: 8px; }
        .admin-order-card-right > strong { font-size: 12px; }
        .admin-order-summary strong { font-size: 18px; }
      }
    `}</style>
  );
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<Filter>("TODAS");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState<EditableStatus>("PENDING");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusMessageType, setStatusMessageType] = useState<"success" | "error">("success");

  const loadOrders = useCallback(async (accessToken?: string) => {
    setLoadingOrders(true);
    setError("");

    try {
      let token = accessToken;

      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "No se pudieron cargar las órdenes.");
      }

      const loadedOrders = data.orders || [];
      setOrders(loadedOrders);

      setSelectedOrder((previous) => {
        if (!previous) return null;
        return loadedOrders.find((order) => order.id === previous.id) || previous;
      });
    } catch (err) {
      console.error("ERROR CARGANDO ÓRDENES ADMIN:", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes.");
    } finally {
      setLoadingOrders(false);
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      try {
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError || !session?.user) {
          router.replace("/login");
          return;
        }

        if ((session.user.email || "").trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          router.replace("/home");
          return;
        }

        setAuthorized(true);
        setLoading(false);
        await loadOrders(session.access_token);
      } catch (err) {
        console.error("ERROR VERIFICANDO ADMIN:", err);
        if (mounted) router.replace("/login");
      }
    }

    void verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router, loadOrders]);

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMoney(value: number | string) {
    return (Number(value) || 0).toFixed(2);
  }

  function isCompleted(status: string) {
    return ["COMPLETED", "COMPLETADA", "CONFIRMADO", "CONFIRMADA", "SUCCESS", "SUCCESSFUL"].includes(status.toUpperCase());
  }

  function isRefunded(status: string) {
    return ["REFUNDED", "REFUND", "REEMBOLSADA"].includes(status.toUpperCase());
  }

  function isCancelled(status: string) {
    return ["CANCELLED", "CANCELED", "CANCELADA", "FAILED"].includes(status.toUpperCase());
  }

  function isPending(status: string) {
    return ["RESERVED", "SUPPLIER_PENDING", "REFUND_PENDING", "PENDING", "PROCESSING", "PENDIENTE"].includes(status.toUpperCase());
  }

  function getStatusText(status: string) {
    const normalized = status.toUpperCase();
    if (isRefunded(normalized)) return "REEMBOLSADA";
    if (isCompleted(normalized)) return "COMPLETADA";
    if (isCancelled(normalized)) return "CANCELADA";
    if (normalized === "SUPPLIER_PENDING") return "PROCESANDO PROVEEDOR";
    if (normalized === "REFUND_PENDING") return "REEMBOLSO PENDIENTE";
    return "PENDIENTE";
  }

  function getStatusClass(status: string) {
    if (isRefunded(status)) return "status-refunded";
    if (isCompleted(status)) return "status-completed";
    if (isCancelled(status)) return "status-cancelled";
    return "status-pending";
  }

  function getServerId(order: Order) {
    const fields = order.supplier_fields || {};
    const value = fields.server_id ?? fields.id_servidor ?? fields.serverId;
    return value == null || value === "" ? null : String(value);
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (filter === "PENDIENTES" && !isPending(order.status)) return false;
      if (filter === "COMPLETADAS" && !isCompleted(order.status)) return false;
      if (filter === "CANCELADAS" && !isCancelled(order.status) && !isRefunded(order.status)) return false;
      if (!query) return true;

      return [
        order.id,
        order.user_id,
        order.email,
        order.username,
        order.game,
        order.category_id,
        order.offer_id,
        order.offer_name,
        order.player_id,
        order.supplier_order_id,
        order.status,
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [orders, filter, search]);

  async function updateOrderStatus() {
    if (!selectedOrder || savingStatus) return;

    if (newStatus === normalizeStatus(selectedOrder.status)) {
      setStatusMessage("La orden ya tiene ese estado.");
      setStatusMessageType("error");
      return;
    }

    const isGiftCard = selectedOrder.orderType === "gift_card";

    const confirmed = window.confirm(
      `¿Cambiar el estado de esta orden a ${getStatusText(newStatus)}? Este cambio no devuelve saldo automáticamente.`
    );

    if (!confirmed) return;

    setSavingStatus(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: newStatus,
          orderType: isGiftCard ? "gift_card" : "topup",
        }),
        cache: "no-store",
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "No se pudo actualizar el estado.");
      }

      setStatusMessage("Estado actualizado correctamente.");
      setStatusMessageType("success");

      await loadOrders(session.access_token);

      setSelectedOrder((previous) => {
        if (!previous) return null;
        const refreshed = (data.orders || []).find((order) => order.id === previous.id);
        return refreshed || {
          ...previous,
          ...(data.order || {}),
          status: data.order?.status || newStatus,
        };
      });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Error al actualizar el estado.");
      setStatusMessageType("error");
    } finally {
      setSavingStatus(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setStatusMessage("Código copiado al portapapeles.");
      setStatusMessageType("success");
    } catch {
      setStatusMessage("No se pudo copiar automáticamente. Selecciona el código y cópialo.");
      setStatusMessageType("error");
    }
  }

  const totalAmount = orders.reduce((sum, order) => sum + (Number(order.retail_price) || 0), 0);
  const pendingOrders = orders.filter((order) => isPending(order.status)).length;
  const completedOrders = orders.filter((order) => isCompleted(order.status)).length;
  const cancelledOrders = orders.filter((order) => isCancelled(order.status) || isRefunded(order.status)).length;

  if (loading) {
    return (
      <main className="admin-page">
        <AdminOrdersStyles />
        <div className="admin-loading">
          <div className="admin-loading-icon">👑</div>
          <p>VERIFICANDO ACCESO...</p>
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  if (selectedOrder) {
    const image = getGameImage(selectedOrder.category_id, selectedOrder.game);
    const codes = selectedOrder.orderType === "gift_card"
      ? getGiftCodes(selectedOrder.gift_codes)
      : [];

    return (
      <main className="admin-page">
        <AdminOrdersStyles />

        <header className="admin-header">
          <button type="button" className="admin-back-button" onClick={() => setSelectedOrder(null)} aria-label="Volver a órdenes">←</button>
          <div className="admin-header-title">
            <div className="admin-header-icon">🛒</div>
            <div><span>STORE GAMING</span><h1>DETALLE DE ORDEN</h1></div>
          </div>
          <div />
        </header>

        <section className="admin-order-detail">
          <div className="admin-order-detail-game">
            <img src={image} alt={selectedOrder.game} onError={(event) => { event.currentTarget.src = DEFAULT_GAME_IMAGE; }} />
            <div>
              <span>{selectedOrder.orderType === "gift_card" ? "TARJETA REGALO" : "RECARGA"} · #{selectedOrder.id}</span>
              <strong>{selectedOrder.game}</strong>
              <small>{selectedOrder.offer_name}</small>
            </div>
          </div>

          <div className="admin-order-status-box">
            <span>ESTADO ACTUAL</span>
            <strong className={getStatusClass(selectedOrder.status)}>{getStatusText(selectedOrder.status)}</strong>
          </div>

          <div className="admin-status-editor">
            <label htmlFor="order-status">CAMBIAR ESTADO MANUALMENTE</label>
            <select
              id="order-status"
              value={newStatus}
              onChange={(event) => {
                setNewStatus(event.target.value as EditableStatus);
                setStatusMessage("");
              }}
              disabled={savingStatus}
            >
              <option value="PENDING">PENDIENTE</option>
              <option value="COMPLETED">COMPLETADA</option>
              <option value="REFUNDED">REEMBOLSADA</option>
              <option value="CANCELLED">CANCELADA</option>
            </select>
            <button type="button" className="admin-status-save" onClick={updateOrderStatus} disabled={savingStatus || newStatus === normalizeStatus(selectedOrder.status)}>
              {savingStatus ? "GUARDANDO..." : "GUARDAR NUEVO ESTADO"}
            </button>
            {statusMessage && <p className={`admin-status-message ${statusMessageType}`} role="status">{statusMessage}</p>}
          </div>

          {selectedOrder.orderType === "gift_card" && (
            <div className="admin-order-detail-section">
              <div className="admin-order-detail-title">🎁 CÓDIGOS DE REGALO</div>
              {codes.length > 0 ? (
                <>
                  <p style={{ color: "#aaa", fontSize: 12, lineHeight: 1.6 }}>
                    Códigos guardados en la orden. Esta sección solo se muestra en el panel de administración.
                  </p>
                  {codes.map((code, index) => (
                    <div className="admin-gift-code" key={`${index}-${code.slice(0, 8)}`}>
                      <strong style={{ display: "block", marginBottom: 8, color: "#aaa", fontSize: 10 }}>
                        CÓDIGO {index + 1}
                      </strong>
                      <code>{code}</code>
                      <button type="button" onClick={() => void copyCode(code)}>COPIAR CÓDIGO</button>
                    </div>
                  ))}
                </>
              ) : (
                <p style={{ color: "#ffd36a", fontSize: 12, lineHeight: 1.6 }}>
                  No hay códigos legibles en el campo gift_codes de esta respuesta. Comprueba los datos guardados en Supabase y el formato que devuelve el proveedor.
                </p>
              )}
            </div>
          )}

          <div className="admin-order-detail-section">
            <div className="admin-order-detail-title">CLIENTE</div>
            <div className="admin-order-detail-row"><span>Correo</span><strong>{selectedOrder.email || "Sin correo"}</strong></div>
            <div className="admin-order-detail-row"><span>Usuario</span><strong>{selectedOrder.username || "Sin usuario"}</strong></div>
            <div className="admin-order-detail-row"><span>ID usuario</span><strong>{selectedOrder.user_id}</strong></div>
          </div>

          <div className="admin-order-detail-section">
            <div className="admin-order-detail-title">COMPRA</div>
            <div className="admin-order-detail-row"><span>Juego</span><strong>{selectedOrder.game}</strong></div>
            <div className="admin-order-detail-row"><span>Producto</span><strong>{selectedOrder.offer_name}</strong></div>
            <div className="admin-order-detail-row"><span>Tipo de orden</span><strong>{selectedOrder.orderType === "gift_card" ? "Tarjeta regalo" : "Recarga"}</strong></div>
            {selectedOrder.orderType === "gift_card" && <div className="admin-order-detail-row"><span>Cantidad</span><strong>{selectedOrder.quantity ?? "—"}</strong></div>}
            {selectedOrder.player_id && <div className="admin-order-detail-row"><span>ID jugador</span><strong>{selectedOrder.player_id}</strong></div>}
            {getServerId(selectedOrder) && <div className="admin-order-detail-row"><span>Servidor</span><strong>{getServerId(selectedOrder)}</strong></div>}
            <div className="admin-order-detail-row"><span>Precio cliente</span><strong>${formatMoney(selectedOrder.retail_price)} {selectedOrder.currency}</strong></div>
            <div className="admin-order-detail-row"><span>Precio proveedor</span><strong>${formatMoney(selectedOrder.supplier_price)} {selectedOrder.currency}</strong></div>
          </div>

          <div className="admin-order-detail-section">
            <div className="admin-order-detail-title">PROVEEDOR</div>
            <div className="admin-order-detail-row"><span>Orden proveedor</span><strong>{selectedOrder.supplier_order_id || "No disponible"}</strong></div>
            <div className="admin-order-detail-row"><span>Creada</span><strong>{formatDate(selectedOrder.created_at)}</strong></div>
            <div className="admin-order-detail-row"><span>Actualizada</span><strong>{formatDate(selectedOrder.updated_at)}</strong></div>
            <div className="admin-order-detail-row"><span>Completada</span><strong>{formatDate(selectedOrder.completed_at)}</strong></div>
            <div className="admin-order-detail-row"><span>Fallida</span><strong>{formatDate(selectedOrder.failed_at)}</strong></div>
            <div className="admin-order-detail-row"><span>Reembolsada</span><strong>{formatDate(selectedOrder.refunded_at)}</strong></div>
          </div>

          {selectedOrder.orderType !== "gift_card" && (
            <div className="admin-order-json-section">
              <div className="admin-order-detail-title">DATOS ENVIADOS AL PROVEEDOR</div>
              <pre>{JSON.stringify(selectedOrder.supplier_fields || {}, null, 2)}</pre>
            </div>
          )}

          <div className="admin-order-json-section">
            <div className="admin-order-detail-title">RESPUESTA DEL PROVEEDOR</div>
            <pre>{JSON.stringify(selectedOrder.supplier_response || {}, null, 2)}</pre>
          </div>

          <button type="button" className="admin-order-return" onClick={() => setSelectedOrder(null)}>← VOLVER A ÓRDENES</button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <AdminOrdersStyles />

      <header className="admin-header">
        <button type="button" className="admin-back-button" onClick={() => router.push("/admin")} aria-label="Volver">←</button>
        <div className="admin-header-title">
          <div className="admin-header-icon">🛒</div>
          <div><span>STORE GAMING</span><h1>ÓRDENES</h1></div>
        </div>
        <button type="button" className="admin-logout-button" onClick={() => void loadOrders()} disabled={loadingOrders} aria-label="Actualizar órdenes">↻</button>
      </header>

      <section className="admin-order-summary">
        <div><span>📦</span><strong>{orders.length}</strong><small>ÓRDENES</small></div>
        <div><span>💵</span><strong>${totalAmount.toFixed(2)}</strong><small>VENTAS</small></div>
        <div><span>⏳</span><strong>{pendingOrders}</strong><small>PENDIENTES</small></div>
        <div><span>✅</span><strong>{completedOrders}</strong><small>COMPLETADAS</small></div>
        <div><span>❌</span><strong>{cancelledOrders}</strong><small>CANCELADAS / REFUND</small></div>
      </section>

      <section className="admin-intro">
        <span>CONTROL DE PEDIDOS</span>
        <h2>ÓRDENES</h2>
        <p>Revisa las recargas y tarjetas regalo de todos los clientes.</p>
      </section>

      <section className="admin-orders-search">
        <span>🔎</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, orden, juego o ID..." />
      </section>

      <section className="admin-orders-filters">
        {(["TODAS", "PENDIENTES", "COMPLETADAS", "CANCELADAS"] as Filter[]).map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </section>

      {error && (
        <section className="admin-error-card">
          <strong>⚠️ ERROR</strong>
          <p>{error}</p>
          <button type="button" onClick={() => void loadOrders()}>REINTENTAR</button>
        </section>
      )}

      <section className="admin-orders-list">
        {loadingOrders && <div className="admin-loading-card"><div>↻</div><span>CARGANDO ÓRDENES...</span></div>}

        {!loadingOrders && !error && filteredOrders.length === 0 && (
          <div className="admin-empty-card">
            <div>📭</div><strong>NO HAY ÓRDENES</strong>
            <span>No se encontraron órdenes con los filtros actuales.</span>
          </div>
        )}

        {!loadingOrders && filteredOrders.map((order) => (
          <button key={`${order.orderType || "topup"}-${order.id}`} type="button" className="admin-order-card" onClick={() => {
            setSelectedOrder(order);
            setNewStatus(normalizeStatus(order.status) as EditableStatus);
            setStatusMessage("");
            setStatusMessageType("success");
          }}>
            <div className="admin-order-image">
              <img src={getGameImage(order.category_id, order.game)} alt={order.game} loading="lazy" onError={(event) => { event.currentTarget.src = DEFAULT_GAME_IMAGE; }} />
            </div>
            <div className="admin-order-card-content">
              <strong>{order.offer_name}</strong>
              <span>{order.game} · {order.orderType === "gift_card" ? "TARJETA REGALO" : "RECARGA"}</span>
              <small>👤 {order.email || "Sin correo"}</small>
              {order.player_id && <small>🆔 {order.player_id}</small>}
              {order.orderType === "gift_card" && <small>🎁 Cantidad: {order.quantity ?? 1}</small>}
              <small>#{order.id}</small>
            </div>
            <div className="admin-order-card-right">
              <strong>${formatMoney(order.retail_price)}</strong>
              <span className={getStatusClass(order.status)}>{getStatusText(order.status)}</span>
              {order.orderType === "gift_card" && getGiftCodes(order.gift_codes).length > 0 && <small>🎁 Código disponible</small>}
              <b>→</b>
            </div>
          </button>
        ))}
      </section>

      <section className="admin-security-card">
        <div>🔐</div>
        <div>
          <strong>ÓRDENES PROTEGIDAS</strong>
          <p>La información de las compras solo está disponible para la cuenta administradora.</p>
        </div>
      </section>

      <footer className="admin-footer">
        <strong>STORE GAMING</strong><span>CONTROL DE ÓRDENES</span><small>© 2026 STORE GAMING</small>
      </footer>
    </main>
  );
}
