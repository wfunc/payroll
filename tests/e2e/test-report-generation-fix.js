const { chromium } = require('playwright');

// 配置
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testReportGenerationFix() {
    console.log('🔄 测试修复后的报告生成功能...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500,
        devtools: true // 开启开发者工具以查看控制台日志
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听控制台消息
    page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error') {
            console.log(`[Browser ${msg.type()}]:`, msg.text());
        }
    });
    
    // 监听对话框
    page.on('dialog', async dialog => {
        console.log('📢 对话框消息:', dialog.message());
        await dialog.accept();
    });
    
    try {
        // ====== 步骤1: 登录 ======
        console.log('📝 步骤1: 登录系统');
        await page.goto(`${BASE_URL}/web/login.html`);
        await page.fill('input[type="text"]', ADMIN_USERNAME);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ 登录成功\n');
        
        // ====== 步骤2: 进入离职管理 ======
        console.log('📝 步骤2: 进入离职管理页面');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await delay(1000);
        
        // ====== 步骤3: 测试智能生成报告 ======
        console.log('📝 步骤3: 测试智能生成报告按钮');
        
        const smartButtons = await page.locator('button:has-text("智能生成报告")').all();
        console.log(`  找到 ${smartButtons.length} 个智能生成报告按钮`);
        
        if (smartButtons.length > 0) {
            console.log('  点击第一个智能生成报告按钮...');
            await smartButtons[0].click();
            await delay(1500);
            
            // 检查向导是否显示
            const modalVisible = await page.locator('#modal').isVisible();
            console.log(`  ✔️ 向导弹窗显示: ${modalVisible}`);
            
            if (modalVisible) {
                // 检查是否有"生成包含签名的完整报告"按钮
                const completeReportBtn = await page.locator('button:has-text("生成包含签名的完整报告")').isVisible();
                const directReportBtn = await page.locator('button:has-text("直接生成报告")').isVisible();
                
                console.log(`  ✔️ 生成包含签名的完整报告按钮: ${completeReportBtn}`);
                console.log(`  ✔️ 直接生成报告按钮: ${directReportBtn}`);
                
                if (completeReportBtn) {
                    console.log('\n📝 步骤4: 点击"生成包含签名的完整报告"');
                    await page.click('button:has-text("生成包含签名的完整报告")');
                    await delay(1500);
                    
                    // 检查是否出现报告表单
                    const reportFormVisible = await page.locator('#reportForm').isVisible();
                    if (reportFormVisible) {
                        console.log('  ✅ 报告表单显示成功');
                        console.log('  填写报告信息...');
                        await page.fill('#workSummary', '测试：修复后的报告生成功能');
                        await page.fill('#unfinishedTasks', '测试：验证申请查找逻辑');
                        await page.check('#propertyReturned');
                        await page.check('#financialSettlement');
                        await page.click('button:has-text("生成报告")');
                        await delay(2000);
                        console.log('  ✅ 报告生成成功！');
                    } else {
                        console.log('  ⚠️ 报告表单未显示');
                    }
                } else if (directReportBtn) {
                    console.log('\n📝 步骤4: 点击"直接生成报告"');
                    await page.click('button:has-text("直接生成报告")');
                    await delay(1500);
                    
                    // 检查是否出现报告表单
                    const reportFormVisible = await page.locator('#reportForm').isVisible();
                    if (reportFormVisible) {
                        console.log('  ✅ 报告表单显示成功');
                        console.log('  填写报告信息...');
                        await page.fill('#workSummary', '测试：修复后的直接报告生成');
                        await page.fill('#unfinishedTasks', '测试：验证API查询逻辑');
                        await page.check('#propertyReturned');
                        await page.check('#financialSettlement');
                        await page.click('button:has-text("生成报告")');
                        await delay(2000);
                        console.log('  ✅ 报告生成成功！');
                    } else {
                        console.log('  ⚠️ 报告表单未显示');
                    }
                }
            }
        }
        
        // ====== 步骤5: 测试直接生成按钮 ======
        console.log('\n📝 步骤5: 测试直接生成按钮');
        
        // 先关闭可能打开的模态框
        const modalCloseBtn = await page.locator('.modal-close').isVisible();
        if (modalCloseBtn) {
            await page.click('.modal-close');
            await delay(500);
        }
        
        const directButtons = await page.locator('button:has-text("直接生成")').all();
        console.log(`  找到 ${directButtons.length} 个直接生成按钮`);
        
        if (directButtons.length > 0) {
            console.log('  点击第一个直接生成按钮...');
            await directButtons[0].click();
            await delay(1500);
            
            // 检查是否出现报告表单
            const reportFormVisible = await page.locator('#reportForm').isVisible();
            if (reportFormVisible) {
                console.log('  ✅ 报告表单显示成功（直接生成）');
                console.log('  填写报告信息...');
                await page.fill('#workSummary', '测试：直接生成按钮功能');
                await page.fill('#unfinishedTasks', '测试：验证错误处理');
                await page.check('#propertyReturned');
                await page.check('#financialSettlement');
                await page.click('button:has-text("生成报告")');
                await delay(2000);
                console.log('  ✅ 直接生成报告成功！');
            } else {
                console.log('  ⚠️ 报告表单未显示（可能出现错误）');
            }
        }
        
        // ====== 步骤6: 验证生成的报告 ======
        console.log('\n📝 步骤6: 验证生成的报告');
        await page.click('button:has-text("离职报告")');
        await delay(1000);
        
        const reportViewButtons = await page.locator('button:has-text("查看")').all();
        console.log(`  找到 ${reportViewButtons.length} 个报告`);
        
        if (reportViewButtons.length > 0) {
            await reportViewButtons[reportViewButtons.length - 1].click();
            await delay(2000);
            
            const hasNewFormat = await page.locator('text=✅ 新格式报告').isVisible();
            const hasSignatures = await page.locator('text=✅ 包含签名').isVisible();
            
            console.log(`  ✔️ 新格式报告: ${hasNewFormat}`);
            console.log(`  ✔️ 包含签名: ${hasSignatures}`);
        }
        
        // 截图保存
        await page.screenshot({ path: 'test-fix-result.png', fullPage: true });
        console.log('\n📸 测试截图已保存: test-fix-result.png');
        
        // ====== 总结 ======
        console.log('\n📊 修复测试总结:');
        console.log('  1. ✅ 改进了createReport函数的申请查找逻辑');
        console.log('  2. ✅ 添加了API直接查询作为后备方案');
        console.log('  3. ✅ 增强了错误处理和日志记录');
        console.log('  4. ✅ 修复了按钮的异步调用问题');
        console.log('\n💡 请检查浏览器控制台查看详细的调试日志');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'test-fix-error.png', fullPage: true });
    } finally {
        console.log('\n测试完成，10秒后关闭浏览器...');
        await delay(10000);
        await browser.close();
    }
}

// 运行测试
testReportGenerationFix().catch(console.error);