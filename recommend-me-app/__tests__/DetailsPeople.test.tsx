/**
 * Tests for the tappable people credits on the Details screen.
 *
 * Behaviour pinned here:
 *   - splitPeople() turns the comma-joined actor string (mapRawMovieForDetails
 *     output) back into individual names, dropping blanks and the 'Unknown'
 *     placeholder,
 *   - PeopleLinks renders each name as a tappable link that calls onPressPerson
 *     with the name and the search mode (actor / director),
 *   - when there are no real names it renders no links (just the fallback label).
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { splitPeople, PeopleLinks } from '../App';

function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  // @ts-ignore assigned inside act
  return renderer;
}

// All tappable person links rendered for a given mode, deduped by testID.
// (A react-native <Text> matches as both its composite and host instance under
// react-test-renderer, so a raw findAll double-counts each link.)
const links = (root: any, mode: string) => {
  const seen = new Map<string, any>();
  root
    .findAll(
      (n: any) =>
        typeof n.props?.testID === 'string' &&
        n.props.testID.startsWith(`person-link-${mode}-`) &&
        typeof n.props.onPress === 'function',
    )
    .forEach((n: any) => {
      if (!seen.has(n.props.testID)) seen.set(n.props.testID, n);
    });
  return [...seen.values()];
};

describe('splitPeople', () => {
  it('splits a comma-joined actor string into trimmed names', () => {
    expect(splitPeople('Tom Hanks, Tim Allen, Don Rickles')).toEqual([
      'Tom Hanks',
      'Tim Allen',
      'Don Rickles',
    ]);
  });

  it('returns a single name for one person', () => {
    expect(splitPeople('John Lasseter')).toEqual(['John Lasseter']);
  });

  it('drops the Unknown placeholder, blanks and non-strings', () => {
    expect(splitPeople('Unknown')).toEqual([]);
    expect(splitPeople('')).toEqual([]);
    expect(splitPeople(null)).toEqual([]);
    expect(splitPeople(undefined)).toEqual([]);
    expect(splitPeople('Tom Hanks, , unknown')).toEqual(['Tom Hanks']);
  });
});

describe('PeopleLinks', () => {
  it('renders each actor as a tappable link carrying its name + actor mode', () => {
    const onPress = jest.fn();
    const root = render(
      <PeopleLinks
        label="Starring: "
        value="Tom Hanks, Tim Allen"
        mode="actor"
        onPressPerson={onPress}
      />,
    ).root;
    const ls = links(root, 'actor');
    expect(ls).toHaveLength(2);
    act(() => ls[1].props.onPress());
    expect(onPress).toHaveBeenCalledWith('Tim Allen', 'actor');
  });

  it('renders the director as a single link in director mode', () => {
    const onPress = jest.fn();
    const root = render(
      <PeopleLinks
        label="Director: "
        value="John Lasseter"
        mode="director"
        onPressPerson={onPress}
      />,
    ).root;
    const ls = links(root, 'director');
    expect(ls).toHaveLength(1);
    act(() => ls[0].props.onPress());
    expect(onPress).toHaveBeenCalledWith('John Lasseter', 'director');
  });

  it('renders no links when there is no real name', () => {
    const root = render(
      <PeopleLinks
        label="Director: "
        value="Unknown"
        mode="director"
        onPressPerson={() => {}}
      />,
    ).root;
    expect(links(root, 'director')).toHaveLength(0);
  });
});
