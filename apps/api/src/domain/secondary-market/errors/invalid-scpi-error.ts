export class InvalidScpiError extends Error {
  readonly code = 'INVALID_SCPI';

  constructor(readonly field: 'id' | 'name' | 'manager') {
    super(`Invalid SCPI ${field}`);
    this.name = 'InvalidScpiError';
  }
}
