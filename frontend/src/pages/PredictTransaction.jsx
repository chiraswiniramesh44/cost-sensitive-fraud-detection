
import { useState } from "react";
import transactionService from "../services/transactionService";

const createInitialFeatures = () => ({
  Time: "50000",
  Amount: "500",
  ...Object.fromEntries(
    Array.from({ length: 28 }, (_, index) => [
      `V${index + 1}`,
      "0",
    ])
  ),
});

export default function PredictTransaction() {
  const [features, setFeatures] = useState(createInitialFeatures);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setFeatures((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const numericFeatures = Object.fromEntries(
        Object.entries(features).map(([key, value]) => [
          key,
          Number(value),
        ])
      );

      const response =
        await transactionService.predictTransaction({
          transaction_id: crypto.randomUUID(),
          features: numericFeatures,
        });

      setResult(response);
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : "Prediction failed. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "30px auto",
        padding: 24,
        color: "#172033",
      }}
    >
      <h1>Transaction Fraud Prediction</h1>
      <p>
        Enter transaction features to obtain a prediction
        from the backend ML model.
      </p>

      <form onSubmit={handleSubmit}>
        <h2>Transaction Details</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {Object.entries(features).map(([name, value]) => (
            <label
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontWeight: 500,
              }}
            >
              {name}

              <input
                type="number"
                step="any"
                required
                value={value}
                onChange={(event) =>
                  handleChange(name, event.target.value)
                }
                style={{
                  padding: 10,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  width: "100%",
                }}
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 24,
            padding: "12px 22px",
            border: "none",
            borderRadius: 6,
            background: "#175cd3",
            color: "white",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Predicting..." : "Predict Transaction"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: 14,
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 6,
          }}
        >
          <strong>Prediction Error:</strong> {error}
        </div>
      )}

      {result && (
        <section
          style={{
            marginTop: 28,
            padding: 22,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
          }}
        >
          <h2>Prediction Result</h2>

          <p>
            <strong>Transaction ID:</strong>{" "}
            {result.transaction_id}
          </p>

          <p>
            <strong>Fraud Probability:</strong>{" "}
            {result.fraud_probability}
          </p>

          <p>
            <strong>Risk Level:</strong> {result.risk_level}
          </p>

          <p>
            <strong>Decision:</strong> {result.decision}
          </p>

          <p>
            <strong>Expected Cost:</strong>{" "}
            {result.expected_cost}
          </p>

          <p>
            <strong>Model Version:</strong>{" "}
            {result.model_version}
          </p>

          {Array.isArray(result.explanation) &&
            result.explanation.length > 0 && (
              <>
                <h3>Prediction Explanation</h3>

                <ul>
                  {result.explanation.map((item, index) => (
                    <li key={`${item.feature}-${index}`}>
                      <strong>{item.feature}:</strong>{" "}
                      {item.impact}
                    </li>
                  ))}
                </ul>
              </>
            )}
        </section>
      )}
    </main>
  );
}
