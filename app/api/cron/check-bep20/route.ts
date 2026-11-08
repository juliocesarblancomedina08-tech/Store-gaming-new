import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ======================================================
// VARIABLES DE ENTORNO
// ======================================================

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ANKR_API_KEY =
  process.env.ANKR_API_KEY!;

const CRON_SECRET =
  process.env.CRON_SECRET!;

// ======================================================
// CONFIGURACIÓN ANKR / BSC
// ======================================================

const BSC_RPC_URL =
  `https://rpc.ankr.com/bsc/${ANKR_API_KEY}`;

// ======================================================
// CONFIGURACIÓN USDT BEP20
// ======================================================

const RECEIVING_WALLET =
  "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77";

const USDT_CONTRACT =
  "0x55d398326f99059fF775485246999027B3197955";

const USDT_DECIMALS = 18;

// ======================================================
// CONFIGURACIÓN DEL DETECTOR
// ======================================================

const BLOCK_LOOKBACK = 800;
const MIN_CONFIRMATIONS = 2;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// ======================================================
// SUPABASE ADMIN
// ======================================================

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ======================================================
// TIPOS
// ======================================================

type Deposit = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  amount: number | string;
  currency: string | null;
  payment_method: string | null;
  network: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  status: string | null;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string | null;
  credited_at: string | null;
};

type RpcError = {
  code?: number;
  message?: string;
  data?: unknown;
};

type RpcResponse<T> = {
  jsonrpc?: string;
  id?: number;
  result?: T;
  error?: RpcError;
};

type RpcLog = {
  removed?: boolean;
  transactionHash?: string;
  blockNumber?: string;
  address?: string;
  data?: string;
  topics?: string[];
};

type RpcBlock = {
  number?: string;
  timestamp?: string;
};

type RpcReceipt = {
  transactionHash?: string;
  blockNumber?: string;
  status?: string;
};

type Bep20Transfer = {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  contractAddress: string;
  rawValue: string;
  confirmations: number;
  successful: boolean;
};

type ProcessResult = {
  deposit_id: string;
  status: string;
  tx_hash?: string;
  amount?: number;
  error?: string;
};

// ======================================================
// AUTORIZACIÓN DEL CRON
// ======================================================

function isAuthorized(
  request: NextRequest
): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() ?? "";

  const authorization =
    request.headers.get("authorization")?.trim() ?? "";

  const parts = authorization.split(/\s+/);
  const scheme = parts[0]?.toLowerCase() ?? "";
  const providedSecret = parts.slice(1).join(" ").trim();

  const hasSecret = secret.length > 0;
  const hasAuthorization = authorization.length > 0;

  const secretMatches =
    hasSecret &&
    providedSecret.length > 0 &&
    providedSecret === secret;

  const authorized =
    scheme === "bearer" &&
    secretMatches;

  console.log("CRON DEBUG:", {
    hasSecret,
    secretLength: secret.length,
    hasAuthorization,
    authorizationScheme: scheme || null,
    providedSecretLength: providedSecret.length,
    secretMatches,
  });

  return authorized;
}

// ======================================================
// NORMALIZAR DIRECCIONES
// ======================================================

function normalizeAddress(
  address: string | null | undefined
): string {
  return (address ?? "")
    .trim()
    .toLowerCase();
}

// ======================================================
// PONER DIRECCIÓN EN FORMATO TOPIC
// ======================================================

function addressToTopic(
  address: string
): string {
  const clean =
    address
      .trim()
      .toLowerCase()
      .replace(/^0x/, "");

  if (!/^[0-9a-f]{40}$/.test(clean)) {
    throw new Error(
      "DIRECCIÓN BSC INVÁLIDA"
    );
  }

  return "0x" + "0".repeat(24) + clean;
}

// ======================================================
// CONVERTIR USDT A RAW
// ======================================================

