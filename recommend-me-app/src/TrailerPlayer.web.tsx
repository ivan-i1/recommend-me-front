// Web variant of TrailerPlayer: an inline YouTube <iframe> embed. Resolved by
// webpack (which lists `.web.tsx` before `.tsx`), so the native player module
// and its react-native-webview dependency never enter the web bundle.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from './theme';
import { extractYouTubeId } from './youtube';

export default function TrailerPlayer({ url }: { url: string }) {
  const { t } = useTranslation();
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <View style={styles.trailerSection}>
      <Text style={styles.trailerHeading}>{t('trailer_heading')}</Text>
      <View style={styles.trailerFrame}>
        {React.createElement('iframe', {
          src: `https://www.youtube.com/embed/${videoId}`,
          width: '100%',
          height: '100%',
          frameBorder: '0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowFullScreen: true,
          style: { border: 0, borderRadius: 8 },
        })}
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
    width: '100%',
    maxWidth: 380,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.darkBlue,
    overflow: 'hidden',
  },
});
