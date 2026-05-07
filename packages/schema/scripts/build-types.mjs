#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compileFromFile } from 'json-schema-to-typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const schemaPath = path.join(packageRoot, "spec", "meeting-output.schema.json");
const distDir = path.join(packageRoot, "dist");
const outputPath = path.join(distDir, "types.d.ts");

const banner = `/**
* AUTO-GENERATED. Do not edit by hand.
*
* Generated from spec/meeting-output.schema.json.
* To generate, run: npm run build --workspace=@samuraizer/schema
*/
`;

async function main() {
    const ts = await compileFromFile(schemaPath, {
        bannerComment: banner,
        additionalProperties: false,
        strictIndexSignatures: true,
        style: { singleQuote: false, semi: true, },
        format: true
    });

    await mkdir(distDir, { recursive: true });
    await writeFile(outputPath, ts, "utf-8");

    const sourceSchema = JSON.parse(await readFile(schemaPath, "utf-8"));
    console.log(`Generated ${path.relative(packageRoot, outputPath)}`);
    console.log(`  Schema: ${sourceSchema.$id}`);
    console.log(`  Version: ${sourceSchema.properties.schema_version.const}`);
}

main().catch(err => {
    console.error("Failed to generate types: ", err);
    process.exit(1);
});
