export const CATEGORY_STYLE = {
  Informatique: { fg: "#3F6B4F", bg: "#E8EFE8" },
  "Littérature": { fg: "#A5433A", bg: "#F5E5E2" },
  Histoire: { fg: "#AD7E2C", bg: "#F4EBD8" },
  Sciences: { fg: "#1B2A4A", bg: "#E7EBF2" },
  Droit: { fg: "#6C4C74", bg: "#EFE6F0" },
  "Économie": { fg: "#2E6B72", bg: "#E1EDEE" },
};

export function categoryStyle(cat) {
  return CATEGORY_STYLE[cat] || { fg: "#1B2A4A", bg: "#EFEDE4" };
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}
