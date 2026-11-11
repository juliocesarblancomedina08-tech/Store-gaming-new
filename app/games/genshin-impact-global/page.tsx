
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import {
  GENSHIN_IMPACT_GLOBAL,
  GENSHIN_STORE_MARGIN,
  GENSHIN_SERVERS,
  type GenshinImpactGlobalOffer,
} from "../../../lib/games/genshin-impact-global";

export default function GenshinImpactGlobalPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<GenshinImpactGlobalOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<GenshinImpactGlobalOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [server, setServer] = useState("america");

  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        const response = await fetch(
          "/api/fazercards/topups?category_id=genshin_impact_global",
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "No se pudieron cargar las ofertas.");
        }

        const supplierOffers = data?.catalog?.offers ?? data?.offers ?? [];
        const normalized: GenshinImpactGlobalOffer[] =
          (Array.isArray(supplierOffers) ? supplierOffers : [])
            .map((item: any) => {
              const supplierOfferId = String(item.offer_id ?? item.id ?? "");
              const name = String(item.name ?? "");
              const supplierPrice = Number(item.price_usd ?? item.precio_usd ?? item.price);
              const price = Math.round((supplierPrice + GENSHIN_STORE_MARGIN) * 10000) / 10000;
              return {
                id: supplierOfferId,
                supplierOfferId,
                name,
                display: name,
                supplierPrice,
                price,
                icon: name.toLowerCase().includes("welkin") ? "🌙" : "💎",
              };
            })
            .filter((item: GenshinImpactGlobalOffer) =>
              item.id && item.name && Number.isFinite(item.supplierPrice) && item.supplierPrice > 0
            );

        if (!cancelled) setOffers(normalized);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las ofertas.");
        }
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    }

    loadOffers();
    return () => { cancelled = true; };
  }, []);

  function selectOffer(
    offer: GenshinImpactGlobalOffer
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setServer("america");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");
  }

  async function createOrder() {
    if (!selectedOffer || processing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      /*
       * ============================================================
       * 1. COMPROBAR SESIÓN
       * ============================================================
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );

        router.replace("/");
        return;
      }

      /*
       * ============================================================
       * 2. LIMPIAR ID
       * ============================================================
       */

      const cleanPlayerId =
        playerId
          .trim()
          .replace(/\s+/g, "");

      if (!cleanPlayerId) {
        setError(
          "Ponga el ID de su cuenta."
        );
        return;
      }

      if (
        !/^[0-9]+$/.test(
          cleanPlayerId
        )
      ) {
        setError(
          "El ID debe contener solamente números."
        );
        return;
      }

      if (
        cleanPlayerId.length < 4 ||
        cleanPlayerId.length > 20
      ) {
        setError(
          "El ID parece no tener un formato válido."
        );
        return;
      }

      /*
       * ============================================================
       * 3. CLAVE DE IDEMPOTENCIA
       * ============================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ============================================================
       * 4. ENVIAR PEDIDO
       * ============================================================
       */

      const response =
        await fetch(
          "/api/topups/genshin-impact-global",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              offerId:
                selectedOffer.supplierOfferId,

              playerId:
                cleanPlayerId,

              server,

              idempotencyKey,
            }),
          }
        );

      /*
       * ============================================================
       * 5. LEER RESPUESTA
       * ============================================================
       */

      let result: any = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      /*
       * ============================================================
       * 6. ERROR DEL SERVIDOR
       * ============================================================
       */

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ||
            "No se pudo crear la orden."
        );

        return;
      }

      /*
       * ============================================================
       * 7. OBTENER PEDIDO
       * ============================================================
       */

      const order =
        result.order || {};

      setOrderNumber(
        result.orderNumber ||
          order.order_number ||
          order.id ||
          result.id ||
          ""
      );

      setSupplierOrderId(
        result.supplierOrderId ||
          order.supplier_order_id ||
          ""
      );

      setOrderStatus(
        result.status ||
          order.status ||
          order.supplier_status ||
          "processing"
      );

      /*
       * ============================================================
       * 8. MOSTRAR ORDEN CREADA
       * ============================================================
       */

      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById(
            "success-section"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error(
        "ERROR CREANDO TOPUP:",
        err
      );

      setError(
        "No se pudo conectar con el servidor. Si la compra fue enviada, no vuelva a intentarla hasta revisar el estado de la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (processing) {
      return;
    }

    void createOrder();
  }

  return (
    <main className="free-fire-page">

      {/* ============================================================
          HEADER
          ============================================================ */}

      <header className="free-fire-header">

        <button
          type="button"
          className="free-fire-back-button"
          onClick={() =>
            router.push("/top-up")
          }
        >
          ←
        </button>

        <h1>
          {GENSHIN_IMPACT_GLOBAL.game}
        </h1>

        <div className="free-fire-header-space" />

      </header>

      {/* ============================================================
          CONTENIDO
          ============================================================ */}

      <section className="free-fire-content">

        {/* ============================================================
            BANNER
            ============================================================ */}

        <div className="free-fire-banner">

          <img
            src={GENSHIN_IMPACT_GLOBAL.image}
            alt="Genshin Impact (Global)"
          />

        </div>

        {/* ============================================================
            INFORMACIÓN
            ============================================================ */}

        <div className="free-fire-note">

          <strong>
            🌍 Servidores Globales
          </strong>

          <p>
            {GENSHIN_IMPACT_GLOBAL.note}
          </p>

        </div>

        {/* ============================================================
            BOTÓN OFERTAS
            ============================================================ */}

        <button
          type="button"
          className="free-fire-offers-toggle"
          onClick={() => {
            setShowOffers(
              (value) => !value
            );

            setError("");
          }}
        >

          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span className="free-fire-offers-arrow">
            {showOffers
              ? "▲"
              : "▼"}
          </span>

        </button>

        {/* ============================================================
            OFERTAS
            ============================================================ */}

        {showOffers && (

          <section className="free-fire-offers-section">

            <div className="free-fire-offers-list">

              {loadingOffers ? (
                <p className="free-fire-note">Cargando ofertas de FazerCards...</p>
              ) : offers.length === 0 ? (
                <p className="free-fire-note">No hay ofertas disponibles en este momento.</p>
              ) : offers.map(
                (offer) => {

                  const selected =
                    selectedOffer?.id ===
                    offer.id;

                  return (

                    <button
                      key={offer.id}
                      type="button"
                      className={`free-fire-offer ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectOffer(
                          offer
                        )
                      }
                    >

                      <div className="free-fire-offer-left">

                        <span className="free-fire-offer-icon">
                          {offer.icon}
                        </span>

                        <div>

                          <strong>
                            {offer.display}
                          </strong>

                          <small>
                            {offer.name}
                          </small>

                        </div>

                      </div>

                      <div className="free-fire-offer-price">

                        {offer.price.toFixed(4)}$

                      </div>

                    </button>

                  );
                }
              )}

            </div>

          </section>

        )}

        {/* ============================================================
            FORMULARIO
            ============================================================ */}

        {selectedOffer &&
          !orderCreated && (

            <section
              id="free-fire-order-form"
              className="free-fire-order-section"
            >

              {/* OFERTA SELECCIONADA */}

              <div className="free-fire-selected-offer">

                <span>
                  {selectedOffer.icon}
                </span>

                <div>

                  <strong>
                    {selectedOffer.name}
                  </strong>

                  <span>
                    {selectedOffer.price.toFixed(4)}$
                  </span>

                </div>

              </div>

              {/* FORMULARIO */}

              <form
                onSubmit={
                  handleSubmit
                }
              >

                <label htmlFor="genshin-player-id">
                  PLAYER ID
                </label>

                <input
                  id="genshin-player-id"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Introduzca su Player ID"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(
                      event.target.value.replace(
                        /[^0-9]/g,
                        ""
                      )
                    )
                  }
                  maxLength={20}
                  disabled={processing}
                />

                <label htmlFor="genshin-server">SERVIDOR</label>
                <select
                  id="genshin-server"
                  value={server}
                  onChange={(event) => setServer(event.target.value)}
                  disabled={processing}
                >
                  {GENSHIN_SERVERS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>

                {/* ERROR */}

                {error && (

                  <div className="free-fire-form-error">
                    {error}
                  </div>

                )}

                {/* BOTÓN */}

                <button
                  type="submit"
                  className="free-fire-create-order-button"
                  disabled={processing}
                >

                  {processing
                    ? "FINALIZANDO ORDEN..."
                    : "FINALIZAR ORDEN"}

                </button>

              </form>

            </section>

          )}

        {/* ============================================================
            ORDEN CREADA
            ============================================================ */}

        {orderCreated && (

          <section
            id="success-section"
            className="free-fire-success-section"
          >

            <div className="free-fire-success-icon">
              ✓
            </div>

            <h2>
              Orden creada
            </h2>

            <p>
              Tu pedido de Genshin Impact (Global)
              fue creado correctamente.
            </p>

            {orderNumber && (

              <div className="free-fire-order-number">

                <span>
                  Número de orden
                </span>

                <strong>
                  {orderNumber}
                </strong>

              </div>

            )}

            {supplierOrderId && (

              <div className="free-fire-order-number">

                <span>
                  ID DE ORDEN DEL PROVEEDOR
                </span>

                <strong>
                  {supplierOrderId}
                </strong>

              </div>

            )}

            {orderStatus && (

              <div className="free-fire-order-number">

                <span>
                  ESTADO
                </span>

                <strong>
                  {orderStatus}
                </strong>

              </div>

            )}

            <button
              type="button"
              className="free-fire-review-button"
              onClick={() =>
                router.push("/orders")
              }
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="free-fire-store-button"
              onClick={() =>
                router.push("/top-up")
              }
            >
              Volver a la tienda
            </button>

          </section>

        )}

      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}

      <footer className="free-fire-footer">
        🛒 STORE GAMING 🎮
      </footer>

      {/* ============================================================
          ESTILOS
          ============================================================ */}

      <style jsx>{`

        .free-fire-page {
          min-height: 100vh;
          color: #fff;

          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;

          padding-bottom: 30px;
        }

        /* ==========================================================
           HEADER
           ========================================================== */

        .free-fire-header {
          position: sticky;
          top: 0;
          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: space-between;

          min-height: 58px;
          padding: 8px 12px;

          background: rgba(0, 0, 0, 0.88);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.1);

          backdrop-filter: blur(10px);
        }

        .free-fire-header h1 {
          margin: 0;

          font-size: 19px;
          font-weight: 800;

          text-align: center;
        }

        .free-fire-back-button {
          width: 40px;
          height: 40px;

          border: 0;
          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.08);

          color: #fff;

          font-size: 25px;

          cursor: pointer;
        }

        .free-fire-header-space {
          width: 40px;
        }

        /* ==========================================================
           CONTENIDO
           ========================================================== */

        .free-fire-content {
          width: min(100%, 680px);

          margin: 0 auto;

          padding:
            0 12px 30px;
        }

        /* ==========================================================
           BANNER
           ========================================================== */

        .free-fire-banner {
          width:
            calc(100% + 24px);

          margin-left: -12px;

          overflow: hidden;
        }

        .free-fire-banner img {
          display: block;

          width: 100%;

          height: 210px;

          object-fit: cover;
        }

        /* ==========================================================
           INFORMACIÓN
           ========================================================== */

        .free-fire-note {
          margin-top: 14px;

          padding: 14px;

          border-radius: 14px;

          background:
            rgba(0, 0, 0, 0.68);

          border:
            1px solid
            rgba(255, 255, 255, 0.1);
        }

        .free-fire-note strong {
          color: #fff;

          font-size: 15px;
        }

        .free-fire-note p {
          margin:
            7px 0 0;

          color: #d8d8d8;

          font-size: 13px;

          line-height: 1.5;
        }

        /* ==========================================================
           BOTÓN OFERTAS
           ========================================================== */

        .free-fire-offers-toggle {
          width: 100%;

          margin-top: 14px;

          padding: 15px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          border:
            1px solid
            rgba(255, 255, 255, 0.12);

          border-radius: 13px;

          background:
            rgba(0, 0, 0, 0.78);

          color: #fff;

          font-size: 14px;

          font-weight: 800;

          cursor: pointer;
        }

        .free-fire-offers-arrow {
          font-size: 12px;
        }

        /* ==========================================================
           OFERTAS
           ========================================================== */

        .free-fire-offers-section {
          margin-top: 10px;
        }

        .free-fire-offers-list {
          display: flex;

          flex-direction: column;

          gap: 8px;
        }

        .free-fire-offer {
          width: 100%;

          min-height: 65px;

          padding:
            10px 12px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 10px;

          border:
            1px solid
            rgba(255, 255, 255, 0.1);

          border-radius: 13px;

          background:
            rgba(0, 0, 0, 0.78);

          color: #fff;

          text-align: left;

          cursor: pointer;

          transition:
            0.15s ease;
        }

        .free-fire-offer:active {
          transform:
            scale(0.98);
        }

        .free-fire-offer.selected {
          border-color:
            rgba(255, 50, 50, 0.8);

          background:
            rgba(120, 0, 0, 0.3);
        }

        .free-fire-offer-left {
          display: flex;

          align-items: center;

          gap: 10px;

          min-width: 0;
        }

        .free-fire-offer-icon {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.08);

          font-size: 21px;
        }

        .free-fire-offer-left strong {
          display: block;

          font-size: 14px;
        }

        .free-fire-offer-left small {
          display: block;

          margin-top: 3px;

          color: #aaa;

          font-size: 11px;
        }

        .free-fire-offer-price {
          flex-shrink: 0;

          color: #fff;

          font-size: 14px;

          font-weight: 900;
        }

        /* ==========================================================
           FORMULARIO
           ========================================================== */

        .free-fire-order-section {
          margin-top: 16px;

          padding: 16px;

          border-radius: 15px;

          background:
            rgba(0, 0, 0, 0.82);

          border:
            1px solid
            rgba(255, 255, 255, 0.1);
        }

        .free-fire-selected-offer {
          display: flex;

          align-items: center;

          gap: 11px;

          margin-bottom: 15px;

          padding: 12px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.06);
        }

        .free-fire-selected-offer > span {
          font-size: 25px;
        }

        .free-fire-selected-offer div {
          flex: 1;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 10px;
        }

        .free-fire-selected-offer strong {
          font-size: 14px;
        }

        .free-fire-selected-offer div span {
          font-weight: 900;

          white-space: nowrap;
        }

        .free-fire-order-section form {
          display: flex;

          flex-direction: column;
        }

        .free-fire-order-section label {
          margin-bottom: 7px;

          font-size: 13px;

          font-weight: 800;
        }

        .free-fire-order-section input {
          width: 100%;

          box-sizing: border-box;

          padding: 13px;

          border:
            1px solid
            rgba(255, 255, 255, 0.16);

          border-radius: 11px;

          outline: none;

          background:
            rgba(255, 255, 255, 0.07);

          color: #fff;

          font-size: 15px;
        }

        .free-fire-order-section input::placeholder {
          color: #888;
        }

        .free-fire-order-section select {
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 14px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          outline: none;
          background: #171717;
          color: #fff;
          font-size: 15px;
        }

        .free-fire-form-error {
          margin-top: 8px;

          padding: 9px;

          border-radius: 9px;

          background:
            rgba(150, 0, 0, 0.25);

          color: #ff9b9b;

          font-size: 12px;
        }

        /* ==========================================================
           BOTÓN CREAR ORDEN
           ========================================================== */

        .free-fire-create-order-button {
          width: 100%;

          margin-top: 12px;

          padding: 13px;

          border: 0;

          border-radius: 11px;

          background: #d71920;

          color: #fff;

          font-weight: 900;

          cursor: pointer;
        }

        .free-fire-create-order-button:disabled {
          opacity: 0.6;

          cursor: wait;
        }

        /* ==========================================================
           ORDEN CREADA
           ========================================================== */

        .free-fire-success-section {
          margin-top: 18px;

          padding:
            22px 16px;

          border-radius: 16px;

          background:
            rgba(0, 0, 0, 0.84);

          border:
            1px solid
            rgba(50, 255, 100, 0.2);

          text-align: center;
        }

        .free-fire-success-icon {
          width: 58px;
          height: 58px;

          margin:
            0 auto 10px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: #19a957;

          color: #fff;

          font-size: 31px;

          font-weight: 900;
        }

        .free-fire-success-section h2 {
          margin: 0;

          font-size: 21px;
        }

        .free-fire-success-section p {
          margin:
            8px 0;

          color: #cfcfcf;

          font-size: 13px;
        }

        .free-fire-order-number {
          margin-top: 13px;

          padding: 12px;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.06);
        }

        .free-fire-order-number span {
          display: block;

          color: #999;

          font-size: 11px;
        }

        .free-fire-order-number strong {
          display: block;

          margin-top: 4px;

          font-size: 16px;
        }

        /* ==========================================================
           BOTONES FINALES
           ============================================================ */

        .free-fire-review-button,
        .free-fire-store-button {
          width: 100%;

          margin-top: 12px;

          padding: 13px;

          border: 0;

          border-radius: 11px;

          font-weight: 900;

          cursor: pointer;
        }

        .free-fire-review-button {
          background: #19a957;

          color: #fff;
        }

        .free-fire-store-button {
          background:
            rgba(255, 255, 255, 0.1);

          color: #fff;
        }

        /* ==========================================================
           FOOTER
           ========================================================== */

        .free-fire-footer {
          padding:
            25px 12px 5px;

          color: #888;

          font-size: 12px;

          text-align: center;
        }

        /* ==========================================================
           MÓVIL
           ========================================================== */

        @media (max-width: 480px) {

          .free-fire-banner img {
            height: 185px;
          }

          .free-fire-selected-offer div {
            flex-direction: column;

            align-items: flex-start;
          }

          .free-fire-offer-price {
            font-size: 13px;
          }

        }

      `}</style>

    </main>
  );
}
