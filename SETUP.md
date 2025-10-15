# Cocokind Sale Manager - Setup Guide

## What This Does

This Shopify Function **blocks checkout** when:
1. The sale has ended (shop metafield `sitewide.sale_active` is NOT `"true"`)
2. Customer has items in cart with the `sitewide_discount` line item property

When both conditions are met, customers see an error message and **must manually remove the sale items** before checkout.

## Setup Steps

### 1. Install the App on Your Store

1. Go to your [app version](https://dev.shopify.com/dashboard/129527241/apps/288558546945/versions/760689262593)
2. Click "Push to store" and select your Cocokind store
3. Install and approve the app

### 2. Create the Shop Metafield Definition

Run this GraphQL mutation in your Shopify Admin API:

```graphql
mutation CreateSaleActiveMetafield {
  metafieldDefinitionCreate(definition: {
    name: "Sitewide sale active",
    namespace: "sitewide",
    key: "sale_active",
    description: "Boolean flag indicating if sitewide sale is currently active",
    type: "boolean",
    ownerType: SHOP,
    access: { admin: PRIVATE }
  }) {
    createdDefinition { id namespace key }
    userErrors { field message }
  }
}
```

### 3. Set the Sale Active Flag

**To start a sale:**
```graphql
mutation StartSale {
  metafieldsSet(metafields: [{
    namespace: "sitewide",
    key: "sale_active",
    ownerId: "gid://shopify/Shop/YOUR_SHOP_ID",
    type: "boolean",
    value: "true"
  }]) {
    metafields { id }
    userErrors { field message }
  }
}
```

**To end a sale:**
```graphql
mutation EndSale {
  metafieldsSet(metafields: [{
    namespace: "sitewide",
    key: "sale_active",
    ownerId: "gid://shopify/Shop/YOUR_SHOP_ID",
    type: "boolean",
    value: "false"
  }]) {
    metafields { id }
    userErrors { field message }
  }
}
```

Get your shop ID:
```graphql
query { shop { id } }
```

### 4. Activate the Function

1. Go to **Shopify Admin → Settings → Checkout**
2. Scroll to **Checkout validation**
3. Enable **sale-item-validator**

## How It Works

```
┌─────────────────────────────────────────────┐
│  Customer tries to checkout                 │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Function checks:                           │
│  1. Is sale active? (shop metafield)        │
│  2. Any items have sitewide_discount?       │
└─────────────────────────────────────────────┘
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
   Sale ACTIVE           Sale ENDED
        ↓                     ↓
  ✅ Allow            ❌ Block with error:
   checkout          "The sale has ended.
                     Please remove [Product]
                     from your cart."
```

## Testing

1. Add a product with `sitewide_discount` property to cart
2. Set metafield to `"false"` (end sale)
3. Try to checkout → should see error message
4. Remove the item or set metafield to `"true"` → checkout succeeds

## Important Notes

- **This blocks checkout, it does NOT remove items**
- Customers must manually remove expired sale items
- The function checks EVERY time checkout is attempted
- No frontend changes needed in your theme
- Works with all checkout types (standard, accelerated, POS, etc.)

## What About Automatic Removal?

If you want to **automatically remove** items instead of blocking checkout, you need a different approach:

1. **Theme JavaScript** - Add script to cart page that removes items on load
2. **Checkout UI Extension** - Remove items when checkout loads (requires additional extension)

Would you like me to add either of these?
