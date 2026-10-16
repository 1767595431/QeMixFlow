# YHQeMix 定制版：版本更新后重新编译时的续用脚本
#
# 用途：上游更新后，处理「代码补丁管不到」的两件事——
#   1. 清理运行时数据里的旧供应商（否则设置页仍会列出来）；
#   2. 提示重新编译与启动的命令。
#
# 用法（仓库根目录执行）：
#   pwsh -File customization/reapply.ps1
#
# 提示：代码改动请先用 git apply --3way customization/changes.patch 应用。

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Write-Host "[1/4] 仓库根目录：$repoRoot" -ForegroundColor Cyan

# ---- 1. 清理已安装的媒体供应商文件（保留 TF-Router） -------------------------
$providersDir = Join-Path $repoRoot "data\providers"
if (Test-Path -LiteralPath $providersDir) {
    # ACT: 定制版只保留 TF-Router 作为默认媒体供应商，其余内置供应商文件需要清掉。
    $stale = Get-ChildItem -LiteralPath $providersDir -File -Filter "*.ts" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne "tfRouter.ts" }
    if ($stale) {
        foreach ($file in $stale) {
            Write-Host ("      删除媒体供应商：" + $file.Name)
            Remove-Item -LiteralPath $file.FullName -Force
        }
    } else {
        Write-Host "      没有需要清理的媒体供应商文件。"
    }
} else {
    Write-Host "      data\providers 不存在，跳过。"
}

# ---- 2. 确保文本供应商保留 TF-Router -----------------------------------------
$settingsPath = Join-Path $repoRoot "data\settings.json"
if (Test-Path -LiteralPath $settingsPath) {
    $backup = "$settingsPath.bak-" + (Get-Date -Format "yyyyMMddHHmmss")
    Copy-Item -LiteralPath $settingsPath -Destination $backup -Force
    $raw = Get-Content -LiteralPath $settingsPath -Raw
    # 只处理 customProviders 数组，其余字段原样保留。
    $pattern = '("customProviders"\s*:\s*)\[[^\]]*\]'
    $match = [regex]::Match($raw, $pattern)
    if (-not $match.Success) {
        Write-Host "      未找到 settings.customProviders 字段，跳过。"
    } elseif ($match.Groups[2].Value.Trim() -ne "") {
        Write-Host "      customProviders 已有内容，保持原样。"
    } else {
        # ACT: 首次启动会让 conf 自动写入；这里只补已存在但被清空的列表。
        $entry = @'
[
      {
        "id": "tfRouter",
        "label": "TF-router",
        "version": "2.0.0",
        "apiUrl": "https://api.toonflow.net/v1",
        "protocol": "openai-completions",
        "models": [],
        "apiKey": ""
      }
    ]
'@
        $updated = $raw.Substring(0, $match.Index) + $match.Groups[1].Value + $entry +
            $raw.Substring($match.Index + $match.Length)
        [System.IO.File]::WriteAllText($settingsPath, $updated, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "      已补回默认文本供应商 TF-Router（备份：$([System.IO.Path]::GetFileName($backup))）"
    }
} else {
    Write-Host "      data\settings.json 不存在（首次启动会自动写入默认供应商），跳过。"
}

# ---- 3. 检查定制代码是否已应用 -----------------------------------------------
Write-Host "[2/4] 检查定制代码..." -ForegroundColor Cyan
$checks = @(
    @{ Path = "packages\providers\src\language\qwen.ts";        Name = "通义千问供应商" },
    @{ Path = "packages\providers\src\media\volcengine.ts";     Name = "火山引擎供应商" },
    @{ Path = "packages\providers\src\media\jimeng.ts";         Name = "即梦供应商" },
    @{ Path = "packages\providers\src\media\kling.ts";          Name = "可灵供应商" },
    @{ Path = "packages\assets\logo.png";                       Name = "YHQeMix 图标" }
)
foreach ($item in $checks) {
    $full = Join-Path $repoRoot $item.Path
    if (Test-Path -LiteralPath $full) {
        Write-Host ("      已就绪：" + $item.Name)
    } else {
        Write-Host ("      缺失：" + $item.Name + " -> " + $item.Path + "（请先应用 changes.patch）") -ForegroundColor Yellow
    }
}

# ---- 4. 重新编译与启动提示 ---------------------------------------------------
Write-Host "[3/4] 后续命令：" -ForegroundColor Cyan
Write-Host "      bun install --frozen-lockfile"
Write-Host "      bun run build:server        # Web + 后端产物"
Write-Host "      bun run dev:server          # Web 后端，http://localhost:3000"
Write-Host "      bun run dev:web             # Web 前端，http://localhost:5173"
Write-Host "      bun run dev:desktop         # PC 客户端（重启前需先结束上一版桌面进程）"
Write-Host ""
Write-Host "[4/4] 完成。详细说明见 customization/README.md" -ForegroundColor Green