function usdtToRaw(
  amount: number | string
): string {
  const text = String(amount).trim();

  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error(
      `CANTIDAD USDT INVÁLIDA: ${text}`
    );
  }

  const parts = text.split(".");

  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";

  if (fraction.length > USDT_DECIMALS) {
    throw new Error(
      "LA CANTIDAD TIENE DEMASIADOS DECIMALES"
    );
  }

  const paddedFraction = (
    fraction +
    "0".repeat(USDT_DECIMALS)
  ).slice(0, USDT_DECIMALS);

  const rawText =
    whole + paddedFraction;

  return BigInt(rawText || "0").toString();
}

// ======================================================
// RPC ANKR
// ======================================================

async function rpcCall<T>(
  method: string,
  params: unknown[]
): Promise<T> {
  if (!ANKR_API_KEY) {
    throw new Error(
      "ANKR_API_KEY NO ESTÁ CONFIGURADA"
    );
  }

  const response = await fetch(
    BSC_RPC_URL,
    {
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
    }
  );

  if (!response.ok) {
    throw new Error(
      `ANKR HTTP ${response.status}`
    );
  }

  const data =
    (await response.json()) as RpcResponse<T>;

  if (data.error) {
    throw new Error(
      `ANKR RPC ${data.error.code ?? ""}: ${
        data.error.message ??
        "ERROR RPC DESCONOCIDO"
      }`
    );
  }

  if (data.result === undefined) {
    throw new Error(
      "ANKR RPC NO DEVOLVIÓ RESULTADO"
    );
  }

  return data.result;
}

// ======================================================
// OBTENER BLOQUE ACTUAL
// ======================================================

async function getLatestBlockNumber(): Promise<number> {
  const blockHex =
    await rpcCall<string>(
      "eth_blockNumber",
      []
    );

  return Number(BigInt(blockHex));
}

// ======================================================
// OBTENER BLOQUE
// ======================================================

async function getBlockByNumber(
  blockNumber: number
): Promise<RpcBlock | null> {
  const blockHex =
    "0x" + blockNumber.toString(16);

  return rpcCall<RpcBlock | null>(
    "eth_getBlockByNumber",
    [
      blockHex,
      false,
    ]
  );
}

// ======================================================
// OBTENER RECEIPT
// ======================================================

async function getTransactionReceipt(
  txHash: string
): Promise<RpcReceipt | null> {
  return rpcCall<RpcReceipt | null>(
    "eth_getTransactionReceipt",
    [txHash]
  );
}

// ======================================================
// OBTENER TRANSFERENCIAS BEP20
// ======================================================

