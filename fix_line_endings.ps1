# fix_line_endings.ps1
# Corrects line endings for the specified file from CRLF (Windows) to LF (Unix).

$filePath = "backend/prestart.sh"

if (Test-Path $filePath) {
    try {
        $text = [System.IO.File]::ReadAllText($filePath) -replace "`r`n", "`n" # Replace CRLF with LF
        $text = $text -replace "`r", "`n" # Replace standalone CR with LF
        [System.IO.File]::WriteAllText($filePath, $text)
        Write-Host "Successfully converted line endings for: $filePath"
    } catch {
        Write-Error "Error converting line endings for $filePath : $_"
    }
} else {
    Write-Error "File not found: $filePath"
}