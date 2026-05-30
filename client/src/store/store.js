import { configureStore } from "@reduxjs/toolkit";
import { customerPaymentsApi } from "./api/customerPaymentsApi.js";

export const store = configureStore({
  reducer: {
    [customerPaymentsApi.reducerPath]: customerPaymentsApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(customerPaymentsApi.middleware)
});
