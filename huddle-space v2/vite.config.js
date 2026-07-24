import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom domain (huddlespace.online) serves from the root, so base is "/".
// If you ever go back to the eclipseband.github.io/Huddle-Space/ URL instead,
// this needs to change back to "/Huddle-Space/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
