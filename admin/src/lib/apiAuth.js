import { auth } from "./firebase.js";

export const getAuthHeader = async () => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const prepareAuthHeaders = async (headers) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
};
