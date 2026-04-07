const fs = require('fs');
let content = fs.readFileSync('lib/billing.js', 'utf8');

// The replacement logic
content = content.replace(/const invoiceNumber = `INV\/\$\{yy\}\/\$\{mm\}\/\$\{seq\}`;/g, 
`const custId = (customer?.customerId || 'CUST').replace(/\\s+/g, '-');
                    const invoiceNumber = \`INV/\${yy}/\${mm}/\${custId}/\${seq}\`;`);

fs.writeFileSync('lib/billing.js', content);
