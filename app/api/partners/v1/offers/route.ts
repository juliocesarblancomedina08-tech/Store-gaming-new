
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { ARENA_BREAKOUT } from "../../../../../lib/games/arena-breakout";
import { BLOOD_STRIKE } from "../../../../../lib/games/blood-strike";
import { CALL_OF_DUTY } from "../../../../../lib/games/call-of-duty";
import {
  DELTA_FORCE_CATEGORY_ID,
  DELTA_FORCE_OFFERS,
} from "../../../../../lib/games/delta-force";
import { FC_MOBILE_ID } from "../../../../../lib/games/fc-mobile-id";
import { FREE_FIRE_ID } from "../../../../../lib/games/free-fire-id";
import { FREE_FIRE_LATAM } from "../../../../../lib/games/free-fire-latam";
import { HONOR_OF_KINGS } from "../../../../../lib/games/honor-of-kings";
import { LEAGUE_OF_LEGENDS_ID } from "../../../../../lib/games/league-of-legends-id";
import { SAUSAGE_MAN } from "../../../../../lib/games/sausage-man";
import { MOBILE_LEGENDS_GLOBAL } from "../../../../../lib/mobile-legends-global";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, max-age=0",
  Pragma: "no-cache",
};

type UnknownRecord = Record<string, unknown>;

type CatalogSource = {
  id: string;
  name: string;
  categoryId: string;
  page: string;
  image?: string;
  note?: string;
  source: readonly unknown[];
  field?: unknown;
  fields?: readonly unknown[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function normalizeFields(value: unknown) {
  if (!isRecord(value)) return [];

  const candidates = Array.isArray(value.fields)
    ? value.fields
    : [
        isRecord(value.field)
          ? value.field
          : isRecord(value.playerField)
            ? value.playerField
            : null,
      ];

  return candidates.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const name = getString(candidate.key) ?? getString(candidate.name);
    if (!name) return [];

    return [{
      name,
      label: getString(candidate.label) ?? name,
      type: getString(candidate.type) ?? "text",
      required: true,
    }];
  });
}

function normalizeOffers(source: readonly unknown[]) {
  return source.flatMap((value) => {
    if (!isRecord(value)) return [];

    const id = getString(value.id);
    const name = getString(value.name) ?? getString(value.displayName);
    const price = typeof value.price === "number" ? value.price : Number.NaN;

    if (!id || !name || !Number.isFinite(price) || price < 0) return [];

    const displayName = getString(value.displayName) ?? getString(value.display);

    // Solo se publican datos comerciales. Nunca devolver supplierPrice,
    // supplier_price ni identificadores internos del proveedor.
    return [
      {
        id,
        name,
        ...(displayName ? { displayName } : {}),
        price: Number(price.toFixed(4)),
        currency: "USD",
        published: true,
      },
    ];
  });
}

