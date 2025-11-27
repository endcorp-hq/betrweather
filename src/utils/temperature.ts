import { TemperatureUnit } from "@/contexts/TemperatureUnitContext";

export interface FormatTemperatureOptions {
  decimals?: number;
  fallback?: string;
  includeSymbol?: boolean;
  appendUnitLabel?: boolean;
}

export const extractCelsiusValue = (
  value?: string | number | null
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const convertCelsiusToUnit = (
  celsiusValue: number,
  unit: TemperatureUnit
): number => {
  if (!Number.isFinite(celsiusValue)) {
    return celsiusValue;
  }

  if (unit === "F") {
    return celsiusValue * (9 / 5) + 32;
  }

  return celsiusValue;
};

export const formatTemperature = (
  baseValue?: string | number | null,
  unit: TemperatureUnit = "C",
  options: FormatTemperatureOptions = {}
) => {
  const {
    decimals = 0,
    fallback = "--",
    includeSymbol = true,
    appendUnitLabel = false,
  } = options;

  const celsiusValue = extractCelsiusValue(baseValue);
  if (celsiusValue === null) {
    return fallback;
  }

  const convertedValue = convertCelsiusToUnit(celsiusValue, unit);
  const roundedValue =
    decimals > 0
      ? convertedValue.toFixed(decimals)
      : Math.round(convertedValue).toString();

  const symbol = includeSymbol ? "°" : "";
  const unitLabel = appendUnitLabel ? unit : "";

  return `${roundedValue}${symbol}${unitLabel}`;
};
