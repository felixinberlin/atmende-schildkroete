/** JSON Schema export of the contract. Kept separate so runtime bundles don't ship the converter. */
import { z } from 'zod';
import { BreathingPatternSchema, SCHEMA_ID } from './schema.ts';

export function toJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(BreathingPatternSchema, { target: 'draft-2020-12', io: 'input' }),
    $id: SCHEMA_ID
  };
}