const CATALOG: CatalogSource[] = [
  {
    id: "free-fire-latam",
    name: FREE_FIRE_LATAM.game,
    categoryId: FREE_FIRE_LATAM.categoryId,
    page: "/games/free-fire-latam",
    image: FREE_FIRE_LATAM.image,
    note: FREE_FIRE_LATAM.note,
    field: FREE_FIRE_LATAM.playerField,
    source: FREE_FIRE_LATAM.offers,
  },
  {
    id: "free-fire-id",
    name: FREE_FIRE_ID.name,
    categoryId: FREE_FIRE_ID.categoryId,
    page: "/games/free-fire-id",
    image: FREE_FIRE_ID.image,
    note: FREE_FIRE_ID.note,
    field: FREE_FIRE_ID.field,
    source: FREE_FIRE_ID.offers,
  },
  {
    id: "call-of-duty-mobile-us",
    name: CALL_OF_DUTY.name,
    categoryId: CALL_OF_DUTY.categoryId,
    page: "/games/call-of-duty",
    image: CALL_OF_DUTY.image,
    note: CALL_OF_DUTY.note,
    field: { key: "player_id", label: "Activision ID", type: "text" },
    source: CALL_OF_DUTY.offers,
  },
  {
    id: "mobile-legends-global",
    name: MOBILE_LEGENDS_GLOBAL.name,
    categoryId: MOBILE_LEGENDS_GLOBAL.categoryId,
    page: "/games/mobile-legends-global",
    fields: MOBILE_LEGENDS_GLOBAL.fields,
    source: MOBILE_LEGENDS_GLOBAL.offers,
  },
  {
    id: "blood-strike",
    name: BLOOD_STRIKE.name,
    categoryId: BLOOD_STRIKE.categoryId,
    page: "/games/blood-strike",
    image: BLOOD_STRIKE.image,
    note: BLOOD_STRIKE.note,
    field: BLOOD_STRIKE.playerField,
    source: BLOOD_STRIKE.offers,
  },
  {
    id: "arena-breakout",
    name: ARENA_BREAKOUT.name,
    categoryId: ARENA_BREAKOUT.categoryId,
    page: "/games/arena-breakout",
    image: ARENA_BREAKOUT.image,
    note: ARENA_BREAKOUT.note,
    field: ARENA_BREAKOUT.field,
    source: ARENA_BREAKOUT.offers,
  },
  {
    id: "delta-force",
    name: "Delta Force",
    categoryId: DELTA_FORCE_CATEGORY_ID,
    page: "/games/delta-force",
    source: DELTA_FORCE_OFFERS,
  },
  {
    id: "fc-mobile-id",
    name: FC_MOBILE_ID.name,
    categoryId: FC_MOBILE_ID.categoryId,
    page: "/games/fc-mobile-id",
    image: FC_MOBILE_ID.image,
    note: FC_MOBILE_ID.note,
    field: FC_MOBILE_ID.field,
    source: FC_MOBILE_ID.offers,
  },
  {
    id: "honor-of-kings",
    name: HONOR_OF_KINGS.name,
    categoryId: HONOR_OF_KINGS.categoryId,
    page: "/games/honor-of-kings",
    image: HONOR_OF_KINGS.image,
    note: HONOR_OF_KINGS.note,
    field: HONOR_OF_KINGS.field,
    source: HONOR_OF_KINGS.offers,
  },
  {
    id: "league-of-legends-id",
    name: LEAGUE_OF_LEGENDS_ID.name,
    categoryId: LEAGUE_OF_LEGENDS_ID.categoryId,
    page: "/games/league-of-legends-id",
    image: LEAGUE_OF_LEGENDS_ID.image,
    note: LEAGUE_OF_LEGENDS_ID.note,
    field: LEAGUE_OF_LEGENDS_ID.field,
    source: LEAGUE_OF_LEGENDS_ID.offers,
  },
  {
    id: "sausage-man",
    name: SAUSAGE_MAN.name,
    categoryId: SAUSAGE_MAN.categoryId,
    page: "/games/sausage-man",
    image: SAUSAGE_MAN.image,
    note: SAUSAGE_MAN.note,
    field: SAUSAGE_MAN.field,
    source: SAUSAGE_MAN.offers,
  },
];

async function authenticatePartner(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const apiKey = authorization.slice("Bearer ".length).trim();
  if (!apiKey || apiKey.length > 256) return false;

  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  const { data, error } = await supabaseAdmin
    .from("api_partners")
    .select("id")
    .eq("api_key_hash", apiKeyHash)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Error autenticando socio API:", error.code);
    throw new Error("No se pudo validar la clave API.");
  }

  return Boolean(data?.id);
}

export async function GET(request: NextRequest) {
  try {
    const authorized = await authenticatePartner(request);

    if (!authorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Clave API ausente, inválida o desactivada.",
          code: "UNAUTHORIZED",
        },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceFilter = searchParams.get("service")?.trim().toLowerCase();
    const search = searchParams.get("q")?.trim().toLowerCase();

    let services = CATALOG.map((item) => {
      const sourceRecord = {
        field: item.field,
        fields: item.fields,
      };

      return {
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        type: "game_topup",
        published: true,
        currency: "USD",
        page: item.page,
        ...(item.image ? { image: item.image } : {}),
        ...(item.note ? { description: item.note } : {}),
        requiredFields: normalizeFields(sourceRecord),
        offers: normalizeOffers(item.source),
      };
    });

    if (serviceFilter) {
      services = services.filter(
        (item) =>
          item.id.toLowerCase() === serviceFilter ||
          item.categoryId.toLowerCase() === serviceFilter
      );
    }

    if (search) {
      services = services
        .map((service) => ({
          ...service,
          offers: service.offers.filter((offer) =>
            `${offer.id} ${offer.name} ${offer.displayName ?? ""}`
              .toLowerCase()
              .includes(search)
          ),
        }))
        .filter(
          (service) =>
            service.name.toLowerCase().includes(search) ||
            service.id.includes(search) ||
            service.offers.length > 0
        );
    }

    return NextResponse.json(
      {
        success: true,
        version: "v1",
        currency: "USD",
        count: services.length,
        services,
        notice:
          "Catálogo de recargas con precios publicados. La disponibilidad final se confirma al procesar cada compra.",
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error en API de ofertas para socios:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo consultar el catálogo de ofertas.",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
