/** extractYouTubeId — shared, platform-neutral parser (src/youtube.ts). */
import { extractYouTubeId } from '../src/youtube';

describe('extractYouTubeId', () => {
  it('extracts the id from watch?v= urls', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abcdefghijk&t=30s')).toBe('abcdefghijk');
  });
  it('extracts the id from youtu.be short urls', () => {
    expect(extractYouTubeId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
  });
  it('extracts the id from /embed/ urls', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk');
  });
  it('returns null for non-youtube urls and invalid input', () => {
    expect(extractYouTubeId('https://example.com/video')).toBeNull();
    expect(extractYouTubeId('')).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    expect(extractYouTubeId(12345)).toBeNull();
  });
});
