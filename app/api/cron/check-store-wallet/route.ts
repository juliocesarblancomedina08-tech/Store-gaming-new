import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ANKR_API_KEY =
  process.env.ANKR_API_KEY || "";

const CRON_SECRET =
  process.env.CRON_SECRET || "";

const BSC_RPC = ANKR_API_KEY
  ? `https://rpc.ankr.com/bsc/${ANKR_API_KEY}`
  : "https://bsc-dataseed.binance.org/";

const STORE_WALLET =
  "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77";

const USDT_CONTRACT =
  "0x55d398326f99059fF775485246999027B3197955";

const USDT_DECIMALS = 18;
const MIN_CONFIRMATIONS = 2;
const BLOCK_LOOKBACK = 800;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type RpcLog = {
  address?: string;
  topics?: string[];
  data?: string;
  transactionHash?: string;
  blockNumber?: string;
};

type RpcResponse<T> = {
  result?: T;
  error?: {
    message?: string;
    code?: number;
  };
};

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function isAuthorized(request: NextRequest) {
  if (!CRON_SECRET) {
    return false;
  }

  const authorization =
    request.headers.get("authorization") || "";

  const bearerToken = authorization
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cronHeader =
    request.headers.get("x-cron-secret") || "";

  return (
    bearerToken === CRON_SECRET ||
    cronHeader === CRON_SECRET
  );
}

async function rpc<T>(
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(BSC_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Error RPC BSC: HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as RpcResponse<T>;

  if (data.error) {
    throw new Error(
      data.error.message || "Error consultando BSC."
    );
  }

  if (data.result === undefined) {
    throw new Error(
      `La respuesta RPC de ${method} no contiene result.`
    );
  }

  return data.result;
}

/*
 * Convierte un número hexadecimal a decimal sin BigInt.
 * Evita el error de TypeScript causado por los literales 10n.
 */
function hexToDecimalString(hex: string): string {
  const clean = hex
    .toLowerCase()
    .replace(/^0x/, "");

  if (!clean || !/^[0-9a-f]+$/.test(clean)) {
    return "0";
  }

  let decimal = "0";

  for (const character of clean) {
    const digit = parseInt(character, 16);

    let carry = digit;
    let output = "";

    for (
      let index = decimal.length - 1;
      index >= 0;
      index--
    ) {
      const value =
        Number(decimal[index]) * 16 + carry;

      output = String(value % 10) + output;
      carry = Math.floor(value / 10);
    }

    while (carry > 0) {
      output =
        String(carry % 10) + output;

      carry = Math.floor(carry / 10);
    }

    decimal = output.replace(/^0+(?=\d)/, "");
  }

  return decimal || "0";
}

/*
 * Convierte la cantidad mínima de USDT a formato decimal.
 * La cantidad original se conserva sin redondeos de Number.
 */
function rawToUsdt(rawHex: string): string {
  const raw = hexToDecimalString(rawHex);

  const padded = raw.padStart(
    USDT_DECIMALS + 1,
    "0"
  );

  const splitAt =
    padded.length - USDT_DECIMALS;

  const whole = padded.slice(0, splitAt);
  const fraction = padded
    .slice(splitAt)
    .replace(/0+$/, "");

  return fraction
    ? `${whole}.${fraction}`
    : whole;
}

/*
 * Convierte una cantidad decimal a unidades mínimas
 * como texto, sin utilizar BigInt ni números flotantes.
 */
function usdtToRaw(amount: string | number): string {
  const value = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Cantidad USDT inválida.");
  }

  const [wholePart, fractionPart = ""] =
    value.split(".");

  if (fractionPart.length > USDT_DECIMALS) {
    throw new Error(
      "La cantidad supera los decimales permitidos."
    );
  }

  const fraction = fractionPart.padEnd(
    USDT_DECIMALS,
    "0"
  );

  const raw =
    `${wholePart}${fraction}`.replace(
      /^0+(?=\d)/,
      ""
    );

  return raw || "0";
}

function topicAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function normalizeAddress(
  address: string | null | undefined
): string {
  return String(address || "")
    .trim()
    .toLowerCase();
}

function parseBlockNumber(
  value: string | undefined
): number {
  if (!value) return 0;

  const parsed = Number.parseInt(value, 16);

  return Number.isSafeInteger(parsed)
    ? parsed
    : 0;
}

async function findCustomerDeposit(
  amount: string
): Promise<string | null> {
  /*
   * Busca un depósito pendiente que coincida con:
   * - red BEP20
   * - moneda USDT
   * - dirección de la tienda
   * - importe exacto
   * - fecha de expiración no vencida
   *
   * Si hay varios depósitos del mismo importe, no elige
   * automáticamente uno para evitar asignarlo al cliente
   * equivocado.
   */
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("deposits")
    .select(
      "id, amount, network, currency, wallet_address, status, expires_at"
    )
    .eq("network", "BEP20")
    .eq("currency", "USDT")
    .in("status", ["PENDING", "PENDIENTE"])
    .eq("amount", amount)
    .gt("expires_at", now)
    .limit(3);

  if (error) {
    throw new Error(
      `No se pudieron consultar los depósitos: ${error.message}`
    );
  }

  const matches = (data || []).filter(
    (deposit) =>
      normalizeAddress(deposit.wallet_address) ===
      normalizeAddress(STORE_WALLET)
  );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0].id as string;
}

