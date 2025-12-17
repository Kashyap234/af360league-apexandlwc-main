import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import savePromotion from '@salesforce/apex/PromotionCreatorCtrl.savePromotion';

// Import the state service
import promotionStateService from 'c/promotionStateService';

export default class PromotionCreationWizard extends NavigationMixin(LightningElement) {
    @api recordId;
    currentStep = 1;
    @track isSaving = false;

    // Store reference to state service
    stateService = promotionStateService;

    connectedCallback() {
        // Reset state when wizard is opened
        this.stateService.reset();
    }

    handleNext() {
        console.log('handleNext called. Current step:', this.currentStep);
        
        if (this.currentStep === 1) {
            const element = this.template.querySelector('c-promotion-wizard-step1');
            console.log('Step1 element found:', !!element);
            
            if (element) {
                const isValid = element.allValid();
                console.log('Step1 validation result:', isValid);
                
                if (isValid) {
                    console.log('Moving to step 2');
                    this.currentStep++;
                } else {
                    this.showToast('Validation Error', 'Please enter a promotion name.', 'error');
                }
            } else {
                console.error('Step1 element not found');
                this.showToast('Error', 'Unable to validate step 1.', 'error');
            }
        } else if (this.currentStep === 2) {
            const element = this.template.querySelector('c-promotion-wizard-step2');
            console.log('Step2 element found:', !!element);
            
            if (element) {
                const isValid = element.allValid();
                console.log('Step2 validation result:', isValid);
                
                if (isValid) {
                    console.log('Moving to step 3');
                    this.currentStep++;
                } else {
                    this.showToast('Validation Error', 'Please select at least one product with a valid discount.', 'error');
                }
            } else {
                console.error('Step2 element not found');
                this.showToast('Error', 'Unable to validate step 2.', 'error');
            }
        }
    }

    handlePrevious() {
        this.currentStep--;
    }

    async handleSave() {
        const step3Element = this.template.querySelector('c-promotion-wizard-step3');
        
        if (!step3Element || !step3Element.allValid()) {
            this.showToast('Validation Error', 'Please select at least one store.', 'error');
            return;
        }

        const promotionData = step3Element.getPromotionData();
        
        const payload = {
            promotionName: promotionData.promotionName,
            accountId: this.recordId,
            templateId: null,
            startDate: null,
            endDate: null,
            products: promotionData.products.map(p => ({
                productId: p.productId,
                productName: p.productName,
                category: p.category || null,
                discountPercent: p.discountPercent
            })),
            stores: promotionData.stores.map(s => ({
                storeId: s.storeId,
                storeName: s.storeName,
                locationGroup: s.locationGroup || null
            }))
        };

        this.isSaving = true;

        try {
            const result = await savePromotion({ 
                promotionDataJson: JSON.stringify(payload) 
            });
            
            this.showToast(
                'Success', 
                result.message || 'Promotion created successfully!', 
                'success'
            );
            
            this.closeAction();
            
            if (result.promotionId) {
                this.navigateToRecord(result.promotionId);
            }
            
        } catch (error) {
            const errorMessage = error.body?.message || error.message || 'An unexpected error occurred.';
            this.showToast('Error', errorMessage, 'error');
        } finally {
            this.isSaving = false;
        }
    }

    closeAction() {
        this.dispatchEvent(new CloseActionScreenEvent());
        this.dispatchEvent(new CustomEvent('close'));
    }

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Promotion',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    get isStep1() {
        return this.currentStep === 1;
    }

    get isStep2() {
        return this.currentStep === 2;
    }

    get isStep3() {
        return this.currentStep === 3;
    }

    get stepTitle() {
        switch(this.currentStep) {
            case 1: return 'Step 1: Promotion Details';
            case 2: return 'Step 2: Select Products';
            case 3: return 'Step 3: Select Stores';
            default: return 'Create Promotion';
        }
    }

    get saveButtonLabel() {
        return this.isSaving ? 'Creating...' : 'Create Promotion';
    }

    get isSaveDisabled() {
        return this.isSaving;
    }

    get showPrevious() {
        return this.currentStep !== 1;
    }

    get showNext() {
        return this.currentStep !== 3;
    }

    get showFinish() {
        return this.currentStep === 3;
    }

    get currentStepForProgress() {
        return `${this.currentStep}`;
    }
}