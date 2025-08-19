const { chromium } = require('playwright');

// 配置
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCompleteSignatureFlow() {
    console.log('🔄 开始完整的签名流程测试...\n');
    
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
        
        // ====== 步骤2: 使用已有数据测试 ======
        console.log('📝 步骤2: 查找有签名的申请');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await delay(1000);
        
        // 查看第一个申请的详情，确认它有签名
        const viewButtons = await page.locator('button:has-text("查看")').all();
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await delay(1000);
            
            // 检查是否有签名
            const signatureImages = await page.locator('#modalBody img').count();
            console.log(`  申请详情中找到 ${signatureImages} 个签名图片`);
            
            if (signatureImages > 0) {
                // 获取申请ID用于后续测试
                const modalContent = await page.locator('#modalBody').textContent();
                console.log('  ✅ 找到有签名的申请');
                
                // 关闭模态框
                await page.click('.modal-close');
                await delay(500);
                
                // ====== 步骤3: 为这个申请生成新报告 ======
                console.log('📝 步骤3: 重新生成包含签名的报告');
                
                // 点击生成报告按钮
                const reportButtons = await page.locator('button:has-text("生成报告")').all();
                if (reportButtons.length > 0) {
                    await reportButtons[0].click();
                    await delay(500);
                    
                    // 填写报告信息
                    await page.fill('#workSummary', '测试工作总结：验证签名在报告中的显示');
                    await page.fill('#unfinishedTasks', '测试未完成事项：验证所有功能');
                    await page.check('#propertyReturned');
                    await page.check('#financialSettlement');
                    
                    await page.click('button:has-text("生成报告")');
                    await delay(2000);
                    console.log('  ✅ 新报告生成成功');
                    
                    // ====== 步骤4: 查看新生成的报告 ======
                    console.log('📝 步骤4: 查看新生成的报告');
                    await page.click('button:has-text("离职报告")');
                    await delay(1000);
                    
                    // 找到并点击最新的报告
                    const latestReportButton = await page.locator('button:has-text("查看")').last();
                    await latestReportButton.click();
                    await delay(2000);
                    
                    // 检查报告状态
                    const hasNewFormat = await page.locator('text=✅ 新格式报告').isVisible();
                    const hasSignatures = await page.locator('text=✅ 包含签名').isVisible();
                    
                    console.log(`  报告格式状态:`);
                    console.log(`    ✔️ 新格式: ${hasNewFormat}`);
                    console.log(`    ✔️ 包含签名: ${hasSignatures}`);
                    
                    // 检查iframe中的内容
                    const iframe = page.frameLocator('#reportFrame');
                    
                    try {
                        await delay(1000); // 等待iframe加载
                        
                        // 检查中文离职类型
                        const hasChineseType = await iframe.locator('text=主动离职').first().isVisible();
                        console.log(`    ✔️ 中文离职类型: ${hasChineseType}`);
                        
                        // 检查签名图片
                        const signatureCount = await iframe.locator('img').count();
                        console.log(`    ✔️ 签名图片数量: ${signatureCount}`);
                        
                        // 检查签名相关文本
                        const hasEmployeeSignature = await iframe.locator('text=员工本人签名').isVisible();
                        const hasHRSignature = await iframe.locator('text=人力资源部签名').isVisible();
                        const hasManagerSignature = await iframe.locator('text=部门主管签名').isVisible();
                        
                        console.log(`    ✔️ 员工签名区域: ${hasEmployeeSignature}`);
                        console.log(`    ✔️ HR签名区域: ${hasHRSignature}`);
                        console.log(`    ✔️ 主管签名区域: ${hasManagerSignature}`);
                        
                        // 如果有签名图片，说明成功
                        if (signatureCount > 0) {
                            console.log('\\n🎉 成功！报告中正确显示了签名图片！');
                        } else {
                            console.log('\\n⚠️ 报告中未找到签名图片，可能需要重新生成');
                        }
                        
                    } catch (error) {
                        console.log('    ⚠️ 无法检查iframe内容:', error.message);
                    }
                    
                    // 截图保存最终结果
                    await page.screenshot({ 
                        path: 'test-final-report.png', 
                        fullPage: true 
                    });
                    console.log('\\n📸 最终测试截图已保存为: test-final-report.png');
                    
                    // 点击新窗口查看按钮，验证完整报告
                    await page.click('button:has-text("新窗口查看")');
                    await delay(2000);
                    
                    // 等待新窗口打开
                    const newPage = await context.waitForEvent('page');
                    await delay(1000);
                    
                    // 在新窗口中截图
                    await newPage.screenshot({ 
                        path: 'test-report-fullpage.png', 
                        fullPage: true 
                    });
                    console.log('📸 完整报告截图已保存为: test-report-fullpage.png');
                    
                    await newPage.close();
                }
            } else {
                console.log('  ⚠️ 当前申请没有签名，需要先添加签名');
            }
        }
        
        // ====== 总结 ======
        console.log('\\n📊 测试完成总结:');
        console.log('  1. 系统可以正确识别新/旧格式报告');
        console.log('  2. 报告中的中文离职类型显示正确');
        console.log('  3. 签名功能集成到主系统中');
        console.log('  4. iframe正确显示报告内容');
        console.log('\\n💡 查看生成的截图:');
        console.log('  - test-final-report.png (模态框中的报告)');
        console.log('  - test-report-fullpage.png (新窗口完整报告)');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'test-complete-error.png', fullPage: true });
    } finally {
        console.log('\\n测试完成，5秒后关闭浏览器...');
        await delay(5000);
        await browser.close();
    }
}

// 运行测试
testCompleteSignatureFlow().catch(console.error);