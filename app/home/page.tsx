
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = Record<string, unknown> & {
  id?: string;
  status?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type Game = {
  name: string;
  description: string;
  image: string;
  route: string;
  tag: string;
};

type MenuIconName =
  | "home"
  | "gamepad"
  | "gift"
  | "star"
  | "wallet"
  | "chart"
  | "user"
  | "package"
  | "headphones"
  | "settings"
  | "clipboard";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const games: Game[] = [
  {
    name: "FREE FIRE LATAM",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-latam",
    tag: "DIAMANTES",
  },
  {
    name: "GENSHIN IMPACT GLOBAL",
    description: "Cristales génesis para tu cuenta.",
    image: "/images/genshin-impact-global.jpg",
    route: "/games/genshin-impact-global",
    tag: "RECARGAS",
  },
  {
    name: "MOBILE LEGENDS EE.UU.",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends",
    tag: "DIAMANTES",
  },
  {
    name: "LEGENDS MOBILE GLOBAL",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends-global",
    tag: "DIAMANTES",
  },
  {
    name: "BLOOD STRIKE",
    description: "Recargas para tu cuenta.",
    image: "/images/blood-strike.jpg",
    route: "/games/blood-strike",
    tag: "RECARGAS",
  },
  {
    name: "ARENA BREAKOUT",
    description: "Recargas para tu cuenta.",
    image: "/images/arena-breakout.jpg",
    route: "/games/arena-breakout",
    tag: "RECARGAS",
  },
  {
    name: "DELTA FORCE",
    description: "Recargas para tu cuenta.",
    image: "/images/delta-force.jpg",
    route: "/games/delta-force",
    tag: "RECARGAS",
  },
  {
    name: "FC MOBILE ID",
    description: "Recargas para FC Mobile.",
    image: "/images/fc-mobile.jpg",
    route: "/games/fc-mobile-id",
    tag: "RECARGAS",
  },
  {
    name: "HONOR OF KINGS",
    description: "Recargas para tu cuenta.",
    image: "/images/honor-of-kings.jpg",
    route: "/games/honor-of-kings",
    tag: "DIAMANTES",
  },
  {
    name: "LEAGUE OF LEGENDS ID",
    description: "Recargas para League of Legends.",
    image: "/images/league-of-legends.jpg",
    route: "/games/league-of-legends-id",
    tag: "RECARGAS",
  },
  {
    name: "GARENA FREE FIRE ID",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-id",
    tag: "DIAMANTES",
  },
  {
    name: "MODERN WARSHIPS",
    description: "Recargas para tu cuenta.",
    image: "/images/modern-warships.jpg",
    route: "/games/modern-warships",
    tag: "RECARGAS",
  },
  {
    name: "SAUSAGE MAN",
    description: "Recargas para tu cuenta.",
    image: "/images/sausage-man.jpg",
    route: "/games/sausage-man",
    tag: "RECARGAS",
  },
  {
    name: "LORDS MOBILE",
    description: "Diamantes y pases para Lords Mobile.",
    image: "/images/lords-mobile.jpg",
    route: "/games/lords-mobile",
    tag: "DIAMANTES",
  },
];

function MenuLineIcon({ name }: { name: MenuIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" {...common}>
      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9" />
          <path d="M9 20v-7h6v7" />
        </>
      )}

      {name === "gamepad" && (
        <>
          <path d="M6.5 8h11a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.6a2.5 2.5 0 0 1-4.1 1.1L14 16h-4l-2.6 2.5a2.5 2.5 0 0 1-4.1-1.1l-1.1-3.6A4.5 4.5 0 0 1 6.5 8Z" />
          <path d="M7 11v4M5 13h4M16.5 12h.01M18.5 14h.01" />
        </>
      )}

      {name === "gift" && (
        <>
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M12 9v12M3 13h18" />
          <path d="M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9ZM12 9h4.5A2.5 2.5 0 1 0 14 6.5V9Z" />
        </>
      )}

      {name === "star" && (
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      )}

      {name === "wallet" && (
        <>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 9h18M16 14h5M16 14h.01M6 5V4a2 2 0 0 1 2-2h10" />
        </>
      )}

      {name === "chart" && (
        <>
          <path d="M3 3v18h18" />
          <rect x="7" y="12" width="3" height="6" rx=".5" />
          <rect x="13" y="8" width="3" height="10" rx=".5" />
          <rect x="19" y="5" width="2" height="13" rx=".5" />
        </>
      )}

      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}

      {name === "package" && (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
        </>
      )}

      {name === "headphones" && (
        <>
          <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
          <rect x="3" y="13" width="5" height="8" rx="2" />
          <rect x="16" y="13" width="5" height="8" rx="2" />
        </>
      )}

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" />
        </>
      )}

      {name === "clipboard" && (
        <>
          <rect x="5" y="4" width="14" height="18" rx="2" />
          <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4" />
        </>
      )}
    </svg>
  );
}

function getOrderAmount(order: StoreOrder): number {
  const amountFields = [
    "total",
    "total_amount",
    "total_usd",
    "amount",
    "amount_usd",
    "price",
    "price_usd",
    "cost",
    "subtotal",
    "retail_price",
  ];

  for (const field of amountFields) {
    const value = order[field];

    if (value !== null && value !== undefined && value !== "") {
      const amount = Number(value);
      if (Number.isFinite(amount)) return amount;
    }
  }

  return 0;
}

