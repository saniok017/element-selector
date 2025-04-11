const enum NumberFilter {
  All = 'all',
  GreaterThan10 = 'gt10',
  GreaterThan50 = 'gt50',
  GreaterThan100 = 'gt100',
}

class ElementSelector extends HTMLElement {
  private selectedElements = new Set<string>();
  private allElements: string[] = [];
  private filteredElements: string[] = [];
  private dialog: HTMLDialogElement | null = null;
  private selectedLimit: number = 3;
  private itemsQuantity: number = 300;
  private searchTerm: string = '';
  private numberFilter: NumberFilter = NumberFilter.All;
  private debounceTimer: number | null = null;
  private DEBOUNCE_DELAY = 300; // milliseconds
  
  private dialogSelectedElements = new Set<string>();
  private dialogSelectedRoot: HTMLElement | null = null;
  private selectedItemsRoot: HTMLElement | null = null;
  private elementsListRoot: HTMLElement | null = null;
  
  // TODO: add infinite scroll feature (use intersection observer)
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.generateTestData();

    this.render();

    this.setupEventListeners();
  }
  
  private generateTestData() {
    this.allElements = Array.from({ length: this.itemsQuantity }, (_, i) => `Element ${i + 1}`);

    // initial filters are all elements
    this.filteredElements = this.allElements;
  }
  
  private render() {
    if (!this.shadowRoot) {
      return;
    }
    
    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      
      <div class="container">
        <h2>Selected Elements</h2>
        <div data-elementType="selected-items-root" class="selected-items">
        </div>
        <button data-elementType="change-button" class="change-button">Change my choice</button>
      </div>
      
      <dialog>
        <div class="dialog-container">
          <h2 class="dialog-header">Select Elements</h2>
          
          <div class="search-filter">
            <input type="text" data-elementType="search-input" placeholder="Search elements..." class="search-input">
            <select data-elementType="number-filter" class="number-filter">
              <option value="all">All elements</option>
              <option value="gt10">Number > 10</option>
              <option value="gt50">Number > 50</option>
              <option value="gt100">Number > 100</option>
            </select>
          </div>
          
          <div data-elementType="elements-list-root" class="elements-list">
          </div>
          
          <h3>Selected Elements</h3>
          <div data-elementType="dialog-selected-root" class="dialog-selected">
          </div>
          
          <div class="dialog-footer">
            <button data-elementType="cancel-button" class="cancel-button">Cancel</button>
            <button data-elementType="save-button" class="save-button">Save</button>
          </div>
        </div>
      </dialog>
    `;
     
    this.shadowRoot.appendChild(wrapper);

    // getElementById would be faster but it's not safe to use for custom elements
    this.dialogSelectedRoot = this.shadowRoot.querySelector('[data-elementType="dialog-selected-root"]') as HTMLElement;
    this.selectedItemsRoot = this.shadowRoot.querySelector('[data-elementType="selected-items-root"]') as HTMLElement;
    this.elementsListRoot = this.shadowRoot.querySelector('[data-elementType="elements-list-root"]') as HTMLElement;
    this.dialog = this.shadowRoot.querySelector('dialog');

    this.renderElements();
  }

  private renderElements() {
    this.renderDialogSelectedItems();
    this.renderSelectedItems();
    this.renderElementsList();
  }

  private renderSelectedItems(): void {
    const parent = this.selectedItemsRoot;

    if (!parent) return;

    if (this.selectedElements.size === 0) {
      parent.innerHTML = '<em>No elements selected</em>';
      return;
    }

    parent.innerHTML = '';

    this.selectedElements.forEach(element => {
      const selectedItem = document.createElement('div');
      selectedItem.classList.add('selected-item');
      selectedItem.innerHTML = `
        ${element}
        <button data-elementType="remove-button" class="remove-button" data-element="${element}">✕</button>
      `;
      parent.appendChild(selectedItem);
    });
  }

  private renderElementsList(): void {
    const parent = this.elementsListRoot;

    if (!parent) return;

    if (this.filteredElements.length === 0) {
      parent.innerHTML = '<p>No elements match your search criteria.</p>';
      return;
    }

    parent.innerHTML = '';

    const isLimitReached = this.dialogSelectedElements.size >= this.selectedLimit;

    const elementItems = this.filteredElements.map(element => {
      const isSelected = this.dialogSelectedElements.has(element);
      const isDisabled = isLimitReached && !isSelected;

      const elementItem = document.createElement('div');
      elementItem.classList.add('element-item');

      const label = document.createElement('label');
      label.textContent = element;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('data-elementType', 'checkbox');
      checkbox.setAttribute('data-element', element);
      checkbox.checked = isSelected;
      checkbox.disabled = isDisabled;

      label.prepend(checkbox);
      elementItem.appendChild(label);

      return elementItem;
    });

    parent.append(...elementItems);
  }
  
  private renderDialogSelectedItems(): void {
    const parent = this.dialogSelectedRoot;

    if (!parent) return;

    if (this.dialogSelectedElements.size === 0) {
      parent.innerHTML = '<em>No elements selected</em>';
      return;
    }

    parent.innerHTML = '';

    this.dialogSelectedElements.forEach(element => {
      const selectedItem = document.createElement('div');
      selectedItem.classList.add('selected-item');
      selectedItem.innerHTML = `
        ${element}
        <button data-elementType="dialog-remove-button" class="dialog-remove-button" data-element="${element}">✕</button>
      `;
      parent.appendChild(selectedItem);
    }); 
  }

  private onFilterChange(): void {
    const offsetConfig = {
      all: 0,
      gt10: 9,
      gt50: 49,
      gt100: 99,
    }

    let currentOffset = offsetConfig[this.numberFilter];
    const elementsList: string[] = [];
    const currentSearchTerm = this.searchTerm.toLowerCase();

    // Elements are sorted by number so we can use currentOffset to skip elements that are not in the range
    for (let i = currentOffset; i < this.allElements.length; i++) {
      const element = this.allElements[i];

      const matchesSearch = this.searchTerm === '' || 
        element.toLowerCase().includes(currentSearchTerm);

      if (matchesSearch) {
        elementsList.push(element);
      }
    }

    this.filteredElements = elementsList;
  }

  // TODO: handle all pointer events including enter press
  // TODO: check tabindexes and aria attributes
  private setupEventListeners() {
    if (!this.shadowRoot) return;

    this.shadowRoot.addEventListener('click', this.handleElementClick);
    this.shadowRoot.addEventListener('change', this.handleElementChange);
    this.shadowRoot.addEventListener('input', this.handleInputChange);
  }

  private handleElementClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const elementType = target.getAttribute('data-elementType');

    switch (elementType) {
      case 'change-button':
        this.openDialog();
        break;
        
      case 'remove-button':
        const element = target.getAttribute('data-element');
        if (element) this.removeElement(element);
        break;
        
      case 'save-button':
        this.saveSelection();
        break;
        
      case 'cancel-button':
        this.closeDialog();
        break;
        
      case 'dialog-remove-button':
        const removeElement = target.getAttribute('data-element');
        if (removeElement) {
          this.removeFromDialogSelection(removeElement);
          const checkbox = this.dialog?.querySelector(`[data-element="${removeElement}"]`) as HTMLInputElement;
          if (checkbox) checkbox.checked = false;
        }
        break;
    }
  }

  private handleElementChange = (e: Event) => {
    const target = e.target as HTMLElement;
    const elementType = target.getAttribute('data-elementType');

    switch (elementType) {
      case 'checkbox':
        const element = target.getAttribute('data-element');
        if (element) {
          if ((target as HTMLInputElement).checked) {
            this.addToDialogSelection(element);
          } else {
            this.removeFromDialogSelection(element);
          }
        }
        break;
        
      case 'number-filter':
        this.numberFilter = (target as HTMLSelectElement).value as NumberFilter;
        this.onFilterChange();
        this.renderElementsList();
        break;
    }
  }

  private handleInputChange = (e: Event) => {
    const target = e.target as HTMLElement;
    const elementType = target.getAttribute('data-elementType');

    if (elementType === 'search-input') {

      if (this.debounceTimer !== null) {
        window.clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.searchTerm = (target as HTMLInputElement).value;
        this.onFilterChange();
        this.renderElementsList();
        this.debounceTimer = null;
      }, this.DEBOUNCE_DELAY);
    }
  }

  disconnectedCallback() {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.shadowRoot?.removeEventListener('click', this.handleElementClick);
    this.shadowRoot?.removeEventListener('change', this.handleElementChange);
    this.shadowRoot?.removeEventListener('input', this.handleInputChange);
  }

  private openDialog() {
    if (!this.dialog) return;
    
    this.dialogSelectedElements = new Set(this.selectedElements);
    this.filteredElements = this.allElements;

    this.resetFilters();

    this.updateDialogContent();
    
    this.dialog.showModal();
  }
  
  private closeDialog() {
    if (!this.dialog) return;
    this.dialog.close();
  }

  private resetFilters() {
    this.searchTerm = '';
    this.numberFilter = NumberFilter.All;
    
    // Reset UI elements
    const searchInput = this.shadowRoot?.querySelector('[data-elementType="search-input"]') as HTMLInputElement;
    const numberFilter = this.shadowRoot?.querySelector('[data-elementType="number-filter"]') as HTMLSelectElement;
    
    if (searchInput) searchInput.value = '';
    if (numberFilter) numberFilter.value = NumberFilter.All;
  }
  
  private saveSelection() {
    this.selectedElements = new Set(this.dialogSelectedElements);

    this.closeDialog();
    
    this.renderSelectedItems();
  }

  private removeElement(element: string) {
    this.selectedElements.delete(element);
    
    this.renderSelectedItems();
  }
  
  // TODO: add linter
  private addToDialogSelection(element: string) {
    const isLimitReached = this.dialogSelectedElements.size >= this.selectedLimit;
    const isSelected = this.dialogSelectedElements.has(element);

    if (!isLimitReached && !isSelected) {
      this.dialogSelectedElements.add(element);
      this.updateDialogContent();
    }
  }
  
  private removeFromDialogSelection(element: string) {
    this.dialogSelectedElements.delete(element);
    this.updateDialogContent();
  }
  
  private updateDialogContent() {
    if (!this.dialog) return;

    this.renderDialogSelectedItems();
    this.renderElementsList();
  }

  private getStyles(): string {
    return `
    :host {
      display: block;
      font-family: Roboto, sans-serif;
      color: #333;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background-color: #fff;
    }
    
    h2 {
      margin-top: 0;
      color: #2c3e50;
    }
    
    .selected-items {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
      min-height: 40px;
    }
    
    .selected-item {
      background-color: #e1f5fe;
      border-radius: 4px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      font-size: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .selected-item button {
      margin-left: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: #f44336;
      font-weight: bold;
      padding: 0 4px;
      font-size: 16px;
    }
    
    .selected-item button:hover {
      color: #d32f2f;
    }
    
    button.change-button {
      background-color: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    button.change-button:hover {
      background-color: #1976d2;
    }
    
    dialog {
      padding: 0;
      border: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      width: 500px;
      max-width: 90vw;
    }
    
    dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .dialog-container {
      padding: 20px;
    }
    
    .dialog-header {
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .search-filter {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .search-filter input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .search-filter select {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .elements-list {
      height: 300px;
      overflow-y: auto;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 15px;
    }
    
    .element-item {
      padding: 8px;
      display: flex;
      align-items: center;
    }
    
    .element-item:hover {
      background-color: #f5f5f5;
    }
    
    .element-item input {
      margin-right: 10px;
    }
    
    .element-item label {
      cursor: pointer;
      flex: 1;
    }
    
    .dialog-selected {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
      min-height: 30px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .dialog-footer button {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    
    button.save-button {
      background-color: #4caf50;
      color: white;
    }
    
    button.save-button:hover {
      background-color: #388e3c;
    }
    
    button.cancel-button {
      background-color: #f5f5f5;
      color: #333;
    }
    
    button.cancel-button:hover {
      background-color: #e0e0e0;
    }
    
    /* Custom scrollbar */
    .elements-list::-webkit-scrollbar {
      width: 6px;
    }
    
    .elements-list::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .elements-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    .elements-list::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
    `;
  }
}

customElements.define('element-selector', ElementSelector);
