#!/bin/bash

# 构建Linux版本的脚本
# SQLite需要CGO支持

echo "🚀 开始构建Linux版本..."

# 设置输出目录
OUTPUT_DIR="dist/linux"
APP_NAME="easysalary"

# 创建输出目录
mkdir -p $OUTPUT_DIR

# 设置环境变量
export CGO_ENABLED=1  # SQLite需要CGO
export GOOS=linux
export GOARCH=amd64
export CC=x86_64-linux-musl-gcc  # 使用musl-gcc进行静态链接
export CXX=x86_64-linux-musl-g++

# 检查是否安装了musl-cross
if ! command -v x86_64-linux-musl-gcc &> /dev/null; then
    echo "⚠️  未找到 musl-cross 工具链"
    echo "📦 在macOS上安装: brew install musl-cross"
    echo "📦 或使用Docker构建（推荐）"
    echo ""
    echo "是否使用Docker构建? (y/n)"
    read -r USE_DOCKER
    
    if [ "$USE_DOCKER" = "y" ]; then
        # 使用Docker构建
        echo "🐳 使用Docker构建..."
        
        # 创建Dockerfile
        cat > Dockerfile.build << 'EOF'
FROM golang:1.21-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

# 复制go mod文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix cgo \
    -ldflags="-w -s -extldflags '-static'" \
    -o easysalary main.go

# 最终镜像
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/easysalary .
COPY --from=builder /app/web ./web

EXPOSE 40010

CMD ["./easysalary"]
EOF
        
        # 构建Docker镜像
        docker build -f Dockerfile.build -t easysalary-linux .
        
        # 从容器中提取二进制文件
        docker create --name temp-container easysalary-linux
        docker cp temp-container:/root/easysalary $OUTPUT_DIR/
        docker rm temp-container
        
        # 复制web目录
        cp -r web $OUTPUT_DIR/
        
        echo "✅ Docker构建完成！"
    else
        echo "❌ 需要安装交叉编译工具链或使用Docker"
        exit 1
    fi
else
    # 使用本地交叉编译
    echo "📦 使用本地交叉编译..."
    
    # 添加编译标签和链接选项
    TAGS="sqlite_omit_load_extension"
    LDFLAGS="-linkmode external -extldflags '-static' -s -w"
    
    # 构建
    go build -tags "$TAGS" \
        -ldflags "$LDFLAGS" \
        -o "$OUTPUT_DIR/$APP_NAME" \
        main.go
    
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败"
        exit 1
    fi
    
    # 复制web目录
    cp -r web $OUTPUT_DIR/
    
    echo "✅ 本地构建完成！"
fi

# 创建启动脚本
cat > $OUTPUT_DIR/start.sh << 'EOF'
#!/bin/sh

# 启动脚本
echo "Starting EasySalary..."

# 设置工作目录
cd "$(dirname "$0")"

# 确保有执行权限
chmod +x easysalary

# 启动应用
./easysalary
EOF

chmod +x $OUTPUT_DIR/start.sh

# 创建systemd服务文件
cat > $OUTPUT_DIR/easysalary.service << 'EOF'
[Unit]
Description=EasySalary Payroll System
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/easysalary
ExecStart=/opt/easysalary/easysalary
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 创建安装脚本
cat > $OUTPUT_DIR/install.sh << 'EOF'
#!/bin/bash

# 安装脚本
echo "📦 安装 EasySalary..."

# 创建安装目录
sudo mkdir -p /opt/easysalary

# 复制文件
sudo cp -r * /opt/easysalary/

# 设置权限
sudo chmod +x /opt/easysalary/easysalary
sudo chmod +x /opt/easysalary/start.sh

# 安装systemd服务
sudo cp /opt/easysalary/easysalary.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable easysalary

echo "✅ 安装完成！"
echo ""
echo "使用以下命令管理服务："
echo "  启动: sudo systemctl start easysalary"
echo "  停止: sudo systemctl stop easysalary"
echo "  状态: sudo systemctl status easysalary"
echo "  日志: sudo journalctl -u easysalary -f"
echo ""
echo "访问地址: http://localhost:40010"
EOF

chmod +x $OUTPUT_DIR/install.sh

# 创建README
cat > $OUTPUT_DIR/README.md << 'EOF'
# EasySalary Linux版本

## 快速开始

### 方法1：直接运行
```bash
./start.sh
```

### 方法2：作为系统服务安装
```bash
sudo ./install.sh
sudo systemctl start easysalary
```

## 系统要求
- Linux x86_64
- 无需其他依赖（静态编译）

## 默认配置
- 端口：40010
- 数据库：SQLite (自动创建)
- Web目录：./web

## 文件说明
- `easysalary` - 主程序
- `web/` - Web静态文件
- `start.sh` - 启动脚本
- `install.sh` - 安装脚本
- `easysalary.service` - systemd服务文件

## 访问地址
http://localhost:40010
EOF

# 打包
echo "📦 创建压缩包..."
cd dist
tar -czf easysalary-linux-amd64.tar.gz linux/
cd ..

echo "✅ 构建完成！"
echo ""
echo "📦 输出文件："
echo "  - $OUTPUT_DIR/$APP_NAME (可执行文件)"
echo "  - dist/easysalary-linux-amd64.tar.gz (压缩包)"
echo ""
echo "📝 使用说明："
echo "  1. 将压缩包传输到Linux服务器"
echo "  2. 解压: tar -xzf easysalary-linux-amd64.tar.gz"
echo "  3. 进入目录: cd linux"
echo "  4. 运行: ./start.sh 或 sudo ./install.sh"