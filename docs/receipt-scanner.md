# Receipt Scanner

## What it does

Upload a grocery receipt photo and automatically extract line items with prices. The AI runs locally via Ollama (no data leaves the machine). Extracted prices become the highest-confidence source in ChefFlow's 8-tier price resolution chain.

## Flow

1. Chef uploads receipt image (JPEG, PNG, HEIC up to 20MB)
2. Ollama's `llava` vision model extracts every line item (product name, quantity, unit price, total price, unit)
3. Extracted items are fuzzy-matched against the chef's existing ingredient library
4. Chef reviews matches, corrects any mismatches, confirms
5. Confirmed prices are written to `ingredient_price_history` with `source='receipt'` and `confidence=1.0`
6. Each ingredient's `last_price_*` fields are updated (receipt is tier 1, highest confidence)
7. Prices are also pushed to Pi (`/api/prices/batch`) for cross-tenant benefit

## Files

| File                                                                   | Purpose                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `lib/ai/receipt-ocr.ts`                                                | Ollama vision model integration. Sends image to llava, parses structured JSON response |
| `lib/ingredients/receipt-scan-actions.ts`                              | Server actions: `scanReceipt()` and `importReceiptPrices()`                            |
| `app/(chef)/culinary/ingredients/receipt-scan/page.tsx`                | Page wrapper with auth                                                                 |
| `app/(chef)/culinary/ingredients/receipt-scan/receipt-scan-client.tsx` | Full client UI: upload, scan, review, match, import                                    |

## Access

- Route: `/culinary/ingredients/receipt-scan`
- Button on `/culinary/ingredients` page header ("Scan Receipt")
- Nav: Culinary > Ingredients > Receipt Scanner

## Dependencies

- Ollama must be running locally with the `llava` model pulled
- If Ollama is offline, the page shows a clear error message
- Pi push is non-blocking (failure does not affect local import)

## Price confidence

Receipt prices get `confidence=1.0` and `source='receipt'`. In the 8-tier resolution chain, receipts are tier 1 (highest). This means a receipt price always wins over scraped, estimated, or historical prices.
