/**
 * Endpoint routing for the spotlight reel.
 *
 * The backend's twelve_options REQUIRES a vector (an empty one 400s with
 * {"vector":["This list may not be empty."]}), so the cold-start batch — which
 * has no vector yet — MUST come from start_movies; routing it to twelve_options
 * returns an error object that white-screened the app. This pins the cold-start
 * request to start_movies (and away from twelve_options / two_options).
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SelectionScreen } from '../App';

const TWO = Array.from({ length: 2 }, (_, i) => ({
  id: i + 1,
  title: `Movie ${i + 1}`,
  image_url: `m${i + 1}.jpg`,
  overview: `Overview ${i + 1}`,
  vector: new Array(43).fill(0),
}));

const navigation = { navigate: jest.fn(), push: jest.fn(), popToTop: jest.fn() };

describe('SelectionScreen cold-start data source', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(TWO) }),
    ) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('requests the cold-start batch from start_movies, not the vector endpoints', async () => {
    await act(async () => {
      ReactTestRenderer.create(<SelectionScreen navigation={navigation} />);
    });

    const calls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(calls.some(url => url.includes('/movies/start_movies'))).toBe(true);
    expect(calls.some(url => url.includes('/movies/twelve_options'))).toBe(false);
    expect(calls.some(url => url.includes('/movies/two_options'))).toBe(false);
  });
});
