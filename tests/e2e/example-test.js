/**
 * 示例测试文件
 * Example Test File
 * 
 * 展示如何使用统一的测试配置
 */

const { chromium } = require('playwright');
const config = require('../config');

async function exampleTest() {
    console.log('🚀 运行示例测试...\n');
    
    const browser = await chromium.launch({
        headless: config.PLAYWRIGHT.headless,
        slowMo: config.PLAYWRIGHT.slowMo
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 1. 访问登录页面
        console.log('步骤1: 访问系统');
        await page.goto(config.BASE_URL + '/web/login.html');
        await config.delay(config.TIMEOUTS.SHORT);
        
        // 2. 执行登录
        console.log('步骤2: 管理员登录');
        await page.fill('input[type="text"]', config.ADMIN_USERNAME);
        await page.fill('input[type="password"]', config.ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ 登录成功');
        
        // 3. 验证登录成功
        const adminPageUrl = page.url();
        if (adminPageUrl.includes('admin.html')) {
            console.log('✅ 成功进入管理界面');
        } else {
            throw new Error('未能进入管理界面');
        }
        
        // 4. 截图保存（仅在需要时）
        if (config.PLAYWRIGHT.screenshot !== 'off') {
            await page.screenshot({ 
                path: '../screenshots/example-test-success.png',
                fullPage: true 
            });
            console.log('📸 截图已保存');
        }
        
        console.log('\n🎉 示例测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        
        // 失败时保存截图
        await page.screenshot({ 
            path: '../screenshots/example-test-error.png',
            fullPage: true 
        });
        
        throw error;
        
    } finally {
        await config.delay(config.TIMEOUTS.SHORT);
        await browser.close();
    }
}

// 运行测试
if (require.main === module) {
    exampleTest()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = exampleTest;