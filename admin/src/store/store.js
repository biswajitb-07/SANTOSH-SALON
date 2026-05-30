import { configureStore } from "@reduxjs/toolkit";
import { subscriptionsApi } from "./api/subscriptionsApi.js";

export const store = configureStore({
  reducer: {
    [subscriptionsApi.reducerPath]: subscriptionsApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(subscriptionsApi.middleware)
});
