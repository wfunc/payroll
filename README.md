# 📊 电子工资条与离职管理系统 / Electronic Payroll & Resignation Management System

[![Go Version](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/wfunc/payroll)

一个现代化、安全的电子工资条和离职管理系统，采用Go语言开发，支持数字签名、工资条管理、离职流程管理等功能。

## ✨ 核心功能

### 📋 工资条管理
- 🏢 **员工管理** - 完整的员工生命周期管理
- 📋 **工资模板** - 灵活的薪资结构模板
- 💰 **薪资计算** - 自动化工资条生成，支持按比例计算
- ✍️ **数字签名** - 基于Canvas的电子签名捕获
- 📧 **通知系统** - 邮件和短信通知
- 📱 **响应式界面** - 移动端友好界面

### 🚪 离职管理系统
- 📝 **离职申请** - 在线离职申请提交和审批
- 🔄 **状态跟踪** - 完整的离职流程状态管理
- ✍️ **电子签名** - 员工、HR、主管三方电子签名
- 📄 **离职报告** - 自动生成包含签名的离职报告
- 🔗 **签名链接** - 生成安全的签名链接供相关人员签署
- 🎯 **智能向导** - 智能检测签名状态并引导操作

### 🔧 技术特性
- 🔐 **JWT认证** - 安全的API访问控制
- 🗄️ **多数据库支持** - SQLite、MySQL、PostgreSQL
- 🐳 **Docker支持** - 容器化部署
- 🌐 **RESTful API** - 完整的REST API接口

## 🚀 系统架构

```
电子工资条与离职管理系统架构
├── 后端 (Go + Gin + GORM)
│   ├── 员工管理 API
│   ├── 工资模板引擎  
│   ├── 薪资计算与发布
│   ├── 离职申请管理
│   ├── 数字签名处理
│   ├── 离职报告生成
│   └── 通知服务
├── 前端 (HTML5 + Canvas + Vanilla JS)
│   ├── 工资条显示界面
│   ├── 离职管理界面
│   ├── Canvas签名组件
│   └── REST API客户端
└── 数据库层 (多DB支持)
    ├── 员工信息
    ├── 工资模板
    ├── 薪资记录
    ├── 离职申请
    ├── 离职报告
    ├── 数字签名
    └── 通知日志
```

## 📋 系统要求

### 服务器要求
- **操作系统**: Linux/Windows/macOS
- **内存**: 最低2GB，推荐4GB+
- **存储**: 最低10GB，推荐50GB+
- **Go版本**: 1.21或更高

### 支持的数据库
- **SQLite** - 开发环境和小型部署
- **MySQL 5.7+** - 生产环境
- **PostgreSQL 12+** - 企业级部署

## 🛠️ 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/wfunc/payroll.git
cd payroll
```

### 2. 安装依赖

```bash
go mod download
```

### 3. 运行系统

```bash
# 开发环境运行
go run main.go

# 访问系统
http://localhost:40010
```

### 4. 默认登录信息

```
用户名: admin
密码: admin123
```

## 📊 完整API接口文档

### 🔐 认证接口

| 方法 | 路径 | 描述 | 参数 |
|------|------|------|------|
| POST | `/api/v1/auth/login` | 管理员登录 | `{username, password, remember}` |
| POST | `/api/v1/auth/verify` | 验证JWT令牌 | Header: `Authorization: Bearer <token>` |

### 👥 员工管理接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/employees` | 获取员工列表 | 管理员 |
| POST | `/api/v1/employees` | 创建员工 | 管理员 |
| GET | `/api/v1/employees/:id` | 获取员工详情 | 管理员 |
| PUT | `/api/v1/employees/:id` | 更新员工信息 | 管理员 |
| DELETE | `/api/v1/employees/:id` | 删除员工 | 管理员 |

**员工创建示例:**
```json
{
  "name": "张三",
  "employee_no": "EMP001",
  "department": "技术部",
  "position": "软件工程师", 
  "email": "zhangsan@company.com",
  "phone": "13800138000",
  "hire_date": "2024-01-15",
  "status": "active"
}
```

### 📋 工资模板接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/templates` | 获取工资模板列表 | 管理员 |
| POST | `/api/v1/templates` | 创建工资模板 | 管理员 |
| PUT | `/api/v1/templates/:id` | 更新工资模板 | 管理员 |
| DELETE | `/api/v1/templates/:id` | 删除工资模板 | 管理员 |

### 💰 工资条管理接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/payrolls` | 获取工资条列表 | 管理员 |
| POST | `/api/v1/payrolls` | 创建工资条 | 管理员 |
| GET | `/api/v1/payrolls/:id` | 获取工资条详情 | 管理员 |
| PUT | `/api/v1/payrolls/:id` | 更新工资条 | 管理员 |
| DELETE | `/api/v1/payrolls/:id` | 删除工资条 | 管理员 |
| POST | `/api/v1/payrolls/publish` | 批量发布工资条 | 管理员 |
| GET | `/api/v1/payrolls/employee/:id` | 员工查询工资条 | 公开 |

**工资条创建示例:**
```json
{
  "employee_id": 1,
  "period": "2024-08",
  "template_id": 1,
  "payroll_data": {
    "basic_salary": 8000,
    "performance_bonus": 2000,
    "meal_allowance": 300,
    "transport_allowance": 200,
    "overtime_pay": 500,
    "personal_tax": 315,
    "social_insurance": 840,
    "housing_fund": 400
  }
}
```

### ✍️ 电子签名接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/v1/payrolls/sign` | 工资条电子签名 | 公开 |
| GET | `/api/v1/payrolls/:id/signature` | 获取工资条签名 | 公开 |

### 🚪 离职申请管理接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/resignations` | 获取离职申请列表 | 管理员 |
| POST | `/api/v1/resignations` | 创建离职申请 | 管理员 |
| GET | `/api/v1/resignations/:id` | 获取离职申请详情 | 公开 |
| PUT | `/api/v1/resignations/:id` | 更新离职申请 | 管理员 |
| DELETE | `/api/v1/resignations/:id` | 删除离职申请 | 管理员 |
| POST | `/api/v1/resignations/:id/approve` | 审批通过离职申请 | 管理员 |
| POST | `/api/v1/resignations/:id/reject` | 驳回离职申请 | 管理员 |

**离职申请创建示例:**
```json
{
  "employee_id": 1,
  "resignation_type": "voluntary",
  "resignation_date": "2024-09-01",
  "last_working_date": "2024-09-15",
  "reason": "个人发展需要",
  "handover_notes": "项目交接给李四同事"
}
```

**离职类型说明:**
- `voluntary`: 主动离职
- `dismissal`: 辞退  
- `contract_expiry`: 合同到期

**离职状态说明:**
- `draft`: 草稿
- `submitted`: 已提交
- `approved`: 已批准
- `rejected`: 已驳回
- `completed`: 已完成（签名完成）

### 🔗 离职签名接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/v1/resignations/:id/generate-sign-token` | 生成签名令牌 | 管理员 |
| POST | `/api/v1/resignations/sign` | 离职文件签名 | 公开 |
| GET | `/api/v1/resignations/:id/signatures` | 获取签名列表 | 公开 |

**签名令牌生成示例:**
```json
{
  "signer_type": "employee"
}
```

**签名类型说明:**
- `employee`: 员工本人
- `hr`: 人力资源部
- `manager`: 部门主管

### 📄 离职报告接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/resignation-reports` | 获取离职报告列表 | 管理员 |
| POST | `/api/v1/resignation-reports` | 创建离职报告 | 管理员 |
| GET | `/api/v1/resignation-reports/:id` | 获取离职报告详情 | 管理员 |
| PUT | `/api/v1/resignation-reports/:id` | 更新离职报告 | 管理员 |
| DELETE | `/api/v1/resignation-reports/:id` | 删除离职报告 | 管理员 |

**离职报告创建示例:**
```json
{
  "application_id": 1,
  "work_summary": "负责用户管理模块开发，完成了权限系统设计",
  "unfinished_tasks": "数据统计模块开发进度70%，已交接给李四",
  "company_property_returned": true,
  "financial_settlement": true
}
```

### 📧 通知管理接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/notifications` | 获取通知列表 | 管理员 |
| POST | `/api/v1/notifications/resend` | 重发通知 | 管理员 |

### 🌐 工具接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/v1/client-ip` | 获取客户端IP信息 | 公开 |

## 🎯 离职管理流程

### 1. 创建离职申请
```bash
curl -X POST http://localhost:40010/api/v1/resignations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "employee_id": 1,
    "resignation_type": "voluntary",
    "resignation_date": "2024-09-01",
    "last_working_date": "2024-09-15",
    "reason": "个人发展需要"
  }'
```

### 2. 审批离职申请
```bash
curl -X POST http://localhost:40010/api/v1/resignations/uuid-here/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "approval_comments": "同意离职申请，感谢贡献"
  }'
```

### 3. 生成签名链接
```bash
curl -X POST http://localhost:40010/api/v1/resignations/uuid-here/generate-sign-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "signer_type": "employee"
  }'
```

### 4. 电子签名
```bash
curl -X POST "http://localhost:40010/api/v1/resignations/sign?token=<sign-token>&type=employee" \
  -H "Content-Type: application/json" \
  -d '{
    "signature_data": "data:image/png;base64,iVBOR...",
    "device_info": "Windows设备"
  }'
```

### 5. 生成离职报告
```bash
curl -X POST http://localhost:40010/api/v1/resignation-reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "application_id": 1,
    "work_summary": "项目开发工作总结",
    "unfinished_tasks": "无未完成事项",
    "company_property_returned": true,
    "financial_settlement": true
  }'
```

## 💰 工资条管理流程

### 1. 创建员工
```bash
curl -X POST http://localhost:40010/api/v1/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "张三",
    "employee_no": "EMP001",
    "department": "技术部",
    "position": "软件工程师",
    "email": "zhangsan@company.com"
  }'
```

### 2. 创建工资条
```bash
curl -X POST http://localhost:40010/api/v1/payrolls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "employee_id": 1,
    "period": "2024-08",
    "template_id": 1,
    "payroll_data": {
      "basic_salary": 8000,
      "performance_bonus": 2000,
      "allowances": 500,
      "deductions": 1155
    }
  }'
```

### 3. 发布工资条
```bash
curl -X POST http://localhost:40010/api/v1/payrolls/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "payroll_ids": [1, 2, 3],
    "notify_employees": true
  }'
```

## 🔧 部署指南

### Docker部署

```bash
# 构建镜像
docker build -t payroll-system .

# 运行容器
docker run -d -p 40010:40010 --name payroll payroll-system
```

### Docker Compose部署

```yaml
version: '3.8'

services:
  payroll-system:
    build: .
    ports:
      - "40010:40010"
    environment:
      - PORT=40010
      - DATABASE_TYPE=mysql
      - DATABASE_URL=root:password@tcp(mysql:3306)/payroll_db?charset=utf8mb4&parseTime=True&loc=Local
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: payroll_db
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### 生产环境部署

```bash
# 构建生产版本
./build-linux.sh

# 创建systemd服务
sudo cp payroll-system.service /etc/systemd/system/
sudo systemctl enable payroll-system
sudo systemctl start payroll-system
```

## 🔐 安全特性

### 1. JWT认证
- 安全的令牌认证机制
- 支持记住登录状态
- 自动令牌过期处理

### 2. 电子签名安全
- 签名数据Base64编码存储
- SHA256哈希值验证
- IP地址和设备信息记录
- 签名时间戳防篡改

### 3. 数据保护
- 敏感数据加密存储
- SQL注入防护
- XSS攻击防护
- CORS跨域安全配置

## 📊 系统监控

### 性能指标
- API响应时间监控
- 数据库连接池状态
- 内存使用情况
- 并发用户数统计

### 错误处理
- 统一错误响应格式
- 详细错误日志记录
- 用户友好错误提示
- 异常恢复机制

## 🔄 数据备份

### 自动备份脚本
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/payroll"

# SQLite备份
cp payroll.db "$BACKUP_DIR/payroll_$DATE.db"

# 签名文件备份
tar -czf "$BACKUP_DIR/signatures_$DATE.tar.gz" uploads/signatures/

# 清理30天前的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

## 🚀 性能优化

### 数据库优化
- 合理的索引设计
- 分页查询优化
- 连接池配置
- 慢查询监控

### 接口优化
- 响应数据压缩
- 缓存策略应用
- 并发请求控制
- 资源池管理

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
go test ./...

# 运行特定模块测试
go test -v ./tests/employee_test.go
go test -v ./tests/resignation_test.go

# 生成测试覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### API测试
```bash
# 安装测试工具
npm install -g newman

# 运行Postman测试集合
newman run tests/payroll-api-tests.json
```

## 🤝 贡献指南

1. Fork项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 开发规范
- 遵循Go代码规范
- 添加必要的注释
- 编写单元测试
- 更新API文档

## 📞 技术支持

- **问题反馈**: [GitHub Issues](https://github.com/wfunc/payroll/issues)
- **功能建议**: [GitHub Discussions](https://github.com/wfunc/payroll/discussions)
- **文档更新**: 提交PR更新README

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🎯 路线图

### 近期计划 (v1.1)
- [ ] 多语言支持
- [ ] 移动端应用
- [ ] 高级报表功能
- [ ] 批量导入导出

### 中期计划 (v1.5)
- [ ] 微信小程序
- [ ] 钉钉集成
- [ ] 审批工作流
- [ ] 数据分析看板

### 长期计划 (v2.0)
- [ ] 多租户支持
- [ ] 分布式部署
- [ ] AI智能分析
- [ ] 区块链签名

## 🏢 关于项目

这个综合性的电子工资条与离职管理系统提供了完整的HR管理解决方案，具有：

- **工资条管理**: 基于Canvas的数字签名，确保员工确认的安全性
- **离职管理**: 完整的离职流程，从申请到报告生成的全流程管理
- **灵活的薪资模板**: 支持不同的薪资结构配置
- **安全的数据存储**: 多数据库支持，确保数据安全
- **RESTful API**: 便于集成的完整API接口
- **响应式界面**: 适配所有设备的用户界面
- **智能通知系统**: 自动化的邮件和短信通知

适合各种规模的企业使用，帮助企业数字化其薪酬和离职管理流程，同时保持安全性和合规性标准。

---

**版本**: v1.0.0  
**最后更新**: 2024年8月  
**维护者**: wfunc团队