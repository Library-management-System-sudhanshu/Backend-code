const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');
const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('WORKSPACE_OWNER')) {
      content = content.replace(/['"]WORKSPACE_OWNER['"]/g, "'OWNER'");
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated roles in: ${file}`);
    }
  }
});
