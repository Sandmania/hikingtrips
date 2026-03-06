const { expect } = window.chai;
const { queries, within, waitFor, fireEvent } = window.TestingLibraryDom;

let rootContainer;

beforeEach(() => {
    rootContainer = document.createElement('div');
    rootContainer.style.position = 'absolute';
    rootContainer.style.left = '-10000px';
    document.body.appendChild(rootContainer);
});

afterEach(() => {
    rootContainer.remove();
    rootContainer = null;
});

const screen = Object.fromEntries(
    Object.entries(queries).map(([name, fn]) => [name, (...args) => fn(rootContainer, ...args)])
);

export function render(element) {
    rootContainer.appendChild(element);
    return element;
}

export { rootContainer, expect, screen, within, waitFor, fireEvent };
