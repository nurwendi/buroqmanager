const fs = require('fs');

let content = fs.readFileSync('app/(pppoe)/users/page.js', 'utf8');

// 1. Add to formData state
content = content.replace(
    'customerEmail: \'\',',
    'customerEmail: \'\',\n        customerIdentityNumber: \'\','
);

// 2. Add to reset formData (lines 841)
content = content.replace(
    'customerEmail: \'\',',
    'customerEmail: \'\',\n                customerIdentityNumber: \'\','
);
content = content.replace(
    'customerEmail: \'\',',
    'customerEmail: \'\',\n            customerIdentityNumber: \'\','
); // For multiple occurrences

// 3. Add to API payload when creating/editing registration
content = content.replace(
    'email: formData.customerEmail,',
    'email: formData.customerEmail,\n                            identityNumber: formData.customerIdentityNumber,'
);
// Replace multiple occurrences (there are multiple payload assemblies)
content = content.replace(
    /email: formData\.customerEmail,/g,
    'email: formData.customerEmail,\n                            identityNumber: formData.customerIdentityNumber,'
);

// 4. Add to customer edit payload
content = content.replace(
    'customerEmail: formData.customerEmail,',
    'customerEmail: formData.customerEmail,\n                    identityNumber: formData.customerIdentityNumber,'
);

// 5. Add to handleEdit mapping
content = content.replace(
    'customerEmail: customerData.email || \'\',',
    'customerEmail: customerData.email || \'\',\n                customerIdentityNumber: customerData.identityNumber || \'\','
);

// 6. Inject the JSX Input Field after customerEmail
const jsxEmailBlock = `
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t('users.emailAddress')}
                                            />
                                        </div>`;

const newJsxBlock = `${jsxEmailBlock}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <CreditCard size={16} /> No. KTP / ID Card <span className="text-gray-400 font-normal ml-1">(Opsional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerIdentityNumber || ''}
                                                onChange={(e) => setFormData({ ...formData, customerIdentityNumber: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="Contoh: 3171234567890001"
                                            />
                                        </div>`;

content = content.replace(jsxEmailBlock, newJsxBlock);

// Ensure CreditCard icon is imported from lucide-react
if (!content.includes('CreditCard,')) {
    content = content.replace('User, Mail, Phone, MapPin, Info,', 'User, Mail, Phone, MapPin, Info, CreditCard,');
}

fs.writeFileSync('app/(pppoe)/users/page.js', content);
console.log('Frontend users page updated successfully.');
