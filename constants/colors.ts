const Colors = {
  primary: "#0F4C75",
  primaryDark: "#0A3353",
  primaryLight: "#3282B8",
  
  secondary: "#3282B8",
  secondaryLight: "#5DA3D5",
  
  accent: "#E63946",
  accentLight: "#FF616D",
  
  success: "#00C9A7",
  warning: "#FFA726",
  danger: "#E63946",
  info: "#3282B8",
  
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceDark: "#E8EDF2",
  
  text: "#1F2937",
  textSecondary: "#6B7280",
  textLight: "#9CA3AF",
  textInverse: "#FFFFFF",
  
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  
  shadow: "rgba(0, 0, 0, 0.08)",
  shadowDark: "rgba(0, 0, 0, 0.12)",
  
  overlay: "rgba(0, 0, 0, 0.5)",
};

export default {
  light: {
    ...Colors,
    tint: Colors.primary,
    tabIconDefault: Colors.textLight,
    tabIconSelected: Colors.primary,
  },
};
