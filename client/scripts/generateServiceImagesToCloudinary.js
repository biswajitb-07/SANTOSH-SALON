import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import {
  deleteServiceImage,
  uploadServiceImage
} from "../../server/src/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

const readEnv = () => {
  const env = {};
  const content = fs.readFileSync(envPath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  });

  return env;
};

const toDataUrl = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const imageFrame = ({ accent, dark, mid, light, artwork }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="860" viewBox="0 0 1400 860">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.52" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="25%" cy="16%" r="72%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.78"/>
      <stop offset="0.34" stop-color="${accent}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#0b2623" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="1400" height="860" rx="80" fill="url(#bg)"/>
  <rect width="1400" height="860" rx="80" fill="url(#glow)"/>
  <path d="M0 635 C280 560 420 720 710 625 C980 540 1120 596 1400 518 L1400 860 L0 860 Z" fill="#ffffff" opacity="0.18"/>
  <path d="M98 116 H1302 V744 H98 Z" fill="#ffffff" opacity="0.12"/>
  <g opacity="0.28">
    <circle cx="1180" cy="160" r="68" fill="#ffffff"/>
    <circle cx="218" cy="690" r="44" fill="#ffffff"/>
    <circle cx="1076" cy="694" r="28" fill="${accent}"/>
  </g>
  <g filter="url(#shadow)">
    ${artwork}
  </g>
</svg>`;

const images = [
  {
    id: "classic-haircut",
    svg: imageFrame({
      accent: "#f8c56b",
      dark: "#143b36",
      mid: "#0f766e",
      light: "#f4fbf8",
      artwork: `
        <rect x="760" y="182" width="388" height="498" rx="44" fill="#123632"/>
        <rect x="803" y="225" width="302" height="184" rx="28" fill="#e8f4ef"/>
        <path d="M858 354 C895 312 947 292 1008 315 C1054 333 1074 366 1078 409 C1028 383 965 373 906 390 C881 397 855 407 832 422 C829 396 835 373 858 354Z" fill="#111827"/>
        <path d="M896 389 C944 361 1013 367 1060 398 C1046 465 1015 520 956 540 C894 512 867 461 896 389Z" fill="#b98b65"/>
        <rect x="236" y="508" width="596" height="82" rx="41" fill="#f8c56b"/>
        <rect x="290" y="430" width="420" height="96" rx="34" fill="#ffffff"/>
        <path d="M302 474 H696" stroke="#123632" stroke-width="18" stroke-linecap="round"/>
        <circle cx="402" cy="313" r="84" fill="#ffffff"/>
        <circle cx="402" cy="313" r="48" fill="#123632"/>
        <path d="M416 317 L612 220 M416 317 L612 414" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
        <circle cx="622" cy="215" r="32" fill="#f8c56b"/>
        <circle cx="622" cy="419" r="32" fill="#f8c56b"/>
      `
    })
  },
  {
    id: "beard-styling",
    svg: imageFrame({
      accent: "#d6a46f",
      dark: "#17201f",
      mid: "#315b54",
      light: "#f7eee6",
      artwork: `
        <circle cx="704" cy="318" r="178" fill="#c99a72"/>
        <path d="M540 302 C575 192 675 139 784 164 C870 184 930 248 946 336 C886 296 806 285 722 308 C651 327 592 324 540 302Z" fill="#111827"/>
        <path d="M520 360 C558 496 619 612 704 646 C792 612 859 494 890 360 C834 428 761 462 704 462 C642 462 578 431 520 360Z" fill="#1f2933"/>
        <path d="M594 448 C642 480 765 482 816 448 C802 547 765 590 704 612 C644 590 610 548 594 448Z" fill="#0f171a"/>
        <path d="M610 353 Q704 410 800 353" stroke="#ffffff" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.75"/>
        <rect x="268" y="198" width="210" height="456" rx="44" fill="#ffffff" opacity="0.95"/>
        <path d="M326 544 C378 480 402 408 388 310" stroke="#315b54" stroke-width="24" stroke-linecap="round" fill="none"/>
        <circle cx="372" cy="254" r="40" fill="#d6a46f"/>
        <rect x="914" y="218" width="232" height="376" rx="34" fill="#ffffff" opacity="0.9"/>
        <path d="M970 300 H1092 M970 380 H1092 M970 460 H1092" stroke="#17201f" stroke-width="20" stroke-linecap="round"/>
      `
    })
  },
  {
    id: "hair-wash",
    svg: imageFrame({
      accent: "#5fd4d0",
      dark: "#123632",
      mid: "#1d8a85",
      light: "#effcff",
      artwork: `
        <rect x="248" y="470" width="842" height="122" rx="61" fill="#ffffff"/>
        <rect x="384" y="574" width="570" height="68" rx="34" fill="#123632"/>
        <path d="M374 452 C386 315 510 234 674 242 C822 249 930 328 948 452 Z" fill="#e6f7f6"/>
        <path d="M500 434 C536 358 610 321 704 328 C806 336 868 380 900 434 Z" fill="#111827"/>
        <circle cx="704" cy="360" r="112" fill="#c18a64"/>
        <path d="M578 351 C629 284 722 263 820 306 C770 298 719 312 678 342 C640 369 604 369 578 351Z" fill="#0f171a"/>
        <path d="M428 294 C502 218 631 190 770 204" stroke="#5fd4d0" stroke-width="26" stroke-linecap="round" fill="none"/>
        <path d="M956 218 C984 294 922 346 984 420" stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none" opacity="0.85"/>
        <path d="M1040 196 C1076 274 1007 340 1076 430" stroke="#ffffff" stroke-width="24" stroke-linecap="round" fill="none" opacity="0.62"/>
        <circle cx="346" cy="246" r="54" fill="#ffffff" opacity="0.9"/>
        <circle cx="1116" cy="570" r="72" fill="#5fd4d0" opacity="0.72"/>
      `
    })
  },
  {
    id: "facial-grooming",
    svg: imageFrame({
      accent: "#ffc0a8",
      dark: "#173734",
      mid: "#b56656",
      light: "#fff7f0",
      artwork: `
        <rect x="268" y="230" width="348" height="420" rx="54" fill="#ffffff" opacity="0.94"/>
        <circle cx="442" cy="366" r="114" fill="#c9906b"/>
        <path d="M338 342 C376 260 454 234 548 274 C520 274 488 292 462 316 C420 354 372 362 338 342Z" fill="#1f2933"/>
        <path d="M384 398 Q442 438 502 398" stroke="#ffffff" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.8"/>
        <path d="M392 490 C430 520 468 520 506 490" stroke="#173734" stroke-width="13" stroke-linecap="round" fill="none"/>
        <rect x="746" y="242" width="350" height="382" rx="46" fill="#ffffff" opacity="0.96"/>
        <circle cx="918" cy="396" r="102" fill="#f3d2bd"/>
        <path d="M858 390 C874 354 900 335 934 337 C970 339 994 362 1004 398 C966 377 909 374 858 390Z" fill="#173734" opacity="0.88"/>
        <path d="M845 512 C896 554 960 554 1014 512" stroke="#b56656" stroke-width="16" stroke-linecap="round" fill="none"/>
        <path d="M1082 244 C1018 268 974 322 962 384 C1034 368 1085 320 1082 244Z" fill="#68c497"/>
        <path d="M742 628 C786 558 850 520 932 510" stroke="#ffc0a8" stroke-width="22" stroke-linecap="round" fill="none"/>
        <circle cx="652" cy="266" r="58" fill="#ffc0a8" opacity="0.82"/>
      `
    })
  }
];

const env = readEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
});

const db = getFirestore(app);

for (const image of images) {
  const serviceRef = doc(db, "services", image.id);
  const serviceSnap = await getDoc(serviceRef);
  const previousPublicId = serviceSnap.exists()
    ? serviceSnap.data().imagePublicId
    : "";
  const uploaded = await uploadServiceImage({ imageDataUrl: toDataUrl(image.svg) });

  await setDoc(
    serviceRef,
    {
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId
    },
    { merge: true }
  );

  if (previousPublicId && previousPublicId !== uploaded.imagePublicId) {
    await deleteServiceImage({ publicId: previousPublicId });
  }

  console.log(`Generated service image: ${image.id}`);
}

console.log("Service images generated and uploaded.");
