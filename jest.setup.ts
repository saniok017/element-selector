global.IntersectionObserver = class IntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
  takeRecords() { return []; }
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: number[] = [];
};

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  value: function() {
    this.open = true;
  },
  writable: true,
  configurable: true
});

Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  value: function() {
    this.open = false;
  },
  writable: true,
  configurable: true
});

expect.extend({
  toBeInTheDocument(received: Element | null) {
    const pass = received !== null && (
      document.body.contains(received) || 
      Array.from(document.querySelectorAll('*')).some(el => 
        el.shadowRoot?.contains(received)
      )
    );
    if (pass) {
      return {
        message: () => `expected ${received} not to be in the document or shadow DOM`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be in the document or shadow DOM`,
        pass: false,
      };
    }
  },
});
