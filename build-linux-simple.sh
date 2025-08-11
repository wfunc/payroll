#!/bin/bash

# 简单的Linux交叉编译脚本（在macOS上使用）
echo "🔨 交叉编译Linux版本..."

# 安装依赖提示
echo "📦 确保已安装交叉编译工具:"
echo "  brew install FiloSottile/musl-cross/musl-cross"
echo ""

# 设置环境变量
export CGO_ENABLED=1
export GOOS=linux
export GOARCH=amd64

# 使用musl进行静态编译（如果已安装）
if command -v x86_64-linux-musl-gcc &> /dev/null; then
    echo "✅ 使用musl-cross进行静态编译..."
    export CC=x86_64-linux-musl-gcc
    export CXX=x86_64-linux-musl-g++
    
    # 构建
    go build -ldflags="-linkmode external -extldflags '-static' -s -w" \
        -o dist/easysalary-linux \
        main.go
else
    echo "⚠️  未找到musl-cross，使用标准CGO编译（需要Linux上有glibc）"
    
    # 尝试使用zig作为交叉编译器（如果已安装）
    if command -v zig &> /dev/null; then
        echo "✅ 使用zig进行交叉编译..."
        export CC="zig cc -target x86_64-linux-gnu"
        export CXX="zig c++ -target x86_64-linux-gnu"
        
        go build -ldflags="-s -w" \
            -o dist/easysalary-linux \
            main.go
    else
        echo "❌ 无法进行交叉编译，请安装以下工具之一："
        echo "  1. brew install FiloSottile/musl-cross/musl-cross"
        echo "  2. brew install zig"
        echo "  3. 使用Docker: ./build-linux-docker.sh"
        exit 1
    fi
fi

# 如果构建成功
if [ -f "dist/easysalary-linux" ]; then
    # 创建发布目录
    mkdir -p dist/linux-release
    mv dist/easysalary-linux dist/linux-release/easysalary
    cp -r web dist/linux-release/
    
    # 创建启动脚本
    cat > dist/linux-release/start.sh << 'EOF'
#!/bin/bash
# EasySalary启动脚本
PORT=${PORT:-40010}
echo "Starting EasySalary on port $PORT..."
./easysalary
EOF
    chmod +x dist/linux-release/start.sh
    
    # 打包
    cd dist
    tar -czf easysalary-linux-amd64.tar.gz linux-release/
    cd ..
    
    echo "✅ 构建成功！"
    echo "📦 输出文件: dist/easysalary-linux-amd64.tar.gz"
    echo ""
    echo "🚀 部署步骤:"
    echo "  1. scp dist/easysalary-linux-amd64.tar.gz user@server:~/"
    echo "  2. ssh user@server"
    echo "  3. tar -xzf easysalary-linux-amd64.tar.gz"
    echo "  4. cd linux-release"
    echo "  5. ./start.sh"
else
    echo "❌ 构建失败"
    exit 1
fi