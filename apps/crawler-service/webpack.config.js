// Raw webpack config (post-Nx, per ADR 004). No NxAppWebpackPlugin.
// Bundles src/main.ts → dist/apps/crawler-service/main.js + copies src/assets → ../assets.

const { join } = require("path");
const fs = require("fs");
const nodeExternals = require("webpack-node-externals");

const isProd = process.env.NODE_ENV === "production";
const outDir = join(__dirname, "../../dist/apps/crawler-service");

class CopyAssetsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap("CopyAssetsPlugin", () => {
      const srcAssets = join(__dirname, "src/assets");
      const dstAssets = join(outDir, "assets");
      if (!fs.existsSync(srcAssets)) return;
      fs.mkdirSync(dstAssets, { recursive: true });
      for (const entry of fs.readdirSync(srcAssets)) {
        fs.copyFileSync(join(srcAssets, entry), join(dstAssets, entry));
      }
    });
  }
}

module.exports = {
  mode: isProd ? "production" : "development",
  target: "node",
  entry: "./src/main.ts",
  output: {
    path: outDir,
    filename: "main.js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@shared/types": join(__dirname, "../../libs/shared/types/src/index.ts"),
      "@shared/utils": join(__dirname, "../../libs/shared/utils/src/index.ts"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
          configFile: join(__dirname, "tsconfig.app.json"),
        },
      },
    ],
  },
  externals: [
    nodeExternals({
      additionalModuleDirs: [join(__dirname, "../../node_modules")],
      allowlist: [/^@shared\//],
    }),
  ],
  externalsPresets: { node: true },
  devtool: isProd ? false : "source-map",
  plugins: [new CopyAssetsPlugin()],
  ignoreWarnings: [
    /Failed to parse source map.*node_modules/,
    /Critical dependency: the request of a dependency is an expression/,
    /Can't resolve 'bufferutil'/,
    /Can't resolve 'utf-8-validate'/,
  ],
};
