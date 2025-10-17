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

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkRemoveAndAddSaleItems = async () => {
      if (isProcessing) return;

      // Check if sale is inactive
      const saleActive = shopMetafields[0]?.metafield?.value === 'true';

      if (saleActive) {
        // Sale is active, nothing to remove
        return;
      }

      // Find cart lines with _sitewide_discount property
      const saleItems = cartLines.filter(line => 
        line.attributes.some(attr => attr.key === '_sitewide_discount')
      );

      if (saleItems.length === 0) {
        // No sale items to remove
        return;
      }

      setIsProcessing(true);

      try {
        for (const item of saleItems) {
          const itemAttributes = item.attributes.filter(attr => attr.key !== '_sitewide_discount');

          await applyCartLinesChange({
            type: 'removeCartLine',
            id: item.id,
            quantity: item.quantity,
          });

          await applyCartLinesChange({
            type: 'addCartLine',
            merchandiseId: item.merchandise.id,
            quantity: item.quantity,
            attributes: itemAttributes,
          });
        }
      } catch (error) {
        console.error('Error removing sale items:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    checkRemoveAndAddSaleItems();
  }, [shopMetafields, cartLines, applyCartLinesChange, isProcessing]);

  // Don't render anything if no items removed
  return null;
}
