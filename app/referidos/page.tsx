
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ReferralUser = {
  id: string;
  email: string | null;
};

export default function ReferidosPage() {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralUsers, setReferralUsers] = useState<ReferralUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  const referralLink =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/registro?ref=${encodeURIComponent(referralCode)}`
      : "";

  const totalReferidos = referralUsers.length;

  // Las recompensas se conectarán cuando implementemos
  // el registro seguro de las compras completadas.
  const saldoGanado = 0;

  useEffect(() => {
    let cancelled = false;

    async function cargarReferidos() {
      setLoadingData(true);
      setDataError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (!cancelled) {
            setDataError(
              "Inicia sesión para consultar tus referidos."
            );
          }
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("referral_code")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile?.referral_code) {
          throw new Error(
            "Tu cuenta todavía no tiene un código de referido."
          );
        }

        const { data: users, error: usersError } =
          await supabase
            .from("profiles")
            .select("id, email")
            .eq("referred_by", user.id)
            .order("email", { ascending: true });

        if (usersError) {
          throw usersError;
        }

        if (!cancelled) {
          setReferralCode(profile.referral_code);
          setReferralUsers(users ?? []);
        }
      } catch (error) {
        console.error(
          "Error cargando referidos:",
          error
        );

        if (!cancelled) {
          setDataError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los referidos."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    cargarReferidos();

    return () => {
      cancelled = true;
    };
  }, []);

  async function copiarEnlace() {
    if (!referralLink) {
      setDataError(
        "Tu enlace todavía no está disponible."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setDataError(
        "No se pudo copiar el enlace. Inténtalo nuevamente."
      );
    }
  }

  async function compartirEnlace() {
    if (!referralLink) {
      setDataError(
        "Tu enlace todavía no está disponible."
      );
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "STORE GAMING",
          text:
            "Regístrate en STORE GAMING usando mi enlace de invitación.",
          url: referralLink,
        });
      } else {
        await copiarEnlace();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "AbortError"
      ) {
        await copiarEnlace();
      }
    }
  }

  return (
    <main className="ref-page">
      <div className="ref-container">
        <header className="ref-header">
          <button
            type="button"
            className="ref-back"
            onClick={() => router.push("/home")}
            aria-label="Volver al inicio"
          >
            ←
          </button>

          <div className="ref-brand">
            <span className="ref-brand-name">
              STORE <strong>GAMING</strong>
            </span>

            <span className="ref-brand-subtitle">
              PROGRAMA DE REFERIDOS
            </span>
          </div>

          <div className="ref-header-icon">♧</div>
        </header>

        <section className="ref-hero">
          <div className="ref-hero-decoration ref-decoration-one" />
          <div className="ref-hero-decoration ref-decoration-two" />

          <span className="ref-eyebrow">
            INVITA · COMPARTE · GANA
          </span>

          <h1>
            INVITA A TUS
            <br />
            <span>AMIGOS</span>
          </h1>

          <p>
            Comparte tu enlace personal y gana saldo
            cuando tus amigos realicen su primera compra válida.
          </p>

          <div className="ref-reward">
            <div className="ref-reward-icon">✦</div>

            <div>
              <span>RECOMPENSA POR REFERIDO</span>
              <strong>0,10 de saldo</strong>
              <small>
                Por cada primera compra válida completada.
              </small>
            </div>
          </div>
        </section>

        <section className="ref-stats">
          <article className="ref-stat-card">
            <div className="ref-stat-top">
              <span>AMIGOS INVITADOS</span>
              <span className="ref-stat-icon">♧</span>
            </div>

            <strong>
              {loadingData ? "..." : totalReferidos}
            </strong>

            <small>
              Usuarios registrados con tu enlace
            </small>
          </article>

          <article className="ref-stat-card ref-stat-highlight">
            <div className="ref-stat-top">
              <span>SALDO GANADO</span>
              <span className="ref-stat-icon">＄</span>
            </div>

            <strong>${saldoGanado.toFixed(2)}</strong>

            <small>
              Recompensas acumuladas
            </small>
          </article>
        </section>

        <section className="ref-section">
          <div className="ref-section-heading">
            <div>
              <span className="ref-section-kicker">
                TU INVITACIÓN
              </span>

              <h2>Tu enlace personal</h2>
            </div>

            <span className="ref-heading-icon">↗</span>
          </div>

          <p className="ref-description">
            Envía este enlace a tus amigos para que puedan
            registrarse y quedar asociados a tu cuenta.
          </p>

          <div className="ref-link-box">
            <span className="ref-link-icon">🔗</span>

            <span className="ref-link-text">
              {loadingData
                ? "Cargando tu enlace..."
                : referralLink || "Enlace no disponible"}
            </span>
          </div>

          <div className="ref-actions">
            <button
              type="button"
              className="ref-button-primary"
              onClick={copiarEnlace}
              disabled={loadingData || !referralLink}
            >
              {copied
                ? "✓ ENLACE COPIADO"
                : "▣ COPIAR ENLACE"}
            </button>

            <button
              type="button"
              className="ref-button-secondary"
              onClick={compartirEnlace}
              disabled={loadingData || !referralLink}
            >
              ↗ COMPARTIR
            </button>
          </div>

          <div className="ref-notice">
            <span>ⓘ</span>

            <p>
              {loadingData
                ? "Cargando los datos de tu cuenta..."
                : dataError
                  ? dataError
                  : referralCode
                    ? `Tu código personal es ${referralCode}. Comparte tu enlace para invitar amigos.`
                    : "No se pudo obtener tu código de referido."}
            </p>
          </div>
        </section>

        <section className="ref-section">
          <div className="ref-section-heading">
            <div>
              <span className="ref-section-kicker">
                TU COMUNIDAD
              </span>

              <h2>Mis referidos</h2>
            </div>

            <span className="ref-count">
              {loadingData ? "..." : totalReferidos}
            </span>
          </div>

          {loadingData ? (
            <div className="ref-empty">
              <div className="ref-empty-icon">♧</div>
              <h3>CARGANDO TUS REFERIDOS</h3>
              <p>
                Estamos consultando la información de tu cuenta.
              </p>
            </div>
          ) : dataError ? (
            <div className="ref-empty">
              <div className="ref-empty-icon">ⓘ</div>
              <h3>NO SE PUDIERON CARGAR LOS DATOS</h3>
              <p>{dataError}</p>
            </div>
          ) : referralUsers.length === 0 ? (
            <div className="ref-empty">
              <div className="ref-empty-icon">♧</div>

              <h3>TU EQUIPO COMIENZA AQUÍ</h3>

              <p>
                Todavía no hay usuarios registrados con tu enlace.
                Comparte tu invitación para invitar a tus amigos.
              </p>

              <button
                type="button"
                className="ref-empty-button"
                onClick={compartirEnlace}
              >
                INVITAR AMIGOS ↗
              </button>
            </div>
          ) : (
            <div className="ref-users-list">
              {referralUsers.map((user) => (
                <div
                  key={user.id}
                  className="ref-user-row"
                >
                  <div className="ref-user-icon">♧</div>

                  <div className="ref-user-info">
                    <strong>
                      {user.email || "Usuario registrado"}
                    </strong>

                    <small>
                      Registrado con tu invitación
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ref-section ref-how">
          <div className="ref-section-heading">
            <div>
              <span className="ref-section-kicker">
                ES MUY FÁCIL
              </span>

              <h2>¿Cómo funciona?</h2>
            </div>
          </div>

          <div className="ref-step">
            <span className="ref-step-number">01</span>

            <div>
              <h3>Comparte tu enlace</h3>
              <p>Envía tu invitación a tus amigos.</p>
            </div>
          </div>

          <div className="ref-step">
            <span className="ref-step-number">02</span>

            <div>
              <h3>Tu amigo se registra</h3>
              <p>
                Debe crear su cuenta mediante tu enlace personal.
              </p>
            </div>
          </div>

          <div className="ref-step">
            <span className="ref-step-number">03</span>

            <div>
              <h3>Recibe tu recompensa</h3>
              <p>
                Cuando complete su primera compra válida,
                podrá generarse una recompensa de 0,10 de saldo
                según las reglas del programa.
              </p>
            </div>
          </div>
        </section>

        <footer className="ref-footer">
          <strong>STORE GAMING</strong>
          <span>JUEGA · RECARGA · DISFRUTA</span>
        </footer>
      </div>

      <style jsx>{`
        .ref-page {
          min-height: 100vh;
          padding: 20px 14px 40px;
          color: #f4f7fb;
          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(19, 126, 88, 0.15),
              transparent 45%
            ),
            #080d14;
          font-family: Arial, Helvetica, sans-serif;
        }

        .ref-container {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .ref-header {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 22px;
        }

        .ref-back {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border: 1px solid #283444;
          border-radius: 12px;
          background: #111a26;
          color: white;
          font-size: 25px;
          cursor: pointer;
        }

        .ref-brand {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 4px;
        }

        .ref-brand-name {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .ref-brand-name strong {
          color: #48e3a2;
        }

        .ref-brand-subtitle,
        .ref-eyebrow,
        .ref-section-kicker {
          color: #8b9bad;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .ref-header-icon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid #234c40;
          border-radius: 12px;
          background: #10231e;
          color: #48e3a2;
          font-size: 27px;
        }

        .ref-hero {
          position: relative;
          overflow: hidden;
          padding: 28px 22px 22px;
          border: 1px solid #214a3d;
          border-radius: 22px;
          background: linear-gradient(140deg, #132c25, #101a22 75%);
        }

        .ref-hero-decoration {
          position: absolute;
          width: 170px;
          height: 170px;
          border: 1px solid rgba(72, 227, 162, 0.12);
          border-radius: 50%;
          pointer-events: none;
        }

        .ref-decoration-one {
          top: -90px;
          right: -40px;
        }

        .ref-decoration-two {
          top: -62px;
          right: -12px;
          width: 115px;
          height: 115px;
        }

        .ref-eyebrow {
          color: #60edb3;
        }

        .ref-hero h1 {
          position: relative;
          margin: 18px 0 12px;
          font-size: clamp(32px, 8vw, 48px);
          font-weight: 950;
          line-height: 0.98;
          letter-spacing: -1.5px;
        }

        .ref-hero h1 span {
          color: #48e3a2;
        }

        .ref-hero > p {
          max-width: 440px;
          margin: 0;
          color: #bdc9d4;
          font-size: 14px;
          line-height: 1.7;
        }

        .ref-reward {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 24px;
          padding: 15px;
          border: 1px solid rgba(72, 227, 162, 0.23);
          border-radius: 15px;
          background: rgba(4, 15, 14, 0.55);
        }

        .ref-reward-icon {
          display: grid;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 13px;
          background: #183e31;
          color: #64f0b6;
          font-size: 26px;
        }

        .ref-reward > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .ref-reward span {
          color: #9bb5a9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .ref-reward strong {
          color: #63efb5;
          font-size: 23px;
        }

        .ref-reward small {
          color: #b1c1bc;
          font-size: 11px;
          line-height: 1.5;
        }

        .ref-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 15px 0;
        }

        .ref-stat-card {
          min-width: 0;
          padding: 16px;
          border: 1px solid #243141;
          border-radius: 17px;
          background: #101722;
        }

        .ref-stat-highlight {
          border-color: #25523f;
          background: linear-gradient(145deg, #13271f, #101722);
        }

        .ref-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          color: #9cabbc;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .ref-stat-icon {
          color: #52e8a9;
          font-size: 22px;
        }

        .ref-stat-card > strong {
          display: block;
          overflow-wrap: anywhere;
          margin: 13px 0 7px;
          font-size: clamp(25px, 6vw, 34px);
          font-weight: 900;
        }

        .ref-stat-card > small {
          color: #8594a6;
          font-size: 10px;
          line-height: 1.5;
        }

        .ref-section {
          margin-top: 15px;
          padding: 20px;
          border: 1px solid #243141;
          border-radius: 19px;
          background: #101722;
        }

        .ref-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ref-section-heading h2 {
          margin: 7px 0 0;
          font-size: 21px;
          font-weight: 850;
        }

        .ref-heading-icon {
          color: #4ce6a6;
          font-size: 28px;
        }

        .ref-description {
          margin: 13px 0 16px;
          color: #9eacbc;
          font-size: 13px;
          line-height: 1.7;
        }

        .ref-link-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 13px;
          border: 1px solid #2c3a4a;
          border-radius: 11px;
          background: #090f17;
        }

        .ref-link-icon {
          flex-shrink: 0;
          font-size: 17px;
        }

        .ref-link-text {
          overflow-wrap: anywhere;
          color: #b7c5d4;
          font-size: 12px;
          line-height: 1.5;
        }

        .ref-actions {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 10px;
          margin-top: 12px;
        }

        .ref-button-primary,
        .ref-button-secondary,
        .ref-empty-button {
          min-height: 45px;
          padding: 12px 10px;
          border-radius: 11px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4px;
          cursor: pointer;
        }

        .ref-button-primary {
          border: 1px solid #48e3a2;
          background: #48e3a2;
          color: #07130e;
        }

        .ref-button-secondary {
          border: 1px solid #344455;
          background: #17212e;
          color: #edf4fb;
        }

        .ref-button-primary:disabled,
        .ref-button-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ref-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 14px;
          color: #9caec0;
        }

        .ref-notice > span {
          color: #56e7aa;
        }

        .ref-notice p {
          margin: 0;
          overflow-wrap: anywhere;
          font-size: 11px;
          line-height: 1.6;
        }

        .ref-count {
          display: grid;
          min-width: 34px;
          height: 34px;
          padding: 0 8px;
          place-items: center;
          border: 1px solid #285441;
          border-radius: 10px;
          background: #14271f;
          color: #5aebb0;
          font-size: 13px;
          font-weight: 800;
        }

        .ref-empty {
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 28px 8px 12px;
          text-align: center;
        }

        .ref-empty-icon {
          display: grid;
          width: 65px;
          height: 65px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #2a4d40;
          border-radius: 20px;
          background: #14271f;
          color: #53e9aa;
          font-size: 35px;
        }

        .ref-empty h3 {
          margin: 18px 0 8px;
          font-size: 13px;
          letter-spacing: 0.8px;
        }

        .ref-empty p {
          max-width: 340px;
          margin: 0;
          color: #94a4b7;
          font-size: 12px;
          line-height: 1.7;
        }

        .ref-empty-button {
          margin-top: 17px;
          border: 1px solid #2b684f;
          background: #142b21;
          color: #64edb5;
        }

        .ref-users-list {
          margin-top: 15px;
        }

        .ref-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid #243141;
        }

        .ref-user-icon {
          display: grid;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #2a4d40;
          border-radius: 12px;
          background: #14271f;
          color: #53e9aa;
          font-size: 22px;
        }

        .ref-user-info {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 6px;
        }

        .ref-user-info strong {
          overflow-wrap: anywhere;
          color: #f4f7fb;
          font-size: 13px;
        }

        .ref-user-info small {
          color: #95a4b5;
          font-size: 11px;
        }

        .ref-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 22px;
        }

        .ref-step-number {
          display: grid;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid #28523f;
          border-radius: 12px;
          background: #14271f;
          color: #5beab0;
          font-size: 12px;
          font-weight: 900;
        }

        .ref-step h3 {
          margin: 2px 0 6px;
          font-size: 14px;
        }

        .ref-step p {
          margin: 0;
          color: #95a4b5;
          font-size: 12px;
          line-height: 1.7;
        }

        .ref-footer {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 7px;
          padding-top: 30px;
          color: #8292a5;
        }

        .ref-footer strong {
          color: #48e3a2;
          font-size: 13px;
          letter-spacing: 1.5px;
        }

        .ref-footer span {
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        @media (min-width: 600px) {
          .ref-page {
            padding: 30px 22px 50px;
          }

          .ref-hero {
            padding: 36px;
          }

          .ref-section {
            padding: 25px;
          }
        }

        @media (max-width: 360px) {
          .ref-section {
            padding: 15px;
          }

          .ref-actions {
            grid-template-columns: 1fr;
          }

          .ref-stat-card {
            padding: 12px;
          }
        }
      `}</style>
    </main>
  );
}
