/**
 * Voucher group mapping.
 *
 * SINGLE SOURCE OF TRUTH for which cfn_vchrtype.VOUCHERGROUP codes roll up
 * into each financial flow node. These strings must not be duplicated in any
 * component or template - consume the helpers below instead.
 *
 * Groups verified against cfn_vchrtype on this database:
 *   ADJV BNKP BNKR CASP CASR CHQR CONT CRDT DEBT JRNL
 *   MEMO PAYBR PAYCR RETM REVC RJV SALV TRVL
 *
 * SALV was added as its own 'sales' node after checking real AUG-2026 data:
 * SAV (Sale Voucher) is the single largest category at 115 vouchers and
 * 96.4 L, and with only receipts/payments/adjustments it appeared nowhere in
 * the flow. The narrative now reads Sales -> Receipts -> Payments ->
 * Adjustments -> Bank Position.
 *
 * STILL OUTSIDE THE FLOW, deliberately: CONT (contra - bank-to-bank moves that
 * would double count), CRDT and DEBT (credit / debit notes), CHQR, MEMO,
 * PAYBR, PAYCR, RETM, REVC, RJV, TRVL. On AUG-2026 that is CRD (1 voucher,
 * 5.49 L) and DEB (1 voucher, 1,000). Fold them in only on an explicit
 * decision about which node they belong to.
 */

/** Flow node keys used by the Cash & Voucher Flow section. */
export type FlowNodeKey = 'sales' | 'receipts' | 'payments' | 'adjustments';

/** Group codes belonging to each flow node. */
export const FLOW_GROUPS: Readonly<Record<FlowNodeKey, readonly string[]>> = Object.freeze({
  sales:       Object.freeze(['SALV']),
  receipts:    Object.freeze(['BNKR', 'CASR']),
  payments:    Object.freeze(['BNKP', 'CASP']),
  adjustments: Object.freeze(['ADJV', 'JRNL'])
});

/** Display labels for the flow nodes. */
export const FLOW_LABELS: Readonly<Record<FlowNodeKey, string>> = Object.freeze({
  sales:       'Sales',
  receipts:    'Receipts',
  payments:    'Payments',
  adjustments: 'Adjustments'
});

/** Bootstrap icon names for the flow nodes. */
export const FLOW_ICONS: Readonly<Record<FlowNodeKey, string>> = Object.freeze({
  sales:       'bi-receipt',
  receipts:    'bi-arrow-down-circle',
  payments:    'bi-arrow-up-circle',
  adjustments: 'bi-sliders'
});

/** Ordered keys, so the flow always renders left to right consistently. */
export const FLOW_ORDER: readonly FlowNodeKey[] =
  Object.freeze(['sales', 'receipts', 'payments', 'adjustments'] as FlowNodeKey[]);

/** True when the group code belongs to the given flow node. */
export function isInFlowNode(groupCode: string | null | undefined, key: FlowNodeKey): boolean {
  if (!groupCode) { return false; }
  const code = groupCode.trim().toUpperCase();
  return FLOW_GROUPS[key].some(g => g === code);
}

/**
 * Which flow node a group belongs to, or null when it is outside the flow
 * (CONT, CRDT, DEBT and the rest are deliberately outside the flow - see the
 * file header for why).
 */
export function flowNodeForGroup(groupCode: string | null | undefined): FlowNodeKey | null {
  if (!groupCode) { return null; }
  const code = groupCode.trim().toUpperCase();
  for (const key of FLOW_ORDER) {
    if (FLOW_GROUPS[key].some(g => g === code)) { return key; }
  }
  return null;
}

/** Every group code that participates in the flow, for filtering. */
export function allFlowGroups(): string[] {
  return FLOW_ORDER.reduce<string[]>((acc, k) => acc.concat([...FLOW_GROUPS[k]]), []);
}
