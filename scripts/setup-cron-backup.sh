#!/bin/bash
# =============================================
# 選情系統 設置定時備份 Cron Job
# =============================================
# 使用方式：
#   sudo ./scripts/setup-cron-backup.sh
# =============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 設定 cron job
setup_cron() {
    log_info "設置定時備份任務..."
    
    # 備份 cron 設定
    local cron_entry="# 選情系統資料庫備份
# 每天凌晨 3:00 執行完整備份
0 3 * * * $BACKUP_SCRIPT daily >> /var/log/election-backup.log 2>&1

# 每 6 小時執行增量備份（可選）
# 0 */6 * * * $BACKUP_SCRIPT incremental >> /var/log/election-backup.log 2>&1"

    # 檢查是否已存在相同的 cron job
    if crontab -l 2>/dev/null | grep -q "election-backup"; then
        log_warn "備份任務已存在，將更新設定"
        # 移除舊的設定
        crontab -l 2>/dev/null | grep -v "election-backup" | grep -v "$BACKUP_SCRIPT" | crontab -
    fi
    
    # 新增 cron job
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    log_info "Cron job 設置完成"
}

# 建立日誌檔案
setup_logging() {
    local log_file="/var/log/election-backup.log"
    
    if [ ! -f "$log_file" ]; then
        sudo touch "$log_file"
        sudo chmod 644 "$log_file"
        log_info "建立日誌檔案: $log_file"
    fi
    
    # 設置 logrotate（可選）
    local logrotate_conf="/etc/logrotate.d/election-backup"
    
    if [ ! -f "$logrotate_conf" ]; then
        sudo tee "$logrotate_conf" > /dev/null << 'EOF'
/var/log/election-backup.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
        log_info "建立 logrotate 設定: $logrotate_conf"
    fi
}

# 驗證設定
verify_setup() {
    log_info "驗證 cron job 設定..."
    
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        log_info "✅ Cron job 設定成功"
        echo ""
        echo "已設定的備份任務:"
        crontab -l 2>/dev/null | grep -A1 "election"
    else
        log_warn "❌ Cron job 設定失敗"
        return 1
    fi
}

# 顯示手動執行說明
show_manual_instructions() {
    echo ""
    log_info "============================================="
    log_info "備份任務已設置完成！"
    log_info "============================================="
    echo ""
    echo "手動執行備份:"
    echo "  $BACKUP_SCRIPT"
    echo ""
    echo "查看備份日誌:"
    echo "  tail -f /var/log/election-backup.log"
    echo ""
    echo "列出所有備份:"
    echo "  ls -la $PROJECT_DIR/backups/"
    echo ""
    echo "還原備份:"
    echo "  $SCRIPT_DIR/restore.sh --latest"
    echo ""
}

# 主函式
main() {
    log_info "============================================="
    log_info "選情系統 設置定時備份"
    log_info "============================================="
    
    # 確保備份腳本可執行
    chmod +x "$BACKUP_SCRIPT"
    chmod +x "$SCRIPT_DIR/restore.sh"
    
    # 設置 cron
    setup_cron
    
    # 設置日誌
    setup_logging
    
    # 驗證
    verify_setup
    
    # 顯示說明
    show_manual_instructions
}

main "$@"
