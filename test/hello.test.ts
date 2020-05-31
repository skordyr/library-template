import hello from '../src';

describe('hello', () => {
  test('hello library', () => {
    expect(hello('library')).toEqual('hello, library');
  });
});
