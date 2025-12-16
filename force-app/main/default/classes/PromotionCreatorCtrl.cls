public with sharing class PromotionCreatorCtrl {

  /**
   * FIXED: Removed cursor serialization/deserialization - using simpler pagination approach
   * 
   * Note: Database.Cursor does NOT have fromSerializedString(), toSerializedString(), or getCount() methods.
   * Alternative approach: Use standard SOQL with OFFSET or maintain cursor in Apex context.
   */
  @AuraEnabled
  public static PagedResult getProducts(
    String type,
    Integer pageNumber
  ) {
    Integer pageSize = 5;
    Integer offset = (pageNumber - 1) * pageSize;
    
    // Query total count first
    Integer totalCount = [SELECT COUNT() FROM Product2];
    
    // Query current page of products
    List<Product2> products = [
      SELECT Id, Name, cgcloud__Category__c 
      FROM Product2 
      ORDER BY Name
      LIMIT :pageSize 
      OFFSET :offset
    ];
    
    PagedResult result = new PagedResult();
    result.pageSize = pageSize;
    result.pageNumber = pageNumber;
    result.totalItemCount = totalCount;
    result.records = products;
    
    return result;
  }
  
  /**
   * Alternative implementation using Database.Cursor (if you need cursor functionality)
   * Note: This requires maintaining the cursor in a stateful context (like Platform Cache)
   */
  @AuraEnabled
  public static PagedResult getProductsWithCursor(
    Integer pageNumber,
    String cursorId
  ) {
    Integer pageSize = 5;
    Integer position = (pageNumber - 1) * pageSize;
    
    Database.Cursor cursor;
    
    // Create or retrieve cursor
    if (String.isBlank(cursorId)) {
      // Create new cursor
      cursor = Database.getCursor('SELECT Id, Name, cgcloud__Category__c FROM Product2 ORDER BY Name');
      
      // Store cursor in Platform Cache or return an identifier
      // Note: You'd need to implement cursor storage mechanism
      // For simplicity, we're creating a new cursor each time
    } else {
      // In a real implementation, retrieve cursor from Platform Cache
      // For now, create new cursor
      cursor = Database.getCursor('SELECT Id, Name, cgcloud__Category__c FROM Product2 ORDER BY Name');
    }
    
    // Calculate records to fetch
    Integer totalRecords = 0;
    try {
      // Note: There's no direct getCount() method on cursor
      // You need to either:
      // 1. Query count separately
      // 2. Fetch all and count (not efficient)
      // 3. Store count separately
      totalRecords = [SELECT COUNT() FROM Product2];
    } catch (Exception e) {
      System.debug('Error getting count: ' + e.getMessage());
      totalRecords = 0;
    }
    
    Integer countToFetch = Math.min(pageSize, totalRecords - position);
    
    PagedResult result = new PagedResult();
    result.pageSize = pageSize;
    result.pageNumber = pageNumber;
    result.totalItemCount = totalRecords;
    
    // Fetch records
    if (countToFetch > 0) {
      result.records = (List<Product2>) cursor.fetch(position, countToFetch);
    } else {
      result.records = new List<Product2>();
    }
    
    return result;
  }

  @AuraEnabled
  public static List<RetailStore> getRetailStores(String accountId) {
    return [
      SELECT Id, Name, RetailLocationGroup.Name
      FROM RetailStore
      WHERE AccountId = :accountId
      ORDER BY Name
    ];
  }

  /**
   * Creates a Promotion with associated Products and Channels
   * @param promotionDataJson - JSON string containing PromotionData wrapper
   * @return SaveResult - Contains success status, promotion Id, and any error messages
   */
  @AuraEnabled
  public static SaveResult savePromotion(String promotionDataJson) {
    SaveResult result = new SaveResult();
    Savepoint sp = Database.setSavepoint();

    try {
      // Parse the incoming JSON data
      PromotionData data = (PromotionData) JSON.deserialize(
        promotionDataJson,
        PromotionData.class
      );

      // Validate required fields
      if (String.isBlank(data.promotionName)) {
        throw new AuraHandledException('Promotion name is required.');
      }
      if (data.products == null || data.products.isEmpty()) {
        throw new AuraHandledException(
          'At least one product must be selected.'
        );
      }
      if (data.stores == null || data.stores.isEmpty()) {
        throw new AuraHandledException('At least one store must be selected.');
      }

      // 1. Create Promotion record
      Promotion promotion = new Promotion();
      promotion.Name = data.promotionName;
      promotion.StartDate = Date.today();
      promotion.EndDate = Date.today().addMonths(1);
      insert promotion;

      // 2. Create Promotion Product records
      List<PromotionProduct> promotionProducts = new List<PromotionProduct>();
      for (ProductData prod : data.products) {
        PromotionProduct pp = new PromotionProduct();
        pp.PromotionId = promotion.Id;
        pp.ProductId = prod.productId;
        pp.Discount_percent__c = prod.discountPercent;
        promotionProducts.add(pp);
      }

      if (!promotionProducts.isEmpty()) {
        insert promotionProducts;
      }

      // 3. Create Promotion Channel records (linking to stores)
      List<PromotionChannel> promotionChannels = new List<PromotionChannel>();
      for (StoreData store : data.stores) {
        PromotionChannel pc = new PromotionChannel();
        pc.PromotionId = promotion.Id;
        pc.RetailStoreId = store.storeId;
        pc.StartDate = Date.today();
        pc.AccountId = data.accountId;
        promotionChannels.add(pc);
      }

      if (!promotionChannels.isEmpty()) {
        insert promotionChannels;
      }

      // Build success result
      result.success = true;
      result.promotionId = promotion.Id;
      result.promotionName = promotion.Name;
      result.message =
        'Promotion created successfully with ' +
        promotionProducts.size() +
        ' product(s) and ' +
        promotionChannels.size() +
        ' store(s).';
    } catch (DmlException e) {
      Database.rollback(sp);
      result.success = false;
      result.message = 'Database error: ' + e.getDmlMessage(0);
      throw new AuraHandledException(result.message);
    } catch (Exception e) {
      Database.rollback(sp);
      result.success = false;
      result.message = 'Error creating promotion: ' + e.getMessage();
      throw new AuraHandledException(result.message);
    }

    return result;
  }

  // ========================================
  // WRAPPER CLASSES
  // ========================================

  public class PagedResult {
    @AuraEnabled
    public Integer pageSize;
    @AuraEnabled
    public Integer pageNumber;
    @AuraEnabled
    public Integer totalItemCount;
    @AuraEnabled
    public List<Product2> records;
  }

  // Input wrapper for promotion data from LWC
  public class PromotionData {
    @AuraEnabled
    public String promotionName;
    @AuraEnabled
    public String accountId;
    @AuraEnabled
    public String templateId;
    @AuraEnabled
    public Date startDate;
    @AuraEnabled
    public Date endDate;
    @AuraEnabled
    public List<ProductData> products;
    @AuraEnabled
    public List<StoreData> stores;
  }

  public class ProductData {
    @AuraEnabled
    public String productId;
    @AuraEnabled
    public String productName;
    @AuraEnabled
    public String category;
    @AuraEnabled
    public Decimal discountPercent;
  }

  public class StoreData {
    @AuraEnabled
    public String storeId;
    @AuraEnabled
    public String storeName;
    @AuraEnabled
    public String locationGroup;
  }

  // Output wrapper for save result
  public class SaveResult {
    @AuraEnabled
    public Boolean success;
    @AuraEnabled
    public String promotionId;
    @AuraEnabled
    public String promotionName;
    @AuraEnabled
    public String message;
  }
}