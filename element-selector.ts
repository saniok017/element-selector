const enum NumberFilter {
  All = 'all',
  GreaterThan10 = 'gt10',
  GreaterThan50 = 'gt50',
  GreaterThan100 = 'gt100',
}

class ElementSelector extends HTMLElement {
  private selectedElements: string[] = [];
  private allElements: string[] = [];
  private filteredElements: string[] = [];
  private dialog: HTMLDialogElement | null = null;
  private selectedLimit: number = 3;
  private itemsQuantity: number = 300;
  private searchTerm: string = '';
  private numberFilter: NumberFilter = NumberFilter.All;
  
  private dialogSelectedElements: string[] = [];
  
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
    
    // TODO: use wrapper to render elements
    const wrapper = document.createElement("div");

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      
      <div class="container">
        <h2>Selected Elements</h2>
        <div class="selected-items">
          ${this.getSelectedItems()}
        </div>
        <button class="change-button">Change my choice</button>
      </div>
      
      <dialog>
        <div class="dialog-container">
          <h2 class="dialog-header">Select Elements</h2>
          
          <div class="search-filter">
            <input type="text" placeholder="Search elements..." class="search-input">
            <select class="number-filter">
              <option value="all">All elements</option>
              <option value="gt10">Number > 10</option>
              <option value="gt50">Number > 50</option>
              <option value="gt100">Number > 100</option>
            </select>
          </div>
          
          <div class="elements-list">
            ${this.getElementsList()}
          </div>
          
          <h3>Selected Elements</h3>
          <div class="dialog-selected">
            ${this.getDialogSelectedItems()}
          </div>
          