async function getBep20Transfers(
  deposits: Deposit[]
): Promise<Bep20Transfer[]> {
  if (deposits.length === 0) {
    return [];
  }

  const latestBlock =
    await getLatestBlockNumber();

  const fromBlock = Math.max(
    0,
    latestBlock - BLOCK_LOOKBACK
  );

  const expectedAmounts =
    new Set<string>();

  for (const deposit of deposits) {
    try {
      expectedAmounts.add(
        usdtToRaw(deposit.amount)
      );
    } catch {
      // Una cantidad incorrecta no detiene el detector.
    }
  }

  // ====================================================
  // FILTRO DEL EVENTO TRANSFER
  // ====================================================

  const logs =
    await rpcCall<RpcLog[]>(
      "eth_getLogs",
      [
        {
          fromBlock:
            "0x" + fromBlock.toString(16),

          toBlock:
            "0x" + latestBlock.toString(16),

          address: USDT_CONTRACT,

          topics: [
            TRANSFER_TOPIC,
            null,
            addressToTopic(RECEIVING_WALLET),
          ],
        },
      ]
    );

  const transfers: Bep20Transfer[] = [];

  // ====================================================
  // PROCESAR LOGS
  // ====================================================

  for (const log of logs) {
    try {
      if (log.removed) {
        continue;
      }

      const txHash = log.transactionHash;
      const blockHex = log.blockNumber;
      const contractAddress = log.address;
      const topics = log.topics ?? [];
      const data = log.data;

      if (
        !txHash ||
        !blockHex ||
        !contractAddress ||
        !data
      ) {
        continue;
      }

      if (topics.length < 3) {
        continue;
      }

      if (
        normalizeAddress(contractAddress) !==
        normalizeAddress(USDT_CONTRACT)
      ) {
        continue;
      }

      if (
        normalizeAddress(topics[0]) !==
        normalizeAddress(TRANSFER_TOPIC)
      ) {
        continue;
      }

      // FROM

      const fromTopic = topics[1];

      if (!fromTopic || fromTopic.length < 42) {
        continue;
      }

      const from =
        "0x" +
        fromTopic.slice(-40).toLowerCase();

      // TO

      const toTopic = topics[2];

      if (!toTopic || toTopic.length < 42) {
        continue;
      }

      const to =
        "0x" +
        toTopic.slice(-40).toLowerCase();

      if (
        normalizeAddress(to) !==
        normalizeAddress(RECEIVING_WALLET)
      ) {
        continue;
      }

      // VALOR RAW

      let rawValue: string;

      try {
        rawValue = BigInt(data).toString();
      } catch {
        continue;
      }

      if (!expectedAmounts.has(rawValue)) {
        continue;
      }

      const blockNumber =
        Number(BigInt(blockHex));

      // BLOQUE DE LA TRANSFERENCIA

      const block =
        await getBlockByNumber(blockNumber);

      if (!block || !block.timestamp) {
        continue;
      }

      const timestamp =
        Number(BigInt(block.timestamp)) * 1000;

      // RECEIPT

      const receipt =
        await getTransactionReceipt(txHash);

      if (!receipt) {
        continue;
      }

      const successful =
        normalizeAddress(receipt.status) === "0x1";

      if (!successful) {
        continue;
      }

      if (receipt.blockNumber) {
        const receiptBlock =
          Number(BigInt(receipt.blockNumber));

        if (receiptBlock !== blockNumber) {
          continue;
        }
      }

      // CONFIRMACIONES

      const confirmations =
        latestBlock - blockNumber + 1;

      transfers.push({
        hash: txHash,
        blockNumber,
        timestamp,
        from,
        to,
        contractAddress,
        rawValue,
        confirmations,
        successful,
      });
    } catch (error) {
      console.error(
        "ERROR PROCESANDO LOG BEP20:",
        error
      );
    }
  }

  return transfers;
}

// ======================================================
// EXPIRAR DEPÓSITOS
// ======================================================

async function expireDeposits(): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } =
    await supabaseAdmin
      .from("deposits")
      .update({
        status: "EXPIRED",
      })
      .eq("status", "PENDING")
      .lt("expires_at", now)
      .select("id");

  if (error) {
    throw new Error(
      `ERROR EXPIRANDO DEPÓSITOS: ${error.message}`
    );
  }

  return data?.length ?? 0;
}

// ======================================================
// OBTENER DEPÓSITOS PENDIENTES
// ======================================================

async function getPendingDeposits(): Promise<Deposit[]> {
  const { data, error } =
    await supabaseAdmin
      .from("deposits")
      .select("*")
      .eq("status", "PENDING")
      .eq("network", "BEP20")
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `ERROR OBTENIENDO DEPÓSITOS: ${error.message}`
    );
  }

  return (data || []) as unknown as Deposit[];
}

// ======================================================
// VALIDAR TRANSFERENCIA PARA DEPÓSITO
// ======================================================

function isValidTransfer(
  transfer: Bep20Transfer,
  deposit: Deposit
): boolean {
  if (
    normalizeAddress(deposit.wallet_address) !==
    normalizeAddress(RECEIVING_WALLET)
  ) {
    return false;
  }

  if (
    normalizeAddress(transfer.to) !==
    normalizeAddress(RECEIVING_WALLET)
  ) {
    return false;
  }

  if (
    normalizeAddress(transfer.contractAddress) !==
    normalizeAddress(USDT_CONTRACT)
  ) {
    return false;
  }

  if (!transfer.successful) {
    return false;
  }

  if (
    transfer.confirmations <
    MIN_CONFIRMATIONS
  ) {
    return false;
  }

  let expectedRaw: string;

  try {
    expectedRaw = usdtToRaw(deposit.amount);
  } catch {
    return false;
  }

  if (transfer.rawValue !== expectedRaw) {
    return false;
  }

  const createdAt =
    new Date(deposit.created_at).getTime();

  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const expiresAt = deposit.expires_at
    ? new Date(deposit.expires_at).getTime()
    : createdAt + 10 * 60 * 1000;

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  if (
    transfer.timestamp < createdAt ||
    transfer.timestamp > expiresAt
  ) {
    return false;
  }

  return true;
}

