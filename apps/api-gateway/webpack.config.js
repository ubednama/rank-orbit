const { NxAppWebpackPlugin } = require("@nx/webpack/app-plugin");
const { join } = require("path");

module.exports = {
  output: {
    path: join(__dirname, "../../dist/apps/api-gateway"),
    clean: true,
    ...(process.env.NODE_ENV !== "production" && {
      devtoolModuleFilenameTemplate: "[absolute-resource-path]",
    }),
  },
  resolve: {
    alias: {
      "class-transformer/storage": require.resolve("class-transformer/cjs/storage.js"),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: "node",
      compiler: "tsc",
      main: "./src/main.ts",
      tsConfig: "./tsconfig.app.json",
      assets: ["./src/assets"],
      optimization: false,
      outputHashing: "none",
      sourceMap: true,
    }),
  ],
  externals: {
    mqtt: "commonjs mqtt",
    nats: "commonjs nats",
    kafkajs: "commonjs kafkajs",
    "@grpc/grpc-js": "commonjs @grpc/grpc-js",
    "@grpc/proto-loader": "commonjs @grpc/proto-loader",
  },
};
