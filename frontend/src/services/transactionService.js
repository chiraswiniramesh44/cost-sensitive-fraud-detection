import api from "./api";

const transactionService = {
  predictTransaction: async (data) => {
    const response = await api.post("/transactions/predict", data);
    return response.data;
  },

  getTransaction: async (transactionId) => {
    const response = await api.get(`/transactions/${transactionId}`);
    return response.data;
  },

  getReviewQueue: async () => {
    const response = await api.get("/review-queue");
    return response.data;
  },
};

export default transactionService;