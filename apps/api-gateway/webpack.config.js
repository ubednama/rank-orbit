// Raw webpack config (post-Nx, per ADR 004). No NxAppWebpackPlugin.
// Bundles src/main.ts → dist/apps/api-gateway/main.js for `node main.js` execution.

const { join } = require("path");
const nodeExternals = require("webpack-node-externals");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProd ? "production" : "development",
  target: "node",
  entry: "./src/main.ts",
  output: {
    path: join(__dirname, "../../dist/apps/api-gateway"),
    filename: "main.js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      "@shared/types": join(__dirname, "../../libs/shared/types/src/index.ts"),
      "@shared/utils": join(__dirname, "../../libs/shared/utils/src/index.ts"),
      "@db": join(__dirname, "../../libs/db/src/index.ts"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          configFile: join(__dirname, "tsconfig.app.json"),
        },
      },
    ],
  },
  // Externalize all node_modules; we ship a thin bundle and rely on installed deps at runtime.
  externals: [
    nodeExternals({
      additionalModuleDirs: [join(__dirname, "../../node_modules")],
      // Bundle workspace libs (they're not in node_modules)
      allowlist: [/^@shared\//, /^@db$/],
    }),
  ],
  externalsPresets: { node: true },
  devtool: isProd ? false : "source-map",
  ignoreWarnings: [
    /Failed to parse source map.*node_modules/,
    /Critical dependency: the request of a dependency is an expression/,
    /Can't resolve 'pg-native'/,
    /Can't resolve 'bufferutil'/,
    /Can't resolve 'utf-8-validate'/,
  ],
};