// ======================================================
// CONFIRMAR DEPÓSITO EN SUPABASE
// ======================================================

async function confirmDeposit(
  deposit: Deposit,
  transfer: Bep20Transfer
): Promise<ProcessResult> {
  try {
    const { data, error } =
      await supabaseAdmin.rpc(
        "confirm_deposit_chain",
        {
          p_deposit_id: deposit.id,
          p_tx_hash: transfer.hash,
        }
      );

    if (error) {
      throw new Error(error.message);
    }

    return {
      deposit_id: deposit.id,
      status: "CONFIRMED",
      tx_hash: transfer.hash,
      amount: Number(deposit.amount),
    };
  } catch (error) {
    return {
      deposit_id: deposit.id,
      status: "ERROR",
      error:
        error instanceof Error
          ? error.message
          : "ERROR CONFIRMANDO DEPÓSITO",
    };
  }
}

// ======================================================
// PROCESAR DEPÓSITOS
// ======================================================

async function processDeposits(
  deposits: Deposit[],
  transfers: Bep20Transfer[]
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  const usedTransactions =
    new Set<string>();

  for (const deposit of deposits) {
    const matchingTransfers =
      transfers.filter(
        (transfer) =>
          !usedTransactions.has(
            transfer.hash.toLowerCase()
          ) &&
          isValidTransfer(transfer, deposit)
      );

    if (matchingTransfers.length === 0) {
      results.push({
        deposit_id: deposit.id,
        status: "WAITING",
      });

      continue;
    }

    if (matchingTransfers.length > 1) {
      results.push({
        deposit_id: deposit.id,
        status: "MULTIPLE_MATCHES",
        error:
          "SE ENCONTRARON VARIAS TRANSACCIONES CON LA MISMA CANTIDAD DENTRO DE LA VENTANA DEL DEPÓSITO.",
      });

      continue;
    }

    const transfer = matchingTransfers[0];

    usedTransactions.add(
      transfer.hash.toLowerCase()
    );

    const result =
      await confirmDeposit(deposit, transfer);

    results.push(result);
  }

  return results;
}

// ======================================================
// GET
// ======================================================

export async function GET(
  request: NextRequest
) {
  try {
    // AUTORIZACIÓN

    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO AUTORIZADO",
        },
        { status: 401 }
      );
    }

    // VERIFICAR CONFIGURACIÓN

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "FALTAN VARIABLES DE SUPABASE",
        },
        { status: 500 }
      );
    }

    if (!ANKR_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "FALTA ANKR_API_KEY",
        },
        { status: 500 }
      );
    }

    // EXPIRAR DEPÓSITOS

    const expired =
      await expireDeposits();

    // OBTENER PENDIENTES

    const deposits =
      await getPendingDeposits();

    // SI NO HAY DEPÓSITOS

    if (deposits.length === 0) {
      return NextResponse.json({
        ok: true,
        expired,
        pending: 0,
        transfers: 0,
        processed: 0,
        results: [],
      });
    }

    // BUSCAR TRANSFERENCIAS EN BSC

    const transfers =
      await getBep20Transfers(deposits);

    // PROCESAR

    const results =
      await processDeposits(
        deposits,
        transfers
      );

    // RESPUESTA

    return NextResponse.json({
      ok: true,
      expired,
      pending: deposits.length,
      transfers: transfers.length,
      processed: results.filter(
        (result) => result.status === "CONFIRMED"
      ).length,
      results,
    });
  } catch (error) {
    console.error(
      "CHECK BEP20 ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ERROR INTERNO",
      },
      { status: 500 }
    );
  }
}
