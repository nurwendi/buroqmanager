const fs = require('fs');

function addMapToNav(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure Map is imported from lucide-react (using MapPin or Map)
    // Actually Map might conflict with JS Map, so Map as MapIcon, or MapPin.
    if (!content.includes('MapPin')) {
        content = content.replace('import {', 'import { MapPin,');
    }

    // Find the tickets link and append maps link
    const searchStr = "        { href: '/tickets', icon: MessageSquare, label: t('sidebar.tickets'), roles: ['admin', 'superadmin', 'manager', 'technician', 'agent'] },";
    const replaceStr = "        { href: '/tickets', icon: MessageSquare, label: t('sidebar.tickets'), roles: ['admin', 'superadmin', 'manager', 'technician', 'agent'] },\n        { href: '/maps', icon: MapPin, label: t('maps.title') || 'Peta Pelanggan', roles: ['admin', 'superadmin', 'manager'] },";
    
    // Fallback search string for BottomDock if different
    const searchStrDock = "        { href: '/tickets', icon: MessageSquare, label: t('sidebar.tickets') },";
    const replaceStrDock = "        { href: '/tickets', icon: MessageSquare, label: t('sidebar.tickets') },\n        { href: '/maps', icon: MapPin, label: t('maps.title') || 'Peta Pelanggan', roles: ['admin', 'superadmin', 'manager'] },";

    if (content.includes(searchStr)) {
        content = content.replace(searchStr, replaceStr);
    } else if (content.includes(searchStrDock)) {
        content = content.replace(searchStrDock, replaceStrDock);
    }

    fs.writeFileSync(filePath, content);
}

addMapToNav('components/Navbar.js');
addMapToNav('components/BottomDock.js');

console.log('Navigation links updated.');
