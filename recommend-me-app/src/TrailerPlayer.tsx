// Native variant of TrailerPlayer (iOS/Android): an inline YouTube player via
// the official IFrame API (react-native-youtube-iframe over react-native-webview).
// Replaces the old "open in the YouTube app" deep-link so the trailer plays in
// place. The web build resolves TrailerPlayer.web.tsx instead, so this file's
// react-native-webview dependency never reaches the web bundle.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import YoutubePlayer from 'react-native-youtube-iframe';
import { COLORS } from './theme';
import { extractYouTubeId } from './youtube';

// 16:9 player sized to the screen, capped so it matches the reel/Details frame.
const SCREEN_WIDTH = Dimensions.get('window').width;
const PLAYER_WIDTH = Math.round(Math.min(SCREEN_WIDTH * 0.9, 380));
const PLAYER_HEIGHT = Math.round((PLAYER_WIDTH * 9) / 16);

export default function TrailerPlayer({ url }: { url: string }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <View style={styles.trailerSection}>
      <Text style={styles.trailerHeading}>{t('trailer_heading')}</Text>
      <View style={styles.trailerFrame}>
        <YoutubePlayer
          height={PLAYER_HEIGHT}
          width={PLAYER_WIDTH}
          play={playing}
          videoId={videoId}
          // Keep our `playing` flag in sync with the player's real state so the
          // controlled `play` prop never fights the user's own play/pause taps.
          onChangeState={(state: string) => {
            if (state === 'playing') setPlaying(true);
            else if (state === 'paused' || state === 'ended') setPlaying(false);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trailerSection: {
    width: '90%',
    alignItems: 'center',
    marginTop: 15,
  },
  trailerHeading: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    color: COLORS.gold,
    letterSpacing: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trailerFrame: {
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.darkBlue,
    overflow: 'hidden',
  },
});