async function processTransfer(
  log: RpcLog,
  currentBlock: number
) {
  const txHash = log.transactionHash;

  if (!txHash) {
    return {
      processed: false,
      reason: "missing_tx_hash",
    };
  }

  const blockNumber =
    parseBlockNumber(log.blockNumber);

  const confirmations = Math.max(
    0,
    currentBlock - blockNumber + 1
  );

  if (
    confirmations < MIN_CONFIRMATIONS
  ) {
    return {
      processed: false,
      reason: "insufficient_confirmations",
    };
  }

  const topics = log.topics || [];

  if (topics.length < 3 || !log.data) {
    return {
      processed: false,
      reason: "invalid_transfer_log",
    };
  }

  const fromAddress =
    topicAddress(topics[1]);

  const toAddress =
    topicAddress(topics[2]);

  if (
    toAddress !==
    normalizeAddress(STORE_WALLET)
  ) {
    return {
      processed: false,
      reason: "different_destination",
    };
  }

  const amount = rawToUsdt(log.data);

  if (
    !/^\d+(\.\d+)?$/.test(amount) ||
    Number(amount) <= 0
  ) {
    return {
      processed: false,
      reason: "invalid_amount",
    };
  }

  /*
   * La restricción UNIQUE(tx_hash) y la función SQL
   * deben garantizar que una transferencia no se procese
   * dos veces.
   */
  const { data: existing, error: existingError } =
    await supabase
      .from("store_wallet_deposits")
      .select("id, status")
      .eq("tx_hash", txHash)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Error comprobando TX existente: ${existingError.message}`
    );
  }

  if (existing) {
    return {
      processed: false,
      reason: "already_processed",
      txHash,
    };
  }

  const customerDepositId =
    await findCustomerDeposit(amount);

  /*
   * IMPORTANTE:
   * Estos nombres de parámetros deben coincidir con la
   * firma de public.process_store_wallet_transfer(...)
   * que tienes instalada en Supabase.
   */
  const { data, error } = await supabase.rpc(
    "process_store_wallet_transfer",
    {
      p_network: "BEP20",
      p_token: "USDT",
      p_wallet_address: STORE_WALLET,
      p_amount: amount,
      p_tx_hash: txHash,
      p_block_number: blockNumber,
      p_from_address: fromAddress,
      p_to_address: toAddress,
      p_confirmations: confirmations,
      p_deposit_id: customerDepositId,
    }
  );

  if (error) {
    /*
     * Si otro proceso registró la misma TX entre la
     * comprobación y el RPC, la función SQL debe manejar
     * la duplicación mediante UNIQUE(tx_hash).
     */
    throw new Error(
      `Error procesando transferencia ${txHash}: ${error.message}`
    );
  }

  return {
    processed: true,
    txHash,
    amount,
    confirmations,
    customerDepositId,
    result: data,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("No autorizado.", 401);
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return jsonError(
      "Falta configurar Supabase en las variables de entorno.",
      500
    );
  }

  try {
    /*
     * 1. Obtener el bloque actual de BSC.
     */
    const latestBlockHex =
      await rpc<string>(
        "eth_blockNumber",
        []
      );

    const currentBlock =
      parseBlockNumber(latestBlockHex);

    if (!currentBlock) {
      throw new Error(
        "No se pudo determinar el bloque actual de BSC."
      );
    }

    /*
     * 2. Calcular el bloque inicial del escaneo.
     */
    const fromBlock = Math.max(
      0,
      currentBlock - BLOCK_LOOKBACK + 1
    );

    const fromBlockHex =
      `0x${fromBlock.toString(16)}`;

    /*
     * 3. Preparar el topic de destino.
     */
    const destinationTopic =
      `0x${normalizeAddress(STORE_WALLET).slice(2).padStart(64, "0")}`;

    /*
     * 4. Obtener transferencias USDT hacia la tienda.
     */
    const logs = await rpc<RpcLog[]>(
      "eth_getLogs",
      [
        {
          fromBlock: fromBlockHex,
          toBlock: latestBlockHex,
          address: USDT_CONTRACT,
          topics: [
            TRANSFER_TOPIC,
            null,
            destinationTopic,
          ],
        },
      ]
    );

    const results: Array<
      Record<string, unknown>
    > = [];

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    /*
     * 5. Procesar las transferencias una por una.
     */
    for (const log of logs) {
      try {
        const result = await processTransfer(
          log,
          currentBlock
        );

        results.push(result);

        if (result.processed) {
          processed++;
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;

        results.push({
          processed: false,
          txHash: log.transactionHash || null,
          error:
            error instanceof Error
              ? error.message
              : "Error desconocido.",
        });
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      network: "BEP20",
      token: "USDT",
      wallet: STORE_WALLET,
      currentBlock,
      fromBlock,
      scanned: logs.length,
      processed,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "[check-store-wallet]",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Error revisando la wallet."
    );
  }
      }
