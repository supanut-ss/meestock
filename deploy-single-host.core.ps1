[CmdletBinding()]
param(
    [string]$Server = $env:D2D_DEPLOY_FTP_SERVER,
    [string]$Username = $env:D2D_DEPLOY_FTP_USERNAME,
    [string]$Password = $env:D2D_DEPLOY_FTP_PASSWORD,
    [string]$RemotePath = "meestock.drivetodev.online",
    # Plesk FTP uses its self-signed default certificate; keep FTPS mandatory and pin its public key.
    [string]$FtpPublicKeyPin = "sha256//rUnADAnw672+ThltFOpC98r5gIasDJ8Z8e7HTpiG9EQ=",
    [switch]$DryRun,
    [switch]$InspectFtpTls,
    [switch]$InspectRemote
)

$ErrorActionPreference = "Stop"

$targetHost = $RemotePath.Trim('/').ToLowerInvariant()
if ($targetHost -ne "meestock.drivetodev.online") {
    throw "Deployment is restricted to meestock.drivetodev.online."
}

if ($InspectFtpTls) {
    $inspectionServer = $Server.Trim()
    if ($inspectionServer.StartsWith("ftp://", [System.StringComparison]::OrdinalIgnoreCase)) {
        $inspectionServer = $inspectionServer.Substring(6)
    }
    if ($inspectionServer.StartsWith("ftps://", [System.StringComparison]::OrdinalIgnoreCase) -or $inspectionServer -notmatch '^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$') {
        throw "D2D_DEPLOY_FTP_SERVER must contain an FTP host and optional port."
    }

    $inspectionUri = [System.Uri]("ftp://" + $inspectionServer)
    $tcpClient = [System.Net.Sockets.TcpClient]::new()
    $networkStream = $null
    $reader = $null
    $writer = $null
    $tlsStream = $null
    $certificateErrors = [System.Collections.Generic.List[string]]::new()
    $certificateCallback = [System.Net.Security.RemoteCertificateValidationCallback]{
        param($sender, $certificate, $chain, $sslPolicyErrors)
        if ($sslPolicyErrors -ne [System.Net.Security.SslPolicyErrors]::None) {
            [void]$certificateErrors.Add($sslPolicyErrors.ToString())
            if ($chain) {
                foreach ($status in $chain.ChainStatus) {
                    [void]$certificateErrors.Add($status.Status.ToString())
                }
            }
        }
        return $true
    }
    try {
        $tcpClient.Connect($inspectionUri.Host, $inspectionUri.Port)
        $networkStream = $tcpClient.GetStream()
        $reader = [System.IO.StreamReader]::new($networkStream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $writer = [System.IO.StreamWriter]::new($networkStream, [System.Text.Encoding]::ASCII, 1024, $true)
        $greeting = $reader.ReadLine()
        while ($greeting -match '^220-') { $greeting = $reader.ReadLine() }
        $writer.WriteLine("AUTH TLS")
        $writer.Flush()
        $response = $reader.ReadLine()
        if ($response -notmatch '^234') {
            throw "The FTP server did not accept AUTH TLS."
        }

        $tlsStream = [System.Net.Security.SslStream]::new($networkStream, $false, $certificateCallback)
        $tlsStream.AuthenticateAsClient($inspectionUri.Host)
        $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($tlsStream.RemoteCertificate)
        $nodeCommand = Get-Command "node.exe" -ErrorAction Stop
        $certificatePath = Join-Path ([System.IO.Path]::GetTempPath()) ("meestock-ftp-cert-" + [Guid]::NewGuid().ToString("N") + ".der")
        $pinScriptPath = Join-Path ([System.IO.Path]::GetTempPath()) ("meestock-ftp-pin-" + [Guid]::NewGuid().ToString("N") + ".cjs")
        try {
            [System.IO.File]::WriteAllBytes($certificatePath, $certificate.RawData)
            $pinScript = @'
const fs = require("node:fs");
const crypto = require("node:crypto");
const certificate = new crypto.X509Certificate(fs.readFileSync(process.argv[2]));
const publicKey = certificate.publicKey.export({ type: "spki", format: "der" });
console.log("sha256//" + crypto.createHash("sha256").update(publicKey).digest("base64"));
'@
            [System.IO.File]::WriteAllText($pinScriptPath, $pinScript, [System.Text.UTF8Encoding]::new($false))
            $publicKeyPin = (& $nodeCommand.Source $pinScriptPath $certificatePath | Out-String).Trim()
            if ($LASTEXITCODE -ne 0) { throw "Could not derive a pin for the FTP TLS certificate." }
        } finally {
            if (Test-Path -LiteralPath $certificatePath) { Remove-Item -LiteralPath $certificatePath -Force }
            if (Test-Path -LiteralPath $pinScriptPath) { Remove-Item -LiteralPath $pinScriptPath -Force }
        }
        Write-Host "FTP TLS certificate details (no login performed):"
        Write-Host "  DNS name: $($certificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::DnsName, $false))"
        Write-Host "  Issuer: $($certificate.Issuer)"
        Write-Host "  Valid until: $($certificate.NotAfter.ToUniversalTime().ToString('u'))"
        Write-Host "  SHA-1 thumbprint: $($certificate.Thumbprint)"
        Write-Host "  Public-key pin: $publicKeyPin"
        Write-Host "  System trust: $(if ($certificateErrors.Count -eq 0) { 'trusted' } else { 'not trusted (' + (($certificateErrors | Select-Object -Unique) -join ', ') + ')' })"
        return
    } finally {
        if ($tlsStream) { $tlsStream.Dispose() }
        if ($writer) { $writer.Dispose() }
        if ($reader) { $reader.Dispose() }
        if ($networkStream) { $networkStream.Dispose() }
        $tcpClient.Dispose()
    }
}

if ($InspectRemote) {
    if ([string]::IsNullOrWhiteSpace($Server) -or [string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
        throw "FTP server and credentials are required for remote inspection."
    }
    $inspectionServer = $Server.Trim()
    if ($inspectionServer.StartsWith("ftp://", [System.StringComparison]::OrdinalIgnoreCase)) {
        $inspectionServer = $inspectionServer.Substring(6)
    }
    if ($inspectionServer.StartsWith("ftps://", [System.StringComparison]::OrdinalIgnoreCase) -or $inspectionServer -notmatch '^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$') {
        throw "D2D_DEPLOY_FTP_SERVER must contain an FTP host and optional port."
    }
    $inspectionCurl = Get-Command "curl.exe" -ErrorAction Stop
    $inspectionBasePath = [System.Uri]::EscapeDataString($targetHost)
    $inspectionTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("meestock-remote-inspect-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $inspectionTemp -Force | Out-Null

    function ConvertTo-InspectArgument {
        param([Parameter(Mandatory = $true)][string]$Value)
        $escapedValue = $Value.Replace([string][char]92, ([string][char]92) + ([string][char]92)).Replace([string][char]34, ([string][char]92) + [string][char]34)
        return [string][char]34 + $escapedValue + [string][char]34
    }

    function Invoke-InspectFtps {
        param([Parameter(Mandatory = $true)][string[]]$Arguments)
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $inspectionCurl.Source
        $startInfo.Arguments = (($Arguments | ForEach-Object { ConvertTo-InspectArgument -Value $_ }) -join " ")
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        try {
            if (-not $process.Start()) { throw "Could not start curl.exe." }
            $stdoutTask = $process.StandardOutput.ReadToEndAsync()
            $stderrTask = $process.StandardError.ReadToEndAsync()
            $process.StandardInput.WriteLine("user = " + '"' + $Username.Replace([string][char]92, ([string][char]92) + ([string][char]92)).Replace([string][char]34, ([string][char]92) + [string][char]34) + ':' + $Password.Replace([string][char]92, ([string][char]92) + ([string][char]92)).Replace([string][char]34, ([string][char]92) + [string][char]34) + '"')
            $process.StandardInput.Close()
            $process.WaitForExit()
            $stdout = $stdoutTask.GetAwaiter().GetResult()
            $errorText = $stderrTask.GetAwaiter().GetResult().Trim()
            if ($process.ExitCode -ne 0) {
                foreach ($secret in @($Username, $Password)) {
                    if (-not [string]::IsNullOrEmpty($secret)) { $errorText = $errorText.Replace($secret, "[redacted]") }
                }
                throw "FTPS inspection failed: $errorText"
            }
            return $stdout
        } finally {
            $process.Dispose()
        }
    }

    try {
        $inspectionPrefix = @("--config", "-", "--ssl-reqd", "--insecure", "--pinnedpubkey", $FtpPublicKeyPin, "--silent", "--show-error", "--fail", "--connect-timeout", "20", "--max-time", "45")
        $listingUrl = "ftp://$inspectionServer/$inspectionBasePath/"
        $listing = Invoke-InspectFtps -Arguments ($inspectionPrefix + @("--list-only", $listingUrl))
        Write-Host "Relevant application-root files:"
        $listing -split "`r?`n" | Where-Object { $_ -match '^(?:app\.js|index\.html|web\.config|App_Data|tmp|\.meestock-release-[A-Za-z0-9.-]+)$' } | ForEach-Object { Write-Host "  $_" }

        $inspectionResults = @{}
        foreach ($name in @("web.config", "index.html", "app.js")) {
            $destination = Join-Path $inspectionTemp $name
            $fileUrl = "ftp://$inspectionServer/$inspectionBasePath/$name"
            $null = Invoke-InspectFtps -Arguments ($inspectionPrefix + @("--output", $destination, $fileUrl))
            $inspectionResults[$name] = [System.IO.File]::ReadAllText($destination)
        }
        $webConfig = $inspectionResults["web.config"]
        $indexHtml = $inspectionResults["index.html"]
        $startupCode = $inspectionResults["app.js"]
        $indexTitle = [regex]::Match($indexHtml, "(?is)<title[^>]*>(.*?)</title>").Groups[1].Value
        $archiveMatch = [regex]::Match($startupCode, '"(\.meestock-release-[A-Za-z0-9.-]+\.tar\.gz)"')
        Write-Host "web.config references iisnode: $([regex]::IsMatch($webConfig, '(?i)iisnode'))"
        Write-Host "web.config contains URL rewrite rules: $([regex]::IsMatch($webConfig, '(?i)<rewrite'))"
        Write-Host "index.html title: $(if ($indexTitle) { $indexTitle } else { '[no title]' })"
        Write-Host "Startup archive: $(if ($archiveMatch.Success) { $archiveMatch.Groups[1].Value } else { '[not found]' })"
    } finally {
        if (Test-Path -LiteralPath $inspectionTemp) { Remove-Item -LiteralPath $inspectionTemp -Recurse -Force }
    }
    return
}

$sourceRoot = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "package-lock.json") -PathType Leaf)) {
    throw "Frontend package-lock.json is missing from $sourceRoot."
}

