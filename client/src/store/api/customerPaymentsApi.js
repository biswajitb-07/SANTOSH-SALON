import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const customerPaymentsApi = createApi({
  reducerPath: "customerPaymentsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/customer-payments`,
    timeout: 20000
  }),
  endpoints: (builder) => ({
    createCustomerPaymentOrder: builder.mutation({
      query: (payload) => ({
        url: "/cashfree/create-order",
        method: "POST",
        body: payload
      })
    }),
    verifyCustomerPayment: builder.mutation({
      query: (orderId) => ({
        url: `/cashfree/verify/${orderId}`,
        method: "GET"
      })
    })
  })
});

export const {
  useCreateCustomerPaymentOrderMutation,
  useVerifyCustomerPaymentMutation
} = customerPaymentsApi;
