/**
 * TrailerPlayer platform variants.
 *   - web (src/TrailerPlayer.web.tsx): inline YouTube <iframe> embed.
 *   - native (src/TrailerPlayer.tsx): inline react-native-youtube-iframe player.
 *
 * Both derive the video id via extractYouTubeId and render nothing when the url
 * has no id. The native player module is auto-mocked (see
 * __mocks__/react-native-youtube-iframe.js) so the real react-native-webview is
 * never loaded in jest.
 *
 * @format
 */
import '../src/i18n'; // initialise i18next so useTranslation() works standalone
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-youtube-iframe');

import TrailerPlayerNative from '../src/TrailerPlayer';
import TrailerPlayerWeb from '../src/TrailerPlayer.web';

const YT = 'https://www.youtube.com/watch?v=abcdefghijk';

function render(el: React.ReactElement) {
  let r: any;
  act(() => { r = ReactTestRenderer.create(el); });
  return r;
}

describe('TrailerPlayer — web variant', () => {
  it('embeds the YouTube iframe pointed at the extracted video id', () => {
    const root = render(<TrailerPlayerWeb url={YT} />).root;
    const iframe = root.findAll((n: any) => n.type === 'iframe')[0];
    expect(iframe).toBeTruthy();
    expect(iframe.props.src).toBe('https://www.youtube.com/embed/abcdefghijk');
  });

  it('renders nothing when the url has no video id', () => {
    const r = render(<TrailerPlayerWeb url="https://example.com/nope" />);
    expect(r.toJSON()).toBeNull();
  });
});

describe('TrailerPlayer — native variant', () => {
  it('renders the inline player with the extracted video id', () => {
    const root = render(<TrailerPlayerNative url={YT} />).root;
    const player = root.findAll((n: any) => n.props?.testID === 'youtube-player')[0];
    expect(player).toBeTruthy();
    expect(player.props.videoId).toBe('abcdefghijk');
  });

  it('renders nothing when the url has no video id', () => {
    const r = render(<TrailerPlayerNative url="not a youtube link" />);
    expect(r.toJSON()).toBeNull();
  });
});
