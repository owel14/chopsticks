import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["server/"],
  },
  {
    rules: {
      // Ref-mirroring during render is intentional for zero-rerender perf in drag/drop hooks
      "react-hooks/refs": "off",
      // setState in effects is needed for client-only reads (e.g. sessionStorage)
      "react-hooks/set-state-in-effect": "off",
      // Pages Router rule not applicable to App Router layouts
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default eslintConfig;
