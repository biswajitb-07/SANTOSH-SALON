import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const subscriptionsApi = createApi({
  reducerPath: "subscriptionsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/subscriptions`,
    timeout: 20000
  }),
  endpoints: (builder) => ({
    createSubscriptionOrder: builder.mutation({
      query: (payload) => ({
        url: "/razorpay/create-order",
        method: "POST",
        body: payload
      })
    }),
    verifySubscriptionPayment: builder.mutation({
      query: (payload) => ({
        url: "/razorpay/verify",
        method: "POST",
        body: payload
      })
    })
  })
});

export const {
  useCreateSubscriptionOrderMutation,
  useVerifySubscriptionPaymentMutation
} = subscriptionsApi;
