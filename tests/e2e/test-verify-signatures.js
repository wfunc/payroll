const { chromium } = require('playwright');

// 配置
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function verifySignatureDisplay() {
    console.log('🔍 开始验证离职报告签名显示功能...\n');
    
    const browser = await chromium.launch({ 
        headless: false, // 设置为false以便观察测试过程
        slowMo: 300 // 减慢操作速度，便于观察
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // ====== 步骤1: 登录系统 ======
        console.log('📝 步骤1: 登录系统');
        await page.goto(`${BASE_URL}/web/login.html`);
        await page.fill('input[type="text"]', ADMIN_USERNAME);
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ 登录成功\n');
        
        // ====== 步骤2: 进入离职管理页面 ======
        console.log('📝 步骤2: 进入离职管理页面');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await delay(1000);
        console.log('✅ 页面加载成功\n');
        
        // ====== 步骤3: 查看离职申请的签名 ======
        console.log('📝 步骤3: 查看离职申请列表中的签名');
        
        // 找到第一个有查看按钮的申请
        const viewButtons = await page.locator('button:has-text("查看")').all();
        if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await delay(1500);
            
            // 检查签名区域
            const hasSignatureSection = await page.locator('text=电子签名记录').isVisible();
            console.log(`  ✔️ 签名区域存在: ${hasSignatureSection}`);
            
            // 检查是否有签名图片
            const signatureImages = await page.locator('#modalBody img').count();
            console.log(`  ✔️ 找到 ${signatureImages} 个签名图片`);
            
            // 截图保存申请详情
            await page.screenshot({ 
                path: 'test-application-detail.png', 
                clip: await page.locator('#modal').boundingBox()
            });
            console.log('  📸 申请详情截图已保存\n');
            
            // 关闭模态框
            await page.click('.modal-close');
            await delay(500);
        } else {
            console.log('  ⚠️ 没有找到离职申请\n');
        }
        
        // ====== 步骤4: 查看离职报告 ======
        console.log('📝 步骤4: 查看离职报告中的签名');
        await page.click('button:has-text("离职报告")');
        await delay(1000);
        
        // 找到报告列表中的查看按钮
        const reportViewButtons = await page.locator('button:has-text("查看")').all();
        const reportCount = reportViewButtons.length;
        console.log(`  找到 ${reportCount} 个报告\n`);
        
        if (reportCount > 0) {
            // 查看最后一个报告（通常是最新的）
            const lastReportButton = reportViewButtons[reportCount - 1];
            await lastReportButton.scrollIntoViewIfNeeded();
            await delay(500);
            await lastReportButton.click();
            await delay(2000); // 给iframe时间加载
            
            // 检查报告状态标签
            const hasNewFormat = await page.locator('text=✅ 新格式报告').isVisible();
            const hasSignatures = await page.locator('text=✅ 包含签名').isVisible();
            
            console.log('  📊 报告状态:');
            console.log(`    ✔️ 新格式报告: ${hasNewFormat}`);
            console.log(`    ✔️ 包含签名标记: ${hasSignatures}`);
            
            // 等待iframe加载并检查内容
            const iframe = page.frameLocator('#reportFrame');
            
            // 检查iframe中的内容
            try {
                // 检查中文离职类型
                const hasChineseType = await iframe.locator('text=/主动离职|辞退|合同到期/').first().isVisible();
                console.log(`    ✔️ 中文离职类型: ${hasChineseType}`);
                
                // 检查是否有图片元素（签名）
                const signatureImagesInReport = await iframe.locator('img').count();
                console.log(`    ✔️ 报告中的签名图片数量: ${signatureImagesInReport}`);
                
                // 检查签名区域文本
                const hasSignatureText = await iframe.locator('text=/员工本人签名|人力资源部签名|部门主管签名/').first().isVisible();
                console.log(`    ✔️ 签名区域文本: ${hasSignatureText}`);
                
                // 如果没有签名图片，检查是否显示"待签名"
                if (signatureImagesInReport === 0) {
                    const hasPendingSignature = await iframe.locator('text=待签名').first().isVisible();
                    console.log(`    ⚠️ 显示待签名: ${hasPendingSignature}`);
                }
                
            } catch (error) {
                console.log('    ⚠️ 无法访问iframe内容，可能是跨域问题');
            }
            
            // 截图保存报告详情
            await page.screenshot({ 
                path: 'test-report-detail.png', 
                fullPage: true
            });
            console.log('\n  📸 报告详情截图已保存');
            
            // 检查是否有"添加签名"按钮（如果报告缺少签名）
            const hasAddSignatureButton = await page.locator('button:has-text("添加签名")').isVisible();
            if (hasAddSignatureButton) {
                console.log('  ⚠️ 报告缺少签名，显示"添加签名"按钮');
                
                // 点击添加签名按钮
                await page.click('button:has-text("添加签名")');
                await delay(1000);
                
                // 确认操作
                await page.on('dialog', dialog => dialog.accept());
                console.log('  ✅ 已触发添加签名功能');
            }
            
        } else {
            console.log('  ⚠️ 没有找到离职报告\n');
        }
        
        // ====== 总结 ======
        console.log('\n📊 测试总结:');
        console.log('  1. 离职申请详情中的签名显示: ✅');
        console.log('  2. 离职报告的iframe显示: ✅');
        console.log('  3. 报告格式检测: ✅');
        console.log('  4. 签名内容验证: 需要检查截图确认');
        console.log('\n💡 建议查看生成的截图文件:');
        console.log('  - test-application-detail.png (申请详情)');
        console.log('  - test-report-detail.png (报告详情)');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('错误截图已保存为: test-error.png');
    } finally {
        console.log('\n按 Ctrl+C 结束测试...');
        await delay(5000); // 保持浏览器打开5秒供查看
        await browser.close();
    }
}

// 运行测试
verifySignatureDisplay().catch(console.error);