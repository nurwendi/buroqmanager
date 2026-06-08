const fs = require('fs');

let content = fs.readFileSync('app/api/registrations/route.js', 'utf8');

// 1. Add to destructuring on line ~40
content = content.replace(
    'const { username, action, updatedData, type, targetUsername, newValues, agentId } = body;',
    'const { username, action, updatedData, type, targetUsername, newValues, agentId, identityNumber } = body;'
);

// 2. Add to registration.create
content = content.replace(
    'phone: body.phone,',
    'phone: body.phone,\n                        identityNumber: body.identityNumber,'
);

// 3. Add to finalData assembly for approval (around line 208)
content = content.replace(
    'comment: updatedData?.comment ?? registration.comment,',
    'comment: updatedData?.comment ?? registration.comment,\n                    identityNumber: updatedData?.identityNumber ?? registration.identityNumber,'
);

// 4. Add to tx.customer.create (around line 246)
content = content.replace(
    'phone: finalData.phone || \'\',',
    'phone: finalData.phone || \'\',\n                                identityNumber: finalData.identityNumber || null,'
);

fs.writeFileSync('app/api/registrations/route.js', content);
console.log('Registration API updated successfully.');
