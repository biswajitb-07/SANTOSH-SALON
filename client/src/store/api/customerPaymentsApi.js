import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { auth } from "../../lib/firebase.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const prepareAuthHeaders = async (headers) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
};

export const customerPaymentsApi = createApi({
  reducerPath: "customerPaymentsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/customer-payments`,
    prepareHeaders: prepareAuthHeaders,
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
    }),
    reindexBookingDate: builder.mutation({
      query: (payload) => ({
        url: "/queue/reindex-date",
        method: "POST",
        body: payload
      })
    })
  })
});

export const {
  useCreateCustomerPaymentOrderMutation,
  useReindexBookingDateMutation,
  useVerifyCustomerPaymentMutation
} = customerPaymentsApi;
