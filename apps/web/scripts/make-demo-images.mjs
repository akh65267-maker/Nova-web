// Draws the demo catalogue's pictures as SVG into public/demo. Run: node scripts/make-demo-images.mjs
import fs from "node:fs";

const COLOURS = {
  Silver: ["#d7dbe0", "#9aa3ad"],
  Graphite: ["#4a4f57", "#2a2d33"],
  "Sky blue": ["#8ec5ff", "#4a90d9"],
  "Space grey": ["#6b7078", "#3b3f45"],
  Midnight: ["#2c3550", "#141a2b"],
  Mint: ["#9fe3c6", "#4fb996"],
  Coral: ["#ff9a8b", "#e5604e"],
  Black: ["#3a3a3f", "#18181b"],
  White: ["#f4f4f5", "#c9ccd1"],
  Teal: ["#5ec8c8", "#2a8f94"],
  Olive: ["#9aa65a", "#6a7433"],
  Grey: ["#a1a6ae", "#6c727b"],
  Navy: ["#3b4f8a", "#1f2d57"],
  Cream: ["#f3e9d2", "#d3c19a"],
};

// kind and colour for each product, in catalogue order
const ITEMS = [
  ["aero-14-ultrabook", "laptop", "Silver"],
  ["forge-16-creator", "laptop", "Graphite"],
  ["pocket-13-air", "laptop", "Sky blue"],
  ["studio-15-pro", "laptop", "Space grey"],
  ["orbit-x-phone", "phone", "Midnight"],
  ["orbit-lite", "phone", "Mint"],
  ["pulse-5g", "phone", "Coral"],
  ["fold-z", "fold", "Black"],
  ["halo-anc-headphones", "headphones", "Black"],
  ["halo-buds", "buds", "White"],
  ["beat-mini-speaker", "speaker", "Teal"],
  ["studio-soundbar", "soundbar", "Black"],
  ["tempo-watch-s", "watch", "Silver"],
  ["tempo-band", "band", "Black"],
  ["trail-gps-watch", "watch", "Olive"],
  ["fast-charge-65w", "charger", "White"],
  ["dock-hub-8-in-1", "hub", "Grey"],
  ["sleeve-14", "sleeve", "Navy"],
  ["wireless-mouse-m2", "mouse", "Graphite"],
  ["mech-keyboard-k75", "keyboard", "Cream"],
];

