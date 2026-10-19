// المال بالهللة في كل مكان. التحويل إلى ريال للعرض فقط.

export const VAT_RATE_BP = 1500; // 15% بنقاط الأساس، معامل يُقرأ من قاعدة البيانات عند الحاجة (المادة 38)

export function sarToHalala(sar: number): number {
  if (!Number.isFinite(sar) || sar < 0) throw new Error("مبلغ غير صالح");
  return Math.round(sar * 100);
}

export function halalaToSAR(halala: number): number {
  return halala / 100;
}

/** يعرض المبلغ: 5,000.00 ر.س */
export function formatSAR(halala: number): string {
  const v = halalaToSAR(halala).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${v} ر.س`;
}

/** نسبة مئوية من مبلغ بالهللة، بتقريب للهللة الأقرب */
export function percentOf(halala: number, percent: number): number {
  return Math.round((halala * percent) / 100);
}

/** الضريبة على رسم غير شامل لها (المادة 71: الرسوم غير شاملة الضريبة) */
export function vatOn(halala: number, rateBp = VAT_RATE_BP): number {
  return Math.round((halala * rateBp) / 10000);
}
