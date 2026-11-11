
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  balance: number | string | null;
  vip_started_at: string | null;
  vip_expires_at: string | null;
};

type ActivationResult = {
  success?: boolean;
  error?: string;
  message?: string;
  payment_id?: string;
  vip_started_at?: string;
  vip_expires_at?: string;
  balance?: number;
  created?: boolean;
};

const VIP_PRICE = 5;
const VIP_DAYS = 30;

function formatDate(value: string | null) {
  if (!value) return "No disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No disponible";

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function createIdempotencyKey() {
  return crypto.randomUUID();
}

export default function VipPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const balance = Number(profile?.balance ?? 0);

  const vipActive =
    !!profile?.vip_expires_at &&
    new Date(profile.vip_expires_at).getTime() > Date.now();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("balance, vip_started_at, vip_expires_at")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      setProfile(data as Profile);

      // Recuperar una operación pendiente si se recargó la página.
      const savedKey = localStorage.getItem(
        `store-gaming-vip-pending:${session.user.id}`
      );

      setPendingKey(savedKey);
    } catch (err) {
      console.error("VIP profile error:", err);
      setError("No se pudo cargar tu información. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function activateVip() {
    if (activating || !profile) return;

    if (balance < VIP_PRICE) {
      setError("No tienes suficientes créditos para activar VIP.");
      setConfirming(false);
      return;
    }

    setActivating(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user || !session.access_token) {
        router.replace("/");
        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
      }

      const storageKey = `store-gaming-vip-pending:${session.user.id}`;

      // La misma clave se conserva para que un reintento
      // no pueda generar un segundo cobro.
      let key = pendingKey;

      if (!key) {
        key = createIdempotencyKey();
        localStorage.setItem(storageKey, key);
        setPendingKey(key);
      }

      const response = await fetch("/api/vip/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          idempotencyKey: key,
        }),
        cache: "no-store",
      });

      let result: ActivationResult;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "El servidor respondió de forma inesperada. Puedes reintentar sin generar otro cobro."
        );
      }

      if (!response.ok || !result.success) {
        const messages: Record<string, string> = {
          INSUFFICIENT_BALANCE:
            "No tienes suficientes créditos para activar VIP.",
          PROFILE_NOT_FOUND:
            "No encontramos tu perfil de STORE GAMING.",
          INVALID_SESSION:
            "Tu sesión ha expirado. Inicia sesión nuevamente.",
          INVALID_IDEMPOTENCY_KEY:
            "La clave de la operación no es válida. Actualiza la página.",
          IDEMPOTENCY_KEY_ALREADY_USED:
            "La clave de esta operación pertenece a otra operación.",
        };

        throw new Error(
          messages[result.error || ""] ||
            result.message ||
            "No se pudo completar la activación VIP. Puedes intentarlo nuevamente."
        );
      }

      // El servidor confirmó la operación.
      localStorage.removeItem(storageKey);
      setPendingKey(null);
      setConfirming(false);

      setSuccess(
        result.created === false
          ? "Esta operación ya estaba procesada. No se realizó otro cobro."
          : "¡Tu membresía VIP se ha activado correctamente!"
      );

      await loadProfile();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al activar VIP."
      );
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return (
      <main className="vip-loading">
        <div className="vip-spinner" />
        <p>CARGANDO STORE GAMING VIP...</p>

        <style jsx>{`
          .vip-loading {
            min-height: 100vh;
            background: #090909;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 18px;
            font-weight: 900;
            letter-spacing: 2px;
          }

          .vip-spinner {
            width: 38px;
            height: 38px;
            border: 3px solid #333;
            border-top-color: #ff2424;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="vip-page">
      <div className="vip-container">
        <button
          className="back-button"
          onClick={() => router.push("/profile")}
        >
          ← VOLVER AL PERFIL
        </button>

        <header className="vip-header">
          <div className="vip-logo">SG</div>
          <p>STORE GAMING PRESENTA</p>

          <h1>
            MEMBRESÍA <span>VIP</span>
          </h1>

          <p className="subtitle">ELEVA TU EXPERIENCIA GAMING</p>
        </header>

        <section className="vip-card">
          <div className="vip-card-top">
            <span>STORE GAMING</span>
            <span className="vip-star">★ VIP</span>
          </div>

          <div className="vip-price">
            <span>5.00</span>
            <small>CRÉDITOS / 30 DÍAS</small>
          </div>

          <div className="vip-separator" />

          <h2>VENTAJAS EXCLUSIVAS</h2>

          <div className="vip-benefits">
            <div>
              <span>✓</span>
              Descuentos exclusivos en productos seleccionados.
            </div>

            <div>
              <span>✓</span>
              Acceso a promociones especiales.
            </div>

            <div>
              <span>✓</span>
              Acceso a productos y ventajas VIP.
            </div>

            <div>
              <span>✓</span>
              Beneficios especiales para miembros.
            </div>
          </div>

          <div className="vip-status">
            <div>
              <small>ESTADO DE TU MEMBRESÍA</small>
              <strong className={vipActive ? "active" : ""}>
                {vipActive ? "★ VIP ACTIVO" : "SIN MEMBRESÍA ACTIVA"}
              </strong>
            </div>

            <div>
              <small>VENCIMIENTO</small>
              <strong>
                {formatDate(profile?.vip_expires_at || null)}
              </strong>
            </div>
          </div>

          <div className="vip-balance">
            <span>MI BALANCE</span>
            <strong>{balance.toFixed(2)} créditos</strong>
          </div>

          {error && (
            <div className="message error">
              {error}
              {!profile && (
                <button
                  className="retry-button"
                  onClick={loadProfile}
                >
                  VOLVER A INTENTAR
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="message success">{success}</div>
          )}

          {!confirming ? (
            <button
              className="activate-button"
              onClick={() => {
                setError("");
                setSuccess("");
                setConfirming(true);
              }}
              disabled={!profile || activating}
            >
              {vipActive
                ? "RENOVAR MEMBRESÍA VIP"
                : "ACTIVAR MEMBRESÍA VIP"}
              <span>→</span>
            </button>
          ) : (
            <div className="confirmation">
              <h3>CONFIRMAR OPERACIÓN</h3>

              <p>
                Se descontarán <strong>5.00 créditos</strong> de tu
                balance y se añadirán 30 días a tu membresía.
                {!vipActive &&
                  " La membresía comenzará desde el momento de la activación."}
              </p>

              <button
                className="confirm-button"
                onClick={activateVip}
                disabled={activating || !profile}
              >
                {activating ? "PROCESANDO..." : "CONFIRMAR Y PAGAR"}
              </button>

              <button
                className="cancel-button"
                onClick={() => setConfirming(false)}
                disabled={activating}
              >
                CANCELAR
              </button>
            </div>
          )}

          <p className="vip-terms">
            La membresía se paga con créditos de STORE GAMING.
            No existe renovación automática.
          </p>
        </section>

        <footer>
          © STORE GAMING · EXPERIENCIA GAMING PREMIUM
        </footer>
      </div>

      <style jsx>{`
        .vip-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 50% 0%, #421010 0%, transparent 45%),
            #090909;
          color: white;
          padding: 28px 16px 45px;
        }

        .vip-container {
          max-width: 540px;
          margin: auto;
        }

        .back-button {
          background: #181818;
          border: 1px solid #333;
          color: #ddd;
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .vip-header {
          text-align: center;
          padding: 30px 0 24px;
        }

        .vip-logo {
          width: 58px;
          height: 58px;
          margin: auto auto 12px;
          border: 2px solid #ff3030;
          color: #ff3030;
          display: grid;
          place-items: center;
          border-radius: 17px;
          font-weight: 1000;
          font-size: 23px;
          box-shadow: 0 0 25px #ff202044;
        }

        .vip-header p {
          color: #aaa;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .vip-header h1 {
          font-size: clamp(32px, 9vw, 47px);
          font-weight: 1000;
          margin: 10px 0;
          letter-spacing: -2px;
        }

        .vip-header h1 span {
          color: #ff3030;
        }

        .vip-header .subtitle {
          color: #ff7777;
        }

        .vip-card {
          background: linear-gradient(145deg, #1b1b1b, #101010);
          border: 1px solid #682424;
          border-radius: 20px;
          padding: 23px;
          box-shadow: 0 15px 50px #0008;
        }

        .vip-card-top,
        .vip-status,
        .vip-balance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .vip-card-top {
          color: #aaa;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .vip-star {
          color: #ffc65a;
        }

        .vip-price {
          text-align: center;
          padding: 27px 0 20px;
        }

        .vip-price span {
          display: block;
          font-size: 56px;
          font-weight: 1000;
          color: white;
          letter-spacing: -3px;
        }

        .vip-price small {
          color: #ff7777;
          font-weight: 900;
          letter-spacing: 2px;
          font-size: 10px;
        }

        .vip-separator {
          height: 1px;
          background: #383838;
          margin-bottom: 22px;
        }

        .vip-card h2 {
          font-size: 12px;
          letter-spacing: 2px;
          margin-bottom: 17px;
        }

        .vip-benefits {
          display: grid;
          gap: 13px;
        }

        .vip-benefits div {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12px;
          color: #ddd;
          line-height: 1.5;
        }

        .vip-benefits span {
          color: #ff3838;
          font-weight: 1000;
        }

        .vip-status {
          margin-top: 24px;
          padding: 16px 0;
          border-top: 1px solid #383838;
          border-bottom: 1px solid #383838;
        }

        .vip-status div {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .vip-status small,
        .vip-balance span {
          color: #888;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vip-status strong {
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .vip-status .active {
          color: #ffc65a;
        }

        .vip-balance {
          padding: 17px 0;
        }

        .vip-balance strong {
          color: #fff;
          font-size: 15px;
        }

        .activate-button,
        .confirm-button {
          width: 100%;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(100deg, #d71920, #ff3939);
          color: white;
          padding: 16px;
          font-weight: 1000;
          font-size: 12px;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .activate-button {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .activate-button:disabled,
        .confirm-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .confirmation {
          background: #242020;
          border: 1px solid #733333;
          padding: 17px;
          border-radius: 12px;
          text-align: center;
        }

        .confirmation h3 {
          font-size: 13px;
          margin: 0 0 10px;
        }

        .confirmation p {
          font-size: 12px;
          line-height: 1.6;
          color: #ccc;
        }

        .cancel-button,
        .retry-button {
          display: block;
          width: 100%;
          margin-top: 10px;
          padding: 12px;
          border: 1px solid #444;
          border-radius: 9px;
          background: #171717;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .message {
          padding: 12px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.5;
          margin-bottom: 13px;
        }

        .error {
          color: #ffaaaa;
          background: #421717;
          border: 1px solid #823333;
        }

        .success {
          color: #a8ffbd;
          background: #12351e;
          border: 1px solid #27663a;
        }

        .vip-terms {
          text-align: center;
          color: #777;
          font-size: 10px;
          line-height: 1.6;
          margin-top: 17px;
        }

        footer {
          text-align: center;
          color: #555;
          font-size: 9px;
          letter-spacing: 1px;
          margin-top: 28px;
        }

        @media (max-width: 390px) {
          .vip-card {
            padding: 17px;
          }

          .vip-status strong {
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}
