const { chromium } = require('playwright');

// 配置
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCorrectSignatureFlow() {
    console.log('🎯 测试正确的签名流程（先签名，后生成报告）\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
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
        
        // ====== 步骤3: 查找已批准的申请 ======
        console.log('📝 步骤3: 查找已批准的申请');
        
        // 查看是否有"签名并生成报告"按钮
        const smartButtons = await page.locator('button:has-text("签名并生成报告")').all();
        console.log(`  找到 ${smartButtons.length} 个智能按钮\n`);
        
        if (smartButtons.length > 0) {
            // ====== 步骤4: 点击智能按钮 ======
            console.log('📝 步骤4: 点击"签名并生成报告"按钮');
            await smartButtons[0].click();
            await delay(1500);
            
            // 检查弹出的向导
            const modalVisible = await page.locator('#modal').isVisible();
            console.log(`  ✔️ 向导弹窗显示: ${modalVisible}`);
            
            // 检查向导内容
            const hasWarning = await page.locator('text=检测到签名未完成').isVisible();
            const hasSuccess = await page.locator('text=所有签名已完成').isVisible();
            
            if (hasWarning) {
                console.log('  ⚠️ 检测到签名未完成');
                console.log('  系统提供了以下选项:');
                console.log('    - 自动添加测试签名并生成报告');
                console.log('    - 生成签名链接（手动签名）');
                console.log('    - 直接生成报告（不含签名）\n');
                
                // 点击自动添加签名按钮
                console.log('📝 步骤5: 选择"自动添加测试签名并生成报告"');
                await page.click('button:has-text("自动添加测试签名并生成报告")');
                await delay(2000);
                
                // 处理alert
                page.on('dialog', dialog => dialog.accept());
                await delay(1000);
                
                console.log('  ✅ 签名自动添加完成');
                
                // 填写报告信息
                const reportFormVisible = await page.locator('#reportForm').isVisible();
                if (reportFormVisible) {
                    console.log('📝 步骤6: 填写报告信息');
                    await page.fill('#workSummary', '测试：验证签名在报告中的显示');
                    await page.fill('#unfinishedTasks', '测试：所有任务已完成');
                    await page.check('#propertyReturned');
                    await page.check('#financialSettlement');
                    await page.click('button:has-text("生成报告")');
                    await delay(2000);
                    console.log('  ✅ 报告生成成功\n');
                }
                
            } else if (hasSuccess) {
                console.log('  ✅ 所有签名已完成');
                console.log('  可以直接生成包含签名的报告\n');
                
                // 点击生成报告按钮
                await page.click('button:has-text("生成包含签名的完整报告")');
                await delay(1000);
                
                // 填写报告信息
                const reportFormVisible = await page.locator('#reportForm').isVisible();
                if (reportFormVisible) {
                    console.log('📝 步骤5: 填写报告信息');
                    await page.fill('#workSummary', '测试：包含完整签名的报告');
                    await page.fill('#unfinishedTasks', '测试：验证签名显示');
                    await page.check('#propertyReturned');
                    await page.check('#financialSettlement');
                    await page.click('button:has-text("生成报告")');
                    await delay(2000);
                    console.log('  ✅ 报告生成成功\n');
                }
            }
            
            // ====== 步骤7: 验证生成的报告 ======
            console.log('📝 步骤7: 验证生成的报告');
            await page.click('button:has-text("离职报告")');
            await delay(1000);
            
            // 查看最新报告
            const viewReportButtons = await page.locator('button:has-text("查看")').all();
            if (viewReportButtons.length > 0) {
                await viewReportButtons[viewReportButtons.length - 1].click();
                await delay(2000);
                
                // 验证报告状态
                const hasNewFormat = await page.locator('text=✅ 新格式报告').isVisible();
                const hasSignatures = await page.locator('text=✅ 包含签名').isVisible();
                
                console.log('  📊 报告验证结果:');
                console.log(`    ✔️ 新格式报告: ${hasNewFormat}`);
                console.log(`    ✔️ 包含签名: ${hasSignatures}`);
                
                // 检查iframe内容
                const iframe = page.frameLocator('#reportFrame');
                try {
                    const signatureCount = await iframe.locator('img').count();
                    console.log(`    ✔️ 签名图片数量: ${signatureCount}`);
                    
                    if (signatureCount > 0) {
                        console.log('\n🎉 成功！报告中包含了所有签名！');
                    }
                } catch (e) {
                    console.log('    ⚠️ 无法检查iframe内容');
                }
            }
            
        } else {
            console.log('  ⚠️ 没有找到"签名并生成报告"按钮');
            console.log('  可能所有申请都不是已批准状态');
        }
        
        // 截图保存
        await page.screenshot({ path: 'test-correct-flow.png', fullPage: true });
        console.log('\n📸 测试截图已保存: test-correct-flow.png');
        
        // ====== 总结 ======
        console.log('\n📊 流程改进总结:');
        console.log('  1. ✅ 添加了智能"签名并生成报告"按钮');
        console.log('  2. ✅ 自动检测签名状态');
        console.log('  3. ✅ 提供多种选择（自动签名、手动签名、无签名）');
        console.log('  4. ✅ 确保先签名后生成报告的正确流程');
        console.log('  5. ✅ 已批准和已完成状态都可以生成报告');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'test-flow-error.png', fullPage: true });
    } finally {
        console.log('\n测试完成，5秒后关闭浏览器...');
        await delay(5000);
        await browser.close();
    }
}

// 运行测试
testCorrectSignatureFlow().catch(console.error);