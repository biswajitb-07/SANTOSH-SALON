const serviceFallbackImages = {
  beard: "/assets/haircut-styles.png",
  facial: "/assets/salon-hero.png",
  haircut: "/assets/haircut-feature.png",
  "hair wash": "/assets/haircut-styles.png"
};

export const getServiceImageUrl = (title = "") => {
  const value = title.toLowerCase();
  const match = Object.entries(serviceFallbackImages).find(([keyword]) =>
    value.includes(keyword)
  );

  return match?.[1] || "/assets/haircut-feature.png";
};

export const defaultServices = [
  {
    title: "Classic Haircut",
    time: "25 min",
    price: "Rs. 120",
    amount: 120,
    imageUrl: getServiceImageUrl("Classic Haircut")
  },
  {
    title: "Beard Styling",
    time: "15 min",
    price: "Rs. 80",
    amount: 80,
    imageUrl: getServiceImageUrl("Beard Styling")
  },
  {
    title: "Hair Wash",
    time: "12 min",
    price: "Rs. 70",
    amount: 70,
    imageUrl: getServiceImageUrl("Hair Wash")
  },
  {
    title: "Facial Grooming",
    time: "35 min",
    price: "Rs. 250",
    amount: 250,
    imageUrl: getServiceImageUrl("Facial Grooming")
  }
];