function isCompletedOrder(order: StoreOrder): boolean {
  const status = String(order.status || "").trim().toUpperCase();

  return [
    "COMPLETED",
    "COMPLETE",
    "SUCCESS",
    "SUCCESSFUL",
    "COMPLETADA",
    "COMPLETADO",
  ].includes(status);
}

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingManualOrders, setPendingManualOrders] = useState(0);

  // Se conservan las estadísticas internas existentes.
  const [ordersCreated, setOrdersCreated] = useState(0);
  const [deposited, setDeposited] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const featuredTrackRef = useRef<HTMLDivElement | null>(null);
  const gamesTrackRef = useRef<HTMLDivElement | null>(null);

  // Desplazamiento automático suave; se pausa cuando el cliente interactúa.
  useEffect(() => {
    const tracks = [featuredTrackRef.current, gamesTrackRef.current].filter(
      (track): track is HTMLDivElement => Boolean(track)
    );

    if (tracks.length === 0) return;

    let pausedUntil = 0;
    const returningToStart = new Set<HTMLDivElement>();
    const pauseAutoScroll = () => {
      pausedUntil = Date.now() + 5000;
    };

    tracks.forEach((track) => {
      track.addEventListener("pointerdown", pauseAutoScroll, { passive: true });
      track.addEventListener("touchstart", pauseAutoScroll, { passive: true });
      track.addEventListener("wheel", pauseAutoScroll, { passive: true });
    });

    const interval = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;

      tracks.forEach((track) => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (maxScroll <= 2) return;

        if (returningToStart.has(track)) {
          if (track.scrollLeft <= 2) returningToStart.delete(track);
          return;
        }

        if (track.scrollLeft >= maxScroll - 2) {
          returningToStart.add(track);
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollLeft += 0.7;
        }
      });
    }, 24);

    return () => {
      window.clearInterval(interval);
      tracks.forEach((track) => {
        track.removeEventListener("pointerdown", pauseAutoScroll);
        track.removeEventListener("touchstart", pauseAutoScroll);
        track.removeEventListener("wheel", pauseAutoScroll);
      });
    };
  }, [loading, search]);

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return games;

    return games.filter((game) =>
      `${game.name} ${game.description} ${game.tag}`
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  async function loadPendingManualOrders() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.access_token || !session.user) {
        setPendingManualOrders(0);
        return;
      }

      const email = (session.user.email || "").trim().toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        setPendingManualOrders(0);
        return;
      }

      const response = await fetch("/api/admin/manual-orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Error consultando órdenes pendientes:", response.status);
        return;
      }

      const result = await response.json();

      if (result.success && result.counts) {
        const pending = Number(result.counts.pending);

        if (Number.isFinite(pending)) {
          setPendingManualOrders(Math.max(0, pending));
        }
      }
    } catch (error) {
      console.error("Error cargando órdenes pendientes:", error);
    }
  }

  async function loadNotifications(userId: string) {
    if (!userId) return;

    setNotificationsLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,message,type,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error cargando notificaciones:", error);
      setNotificationsLoading(false);
      return;
    }

    const rows = (data as Notification[]) || [];

    setNotifications(rows);
    setNotificationCount(
      rows.filter((notification) => !notification.is_read).length
    );
    setNotificationsLoading(false);
  }

  async function markNotificationAsRead(notificationId: string) {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error marcando notificación:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );

    setNotificationCount((count) => Math.max(0, count - 1));
  }

  async function markAllNotificationsAsRead() {
    if (!currentUserId) return;
    if (!notifications.some((notification) => !notification.is_read)) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marcando notificaciones:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setNotificationCount(0);
  }

  async function loadStatistics(userId: string) {
    const { data: orderData, error: ordersError } = await supabase
      .from("store_gaming_orders")
      .select("*")
      .eq("user_id", userId);

    if (ordersError) {
      console.error("Error cargando órdenes:", ordersError);
      setOrdersCreated(0);
      setTotalSpent(0);
    } else {
      const orders = (orderData || []) as StoreOrder[];

      setOrdersCreated(orders.length);

      const completedOrders = orders.filter(isCompletedOrder);

      const sum = completedOrders.reduce(
        (total, order) => total + getOrderAmount(order),
        0
      );

      setTotalSpent(sum);
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error cargando billetera:", profileError);
      setDeposited(0);
    } else {
      setDeposited(Number(profileData?.balance) || 0);
    }
  }

  useEffect(() => {
    let mounted = true;

    let notificationChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let ordersChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    async function loadUser() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      const email = session.user.email || "usuario";
      const userId = session.user.id;

      setUsername(email.split("@")[0] || "usuario");
      setCurrentUserId(userId);

      const adminUser =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setIsAdmin(adminUser);

      if (adminUser) {
        await loadPendingManualOrders();
      } else {
        setPendingManualOrders(0);
      }

      await Promise.all([
        loadStatistics(userId),
        loadNotifications(userId),
      ]);

      if (!mounted) return;

      notificationChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadNotifications(userId);
          }
        )
        .subscribe();

      ordersChannel = supabase
        .channel(`home-orders-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "store_gaming_orders",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadStatistics(userId);
          }
        )
        .subscribe();

      setLoading(false);
    }

    void loadUser();

    const manualOrdersInterval = window.setInterval(() => {
      void loadPendingManualOrders();
    }, 15000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/");
        return;
      }

      const email = session.user.email || "usuario";
      const userId = session.user.id;

      setUsername(email.split("@")[0] || "usuario");
      setCurrentUserId(userId);

      const adminUser =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setIsAdmin(adminUser);

      if (adminUser) {
        void loadPendingManualOrders();
      } else {
        setPendingManualOrders(0);
      }

      void (async () => {
        await Promise.all([
          loadStatistics(userId),
          loadNotifications(userId),
        ]);

        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      window.clearInterval(manualOrdersInterval);
      subscription.unsubscribe();

      if (notificationChannel) {
        void supabase.removeChannel(notificationChannel);
      }

      if (ordersChannel) {
        void supabase.removeChannel(ordersChannel);
      }
    };
  }, [router]);

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/");
  }

  function goTo(path: string) {
    setMenuOpen(false);
    setNotificationsOpen(false);
    router.push(path);
  }

  if (loading) {
    return (
      <main className="sg-loading">
        <div className="sg-loading-logo">
          <span>STORE</span> GAMING
        </div>
        <div className="sg-loading-line" />
        <p>CARGANDO STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main className="sg-home">
      {menuOpen && (
        <>
          <button
            type="button"
            className="sg-menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="sg-sidebar">
            <div className="sg-sidebar-header">
              <div className="sg-brand">
                <span className="sg-brand-symbol">S</span>
                <div>
                  <small>STORE</small>
                  <strong>GAMING</strong>
                </div>
              </div>

              <button
                type="button"
                className="sg-close-menu"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>

            <div className="sg-sidebar-user">
              <div className="sg-sidebar-avatar">👤</div>
              <div>
                <small>CUENTA ACTIVA</small>
                <strong>@{username}</strong>
              </div>
            </div>

            <nav className="sg-sidebar-nav">
              <button
                type="button"
                className="sg-menu-item sg-menu-active"
                onClick={() => goTo("/home")}
              >
                <MenuLineIcon name="home" />
                <span>Hogar</span>
                <b>›</b>
              </button>

              <div className="sg-menu-label">SERVICIOS</div>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/top-up")}>
                <MenuLineIcon name="gamepad" />
                <span>Recargas TOP UP</span>
                <b>›</b>
              </button>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/gift-cards")}>
                <MenuLineIcon name="gift" />
                <span>Tarjetas de regalo</span>
                <b>›</b>
              </button>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/telegram-stars")}>
                <MenuLineIcon name="star" />
                <span>Estrellas de Telegram</span>
                <b>›</b>
              </button>

              <div className="sg-menu-label">FINANZAS</div>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/balance")}>
                <MenuLineIcon name="wallet" />
                <span>Billetera</span>
                <b>›</b>
              </button>

              <button
                type="button"
                className="sg-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                <MenuLineIcon name="chart" />
                <span>Estadísticas</span>
                <b>›</b>
              </button>

              <div className="sg-menu-label">CUENTA</div>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/profile")}>
                <MenuLineIcon name="user" />
                <span>Mi perfil</span>
                <b>›</b>
              </button>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/ajustes")}>
                <MenuLineIcon name="settings" />
                <span>Ajustes</span>
                <b>›</b>
              </button>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/orders")}>
                <MenuLineIcon name="package" />
                <span>Mis pedidos</span>
                <b>›</b>
              </button>

              <button type="button" className="sg-menu-item" onClick={() => goTo("/support")}>
                <MenuLineIcon name="headphones" />
                <span>Soporte</span>
                <b>›</b>
              </button>

              {isAdmin && (
                <>
                  <div className="sg-menu-label">ADMINISTRACIÓN</div>

                  <button type="button" className="sg-menu-item" onClick={() => goTo("/admin")}>
                    <MenuLineIcon name="settings" />
                    <span>ADM PANEL</span>
                    <b>›</b>
                  </button>

                  <button
                    type="button"
                    className="sg-menu-item"
                    onClick={() => goTo("/admin/manual-orders")}
                  >
                    <MenuLineIcon name="clipboard" />
                    <span>ÓRDENES ADM</span>
                    {pendingManualOrders > 0 && (
                      <em>
                        {pendingManualOrders > 99 ? "99+" : pendingManualOrders}
                      </em>
                    )}
                    <b>›</b>
                  </button>
                </>
              )}
            </nav>

            <div className="sg-sidebar-bottom">
              <button type="button" onClick={logout}>
                <span>↪</span>
                CERRAR SESIÓN
              </button>
            </div>
          </aside>
        </>
      )}

      <header className="sg-header">
        <div className="sg-header-left">
          <button
            type="button"
            className="sg-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="sg-header-brand">
            <span>STORE</span> GAMING
          </div>
        </div>

        <div className="sg-header-actions">
          <button
            type="button"
            className="sg-notification-button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notificaciones"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>

            {notificationCount > 0 && (
              <span className="sg-notification-badge">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <button
                type="button"
                className="sg-notification-backdrop"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Cerrar notificaciones"
              />

              <div className="sg-notification-panel">
                <div className="sg-notification-heading">
                  <div>
                    <small>STORE GAMING</small>
                    <strong>NOTIFICACIONES</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="sg-mark-all"
                    onClick={() => void markAllNotificationsAsRead()}
                  >
                    Marcar todas como leídas
                  </button>
                )}

                <div className="sg-notification-list">
                  {notificationsLoading ? (
                    <div className="sg-notification-empty">
                      <span>🔔</span>
                      Cargando notificaciones...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="sg-notification-empty">
                      <span>🔔</span>
                      <strong>No tienes notificaciones</strong>
                      <p>Aquí aparecerán las novedades de tus pedidos y movimientos de saldo.</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`sg-notification-item ${notification.is_read ? "is-read" : "is-unread"}`}
                        onClick={() => {
                          if (!notification.is_read) {
                            void markNotificationAsRead(notification.id);
                          }
                        }}
                      >
                        <span className="sg-notification-icon">
                          {notification.is_read ? "✓" : "🔔"}
                        </span>

                        <span className="sg-notification-content">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>
                            {new Date(notification.created_at).toLocaleString("es-ES", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </small>
                        </span>

                        {!notification.is_read && <i />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="sg-content">
        {/* BIENVENIDA Y BILLETERA */}
        <section className="sg-welcome">
          <div className="sg-welcome-content">
            <div className="sg-welcome-badge">
              <span /> TU CENTRO GAMING
            </div>

            <p className="sg-welcome-small">¡BIENVENIDO DE NUEVO!</p>

            <h1>
              STORE <span>GAMING</span>
            </h1>

            <p className="sg-welcome-user">
              HOLA, <strong>@{username}</strong>
            </p>

            <p className="sg-welcome-description">
              Todo lo que necesitas para tus juegos favoritos está aquí.
              Explora nuestros servicios y disfruta de tu experiencia gaming.
            </p>

            <p className="sg-welcome-guide-hint">
              ¿NO SABES CÓMO UTILIZAR STORE GAMING? PRESIONA EL BOTÓN Y CONSULTA TUS DUDAS.
            </p>

            <button
              type="button"
              className="sg-welcome-button"
              onClick={() => setGuideOpen(true)}
            >
              CÓMO USAR STORE GAMING <span>→</span>
            </button>
          </div>

          <div className="sg-welcome-decoration">
            <div className="sg-decoration-ring" />
            <div className="sg-decoration-core">SG</div>
            <span className="sg-decoration-plus plus-one">+</span>
            <span className="sg-decoration-plus plus-two">✦</span>
          </div>
        </section>

        {/* SALDO */}
        <section className="sg-balance-card">
          <div className="sg-balance-info">
            <div className="sg-balance-icon">▣</div>
            <div>
              <small>SALDO DISPONIBLE</small>
              <strong>${deposited.toFixed(2)}</strong>
              <span>Tu billetera STORE GAMING</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goTo("/balance")}
          >
            <span>＋</span> DEPOSITAR
          </button>
        </section>

        {/* BUSCADOR */}
        <section className="sg-search-section">
          <div className="sg-section-heading">
            <div>
              <span className="sg-section-kicker">ENCUENTRA TU JUEGO</span>
              <h2>¿QUÉ VAMOS A RECARGAR?</h2>
            </div>
            <span className="sg-heading-icon">⌕</span>
          </div>

          <div className="sg-search-box">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar Free Fire, Genshin, Mobile Legends..."
              aria-label="Buscar juegos"
              autoComplete="off"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* JUEGOS DESTACADOS */}
        {!search.trim() && (
          <section className="sg-featured-section">
            <div className="sg-section-heading">
              <div>
                <span className="sg-section-kicker">SELECCIÓN GAMING</span>
                <h2>JUEGOS DESTACADOS</h2>
              </div>
              <span className="sg-featured-label">TOP GAMES</span>
            </div>

            <div className="sg-featured-track" ref={featuredTrackRef}>
              {games.slice(0, 6).map((game) => (
                <button
                  key={game.name}
                  type="button"
                  className="sg-featured-card"
                  onClick={() => goTo(game.route)}
                >
                  <img src={game.image} alt={game.name} />
                  <span className="sg-featured-overlay" />
                  <span className="sg-featured-tag">{game.tag}</span>
                  <span className="sg-featured-info">
                    <strong>{game.name}</strong>
                    <small>VER PRODUCTOS →</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CATÁLOGO COMPLETO */}
        <section className="sg-catalog-section">
          <div className="sg-section-heading">
            <div>
              <span className="sg-section-kicker">CATÁLOGO STORE GAMING</span>
              <h2>{search.trim() ? "RESULTADOS" : "TODOS LOS JUEGOS"}</h2>
            </div>
            <span className="sg-game-count">
              {filteredGames.length} JUEGOS
            </span>
          </div>

          {filteredGames.length > 0 ? (
            <div className="sg-games-grid" ref={gamesTrackRef}>
              {filteredGames.map((game) => (
                <button
                  key={game.name}
                  type="button"
                  className="sg-game-card"
                  onClick={() => goTo(game.route)}
                >
                  <div className="sg-game-image">
                    <img src={game.image} alt={game.name} loading="lazy" />
                    <span className="sg-game-image-overlay" />
                    <span className="sg-game-tag">{game.tag}</span>
                    <span className="sg-game-arrow">↗</span>
                  </div>

                  <div className="sg-game-details">
                    <strong>{game.name}</strong>
                    <p>{game.description}</p>
                    <span className="sg-game-action">
                      VER SERVICIO <b>→</b>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="sg-no-results">
              <span>⌕</span>
              <strong>NO ENCONTRAMOS ESE JUEGO</strong>
              <p>Prueba con otro nombre o revisa la escritura.</p>
              <button type="button" onClick={() => setSearch("")}>
                VER TODOS LOS JUEGOS
              </button>
            </div>
          )}
        </section>

        {/* ACCESOS RÁPIDOS */}
        <section className="sg-shortcuts-section">
          <div className="sg-section-heading">
            <div>
              <span className="sg-section-kicker">ACCESO DIRECTO</span>
              <h2>TUS ACCESOS RÁPIDOS</h2>
            </div>
            <span className="sg-heading-icon">⌁</span>
          </div>

          <div className="sg-shortcuts-grid">
            <button type="button" onClick={() => goTo("/balance")}>
              <span className="sg-shortcut-icon">＋</span>
              <strong>DEPOSITAR</strong>
              <small>Añadir saldo</small>
            </button>

            <button type="button" onClick={() => goTo("/orders")}>
              <span className="sg-shortcut-icon">▤</span>
              <strong>HISTORIAL</strong>
              <small>Mis pedidos</small>
            </button>

            <button type="button" onClick={() => goTo("/support")}>
              <span className="sg-shortcut-icon">♧</span>
              <strong>SOPORTE</strong>
              <small>Centro de ayuda</small>
            </button>

            <button type="button" onClick={() => goTo("/referidos")}>
              <span className="sg-shortcut-icon">♙</span>
              <strong>REFERIDOS</strong>
              <small>Invita y gana</small>
            </button>

            <button type="button" onClick={() => goTo("/profile")}>
              <span className="sg-shortcut-icon">♙</span>
              <strong>PERFIL</strong>
              <small>Mi cuenta</small>
            </button>
          </div>
        </section>

        {/* REFERIDOS */}
        <section className="sg-referral">
          <div className="sg-referral-content">
            <span className="sg-referral-label">PROGRAMA DE REFERIDOS</span>
            <h2>¡INVITA Y GANA!</h2>
            <strong>GANA 0.10 POR CADA AMIGO</strong>
            <p>
              Comparte tu enlace de STORE GAMING. Cuando tu referido complete
              su primera compra válida, recibirás 0.10 de saldo en tu billetera.
            </p>
            <button type="button" onClick={() => goTo("/referidos")}>
              VER MIS REFERIDOS <span>→</span>
            </button>
          </div>
        </section>

        {/* OTROS SERVICIOS */}
        <section className="sg-other-services">
          <div className="sg-section-heading">
            <div>
              <span className="sg-section-kicker">MÁS OPCIONES</span>
              <h2>OTROS SERVICIOS</h2>
            </div>
          </div>

          <div className="sg-other-grid">
            <button type="button" onClick={() => goTo("/gift-cards")}>
              <span>🎁</span>
              <strong>TARJETAS DE REGALO</strong>
              <b>→</b>
            </button>

            <button type="button" onClick={() => goTo("/telegram-stars")}>
              <span>⭐</span>
              <strong>ESTRELLAS DE TELEGRAM</strong>
              <b>→</b>
            </button>

            <button type="button" onClick={() => goTo("/transfers")}>
              <span>⇄</span>
              <strong>TRANSFERENCIAS</strong>
              <b>→</b>
            </button>

            <button type="button" onClick={() => goTo("/ajustes")}>
              <span>⚙</span>
              <strong>AJUSTES DE CUENTA</strong>
              <b>→</b>
            </button>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section className="sg-benefits">
          <div>
            <span>⚡</span>
            <div>
              <strong>ENTREGA RÁPIDA</strong>
              <p>Procesamos tus pedidos rápidamente.</p>
            </div>
          </div>

          <div>
            <span>🛡️</span>
            <div>
              <strong>COMPRA SEGURA</strong>
              <p>Tu pedido queda registrado.</p>
            </div>
          </div>
        </section>
      </div>

      {guideOpen && (
        <div
          className="sg-guide-overlay"
          role="presentation"
          onClick={() => setGuideOpen(false)}
        >
          <section
            className="sg-guide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sg-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sg-guide-header">
              <div>
                <small>CENTRO DE AYUDA · STORE GAMING</small>
                <h2 id="sg-guide-title">¿CÓMO USAR STORE GAMING?</h2>
                <p>Una guía rápida para conocer las principales opciones de tu cuenta.</p>
              </div>
              <button
                type="button"
                className="sg-guide-close"
                onClick={() => setGuideOpen(false)}
                aria-label="Cerrar guía"
              >
                ×
              </button>
            </div>

            <div className="sg-guide-list">
              <article className="sg-guide-item">
                <span>01</span>
                <div><strong>CREA TU CUENTA</strong><p>Regístrate con tu correo y contraseña. Después inicia sesión para entrar a tu cuenta.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>02</span>
                <div><strong>RECARGA TU BILLETERA</strong><p>Entra en Billetera o pulsa Depositar. Revisa los métodos disponibles y sigue las instrucciones para añadir saldo.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>03</span>
                <div><strong>COMPRA RECARGAS TOP UP</strong><p>Selecciona un juego, elige el paquete que deseas, completa los datos solicitados y confirma tu pedido.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>04</span>
                <div><strong>COMPRA TARJETAS DE REGALO</strong><p>Abre Tarjetas de regalo, selecciona el producto y comprueba que la región sea la correcta antes de continuar.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>05</span>
                <div><strong>CONSULTA TUS PEDIDOS</strong><p>En Mis pedidos o Historial puedes revisar los detalles y el estado de tus compras.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>06</span>
                <div><strong>OTROS SERVICIOS</strong><p>Desde el menú puedes acceder a Estrellas de Telegram, Transferencias y las demás opciones disponibles.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>07</span>
                <div><strong>REFERIDOS</strong><p>En Referidos consulta tu enlace, las condiciones del programa y las recompensas disponibles.</p></div>
              </article>
              <article className="sg-guide-item">
                <span>08</span>
                <div><strong>AJUSTES Y API</strong><p>En Ajustes puedes revisar las opciones de tu cuenta y las herramientas que estén habilitadas para ti. Mantén privadas tus claves API.</p></div>
              </article>
            </div>

            <div className="sg-guide-footer">
              <p>¿No encuentras lo que necesitas? Nuestro apartado de Soporte está disponible para ayudarte.</p>
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  goTo("/support");
                }}
              >
                CONTACTAR SOPORTE <span>→</span>
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="sg-footer">
        <div className="sg-footer-brand">
          <span>STORE</span> GAMING
        </div>
        <p>TU MEJOR OPCIÓN PARA RECARGAS GAMING</p>
        <small>© 2026 STORE GAMING</small>
      </footer>

      <style jsx global>{`
        .sg-home {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(130, 0, 15, .16), transparent 42%),
            linear-gradient(rgba(5, 6, 10, .94), rgba(5, 6, 10, .98)),
            url("/images/battle-royale-bg.jpg") center / cover fixed;
          overflow-x: hidden;
          font-family: Arial, Helvetica, sans-serif;
          padding-bottom: 1px;
        }

        .sg-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #07080c;
          color: white;
        }

        .sg-loading-logo {
          font-size: 26px;
          font-weight: 1000;
          letter-spacing: 2px;
        }

        .sg-loading-logo span,
        .sg-header-brand span,
        .sg-footer-brand span {
          color: #ff293b;
        }

        .sg-loading-line {
          width: 150px;
          height: 3px;
          margin-top: 20px;
          border-radius: 20px;
          background: linear-gradient(90deg, transparent, #ed1428, transparent);
          animation: sg-loading 1.3s infinite;
        }

        .sg-loading p {
          color: #858b99;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-top: 16px;
        }

        @keyframes sg-loading {
          0% { opacity: .25; transform: scaleX(.5); }
          50% { opacity: 1; transform: scaleX(1); }
          100% { opacity: .25; transform: scaleX(.5); }
        }

        .sg-header {
          height: 65px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(7, 8, 12, .91);
          border-bottom: 1px solid rgba(255, 255, 255, .07);
          backdrop-filter: blur(18px);
        }

        .sg-header-left,
        .sg-header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .sg-menu-button {
          width: 40px;
          height: 40px;
          border: 1px solid rgba(255, 255, 255, .11);
          border-radius: 11px;
          background: rgba(255, 255, 255, .045);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
        }

        .sg-menu-button span {
          width: 17px;
          height: 2px;
          border-radius: 4px;
          background: #fff;
        }

        .sg-menu-button span:first-child {
          background: #ff3547;
        }

        .sg-header-brand {
          font-size: 15px;
          font-weight: 1000;
          letter-spacing: 1.5px;
        }

        .sg-notification-button {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, .11);
          border-radius: 11px;
          background: rgba(255, 255, 255, .045);
          cursor: pointer;
        }

        .sg-notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #ed1428;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          border: 2px solid #08090d;
        }

        .sg-content {
          width: min(1120px, calc(100% - 28px));
          margin: 0 auto;
        }

        .sg-welcome {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-height: 235px;
          margin: 23px 0 14px;
          padding: clamp(23px, 5vw, 39px);
          display: flex;
          align-items: center;
          border: 1px solid rgba(255, 49, 67, .36);
          border-radius: 19px;
          background:
            linear-gradient(90deg, rgba(8, 7, 11, .96) 0%, rgba(14, 7, 11, .86) 58%, rgba(10, 6, 9, .55) 100%),
            url("/bienvenida-store-gaming.png") center / cover no-repeat;
          box-shadow: 0 15px 45px rgba(0, 0, 0, .36), inset 0 0 35px rgba(229, 9, 20, .07);
        }

        .sg-welcome::before {
          content: "";
          position: absolute;
          z-index: -1;
          width: 300px;
          height: 300px;
          right: 5%;
          top: -100px;
          border-radius: 50%;
          background: rgba(229, 9, 20, .12);
          filter: blur(60px);
        }

        .sg-welcome-content {
          max-width: 620px;
          position: relative;
          z-index: 2;
        }

        .sg-welcome-badge {
          width: fit-content;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid rgba(255, 65, 81, .34);
          border-radius: 30px;
          background: rgba(229, 9, 20, .12);
          color: #ff8b96;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }

        .sg-welcome-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3547;
          box-shadow: 0 0 10px #ff3547;
        }

        .sg-welcome-small {
          margin: 0 0 5px;
          color: #d0c4c7;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .sg-welcome h1 {
          margin: 0;
          font-size: clamp(31px, 6vw, 52px);
          line-height: 1.08;
          font-weight: 1000;
          letter-spacing: -1.8px;
        }

        .sg-welcome h1 span {
          color: #ff293d;
          text-shadow: 0 0 25px rgba(255, 25, 48, .25);
        }

        .sg-welcome-user {
          margin: 12px 0 0;
          color: #b5b8c1;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .sg-welcome-user strong {
          color: #ff6977;
        }

        .sg-welcome-description {
          max-width: 450px;
          margin: 13px 0 17px;
          color: #c3c3ca;
          font-size: 12px;
          line-height: 1.8;
        }

        .sg-welcome-guide-hint {
          max-width: 440px;
          margin: 0 0 9px;
          color: #ffd0d5;
          font-size: 9px;
          font-weight: 900;
          line-height: 1.55;
          letter-spacing: .35px;
        }

        .sg-welcome-button {
          display: inline-flex;
          align-items: center;
          gap: 17px;
          padding: 12px 17px;
          border: 1px solid rgba(255, 255, 255, .17);
          border-radius: 9px;
          background: linear-gradient(135deg, #f32639, #a80013);
          color: #fff;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .7px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(229, 9, 20, .2);
          transition: transform .2s, box-shadow .2s;
        }

        .sg-welcome-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 25px rgba(229, 9, 20, .3);
        }

        .sg-welcome-button span {
          font-size: 16px;
        }

        .sg-welcome-decoration {
          position: absolute;
          right: 8%;
          top: 50%;
          width: 190px;
          height: 190px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: .8;
        }

        .sg-decoration-ring {
          position: absolute;
          width: 175px;
          height: 175px;
          border: 1px solid rgba(255, 56, 74, .3);
          border-radius: 50%;
          box-shadow: 0 0 35px rgba(229, 9, 20, .12), inset 0 0 35px rgba(229, 9, 20, .08);
        }

        .sg-decoration-ring::before,
        .sg-decoration-ring::after {
          content: "";
          position: absolute;
          inset: 15px;
          border: 1px dashed rgba(255, 70, 85, .3);
          border-radius: 50%;
        }

        .sg-decoration-ring::after {
          inset: 33px;
          border-style: solid;
          border-color: rgba(255, 255, 255, .08);
        }

        .sg-decoration-core {
          width: 95px;
          height: 95px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 68, 83, .45);
          border-radius: 25px;
          background: linear-gradient(145deg, #291016, #100a0e);
          color: #ff394b;
          font-size: 32px;
          font-weight: 1000;
          transform: rotate(-8deg);
          box-shadow: 0 0 35px rgba(229, 9, 20, .2);
        }

        .sg-decoration-plus {
          position: absolute;
          color: #ff5666;
          font-size: 24px;
        }

        .plus-one { top: 5px; right: 18px; }
        .plus-two { bottom: 14px; left: 8px; }

        .sg-balance-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 0 0 31px;
          padding: 17px 20px;
          border: 1px solid rgba(255, 48, 67, .28);
          border-radius: 15px;
          background: linear-gradient(110deg, rgba(49, 10, 18, .88), rgba(17, 13, 18, .96) 65%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
        }

        .sg-balance-info {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .sg-balance-icon {
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 65, 82, .25);
          border-radius: 12px;
          background: rgba(229, 9, 20, .13);
          color: #ff5968;
          font-size: 24px;
        }

        .sg-balance-info div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sg-balance-info small {
          color: #a9a1a7;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .sg-balance-info strong {
          color: #fff;
          font-size: clamp(20px, 4vw, 27px);
          font-weight: 1000;
        }

        .sg-balance-info span {
          color: #89828a;
          font-size: 9px;
        }

        .sg-balance-card > button {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 15px;
          border: 1px solid rgba(255, 255, 255, .15);
          border-radius: 9px;
          background: linear-gradient(135deg, #f32639, #a90014);
          color: #fff;
          font-size: 10px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sg-balance-card > button span {
          font-size: 17px;
        }

        .sg-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .sg-section-kicker {
          color: #ff5363;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1.6px;
        }

        .sg-section-heading h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: clamp(16px, 3vw, 20px);
          font-weight: 1000;
          letter-spacing: -.3px;
        }

        .sg-heading-icon {
          color: #ff3d50;
          font-size: 29px;
          line-height: 1;
        }

        .sg-search-section {
          margin-bottom: 32px;
        }

        .sg-search-box {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 17px;
          border: 1px solid rgba(255, 55, 73, .42);
          border-radius: 12px;
          background: linear-gradient(110deg, rgba(26, 15, 19, .96), rgba(12, 13, 18, .97));
          box-shadow: 0 0 25px rgba(229, 9, 20, .07), inset 0 1px 0 rgba(255,255,255,.04);
        }

        .sg-search-box > span {
          color: #ff5363;
          font-size: 27px;
          line-height: 1;
        }

        .sg-search-box input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 12px;
        }

        .sg-search-box input::placeholder {
          color: #777780;
        }

        .sg-search-box input::-webkit-search-cancel-button {
          display: none;
        }

        .sg-search-box button {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border: 0;
          border-radius: 7px;
          background: rgba(255, 255, 255, .08);
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .sg-featured-section {
          margin-bottom: 34px;
        }

        .sg-featured-label,
        .sg-game-count {
          padding: 7px 10px;
          border: 1px solid rgba(255, 61, 80, .25);
          border-radius: 6px;
          background: rgba(229, 9, 20, .09);
          color: #ff6977;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .sg-featured-track {
          display: flex;
          gap: 13px;
          overflow-x: auto;
          padding: 2px 2px 13px;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          scrollbar-color: #7f1825 #151116;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
        }

        .sg-featured-card {
          position: relative;
          overflow: hidden;
          flex: 0 0 210px;
          height: 245px;
          padding: 0;
          border: 1px solid rgba(255, 255, 255, .12);
          border-radius: 14px;
          background: #171116;
          text-align: left;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform .2s, border-color .2s;
        }

        .sg-featured-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 55, 75, .7);
        }

        .sg-featured-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .35s;
        }

        .sg-featured-card:hover img {
          transform: scale(1.06);
        }

        .sg-featured-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.9) 100%);
        }

        .sg-featured-tag,
        .sg-game-tag {
          position: absolute;
          top: 11px;
          left: 11px;
          padding: 6px 8px;
          border: 1px solid rgba(255, 80, 94, .45);
          border-radius: 5px;
          background: rgba(100, 5, 17, .83);
          color: #fff;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .7px;
        }

        .sg-featured-info {
          position: absolute;
          left: 13px;
          right: 13px;
          bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .sg-featured-info strong {
          color: #fff;
          font-size: 12px;
          font-weight: 1000;
        }

        .sg-featured-info small {
          color: #ff7884;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .sg-catalog-section {
          margin-bottom: 34px;
        }

        .sg-games-grid {
          display: flex;
          gap: 13px;
          overflow-x: auto;
          padding: 2px 2px 13px;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: #7f1825 #151116;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
        }

        .sg-game-card {
          flex: 0 0 220px;
          min-width: 0;
          overflow: hidden;
          padding: 0;
          border: 1px solid rgba(255, 255, 255, .09);
          border-radius: 13px;
          background: linear-gradient(150deg, #17141a, #0e0d12);
          color: #fff;
          text-align: left;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform .2s, border-color .2s, box-shadow .2s;
        }

        .sg-game-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 49, 68, .58);
          box-shadow: 0 10px 25px rgba(0, 0, 0, .3), 0 0 17px rgba(229, 9, 20, .08);
        }

        .sg-game-image {
          height: 145px;
          position: relative;
          overflow: hidden;
          background: #171116;
        }

        .sg-game-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .35s;
        }

        .sg-game-card:hover .sg-game-image img {
          transform: scale(1.07);
        }

        .sg-game-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.24));
        }

        .sg-game-arrow {
          position: absolute;
          right: 10px;
          bottom: 10px;
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, .22);
          border-radius: 8px;
          background: rgba(0, 0, 0, .55);
          color: #fff;
          font-size: 15px;
        }

        .sg-game-details {
          padding: 12px 12px 13px;
        }

        .sg-game-details > strong {
          display: block;
          min-height: 30px;
          color: #fff;
          font-size: 10px;
          line-height: 1.5;
          font-weight: 1000;
        }

        .sg-game-details p {
          min-height: 28px;
          margin: 5px 0 10px;
          color: #92909a;
          font-size: 9px;
          line-height: 1.5;
        }

        .sg-game-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 9px;
          border-top: 1px solid rgba(255, 255, 255, .07);
          color: #ff6674;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .8px;
        }

        .sg-game-action b {
          font-size: 14px;
        }

        .sg-no-results {
          padding: 35px 15px;
          border: 1px dashed rgba(255, 255, 255, .15);
          border-radius: 14px;
          background: rgba(255, 255, 255, .025);
          text-align: center;
        }

        .sg-no-results > span {
          display: block;
          color: #ff5363;
          font-size: 37px;
        }

        .sg-no-results strong {
          display: block;
          margin-top: 10px;
          font-size: 12px;
        }

        .sg-no-results p {
          color: #92909a;
          font-size: 11px;
        }

        .sg-no-results button {
          margin-top: 8px;
          padding: 10px 15px;
          border: 0;
          border-radius: 7px;
          background: #c81022;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .sg-shortcuts-section {
          margin-bottom: 32px;
        }

        .sg-shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 11px;
        }

        .sg-shortcuts-grid button {
          min-width: 0;
          min-height: 115px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 7px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, .09);
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(28, 18, 23, .96), rgba(13, 13, 18, .96));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: border-color .2s, transform .2s;
        }

        .sg-shortcuts-grid button:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 60, 77, .55);
        }

        .sg-shortcut-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 58, 77, .25);
          border-radius: 9px;
          background: rgba(229, 9, 20, .13);
          color: #ff5968;
          font-size: 22px;
        }

        .sg-shortcuts-grid strong {
          font-size: 9px;
          font-weight: 1000;
        }

        .sg-shortcuts-grid small {
          color: #8e8992;
          font-size: 9px;
        }

        .sg-referral {
          min-height: 205px;
          display: flex;
          align-items: center;
          margin-bottom: 32px;
          padding: 24px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, .13);
          border-radius: 16px;
          background:
            linear-gradient(90deg, rgba(7, 8, 12, .94), rgba(7, 8, 12, .69)),
            url("/referidos-banner.jpg") center / cover no-repeat;
        }

        .sg-referral-content {
          max-width: 580px;
          position: relative;
          z-index: 1;
        }

        .sg-referral-label {
          display: inline-block;
          padding: 6px 9px;
          border: 1px solid rgba(255, 67, 83, .35);
          border-radius: 20px;
          background: rgba(229, 9, 20, .13);
          color: #ff7b87;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .sg-referral h2 {
          margin: 12px 0 5px;
          color: #fff;
          font-size: clamp(24px, 5vw, 34px);
          font-weight: 1000;
        }

        .sg-referral-content > strong {
          color: #ff6674;
          font-size: 13px;
          font-weight: 1000;
        }

        .sg-referral p {
          max-width: 460px;
          color: #c1bbc1;
          font-size: 11px;
          line-height: 1.7;
        }

        .sg-referral button {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          padding: 11px 15px;
          border: 1px solid rgba(255, 255, 255, .17);
          border-radius: 8px;
          background: linear-gradient(135deg, #e91b30, #a80014);
          color: #fff;
          font-size: 9px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sg-other-services {
          margin-bottom: 30px;
        }

        .sg-other-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .sg-other-grid button {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, .08);
          border-radius: 10px;
          background: rgba(18, 17, 22, .9);
          color: #fff;
          text-align: left;
          cursor: pointer;
        }

        .sg-other-grid button > span {
          font-size: 20px;
        }

        .sg-other-grid strong {
          flex: 1;
          font-size: 9px;
          font-weight: 900;
        }

        .sg-other-grid b {
          color: #ff5968;
        }

        .sg-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 11px;
          margin: 0 0 28px;
        }

        .sg-benefits > div {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 11px;
          background: rgba(17, 17, 22, .8);
        }

        .sg-benefits > div > span {
          font-size: 23px;
        }

        .sg-benefits strong {
          color: #fff;
          font-size: 9px;
          font-weight: 1000;
        }

        .sg-benefits p {
          margin: 5px 0 0;
          color: #8f8b95;
          font-size: 9px;
          line-height: 1.5;
        }

        .sg-footer {
          padding: 24px 12px;
          border-top: 1px solid rgba(255, 255, 255, .06);
          background: rgba(4, 5, 8, .65);
          text-align: center;
        }

        .sg-footer-brand {
          color: #fff;
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: 1.4px;
        }

        .sg-footer p {
          color: #8f8992;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .sg-footer small {
          color: #65616a;
          font-size: 9px;
        }

        /* GUÍA DE USO */
        .sg-guide-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          background: rgba(0, 0, 0, .82);
          backdrop-filter: blur(8px);
        }

        .sg-guide-modal {
          width: min(690px, 100%);
          max-height: min(84vh, 760px);
          overflow-y: auto;
          padding: 19px;
          border: 1px solid rgba(255, 55, 73, .36);
          border-radius: 16px;
          background: linear-gradient(145deg, #191016, #090a0f 72%);
          box-shadow: 0 25px 80px rgba(0, 0, 0, .7);
        }

        .sg-guide-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, .08);
        }

        .sg-guide-header small {
          color: #ff6877;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1.5px;
        }

        .sg-guide-header h2 {
          margin: 7px 0 5px;
          color: #fff;
          font-size: clamp(18px, 4vw, 24px);
          font-weight: 1000;
        }

        .sg-guide-header p,
        .sg-guide-footer p {
          margin: 0;
          color: #aaa3ad;
          font-size: 10px;
          line-height: 1.6;
        }

        .sg-guide-close {
          flex: 0 0 32px;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, .13);
          border-radius: 8px;
          background: rgba(255, 255, 255, .05);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
        }

        .sg-guide-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          padding: 15px 0;
        }

        .sg-guide-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
          padding: 11px;
          border: 1px solid rgba(255, 255, 255, .075);
          border-radius: 10px;
          background: rgba(255, 255, 255, .035);
        }

        .sg-guide-item > span {
          flex: 0 0 27px;
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 57, 76, .3);
          border-radius: 8px;
          background: rgba(229, 9, 20, .13);
          color: #ff6877;
          font-size: 9px;
          font-weight: 1000;
        }

        .sg-guide-item div { min-width: 0; }
        .sg-guide-item strong {
          color: #fff;
          font-size: 9px;
          font-weight: 1000;
        }

        .sg-guide-item p {
          margin: 5px 0 0;
          color: #aaa4ad;
          font-size: 9px;
          line-height: 1.6;
        }

        .sg-guide-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 13px;
          border-top: 1px solid rgba(255, 255, 255, .08);
        }

        .sg-guide-footer p { max-width: 330px; }

        .sg-guide-footer button {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, .14);
          border-radius: 8px;
          background: linear-gradient(135deg, #f32639, #a80013);
          color: #fff;
          font-size: 9px;
          font-weight: 1000;
          cursor: pointer;
        }

        /* MENÚ LATERAL */
        .sg-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 49;
          border: 0;
          background: rgba(0, 0, 0, .7);
          backdrop-filter: blur(3px);
        }

        .sg-sidebar {
          position: fixed;
          z-index: 50;
          top: 0;
          bottom: 0;
          left: 0;
          width: min(310px, 86vw);
          display: flex;
          flex-direction: column;
          padding: 18px 15px;
          border-right: 1px solid rgba(255, 54, 72, .2);
          background:
            linear-gradient(180deg, rgba(13, 9, 13, .98), rgba(5, 6, 10, .99)),
            url("/images/battle-royale-bg.jpg") center / cover;
          box-shadow: 20px 0 55px rgba(0, 0, 0, .5);
          animation: sg-menu-in .22s ease-out;
        }

        @keyframes sg-menu-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .sg-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, .08);
        }

        .sg-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sg-brand-symbol {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 58, 76, .5);
          border-radius: 10px;
          background: rgba(229, 9, 20, .15);
          color: #ff4255;
          font-size: 21px;
          font-weight: 1000;
        }

        .sg-brand div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sg-brand small {
          color: #ff5968;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .sg-brand strong {
          color: #fff;
          font-size: 16px;
          letter-spacing: 1px;
        }

        .sg-close-menu {
          width: 33px;
          height: 33px;
          border: 1px solid rgba(255, 255, 255, .1);
          border-radius: 8px;
          background: rgba(255, 255, 255, .05);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
        }

        .sg-sidebar-user {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 17px 0;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, .08);
          border-radius: 11px;
          background: rgba(255, 255, 255, .035);
        }

        .sg-sidebar-avatar {
          width: 37px;
          height: 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(229, 9, 20, .16);
          font-size: 19px;
        }

        .sg-sidebar-user div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .sg-sidebar-user small {
          color: #ff6573;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .sg-sidebar-user strong {
          overflow: hidden;
          color: #fff;
          font-size: 11px;
          text-overflow: ellipsis;
        }

        .sg-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 15px;
        }

        .sg-menu-label {
          margin: 18px 8px 8px;
          color: #77717a;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 1.8px;
        }

        .sg-menu-item {
          width: 100%;
          min-height: 43px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 3px 0;
          padding: 9px 11px;
          border: 1px solid transparent;
          border-radius: 9px;
          background: transparent;
          color: #c8c3cb;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: .18s;
        }

        .sg-menu-item:hover,
        .sg-menu-active {
          border-color: rgba(255, 52, 70, .2);
          background: rgba(229, 9, 20, .12);
          color: #fff;
        }

        .sg-menu-item svg {
          flex-shrink: 0;
          color: #ff5968;
        }

        .sg-menu-item span {
          flex: 1;
        }

        .sg-menu-item b {
          color: #ff5968;
          font-size: 19px;
          font-weight: 400;
        }

        .sg-menu-item em {
          min-width: 21px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border-radius: 20px;
          background: #e50920;
          color: #fff;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
        }

        .sg-sidebar-bottom {
          padding-top: 13px;
          border-top: 1px solid rgba(255, 255, 255, .08);
        }

        .sg-sidebar-bottom button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid rgba(255, 50, 68, .2);
          border-radius: 9px;
          background: rgba(229, 9, 20, .1);
          color: #ff7581;
          font-size: 10px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sg-sidebar-bottom button span {
          font-size: 18px;
        }

        /* NOTIFICACIONES */
        .sg-notification-backdrop {
          position: fixed;
          inset: 0;
          z-index: 31;
          border: 0;
          background: transparent;
        }

        .sg-notification-panel {
          position: absolute;
          z-index: 32;
          top: 52px;
          right: 0;
          width: min(370px, calc(100vw - 25px));
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, .12);
          border-radius: 14px;
          background: #0e0e14;
          box-shadow: 0 18px 50px rgba(0, 0, 0, .65);
        }

        .sg-notification-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, .08);
          background: linear-gradient(100deg, rgba(229, 9, 20, .16), transparent);
        }

        .sg-notification-heading div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sg-notification-heading small {
          color: #ff5968;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .sg-notification-heading strong {
          color: #fff;
          font-size: 12px;
        }

        .sg-notification-heading button {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255, 255, 255, .12);
          border-radius: 7px;
          background: rgba(255, 255, 255, .05);
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .sg-mark-all {
          width: 100%;
          padding: 10px 12px;
          border: 0;
          border-bottom: 1px solid rgba(255, 255, 255, .07);
          background: transparent;
          color: #ff6977;
          text-align: right;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .sg-notification-list {
          max-height: 390px;
          overflow-y: auto;
        }

        .sg-notification-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          padding: 28px 16px;
          color: #b7b2bd;
          text-align: center;
          font-size: 11px;
        }

        .sg-notification-empty span {
          font-size: 25px;
        }

        .sg-notification-empty strong {
          color: #fff;
        }

        .sg-notification-empty p {
          margin: 0;
          line-height: 1.6;
        }

        .sg-notification-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 0;
          border-bottom: 1px solid rgba(255, 255, 255, .06);
          border-left: 3px solid transparent;
          background: rgba(255, 255, 255, .02);
          color: #fff;
          text-align: left;
          cursor: pointer;
        }

        .sg-notification-item.is-unread {
          border-left-color: #ed263a;
          background: rgba(229, 9, 20, .09);
        }

        .sg-notification-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(229, 9, 20, .13);
          font-size: 14px;
        }

        .sg-notification-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .sg-notification-content strong {
          font-size: 11px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .sg-notification-content > span {
          color: #b6b0ba;
          font-size: 10px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .sg-notification-content small {
          color: #77717d;
          font-size: 9px;
        }

        .sg-notification-item > i {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          margin-top: 5px;
          border-radius: 50%;
          background: #ff394c;
        }

        @media (max-width: 850px) {
          .sg-game-card {
            flex-basis: 205px;
          }

          .sg-welcome-decoration {
            right: 3%;
            opacity: .45;
          }
        }

        @media (max-width: 600px) {
          .sg-content {
            width: calc(100% - 22px);
          }

          .sg-header {
            height: 59px;
            padding: 0 12px;
          }

          .sg-welcome {
            min-height: 220px;
            margin-top: 14px;
            padding: 21px 17px;
            background-position: 58% center;
          }

          .sg-welcome-decoration {
            right: -55px;
            opacity: .2;
          }

          .sg-welcome h1 {
            font-size: clamp(29px, 9vw, 42px);
          }

          .sg-welcome-description {
            max-width: 300px;
            font-size: 11px;
          }

          .sg-balance-card {
            padding: 13px;
          }

          .sg-balance-icon {
            width: 39px;
            height: 39px;
          }

          .sg-balance-card > button {
            padding: 10px 11px;
            font-size: 9px;
          }

          .sg-search-section {
            margin-bottom: 26px;
          }

          .sg-search-box {
            height: 51px;
            padding: 0 12px;
          }

          .sg-search-box input {
            font-size: 11px;
          }

          .sg-featured-card {
            flex-basis: 175px;
            height: 215px;
          }

          .sg-games-grid {
            gap: 10px;
          }

          .sg-game-card {
            flex-basis: 175px;
          }

          .sg-game-image {
            height: 125px;
          }

          .sg-game-details {
            padding: 10px;
          }

          .sg-game-details > strong {
            font-size: 9px;
          }

          .sg-game-details p {
            font-size: 8px;
          }

          .sg-shortcuts-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .sg-shortcuts-grid button {
            min-height: 105px;
            padding: 10px;
          }

          .sg-shortcuts-grid strong {
            font-size: 8px;
          }

          .sg-referral {
            min-height: 205px;
            padding: 19px 16px;
            background-position: 60% center;
          }

          .sg-referral p {
            font-size: 10px;
          }

          .sg-other-grid {
            gap: 8px;
          }

          .sg-other-grid button {
            gap: 7px;
            padding: 11px 9px;
          }

          .sg-other-grid strong {
            font-size: 8px;
          }

          .sg-benefits {
            gap: 8px;
          }

          .sg-benefits > div {
            gap: 8px;
            padding: 10px 8px;
          }

          .sg-benefits > div > span {
            font-size: 19px;
          }

          .sg-benefits strong {
            font-size: 8px;
          }

          .sg-benefits p {
            font-size: 8px;
          }
        }

        @media (max-width: 600px) {
          .sg-guide-modal {
            padding: 14px;
            max-height: 88vh;
          }

          .sg-guide-list {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .sg-guide-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .sg-guide-footer button {
            justify-content: center;
          }
        }

        @media (max-width: 360px) {
          .sg-shortcuts-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sg-game-image {
            height: 110px;
          }

          .sg-balance-info {
            gap: 8px;
          }

          .sg-balance-info strong {
            font-size: 19px;
          }
        }
      `}</style>
    </main>
  );
}