          <div class="dialog-footer">
            <button class="cancel-button">Cancel</button>
            <button class="save-button">Save</button>
          </div>
        </div>
      </dialog>
    `;
     
    // this.shadowRoot.appendChild(wrapper);

    // getElementById would be faster but it's not safe to use for custom elements
    this.dialog = this.shadowRoot.querySelector('dialog');
  }
  
  private getSelectedItems(): string {
    if (this.selectedElements.length === 0) {
      return '<em>No elements selected</em>';
    }
    
    return this.selectedElements.map(element => `
      <div class="selected-item">
        ${element}
        <button class="remove-button" data-element="${element}">✕</button>
      </div>
    `).join('');
  }
  
  private getDialogSelectedItems(): string {
    if (this.dialogSelectedElements.length === 0) {
      return '<em>No elements selected</em>';
    }
    
    return this.dialogSelectedElements.map(element => `
      <div class="selected-item">
        ${element}
        <button class="dialog-remove-button" data-element="${element}">✕</button>
      </div>
    `).join('');
  }

  private getElementsList(): string {
    const isLimitReached = this.dialogSelectedElements.length >= this.selectedLimit;
    
    if (this.filteredElements.length === 0) {
      return '<p>No elements match your search criteria.</p>';
    }
    
    return this.filteredElements.map(element => {
      // TODO: consider use set instead of array
      const isSelected = this.dialogSelectedElements.includes(element);
      const isDisabled = isLimitReached && !isSelected;
      
      return `
        <div class="element-item">
          <label>
            ${element}
            <input type="checkbox" data-element="${element}" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
          </label>
        </div>
      `;
    }).join('');
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
    // should be changed to RegExp.escape when it will be supported
    const escapedSearchTerm = this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const currentSearchTerm = new RegExp(escapedSearchTerm, 'i');

    // Elements are sorted by number so we can use currentOffset to skip elements that are not in the range
    for (let i = currentOffset; i < this.allElements.length; i++) {
      const element = this.allElements[i];

      const matchesSearch = this.searchTerm === '' || 
        element.match(currentSearchTerm);

      if (matchesSearch) {
        elementsList.push(element);
      }
    }

    this.filteredElements = elementsList;
  }
  
  // TODO: use observer pattern to improve performance
  // TODO: use event delegation and pattern matching
  private setupEventListeners() {
    if (!this.shadowRoot) return;

    // toggle?
    const changeButton = this.shadowRoot.querySelector('.change-button');
    changeButton?.addEventListener('click', () => this.openDialog());
    
    // Remove buttons in main view
    // TODO: handle all pointer events including enter press
    // TODO: check tabindexes and aria attributes

    // use this one! const element = target.getAttribute('data-elementType');
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('remove-button')) {
        const element = target.getAttribute('data-element');
        if (element) {
          this.removeElement(element);
        }
      }
    });

    if (this.dialog) {
      const saveButton = this.dialog.querySelector('.save-button');
      saveButton?.addEventListener('click', () => this.saveSelection());
      
      const cancelButton = this.dialog.querySelector('.cancel-button');
      cancelButton?.addEventListener('click', () => this.closeDialog());
      
      const searchInput = this.dialog.querySelector('.search-input') as HTMLInputElement;
      searchInput?.addEventListener('input', (e) => {
        this.searchTerm = (e.target as HTMLInputElement).value;
        this.onFilterChange();
        this.updateElementsList();
      });
      
      //TODO: use one change listener and descriminate it by type
      const numberFilter = this.dialog.querySelector('.number-filter') as HTMLSelectElement;
      numberFilter?.addEventListener('change', (e) => {
        this.numberFilter = (e.target as HTMLSelectElement).value as NumberFilter;
        this.onFilterChange();
        this.updateElementsList();
      });
      
      // Checkbox changes
      this.dialog.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
          const element = target.getAttribute('data-element');

          if (element) {
            if (target.checked) {
              this.addToDialogSelection(element);
            } else {
              this.removeFromDialogSelection(element);
            }
          }
        }
      });
      
      // TODO: check if we need to uncheck checkboxes in order we check it during its rendering
      // TODO: consider using desposible pattern and dont forget to remove event listeners
      // TODO: check rerender sicle machanism (trigger rerender manualy?)
      // Remove buttons in dialog
      this.dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('dialog-remove-button')) {
          const element = target.getAttribute('data-element');
          if (element) {
            this.removeFromDialogSelection(element);
            // Update checkbox
            const checkbox = this.dialog?.querySelector(`[data-element="${element}"]`) as HTMLInputElement;
            if (checkbox) checkbox.checked = false;
          }
        }
      });
    }
  }
  
  private openDialog() {
    if (!this.dialog) return;
    
    // Initialize dialog selection with current selection
    this.dialogSelectedElements = [...this.selectedElements];
    
    // TODO: set default values setting
    // Reset filters
    this.searchTerm = '';
    this.numberFilter = NumberFilter.All;
    
    // Update dialog content
    this.updateDialogContent();
    
    // Show dialog
    this.dialog.showModal();
  }
  
  private closeDialog() {
    if (!this.dialog) return;
    this.dialog.close();
  }
  
  private saveSelection() {
    // Update main selection with dialog selection
    this.selectedElements = [...this.dialogSelectedElements];
    
    // Close dialog
    this.closeDialog();
    
    // TODO: rerender only selected elements
    this.render();
  }
  
  // TODO: rerender only selected elements
  private removeElement(element: string) {
    this.selectedElements = this.selectedElements.filter(el => el !== element);
    this.render();
  }
  
  // TODO: add linter
  // TODO handle extra item selection (change already selected item with new one)???
  private addToDialogSelection(element: string) {
    const isLimitReached = this.dialogSelectedElements.length >= this.selectedLimit;
    // TODO: consider using set instead of array
    const isSelected = this.dialogSelectedElements.includes(element);

    if (!isLimitReached && !isSelected) {
      this.dialogSelectedElements.push(element);
      this.updateDialogContent();
    }
  }
  
  private removeFromDialogSelection(element: string) {
    this.dialogSelectedElements = this.dialogSelectedElements.filter(el => el !== element);
    this.updateDialogContent();
  }
  
  private updateDialogContent() {
    if (!this.dialog) return;
    
    const selectedContainer = this.dialog.querySelector('.dialog-selected');
    if (selectedContainer) {
      selectedContainer.innerHTML = this.getDialogSelectedItems();
    }
    
    this.updateElementsList();
  }

  private updateElementsList() {
    if (!this.dialog) return;
    
    const elementsListContainer = this.dialog.querySelector('.elements-list');
    if (elementsListContainer) {
      elementsListContainer.innerHTML = this.getElementsList();
    }
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
