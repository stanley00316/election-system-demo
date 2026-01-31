#!/bin/bash
# =============================================
# 選情系統 SSL 憑證設置腳本 (Let's Encrypt)
# =============================================
# 使用方式：
#   ./scripts/setup-ssl.sh example.com
#   ./scripts/setup-ssl.sh example.com admin@example.com
# =============================================

set -euo pipefail

# 載入環境變數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 顯示使用說明
usage() {
    echo "使用方式:"
    echo "  $0 <domain> [email]"
    echo ""
    echo "參數:"
    echo "  domain    您的網域名稱 (例如: election.example.com)"
    echo "  email     用於 Let's Encrypt 通知的 Email (可選)"
    echo ""
    echo "範例:"
    echo "  $0 election.example.com"
    echo "  $0 election.example.com admin@example.com"
    exit 1
}

# 檢查必要工具
check_requirements() {
    log_step "檢查必要工具..."
    
    local missing=()
    
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "缺少必要工具: ${missing[*]}"
        log_info "請先安裝這些工具後再執行"
        exit 1
    fi
    
    log_info "所有必要工具已安裝"
}

# 驗證域名
validate_domain() {
    local domain="$1"
    
    log_step "驗證域名: $domain"
    
    # 檢查域名格式
    if ! echo "$domain" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$'; then
        log_error "無效的域名格式: $domain"
        exit 1
    fi
    
    # 檢查 DNS 解析
    if ! host "$domain" &> /dev/null; then
        log_warn "無法解析域名 $domain 的 DNS"
        log_warn "請確保 DNS 已正確設定指向此伺服器"
        
        echo ""
        log_info "繼續嗎？ (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_info "DNS 解析成功"
    fi
}

# 建立目錄結構
setup_directories() {
    log_step "建立目錄結構..."
    
    mkdir -p "$PROJECT_DIR/docker/nginx/ssl"
    mkdir -p "$PROJECT_DIR/docker/certbot/www"
    mkdir -p "$PROJECT_DIR/docker/certbot/conf"
    
    log_info "目錄結構已建立"
}

# 建立初始的自簽憑證 (用於首次啟動 Nginx)
create_dummy_certificate() {
    local domain="$1"
    local ssl_dir="$PROJECT_DIR/docker/nginx/ssl"
    
    log_step "建立臨時自簽憑證..."
    
    # 如果已有 Let's Encrypt 憑證則跳過
    if [ -f "$ssl_dir/fullchain.pem" ] && [ -f "$ssl_dir/privkey.pem" ]; then
        log_info "已存在憑證，跳過建立自簽憑證"
        return 0
    fi
    
    # 建立自簽憑證
    openssl req -x509 -nodes -newkey rsa:4096 \
        -days 1 \
        -keyout "$ssl_dir/privkey.pem" \
        -out "$ssl_dir/fullchain.pem" \
        -subj "/CN=$domain" \
        2>/dev/null
    
    log_info "臨時自簽憑證已建立"
}

# 更新 Nginx 配置以支援 Certbot 驗證
update_nginx_config() {
    local domain="$1"
    
    log_step "更新 Nginx 配置..."
    
    # 備份原始配置
    cp "$PROJECT_DIR/docker/nginx/nginx.conf" "$PROJECT_DIR/docker/nginx/nginx.conf.backup"
    
    # 更新 server_name
    sed -i.tmp "s/server_name _;/server_name $domain;/g" "$PROJECT_DIR/docker/nginx/nginx.conf"
    rm -f "$PROJECT_DIR/docker/nginx/nginx.conf.tmp"
    
    log_info "Nginx 配置已更新"
}

# 建立 Certbot docker-compose 服務
create_certbot_compose() {
    local certbot_compose="$PROJECT_DIR/docker/docker-compose.certbot.yml"
    
    log_step "建立 Certbot Docker Compose 配置..."
    
    cat > "$certbot_compose" << 'EOF'
# =============================================
# Certbot SSL 憑證服務
# =============================================
version: '3.8'

services:
  certbot:
    image: certbot/certbot:latest
    container_name: election-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  # 用於初次取得憑證
  certbot-init:
    image: certbot/certbot:latest
    container_name: election-certbot-init
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    profiles:
      - init
EOF

    log_info "Certbot Docker Compose 配置已建立"
}

# 更新主要的 docker-compose.yml 以掛載 certbot 目錄
update_docker_compose() {
    log_step "更新 Docker Compose 配置..."
    
    # 檢查是否已有 certbot 掛載
    if grep -q "certbot" "$PROJECT_DIR/docker/docker-compose.yml"; then
        log_info "Docker Compose 已包含 Certbot 配置"
        return 0
    fi
    
    # 備份原始配置
    cp "$PROJECT_DIR/docker/docker-compose.yml" "$PROJECT_DIR/docker/docker-compose.yml.backup"
    
    # 更新 nginx volumes
    sed -i.tmp 's|- ./nginx/ssl:/etc/nginx/ssl:ro|- ./nginx/ssl:/etc/nginx/ssl:ro\n      - ./certbot/conf/live/${DOMAIN:-localhost}:/etc/nginx/ssl:ro\n      - ./certbot/www:/var/www/certbot:ro|' "$PROJECT_DIR/docker/docker-compose.yml"
    rm -f "$PROJECT_DIR/docker/docker-compose.yml.tmp"
    
    log_info "Docker Compose 配置已更新"
}

