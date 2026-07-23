/**
 * Spotlight beam behaviour: the beam must light the poster that is currently
 * LOCKED/centered and switch off while sliding between posters — driven by the
 * live scroll position, NOT by the last-settled index.
 *
 * Regression guard for the "reversed/laggy spotlight" bug: previously the beam
 * was anchored to `renderedIndex` (updated only on momentum-end), so a poster
 * that had slid fully into the center stayed DARK until the scroll settled.
 *
 * Opacity is read off the Animated interpolation attached to the spotlight
 * (`__getValue()`), driven through the reel's own onScroll handler.
 *
 * @format
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { MovieReel } from '../App';

const W = 300;
const MOVIES = [
  { id: 1, name: 'Alpha', image: 'a.jpg', vector: [] },
  { id: 2, name: 'Bravo', image: 'b.jpg', vector: [] },
  { id: 3, name: 'Charlie', image: 'c.jpg', vector: [] },
];
const BASE = MOVIES.length; // looping reel parks in the middle copy

function render() {
  let renderer: any;
  act(() => {
    renderer = ReactTestRenderer.create(
      <MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={W} />,
    );
  });
  return renderer.root;
}
function spotlightOpacity(root: any): number {
  const spot = root.findAll((n: any) => n.props?.testID === 'reel-spotlight')[0];
  const styles = Array.isArray(spot.props.style) ? spot.props.style : [spot.props.style];
  const o = styles.find((s: any) => s && s.opacity != null).opacity;
  return typeof o === 'object' && typeof o.__getValue === 'function' ? o.__getValue() : o;
}
function scrollTo(root: any, x: number) {
  const sv = root.findAll((n: any) => n.props?.testID === 'reel-scroll')[0];
  act(() => { sv.props.onScroll({ nativeEvent: { contentOffset: { x } } }); });
}

describe('reel spotlight', () => {
  it('is bright when a poster is locked/centered on a snap point', () => {
    const root = render();
    scrollTo(root, BASE * W);
    expect(spotlightOpacity(root)).toBeGreaterThan(0.5);
  });

  it('switches off midway between posters (while sliding)', () => {
    const root = render();
    scrollTo(root, BASE * W + W / 2);
    expect(spotlightOpacity(root)).toBeLessThan(0.05);
  });

  it('lights the NEXT poster as soon as it is centered — without waiting for momentum-end', () => {
    const root = render();
    // Slide a full item so the next poster is centered, but do NOT fire
    // onMomentumScrollEnd (renderedIndex intentionally stale). The beam must
    // still be bright because a poster IS locked under it.
    scrollTo(root, (BASE + 1) * W);
    expect(spotlightOpacity(root)).toBeGreaterThan(0.5);
  });

  it('is bright at several consecutive snap points and dark between each', () => {
    const root = render();
    for (let k = BASE; k <= BASE + 2; k++) {
      scrollTo(root, k * W);
      expect(spotlightOpacity(root)).toBeGreaterThan(0.5);
      scrollTo(root, k * W + W / 2);
      expect(spotlightOpacity(root)).toBeLessThan(0.05);
    }
  });
});
