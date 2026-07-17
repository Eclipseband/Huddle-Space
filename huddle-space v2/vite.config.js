import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: set base to "/YOUR_REPO_NAME/" for GitHub Pages project sites.
// e.g. if your repo is github.com/you/huddle-space, base should be "/huddle-space/"
export default defineConfig({
  plugins: [react()],
  base: "/",
});
