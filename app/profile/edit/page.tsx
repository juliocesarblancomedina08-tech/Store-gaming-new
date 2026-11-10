
"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const BUCKET = "profile-avatars";

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user) {
        router.replace("/");
        return;
      }

      const user = sessionData.session.user;

      if (!active) return;

      setUserId(user.id);
      setEmail(user.email || "");

      const metadata = user.user_metadata || {};

      const initialUsername =
        metadata.username ||
        metadata.user_name ||
        metadata.name ||
        user.email?.split("@")[0] ||
        "";

      setUsername(String(initialUsername));

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profile?.username) {
        setUsername(profile.username);
      }

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
        setPreview(profile.avatar_url);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const uploadAvatar = async () => {
    if (!selectedFile || !userId) {
      return avatarUrl;
    }

    const extension =
      selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: selectedFile.type,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message || "No se pudo subir la imagen."
      );
    }

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    if (cleanUsername.length > 30) {
      setError("El nombre de usuario no puede superar 30 caracteres.");
      return;
    }

    if (!userId) {
      setError("No se pudo identificar tu cuenta.");
      return;
    }

    setSaving(true);

    try {
      const newAvatarUrl = await uploadAvatar();

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: cleanUsername,
            avatar_url: newAvatarUrl || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(
          profileError.message || "No se pudo guardar el perfil."
        );
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            username: cleanUsername,
            name: cleanUsername,
          },
        });

      if (metadataError) {
        console.warn(
          "No se pudo actualizar la información adicional:",
          metadataError.message
        );
      }

      setAvatarUrl(newAvatarUrl);
      setSelectedFile(null);
      setSuccess("¡Tu perfil se actualizó correctamente!");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Ocurrió un error al guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="edit-loading">
        <p>CARGANDO PERFIL...</p>
      </main>
    );
  }

  return (
    <main className="edit-profile-page">
      <style jsx>{`
        .edit-profile-page {
          min-height: 100vh;
          padding: 25px 16px 45px;
          color: #fff;
          background:
            linear-gradient(
              rgba(3, 7, 18, 0.9),
              rgba(3, 7, 18, 0.97)
            ),
            url("/images/battle-royale-bg.jpg") center/cover fixed;
        }

        .edit-container {
          max-width: 520px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 25px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          border: 1px solid #334155;
          border-radius: 12px;
          color: #fff;
          background: #111827;
          font-size: 20px;
          cursor: pointer;
        }

        .topbar h1 {
          margin: 0;
          font-size: 25px;
          font-weight: 900;
        }

        .edit-card {
          padding: 25px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.94);
          box-shadow: 0 15px 45px rgba(0, 0, 0, 0.3);
        }

        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 13px;
          margin-bottom: 27px;
        }

        .avatar-wrapper {
          width: 100px;
          height: 100px;
          overflow: hidden;
          border: 3px solid #38bdf8;
          border-radius: 50%;
          background: #020617;
        }

        .avatar-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          color: #38bdf8;
          font-size: 42px;
        }

        .change-photo-button {
          padding: 9px 15px;
          border: 1px solid #38bdf8;
          border-radius: 9px;
          color: #38bdf8;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
        }

        .form-group {
          display: grid;
          gap: 8px;
          margin-bottom: 19px;
        }

        .form-group label {
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 800;
        }

        .form-group input {
          width: 100%;
          padding: 13px;
          border: 1px solid #334155;
          border-radius: 10px;
          outline: none;
          color: #fff;
          background: #020617;
        }

        .form-group input:focus {
          border-color: #38bdf8;
        }

        .form-group input:disabled {
          color: #64748b;
          cursor: not-allowed;
        }

        .help-text {
          color: #64748b;
          font-size: 12px;
        }

        .save-button {
          width: 100%;
          padding: 14px;
          border: 0;
          border-radius: 10px;
          color: #00111c;
          background: #38bdf8;
          font-weight: 900;
          cursor: pointer;
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          margin-bottom: 17px;
          padding: 12px;
          border-radius: 9px;
          font-size: 13px;
        }

        .error-message {
          border: 1px solid #ef4444;
          color: #fecaca;
          background: rgba(127, 29, 29, 0.25);
        }

        .success-message {
          border: 1px solid #22c55e;
          color: #bbf7d0;
          background: rgba(20, 83, 45, 0.25);
        }

        .edit-loading {
          display: grid;
          min-height: 100vh;
          place-items: center;
          color: #38bdf8;
          background: #020617;
          font-weight: 900;
        }

        .footer-text {
          margin-top: 22px;
          color: #555;
          font-size: 9px;
          text-align: center;
          letter-spacing: 2px;
        }

        @media (max-width: 480px) {
          .edit-card {
            padding: 17px;
          }

          .avatar-wrapper {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>

      <div className="edit-container">
        <header className="topbar">
          <button
            className="back-button"
            type="button"
            onClick={() => router.back()}
          >
            ←
          </button>

          <h1>EDITAR PERFIL</h1>
        </header>

        <section className="edit-card">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {preview ? (
                <img src={preview} alt="Foto de perfil" />
              ) : (
                <div className="avatar-placeholder">👤</div>
              )}
            </div>

            <button
              type="button"
              className="change-photo-button"
              onClick={() => fileInputRef.current?.click()}
            >
              CAMBIAR FOTO
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />

            <span className="help-text">
              Imagen JPG, PNG o WEBP. Máximo 5 MB.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="username">NOMBRE DE USUARIO</label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Tu nombre de usuario"
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">CORREO ELECTRÓNICO</label>

            <input
              id="email"
              type="email"
              value={email}
              disabled
              readOnly
            />

            <span className="help-text">
              El correo electrónico no se modifica desde esta sección.
            </span>
          </div>

          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="message success-message">
              {success}
            </div>
          )}

          <button
            type="button"
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </section>

        <div className="footer-text">
          STORE GAMING
        </div>
      </div>
    </main>
  );
}
