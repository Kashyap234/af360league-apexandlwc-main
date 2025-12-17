import { LightningElement, api, track } from 'lwc';
import promotionStateService from 'c/promotionStateService';
import getProducts from '@salesforce/apex/PromotionCreatorCtrl.getProducts';

export default class PromotionWizardStep2 extends LightningElement {
    // Use the same singleton service as the parent wizard
    stateService = promotionStateService;

    @track products = [];
    @track selectedProductsMap = new Map();
    
    pageNumber = 1;
    pageSize = 5;
    totalItemCount = 0;
    isLoading = true;
    error = null;

    connectedCallback() {
        this.restoreSelectionsFromState();
        this.loadProducts();
    }

    restoreSelectionsFromState() {
        const state = this.stateService.getState();
        const stateProducts = state.chosenProducts || [];
        stateProducts.forEach(product => {
            this.selectedProductsMap.set(product.productId, { ...product });
        });
    }

    async loadProducts() {
        this.isLoading = true;
        this.error = null;
        try {
            const result = await getProducts({
                type: null,
                pageNumber: this.pageNumber
            });

            this.pageSize = result.pageSize;
            this.totalItemCount = result.totalItemCount;

            this.products = result.records.map(record => {
                const savedProduct = this.selectedProductsMap.get(record.Id);
                const isSelected = this.selectedProductsMap.has(record.Id);
                return {
                    id: record.Id,
                    name: record.Name,
                    category: record.cgcloud__Category__c || 'N/A',
                    isSelected: isSelected,
                    isDisabled: !isSelected,
                    discountPercent: savedProduct ? savedProduct.discountPercent : 0
                };
            });
        } catch (err) {
            this.error = 'Failed to load products';
        } finally {
            this.isLoading = false;
        }
    }

    handleCheckboxChange(event) {
        const productId = event.target.dataset.id;
        const isChecked = event.target.checked;
        const product = this.products.find(p => p.id === productId);

        if (isChecked) {
            this.selectedProductsMap.set(productId, {
                productId: productId,
                productName: product.name,
                category: product.category,
                discountPercent: product.discountPercent || 0
            });
        } else {
            this.selectedProductsMap.delete(productId);
        }

        this.products = this.products.map(p => {
            if (p.id === productId) {
                return { ...p, isSelected: isChecked, isDisabled: !isChecked };
            }
            return p;
        });
    }

    handleDiscountChange(event) {
        const productId = event.target.dataset.id;
        let discountValue = parseFloat(event.target.value) || 0;
        discountValue = Math.max(0, Math.min(100, discountValue));

        this.products = this.products.map(p => {
            if (p.id === productId) {
                return { ...p, discountPercent: discountValue };
            }
            return p;
        });

        if (this.selectedProductsMap.has(productId)) {
            const existing = this.selectedProductsMap.get(productId);
            this.selectedProductsMap.set(productId, {
                ...existing,
                discountPercent: discountValue
            });
        }
    }

    // Pagination logic (handlePreviousPage, handleNextPage, etc. remain the same)
    handlePreviousPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadProducts(); } }
    handleNextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadProducts(); } }
    get totalPages() { return Math.ceil(this.totalItemCount / this.pageSize); }
    get hasPreviousPage() { return this.pageNumber > 1; }
    get hasNextPage() { return this.pageNumber < this.totalPages; }
    get pageInfo() { 
        const start = (this.pageNumber - 1) * this.pageSize + 1;
        const end = Math.min(this.pageNumber * this.pageSize, this.totalItemCount);
        return `${start}-${end} of ${this.totalItemCount}`;
    }

    get selectedCount() { return this.selectedProductsMap.size; }
    get hasSelectedProducts() { return this.selectedCount > 0; }
    get selectedProductsList() { return Array.from(this.selectedProductsMap.values()); }
    get noProducts() { return !this.isLoading && this.products.length === 0; }
    get hasProducts() { return this.products.length > 0; }
    get notLoading() { return !this.isLoading; }
    get noPreviousPage() { return !this.hasPreviousPage; }
    get noNextPage() { return !this.hasNextPage; }

    @api
    allValid() {
        if (this.selectedProductsMap.size === 0) {
            this.error = 'Please select at least one product.';
            return false;
        }

        let allHaveDiscount = true;
        this.selectedProductsMap.forEach((product) => {
            if (product.discountPercent === null || product.discountPercent === undefined || product.discountPercent <= 0) {
                allHaveDiscount = false;
            }
        });

        if (!allHaveDiscount) {
            this.error = 'Please enter a discount percentage (greater than 0) for all selected products.';
            return false;
        }

        // Save to the correct state service
        const productsArray = Array.from(this.selectedProductsMap.values());
        this.stateService.updateProducts(productsArray);
        
        this.error = null;
        return true;
    }
}