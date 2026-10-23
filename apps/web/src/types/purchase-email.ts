export interface PurchaseEmailInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly existingAssociate: boolean;
  readonly associateNumber: string;
  readonly shares: string;
  readonly maxPricePerShare: string;
}

export type PurchaseEmailErrors = Partial<
  Record<Exclude<keyof PurchaseEmailInput, 'existingAssociate'>, string>
>;

export interface ValidatedPurchaseEmail {
  readonly firstName: string;
  readonly lastName: string;
  readonly associateNumber: string | null;
  readonly shares: number;
  readonly maxPricePerShareCents: number;
}

export interface PurchaseEmailContact {
  readonly scpiName: string;
  readonly managerName: string;
  readonly recipient: string;
}

export interface PurchaseEmailDraft {
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
  readonly text: string;
}

export type ValidationResult =
  | { readonly success: true; readonly data: ValidatedPurchaseEmail }
  | { readonly success: false; readonly errors: PurchaseEmailErrors };
export type PrepareEmailResult =
  | { readonly success: true; readonly draft: PurchaseEmailDraft }
  | { readonly success: false; readonly errors: PurchaseEmailErrors };
