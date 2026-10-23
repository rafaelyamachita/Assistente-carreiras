$ErrorActionPreference = "Stop"

$apiUrl = "https://4dayweek.io/api/v2/jobs"
$dataDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) "data"
$outputPath = Join-Path $dataDirectory "jobs-feed.json"
$pageSize = 100
$maxPages = 20
$sourceId = "4dayweek"
$sourceName = "4dayweek.io"

function Get-UtcTimestamp {
  return [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
}

function Get-Text {
  param($Value)
  if ($Value -is [string]) { return $Value.Trim() }
  return ""
}

function Get-Terms {
  param($Value)
  $result = [System.Collections.Generic.List[string]]::new()
  foreach ($item in @($Value)) {
    $name = ""
    if ($item -is [string]) {
      $name = $item.Trim()
    } elseif ($null -ne $item -and $null -ne $item.name) {
      $name = Get-Text $item.name
    }
    if ($name -and -not $result.Contains($name)) { $result.Add($name) }
  }
  return ,$result.ToArray()
}

function ConvertTo-Job {
  param($Job)
  if ($null -eq $Job -or $Job -isnot [System.Management.Automation.PSCustomObject]) { return $null }
  $url = Get-Text $Job.url
  $title = Get-Text $Job.title
  $jobId = Get-Text $Job.id
  if (-not $jobId) { $jobId = Get-Text $Job.slug }
  if (-not $url.StartsWith("https://") -and -not $url.StartsWith("http://")) { return $null }
  if (-not $title -or -not $jobId) { return $null }

  $locations = [System.Collections.Generic.List[string]]::new()
  $countries = [System.Collections.Generic.List[string]]::new()
  foreach ($location in @($Job.locations)) {
    $parts = @(
      (Get-Text $location.city),
      (Get-Text $location.state),
      (Get-Text $location.country)
    ) | Where-Object { $_ }
    $label = $parts -join ", "
    if ($label -and -not $locations.Contains($label)) { $locations.Add($label) }
    $country = Get-Text $location.country
    if ($country -and -not $countries.Contains($country)) { $countries.Add($country) }
  }

  $companyName = ""
  if ($null -ne $Job.company) { $companyName = Get-Text $Job.company.name }
  $arrangement = (Get-Text $Job.work_arrangement).ToLowerInvariant()
  if ($arrangement -notin @("remote", "hybrid", "onsite")) { $arrangement = "" }

  return [ordered]@{
    id = $jobId
    title = $title
    company = $companyName
    description = Get-Text $Job.description
    requirements = @(Get-Terms $Job.requirements)
    skills = @(Get-Terms $Job.skills)
    tools = @(Get-Terms $Job.tools)
    stack = @(Get-Terms $Job.stack)
    categories = @(Get-Terms $Job.categories)
    educationRequirements = @(Get-Terms $Job.education_requirements)
    location = ($locations -join " · ")
    locationTerms = @($locations.ToArray())
    locationCountries = @($countries.ToArray())
    eligibleCountries = @("Brazil")
    arrangement = $arrangement
    seniority = Get-Text $Job.level
    level = Get-Text $Job.level
    contractType = Get-Text $Job.contract_type
    salary = Get-Text $Job.salary
    salaryMinimum = $Job.salary_min
    salaryMaximum = $Job.salary_max
    salaryCurrency = Get-Text $Job.salary_currency
    salaryPeriod = Get-Text $Job.salary_period
    postedAt = Get-Text $Job.posted_at
    expiresAt = Get-Text $Job.expires_at
    url = $url
    sourceId = $sourceId
    sourceName = $sourceName
    sourceLinks = @(@{ name = $sourceName; url = $url })
    mandatoryRequirements = @(Get-Terms $Job.required_skills)
  }
}

function Test-Expired {
  param($Job, [DateTime]$Now)
  if ($Job.is_expired -eq $true) { return $true }
  $expiresAt = Get-Text $Job.expires_at
  if (-not $expiresAt) { return $false }
  $parsed = [DateTimeOffset]::MinValue
  if ([DateTimeOffset]::TryParse($expiresAt, [ref]$parsed)) {
    return $parsed.UtcDateTime -le $Now
  }
  return $false
}

function Write-FeedAtomically {
  param($Feed)
  $directory = Split-Path $outputPath -Parent
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $temporaryPath = Join-Path $directory ("jobs-feed-" + [Guid]::NewGuid().ToString("N") + ".json")
  $json = ConvertTo-Json -InputObject $Feed -Depth 30 -Compress
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($temporaryPath, $json + "`n", $encoding)
  Move-Item -LiteralPath $temporaryPath -Destination $outputPath -Force
}

try {
  $allJobs = [System.Collections.Generic.List[object]]::new()
  $totals = [System.Collections.Generic.List[int]]::new()
  $page = 1
  do {
    if ($page -gt $maxPages) {
      throw "Paginação ultrapassou o limite de segurança de $maxPages páginas."
    }
    $query = "country=Brazil&limit=$pageSize&page=$page"
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$apiUrl`?$query" -Method Get -Headers @{
      Accept = "application/json"
      "User-Agent" = "MeuAssistenteDeCarreira/1.0 (static public job feed)"
    } -TimeoutSec 30
    $responseBody = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
    $response = ConvertFrom-Json -InputObject $responseBody
    if ($null -eq $response.data -or $response.data -isnot [System.Array]) {
      throw "Resposta sem a lista documentada de vagas."
    }
    $allJobs.AddRange([object[]]$response.data)
    $total = 0
    if ($response.total -is [ValueType]) { $total = [int]$response.total }
    $totals.Add($total)
    $hasMore = [bool]$response.has_more
    $page++
  } while ($hasMore)

  $now = [DateTime]::UtcNow
  $jobs = [System.Collections.Generic.List[object]]::new()
  $seenUrls = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $seenIds = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $invalidCount = 0
  $expiredCount = 0
  foreach ($rawJob in $allJobs) {
    $normalized = ConvertTo-Job $rawJob
    if ($null -eq $normalized) {
      $invalidCount++
      continue
    }
    if (Test-Expired $rawJob $now) {
      $expiredCount++
      continue
    }
    $canonicalUrl = $normalized.url.Split("#")[0].Split("?")[0].TrimEnd("/")
    if ($seenUrls.Contains($canonicalUrl) -or $seenIds.Contains($normalized.id)) { continue }
    [void]$seenUrls.Add($canonicalUrl)
    [void]$seenIds.Add($normalized.id)
    $jobs.Add($normalized)
  }
  if ($jobs.Count -eq 0) { throw "A fonte respondeu, mas não foram encontradas vagas importáveis." }

  $updatedAt = Get-UtcTimestamp
  $feed = [ordered]@{
    version = 1
    updatedAt = $updatedAt
    country = "Brazil"
    sources = @(@{
      id = $sourceId
      name = $sourceName
      status = "success"
      checkedAt = $updatedAt
      jobs = $jobs.Count
      total = ($totals | Measure-Object -Maximum).Maximum
      pages = $page - 1
      expiredDiscarded = $expiredCount
      invalidDiscarded = $invalidCount
      message = ""
    })
    jobs = @($jobs.ToArray())
    lastAttemptAt = $updatedAt
    lastAttemptStatus = "success"
    lastAttemptMessage = ""
  }
  Write-FeedAtomically $feed
  Write-Output "Publicado feed com $($jobs.Count) vagas elegíveis para o Brasil ($($page - 1) páginas; $expiredCount expiradas removidas)."
  Write-Output "Arquivo: $outputPath"
  exit 0
} catch {
  $message = $_.Exception.Message
  if (Test-Path -LiteralPath $outputPath) {
    try {
      $feed = Get-Content -LiteralPath $outputPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
      $feed = [PSCustomObject]@{ version = 1; country = "Brazil"; jobs = @(); sources = @() }
    }
  } else {
    $feed = [PSCustomObject]@{ version = 1; country = "Brazil"; jobs = @(); sources = @() }
  }
  $feed | Add-Member -NotePropertyName lastAttemptAt -NotePropertyValue (Get-UtcTimestamp) -Force
  $feed | Add-Member -NotePropertyName lastAttemptStatus -NotePropertyValue "error" -Force
  $feed | Add-Member -NotePropertyName lastAttemptMessage -NotePropertyValue $message -Force
  $sourceStatus = @($feed.sources | Where-Object { $_.id -eq $sourceId } | Select-Object -First 1)
  if ($sourceStatus.Count -eq 0) {
    $sourceStatus = [PSCustomObject]@{ id = $sourceId; name = $sourceName }
    $feed.sources = @($feed.sources) + @($sourceStatus)
  } else {
    $sourceStatus = $sourceStatus[0]
  }
  $sourceStatus | Add-Member -NotePropertyName status -NotePropertyValue "error" -Force
  $sourceStatus | Add-Member -NotePropertyName lastAttemptAt -NotePropertyValue $feed.lastAttemptAt -Force
  $sourceStatus | Add-Member -NotePropertyName jobs -NotePropertyValue @($feed.jobs).Count -Force
  $sourceStatus | Add-Member -NotePropertyName message -NotePropertyValue $message -Force
  try {
    Write-FeedAtomically $feed
  } catch {
    Write-Error "Falha ao registrar o estado da coleta: $($_.Exception.Message)"
  }
  Write-Error "Falha ao atualizar $sourceName; as vagas da última coleta foram preservadas: $message"
  exit 1
}
