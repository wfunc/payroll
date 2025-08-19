#!/bin/bash

# 测试运行脚本
# Test Runner Script

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "================================================"
echo "     工资条与离职管理系统 - 测试套件"
echo "     Payroll & Resignation System Test Suite"
echo "================================================"
echo ""

# 检查Node.js环境
echo -e "${YELLOW}检查测试环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到Node.js，请先安装Node.js${NC}"
    exit 1
fi

# 检查Playwright
if [ ! -d "../node_modules/playwright" ]; then
    echo -e "${YELLOW}安装Playwright测试框架...${NC}"
    cd ..
    npm install --save-dev playwright
    npx playwright install chromium
    cd tests
fi

# 检查服务器是否运行
echo -e "${YELLOW}检查服务器状态...${NC}"
if ! curl -s http://localhost:40010 > /dev/null 2>&1; then
    echo -e "${RED}警告: 服务器未运行在40010端口${NC}"
    echo "请先运行: go run ../main.go"
    exit 1
fi
echo -e "${GREEN}✓ 服务器运行正常${NC}"
echo ""

# 运行Shell脚本测试
echo "========================================"
echo "        运行Shell脚本测试"
echo "========================================"
echo ""

for test in scripts/*.sh; do
    if [ -f "$test" ]; then
        echo -e "${YELLOW}运行: $(basename $test)${NC}"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        if bash "$test" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 测试通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗ 测试失败${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        echo ""
    fi
done

# 运行E2E测试
echo "========================================"
echo "          运行E2E测试"
echo "========================================"
echo ""

# 定义测试顺序（按依赖关系）
E2E_TESTS=(
    "test-signature-flow.js"
    "test-complete-flow.js"
    "test-verify-signatures.js"
    "test-resignation-signatures.js"
    "test-status-fix.js"
    "test-report-generation-fix.js"
    "test-final-verification.js"
    "quick-test.js"
)

cd e2e
for test_file in "${E2E_TESTS[@]}"; do
    if [ -f "$test_file" ]; then
        echo -e "${YELLOW}运行: $test_file${NC}"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        
        # 运行测试并捕获输出
        if node "$test_file" 2>&1 | grep -q "成功\|完成\|Success\|Passed"; then
            echo -e "${GREEN}✓ 测试通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗ 测试失败${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
        echo ""
        
        # 短暂延迟，避免测试相互干扰
        sleep 2
    fi
done
cd ..

# 显示测试结果摘要
echo ""
echo "================================================"
echo "              测试结果摘要"
echo "================================================"
echo ""
echo -e "总测试数: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "通过测试: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败测试: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}❌ 有 $FAILED_TESTS 个测试失败${NC}"
    echo "请查看 screenshots/ 目录中的截图以了解失败详情"
    echo ""
    exit 1
fi