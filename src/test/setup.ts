import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver. Provide a spy-able stub so
// components that observe container size (e.g. GameCanvas) can be tested.
class ResizeObserverStub implements ResizeObserver {
  observe(_target: Element, _options?: ResizeObserverOptions): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}
