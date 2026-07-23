/**
 * The filter panel must render a row for every category. Regression guard for the
 * restructure into per-category popups (and the layout bug where the scroll body
 * collapsed and hid all the rows — here we at least assert every category is
 * present in the tree).
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FilterMenu } from '../App';

function allText(root: any): string[] {
  const out: string[] = [];
  const collect = (c: any) => {
    if (typeof c === 'string') out.push(c);
    else if (Array.isArray(c)) c.forEach(collect);
  };
  root.findAllByType('Text').forEach((n: any) => collect(n.props.children));
  return out;
}

test('renders a row for every filter category', () => {
  let r: any;
  act(() => {
    r = ReactTestRenderer.create(<FilterMenu visible onClose={() => {}} onApply={() => {}} />);
  });
  const text = allText(r.root).join(' | ');
  ['Genre', 'Year', 'Country', 'Cast', 'Directors'].forEach(label => {
    expect(text).toContain(label);
  });
});
