import { InvalidScpiError } from '../errors/invalid-scpi-error.js';

export interface ScpiProps {
  readonly id: string;
  readonly name: string;
  readonly manager: string;
}

export class Scpi implements ScpiProps {
  readonly id: string;
  readonly name: string;
  readonly manager: string;

  constructor(props: ScpiProps) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.id)) {
      throw new InvalidScpiError('id');
    }
    if (!props.name.trim()) throw new InvalidScpiError('name');
    if (!props.manager.trim()) throw new InvalidScpiError('manager');
    this.id = props.id;
    this.name = props.name.trim();
    this.manager = props.manager.trim();
    Object.freeze(this);
  }
}
