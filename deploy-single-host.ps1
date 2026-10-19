[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$InspectFtpTls,
    [switch]$InspectRemote
)

$ErrorActionPreference = "Stop"

$corePath = Join-Path $PSScriptRoot "deploy-single-host.core.ps1"
if (-not (Test-Path -LiteralPath $corePath -PathType Leaf)) {
    throw "Deployment core is missing: $corePath"
}

& $corePath -DryRun:$DryRun -InspectFtpTls:$InspectFtpTls -InspectRemote:$InspectRemote
