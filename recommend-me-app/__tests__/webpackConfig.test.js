/**
 * The web target has to be runnable from a container, which means two things
 * the bare-metal setup never needed:
 *
 *   1. the dev-server API proxy must be re-pointable without a rebuild, since
 *      the backend host has already moved once (:8000 -> :80) and an image
 *      that bakes it in dies with it; and
 *   2. file watching must survive a bind mount, where inotify events from the
 *      host frequently never reach the container.
 *
 * Both are env-gated on purpose: with no env set, the config must stay exactly
 * what it was, so `npm run web` on a developer machine behaves identically.
 */

const DEFAULT_BACKEND = 'http://188.166.155.92';

const loadConfig = () => {
  let config;
  jest.isolateModules(() => {
    config = require('../webpack.config.js');
  });
  return config;
};

const proxyTarget = config => config.devServer.proxy[0].target;

describe('webpack.config.js', () => {
  const original = {
    BACKEND_URL: process.env.BACKEND_URL,
    WATCH_POLL: process.env.WATCH_POLL,
  };

  const restore = key => {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  };

  afterEach(() => {
    restore('BACKEND_URL');
    restore('WATCH_POLL');
  });

  describe('backend proxy target', () => {
    it('falls back to the current hardcoded host when BACKEND_URL is unset', () => {
      delete process.env.BACKEND_URL;
      expect(proxyTarget(loadConfig())).toBe(DEFAULT_BACKEND);
    });

    it('uses BACKEND_URL when the container supplies one', () => {
      process.env.BACKEND_URL = 'http://backend.internal:8080';
      expect(proxyTarget(loadConfig())).toBe('http://backend.internal:8080');
    });

    it('treats an empty BACKEND_URL as unset rather than proxying to nowhere', () => {
      process.env.BACKEND_URL = '';
      expect(proxyTarget(loadConfig())).toBe(DEFAULT_BACKEND);
    });

    it('keeps proxying both API path prefixes', () => {
      delete process.env.BACKEND_URL;
      expect(loadConfig().devServer.proxy[0].context).toEqual([
        '/details',
        '/movies',
      ]);
    });
  });

  describe('watch polling', () => {
    it('is absent by default, so host runs keep native inotify watching', () => {
      delete process.env.WATCH_POLL;
      expect(loadConfig().watchOptions).toBeUndefined();
    });

    it('polls at the interval WATCH_POLL asks for', () => {
      process.env.WATCH_POLL = '1000';
      expect(loadConfig().watchOptions.poll).toBe(1000);
    });

    it('does not poll node_modules, which would peg a CPU core', () => {
      process.env.WATCH_POLL = '1000';
      expect(loadConfig().watchOptions.ignored).toBe('**/node_modules/**');
    });

    it('ignores a non-numeric WATCH_POLL instead of polling every 0ms', () => {
      process.env.WATCH_POLL = 'yes';
      expect(loadConfig().watchOptions).toBeUndefined();
    });
  });
});
