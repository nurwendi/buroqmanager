const fs = require('fs');

function appendToObjText(text, block) {
    const regex = /}\s*;\s*export default/s;
    return text.replace(regex, `    ${block}\n};\n\nexport default`);
}

let idText = fs.readFileSync('./lib/translations/id.js', 'utf8');
let enText = fs.readFileSync('./lib/translations/en.js', 'utf8');

const idMaps = `maps: {
        title: 'Peta Pelanggan',
        description: 'Pemantauan sebaran lokasi pelanggan berdasarkan koordinat GPS.',
        loading: 'Memuat peta...',
        noData: 'Belum ada data koordinat pelanggan yang dapat ditampilkan.',
        customerDetails: 'Detail Pelanggan',
        statusActive: 'Aktif',
        statusIsolir: 'Isolir',
        addressLabel: 'Alamat:',
        phoneLabel: 'Telepon:'
    },`;

const enMaps = `maps: {
        title: 'Customer Maps',
        description: 'Monitoring of customer locations based on GPS coordinates.',
        loading: 'Loading map...',
        noData: 'No customer coordinate data available to display yet.',
        customerDetails: 'Customer Details',
        statusActive: 'Active',
        statusIsolir: 'Isolated',
        addressLabel: 'Address:',
        phoneLabel: 'Phone:'
    },`;

if (!idText.includes('maps: {')) idText = appendToObjText(idText, idMaps);
if (!enText.includes('maps: {')) enText = appendToObjText(enText, enMaps);

fs.writeFileSync('./lib/translations/id.js', idText);
fs.writeFileSync('./lib/translations/en.js', enText);
console.log('Translations for maps added successfully.');
