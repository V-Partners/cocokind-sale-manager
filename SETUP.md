# Cocokind Sale Manager - Setup Guide

## What This Does

This Checkout UI Extension **automatically removes sale items** when:
1. The sale has ended (shop metafield `sitewide.sale_active` is NOT `"true"`)
2. Customer has items in cart with the `_sitewide_discount` line item property

When both conditions are met, items are automatically removed and customers see a banner notification.

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

### 4. Activate the UI Extension

1. Go to **Shopify Admin → Settings → Checkout**
2. Click **Customize** (next to checkout)
3. Click **Add app block**
4. Select **Sale Item Remover**
5. Place it in the checkout (recommended: below order summary)
6. Save changes

## How It Works

```
┌─────────────────────────────────────────────┐
│  Customer navigates to checkout             │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Extension checks:                          │
│  1. Is sale active? (shop metafield)        │
│  2. Any items have _sitewide_discount?       │
└─────────────────────────────────────────────┘
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
   Sale ACTIVE           Sale ENDED
        ↓                     ↓
  ✅ Items stay         🗑️  Auto-remove items
   in cart             Show banner:
                       "The sale has ended.
                       [Products] have been
                       removed from cart."
```

## Testing

1. Add a product with `_sitewide_discount` property to cart
2. Set metafield to `"false"` (end sale)
3. Navigate to checkout → items should be automatically removed
4. Should see banner notification with removed product names
5. Set metafield to `"true"` → items stay in cart at checkout

## Important Notes

- **Items are automatically removed at checkout, no customer action needed**
- Extension runs every time checkout page loads
- Banner message shows which products were removed
- No frontend changes needed in your theme
- Works with Shopify Checkout (does not work with POS)
