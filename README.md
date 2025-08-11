# 📊 Payroll System / 电子工资条系统

[![Go Version](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/wfunc/payroll)

A modern, secure electronic payroll system with digital signature support, built with Go and featuring a clean web interface for payroll management and employee salary slip distribution.

## ✨ Features

- 🏢 **Employee Management** - Complete employee lifecycle management
- 📋 **Payroll Templates** - Flexible salary structure templates
- 💰 **Salary Calculation** - Automated payroll generation with pro-rating support
- ✍️ **Digital Signatures** - Canvas-based electronic signature capture
- 📧 **Notification System** - Email and SMS notifications
- 🔐 **JWT Authentication** - Secure API access
- 🗄️ **Multi-Database Support** - SQLite, MySQL, PostgreSQL
- 🐳 **Docker Ready** - Containerized deployment
- 📱 **Responsive UI** - Mobile-friendly interface

## 🚀 System Architecture

```
Payroll System Architecture
├── Backend (Go + Gin + GORM)
│   ├── Employee Management API
│   ├── Payroll Template Engine  
│   ├── Salary Calculation & Publishing
│   ├── Digital Signature Processing
│   └── Notification Service
├── Frontend (HTML5 + Canvas + Vanilla JS)
│   ├── Salary Slip Display Interface
│   ├── Canvas Signature Component
│   └── REST API Client
└── Database Layer (Multi-DB Support)
    ├── Employee Information
    ├── Payroll Templates
    ├── Salary Records
    ├── Digital Signatures
    └── Notification Logs
```

## 📋 System Requirements

### Server Requirements
- **OS**: Linux/Windows/macOS
- **Memory**: 2GB minimum, 4GB+ recommended
- **Storage**: 10GB minimum, 50GB+ recommended
- **Go**: Version 1.21 or later

### Supported Databases
- **SQLite** - Development & small deployments
- **MySQL 5.7+** - Production environments
- **PostgreSQL 12+** - Enterprise deployments

## 🛠️ 安装步骤

### 1. 环境准备

```bash
# 安装Go语言环境
# 下载地址: https://golang.org/dl/

# 验证安装
go version

# 设置Go代理 (中国用户)
go env -w GOPROXY=https://goproxy.cn,direct
```

### 2. 项目初始化

```bash
# 创建项目目录
mkdir payroll-system
cd payroll-system

# 初始化Go模块
go mod init payroll-system

# 创建目录结构
mkdir -p {uploads/signatures,web,config}
```

### 3. 安装依赖

```bash
# 安装核心依赖
go get github.com/gin-gonic/gin
go get github.com/gin-contrib/cors
go get gorm.io/gorm
go get gorm.io/driver/sqlite

# 可选: MySQL驱动
go get gorm.io/driver/mysql

# 可选: PostgreSQL驱动  
go get gorm.io/driver/postgres

# 可选: JWT认证
go get github.com/golang-jwt/jwt/v4

# 可选: 邮件发送
go get gopkg.in/gomail.v2
```

### 4. 创建配置文件

```bash
# config/config.go
cat > config/config.go << 'EOF'
package config

import (
    "os"
    "strconv"
)

type Config struct {
    Port         string
    DatabaseURL  string
    DatabaseType string
    SMTPHost     string
    SMTPPort     int
    SMTPUser     string
    SMTPPass     string
    JWTSecret    string
}

func GetConfig() *Config {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    smtpPort, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
    if smtpPort == 0 {
        smtpPort = 587
    }

    return &Config{
        Port:         port,
        DatabaseURL:  getEnv("DATABASE_URL", "payroll.db"),
        DatabaseType: getEnv("DATABASE_TYPE", "sqlite"),
        SMTPHost:     getEnv("SMTP_HOST", ""),
        SMTPPort:     smtpPort,
        SMTPUser:     getEnv("SMTP_USER", ""),
        SMTPPass:     getEnv("SMTP_PASS", ""),
        JWTSecret:    getEnv("JWT_SECRET", "your-jwt-secret"),
    }
}

func getEnv(key, fallback string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return fallback
}
EOF
```

### 5. 创建环境变量文件

```bash
# .env
cat > .env << 'EOF'
# 服务器配置
PORT=8080

# 数据库配置
DATABASE_TYPE=sqlite
DATABASE_URL=payroll.db

# MySQL示例 (如果使用MySQL)
# DATABASE_TYPE=mysql
# DATABASE_URL=user:password@tcp(localhost:3306)/payroll_db?charset=utf8mb4&parseTime=True&loc=Local

# PostgreSQL示例 (如果使用PostgreSQL)  
# DATABASE_TYPE=postgres
# DATABASE_URL=host=localhost user=username password=password dbname=payroll_db port=5432 sslmode=disable

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key-here
EOF
```

## 🏃‍♂️ 运行系统

### 开发环境运行

```bash
# 直接运行
go run main.go

# 或者构建后运行
go build -o payroll-system
./payroll-system
```

### 生产环境部署

#### 使用systemd (Linux)

```bash
# 创建systemd服务文件
sudo tee /etc/systemd/system/payroll-system.service << 'EOF'
[Unit]
Description=Payroll System
After=network.target

[Service]
Type=simple
User=payroll
WorkingDirectory=/opt/payroll-system
ExecStart=/opt/payroll-system/payroll-system
Restart=always
RestartSec=5
Environment=PORT=8080
EnvironmentFile=/opt/payroll-system/.env

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
sudo systemctl enable payroll-system
sudo systemctl start payroll-system
sudo systemctl status payroll-system
```

#### 使用Docker

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o payroll-system .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=builder /app/payroll-system .
COPY --from=builder /app/web ./web/

EXPOSE 8080
CMD ["./payroll-system"]
```

```bash
# 构建和运行Docker容器
docker build -t payroll-system .
docker run -d -p 8080:8080 --name payroll payroll-system
```

#### 使用docker-compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  payroll-system:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_TYPE=mysql
      - DATABASE_URL=payroll:password@tcp(mysql:3306)/payroll_db?charset=utf8mb4&parseTime=True&loc=Local
    volumes:
      - ./uploads:/root/uploads
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: payroll_db
      MYSQL_USER: payroll
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - payroll-system
    restart: unless-stopped

volumes:
  mysql_data:
```

## 🔐 安全配置

### 1. 使用HTTPS

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://payroll-system:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 添加JWT认证

```go
// middleware/auth.go
package middleware

import (
    "net/http"
    "strings"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v4"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return []byte(jwtSecret), nil
        })

        if err != nil || !token.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }

        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            c.Set("user_id", claims["user_id"])
            c.Set("role", claims["role"])
        }

        c.Next()
    }
}
```

## 📊 API接口文档

### 核心接口列表

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/employees` | 获取员工列表 |
| POST | `/api/v1/employees` | 创建员工 |
| GET | `/api/v1/templates` | 获取工资模板 |
| GET | `/api/v1/payrolls` | 获取工资条列表 |
| POST | `/api/v1/payrolls` | 创建工资条 |
| POST | `/api/v1/payrolls/publish` | 发布工资条 |
| POST | `/api/v1/payrolls/sign` | 电子签名 |
| GET | `/api/v1/payrolls/employee/:id` | 员工工资条查询 |

### 示例请求

```bash
# 创建工资条
curl -X POST http://localhost:8080/api/v1/payrolls \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "period": "2024-08",
    "template_id": 1,
    "payroll_data": {
      "basic_salary": 8000,
      "performance": 2000,
      "meal_allowance": 300,
      "transport": 200,
      "tax": 315,
      "social_insurance": 840
    }
  }'