# 取得 Let's Encrypt 憑證
obtain_certificate() {
    local domain="$1"
    local email="${2:-}"
    
    log_step "取得 Let's Encrypt SSL 憑證..."
    
    # 啟動 Nginx（使用自簽憑證）
    log_info "啟動 Nginx 以進行域名驗證..."
    cd "$PROJECT_DIR/docker"
    docker compose up -d nginx
    
    # 等待 Nginx 啟動
    sleep 5
    
    # 準備 certbot 命令
    local certbot_args="-d $domain --webroot -w /var/www/certbot --agree-tos --non-interactive"
    
    if [ -n "$email" ]; then
        certbot_args="$certbot_args --email $email"
    else
        certbot_args="$certbot_args --register-unsafely-without-email"
    fi
    
    # 執行 certbot
    log_info "執行 Certbot 取得憑證..."
    docker run --rm \
        -v "$PROJECT_DIR/docker/certbot/conf:/etc/letsencrypt" \
        -v "$PROJECT_DIR/docker/certbot/www:/var/www/certbot" \
        certbot/certbot certonly $certbot_args
    
    # 複製憑證到 nginx/ssl 目錄
    log_info "複製憑證..."
    cp "$PROJECT_DIR/docker/certbot/conf/live/$domain/fullchain.pem" "$PROJECT_DIR/docker/nginx/ssl/"
    cp "$PROJECT_DIR/docker/certbot/conf/live/$domain/privkey.pem" "$PROJECT_DIR/docker/nginx/ssl/"
    
    # 重新啟動 Nginx 使用新憑證
    log_info "重新啟動 Nginx..."
    docker compose restart nginx
    
    log_info "SSL 憑證已成功取得！"
}

# 設置自動更新 cron job
setup_renewal_cron() {
    local domain="$1"
    
    log_step "設置憑證自動更新..."
    
    # 建立更新腳本
    cat > "$PROJECT_DIR/scripts/renew-ssl.sh" << EOF
#!/bin/bash
# 自動更新 Let's Encrypt SSL 憑證

cd "$PROJECT_DIR/docker"

# 更新憑證
docker run --rm \\
    -v "$PROJECT_DIR/docker/certbot/conf:/etc/letsencrypt" \\
    -v "$PROJECT_DIR/docker/certbot/www:/var/www/certbot" \\
    certbot/certbot renew --quiet

# 複製新憑證
if [ -f "$PROJECT_DIR/docker/certbot/conf/live/$domain/fullchain.pem" ]; then
    cp "$PROJECT_DIR/docker/certbot/conf/live/$domain/fullchain.pem" "$PROJECT_DIR/docker/nginx/ssl/"
    cp "$PROJECT_DIR/docker/certbot/conf/live/$domain/privkey.pem" "$PROJECT_DIR/docker/nginx/ssl/"
    
    # 重新載入 Nginx
    docker compose exec -T nginx nginx -s reload
fi
EOF
    
    chmod +x "$PROJECT_DIR/scripts/renew-ssl.sh"
    
    # 設置 cron job（每天檢查兩次）
    local cron_entry="0 0,12 * * * $PROJECT_DIR/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1"
    
    if crontab -l 2>/dev/null | grep -q "renew-ssl"; then
        log_info "SSL 更新任務已存在"
    else
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        log_info "SSL 自動更新 cron job 已設置"
    fi
}

# 驗證 SSL 配置
verify_ssl() {
    local domain="$1"
    
    log_step "驗證 SSL 配置..."
    
    sleep 3
    
    # 檢查 HTTPS 連線
    if curl -sSf --connect-timeout 5 "https://$domain" > /dev/null 2>&1; then
        log_info "✅ HTTPS 連線成功！"
    else
        log_warn "⚠️ HTTPS 連線失敗，請檢查配置"
        log_info "您可以使用以下命令測試："
        echo "  curl -v https://$domain"
    fi
    
    # 顯示憑證資訊
    echo ""
    log_info "憑證資訊："
    echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || true
}

# 顯示完成訊息
show_completion_message() {
    local domain="$1"
    
    echo ""
    log_info "============================================="
    log_info "SSL 設置完成！"
    log_info "============================================="
    echo ""
    echo "您的網站現在可以通過 HTTPS 訪問："
    echo "  https://$domain"
    echo ""
    echo "憑證位置："
    echo "  $PROJECT_DIR/docker/nginx/ssl/fullchain.pem"
    echo "  $PROJECT_DIR/docker/nginx/ssl/privkey.pem"
    echo ""
    echo "自動更新："
    echo "  憑證將每天自動檢查並在到期前更新"
    echo ""
    echo "手動更新："
    echo "  $PROJECT_DIR/scripts/renew-ssl.sh"
    echo ""
}

# 主函式
main() {
    local domain="${1:-}"
    local email="${2:-}"
    
    if [ -z "$domain" ]; then
        usage
    fi
    
    log_info "============================================="
    log_info "選情系統 SSL 憑證設置"
    log_info "域名: $domain"
    log_info "============================================="
    echo ""
    
    # 執行設置步驟
    check_requirements
    validate_domain "$domain"
    setup_directories
    create_dummy_certificate "$domain"
    update_nginx_config "$domain"
    create_certbot_compose
    update_docker_compose
    obtain_certificate "$domain" "$email"
    setup_renewal_cron "$domain"
    verify_ssl "$domain"
    show_completion_message "$domain"
}

# 執行主函式
main "$@"
