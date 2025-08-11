#!/bin/bash

# 使用Docker构建Linux版本（推荐方式）
echo "🐳 使用Docker构建Linux版本..."

# 创建Dockerfile
cat > Dockerfile.linux << 'EOF'
# 构建阶段
FROM golang:1.21-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

# 复制go mod文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY main.go .

# 构建（静态链接）
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix cgo \
    -ldflags="-w -s -extldflags '-static'" \
    -tags netgo \
    -o easysalary main.go

# 运行阶段
FROM scratch

# 从builder复制二进制文件
COPY --from=builder /app/easysalary /easysalary

# 复制web目录
COPY web /web

# 暴露端口
EXPOSE 40010

# 运行
ENTRYPOINT ["/easysalary"]
EOF

# 构建Docker镜像
echo "📦 构建Docker镜像..."
docker build -f Dockerfile.linux -t easysalary-linux .

# 创建输出目录
mkdir -p dist/linux

# 从Docker镜像中提取文件
echo "📤 提取编译后的文件..."
docker create --name temp-extract easysalary-linux
docker cp temp-extract:/easysalary dist/linux/
docker rm temp-extract

# 复制web目录
cp -r web dist/linux/

# 创建运行脚本
cat > dist/linux/run.sh << 'EOF'
#!/bin/sh
echo "Starting EasySalary on port 40010..."
./easysalary
EOF
chmod +x dist/linux/run.sh

# 打包
echo "📦 创建tar.gz包..."
cd dist
tar -czf easysalary-linux-amd64.tar.gz linux/
cd ..

echo "✅ 构建完成！"
echo ""
echo "📦 输出文件: dist/easysalary-linux-amd64.tar.gz"
echo ""
echo "📝 在Linux服务器上使用:"
echo "  1. tar -xzf easysalary-linux-amd64.tar.gz"
echo "  2. cd linux"
echo "  3. ./run.sh"