
export function extractApiError(err, fallback = "Request failed.") {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string") {
      return detail.message;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return err?.message || fallback;
}

export function formatProbability(value) {
  const number = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 1
  ) {
    return "N/A";
  }

  return `${(number * 100).toFixed(2)}%`;
}

export function formatCost(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(2)} cost units`
    : "N/A";
}
