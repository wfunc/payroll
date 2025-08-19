# 测试文件说明 / Test Documentation

## 📁 目录结构

```
tests/
├── e2e/                    # 端到端测试文件
│   ├── *.js               # Playwright测试脚本
│   └── *.html             # 测试辅助HTML文件
├── scripts/               # Shell测试脚本
│   ├── test_employee_management.sh
│   └── test_templates.sh
├── screenshots/           # 测试截图
│   └── *.png             # 测试过程中生成的截图
└── README.md             # 本文件
```

## 🧪 E2E测试文件说明

### 离职管理测试
- `test-signature-flow.js` - 签名流程测试
- `test-complete-flow.js` - 完整流程测试
- `test-verify-signatures.js` - 签名验证测试
- `test-resignation-signatures.js` - 离职签名测试
- `test-status-fix.js` - 状态修复验证测试

### 报告生成测试
- `test-report-generation-fix.js` - 报告生成修复测试
- `test-final-verification.js` - 最终验证测试

### 快速测试
- `quick-test.js` - 快速功能验证测试

### 测试辅助文件
- `test-complete-flow.html` - 完整流程测试页面
- `test-signature-flow.html` - 签名流程测试页面

## 🚀 运行测试

### 安装依赖
```bash
# 安装Playwright测试框架
npm install --save-dev playwright
```

### 运行E2E测试
```bash
# 运行单个测试
node tests/e2e/test-signature-flow.js

# 运行所有E2E测试
for test in tests/e2e/*.js; do
  echo "Running $test..."
  node "$test"
done
```

### 运行Shell脚本测试
```bash
# 员工管理测试
./tests/scripts/test_employee_management.sh

# 模板测试
./tests/scripts/test_templates.sh
```

## 📸 测试截图

测试执行过程中生成的截图会自动保存到 `screenshots/` 目录：

- `test-application-detail.png` - 申请详情截图
- `test-correct-flow.png` - 正确流程截图
- `test-error.png` - 错误情况截图
- `test-report-detail.png` - 报告详情截图

## ⚙️ 测试配置

### 测试服务器配置
```javascript
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
```

### 超时设置
```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
```

## 📝 测试用例清单

### ✅ 已覆盖的功能
- [x] 管理员登录
- [x] 离职申请创建
- [x] 离职申请审批
- [x] 电子签名添加
- [x] 离职报告生成
- [x] 签名状态检测
- [x] 智能向导功能
- [x] 报告查看功能

### 🔄 待添加的测试
- [ ] 员工工资条查询
- [ ] 批量工资条发布
- [ ] 通知发送功能
- [ ] 权限验证测试
- [ ] API接口测试
- [ ] 性能压力测试

## 🐛 常见问题

### 1. Playwright未安装
```bash
npm install playwright
npx playwright install chromium
```

### 2. 服务器未启动
```bash
# 确保服务器运行在40010端口
go run main.go
```

### 3. 测试失败调试
- 查看 `screenshots/` 目录中的错误截图
- 检查控制台输出的错误信息
- 使用 `headless: false` 观察测试执行过程

## 🤝 贡献测试

欢迎添加新的测试用例：

1. 在相应目录创建测试文件
2. 遵循现有的命名规范 (`test-*.js`)
3. 添加测试说明到本文档
4. 提交PR时包含测试结果截图