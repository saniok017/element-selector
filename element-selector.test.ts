import ElementSelector from "./dist/element-selector";

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

class MockIntersectionObserverEntry implements IntersectionObserverEntry {
  readonly boundingClientRect: DOMRectReadOnly = {} as DOMRectReadOnly;
  readonly intersectionRatio: number = 0;
  readonly intersectionRect: DOMRectReadOnly = {} as DOMRectReadOnly;
  readonly isIntersecting: boolean;
  readonly rootBounds: DOMRectReadOnly | null = null;
  readonly target: Element;
  readonly time: number = 0;

  constructor(isIntersecting: boolean, target: Element) {
    this.isIntersecting = isIntersecting;
    this.target = target;
  }
}

describe('ElementSelector', () => {
  let element: ElementSelector;
  let shadowRoot: ShadowRoot;

  beforeEach(() => {
    if (!customElements.get('element-selector')) {
      customElements.define('element-selector', ElementSelector);
    }
    
    element = document.createElement('element-selector') as ElementSelector;
    document.body.appendChild(element);

    // TODO: check if its needed
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        shadowRoot = element.shadowRoot!;
        resolve();
      });
    });
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  describe('Initialization', () => {
    it('should create the component with shadow DOM', () => {
      expect(element.shadowRoot).toBeTruthy();
    });

    it('should initialize with empty selected elements', () => {
      expect(element['selectedElements'].size).toBe(0);
    });

    it('should generate test data on initialization', () => {
      expect(element['allElements'].length).toBe(300);
      expect(element['filteredElements'].length).toBe(300);
    });

    it('should render initial UI elements', () => {
      const container = shadowRoot.querySelector('.container');
      const selectedItems = shadowRoot.querySelector('[data-elementType="selected-items-root"]');
      const changeButton = shadowRoot.querySelector('[data-elementType="change-button"]');
      const dialog = shadowRoot.querySelector('dialog');

      expect(container).toBeInTheDocument();
      expect(selectedItems).toBeInTheDocument();
      expect(changeButton).toBeInTheDocument();
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Selection Management', () => {
    it('should add element to selection', () => {
      const testElement = 'Element 1';
      element['addToDialogSelection'](testElement);
      expect(element['dialogSelectedElements'].has(testElement)).toBeTruthy();
    });

    it('should remove element from selection', () => {
      const testElement = 'Element 1';
      element['addToDialogSelection'](testElement);
      element['removeFromDialogSelection'](testElement);
      expect(element['dialogSelectedElements'].has(testElement)).toBeFalsy();
    });

    it('should respect selection limit', () => {
      const elements = ['Element 1', 'Element 2', 'Element 3', 'Element 4'];
      elements.forEach((el: string) => element['addToDialogSelection'](el));
      expect(element['dialogSelectedElements'].size).toBe(3);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should filter elements by search term', () => {
      const searchInput = shadowRoot.querySelector('[data-elementType="search-input"]') as HTMLInputElement;
      searchInput.value = 'Element 1';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Advance timers by debounce delay
      jest.advanceTimersByTime(300);
      
      expect(element['filteredElements'].length).toBeLessThan(300);
      expect(element['filteredElements'].every((el: string) => el.includes('Element 1'))).toBeTruthy();
    });

    it('should filter elements by number', () => {
      const numberFilter = shadowRoot.querySelector('[data-elementType="number-filter"]') as HTMLSelectElement;
      numberFilter.value = 'gt10';
      numberFilter.dispatchEvent(new Event('change', { bubbles: true }));
      
      expect(element['filteredElements'].length).toBeLessThan(300);
      expect(element['filteredElements'].every((el: string) => {
        const num = parseInt(el.split(' ')[1]);
        return num > 10;
      })).toBeTruthy();
    });
  });

  describe('Dialog Interaction', () => {
    it('should open dialog when change button is clicked', () => {
      const changeButton = shadowRoot.querySelector('[data-elementType="change-button"]') as HTMLButtonElement;
      changeButton.click();

      const dialog = shadowRoot.querySelector('dialog') as HTMLDialogElement;
      expect(dialog.open).toBeTruthy();
    });

    it('should save selection when save button is clicked', () => {
      const testElement = 'Element 1';
      element['addToDialogSelection'](testElement);

      const saveButton = shadowRoot.querySelector('[data-elementType="save-button"]') as HTMLButtonElement;
      saveButton.click();

      expect(element['selectedElements'].has(testElement)).toBeTruthy();
      const dialog = shadowRoot.querySelector('dialog') as HTMLDialogElement;
      expect(dialog.open).toBeFalsy();
    });

    it('should cancel selection when cancel button is clicked', () => {
      const testElement = 'Element 1';
      element['addToDialogSelection'](testElement);

      const cancelButton = shadowRoot.querySelector('[data-elementType="cancel-button"]') as HTMLButtonElement;
      cancelButton.click();

      expect(element['selectedElements'].has(testElement)).toBeFalsy();
      const dialog = shadowRoot.querySelector('dialog') as HTMLDialogElement;
      expect(dialog.open).toBeFalsy();
    });
  });

  describe('Infinite Scroll', () => {
    it('should load more elements when scrolling', () => {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.classList.add('loading-indicator');
      element['observer']?.observe(loadingIndicator);

      const entry = new MockIntersectionObserverEntry(true, loadingIndicator);
      const observer = element['observer'] as unknown as IntersectionObserver & { callback: IntersectionObserverCallback };
      observer.callback([entry], observer);

      expect(element['currentPage']).toBe(2);
    });

    it('should not load more elements when loading is in progress', () => {
      element['loading'] = true;
      const initialPage = element['currentPage'];

      const loadingIndicator = document.createElement('div');
      loadingIndicator.classList.add('loading-indicator');
      element['observer']?.observe(loadingIndicator);

      const entry = new MockIntersectionObserverEntry(true, loadingIndicator);
      const observer = element['observer'] as unknown as IntersectionObserver & { callback: IntersectionObserverCallback };
      observer.callback([entry], observer);

      expect(element['currentPage']).toBe(initialPage);
    });

    it('should show loading indicator when more elements are available', () => {
      const changeButton = shadowRoot.querySelector('[data-elementType="change-button"]') as HTMLButtonElement;
      changeButton.click();

      const loadingIndicator = shadowRoot.querySelector('.loading-indicator');
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners and observer on disconnect', () => {
      const removeEventListenerSpy = jest.spyOn(element.shadowRoot!, 'removeEventListener');
      const disconnectSpy = jest.spyOn(element['observer']!, 'disconnect');

      element.disconnectedCallback();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
}); 