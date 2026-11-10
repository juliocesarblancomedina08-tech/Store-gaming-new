
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  amount: number;
  price: number;
  stock?: number;
};

const offers: GiftCardOffer[] = [
  {
    id: "30-usd",
    amount: 30,
    price: 29.24,
    stock: 12,
  },
  {
    id: "50-usd",
    amount: 50,
    price: 48.99,
  },
  {
    id: "75-usd",
    amount: 75,
    price: 74.18,
  },
  {
    id: "100-usd",
    amount: 100,
    price: 98.85,
  },
  {
    id: "150-usd",
    amount: 150,
    price: 148.73,
  },
];

const note =
  "Región: EE. UU. Tarjetas de regalo de Fortnite (códigos de V-Bucks). Los códigos se pueden guardar de forma segura y canjear más adelante.";

export default function FortniteEEUUGiftCardPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const total = selectedOffer
    ? selectedOffer.price * quantity
    : 0;

  function selectOffer(offer: GiftCardOffer) {
    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirm(true);
    setMessage("");
  }

  function confirmPurchase() {
    if (!selectedOffer) return;

    setLoading(true);

    const order = {
      id: `FORTNITE-EEUU-${Date.now()}`,
      product: "Fortnite V-Bucks EE. UU.",
      offer: selectedOffer,
      quantity,
      total,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    try {
      const previousOrders = JSON.parse(
        localStorage.getItem("store_gaming_orders") || "[]"
      );

      previousOrders.push(order);

      localStorage.setItem(
        "store_gaming_orders",
        JSON.stringify(previousOrders)
      );

      setMessage(
        "Pedido guardado. El pago y la entrega todavía deben verificarse."
      );
    } catch {
      setMessage("No se pudo guardar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b16] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Volver
        </button>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#172554] via-[#111827] to-[#080b16] p-6 shadow-2xl md:p-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
                TARJETAS DIGITALES
              </span>

              <h1 className="mt-5 text-3xl font-black md:text-5xl">
                FORTNITE
                <span className="block text-blue-400">
                  EE. UU.
                </span>
              </h1>

              <p className="mt-4 text-sm leading-7 text-gray-300">
                Compra tarjetas de regalo de Fortnite en dólares
                estadounidenses.
              </p>

              <p className="mt-3 text-xs leading-6 text-gray-400">
                {note}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-black/30 p-6 text-center">
              <div className="text-6xl">🎮</div>
              <h2 className="mt-4 text-xl font-black">
                FORTNITE V-BUCKS
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Región Estados Unidos
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <button
            onClick={() => setShowOffers(!showOffers)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#111827] p-4 font-bold"
          >
            <span>Seleccionar tarjeta</span>
            <span>{showOffers ? "−" : "+"}</span>
          </button>

          {showOffers && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => selectOffer(offer)}
                  className={`rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:border-blue-400 ${
                    selectedOffer?.id === offer.id
                      ? "border-blue-400 bg-blue-500/10"
                      : "border-white/10 bg-[#111827]"
                  }`}
                >
                  <div className="text-sm font-bold text-gray-400">
                    TARJETA FORTNITE
                  </div>

                  <div className="mt-3 text-3xl font-black">
                    ${offer.amount} USD
                  </div>

                  <div className="mt-4 text-xl font-bold text-blue-400">
                    ${offer.price.toFixed(2)}
                  </div>

                  {offer.stock !== undefined && (
                    <div className="mt-2 text-xs text-gray-400">
                      Stock indicado: {offer.stock}
                    </div>
                  )}

                  <div className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-bold">
                    SELECCIONAR
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {showConfirm && selectedOffer && (
          <section className="mt-8 rounded-2xl border border-blue-400/20 bg-[#111827] p-6">
            <h2 className="text-xl font-black">
              Confirmar pedido
            </h2>

            <div className="mt-5 rounded-xl bg-black/30 p-4">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Tarjeta</span>
                <strong>${selectedOffer.amount} USD</strong>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-gray-400">Precio</span>
                <strong>${selectedOffer.price.toFixed(2)}</strong>
              </div>

              <div className="mt-5">
                <label className="text-sm text-gray-400">
                  Cantidad
                </label>

                <div className="mt-2 flex items-center gap-4">
                  <button
                    onClick={() =>
                      setQuantity(Math.max(1, quantity - 1))
                    }
                    className="rounded-lg bg-white/10 px-4 py-2"
                  >
                    −
                  </button>

                  <span className="text-xl font-bold">
                    {quantity}
                  </span>

                  <button
                    onClick={() =>
                      setQuantity(Math.min(10, quantity + 1))
                    }
                    className="rounded-lg bg-white/10 px-4 py-2"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-5 flex justify-between border-t border-white/10 pt-4">
                <span className="font-bold">Total</span>
                <strong className="text-2xl text-blue-400">
                  ${total.toFixed(2)} USD
                </strong>
              </div>
            </div>

            <button
              onClick={confirmPurchase}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 font-black hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "GUARDANDO..." : "CONFIRMAR PEDIDO"}
            </button>

            <button
              onClick={() => setShowConfirm(false)}
              className="mt-3 w-full rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-300 hover:bg-white/5"
            >
              CANCELAR
            </button>

            {message && (
              <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-yellow-300">
                {message}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
