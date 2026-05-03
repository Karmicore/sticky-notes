import { t } from "./lib/i18n";

export const COLORS = [
  { hex: "#FFEB3B", name: () => t("color.yellow") },
  { hex: "#BBDEFB", name: () => t("color.blue") },
  { hex: "#C8E6C9", name: () => t("color.green") },
  { hex: "#F8BBD9", name: () => t("color.pink") },
  { hex: "#E1BEE7", name: () => t("color.purple") },
  { hex: "#FFE0B2", name: () => t("color.orange") },
  { hex: "#FFFFFF", name: () => t("color.white") },
  { hex: "#90CAF9", name: () => t("color.lightBlue") },
  { hex: "#A5D6A7", name: () => t("color.lightGreen") },
  { hex: "#EF9A9A", name: () => t("color.red") },
  { hex: "#F48FB1", name: () => t("color.lightPink") },
  { hex: "#E0E0E0", name: () => t("color.gray") },
];

export const OPACITIES = [20, 30, 40, 50, 60, 70, 80, 90, 100];
