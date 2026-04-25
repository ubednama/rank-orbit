import baseConfig from "../../eslint.config.mjs";

// Inherits the root flat config (typescript-eslint, prettier).
// The legacy `@nx/dependency-checks` rule was removed with Nx (per ADR 004).
export default [...baseConfig];
