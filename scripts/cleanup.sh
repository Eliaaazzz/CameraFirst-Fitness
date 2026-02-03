#!/bin/bash

# =============================================================================
# AuraFitness Project Cleanup Script
# 项目瘦身脚本 - 清理依赖、构建产物、缓存和冗余文件
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 统计变量
TOTAL_SIZE=0
declare -a ITEMS_TO_DELETE=()

# =============================================================================
# 辅助函数
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}=============================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}=============================================${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取目录/文件大小（字节）
get_size_bytes() {
    local path="$1"
    if [[ -e "$path" ]]; then
        du -sk "$path" 2>/dev/null | cut -f1 | awk '{print $1 * 1024}'
    else
        echo 0
    fi
}

# 格式化文件大小
format_size() {
    local bytes=$1
    if [[ $bytes -ge 1073741824 ]]; then
        echo "$(echo "scale=2; $bytes / 1073741824" | bc)GB"
    elif [[ $bytes -ge 1048576 ]]; then
        echo "$(echo "scale=2; $bytes / 1048576" | bc)MB"
    elif [[ $bytes -ge 1024 ]]; then
        echo "$(echo "scale=2; $bytes / 1024" | bc)KB"
    else
        echo "${bytes}B"
    fi
}

# 添加待删除项目
add_to_delete() {
    local path="$1"
    local size=$(get_size_bytes "$path")
    ITEMS_TO_DELETE+=("$path|$size")
    TOTAL_SIZE=$((TOTAL_SIZE + size))
}

# =============================================================================
# 扫描函数
# =============================================================================

scan_node_modules() {
    print_header "1. 扫描 node_modules 目录"

    while IFS= read -r -d '' dir; do
        local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
        local rel_path="${dir#$PROJECT_ROOT/}"
        print_info "发现: $rel_path ($size)"
        add_to_delete "$dir"
    done < <(find "$PROJECT_ROOT" -name "node_modules" -type d -prune -print0 2>/dev/null)
}

scan_build_artifacts() {
    print_header "2. 扫描构建产物目录"

    local build_dirs=("dist" ".next" "build" "out" ".expo" "coverage")

    for dir_name in "${build_dirs[@]}"; do
        while IFS= read -r -d '' dir; do
            # 排除 node_modules 内的目录
            if [[ "$dir" != *"/node_modules/"* ]]; then
                local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
                local rel_path="${dir#$PROJECT_ROOT/}"
                print_info "发现: $rel_path ($size)"
                add_to_delete "$dir"
            fi
        done < <(find "$PROJECT_ROOT" -name "$dir_name" -type d -prune -print0 2>/dev/null)
    done
}

scan_cache_and_logs() {
    print_header "3. 扫描缓存与日志文件"

    # npm/yarn 日志
    while IFS= read -r -d '' file; do
        local size=$(du -sh "$file" 2>/dev/null | cut -f1)
        local rel_path="${file#$PROJECT_ROOT/}"
        print_info "发现: $rel_path ($size)"
        add_to_delete "$file"
    done < <(find "$PROJECT_ROOT" \( -name "npm-debug.log*" -o -name "yarn-error.log*" -o -name "yarn-debug.log*" \) -type f -print0 2>/dev/null)

    # ESLint 缓存
    while IFS= read -r -d '' file; do
        if [[ "$file" != *"/node_modules/"* ]]; then
            local size=$(du -sh "$file" 2>/dev/null | cut -f1)
            local rel_path="${file#$PROJECT_ROOT/}"
            print_info "发现: $rel_path ($size)"
            add_to_delete "$file"
        fi
    done < <(find "$PROJECT_ROOT" -name ".eslintcache" -type f -print0 2>/dev/null)

    # TypeScript 缓存
    while IFS= read -r -d '' dir; do
        if [[ "$dir" != *"/node_modules/"* ]]; then
            local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
            local rel_path="${dir#$PROJECT_ROOT/}"
            print_info "发现: $rel_path ($size)"
            add_to_delete "$dir"
        fi
    done < <(find "$PROJECT_ROOT" -name ".tsbuildinfo" -o -name "tsconfig.tsbuildinfo" -type f -print0 2>/dev/null)
}

scan_ds_store() {
    print_header "4. 扫描 .DS_Store 文件 (Mac)"

    local count=0
    while IFS= read -r -d '' file; do
        add_to_delete "$file"
        ((count++))
    done < <(find "$PROJECT_ROOT" -name ".DS_Store" -type f -print0 2>/dev/null)

    if [[ $count -gt 0 ]]; then
        print_info "发现 $count 个 .DS_Store 文件"
    else
        print_info "未发现 .DS_Store 文件"
    fi
}

scan_large_files() {
    print_header "5. 检查大文件 (>50MB)"

    local found=0
    while IFS= read -r line; do
        local size=$(echo "$line" | awk '{print $1}')
        local file=$(echo "$line" | cut -f2-)

        # 排除 node_modules, .git, 和已扫描的构建目录
        if [[ "$file" != *"/node_modules/"* ]] && \
           [[ "$file" != *"/.git/"* ]] && \
           [[ "$file" != *"/dist/"* ]] && \
           [[ "$file" != *"/.next/"* ]] && \
           [[ "$file" != *"/build/"* ]] && \
           [[ "$file" != *"/out/"* ]]; then
            local rel_path="${file#$PROJECT_ROOT/}"
            print_warning "大文件: $rel_path ($size)"
            ((found++))
        fi
    done < <(find "$PROJECT_ROOT" -type f -size +50M -exec du -h {} \; 2>/dev/null)

    if [[ $found -eq 0 ]]; then
        print_success "未发现超过 50MB 的大文件"
    else
        echo ""
        print_warning "发现 $found 个大文件，请手动检查是否需要删除"
    fi
}

# =============================================================================
# 删除函数
# =============================================================================

perform_cleanup() {
    print_header "执行清理"

    local deleted_size=0
    local deleted_count=0
    local failed_count=0

    for item in "${ITEMS_TO_DELETE[@]}"; do
        local path="${item%|*}"
        local size="${item#*|}"

        if [[ -e "$path" ]]; then
            local rel_path="${path#$PROJECT_ROOT/}"
            if rm -rf "$path" 2>/dev/null; then
                print_success "已删除: $rel_path"
                deleted_size=$((deleted_size + size))
                ((deleted_count++))
            else
                print_error "删除失败: $rel_path"
                ((failed_count++))
            fi
        fi
    done

    echo ""
    print_header "清理完成"
    echo -e "  删除项目数: ${GREEN}$deleted_count${NC}"
    echo -e "  删除失败数: ${RED}$failed_count${NC}"
    echo -e "  释放空间: ${GREEN}$(format_size $deleted_size)${NC}"

    # 显示清理后的项目大小
    local new_size=$(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1)
    echo -e "  当前项目大小: ${CYAN}$new_size${NC}"
}

# =============================================================================
# 主程序
# =============================================================================

show_summary() {
    print_header "扫描汇总"

    echo ""
    echo -e "  待清理项目数: ${YELLOW}${#ITEMS_TO_DELETE[@]}${NC}"
    echo -e "  预计释放空间: ${YELLOW}$(format_size $TOTAL_SIZE)${NC}"
    echo ""

    # 当前项目大小
    local current_size=$(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1)
    echo -e "  当前项目大小: ${CYAN}$current_size${NC}"
    echo ""
}

main() {
    print_header "AuraFitness 项目瘦身工具"
    echo "项目路径: $PROJECT_ROOT"

    # 检查是否为 dry-run 模式
    DRY_RUN=false
    AUTO_YES=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run|-d)
                DRY_RUN=true
                shift
                ;;
            --yes|-y)
                AUTO_YES=true
                shift
                ;;
            --help|-h)
                echo ""
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  -d, --dry-run    仅扫描，不执行删除（预览模式）"
                echo "  -y, --yes        跳过确认，直接执行删除"
                echo "  -h, --help       显示帮助信息"
                echo ""
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                exit 1
                ;;
        esac
    done

    if $DRY_RUN; then
        print_warning "运行模式: DRY-RUN (仅扫描，不删除)"
    fi

    # 执行扫描
    scan_node_modules
    scan_build_artifacts
    scan_cache_and_logs
    scan_ds_store
    scan_large_files

    # 显示汇总
    show_summary

    # 如果是 dry-run 模式，到此结束
    if $DRY_RUN; then
        print_info "DRY-RUN 模式完成，未执行任何删除操作"
        echo ""
        echo "如需执行清理，请运行:"
        echo "  $0        # 交互模式，会提示确认"
        echo "  $0 -y     # 直接执行，无需确认"
        exit 0
    fi

    # 如果没有待删除项目
    if [[ ${#ITEMS_TO_DELETE[@]} -eq 0 ]]; then
        print_success "项目已经很干净，无需清理！"
        exit 0
    fi

    # 确认删除
    if ! $AUTO_YES; then
        echo ""
        read -p "$(echo -e ${YELLOW}是否执行清理？[y/N]: ${NC})" confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            print_info "已取消操作"
            exit 0
        fi
    fi

    # 执行清理
    perform_cleanup
}

main "$@"
