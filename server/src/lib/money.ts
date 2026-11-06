/**
 * Nilami Money Utilities
 * Rule: Money is strictly integer paise in DB and domain models.
 * 1 INR = 100 Paise.
 */

export function paiseToRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError(`Expected safe integer paise, received: ${paise}`);
  }
  return paise / 100;
}

export function formatINR(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new TypeError(`Expected safe integer paise, received: ${paise}`);
  }
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(rupees);
}

export function rupeesToPaise(rupeeString: string | number): number {
  if (typeof rupeeString === 'number') {
    if (!Number.isFinite(rupeeString)) {
      throw new TypeError('Expected finite number');
    }
    return Math.round(rupeeString * 100);
  }

  const clean = rupeeString.trim().replace(/,/g, '');
  if (!clean || !/^-?\d+(\.\d{1,2})?$/.test(clean)) {
    throw new Error(`Invalid rupee format: "${rupeeString}"`);
  }

  const [whole = '0', frac = ''] = clean.split('.');
  const wholeInt = parseInt(whole, 10);
  const fracInt = parseInt(frac.padEnd(2, '0').slice(0, 2), 10);
  return whole.startsWith('-') ? wholeInt * 100 - fracInt : wholeInt * 100 + fracInt;
}

