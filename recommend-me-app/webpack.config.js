const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname, './');

// The backend host has already moved once (:8000 -> :80), so a container image
// that bakes it in dies with it. BACKEND_URL re-points the dev-server proxy at
// build/run time; with the var unset the target is exactly what it always was.
const BACKEND_URL = process.env.BACKEND_URL || 'http://188.166.155.92';

// Bind mounts (Docker Desktop on macOS especially) often swallow the inotify
// events webpack relies on, so a container has to poll to see edits. Polling is
// wasteful on real filesystems, so it stays off unless WATCH_POLL asks for it,
// leaving `npm run web` on a host machine untouched.
const watchPoll = Number(process.env.WATCH_POLL);
const watchOptions =
  Number.isFinite(watchPoll) && watchPoll > 0
    ? {
        watchOptions: {
          poll: watchPoll,
          aggregateTimeout: 300,
          ignored: '**/node_modules/**',
        },
      }
    : {};

module.exports = {
  ...watchOptions,
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
        // We exclude node_modules EXCEPT for the ones that ship untranspiled
        // JSX/ESM and so need to be compiled for web (react-native-shadow-2 and
        // its react-native-svg dependency among them).
        exclude: /node_modules\/(?!(@react-navigation|react-native-safe-area-context|react-native-screens|react-native-shadow-2|react-native-svg)\/).*/,
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
        target: BACKEND_URL, // Where to send them (override with BACKEND_URL)
        changeOrigin: true,
      },
    ],
  },
};
