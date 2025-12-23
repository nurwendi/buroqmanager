
# PowerShell script to comment out MikroTik imports in all API files
$files = @(
    "app\api\traffic\realtime\route.js",
    "app\api\settings\route.js",
    "app\api\registrations\route.js",
    "app\api\pppoe\users\[id]\route.js",
    "app\api\pppoe\users\route.js",
    "app\api\pppoe\profiles\[id]\route.js",
    "app\api\pppoe\profiles\route.js",
    "app\api\pppoe\import\route.js",
    "app\api\pppoe\active\[id]\route.js",
    "app\api\pppoe\active\route.js",
    "app\api\isolir\contact\route.js",
    "app\api\ip\pools\route.js",
    "app\api\interfaces\route.js",
    "app\api\drop-users\route.js",
    "app\api\debug\mikrotik\route.js",
    "app\api\dashboard\temperature\route.js",
    "app\api\dashboard\stats\route.js",
    "app\api\dashboard\cpu\route.js",
    "app\api\customers\generate-missing\route.js",
    "app\api\customer\stats\route.js",
    "app\api\customer\router\route.js"
)

foreach ($file in $files) {
    $path = Join-Path "d:\program\mikrotikbilling\mikrotikmanagement" $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $newContent = $content -replace "import \{ getMikrotikClient \} from '@/lib/mikrotik';", "// import { getMikrotikClient } from '@/lib/mikrotik';`r`nconst getMikrotikClient = async () => { throw new Error('MikroTik disabled'); };"
        Set-Content -Path $path -Value $newContent
        Write-Host "Updated: $file"
    }
}
