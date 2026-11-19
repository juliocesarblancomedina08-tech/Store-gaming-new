
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Notification = {
  id: string | number;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [notification, setNotification] =
    useState<Notification | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadNotification() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const notificationId = params.id;

        if (!notificationId) {
          setErrorMessage("Notificación no encontrada.");
          return;
        }

        const { data, error } = await supabase
          .from("notifications")
          .select(
            "id,title,message,type,is_read,created_at"
          )
          .eq("id", notificationId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setErrorMessage(
            "No se encontró esta notificación."
          );
          return;
        }

        if (mounted) {
          setNotification(data as Notification);
        }

        if (!data.is_read) {
          const { error: updateError } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId)
            .eq("user_id", session.user.id);

          if (updateError) {
            console.error(
              "Error marcando notificación como leída:",
              updateError
            );
          } else if (mounted) {
            setNotification({
              ...data,
              is_read: true,
            } as Notification);
          }
        }
      } catch (error) {
        console.error(
          "Error cargando notificación:",
          error
        );

        if (mounted) {
          setErrorMessage(
            "Ocurrió un error al cargar la notificación."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadNotification();

    return () => {
      mounted = false;
    };
  }, [params.id, router]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #080d19, #111c32, #080d19)",
        color: "#ffffff",
        padding: "30px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "750px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => router.push("/home")}
          style={{
            background: "#1b2940",
            border: "1px solid #34445f",
            color: "#ffffff",
            padding: "12px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "25px",
          }}
        >
          ← VOLVER AL HOME
        </button>

        <div
          style={{
            background: "#111c2e",
            border: "1px solid #263852",
            borderRadius: "18px",
            padding: "25px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "#17365b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🔔
            </div>

            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Detalles de notificación
              </h1>

              <p
                style={{
                  color: "#91a4bf",
                  fontSize: "13px",
                  margin: "5px 0 0",
                }}
              >
                STORE GAMING
              </p>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "45px 10px",
                color: "#a8bad3",
              }}
            >
              CARGANDO NOTIFICACIÓN...
            </div>
          ) : errorMessage ? (
            <div
              style={{
                background: "#351b25",
                border: "1px solid #713444",
                borderRadius: "12px",
                padding: "20px",
                color: "#ffb6c2",
                textAlign: "center",
              }}
            >
              {errorMessage}
            </div>
          ) : notification ? (
            <div>
              <div
                style={{
                  display: "inline-block",
                  padding: "7px 12px",
                  borderRadius: "20px",
                  background: "#123b2c",
                  color: "#75e6ad",
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "20px",
                }}
              >
                ✓ NOTIFICACIÓN LEÍDA
              </div>

              <div
                style={{
                  borderBottom: "1px solid #293b55",
                  paddingBottom: "20px",
                  marginBottom: "20px",
                }}
              >
                <p
                  style={{
                    color: "#8fa5c2",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "9px",
                  }}
                >
                  TÍTULO
                </p>

                <h2
                  style={{
                    fontSize: "21px",
                    fontWeight: 800,
                    lineHeight: 1.4,
                    margin: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  {notification.title || "Notificación"}
                </h2>
              </div>

              <div
                style={{
                  borderBottom: "1px solid #293b55",
                  paddingBottom: "20px",
                  marginBottom: "20px",
                }}
              >
                <p
                  style={{
                    color: "#8fa5c2",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "9px",
                  }}
                >
                  MENSAJE
                </p>

                <div
                  style={{
                    background: "#0b1526",
                    border: "1px solid #253650",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#d8e3f2",
                    fontSize: "15px",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {notification.message || "Sin mensaje."}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    background: "#0b1526",
                    borderRadius: "12px",
                    padding: "15px",
                  }}
                >
                  <p
                    style={{
                      color: "#8fa5c2",
                      fontSize: "12px",
                      margin: "0 0 8px",
                    }}
                  >
                    TIPO
                  </p>

                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {notification.type || "General"}
                  </p>
                </div>

                <div
                  style={{
                    background: "#0b1526",
                    borderRadius: "12px",
                    padding: "15px",
                  }}
                >
                  <p
                    style={{
                      color: "#8fa5c2",
                      fontSize: "12px",
                      margin: "0 0 8px",
                    }}
                  >
                    FECHA
                  </p>

                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
