$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '../..')
$sourceRoot = Join-Path $repoRoot 'tmp/city-card-sources'
New-Item -ItemType Directory -Force $sourceRoot | Out-Null

git clone --depth 1 https://github.com/condwanaland/worldcities.git (Join-Path $sourceRoot 'worldcities')
git clone --depth 1 https://github.com/datasets/world-religion-projections.git (Join-Path $sourceRoot 'religions')
git clone --depth 1 https://github.com/tayljordan/ports.git (Join-Path $sourceRoot 'ports')
git clone --depth 1 https://github.com/datasets/geo-countries.git (Join-Path $sourceRoot 'geo-countries')

$worldBank = Join-Path $sourceRoot 'worldbank'
New-Item -ItemType Directory -Force $worldBank | Out-Null
Invoke-WebRequest -Uri 'https://api.worldbank.org/v2/country/all/indicator/NV.AGR.TOTL.ZS?format=json&per_page=20000' -OutFile (Join-Path $worldBank 'agriculture.json')
Invoke-WebRequest -Uri 'https://api.worldbank.org/v2/country/all/indicator/NV.IND.TOTL.ZS?format=json&per_page=20000' -OutFile (Join-Path $worldBank 'industry.json')
Invoke-WebRequest -Uri 'https://api.worldbank.org/v2/country/all/indicator/NV.SRV.TOTL.ZS?format=json&per_page=20000' -OutFile (Join-Path $worldBank 'services.json')

Write-Host "Исходные наборы сохранены в $sourceRoot"
