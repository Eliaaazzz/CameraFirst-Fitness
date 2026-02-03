#!/bin/bash
# =============================================================================
# Database Backup Script
# 法则二：数据定期导出 (SQL Dump)
# =============================================================================

set -e

# 配置
CONTAINER_NAME="fitness-postgres"
DB_NAME="fitness_mvp"
DB_USER="fitnessuser"
BACKUP_DIR="${HOME}/Desktop/AuraFitness-Backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== AuraFitness Database Backup ===${NC}"

# 检查容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '${CONTAINER_NAME}' is not running${NC}"
    echo "Please start Docker first: cd infrastructure && docker compose up -d"
    exit 1
fi

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 导出数据库
echo -e "Exporting database to: ${BACKUP_FILE}"
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"

# 显示文件大小
FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo -e "${GREEN}Backup complete!${NC}"
echo -e "  File: ${BACKUP_FILE}"
echo -e "  Size: ${FILE_SIZE}"

# 保留最近 10 个备份
echo ""
echo "Keeping last 10 backups..."
cd "${BACKUP_DIR}" && ls -t backup_*.sql | tail -n +11 | xargs -I {} rm -- {} 2>/dev/null || true

# 显示所有备份
echo ""
echo "All backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/backup_*.sql 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo -e "${GREEN}Tip: 这个 .sql 文件可以发微信给自己备份，只有几 KB${NC}"
