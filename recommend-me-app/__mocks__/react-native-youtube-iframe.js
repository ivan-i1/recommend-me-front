// Manual mock (auto-applied to this node module in every test) so jest never
// loads the real player, which pulls in react-native-webview / native modules.
// Renders a host element that captures the props tests need to assert on.
const React = require('react');

function YoutubePlayerMock(props) {
  return React.createElement('YoutubePlayerMock', {
    testID: 'youtube-player',
    videoId: props.videoId,
    play: props.play,
    height: props.height,
    width: props.width,
  });
}

module.exports = {
  __esModule: true,
  default: YoutubePlayerMock,
  PLAYER_STATES: { UNSTARTED: 'unstarted', ENDED: 'ended', PLAYING: 'playing', PAUSED: 'paused', BUFFERING: 'buffering', VIDEO_CUED: 'video cued' },
};