$npmCommand = Get-Command "npm.cmd" -ErrorAction Stop
$curlCommand = Get-Command "curl.exe" -ErrorAction Stop
$tarCommand = Get-Command "tar.exe" -ErrorAction Stop
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("meestock-deploy-" + [Guid]::NewGuid().ToString("N"))
$buildRoot = Join-Path $temporaryRoot "frontend"
$deployRoot = Join-Path $temporaryRoot "release"
$sourceRootFull = [System.IO.Path]::GetFullPath($sourceRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)

try {
    New-Item -ItemType Directory -Path $buildRoot, $deployRoot -Force | Out-Null

    foreach ($sourceFile in Get-ChildItem -LiteralPath $sourceRootFull -File -Recurse -Force) {
        $relativePath = $sourceFile.FullName.Substring($sourceRootFull.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        $portablePath = $relativePath.Replace([char]92, [char]47)
        $topLevelName = $portablePath.Split([char]47)[0]
        if ($topLevelName -in @("node_modules", ".next", ".vercel", "out", "coverage")) { continue }
        if ($sourceFile.Name -eq "next-env.d.ts" -or $sourceFile.Name -like ".env*" -or $sourceFile.Name -like "*.tsbuildinfo") { continue }

        $destinationFile = Join-Path $buildRoot $relativePath
        $destinationDirectory = Split-Path -Parent $destinationFile
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        Copy-Item -LiteralPath $sourceFile.FullName -Destination $destinationFile
    }

    Write-Host "Installing the locked frontend dependencies in an isolated temporary copy..."
    & $npmCommand.Source --prefix $buildRoot ci --no-audit --no-fund --no-progress
    if ($LASTEXITCODE -ne 0) {
        throw "npm ci failed with exit code $LASTEXITCODE."
    }

    Write-Host "Building MeeStock for production..."
    & $npmCommand.Source --prefix $buildRoot run build
    if ($LASTEXITCODE -ne 0) {
        throw "The production build failed with exit code $LASTEXITCODE."
    }

    $standaloneRoot = Join-Path $buildRoot ".next\standalone"
    $generatedServer = Join-Path $standaloneRoot "server.js"
    $generatedStatic = Join-Path $buildRoot ".next\static"
    if (-not (Test-Path -LiteralPath $generatedServer -PathType Leaf)) {
        throw "Next.js standalone server.js was not generated."
    }
    if (-not (Test-Path -LiteralPath $generatedStatic -PathType Container)) {
        throw "Next.js static assets were not generated."
    }

    foreach ($item in Get-ChildItem -LiteralPath $standaloneRoot -Force) {
        Copy-Item -LiteralPath $item.FullName -Destination $deployRoot -Recurse -Force
    }

    # Adapt Next.js standalone startup to the named-pipe PORT used by Plesk Windows/iisnode.
    $standaloneServerPath = Join-Path $deployRoot "server.js"
    $standaloneServerText = [System.IO.File]::ReadAllText($standaloneServerPath)
    $defaultPortLine = "const currentPort = parseInt(process.env.PORT, 10) || 3000"
    if (-not $standaloneServerText.Contains($defaultPortLine)) {
        throw "The generated Next.js server.js port line changed; refusing to deploy an incompatible iisnode bundle."
    }
    $portLineReplacement = @'
const rawPort = process.env.PORT || "3000"
const currentPort = /^\d+$/.test(rawPort) ? parseInt(rawPort, 10) : rawPort
'@
    $standaloneServerText = $standaloneServerText.Replace($defaultPortLine, $portLineReplacement.TrimEnd())
    [System.IO.File]::WriteAllText($standaloneServerPath, $standaloneServerText, [System.Text.UTF8Encoding]::new($false))

    $nextStartServerPath = Join-Path $deployRoot "node_modules\next\dist\server\lib\start-server.js"
    if (-not (Test-Path -LiteralPath $nextStartServerPath -PathType Leaf)) {
        throw "The standalone Next.js start-server.js runtime was not traced."
    }
    $nextStartServerText = [System.IO.File]::ReadAllText($nextStartServerPath)
    $listenPattern = 'server\.listen\(port,\s*hostname\);'
    if (-not [regex]::IsMatch($nextStartServerText, $listenPattern)) {
        throw "The Next.js listen call changed; refusing to deploy an incompatible iisnode bundle."
    }
    $listenReplacement = 'if (typeof port === "string") { server.listen(port); } else { server.listen(port, hostname); }'
    $nextStartServerText = [regex]::Replace($nextStartServerText, $listenPattern, $listenReplacement)
    [System.IO.File]::WriteAllText($nextStartServerPath, $nextStartServerText, [System.Text.UTF8Encoding]::new($false))

    $publicSource = Join-Path $buildRoot "public"
    if (Test-Path -LiteralPath $publicSource -PathType Container) {
        $publicDestination = Join-Path $deployRoot "public"
        New-Item -ItemType Directory -Path $publicDestination -Force | Out-Null
        foreach ($item in Get-ChildItem -LiteralPath $publicSource -Force) {
            Copy-Item -LiteralPath $item.FullName -Destination $publicDestination -Recurse -Force
        }
    }

    $staticDestination = Join-Path $deployRoot ".next\static"
    New-Item -ItemType Directory -Path $staticDestination -Force | Out-Null
    foreach ($item in Get-ChildItem -LiteralPath $generatedStatic -Force) {
        Copy-Item -LiteralPath $item.FullName -Destination $staticDestination -Recurse -Force
    }

    $releaseId = [Guid]::NewGuid().ToString("N")
    $localArchive = Join-Path $temporaryRoot "meestock-release.tar.gz"
    & $tarCommand.Source -czf $localArchive -C $deployRoot "."
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $localArchive -PathType Leaf)) {
        throw "Could not package the standalone build."
    }

    $archiveInfo = Get-Item -LiteralPath $localArchive
    Write-Host ("Standalone package: {0:N1} MB" -f ($archiveInfo.Length / 1MB))
    $publicFileCount = @(Get-ChildItem -LiteralPath (Join-Path $deployRoot "public") -File -Recurse -ErrorAction SilentlyContinue).Count
    Write-Host "Public static files: $publicFileCount"

    if ($DryRun) {
        Write-Host "Dry run: no remote files will be changed."
        Write-Host "Target: https://$targetHost/"
        Write-Host "Runtime: Plesk Node.js with app.js and Next.js standalone."
        Write-Host "Transfer: pinned FTPS, with a Plesk Windows/iisnode-compatible startup file."
        return
    }

    $missingVariables = @(
        if ([string]::IsNullOrWhiteSpace($Server)) { "D2D_DEPLOY_FTP_SERVER" }
        if ([string]::IsNullOrWhiteSpace($Username)) { "D2D_DEPLOY_FTP_USERNAME" }
        if ([string]::IsNullOrWhiteSpace($Password)) { "D2D_DEPLOY_FTP_PASSWORD" }
    )
    if ($missingVariables.Count -gt 0) {
        throw "Set these deployment variables in the local environment, then rerun: $($missingVariables -join ', ')"
    }

    $serverValue = $Server.Trim()
    if ($serverValue.StartsWith("ftp://", [System.StringComparison]::OrdinalIgnoreCase)) {
        $serverValue = $serverValue.Substring(6)
    }
    if ($serverValue.StartsWith("ftps://", [System.StringComparison]::OrdinalIgnoreCase) -or $serverValue -notmatch '^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$') {
        throw "D2D_DEPLOY_FTP_SERVER must contain an FTP host and optional port."
    }
    if (($Username + $Password) -match '[\r\n]') {
        throw "Deployment credentials cannot contain line breaks."
    }

    function ConvertTo-CurlConfigValue {
        param([Parameter(Mandatory = $true)][string]$Value)

        $slash = [string][char]92
        $quote = [string][char]34
        $escaped = $Value.Replace($slash, $slash + $slash).Replace($quote, $slash + $quote)
        return $quote + $escaped + $quote
    }

    function ConvertTo-QuotedProcessArgument {
        param([Parameter(Mandatory = $true)][string]$Value)

        $quote = [char]34
        $slash = [char]92
        $builder = [System.Text.StringBuilder]::new()
        [void]$builder.Append($quote)
        $backslashCount = 0
        foreach ($character in $Value.ToCharArray()) {
            if ([int]$character -eq 92) {
                $backslashCount++
                continue
            }
            if ([int]$character -eq 34) {
                [void]$builder.Append([string]::new($slash, ($backslashCount * 2) + 1))
                [void]$builder.Append($quote)
                $backslashCount = 0
                continue
            }
            if ($backslashCount -gt 0) {
                [void]$builder.Append([string]::new($slash, $backslashCount))
                $backslashCount = 0
            }
            [void]$builder.Append($character)
        }
        if ($backslashCount -gt 0) {
            [void]$builder.Append([string]::new($slash, $backslashCount * 2))
        }
        [void]$builder.Append($quote)
        return $builder.ToString()
    }

    function Invoke-FtpsUpload {
        param(
            [Parameter(Mandatory = $true)][string]$LocalFile,
            [Parameter(Mandatory = $true)][string]$RemoteUrl,
            [Parameter(Mandatory = $true)][string]$FtpUser,
            [Parameter(Mandatory = $true)][string]$FtpPassword
        )

        $curlArguments = @("--config", "-", "--ssl-reqd", "--insecure", "--pinnedpubkey", $FtpPublicKeyPin, "--silent", "--show-error", "--fail", "--connect-timeout", "20", "--max-time", "3600", "--ftp-create-dirs", "--upload-file", $LocalFile, $RemoteUrl)
        $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = $curlCommand.Source
        $startInfo.Arguments = (($curlArguments | ForEach-Object { ConvertTo-QuotedProcessArgument -Value $_ }) -join " ")
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true

        $process = [System.Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        try {
            if (-not $process.Start()) {
                throw "Could not start curl.exe."
            }
            $stdoutTask = $process.StandardOutput.ReadToEndAsync()
            $stderrTask = $process.StandardError.ReadToEndAsync()
            $process.StandardInput.WriteLine("user = $(ConvertTo-CurlConfigValue -Value ($FtpUser + ':' + $FtpPassword))")
            $process.StandardInput.Close()
            $process.WaitForExit()
            $null = $stdoutTask.GetAwaiter().GetResult()
            $curlError = $stderrTask.GetAwaiter().GetResult().Trim()
            if ($process.ExitCode -ne 0) {
                foreach ($secret in @($FtpUser, $FtpPassword)) {
                    if (-not [string]::IsNullOrEmpty($secret)) {
                        $curlError = $curlError.Replace($secret, "[redacted]")
                    }
                }
                throw "FTPS upload failed for '$([System.IO.Path]::GetFileName($LocalFile))': $curlError"
            }
        } finally {
            $process.Dispose()
        }
    }

    $remoteBasePath = [System.Uri]::EscapeDataString($targetHost)
    $archiveName = ".meestock-release-$releaseId.tar.gz"
    $archiveUrl = "ftp://$serverValue/$remoteBasePath/$archiveName"
    $bootstrapPath = Join-Path $temporaryRoot "app.js"
    $bootstrapSource = @"
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const archivePath = path.join(__dirname, "$archiveName");
const serverPath = path.join(__dirname, "server.js");

if (fs.existsSync(archivePath)) {
  const tarCommand = process.platform === "win32" ? "tar.exe" : "tar";
  const tarArguments = ["-xzf", archivePath, "-C", __dirname];
  if (process.platform !== "win32") {
    tarArguments.push("--no-same-owner");
  }
  execFileSync(tarCommand, tarArguments, { stdio: "inherit" });
  if (!fs.existsSync(serverPath)) {
    throw new Error("The MeeStock standalone server was not extracted.");
  }
  for (const fileName of fs.readdirSync(__dirname)) {
    if (/^\.meestock-release-[a-f0-9]+\.tar\.gz$/.test(fileName)) {
      fs.unlinkSync(path.join(__dirname, fileName));
    }
  }
}

if (!fs.existsSync(serverPath)) {
  throw new Error("The MeeStock standalone server is missing.");
}
if (!process.env.HOSTNAME) {
  process.env.HOSTNAME = "0.0.0.0";
}
require(serverPath);
"@
    [System.IO.File]::WriteAllText($bootstrapPath, $bootstrapSource, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Uploading the production bundle over FTPS..."
    Invoke-FtpsUpload -LocalFile $localArchive -RemoteUrl $archiveUrl -FtpUser $Username -FtpPassword $Password
    $publicRoot = Join-Path $deployRoot "public"
    if (Test-Path -LiteralPath $publicRoot -PathType Container) {
        Write-Host "Uploading public static assets..."
        $publicRootFull = [System.IO.Path]::GetFullPath($publicRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        foreach ($publicFile in Get-ChildItem -LiteralPath $publicRootFull -File -Recurse) {
            $relativePublicPath = $publicFile.FullName.Substring($publicRootFull.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
            $portablePublicPath = $relativePublicPath.Replace([char]92, [char]47)
            $encodedPublicPath = @($portablePublicPath.Split([char]47) | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '/'
            $publicUrl = "ftp://$serverValue/$remoteBasePath/public/$encodedPublicPath"
            Invoke-FtpsUpload -LocalFile $publicFile.FullName -RemoteUrl $publicUrl -FtpUser $Username -FtpPassword $Password
        }
    }
    Write-Host "Uploading the Plesk startup file..."
    Invoke-FtpsUpload -LocalFile $bootstrapPath -RemoteUrl "ftp://$serverValue/$remoteBasePath/app.js" -FtpUser $Username -FtpPassword $Password
    Write-Host "MeeStock files deployed over pinned FTPS to $targetHost."
    Write-Host "Use the Plesk Restart App control to activate the iisnode application."
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}
