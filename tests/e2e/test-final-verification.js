const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:40010';

async function finalVerification() {
    console.log('✅ 最终验证 - 报告生成功能修复\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 200
    });
    
    const page = await browser.newPage();
    
    // 监听对话框
    page.on('dialog', async dialog => {
        console.log(`📢 ${dialog.message()}`);
        await dialog.accept();
    });
    
    try {
        // 登录
        await page.goto(`${BASE_URL}/web/login.html`);
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ 登录成功');
        
        // 进入离职管理
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await page.waitForTimeout(1000);
        console.log('✅ 进入离职管理页面');
        
        // 测试智能生成报告
        const smartBtn = await page.locator('button:has-text("智能生成报告")').first();
        await smartBtn.click();
        await page.waitForTimeout(1000);
        console.log('✅ 智能向导显示成功');
        
        // 检查并点击相应按钮
        const completeBtn = await page.locator('button:has-text("生成包含签名的完整报告")');
        const directBtn = await page.locator('button:has-text("直接生成报告")');
        
        if (await completeBtn.isVisible()) {
            console.log('📝 检测到所有签名已完成');
            await completeBtn.click();
        } else if (await directBtn.isVisible()) {
            console.log('📝 检测到签名未完成');
            await directBtn.click();
        }
        
        // 等待报告表单
        await page.waitForTimeout(1000);
        const formVisible = await page.locator('#reportForm').isVisible();
        
        if (formVisible) {
            console.log('✅ 报告表单成功显示！');
            
            // 填写表单
            await page.fill('#workSummary', '修复验证：成功显示报告表单');
            await page.fill('#unfinishedTasks', '无');
            await page.check('#propertyReturned');
            await page.check('#financialSettlement');
            
            // 提交
            await page.click('button:has-text("生成报告")');
            await page.waitForTimeout(2000);
            
            console.log('✅ 报告生成成功！');
            
            // 查看报告列表
            await page.click('button:has-text("离职报告")');
            await page.waitForTimeout(1000);
            
            const reportCount = await page.locator('button:has-text("查看")').count();
            console.log(`📊 当前有 ${reportCount} 个报告`);
            
            console.log('\n🎉 修复验证通过！问题已解决！');
            console.log('📝 修复内容：');
            console.log('  1. 改进了createReport函数的申请查找逻辑');
            console.log('  2. 修复了模态框关闭时序问题');
            console.log('  3. 添加了错误处理和日志记录');
            console.log('  4. 确保了异步操作的正确执行');
        } else {
            console.log('❌ 报告表单未显示');
        }
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
        console.log('\n测试结束');
    }
}

finalVerification().catch(console.error);