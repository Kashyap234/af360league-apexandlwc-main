import { LightningElement, api } from 'lwc';

// Import the state manager and context modules
import { fromContext } from '@lwc/state';
import promotionStateManager from 'c/promotionStateManager';

export default class PromotionWizardStep1 extends LightningElement {
    
    // Initialize/inherit the state from the parent
    promotionState = fromContext(promotionStateManager);

    promotionName;

    connectedCallback(){
        this.promotionName = this.promotionState?.value?.promotionName;
    }

    handleChange(event) {
        this.promotionName = event.detail.value;
    }

    @api
    allValid(){
        if(this.promotionName === undefined || this.promotionName === ''){
            return false;
        }
        
        // Update the promotion name in the state
        this.promotionState.value.updatePromotionName(this.promotionName);
        
        return true;
    }
}