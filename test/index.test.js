import { expect, test, vi } from 'vitest';
function sum(a, b) {
    return a + b;
}
test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});
const original = {
    simple: () => 'value',
    nested: {
        method: () => 'real'
    },
    prop: 'foo',
};
test('object mocked', () => {
    const mocked = vi.mockObject(original);
    expect(mocked.simple()).toBe(undefined);
    expect(mocked.nested.method()).toBe(undefined);
    expect(mocked.prop).toBe('foo');
    mocked.simple.mockReturnValue('mocked');
    mocked.nested.method.mockReturnValue('mocked nested');
    expect(mocked.simple()).toBe('mocked');
    expect(mocked.nested.method()).toBe('mocked nested');
});
test('fetch properly', async () => {
    const response = await fetch('https://rest-endpoint.example/path/to/posts');
    const data = await response.json();
    expect(data).toStrictEqual([
        {
            userId: 1,
            id: 1,
            title: 'first post title',
            body: 'first post body',
        },
    ]);
});
