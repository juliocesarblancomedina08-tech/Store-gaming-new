
import { NextRequest, NextResponse } from "next/server";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: NO_CACHE_HEADERS }
  );
}

function encryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;

  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      "Falta configurar API_KEY_ENCRYPTION_SECRET en las variables de entorno."
    );
  }

  return Buffer.from(secret, "hex");
}

function encryptApiKey(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptApiKey(value: string): string {
  const parts = value.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("El formato de la clave cifrada no es válido.");
  }

  const [, ivHex, tagHex, encryptedHex] = parts;

  if (
    !/^[a-fA-F0-9]{24}$/.test(ivHex) ||
    !/^[a-fA-F0-9]{32}$/.test(tagHex) ||
    !/^(?:[a-fA-F0-9]{2})+$/.test(encryptedHex)
  ) {
    throw new Error("Los datos de la clave cifrada no son válidos.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

async function authenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Debes iniciar sesión para administrar tu API.",
      status: 401,
    };
  }

  const accessToken = authorization.slice(7).trim();

  if (!accessToken) {
    return {
      user: null,
      error: "El token de sesión no es válido.",
      status: 401,
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return {
      user: null,
      error: "La sesión ha caducado. Inicia sesión nuevamente.",
      status: 401,
    };
  }

  return { user, error: null, status: 200 };
}

function databaseError(message: string, code?: string) {
  console.error("Error en api_partners:", code, message);

  if (code === "42703" || code === "PGRST204") {
    return errorResponse(
      "Falta la columna api_key_encrypted en api_partners. Debes añadirla en Supabase antes de administrar las claves.",
      500
    );
  }

  return errorResponse("No se pudo completar la operación en la base de datos.", 500);
}

function makeApiKey(): string {
  return "sg_live_" + randomBytes(32).toString("hex");
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

// Consultar la clave de la cuenta sin crear ni reemplazar ninguna.
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticatedUser(request);

    if (!auth.user) {
      return errorResponse(auth.error!, auth.status);
    }

    const { data: existing, error } = await supabaseAdmin
      .from("api_partners")
      .select("id, active, created_at, api_key_encrypted")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) {
      return databaseError(error.message, error.code);
    }

    if (!existing) {
      return NextResponse.json(
        {
          success: true,
          hasKey: false,
          created: false,
          message: "Esta cuenta todavía no tiene una clave API.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!existing.api_key_encrypted) {
      return NextResponse.json(
        {
          success: true,
          hasKey: true,
          active: existing.active,
          createdAt: existing.created_at,
          needsRecovery: true,
          message:
            "Existe una clave anterior que no se puede recuperar. Puedes generar una nueva.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    let apiKey: string;

    try {
      apiKey = decryptApiKey(existing.api_key_encrypted);
    } catch (error) {
      console.error("No se pudo descifrar la clave API:", error);

      return errorResponse(
        "No se pudo descifrar la clave. Comprueba que API_KEY_ENCRYPTION_SECRET sea la misma que se utilizó al cifrarla.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        hasKey: true,
        created: false,
        apiKey,
        active: existing.active,
        createdAt: existing.created_at,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error en GET api-key:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado al consultar la clave.",
      500
    );
  }
}

// Crear una clave únicamente si la cuenta todavía no tiene una.
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticatedUser(request);

    if (!auth.user) {
      return errorResponse(auth.error!, auth.status);
    }

    const { data: existing, error: searchError } = await supabaseAdmin
      .from("api_partners")
      .select("id, active, created_at, api_key_encrypted")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (searchError) {
      return databaseError(searchError.message, searchError.code);
    }

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          created: false,
          hasKey: true,
          active: existing.active,
          createdAt: existing.created_at,
          needsRecovery: !existing.api_key_encrypted,
          message: existing.api_key_encrypted
            ? "La cuenta ya tiene una clave API."
            : "La cuenta tiene una clave anterior que no se puede recuperar.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const apiKey = makeApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyEncrypted = encryptApiKey(apiKey);

    const name =
      auth.user.email?.trim().toLowerCase() ||
      `usuario-${auth.user.id}`;

    const { data: created, error: insertError } = await supabaseAdmin
      .from("api_partners")
      .insert({
        user_id: auth.user.id,
        name,
        api_key_hash: apiKeyHash,
        api_key_encrypted: apiKeyEncrypted,
        active: true,
      })
      .select("id, active, created_at")
      .single();

    if (insertError || !created) {
      if (insertError?.code === "23505") {
        return errorResponse(
          "Ya existe una clave para esta cuenta. Actualiza el estado para consultarla.",
          409
        );
      }

      return databaseError(
        insertError?.message || "No se pudo guardar la clave.",
        insertError?.code
      );
    }

    return NextResponse.json(
      {
        success: true,
        created: true,
        hasKey: true,
        apiKey,
        active: created.active,
        createdAt: created.created_at,
        message: "Clave API creada correctamente.",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error en POST api-key:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado al crear la clave.",
      500
    );
  }
}

// Reemplazar una clave antigua que no se puede recuperar.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticatedUser(request);

    if (!auth.user) {
      return errorResponse(auth.error!, auth.status);
    }

    const { data: existing, error: searchError } = await supabaseAdmin
      .from("api_partners")
      .select("id, active, created_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (searchError) {
      return databaseError(searchError.message, searchError.code);
    }

    if (!existing) {
      return errorResponse(
        "No existe una clave API para reemplazar. Crea una primero.",
        404
      );
    }

    const apiKey = makeApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyEncrypted = encryptApiKey(apiKey);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("api_partners")
      .update({
        api_key_hash: apiKeyHash,
        api_key_encrypted: apiKeyEncrypted,
        active: true,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.user.id)
      .select("id, active, created_at")
      .single();

    if (updateError || !updated) {
      return databaseError(
        updateError?.message || "No se pudo reemplazar la clave.",
        updateError?.code
      );
    }

    return NextResponse.json(
      {
        success: true,
        created: true,
        hasKey: true,
        apiKey,
        active: updated.active,
        createdAt: updated.created_at,
        message:
          "Clave reemplazada. La clave anterior ya no será válida.",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error en PATCH api-key:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado al reemplazar la clave.",
      500
    );
  }
}
