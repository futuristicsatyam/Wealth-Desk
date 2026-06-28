import { prisma } from "@/lib/prisma";

export const LOT_SIZE_SETTINGS_SLUG = "settings:lot-sizes";

export const DEFAULT_INDEX_LOT_SIZES: Record<string, number> = {
  NIFTY: 75,
  BANKNIFTY: 30,
  FINNIFTY: 65,
  MIDCPNIFTY: 120,
  SENSEX: 10,
  BANKEX: 15
};

export type LotSizeMap = Record<string, number>;

function normalizeLotSizeMap(raw: unknown): LotSizeMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return Object.entries(raw).reduce<LotSizeMap>((acc, [instrument, value]) => {
    const key = instrument.trim().toUpperCase();
    const num = Number(value);
    if (!key || !Number.isFinite(num) || num <= 0) {
      return acc;
    }

    acc[key] = Math.round(num);
    return acc;
  }, {});
}

export async function getConfiguredIndexLotSizes(): Promise<LotSizeMap> {
  const content = await prisma.managedContent.findUnique({
    where: { slug: LOT_SIZE_SETTINGS_SLUG },
    select: { body: true }
  });

  if (!content?.body) {
    return DEFAULT_INDEX_LOT_SIZES;
  }

  try {
    const parsed = JSON.parse(content.body) as unknown;
    const overrides = normalizeLotSizeMap(parsed);
    return { ...DEFAULT_INDEX_LOT_SIZES, ...overrides };
  } catch {
    return DEFAULT_INDEX_LOT_SIZES;
  }
}
