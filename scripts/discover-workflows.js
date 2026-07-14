const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', '.agents');
const INDEX_FILE = path.join(AGENTS_DIR, 'workflows-index.json');

// Helper to recursively list markdown files
function getMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  });
  return results;
}

// Extract metadata from markdown content
function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let title = path.basename(filePath);
  
  // Find first header
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      break;
    }
  }

  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  return {
    title,
    path: relativePath,
    content: content.toLowerCase()
  };
}

// Generate index file
function generateIndex() {
  console.log('Indexing workflows...');
  const files = getMarkdownFiles(AGENTS_DIR);
  const index = files.map(parseMarkdown);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Successfully indexed ${index.length} documentation files to ${INDEX_FILE}`);
}

// Search index
function searchWorkflows(query) {
  if (!fs.existsSync(INDEX_FILE)) {
    generateIndex();
  }

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const term = query.toLowerCase();

  const results = index.filter(doc => 
    doc.title.toLowerCase().includes(term) || 
    doc.path.toLowerCase().includes(term) || 
    doc.content.includes(term)
  );

  if (results.length === 0) {
    console.log(`No workflows matching "${query}" found.`);
    return;
  }

  console.log(`\nFound ${results.length} matches for "${query}":\n`);
  results.forEach(doc => {
    console.log(`- \x1b[1m${doc.title}\x1b[0m`);
    console.log(`  Path: file://${path.join(__dirname, '..', doc.path)}`);
    console.log(`  File: ${doc.path}\n`);
  });
}

// Main execution
const args = process.argv.slice(2);
if (args.includes('--index')) {
  generateIndex();
} else if (args.includes('--list')) {
  if (!fs.existsSync(INDEX_FILE)) generateIndex();
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  console.log('\nIndexed Workflows & Instructions:');
  index.forEach(doc => {
    console.log(`- ${doc.title} (${doc.path})`);
  });
} else if (args.length > 0) {
  searchWorkflows(args.join(' '));
} else {
  console.log(`
Usage:
  node scripts/discover-workflows.js --index        Index/re-index workflows
  node scripts/discover-workflows.js --list         List all indexed workflows
  node scripts/discover-workflows.js <keyword>      Search for matching workflows
  `);
}
