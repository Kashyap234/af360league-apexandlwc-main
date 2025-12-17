import { LightningElement, api, track } from 'lwc';
import promotionStateService from 'c/promotionStateService';

export default class PromotionWizardStep1 extends LightningElement {
    stateService = promotionStateService;
    
    @track promotionName = '';

    connectedCallback() {
        const state = this.stateService.getState();
        this.promotionName = state.promotionName || '';
    }

    handleChange(event) {
        this.promotionName = event.detail.value;
        console.log('Promotion name changed to:', this.promotionName);
    }

    @api
    allValid() {
        console.log('Step1 allValid called. Promotion name:', this.promotionName);
        
        if (!this.promotionName || this.promotionName.trim() === '') {
            console.log('Validation failed: promotion name is empty');
            return false;
        }
        
        console.log('Validation passed. Updating state...');
        this.stateService.updatePromotionName(this.promotionName);
        
        // Verify the state was updated
        const updatedState = this.stateService.getState();
        console.log('State after update:', updatedState);
        
        return true;
    }
}