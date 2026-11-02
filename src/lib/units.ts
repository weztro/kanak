import { BaseUnit } from "@/types/database";

export interface UnitDefinition {
  label: string;
  value: string;
  baseUnit: BaseUnit;
  conversionFactor: number; // Multiply user quantity by factor to get baseUnit
  category: "mass" | "volume" | "discrete";
}

export const SUPPORTED_UNITS: UnitDefinition[] = [
  // Mass
  { label: "Kilogram (kg)", value: "kg", baseUnit: "g", conversionFactor: 1000, category: "mass" },
  { label: "Gram (g)", value: "g", baseUnit: "g", conversionFactor: 1, category: "mass" },

  // Volume
  { label: "Litre (L)", value: "l", baseUnit: "ml", conversionFactor: 1000, category: "volume" },
  { label: "Millilitre (ml)", value: "ml", baseUnit: "ml", conversionFactor: 1, category: "volume" },

  // Discrete / Count
  { label: "Pieces (pcs)", value: "pcs", baseUnit: "pcs", conversionFactor: 1, category: "discrete" },
  { label: "Packet (pack)", value: "pack", baseUnit: "pcs", conversionFactor: 1, category: "discrete" },
  { label: "Box", value: "box", baseUnit: "pcs", conversionFactor: 1, category: "discrete" },
  { label: "Bottle", value: "bottle", baseUnit: "pcs", conversionFactor: 1, category: "discrete" },
  { label: "Roll", value: "roll", baseUnit: "pcs", conversionFactor: 1, category: "discrete" },
];

/**
 * Normalizes a quantity with its unit into its base unit.
 * E.g., 2.5 kg -> 2500 g, 1.5 l -> 1500 ml.
 */
export function normalizeQuantity(quantity: number, unit: string): { normalizedQuantity: number; baseUnit: BaseUnit } {
  const found = SUPPORTED_UNITS.find((u) => u.value.toLowerCase() === unit.toLowerCase());
  if (!found) {
    return {
      normalizedQuantity: quantity,
      baseUnit: (unit as BaseUnit) || "pcs",
    };
  }

  const normalized = Number((quantity * found.conversionFactor).toFixed(3));
  return {
    normalizedQuantity: normalized,
    baseUnit: found.baseUnit,
  };
}

/**
 * Formats a normalized base quantity into a friendly readable unit.
 * E.g. 2500 g -> "2.5 kg", 450 g -> "450 g", 1200 ml -> "1.2 L".
 */
export function formatFriendlyStock(quantity: number, baseUnit: string): string {
  if (baseUnit === "g" && quantity >= 1000) {
    const inKg = quantity / 1000;
    return `${Number(inKg.toFixed(2))} kg`;
  }
  if (baseUnit === "ml" && quantity >= 1000) {
    const inL = quantity / 1000;
    return `${Number(inL.toFixed(2))} L`;
  }
  return `${Number(quantity.toFixed(2))} ${baseUnit}`;
}

