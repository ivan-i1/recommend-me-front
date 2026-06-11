const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname, './');

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),
  output: {
    filename: 'bundle.web.js',
    path: path.resolve(appDirectory, 'dist'),
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.web.jsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        // We exclude node_modules EXCEPT for the ones that specifically need to be compiled for web
        exclude: /node_modules\/(?!(@react-navigation|react-native-safe-area-context|react-native-screens)\/).*/,
        type: 'javascript/auto',
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: ['module:@react-native/babel-preset'],
            plugins: ['react-native-web'],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp|ttf|otf|woff|woff2|eot)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
    }),
  ],
  devServer: {
    port: 3005,
    historyApiFallback: true,
    proxy: [
      {
        context: ['/details', '/movies'], // Which paths to intercept
        target: 'http://188.166.155.92', // Where to send them
        changeOrigin: true,
      },
    ],
  },
};
