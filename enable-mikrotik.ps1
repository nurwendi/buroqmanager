
# PowerShell script to re-enable MikroTik imports
$files = Get-ChildItem -Path "d:\program\mikrotikbilling\mikrotikmanagement" -Recurse -Include *.js | 
Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.next*" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "// import.*from.*mikrotik") {
        # Uncomment the import
        $newContent = $content -replace "// (import \{[^}]+\} from ['""][^'""]+mikrotik[^'""]*['""];)", '$1'
        # Remove the stub function
        $newContent = $newContent -replace "const getMikrotikClient = async \(\) => \{ throw new Error\('MikroTik disabled'\); \};[\r\n]*", ""
        $newContent = $newContent -replace "const getAllActiveUsers = async \(\) => \[\];[\r\n]*", ""
        $newContent = $newContent -replace "const getPppoeProfiles = async \(\) => \[\];[\r\n]*", ""
        
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Re-enabled MikroTik in: $($file.FullName)"
    }
}

Write-Host "`nDone! MikroTik integration re-enabled."
