/**
 * Display rules for an order line item's unit. Whole-chicken products are always
 * per piece regardless of catalog flag. Matches Android OrderItemDisplay.
 */

export function isWholeChickenName(productName: string | null | undefined): boolean {
  if (productName == null) return false;
  return productName.toLowerCase().includes('whole chicken');
}

export function quantityLabel(quantity: number, perPiece: boolean): string {
  if (perPiece) {
    return `${quantity}${quantity === 1 ? ' Piece' : ' Pieces'}`;
  }
  return `${quantity} Kg`;
}

export function unitPriceLabel(
  vendorPrice: string | null | undefined,
  perPiece: boolean,
): string {
  const price =
    vendorPrice == null || vendorPrice.trim() === '' ? '0' : vendorPrice.trim();
  return `€${price}${perPiece ? ' / Piece' : ' / Kg'}`;
}

export function isPerPieceProduct(
  productName: string,
  catalogPerPiece: boolean,
): boolean {
  return isWholeChickenName(productName) || catalogPerPiece;
}
