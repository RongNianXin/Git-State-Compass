import { execFile } from 'node:child_process';

const script = `Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '选择本地 Git 仓库所在的文件夹'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}`;

export function chooseFolder() {
  if (process.platform !== 'win32') return Promise.reject(new Error('当前版本的文件夹选择弹窗仅支持 Windows'));
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Sta', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      { timeout: 120000, windowsHide: true, maxBuffer: 8192 }, (error, stdout) => {
        if (error) reject(new Error('无法打开文件夹选择窗口'));
        else resolve(stdout.trim() || null);
      });
  });
}
