// --- Search Module ---
// Handles type-to-search functionality for local authority names

class LocalAuthoritySearch {
    constructor(containerId, onSelect) {
        this.containerId = containerId;
        this.onSelect = onSelect;
        this.authorities = [];
        this.filteredAuthorities = [];
        this.selectedIndex = -1;
        this.container = null;
        this.input = null;
        this.resultsList = null;
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        this.container = container;
        
        // Create search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border shadow-sm transition-colors';
        this.input.placeholder = 'Type to search local authority...';
        this.input.setAttribute('autocomplete', 'off');
        
        // Create results container
        const resultsWrapper = document.createElement('div');
        resultsWrapper.className = 'relative';
        
        this.resultsList = document.createElement('div');
        this.resultsList.id = 'la-search-results';
        this.resultsList.className = 'hidden absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto';
        
        resultsWrapper.appendChild(this.input);
        resultsWrapper.appendChild(this.resultsList);
        
        // Replace existing select with search
        const existingSelect = container.querySelector('select');
        if (existingSelect) {
            container.replaceChild(resultsWrapper, existingSelect);
        } else {
            container.appendChild(resultsWrapper);
        }

        // Event listeners
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.input.addEventListener('focus', () => {
            if (this.filteredAuthorities.length > 0) {
                this.resultsList.classList.remove('hidden');
            }
        });
        
        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.resultsList.classList.add('hidden');
            }
        });
    }

    setAuthorities(authorities) {
        this.authorities = authorities;
        this.filteredAuthorities = authorities;
    }

    handleInput(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length === 0) {
            this.filteredAuthorities = this.authorities;
        } else {
            this.filteredAuthorities = this.authorities.filter(auth => 
                auth.name.toLowerCase().includes(query) || 
                auth.code.toLowerCase().includes(query)
            );
        }
        
        this.selectedIndex = -1;
        this.renderResults();
    }

    handleKeyDown(e) {
        if (!this.resultsList.classList.contains('hidden')) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredAuthorities.length - 1);
                this.renderResults();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.renderResults();
            } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
                e.preventDefault();
                this.selectAuthority(this.filteredAuthorities[this.selectedIndex]);
            } else if (e.key === 'Escape') {
                this.resultsList.classList.add('hidden');
            }
        }
    }

    renderResults() {
        if (this.filteredAuthorities.length === 0) {
            this.resultsList.innerHTML = '<div class="p-3 text-sm text-gray-500">No results found</div>';
            this.resultsList.classList.remove('hidden');
            return;
        }

        const html = this.filteredAuthorities.map((auth, index) => {
            const isSelected = index === this.selectedIndex;
            return `
                <div 
                    class="p-3 cursor-pointer hover:bg-blue-50 ${isSelected ? 'bg-blue-100' : ''} border-b border-gray-100 last:border-b-0"
                    data-index="${index}"
                    data-code="${auth.code}"
                >
                    <div class="font-medium text-gray-900">${auth.name}</div>
                    <div class="text-xs text-gray-500">${auth.code}</div>
                </div>
            `;
        }).join('');

        this.resultsList.innerHTML = html;
        this.resultsList.classList.remove('hidden');

        // Add click handlers
        this.resultsList.querySelectorAll('[data-index]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document click handler from firing
                const index = parseInt(item.getAttribute('data-index'));
                this.selectAuthority(this.filteredAuthorities[index]);
            });
        });

        // Scroll selected item into view
        if (this.selectedIndex >= 0) {
            const selectedItem = this.resultsList.querySelector(`[data-index="${this.selectedIndex}"]`);
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    selectAuthority(authority) {
        this.input.value = authority.name;
        this.resultsList.classList.add('hidden');
        this.selectedIndex = -1;
        
        if (this.onSelect) {
            this.onSelect(authority);
        }
    }

    getSelectedValue() {
        const value = this.input.value.trim();
        const authority = this.authorities.find(a => a.name === value);
        return authority ? authority.code : null;
    }

    getSelectedName() {
        return this.input.value.trim();
    }
}

