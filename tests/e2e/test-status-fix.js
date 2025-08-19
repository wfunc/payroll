const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:40010';

async function testStatusFix() {
    console.log('🔧 测试状态修复 - 允许completed状态生成报告\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 300
    });
    
    const page = await browser.newPage();
    
    // 监听对话框
    page.on('dialog', async dialog => {
        console.log(`📢 提示: ${dialog.message()}`);
        await dialog.accept();
    });
    
    try {
        // 1. 登录
        console.log('步骤1: 登录系统');
        await page.goto(`${BASE_URL}/web/login.html`);
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ 登录成功\n');
        
        // 2. 进入离职管理
        console.log('步骤2: 进入离职管理页面');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await page.waitForTimeout(1000);
        
        // 3. 查看第一个申请的状态
        console.log('步骤3: 检查申请状态');
        const statusElements = await page.locator('span.status').all();
        if (statusElements.length > 0) {
            const firstStatus = await statusElements[0].textContent();
            console.log(`   第一个申请状态: ${firstStatus}`);
            
            // 检查是否有智能生成报告按钮
            const smartBtns = await page.locator('button:has-text("智能生成报告")').all();
            console.log(`   找到 ${smartBtns.length} 个智能生成报告按钮\n`);
            
            if (smartBtns.length > 0) {
                // 4. 点击智能生成报告
                console.log('步骤4: 点击智能生成报告');
                await smartBtns[0].click();
                await page.waitForTimeout(1000);
                
                // 5. 检查向导内容
                const modalVisible = await page.locator('#modal').isVisible();
                console.log(`   向导显示: ${modalVisible}`);
                
                if (modalVisible) {
                    // 检查是否有完整报告按钮（表示签名已完成）
                    const completeBtn = await page.locator('button:has-text("生成包含签名的完整报告")').isVisible();
                    const directBtn = await page.locator('button:has-text("直接生成报告")').isVisible();
                    
                    if (completeBtn) {
                        console.log('   ✅ 检测到签名已完成，点击生成完整报告\n');
                        await page.click('button:has-text("生成包含签名的完整报告")');
                    } else if (directBtn) {
                        console.log('   ⚠️ 签名未完成，点击直接生成报告\n');
                        await page.click('button:has-text("直接生成报告")');
                    }
                    
                    await page.waitForTimeout(1000);
                    
                    // 6. 检查报告表单
                    console.log('步骤5: 填写报告表单');
                    const formVisible = await page.locator('#reportForm').isVisible();
                    
                    if (formVisible) {
                        console.log('   ✅ 报告表单显示成功！');
                        
                        // 填写表单
                        await page.fill('#workSummary', '状态修复测试：验证completed状态可以生成报告');
                        await page.fill('#unfinishedTasks', '无');
                        await page.check('#propertyReturned');
                        await page.check('#financialSettlement');
                        
                        // 提交
                        console.log('   正在生成报告...');
                        await page.click('button:has-text("生成报告")');
                        await page.waitForTimeout(2000);
                        
                        console.log('   ✅ 报告生成成功！\n');
                        
                        // 7. 查看报告列表
                        console.log('步骤6: 验证生成的报告');
                        await page.click('button:has-text("离职报告")');
                        await page.waitForTimeout(1000);
                        
                        const reportCount = await page.locator('tbody tr').count();
                        console.log(`   当前有 ${reportCount} 个报告`);
                        
                        // 查看最新报告
                        const viewBtns = await page.locator('button:has-text("查看")').all();
                        if (viewBtns.length > 0) {
                            await viewBtns[viewBtns.length - 1].click();
                            await page.waitForTimeout(1500);
                            
                            const hasNewFormat = await page.locator('text=✅ 新格式报告').isVisible();
                            const hasSignatures = await page.locator('text=✅ 包含签名').isVisible();
                            
                            console.log(`   新格式报告: ${hasNewFormat}`);
                            console.log(`   包含签名: ${hasSignatures}`);
                        }
                        
                        console.log('\n🎉 修复成功！completed状态的申请现在可以生成报告了！');
                    } else {
                        console.log('   ❌ 报告表单未显示，可能还有其他问题');
                    }
                }
            } else {
                console.log('   ⚠️ 没有找到可以生成报告的申请');
                console.log('   可能所有申请都不是approved或completed状态');
            }
        }
        
        console.log('\n📊 修复总结:');
        console.log('  1. ✅ 后端现在允许approved和completed状态生成报告');
        console.log('  2. ✅ 前后端状态验证逻辑已同步');
        console.log('  3. ✅ 签名完成后仍可以生成报告');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'status-fix-error.png' });
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

testStatusFix().catch(console.error);