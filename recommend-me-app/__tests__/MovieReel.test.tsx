/**
 * Tests for the spotlight movie reel.
 *
 * Behaviour pinned here:
 *   - renders the movies returned by the endpoint,
 *   - the title at the top reflects the centered movie and updates as a new
 *     movie locks into the spotlight,
 *   - the reel LOOPS (scrolling into an outer copy wraps back to the right movie),
 *   - tapping the TITLE selects the centered movie,
 *   - tapping the centered POSTER opens the embedded trailer miniplayer when a
 *     trailer exists, and does nothing when it doesn't,
 *   - the Details button calls onDetails (opens the full Details screen),
 *   - a spotlight element is rendered, and the reel resets on a fresh batch.
 *
 * Animations (fade/spotlight opacity) are driven by Animated interpolation off
 * the scroll offset and are not asserted; the deterministic index math lives in
 * `centeredIndexFromOffset` / `wrapIndex`, unit-tested directly.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { MovieReel, centeredIndexFromOffset, wrapIndex, toReelMovies } from '../App';

const ITEM_WIDTH = 300;
const YT = 'https://www.youtube.com/watch?v=abcdefghijk'; // valid 11-char id

// Mapped display shape (mapRawMovieForDetails output) the reel consumes.
const MOVIES = [
  { id: 1, name: 'Alpha', image: 'a.jpg', overview: 'Alpha synopsis', vector: [], trailer_path: YT },
  { id: 2, name: 'Bravo', image: 'b.jpg', overview: 'Bravo synopsis', vector: [] },
  { id: 3, name: 'Charlie', image: 'c.jpg', overview: 'Charlie synopsis', vector: [], trailer_path: 'https://youtu.be/abcdefghijk' },
];
const N = MOVIES.length;
// With >1 movie the reel triplicates and parks in the middle copy, so the first
// real movie is centered at rendered index N.
const BASE = N;

function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  // @ts-ignore assigned inside act
  return renderer;
}

const all = (root: any, testID: string) => root.findAllByProps({ testID });
const exists = (root: any, testID: string) => all(root, testID).length > 0;
const textOf = (root: any, testID: string) => String(all(root, testID)[0].props.children);
const pressable = (root: any, testID: string) =>
  all(root, testID).find((n: any) => typeof n.props.onPress === 'function');
// The single currently-centered (enabled) poster, whatever its rendered index.
const enabledPoster = (root: any) =>
  root.find(
    (n: any) =>
      typeof n.props?.testID === 'string' &&
      n.props.testID.startsWith('reel-poster-') &&
      typeof n.props.onPress === 'function',
  );

const settleAt = (root: any, offsetX: number) =>
  act(() => {
    all(root, 'reel-scroll')[0].props.onMomentumScrollEnd({
      nativeEvent: { contentOffset: { x: offsetX } },
    });
  });

describe('centeredIndexFromOffset', () => {
  it('maps a zero offset to the first item', () => {
    expect(centeredIndexFromOffset(0, ITEM_WIDTH, 3)).toBe(0);
  });
  it('rounds to the nearest snap point', () => {
    expect(centeredIndexFromOffset(ITEM_WIDTH * 1.4, ITEM_WIDTH, 3)).toBe(1);
    expect(centeredIndexFromOffset(ITEM_WIDTH * 1.6, ITEM_WIDTH, 3)).toBe(2);
  });
  it('clamps below the first and beyond the last index', () => {
    expect(centeredIndexFromOffset(-999, ITEM_WIDTH, 3)).toBe(0);
    expect(centeredIndexFromOffset(ITEM_WIDTH * 99, ITEM_WIDTH, 3)).toBe(2);
  });
  it('never returns NaN for a zero item width or empty reel', () => {
    expect(centeredIndexFromOffset(120, 0, 3)).toBe(0);
    expect(centeredIndexFromOffset(120, ITEM_WIDTH, 0)).toBe(0);
  });
});

describe('wrapIndex', () => {
  it('wraps positive, negative and in-range indices into [0, count)', () => {
    expect(wrapIndex(0, 3)).toBe(0);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(5, 3)).toBe(2);
    expect(wrapIndex(-1, 3)).toBe(2);
  });
  it('is safe for an empty count', () => {
    expect(wrapIndex(2, 0)).toBe(0);
  });
});

describe('toReelMovies', () => {
  it('maps an array batch into reel display objects', () => {
    const out = toReelMovies([{ id: 7, title: 'Echo', image_url: 'e.jpg', overview: 'Echo synopsis' }]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Echo');
  });
  it('returns an empty array for a non-array (API error object) without throwing', () => {
    expect(toReelMovies({ vector: ['This list may not be empty.'] })).toEqual([]);
    expect(toReelMovies(null)).toEqual([]);
  });
});

describe('MovieReel', () => {
  it('renders the movies returned by the endpoint', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    MOVIES.forEach((_, i) => expect(exists(root, `reel-poster-${i}`)).toBe(true));
  });

  it('shows the first movie title in the spotlight on mount', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    expect(textOf(root, 'reel-title')).toBe('Alpha');
  });

  it('updates the title when a new movie locks into the spotlight', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    settleAt(root, (BASE + 2) * ITEM_WIDTH);
    expect(textOf(root, 'reel-title')).toBe('Charlie');
  });

  it('loops: settling into an outer copy wraps back to the right movie', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    // rendered index 0 is the first (outer) copy → wraps to real movie 0
    settleAt(root, 0);
    expect(textOf(root, 'reel-title')).toBe('Alpha');
    // rendered index 8 is the last (outer) copy → wraps to real movie 2
    settleAt(root, 8 * ITEM_WIDTH);
    expect(textOf(root, 'reel-title')).toBe('Charlie');
  });

  it('selects the centered movie when the title is tapped', () => {
    const onSelect = jest.fn();
    const root = render(<MovieReel movies={MOVIES} onSelect={onSelect} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    act(() => pressable(root, 'reel-title-select').props.onPress());
    expect(onSelect).toHaveBeenCalledWith(MOVIES[0]);
  });

  it('opens the embedded trailer when the centered poster has a trailer', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    expect(exists(root, 'reel-trailer')).toBe(false);
    act(() => enabledPoster(root).props.onPress());
    expect(exists(root, 'reel-trailer')).toBe(true);
  });

  it('does nothing when the centered poster has no trailer', () => {
    const noTrailer = [{ id: 5, name: 'NoTrail', image: 'n.jpg', overview: 'x', vector: [] }];
    const root = render(<MovieReel movies={noTrailer} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    act(() => enabledPoster(root).props.onPress());
    expect(exists(root, 'reel-trailer')).toBe(false);
  });

  it('opens Details for the centered movie via the Details button', () => {
    const onDetails = jest.fn();
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={onDetails} itemWidth={ITEM_WIDTH} />).root;
    act(() => pressable(root, 'reel-details').props.onPress());
    expect(onDetails).toHaveBeenCalledWith(MOVIES[0]);
  });

  it('renders a spotlight element', () => {
    const root = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />).root;
    expect(exists(root, 'reel-spotlight')).toBe(true);
  });

  it('resets to the first movie on a fresh batch', () => {
    const renderer = render(<MovieReel movies={MOVIES} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />);
    settleAt(renderer.root, (BASE + 2) * ITEM_WIDTH);
    expect(textOf(renderer.root, 'reel-title')).toBe('Charlie');

    const NEXT = [{ id: 9, name: 'Delta', image: 'd.jpg', overview: 'Delta synopsis', vector: [] }];
    act(() => {
      renderer.update(<MovieReel movies={NEXT} onSelect={() => {}} onDetails={() => {}} itemWidth={ITEM_WIDTH} />);
    });
    expect(textOf(renderer.root, 'reel-title')).toBe('Delta');
  });
});
