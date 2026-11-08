
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  apiKey?: string;
  hasKey?: boolean;
  created?: boolean;
  active?: boolean;
  createdAt?: string;
  needsRecovery?: boolean;
};

async function readApiResponse(response: Response): Promise<ApiResult> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      success: false,
      error: `El servidor devolvió una respuesta vacía (HTTP ${response.status}).`,
    };
  }

  try {
    return JSON.parse(text) as ApiResult;
  } catch {
    return {
      success: false,
      error:
        `Respuesta no válida del servidor (HTTP ${response.status}): ` +
        text.slice(0, 200),
    };
  }
}

export default function AjustesPage() {
  const router = useRouter();

  const [view, setView] = useState<"menu" | "api">("menu");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [active, setActive] = useState(true);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionError || !data.session) {
        router.replace("/login");
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function authorizedRequest(
    method: "GET" | "POST" | "PATCH"
  ): Promise<{ response: Response; data: ApiResult }> {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const token = sessionData.session?.access_token;

    if (sessionError || !token) {
      throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }

    const response = await fetch("/api/account/api-key", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(method !== "GET"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      cache: "no-store",
    });

    const data = await readApiResponse(response);

    if (!response.ok || data.success === false) {
      throw new Error(
        data.error ||
          data.message ||
          `Error del servidor (HTTP ${response.status}).`
      );
    }

    return { response, data };
  }

  async function loadApi() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await authorizedRequest("GET");

      setHasKey(Boolean(data.hasKey || data.apiKey));
      setApiKey(data.apiKey || "");
      setActive(data.active !== false);
      setNeedsRecovery(Boolean(data.needsRecovery));
      setCreatedAt(data.createdAt || "");

      if (data.needsRecovery) {
        setMessage(
          "Existe una clave anterior, pero no se puede recuperar. Puedes generar una nueva; la clave anterior dejará de funcionar."
        );
      } else if (data.apiKey) {
        setMessage("Tu clave API está disponible.");
      } else {
        setMessage("Todavía no tienes una clave API.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar la clave API."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openApi() {
    setView("api");
    await loadApi();
  }

  async function createApiKey() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await authorizedRequest("POST");

      if (data.apiKey) {
        setApiKey(data.apiKey);
        setHasKey(true);
        setActive(data.active !== false);
        setNeedsRecovery(false);
        setCreatedAt(data.createdAt || "");
        setShowKey(true);
        setMessage(
          data.created === false
            ? "La clave existente fue reconocida."
            : "Clave API creada correctamente. Cópiala y guárdala en un lugar seguro."
        );
      } else if (data.hasKey || data.needsRecovery) {
        await loadApi();
      } else {
        setError(
          data.error ||
            "El servidor no devolvió la clave API. Intenta actualizar la página."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la clave API."
      );
    } finally {
      setLoading(false);
    }
  }

  async function recoverApiKey() {
    const confirmed = window.confirm(
      "No se puede recuperar la clave anterior. ¿Quieres generar una nueva? La clave anterior dejará de funcionar en los servicios que la utilicen."
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await authorizedRequest("PATCH");

      if (!data.apiKey) {
        throw new Error(
          "El servidor no devolvió la nueva clave. Actualiza el estado antes de volver a intentarlo."
        );
      }

      setApiKey(data.apiKey);
      setHasKey(true);
      setActive(data.active !== false);
      setNeedsRecovery(false);
      setCreatedAt(data.createdAt || "");
      setShowKey(true);
      setMessage(
        "Nueva clave creada correctamente. Recuerda actualizarla en los servicios que utilizaban la anterior."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar una nueva clave."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    if (!apiKey) {
      setError("No hay ninguna clave disponible para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage("Clave API copiada al portapapeles.");
      setError("");
    } catch {
      setError(
        "No se pudo copiar automáticamente. Muestra la clave y cópiala manualmente."
      );
    }
  }

  const styles: Record<string, CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#080b12",
      color: "#f3f4f6",
      padding: "24px 16px 48px",
      fontFamily: "Arial, sans-serif",
    },
    container: {
      width: "100%",
      maxWidth: "760px",
      margin: "0 auto",
    },
    back: {
      background: "#171c27",
      color: "#fff",
      border: "1px solid #303747",
      borderRadius: "10px",
      padding: "10px 14px",
      cursor: "pointer",
      marginBottom: "24px",
    },
    title: {
      fontSize: "28px",
      fontWeight: 800,
      margin: "0 0 10px",
    },
    subtitle: {
      color: "#a5adbd",
      lineHeight: 1.6,
      margin: "0 0 24px",
    },
    card: {
      background: "#111622",
      border: "1px solid #283142",
      borderRadius: "16px",
      padding: "22px",
      marginBottom: "16px",
    },
    option: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      textAlign: "left",
      background: "#111622",
      color: "#fff",
      border: "1px solid #303747",
      borderRadius: "14px",
      padding: "20px",
      cursor: "pointer",
    },
    primary: {
      background: "#e11d48",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      padding: "12px 16px",
      fontWeight: 700,
      cursor: "pointer",
    },
    secondary: {
      background: "#202838",
      color: "#fff",
      border: "1px solid #3a4559",
      borderRadius: "10px",
      padding: "11px 14px",
      fontWeight: 600,
      cursor: "pointer",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      background: "#080b12",
      color: "#f9fafb",
      border: "1px solid #3a4559",
      borderRadius: "10px",
      padding: "13px",
      fontSize: "14px",
      marginTop: "10px",
      marginBottom: "12px",
    },
    message: {
      background: "#10251e",
      border: "1px solid #245c43",
      color: "#b9f6d3",
      padding: "12px",
      borderRadius: "10px",
      marginBottom: "14px",
      lineHeight: 1.5,
      overflowWrap: "anywhere",
    },
    error: {
      background: "#2b1218",
      border: "1px solid #793044",
      color: "#ffbdc8",
      padding: "12px",
      borderRadius: "10px",
      marginBottom: "14px",
      lineHeight: 1.5,
      overflowWrap: "anywhere",
    },
    muted: {
      color: "#a5adbd",
      fontSize: "14px",
      lineHeight: 1.6,
    },
    status: {
      display: "inline-block",
      padding: "5px 9px",
      borderRadius: "8px",
      background: active ? "#153b2a" : "#3a2026",
      color: active ? "#a7f3c5" : "#ffbdc8",
      fontSize: "12px",
      fontWeight: 700,
      marginBottom: "14px",
    },
    actions: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginTop: "8px",
    },
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          type="button"
          style={styles.back}
          onClick={() => {
            if (view === "api") {
              setView("menu");
              setError("");
              setMessage("");
            } else {
              router.push("/home");
            }
          }}
        >
          ← {view === "api" ? "Volver a ajustes" : "Volver al inicio"}
        </button>

        {view === "menu" ? (
          <>
            <h1 style={styles.title}>Ajustes</h1>
            <p style={styles.subtitle}>
              Administra las opciones de tu cuenta de STORE GAMING.
            </p>

            <button
              type="button"
              style={styles.option}
              onClick={openApi}
            >
              <span>
                <strong style={{ display: "block", fontSize: "17px" }}>
                  🔑 Clave API
                </strong>
                <span style={{ ...styles.muted, display: "block", marginTop: "7px" }}>
                  Consulta y administra la clave API de tu cuenta.
                </span>
              </span>
              <span style={{ fontSize: "22px" }}>›</span>
            </button>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Clave API</h1>
            <p style={styles.subtitle}>
              Administra la clave que permite conectar servicios autorizados
              con STORE GAMING. No la compartas con otras personas.
            </p>

            <section style={styles.card}>
              <h2 style={{ fontSize: "19px", marginTop: 0 }}>
                Mi clave API
              </h2>

              {hasKey && !needsRecovery && (
                <div style={styles.status}>
                  {active ? "● ACTIVA" : "● INACTIVA"}
                </div>
              )}

              {message && <div style={styles.message}>{message}</div>}
              {error && <div style={styles.error}>{error}</div>}

              {loading && (
                <p style={styles.muted}>Consultando el servidor...</p>
              )}

              {needsRecovery ? (
                <>
                  <p style={styles.muted}>
                    Existe una clave registrada, pero no hay una clave
                    recuperable almacenada. Puedes crear una nueva, pero la
                    anterior dejará de funcionar.
                  </p>
                  <button
                    type="button"
                    style={styles.primary}
                    onClick={recoverApiKey}
                    disabled={loading}
                  >
                    {loading ? "Procesando..." : "Generar nueva clave"}
                  </button>
                </>
              ) : hasKey && apiKey ? (
                <>
                  <label
                    htmlFor="api-key"
                    style={{ fontSize: "14px", fontWeight: 700 }}
                  >
                    Tu clave API
                  </label>

                  <input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    style={styles.input}
                    autoComplete="off"
                  />

                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={styles.secondary}
                      onClick={() => setShowKey((value) => !value)}
                    >
                      {showKey ? "Ocultar clave" : "Mostrar clave"}
                    </button>

                    <button
                      type="button"
                      style={styles.primary}
                      onClick={copyApiKey}
                    >
                      Copiar clave
                    </button>
                  </div>

                  {createdAt && (
                    <p style={{ ...styles.muted, marginTop: "18px" }}>
                      Fecha de creación:{" "}
                      {Number.isNaN(Date.parse(createdAt))
                        ? createdAt
                        : new Date(createdAt).toLocaleString()}
                    </p>
                  )}

                  <p style={{ ...styles.muted, marginTop: "18px" }}>
                    No generes otra clave si no es necesario. Cambiarla puede
                    interrumpir las conexiones que usan la clave actual.
                  </p>
                </>
              ) : !loading && !error ? (
                <>
                  <p style={styles.muted}>
                    Todavía no tienes una clave API. Puedes crear una para
                    comenzar a utilizar las integraciones disponibles.
                  </p>
                  <button
                    type="button"
                    style={styles.primary}
                    onClick={createApiKey}
                    disabled={loading}
                  >
                    Crear clave API
                  </button>
                </>
              ) : null}

              <div style={{ marginTop: "22px" }}>
                <button
                  type="button"
                  style={styles.secondary}
                  onClick={loadApi}
                  disabled={loading}
                >
                  Actualizar estado
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
