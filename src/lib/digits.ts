const FA = '۰۱۲۳۴۵۶۷۸۹';
/** Latin → Persian digits (and decimal point → ٫). */
export const toFaDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA[+d]).replace(/\./g, '٫');
/** Persian / Arabic-Indic digits → Latin (and ٫ → .). */
export const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.');
