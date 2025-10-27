#!/usr/bin/env node
import { promises as fs } from 'fs';
import YAML from 'yaml';
import { resolve } from 'path';

const YAML_FILES = ['podcasts.yml', 'talks.yml'];

async function validateYamlFile(filePath) {
	console.log(`Validating ${filePath}...`);
	
	try {
		const content = await fs.readFile(filePath, 'utf8');
		
		// First, try to parse the YAML to catch parsing errors
		const parsed = YAML.parse(content);
		
		if (!Array.isArray(parsed)) {
			console.error(`\n❌ ${filePath}: Expected YAML to parse as an array`);
			return false;
		}
		
		console.log(`✅ ${filePath}: Valid (${parsed.length} items)`);
		return true;
		
	} catch (error) {
		console.error(`\n❌ ${filePath}: Parse error`);
		console.error(`  ${error.message}`);
		
		// Provide helpful hints for common issues
		if (error.message.includes('Implicit key')) {
			console.error('\n💡 Common causes of implicit key errors:');
			console.error('  - Leading whitespace before root-level list items (-)');
			console.error('  - Leading whitespace before root-level comments (#)');
			console.error('  - Special characters (like **) in field values without quotes');
			console.error('  - Missing colons after field names');
		}
		
		return false;
	}
}

async function main() {
	console.log('🔍 Validating YAML files...\n');
	
	const results = await Promise.all(
		YAML_FILES.map(file => validateYamlFile(resolve(file)))
	);
	
	const allValid = results.every(result => result === true);
	
	if (allValid) {
		console.log('\n✅ All YAML files are valid!');
		process.exit(0);
	} else {
		console.error('\n❌ YAML validation failed. Please fix the errors above.');
		process.exit(1);
	}
}

main();
