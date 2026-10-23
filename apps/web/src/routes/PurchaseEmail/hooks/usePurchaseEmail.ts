import { useEffect, useRef, useState } from 'react';

import { primopierreEmailContact } from '../../../constants/primopierre-email';
import { preparePurchaseEmail } from '../../../services/purchase-email/prepare-purchase-email';
import type {
  PurchaseEmailDraft,
  PurchaseEmailErrors,
  PurchaseEmailInput,
} from '../../../types/purchase-email';

const emptyInput: PurchaseEmailInput = {
  firstName: '',
  lastName: '',
  existingAssociate: false,
  associateNumber: '',
  shares: '',
  maxPricePerShare: '',
};

export function usePurchaseEmail() {
  const [values, setValues] = useState<PurchaseEmailInput>(emptyInput);
  const [errors, setErrors] = useState<PurchaseEmailErrors>({});
  const [draft, setDraft] = useState<PurchaseEmailDraft | null>(null);
  const [focusForm, setFocusForm] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusForm && !draft) {
      container.current?.querySelector<HTMLInputElement>('#firstName')?.focus();
      setFocusForm(false);
    }
  }, [focusForm, draft]);

  function prepare() {
    const result = preparePurchaseEmail(values, primopierreEmailContact);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setDraft(result.draft);
  }
  function clear() {
    setValues(emptyInput);
    setErrors({});
    setDraft(null);
    setFocusForm(true);
  }

  function edit() {
    setDraft(null);
    setFocusForm(true);
  }

  return { values, errors, draft, container, setValues, prepare, clear, edit };
}
