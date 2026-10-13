function RiskBadge({ level }) {
  const normalizedLevel = level?.toUpperCase();

  return (
    <span className={`risk-badge risk-${normalizedLevel?.toLowerCase()}`}>
      {normalizedLevel || "UNKNOWN"}
    </span>
  );
}

export default RiskBadge;