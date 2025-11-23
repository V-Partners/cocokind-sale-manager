import {
  reactExtension,
  useApi,
  useCartLines,
  useAppMetafields,
  Banner,
  useApplyCartLinesChange,
} from "@shopify/ui-extensions-react/checkout";
import { useEffect, useState, useRef } from "react";

export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const { query } = useApi();
  const cartLines = useCartLines();
  const [priceData, setPriceData] = useState({});
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedItemsRef = useRef(new Set());
  const cartVersionRef = useRef(0);

  // Get shop metafield for sale status
  const shopMetafields = useAppMetafields({
    namespace: "sitewide",
    key: "sale_active",
  });

  const applyCartLinesChange = useApplyCartLinesChange();

  // Track cart changes to reset processed items
  // Create a stable cart signature that includes quantities and IDs
  const cartSignature = cartLines
    .map((line) => `${line.id}:${line.quantity}`)
    .join(',');
  
  useEffect(() => {
    cartVersionRef.current += 1;
    processedItemsRef.current.clear();
    setPricesLoaded(false);
  }, [cartSignature]);

  // Fetch prices for all cart items
  useEffect(() => {
    async function fetchPrices() {
      if (!query || cartLines.length === 0) {
        setPricesLoaded(true);
        return;
      }

      const variantIds = cartLines.map((line) => line.merchandise.id);
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
        const { data } = await query(queryString, {
          variables: { ids: variantIds },
        });
        
        const prices = {};
        data.nodes.forEach((node) => {
          if (node) {
            prices[node.id] = {
              price: node.price?.amount,
              compareAtPrice: node.compareAtPrice?.amount,
            };
          }
        });
        
        setPriceData(prices);
        setPricesLoaded(true);
        console.log("Price data loaded:", prices);
      } catch (error) {
        console.error("Error fetching prices:", error);
        setPricesLoaded(true); // Continue even if price fetch fails
      }
    }

    fetchPrices();
  }, [cartLines, query]);

  // Manage sale item properties
  useEffect(() => {
    const manageSaleItemProperties = async () => {
      // Guard conditions
      if (isProcessing) return;
      if (!pricesLoaded) return;
      if (!shopMetafields || shopMetafields.length === 0) return;
      if (cartLines.length === 0) return;

      const saleActive = shopMetafields[0]?.metafield?.value === "true";
      const currentCartVersion = cartVersionRef.current;
      const itemsToUpdate = [];

      for (const line of cartLines) {
        // Skip if already processed in this cart version
        const itemKey = `${line.id}-${currentCartVersion}`;
        if (processedItemsRef.current.has(itemKey)) continue;

        const prices = priceData[line.merchandise.id];
        const hasCompareAtPrice =
          prices?.compareAtPrice && 
          parseFloat(prices.compareAtPrice) > parseFloat(prices.price);
        
        const existingSitewideAttr = line.attributes.find(
          (attr) => attr.key === "_sitewide_discount"
        );
        const hasSitewideProperty = !!existingSitewideAttr;

        // Determine if we should add/update the sitewide discount
        const shouldHaveSitewideDiscount = saleActive && !hasCompareAtPrice;
        
        if (shouldHaveSitewideDiscount || hasCompareAtPrice) {
          const discountAmount =
            prices?.compareAtPrice && prices?.price
              ? (
                  parseFloat(prices.compareAtPrice) - parseFloat(prices.price)
                ).toFixed(2)
              : "0.00";

          // Only update if value changed or doesn't exist
          if (!hasSitewideProperty || existingSitewideAttr.value !== discountAmount) {
            const filteredAttributes = line.attributes.filter(
              (attr) => attr.key !== "_sitewide_discount"
            );
            
            itemsToUpdate.push({
              id: line.id,
              attributes: [
                ...filteredAttributes,
                { key: "_sitewide_discount", value: discountAmount },
              ],
            });
            processedItemsRef.current.add(itemKey);
          }
        } else if (!saleActive && !hasCompareAtPrice && hasSitewideProperty) {
          // Remove sitewide discount only when sale is inactive AND no compare price
          itemsToUpdate.push({
            id: line.id,
            attributes: line.attributes.filter(
              (attr) => attr.key !== "_sitewide_discount"
            ),
          });
          processedItemsRef.current.add(itemKey);
        }
      }

      if (itemsToUpdate.length === 0) {
        return;
      }

      setIsProcessing(true);

      try {
        // Batch updates for better performance
        const updatePromises = itemsToUpdate.map((update) =>
          applyCartLinesChange({
            type: "updateCartLine",
            id: update.id,
            attributes: update.attributes,
          }).catch((error) => {
            console.error(`Error updating cart line ${update.id}:`, error);
            return { type: "error", message: error.message };
          })
        );

        const results = await Promise.all(updatePromises);
        
        // Log any errors
        results.forEach((result, index) => {
          if (result?.type === "error") {
            console.error(
              `Failed to update item ${itemsToUpdate[index].id}:`,
              result.message
            );
          }
        });

        console.log(`Successfully processed ${itemsToUpdate.length} cart items`);
      } catch (error) {
        console.error("Error managing sale item properties:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    manageSaleItemProperties();
  }, [shopMetafields, cartLines, applyCartLinesChange, priceData, pricesLoaded, isProcessing]);

  // Don't render anything
  return null;
}
