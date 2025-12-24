Write-Host "🚀 Starting Buroq Billing Installation..." -ForegroundColor Cyan

# 1. Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# 2. Install Dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies."
    exit 1
}

# 3. Setup Environment Variables
if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "`n⚙️  Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Warning "Please configure your .env file with your Database and Mikrotik credentials before continuing."
        Write-Host "Press any key to continue after you have edited .env..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    else {
        Write-Warning "No .env.example found. Creating default .env..."
        Set-Content .env "DATABASE_URL=`"postgresql://USER:PASSWORD@localhost:5432/mikrotikbilling?schema=public`""
    }
}

# 4. Setup Database
Write-Host "`n🗄️  Setting up database..." -ForegroundColor Yellow
npx prisma generate
npx prisma db push

Write-Host "`n✅ Installation Complete!" -ForegroundColor Green
Write-Host "To start the application, run: npm run dev (Port 1500)" -ForegroundColor Cyan
