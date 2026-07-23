// Platform-neutral YouTube helpers shared by App.tsx and both TrailerPlayer
// variants (native + web). Kept dependency-free so importing it never drags a
// native module (react-native-webview) into the web bundle.

// Pulls the 11-char YouTube video id out of watch?v=, youtu.be/, or /embed/ urls.
export function extractYouTubeId(url: any): string | null {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,       // https://www.youtube.com/watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{11})/,  // https://youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{11})/,    // https://www.youtube.com/embed/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
