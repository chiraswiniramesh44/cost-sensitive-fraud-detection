import api from "./api";

const transactionService = {
  // Predict a single transaction
  predictTransaction: async (data) => {
    const response = await api.post("/transactions/predict", data);
    return response.data;
  },

  // Upload a CSV file for batch fraud prediction
  predictBatchCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      "/transactions/predict/batch",
      formData
    );

    return response.data;
  },

  // Get a transaction by ID
  getTransaction: async (transactionId) => {
    const response = await api.get(
      `/transactions/${transactionId}`
    );
    return response.data;
  },

  // Get the review queue
  getReviewQueue: async () => {
    const response = await api.get("/review-queue");
    return response.data;
  },
};

export default transactionService;