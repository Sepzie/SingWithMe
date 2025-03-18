const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const diagramsDir = './';
const outputDir = './png';

console.log('Starting Mermaid diagram rendering script...');
console.log(`Working directory: ${process.cwd()}`);

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

try {
  // Get all .mermaid files
  const mermaidFiles = fs.readdirSync(diagramsDir)
    .filter(file => file.endsWith('.mermaid'));

  console.log(`Found ${mermaidFiles.length} Mermaid files to render: ${mermaidFiles.join(', ')}`);

  // Process each file
  mermaidFiles.forEach(file => {
    const inputPath = path.join(diagramsDir, file);
    const outputPath = path.join(outputDir, `${path.basename(file, '.mermaid')}.png`);
    
    console.log(`Rendering ${file} to PNG...`);
    
    try {
      const cmd = `npx @mermaid-js/mermaid-cli -i "${inputPath}" -o "${outputPath}" -b white`;
      console.log(`Executing command: ${cmd}`);
      
      const output = execSync(cmd, { encoding: 'utf8' });
      console.log(`Successfully rendered ${outputPath}`);
    } catch (error) {
      console.error(`Error rendering ${file}:`, error.message);
      if (error.stdout) console.error(`Error stdout: ${error.stdout}`);
      if (error.stderr) console.error(`Error stderr: ${error.stderr}`);
    }
  });

  console.log('Rendering complete!');
} catch (error) {
  console.error('Script error:', error);
} 