# 发布工资条
curl -X POST http://localhost:8080/api/v1/payrolls/publish \
  -H "Content-Type: application/json" \
  -d '{
    "payroll_ids": [1, 2, 3],
    "notify_employees": true
  }'
```

## 🔧 维护和监控

### 1. 日志配置

```go
// 添加到main.go
import "github.com/gin-gonic/gin"

func setupLogging() {
    gin.SetMode(gin.ReleaseMode)
    logFile, _ := os.Create("payroll.log")
    gin.DefaultWriter = io.MultiWriter(logFile, os.Stdout)
}
```

### 2. 数据备份

```bash
# SQLite备份
cp payroll.db payroll_backup_$(date +%Y%m%d).db

# MySQL备份
mysqldump -u payroll -p payroll_db > backup_$(date +%Y%m%d).sql

# PostgreSQL备份
pg_dump -U payroll payroll_db > backup_$(date +%Y%m%d).sql
```

### 3. 性能监控

```bash
# 安装监控工具
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

## 🚨 故障排除

### 常见问题解决

1. **端口被占用**
   ```bash
   lsof -i :8080
   kill -9 <PID>
   ```

2. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接字符串格式
   - 确认用户权限

3. **签名图片保存失败**
   ```bash
   # 检查目录权限
   chmod 755 uploads/signatures
   chown -R payroll:payroll uploads/
   ```

4. **邮件发送失败**
   - 验证SMTP设置
   - 检查防火墙规则
   - 确认邮箱应用密码

## 📈 扩展功能

### 可选增强功能

1. **多租户支持** - 支持多公司独立运行
2. **移动端APP** - React Native或Flutter
3. **微信小程序** - 员工移动端查看
4. **自动化测试** - 单元测试和集成测试
5. **CI/CD流水线** - 自动化部署
6. **数据分析** - 工资统计和报表
7. **审批流程** - 工资条审批工作流

## 🔧 Development

### Local Development Setup

```bash
# Clone repository
git clone git@github.com:wfunc/payroll.git
cd payroll

# Install dependencies
go mod download

# Run in development mode
go run main.go
```

### Build for Production

```bash
# Build for current platform
go build -o payroll main.go

# Build for Linux (using provided script)
./build-linux.sh

# Build with Docker
docker build -t payroll-system .
```

### Testing

```bash
# Run employee management tests
./test_employee_management.sh

# Run template tests
./test_templates.sh

# Run all tests
go test ./...
```

## 📄 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/employees` | List all employees |
| POST | `/api/v1/employees` | Create new employee |
| GET | `/api/v1/templates` | Get payroll templates |
| GET | `/api/v1/payrolls` | List payroll records |
| POST | `/api/v1/payrolls` | Create payroll record |
| POST | `/api/v1/payrolls/publish` | Publish salary slips |
| POST | `/api/v1/payrolls/sign` | Digital signature |
| GET | `/api/v1/payrolls/employee/:id` | Employee salary query |

### Example Usage

```bash
# Create employee
curl -X POST http://localhost:8080/api/v1/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "employee_no": "EMP001",
    "department": "Engineering",
    "position": "Software Engineer",
    "email": "john.doe@company.com"
  }'

# Create payroll
curl -X POST http://localhost:8080/api/v1/payrolls \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "period": "2024-08",
    "template_id": 1,
    "payroll_data": {
      "basic_salary": 8000,
      "performance": 2000,
      "allowances": 500,
      "deductions": 1155
    }
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About

This comprehensive electronic payroll system provides a complete solution for salary slip management, featuring:
- Canvas-based digital signatures for secure employee acknowledgment
- Flexible payroll templates for different salary structures  
- Secure data storage with multi-database support
- RESTful API for easy integration
- Responsive web interface for all devices
- Built-in notification system for automated communications

Perfect for companies of all sizes looking to digitize their payroll processes while maintaining security and compliance standards.