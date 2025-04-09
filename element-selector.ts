class ElementSelector extends HTMLElement {
  private selectedElements: string[] = [];
  private allElements: string[] = [];
  private dialog: HTMLDialogElement | null = null;
  private selectedLimit: number = 3;
  private searchTerm: string = '';
  private numberFilter: string = 'all';
  
  private dialogSelectedElements: string[] = [];
  
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
    this.allElements = Array.from({ length: 300 }, (_, i) => `Element ${i + 1}`); // TODO: generate random data
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
        <div class="selected-items">
          ${this.renderSelectedItems()}
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
            ${this.renderElementsList()}
          </div>
          
          <h3>Selected Elements</h3>
          <div class="dialog-selected">
            ${this.renderDialogSelectedItems()}
          </div>
          
          <div class="dialog-footer">
            <button class="cancel-button">Cancel</button>
            <button class="save-button">Save</button>
          </div>
        </div>
      </dialog>
    `;
    
    this.shadowRoot.appendChild(wrapper);

    // TODO: consider using getElementById
    this.dialog = this.shadowRoot.querySelector('dialog');
  }
  
  private renderSelectedItems(): string {
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
  
  private renderDialogSelectedItems(): string {
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
  
  private renderElementsList(): string {
    // Apply filters
    const filteredElements = this.getFilteredElements();
    
    if (filteredElements.length === 0) {
      return '<p>No elements match your search criteria.</p>';
    }
    
    return filteredElements.map(element => {
      const isSelected = this.dialogSelectedElements.includes(element);
      const isDisabled = this.dialogSelectedElements.length >= this.selectedLimit && !isSelected;
      
      return `
        <div class="element-item">
          <input type="checkbox" id="${element}" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
          <label for="${element}">${element}</label>
        </div>
      `;
    }).join('');
  }
  
  private getFilteredElements(): string[] {
    return this.allElements.filter(element => {
      // Apply search filter
      const matchesSearch = this.searchTerm === '' || 
        element.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Apply number filter
      let matchesNumberFilter = true;
      const match = element.match(/Element (\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        switch (this.numberFilter) {
          case 'gt10':
            matchesNumberFilter = num > 10;
            break;
          case 'gt50':
            matchesNumberFilter = num > 50;
            break;
          case 'gt100':
            matchesNumberFilter = num > 100;
            break;
        }
      }
      
      return matchesSearch && matchesNumberFilter;
    });
  }
  
  private setupEventListeners() {
    if (!this.shadowRoot) return;
    
    // Change button click
    const changeButton = this.shadowRoot.querySelector('.change-button');
    changeButton?.addEventListener('click', () => this.openDialog());
    
    // Remove buttons in main view
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('remove-button')) {
        const element = target.getAttribute('data-element');
        if (element) {
          this.removeElement(element);
        }
      }
    });
    
    // Dialog events
    if (this.dialog) {
      // Save button
      const saveButton = this.dialog.querySelector('.save-button');
      saveButton?.addEventListener('click', () => this.saveSelection());
      
      // Cancel button
      const cancelButton = this.dialog.querySelector('.cancel-button');
      cancelButton?.addEventListener('click', () => this.closeDialog());
      
      // Search input
      const searchInput = this.dialog.querySelector('.search-input') as HTMLInputElement;
      searchInput?.addEventListener('input', (e) => {
        this.searchTerm = (e.target as HTMLInputElement).value;
        this.updateElementsList();
      });
      
      // Number filter
      const numberFilter = this.dialog.querySelector('.number-filter') as HTMLSelectElement;
      numberFilter?.addEventListener('change', (e) => {
        this.numberFilter = (e.target as HTMLSelectElement).value;
        this.updateElementsList();
      });
      
      // Checkbox changes
      this.dialog.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
          const element = target.id;
          if (target.checked) {
            this.addToDialogSelection(element);
          } else {
            this.removeFromDialogSelection(element);
          }
        }
      });
      
      // Remove buttons in dialog
      this.dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('dialog-remove-button')) {
          const element = target.getAttribute('data-element');
          if (element) {
            this.removeFromDialogSelection(element);
            // Update checkbox
            const checkbox = this.dialog?.querySelector(`#${element}`) as HTMLInputElement;
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
    
    // Reset filters
    this.searchTerm = '';
    this.numberFilter = 'all';
    
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
    
    // Update main view
    this.render();
  }
  
  private removeElement(element: string) {
    this.selectedElements = this.selectedElements.filter(el => el !== element);
    this.render();
  }
  
  private addToDialogSelection(element: string) {
    if (this.dialogSelectedElements.length < this.selectedLimit && !this.dialogSelectedElements.includes(element)) {
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
      selectedContainer.innerHTML = this.renderDialogSelectedItems();
    }
    
    this.updateElementsList();
  }
  
  private updateElementsList() {
    if (!this.dialog) return;
    
    const elementsListContainer = this.dialog.querySelector('.elements-list');
    if (elementsListContainer) {
      elementsListContainer.innerHTML = this.renderElementsList();
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