const shapes = {
  laptop: (a, b) => `<rect x="150" y="190" width="300" height="190" rx="14" fill="${b}"/><rect x="164" y="204" width="272" height="162" rx="6" fill="#0f172a"/><rect x="164" y="204" width="272" height="162" rx="6" fill="url(#glow)" opacity=".55"/><path d="M95 390h410l-30 28H125z" fill="${a}"/><rect x="262" y="392" width="76" height="7" rx="3" fill="${b}"/>`,
  phone: (a, b) => `<rect x="215" y="105" width="170" height="350" rx="30" fill="${b}"/><rect x="224" y="114" width="152" height="332" rx="23" fill="${a}"/><rect x="224" y="114" width="152" height="332" rx="23" fill="url(#glow)" opacity=".5"/><rect x="275" y="124" width="50" height="12" rx="6" fill="${b}"/>`,
  fold: (a, b) => `<rect x="130" y="150" width="165" height="300" rx="22" fill="${b}"/><rect x="305" y="150" width="165" height="300" rx="22" fill="${b}"/><rect x="139" y="159" width="147" height="282" rx="15" fill="${a}"/><rect x="314" y="159" width="147" height="282" rx="15" fill="${a}"/><rect x="139" y="159" width="322" height="282" rx="15" fill="url(#glow)" opacity=".45"/>`,
  headphones: (a, b) => `<path d="M160 330v-60a140 140 0 0 1 280 0v60" fill="none" stroke="${b}" stroke-width="26" stroke-linecap="round"/><rect x="120" y="300" width="80" height="140" rx="36" fill="${a}"/><rect x="400" y="300" width="80" height="140" rx="36" fill="${a}"/><rect x="132" y="318" width="38" height="104" rx="19" fill="${b}"/><rect x="430" y="318" width="38" height="104" rx="19" fill="${b}"/>`,
  buds: (a, b) => `<rect x="150" y="320" width="300" height="150" rx="60" fill="${b}"/><rect x="160" y="330" width="280" height="62" rx="30" fill="${a}"/><ellipse cx="235" cy="215" rx="38" ry="55" fill="${a}" stroke="${b}" stroke-width="6"/><ellipse cx="365" cy="215" rx="38" ry="55" fill="${a}" stroke="${b}" stroke-width="6"/><rect x="224" y="248" width="22" height="70" rx="11" fill="${a}" stroke="${b}" stroke-width="6"/><rect x="354" y="248" width="22" height="70" rx="11" fill="${a}" stroke="${b}" stroke-width="6"/>`,
  speaker: (a, b) => `<rect x="190" y="170" width="220" height="260" rx="60" fill="${a}"/><circle cx="300" cy="260" r="62" fill="${b}"/><circle cx="300" cy="260" r="26" fill="${a}" opacity=".7"/><circle cx="300" cy="372" r="16" fill="${b}"/>`,
  soundbar: (a, b) => `<rect x="70" y="250" width="460" height="100" rx="40" fill="${a}"/><rect x="92" y="272" width="416" height="56" rx="26" fill="${b}"/><circle cx="140" cy="300" r="14" fill="${a}" opacity=".6"/><circle cx="460" cy="300" r="14" fill="${a}" opacity=".6"/>`,
  watch: (a, b) => `<rect x="245" y="70" width="110" height="130" rx="20" fill="${b}"/><rect x="245" y="400" width="110" height="130" rx="20" fill="${b}"/><rect x="190" y="180" width="220" height="240" rx="56" fill="${a}"/><rect x="204" y="194" width="192" height="212" rx="44" fill="#0f172a"/><rect x="204" y="194" width="192" height="212" rx="44" fill="url(#glow)" opacity=".5"/><circle cx="300" cy="300" r="40" fill="none" stroke="${a}" stroke-width="8" opacity=".8"/>`,
  band: (a, b) => `<rect x="260" y="40" width="80" height="190" rx="14" fill="${b}"/><rect x="260" y="370" width="80" height="190" rx="14" fill="${b}"/><rect x="235" y="190" width="130" height="220" rx="34" fill="${a}"/><rect x="247" y="204" width="106" height="192" rx="24" fill="#0f172a"/><rect x="247" y="204" width="106" height="192" rx="24" fill="url(#glow)" opacity=".5"/>`,
  charger: (a, b) => `<rect x="215" y="190" width="170" height="190" rx="26" fill="${a}" stroke="${b}" stroke-width="5"/><rect x="255" y="130" width="22" height="64" rx="5" fill="${b}"/><rect x="323" y="130" width="22" height="64" rx="5" fill="${b}"/><rect x="270" y="318" width="60" height="16" rx="8" fill="${b}"/>`,
  hub: (a, b) => `<rect x="120" y="230" width="360" height="140" rx="34" fill="${a}"/><rect x="150" y="270" width="48" height="26" rx="5" fill="${b}"/><rect x="214" y="270" width="48" height="26" rx="5" fill="${b}"/><rect x="278" y="270" width="48" height="26" rx="5" fill="${b}"/><rect x="342" y="270" width="48" height="26" rx="5" fill="${b}"/><rect x="406" y="270" width="48" height="26" rx="5" fill="${b}"/><path d="M300 230V150" stroke="${b}" stroke-width="12" stroke-linecap="round"/>`,
  sleeve: (a, b) => `<rect x="120" y="160" width="360" height="270" rx="40" fill="${a}"/><rect x="120" y="160" width="360" height="90" rx="40" fill="${b}"/><rect x="262" y="212" width="76" height="14" rx="7" fill="${a}"/>`,
  mouse: (a, b) => `<path d="M300 130c70 0 100 60 100 130v70c0 70-45 120-100 120s-100-50-100-120v-70c0-70 30-130 100-130z" fill="${a}"/><path d="M300 130v110" stroke="${b}" stroke-width="8"/><rect x="288" y="168" width="24" height="44" rx="12" fill="${b}"/>`,
  keyboard: (a, b) => {
    const keys = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 10; col++) keys.push(`<rect x="${112 + col * 37}" y="${215 + row * 37}" width="30" height="30" rx="6" fill="${row === 0 && col < 2 ? b : "#fff"}" opacity=".92"/>`);
    return `<rect x="85" y="190" width="430" height="190" rx="26" fill="${b}"/><rect x="95" y="200" width="410" height="170" rx="20" fill="${a}"/>${keys.join("")}`;
  },
};

fs.mkdirSync("public/demo", { recursive: true });
for (const [slug, kind, colour] of ITEMS) {
  const [a, b] = COLOURS[colour];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset="1" stop-color="#e3e6ea"/></linearGradient><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="600" height="600" fill="url(#bg)"/><ellipse cx="300" cy="500" rx="190" ry="18" fill="#000" opacity=".1"/>${shapes[kind](a, b)}</svg>\n`;
  fs.writeFileSync(`public/demo/${slug}.svg`, svg);
}
console.log(ITEMS.length, "images");
