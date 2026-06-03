const USER_PHOTO_CACHE_PREFIX = "ssq:cloudinary-profile-photo:";

export const readCachedUserPhoto = (uid) => {
  if (!uid || typeof window === "undefined") return "";
  try {
    return localStorage.getItem(`${USER_PHOTO_CACHE_PREFIX}${uid}`) || "";
  } catch {
    return "";
  }
};

export const cacheUserPhoto = (uid, photoURL) => {
  if (!uid || !photoURL || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${USER_PHOTO_CACHE_PREFIX}${uid}`, photoURL);
  } catch {
    // Local storage can be unavailable in private browsing; Firestore remains the source.
  }
};

export const cacheProfilePhotoForUser = (user, photoURL) => {
  cacheUserPhoto(user?.uid, photoURL);
};

export const isCloudinaryProfilePhoto = (account = {}) =>
  account?.profilePhotoSource === "cloudinary" ||
  Boolean(account?.profilePhotoPublicId) ||
  String(account?.profilePhotoURL || account?.photoURL || account?.photoUrl || "").includes(
    "res.cloudinary.com"
  );

export const getCloudinaryProfilePhotoUrl = (account = {}, fallback = "") =>
  isCloudinaryProfilePhoto(account)
    ? account?.photoURL || account?.photoUrl || account?.profilePhotoURL || fallback || ""
    : fallback || "";
