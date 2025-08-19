const { chromium } = require('playwright');

// 配置
const BASE_URL = 'http://localhost:40010';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 生成随机字符串
const randomString = () => Math.random().toString(36).substring(7);

async function testResignationWithSignatures() {
    console.log('🚀 开始测试离职管理系统签名功能...\n');
    
    const browser = await chromium.launch({ 
        headless: false, // 设置为false以便观察测试过程
        slowMo: 500 // 减慢操作速度，便于观察
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
        
        // ====== 步骤2: 创建测试员工 ======
        console.log('📝 步骤2: 创建测试员工');
        await page.goto(`${BASE_URL}/web/employee.html`);
        await delay(1000);
        
        // 点击添加按钮（可能是一个+按钮或文字按钮）
        const addButton = await page.locator('button').filter({ hasText: /添加|新增|Add/i }).first();
        if (await addButton.isVisible()) {
            await addButton.click();
        } else {
            // 尝试点击+图标
            await page.click('button:has-text("+")');
        }
        await delay(500);
        
        const testEmployeeName = `测试员工_${randomString()}`;
        const testEmployeeNo = `TEST_${randomString()}`;
        
        // 填写员工信息（使用更通用的选择器）
        await page.fill('input[name="name"], input#name, input[placeholder*="姓名"]', testEmployeeName);
        await page.fill('input[name="employee_no"], input#employee_no, input[placeholder*="工号"]', testEmployeeNo);
        await page.fill('input[name="department"], input#department, input[placeholder*="部门"]', '技术部');
        await page.fill('input[name="position"], input#position, input[placeholder*="职位"]', '测试工程师');
        await page.fill('input[name="email"], input#email, input[placeholder*="邮箱"], input[type="email"]', 'test@example.com');
        await page.fill('input[name="phone"], input#phone, input[placeholder*="电话"], input[type="tel"]', '13800138000');
        await page.fill('input[name="join_date"], input#join_date, input[type="date"]', '2020-01-01');
        
        // 提交表单
        const submitButton = await page.locator('button').filter({ hasText: /确定|提交|保存|Submit|Save/i }).first();
        await submitButton.click();
        await delay(1000);
        console.log(`✅ 创建员工成功: ${testEmployeeName}\n`);
        
        // ====== 步骤3: 创建离职申请 ======
        console.log('📝 步骤3: 创建离职申请');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await page.click('text=创建申请');
        await delay(500);
        
        // 选择员工
        await page.selectOption('#employeeSelect', { label: new RegExp(testEmployeeName) });
        await page.selectOption('#resignationType', 'voluntary');
        
        // 填写日期
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await page.fill('#resignationDate', today);
        await page.fill('#lastWorkingDate', futureDate);
        
        // 填写原因
        await page.fill('#reason', '测试签名功能是否正常显示');
        await page.fill('#handoverNotes', '测试工作交接说明');
        
        await page.click('button[type="submit"]');
        await delay(1000);
        console.log('✅ 离职申请创建成功\n');
        
        // ====== 步骤4: 提交并批准申请 ======
        console.log('📝 步骤4: 提交并批准申请');
        await page.click('text=离职申请');
        await delay(500);
        
        // 找到刚创建的申请并提交
        const submitButton = await page.locator(`text=${testEmployeeName}`).locator('xpath=..').locator('button:has-text("提交")').first();
        await submitButton.click();
        await delay(1000);
        
        // 批准申请
        const approveButton = await page.locator(`text=${testEmployeeName}`).locator('xpath=..').locator('button:has-text("批准")').first();
        await approveButton.click();
        await page.fill('text=请输入审批意见', '同意离职');
        await page.keyboard.press('Enter');
        await delay(1000);
        console.log('✅ 申请已批准\n');
        
        // ====== 步骤5: 生成签名链接并签名 ======
        console.log('📝 步骤5: 添加电子签名');
        
        // 获取申请的UUID（通过查看按钮的onclick属性）
        const viewButton = await page.locator(`text=${testEmployeeName}`).locator('xpath=..').locator('button:has-text("查看")').first();
        await viewButton.click();
        await delay(1000);
        
        // 检查是否有签名记录
        const signatureSection = await page.locator('text=电子签名记录').isVisible();
        console.log(`签名区域可见: ${signatureSection}`);
        
        // 关闭查看对话框
        await page.click('.modal-close');
        await delay(500);
        
        // 生成签名链接
        const signLinkButton = await page.locator(`text=${testEmployeeName}`).locator('xpath=..').locator('button:has-text("获取签名链接")').first();
        await signLinkButton.click();
        await delay(500);
        
        // 为每个角色生成签名
        const signerTypes = ['employee', 'hr', 'manager'];
        const signatureUrls = [];
        
        for (const type of signerTypes) {
            await page.selectOption('#tokenSignerType', type);
            await page.click('text=生成链接');
            await delay(1000);
            
            // 获取生成的链接
            const linkInput = await page.locator('#signLinkInput').inputValue();
            signatureUrls.push({ type, url: linkInput });
            console.log(`✅ ${type} 签名链接已生成`);
        }
        
        // 关闭对话框
        await page.click('.modal-close');
        await delay(500);
        
        // 在新标签页中打开每个签名链接并签名
        for (const { type, url } of signatureUrls) {
            console.log(`正在为 ${type} 添加签名...`);
            const signPage = await context.newPage();
            await signPage.goto(url);
            await delay(1000);
            
            // 检查页面是否加载成功
            const hasCanvas = await signPage.locator('canvas#signaturePad').isVisible();
            if (hasCanvas) {
                // 在画布上绘制签名
                const canvas = await signPage.locator('canvas#signaturePad');
                const box = await canvas.boundingBox();
                
                // 模拟手写签名
                await signPage.mouse.move(box.x + 50, box.y + 75);
                await signPage.mouse.down();
                await signPage.mouse.move(box.x + 150, box.y + 75, { steps: 10 });
                await signPage.mouse.move(box.x + 200, box.y + 50, { steps: 10 });
                await signPage.mouse.up();
                
                // 提交签名
                await signPage.click('button:has-text("提交签名")');
                await delay(1000);
                console.log(`✅ ${type} 签名已添加`);
            }
            
            await signPage.close();
        }
        
        console.log('✅ 所有签名添加完成\n');
        
        // ====== 步骤6: 生成离职报告 ======
        console.log('📝 步骤6: 生成离职报告');
        await page.goto(`${BASE_URL}/web/resignation.html`);
        await delay(500);
        
        const createReportButton = await page.locator(`text=${testEmployeeName}`).locator('xpath=..').locator('button:has-text("生成报告")').first();
        await createReportButton.click();
        await delay(500);
        
        // 填写报告信息
        await page.fill('#workSummary', '测试工作总结：完成所有测试任务');
        await page.fill('#unfinishedTasks', '测试未完成事项：无');
        await page.check('#propertyReturned');
        await page.check('#financialSettlement');
        await page.click('button:has-text("生成报告")');
        await delay(2000);
        console.log('✅ 离职报告生成成功\n');
        
        // ====== 步骤7: 验证报告中的签名 ======
        console.log('📝 步骤7: 验证报告中的签名显示');
        await page.click('text=离职报告');
        await delay(1000);
        
        // 点击查看最新的报告
        const viewReportButton = await page.locator('tr').filter({ hasText: testEmployeeName }).locator('button:has-text("查看")').first();
        await viewReportButton.click();
        await delay(2000);
        
        // 等待iframe加载
        const iframe = page.frameLocator('#reportFrame');
        
        // 验证关键内容
        const checks = {
            '新格式标记': await page.locator('text=✅ 新格式报告').isVisible(),
            '包含签名标记': await page.locator('text=✅ 包含签名').isVisible(),
            '中文离职类型': await iframe.locator('text=主动离职').isVisible(),
            '员工签名图片': await iframe.locator('img').first().isVisible(),
            '签名时间': await iframe.locator('text=/\\d{4}年\\d{1,2}月\\d{1,2}日/').isVisible()
        };
        
        console.log('\n📊 验证结果:');
        let allPassed = true;
        for (const [key, value] of Object.entries(checks)) {
            const status = value ? '✅' : '❌';
            console.log(`  ${status} ${key}: ${value}`);
            if (!value) allPassed = false;
        }
        
        // 截图保存
        await page.screenshot({ path: 'test-report-with-signatures.png', fullPage: true });
        console.log('\n📸 截图已保存为: test-report-with-signatures.png');
        
        if (allPassed) {
            console.log('\n🎉 测试成功！所有签名都正确显示在报告中。');
        } else {
            console.log('\n⚠️ 测试发现问题，部分内容未正确显示。');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('错误截图已保存为: test-error.png');
    } finally {
        // 等待用户查看结果
        console.log('\n按 Ctrl+C 结束测试...');
        await delay(10000); // 保持浏览器打开10秒供查看
        await browser.close();
    }
}

// 运行测试
testResignationWithSignatures().catch(console.error);