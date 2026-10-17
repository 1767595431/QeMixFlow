# 把界面文案里的品牌名统一替换为 QeMixFlow。
# 上游合并后源码里是 Toonflow，定制后是 YHQeMix，两种都归一到 QeMixFlow。
# 保留：仓库地址、内部标识（协议/类名/请求头/构建产物名）、插件与技能的作者元数据。
#
# 用法（仓库根目录执行）：pwsh -File customization/applyBrand.ps1

param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

# 品牌替换规则：前置排除 / @ 字母数字下划线（避开 URL、包名、dockviewToonflow），后置排除 /2.0（避开 UA）。
$brandPatterns = @('(?<![/@A-Za-z0-9_])Toonflow(?!\/2\.0)', 'YHQeMix')
# 作者元数据与判断语句必须保持 Toonflow，否则远程官方插件/技能的识别会失效。
# ACT: 三组都要保留，第一组是字面量 author——之前漏掉它，替换后会把 `author: Toonflow` 写成 `: Toonflow`。
$authorPattern = "(author)(\s*[:!=]+\s*)([""']?)Toonflow"
$authorTag = "@@AUTHOR_KEEP@@"

# 用 ripgrep 先筛出真正含 Toonflow 的文件，避免递归枚举 node_modules。
$files = & rg -l "Toonflow|YHQeMix" --glob "!node_modules" --glob "!build" --glob "!dist" --glob "!.hutch" `
    --glob "!customization" --glob "!docs" --glob "!*.log" apps packages 2>$null

$utf8 = New-Object System.Text.UTF8Encoding($false)
$changed = 0
$total = 0

foreach ($relative in $files) {
    $file = Get-Item -LiteralPath $relative -ErrorAction SilentlyContinue
    if (-not $file) { continue }
    $text = [System.IO.File]::ReadAllText($file.FullName)

    $guarded = [regex]::Replace($text, $authorPattern, ('$1$2$3' + $authorTag))
    $hits = 0
    $replaced = $guarded
    foreach ($pattern in $brandPatterns) {
        $hits += ([regex]::Matches($replaced, $pattern)).Count
        $replaced = [regex]::Replace($replaced, $pattern, "QeMixFlow")
    }
    if ($hits -eq 0) { continue }

    $replaced = $replaced.Replace($authorTag, "Toonflow")
    [System.IO.File]::WriteAllText($file.FullName, $replaced, $utf8)
    $changed++
    $total += $hits
}

Write-Host ("品牌替换完成（目标 QeMixFlow）：{0} 个文件，{1} 处" -f $changed, $total)
