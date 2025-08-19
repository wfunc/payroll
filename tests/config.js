// 测试配置文件
// Test Configuration

module.exports = {
    // 基础配置
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:40010',
    
    // 认证信息
    ADMIN_USERNAME: process.env.TEST_ADMIN_USER || 'admin',
    ADMIN_PASSWORD: process.env.TEST_ADMIN_PASS || 'admin123',
    
    // 测试超时设置（毫秒）
    TIMEOUTS: {
        SHORT: 1000,      // 短延迟
        MEDIUM: 2000,     // 中等延迟
        LONG: 5000,       // 长延迟
        PAGE_LOAD: 30000, // 页面加载超时
        TEST: 60000       // 单个测试超时
    },
    
    // Playwright配置
    PLAYWRIGHT: {
        headless: process.env.HEADLESS !== 'false', // 默认无头模式
        slowMo: parseInt(process.env.SLOW_MO || '300'), // 操作延迟
        devtools: process.env.DEVTOOLS === 'true', // 开发者工具
        video: process.env.VIDEO === 'true' ? 'on' : 'off', // 视频录制
        screenshot: process.env.SCREENSHOT || 'only-on-failure' // 截图策略
    },
    
    // 测试数据
    TEST_DATA: {
        employee: {
            name: '测试员工',
            employee_no: 'TEST001',
            department: '测试部',
            position: '测试工程师',
            email: 'test@company.com',
            phone: '13800138000'
        },
        resignation: {
            type: 'voluntary',
            reason: '自动化测试离职原因',
            handover: '测试交接说明'
        },
        report: {
            work_summary: '自动化测试工作总结',
            unfinished_tasks: '自动化测试未完成事项'
        }
    },
    
    // 辅助函数
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // 日志级别
    LOG_LEVEL: process.env.LOG_LEVEL || 'info' // debug, info, warn, error
};