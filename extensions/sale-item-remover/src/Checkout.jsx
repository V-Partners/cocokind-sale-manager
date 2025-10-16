import {
  reactExtension,
  useApi,
  useCartLines,
  useAppMetafields,
  Banner,
  useApplyCartLinesChange,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useState } from 'react';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const { shop } = useApi();
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();

  // Get shop metafield for sale status
  const shopMetafields = useAppMetafields({
    namespace: 'sitewide',
    key: 'sale_active',
  });

  const [removedItems, setRemovedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkAndRemoveSaleItems = async () => {
      if (isProcessing) return;

      // Check if sale is inactive
      const saleActive = shopMetafields[0]?.metafield?.value === 'true';

      if (saleActive) {
        // Sale is active, nothing to remove
        return;
      }

      // Find cart lines with sitewide_discount property
      const saleItems = cartLines.filter(line => 
        line.attributes.some(attr => attr.key === 'sitewide_discount')
      );

      if (saleItems.length === 0) {
        // No sale items to remove
        return;
      }

      setIsProcessing(true);

      try {
        // Remove sale items one by one
        const itemNames = [];

        for (const item of saleItems) {
          const result = await applyCartLinesChange({
            type: 'removeCartLine',
            id: item.id,
            quantity: item.quantity,
          });

          if (result.type === 'success') {
            // Track removed item for banner message
            itemNames.push(item.merchandise?.title || 'Item');
          }
        }

        if (itemNames.length > 0) {
          setRemovedItems(itemNames);
        }
      } catch (error) {
        console.error('Error removing sale items:', error);
      } finally {
        setIsProcessing(false);
      }

      console.log(itemNames);
    };

    checkAndRemoveSaleItems();
  }, [shopMetafields, cartLines, applyCartLinesChange, isProcessing]);

  // Show banner if items were removed
  if (removedItems.length > 0) {
    return (
      <Banner status="warning">
        The sale has ended. The following items have been removed from your cart: {removedItems.join(', ')}
      </Banner>
    );
  }

  // Don't render anything if no items removed
  return null;
}
