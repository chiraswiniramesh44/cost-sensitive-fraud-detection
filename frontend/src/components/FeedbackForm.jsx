import { useState } from "react";
import feedbackService from "../services/feedbackService";
import { FEEDBACK_DECISIONS } from "../utils/constants";

const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

function FeedbackForm({ transactionId, onSubmitted, onSubmit }) {
  const [feedback, setFeedback] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!feedback) {
      setError("Select a feedback decision.");
      return;
    }

    setLoading(true);

    try {
      if (demoMode) {
        setMessage(
          "Demo only: feedback accepted for this demonstration. It has not been saved to the database."
        );
      } else if (onSubmit) {
        await onSubmit({ transactionId, feedback, comment });
        setMessage(
          "Demo only: feedback handled locally. It has not been saved to the database."
        );
      } else {
        await feedbackService.submitFeedback({
          transaction_id: transactionId,
          feedback,
          comment,
        });
        setMessage("Feedback submitted successfully.");
      }

      setFeedback("");
      setComment("");

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to submit feedback. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-form">
      <h3>Operator Feedback</h3>
      <p>
        {demoMode
          ? "Demo mode: submissions are not stored."
          : "Submit your decision and observations for this transaction."}
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="feedback">Feedback Decision</label>
          <select
            id="feedback"
            name="feedback"
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value);
              setError("");
              setMessage("");
            }}
            required
            disabled={loading}
          >
            <option value="">Select feedback</option>
            <option value={FEEDBACK_DECISIONS.CONFIRMED_FRAUD}>
              Confirmed Fraud
            </option>
            <option value={FEEDBACK_DECISIONS.CONFIRMED_GENUINE}>
              Confirmed Genuine
            </option>
            <option value={FEEDBACK_DECISIONS.DISPUTED}>Disputed</option>
            <option value={FEEDBACK_DECISIONS.INCONCLUSIVE}>
              Inconclusive
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="comment">Operator Comment</label>
          <textarea
            id="comment"
            name="comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setError("");
              setMessage("");
            }}
            placeholder="Enter your observations..."
            rows={4}
            disabled={loading}
          />
        </div>

        {error && (
          <p className="feedback-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="feedback-success" role="status">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}

export default FeedbackForm;