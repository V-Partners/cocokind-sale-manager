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
  const { query } = useApi();
  const cartLines = useCartLines();
  const [priceData, setPriceData] = useState({});

  useEffect(() => {
    async function fetchPrices() {
      if (cartLines.length === 0) return;
      
      const variantIds = cartLines.map(line => line.merchandise.id);
      const queryString = `
        query GetVariantPrices($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              price {
                amount
              }
              compareAtPrice {
                amount
              }
            }
          }
        }
      `;
      
      try {
        const { data } = await query(queryString, { variables: { ids: variantIds } });
        const prices = {};
        data.nodes.forEach(node => {
          if (node) {
            prices[node.id] = {
              price: node.price?.amount,
              compareAtPrice: node.compareAtPrice?.amount
            };
          }
        });
        setPriceData(prices);
        console.log('Price data:', prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    }
    
    fetchPrices();
  }, [cartLines, query]);

  const applyCartLinesChange = useApplyCartLinesChange();

  // Get shop metafield for sale status
  const shopMetafields = useAppMetafields({
    namespace: 'sitewide',
    key: 'sale_active',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const manageSaleItemProperties = async () => {
      if (isProcessing) return;

      // Wait for metafields to load
      if (!shopMetafields || shopMetafields.length === 0) {
        return;
      }

      const saleActive = shopMetafields[0]?.metafield?.value === 'true';
      const itemsToUpdate = [];

      for (const line of cartLines) {
        const prices = priceData[line.merchandise.id];
        const hasCompareAtPrice = prices?.compareAtPrice && prices.compareAtPrice > prices.price;
        const hasSitewideProperty = line.attributes.some(attr => attr.key === '_sitewide_discount');

        if (saleActive || hasCompareAtPrice) {
          // SWS is ACTIVE:
          // If SWS is active or item has compareAtPrice and doesn't have _sitewide_discount, add it
          if (!hasSitewideProperty) {
            itemsToUpdate.push({
              id: line.id,
              attributes: [...line.attributes, { key: '_sitewide_discount', value: 'true' }]
            });
          }
        } else {
          // SWS is INACTIVE:
          // If item has compareAtPrice, leave it alone (different sale)
          // If no compareAtPrice but has _sitewide_discount, remove it
          if (hasSitewideProperty) {
            itemsToUpdate.push({
              id: line.id,
              attributes: line.attributes.filter(attr => attr.key !== '_sitewide_discount')
            });
          }
        }
      }

      if (itemsToUpdate.length === 0) {
        return;
      }

      setIsProcessing(true);

      try {
        for (const update of itemsToUpdate) {
          const result = await applyCartLinesChange({
            type: 'updateCartLine',
            id: update.id,
            attributes: update.attributes,
          });

          if (result.type === 'error') {
            console.error('Error updating cart line:', result.message);
          }
        }
      } catch (error) {
        console.error('Error managing sale item properties:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    manageSaleItemProperties();
  }, [shopMetafields, cartLines, applyCartLinesChange, isProcessing, priceData]);

  // Don't render anything if no items removed
  return <>testing 2</>;
}
