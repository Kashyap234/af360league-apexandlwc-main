// Simple state management service without @lwc/state
class PromotionStateService {
    constructor() {
        this.state = {
            promotionName: '',
            chosenProducts: [],
            chosenStores: []
        };
        this.listeners = new Set();
    }

    getState() {
        return { ...this.state };
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    updatePromotionName(name) {
        this.state.promotionName = name;
        this.notify();
    }

    setProduct(product) {
        const existingIndex = this.state.chosenProducts.findIndex(
            p => p.productId === product.productId
        );
        
        if (existingIndex >= 0) {
            this.state.chosenProducts[existingIndex] = {
                ...this.state.chosenProducts[existingIndex],
                ...product
            };
        } else {
            this.state.chosenProducts.push(product);
        }
        this.notify();
    }

    removeProduct(productId) {
        this.state.chosenProducts = this.state.chosenProducts.filter(
            p => p.productId !== productId
        );
        this.notify();
    }

    updateProducts(products) {
        this.state.chosenProducts = [...products];
        this.notify();
    }

    isProductSelected(productId) {
        return this.state.chosenProducts.some(p => p.productId === productId);
    }

    getProductDiscount(productId) {
        const product = this.state.chosenProducts.find(p => p.productId === productId);
        return product ? product.discountPercent : 0;
    }

    getProductCount() {
        return this.state.chosenProducts.length;
    }

    updateStores(stores) {
        this.state.chosenStores = [...stores];
        this.notify();
    }

    reset() {
        this.state = {
            promotionName: '',
            chosenProducts: [],
            chosenStores: []
        };
        this.notify();
    }
}

// Export a singleton instance
const promotionStateService = new PromotionStateService();
export default promotionStateService;