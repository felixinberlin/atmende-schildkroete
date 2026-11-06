/** Writes schema/breathing-pattern.v1.schema.json from the Zod contract. Run: npm run schema */
import { writeFileSync } from 'node:fs';
import { toJsonSchema } from '../src/breathing/core/jsonSchema.ts';

const out = new URL('../schema/breathing-pattern.v1.schema.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(toJsonSchema(), null, 2)}\n`);
console.log(`wrote ${out.pathname}`);
