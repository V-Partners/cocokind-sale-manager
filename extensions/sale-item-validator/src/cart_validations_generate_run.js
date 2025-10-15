// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  const errors = [];

  // Check if sitewide sale is active
  const saleActive = input.shop?.metafield?.value === "true" || input.shop?.metafield?.value === "1";

  // If sale is NOT active, check for items with sitewide_discount property
  if (!saleActive) {
    const itemsWithExpiredSale = input.cart.lines
      .filter(line => line.attribute?.value) // Has sitewide_discount attribute
      .map(line => line.merchandise?.product?.title || "Sale item");

    if (itemsWithExpiredSale.length > 0) {
      const message = itemsWithExpiredSale.length === 1
        ? `The sale has ended. Please remove '${itemsWithExpiredSale[0]}' from your cart to continue.`
        : "The sale has ended. Please remove sale items from your cart to continue.";

      errors.push({
        message,
        target: "$.cart",
      });
    }
  }

  const operations = [
    {
      validationAdd: {
        errors
      },
    },
  ];

  return { operations };
};
