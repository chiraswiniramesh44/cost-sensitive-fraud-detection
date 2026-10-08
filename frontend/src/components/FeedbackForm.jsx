import { useState } from "react";
import feedbackService from "../services/feedbackService";
import { FEEDBACK_DECISIONS } from "../utils/constants";

function FeedbackForm({ transactionId, onSubmitted }) {
  const [feedback, setFeedback] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!feedback) {
      setError("Select a feedback decision.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await feedbackService.submitFeedback({
        transaction_id: transactionId,
        feedback,
        comment,
      });

      setMessage("Feedback submitted successfully.");
      setFeedback("");
      setComment("");

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to submit feedback."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-form">
      <h3>Operator Feedback</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="feedback">Feedback Decision</label>

          <select
            id="feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          >
            <option value="">Select feedback</option>
            <option value={FEEDBACK_DECISIONS.CONFIRMED_FRAUD}>
              Confirmed Fraud
            </option>
            <option value={FEEDBACK_DECISIONS.CONFIRMED_GENUINE}>
              Confirmed Genuine
            </option>
            <option value={FEEDBACK_DECISIONS.DISPUTED}>
              Disputed
            </option>
            <option value={FEEDBACK_DECISIONS.INCONCLUSIVE}>
              Inconclusive
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="comment">Operator Comment</label>

          <textarea
            id="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Enter your observations..."
            rows="4"
          />
        </div>

        {error && <p className="feedback-error">{error}</p>}

        {message && (
          <p className="feedback-success">{message}</p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}

export default FeedbackForm;